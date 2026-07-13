import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BanjirKawan",
  description:
    "Setiap amaran banjir menjadi pelan tindakan kedai anda — flood warnings turned into shop-specific survival plans.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
