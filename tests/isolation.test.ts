import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db";

import { DELETE as deleteContent } from "@/app/api/content/[contentId]/route";
import { POST as reprocess } from "@/app/api/content/[contentId]/reprocess/route";
import { GET as getRuns } from "@/app/api/content/[contentId]/runs/route";
import { GET as dashboard } from "@/app/api/dashboard/route";
import { POST as submit } from "@/app/api/simulations/[simulationId]/submit/route";
import { POST as generate } from "@/app/api/simulations/generate/route";
import { GET as listSimulations } from "@/app/api/simulations/route";
import { DELETE as deleteSubject, GET as getSubject, PATCH as patchSubject } from "@/app/api/subjects/[subjectId]/route";
import { GET as listSubjects } from "@/app/api/subjects/route";

import { createUser, jsonRequest, params, resetDatabase, sessionCookieFor } from "./support/helpers";

beforeEach(resetDatabase);

const questions = [
  { question: "Quanto é 2 + 2?", options: ["3", "4", "5", "6"], answer: "4", sourceExcerpt: "dois mais dois" },
  { question: "Capital do Brasil?", options: ["Rio", "Brasília", "Salvador", "Recife"], answer: "Brasília", sourceExcerpt: "capital" },
];

async function seedOwner(email: string) {
  const user = await createUser({ email });
  const subject = await prisma.subject.create({
    data: {
      title: `Matéria de ${email}`,
      instructor: "X",
      workloadHours: 10,
      status: "IN_PROGRESS",
      progress: 0,
      difficulty: 50,
      userId: user.id,
      contents: {
        create: {
          title: "Aula privada",
          originalFileName: "a.txt",
          source: "TXT",
          body: `Conteúdo secreto de ${email}`,
          trainingQuestions: questions,
          processingStatus: "COMPLETED",
          classification: "SUBSTANTIVE",
        },
      },
    },
    include: { contents: true },
  });
  return { user, subject, content: subject.contents[0]!, cookie: await sessionCookieFor(user.id) };
}

describe("isolamento de dados entre usuários", () => {
  it("listagens retornam apenas os próprios dados", async () => {
    const ana = await seedOwner("ana@exemplo.com");
    await seedOwner("bia@exemplo.com");

    const subjects = await (await listSubjects(jsonRequest("GET", "/api/subjects", { cookie: ana.cookie }))).json();
    expect(subjects.map((subject: { title: string }) => subject.title)).toEqual(["Matéria de ana@exemplo.com"]);

    const simulations = await (await listSimulations(jsonRequest("GET", "/api/simulations", { cookie: ana.cookie }))).json();
    expect(simulations).toHaveLength(1);

    const overview = await (await dashboard(jsonRequest("GET", "/api/dashboard", { cookie: ana.cookie }))).json();
    expect(overview.metrics.totalSubjects).toBe(1);
    expect(JSON.stringify(overview)).not.toContain("bia@exemplo.com");
  });

  it("não lê, altera nem exclui matéria de outro usuário", async () => {
    const ana = await seedOwner("ana@exemplo.com");
    const bia = await seedOwner("bia@exemplo.com");
    const target = params({ subjectId: ana.subject.id });

    expect((await getSubject(jsonRequest("GET", "/x", { cookie: bia.cookie }), target)).status).toBe(404);
    expect((await patchSubject(jsonRequest("PATCH", "/x", { cookie: bia.cookie, body: { title: "Hackeada" } }), target)).status).toBe(404);
    expect((await deleteSubject(jsonRequest("DELETE", "/x", { cookie: bia.cookie }), target)).status).toBe(404);

    expect((await prisma.subject.findUniqueOrThrow({ where: { id: ana.subject.id } })).title).toBe("Matéria de ana@exemplo.com");
  });

  it("não lê, reprocessa nem exclui aula de outro usuário", async () => {
    const ana = await seedOwner("ana@exemplo.com");
    const bia = await seedOwner("bia@exemplo.com");
    const target = params({ contentId: ana.content.id });

    const read = await getSubject(jsonRequest("GET", "/x", { cookie: bia.cookie }), params({ subjectId: ana.subject.id }));
    expect(read.status).toBe(404);
    expect(JSON.stringify(await read.json())).not.toContain("Conteúdo secreto");

    expect((await getRuns(jsonRequest("GET", "/x", { cookie: bia.cookie }), target)).status).toBe(404);
    expect((await reprocess(jsonRequest("POST", "/x", { cookie: bia.cookie, body: {} }), target)).status).toBe(404);
    expect((await deleteContent(jsonRequest("DELETE", "/x", { cookie: bia.cookie }), target)).status).toBe(404);
    expect(await prisma.content.count({ where: { id: ana.content.id } })).toBe(1);
  });

  it("não gera nem envia simulado de matéria de outro usuário", async () => {
    const ana = await seedOwner("ana@exemplo.com");
    const bia = await seedOwner("bia@exemplo.com");

    const foreignGenerate = await generate(jsonRequest("POST", "/x", { cookie: bia.cookie, body: { subjectId: ana.subject.id } }));
    expect(foreignGenerate.status).toBe(404);

    const own = await (await generate(jsonRequest("POST", "/x", { cookie: ana.cookie, body: { subjectId: ana.subject.id } }))).json();
    const foreignSubmit = await submit(
      jsonRequest("POST", "/x", { cookie: bia.cookie, body: { answers: [{ questionIndex: 0, answer: "4" }] } }),
      params({ simulationId: own.id }),
    );
    expect(foreignSubmit.status).toBe(404);
    expect(await prisma.simulationResult.count()).toBe(0);
  });

  it("o próprio dono acessa normalmente", async () => {
    const ana = await seedOwner("ana@exemplo.com");
    const response = await getSubject(jsonRequest("GET", "/x", { cookie: ana.cookie }), params({ subjectId: ana.subject.id }));
    expect(response.status).toBe(200);
    expect((await response.json()).contents[0].body).toBe("Conteúdo secreto de ana@exemplo.com");
  });
});

