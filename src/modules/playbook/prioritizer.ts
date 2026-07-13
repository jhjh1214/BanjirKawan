// Asset prioritisation — pure, deterministic. Ranks what to save first:
//   score = value-at-risk × vulnerability ÷ time-to-execute
// The ranking feeds the synthesis prompt (so the LLM focuses on what matters)
// and gives judges a defensible answer to "why this order?".

import type { SiteAsset } from "@/modules/site-intelligence";
import type { PlaybookTier } from "./schema";

/** Expected floodwater depth (cm) per tier — conservative planning figures. */
export const TIER_FLOOD_DEPTH_CM: Record<PlaybookTier, number> = {
  watch: 30,
  warning: 80,
  danger: 150,
};

/** Usable lead time (minutes) per tier — the rules engine's hard budget. */
export const TIER_LEAD_TIME_BUDGET_MIN: Record<PlaybookTier, number> = {
  watch: 360,
  warning: 120,
  danger: 45,
};

export interface RankedAsset {
  asset: SiteAsset;
  /** 0–1: fraction of the asset's value exposed at this tier's water depth. */
  vulnerability: number;
  /** Midpoint of the value range, RM. */
  valueAtRiskRM: number;
  score: number;
}

/**
 * Vulnerability: 1 when the asset sits on the floor, falling linearly to 0 as
 * its lowest point clears the expected water depth.
 */
export function vulnerabilityAt(asset: SiteAsset, floodDepthCm: number): number {
  if (floodDepthCm <= 0) return 0;
  const clearance = asset.heightFromFloorCm;
  if (clearance >= floodDepthCm) return 0;
  return (floodDepthCm - clearance) / floodDepthCm;
}

export function rankAssets(assets: SiteAsset[], tier: PlaybookTier): RankedAsset[] {
  const depth = TIER_FLOOD_DEPTH_CM[tier];
  return assets
    .map((asset) => {
      const vulnerability = vulnerabilityAt(asset, depth);
      const valueAtRiskRM = (asset.estValueRM.low + asset.estValueRM.high) / 2;
      // Immovable assets can still be protected (power off, raise on bricks),
      // but actions on them are cheap/fast — floor their time cost at 5 min.
      const timeCost = asset.movable ? Math.max(asset.estMoveMinutes ?? 10, 1) : 5;
      return {
        asset,
        vulnerability,
        valueAtRiskRM,
        score: (valueAtRiskRM * vulnerability) / timeCost,
      };
    })
    .filter((r) => r.vulnerability > 0)
    .sort((a, b) => b.score - a.score);
}
