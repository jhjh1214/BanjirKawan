import { z } from "zod";

// The core artifact: structured site risk graph built from ~5 phone photos.
// Every AI extraction is validated against this schema before persistence.

export const assetCategorySchema = z.enum([
  "equipment",
  "stock",
  "electrical",
  "furniture",
  "document",
]);

export const siteGraphSchema = z.object({
  shopType: z.string(),
  floorAreaEstimateSqm: z.number().positive().optional(),
  entrances: z.array(
    z.object({
      id: z.string(),
      facing: z.string(),
      widthM: z.number().positive().optional(),
      stepHeightCm: z.number().optional(),
    })
  ),
  assets: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      category: assetCategorySchema,
      heightFromFloorCm: z.number(), // THE key vulnerability number
      movable: z.boolean(),
      estMoveMinutes: z.number().positive().optional(),
      estValueRM: z.object({
        low: z.number().nonnegative(),
        high: z.number().nonnegative(),
      }),
      photoRef: z.string(),
      confidence: z.number().min(0).max(1), // <0.6 → flagged for owner confirmation
    })
  ),
  electrical: z.object({
    dbBoxHeightCm: z.number().optional(),
    outletsNearFloor: z.boolean(),
  }),
  risks: z.array(z.string()),
});

export type SiteGraph = z.infer<typeof siteGraphSchema>;
export type SiteAsset = SiteGraph["assets"][number];
