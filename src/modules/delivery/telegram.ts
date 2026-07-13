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

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface SendOptions {
  /** Rows of inline buttons (check-off checklist). */
  inlineKeyboard?: InlineKeyboardButton[][];
}

// --- Sending ---

async function callTelegram(
  method: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const token = getConfig().TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn(`telegram ${method} skipped: TELEGRAM_BOT_TOKEN not configured`);
    return { ok: false, error: "bot token not configured" };
  }
  try {
    const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json()) as { ok: boolean; result?: unknown; description?: string };
    if (!body.ok) {
      logger.error(`telegram ${method} failed`, { description: body.description });
      return { ok: false, error: body.description ?? `HTTP ${res.status}` };
    }
    return { ok: true, result: body.result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`telegram ${method} errored`, { error: message });
    return { ok: false, error: message };
  }
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  options?: SendOptions
): Promise<DeliveryResult> {
  const payload: Record<string, unknown> = { chat_id: chatId, text };
  if (options?.inlineKeyboard) {
    payload.reply_markup = { inline_keyboard: options.inlineKeyboard };
  }
  const out = await callTelegram("sendMessage", payload);
  if (!out.ok) return { ok: false, error: out.error };
  const result = out.result as { message_id?: number };
  return { ok: true, messageId: String(result?.message_id ?? "") };
}

/** Toast shown to the user after they tap an inline button. */
export async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  await callTelegram("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

/** Replace the inline keyboard on an existing message (check-off progress). */
export async function editMessageReplyMarkup(
  chatId: string | number,
  messageId: number,
  inlineKeyboard: InlineKeyboardButton[][]
): Promise<void> {
  await callTelegram("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: inlineKeyboard },
  });
}

export const telegramChannel: DeliveryChannel = {
  name: "telegram",
  sendText: sendMessage,
};
