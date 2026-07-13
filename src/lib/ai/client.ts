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

const MAX_ATTEMPTS = 3; // 1 try + retry x2
const REQUEST_TIMEOUT_MS = 120_000;

let client: GoogleGenAI | null = null;

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
  const { GEMINI_MODEL } = getConfig();
  const parts: Array<Record<string, unknown>> = [
    ...(req.images ?? []).map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data },
    })),
    { text: req.prompt },
  ];

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const started = Date.now();
    try {
      const response = await getClient().models.generateContent({
        model: GEMINI_MODEL,
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
        model: GEMINI_MODEL,
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
      logger.warn("ai call failed", {
        label: req.label ?? "unlabelled",
        attempt,
        ms: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      });
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`AI call failed after ${MAX_ATTEMPTS} attempts`);
}

/** Tolerates markdown fences the model occasionally wraps JSON in. */
function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(unfenced);
}
