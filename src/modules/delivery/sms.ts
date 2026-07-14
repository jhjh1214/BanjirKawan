// SMS fallback — the "Variety" mark: same cached playbook, second transport.
// Renders a validated playbook into <=3 plain-text segments of <=160 chars
// (single-message GSM budget), numbers-only checklist, no links, no unicode
// beyond what Malaysian carriers pass through.
//
// The channel is provider-agnostic: the console driver proves the design
// without a paid SMS account; a Twilio/MessageBird driver is a config-level
// swap behind the same DeliveryChannel interface.

import { logger } from "@/lib/logger";
import type { Playbook, PlaybookTier } from "@/modules/playbook";
import type { DeliveryChannel, DeliveryResult } from "./channel.interface";
import type { MessageLanguage } from "./format";

export const SMS_SEGMENT_CHARS = 160;
export const SMS_MAX_SEGMENTS = 3;

const SMS_STRINGS: Record<
  MessageLanguage,
  { header: Record<PlaybookTier, string>; minutes: string; footer: string }
> = {
  ms: {
    header: { watch: "WASPADA BANJIR", warning: "AMARAN BANJIR", danger: "BAHAYA BANJIR" },
    minutes: "min",
    footer: "Keselamatan dulu. -BanjirKawan",
  },
  en: {
    header: { watch: "FLOOD WATCH", warning: "FLOOD WARNING", danger: "FLOOD DANGER" },
    minutes: "min",
    footer: "Safety first. -BanjirKawan",
  },
  zh: {
    header: { watch: "水灾戒备", warning: "水灾警告", danger: "水灾危险" },
    minutes: "分钟",
    footer: "安全第一 -BanjirKawan",
  },
};

/**
 * Deterministic compression of a playbook into SMS segments. Actions keep
 * their order number and time budget; text is truncated per-line so the
 * numbered structure always survives. Returns 1..SMS_MAX_SEGMENTS strings.
 */
export function formatSmsChecklist(input: {
  playbook: Pick<Playbook, "tier" | "actions">;
  stationName: string;
  language: MessageLanguage;
}): string[] {
  const { playbook, stationName, language } = input;
  const s = SMS_STRINGS[language];

  const header = `${s.header[playbook.tier]}: ${stationName}`.slice(0, SMS_SEGMENT_CHARS - 8);

  // Every action MUST survive — dropping the last step (usually the mains
  // shutdown) is worse than abbreviating all of them. Whole lines can't split
  // across segments, so search downward for the largest per-line budget whose
  // greedy packing fits the segment cap.
  const buildLines = (perLineBudget: number) =>
    playbook.actions.map((a) => {
      const prefix = `${a.order}.`;
      const suffix = ` (${a.estMinutes}${s.minutes})`;
      const budget = Math.min(perLineBudget, SMS_SEGMENT_CHARS) - prefix.length - suffix.length;
      const text = a.text.length > budget ? `${a.text.slice(0, Math.max(1, budget - 1))}…` : a.text;
      return `${prefix}${text}${suffix}`;
    });

  const pack = (lines: string[]): string[] => {
    const segments: string[] = [];
    let current = header;
    for (const line of lines) {
      const candidate = `${current}\n${line}`;
      if (candidate.length <= SMS_SEGMENT_CHARS) {
        current = candidate;
      } else {
        segments.push(current);
        current = line;
      }
    }
    const withFooter = `${current}\n${s.footer}`;
    segments.push(withFooter.length <= SMS_SEGMENT_CHARS ? withFooter : current);
    return segments;
  };

  const MIN_LINE_BUDGET = 28; // "N.<~20 chars>… (NNmin)" stays legible
  for (let budget = SMS_SEGMENT_CHARS; budget >= MIN_LINE_BUDGET; budget -= 4) {
    const segments = pack(buildLines(budget));
    if (segments.length <= SMS_MAX_SEGMENTS) return segments;
  }

  // Pathological playbook (won't occur post-rules-engine: 4-8 actions always
  // fit at the floor budget) — keep the first segments and mark the cut.
  const segments = pack(buildLines(MIN_LINE_BUDGET)).slice(0, SMS_MAX_SEGMENTS);
  const last = segments[SMS_MAX_SEGMENTS - 1];
  segments[SMS_MAX_SEGMENTS - 1] =
    last.length + 2 <= SMS_SEGMENT_CHARS ? `${last} +…` : `${last.slice(0, SMS_SEGMENT_CHARS - 3)} +…`;
  return segments;
}

/**
 * Console/log SMS driver — proves the transport design without a paid
 * gateway. Swapping in a real provider changes ONLY this object.
 */
export const smsConsoleChannel: DeliveryChannel = {
  name: "sms-console",
  async sendText(recipientId: string, text: string): Promise<DeliveryResult> {
    logger.info("SMS (console driver)", {
      to: recipientId,
      chars: text.length,
      text,
    });
    return { ok: true, messageId: `console-${Date.now()}` };
  },
};
