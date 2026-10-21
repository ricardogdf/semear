import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db";

import { POST as reprocess } from "@/app/api/content/[contentId]/reprocess/route";
import { POST as importSubject } from "@/app/api/library/[subjectId]/import/route";
import { GET as getPublicSubject } from "@/app/api/library/[subjectId]/route";
import { GET as listLibrary } from "@/app/api/library/route";
import { POST as generate } from "@/app/api/simulations/generate/route";
import { DELETE as deleteSubject, GET as getSubject, PATCH as patchSubject } from "@/app/api/subjects/[subjectId]/route";
import { PUT as setVisibility } from "@/app/api/subjects/[subjectId]/visibility/route";
import { GET as listSubjects } from "@/app/api/subjects/route";
import { GET as getProfile } from "@/app/api/users/[userId]/route";

import { createUser, jsonRequest, params, resetDatabase, sessionCookieFor } from "./support/helpers";

beforeEach(resetDatabase);

const questions = [
  { question: "Quanto é 3 × 4?", options: ["10", "12", "14", "16"], answer: "12", sourceExcerpt: "3 × 4 = 12" },
  { question: "Quanto é 12 ÷ 4?", options: ["2", "3", "4", "6"], answer: "3", sourceExcerpt: "12 ÷ 4 = 3" },
];

async function member(email: string, name?: string) {
  const user = await createUser({ email, name });
  return { user, cookie: await sessionCookieFor(user.id) };
}

/** Matéria com um módulo e duas aulas processadas (uma no módulo, outra direto na matéria). */
async function seedSubject(userId: string, title = "Matemática Básica") {
  const subject = await prisma.subject.create({
    data: { title, instructor: "Prof. Renata", workloadHours: 40, status: "APPROVED", progress: 80, difficulty: 50, userId },
  });
  const multiplication = await prisma.subjectModule.create({ data: { title: "Multiplicação", subjectId: subject.id } });
  for (const [lesson, moduleId] of [["Tabuada", multiplication.id], ["Revisão", null]] as const) {
    await prisma.content.create({
      data: {
        title: lesson,
        originalFileName: `${lesson}.txt`,
        source: "TXT",
        body: `Texto completo da aula ${lesson}`,
        summary: `# ${lesson}`,
        shortSummary: `Resumo de ${lesson}`,
        trainingQuestions: questions,
        processingStatus: "COMPLETED",
        classification: "SUBSTANTIVE",
        subjectId: subject.id,
        moduleId,
      },
    });
  }
  return subject;
}

const put = (cookie: string | undefined, body: unknown) => jsonRequest("PUT", "/x", { cookie, body });
const post = (cookie?: string) => jsonRequest("POST", "/x", { cookie });

async function publish(cookie: string, subjectId: string, description = "Apostila de matemática.") {
  return setVisibility(put(cookie, { visibility: "PUBLIC", description }), params({ subjectId }));
}

async function doImport(cookie: string | undefined, subjectId: string) {
  return importSubject(post(cookie), params({ subjectId }));
}

async function publicView(subjectId: string, cookie?: string) {
  return getPublicSubject(jsonRequest("GET", "/x", { cookie }), params({ subjectId }));
}

async function importCount(subjectId: string) {
  return prisma.subject.count({ where: { importedFromId: subjectId } });
}

