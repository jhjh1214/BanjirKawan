import { getLatestReadings } from "@/lib/db/repositories/events.repo";
import { getSystemStatus } from "@/lib/db/repositories/system.repo";
import { checkFreshness } from "@/modules/trigger";

export const dynamic = "force-dynamic";

interface Heartbeat {
  at?: string;
  freshness?: string;
  statesPolled?: string[];
}

const STATE_BADGE: Record<string, string> = {
  normal: "bg-emerald-500/20 text-emerald-300",
  alert: "bg-yellow-500/20 text-yellow-300",
  warning: "bg-orange-500/20 text-orange-300",
  danger: "bg-red-500/20 text-red-300",
  unknown: "bg-slate-500/20 text-slate-300",
};

export default async function Home() {
  let heartbeat: Heartbeat | null = null;
  let heartbeatAge: string = "never";
  let workerHealthy = false;
  let readings: Awaited<ReturnType<typeof getLatestReadings>> = [];
  let dbError: string | null = null;

  try {
    const status = await getSystemStatus("worker_heartbeat");
    if (status) {
      heartbeat = status.value as Heartbeat;
      workerHealthy = checkFreshness(status.updated_at) === "fresh";
      heartbeatAge = `${Math.round((Date.now() - status.updated_at.getTime()) / 1000)}s ago`;
    }
    readings = await getLatestReadings(15);
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">
        Banjir<span className="text-sky-400">Kawan</span>
      </h1>
      <p className="mt-3 text-lg text-slate-300">
        Setiap amaran banjir menjadi pelan tindakan kedai anda.
      </p>
      <p className="mt-1 text-sm text-slate-500">
        We keep your kedai alive before the banjir — and get you paid after.
      </p>

      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            System status
          </h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              workerHealthy ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
            }`}
          >
            worker {workerHealthy ? "alive" : "down"} · {heartbeatAge}
          </span>
        </div>

        {dbError ? (
          <p className="mt-4 text-sm text-red-400">
            Database unreachable: {dbError}. Is Postgres up and migrated? (docker-compose up,
            npm run migrate)
          </p>
        ) : (
          <>
            {heartbeat && (
              <p className="mt-2 text-xs text-slate-500">
                feed: {heartbeat.freshness ?? "?"} · polling: {heartbeat.statesPolled?.join(", ")}
              </p>
            )}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Station</th>
                    <th className="py-2 pr-4">Level (m)</th>
                    <th className="py-2 pr-4">State</th>
                    <th className="py-2">Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {readings.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-slate-500">
                        No readings yet — the worker writes the first batch within one poll
                        interval of boot.
                      </td>
                    </tr>
                  )}
                  {readings.map((r) => (
                    <tr key={r.station_id}>
                      <td className="py-2 pr-4">
                        <div className="font-medium text-slate-200">{r.station_name}</div>
                        <div className="text-xs text-slate-500">
                          {r.station_id} · {r.state_code}
                        </div>
                      </td>
                      <td className="py-2 pr-4 tabular-nums">{r.level_m ?? "—"}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            STATE_BADGE[r.threshold_state ?? "unknown"]
                          }`}
                        >
                          {r.threshold_state ?? "unknown"}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-slate-500">
                        {new Date(r.ts).toLocaleTimeString("en-MY")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <p className="mt-6 text-sm text-slate-500">
        Judge console:{" "}
        <a href="/demo" className="text-sky-400 underline underline-offset-2">
          /demo — SIMULATE FLOOD
        </a>
      </p>
    </main>
  );
}
