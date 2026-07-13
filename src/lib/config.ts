import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .describe("Postgres connection string (Railway plugin or local docker-compose)"),
  TELEGRAM_BOT_TOKEN: z.string().default(""),
  TELEGRAM_WEBHOOK_SECRET: z.string().default(""),
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash"),
  // Per-model quotas are independent on the free tier — when the primary is
  // overloaded (503) or exhausted (429), fall through to these in order.
  GEMINI_FALLBACK_MODELS: z
    .string()
    .default("gemini-3.1-flash-lite,gemini-flash-lite-latest")
    .transform((s) =>
      s
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean)
    ),
  INFOBANJIR_STATE_CODES: z
    .string()
    .default("SEL,WLH")
    .transform((s) =>
      s
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean)
    ),
  POLL_INTERVAL_SECONDS: z.coerce.number().int().positive().default(30),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  UPLOADS_DIR: z.string().default("./data/uploads"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | null = null;

/**
 * Validated env access. Lazy + memoized so `next build` (which runs without
 * runtime secrets) doesn't crash at import time — callers crash early at boot
 * or on first request instead, with a readable message.
 */
export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${details}\nSee .env.example for the required variables.`
    );
  }
  cached = parsed.data;
  return cached;
}