describe("publicação de matérias", () => {
  it("publica e torna privada uma matéria original; a página pública acompanha a visibilidade", async () => {
    const ana = await member("ana@exemplo.com", "Ana Souza");
    const subject = await seedSubject(ana.user.id);

    // Privada por padrão: ninguém além da dona a vê pela URL.
    expect((await publicView(subject.id)).status).toBe(404);

    const published = await publish(ana.cookie, subject.id);
    expect(published.status).toBe(200);
    expect(await published.json()).toMatchObject({ visibility: "PUBLIC", description: "Apostila de matemática.", importCount: 0, importedFrom: null });

    const view = await (await publicView(subject.id)).json();
    expect(view).toMatchObject({
      title: "Matemática Básica",
      description: "Apostila de matemática.",
      author: { id: ana.user.id, displayName: "Ana Souza" },
      importCount: 0,
      contentCount: 2,
      moduleCount: 1,
      isOwner: false,
      importedCopyId: null,
    });
    expect(view.contents).toEqual([
      expect.objectContaining({ title: "Tabuada", shortSummary: "Resumo de Tabuada", questionCount: 2 }),
      expect.objectContaining({ title: "Revisão", questionCount: 2 }),
    ]);
    // A prévia pública não inclui o texto, o resumo completo nem as respostas.
    const raw = JSON.stringify(view);
    expect(raw).not.toContain("Texto completo da aula");
    expect(raw).not.toContain("sourceExcerpt");
    expect(raw).not.toContain("ana@exemplo.com");

    const privateAgain = await setVisibility(put(ana.cookie, { visibility: "PRIVATE" }), params({ subjectId: subject.id }));
    expect(await privateAgain.json()).toMatchObject({ visibility: "PRIVATE", publishedAt: null });
    expect((await publicView(subject.id)).status).toBe(404);
    // A dona ainda vê a própria página (com o aviso de privada).
    expect(await (await publicView(subject.id, ana.cookie)).json()).toMatchObject({ visibility: "PRIVATE", isOwner: true });
  });

  it("aparece no perfil e na biblioteca pública apenas enquanto pública", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const subject = await seedSubject(ana.user.id);
    await seedSubject(ana.user.id, "Rascunho privado");
    await publish(ana.cookie, subject.id);

    const profile = await (await getProfile(jsonRequest("GET", "/x"), params({ userId: ana.user.id }))).json();
    expect(profile.subjects.map((entry: { title: string }) => entry.title)).toEqual(["Matemática Básica"]);

    const library = await (await listLibrary(jsonRequest("GET", "/api/library", { cookie: bruno.cookie }))).json();
    expect(library.items.map((entry: { title: string }) => entry.title)).toEqual(["Matemática Básica"]);
    const search = await (await listLibrary(jsonRequest("GET", "/api/library?q=apostila", { cookie: bruno.cookie }))).json();
    expect(search.items).toHaveLength(1);
    expect((await listLibrary(jsonRequest("GET", "/api/library"))).status).toBe(401);
  });

  it("só a dona publica; matéria sem aulas não é publicada; PATCH comum não altera a visibilidade", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const subject = await seedSubject(ana.user.id);

    expect((await publish(bruno.cookie, subject.id)).status).toBe(404);
    expect((await setVisibility(put(undefined, { visibility: "PUBLIC" }), params({ subjectId: subject.id }))).status).toBe(401);

    const empty = await prisma.subject.create({
      data: { title: "Vazia", instructor: "X", workloadHours: 0, status: "IN_PROGRESS", progress: 0, difficulty: 50, userId: ana.user.id },
    });
    expect((await publish(ana.cookie, empty.id)).status).toBe(412);

    const sneaky = await patchSubject(
      jsonRequest("PATCH", "/x", { cookie: ana.cookie, body: { visibility: "PUBLIC" } }),
      params({ subjectId: subject.id }),
    );
    expect(sneaky.status).toBe(400);
    expect((await prisma.subject.findUniqueOrThrow({ where: { id: subject.id } })).visibility).toBe("PRIVATE");
  });
});

