import { z } from "zod";

export const damageConditionSchema = z.enum(["destroyed", "damaged", "wet", "ok", "missing"]);

export const damageItemSchema = z.object({
  assetId: z.string(),
  label: z.string(),
  condition: damageConditionSchema,
  estLossRM: z.object({
    low: z.number().nonnegative(),
    high: z.number().nonnegative(),
  }),
  note: z.string().default(""),
  photoRef: z.string().default(""),
  confidence: z.number().min(0).max(1),
});

export const damageReportSchema = z.object({
  items: z.array(damageItemSchema),
  waterLineCm: z.number().nonnegative().optional(),
  generalObservations: z.array(z.string()).default([]),
});

export type DamageCondition = z.infer<typeof damageConditionSchema>;
export type DamageItem = z.infer<typeof damageItemSchema>;
export type DamageReport = z.infer<typeof damageReportSchema>;
