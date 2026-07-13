// STORM-TIME CRITICAL PATH: station tier change → shops on that station →
// cached playbook lookup → Telegram checklist. Dumb, deterministic, zero AI —
// every import here is either a repository, the delivery channel, or a type.
//
// Status machine per dispatch: queued → sent | failed → dead.
// Send is retried in-process (3 attempts, exponential backoff) before dead.

import { logger } from "@/lib/logger";
import { listShopsByStation } from "@/lib/db/repositories/shops.repo";
import { getLatestValidatedPlaybook } from "@/lib/db/repositories/playbooks.repo";
import { createDispatch, updateDispatchStatus } from "@/lib/db/repositories/dispatches.repo";
import {
  formatChecklistMessage,
  resolveMessageLanguage,
  sendMessage,
} from "@/modules/delivery";

const SEND_ATTEMPTS = 3;

export interface DispatchRequest {
  stationId: string;
  stationName: string;
  tier: "watch" | "warning" | "danger";
  floodEventId: string;
}

export interface DispatchSummary {
  shopsOnStation: number;
  sent: number;
  failed: number;
  skippedNoTelegram: number;
  skippedNoPlaybook: number;
}

export async function dispatchForTierChange(req: DispatchRequest): Promise<DispatchSummary> {
  const shops = await listShopsByStation(req.stationId);
  const summary: DispatchSummary = {
    shopsOnStation: shops.length,
    sent: 0,
    failed: 0,
    skippedNoTelegram: 0,
    skippedNoPlaybook: 0,
  };

  for (const shop of shops) {
    if (!shop.telegram_chat_id) {
      summary.skippedNoTelegram++;
      logger.warn("dispatch skipped: shop has no telegram chat bound", {
        shopId: shop.id,
        stationId: req.stationId,
      });
      continue;
    }

    const language = resolveMessageLanguage(shop.language);
    const playbook = await getLatestValidatedPlaybook(shop.id, req.tier, language);
    if (!playbook) {
      summary.skippedNoPlaybook++;
      logger.warn("dispatch skipped: no cached validated playbook", {
        shopId: shop.id,
        tier: req.tier,
      });
      continue;
    }

    const dispatch = await createDispatch({
      playbookId: playbook.id,
      floodEventId: req.floodEventId,
    });

    const { text, keyboard } = formatChecklistMessage({
      playbook: { tier: playbook.tier, actions: playbook.actions },
      stationName: req.stationName,
      dispatchId: dispatch.id,
      language: resolveMessageLanguage(playbook.language),
    });

    let delivered = false;
    for (let attempt = 1; attempt <= SEND_ATTEMPTS && !delivered; attempt++) {
      const result = await sendMessage(shop.telegram_chat_id, text, { inlineKeyboard: keyboard });
      if (result.ok) {
        delivered = true;
        await updateDispatchStatus(dispatch.id, "sent");
        summary.sent++;
        logger.info("checklist dispatched", {
          dispatchId: dispatch.id,
          shopId: shop.id,
          tier: req.tier,
          stationId: req.stationId,
          attempt,
        });
      } else if (attempt < SEND_ATTEMPTS) {
        await updateDispatchStatus(dispatch.id, "failed");
        await new Promise((r) => setTimeout(r, attempt * 2000));
      } else {
        await updateDispatchStatus(dispatch.id, "dead");
        summary.failed++;
        logger.error("dispatch dead after retries", {
          dispatchId: dispatch.id,
          shopId: shop.id,
          error: result.error,
        });
      }
    }
  }

  return summary;
}
