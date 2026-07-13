// Gemini constrained generation → rules engine. Reject → regenerate once with
// the validator's errors fed back → else throw. Runs on dry days only; the
// output is CACHED and the storm-time path reads the cache, never this file.

import { generateJson } from "@/lib/ai/client";
import { buildPlaybookSynthesisPrompt } from "@/lib/ai/prompts/playbook-synthesis.v1";
import { logger } from "@/lib/logger";
import type { SiteGraph } from "@/modules/site-intelligence";
import type { Playbook, PlaybookLanguage, PlaybookTier } from "./schema";
import { rankAssets, TIER_LEAD_TIME_BUDGET_MIN } from "./prioritizer";
import { validatePlaybook } from "./rules-engine";

export interface SynthesisResult {
  playbook: Playbook;
  repairs: string[];
}

export async function synthesizePlaybookForTier(
  graph: SiteGraph,
  tier: PlaybookTier,
  language: PlaybookLanguage
): Promise<SynthesisResult> {
  const ranked = rankAssets(graph.assets, tier);
  const rankedAssetLines = ranked.map(
    (r, i) =>
      `${i + 1}. ${r.asset.id} "${r.asset.label}" — RM${r.valueAtRiskRM} at risk, ` +
      `${Math.round(r.vulnerability * 100)}% exposed, ${r.asset.movable ? `movable in ~${r.asset.estMoveMinutes}min` : "NOT movable"}`
  );

  const basePrompt = buildPlaybookSynthesisPrompt({
    graph,
    tier,
    language,
    leadTimeBudgetMin: TIER_LEAD_TIME_BUDGET_MIN[tier],
    rankedAssetLines,
  });

  let outcome = await runOnce(basePrompt, graph, tier, language);

  if (!outcome.ok) {
    logger.warn("playbook rejected by rules engine, regenerating once", {
      tier,
      language,
      errors: outcome.errors,
    });
    const retryPrompt =
      `${basePrompt}\n\nYour previous plan was rejected by the validator for these reasons:\n` +
      outcome.errors.map((e) => `- ${e}`).join("\n") +
      "\nFix these problems and output the corrected JSON object.";
    outcome = await runOnce(retryPrompt, graph, tier, language);
  }

  if (!outcome.ok || !outcome.playbook) {
    throw new Error(
      `playbook synthesis failed twice for ${tier}/${language}: ${outcome.errors.join("; ")}`
    );
  }

  return { playbook: outcome.playbook, repairs: outcome.repairs };
}

async function runOnce(
  prompt: string,
  graph: SiteGraph,
  tier: PlaybookTier,
  language: PlaybookLanguage
) {
  const raw = await generateJson({ prompt, label: `playbook-synthesis.v1:${tier}:${language}` });
  return validatePlaybook(raw, graph, tier);
}
