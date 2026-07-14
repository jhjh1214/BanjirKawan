// Same defence pattern as onboarding: Zod schema + deterministic sanity rules
// + owner confirmation screen. A loss report feeds an aid/insurance claim —
// nothing unvalidated may reach it.

import type { SiteGraph } from "@/modules/site-intelligence";
import { damageReportSchema, type DamageReport } from "./schema";

export const LOW_CONFIDENCE_THRESHOLD = 0.6;

/** Loss can exceed book value a little (disposal, spoilage) but not wildly. */
const MAX_LOSS_FACTOR = 1.2;

export interface DamageValidationOutcome {
  ok: boolean;
  report: DamageReport | null;
  errors: string[];
  repairs: string[];
  lowConfidenceAssetIds: string[];
}

export function validateDamageReport(raw: unknown, graph: SiteGraph): DamageValidationOutcome {
  const parsed = damageReportSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      report: null,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      repairs: [],
      lowConfidenceAssetIds: [],
    };
  }

  const report = parsed.data;
  const errors: string[] = [];
  const repairs: string[] = [];
  const assetById = new Map(graph.assets.map((a) => [a.id, a]));

  // Drop hallucinated assets rather than rejecting the whole report.
  const unknown = report.items.filter((i) => !assetById.has(i.assetId));
  if (unknown.length > 0) {
    repairs.push(
      `dropped ${unknown.length} item(s) referencing assets not in the survey: ${unknown
        .map((i) => i.assetId)
        .join(", ")}`
    );
    report.items = report.items.filter((i) => assetById.has(i.assetId));
  }

  if (report.items.length === 0) {
    errors.push("no assessable items — every item referenced an unknown asset or the list was empty");
  }

  // One assessment per asset (keep the higher-confidence one).
  const seen = new Map<string, number>();
  report.items = report.items.filter((item, idx) => {
    const prevIdx = seen.get(item.assetId);
    if (prevIdx === undefined) {
      seen.set(item.assetId, idx);
      return true;
    }
    repairs.push(`duplicate assessment for ${item.assetId} — kept the more confident one`);
    return item.confidence > report.items[prevIdx].confidence;
  });

  for (const item of report.items) {
    const asset = assetById.get(item.assetId)!;

    if (item.estLossRM.low > item.estLossRM.high) {
      repairs.push(`${item.assetId}: loss range inverted, swapped`);
      item.estLossRM = { low: item.estLossRM.high, high: item.estLossRM.low };
    }

    if (item.condition === "ok" && item.estLossRM.high > 0) {
      repairs.push(`${item.assetId}: condition ok but non-zero loss — loss zeroed`);
      item.estLossRM = { low: 0, high: 0 };
    }

    const cap = asset.estValueRM.high * MAX_LOSS_FACTOR;
    if (item.estLossRM.high > cap) {
      repairs.push(
        `${item.assetId}: claimed loss RM${item.estLossRM.high} exceeds ${MAX_LOSS_FACTOR}x surveyed value — capped at RM${Math.round(cap)}`
      );
      item.estLossRM = { low: Math.min(item.estLossRM.low, cap), high: cap };
    }

    if ((item.condition === "destroyed" || item.condition === "missing") && item.estLossRM.high === 0) {
      repairs.push(`${item.assetId}: ${item.condition} with zero loss — defaulted to surveyed value`);
      item.estLossRM = { ...asset.estValueRM };
    }
  }

  if (report.waterLineCm !== undefined && report.waterLineCm > 400) {
    repairs.push(`waterline ${report.waterLineCm}cm is implausible indoors — cleared`);
    report.waterLineCm = undefined;
  }

  const lowConfidenceAssetIds = report.items
    .filter((i) => i.confidence < LOW_CONFIDENCE_THRESHOLD)
    .map((i) => i.assetId);

  return { ok: errors.length === 0, report, errors, repairs, lowConfidenceAssetIds };
}

/** Claimable totals: everything not "ok". Pure — shared by API, UI and report. */
export function computeLossTotals(report: Pick<DamageReport, "items">): {
  low: number;
  high: number;
  affectedItems: number;
} {
  const affected = report.items.filter((i) => i.condition !== "ok");
  return {
    low: affected.reduce((s, i) => s + i.estLossRM.low, 0),
    high: affected.reduce((s, i) => s + i.estLossRM.high, 0),
    affectedItems: affected.length,
  };
}
