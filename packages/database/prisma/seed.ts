import { ContentSource, PrismaClient, SubjectStatus } from "@prisma/client";

import type { Question } from "@semear/utils";

const prisma = new PrismaClient();

const question = (
  statement: string,
  options: [string, string, string, string],
  answer: string,
): Question => ({
  question: statement,
  options,
  answer,
});

const subjects = [
  {
    title: "Didatica Contemporanea",
    instructor: "Prof. Helena Farias",
    workloadHours: 60,
    status: SubjectStatus.IN_PROGRESS,
    progress: 74,
    difficulty: 82,
    periodTitle: "2026.1",
    content: {
      title: "Roteiro de aula invertida",
      originalFileName: "aula-invertida.pdf",
      source: ContentSource.PDF,
      body:
        "Aula invertida redistribui o tempo de exposicao para antes do encontro e usa a aula para debate, pratica e feedback formativo.",
      summary:
        "Resumo mockado destacando aula invertida, feedback formativo e trilhas curtas para encontros mais ativos.",
      importantTopics:
        "Tópicos Importantes: preparacao previa -> atividade em aula -> feedback -> consolidacao.",
      trainingQuestions: ["O que é aula invertida?", "Como o feedback atua na aprendizagem ativa?"],
    },
    simulations: [
      {
        title: "Simulado 1 - Didatica",
        timeLimitMinutes: 35,
        maxScore: 5,
        questions: [
          question(
            "Qual pratica fortalece a aprendizagem ativa?",
            ["Aula expositiva unica", "Estudo de caso", "Leitura passiva", "Revisao sem contexto"],
            "Estudo de caso",
          ),
          question(
            "Feedback formativo deve acontecer quando?",
            ["So no final", "Durante o processo", "Apenas em provas", "Somente via email"],
            "Durante o processo",
          ),
        ],
        results: [
          {
            score: 2.5,
            correctAnswers: 1,
            answers: [
              ["Qual pratica fortalece a aprendizagem ativa?", "Estudo de caso"],
              ["Feedback formativo deve acontecer quando?", "So no final"],
            ],
            submittedAt: new Date("2026-03-02T19:10:00.000Z"),
          },
        ],
      },
      {
        title: "Simulado 2 - Didatica",
        timeLimitMinutes: 40,
        maxScore: 5,
        questions: [
          question(
            "Aprendizagem baseada em projetos estimula?",
            ["Memorizacao isolada", "Autonomia", "Passividade", "Reducao de contexto"],
            "Autonomia",
          ),
          question(
            "Sequencia didatica consistente precisa de?",
            [
              "Objetivos, atividades e evidencias",
              "Muitos testes",
              "Poucos recursos",
              "Aulas improvisadas",
            ],
            "Objetivos, atividades e evidencias",
          ),
        ],
        results: [
          {
            score: 2.5,
            correctAnswers: 1,
            answers: [
              ["Aprendizagem baseada em projetos estimula?", "Autonomia"],
              ["Sequencia didatica consistente precisa de?", "Muitos testes"],
            ],
            submittedAt: new Date("2026-03-20T20:15:00.000Z"),
          },
          {
            score: 5,
            correctAnswers: 2,
            answers: [
              ["Aprendizagem baseada em projetos estimula?", "Autonomia"],
              [
                "Sequencia didatica consistente precisa de?",
                "Objetivos, atividades e evidencias",
              ],
            ],
            submittedAt: new Date("2026-04-08T21:00:00.000Z"),
          },
        ],
      },
    ],
  },
  {
    title: "Psicologia da Aprendizagem",
    instructor: "Prof. Daniel Couto",
    workloadHours: 48,
    status: SubjectStatus.APPROVED,
    progress: 100,
    difficulty: 61,
    periodTitle: "2026.1",
    content: {
      title: "Mapa de motivacao e autonomia",
      originalFileName: "motivacao.txt",
      source: ContentSource.TXT,
      body:
        "Motivacao intrinseca cresce quando o estudante percebe autonomia, competencia e pertencimento durante a jornada.",
      summary:
        "Resumo mockado sobre motivacao intrinseca, autorregulacao e pertencimento como base para constancia.",
      importantTopics:
        "Tópicos críticos para a autonomia: autonomia -> competencia -> pertencimento -> autorregulacao.",
      trainingQuestions: ["Explique sobre autorregulação na aprendizagem."],
    },
    simulations: [
      {
        title: "Simulado 1 - Psicologia",
        timeLimitMinutes: 30,
        maxScore: 5,
        questions: [
          question(
            "Zona de desenvolvimento proximal foi proposta por?",
            ["Piaget", "Vygotsky", "Skinner", "Freire"],
            "Vygotsky",
          ),
          question(
            "Motivacao intrinseca cresce quando ha?",
            ["Autonomia", "Punicao", "Ameaca", "Controle total"],
            "Autonomia",
          ),
        ],
        results: [
          {
            score: 5,
            correctAnswers: 2,
            answers: [
              ["Zona de desenvolvimento proximal foi proposta por?", "Vygotsky"],
              ["Motivacao intrinseca cresce quando ha?", "Autonomia"],
            ],
            submittedAt: new Date("2026-02-18T18:30:00.000Z"),
          },
        ],
      },
      {
        title: "Simulado 2 - Psicologia",
        timeLimitMinutes: 35,
        maxScore: 5,
        questions: [
          question(
            "Autorregulacao envolve?",
            ["Planejar, monitorar e revisar", "Somente memorizar", "Evitar metas", "Apenas copiar"],
            "Planejar, monitorar e revisar",
          ),
          question(
            "Emocoes e aprendizagem sao?",
            ["Independentes", "Interligadas", "Opostas", "Irrelevantes"],
            "Interligadas",
          ),
        ],
        results: [
          {
            score: 5,
            correctAnswers: 2,
            answers: [
              ["Autorregulacao envolve?", "Planejar, monitorar e revisar"],
              ["Emocoes e aprendizagem sao?", "Interligadas"],
            ],
            submittedAt: new Date("2026-03-01T19:45:00.000Z"),
          },
        ],
      },
    ],
  },
  {
    title: "Metodologias Ativas",
    instructor: "Prof. Bianca Serra",
    workloadHours: 52,
    status: SubjectStatus.FAILED,
    progress: 100,
    difficulty: 88,
    periodTitle: "2026.1",
    content: {
      title: "Guia pratico de PBL",
      originalFileName: "pbl-guia.pdf",
      source: ContentSource.PDF,
      body:
        "Problem based learning usa problemas autenticos para orientar investigacao, colaboracao e aplicacao.",
      summary:
        "Resumo mockado com foco em PBL, colaboracao e alinhamento entre objetivos e criterios avaliativos.",
      importantTopics:
        "Passos fundamentais: problema autentico -> investigacao -> colaboracao -> sintese.",
      trainingQuestions: ["Qual é o objetivo principal do acompanhamento em PBL?"],
    },
    simulations: [
      {
        title: "Simulado 1 - Metodologias",
        timeLimitMinutes: 30,
        maxScore: 5,
        questions: [
          question(
            "Sala de aula invertida desloca o conteudo teorico para?",
            ["Momento previo", "Somente prova", "Seminario final", "Biblioteca fisica"],
            "Momento previo",
          ),
          question(
            "Peer instruction se apoia em?",
            ["Discussao entre pares", "Exposicao infinita", "Aulas sem questoes", "Silencio total"],
            "Discussao entre pares",
          ),
        ],
        results: [
          {
            score: 2.5,
            correctAnswers: 1,
            answers: [
              [
                "Sala de aula invertida desloca o conteudo teorico para?",
                "Momento previo",
              ],
              ["Peer instruction se apoia em?", "Exposicao infinita"],
            ],
            submittedAt: new Date("2026-02-20T20:00:00.000Z"),
          },
        ],
      },
      {
        title: "Simulado 2 - Metodologias",
        timeLimitMinutes: 35,
        maxScore: 5,
        questions: [
          question(
            "Problema real em PBL serve para?",
            ["Mobilizar investigacao", "Evitar colaboracao", "Substituir objetivos", "Aumentar memorias isoladas"],
            "Mobilizar investigacao",
          ),
          question(
            "Rubricas apoiam metodologias ativas porque?",
            ["Clarificam criterios", "Eliminam feedback", "Reduzem autonomia", "Tornam a nota oculta"],
            "Clarificam criterios",
          ),
        ],
        results: [
          {
            score: 2.5,
            correctAnswers: 1,
            answers: [
              ["Problema real em PBL serve para?", "Mobilizar investigacao"],
              ["Rubricas apoiam metodologias ativas porque?", "Eliminam feedback"],
            ],
            submittedAt: new Date("2026-03-10T20:20:00.000Z"),
          },
        ],
      },
    ],
  },
  {
    title: "Gestao Escolar e Dados",
    instructor: "Prof. Ricardo Teles",
    workloadHours: 64,
    status: SubjectStatus.IN_PROGRESS,
    progress: 42,
    difficulty: 75,
    periodTitle: "2026.2",
    content: {
      title: "KPIs para permanencia estudantil",
      originalFileName: "kpis-escolares.txt",
      source: ContentSource.TXT,
      body:
        "Indicadores de permanencia combinam frequencia, engajamento, entregas e risco de evasao em dashboards acionaveis.",
      summary:
        "Resumo mockado conectando engajamento, risco de evasao e dashboards acionaveis na gestao escolar.",
      importantTopics:
        "Roteiro de BI na escola: coleta -> confiabilidade -> indicadores -> acao.",
      trainingQuestions: ["Como o uso de Data Analytics impacta a pedagogia de uma IE?"],
    },
    simulations: [
      {
        title: "Simulado 1 - Gestao",
        timeLimitMinutes: 35,
        maxScore: 5,
        questions: [
          question(
            "Indicador util para gestao escolar inteligente?",
            ["Taxa de engajamento", "Quantidade de papeis", "Numero de alarmes", "Tamanho da sala"],
            "Taxa de engajamento",
          ),
          question(
            "Boa governanca de dados exige?",
            ["Qualidade e privacidade", "Copias informais", "Acesso irrestrito", "Atualizacao rara"],
            "Qualidade e privacidade",
          ),
        ],
        results: [
          {
            score: 2.5,
            correctAnswers: 1,
            answers: [
              ["Indicador util para gestao escolar inteligente?", "Taxa de engajamento"],
              ["Boa governanca de dados exige?", "Copias informais"],
            ],
            submittedAt: new Date("2026-04-03T18:10:00.000Z"),
          },
        ],
      },
      {
        title: "Simulado 2 - Gestao",
        timeLimitMinutes: 35,
        maxScore: 5,
        questions: [
          question(
            "Uso de analytics em educacao ajuda a?",
            ["Antecipar riscos", "Substituir docentes", "Eliminar contexto", "Ignorar historicos"],
            "Antecipar riscos",
          ),
          question(
            "Tomada de decisao orientada a dados precisa de?",
            ["Rotina de revisao", "Achismo constante", "Dados isolados", "Planilhas desatualizadas"],
            "Rotina de revisao",
          ),
        ],
        results: [],
      },
    ],
  },
  {
    title: "Avaliacao Educacional",
    instructor: "Prof. Clara Moura",
    workloadHours: 40,
    status: SubjectStatus.APPROVED,
    progress: 100,
    difficulty: 56,
    periodTitle: "2026.2",
    content: {
      title: "Avaliacao formativa em ciclos",
      originalFileName: "avaliacao-formativa.pdf",
      source: ContentSource.PDF,
      body:
        "Avaliacao formativa exige ciclos curtos de evidencias, feedback e retomada com criterios claros.",
      summary:
        "Resumo mockado reforcando ciclos curtos de evidencias, feedback rapido e rubricas claras.",
      importantTopics:
        "Ciclo de vida formativo: diagnostico -> evidencia -> feedback -> replanejamento.",
      trainingQuestions: ["O que difere avaliação somativa de diagnóstica?"],
    },
    simulations: [
      {
        title: "Simulado 1 - Avaliacao",
        timeLimitMinutes: 30,
        maxScore: 5,
        questions: [
          question(
            "Avaliacao diagnostica ocorre preferencialmente?",
            ["No inicio", "Apenas no fim", "Depois da recuperacao", "Sem objetivos"],
            "No inicio",
          ),
          question(
            "Rubricas favorecem?",
            ["Transparencia", "Opacidade", "Improvisacao", "Subjetividade maxima"],
            "Transparencia",
          ),
        ],
        results: [
          {
            score: 5,
            correctAnswers: 2,
            answers: [
              ["Avaliacao diagnostica ocorre preferencialmente?", "No inicio"],
              ["Rubricas favorecem?", "Transparencia"],
            ],
            submittedAt: new Date("2026-03-28T19:00:00.000Z"),
          },
        ],
      },
      {
        title: "Simulado 2 - Avaliacao",
        timeLimitMinutes: 30,
        maxScore: 5,
        questions: [
          question(
            "Avaliacao formativa tem como foco?",
            ["Aprendizagem em progresso", "Somente classificacao", "Punicao", "Arquivo burocratico"],
            "Aprendizagem em progresso",
          ),
          question(
            "Revisao de erros apos prova serve para?",
            ["Consolidar aprendizagem", "Ignorar lacunas", "Punir novamente", "Aumentar ansiedade"],
            "Consolidar aprendizagem",
          ),
        ],
        results: [
          {
            score: 5,
            correctAnswers: 2,
            answers: [
              ["Avaliacao formativa tem como foco?", "Aprendizagem em progresso"],
              ["Revisao de erros apos prova serve para?", "Consolidar aprendizagem"],
            ],
            submittedAt: new Date("2026-04-05T18:40:00.000Z"),
          },
        ],
      },
    ],
  },
] as const;

