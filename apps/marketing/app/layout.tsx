import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const siteUrl = process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3001";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Semear | Gestao inteligente de estudos",
    template: "%s | Semear",
  },
  description:
    "Plataforma moderna para organizar materias, processar conteudos, acompanhar simulados e estudar com mais constancia.",
  openGraph: {
    title: "Semear",
    description:
      "Gestao inteligente de estudos com dashboard, simulados sequenciais, uploads e ritmo de foco.",
    url: siteUrl,
    siteName: "Semear",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Semear - gestao inteligente de estudos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Semear",
    description:
      "Dashboard, uploads, simulados sequenciais e foco para uma rotina de estudos inteligente.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
