import type { StationReading } from "./infobanjir";

export type ThresholdState = "normal" | "alert" | "warning" | "danger" | "unknown";

/** Playbook tiers map onto threshold states: alert→watch, warning→warning, danger→danger. */
export const THRESHOLD_TO_TIER: Record<ThresholdState, "watch" | "warning" | "danger" | null> = {
  normal: null,
  unknown: null,
  alert: "watch",
  warning: "warning",
  danger: "danger",
};

const SEVERITY: ThresholdState[] = ["normal", "alert", "warning", "danger"];

export function severityRank(state: ThresholdState): number {
  const idx = SEVERITY.indexOf(state);
  return idx === -1 ? -1 : idx;
}

export type PlaybookTierName = "watch" | "warning" | "danger";

const TIER_ORDER: PlaybookTierName[] = ["watch", "warning", "danger"];

export function tierRank(tier: PlaybookTierName): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * Debounce decision (pure): should an escalation to `tier` fire a fresh
 * dispatch, given the highest tier already dispatched for this station in the
 * recent window? Re-notify only on escalation to a STRICTLY higher tier —
 * a station oscillating at one threshold must not spam a new alert each cycle.
 */
export function shouldDispatchEscalation(
  tier: PlaybookTierName,
  recentHighestTier: PlaybookTierName | null
): boolean {
  if (recentHighestTier === null) return true;
  return tierRank(tier) > tierRank(recentHighestTier);
}

/**
 * Classify a reading against the station's OWN published thresholds.
 * Pure and deterministic — this sits on the storm-time critical path.
 *
 * Rules:
 * - no level, or no usable thresholds at all → "unknown"
 * - level >= danger → "danger"; >= warning → "warning"; >= alert → "alert"
 * - otherwise → "normal"
 * - missing intermediate thresholds are skipped (a station publishing only
 *   danger still classifies correctly against it)
 */
export function classify(reading: StationReading): ThresholdState {
  const { levelM, thresholds } = reading;
  if (levelM === null) return "unknown";

  const { alert, warning, danger } = thresholds;
  if (alert === null && warning === null && danger === null) return "unknown";

  if (danger !== null && levelM >= danger) return "danger";
  if (warning !== null && levelM >= warning) return "warning";
  if (alert !== null && levelM >= alert) return "alert";
  return "normal";
}
