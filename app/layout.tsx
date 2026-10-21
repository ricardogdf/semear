import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { AppProvider } from "@/components/providers/app-provider";

import "./globals.css";

/** Base dos links absolutos nos metadados de compartilhamento (Open Graph). */
function siteUrl() {
  if (process.env.APP_URL) return new URL(process.env.APP_URL);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: "Semear | Estudos com IA",
  description:
    "Plataforma gratuita e de acesso restrito que transforma aulas em resumos, questões fundamentadas e simulados.",
  robots: { index: true, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
        <AppProvider>{children}</AppProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
