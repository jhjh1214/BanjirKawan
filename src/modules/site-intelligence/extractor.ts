// Gemini Vision call → validator. Reject → regenerate once with the errors
// appended → else throw (the API surfaces a friendly failure + the fallback
// form is the Day 3+ degraded path).

import { generateJson } from "@/lib/ai/client";
import { buildSiteExtractionPrompt } from "@/lib/ai/prompts/site-extraction.v1";
import { logger } from "@/lib/logger";
import { validateSiteGraph, type ValidationOutcome } from "./validator";

export interface PhotoInput {
  mimeType: string;
  /** Base64-encoded (already resized) image bytes. */
  data: string;
}

export interface ExtractionResult {
  graph: NonNullable<ValidationOutcome["graph"]>;
  repairs: string[];
  lowConfidenceAssetIds: string[];
}

export async function extractSiteGraphFromPhotos(
  photos: PhotoInput[],
  address: string
): Promise<ExtractionResult> {
  if (photos.length === 0) throw new Error("at least one photo is required");

  const basePrompt = buildSiteExtractionPrompt(address, photos.length);

  let outcome = await runOnce(photos, basePrompt);

  if (!outcome.ok) {
    logger.warn("site extraction rejected by validator, regenerating once", {
      errors: outcome.errors,
    });
    const retryPrompt =
      `${basePrompt}\n\nYour previous output was rejected by a validator for these reasons:\n` +
      outcome.errors.map((e) => `- ${e}`).join("\n") +
      "\nFix these problems and output the corrected JSON object.";
    outcome = await runOnce(photos, retryPrompt);
  }

  if (!outcome.ok || !outcome.graph) {
    throw new Error(`site extraction failed validation twice: ${outcome.errors.join("; ")}`);
  }

  return {
    graph: outcome.graph,
    repairs: outcome.repairs,
    lowConfidenceAssetIds: outcome.lowConfidenceAssetIds,
  };
}

async function runOnce(photos: PhotoInput[], prompt: string): Promise<ValidationOutcome> {
  const raw = await generateJson({
    prompt,
    images: photos,
    label: "site-extraction.v1",
  });
  return validateSiteGraph(raw);
}
