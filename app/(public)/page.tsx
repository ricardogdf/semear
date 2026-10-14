import Link from "next/link";
import {
  BookOpenCheck,
  BrainCircuit,
  ClipboardCheck,
  FileUp,
  KeyRound,
  ListChecks,
  ScanSearch,
  ShieldCheck,
  Timer,
} from "lucide-react";

import { AccessRequestForm } from "@/components/public/access-request-form";
import { PublicFooter, PublicHeader } from "@/components/public/public-header";
import { getCurrentUser } from "@/server/http/current-user";

export const dynamic = "force-dynamic";

const steps = [
  {
    icon: FileUp,
    title: "Envie a aula",
    description: "Arquivos PDF ou TXT, organizados por matéria.",
  },
  {
    icon: ScanSearch,
    title: "A IA analisa o conteúdo",
    description:
      "Antes de gerar questões, o sistema identifica se a aula tem conteúdo didático ou se é introdutória, administrativa ou insuficiente.",
  },
  {
    icon: BookOpenCheck,
    title: "Estude o material",
    description: "Resumo estruturado, palavras-chave e questões de prática baseadas no próprio texto da aula.",
  },
  {
    icon: ClipboardCheck,
    title: "Teste com simulados",
    description: "Simulados cronometrados montados a partir das suas aulas, com correção e histórico de notas.",
  },
];

const features = [
  {
    icon: ListChecks,
    title: "Questões com fundamento",
    description:
      "Cada questão gerada precisa citar um trecho da aula. Questões sem respaldo no texto são descartadas — nada de perguntas inventadas.",
  },
  {
    icon: ScanSearch,
    title: "Classificação das aulas",
    description:
      "Apresentações de curso, cronogramas e avisos não viram questões. Aulas mistas usam apenas a parte didática.",
  },
  {
    icon: KeyRound,
    title: "Seu provedor de IA",
    description:
      "Conecte sua própria chave da API da Anthropic (Claude), OpenAI (ChatGPT) ou Google (Gemini) e escolha o modelo de cada processamento.",
  },
  {
    icon: ShieldCheck,
    title: "Privado por padrão",
    description:
      "Acesso apenas para usuários autorizados. Suas aulas, notas e chaves ficam isoladas da conta de outras pessoas, e as chaves são guardadas criptografadas.",
  },
  {
    icon: BrainCircuit,
    title: "Painel de evolução",
    description: "Notas na escala de 0 a 10, evolução recente e indicação da matéria que pede mais atenção.",
  },
  {
    icon: Timer,
    title: "Pomodoro integrado",
    description: "Ciclos de foco e pausa configuráveis, disponíveis em todas as telas do sistema.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PublicHeader authenticated={Boolean(user)} />

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
              Gratuito · acesso somente para usuários autorizados
            </p>
            <h1 className="mt-5 font-[var(--font-heading)] text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Transforme suas aulas em material de estudo e simulados.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              O Semear lê o conteúdo das suas aulas, separa o que é matéria do que é apresentação ou aviso e gera
              resumos e questões apoiados no próprio texto, para você revisar e treinar com objetividade.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#solicitar-acesso"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Solicitar acesso
              </a>
              <Link
                href={user ? "/dashboard" : "/login"}
                className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-medium transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {user ? "Ir para o sistema" : "Já tenho acesso"}
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Exemplo de análise</p>
            <ul className="mt-5 grid gap-3 text-sm">
              <li className="rounded-2xl border border-success/30 bg-success/10 p-4">
                <p className="font-semibold">Aula 3 — Fotossíntese</p>
                <p className="mt-1 text-muted-foreground">Conteúdo didático identificado · 8 questões geradas</p>
              </li>
              <li className="rounded-2xl border border-border bg-secondary/40 p-4">
                <p className="font-semibold">Aula 1 — Apresentação da disciplina</p>
                <p className="mt-1 text-muted-foreground">Aula introdutória: geração de questões não necessária</p>
              </li>
              <li className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
                <p className="font-semibold">Slides digitalizados</p>
                <p className="mt-1 text-muted-foreground">Conteúdo insuficiente: revisão recomendada</p>
              </li>
            </ul>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-20 border-t border-border/60 bg-secondary/20">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
            <h2 className="font-[var(--font-heading)] text-3xl font-semibold tracking-tight">Como funciona</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-3xl border border-border/60 bg-card p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <step.icon className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="funcionalidades" className="scroll-mt-20 border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
            <h2 className="font-[var(--font-heading)] text-3xl font-semibold tracking-tight">Funcionalidades</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-3xl border border-border/60 bg-card p-6">
                  <feature.icon className="h-6 w-6 text-primary" aria-hidden />
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Sobre a IA: o processamento usa a <strong>API</strong> do provedor escolhido, com a chave da sua conta de
              API e a cobrança dela. Assinaturas dos aplicativos de chat (como Claude Pro, ChatGPT Plus ou Gemini) não
              incluem, necessariamente, créditos ou acesso à API.
            </p>
          </div>
        </section>

        <section id="solicitar-acesso" className="scroll-mt-20 border-t border-border/60 bg-secondary/20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="font-[var(--font-heading)] text-3xl font-semibold tracking-tight">Solicitar acesso</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                O Semear é gratuito e fechado. Envie seu pedido: um administrador analisa cada solicitação e, se
                aprovada, cria sua conta e envia um código de primeiro acesso para você definir sua senha.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Já recebeu um código?{" "}
                <Link href="/first-access" className="font-medium text-primary underline-offset-4 hover:underline">
                  Fazer o primeiro acesso
                </Link>
              </p>
            </div>
            <div className="rounded-[2rem] border border-border/60 bg-card p-5 sm:p-8">
              <AccessRequestForm />
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
