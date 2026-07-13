// BanjirKawan worker — the storm-time critical path.
// Poll InfoBanjir → persist readings → classify → detect tier changes →
// DISPATCH cached playbooks via Telegram on escalation.
// NO AI IMPORTS in this process, ever (ESLint-enforced).

import "dotenv/config";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { closePool } from "@/lib/db/client";
import {
  createFloodEvent,
  deleteReadingsOlderThanHours,
  getLatestThresholdStates,
  insertRiverReadings,
} from "@/lib/db/repositories/events.repo";
import { upsertSystemStatus } from "@/lib/db/repositories/system.repo";
import {
  checkFreshness,
  classify,
  dispatchForTierChange,
  fetchStationReadings,
  severityRank,
  THRESHOLD_TO_TIER,
  type StationReading,
  type ThresholdState,
} from "@/modules/trigger";

const FETCH_CONCURRENCY = 4; // 16 states, polite parallelism
const RETENTION_HOURS = 48;
const RETENTION_EVERY_MS = 60 * 60 * 1000;

let shuttingDown = false;
let lastSuccessfulFetchAt: Date | null = null;
let lastRetentionAt = 0;

async function fetchAllStates(
  stateCodes: string[]
): Promise<Array<StationReading & { thresholdState: ThresholdState }>> {
  const all: Array<StationReading & { thresholdState: ThresholdState }> = [];
  for (let i = 0; i < stateCodes.length; i += FETCH_CONCURRENCY) {
    const chunk = stateCodes.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.allSettled(chunk.map((code) => fetchStationReadings(code)));
    results.forEach((res, idx) => {
      const stateCode = chunk[idx];
      if (res.status === "fulfilled") {
        lastSuccessfulFetchAt = new Date();
        for (const r of res.value) all.push({ ...r, thresholdState: classify(r) });
        logger.info("fetched readings", { stateCode, stations: res.value.length });
      } else {
        logger.error("infobanjir fetch failed", {
          stateCode,
          error: res.reason instanceof Error ? res.reason.message : String(res.reason),
        });
      }
    });
  }
  return all;
}

async function pollOnce(): Promise<void> {
  const config = getConfig();
  const all = await fetchAllStates(config.INFOBANJIR_STATE_CODES);

  if (all.length > 0) {
    const previous = await getLatestThresholdStates();
    await insertRiverReadings(all);

    for (const r of all) {
      const prev = previous.get(r.stationId) ?? null;
      if (prev === null || prev === r.thresholdState) continue;

      const escalating = severityRank(r.thresholdState) > severityRank(prev);
      logger.warn(`TIER_CHANGE station=${r.stationId} from=${prev} to=${r.thresholdState}`, {
        stationName: r.stationName,
        levelM: r.levelM,
        escalating,
      });

      const tier = THRESHOLD_TO_TIER[r.thresholdState];
      if (!escalating || !tier) continue;

      // The real thing: escalation into an actionable tier → flood event →
      // cached playbooks out the door.
      try {
        const event = await createFloodEvent({ stationId: r.stationId, tier });
        const summary = await dispatchForTierChange({
          stationId: r.stationId,
          stationName: r.stationName,
          tier,
          floodEventId: event.id,
        });
        logger.info("tier-change dispatch complete", {
          stationId: r.stationId,
          tier,
          ...summary,
        });
      } catch (err) {
        logger.error("tier-change dispatch crashed", {
          stationId: r.stationId,
          error: err instanceof Error ? err.message : String(err),
        });
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
    statesPolled: getConfig().INFOBANJIR_STATE_CODES,
  });

  if (Date.now() - lastRetentionAt > RETENTION_EVERY_MS) {
    lastRetentionAt = Date.now();
    try {
      const deleted = await deleteReadingsOlderThanHours(RETENTION_HOURS);
      if (deleted > 0) logger.info("retention cleanup", { deleted, olderThanHours: RETENTION_HOURS });
    } catch (err) {
      logger.warn("retention cleanup failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
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
