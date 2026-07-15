"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/app-providers";
import { Badge, Button, Skeleton, THRESHOLD_TONE } from "@/components/ui";
import { MapPinIcon, XIcon } from "@/components/ui/icons";
import { fmt } from "@/lib/i18n";

interface Reading {
  stationId: string;
  stationName: string;
  stateCode: string;
  levelM: string | null;
  thresholdState: string;
  ts: string;
  distanceKm: number | null;
}

interface ReadingsResponse {
  readings: Reading[];
  total: number;
  page: number;
  pageCount: number;
  states: string[];
  center: { lat: number; lng: number; label: string } | null;
  sort: string;
  error?: string;
}

type SearchMode = "text" | "postcode" | "gps";
const PAGE_SIZE = 20;
const REFRESH_MS = 30_000;
const THRESHOLDS = ["normal", "alert", "warning", "danger", "unknown"] as const;

export function ReadingsExplorer() {
  const { t, locale } = useApp();

  const [mode, setMode] = useState<SearchMode>("text");
  const [text, setText] = useState("");
  const [postcode, setPostcode] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState(false);

  const [stateFilter, setStateFilter] = useState("");
  const [thresholdFilter, setThresholdFilter] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<ReadingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [placeError, setPlaceError] = useState(false);

  // Debounce the free-text query so we don't fire per keystroke.
  const [debouncedText, setDebouncedText] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedText(text), 350);
    return () => clearTimeout(id);
  }, [text]);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    if (mode === "text" && debouncedText.trim()) p.set("q", debouncedText.trim());
    if (mode === "postcode" && postcode.trim()) p.set("place", postcode.trim());
    if (mode === "gps" && gps) {
      p.set("lat", String(gps.lat));
      p.set("lng", String(gps.lng));
    }
    if (stateFilter) p.set("state", stateFilter);
    if (thresholdFilter) p.set("threshold", thresholdFilter);
    if (sort) p.set("sort", sort);
    p.set("page", String(page));
    p.set("pageSize", String(PAGE_SIZE));
    return p;
  }, [mode, debouncedText, postcode, gps, stateFilter, thresholdFilter, sort, page]);

  const fetchReadings = useCallback(
    async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      try {
        const res = await fetch(`/api/readings?${buildParams()}`);
        const body: ReadingsResponse = await res.json();
        setPlaceError(body.error === "location_not_found");
        if (!body.error) setData(body);
      } catch {
        // keep the last good view; the next tick retries
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  // Reset to page 1 when any filter/search changes.
  useEffect(() => {
    setPage(1);
  }, [mode, debouncedText, postcode, gps, stateFilter, thresholdFilter, sort]);

  // Fetch on any change, and poll to stay live (preserving the current view).
  useEffect(() => {
    void fetchReadings(true);
    const id = setInterval(() => fetchReadings(false), REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchReadings]);

  function captureGps() {
    setGpsError(false);
    if (!("geolocation" in navigator)) return setGpsError(true);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort("distance");
        setLocating(false);
      },
      () => {
        setGpsError(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  }

  function clearAll() {
    setText("");
    setPostcode("");
    setGps(null);
    setStateFilter("");
    setThresholdFilter("");
    setSort("recent");
    setMode("text");
  }

  const hasCenter = !!data?.center;
  const activeFilters = text || postcode || gps || stateFilter || thresholdFilter || sort !== "recent";
  const modeTabs: Array<{ id: SearchMode; label: string }> = [
    { id: "text", label: t.home.searchByText },
    { id: "postcode", label: t.home.searchByPostcode },
    { id: "gps", label: t.home.searchByGps },
  ];

  return (
    <div className="mt-4">
      {/* search mode + input */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-slate-300 text-xs dark:border-slate-700">
          {modeTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              aria-pressed={mode === tab.id}
              className={
                mode === tab.id
                  ? "bg-sky-600 px-3 py-1.5 font-semibold text-white"
                  : "bg-transparent px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === "text" && (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.home.searchPlaceholder}
            className="min-w-[12rem] flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        )}
        {mode === "postcode" && (
          <input
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder={t.home.postcodePlaceholder}
            className="min-w-[10rem] flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        )}
        {mode === "gps" && (
          <Button size="sm" variant="ghost" loading={locating} onClick={captureGps}>
            {!locating && <MapPinIcon size={14} />}
            {locating ? t.home.locating : gps ? t.home.searchByGps + " ✓" : t.home.searchByGps}
          </Button>
        )}

        {activeFilters && (
          <Button size="sm" variant="ghost" onClick={clearAll}>
            <XIcon size={13} />
            {t.home.clearFilters}
          </Button>
        )}
      </div>

      {/* filters */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="">{t.home.filterState}: {t.home.filterAll}</option>
          {(data?.states ?? []).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={thresholdFilter}
          onChange={(e) => setThresholdFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="">{t.home.filterThreshold}: {t.home.filterAll}</option>
          {THRESHOLDS.map((th) => (
            <option key={th} value={th}>
              {t.thresholds[th]}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="recent">{t.home.sortRecent}</option>
          <option value="level">{t.home.sortLevel}</option>
          {hasCenter && <option value="distance">{t.home.sortDistance}</option>}
        </select>
      </div>

      {/* result summary */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{data ? fmt(t.home.resultCount, { total: data.total }) : ""}</span>
        {hasCenter && data?.center && (
          <span className="truncate pl-2 text-right">
            {fmt(t.home.nearLabel, { label: data.center.label.split(",")[0] })}
          </span>
        )}
      </div>
      {gpsError && <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">{t.home.locationErrorReadings}</p>}
      {placeError && <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">{t.home.placeNotFound}</p>}

      {/* table */}
      <div className="mt-3 overflow-x-auto">
        {loading && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data && data.readings.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">{t.home.noMatches}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">{t.home.colStation}</th>
                <th className="py-2 pr-4 font-medium">{t.home.colLevel}</th>
                <th className="py-2 pr-4 font-medium">{t.home.colState}</th>
                {hasCenter && <th className="py-2 pr-4 font-medium">{t.home.colDistance}</th>}
                <th className="py-2 font-medium">{t.home.colSeen}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.readings.map((r) => (
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
                  {hasCenter && (
                    <td className="py-2.5 pr-4 tabular-nums text-slate-500">
                      {r.distanceKm !== null ? `${r.distanceKm} km` : "—"}
                    </td>
                  )}
                  <td className="py-2.5 text-xs text-slate-500">
                    {new Date(r.ts).toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-MY")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* pagination */}
      {data && data.pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <Button size="sm" variant="ghost" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t.home.pagePrev}
          </Button>
          <span className="text-xs text-slate-500">
            {fmt(t.home.pageOf, { page: data.page, count: data.pageCount })}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={data.page >= data.pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            {t.home.pageNext}
          </Button>
        </div>
      )}
    </div>
  );
}
