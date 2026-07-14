// Public interface — post-flood: after-photos → validated damage report →
// printable loss report → site graph v+1 (learning loop).

export { damageReportSchema, damageItemSchema, damageConditionSchema } from "./schema";
export type { DamageReport, DamageItem, DamageCondition } from "./schema";
export {
  validateDamageReport,
  computeLossTotals,
  LOW_CONFIDENCE_THRESHOLD,
} from "./validator";
export type { DamageValidationOutcome } from "./validator";
export { diffDamage } from "./differ";
export type { DiffResult } from "./differ";