async function main() {
  await prisma.simulationResult.deleteMany();
  await prisma.content.deleteMany();
  await prisma.simulation.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      name: "Marina Almeida",
      email: "marina@semear.app",
      avatarUrl:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
    },
  });

  const course = await prisma.course.create({
    data: {
      title: "Gestao Inteligente de Estudos",
      description:
        "Jornada organizada em ciclos para acompanhar conteudos, simulados e evolucao academica.",
      userId: user.id,
    },
  });



  for (const subject of subjects) {
    const createdSubject = await prisma.subject.create({
      data: {
        title: subject.title,
        instructor: subject.instructor,
        workloadHours: subject.workloadHours,
        status: subject.status,
        progress: subject.progress,
        difficulty: subject.difficulty,
        userId: user.id
      },
    });

    await prisma.content.create({
      data: {
        ...subject.content,
        subjectId: createdSubject.id,
      },
    });

    for (const simulation of subject.simulations) {
      const createdSimulation = await prisma.simulation.create({
        data: {
          title: simulation.title,
          sequence: simulation.sequence,
          timeLimitMinutes: simulation.timeLimitMinutes,
          maxScore: simulation.maxScore,
          questions: simulation.questions,
          subjectId: createdSubject.id,
        },
      });

      for (const result of simulation.results) {
        await prisma.simulationResult.create({
          data: {
            score: result.score,
            correctAnswers: result.correctAnswers,
            totalQuestions: simulation.questions.length,
            answers: result.answers.map(([statement, answer]) => ({
              question: statement,
              answer,
            })),
            submittedAt: result.submittedAt,
            userId: user.id,
            subjectId: createdSubject.id,
            simulationId: createdSimulation.id,
          },
        });
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
