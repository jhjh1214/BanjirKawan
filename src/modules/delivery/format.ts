// Pure formatting of a cached playbook into a Telegram checklist message.
// Type-only imports from the playbook module — this file sits on the
// storm-time path and must stay free of any runtime AI linkage.

import type { Playbook, PlaybookTier } from "@/modules/playbook";
import type { InlineKeyboardButton } from "./telegram";

export type MessageLanguage = "ms" | "en" | "zh";

const STRINGS: Record<
  MessageLanguage,
  {
    title: Record<PlaybookTier, string>;
    stationLine: string; // {station}
    budgetLine: string; // {minutes}
    protects: string; // {low}-{high}
    footer: string;
    checkSaved: string; // {order}
    allDone: string;
    /** watch-tier only: act while power & data are still up. */
    earlyTierNote: string;
  }
> = {
  ms: {
    title: {
      watch: "🟡 WASPADA BANJIR",
      warning: "🟠 AMARAN BANJIR",
      danger: "🔴 BAHAYA BANJIR — BERTINDAK SEKARANG",
    },
    stationLine: "Stesen {station} telah melepasi paras ambang.",
    budgetLine: "Anggaran masa untuk bertindak: ~{minutes} minit.",
    protects: "melindungi RM{low}–{high}",
    footer: "Tandakan ✓ setiap langkah yang siap. Utamakan keselamatan diri.",
    checkSaved: "✅ Langkah {order} direkodkan",
    allDone: "🎉 Semua langkah selesai. Kedai anda bersedia.",
    earlyTierNote:
      "⏰ Bertindak SEKARANG semasa elektrik & talian masih ada — rangkaian mungkin terputus semasa banjir.",
  },
  en: {
    title: {
      watch: "🟡 FLOOD WATCH",
      warning: "🟠 FLOOD WARNING",
      danger: "🔴 FLOOD DANGER — ACT NOW",
    },
    stationLine: "Station {station} has crossed its threshold.",
    budgetLine: "Estimated time to act: ~{minutes} minutes.",
    protects: "protects RM{low}–{high}",
    footer: "Tap ✓ as you complete each step. Personal safety first.",
    checkSaved: "✅ Step {order} recorded",
    allDone: "🎉 All steps done. Your shop is ready.",
    earlyTierNote:
      "⏰ Act NOW while power & data are still up — the network may fail once flooding starts.",
  },
  zh: {
    title: {
      watch: "🟡 水灾戒备",
      warning: "🟠 水灾警告",
      danger: "🔴 水灾危险 — 立即行动",
    },
    stationLine: "监测站 {station} 已越过警戒水位。",
    budgetLine: "预计行动时间：约 {minutes} 分钟。",
    protects: "保护 RM{low}–{high}",
    footer: "完成每一步后点 ✓。人身安全第一。",
    checkSaved: "✅ 已记录第 {order} 步",
    allDone: "🎉 所有步骤完成。您的店铺已就绪。",
    earlyTierNote: "⏰ 趁电力和网络还在，立即行动 — 水灾开始后网络可能中断。",
  },
};

