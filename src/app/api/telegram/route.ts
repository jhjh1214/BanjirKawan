import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { getShop, setTelegramChatId } from "@/lib/db/repositories/shops.repo";
import {
  appendCompletedAction,
  getDispatchCheckoffContext,
} from "@/lib/db/repositories/dispatches.repo";
import {
  BOT_COPY,
  answerCallbackQuery,
  buildChecklistKeyboard,
  checkSavedToast,
  editMessageReplyMarkup,
  resolveMessageLanguage,
  sendMessage,
  type TelegramUpdate,
} from "@/modules/delivery";

export const dynamic = "force-dynamic";

// Telegram webhook. Register with:
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
//     -d "url=<APP_BASE_URL>/api/telegram" -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
export async function POST(req: NextRequest) {
  const config = getConfig();

  if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "telegram not configured" }, { status: 503 });
  }

  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== config.TELEGRAM_WEBHOOK_SECRET) {
    logger.warn("telegram webhook rejected: bad secret token");
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const update = (await req.json()) as TelegramUpdate;

  try {
    if (update.callback_query) {
      await handleCheckoff(update);
    } else if (update.message?.text) {
      await handleMessage(update);
    }
  } catch (err) {
    // Always swallow to a 200 — Telegram retries non-200s aggressively and we
    // never want a webhook retry storm during a flood.
    logger.error("telegram update handling failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true });
}

/* ------------------------------ text messages ------------------------------ */

async function handleMessage(update: TelegramUpdate) {
  const message = update.message!;
  const chatId = message.chat.id;
  const text = message.text!.trim();

  if (text.startsWith("/start")) {
    // Deep link from the onboarding done screen: /start <shopId>
    const payload = text.split(/\s+/)[1];
    if (payload) {
      const shop = await getShop(payload).catch(() => null);
      if (shop) {
        await setTelegramChatId(shop.id, String(chatId));
        logger.info("telegram chat bound to shop", { shopId: shop.id, chatId });
        await sendMessage(chatId, BOT_COPY.linked(shop.name));
      } else {
        logger.warn("telegram /start with unknown shop payload", { payload, chatId });
        await sendMessage(chatId, BOT_COPY.linkFailed);
      }
      return;
    }
    logger.info("telegram /start received", { chatId, username: message.from?.username ?? null });
    await sendMessage(chatId, BOT_COPY.welcome(chatId));
    return;
  }

  await sendMessage(chatId, `BanjirKawan received: ${text}`);
}

/* ------------------------- checklist check-off taps ------------------------ */

async function handleCheckoff(update: TelegramUpdate) {
  const cq = update.callback_query!;
  const match = cq.data?.match(/^d:([0-9a-f-]{36}):(\d+)$/);
  if (!match) {
    await answerCallbackQuery(cq.id, "…");
    return;
  }
  const [, dispatchId, orderStr] = match;
  const order = Number.parseInt(orderStr, 10);

  const ctx = await getDispatchCheckoffContext(dispatchId);
  if (!ctx) {
    logger.warn("check-off for unknown dispatch", { dispatchId });
    await answerCallbackQuery(cq.id, "❓");
    return;
  }

  const completed = await appendCompletedAction(dispatchId, order);
  const language = resolveMessageLanguage(ctx.language);
  const allDone = ctx.action_orders.every((o) => completed.includes(o));

  logger.info("action checked off", {
    dispatchId,
    order,
    completed: completed.length,
    total: ctx.action_orders.length,
  });

  await answerCallbackQuery(cq.id, checkSavedToast(language, order, allDone));

  // Reflect progress on the message itself (✓ n → ✅ n).
  if (cq.message) {
    await editMessageReplyMarkup(
      cq.message.chat.id,
      cq.message.message_id,
      buildChecklistKeyboard(ctx.action_orders, dispatchId, completed)
    );
  }
}
