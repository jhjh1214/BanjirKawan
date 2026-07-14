"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-providers";
import { Alert, Badge, Button, Card, EmptyState, Field, Spinner } from "@/components/ui";
import { CameraIcon, CheckCircleIcon, CheckIcon, FileTextIcon } from "@/components/ui/icons";
import { fmt } from "@/lib/i18n";
import type { DamageReport, DamageCondition } from "@/modules/recovery/schema";

type Step = "select" | "assessing" | "confirm" | "done";

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const CONDITIONS: DamageCondition[] = ["destroyed", "damaged", "wet", "ok", "missing"];

interface AssessResponse {
  outcomeId: string;
  shopName: string;
  report: DamageReport;
  repairs: string[];
  lowConfidenceAssetIds: string[];
  totals: { low: number; high: number; affectedItems: number };
}

const CONDITION_TONE: Record<DamageCondition, "red" | "orange" | "sky" | "green" | "slate"> = {
  destroyed: "red",
  damaged: "orange",
  wet: "sky",
  ok: "green",
  missing: "slate",
};

function rm(n: number): string {
  return `RM ${Math.round(n).toLocaleString("en-MY")}`;
}

export function RecoverWizard({
  shops,
}: {
  shops: Array<{ id: string; name: string; address: string }>;
}) {
  const { t } = useApp();
  const [step, setStep] = useState<Step>("select");
  const [shopId, setShopId] = useState(shops[0]?.id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assess, setAssess] = useState<AssessResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reportUrl: string; graphDiff: { toVersion: number; changes: string[] } | null } | null>(null);

  function conditionLabel(c: DamageCondition): string {
    const map: Record<DamageCondition, string> = {
      destroyed: t.recover.conditionDestroyed,
      damaged: t.recover.conditionDamaged,
      wet: t.recover.conditionWet,
      ok: t.recover.conditionOk,
      missing: t.recover.conditionMissing,
    };
    return map[c];
  }

  function onPickPhotos(list: FileList | null) {
    setError(null);
    if (!list) return setFiles([]);
    const picked = Array.from(list);
    if (picked.length > MAX_PHOTOS) return setError(fmt(t.onboard.tooManyPhotos, { max: MAX_PHOTOS }));
    const tooBig = picked.find((f) => f.size > MAX_PHOTO_BYTES);
    if (tooBig) return setError(fmt(t.onboard.photoTooLarge, { name: tooBig.name }));
    setFiles(picked);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId || files.length === 0) return setError(t.recover.photosHint);
    setError(null);
    setStep("assessing");

    const form = new FormData();
    form.set("shopId", shopId);
    for (const f of files) form.append("photos", f);

    try {
      const res = await fetch("/api/recover", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setAssess(body);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("select");
    }
  }

  function updateItem(assetId: string, patch: Partial<DamageReport["items"][number]>) {
    if (!assess) return;
    setAssess({
      ...assess,
      report: {
        ...assess.report,
        items: assess.report.items.map((i) => (i.assetId === assetId ? { ...i, ...patch } : i)),
      },
    });
  }

  async function confirm() {
    if (!assess) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/recover/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomeId: assess.outcomeId, report: assess.report }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setDone({ reportUrl: body.lossReportUrl, graphDiff: body.graphDiff });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const liveTotals = assess
    ? assess.report.items
        .filter((i) => i.condition !== "ok")
        .reduce(
          (acc, i) => ({ low: acc.low + i.estLossRM.low, high: acc.high + i.estLossRM.high, n: acc.n + 1 }),
          { low: 0, high: 0, n: 0 }
        )
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">{t.recover.title}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{t.recover.subtitle}</p>

      {step === "select" &&
        (shops.length === 0 ? (
          <Card className="mt-8">
            <EmptyState
              icon={<FileTextIcon size={36} />}
              title={t.recover.noShopsTitle}
              body={t.recover.noShopsBody}
              action={
                <Link href="/onboard" className="text-sky-600 underline underline-offset-2 dark:text-sky-400">
                  {t.home.onboardCta}
                </Link>
              }
            />
          </Card>
        ) : (
          <Card className="mt-8 p-6">
            <form onSubmit={submit} className="space-y-5">
              <Field label={t.recover.selectShop} hint={t.recover.selectShopHint}>
                <select
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.address.slice(0, 60)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.recover.photos} hint={t.recover.photosHint}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => onPickPhotos(e.target.files)}
                  className="mt-2 block w-full text-sm text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-sky-500"
                />
                {files.length > 0 && (
                  <span className="mt-1 block text-xs text-emerald-600 dark:text-emerald-400">
                    {fmt(t.onboard.photosSelected, { count: files.length })}
                  </span>
                )}
              </Field>
              {error && (
                <Alert variant="error" title={t.recover.assessFailedTitle}>
                  <p>{error}</p>
                  <p className="mt-1">{t.recover.assessFailedHint}</p>
                </Alert>
              )}
              <Button type="submit" size="lg">
                <CameraIcon size={20} />
                {t.recover.submit}
              </Button>
            </form>
          </Card>
        ))}

      {step === "assessing" && <AssessingState />}

      {step === "confirm" && assess && liveTotals && (
        <div className="mt-8 space-y-5">
          <Card className="p-5">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {fmt(t.recover.foundIntro, {
                count: assess.report.items.length,
                affected: liveTotals.n,
                total: `${rm(liveTotals.low)}–${rm(liveTotals.high)}`,
              })}{" "}
              <span className="font-medium text-yellow-600 dark:text-yellow-300">{t.recover.unsureHint}</span>
            </p>
            {assess.report.waterLineCm !== undefined && (
              <p className="mt-2 text-sm font-medium text-sky-600 dark:text-sky-400">
                {fmt(t.recover.waterline, { cm: assess.report.waterLineCm })}
              </p>
            )}
            {assess.repairs.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-xs text-slate-500">
                {assess.repairs.map((r, i) => (
                  <li key={i}>{fmt(t.recover.autoFixed, { fix: r })}</li>
                ))}
              </ul>
            )}
          </Card>

          <ul className="space-y-3">
            {assess.report.items.map((item) => {
              const unsure = item.confidence < 0.6;
              return (
                <li key={item.assetId}>
                  <Card className={unsure ? "border-yellow-400 p-4 dark:border-yellow-600/60" : "p-4"}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{item.label}</span>
                      <Badge tone={CONDITION_TONE[item.condition]}>{conditionLabel(item.condition)}</Badge>
                    </div>
                    {item.note && <p className="mt-1 text-xs text-slate-500">{item.note}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                      <select
                        value={item.condition}
                        onChange={(e) => {
                          const condition = e.target.value as DamageCondition;
                          updateItem(item.assetId, {
                            condition,
                            ...(condition === "ok" ? { estLossRM: { low: 0, high: 0 } } : {}),
                          });
                        }}
                        className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                      >
                        {CONDITIONS.map((c) => (
                          <option key={c} value={c}>
                            {conditionLabel(c)}
                          </option>
                        ))}
                      </select>
                      <span className="inline-flex items-center gap-1">
                        {t.recover.lossLabel}
                        <input
                          type="number"
                          min={0}
                          disabled={item.condition === "ok"}
                          value={item.estLossRM.low}
                          onChange={(e) =>
                            updateItem(item.assetId, {
                              estLossRM: { ...item.estLossRM, low: Number(e.target.value) },
                            })
                          }
                          className="w-20 rounded border border-slate-300 bg-white px-1 py-0.5 text-right disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950"
                        />
                        –
                        <input
                          type="number"
                          min={0}
                          disabled={item.condition === "ok"}
                          value={item.estLossRM.high}
                          onChange={(e) =>
                            updateItem(item.assetId, {
                              estLossRM: { ...item.estLossRM, high: Number(e.target.value) },
                            })
                          }
                          className="w-20 rounded border border-slate-300 bg-white px-1 py-0.5 text-right disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950"
                        />
                      </span>
                      <Badge tone={unsure ? "yellow" : "slate"}>
                        {fmt(t.onboard.confidence, { pct: Math.round(item.confidence * 100) })}
                        {item.photoRef ? ` · ${item.photoRef}` : ""}
                      </Badge>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>

          {assess.report.generalObservations.length > 0 && (
            <Alert variant="info" title={t.recover.observations}>
              <ul className="list-disc pl-5">
                {assess.report.generalObservations.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </Alert>
          )}

          {error && (
            <Alert variant="error" title={t.recover.assessFailedTitle}>
              <p>{error}</p>
              <p className="mt-1">{t.recover.confirmFailedHint}</p>
            </Alert>
          )}
          <Button size="lg" variant="success" loading={busy} onClick={confirm}>
            {!busy && <CheckIcon size={20} />}
            {busy ? t.recover.saving : t.recover.confirm}
          </Button>
        </div>
      )}

      {step === "done" && done && (
        <Card className="mt-12 p-8 text-center">
          <div className="flex justify-center text-emerald-500" aria-hidden>
            <CheckCircleIcon size={44} />
          </div>
          <h2 className="mt-4 text-2xl font-bold">{t.recover.doneTitle}</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">{t.recover.doneBody}</p>
          {done.graphDiff && (
            <p className="mt-3 text-sm text-sky-600 dark:text-sky-400">
              {fmt(t.recover.graphUpdated, {
                v: done.graphDiff.toVersion,
                n: done.graphDiff.changes.length,
              })}
            </p>
          )}
          <a
            href={done.reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-bold text-white transition hover:bg-sky-500"
          >
            <FileTextIcon size={18} />
            {t.recover.openReport}
          </a>
        </Card>
      )}
    </div>
  );
}

function AssessingState() {
  const { t } = useApp();
  const hints = [t.recover.assessingHint1, t.recover.assessingHint2];
  const [idx, setIdx] = useState(0);
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    const rotate = setInterval(() => setIdx((i) => (i + 1) % hints.length), 7000);
    const long = setTimeout(() => setLongWait(true), 45_000);
    return () => {
      clearInterval(rotate);
      clearTimeout(long);
    };
  }, [hints.length]);

  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <Spinner size="lg" />
      <p className="mt-6 text-lg font-medium">{t.recover.assessingTitle}</p>
      <p className="mt-1 text-sm text-slate-500">{t.recover.assessingBody}</p>
      <p className="mt-4 text-sm text-sky-600 dark:text-sky-400" aria-live="polite">
        {hints[idx]}
      </p>
      {longWait && <p className="mt-2 text-xs text-slate-500">{t.onboard.surveyingLong}</p>}
    </div>
  );
}
