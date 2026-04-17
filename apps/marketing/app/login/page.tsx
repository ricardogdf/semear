import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@semear/ui";

export const metadata: Metadata = {
  title: "Login",
  description: "Acesse o app principal do Semear para entrar no sistema.",
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Card className="overflow-hidden border-primary/10 bg-[radial-gradient(circle_at_top,rgba(244,191,76,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(231,242,235,0.9))]">
        <CardHeader>
          <Badge variant="secondary">Login</Badge>
          <CardTitle className="mt-4 font-[var(--font-heading)] text-4xl font-semibold">
            O acesso ao sistema acontece no app principal.
          </CardTitle>
          <CardDescription className="max-w-2xl">
            O site institucional concentra descoberta e SEO. A experiencia autenticada segue
            separada no app de operacao.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
            className="inline-flex h-12 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-glow transition hover:bg-primary/90"
          >
            Ir para o app
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
