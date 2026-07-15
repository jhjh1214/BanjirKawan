"use client";

// Leaflet map of every station, coloured by threshold, with the viewer's GPS
// location and a nearest-station line. Imperative Leaflet (no react-leaflet)
// with CircleMarkers so we avoid the classic broken-marker-image bundler
// issue. Client-only; Leaflet touches `window`.
//
// This is a DRY-DAY monitoring view — the tile layer is an external dependency
// that the storm-time alert path never touches.

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, CircleMarker, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useApp } from "@/components/providers/app-providers";
import { Badge, Button, Spinner, THRESHOLD_HEX } from "@/components/ui";
import { MapPinIcon } from "@/components/ui/icons";

interface MapStation {
  stationId: string;
  stationName: string;
  stateCode: string;
  lat: number;
  lng: number;
  levelM: string | null;
  thresholdState: string;
}

const REFRESH_MS = 60_000;

export function StationMap() {
  const { t, theme } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const meLayerRef = useRef<LayerGroup | null>(null);
  const [stations, setStations] = useState<MapStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  // Init the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { attributionControl: true }).setView(
        [4.2, 108.0], // roughly centres Peninsular + East Malaysia
        6
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      markerLayerRef.current = L.layerGroup().addTo(map);
      meLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Fetch stations + poll.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/stations-map");
        const body = await res.json();
        if (!cancelled) setStations(body.stations ?? []);
      } catch {
        // keep last good set
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Draw / redraw markers when stations change.
  useEffect(() => {
    (async () => {
      const map = mapRef.current;
      const layer = markerLayerRef.current;
      if (!map || !layer || stations.length === 0) return;
      const L = (await import("leaflet")).default;
      layer.clearLayers();

      const markers: CircleMarker[] = [];
      for (const s of stations) {
        const color = THRESHOLD_HEX[s.thresholdState] ?? THRESHOLD_HEX.unknown;
        const elevated = s.thresholdState === "warning" || s.thresholdState === "danger";
        const marker = L.circleMarker([s.lat, s.lng], {
          radius: elevated ? 8 : 5,
          color: "#fff",
          weight: 1,
          fillColor: color,
          fillOpacity: 0.9,
        }).bindPopup(
          `<strong>${s.stationName}</strong><br/>${s.stationId} · ${s.stateCode}<br/>` +
            `Level: ${s.levelM ?? "—"} m<br/>State: <strong>${s.thresholdState}</strong>`
        );
        layer.addLayer(marker);
        markers.push(marker);
      }

      // Fit to the stations we actually have (first load only).
      if (markers.length > 0 && !map.getBounds().contains(markers[0].getLatLng())) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.15));
      }
    })();
  }, [stations]);

  async function locateMe() {
    if (!("geolocation" in navigator) || !mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const L = (await import("leaflet")).default;
        const map = mapRef.current!;
        const me = meLayerRef.current!;
        me.clearLayers();
        const here: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        L.circleMarker(here, {
          radius: 8,
          color: "#0ea5e9",
          weight: 3,
          fillColor: "#0ea5e9",
          fillOpacity: 0.4,
        })
          .bindPopup("You are here")
          .addTo(me);

        // Draw a line to the nearest station.
        if (stations.length > 0) {
          const nearest = stations.reduce((best, s) => {
            const d = (s.lat - here[0]) ** 2 + (s.lng - here[1]) ** 2;
            return d < best.d ? { s, d } : best;
          }, { s: stations[0], d: Infinity }).s;
          L.polyline([here, [nearest.lat, nearest.lng]], {
            color: "#0ea5e9",
            weight: 2,
            dashArray: "4 4",
          }).addTo(me);
        }
        map.setView(here, 11);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  }

  const counts = stations.reduce<Record<string, number>>((acc, s) => {
    acc[s.thresholdState] = (acc[s.thresholdState] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(["danger", "warning", "alert", "normal"] as const).map((th) =>
            counts[th] ? (
              <Badge key={th} tone={th === "danger" ? "red" : th === "warning" ? "orange" : th === "alert" ? "yellow" : "green"}>
                {t.thresholds[th]}: {counts[th]}
              </Badge>
            ) : null
          )}
        </div>
        <Button size="sm" variant="ghost" loading={locating} onClick={locateMe}>
          {!locating && <MapPinIcon size={14} />}
          {t.home.searchByGps}
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <div
          ref={containerRef}
          className={`h-[420px] w-full ${theme === "dark" ? "leaflet-dark" : ""}`}
          style={{ background: theme === "dark" ? "#0f172a" : "#e2e8f0" }}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-slate-950/40">
            <Spinner size="lg" />
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">{t.home.mapNote}</p>
    </div>
  );
}