describe("importação de matérias", () => {
  it("importa uma matéria pública com módulos, aulas e autoria, e a cópia funciona no estudo", async () => {
    const ana = await member("ana@exemplo.com", "Ana Souza");
    const bruno = await member("bruno@exemplo.com");
    const original = await seedSubject(ana.user.id);
    await publish(ana.cookie, original.id);

    const response = await doImport(bruno.cookie, original.id);
    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.alreadyImported).toBe(false);
    expect(result.subjectId).not.toBe(original.id);

    const copy = await (await getSubject(jsonRequest("GET", "/x", { cookie: bruno.cookie }), params({ subjectId: result.subjectId }))).json();
    expect(copy).toMatchObject({
      title: "Matemática Básica",
      visibility: "PRIVATE",
      progress: 0,
      status: "IN_PROGRESS",
      importedFrom: { originalId: original.id, originalAvailable: true, title: "Matemática Básica", authorId: ana.user.id, authorName: "Ana Souza" },
    });
    expect(copy.modules.map((entry: { title: string }) => entry.title)).toEqual(["Multiplicação"]);
    expect(copy.contents).toHaveLength(2);
    const lesson = copy.contents.find((content: { title: string }) => content.title === "Tabuada");
    expect(lesson).toMatchObject({ moduleTitle: "Multiplicação", body: "Texto completo da aula Tabuada", trainingQuestions: questions });
    expect(lesson.moduleId).toBe(copy.modules[0].id);

    // Recursos de estudo funcionam na cópia, com os dados do próprio usuário.
    const simulation = await generate(jsonRequest("POST", "/x", { cookie: bruno.cookie, body: { subjectId: result.subjectId } }));
    expect(simulation.status).toBe(201);
    // Reprocessar usa a IA de quem importou (sem provedor conectado, a operação é recusada antes de tudo).
    const reprocessed = await reprocess(jsonRequest("POST", "/x", { cookie: bruno.cookie, body: {} }), params({ contentId: lesson.id }));
    expect(reprocessed.status).toBe(412);

    const subjects = await (await listSubjects(jsonRequest("GET", "/api/subjects", { cookie: bruno.cookie }))).json();
    expect(subjects).toEqual([expect.objectContaining({ isImported: true, visibility: "PRIVATE" })]);

    expect(await importCount(original.id)).toBe(1);
    const view = await (await publicView(original.id, bruno.cookie)).json();
    expect(view).toMatchObject({ importCount: 1, importedCopyId: result.subjectId });
  });

  it("recusa matérias privadas, inexistentes, a própria e cópias importadas", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const carla = await member("carla@exemplo.com");
    const privateSubject = await seedSubject(ana.user.id);

    expect((await doImport(bruno.cookie, privateSubject.id)).status).toBe(404);
    expect((await doImport(bruno.cookie, "nao-existe")).status).toBe(404);
    expect((await doImport(undefined, privateSubject.id)).status).toBe(401);

    await publish(ana.cookie, privateSubject.id);
    expect((await doImport(ana.cookie, privateSubject.id)).status).toBe(409);

    const copy = await (await doImport(bruno.cookie, privateSubject.id)).json();
    // A cópia é privada e não é um original: não pode ser importada por terceiros.
    expect((await doImport(carla.cookie, copy.subjectId)).status).toBe(404);
    expect(await importCount(privateSubject.id)).toBe(1);
    expect(await prisma.subject.count({ where: { userId: carla.user.id } })).toBe(0);
  });

  it("não duplica a importação (inclusive simultânea) e conta cada usuário uma vez", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const carla = await member("carla@exemplo.com");
    const original = await seedSubject(ana.user.id);
    await publish(ana.cookie, original.id);

    const responses = await Promise.all(Array.from({ length: 6 }, () => doImport(bruno.cookie, original.id)));
    const results = await Promise.all(responses.map((response) => response.json()));
    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(responses.every((response) => [200, 201].includes(response.status))).toBe(true);
    expect(new Set(results.map((result: { subjectId: string }) => result.subjectId)).size).toBe(1);
    expect(await importCount(original.id)).toBe(1);

    const again = await doImport(bruno.cookie, original.id);
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ subjectId: results[0].subjectId, alreadyImported: true });

    await doImport(carla.cookie, original.id);
    expect(await importCount(original.id)).toBe(2);

    // O banco também recusa uma segunda cópia ativa do mesmo original para o mesmo usuário.
    await expect(
      prisma.subject.create({
        data: {
          title: "Cópia manual",
          instructor: "X",
          workloadHours: 0,
          status: "IN_PROGRESS",
          progress: 0,
          difficulty: 50,
          userId: bruno.user.id,
          isImported: true,
          importedFromId: original.id,
        },
      }),
    ).rejects.toThrow();
  });

  it("dá um nome livre à cópia quando já existe matéria com o mesmo título", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const original = await seedSubject(ana.user.id);
    await publish(ana.cookie, original.id);
    await seedSubject(bruno.user.id, "matemática básica");

    const result = await (await doImport(bruno.cookie, original.id)).json();
    const copy = await prisma.subject.findUniqueOrThrow({ where: { id: result.subjectId } });
    expect(copy.title).toBe("Matemática Básica (importada)");
  });

  it("excluir a cópia decrementa uma vez e preserva o original e as outras cópias", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const carla = await member("carla@exemplo.com");
    const original = await seedSubject(ana.user.id);
    await publish(ana.cookie, original.id);
    const brunoCopy = await (await doImport(bruno.cookie, original.id)).json();
    const carlaCopy = await (await doImport(carla.cookie, original.id)).json();
    expect(await importCount(original.id)).toBe(2);

    const target = params({ subjectId: brunoCopy.subjectId });
    expect((await deleteSubject(jsonRequest("DELETE", "/x", { cookie: bruno.cookie }), target)).status).toBe(200);
    expect((await deleteSubject(jsonRequest("DELETE", "/x", { cookie: bruno.cookie }), target)).status).toBe(404);
    expect(await importCount(original.id)).toBe(1);

    expect(await prisma.subject.findUnique({ where: { id: original.id } })).not.toBeNull();
    expect(await prisma.content.count({ where: { subjectId: original.id } })).toBe(2);
    expect(await prisma.subject.findUnique({ where: { id: carlaCopy.subjectId } })).not.toBeNull();

    // Sem cópia ativa, pode importar de novo (e volta a contar).
    expect((await doImport(bruno.cookie, original.id)).status).toBe(201);
    expect(await importCount(original.id)).toBe(2);
  });

  it("importação que falha não altera a contagem", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const original = await seedSubject(ana.user.id);
    await publish(ana.cookie, original.id);
    await prisma.rateLimitEvent.createMany({ data: Array.from({ length: 30 }, () => ({ key: `import:user:${bruno.user.id}` })) });

    expect((await doImport(bruno.cookie, original.id)).status).toBe(429);
    expect(await importCount(original.id)).toBe(0);
    expect(await prisma.subject.count({ where: { userId: bruno.user.id } })).toBe(0);
  });

  it("mudanças no original: cópias são independentes; privado ou excluído mantém a cópia sem link", async () => {
    const ana = await member("ana@exemplo.com", "Ana Souza");
    const bruno = await member("bruno@exemplo.com");
    const original = await seedSubject(ana.user.id);
    await publish(ana.cookie, original.id);
    const { subjectId } = await (await doImport(bruno.cookie, original.id)).json();
    const copyDetail = async () =>
      (await getSubject(jsonRequest("GET", "/x", { cookie: bruno.cookie }), params({ subjectId }))).json();

    // Editar o original não altera a cópia (é um retrato do momento da importação).
    await prisma.subject.update({ where: { id: original.id }, data: { title: "Matemática Avançada" } });
    await prisma.content.updateMany({ where: { subjectId: original.id }, data: { summary: "alterado" } });
    const afterEdit = await copyDetail();
    expect(afterEdit.title).toBe("Matemática Básica");
    expect(afterEdit.contents.every((content: { summary: string }) => content.summary !== "alterado")).toBe(true);

    // Original privado: a cópia continua, mas não oferece mais o link (e ninguém importa de novo).
    await setVisibility(put(ana.cookie, { visibility: "PRIVATE" }), params({ subjectId: original.id }));
    expect((await copyDetail()).importedFrom).toMatchObject({ originalAvailable: false, authorName: "Ana Souza" });
    const carla = await member("carla@exemplo.com");
    expect((await doImport(carla.cookie, original.id)).status).toBe(404);

    // Original excluído: a cópia continua com a autoria preservada.
    await deleteSubject(jsonRequest("DELETE", "/x", { cookie: ana.cookie }), params({ subjectId: original.id }));
    expect((await copyDetail()).importedFrom).toMatchObject({
      originalId: null,
      originalAvailable: false,
      title: "Matemática Básica",
      authorId: ana.user.id,
      authorName: "Ana Souza",
    });
  });
});

