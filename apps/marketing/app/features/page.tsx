import type { Metadata } from "next";
import { BrainCircuit, Clock3, LayoutDashboard, Layers3, Rocket } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@semear/ui";

export const metadata: Metadata = {
  title: "Funcionalidades",
  description:
    "Conheca os modulos do Semear para uploads, dashboard, simulados sequenciais, materias e ritmo de foco.",
};

const features = [
  {
    title: "Dashboard operacional",
    description: "Metricas de materias, status, insights mockados e evolucao de notas em um unico painel.",
    icon: LayoutDashboard,
  },
  {
    title: "Conteudo AI-ready",
    description: "Uploads de TXT e PDF com persistencia no banco e estrutura pronta para IA real.",
    icon: BrainCircuit,
  },
  {
    title: "Simulados em duas etapas",
    description: "Cada materia possui dois simulados sequenciais, com nota final clara de 0 a 10.",
    icon: Layers3,
  },
  {
    title: "Pomodoro persistente",
    description: "Cronometro funcional com 25/5, pausa, reset e armazenamento local.",
    icon: Clock3,
  },
  {
    title: "Arquitetura escalavel",
    description: "Monorepo com apps dedicados, design system compartilhado e deploy por superficie.",
    icon: Rocket,
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Funcionalidades</p>
        <h1 className="mt-4 font-[var(--font-heading)] text-5xl font-semibold tracking-tight">
          Uma stack pensada para estudar com menos atrito e mais leitura de resultado.
        </h1>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <feature.icon className="h-5 w-5 text-primary" />
              <CardTitle className="mt-6">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
