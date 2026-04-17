import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { AppProvider } from "@/components/providers/app-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Semear | Gestao inteligente de estudos",
  description:
    "Sistema fullstack para organizar materias, acompanhar simulados, processar conteudos e manter o ritmo de estudo com foco total.",
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
      </body>
    </html>
  );
}
