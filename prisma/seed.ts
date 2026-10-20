/**
 * Dados de demonstração NÃO destrutivos.
 * - Cria o usuário comum demo@semear.local (sem senha e sem privilégios) se ele não existir.
 * - Só popula matérias desse usuário se ele ainda não tiver nenhuma (uma delas organizada em módulos).
 * - Nunca apaga dados e nunca cria administradores ou credenciais.
 * Para entrar como esse usuário, um administrador gera o código de primeiro acesso na área
 * administrativa (Usuários → Gerar código).
 */
import { PrismaClient, type Prisma } from "@prisma/client";

import { loadEnvFile } from "../lib/load-env";

import type { Question } from "@/lib/utils";

loadEnvFile();
const prisma = new PrismaClient();
const DEMO_EMAIL = "demo@semear.local";

interface DemoContent {
  title: string;
  originalFileName: string;
  source: "TXT" | "PDF";
  body: string;
  summary: string;
  shortSummary: string;
  importantTopics: string;
  classification: "SUBSTANTIVE" | "INTRODUCTORY";
  classificationReason: string;
  questions: Question[];
  /** Módulo da matéria (opcional; sem ele, a aula fica direto na matéria). */
  module?: string;
}

interface DemoSubject {
  title: string;
  instructor: string;
  workloadHours: number;
  status: "IN_PROGRESS" | "APPROVED" | "FAILED";
  progress: number;
  contents: DemoContent[];
}

const q = (question: string, options: [string, string, string, string], answer: string, sourceExcerpt: string): Question => ({
  question,
  options,
  answer,
  sourceExcerpt,
});

