import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseStationReadings } from "@/modules/trigger";

const fixture = readFileSync(
  path.resolve(__dirname, "../fixtures/infobanjir-sample.html"),
  "utf8"
);

describe("parseStationReadings (real InfoBanjir response, saved 2026-07-13)", () => {
  const readings = parseStationReadings(fixture, "SEL");

  it("extracts every station row, skipping rows with no station id", () => {
    // The saved response has 68 rows, one of which has a blank Station ID.
    expect(readings.length).toBeGreaterThanOrEqual(50);
    for (const r of readings) {
      // IDs are usually numeric but can be alphanumeric (e.g. 0200101WL)
      expect(r.stationId).toMatch(/^\w+$/);
      expect(r.stationName.length).toBeGreaterThan(0);
      expect(r.stateCode).toBe("SEL");
    }
  });

  it("parses a known station exactly", () => {
    const kerling = readings.find((r) => r.stationId === "3516423");
    expect(kerling).toBeDefined();
    expect(kerling!.stationName).toBe("Sg. Kerling di Kerling");
    expect(kerling!.district).toBe("Hulu Selangor");
    expect(kerling!.levelM).toBeCloseTo(43.85, 2);
    expect(kerling!.thresholds).toEqual({
      normal: 45.0,
      alert: 47.6,
      warning: 47.9,
      danger: 48.3,
    });
  });

  it("parses the MYT last-update timestamp into a Date", () => {
    const kerling = readings.find((r) => r.stationId === "3516423")!;
    expect(kerling.lastUpdateRaw).toBe("13/07/2026 17:30");
    // 17:30 MYT == 09:30 UTC
    expect(kerling.lastUpdate?.toISOString()).toBe("2026-07-13T09:30:00.000Z");
  });

  it("reads water level from the nested anchor inside the wl cell", () => {
    const withLevels = readings.filter((r) => r.levelM !== null);
    expect(withLevels.length).toBeGreaterThan(10);
    for (const r of withLevels) {
      // Coastal/tidal stations legitimately report small negative levels.
      expect(r.levelM!).toBeGreaterThan(-100);
      expect(r.levelM!).toBeLessThan(1000);
    }
  });

  it("returns an empty list for a data-less shell page", () => {
    expect(parseStationReadings("<html><body>no table</body></html>", "SEL")).toEqual([]);
  });

  it("treats sentinel values (-9999) and blanks as null levels", () => {
    const synthetic = `
      <table><tbody>
        <tr class='item'>
          <td data-th='No'>1</td>
          <td data-th='Station ID'>0000001</td>
          <td data-th='Station Name'>Test Station</td>
          <td data-th='District'>Test</td>
          <td data-th='Main Basin (mm)'>Basin</td>
          <td data-th='Sub River Basin (mm)'>Sub</td>
          <td data-th='Last Update'>bad date</td>
          <td data-th='wl'><a>-9999</a></td>
          <td data-th='Normal'></td>
          <td data-th='Alert'>2.0</td>
          <td data-th='Warning'>3.0</td>
          <td data-th='Danger'>4.0</td>
        </tr>
      </tbody></table>`;
    const [r] = parseStationReadings(synthetic, "SEL");
    expect(r.levelM).toBeNull();
    expect(r.thresholds.normal).toBeNull();
    expect(r.thresholds.alert).toBe(2.0);
    expect(r.lastUpdate).toBeNull();
    expect(r.lastUpdateRaw).toBe("bad date");
  });
});
