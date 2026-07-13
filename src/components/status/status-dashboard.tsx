"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-providers";
import { Alert, Badge, Card, EmptyState, THRESHOLD_TONE } from "@/components/ui";
import { ActivityIcon } from "@/components/ui/icons";
import { fmt } from "@/lib/i18n";

export interface StatusData {
  workerHealthy: boolean;
  heartbeatAgeSeconds: number | null;
  feedFreshness: string | null;
  statesPolled: string[];
  readings: Array<{
    stationId: string;
    stationName: string;
    stateCode: string;
    levelM: string | null;
    thresholdState: string;
    ts: string;
  }>;
  dbError: string | null;
}

const REFRESH_MS = 30_000;

export function StatusDashboard({ data }: { data: StatusData }) {
  const { t, locale } = useApp();
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

            {data.readings.length === 0 ? (
              <EmptyState icon={<ActivityIcon size={36} />} title={t.home.emptyTitle} body={t.home.emptyBody} />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2 pr-4 font-medium">{t.home.colStation}</th>
                      <th className="py-2 pr-4 font-medium">{t.home.colLevel}</th>
                      <th className="py-2 pr-4 font-medium">{t.home.colState}</th>
                      <th className="py-2 font-medium">{t.home.colSeen}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.readings.map((r) => (
                      <tr key={r.stationId}>
                        <td className="py-2.5 pr-4">
                          <div className="font-medium">{r.stationName}</div>
                          <div className="text-xs text-slate-500">
                            {r.stationId} · {r.stateCode}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums">{r.levelM ?? "—"}</td>
                        <td className="py-2.5 pr-4">
                          <Badge tone={THRESHOLD_TONE[r.thresholdState] ?? "slate"}>
                            {t.thresholds[r.thresholdState as keyof typeof t.thresholds] ?? r.thresholdState}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-xs text-slate-500">
                          {new Date(r.ts).toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-MY")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