describe("bloqueio de republicação de matérias importadas", () => {
  async function importedCopy() {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const original = await seedSubject(ana.user.id);
    await publish(ana.cookie, original.id);
    const { subjectId } = await (await doImport(bruno.cookie, original.id)).json();
    return { bruno, subjectId, original };
  }

  it("recusa publicar a cópia pela rota de visibilidade", async () => {
    const { bruno, subjectId } = await importedCopy();
    const response = await publish(bruno.cookie, subjectId);
    expect(response.status).toBe(403);
    expect((await response.json()).message).toContain("Matérias importadas não podem ser publicadas");
    expect((await prisma.subject.findUniqueOrThrow({ where: { id: subjectId } })).visibility).toBe("PRIVATE");
  });

  it("não há rota alternativa: PATCH com visibilidade ou origem é recusado", async () => {
    const { bruno, subjectId } = await importedCopy();
    for (const body of [{ visibility: "PUBLIC" }, { isImported: false }, { importedFromId: null }, { title: "Nova", visibility: "PUBLIC" }]) {
      const response = await patchSubject(jsonRequest("PATCH", "/x", { cookie: bruno.cookie, body }), params({ subjectId }));
      expect(response.status).toBe(400);
    }
    // Renomear a cópia é permitido, mas ela continua importada e privada.
    await patchSubject(jsonRequest("PATCH", "/x", { cookie: bruno.cookie, body: { title: "Minha versão" } }), params({ subjectId }));
    expect(await publish(bruno.cookie, subjectId).then((response) => response.status)).toBe(403);
    expect(await prisma.subject.findUniqueOrThrow({ where: { id: subjectId } })).toMatchObject({
      title: "Minha versão",
      isImported: true,
      visibility: "PRIVATE",
    });
  });

  it("o banco recusa uma cópia pública mesmo fora da API, inclusive após excluir o original", async () => {
    const { subjectId, original } = await importedCopy();
    await expect(prisma.subject.update({ where: { id: subjectId }, data: { visibility: "PUBLIC" } })).rejects.toThrow();

    await prisma.subject.delete({ where: { id: original.id } });
    await expect(prisma.subject.update({ where: { id: subjectId }, data: { visibility: "PUBLIC" } })).rejects.toThrow();
    expect((await prisma.subject.findUniqueOrThrow({ where: { id: subjectId } })).isImported).toBe(true);
  });

  it("a cópia não tem página pública, nem para quem importou", async () => {
    const { bruno, subjectId } = await importedCopy();
    expect((await publicView(subjectId)).status).toBe(404);
    expect((await publicView(subjectId, bruno.cookie)).status).toBe(404);
  });
});
