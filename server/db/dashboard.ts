import {
  calculateImprovement,
  findWeakestModule,
  normalizeScore,
  type DashboardInsight,
  type DashboardOverview,
} from "@/lib/utils";

import { prisma } from "./client";
import { contentSummarySelect, mapContentSummaryRow } from "./mappers";
import { buildModuleSnapshots } from "./modules";
import { getSubjectsOverview } from "./subjects";

/** Módulo com menor desempenho da matéria (só quando há módulos avaliados para comparar). */
async function findWeakestModuleOf(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
    select: {
      modules: { select: { id: true, title: true } },
      contents: { select: { id: true, moduleId: true, processingStatus: true, trainingQuestions: true } },
      results: { where: { userId }, select: { contentStats: true } },
    },
  });
  return subject ? findWeakestModule(buildModuleSnapshots(subject.modules, subject.contents, subject.results)) : undefined;
}

export async function getDashboardOverview(userId: string): Promise<DashboardOverview> {
  const [subjects, recentContents, recentResults] = await Promise.all([
    getSubjectsOverview(userId),
    prisma.content.findMany({
      where: { subject: { userId } },
      select: contentSummarySelect,
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.simulationResult.findMany({
      where: { userId },
      include: { subject: { select: { title: true } }, simulation: { select: { maxScore: true } } },
      orderBy: { submittedAt: "desc" },
      take: 6,
    }),
  ]);

  const evolution = recentResults
    .map((result) => ({
      label: result.subject.title,
      score: normalizeScore(Number(result.score), Number(result.simulation.maxScore)),
      submittedAt: result.submittedAt.toISOString(),
    }))
    .reverse();

  const insights: DashboardInsight[] = [];
  const latest = evolution.at(-1);
  const previous = evolution.at(-2);

  if (latest && previous) {
    const improvement = calculateImprovement(previous.score, latest.score);
    insights.push({
      id: "evolution",
      title: "Evolução recente",
      description:
        improvement === null
          ? `Seu último simulado teve nota ${latest.score.toFixed(1)}/10.`
          : improvement >= 0
            ? `Sua nota subiu ${improvement}% do penúltimo para o último simulado (${latest.score.toFixed(1)}/10).`
            : `Sua nota caiu ${Math.abs(improvement)}% do penúltimo para o último simulado (${latest.score.toFixed(1)}/10).`,
    });
  } else {
    insights.push({
      id: "evolution",
      title: "Evolução recente",
      description: latest
        ? `Seu primeiro simulado teve nota ${latest.score.toFixed(1)}/10. Faça outro para acompanhar a evolução.`
        : "Faça pelo menos dois simulados para acompanhar sua evolução.",
    });
  }

  const evaluated = subjects.filter((subject) => subject.attemptCount > 0);
  const weakest = [...evaluated].sort((left, right) => left.averageScore - right.averageScore)[0];
  const weakestModule = weakest ? await findWeakestModuleOf(userId, weakest.subjectId) : undefined;
  insights.push({
    id: "focus",
    title: "Onde focar",
    description: !weakest
      ? "Quando você fizer simulados, indicaremos aqui a matéria que pede mais atenção."
      : `"${weakest.title}" tem a menor média nos simulados (${weakest.averageScore.toFixed(1)}/10). ` +
        (weakestModule
          ? `O módulo com menor desempenho é "${weakestModule.title}" (${weakestModule.score.toFixed(1)}/10): faça um simulado só dele.`
          : "Revise as aulas dessa matéria."),
  });

  const pendingReview = await prisma.content.count({
    where: { subject: { userId }, processingStatus: { in: ["NEEDS_REVIEW", "FAILED"] } },
  });
  if (pendingReview > 0) {
    insights.push({
      id: "review",
      title: "Aulas que pedem atenção",
      description: `${pendingReview} aula(s) precisam de revisão ou falharam no processamento. Abra a matéria para reprocessar.`,
    });
  }

  return {
    metrics: {
      totalSubjects: subjects.length,
      approvedSubjects: subjects.filter((subject) => subject.status === "APPROVED").length,
      failedSubjects: subjects.filter((subject) => subject.status === "FAILED").length,
      inProgressSubjects: subjects.filter((subject) => subject.status === "IN_PROGRESS").length,
    },
    evolution,
    insights,
    subjects: [...subjects].sort((left, right) => right.attemptCount - left.attemptCount).slice(0, 6),
    recentContents: recentContents.map(mapContentSummaryRow),
  };
}

