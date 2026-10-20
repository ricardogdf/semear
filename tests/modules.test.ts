import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db";

import { PATCH as patchContent } from "@/app/api/content/[contentId]/route";
import { DELETE as deleteModule, PATCH as renameModule } from "@/app/api/modules/[moduleId]/route";
import { POST as createModule } from "@/app/api/subjects/[subjectId]/modules/route";
import { DELETE as deleteSubject, GET as getSubject } from "@/app/api/subjects/[subjectId]/route";
import { GET as listSubjects } from "@/app/api/subjects/route";

import { createUser, jsonRequest, params, resetDatabase, sessionCookieFor } from "./support/helpers";

beforeEach(resetDatabase);

const ANSWERS: Record<string, string> = {
  "Quanto é 3 × 4?": "12",
  "Quanto é 5 × 5?": "25",
  "Quanto é 12 ÷ 4?": "3",
  "Quanto é 20 ÷ 5?": "4",
  "Quanto é 2 + 2?": "4",
};

const question = (text: string, options: string[]) => ({ question: text, options, answer: ANSWERS[text]!, sourceExcerpt: text });

/** Matemática com os módulos Multiplicação e Divisão e uma aula direto na matéria. */
async function seedMath(email: string) {
  const user = await createUser({ email });
  const subject = await prisma.subject.create({
    data: { title: "Matemática", instructor: "X", workloadHours: 10, status: "IN_PROGRESS", progress: 0, difficulty: 50, userId: user.id },
  });
  const multiplication = await prisma.subjectModule.create({ data: { title: "Multiplicação", subjectId: subject.id } });
  const division = await prisma.subjectModule.create({ data: { title: "Divisão", subjectId: subject.id } });
  const lesson = (title: string, moduleId: string | null, questions: ReturnType<typeof question>[]) =>
    prisma.content.create({
      data: {
        title,
        originalFileName: `${title}.txt`,
        source: "TXT",
        body: `Aula de ${title}`,
        trainingQuestions: questions,
        processingStatus: "COMPLETED",
        classification: "SUBSTANTIVE",
        subjectId: subject.id,
        moduleId,
      },
    });

  return {
    user,
    subject,
    multiplication,
    division,
    times: await lesson("Tabuada", multiplication.id, [
      question("Quanto é 3 × 4?", ["10", "12", "14", "16"]),
      question("Quanto é 5 × 5?", ["20", "25", "30", "35"]),
    ]),
    quotients: await lesson("Divisão exata", division.id, [
      question("Quanto é 12 ÷ 4?", ["2", "3", "4", "6"]),
      question("Quanto é 20 ÷ 5?", ["3", "4", "5", "6"]),
    ]),
    review: await lesson("Revisão geral", null, [question("Quanto é 2 + 2?", ["3", "4", "5", "6"])]),
    cookie: await sessionCookieFor(user.id),
  };
}

const post = (cookie: string, body: unknown) => jsonRequest("POST", "/x", { cookie, body });
const patch = (cookie: string, body: unknown) => jsonRequest("PATCH", "/x", { cookie, body });

async function subjectDetail(cookie: string, subjectId: string) {
  return (await getSubject(jsonRequest("GET", "/x", { cookie }), params({ subjectId }))).json();
}

