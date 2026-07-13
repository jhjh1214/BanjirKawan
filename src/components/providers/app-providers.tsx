"use client";

// App-wide client state: locale + theme. Both persist in localStorage and
// default safely for SSR (locale: ms, theme: resolved pre-paint by the inline
// script in layout.tsx so there is no flash of the wrong theme).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  DICTIONARIES,
  LOCALE_STORAGE_KEY,
  isLocale,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";

export const THEME_STORAGE_KEY = "bk-theme";
type Theme = "light" | "dark";

interface AppContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
  theme: Theme;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  // SSR renders defaults; stored preferences are applied after mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(storedLocale)) setLocaleState(storedLocale);
    // The inline head script already applied the class; sync React state to it.
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh" : locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({ locale, setLocale, t: DICTIONARIES[locale], theme, toggleTheme }),
    [locale, setLocale, theme, toggleTheme]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProviders>");
  return ctx;
}

/** Runs before paint (inline in <head>) so the theme never flashes. */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){document.documentElement.classList.add("dark");}})();`;
