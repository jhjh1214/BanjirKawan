import { describe, expect, it } from "vitest";
import { decodeStationCoords, haversineKm, resolveNearestStation } from "@/modules/geo";

describe("decodeStationCoords (DID grid scheme)", () => {
  it("decodes real Selangor station ids to plausible coordinates", () => {
    // Sg. Kerling di Kerling — actual location ~3.55N 101.61E
    const kerling = decodeStationCoords("3516423");
    expect(kerling).not.toBeNull();
    expect(kerling!.lat).toBeCloseTo(3.55, 2);
    expect(kerling!.lng).toBeCloseTo(101.65, 2);

    // Klang-area station — actual ~3.0N 101.4E
    const klang = decodeStationCoords("3014401");
    expect(klang!.lat).toBeCloseTo(3.05, 2);
    expect(klang!.lng).toBeCloseTo(101.45, 2);
  });

  it("rejects non-conforming ids", () => {
    expect(decodeStationCoords("0200101WL")).toBeNull(); // alphanumeric state-run id
    expect(decodeStationCoords("0220291")).toBeNull(); // decodes out of MY bounds (lat 0.2)
    expect(decodeStationCoords("")).toBeNull();
    expect(decodeStationCoords("123")).toBeNull();
  });
});

describe("haversineKm", () => {
  it("computes known distances", () => {
    // KL city centre → Shah Alam ≈ 22-25 km
    const kl = { lat: 3.139, lng: 101.6869 };
    const shahAlam = { lat: 3.0733, lng: 101.5185 };
    const d = haversineKm(kl, shahAlam);
    expect(d).toBeGreaterThan(18);
    expect(d).toBeLessThan(26);
  });

  it("is zero for identical points", () => {
    expect(haversineKm({ lat: 3, lng: 101 }, { lat: 3, lng: 101 })).toBe(0);
  });
});

describe("resolveNearestStation", () => {
  const candidates = [
    { stationId: "3516423", stationName: "Sg. Kerling di Kerling" }, // ~3.55, 101.65
    { stationId: "3014401", stationName: "Klang station" }, // ~3.05, 101.45
    { stationId: "0200101WL", stationName: "Non-decodable" },
  ];

  it("picks the geographically nearest decodable station", () => {
    // Taman Sri Muda, Shah Alam ≈ 3.04N 101.53E → Klang station is nearest
    const near = resolveNearestStation(3.04, 101.53, candidates);
    expect(near!.stationId).toBe("3014401");
    expect(near!.distanceKm).toBeLessThan(15);

    // Kuala Kubu Bharu ≈ 3.57N 101.65E → Kerling station is nearest
    const north = resolveNearestStation(3.57, 101.65, candidates);
    expect(north!.stationId).toBe("3516423");
  });

  it("skips non-decodable ids and handles empty candidate lists", () => {
    expect(resolveNearestStation(3, 101, [candidates[2]])).toBeNull();
    expect(resolveNearestStation(3, 101, [])).toBeNull();
  });
});
