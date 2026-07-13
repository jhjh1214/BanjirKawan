// Lightweight typed i18n — no library, no locale routing. One language
// rendered at a time; the choice persists in localStorage (see the
// LocaleProvider in components/providers).

import { en } from "./dictionaries/en";

export type Dictionary = typeof en;
export type Locale = "ms" | "en" | "zh";

export const LOCALES: Locale[] = ["ms", "en", "zh"];
export const DEFAULT_LOCALE: Locale = "ms";

export const LOCALE_LABEL: Record<Locale, string> = {
  ms: "BM",
  en: "EN",
  zh: "中文",
};

export const LOCALE_STORAGE_KEY = "bk-locale";

/** Resolve {name} placeholders in a dictionary template. */
export function fmt(template: string, vars?: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars && key in vars ? String(vars[key]) : `{${key}}`
  );
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as string[]).includes(value);
}

// Dictionaries are imported statically — tiny, and avoids async loading states
// for something that must never block rendering.
import { ms } from "./dictionaries/ms";
import { zh } from "./dictionaries/zh";

export const DICTIONARIES: Record<Locale, Dictionary> = { en, ms, zh };
