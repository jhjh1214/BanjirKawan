import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { sendMessage, type TelegramUpdate } from "@/modules/delivery";

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
  const message = update.message;

  if (message?.text) {
    const chatId = message.chat.id;
    if (message.text.trim() === "/start") {
      // Day 5: bind chat_id to a shop. Today we just log it.
      logger.info("telegram /start received", {
        chatId,
        username: message.from?.username ?? null,
      });
      await sendMessage(
        chatId,
        "Selamat datang ke BanjirKawan! 🌊\n" +
          "Setiap amaran banjir menjadi pelan tindakan kedai anda.\n" +
          `Chat ID anda: ${chatId} (akan dipautkan ke kedai anda tidak lama lagi.)`
      );
    } else {
      await sendMessage(chatId, `BanjirKawan received: ${message.text}`);
    }
  }

  // Always 200 so Telegram doesn't retry storms at us.
  return NextResponse.json({ ok: true });
}