function tpl(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export function resolveMessageLanguage(shopLanguage: string | null | undefined): MessageLanguage {
  return shopLanguage === "en" || shopLanguage === "zh" ? shopLanguage : "ms";
}

export interface ChecklistMessage {
  text: string;
  keyboard: InlineKeyboardButton[][];
}

/**
 * Render the alert text + one ✓ button per action. callback_data:
 * "d:<dispatchId>:<actionOrder>" (fits Telegram's 64-byte limit).
 */
export function formatChecklistMessage(input: {
  playbook: Pick<Playbook, "tier" | "actions">;
  stationName: string;
  dispatchId: string;
  language: MessageLanguage;
  completedOrders?: number[];
}): ChecklistMessage {
  const { playbook, stationName, dispatchId, language, completedOrders = [] } = input;
  const s = STRINGS[language];
  const totalMinutes = playbook.actions.reduce((sum, a) => sum + a.estMinutes, 0);

  const lines = [
    s.title[playbook.tier],
    tpl(s.stationLine, { station: stationName }),
    tpl(s.budgetLine, { minutes: totalMinutes }),
    // TIMING is the primary answer to mid-storm connectivity loss: the watch
    // tier fires while power and data are still up, hours before water does.
    ...(playbook.tier === "watch" ? [s.earlyTierNote] : []),
    "",
    ...playbook.actions.map((a) => {
      const done = completedOrders.includes(a.order);
      const protects = tpl(s.protects, {
        low: a.savesRM.low.toLocaleString("en-MY"),
        high: a.savesRM.high.toLocaleString("en-MY"),
      });
      return `${done ? "✅" : "▫️"} ${a.order}. ${a.text} (${a.estMinutes} min, ${protects})`;
    }),
    "",
    s.footer,
  ];

  return {
    text: lines.join("\n"),
    keyboard: buildChecklistKeyboard(playbook.actions.map((a) => a.order), dispatchId, completedOrders),
  };
}

/** ✓ buttons in rows of 4; completed steps render as ✅ (still tappable, idempotent). */
export function buildChecklistKeyboard(
  orders: number[],
  dispatchId: string,
  completedOrders: number[]
): InlineKeyboardButton[][] {
  const buttons = orders.map((order) => ({
    text: completedOrders.includes(order) ? `✅ ${order}` : `✓ ${order}`,
    callback_data: `d:${dispatchId}:${order}`,
  }));
  const rows: InlineKeyboardButton[][] = [];
  for (let i = 0; i < buttons.length; i += 4) rows.push(buttons.slice(i, i + 4));
  return rows;
}

export function checkSavedToast(language: MessageLanguage, order: number, allDone: boolean): string {
  const s = STRINGS[language];
  return allDone ? s.allDone : tpl(s.checkSaved, { order });
}

const ADVISORY: Record<MessageLanguage, string> = {
  ms:
    "⚠️ NOTIS: Suapan data paras sungai JPS terganggu — kami tidak dapat memantau stesen anda buat masa ini.\n" +
    "Jika hujan lebat berterusan di kawasan anda, anggap ia sebagai AMARAN dan mulakan langkah pelan banjir anda. Keselamatan dahulu.",
  en:
    "⚠️ NOTICE: The JPS river data feed is disrupted — we can't monitor your station right now.\n" +
    "If heavy rain persists in your area, treat it as a WARNING and start your flood plan. Safety first.",
  zh:
    "⚠️ 通知：JPS 河流水位数据中断 — 目前无法监测您的站点。\n" +
    "如果您所在地区持续大雨，请按“警告”级别对待，立即启动水灾方案。安全第一。",
};

/**
 * Degraded-mode advisory — the watchdog's fail-loud-and-safe message when
 * the feed goes stale/dead. Deterministic; part of the storm-safe path.
 */
export function degradedModeAdvisory(language: MessageLanguage): string {
  return ADVISORY[language];
}

/** /start binding + welcome copy, kept beside the other outbound strings. */
export const BOT_COPY = {
  welcome: (chatId: number) =>
    "Selamat datang ke BanjirKawan! 🌊\n" +
    "Setiap amaran banjir menjadi pelan tindakan kedai anda.\n" +
    `Chat ID anda: ${chatId}`,
  linked: (shopName: string) =>
    `✅ Telegram disambungkan ke "${shopName}".\n` +
    "Anda akan menerima pelan tindakan sebaik sahaja stesen sungai anda melepasi paras amaran.\n" +
    `✅ Telegram connected to "${shopName}" — you'll get your flood checklist the moment your river station crosses a threshold.`,
  linkFailed:
    "❌ Kedai tidak dijumpai / shop not found. Sila daftar semula di laman web dan tekan butang Telegram sekali lagi.",
};
