import { describe, expect, it } from "vitest";
import { rankAssets, vulnerabilityAt, TIER_FLOOD_DEPTH_CM } from "@/modules/playbook";
import type { SiteAsset } from "@/modules/site-intelligence";

function asset(overrides: Partial<SiteAsset>): SiteAsset {
  return {
    id: "a1",
    label: "test asset",
    category: "stock",
    heightFromFloorCm: 0,
    movable: true,
    estMoveMinutes: 10,
    estValueRM: { low: 1000, high: 2000 },
    photoRef: "photo1",
    confidence: 0.9,
    ...overrides,
  };
}

describe("vulnerabilityAt", () => {
  it("is 1.0 for floor-level assets and 0 above the waterline", () => {
    expect(vulnerabilityAt(asset({ heightFromFloorCm: 0 }), 80)).toBe(1);
    expect(vulnerabilityAt(asset({ heightFromFloorCm: 80 }), 80)).toBe(0);
    expect(vulnerabilityAt(asset({ heightFromFloorCm: 120 }), 80)).toBe(0);
  });

  it("falls linearly with clearance", () => {
    expect(vulnerabilityAt(asset({ heightFromFloorCm: 40 }), 80)).toBeCloseTo(0.5);
    expect(vulnerabilityAt(asset({ heightFromFloorCm: 60 }), 80)).toBeCloseTo(0.25);
  });
});

describe("rankAssets", () => {
  it("puts high-value floor-level fast-to-save assets first", () => {
    const freezer = asset({ id: "freezer", estValueRM: { low: 10000, high: 20000 }, movable: false });
    const rice = asset({ id: "rice", estValueRM: { low: 400, high: 600 }, estMoveMinutes: 5 });
    const posOnCounter = asset({
      id: "pos",
      heightFromFloorCm: 100,
      estValueRM: { low: 2000, high: 3000 },
      estMoveMinutes: 2,
    });

    const ranked = rankAssets([rice, posOnCounter, freezer], "warning"); // 80cm depth
    // freezer: 15000 * 1.0 / 5(immovable floor) = 3000; rice: 500*1/5=100; pos: 2500*0/x -> excluded
    expect(ranked[0].asset.id).toBe("freezer");
    expect(ranked.find((r) => r.asset.id === "pos")).toBeUndefined(); // above 80cm waterline
  });

  it("includes elevated assets only at tiers deep enough to reach them", () => {
    const highShelf = asset({ id: "shelf", heightFromFloorCm: 100 });
    expect(rankAssets([highShelf], "watch")).toHaveLength(0); // 30cm
    expect(rankAssets([highShelf], "danger")).toHaveLength(1); // 150cm
    expect(TIER_FLOOD_DEPTH_CM.danger).toBeGreaterThan(100);
  });

  it("returns an empty ranking when nothing is exposed", () => {
    expect(rankAssets([asset({ heightFromFloorCm: 200 })], "danger")).toHaveLength(0);
  });
});
