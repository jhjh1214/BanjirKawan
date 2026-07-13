// Public interface — SiteGraph → tiered, timed, validated action plans.
// Synthesis (Day 4) runs on dry days only; results are CACHED in the DB and
// the storm-time path reads the cache, never the synthesizer.

export { playbookSchema, playbookTierSchema, playbookLanguageSchema } from "./schema";
export type { Playbook, PlaybookTier, PlaybookLanguage } from "./schema";

import type { SiteGraph } from "@/modules/site-intelligence";
import type { Playbook, PlaybookLanguage, PlaybookTier } from "./schema";

export interface SynthesizePlaybookInput {
  graph: SiteGraph;
  tier: PlaybookTier;
  language: PlaybookLanguage;
  /** Lead-time budget in minutes for this tier (rules engine rejects overruns). */
  leadTimeBudgetMinutes: number;
}

/** Day 4: constrained generation → rules engine (time/physics/deps) → cache. */
export async function synthesizePlaybook(_input: SynthesizePlaybookInput): Promise<Playbook> {
  throw new Error("playbook synthesis not implemented until Day 4");
}
