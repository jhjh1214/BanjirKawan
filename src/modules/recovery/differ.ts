// Gemini vision damage assessment — AFTER the storm, never during it.
// This is dry-day-class AI use: the alert path stays untouched.
// Reject → regenerate once with the validator's errors → else throw.

import { generateJson } from "@/lib/ai/client";
import { buildDamageDiffPrompt } from "@/lib/ai/prompts/damage-diff.v1";
import { logger } from "@/lib/logger";
import type { SiteGraph, PhotoInput } from "@/modules/site-intelligence";
import type { DamageReport } from "./schema";
import { validateDamageReport } from "./validator";

export interface DiffResult {
  report: DamageReport;
  repairs: string[];
  lowConfidenceAssetIds: string[];
}

export async function diffDamage(
  beforeGraph: SiteGraph,
  afterPhotos: PhotoInput[],
  eventContext: string
): Promise<DiffResult> {
  if (afterPhotos.length === 0) throw new Error("at least one after-photo is required");

  const basePrompt = buildDamageDiffPrompt({
    beforeGraph,
    photoCount: afterPhotos.length,
    eventContext,
  });

  let outcome = await runOnce(basePrompt, afterPhotos, beforeGraph);

  if (!outcome.ok) {
    logger.warn("damage report rejected by validator, regenerating once", {
      errors: outcome.errors,
    });
    const retryPrompt =
      `${basePrompt}\n\nYour previous assessment was rejected for these reasons:\n` +
      outcome.errors.map((e) => `- ${e}`).join("\n") +
      "\nFix these problems and output the corrected JSON object.";
    outcome = await runOnce(retryPrompt, afterPhotos, beforeGraph);
  }

  if (!outcome.ok || !outcome.report) {
    throw new Error(`damage assessment failed validation twice: ${outcome.errors.join("; ")}`);
  }

  return {
    report: outcome.report,
    repairs: outcome.repairs,
    lowConfidenceAssetIds: outcome.lowConfidenceAssetIds,
  };
}

async function runOnce(prompt: string, photos: PhotoInput[], graph: SiteGraph) {
  const raw = await generateJson({ prompt, images: photos, label: "damage-diff.v1" });
  return validateDamageReport(raw, graph);
}
