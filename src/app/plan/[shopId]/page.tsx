import { notFound } from "next/navigation";
import { getShop } from "@/lib/db/repositories/shops.repo";
import { getLatestValidatedPlaybook } from "@/lib/db/repositories/playbooks.repo";
import { getStationInfo } from "@/lib/db/repositories/events.repo";
import { PrintButton } from "@/components/recovery/print-button";

export const dynamic = "force-dynamic";

// The zero-tech redundancy layer: a laminate-and-stick-on-wall DANGER-tier
// plan. If phones are dead and the network is down, the plan on the wall
// still works. Deterministic render of the same validated playbook cache.
export default async function PrintablePlanPage({ params }: { params: { shopId: string } }) {
  const shop = await getShop(params.shopId).catch(() => null);
  if (!shop) notFound();

  const playbook =
    (await getLatestValidatedPlaybook(shop.id, "danger", shop.language)) ??
    (await getLatestValidatedPlaybook(shop.id, "warning", shop.language));
  if (!playbook) notFound();

  const station = shop.nearest_station_id ? await getStationInfo(shop.nearest_station_id) : null;
  const totalMinutes = playbook.actions.reduce((s, a) => s + a.estMinutes, 0);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
        <header className="border-b-4 border-red-600 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">BanjirKawan</p>
              <h1 className="mt-1 text-3xl font-black uppercase text-red-600">Pelan Banjir Kecemasan</h1>
              <p className="text-sm font-medium text-slate-600">Emergency Flood Plan — {shop.name}</p>
            </div>
            <PrintButton label="Cetak / Print" />
          </div>
        </header>

        {station && (
          <section className="mt-4 rounded-lg border-2 border-slate-900 p-3 text-sm">
            <p>
              Stesen pemantau / monitoring station: <strong>{station.stationName}</strong>{" "}
              <span className="font-mono text-xs">({shop.nearest_station_id})</span>
            </p>
            {station.thresholds && (
              <p className="mt-1 text-xs text-slate-600">
                Paras rasmi / official levels (m): normal{" "}
                <strong>{station.thresholds.normal ?? "—"}</strong> · waspada{" "}
                <strong className="text-yellow-700">{station.thresholds.alert ?? "—"}</strong> · amaran{" "}
                <strong className="text-orange-700">{station.thresholds.warning ?? "—"}</strong> · bahaya{" "}
                <strong className="text-red-700">{station.thresholds.danger ?? "—"}</strong>
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Semak paras semasa / check live level: publicinfobanjir.water.gov.my
            </p>
          </section>
        )}

        <p className="mt-4 text-sm font-semibold">
          Apabila air sungai naik atau amaran diterima — ikut turutan ini. Jumlah masa ~{totalMinutes} minit. /
          When the river rises or a warning arrives — follow this order. Total ~{totalMinutes} minutes.
        </p>

        <ol className="mt-4 space-y-3">
          {playbook.actions.map((a) => (
            <li key={a.order} className="flex items-start gap-3 rounded-lg border border-slate-300 p-3">
              <span
                aria-hidden
                className="mt-0.5 inline-block h-6 w-6 shrink-0 rounded border-2 border-slate-900"
              />
              <div>
                <p className="font-semibold leading-snug">
                  {a.order}. {a.text}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  ~{a.estMinutes} min · siap dalam / done within {a.deadlineOffsetMin} min
                </p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-6 rounded-lg bg-slate-100 p-4 text-sm print:border print:border-slate-300 print:bg-white">
          <p className="font-bold uppercase text-red-700">Utamakan nyawa / life first</p>
          <p className="mt-1 text-slate-700">
            Jangan berjalan atau memandu melalui air banjir. Jika air masuk, tinggalkan premis — barang boleh
            diganti. / Never walk or drive through floodwater. If water enters, leave — property is replaceable.
          </p>
        </section>

        <footer className="mt-6 border-t border-slate-300 pt-3 text-center text-xs text-slate-500">
          Laminatkan dan lekatkan berhampiran kaunter / laminate and stick near the counter · Dijana{" "}
          {new Date().toLocaleDateString("en-MY")} oleh BanjirKawan
        </footer>
      </div>
    </div>
  );
}
