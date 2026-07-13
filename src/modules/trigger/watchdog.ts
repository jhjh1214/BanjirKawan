export type Freshness = "fresh" | "stale" | "dead";

export const STALE_AFTER_MS = 10 * 60 * 1000; // 10 minutes
export const DEAD_AFTER_MS = 60 * 60 * 1000; // 1 hour

/**
 * Pure freshness check for the data feed. When readings go stale mid-storm we
 * fail loud and safe: flag it, and (Day 5) send a degraded-mode advisory
 * instead of pretending conditions are known.
 */
export function checkFreshness(lastReadingAt: Date | null, now: Date = new Date()): Freshness {
  if (lastReadingAt === null) return "dead";
  const age = now.getTime() - lastReadingAt.getTime();
  if (age >= DEAD_AFTER_MS) return "dead";
  if (age >= STALE_AFTER_MS) return "stale";
  return "fresh";
}
