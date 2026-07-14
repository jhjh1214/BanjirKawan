// Pure metric computation — deterministic functions over plain data.
// This is the "audit trail = your metrics slide, for free" made real:
// every number here is derived from what the storm-time pipeline already
// records, never estimated after the fact.

export interface RmRange {
  low: number;
  high: number;
}

export interface MetricActionInput {
  order: number;
  savesRM: RmRange;
}

export interface MetricDispatchInput {
  dispatchId: string;
  status: string;
  sentAt: Date | null;
  shopName: string;
  actions: MetricActionInput[];
}

export interface MetricCheckoffInput {
  dispatchId: string;
  actionOrder: number;
  checkedAt: Date;
}

export interface MetricEventInput {
  id: string;
  stationId: string;
  tier: string;
  startedAt: Date;
  simulated: boolean;
}

export interface MetricTimelineInput {
  firstDangerAt: Date | null;
  peakAt: Date | null;
}

export interface EventMetrics {
  eventId: string;
  stationId: string;
  tier: string;
  startedAt: string;
  simulated: boolean;
  shops: number;
  dispatchesSent: number;
  /** Σ savesRM over every dispatched action — the value put in reach of the owner. */
  rmActionable: RmRange;
  /** Σ savesRM over checked-off actions — value actually protected. */
  rmProtected: RmRange;
  /** Actionable minus protected. */
  rmUnactioned: RmRange;
  totalActions: number;
  checkedActions: number;
  /** 0..1, null when there were no actions. */
  completionRate: number | null;
  /** Threshold detection → Telegram sent (min across dispatches), ms. */
  dispatchLatencyMs: number | null;
  /** First send → station's first DANGER reading (fallback: peak), ms; never negative. */
  leadTimeMs: number | null;
  /** Median over dispatches of (first check-off − sent), ms. */
  medianFirstCheckoffMs: number | null;
}

export interface RecoveryInput {
  createdAt: Date; // after-photos submitted
  confirmedAt: Date; // owner signed the report off
}

export interface OverviewMetrics {
  events: number;
  dispatchesSent: number;
  rmProtected: RmRange;
  rmActionable: RmRange;
  totalActions: number;
  checkedActions: number;
  completionRate: number | null;
  medianFirstCheckoffMs: number | null;
  avgDispatchLatencyMs: number | null;
  /** Recovery: confirmed loss reports + median photos→signed-report time. */
  reportsIssued: number;
  medianReportMs: number | null;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const ZERO: RmRange = { low: 0, high: 0 };

function addRange(a: RmRange, b: RmRange): RmRange {
  return { low: a.low + b.low, high: a.high + b.high };
}

function subRange(a: RmRange, b: RmRange): RmRange {
  return { low: Math.max(0, a.low - b.low), high: Math.max(0, a.high - b.high) };
}

export function computeEventMetrics(
  event: MetricEventInput,
  dispatches: MetricDispatchInput[],
  checkoffs: MetricCheckoffInput[],
  timeline: MetricTimelineInput
): EventMetrics {
  const sent = dispatches.filter((d) => d.status === "sent" && d.sentAt !== null);
  const checkoffsByDispatch = new Map<string, MetricCheckoffInput[]>();
  for (const c of checkoffs) {
    const list = checkoffsByDispatch.get(c.dispatchId) ?? [];
    list.push(c);
    checkoffsByDispatch.set(c.dispatchId, list);
  }

  let rmActionable = ZERO;
  let rmProtected = ZERO;
  let totalActions = 0;
  let checkedActions = 0;
  const firstCheckoffDeltas: number[] = [];

  for (const d of sent) {
    const dCheckoffs = checkoffsByDispatch.get(d.dispatchId) ?? [];
    const checkedOrders = new Set(dCheckoffs.map((c) => c.actionOrder));

    for (const action of d.actions) {
      totalActions++;
      rmActionable = addRange(rmActionable, action.savesRM);
      if (checkedOrders.has(action.order)) {
        checkedActions++;
        rmProtected = addRange(rmProtected, action.savesRM);
      }
    }

    if (dCheckoffs.length > 0 && d.sentAt) {
      const first = Math.min(...dCheckoffs.map((c) => c.checkedAt.getTime()));
      firstCheckoffDeltas.push(Math.max(0, first - d.sentAt.getTime()));
    }
  }

  const sentTimes = sent.map((d) => d.sentAt!.getTime());
  const firstSentAt = sentTimes.length > 0 ? Math.min(...sentTimes) : null;

  const dangerOrPeak = timeline.firstDangerAt ?? timeline.peakAt;
  const leadTimeMs =
    firstSentAt !== null && dangerOrPeak !== null
      ? Math.max(0, dangerOrPeak.getTime() - firstSentAt)
      : null;

  return {
    eventId: event.id,
    stationId: event.stationId,
    tier: event.tier,
    startedAt: event.startedAt.toISOString(),
    simulated: event.simulated,
    shops: dispatches.length,
    dispatchesSent: sent.length,
    rmActionable,
    rmProtected,
    rmUnactioned: subRange(rmActionable, rmProtected),
    totalActions,
    checkedActions,
    completionRate: totalActions > 0 ? checkedActions / totalActions : null,
    dispatchLatencyMs:
      firstSentAt !== null ? Math.max(0, firstSentAt - event.startedAt.getTime()) : null,
    leadTimeMs,
    medianFirstCheckoffMs: median(firstCheckoffDeltas),
  };
}

export function computeOverviewMetrics(
  events: EventMetrics[],
  recovery: RecoveryInput[] = []
): OverviewMetrics {
  const withSends = events.filter((e) => e.dispatchesSent > 0);
  const totalActions = events.reduce((s, e) => s + e.totalActions, 0);
  const checkedActions = events.reduce((s, e) => s + e.checkedActions, 0);

  return {
    reportsIssued: recovery.length,
    medianReportMs: median(
      recovery.map((r) => Math.max(0, r.confirmedAt.getTime() - r.createdAt.getTime()))
    ),
    events: events.length,
    dispatchesSent: events.reduce((s, e) => s + e.dispatchesSent, 0),
    rmProtected: events.reduce((s, e) => addRange(s, e.rmProtected), ZERO),
    rmActionable: events.reduce((s, e) => addRange(s, e.rmActionable), ZERO),
    totalActions,
    checkedActions,
    completionRate: totalActions > 0 ? checkedActions / totalActions : null,
    medianFirstCheckoffMs: median(
      events.map((e) => e.medianFirstCheckoffMs).filter((v): v is number => v !== null)
    ),
    avgDispatchLatencyMs:
      withSends.length > 0
        ? withSends.reduce((s, e) => s + (e.dispatchLatencyMs ?? 0), 0) / withSends.length
        : null,
  };
}

/** "3h 12m", "2.1s", "95ms" — shared by dashboard + judge console. */
export function formatDurationMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** "RM 38,400–61,200" (or single figure when the range collapses). */
export function formatRmRange(range: RmRange): string {
  const f = (n: number) => Math.round(n).toLocaleString("en-MY");
  return range.low === range.high ? `RM ${f(range.low)}` : `RM ${f(range.low)}–${f(range.high)}`;
}
