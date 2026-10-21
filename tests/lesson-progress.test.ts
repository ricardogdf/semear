import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db";

import { PATCH as patchContent } from "@/app/api/content/[contentId]/route";
import { POST as importSubject } from "@/app/api/library/[subjectId]/import/route";
import { GET as listSimulations } from "@/app/api/simulations/route";
import { GET as getSubject } from "@/app/api/subjects/[subjectId]/route";

import { createUser, jsonRequest, params, resetDatabase, sessionCookieFor } from "./support/helpers";

beforeEach(resetDatabase);

/** Matéria com um módulo e três aulas enviadas em momentos diferentes (fora de ordem no banco). */
async function seed(email = "ana@exemplo.com") {
  const user = await createUser({ email });
  const subject = await prisma.subject.create({
    data: { title: "Cálculo", instructor: "X", workloadHours: 0, status: "IN_PROGRESS", progress: 0, difficulty: 50, userId: user.id },
  });
  const lessonModule = await prisma.subjectModule.create({ data: { title: "Módulo 1", subjectId: subject.id } });
  const lesson = (title: string, createdAt: string) =>
    prisma.content.create({
      data: {
        title,
        originalFileName: `${title}.txt`,
        source: "TXT",
        body: title,
        subjectId: subject.id,
        moduleId: lessonModule.id,
        createdAt: new Date(createdAt),
        processingStatus: "COMPLETED",
      },
    });
  const second = await lesson("Aula 2", "2026-10-02T10:00:00Z");
  const first = await lesson("Aula 1", "2026-10-01T10:00:00Z");
  const third = await lesson("Aula 3", "2026-10-03T10:00:00Z");
  return { user, subject, module: lessonModule, first, second, third, cookie: await sessionCookieFor(user.id) };
}

async function detail(cookie: string, subjectId: string) {
  return (await getSubject(jsonRequest("GET", "/x", { cookie }), params({ subjectId }))).json();
}

const patch = (cookie: string, contentId: string, body: unknown) =>
  patchContent(jsonRequest("PATCH", "/x", { cookie, body }), params({ contentId }));

describe("ordem das aulas", () => {
  it("lista as aulas da mais antiga para a mais recente, na matéria e nos simulados", async () => {
    const ana = await seed();
    const subject = await detail(ana.cookie, ana.subject.id);
    expect(subject.contents.map((content: { title: string }) => content.title)).toEqual(["Aula 1", "Aula 2", "Aula 3"]);

    const simulations = await (await listSimulations(jsonRequest("GET", "/x", { cookie: ana.cookie }))).json();
    expect(simulations[0].contents.map((content: { title: string }) => content.title)).toEqual(["Aula 1", "Aula 2", "Aula 3"]);
  });
});

describe("aula concluída", () => {
  it("marca e desmarca a aula, com o progresso do módulo", async () => {
    const ana = await seed();

    const marked = await patch(ana.cookie, ana.first.id, { completed: true });
    expect(marked.status).toBe(200);
    const body = await marked.json();
    expect(body.completedAt).not.toBeNull();

    let subject = await detail(ana.cookie, ana.subject.id);
    expect(subject.modules[0]).toMatchObject({ contentCount: 3, completedCount: 1 });

    // Marcar de novo mantém a data da primeira conclusão.
    const again = await (await patch(ana.cookie, ana.first.id, { completed: true })).json();
    expect(again.completedAt).toBe(body.completedAt);

    await patch(ana.cookie, ana.first.id, { completed: false });
    subject = await detail(ana.cookie, ana.subject.id);
    expect(subject.modules[0].completedCount).toBe(0);
    expect(subject.contents.every((content: { completedAt: string | null }) => content.completedAt === null)).toBe(true);
  });

  it("não altera o módulo nem o marcador de processamento (updatedAt) da aula", async () => {
    const ana = await seed();
    const before = await prisma.content.findUniqueOrThrow({ where: { id: ana.first.id } });
    await patch(ana.cookie, ana.first.id, { completed: true });
    const after = await prisma.content.findUniqueOrThrow({ where: { id: ana.first.id } });
    expect(after.moduleId).toBe(ana.module.id);
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());

    // Mover de módulo continua funcionando e não desfaz a conclusão.
    expect((await patch(ana.cookie, ana.first.id, { moduleId: null })).status).toBe(200);
    expect(await prisma.content.findUniqueOrThrow({ where: { id: ana.first.id } })).toMatchObject({ moduleId: null });
    expect((await prisma.content.findUniqueOrThrow({ where: { id: ana.first.id } })).completedAt).not.toBeNull();
  });

  it("valida o corpo e só o dono marca a própria aula", async () => {
    const ana = await seed();
    const bia = await seed("bia@exemplo.com");
    expect((await patch(ana.cookie, ana.first.id, {})).status).toBe(400);
    expect((await patch(ana.cookie, ana.first.id, { completed: "sim" })).status).toBe(400);
    expect((await patch(bia.cookie, ana.first.id, { completed: true })).status).toBe(404);
    expect((await prisma.content.findUniqueOrThrow({ where: { id: ana.first.id } })).completedAt).toBeNull();
  });

  it("o progresso é pessoal: não vai para quem importa a matéria", async () => {
    const ana = await seed();
    const bia = await seed("bia@exemplo.com");
    await patch(ana.cookie, ana.first.id, { completed: true });
    await prisma.subject.update({ where: { id: ana.subject.id }, data: { visibility: "PUBLIC", publishedAt: new Date() } });

    const imported = await (await importSubject(jsonRequest("POST", "/x", { cookie: bia.cookie }), params({ subjectId: ana.subject.id }))).json();
    const copy = await detail(bia.cookie, imported.subjectId);
    expect(copy.contents.every((content: { completedAt: string | null }) => content.completedAt === null)).toBe(true);
    expect(copy.modules[0].completedCount).toBe(0);
  });
});
