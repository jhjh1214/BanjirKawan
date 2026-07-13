import { describe, expect, it } from "vitest";
import { validateSiteGraph } from "@/modules/site-intelligence";

function baseGraph() {
  return {
    shopType: "kedai runcit",
    entrances: [{ id: "e1", facing: "street" }],
    assets: [
      {
        id: "a1",
        label: "chest freezer",
        category: "equipment",
        heightFromFloorCm: 0,
        movable: false,
        estValueRM: { low: 1500, high: 3000 },
        photoRef: "photo1",
        confidence: 0.9,
      },
    ],
    electrical: { outletsNearFloor: true },
    risks: ["stock on floor"],
  };
}

describe("validateSiteGraph", () => {
  it("accepts a clean graph", () => {
    const out = validateSiteGraph(baseGraph());
    expect(out.ok).toBe(true);
    expect(out.errors).toEqual([]);
    expect(out.lowConfidenceAssetIds).toEqual([]);
  });

  it("rejects non-schema output (hallucinated shape)", () => {
    const out = validateSiteGraph({ shop: "whatever", items: [] });
    expect(out.ok).toBe(false);
    expect(out.graph).toBeNull();
    expect(out.errors.length).toBeGreaterThan(0);
  });

  it("rejects zero assets", () => {
    const g = baseGraph();
    g.assets = [];
    expect(validateSiteGraph(g).ok).toBe(false);
  });

  it("rejects implausible heights (> 500cm) and clamps negatives", () => {
    const g = baseGraph();
    g.assets[0].heightFromFloorCm = 900;
    expect(validateSiteGraph(g).ok).toBe(false);

    const g2 = baseGraph();
    g2.assets[0].heightFromFloorCm = -10;
    const out2 = validateSiteGraph(g2);
    expect(out2.ok).toBe(true);
    expect(out2.graph!.assets[0].heightFromFloorCm).toBe(0);
    expect(out2.repairs.length).toBe(1);
  });

  it("swaps inverted value ranges", () => {
    const g = baseGraph();
    g.assets[0].estValueRM = { low: 5000, high: 100 };
    const out = validateSiteGraph(g);
    expect(out.ok).toBe(true);
    expect(out.graph!.assets[0].estValueRM).toEqual({ low: 100, high: 5000 });
  });

  it("rejects absurd valuations", () => {
    const g = baseGraph();
    g.assets[0].estValueRM = { low: 100, high: 900_000 };
    expect(validateSiteGraph(g).ok).toBe(false);
  });

  it("defaults estMoveMinutes for movable assets and demotes slow moves", () => {
    const g = baseGraph();
    g.assets[0].movable = true; // no estMoveMinutes
    const out = validateSiteGraph(g);
    expect(out.graph!.assets[0].estMoveMinutes).toBe(10);

    const g2 = baseGraph();
    (g2.assets[0] as Record<string, unknown>).movable = true;
    (g2.assets[0] as Record<string, unknown>).estMoveMinutes = 300;
    const out2 = validateSiteGraph(g2);
    expect(out2.graph!.assets[0].movable).toBe(false);
  });

  it("re-keys duplicate asset ids", () => {
    const g = baseGraph();
    g.assets.push({ ...baseGraph().assets[0] }); // same id a1
    const out = validateSiteGraph(g);
    expect(out.ok).toBe(true);
    const ids = out.graph!.assets.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("flags low-confidence assets for owner confirmation", () => {
    const g = baseGraph();
    g.assets[0].confidence = 0.4;
    const out = validateSiteGraph(g);
    expect(out.ok).toBe(true);
    expect(out.lowConfidenceAssetIds).toEqual([g.assets[0].id]);
  });
});
