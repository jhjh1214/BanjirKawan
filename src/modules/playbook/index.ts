// Public interface — SiteGraph → tiered, timed, validated action plans.
// Synthesis runs on dry days only; results are CACHED in the DB and the
// storm-time path reads the cache, never the synthesizer.

export { playbookSchema, playbookTierSchema, playbookLanguageSchema } from "./schema";
export type { Playbook, PlaybookTier, PlaybookLanguage } from "./schema";
export {
  rankAssets,
  vulnerabilityAt,
  TIER_FLOOD_DEPTH_CM,
  TIER_LEAD_TIME_BUDGET_MIN,
} from "./prioritizer";
export type { RankedAsset } from "./prioritizer";
export { validatePlaybook } from "./rules-engine";
export type { PlaybookValidation } from "./rules-engine";
export { synthesizePlaybookForTier } from "./synthesizer";
export type { SynthesisResult } from "./synthesizer";

import { logger } from "@/lib/logger";
import { getLatestSiteGraph } from "@/lib/db/repositories/site-graphs.repo";
import { createPlaybook } from "@/lib/db/repositories/playbooks.repo";
import type { PlaybookLanguage, PlaybookTier } from "./schema";
import { synthesizePlaybookForTier } from "./synthesizer";

const TIERS: PlaybookTier[] = ["watch", "warning", "danger"];
const LANGUAGES: PlaybookLanguage[] = ["ms", "en"]; // zh is the D3-slip scope cut per BLUEPRINT §5

export interface ShopPlaybookGeneration {
  generated: Array<{ tier: PlaybookTier; language: PlaybookLanguage; playbookId: string }>;
  failed: Array<{ tier: PlaybookTier; language: PlaybookLanguage; error: string }>;
}

/**
 * Generate + cache the full playbook set for a shop's latest confirmed site
 * graph: 3 tiers × BM/EN, sequential (free-tier rate limits). Partial failure
 * is tolerated — each successful playbook is cached independently.
 */
export async function generateShopPlaybooks(shopId: string): Promise<ShopPlaybookGeneration> {
  const siteGraph = await getLatestSiteGraph(shopId);
  if (!siteGraph) throw new Error(`no site graph for shop ${shopId}`);
  if (!siteGraph.confirmed) {
    logger.warn("generating playbooks from an unconfirmed site graph", { shopId });
  }

  const result: ShopPlaybookGeneration = { generated: [], failed: [] };

  for (const tier of TIERS) {
    for (const language of LANGUAGES) {
      try {
        const { playbook } = await synthesizePlaybookForTier(siteGraph.graph, tier, language);
        const row = await createPlaybook({
          shopId,
          siteGraphVersion: siteGraph.version,
          tier,
          language,
          actions: playbook.actions,
          validated: true, // only rules-engine-approved playbooks reach this call
        });
        result.generated.push({ tier, language, playbookId: row.id });
        logger.info("playbook cached", { shopId, tier, language, actions: playbook.actions.length });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        result.failed.push({ tier, language, error });
        logger.error("playbook generation failed", { shopId, tier, language, error });
      }
    }
  }

  return result;
}
