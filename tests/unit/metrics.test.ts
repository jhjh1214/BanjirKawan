import { describe, expect, it } from "vitest";
import {
  computeEventMetrics,
  computeOverviewMetrics,
  formatDurationMs,
  formatRmRange,
  median,
} from "@/modules/metrics";

// Golden fixture: one warning event, two shops, exact hand-checked numbers.
const T0 = new Date("2026-07-13T14:00:00.000Z"); // threshold detection
const SENT_A = new Date("2026-07-13T14:00:02.100Z"); // +2.1s
const SENT_B = new Date("2026-07-13T14:00:03.100Z"); // +3.1s

const event = {
  id: "event-1",
  stationId: "3015490",
  tier: "warning",
  startedAt: T0,
  simulated: true,
};

const dispatchA = {
  dispatchId: "aaaaaaaa-0000-0000-0000-000000000001",
  status: "sent",
  sentAt: SENT_A,
  shopName: "Kedai A",
  actions: [
    { order: 1, savesRM: { low: 15000, high: 45000 } },
    { order: 2, savesRM: { low: 500, high: 1500 } },
    { order: 3, savesRM: { low: 300, high: 800 } },
    { order: 4, savesRM: { low: 100, high: 300 } },
    { order: 5, savesRM: { low: 20000, high: 40000 } },
    { order: 6, savesRM: { low: 2000, high: 6000 } },
  ],
};

const dispatchB = {
  dispatchId: "bbbbbbbb-0000-0000-0000-000000000002",
  status: "sent",
  sentAt: SENT_B,
  shopName: "Kedai B",
  actions: [
    { order: 1, savesRM: { low: 1000, high: 2000 } },
    { order: 2, savesRM: { low: 4000, high: 9000 } },
  ],
};

// A: checks 1,2,5 (first at +90s after send). B: checks nothing.
const checkoffs = [
  { dispatchId: dispatchA.dispatchId, actionOrder: 2, checkedAt: new Date(SENT_A.getTime() + 90_000) },
  { dispatchId: dispatchA.dispatchId, actionOrder: 1, checkedAt: new Date(SENT_A.getTime() + 150_000) },
  { dispatchId: dispatchA.dispatchId, actionOrder: 5, checkedAt: new Date(SENT_A.getTime() + 500_000) },
];

// Station hits DANGER 3h12m after the first send.
const timeline = {
  firstDangerAt: new Date(SENT_A.getTime() + (3 * 60 + 12) * 60_000),
  peakAt: new Date(SENT_A.getTime() + 4 * 60 * 60_000),
};

describe("computeEventMetrics (golden fixture)", () => {
  const m = computeEventMetrics(event, [dispatchA, dispatchB], checkoffs, timeline);

  it("computes exact RM ranges", () => {
    // actionable = A(37,900–93,600) + B(5,000–11,000)
    expect(m.rmActionable).toEqual({ low: 42900, high: 104600 });
    // protected = A actions 1+2+5 = 35,500–86,500
    expect(m.rmProtected).toEqual({ low: 35500, high: 86500 });
    expect(m.rmUnactioned).toEqual({ low: 7400, high: 18100 });
  });

  it("computes completion 3/8 and counts", () => {
    expect(m.totalActions).toBe(8);
    expect(m.checkedActions).toBe(3);
    expect(m.completionRate).toBeCloseTo(3 / 8, 10);
    expect(m.shops).toBe(2);
    expect(m.dispatchesSent).toBe(2);
  });

  it("computes dispatch latency from the earliest send (2100ms)", () => {
    expect(m.dispatchLatencyMs).toBe(2100);
  });

  it("computes lead time to first DANGER reading (3h12m)", () => {
    expect(m.leadTimeMs).toBe((3 * 60 + 12) * 60_000);
  });

  it("median first check-off = 90s (only dispatch A has checkoffs)", () => {
    expect(m.medianFirstCheckoffMs).toBe(90_000);
  });
});

describe("edge cases", () => {
  it("no dispatches → zeros and nulls, never NaN", () => {
    const m = computeEventMetrics(event, [], [], { firstDangerAt: null, peakAt: null });
    expect(m.rmActionable).toEqual({ low: 0, high: 0 });
    expect(m.completionRate).toBeNull();
    expect(m.dispatchLatencyMs).toBeNull();
    expect(m.leadTimeMs).toBeNull();
    expect(m.medianFirstCheckoffMs).toBeNull();
  });

  it("failed dispatches are excluded from value math", () => {
    const dead = { ...dispatchA, status: "dead" as const };
    const m = computeEventMetrics(event, [dead], [], timeline);
    expect(m.dispatchesSent).toBe(0);
    expect(m.rmActionable).toEqual({ low: 0, high: 0 });
  });

  it("falls back to peak reading when the station never hits danger", () => {
    const m = computeEventMetrics(event, [dispatchA], checkoffs, {
      firstDangerAt: null,
      peakAt: timeline.peakAt,
    });
    expect(m.leadTimeMs).toBe(4 * 60 * 60_000);
  });

  it("clamps negative lead time (danger before dispatch) to zero", () => {
    const m = computeEventMetrics(event, [dispatchA], [], {
      firstDangerAt: new Date(SENT_A.getTime() - 60_000),
      peakAt: null,
    });
    expect(m.leadTimeMs).toBe(0);
  });
});

describe("computeOverviewMetrics", () => {
  it("aggregates across events with weighted completion", () => {
    const e1 = computeEventMetrics(event, [dispatchA, dispatchB], checkoffs, timeline);
    const e2 = computeEventMetrics(
      { ...event, id: "event-2" },
      [dispatchB],
      [],
      { firstDangerAt: null, peakAt: null }
    );
    const o = computeOverviewMetrics([e1, e2]);
    expect(o.events).toBe(2);
    expect(o.dispatchesSent).toBe(3);
    expect(o.totalActions).toBe(10);
    expect(o.checkedActions).toBe(3);
    expect(o.completionRate).toBeCloseTo(0.3, 10);
    expect(o.rmProtected).toEqual({ low: 35500, high: 86500 });
    expect(o.medianFirstCheckoffMs).toBe(90_000);
    // latency avg over events with sends: (2100 + 3100) / 2
    expect(o.avgDispatchLatencyMs).toBe(2600);
  });

  it("empty overview is null-safe", () => {
    const o = computeOverviewMetrics([]);
    expect(o.completionRate).toBeNull();
    expect(o.avgDispatchLatencyMs).toBeNull();
    expect(o.rmProtected).toEqual({ low: 0, high: 0 });
  });
});

describe("helpers", () => {
  it("median handles odd/even/empty", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it("formats durations across scales", () => {
    expect(formatDurationMs(null)).toBe("—");
    expect(formatDurationMs(95)).toBe("95ms");
    expect(formatDurationMs(2100)).toBe("2.1s");
    expect(formatDurationMs(90_000)).toBe("2m");
    expect(formatDurationMs((3 * 60 + 12) * 60_000)).toBe("3h 12m");
  });

  it("formats RM ranges", () => {
    expect(formatRmRange({ low: 38400, high: 61200 })).toBe("RM 38,400–61,200");
    expect(formatRmRange({ low: 500, high: 500 })).toBe("RM 500");
  });
});
