/**
 * Dados de demonstração NÃO destrutivos.
 * - Cria o usuário comum demo@semear.local (sem senha e sem privilégios) se ele não existir.
 * - Só popula matérias desse usuário se ele ainda não tiver nenhuma.
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
    await prisma.subject.create({
      data: {
        title: subject.title,
        instructor: subject.instructor,
        workloadHours: subject.workloadHours,
        status: subject.status,
        progress: subject.progress,
        difficulty: 50,
        userId: user.id,
        contents: {
          create: subject.contents.map((content) => ({
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
          })),
        },
      },
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
