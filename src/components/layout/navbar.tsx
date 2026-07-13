"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/components/providers/app-providers";
import { MoonIcon, SunIcon, WavesIcon } from "@/components/ui/icons";
import { LOCALES, LOCALE_LABEL } from "@/lib/i18n";

export function Navbar() {
  const pathname = usePathname();
  const { t, locale, setLocale, theme, toggleTheme } = useApp();

  const tabs = [
    { href: "/", label: t.nav.status },
    { href: "/onboard", label: t.nav.onboard },
    { href: "/demo", label: t.nav.demo },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
          <WavesIcon size={20} className="text-sky-500" />
          <span>
            Banjir<span className="text-sky-500">Kawan</span>
          </span>
        </Link>

        <nav aria-label="main" className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-md bg-sky-100 px-3 py-1.5 text-sm font-semibold text-sky-800 dark:bg-sky-500/20 dark:text-sky-300"
                    : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div
            role="group"
            aria-label={t.common.language}
            className="flex overflow-hidden rounded-md border border-slate-300 text-xs dark:border-slate-700"
          >
            {LOCALES.map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                aria-pressed={locale === l}
                className={
                  locale === l
                    ? "bg-sky-600 px-2.5 py-1.5 font-bold text-white"
                    : "bg-transparent px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }
              >
                {LOCALE_LABEL[l]}
              </button>
            ))}
          </div>

          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t.common.lightMode : t.common.darkMode}
            title={theme === "dark" ? t.common.lightMode : t.common.darkMode}
            className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}
