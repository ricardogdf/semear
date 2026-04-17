import Link from "next/link";
import { ArrowRight, BrainCircuit, ChartNoAxesCombined, Clock3, ShieldCheck } from "lucide-react";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@semear/ui";

const highlights = [
  {
    title: "Uploads preparados para IA",
    description: "Envie PDFs e textos, centralize conteudos e abra caminho para resumos e mapas mentais.",
    icon: BrainCircuit,
  },
  {
    title: "Simulados sequenciais",
    description: "Duas etapas por materia, cada uma com 5 pontos, para uma leitura clara da evolucao.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Pomodoro persistente",
    description: "Ciclos 25/5 com estado salvo localmente para manter foco mesmo entre sessoes.",
    icon: Clock3,
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Badge variant="secondary">SEO-first • SaaS-ready</Badge>
          <h1 className="mt-6 max-w-3xl font-[var(--font-heading)] text-5xl font-semibold tracking-tight sm:text-6xl">
            Clareza para estudar melhor, com uma operacao pronta para crescer.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            O Semear organiza materias, processa conteudos, acompanha simulados e cria um
            painel vivo de evolucao para estudantes e equipes academicas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
              className="inline-flex h-12 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-glow transition hover:bg-primary/90"
            >
              Entrar no sistema
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex h-12 items-center rounded-full border border-border bg-card px-6 text-sm font-medium transition hover:bg-secondary"
            >
              Ver funcionalidades
            </Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {["Monorepo com Turborepo", "Next.js App Router", "Prisma + PostgreSQL"].map(
              (item) => (
                <div key={item} className="rounded-[24px] border border-border/60 bg-card/80 p-4 text-sm">
                  {item}
                </div>
              ),
            )}
          </div>
        </div>

        <Card className="overflow-hidden border-primary/10 bg-[radial-gradient(circle_at_top,rgba(244,191,76,0.22),transparent_35%),linear-gradient(180deg,rgba(13,52,41,1),rgba(8,19,15,1))] text-white shadow-glow">
          <CardContent className="grid gap-4 py-8">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">Dashboard</p>
              <p className="mt-4 font-[var(--font-heading)] text-4xl font-semibold">+32%</p>
              <p className="mt-2 text-sm text-white/70">Melhora recente no ultimo ciclo de simulados.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-white/60">Uploads ativos</p>
                <p className="mt-3 text-3xl font-semibold">128</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-white/60">Materias acompanhadas</p>
                <p className="mt-3 text-3xl font-semibold">24</p>
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-accent" />
                <p className="text-sm font-medium">Arquitetura pronta para producao</p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Deploy por app, design system compartilhado, Prisma preparado para IA e base
                forte para autenticacao futura.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-16 grid gap-4 lg:grid-cols-3">
        {highlights.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <item.icon className="h-5 w-5 text-primary" />
              <CardTitle className="mt-6">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
