import type { Metadata } from "next";
import "./globals.css";
import { AppProviders, THEME_INIT_SCRIPT } from "@/components/providers/app-providers";
import { Navbar } from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: "BanjirKawan",
  description:
    "Setiap amaran banjir menjadi pelan tindakan kedai anda — flood warnings turned into shop-specific survival plans.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline theme script mutates <html> class
    // before React hydrates, deliberately.
    <html lang="ms" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased transition-colors dark:bg-slate-950 dark:text-slate-100">
        <AppProviders>
          <Navbar />
          <main>{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
