import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import type { DeliveryChannel, DeliveryResult } from "./channel.interface";

const API_BASE = "https://api.telegram.org";

// --- Webhook payload types (the subset we handle) ---

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string; first_name?: string; username?: string };
  from?: { id: number; first_name?: string; username?: string };
  text?: string;
  photo?: Array<{ file_id: string; width: number; height: number }>;
}

export interface TelegramCallbackQuery {
  id: string;
  from: { id: number };
  message?: TelegramMessage;
  /** Check-off payloads (Day 5): e.g. "done:<dispatchId>:<actionOrder>" */
  data?: string;
}

// --- Sending ---

export async function sendMessage(chatId: string | number, text: string): Promise<DeliveryResult> {
  const token = getConfig().TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn("telegram send skipped: TELEGRAM_BOT_TOKEN not configured", { chatId });
    return { ok: false, error: "bot token not configured" };
  }

  try {
    const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json()) as {
      ok: boolean;
      result?: { message_id: number };
      description?: string;
    };
    if (!body.ok) {
      logger.error("telegram send failed", { chatId, description: body.description });
      return { ok: false, error: body.description ?? `HTTP ${res.status}` };
    }
    return { ok: true, messageId: String(body.result?.message_id ?? "") };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("telegram send errored", { chatId, error: message });
    return { ok: false, error: message };
  }
}

export const telegramChannel: DeliveryChannel = {
  name: "telegram",
  sendText: sendMessage,
};
