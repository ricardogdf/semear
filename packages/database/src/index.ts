import {
  Prisma,
  SubjectStatus,
  type Content,
  type Simulation,
  type SimulationResult,
  type Subject,
} from "@prisma/client";

import {
  aiService,
  calculateAverageScore,
  calculateFinalScore,
  calculateImprovement,
  type DashboardOverview,
  type Question,
  type SimulationResultSnapshot,
  type SimulationSubjectSnapshot,
  type SubjectStatusValue,
  type UploadedContentSnapshot,
} from "@semear/utils";

import { prisma } from "./client";

interface SubmissionAnswer {
  question: string;
  answer: string;
}

function toQuestionArray(value: Prisma.JsonValue): Question[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (
      entry &&
      typeof entry === "object" &&
      "question" in entry &&
      "options" in entry &&
      "answer" in entry &&
      typeof entry.question === "string" &&
      Array.isArray(entry.options) &&
      entry.options.every((option) => typeof option === "string") &&
      typeof entry.answer === "string"
    ) {
      return [
        {
          question: entry.question,
          options: entry.options,
          answer: entry.answer,
        },
      ];
    }

    return [];
  });
}

function toStringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function mapSimulationResult(result: SimulationResult): SimulationResultSnapshot {
  return {
    id: result.id,
    simulationId: result.simulationId,
    score: Number(result.score),
    submittedAt: result.submittedAt.toISOString(),
    correctAnswers: result.correctAnswers,
    totalQuestions: result.totalQuestions,
  };
}

function mapContentSnapshot(
  content: Content & { subject: Pick<Subject, "title"> },
): UploadedContentSnapshot {
  return {
    id: content.id,
    title: content.title,
    subjectTitle: content.subject.title,
    source: content.source,
    createdAt: content.createdAt.toISOString(),
    summary: content.summary,
    shortSummary: content.shortSummary,
    importantTopics: content.importantTopics,
    trainingQuestions: toQuestionArray(content.trainingQuestions),
    body: content.body,
  };
}

function getLatestSimulationResults(
  simulations: Array<Simulation & { results: SimulationResult[] }>,
) {
  return simulations
    .map((simulation) => simulation.results[0])
    .filter((result): result is SimulationResult => Boolean(result));
}