describe("módulos da matéria", () => {
  it("cria, renomeia e lista em ordem de nome; nomes únicos na matéria sem diferenciar maiúsculas", async () => {
    const ana = await seedMath("ana@exemplo.com");
    const target = params({ subjectId: ana.subject.id });

    const created = await createModule(post(ana.cookie, { title: "  Frações  " }), target);
    expect(created.status).toBe(201);
    const fractions = await created.json();
    expect(fractions.title).toBe("Frações");

    expect((await createModule(post(ana.cookie, { title: "frações" }), target)).status).toBe(409);
    expect((await createModule(post(ana.cookie, { title: "   " }), target)).status).toBe(400);

    const moduleParams = params({ moduleId: fractions.id });
    expect((await renameModule(patch(ana.cookie, { title: "MULTIPLICAÇÃO" }), moduleParams)).status).toBe(409);
    const renamed = await renameModule(patch(ana.cookie, { title: "Frações e decimais" }), moduleParams);
    expect(renamed.status).toBe(200);
    // Mudar só maiúsculas do próprio nome é permitido.
    expect((await renameModule(patch(ana.cookie, { title: "frações e decimais" }), moduleParams)).status).toBe(200);

    const detail = await subjectDetail(ana.cookie, ana.subject.id);
    expect(detail.modules.map((entry: { title: string }) => entry.title)).toEqual(["Divisão", "frações e decimais", "Multiplicação"]);
    expect(detail.modules.find((entry: { title: string }) => entry.title === "Divisão")).toMatchObject({
      contentCount: 1,
      availableQuestionCount: 2,
    });
    expect(detail.contents.find((content: { id: string }) => content.id === ana.review.id)).toMatchObject({
      moduleId: null,
      moduleTitle: null,
    });

    const options = await (await listSubjects(jsonRequest("GET", "/api/subjects?compact=1", { cookie: ana.cookie }))).json();
    expect(options[0].modules.map((entry: { title: string }) => entry.title)).toEqual(["Divisão", "frações e decimais", "Multiplicação"]);

    const overview = await (await listSubjects(jsonRequest("GET", "/api/subjects", { cookie: ana.cookie }))).json();
    expect(overview[0]).toMatchObject({ moduleCount: 3, contentCount: 3 });
  });

  it("move a aula para um módulo da mesma matéria ou de volta para a matéria", async () => {
    const ana = await seedMath("ana@exemplo.com");
    const target = params({ contentId: ana.review.id });

    const moved = await patchContent(patch(ana.cookie, { moduleId: ana.division.id }), target);
    expect(moved.status).toBe(200);
    expect(await moved.json()).toMatchObject({ moduleId: ana.division.id, moduleTitle: "Divisão" });
    // Mover não conta como alteração da aula (o updatedAt marca o início do processamento).
    expect((await prisma.content.findUniqueOrThrow({ where: { id: ana.review.id } })).updatedAt).toEqual(ana.review.updatedAt);

    const back = await patchContent(patch(ana.cookie, { moduleId: null }), target);
    expect(await back.json()).toMatchObject({ moduleId: null, moduleTitle: null });

    const physics = await prisma.subject.create({
      data: { title: "Física", instructor: "X", workloadHours: 10, status: "IN_PROGRESS", progress: 0, difficulty: 50, userId: ana.user.id },
    });
    const kinematics = await prisma.subjectModule.create({ data: { title: "Cinemática", subjectId: physics.id } });
    expect((await patchContent(patch(ana.cookie, { moduleId: kinematics.id }), target)).status).toBe(404);
    expect((await patchContent(patch(ana.cookie, { title: "Outro" }), target)).status).toBe(400);
    expect((await prisma.content.findUniqueOrThrow({ where: { id: ana.review.id } })).moduleId).toBeNull();
  });

  it("excluir o módulo mantém as aulas na matéria, sem módulo", async () => {
    const ana = await seedMath("ana@exemplo.com");

    expect((await deleteModule(jsonRequest("DELETE", "/x", { cookie: ana.cookie }), params({ moduleId: ana.division.id }))).status).toBe(200);
    expect((await deleteModule(jsonRequest("DELETE", "/x", { cookie: ana.cookie }), params({ moduleId: ana.division.id }))).status).toBe(404);

    expect((await prisma.content.findUniqueOrThrow({ where: { id: ana.quotients.id } })).moduleId).toBeNull();
    const detail = await subjectDetail(ana.cookie, ana.subject.id);
    expect(detail.contents).toHaveLength(3);
    expect(detail.modules.map((entry: { title: string }) => entry.title)).toEqual(["Multiplicação"]);
  });

  it("excluir a matéria apaga também os módulos e as aulas", async () => {
    const ana = await seedMath("ana@exemplo.com");

    const response = await deleteSubject(jsonRequest("DELETE", "/x", { cookie: ana.cookie }), params({ subjectId: ana.subject.id }));
    expect(response.status).toBe(200);
    expect(await prisma.subjectModule.count()).toBe(0);
    expect(await prisma.content.count()).toBe(0);
  });
});

describe("isolamento de módulos entre usuários", () => {
  it("não cria, renomeia, exclui nem usa módulo de outro usuário", async () => {
    const ana = await seedMath("ana@exemplo.com");
    const bia = await seedMath("bia@exemplo.com");
    const anaModule = params({ moduleId: ana.division.id });

    expect((await createModule(post(bia.cookie, { title: "Invasão" }), params({ subjectId: ana.subject.id }))).status).toBe(404);
    expect((await renameModule(patch(bia.cookie, { title: "Hackeado" }), anaModule)).status).toBe(404);
    expect((await deleteModule(jsonRequest("DELETE", "/x", { cookie: bia.cookie }), anaModule)).status).toBe(404);

    // Nem mover a aula da outra pessoa, nem colocar a própria aula no módulo dela.
    expect((await patchContent(patch(bia.cookie, { moduleId: null }), params({ contentId: ana.quotients.id }))).status).toBe(404);
    expect((await patchContent(patch(bia.cookie, { moduleId: ana.division.id }), params({ contentId: bia.review.id }))).status).toBe(404);

    expect(await prisma.subjectModule.findUniqueOrThrow({ where: { id: ana.division.id } })).toMatchObject({ title: "Divisão" });
    expect((await prisma.content.findUniqueOrThrow({ where: { id: ana.quotients.id } })).moduleId).toBe(ana.division.id);
    expect((await prisma.content.findUniqueOrThrow({ where: { id: bia.review.id } })).moduleId).toBeNull();
    expect(await prisma.subjectModule.count({ where: { subjectId: ana.subject.id } })).toBe(2);
  });
});
