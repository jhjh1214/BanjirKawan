"use client";

import { useState } from "react";
import type { SiteGraph } from "@/modules/site-intelligence";

type Step = "details" | "surveying" | "confirm" | "done";

interface ExtractionResponse {
  shopId: string;
  siteGraphId: string;
  version: number;
  graph: SiteGraph;
  repairs: string[];
  lowConfidenceAssetIds: string[];
}

const CATEGORY_LABEL: Record<string, string> = {
  equipment: "🧊 equipment",
  stock: "📦 stock",
  electrical: "⚡ electrical",
  furniture: "🪑 furniture",
  document: "📄 document",
};

export default function OnboardWizard() {
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResponse | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError("Add 3–5 photos of the shop interior.");
      return;
    }
    setError(null);
    setStep("surveying");

    const form = new FormData();
    form.set("name", name);
    form.set("address", address);
    for (const f of Array.from(files)) form.append("photos", f);

    try {
      const res = await fetch("/api/onboard", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setExtraction(body);
      setRemoved(new Set());
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("details");
    }
  }

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
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
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
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold">
        Daftar kedai anda <span className="text-slate-500 text-lg font-normal">/ onboard your shop</span>
      </h1>

      {step === "details" && (
        <form onSubmit={submitDetails} className="mt-8 space-y-5 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <label className="block text-sm">
            <span className="text-slate-400">Nama kedai / shop name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kedai Runcit Kak Ros"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Alamat / address</span>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jalan Sri Muda 1, Taman Sri Muda, 40400 Shah Alam, Selangor"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">3–5 gambar dalam kedai / photos of the shop interior</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="mt-2 block w-full text-sm text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-white"
            />
            {files && <span className="mt-1 block text-xs text-slate-500">{files.length} photo(s) selected</span>}
          </label>
          {error && <p className="rounded-md bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}
          <button type="submit" className="w-full rounded-lg bg-sky-500 px-6 py-3 text-lg font-bold text-white hover:bg-sky-400">
            📷 Survey my shop
          </button>
        </form>
      )}

      {step === "surveying" && (
        <div className="mt-16 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-sky-400" />
          <p className="mt-6 text-lg text-slate-300">AI is surveying your shop…</p>
          <p className="mt-1 text-sm text-slate-500">Identifying assets, heights and values from your photos (~30–60s).</p>
        </div>
      )}

      {step === "confirm" && extraction && (
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-sm text-slate-400">
              The AI read your photos and found{" "}
              <strong className="text-slate-200">{extraction.graph.assets.length} assets</strong> in this{" "}
              <strong className="text-slate-200">{extraction.graph.shopType}</strong>. Check it — fix values, remove
              anything wrong. <span className="text-yellow-300">Yellow items</span> are ones the AI is unsure about.
            </p>
            {extraction.repairs.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-xs text-slate-500">
                {extraction.repairs.map((r, i) => (
                  <li key={i}>auto-fixed: {r}</li>
                ))}
              </ul>
            )}
          </div>

          <ul className="space-y-3">
            {extraction.graph.assets.map((a) => {
              const isRemoved = removed.has(a.id);
              const unsure = a.confidence < 0.6;
              return (
                <li
                  key={a.id}
                  className={`rounded-xl border p-4 ${
                    isRemoved
                      ? "border-slate-800 bg-slate-950 opacity-40"
                      : unsure
                        ? "border-yellow-600/50 bg-yellow-950/20"
                        : "border-slate-800 bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <input
                      value={a.label}
                      disabled={isRemoved}
                      onChange={(e) => updateAsset(a.id, { label: e.target.value })}
                      className="w-full rounded-md border border-transparent bg-transparent px-1 font-medium text-slate-100 focus:border-slate-600 focus:bg-slate-950"
                    />
                    <button
                      onClick={() => toggleRemoved(a.id)}
                      className={`shrink-0 rounded-md px-3 py-1 text-xs ${
                        isRemoved ? "bg-slate-700 text-slate-200" : "bg-red-900/60 text-red-300 hover:bg-red-900"
                      }`}
                    >
                      {isRemoved ? "undo" : "✕ remove"}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                    <span>{CATEGORY_LABEL[a.category] ?? a.category}</span>
                    <span>
                      height{" "}
                      <input
                        type="number"
                        disabled={isRemoved}
                        value={a.heightFromFloorCm}
                        onChange={(e) => updateAsset(a.id, { heightFromFloorCm: Number(e.target.value) })}
                        className="w-16 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-right"
                      />{" "}
                      cm
                    </span>
                    <span>
                      RM{" "}
                      <input
                        type="number"
                        disabled={isRemoved}
                        value={a.estValueRM.low}
                        onChange={(e) =>
                          updateAsset(a.id, { estValueRM: { ...a.estValueRM, low: Number(e.target.value) } })
                        }
                        className="w-20 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-right"
                      />{" "}
                      –{" "}
                      <input
                        type="number"
                        disabled={isRemoved}
                        value={a.estValueRM.high}
                        onChange={(e) =>
                          updateAsset(a.id, { estValueRM: { ...a.estValueRM, high: Number(e.target.value) } })
                        }
                        className="w-20 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-right"
                      />
                    </span>
                    <span>{a.movable ? "🚚 movable" : "🔒 fixed"}</span>
                    <span className={unsure ? "font-semibold text-yellow-300" : ""}>
                      {Math.round(a.confidence * 100)}% sure · {a.photoRef}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {extraction.graph.risks.length > 0 && (
            <div className="rounded-xl border border-orange-900/50 bg-orange-950/20 p-4 text-sm">
              <h3 className="font-semibold text-orange-300">Risks the AI noticed</h3>
              <ul className="mt-2 list-disc pl-5 text-slate-300">
                {extraction.graph.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="rounded-md bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}
          <button
            onClick={confirm}
            disabled={busy}
            className="w-full rounded-lg bg-emerald-600 px-6 py-4 text-lg font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Saving…" : `✓ Confirm ${extraction.graph.assets.length - removed.size} assets`}
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="mt-16 rounded-xl border border-emerald-800 bg-emerald-950/30 p-8 text-center">
          <p className="text-4xl">✅</p>
          <h2 className="mt-4 text-2xl font-bold">Kedai anda dilindungi</h2>
          <p className="mt-2 text-slate-300">
            Site graph confirmed. Next: tiered flood playbooks are generated from this inventory (Day 4) and delivered
            by Telegram the moment your river station crosses a threshold.
          </p>
          <a href="/" className="mt-6 inline-block text-sky-400 underline underline-offset-2">
            ← back to status
          </a>
        </div>
      )}
    </main>
  );
}
