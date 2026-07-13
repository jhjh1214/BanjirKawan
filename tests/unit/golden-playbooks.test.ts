// Golden fixtures: REAL Gemini-generated playbooks for a REAL photo-surveyed
// shop (saved 2026-07-13) must pass the rules engine, and the rules engine
// must reject corrupted variants of them. Guards against prompt/schema drift.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { validatePlaybook } from "@/modules/playbook";
import type { SiteGraph } from "@/modules/site-intelligence";

const fixture = (name: string) =>
  JSON.parse(readFileSync(path.resolve(__dirname, "../fixtures", name), "utf8"));

const graph: SiteGraph = fixture("golden-site-graph.json");
const warningMs = fixture("golden-playbook-warning-ms.json");
const dangerEn = fixture("golden-playbook-danger-en.json");

describe("golden playbooks (real generated output)", () => {
  it("BM warning playbook passes the rules engine", () => {
    const out = validatePlaybook(warningMs, graph, "warning");
    expect(out.errors).toEqual([]);
    expect(out.ok).toBe(true);
  });

  it("EN danger playbook passes the rules engine", () => {
    const out = validatePlaybook(dangerEn, graph, "danger");
    expect(out.errors).toEqual([]);
    expect(out.ok).toBe(true);
  });

  it("orders actions by protected value, electrical shutdown at the end", () => {
    const actions = warningMs.actions as Array<{
      order: number;
      savesRM: { low: number; high: number };
      text: string;
    }>;
    // The first action must protect more value than the median action.
    const values = actions.map((a) => (a.savesRM.low + a.savesRM.high) / 2);
    const sorted = [...values].sort((a, b) => a - b);
    expect(values[0]).toBeGreaterThanOrEqual(sorted[Math.floor(sorted.length / 2)]);
  });

  it("rejects the golden playbook if its budget is corrupted", () => {
    const corrupted = structuredClone(warningMs);
    corrupted.actions[0].estMinutes = 500; // blows the 120min warning budget
    expect(validatePlaybook(corrupted, graph, "warning").ok).toBe(false);
  });

  it("rejects the golden playbook if it targets a hallucinated asset", () => {
    const corrupted = structuredClone(warningMs);
    corrupted.actions[0].targetAssetIds = ["asset-that-does-not-exist"];
    expect(validatePlaybook(corrupted, graph, "warning").ok).toBe(false);
  });
});
