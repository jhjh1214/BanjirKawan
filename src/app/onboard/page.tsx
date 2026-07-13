"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SiteGraph } from "@/modules/site-intelligence";
import { useApp } from "@/components/providers/app-providers";
import { Alert, Badge, Button, Card, Field, Input, Spinner } from "@/components/ui";
import { fmt } from "@/lib/i18n";

type Step = "details" | "surveying" | "confirm" | "done";

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const PLAYBOOK_TOTAL = 6; // 3 tiers × BM/EN
const PLAYBOOK_POLL_MS = 10_000;
const PLAYBOOK_POLL_TIMEOUT_MS = 4 * 60_000;

interface ExtractionResponse {
  shopId: string;
  siteGraphId: string;
  version: number;
  graph: SiteGraph;
  repairs: string[];
  lowConfidenceAssetIds: string[];
  enrichment: {
    geocode: { lat: number; lng: number; displayName: string; stateCode: string | null };
    nearestStation: { stationId: string; stationName: string; distanceKm: number } | null;
  } | null;
}

const CATEGORY_ICON: Record<string, string> = {
  equipment: "🧊",
  stock: "📦",
  electrical: "⚡",
  furniture: "🪑",
  document: "📄",
};

export default function OnboardWizard() {
  const { t } = useApp();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResponse | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  /* ------------------------------ step: details ----------------------------- */

  function onPickPhotos(list: FileList | null) {
    setError(null);
    if (!list) return setFiles([]);
    const picked = Array.from(list);
    if (picked.length > MAX_PHOTOS) {
      setError(fmt(t.onboard.tooManyPhotos, { max: MAX_PHOTOS }));
      return setFiles([]);
    }
    const tooBig = picked.find((f) => f.size > MAX_PHOTO_BYTES);
    if (tooBig) {
      setError(fmt(t.onboard.photoTooLarge, { name: tooBig.name }));
      return setFiles([]);
    }
    setFiles(picked);
  }

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return setError(t.onboard.noPhotos);
    setError(null);
    setStep("surveying");

    const form = new FormData();
    form.set("name", name);
    form.set("address", address);
    for (const f of files) form.append("photos", f);

    try {
      const res = await fetch("/api/onboard", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setExtraction(body);
      setRemoved(new Set());
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("details");
    }
  }

  /* ------------------------------ step: confirm ------------------------------ */

  function updateAsset(id: string, patch: Partial<SiteGraph["assets"][number]>) {
    if (!extraction) return;
    setExtraction({
      ...extraction,
      graph: {
        ...extraction.graph,
        assets: extraction.graph.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      },
    });
  }

  function toggleRemoved(id: string) {
    const next = new Set(removed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRemoved(next);
  }

  async function confirm() {
    if (!extraction) return;
    setBusy(true);
    setError(null);
    try {
      const graph: SiteGraph = {
        ...extraction.graph,
        assets: extraction.graph.assets.filter((a) => !removed.has(a.id)),
      };
      const res = await fetch("/api/onboard/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: extraction.shopId, graph }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  /* --------------------------------- render --------------------------------- */

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">{t.onboard.title}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{t.onboard.subtitle}</p>

      {step === "details" && (
        <Card className="mt-8 p-6">
          <form onSubmit={submitDetails} className="space-y-5">
            <Field label={t.onboard.shopName}>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.onboard.shopNamePlaceholder}
              />
            </Field>
            <Field label={t.onboard.address}>
              <Input
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.onboard.addressPlaceholder}
              />
            </Field>
            <Field label={t.onboard.photos} hint={t.onboard.photosHint}>
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
              <Alert variant="error" title={t.onboard.surveyFailedTitle}>
                <p>{error}</p>
                <p className="mt-1">{t.onboard.surveyFailedHint}</p>
              </Alert>
            )}
            <Button type="submit" size="lg">
              {t.onboard.submit}
            </Button>
          </form>
        </Card>
      )}

      {step === "surveying" && <SurveyingState />}

      {step === "confirm" && extraction && (
        <div className="mt-8 space-y-5">
          {extraction.enrichment?.nearestStation && (
            <Alert variant="info">
              <span className="font-semibold">{t.onboard.sentinel}</span>{" "}
              {extraction.enrichment.nearestStation.stationName}{" "}
              <span className="opacity-70">
                ({fmt(t.onboard.sentinelDistance, { km: extraction.enrichment.nearestStation.distanceKm })})
              </span>
            </Alert>
          )}

          <Card className="p-5">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {fmt(t.onboard.foundIntro, {
                count: extraction.graph.assets.length,
                type: extraction.graph.shopType,
              })}{" "}
              <span className="font-medium text-yellow-600 dark:text-yellow-300">{t.onboard.unsureHint}</span>
            </p>
            {extraction.repairs.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-xs text-slate-500">
                {extraction.repairs.map((r, i) => (
                  <li key={i}>{fmt(t.onboard.autoFixed, { fix: r })}</li>
                ))}
              </ul>
            )}
          </Card>

          <ul className="space-y-3">
            {extraction.graph.assets.map((a) => {
              const isRemoved = removed.has(a.id);
              const unsure = a.confidence < 0.6;
              return (
                <li key={a.id}>
                  <Card
                    className={
                      isRemoved
                        ? "p-4 opacity-40"
                        : unsure
                          ? "border-yellow-400 p-4 dark:border-yellow-600/60"
                          : "p-4"
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <input
                        value={a.label}
                        disabled={isRemoved}
                        onChange={(e) => updateAsset(a.id, { label: e.target.value })}
                        aria-label={t.onboard.shopName}
                        className="w-full rounded-md border border-transparent bg-transparent px-1 font-medium focus:border-slate-400 focus:outline-none dark:focus:border-slate-600"
                      />
                      <Button
                        size="sm"
                        variant={isRemoved ? "ghost" : "danger"}
                        onClick={() => toggleRemoved(a.id)}
                      >
                        {isRemoved ? t.onboard.undo : t.onboard.remove}
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {CATEGORY_ICON[a.category] ?? "•"} {a.category}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {t.onboard.height}
                        <Input
                          type="number"
                          disabled={isRemoved}
                          value={a.heightFromFloorCm}
                          onChange={(e) => updateAsset(a.id, { heightFromFloorCm: Number(e.target.value) })}
                          className="mt-0 w-16 px-1 py-0.5 text-right text-xs"
                        />
                        cm
                      </span>
                      <span className="inline-flex items-center gap-1">
                        RM
                        <Input
                          type="number"
                          disabled={isRemoved}
                          value={a.estValueRM.low}
                          onChange={(e) =>
                            updateAsset(a.id, { estValueRM: { ...a.estValueRM, low: Number(e.target.value) } })
                          }
                          className="mt-0 w-20 px-1 py-0.5 text-right text-xs"
                        />
                        –
                        <Input
                          type="number"
                          disabled={isRemoved}
                          value={a.estValueRM.high}
                          onChange={(e) =>
                            updateAsset(a.id, { estValueRM: { ...a.estValueRM, high: Number(e.target.value) } })
                          }
                          className="mt-0 w-20 px-1 py-0.5 text-right text-xs"
                        />
                      </span>
                      <span>{a.movable ? t.onboard.movable : t.onboard.fixed}</span>
                      <Badge tone={unsure ? "yellow" : "slate"}>
                        {fmt(t.onboard.confidence, { pct: Math.round(a.confidence * 100) })} · {a.photoRef}
                      </Badge>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>

          {extraction.graph.risks.length > 0 && (
            <Alert variant="warning" title={t.onboard.risksTitle}>
              <ul className="list-disc pl-5">
                {extraction.graph.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </Alert>
          )}

          {error && (
            <Alert variant="error" title={t.onboard.surveyFailedTitle}>
              <p>{error}</p>
              <p className="mt-1">{t.onboard.confirmFailedHint}</p>
            </Alert>
          )}
          <Button size="lg" variant="success" loading={busy} onClick={confirm}>
            {busy
              ? t.onboard.saving
              : fmt(t.onboard.confirmCount, { count: extraction.graph.assets.length - removed.size })}
          </Button>
        </div>
      )}

      {step === "done" && extraction && <DoneState extraction={extraction} />}
    </div>
  );
}

/* ------------------------- surveying (loading) state ------------------------ */

function SurveyingState() {
  const { t } = useApp();
  const hints = [t.onboard.surveyingHint1, t.onboard.surveyingHint2, t.onboard.surveyingHint3];
  const [hintIdx, setHintIdx] = useState(0);
  const [longWait, setLongWait] = useState(false);

  useEffect(() => {
    const rotate = setInterval(() => setHintIdx((i) => (i + 1) % hints.length), 7000);
    const long = setTimeout(() => setLongWait(true), 45_000);
    return () => {
      clearInterval(rotate);
      clearTimeout(long);
    };
  }, [hints.length]);

  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <Spinner size="lg" />
      <p className="mt-6 text-lg font-medium">{t.onboard.surveyingTitle}</p>
      <p className="mt-1 text-sm text-slate-500">{t.onboard.surveyingBody}</p>
      <p className="mt-4 text-sm text-sky-600 dark:text-sky-400" aria-live="polite">
        {hints[hintIdx]}
      </p>
      {longWait && <p className="mt-2 text-xs text-slate-500">{t.onboard.surveyingLong}</p>}
    </div>
  );
}

/* ------------------------------- done state -------------------------------- */

function DoneState({ extraction }: { extraction: ExtractionResponse }) {
  const { t } = useApp();
  const [playbookCount, setPlaybookCount] = useState(0);
  const [slow, setSlow] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/playbook?shopId=${extraction.shopId}`);
        if (res.ok) {
          const body = await res.json();
          if (!cancelled) setPlaybookCount(body.count ?? 0);
          if ((body.count ?? 0) >= PLAYBOOK_TOTAL) return;
        }
      } catch {
        // transient poll failures are fine — generation continues server-side
      }
      if (cancelled) return;
      if (Date.now() - startedAt.current > PLAYBOOK_POLL_TIMEOUT_MS) {
        setSlow(true);
        return;
      }
      setTimeout(poll, PLAYBOOK_POLL_MS);
    }
    void poll();
    return () => {
      cancelled = true;
    };
  }, [extraction.shopId]);

  const station = extraction.enrichment?.nearestStation;
  const ready = playbookCount >= PLAYBOOK_TOTAL;

  return (
    <Card className="mt-12 p-8 text-center">
      <p className="text-4xl" aria-hidden>
        ✅
      </p>
      <h2 className="mt-4 text-2xl font-bold">{t.onboard.doneTitle}</h2>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        {station
          ? fmt(t.onboard.doneLinked, { station: station.stationName, km: station.distanceKm })
          : t.onboard.doneNoStation}{" "}
        {t.onboard.doneBody}
      </p>

      <div className="mt-6" aria-live="polite">
        {ready ? (
          <Alert variant="success">{fmt(t.onboard.playbookReady, { total: PLAYBOOK_TOTAL })}</Alert>
        ) : slow ? (
          <Alert variant="info">{t.onboard.playbookSlow}</Alert>
        ) : (
          <span className="inline-flex items-center gap-3 text-sm text-slate-500">
            <Spinner size="sm" />
            {fmt(t.onboard.playbookProgress, { done: playbookCount, total: PLAYBOOK_TOTAL })}
          </span>
        )}
      </div>

      <Link href="/" className="mt-6 inline-block text-sky-600 underline underline-offset-2 dark:text-sky-400">
        {t.common.backToStatus}
      </Link>
    </Card>
  );
}
