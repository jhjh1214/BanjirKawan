// Deterministic validation of LLM-proposed playbooks. The LLM proposes;
// this code disposes. A playbook that fails here never reaches the cache,
// so nothing unvalidated can ever be dispatched during a storm.

import type { SiteGraph } from "@/modules/site-intelligence";
import { playbookSchema, type Playbook, type PlaybookTier } from "./schema";
import { TIER_LEAD_TIME_BUDGET_MIN } from "./prioritizer";

export interface PlaybookValidation {
  ok: boolean;
  playbook: Playbook | null;
  errors: string[];
  /** Soft normalisations applied automatically. */
  repairs: string[];
}

export function validatePlaybook(
  raw: unknown,
  graph: SiteGraph,
  expectedTier: PlaybookTier
): PlaybookValidation {
  const parsed = playbookSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      playbook: null,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      repairs: [],
    };
  }

  const pb = parsed.data;
  const errors: string[] = [];
  const repairs: string[] = [];

  if (pb.tier !== expectedTier) {
    errors.push(`tier mismatch: expected ${expectedTier}, got ${pb.tier}`);
  }
  if (pb.actions.length === 0) {
    errors.push("playbook has no actions");
  }

  // --- ordering: orders must be unique and contiguous 1..n; normalise sort ---
  pb.actions.sort((a, b) => a.order - b.order);
  const orders = pb.actions.map((a) => a.order);
  const expectedOrders = pb.actions.map((_, i) => i + 1);
  if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
    repairs.push(`non-contiguous action orders [${orders.join(",")}] renumbered 1..${pb.actions.length}`);
    pb.actions.forEach((a, i) => {
      a.order = i + 1;
    });
  }

  // --- deadlines must not run backwards ---
  for (let i = 1; i < pb.actions.length; i++) {
    if (pb.actions[i].deadlineOffsetMin < pb.actions[i - 1].deadlineOffsetMin) {
      errors.push(
        `action ${pb.actions[i].order} deadline (${pb.actions[i].deadlineOffsetMin}min) is earlier than the previous action's`
      );
    }
  }

  // --- time feasibility: Σ estMinutes must fit the tier's lead-time budget ---
  const budget = TIER_LEAD_TIME_BUDGET_MIN[expectedTier];
  const totalMinutes = pb.actions.reduce((s, a) => s + a.estMinutes, 0);
  if (totalMinutes > budget) {
    errors.push(`total effort ${totalMinutes}min exceeds the ${expectedTier} lead-time budget of ${budget}min`);
  }
  if (Math.abs(pb.estTotalMinutes - totalMinutes) > Math.max(5, totalMinutes * 0.2)) {
    repairs.push(`estTotalMinutes ${pb.estTotalMinutes} corrected to Σ actions = ${totalMinutes}`);
    pb.estTotalMinutes = totalMinutes;
  }

  // --- physics: referenced assets must exist; immovable assets only get quick protective actions ---
  const assetById = new Map(graph.assets.map((a) => [a.id, a]));
  for (const action of pb.actions) {
    for (const id of action.targetAssetIds) {
      const asset = assetById.get(id);
      if (!asset) {
        errors.push(`action ${action.order} targets unknown asset "${id}"`);
        continue;
      }
      if (!asset.movable && action.estMinutes > 20) {
        errors.push(
          `action ${action.order} spends ${action.estMinutes}min on immovable asset "${asset.label}" — protective actions on fixed assets must be quick (<=20min)`
        );
      }
    }
    if (action.savesRM.low > action.savesRM.high) {
      repairs.push(`action ${action.order}: savesRM range inverted, swapped`);
      action.savesRM = { low: action.savesRM.high, high: action.savesRM.low };
    }
  }

  // --- electrical-off ordered last-but-safe: any action touching electrical
  //     assets (or the mains) must sit in the final third of the plan — you
  //     need power while moving stock, and leaving it live is the hazard. ---
  const electricalActions = pb.actions.filter((a) =>
    a.targetAssetIds.some((id) => assetById.get(id)?.category === "electrical")
  );
  const lastThirdStart = Math.max(1, Math.ceil(pb.actions.length * (2 / 3)));
  for (const a of electricalActions) {
    if (a.order < lastThirdStart) {
      errors.push(
        `action ${a.order} touches electrical assets but is scheduled early — power-down belongs at the end of the plan (order >= ${lastThirdStart})`
      );
    }
  }

  return { ok: errors.length === 0, playbook: pb, errors, repairs };
}