describe("simulados", () => {
  it("não expõe o gabarito e corrige no servidor; aceita uma única tentativa", async () => {
    const ana = await seedOwner("ana@exemplo.com");

    const generated = await generate(jsonRequest("POST", "/x", { cookie: ana.cookie, body: { subjectId: ana.subject.id } }));
    expect(generated.status).toBe(201);
    const simulation = await generated.json();
    expect(JSON.stringify(simulation)).not.toContain('"answer"');
    expect(JSON.stringify(simulation)).not.toContain("sourceExcerpt");

    const answers = simulation.questions.map((question: { question: string }, index: number) => ({
      questionIndex: index,
      answer: question.question.includes("2 + 2") ? "4" : "Rio",
    }));
    const result = await submit(jsonRequest("POST", "/x", { cookie: ana.cookie, body: { answers } }), params({ simulationId: simulation.id }));
    expect(result.status).toBe(201);
    const body = await result.json();
    expect(body).toMatchObject({ correctAnswers: 1, totalQuestions: 2, score: 5 });
    expect(body.breakdown).toHaveLength(2);

    const second = await submit(jsonRequest("POST", "/x", { cookie: ana.cookie, body: { answers } }), params({ simulationId: simulation.id }));
    expect(second.status).toBe(409);
  });

  it("recusa envio após o prazo", async () => {
    const ana = await seedOwner("ana@exemplo.com");
    const simulation = await (await generate(jsonRequest("POST", "/x", { cookie: ana.cookie, body: { subjectId: ana.subject.id } }))).json();
    await prisma.simulation.update({ where: { id: simulation.id }, data: { createdAt: new Date(Date.now() - 60 * 60 * 1000) } });

    const late = await submit(jsonRequest("POST", "/x", { cookie: ana.cookie, body: { answers: [] } }), params({ simulationId: simulation.id }));
    expect(late.status).toBe(409);
  });

  it("nota da matéria fica na escala 0–10 (média, não soma)", async () => {
    const ana = await seedOwner("ana@exemplo.com");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const simulation = await (await generate(jsonRequest("POST", "/x", { cookie: ana.cookie, body: { subjectId: ana.subject.id } }))).json();
      const answers = simulation.questions.map((question: { question: string }, index: number) => ({
        questionIndex: index,
        answer: question.question.includes("2 + 2") ? "4" : "Brasília",
      }));
      await submit(jsonRequest("POST", "/x", { cookie: ana.cookie, body: { answers } }), params({ simulationId: simulation.id }));
    }

    const subjects = await (await listSubjects(jsonRequest("GET", "/api/subjects", { cookie: ana.cookie }))).json();
    expect(subjects[0].finalScore).toBe(10);
    expect(subjects[0].attemptCount).toBe(3);
  });
});
