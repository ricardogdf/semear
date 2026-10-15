import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { AppProvider } from "@/components/providers/app-provider";

import "./globals.css";

export const metadata: Metadata = {
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
      </body>
    </html>
  );
}
