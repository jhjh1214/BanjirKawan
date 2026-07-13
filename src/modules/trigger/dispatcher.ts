// Day 5: cached playbook lookup -> delivery queue.
// Deliberately empty today — the worker only detects and logs tier changes.
// This file must NEVER import AI code (enforced by ESLint no-restricted-imports).

export interface DispatchRequest {
  stationId: string;
  tier: "watch" | "warning" | "danger";
  floodEventId: string;
}

export async function dispatchForTierChange(_req: DispatchRequest): Promise<void> {
  throw new Error("dispatcher not implemented until Day 5");
}
