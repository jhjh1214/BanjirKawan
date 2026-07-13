import { z } from "zod";

export const playbookTierSchema = z.enum(["watch", "warning", "danger"]);
export const playbookLanguageSchema = z.enum(["ms", "en", "zh"]);

export const playbookSchema = z.object({
  tier: playbookTierSchema,
  language: playbookLanguageSchema,
  estTotalMinutes: z.number().positive(),
  actions: z.array(
    z.object({
      order: z.number().int().positive(),
      text: z.string().min(1), // "Alihkan guni beras ke rak atas"
      targetAssetIds: z.array(z.string()),
      estMinutes: z.number().positive(),
      savesRM: z.object({
        low: z.number().nonnegative(),
        high: z.number().nonnegative(),
      }),
      deadlineOffsetMin: z.number(), // relative to trigger time
    })
  ),
});

export type Playbook = z.infer<typeof playbookSchema>;
export type PlaybookTier = z.infer<typeof playbookTierSchema>;
export type PlaybookLanguage = z.infer<typeof playbookLanguageSchema>;
