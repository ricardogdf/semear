import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db";

import { GET as ranking } from "@/app/api/discover/[ranking]/route";

import { createUser, jsonRequest, params, resetDatabase, sessionCookieFor } from "./support/helpers";

beforeEach(resetDatabase);

async function member(email: string, name: string) {
  const user = await createUser({ email, name });
  return { user, cookie: await sessionCookieFor(user.id) };
}

async function rank(kind: string, cookie: string, page = 1) {
  const response = await ranking(jsonRequest("GET", `/api/discover/${kind}?page=${page}`, { cookie }), params({ ranking: kind }));
  return { status: response.status, body: await response.json() };
}

const titles = (body: { items: Array<{ title: string }> }) => body.items.map((item) => item.title);

async function subject(userId: string, title: string, options: { visibility?: "PUBLIC" | "PRIVATE"; publishedAt?: Date } = {}) {
  return prisma.subject.create({
    data: {
      title,
      instructor: "X",
      workloadHours: 0,
      status: "IN_PROGRESS",
      progress: 0,
      difficulty: 50,
      userId,
      visibility: options.visibility ?? "PUBLIC",
      publishedAt: options.visibility === "PRIVATE" ? null : (options.publishedAt ?? new Date()),
    },
  });
}

/** Simula a cópia criada por uma importação (mesmo formato que a importação grava). */
async function copyOf(original: { id: string; title: string; userId: string }, importerId: string) {
  return prisma.subject.create({
    data: {
      title: `${original.title} (cópia ${importerId.slice(-4)})`,
      instructor: "X",
      workloadHours: 0,
      status: "IN_PROGRESS",
      progress: 0,
      difficulty: 50,
      userId: importerId,
      isImported: true,
      importedFromId: original.id,
      importedFromOwnerId: original.userId,
      importedFromTitle: original.title,
      importedFromAuthorName: "Autor",
      importedAt: new Date(),
    },
  });
}

async function publication(userId: string, title: string, options: { visibility?: "PUBLIC" | "PRIVATE"; createdAt?: Date } = {}) {
  return prisma.publication.create({
    data: { type: "ARTICLE", title, authors: "Autores", userId, visibility: options.visibility ?? "PUBLIC", createdAt: options.createdAt },
  });
}

describe("Conheça: matérias mais importadas", () => {
  it("ordena pelas importações ativas, só com originais públicos, e desempata pela publicação mais recente", async () => {
    const ana = await member("ana@exemplo.com", "Ana");
    const readers = await Promise.all(["b", "c", "d"].map((letter) => member(`${letter}@exemplo.com`, letter.toUpperCase())));

    const algebra = await subject(ana.user.id, "Álgebra", { publishedAt: new Date("2026-01-01") });
    const biology = await subject(ana.user.id, "Biologia", { publishedAt: new Date("2026-03-01") });
    const chemistry = await subject(ana.user.id, "Química", { publishedAt: new Date("2026-02-01") });
    const hidden = await subject(ana.user.id, "Privada", { visibility: "PRIVATE" });
    await subject(ana.user.id, "Sem importações");

    for (const reader of readers) await copyOf(algebra, reader.user.id);
    await copyOf(biology, readers[0]!.user.id);
    await copyOf(chemistry, readers[1]!.user.id);
    // Uma matéria que ficou privada depois de importada não entra no ranking.
    await copyOf(hidden, readers[0]!.user.id);

    const { status, body } = await rank("subjects", readers[0]!.cookie);
    expect(status).toBe(200);
    expect(titles(body)).toEqual(["Álgebra", "Biologia", "Química"]);
    expect(body.items.map((item: { importCount: number }) => item.importCount)).toEqual([3, 1, 1]);
    // Cópias nunca aparecem como originais.
    expect(titles(body).some((title) => title.includes("cópia"))).toBe(false);
    // O ranking informa a cópia de quem está vendo, para oferecer "Abrir na biblioteca".
    expect(body.items[0].importedCopyId).not.toBeNull();
    expect(body.items[2].importedCopyId).toBeNull();
  });

  it("excluir cópias tira a matéria do topo; sem importações, o ranking fica vazio", async () => {
    const ana = await member("ana@exemplo.com", "Ana");
    const bruno = await member("bruno@exemplo.com", "Bruno");
    const algebra = await subject(ana.user.id, "Álgebra");
    const copy = await copyOf(algebra, bruno.user.id);
    expect(titles((await rank("subjects", ana.cookie)).body)).toEqual(["Álgebra"]);

    await prisma.subject.delete({ where: { id: copy.id } });
    expect((await rank("subjects", ana.cookie)).body).toMatchObject({ items: [], hasMore: false });
  });
});

