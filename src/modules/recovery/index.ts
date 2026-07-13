// Public interface — post-flood: guided walkthrough → damage diff → loss report.
// Implementation lands Day 6.

import type { SiteGraph } from "@/modules/site-intelligence";

export interface DamageDiffInput {
  beforeGraph: SiteGraph;
  afterPhotoPaths: string[];
}

export interface DamageItem {
  assetId: string;
  label: string;
  condition: "destroyed" | "damaged" | "wet" | "ok" | "missing";
  estLossRM: { low: number; high: number };
  photoRef: string;
}

export interface LossReport {
  items: DamageItem[];
  totalEstLossRM: { low: number; high: number };
  generatedAt: string;
}

export async function buildLossReport(_input: DamageDiffInput): Promise<LossReport> {
  throw new Error("recovery mode not implemented until Day 6");
}
