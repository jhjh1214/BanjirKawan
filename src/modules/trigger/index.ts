// Public interface of the trigger module — the storm-time CRITICAL PATH.
// Zero AI imports, ever (ESLint-enforced).

export { fetchStationReadings, parseStationReadings, buildStateUrl } from "./infobanjir";
export type { StationReading } from "./infobanjir";
export { classify, severityRank, THRESHOLD_TO_TIER } from "./thresholds";
export type { ThresholdState } from "./thresholds";
export { checkFreshness, STALE_AFTER_MS, DEAD_AFTER_MS } from "./watchdog";
export type { Freshness } from "./watchdog";
export { dispatchForTierChange } from "./dispatcher";
export type { DispatchRequest } from "./dispatcher";
