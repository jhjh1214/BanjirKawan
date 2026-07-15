"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-providers";
import { Alert, Badge, Card } from "@/components/ui";
import { CheckIcon, ClockIcon, FileTextIcon, SendIcon, ShieldIcon, WavesIcon } from "@/components/ui/icons";
import { ReadingsExplorer } from "@/components/status/readings-explorer";
// Imported from ./compute (not the module index) deliberately: the index
// pulls in DB repositories, which must never enter a client bundle.
import { formatDurationMs, formatRmRange, type OverviewMetrics } from "@/modules/metrics/compute";
import { fmt } from "@/lib/i18n";

export interface StatusData {
  workerHealthy: boolean;
  heartbeatAgeSeconds: number | null;
  feedFreshness: string | null;
  statesPolled: string[];
  dbError: string | null;
  metrics: OverviewMetrics | null;
}

const REFRESH_MS = 30_000;

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}

function StatTile({ icon, label, value, hint }: StatTileProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className="text-sky-500">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

function MetricsPanel({
  metrics,
  t,
}: {
  metrics: OverviewMetrics | null;
  t: ReturnType<typeof useApp>["t"];
}) {
  return (
    <section className="mt-8" aria-label={t.home.metricsTitle}>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {t.home.metricsTitle}
      </h2>
      {!metrics || metrics.events === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{t.home.metricsEmpty}</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatTile
            icon={<ShieldIcon size={14} />}
            label={t.home.metricsRmProtected}
            value={formatRmRange(metrics.rmProtected)}
            hint={t.home.metricsRmProtectedHint}
          />
          <StatTile
            icon={<WavesIcon size={14} />}
            label={t.home.metricsEvents}
            value={String(metrics.events)}
          />
          <StatTile
            icon={<CheckIcon size={14} />}
            label={t.home.metricsCompletion}
            value={
              metrics.completionRate !== null ? `${Math.round(metrics.completionRate * 100)}%` : "—"
            }
            hint={`${metrics.checkedActions}/${metrics.totalActions}`}
          />
          <StatTile
            icon={<ClockIcon size={14} />}
            label={t.home.metricsFirstAction}
            value={formatDurationMs(metrics.medianFirstCheckoffMs)}
          />
          <StatTile
            icon={<SendIcon size={14} />}
            label={t.home.metricsLatency}
            value={formatDurationMs(metrics.avgDispatchLatencyMs)}
          />
          <StatTile
            icon={<FileTextIcon size={14} />}
            label={t.home.metricsReports}
            value={String(metrics.reportsIssued)}
            hint={
              metrics.medianReportMs !== null
                ? `${t.home.metricsReportTime}: ${formatDurationMs(metrics.medianReportMs)}`
                : undefined
            }
          />
        </div>
      )}
    </section>
  );
}

export function StatusDashboard({ data }: { data: StatusData }) {
  const { t } = useApp();
  const router = useRouter();

  // Server component re-fetches on refresh — live dashboard with zero client fetch code.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.home.tagline}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{t.home.taglineSub}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/onboard"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
        >
          {t.home.onboardCta} <span className="font-normal opacity-80">· {t.home.onboardCtaHint}</span>
        </Link>
        <Link
          href="/demo"
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {t.home.judgeConsole} <span className="font-normal opacity-70">· {t.home.judgeConsoleHint}</span>
        </Link>
      </div>

      {!data.dbError && <MetricsPanel metrics={data.metrics} t={t} />}

      <Card className="mt-8 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t.home.systemStatus}
          </h2>
          <Badge tone={data.workerHealthy ? "green" : "red"}>
            {data.workerHealthy ? t.home.workerAlive : t.home.workerDown}
            {" · "}
            {data.heartbeatAgeSeconds !== null
              ? fmt(t.home.heartbeatAgo, { seconds: data.heartbeatAgeSeconds })
              : t.home.heartbeatNever}
          </Badge>
        </div>

        {data.dbError ? (
          <div className="mt-4">
            <Alert variant="error" title={t.home.dbErrorTitle}>
              <p>{t.home.dbErrorBody}</p>
              <details className="mt-2 opacity-75">
                <summary className="cursor-pointer text-xs">{t.home.dbErrorDetail}</summary>
                <code className="mt-1 block break-all text-xs">{data.dbError}</code>
              </details>
            </Alert>
          </div>
        ) : (
          <>
            <p className="mt-2 text-xs text-slate-500">
              {t.home.autoRefresh}
              {data.feedFreshness && (
                <>
                  {" · "}
                  {t.home.feed}: {data.feedFreshness}
                </>
              )}
              {data.statesPolled.length > 0 && (
                <>
                  {" · "}
                  {t.home.polling}: {data.statesPolled.join(", ")}
                </>
              )}
            </p>

            <ReadingsExplorer />
          </>
        )}
      </Card>
    </div>
  );
}
