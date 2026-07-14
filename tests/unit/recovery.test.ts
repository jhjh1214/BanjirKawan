import { describe, expect, it } from "vitest";
import { computeLossTotals, validateDamageReport } from "@/modules/recovery";
import { updateGraphFromOutcome } from "@/modules/learning";
import type { SiteGraph } from "@/modules/site-intelligence";

const graph: SiteGraph = {
  shopType: "kedai runcit",
  entrances: [{ id: "e1", facing: "street" }],
  assets: [
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
      id: "rice",
      label: "rice sacks",
      category: "stock",
      heightFromFloorCm: 5,
      movable: true,
      estMoveMinutes: 15,
      estValueRM: { low: 1000, high: 2000 },
      photoRef: "photo2",
      confidence: 0.9,
    },
    {
      id: "pos",
      label: "POS terminal",
      category: "equipment",
      heightFromFloorCm: 95,
      movable: true,
      estMoveMinutes: 3,
      estValueRM: { low: 1800, high: 3000 },
      photoRef: "photo3",
      confidence: 0.9,
    },
  ],
  electrical: { outletsNearFloor: true },
  risks: [],
};

function item(assetId: string, overrides: Record<string, unknown> = {}) {
  const asset = graph.assets.find((a) => a.id === assetId)!;
  return {
    assetId,
    label: asset.label,
    condition: "damaged",
    estLossRM: { low: 500, high: 1000 },
    note: "waterline visible",
    photoRef: "photo1",
    confidence: 0.85,
    ...overrides,
  };
}

describe("validateDamageReport", () => {
  it("accepts a clean report", () => {
    const out = validateDamageReport(
      { items: [item("freezer"), item("rice", { condition: "wet" }), item("pos", { condition: "ok", estLossRM: { low: 0, high: 0 } })], waterLineCm: 80, generalObservations: ["mud 5cm"] },
      graph
    );
    expect(out.ok).toBe(true);
    expect(out.errors).toEqual([]);
    expect(out.report!.items).toHaveLength(3);
  });

  it("rejects malformed shapes", () => {
    expect(validateDamageReport({ nonsense: 1 }, graph).ok).toBe(false);
  });

  it("drops hallucinated assets (repair, not rejection) — rejects only if nothing survives", () => {
    const out = validateDamageReport({ items: [item("freezer"), { ...item("freezer"), assetId: "ghost" }] }, graph);
    expect(out.ok).toBe(true);
    expect(out.report!.items.map((i) => i.assetId)).toEqual(["freezer"]);
    expect(out.repairs.join()).toContain("ghost");

    const allGhosts = validateDamageReport({ items: [{ ...item("freezer"), assetId: "ghost" }] }, graph);
    expect(allGhosts.ok).toBe(false);
  });

  it("zeroes loss on ok items and caps absurd claims at 1.2x surveyed value", () => {
    const out = validateDamageReport(
      {
        items: [
          item("pos", { condition: "ok", estLossRM: { low: 100, high: 200 } }),
          item("freezer", { condition: "destroyed", estLossRM: { low: 5000, high: 50000 } }),
        ],
      },
      graph
    );
    expect(out.ok).toBe(true);
    const pos = out.report!.items.find((i) => i.assetId === "pos")!;
    expect(pos.estLossRM).toEqual({ low: 0, high: 0 });
    const freezer = out.report!.items.find((i) => i.assetId === "freezer")!;
    expect(freezer.estLossRM.high).toBe(6000 * 1.2);
  });

  it("defaults destroyed/missing zero-loss items to surveyed value", () => {
    const out = validateDamageReport(
      { items: [item("rice", { condition: "missing", estLossRM: { low: 0, high: 0 } })] },
      graph
    );
    expect(out.report!.items[0].estLossRM).toEqual({ low: 1000, high: 2000 });
  });

  it("flags low-confidence items and clears implausible waterlines", () => {
    const out = validateDamageReport(
      { items: [item("freezer", { confidence: 0.3 })], waterLineCm: 900 },
      graph
    );
    expect(out.lowConfidenceAssetIds).toEqual(["freezer"]);
    expect(out.report!.waterLineCm).toBeUndefined();
  });
});

describe("computeLossTotals", () => {
  it("sums only affected items", () => {
    const totals = computeLossTotals({
      items: [
        item("freezer", { condition: "destroyed", estLossRM: { low: 3000, high: 6000 } }),
        item("rice", { condition: "wet", estLossRM: { low: 1000, high: 2000 } }),
        item("pos", { condition: "ok", estLossRM: { low: 0, high: 0 } }),
      ] as never,
    });
    expect(totals).toEqual({ low: 4000, high: 8000, affectedItems: 2 });
  });
});

describe("updateGraphFromOutcome (learning loop)", () => {
  it("removes destroyed/missing assets and records planning inputs", () => {
    const { nextGraph, changesSummary } = updateGraphFromOutcome(
      graph,
      {
        items: [
          item("freezer", { condition: "destroyed" }),
          item("rice", { condition: "wet" }),
          item("pos", { condition: "ok" }),
        ] as never,
        waterLineCm: 80,
      },
      "2026-07-14"
    );
    expect(nextGraph.assets.map((a) => a.id)).toEqual(["rice", "pos"]);
    expect(nextGraph.risks.join()).toContain("80cm");
    expect(nextGraph.risks.join()).toContain("rice sacks");
    expect(changesSummary.length).toBeGreaterThanOrEqual(3);
    // append-only discipline: the input graph is untouched
    expect(graph.assets).toHaveLength(3);
  });

  it("is a no-op summary when nothing was damaged", () => {
    const { nextGraph, changesSummary } = updateGraphFromOutcome(
      graph,
      { items: [item("pos", { condition: "ok" })] as never },
      "2026-07-14"
    );
    expect(nextGraph.assets).toHaveLength(3);
    expect(changesSummary).toEqual([]);
  });
});
