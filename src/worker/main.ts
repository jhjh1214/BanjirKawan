// BanjirKawan worker — the storm-time critical path.
// Poll InfoBanjir → persist readings → classify → detect tier changes.
// NO AI IMPORTS in this process, ever (ESLint-enforced). Dispatch lands Day 5.

import "dotenv/config";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { closePool } from "@/lib/db/client";
import {
  getLatestThresholdStates,
  insertRiverReadings,
} from "@/lib/db/repositories/events.repo";
import { upsertSystemStatus } from "@/lib/db/repositories/system.repo";
import {
  checkFreshness,
  classify,
  fetchStationReadings,
  severityRank,
  type StationReading,
  type ThresholdState,
} from "@/modules/trigger";

let shuttingDown = false;
let lastSuccessfulFetchAt: Date | null = null;

async function pollOnce(): Promise<void> {
  const config = getConfig();
  const all: Array<StationReading & { thresholdState: ThresholdState }> = [];

  for (const stateCode of config.INFOBANJIR_STATE_CODES) {
    try {
      const readings = await fetchStationReadings(stateCode);
      lastSuccessfulFetchAt = new Date();
      for (const r of readings) {
        all.push({ ...r, thresholdState: classify(r) });
      }
      logger.info("fetched readings", { stateCode, stations: readings.length });
    } catch (err) {
      logger.error("infobanjir fetch failed", {
        stateCode,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (all.length > 0) {
    const previous = await getLatestThresholdStates();
    await insertRiverReadings(all);

    for (const r of all) {
      const prev = previous.get(r.stationId) ?? null;
      if (prev !== null && prev !== r.thresholdState) {
        const escalating = severityRank(r.thresholdState) > severityRank(prev);
        logger.warn(`TIER_CHANGE station=${r.stationId} from=${prev} to=${r.thresholdState}`, {
          stationName: r.stationName,
          levelM: r.levelM,
          escalating,
        });
        // Day 5: on escalation → create flood_event → dispatchForTierChange()
      }
    }
  }

  const freshness = checkFreshness(lastSuccessfulFetchAt);
  if (freshness !== "fresh") {
    logger.warn("data feed degraded", {
      freshness,
      lastSuccessfulFetchAt: lastSuccessfulFetchAt?.toISOString() ?? null,
    });
  }

  await upsertSystemStatus("worker_heartbeat", {
    at: new Date().toISOString(),
    freshness,
    lastSuccessfulFetchAt: lastSuccessfulFetchAt?.toISOString() ?? null,
    statesPolled: config.INFOBANJIR_STATE_CODES,
  });
}

async function main() {
  const config = getConfig();
  logger.info("worker starting", {
    states: config.INFOBANJIR_STATE_CODES,
    pollIntervalSeconds: config.POLL_INTERVAL_SECONDS,
  });

  while (!shuttingDown) {
    const started = Date.now();
    try {
      await pollOnce();
    } catch (err) {
      // Never let one bad cycle kill the loop — log and keep polling.
      logger.error("poll cycle failed", {
        error: err instanceof Error ? (err.stack ?? err.message) : String(err),
      });
    }
    const elapsed = Date.now() - started;
    const waitMs = Math.max(0, config.POLL_INTERVAL_SECONDS * 1000 - elapsed);
    await sleep(waitMs);
  }

  logger.info("worker draining");
  await closePool();
  logger.info("worker stopped");
}

let wake: (() => void) | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    wake = resolve;
    setTimeout(resolve, ms);
  });
}

function shutdown(signal: string) {
  logger.info("shutdown signal received", { signal });
  shuttingDown = true;
  wake?.(); // cut the current sleep short so we exit promptly
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

main().catch((err) => {
  logger.error("worker crashed", {
    error: err instanceof Error ? (err.stack ?? err.message) : String(err),
  });
  process.exit(1);
});
