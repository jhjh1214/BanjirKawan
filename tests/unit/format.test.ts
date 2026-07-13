import { describe, expect, it } from "vitest";
import {
  buildChecklistKeyboard,
  checkSavedToast,
  formatChecklistMessage,
  resolveMessageLanguage,
} from "@/modules/delivery";

const DISPATCH_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeffff";

const playbook = {
  tier: "warning" as const,
  actions: [
    {
      order: 1,
      text: "Alihkan guni beras ke rak atas",
      targetAssetIds: ["a1"],
      estMinutes: 15,
      savesRM: { low: 400, high: 800 },
      deadlineOffsetMin: 20,
    },
    {
      order: 2,
      text: "Tutup suis utama",
      targetAssetIds: ["a2"],
      estMinutes: 5,
      savesRM: { low: 5000, high: 10000 },
      deadlineOffsetMin: 40,
    },
  ],
};

describe("formatChecklistMessage", () => {
  it("renders title, station, budget, actions and footer in the shop language", () => {
    const { text, keyboard } = formatChecklistMessage({
      playbook,
      stationName: "Sg. Damansara di TTDI Jaya",
      dispatchId: DISPATCH_ID,
      language: "ms",
    });
    expect(text).toContain("AMARAN BANJIR");
    expect(text).toContain("Sg. Damansara di TTDI Jaya");
    expect(text).toContain("~20 minit");
    expect(text).toContain("1. Alihkan guni beras ke rak atas");
    expect(text).toContain("melindungi RM400–800");
    expect(keyboard.flat()).toHaveLength(2);
  });

  it("renders english and chinese variants", () => {
    for (const [language, marker] of [
      ["en", "FLOOD WARNING"],
      ["zh", "水灾警告"],
    ] as const) {
      const { text } = formatChecklistMessage({
        playbook,
        stationName: "Station X",
        dispatchId: DISPATCH_ID,
        language,
      });
      expect(text).toContain(marker);
    }
  });

  it("marks completed actions in text and keyboard", () => {
    const { text, keyboard } = formatChecklistMessage({
      playbook,
      stationName: "S",
      dispatchId: DISPATCH_ID,
      language: "ms",
      completedOrders: [1],
    });
    expect(text).toContain("✅ 1.");
    expect(text).toContain("▫️ 2.");
    expect(keyboard.flat()[0].text).toBe("✅ 1");
    expect(keyboard.flat()[1].text).toBe("✓ 2");
  });

  it("keeps callback_data within Telegram's 64-byte limit", () => {
    const { keyboard } = formatChecklistMessage({
      playbook,
      stationName: "S",
      dispatchId: DISPATCH_ID,
      language: "ms",
    });
    for (const btn of keyboard.flat()) {
      expect(Buffer.byteLength(btn.callback_data, "utf8")).toBeLessThanOrEqual(64);
      expect(btn.callback_data).toMatch(/^d:[0-9a-f-]{36}:\d+$/);
    }
  });

  it("chunks keyboards into rows of four", () => {
    const rows = buildChecklistKeyboard([1, 2, 3, 4, 5, 6], DISPATCH_ID, []);
    expect(rows.map((r) => r.length)).toEqual([4, 2]);
  });
});

describe("toasts & language resolution", () => {
  it("resolves unknown shop languages to ms", () => {
    expect(resolveMessageLanguage("en")).toBe("en");
    expect(resolveMessageLanguage("zh")).toBe("zh");
    expect(resolveMessageLanguage("ta")).toBe("ms");
    expect(resolveMessageLanguage(null)).toBe("ms");
  });

  it("celebrates when the whole checklist is done", () => {
    expect(checkSavedToast("ms", 2, false)).toContain("Langkah 2");
    expect(checkSavedToast("ms", 2, true)).toContain("Semua langkah selesai");
    expect(checkSavedToast("zh", 1, true)).toContain("所有步骤完成");
  });
});
