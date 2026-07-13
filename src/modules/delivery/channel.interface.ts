// Channel abstraction: Telegram today; SMS is a config-level roadmap item.

export interface DeliveryChannel {
  name: string;
  sendText(recipientId: string, text: string): Promise<DeliveryResult>;
}

export interface DeliveryResult {
  ok: boolean;
  /** Provider message id when available (Telegram message_id). */
  messageId?: string;
  error?: string;
}
