// Hallucination defence layer 3 (after per-asset confidence and the owner
// confirmation screen): Zod schema + physical sanity rules. Nothing
// unvalidated reaches the DB or a user.

import { siteGraphSchema, type SiteGraph } from "./schema";

export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export interface ValidationOutcome {
  ok: boolean;
  graph: SiteGraph | null;
  /** Hard failures — reject and regenerate. */
  errors: string[];
  /** Soft repairs applied automatically — shown to the owner. */
  repairs: string[];
  lowConfidenceAssetIds: string[];
}

export function validateSiteGraph(raw: unknown): ValidationOutcome {
  const parsed = siteGraphSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      graph: null,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      repairs: [],
      lowConfidenceAssetIds: [],
    };
  }

  const graph = parsed.data;
  const errors: string[] = [];
  const repairs: string[] = [];

  if (graph.assets.length === 0) {
    errors.push("no assets extracted — a shop survey with zero assets is useless");
  }

  // Unique asset ids (re-key duplicates rather than rejecting the whole graph).
  const seen = new Set<string>();
  for (const asset of graph.assets) {
    if (seen.has(asset.id)) {
      const newId = `${asset.id}-${seen.size}`;
      repairs.push(`duplicate asset id ${asset.id} re-keyed to ${newId}`);
      asset.id = newId;
    }
    seen.add(asset.id);
  }

  for (const asset of graph.assets) {
    // Physics: heights beyond a 2-storey shophouse are extraction noise.
    if (asset.heightFromFloorCm < 0) {
      repairs.push(`${asset.id} (${asset.label}): negative height clamped to 0`);
      asset.heightFromFloorCm = 0;
    } else if (asset.heightFromFloorCm > 500) {
      errors.push(
        `${asset.id} (${asset.label}): heightFromFloorCm=${asset.heightFromFloorCm} is implausible (> 500cm)`
      );
    }

    // Value ranges must be ordered.
    if (asset.estValueRM.low > asset.estValueRM.high) {
      repairs.push(`${asset.id} (${asset.label}): value range was inverted, swapped`);
      const { low, high } = asset.estValueRM;
      asset.estValueRM = { low: high, high: low };
    }

    // A single kedai asset priced above RM250k is almost certainly wrong.
    if (asset.estValueRM.high > 250_000) {
      errors.push(
        `${asset.id} (${asset.label}): estValueRM.high=${asset.estValueRM.high} is implausible for a small shop`
      );
    }

    // Movable assets need a move-time for playbook feasibility maths.
    if (asset.movable && asset.estMoveMinutes === undefined) {
      repairs.push(`${asset.id} (${asset.label}): movable without estMoveMinutes, defaulted to 10`);
      asset.estMoveMinutes = 10;
    }
    if (asset.movable && asset.estMoveMinutes !== undefined && asset.estMoveMinutes > 120) {
      repairs.push(
        `${asset.id} (${asset.label}): estMoveMinutes=${asset.estMoveMinutes} > 120, marked not movable instead`
      );
      asset.movable = false;
      asset.estMoveMinutes = undefined;
    }
  }

  const lowConfidenceAssetIds = graph.assets
    .filter((a) => a.confidence < LOW_CONFIDENCE_THRESHOLD)
    .map((a) => a.id);

  return { ok: errors.length === 0, graph, errors, repairs, lowConfidenceAssetIds };
}
