"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/providers/app-providers";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { WavesIcon } from "@/components/ui/icons";
import { fmt } from "@/lib/i18n";

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

  async function simulate() {
    setBusy(true);
    setResult(null);
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
            <Alert variant="success">{result.message}</Alert>
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
