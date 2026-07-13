// Single AI client wrapper — Gemini (free tier) behind a provider-agnostic
// interface: retry x2 with backoff, timeout, usage logging, JSON-only output.
//
// This module is BANNED from src/worker and src/modules/trigger by ESLint —
// AI runs at the edges (onboarding, playbook synthesis, recovery), never on
// the storm-time path.

import { GoogleGenAI } from "@google/genai";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

export interface AiJsonRequest {
  /** Versioned prompt from src/lib/ai/prompts — never inline strings. */
  prompt: string;
  /** Base64-encoded images (vision inputs), if any. */
  images?: Array<{ mimeType: string; data: string }>;
  maxOutputTokens?: number;
  /** Label for usage logs, e.g. "site-extraction.v1". */
  label?: string;
}

const MAX_ATTEMPTS_PER_MODEL = 2;
const REQUEST_TIMEOUT_MS = 120_000;
// Free tier allows 5 requests/min on flash — pace proactively instead of
// slamming into 429s. 13s spacing ≈ 4.6 RPM.
const MIN_CALL_INTERVAL_MS = 13_000;

let client: GoogleGenAI | null = null;
let rateGate: Promise<void> = Promise.resolve();
let lastCallAt = 0;

/** Serialises calls and enforces the free-tier pacing between them. */
function acquireSlot(): Promise<void> {
  const prev = rateGate;
  let release!: () => void;
  rateGate = new Promise((r) => {
    release = r;
  });
  return prev.then(async () => {
    const wait = lastCallAt + MIN_CALL_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
    release();
  });
}

/** Backoff for a failed attempt: honour Google's RetryInfo when present. */
function backoffMs(err: unknown, attempt: number): number {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/"retryDelay":"(\d+)(?:\.\d+)?s"/) ?? msg.match(/retry in (\d+)(?:\.\d+)?s/i);
  if (m) return (Number.parseInt(m[1], 10) + 3) * 1000;
  if (msg.includes('"code":503') || msg.includes("UNAVAILABLE")) return 30_000 * attempt;
  return attempt * 5_000;
}

function getClient(): GoogleGenAI {
  const { GEMINI_API_KEY } = getConfig();
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured — see .env.example");
  }
  if (!client) {
    client = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    });
  }
  return client;
}

export async function generateJson(req: AiJsonRequest): Promise<unknown> {
  const { GEMINI_MODEL, GEMINI_FALLBACK_MODELS } = getConfig();
  const models = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== GEMINI_MODEL)];
  const parts: Array<Record<string, unknown>> = [
    ...(req.images ?? []).map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data },
    })),
    { text: req.prompt },
  ];

  let lastError: unknown = null;
  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      await acquireSlot();
      const started = Date.now();
      try {
        const response = await getClient().models.generateContent({
          model,
          contents: [{ role: "user", parts }],
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
            maxOutputTokens: req.maxOutputTokens ?? 16_384,
          },
        });

        const usage = response.usageMetadata;
        logger.info("ai call ok", {
          label: req.label ?? "unlabelled",
          model,
          fallback: model !== GEMINI_MODEL,
          attempt,
          ms: Date.now() - started,
          promptTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
          thoughtTokens: usage?.thoughtsTokenCount,
          totalTokens: usage?.totalTokenCount,
        });

        const text = response.text;
        if (!text) throw new Error("empty response from model");
        return parseJsonLoose(text);
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        logger.warn("ai call failed", {
          label: req.label ?? "unlabelled",
          model,
          attempt,
          ms: Date.now() - started,
          error: message,
        });
        // Capacity problems (429/503) won't heal within this model quickly —
        // move to the next model after the per-model attempts; other errors
        // (parse, timeout) also benefit from a model switch.
        if (attempt < MAX_ATTEMPTS_PER_MODEL) {
          const wait = backoffMs(err, attempt);
          logger.info("ai retry scheduled", { label: req.label ?? "unlabelled", model, waitMs: wait });
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    }
    logger.warn("ai model exhausted, falling back", { label: req.label ?? "unlabelled", model });
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`AI call failed across all models (${models.join(", ")})`);
}

/** Tolerates markdown fences the model occasionally wraps JSON in. */
function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(unfenced);
}
