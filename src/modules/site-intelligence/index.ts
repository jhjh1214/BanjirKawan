// Public interface — photos → validated SiteGraph.
// Enrichment (geocode + nearest station) lands Day 3.

export { siteGraphSchema, assetCategorySchema } from "./schema";
export type { SiteGraph, SiteAsset } from "./schema";
export { validateSiteGraph, LOW_CONFIDENCE_THRESHOLD } from "./validator";
export type { ValidationOutcome } from "./validator";
export { extractSiteGraphFromPhotos } from "./extractor";
export type { PhotoInput, ExtractionResult } from "./extractor";
