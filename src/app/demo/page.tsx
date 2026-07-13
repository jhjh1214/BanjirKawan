"use client";

import { useState } from "react";

const TIERS = ["watch", "warning", "danger"] as const;

export default function DemoConsole() {
  const [stationId, setStationId] = useState("3516424"); // Sg. Selangor di Ampang Pecah
  const [tier, setTier] = useState<(typeof TIERS)[number]>("warning");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function simulate() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId, tier }),
      });
      const body = await res.json();
      setResult(
        res.ok
          ? `Flood event recorded: ${body.floodEventId} (station ${body.stationId}, tier ${body.tier}). Dispatch wiring lands Day 5.`
          : `Error: ${body.error ?? res.status}`
      );
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">Judge console</h1>
      <p className="mt-2 text-slate-400">
        Fires the same pipeline a real InfoBanjir threshold crossing would — no live data, no AI,
        no wifi dependency.
      </p>

      <div className="mt-8 space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <label className="block text-sm">
          <span className="text-slate-400">Station ID</span>
          <input
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          />
        </label>

        <div className="text-sm">
          <span className="text-slate-400">Tier</span>
          <div className="mt-2 flex gap-2">
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition ${
                  tier === t
                    ? t === "danger"
                      ? "bg-red-600 text-white"
                      : t === "warning"
                        ? "bg-orange-500 text-white"
                        : "bg-yellow-500 text-slate-900"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={simulate}
          disabled={busy || !stationId}
          className="w-full rounded-lg bg-sky-500 px-6 py-4 text-lg font-bold text-white transition hover:bg-sky-400 disabled:opacity-50"
        >
          {busy ? "Triggering…" : "🌊 SIMULATE FLOOD"}
        </button>

        {result && (
          <p className="rounded-md bg-slate-950 p-3 text-sm text-slate-300">{result}</p>
        )}
      </div>

      <p className="mt-6 text-sm text-slate-500">
        <a href="/" className="text-sky-400 underline underline-offset-2">
          ← back to status
        </a>
      </p>
    </main>
  );
}
