"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/app-providers";
import { Alert, Badge, Button, Card, Field, Input } from "@/components/ui";
import { CheckIcon, ClockIcon, SendIcon, ShieldIcon, WavesIcon } from "@/components/ui/icons";
// ./compute (not the module index): the index pulls DB code, never client-safe.
import { formatDurationMs, formatRmRange, type EventMetrics } from "@/modules/metrics/compute";
import { fmt } from "@/lib/i18n";

const METRICS_POLL_MS = 5_000;
const METRICS_POLL_WINDOW_MS = 3 * 60_000;

const TIERS = ["watch", "warning", "danger"] as const;
type Tier = (typeof TIERS)[number];

const TIER_VARIANT: Record<Tier, "warning" | "danger" | "ghost"> = {
  watch: "ghost",
  warning: "warning",
  danger: "danger",
};

export default function DemoConsole() {
  const { t } = useApp();
  const [stationId, setStationId] = useState("3015490"); // Sg. Damansara di TTDI Jaya
  const [tier, setTier] = useState<Tier>("warning");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  async function simulate() {
    setBusy(true);
    setResult(null);
    setEventId(null);
    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId, tier }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      const d = body.dispatch ?? { sent: 0, shopsOnStation: 0, skippedNoTelegram: 0, skippedNoPlaybook: 0 };
      const base = fmt(t.demo.success, {
        tier: t.thresholds[tier === "watch" ? "alert" : tier],
        station: body.stationName ?? body.stationId,
      });
      const detail =
        d.sent > 0
          ? fmt(t.demo.dispatched, { sent: d.sent })
          : fmt(t.demo.noneDispatched, {
              shops: d.shopsOnStation,
              noTelegram: d.skippedNoTelegram,
              noPlaybook: d.skippedNoPlaybook,
            });
      setResult({ ok: true, message: `${base} ${detail}` });
      setEventId(body.floodEventId ?? null);
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">{t.demo.title}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{t.demo.subtitle}</p>

      <Card className="mt-8 space-y-5 p-6">
        <Field label={t.demo.station} hint={t.demo.stationHint}>
          <Input value={stationId} onChange={(e) => setStationId(e.target.value)} />
        </Field>

        <div className="text-sm">
          <span className="font-medium text-slate-600 dark:text-slate-400">{t.demo.tier}</span>
          <div className="mt-2 flex gap-2" role="group" aria-label={t.demo.tier}>
            {TIERS.map((tr) => (
              <Button
                key={tr}
                size="md"
                variant={tier === tr ? TIER_VARIANT[tr] : "ghost"}
                aria-pressed={tier === tr}
                onClick={() => setTier(tr)}
                className="capitalize"
              >
                {tr === "watch"
                  ? t.thresholds.alert
                  : tr === "warning"
                    ? t.thresholds.warning
                    : t.thresholds.danger}
              </Button>
            ))}
          </div>
        </div>

        <Button size="lg" loading={busy} disabled={!stationId.trim()} onClick={simulate}>
          {!busy && <WavesIcon size={20} />}
          {busy ? t.demo.simulating : t.demo.simulate}
        </Button>

        {result &&
          (result.ok ? (
            <>
              <Alert variant="success">{result.message}</Alert>
              {eventId && <LiveEventMetrics eventId={eventId} />}
              <SmsPreview stationId={stationId} tier={tier} />
            </>
          ) : (
            <Alert
              variant="error"
              title={t.demo.failedTitle}
              action={
                <Button size="sm" variant="ghost" onClick={simulate}>
                  {t.common.retry}
                </Button>
              }
            >
              <p>{result.message}</p>
              <p className="mt-1">{t.demo.failedHint}</p>
            </Alert>
          ))}
      </Card>

      <p className="mt-6 text-sm">
        <Link href="/" className="text-sky-600 underline underline-offset-2 dark:text-sky-400">
          {t.common.backToStatus}
        </Link>
      </p>
    </div>
  );
}

/**
 * SMS fallback proof: renders the dispatched playbooks as plain-text SMS
 * segments through the same channel-agnostic renderer the SMS driver uses.
 */
function SmsPreview({ stationId, tier }: { stationId: string; tier: Tier }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [previews, setPreviews] = useState<Array<{ shopName: string; segments: string[] }> | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setOpen(true);
    if (previews) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sms-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId, tier }),
      });
      const body = await res.json();
      setPreviews(res.ok ? (body.previews ?? []) : []);
    } catch {
      setPreviews([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button size="sm" variant="ghost" loading={loading} onClick={open ? () => setOpen(false) : load}>
        {t.demo.smsPreview}
      </Button>
      {open && previews && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-500">{t.demo.smsPreviewHint}</p>
          {previews.length === 0 ? (
            <p className="text-xs text-slate-500">{t.demo.smsNone}</p>
          ) : (
            previews.map((p) => (
              <div key={p.shopName} className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{p.shopName}</p>
                {p.segments.map((seg, i) => (
                  <div key={i}>
                    <pre className="whitespace-pre-wrap rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-950">
                      {seg}
                    </pre>
                    <p className="mt-0.5 text-right text-[10px] text-slate-400">
                      {fmt(t.demo.smsSegment, { n: i + 1, chars: seg.length })}
                    </p>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Live per-event metrics after SIMULATE FLOOD. Polls every 5s for 3 minutes —
 * checking items off on the phone makes the completion figure tick up on the
 * projector in near-real-time.
 */
function LiveEventMetrics({ eventId }: { eventId: string }) {
  const { t } = useApp();
  const [metrics, setMetrics] = useState<EventMetrics | null>(null);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/metrics?eventId=${eventId}`);
        if (res.ok && !cancelled) setMetrics(await res.json());
      } catch {
        // transient poll failure — next tick will retry
      }
      if (!cancelled && Date.now() - startedAt.current < METRICS_POLL_WINDOW_MS) {
        setTimeout(poll, METRICS_POLL_MS);
      }
    }
    void poll();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (!metrics || metrics.dispatchesSent === 0) return null;

  const items: Array<{ icon: React.ReactNode; label: string; value: string }> = [
    { icon: <ShieldIcon size={13} />, label: t.home.metricsRmProtected, value: formatRmRange(metrics.rmProtected) },
    { icon: <ClockIcon size={13} />, label: t.home.metricsLeadTime, value: formatDurationMs(metrics.leadTimeMs) },
    { icon: <SendIcon size={13} />, label: t.home.metricsLatency, value: formatDurationMs(metrics.dispatchLatencyMs) },
    {
      icon: <CheckIcon size={13} />,
      label: t.home.metricsCompletion,
      value:
        metrics.completionRate !== null
          ? `${Math.round(metrics.completionRate * 100)}% (${metrics.checkedActions}/${metrics.totalActions})`
          : "—",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2" aria-live="polite">
      {items.map((item) => (
        <Badge key={item.label} tone="sky" className="inline-flex items-center gap-1.5 px-3 py-1.5">
          {item.icon}
          <span className="opacity-70">{item.label}:</span>
          <span className="font-semibold tabular-nums">{item.value}</span>
        </Badge>
      ))}
    </div>
  );
}