describe("Conheça: publicações mais curtidas", () => {
  it("ordena por curtidas válidas, exclui privadas e desempata pelo cadastro mais recente", async () => {
    const ana = await member("ana@exemplo.com", "Ana");
    const fans = await Promise.all(["b", "c", "d"].map((letter) => member(`${letter}@exemplo.com`, letter.toUpperCase())));

    const old = await publication(ana.user.id, "Antiga", { createdAt: new Date("2025-01-01") });
    const recent = await publication(ana.user.id, "Recente", { createdAt: new Date("2026-01-01") });
    const top = await publication(ana.user.id, "Mais curtida");
    const hidden = await publication(ana.user.id, "Privada", { visibility: "PRIVATE" });
    await publication(ana.user.id, "Sem curtidas");

    for (const fan of fans) await prisma.publicationLike.create({ data: { userId: fan.user.id, publicationId: top.id } });
    for (const fan of fans) await prisma.publicationLike.create({ data: { userId: fan.user.id, publicationId: hidden.id } });
    await prisma.publicationLike.create({ data: { userId: fans[0]!.user.id, publicationId: old.id } });
    await prisma.publicationLike.create({ data: { userId: fans[0]!.user.id, publicationId: recent.id } });

    const { body } = await rank("publications", fans[0]!.cookie);
    expect(titles(body)).toEqual(["Mais curtida", "Recente", "Antiga"]);
    expect(body.items.map((item: { likeCount: number }) => item.likeCount)).toEqual([3, 1, 1]);
    expect(body.items.every((item: { likedByMe: boolean }) => item.likedByMe)).toBe(true);
    expect(JSON.stringify(body)).not.toContain("import");
  });
});

describe("Conheça: perfis com mais seguidores", () => {
  it("ordena por seguidores reais, desempata pelo cadastro e omite contas desativadas", async () => {
    const people = [];
    for (const name of ["Ana", "Bruno", "Carla", "Davi", "Eva"]) {
      people.push(await member(`${name.toLowerCase()}@exemplo.com`, name));
    }
    const [ana, bruno, carla, davi, eva] = people as [typeof people[0], typeof people[0], typeof people[0], typeof people[0], typeof people[0]];
    const followers = (target: typeof ana, ...sources: Array<typeof ana>) =>
      prisma.follow.createMany({ data: sources.map((source) => ({ followerId: source.user.id, followingId: target.user.id })) });

    await followers(carla, ana, bruno, davi);
    await followers(bruno, ana);
    await followers(davi, eva);
    await followers(eva, ana, bruno, carla, davi);
    await prisma.user.update({ where: { id: eva.user.id }, data: { isActive: false } });

    const { body } = await rank("profiles", ana.cookie);
    expect(body.items.map((item: { displayName: string }) => item.displayName)).toEqual(["Carla", "Bruno", "Davi"]);
    expect(body.items.map((item: { followerCount: number }) => item.followerCount)).toEqual([3, 1, 1]);
    expect(body.items.map((item: { isFollowing: boolean }) => item.isFollowing)).toEqual([true, true, false]);
    expect(JSON.stringify(body)).not.toContain("@exemplo.com");
  });

  it("pagina com ordem consistente entre as páginas", async () => {
    const viewer = await member("viewer@exemplo.com", "Viewer");
    const stars = [];
    for (let index = 0; index < 14; index += 1) {
      stars.push(await member(`star${index}@exemplo.com`, `Star ${index}`));
    }
    for (const star of stars) {
      await prisma.follow.create({ data: { followerId: viewer.user.id, followingId: star.user.id } });
    }

    const first = await rank("profiles", viewer.cookie, 1);
    const second = await rank("profiles", viewer.cookie, 2);
    expect(first.body).toMatchObject({ hasMore: true });
    expect(second.body).toMatchObject({ hasMore: false });
    const ids = [...first.body.items, ...second.body.items].map((item: { id: string }) => item.id);
    // Todos empatados com 1 seguidor: a ordem segue o cadastro, sem repetir nem pular ninguém.
    expect(ids).toEqual(stars.map((star) => star.user.id));
  });
});

describe("Conheça: regras gerais", () => {
  it("sem dados, os três rankings vêm vazios (nada fictício)", async () => {
    const ana = await member("ana@exemplo.com", "Ana");
    await subject(ana.user.id, "Pública sem importações");
    await publication(ana.user.id, "Sem curtidas");
    for (const kind of ["subjects", "publications", "profiles"]) {
      expect((await rank(kind, ana.cookie)).body).toEqual({ items: [], page: 1, pageSize: 12, hasMore: false });
    }
  });

  it("exige sessão e recusa rankings desconhecidos", async () => {
    const ana = await member("ana@exemplo.com", "Ana");
    const anonymous = await ranking(jsonRequest("GET", "/api/discover/subjects"), params({ ranking: "subjects" }));
    expect(anonymous.status).toBe(401);
    expect((await rank("emails", ana.cookie)).status).toBe(404);
  });
});
