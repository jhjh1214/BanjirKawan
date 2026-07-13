// Public interface — outcome diff → site graph v+1 (the feedback loop).
// Implementation lands Day 6–7.

import type { SiteGraph } from "@/modules/site-intelligence";
import type { LossReport } from "@/modules/recovery";

export interface GraphUpdateResult {
  nextGraph: SiteGraph;
  changesSummary: string[];
}

export async function updateGraphFromOutcome(
  _current: SiteGraph,
  _outcome: LossReport
): Promise<GraphUpdateResult> {
  throw new Error("learning loop not implemented until Day 6–7");
}
