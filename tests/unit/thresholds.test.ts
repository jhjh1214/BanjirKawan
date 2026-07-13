import { describe, expect, it } from "vitest";
import { classify, severityRank, THRESHOLD_TO_TIER } from "@/modules/trigger";
import type { StationReading } from "@/modules/trigger";

function reading(
  levelM: number | null,
  thresholds: Partial<StationReading["thresholds"]> = {}
): StationReading {
  return {
    stationId: "0000001",
    stationName: "Test",
    district: "Test",
    mainBasin: "Basin",
    subBasin: "Sub",
    stateCode: "SEL",
    levelM,
    thresholds: {
      normal: 1.0,
      alert: 2.0,
      warning: 3.0,
      danger: 4.0,
      ...thresholds,
    },
    lastUpdateRaw: "",
    lastUpdate: null,
  };
}

describe("classify", () => {
  it("classifies against the station's own thresholds", () => {
    expect(classify(reading(0.5))).toBe("normal");
    expect(classify(reading(1.9))).toBe("normal");
    expect(classify(reading(2.0))).toBe("alert");
    expect(classify(reading(2.9))).toBe("alert");
    expect(classify(reading(3.0))).toBe("warning");
    expect(classify(reading(4.0))).toBe("danger");
    expect(classify(reading(99))).toBe("danger");
  });

  it("boundary values are inclusive of the tier they enter", () => {
    expect(classify(reading(2.0))).toBe("alert");
    expect(classify(reading(3.0))).toBe("warning");
    expect(classify(reading(4.0))).toBe("danger");
  });

  it("returns unknown when the level is missing", () => {
    expect(classify(reading(null))).toBe("unknown");
  });

  it("returns unknown when no thresholds are published", () => {
    expect(classify(reading(5, { alert: null, warning: null, danger: null }))).toBe("unknown");
  });

  it("skips missing intermediate thresholds", () => {
    // Station only publishes danger
    expect(classify(reading(3.5, { alert: null, warning: null }))).toBe("normal");
    expect(classify(reading(4.5, { alert: null, warning: null }))).toBe("danger");
  });
});

describe("severityRank / tier mapping", () => {
  it("orders severities", () => {
    expect(severityRank("normal")).toBeLessThan(severityRank("alert"));
    expect(severityRank("alert")).toBeLessThan(severityRank("warning"));
    expect(severityRank("warning")).toBeLessThan(severityRank("danger"));
    expect(severityRank("unknown")).toBe(-1);
  });

  it("maps threshold states to playbook tiers", () => {
    expect(THRESHOLD_TO_TIER.alert).toBe("watch");
    expect(THRESHOLD_TO_TIER.warning).toBe("warning");
    expect(THRESHOLD_TO_TIER.danger).toBe("danger");
    expect(THRESHOLD_TO_TIER.normal).toBeNull();
    expect(THRESHOLD_TO_TIER.unknown).toBeNull();
  });
});
