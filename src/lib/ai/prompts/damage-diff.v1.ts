// damage-diff v1 — frozen prompt for post-flood damage assessment.
// Changes require a new version file, never edits here.

export function buildDamageDiffPrompt(input: {
  /** The pre-flood SiteGraph (serialised as-is). */
  beforeGraph: unknown;
  photoCount: number;
  eventContext: string;
}): string {
  return `You are a flood damage assessor for small Malaysian shops. You are given:
1. A structured PRE-FLOOD survey of the shop (its assets, positions, heights, values).
2. ${input.photoCount} AFTER-FLOOD photos taken by the owner (photo1..photo${input.photoCount}).

Flood event context: ${input.eventContext}

Compare the photos against the pre-flood survey and output ONLY a JSON object:

{
  "items": [
    {
      "assetId": string,          // MUST be an id from the pre-flood survey below
      "label": string,            // the asset's label (copy from survey)
      "condition": "destroyed" | "damaged" | "wet" | "ok" | "missing",
      "estLossRM": { "low": number, "high": number },   // realistic loss in Malaysian Ringgit
      "note": string,             // one short sentence of visible evidence: "waterline above compressor", "cartons collapsed"
      "photoRef": string,         // strongest evidence photo: "photo1".. — or "" if the asset is not visible
      "confidence": number        // 0-1: how sure you are of this assessment
    }
  ],
  "waterLineCm": number,          // visible high-water mark height in cm, omit if not determinable
  "generalObservations": [string] // mud depth, electrical damage signs, structural issues
}

Rules:
- Assess EVERY asset from the pre-flood survey exactly once (condition "ok" with loss 0 if undamaged or clearly above the waterline).
- condition "missing" only when an asset location is visible but the asset is gone.
- Losses must be consistent with the survey values: a destroyed asset ≈ its replacement value; "wet" stock is usually a total loss for food items; equipment may be repairable (partial loss).
- Lower confidence (< 0.6) when the asset is not clearly visible in any photo.
- Be honest and conservative — this report supports an aid/insurance claim and will be checked.

PRE-FLOOD SURVEY:
${JSON.stringify(input.beforeGraph, null, 1)}

Output ONLY the JSON object.`;
}
