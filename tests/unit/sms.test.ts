import { describe, expect, it } from "vitest";
import {
  formatSmsChecklist,
  SMS_MAX_SEGMENTS,
  SMS_SEGMENT_CHARS,
  formatChecklistMessage,
} from "@/modules/delivery";

const actions = [
  { order: 1, text: "Alihkan rak rokok & kad prabayar serta terminal POS ke tingkat atas.", targetAssetIds: [], estMinutes: 8, savesRM: { low: 5800, high: 12000 }, deadlineOffsetMin: 15 },
  { order: 2, text: "Angkat guni beras ke atas kaunter dan rak paling atas.", targetAssetIds: [], estMinutes: 15, savesRM: { low: 1200, high: 2400 }, deadlineOffsetMin: 35 },
  { order: 3, text: "Pindahkan karton minyak masak & gula ke rak atas.", targetAssetIds: [], estMinutes: 12, savesRM: { low: 800, high: 1600 }, deadlineOffsetMin: 50 },
  { order: 4, text: "Kosongkan separas bawah gondola snek ke meja & rak atas.", targetAssetIds: [], estMinutes: 20, savesRM: { low: 1500, high: 3000 }, deadlineOffsetMin: 75 },
  { order: 5, text: "Angkat DVR CCTV dan fail lesen ke atas kaunter.", targetAssetIds: [], estMinutes: 6, savesRM: { low: 800, high: 2200 }, deadlineOffsetMin: 85 },
  { order: 6, text: "Cabut palam peti sejuk & penyejuk, kemudian TUTUP suis utama di DB box.", targetAssetIds: [], estMinutes: 8, savesRM: { low: 2000, high: 4000 }, deadlineOffsetMin: 100 },
];

describe("formatSmsChecklist", () => {
  const segments = formatSmsChecklist({
    playbook: { tier: "warning", actions },
    stationName: "Sg. Damansara di TTDI Jaya",
    language: "ms",
  });

  it("stays within the segment and count budgets", () => {
    expect(segments.length).toBeLessThanOrEqual(SMS_MAX_SEGMENTS);
    for (const s of segments) expect(s.length).toBeLessThanOrEqual(SMS_SEGMENT_CHARS);
  });

  it("keeps the numbered structure: every action number appears", () => {
    const all = segments.join("\n");
    for (const a of actions) expect(all).toContain(`${a.order}.`);
    expect(all).toContain("AMARAN BANJIR");
    expect(all).toContain("Sg. Damansara");
    expect(all).toContain("(8min)");
  });

  it("truncates absurdly long action text without breaking the line budget", () => {
    const long = formatSmsChecklist({
      playbook: {
        tier: "danger",
        actions: [{ order: 1, text: "x".repeat(500), targetAssetIds: [], estMinutes: 5, savesRM: { low: 0, high: 0 }, deadlineOffsetMin: 10 }],
      },
      stationName: "S",
      language: "en",
    });
    for (const s of long) expect(s.length).toBeLessThanOrEqual(SMS_SEGMENT_CHARS);
    expect(long.join("")).toContain("…");
  });

  it("renders all three languages", () => {
    for (const [language, marker] of [["ms", "AMARAN"], ["en", "FLOOD WARNING"], ["zh", "水灾警告"]] as const) {
      const out = formatSmsChecklist({
        playbook: { tier: "warning", actions: actions.slice(0, 2) },
        stationName: "S",
        language,
      });
      expect(out[0]).toContain(marker);
    }
  });
});

describe("early-tier timing note", () => {
  it("watch-tier telegram checklists carry the act-now-while-networks-up note", () => {
    const watch = formatChecklistMessage({
      playbook: { tier: "watch", actions: actions.slice(0, 2) },
      stationName: "S",
      dispatchId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeffff",
      language: "en",
    });
    expect(watch.text).toContain("network may fail");

    const warning = formatChecklistMessage({
      playbook: { tier: "warning", actions: actions.slice(0, 2) },
      stationName: "S",
      dispatchId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeffff",
      language: "en",
    });
    expect(warning.text).not.toContain("network may fail");
  });
});
