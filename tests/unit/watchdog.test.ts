import { describe, expect, it } from "vitest";
import { checkFreshness, STALE_AFTER_MS, DEAD_AFTER_MS } from "@/modules/trigger";

const now = new Date("2026-07-13T12:00:00Z");

function minutesAgo(min: number): Date {
  return new Date(now.getTime() - min * 60 * 1000);
}

describe("checkFreshness", () => {
  it("fresh under 10 minutes", () => {
    expect(checkFreshness(minutesAgo(0), now)).toBe("fresh");
    expect(checkFreshness(minutesAgo(9), now)).toBe("fresh");
  });

  it("stale at exactly 10 minutes and beyond", () => {
    expect(checkFreshness(new Date(now.getTime() - STALE_AFTER_MS), now)).toBe("stale");
    expect(checkFreshness(minutesAgo(30), now)).toBe("stale");
  });

  it("dead at one hour and beyond", () => {
    expect(checkFreshness(new Date(now.getTime() - DEAD_AFTER_MS), now)).toBe("dead");
    expect(checkFreshness(minutesAgo(600), now)).toBe("dead");
  });

  it("dead when there is no reading at all", () => {
    expect(checkFreshness(null, now)).toBe("dead");
  });
});
