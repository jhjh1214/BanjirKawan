import { describe, expect, it } from "vitest";
import { DICTIONARIES, LOCALES, fmt } from "@/lib/i18n";

function deepKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? deepKeys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  );
}

describe("i18n dictionaries", () => {
  const enKeys = deepKeys(DICTIONARIES.en).sort();

  it.each(LOCALES)("locale %s has exactly the same keys as en", (locale) => {
    expect(deepKeys(DICTIONARIES[locale]).sort()).toEqual(enKeys);
  });

  it.each(LOCALES)("locale %s has no empty strings", (locale) => {
    const empty = deepKeys(DICTIONARIES[locale]).filter((key) => {
      const value = key.split(".").reduce<unknown>(
        (o, k) => (o as Record<string, unknown>)[k],
        DICTIONARIES[locale]
      );
      return value === "";
    });
    expect(empty).toEqual([]);
  });

  it("placeholders match across locales (templates stay substitutable)", () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    for (const key of enKeys) {
      const get = (locale: (typeof LOCALES)[number]) =>
        key.split(".").reduce<unknown>(
          (o, k) => (o as Record<string, unknown>)[k],
          DICTIONARIES[locale]
        ) as string;
      const expected = placeholders(get("en"));
      for (const locale of LOCALES) {
        expect(placeholders(get(locale)), `${locale}:${key}`).toBe(expected);
      }
    }
  });
});

describe("fmt", () => {
  it("substitutes placeholders", () => {
    expect(fmt("{count} assets in {type}", { count: 3, type: "kedai" })).toBe("3 assets in kedai");
  });
  it("leaves unknown placeholders visible for debugging", () => {
    expect(fmt("{missing}", {})).toBe("{missing}");
  });
});
