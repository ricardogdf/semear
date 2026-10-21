import { execSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../server/db/security/password";
import { resolveTestDatabaseUrl } from "../tests/support/env";

export const E2E_PASSWORD = "senha-e2e-12345";

/** Prepara o banco de TESTE com dados conhecidos para os testes de navegador. */
export default async function globalSetup() {
  const url = resolveTestDatabaseUrl();
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
    );
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);

    const passwordHash = await hashPassword(E2E_PASSWORD);
    const admin = await prisma.user.create({
      data: { email: "admin@e2e.test", name: "Alice Administradora", role: "ADMIN", passwordHash },
    });
    const user = await prisma.user.create({
      data: { email: "user@e2e.test", name: "Bruno Estudante", role: "USER", passwordHash, createdById: admin.id },
    });
    await prisma.user.create({ data: { email: "pendente@e2e.test", name: "Carla Pendente", role: "USER", createdById: admin.id } });

    const questions = [
      { question: "Qual etapa forma as nuvens?", options: ["Condensação", "Evaporação", "Infiltração", "Precipitação"], answer: "Condensação", sourceExcerpt: "o vapor esfria e forma as nuvens" },
      { question: "O que a evaporação produz?", options: ["Vapor de água", "Granizo", "Lençol freático", "Neve"], answer: "Vapor de água", sourceExcerpt: "a evaporação transforma a água em vapor" },
      { question: "Para onde vai a água na infiltração?", options: ["Subsolo", "Atmosfera", "Oceano", "Nuvens"], answer: "Subsolo", sourceExcerpt: "a infiltração leva a água para o subsolo" },
    ];

    for (const owner of [admin, user]) {
      const subject = await prisma.subject.create({
        data: {
          title: "Ciências Ambientais",
          instructor: "Prof. Diego Ramos",
          workloadHours: 60,
          status: "IN_PROGRESS",
          progress: 35,
          difficulty: 50,
          userId: owner.id,
          contents: {
            create: [
              {
                title: "Ciclo da água",
                originalFileName: "ciclo-da-agua.txt",
                source: "TXT",
                body: "A evaporação transforma a água em vapor. Depois o vapor esfria e forma as nuvens. A infiltração leva a água para o subsolo.",
                summary: "# Ciclo da água\n\n## Etapas\n- **Evaporação**\n- **Condensação**\n- **Infiltração**\n\n> A água circula continuamente.",
                shortSummary: "Etapas do ciclo da água: evaporação, condensação e infiltração.",
                importantTopics: "evaporação, condensação, infiltração",
                trainingQuestions: questions,
                processingStatus: "COMPLETED",
                classification: "SUBSTANTIVE",
                classificationReason: "Explica as etapas do ciclo da água.",
                aiProvider: "ANTHROPIC",
                aiModel: "claude-modelo-exemplo",
                processedAt: new Date(),
              },
              {
                title: "Apresentação da disciplina",
                originalFileName: "apresentacao.txt",
                source: "TXT",
                body: "Bem-vindos! Cronograma, avaliação e regras do curso.",
                summary: "# Apresentação\n\nCronograma e critérios de avaliação.",
                shortSummary: "Apresentação do curso e do cronograma.",
                processingStatus: "NO_QUESTIONS_NEEDED",
                classification: "INTRODUCTORY",
                classificationReason: "Apresenta o curso, o cronograma e a avaliação, sem conteúdo da disciplina.",
                processedAt: new Date(),
              },
              {
                title: "Slides digitalizados",
                originalFileName: "slides.pdf",
                source: "PDF",
                body: "Texto extraído parcialmente.",
                processingStatus: "FAILED",
                errorCode: "UNAVAILABLE",
                errorMessage: "O serviço da Anthropic está indisponível ou sobrecarregado no momento. Tente novamente em alguns minutos.",
                aiProvider: "ANTHROPIC",
                aiModel: "claude-modelo-exemplo",
              },
            ],
          },
        },
      });

      // Módulo com a aula que tem questões; as outras aulas ficam direto na matéria.
      const hydrology = await prisma.subjectModule.create({ data: { title: "Hidrologia", subjectId: subject.id } });
      await prisma.content.updateMany({
        where: { subjectId: subject.id, title: "Ciclo da água" },
        data: { moduleId: hydrology.id },
      });
    }

    // Comunidade: autora com perfil acadêmico, matéria pública, publicações e um seguidor.
    // IDs fixos para abrir as páginas públicas direto pela URL nos testes.
    const diana = await prisma.user.create({
      data: {
        id: "e2e-diana",
        email: "diana@e2e.test",
        name: "Diana Pesquisadora",
        role: "USER",
        passwordHash,
        institution: "UFMG",
        course: "Ciências Biológicas",
        bio: "Pesquisa genética de plantas.",
      },
    });
    const genetics = await prisma.subject.create({
      data: {
        id: "e2e-genetica",
        title: "Genética Básica",
        description: "Leis de Mendel e herança, com questões de revisão.",
        instructor: "Profa. Diana",
        workloadHours: 30,
        status: "APPROVED",
        progress: 100,
        difficulty: 50,
        userId: diana.id,
        visibility: "PUBLIC",
        publishedAt: new Date("2026-09-01T12:00:00Z"),
      },
    });
    const mendel = await prisma.subjectModule.create({ data: { title: "Mendelismo", subjectId: genetics.id } });
    await prisma.content.create({
      data: {
        title: "Primeira lei de Mendel",
        originalFileName: "mendel.txt",
        source: "TXT",
        body: "A primeira lei de Mendel diz que cada característica é determinada por um par de fatores que se separam na formação dos gametas.",
        summary: "# Primeira lei de Mendel\n\nCada característica é determinada por um par de fatores.",
        shortSummary: "Segregação dos fatores na formação dos gametas.",
        importantTopics: "Mendel, segregação, gametas",
        trainingQuestions: [
          {
            question: "O que se separa na formação dos gametas?",
            options: ["Os fatores de cada par", "As células inteiras", "Os cromossomos sexuais", "As proteínas"],
            answer: "Os fatores de cada par",
            sourceExcerpt: "um par de fatores que se separam na formação dos gametas",
          },
        ],
        processingStatus: "COMPLETED",
        classification: "SUBSTANTIVE",
        processedAt: new Date(),
        subjectId: genetics.id,
        moduleId: mendel.id,
      },
    });
    await prisma.subject.create({
      data: {
        id: "e2e-materia-privada",
        title: "Anotações privadas da Diana",
        instructor: "X",
        workloadHours: 0,
        status: "IN_PROGRESS",
        progress: 0,
        difficulty: 50,
        userId: diana.id,
      },
    });
    await prisma.publication.create({
      data: {
        id: "e2e-artigo",
        type: "ARTICLE",
        title: "Herança mendeliana em ervilhas",
        authors: "Diana Pesquisadora; Bruno Estudante",
        abstract: "Reprodução dos experimentos de Mendel com ervilhas cultivadas em estufa.",
        institution: "UFMG",
        publishedOn: new Date("2026-05-10T00:00:00Z"),
        externalUrl: "https://repositorio.exemplo.edu/handle/123",
        visibility: "PUBLIC",
        userId: diana.id,
      },
    });
    await prisma.publication.create({
      data: {
        id: "e2e-artigo-privado",
        type: "TCC",
        title: "Rascunho privado de TCC",
        authors: "Diana Pesquisadora",
        visibility: "PRIVATE",
        userId: diana.id,
      },
    });
    await prisma.follow.create({ data: { followerId: admin.id, followingId: diana.id } });

    await prisma.accessRequest.create({
      data: { name: "Daniela Interessada", email: "daniela@e2e.test", message: "Quero usar para estudar para concursos." },
    });
  } finally {
    await prisma.$disconnect();
  }
}
