// The feedback loop: confirmed damage outcome → site graph v+1 (append-only).
// Deterministic: destroyed/missing assets leave the graph; damage history is
// recorded in risks so the next playbook generation knows what changed.

import type { SiteGraph } from "@/modules/site-intelligence";
import type { DamageReport } from "@/modules/recovery";

export interface GraphUpdateResult {
  nextGraph: SiteGraph;
  changesSummary: string[];
}

export function updateGraphFromOutcome(
  current: SiteGraph,
  outcome: Pick<DamageReport, "items" | "waterLineCm">,
  eventDate: string
): GraphUpdateResult {
  const changes: string[] = [];
  const gone = new Set(
    outcome.items
      .filter((i) => i.condition === "destroyed" || i.condition === "missing")
      .map((i) => i.assetId)
  );

  const nextAssets = current.assets.filter((asset) => {
    if (gone.has(asset.id)) {
      changes.push(`removed ${asset.id} (${asset.label}) — destroyed/missing in ${eventDate} flood`);
      return false;
    }
    return true;
  });

  const newRisks = [...current.risks];
  if (outcome.waterLineCm !== undefined) {
    const line = `Observed high-water mark ~${outcome.waterLineCm}cm indoors (${eventDate} flood) — treat assets below this height as first-loss.`;
    newRisks.push(line);
    changes.push(`recorded ${outcome.waterLineCm}cm waterline as a planning input`);
  }
  const damaged = outcome.items.filter((i) => i.condition === "damaged" || i.condition === "wet");
  if (damaged.length > 0) {
    newRisks.push(
      `${damaged.length} asset(s) damaged in the ${eventDate} flood: ${damaged
        .map((i) => i.label)
        .slice(0, 4)
        .join(", ")}${damaged.length > 4 ? "…" : ""} — verify condition before relying on them.`
    );
    changes.push(`flagged ${damaged.length} damaged asset(s) in risks`);
  }

  return {
    nextGraph: { ...current, assets: nextAssets, risks: newRisks },
    changesSummary: changes,
  };
}
