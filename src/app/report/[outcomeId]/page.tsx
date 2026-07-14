import { notFound } from "next/navigation";
import { getOutcomeReportContext } from "@/lib/db/repositories/outcomes.repo";
import { getReadingsWindow, getStationName } from "@/lib/db/repositories/events.repo";
import { computeLossTotals } from "@/modules/recovery";
import { PrintButton } from "@/components/recovery/print-button";

export const dynamic = "force-dynamic";

// Formal claim document (bantuan banjir / takaful). Deliberately bilingual
// BM/EN with fixed light styling — it's a printable record, not app UI.
// The station telemetry section is the load-bearing part: objective,
// third-party (JPS) evidence that the flood happened, when, and how high.
export default async function LossReportPage({ params }: { params: { outcomeId: string } }) {
  const ctx = await getOutcomeReportContext(params.outcomeId).catch(() => null);
  if (!ctx || !ctx.outcome.damage_items) notFound();

  const { outcome, shop, event } = ctx;
  const report = outcome.damage_items!;
  const totals = computeLossTotals(report);

  const stationId = event?.station_id ?? shop.nearest_station_id;
  const stationName = stationId ? ((await getStationName(stationId)) ?? stationId) : null;
  const readings =
    event && stationId
      ? await getReadingsWindow(
          stationId,
          new Date(event.started_at.getTime() - 60 * 60 * 1000),
          event.ended_at ?? new Date(event.started_at.getTime() + 12 * 60 * 60 * 1000),
          16
        )
      : [];

  const generated = (outcome.confirmed_at ?? outcome.created_at).toLocaleString("en-MY", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const rm = (n: number) => `RM ${Math.round(n).toLocaleString("en-MY")}`;
  const graphDiff = outcome.graph_diff as { toVersion?: number; changes?: string[] } | null;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
        {/* header */}
        <header className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">BanjirKawan</p>
            <h1 className="mt-1 text-2xl font-bold">Laporan Kerugian Banjir</h1>
            <p className="text-sm text-slate-500">Flood Loss Report — for bantuan banjir / takaful claims</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>
              Rujukan / Ref: <span className="font-mono">{outcome.id.slice(0, 8).toUpperCase()}</span>
            </p>
            <p>Dijana / Generated: {generated}</p>
            <div className="mt-2">
              <PrintButton label="Cetak / Print" />
            </div>
          </div>
        </header>

        {/* shop identity */}
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">1 · Premis / Premises</h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="w-44 py-1.5 font-medium text-slate-500">Nama perniagaan</td>
                <td className="py-1.5 font-semibold">{shop.name}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 font-medium text-slate-500">Alamat</td>
                <td className="py-1.5">{shop.address}</td>
              </tr>
              {shop.lat !== null && shop.lng !== null && (
                <tr className="border-b border-slate-200">
                  <td className="py-1.5 font-medium text-slate-500">Koordinat GPS</td>
                  <td className="py-1.5 font-mono text-xs">
                    {Number(shop.lat).toFixed(5)}, {Number(shop.lng).toFixed(5)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* event evidence */}
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            2 · Bukti Peristiwa Banjir / Flood Event Evidence
          </h2>
          <div className="mt-2 rounded-lg border-2 border-sky-700 bg-sky-50 p-4 print:bg-white">
            {event && stationName ? (
              <>
                <p className="text-sm">
                  Stesen JPS / JPS station: <strong>{stationName}</strong>{" "}
                  <span className="font-mono text-xs">({event.station_id})</span> — tahap{" "}
                  <strong className="uppercase">{event.tier}</strong> direkodkan pada{" "}
                  <strong>{event.started_at.toLocaleString("en-MY")}</strong>.
                </p>
                {readings.length > 0 && (
                  <table className="mt-3 w-full text-xs">
                    <thead>
                      <tr className="border-b border-sky-200 text-left text-slate-500">
                        <th className="py-1 font-medium">Masa / Time</th>
                        <th className="py-1 font-medium">Paras air / Level (m)</th>
                        <th className="py-1 font-medium">Tahap / State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readings.map((r, i) => (
                        <tr key={i} className="border-b border-sky-100">
                          <td className="py-1">{r.ts.toLocaleString("en-MY")}</td>
                          <td className="py-1 tabular-nums">{r.level_m ?? "—"}</td>
                          <td className="py-1 uppercase">{r.threshold_state ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="mt-3 text-xs font-medium text-sky-900">
                  Sumber: telemetri awam JPS InfoBanjir (publicinfobanjir.water.gov.my) — rekod pihak ketiga yang
                  bebas. / Source: JPS InfoBanjir public telemetry — independent third-party record.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Tiada peristiwa stesen direkodkan untuk banjir ini; laporan berdasarkan pemerhatian pemilik. / No
                recorded station event; report based on owner observation.
              </p>
            )}
            {report.waterLineCm !== undefined && (
              <p className="mt-2 text-sm">
                Tanda paras air dalam premis / Indoor high-water mark: <strong>~{report.waterLineCm} cm</strong>
              </p>
            )}
          </div>
        </section>

        {/* itemised losses */}
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            3 · Kerugian Terperinci / Itemised Losses
          </h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-900 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 font-semibold">Aset / Asset</th>
                <th className="py-2 font-semibold">Keadaan / Condition</th>
                <th className="py-2 font-semibold">Catatan / Evidence note</th>
                <th className="py-2 text-right font-semibold">Anggaran kerugian</th>
              </tr>
            </thead>
            <tbody>
              {report.items
                .filter((i) => i.condition !== "ok")
                .map((item) => (
                  <tr key={item.assetId} className="border-b border-slate-200 align-top">
                    <td className="py-2 pr-2 font-medium">{item.label}</td>
                    <td className="py-2 pr-2 uppercase">{item.condition}</td>
                    <td className="py-2 pr-2 text-xs text-slate-600">
                      {item.note}
                      {item.photoRef ? ` (${item.photoRef})` : ""}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {rm(item.estLossRM.low)}–{rm(item.estLossRM.high)}
                    </td>
                  </tr>
                ))}
              <tr className="border-t-2 border-slate-900 font-bold">
                <td className="py-2" colSpan={3}>
                  JUMLAH / TOTAL ({totals.affectedItems} item)
                </td>
                <td className="py-2 text-right tabular-nums">
                  {rm(totals.low)}–{rm(totals.high)}
                </td>
              </tr>
            </tbody>
          </table>
          {report.items.some((i) => i.condition === "ok") && (
            <p className="mt-2 text-xs text-slate-500">
              {report.items.filter((i) => i.condition === "ok").length} aset lain diperiksa dan didapati elok /
              other assets inspected and found undamaged.
            </p>
          )}
        </section>

        {/* observations */}
        {report.generalObservations.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              4 · Pemerhatian / Observations
            </h2>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {report.generalObservations.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </section>
        )}

        {/* photo evidence */}
        {outcome.photo_urls.length > 0 && (
          <section className="mt-6 break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              5 · Bukti Gambar Selepas Banjir / After-Flood Photo Evidence
            </h2>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {outcome.photo_urls.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p}
                  src={`/api/photos/${p}`}
                  alt={`after-flood photo ${i + 1}`}
                  className="aspect-[4/3] w-full rounded border border-slate-200 object-cover"
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Gambar asal (pra-banjir) disimpan dalam rekod pendaftaran premis. / Pre-flood baseline photos are
              held in the premises&apos; onboarding record.
            </p>
          </section>
        )}

        {/* learning note */}
        {graphDiff?.changes && graphDiff.changes.length > 0 && (
          <p className="mt-4 text-xs text-slate-500">
            Nota sistem: pelan risiko premis dikemas kini ke v{graphDiff.toVersion} selepas laporan ini. / System
            note: the premises&apos; risk plan was updated to v{graphDiff.toVersion} after this report.
          </p>
        )}

        {/* declaration */}
        <section className="mt-8 break-inside-avoid border-t border-slate-300 pt-4">
          <p className="text-xs text-slate-600">
            Saya mengesahkan bahawa maklumat di atas adalah benar setahu saya. Anggaran kerugian berdasarkan
            tinjauan pra-banjir berstruktur dan telah disemak oleh pemilik. / I confirm the above is true to the
            best of my knowledge. Loss estimates derive from a structured pre-flood survey and were reviewed by
            the owner.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-8 text-xs text-slate-600">
            <div>
              <div className="border-t border-slate-400 pt-1">Tandatangan pemilik / Owner signature</div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1">Tarikh / Date</div>
            </div>
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
          Dijana oleh BanjirKawan · rujukan {outcome.id} · Setiap amaran banjir menjadi pelan tindakan kedai anda.
        </footer>
      </div>
    </div>
  );
}
