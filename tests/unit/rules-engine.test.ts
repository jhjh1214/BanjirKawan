import { describe, expect, it } from "vitest";
import { validatePlaybook } from "@/modules/playbook";
import type { SiteGraph } from "@/modules/site-intelligence";

const graph: SiteGraph = {
  shopType: "kedai runcit",
  entrances: [{ id: "e1", facing: "street" }],
  assets: [
    {
      id: "rice",
      label: "rice sacks",
      category: "stock",
      heightFromFloorCm: 0,
      movable: true,
      estMoveMinutes: 10,
      estValueRM: { low: 400, high: 800 },
      photoRef: "photo1",
      confidence: 0.9,
    },
    {
      id: "freezer",
      label: "chest freezer",
      category: "equipment",
      heightFromFloorCm: 0,
      movable: false,
      estValueRM: { low: 3000, high: 6000 },
      photoRef: "photo1",
      confidence: 0.9,
    },
    {
      id: "db",
      label: "distribution board",
      category: "electrical",
      heightFromFloorCm: 140,
      movable: false,
      estValueRM: { low: 500, high: 1500 },
      photoRef: "photo2",
      confidence: 0.8,
    },
  ],
  electrical: { outletsNearFloor: true },
  risks: [],
};

function action(order: number, overrides: Record<string, unknown> = {}) {
  return {
    order,
    text: `action ${order}`,
    targetAssetIds: ["rice"],
    estMinutes: 10,
    savesRM: { low: 100, high: 500 },
    deadlineOffsetMin: order * 15,
    ...overrides,
  };
}

function playbook(actions: Array<Record<string, unknown>>, overrides: Record<string, unknown> = {}) {
  return {
    tier: "warning",
    language: "ms",
    estTotalMinutes: actions.reduce((s, a) => s + (a.estMinutes as number), 0),
    actions,
    ...overrides,
  };
}

describe("validatePlaybook", () => {
  it("accepts a well-formed plan", () => {
    const out = validatePlaybook(
      playbook([action(1), action(2), action(3, { targetAssetIds: ["db"], estMinutes: 5 })]),
      graph,
      "warning"
    );
    expect(out.errors).toEqual([]);
    expect(out.ok).toBe(true);
  });

  it("rejects malformed JSON shapes", () => {
    expect(validatePlaybook({ nonsense: true }, graph, "warning").ok).toBe(false);
  });

  it("rejects tier mismatch and empty plans", () => {
    expect(validatePlaybook(playbook([action(1)], { tier: "danger" }), graph, "warning").ok).toBe(false);
    expect(validatePlaybook(playbook([]), graph, "warning").ok).toBe(false);
  });

  it("enforces the tier lead-time budget", () => {
    // warning budget = 120 min; 3 x 50 = 150 min → reject
    const out = validatePlaybook(
      playbook([action(1, { estMinutes: 50 }), action(2, { estMinutes: 50 }), action(3, { estMinutes: 50 })]),
      graph,
      "warning"
    );
    expect(out.ok).toBe(false);
    expect(out.errors.join()).toContain("lead-time budget");
  });

  it("rejects unknown asset references", () => {
    const out = validatePlaybook(playbook([action(1, { targetAssetIds: ["ghost"] })]), graph, "warning");
    expect(out.ok).toBe(false);
    expect(out.errors.join()).toContain("unknown asset");
  });

  it("rejects long work on immovable assets", () => {
    const out = validatePlaybook(
      playbook([action(1, { targetAssetIds: ["freezer"], estMinutes: 45 })]),
      graph,
      "warning"
    );
    expect(out.ok).toBe(false);
    expect(out.errors.join()).toContain("immovable");
  });

  it("forces electrical actions into the final third of the plan", () => {
    const early = validatePlaybook(
      playbook([
        action(1, { targetAssetIds: ["db"], estMinutes: 5 }),
        action(2),
        action(3),
        action(4),
        action(5),
        action(6),
      ]),
      graph,
      "warning"
    );
    expect(early.ok).toBe(false);
    expect(early.errors.join()).toContain("electrical");

    const late = validatePlaybook(
      playbook([
        action(1),
        action(2),
        action(3),
        action(4),
        action(5),
        action(6, { targetAssetIds: ["db"], estMinutes: 5 }),
      ]),
      graph,
      "warning"
    );
    expect(late.ok).toBe(true);
  });

  it("rejects deadlines that run backwards", () => {
    const out = validatePlaybook(
      playbook([action(1, { deadlineOffsetMin: 60 }), action(2, { deadlineOffsetMin: 20 })]),
      graph,
      "warning"
    );
    expect(out.ok).toBe(false);
    expect(out.errors.join()).toContain("deadline");
  });

  it("repairs non-contiguous ordering and wrong totals instead of rejecting", () => {
    const out = validatePlaybook(
      playbook([action(2), action(5, { deadlineOffsetMin: 90 })], { estTotalMinutes: 999 }),
      graph,
      "warning"
    );
    expect(out.ok).toBe(true);
    expect(out.playbook!.actions.map((a) => a.order)).toEqual([1, 2]);
    expect(out.playbook!.estTotalMinutes).toBe(20);
    expect(out.repairs.length).toBeGreaterThanOrEqual(2);
  });
});
