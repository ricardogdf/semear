import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@semear/ui";

export const metadata: Metadata = {
  title: "Precos",
  description: "Planos mockados do Semear para times e estudantes em fase de implementacao.",
};

const plans = [
  {
    name: "Starter",
    price: "R$ 0",
    description: "Para validar a rotina de estudos com dashboard, uploads e pomodoro.",
    items: ["1 ambiente", "Materias e simulados mockados", "Dashboard principal"],
  },
  {
    name: "Growth",
    price: "R$ 79",
    description: "Para operacoes academicas pequenas com base pronta para autenticacao.",
    items: ["Equipe pequena", "Historico consolidado", "Deploy dedicado por app"],
  },
  {
    name: "Scale",
    price: "Sob consulta",
    description: "Para instituicoes que precisam integrar IA, auth e analytics avancado.",
    items: ["Roadmap de IA", "Observabilidade", "Arquitetura multiambiente"],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <Badge variant="secondary">Mock pricing</Badge>
        <h1 className="mt-4 font-[var(--font-heading)] text-5xl font-semibold tracking-tight">
          Estrutura comercial pronta para quando o produto sair da fase seed.
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Os valores abaixo sao ilustrativos e servem para preparar a experiencia institucional.
        </p>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.name === "Growth" ? "border-primary/30 shadow-glow" : ""}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-[var(--font-heading)] text-4xl font-semibold">{plan.price}</p>
              <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-6 grid gap-3">
                {plan.items.map((item) => (
                  <div key={item} className="rounded-[20px] bg-secondary/40 px-4 py-3 text-sm">
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10">
        <Link
          href={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
          className="text-sm font-medium text-primary hover:underline"
        >
          Acessar o app principal
        </Link>
      </div>
    </div>
  );
}