const subjects: DemoSubject[] = [
  {
    title: "Matemática Básica",
    instructor: "Prof. Renata Lima",
    workloadHours: 40,
    status: "IN_PROGRESS",
    progress: 30,
    contents: [
      {
        title: "Multiplicação: conceito e propriedades",
        originalFileName: "multiplicacao.txt",
        source: "TXT",
        module: "Multiplicação",
        body: "A multiplicação é uma adição de parcelas iguais: 3 × 4 significa somar o número 4 três vezes, o que resulta em 12. Os números multiplicados são chamados de fatores e o resultado é chamado de produto. A ordem dos fatores não altera o produto (propriedade comutativa), por isso 3 × 4 e 4 × 3 valem 12. Qualquer número multiplicado por zero resulta em zero.",
        summary: "# Multiplicação\n\n- É uma **adição de parcelas iguais**: 3 × 4 = 4 + 4 + 4 = 12.\n- **Fatores** são os números multiplicados; o resultado é o **produto**.\n- **Propriedade comutativa**: a ordem dos fatores não altera o produto.\n- Qualquer número multiplicado por **zero** resulta em zero.",
        shortSummary: "Multiplicação como soma de parcelas iguais, fatores, produto e propriedade comutativa.",
        importantTopics: "multiplicação, fatores, produto, propriedade comutativa",
        classification: "SUBSTANTIVE",
        classificationReason: "Explica o conceito de multiplicação, seus termos e propriedades.",
        questions: [
          q(
            "Como se chama o resultado de uma multiplicação?",
            ["Produto", "Quociente", "Soma", "Resto"],
            "Produto",
            "o resultado é chamado de produto",
          ),
          q("Quanto é 3 × 4?", ["12", "7", "34", "1"], "12", "3 × 4 significa somar o número 4 três vezes, o que resulta em 12"),
          q(
            "O que diz a propriedade comutativa da multiplicação?",
            [
              "A ordem dos fatores não altera o produto",
              "Todo número multiplicado por zero resulta em um",
              "O produto é sempre um número par",
              "Os fatores precisam ser iguais",
            ],
            "A ordem dos fatores não altera o produto",
            "A ordem dos fatores não altera o produto (propriedade comutativa)",
          ),
        ],
      },
      {
        title: "Divisão exata e com resto",
        originalFileName: "divisao.txt",
        source: "TXT",
        module: "Divisão",
        body: "A divisão reparte uma quantidade em partes iguais. Em 12 ÷ 4 = 3, o 12 é o dividendo, o 4 é o divisor e o 3 é o quociente. Quando sobra uma parte que não pode ser repartida, ela é chamada de resto: em 13 ÷ 4, o quociente é 3 e o resto é 1. Não existe divisão por zero.",
        summary: "# Divisão\n\n- Reparte uma quantidade em **partes iguais**.\n- Em 12 ÷ 4 = 3: **dividendo** 12, **divisor** 4, **quociente** 3.\n- O que sobra é o **resto**: 13 ÷ 4 tem quociente 3 e resto 1.\n- **Não existe divisão por zero.**",
        shortSummary: "Termos da divisão (dividendo, divisor e quociente), resto e divisão por zero.",
        importantTopics: "divisão, dividendo, divisor, quociente, resto",
        classification: "SUBSTANTIVE",
        classificationReason: "Explica os termos da divisão, o resto e a divisão por zero.",
        questions: [
          q(
            "Em 12 ÷ 4 = 3, qual número é o quociente?",
            ["3", "12", "4", "1"],
            "3",
            "o 12 é o dividendo, o 4 é o divisor e o 3 é o quociente",
          ),
          q("Qual é o resto da divisão de 13 por 4?", ["1", "3", "0", "4"], "1", "em 13 ÷ 4, o quociente é 3 e o resto é 1"),
          q(
            "O que acontece na divisão por zero?",
            ["Ela não existe", "O resultado é zero", "O resultado é um", "O resultado é o próprio número"],
            "Ela não existe",
            "Não existe divisão por zero",
          ),
        ],
      },
    ],
  },
  {
    title: "Didática Contemporânea",
    instructor: "Prof. Helena Farias",
    workloadHours: 60,
    status: "IN_PROGRESS",
    progress: 40,
    contents: [
      {
        title: "Apresentação da disciplina",
        originalFileName: "apresentacao.txt",
        source: "TXT",
        body: "Bem-vindos à disciplina de Didática Contemporânea. Ao longo do semestre veremos metodologias ativas, avaliação formativa e planejamento de aulas. As aulas acontecem às terças-feiras e a avaliação será composta por dois trabalhos e uma prova final. A bibliografia básica está disponível no ambiente virtual.",
        summary: "# Apresentação da disciplina\n\n- Temas do semestre: metodologias ativas, avaliação formativa e planejamento.\n- Aulas às terças-feiras.\n- Avaliação: dois trabalhos e uma prova final.",
        shortSummary: "Apresentação da disciplina, temas do semestre e critérios de avaliação.",
        importantTopics: "metodologias ativas, avaliação formativa, planejamento",
        classification: "INTRODUCTORY",
        classificationReason: "A aula apresenta o curso, o cronograma e a avaliação, sem explicar conteúdo da disciplina.",
        questions: [],
      },
      {
        title: "Sala de aula invertida",
        originalFileName: "aula-invertida.txt",
        source: "TXT",
        body: "Na sala de aula invertida, o estudante tem o primeiro contato com o conteúdo teórico antes do encontro presencial, por meio de vídeos, leituras ou podcasts. O tempo em sala passa a ser usado para resolver problemas, discutir casos e receber feedback do professor. O feedback formativo acontece durante o processo de aprendizagem e serve para orientar o estudante enquanto ainda há tempo de corrigir rotas. Estudos de caso fortalecem a aprendizagem ativa porque exigem que o estudante aplique conceitos a situações reais.",
        summary: "# Sala de aula invertida\n\n## Ideia central\nO contato inicial com a teoria acontece **antes** do encontro; a aula é usada para prática e discussão.\n\n## Feedback formativo\nOcorre **durante o processo** e orienta o estudante enquanto ainda há tempo de ajustar.\n\n## Estudos de caso\nFortalecem a aprendizagem ativa ao exigir aplicação de conceitos a situações reais.",
        shortSummary: "A teoria é estudada antes do encontro e a aula é usada para prática, casos e feedback formativo.",
        importantTopics: "sala de aula invertida, feedback formativo, estudo de caso, aprendizagem ativa",
        classification: "SUBSTANTIVE",
        classificationReason: "Explica o modelo de sala de aula invertida, o papel do feedback formativo e dos estudos de caso.",
        questions: [
          q(
            "Na sala de aula invertida, quando ocorre o primeiro contato com o conteúdo teórico?",
            ["Antes do encontro presencial", "Somente na prova final", "Apenas ao fim do semestre", "Durante o intervalo"],
            "Antes do encontro presencial",
            "o estudante tem o primeiro contato com o conteúdo teórico antes do encontro presencial",
          ),
          q(
            "Quando o feedback formativo deve acontecer?",
            ["Durante o processo de aprendizagem", "Somente após a prova", "Apenas por e-mail", "Nunca durante a aula"],
            "Durante o processo de aprendizagem",
            "O feedback formativo acontece durante o processo de aprendizagem",
          ),
          q(
            "Por que estudos de caso fortalecem a aprendizagem ativa?",
            [
              "Exigem aplicar conceitos a situações reais",
              "Dispensam a leitura prévia",
              "Substituem o professor",
              "Reduzem a participação do estudante",
            ],
            "Exigem aplicar conceitos a situações reais",
            "exigem que o estudante aplique conceitos a situações reais",
          ),
        ],
      },
    ],
  },
  {
    title: "Psicologia da Aprendizagem",
    instructor: "Prof. Daniel Couto",
    workloadHours: 48,
    status: "IN_PROGRESS",
    progress: 25,
    contents: [
      {
        title: "Motivação e autonomia",
        originalFileName: "motivacao.txt",
        source: "TXT",
        body: "A motivação intrínseca cresce quando o estudante percebe autonomia, competência e pertencimento. A zona de desenvolvimento proximal, proposta por Vygotsky, é a distância entre o que o estudante faz sozinho e o que consegue fazer com ajuda. A autorregulação envolve planejar, monitorar e revisar a própria aprendizagem.",
        summary: "# Motivação e autonomia\n\n- **Motivação intrínseca**: cresce com autonomia, competência e pertencimento.\n- **Zona de desenvolvimento proximal** (Vygotsky): distância entre o que se faz sozinho e com ajuda.\n- **Autorregulação**: planejar, monitorar e revisar.",
        shortSummary: "Motivação intrínseca, zona de desenvolvimento proximal e autorregulação.",
        importantTopics: "motivação intrínseca, zona de desenvolvimento proximal, Vygotsky, autorregulação",
        classification: "SUBSTANTIVE",
        classificationReason: "Explica conceitos de motivação, zona de desenvolvimento proximal e autorregulação.",
        questions: [
          q(
            "Quem propôs a zona de desenvolvimento proximal?",
            ["Vygotsky", "Piaget", "Skinner", "Freire"],
            "Vygotsky",
            "A zona de desenvolvimento proximal, proposta por Vygotsky",
          ),
          q(
            "O que a autorregulação envolve?",
            ["Planejar, monitorar e revisar", "Somente memorizar", "Evitar metas", "Copiar respostas"],
            "Planejar, monitorar e revisar",
            "A autorregulação envolve planejar, monitorar e revisar a própria aprendizagem",
          ),
        ],
      },
    ],
  },
];

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  const user =
    existing ??
    (await prisma.user.create({ data: { email: DEMO_EMAIL, name: "Usuário de demonstração", role: "USER" } }));

  if ((await prisma.subject.count({ where: { userId: user.id } })) > 0) {
    console.log(`O usuário ${DEMO_EMAIL} já tem matérias; nada foi alterado.`);
    return;
  }

  for (const subject of subjects) {
    const created = await prisma.subject.create({
      data: {
        title: subject.title,
        instructor: subject.instructor,
        workloadHours: subject.workloadHours,
        status: subject.status,
        progress: subject.progress,
        difficulty: 50,
        userId: user.id,
      },
    });

    const moduleIds = new Map<string, string>();
    for (const title of new Set(subject.contents.flatMap((content) => (content.module ? [content.module] : [])))) {
      const createdModule = await prisma.subjectModule.create({ data: { title, subjectId: created.id } });
      moduleIds.set(title, createdModule.id);
    }

    await prisma.content.createMany({
      data: subject.contents.map((content) => ({
        title: content.title,
        originalFileName: content.originalFileName,
        source: content.source,
        body: content.body,
        summary: content.summary,
        shortSummary: content.shortSummary,
        importantTopics: content.importantTopics,
        trainingQuestions: content.questions as unknown as Prisma.InputJsonValue,
        processingStatus: content.classification === "SUBSTANTIVE" ? "COMPLETED" : "NO_QUESTIONS_NEEDED",
        classification: content.classification,
        classificationReason: content.classificationReason,
        processedAt: new Date(),
        subjectId: created.id,
        moduleId: content.module ? moduleIds.get(content.module) : null,
      })),
    });
  }

  console.log(`Dados de demonstração criados para ${DEMO_EMAIL} (conta sem senha, papel USER).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
