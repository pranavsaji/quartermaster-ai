import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

/**
 * Every page carries a per-request CSP nonce (proxy.ts), which Next.js can only
 * attach to its scripts at request time, so nothing is prerendered.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Quartermaster",
    template: "%s · Quartermaster",
  },
  description: "Autonomous procurement for small restaurants, secured by TrustRail.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