async function getPrimaryUserId() {
  const user = await prisma.user.findFirst({
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!user) {
    throw new Error("Nenhum usuario encontrado. Execute o seed do Prisma primeiro.");
  }

  return user.id;
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const [subjects, recentContents, results] = await Promise.all([
    prisma.subject.findMany({
      include: {
        simulations: {
          include: {
            results: {
              orderBy: {
                submittedAt: "desc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        results: {
          orderBy: {
            submittedAt: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.content.findMany({
      include: {
        subject: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
    }),
    prisma.simulationResult.findMany({
      include: {
        subject: true,
        simulation: true,
      },
      orderBy: {
        submittedAt: "asc",
      },
    }),
  ]);

  const subjectSnapshots = subjects.map((subject) => {
    const latestResults = getLatestSimulationResults(subject.simulations);

    return {
      subjectId: subject.id,
      title: subject.title,
      status: subject.status as SubjectStatusValue,
      progress: subject.progress,
      finalScore: calculateFinalScore(
        latestResults.map((result) => ({ score: Number(result.score) })),
      ),
      averageScore: calculateAverageScore(
        subject.results.map((result) => ({ score: Number(result.score) })),
      ),
      difficulty: subject.difficulty,
    };
  });

  const latestResult = results.at(-1);
  const previousResult = results.at(-2);
  const hardestSubject = [...subjectSnapshots].sort(
    (left, right) => right.difficulty - left.difficulty,
  )[0];

  return {
    metrics: {
      totalSubjects: subjects.length,
      approvedSubjects: subjects.filter((subject) => subject.status === SubjectStatus.APPROVED)
        .length,
      failedSubjects: subjects.filter((subject) => subject.status === SubjectStatus.FAILED).length,
      inProgressSubjects: subjects.filter(
        (subject) => subject.status === SubjectStatus.IN_PROGRESS,
      ).length,
    },
    evolution: results.slice(-6).map((result) => ({
      label: `${result.subject.title.split(" ")[0]}`,
      score: Number(result.score),
    })),
    insights: [
      {
        id: "evolution",
        title: "Evolucao recente",
        description: latestResult
          ? `Voce melhorou ${calculateImprovement(
              previousResult ? Number(previousResult.score) : 0,
              Number(latestResult.score),
            )}% no ultimo simulado.`
          : "Sem historico suficiente para calcular evolucao.",
      },
      {
        id: "difficulty",
        title: "Maior dificuldade",
        description: hardestSubject
          ? `Materia com maior dificuldade: ${hardestSubject.title}.`
          : "Sem dados suficientes para gerar insight de dificuldade.",
      },
    ],
    subjects: subjectSnapshots,
    recentContents: recentContents.map(mapContentSnapshot),
  };
}

export async function getSubjectsOverview(status?: SubjectStatusValue) {
  const subjects = await prisma.subject.findMany({
    where: status
      ? {
          status,
        }
      : undefined,
    include: {
      simulations: {
        include: {
          results: {
            orderBy: {
              submittedAt: "desc",
            },
          },
        },
      },
      results: {
        orderBy: {
          submittedAt: "desc",
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  return subjects.map((subject) => {
    const latestResults = getLatestSimulationResults(subject.simulations);

    return {
      subjectId: subject.id,
      title: subject.title,
      status: subject.status as SubjectStatusValue,
      progress: subject.progress,
      finalScore: calculateFinalScore(
        latestResults.map((result) => ({ score: Number(result.score) })),
      ),
      averageScore: calculateAverageScore(
        subject.results.map((result) => ({ score: Number(result.score) })),
      ),
      difficulty: subject.difficulty,
    };
  });
}

export async function getSimulationSubjects(
  subjectId?: string,
): Promise<SimulationSubjectSnapshot[]> {
  const subjects = await prisma.subject.findMany({
    where: subjectId
      ? {
          id: subjectId,
        }
      : undefined,
    include: {
      contents: {
        orderBy: {
          createdAt: "desc"
        },
        include: {
          subject: { select: { title: true } }
        }
      },
      simulations: {
        include: {
          results: {
            orderBy: {
              submittedAt: "desc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      results: {
        orderBy: {
          submittedAt: "desc",
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  return subjects.map((subject) => {
    const latestResults = getLatestSimulationResults(subject.simulations);

    return {
      id: subject.id,
      title: subject.title,
      status: subject.status as SubjectStatusValue,
      finalScore: calculateFinalScore(
        latestResults.map((result) => ({ score: Number(result.score) })),
      ),
      simulations: subject.simulations.map((simulation) => ({
        id: simulation.id,
        title: simulation.title,
        timeLimitMinutes: simulation.timeLimitMinutes,
        maxScore: Number(simulation.maxScore),
        questions: toQuestionArray(simulation.questions),
        latestResult: simulation.results[0]
          ? mapSimulationResult(simulation.results[0])
          : undefined,
      })),
      history: subject.results.map(mapSimulationResult),
      contents: subject.contents ? subject.contents.map(mapContentSnapshot) : [],
    };
  });
}

export async function getRecentContents() {
  const contents = await prisma.content.findMany({
    include: {
      subject: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 6,
  });

  return contents.map(mapContentSnapshot);
}

export async function getSubjectOptions() {
  return prisma.subject.findMany({
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      title: "asc",
    },
  });
}

export async function createUploadedContent(input: {
  subjectId: string;
  body: string;
  originalFileName: string;
  source: "TXT" | "PDF";
}) {
  // Try to find by ID first, then by title (for datalist selections)
  let subject = await prisma.subject.findUnique({
    where: {
      id: input.subjectId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!subject) {
    subject = await prisma.subject.findFirst({
      where: {
        title: input.subjectId,
      },
      select: {
        id: true,
        title: true,
      },
    });
  }

  if (!subject) {
    const userId = await getPrimaryUserId();
    subject = await prisma.subject.create({
      data: {
        title: input.subjectId,
        instructor: "Não definido",
        workloadHours: 0,
        status: SubjectStatus.IN_PROGRESS,
        progress: 0,
        difficulty: 50,
        userId,
      },
    });
  }

  const [summary, shortSummary, mindMap, questions] = await Promise.all([
    aiService.summarize(input.body),
    aiService.generateShortSummary(input.body),
    aiService.extractKeywords(input.body).then(k => k.join(", ")),
    aiService.generateQuestions(input.body),
  ]);

  const content = await prisma.content.create({
    data: {
      title: input.originalFileName.replace(/\.[^.]+$/, "") || `Conteudo ${subject.title}`,
      originalFileName: input.originalFileName,
      source: input.source,
      body: input.body,
      shortSummary,
      summary,
      importantTopics: mindMap, // we repurposed aiService output
      trainingQuestions: questions as unknown as Prisma.InputJsonValue,
      subjectId: subject.id,
    },
    include: {
      subject: {
        select: {
          title: true,
        },
      },
    },
  });

  await prisma.subject.update({
    where: { id: subject.id },
    data: { updatedAt: new Date() },
  });

  return mapContentSnapshot(content);
}

export async function submitSimulationResult(input: {
  simulationId: string;
  subjectId: string;
  answers: SubmissionAnswer[];
}) {
  const [simulation, userId] = await Promise.all([
    prisma.simulation.findUnique({
      where: {
        id: input.simulationId,
      },
    }),
    getPrimaryUserId(),
  ]);

  if (!simulation) {
    throw new Error("Simulado nao encontrado.");
  }

  const questions = toQuestionArray(simulation.questions);

  if (questions.length === 0) {
    throw new Error("Simulado sem questoes.");
  }

  const correctAnswers = questions.filter(
    (question) =>
      input.answers.find((answer) => answer.question === question.question)?.answer ===
      question.answer,
  ).length;

  const score = Number(
    ((correctAnswers / questions.length) * Number(simulation.maxScore)).toFixed(1),
  );

  const result = await prisma.simulationResult.create({
    data: {
      score,
      correctAnswers,
      totalQuestions: questions.length,
      answers: input.answers as any,
      userId,
      subjectId: input.subjectId,
      simulationId: input.simulationId,
    },
  });

  return mapSimulationResult(result);
}

export async function generateDynamicSimulation(subjectId: string) {
  const contents = await prisma.content.findMany({
    where: { subjectId },
    select: { trainingQuestions: true, title: true }
  });

  if (!contents || contents.length === 0) {
    throw new Error("Nenhum conteudo enviado para esta materia. Envie pelo menos 1 aula para gerar o simulado.");
  }

  // Juntar todas as perguntas
  let allQuestions: Question[] = [];
  for (const content of contents) {
    const qArray = toQuestionArray(content.trainingQuestions);
    allQuestions = allQuestions.concat(qArray);
  }

  if (allQuestions.length === 0) {
    throw new Error("As aulas desta materia nao tem perguntas associadas.");
  }

  // Shuffle Fisher-Yates
  for (let i = allQuestions.length - 1; i > 0; i--) {
     const j = Math.floor(Math.random() * (i + 1));
     const temp = allQuestions[i];
     allQuestions[i] = allQuestions[j] as Question;
     allQuestions[j] = temp as Question;
  }

  // Sortear ate 30 questoes
  const selectedQuestions = allQuestions.slice(0, 30);

  // Criar o Simulador On-Demand
  const simulation = await prisma.simulation.create({
    data: {
      title: `Simulado Dinâmico (${selectedQuestions.length}Q)`,
      timeLimitMinutes: selectedQuestions.length * 2, // 2 mins por questao
      questions: selectedQuestions as unknown as Prisma.InputJsonValue,
      maxScore: 10,
      subjectId,
    }
  });

  return {
    id: simulation.id,
    title: simulation.title,
    timeLimitMinutes: simulation.timeLimitMinutes,
    maxScore: Number(simulation.maxScore),
    questions: toQuestionArray(simulation.questions),
  } as import("@semear/utils").SimulationSnapshot;
}

export { prisma };
