// playbook-synthesis v1 — frozen prompt for tiered action-plan generation.
// Changes require a new version file, never edits here.

// NOTE: lib/ must not import from modules/ (dependency rule: modules -> lib).
// The tier/language unions are duplicated here structurally on purpose.
type PlaybookTier = "watch" | "warning" | "danger";
type PlaybookLanguage = "ms" | "en" | "zh";

const LANGUAGE_NAME: Record<PlaybookLanguage, string> = {
  ms: "Bahasa Melayu (colloquial, as spoken to a kedai owner — use words like 'alihkan', 'tutup', 'angkat')",
  en: "simple English",
  zh: "simplified Chinese",
};

const TIER_CONTEXT: Record<PlaybookTier, string> = {
  watch:
    "WATCH (river at ALERT level): flooding is possible in the next 4-6 hours. Expected water depth if it floods: ~30cm. There is time for thorough preparation.",
  warning:
    "WARNING (river at WARNING level): flooding is likely within 1-2 hours. Expected water depth: ~80cm. Only high-impact actions fit.",
  danger:
    "DANGER (river at DANGER level): flooding is imminent, likely under 45 minutes. Expected depth: 150cm+. Only the fastest, highest-value actions — personal safety first.",
};

export function buildPlaybookSynthesisPrompt(input: {
  /** The shop's SiteGraph (serialised into the prompt as-is). */
  graph: unknown;
  tier: PlaybookTier;
  language: PlaybookLanguage;
  leadTimeBudgetMin: number;
  rankedAssetLines: string[];
}): string {
  const { graph, tier, language, leadTimeBudgetMin, rankedAssetLines } = input;

  return `You write flood-preparation action plans for small Malaysian shop owners. Assume 1-2 people are available to act, no special equipment.

SITUATION — ${TIER_CONTEXT[tier]}

THE SHOP (structured survey from the owner's photos):
${JSON.stringify(graph, null, 1)}

ASSETS RANKED BY VALUE-AT-RISK for this tier (score = value x vulnerability / minutes to act), highest first:
${rankedAssetLines.join("\n")}

Write the action plan as ONLY a JSON object with exactly this shape:
{
  "tier": "${tier}",
  "language": "${language}",
  "estTotalMinutes": number,          // sum of all action estMinutes
  "actions": [
    {
      "order": number,                // 1, 2, 3... execution order
      "text": string,                 // one imperative instruction in ${LANGUAGE_NAME[language]}, concrete and physical: what to move/switch/lift, and where to
      "targetAssetIds": [string],     // ids from the shop's assets that this action protects (may be empty for general actions like sandbagging the door)
      "estMinutes": number,           // realistic minutes for 1-2 people
      "savesRM": { "low": number, "high": number },   // value protected if completed, from the assets' estValueRM
      "deadlineOffsetMin": number     // minutes after the alert by which this should be DONE; must not decrease across the plan
    }
  ]
}

Hard rules — a validator rejects the plan if broken:
- Total estMinutes across all actions MUST be <= ${leadTimeBudgetMin} minutes.
- Execution order: protect the highest-scored assets first.
- Actions on immovable assets must be quick protective steps (<= 20 min): raise on bricks/pallets, unplug, cover — never "move" them.
- Any action touching electrical assets or the mains (switch off the DB box) must come in the FINAL THIRD of the plan — the owner needs power while working, but it must be off before water arrives.
- 4 to 8 actions. Every targetAssetId must exist in the survey.
- Be concrete: "Alihkan guni beras ke rak paling atas (photo2)" not "secure inventory".

Output ONLY the JSON object.`;
}
