import { readdirSync, statSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db";

import { POST as importSubject } from "@/app/api/library/[subjectId]/import/route";
import { DELETE as unlike, PUT as like } from "@/app/api/publications/[publicationId]/like/route";
import * as publicationRoute from "@/app/api/publications/[publicationId]/route";
import { GET as listPublications, POST as createPublication } from "@/app/api/publications/route";
import { GET as getProfile } from "@/app/api/users/[userId]/route";

import { createUser, jsonRequest, params, resetDatabase, sessionCookieFor } from "./support/helpers";

const { DELETE: deletePublication, GET: getPublication, PATCH: patchPublication } = publicationRoute;

beforeEach(resetDatabase);

async function member(email: string, name?: string) {
  const user = await createUser({ email, name });
  return { user, cookie: await sessionCookieFor(user.id) };
}

const article = {
  type: "ARTICLE",
  title: "Fotossíntese em plantas C4",
  authors: "Ana Souza; Bruno Lima",
  abstract: "Estudo comparativo da fixação de carbono.",
  institution: "UFMG",
  publishedOn: "2025-06-30",
  externalUrl: "https://repositorio.exemplo.edu/handle/123",
  visibility: "PUBLIC",
};

async function create(cookie: string, overrides: Record<string, unknown> = {}) {
  const response = await createPublication(jsonRequest("POST", "/api/publications", { cookie, body: { ...article, ...overrides } }));
  expect(response.status).toBe(201);
  return response.json();
}

const view = (publicationId: string, cookie?: string) =>
  getPublication(jsonRequest("GET", "/x", { cookie }), params({ publicationId }));
const put = (cookie?: string, body?: unknown) => jsonRequest("PUT", "/x", { cookie, body });
const del = (cookie?: string) => jsonRequest("DELETE", "/x", { cookie });

describe("publicações acadêmicas", () => {
  it("cadastra e exibe publicação pública sem login, com metadados e sem dados da conta", async () => {
    const ana = await member("ana@exemplo.com", "Ana Souza");
    const created = await create(ana.cookie);

    const response = await view(created.id);
    expect(response.status).toBe(200);
    const publication = await response.json();
    expect(publication).toMatchObject({
      ...article,
      owner: { id: ana.user.id, displayName: "Ana Souza" },
      likeCount: 0,
      likedByMe: false,
      isOwner: false,
    });
    expect(JSON.stringify(publication)).not.toContain("ana@exemplo.com");

    const profile = await (await getProfile(jsonRequest("GET", "/x"), params({ userId: ana.user.id }))).json();
    expect(profile.publications.map((entry: { title: string }) => entry.title)).toEqual([article.title]);
  });

  it("não inventa metadados ausentes", async () => {
    const ana = await member("ana@exemplo.com");
    const created = await create(ana.cookie, { type: "TCC", abstract: "", institution: "", publishedOn: "", externalUrl: "" });
    expect(created).toMatchObject({ type: "TCC", abstract: "", institution: null, publishedOn: null, externalUrl: null });
  });

  it("publicação privada só é vista por quem a cadastrou", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const created = await create(ana.cookie, { visibility: "PRIVATE" });

    expect((await view(created.id)).status).toBe(404);
    expect((await view(created.id, bruno.cookie)).status).toBe(404);
    expect(await (await view(created.id, ana.cookie)).json()).toMatchObject({ isOwner: true, visibility: "PRIVATE" });

    const list = await (await listPublications(jsonRequest("GET", "/api/publications", { cookie: bruno.cookie }))).json();
    expect(list.items).toEqual([]);
    const profile = await (await getProfile(jsonRequest("GET", "/x"), params({ userId: ana.user.id }))).json();
    expect(profile.publications).toEqual([]);
    const mine = await (await listPublications(jsonRequest("GET", "/api/publications?mine=1", { cookie: ana.cookie }))).json();
    expect(mine).toHaveLength(1);
  });

  it("valida os campos e recusa links inseguros", async () => {
    const ana = await member("ana@exemplo.com");
    const send = (body: unknown) => createPublication(jsonRequest("POST", "/api/publications", { cookie: ana.cookie, body }));

    expect((await send({ ...article, externalUrl: "javascript:alert(1)" })).status).toBe(400);
    expect((await send({ ...article, externalUrl: "ftp://exemplo.com/a.pdf" })).status).toBe(400);
    expect((await send({ ...article, publishedOn: "2024-02-31" })).status).toBe(400);
    expect((await send({ ...article, type: "MATERIA" })).status).toBe(400);
    expect((await send({ ...article, title: "" })).status).toBe(400);
    expect((await send({ ...article, userId: "outro" })).status).toBe(400);
    expect((await send(article)).status).toBe(201);
    expect((await createPublication(jsonRequest("POST", "/api/publications", { body: article }))).status).toBe(401);
  });

  it("só quem cadastrou edita ou exclui", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const created = await create(ana.cookie);
    const target = params({ publicationId: created.id });

    const hijack = await patchPublication(jsonRequest("PATCH", "/x", { cookie: bruno.cookie, body: { title: "Roubada" } }), target);
    expect(hijack.status).toBe(404);
    expect((await deletePublication(del(bruno.cookie), target)).status).toBe(404);

    const edited = await patchPublication(jsonRequest("PATCH", "/x", { cookie: ana.cookie, body: { title: "Título revisado" } }), target);
    // Edição parcial: os campos não enviados continuam como estavam.
    expect(await edited.json()).toMatchObject({
      title: "Título revisado",
      authors: article.authors,
      institution: article.institution,
      publishedOn: article.publishedOn,
      externalUrl: article.externalUrl,
    });

    expect((await deletePublication(del(ana.cookie), target)).status).toBe(200);
    expect((await view(created.id)).status).toBe(404);
  });
});

describe("curtidas", () => {
  it("curte e remove a curtida, com a contagem real", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const carla = await member("carla@exemplo.com");
    const created = await create(ana.cookie);
    const target = params({ publicationId: created.id });

    expect(await (await like(put(bruno.cookie), target)).json()).toEqual({ liked: true, likeCount: 1 });
    expect(await (await like(put(carla.cookie), target)).json()).toEqual({ liked: true, likeCount: 2 });
    expect(await (await view(created.id, bruno.cookie)).json()).toMatchObject({ likeCount: 2, likedByMe: true });
    expect(await (await view(created.id)).json()).toMatchObject({ likeCount: 2, likedByMe: false });

    expect(await (await unlike(del(bruno.cookie), target)).json()).toEqual({ liked: false, likeCount: 1 });
    expect(await (await unlike(del(bruno.cookie), target)).json()).toEqual({ liked: false, likeCount: 1 });
    expect(await prisma.publicationLike.count()).toBe(1);
  });

  it("uma curtida por usuário por publicação, mesmo com requisições simultâneas", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const first = await create(ana.cookie);
    const second = await create(ana.cookie, { title: "Outro artigo" });

    const responses = await Promise.all(Array.from({ length: 8 }, () => like(put(bruno.cookie), params({ publicationId: first.id }))));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(await prisma.publicationLike.count({ where: { publicationId: first.id } })).toBe(1);

    // Publicações diferentes podem ser curtidas pela mesma pessoa.
    await like(put(bruno.cookie), params({ publicationId: second.id }));
    expect(await prisma.publicationLike.count({ where: { userId: bruno.user.id } })).toBe(2);

    await expect(prisma.publicationLike.create({ data: { userId: bruno.user.id, publicationId: first.id } })).rejects.toThrow();
  });

  it("quem curte é o usuário da sessão; exige login; recusa conteúdo inexistente ou privado", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const carla = await member("carla@exemplo.com");
    const created = await create(ana.cookie);
    const hidden = await create(ana.cookie, { visibility: "PRIVATE" });

    await like(put(bruno.cookie, { userId: carla.user.id }), params({ publicationId: created.id }));
    expect(await prisma.publicationLike.findFirstOrThrow()).toMatchObject({ userId: bruno.user.id });

    expect((await like(put(), params({ publicationId: created.id }))).status).toBe(401);
    expect((await like(put(bruno.cookie), params({ publicationId: "nao-existe" }))).status).toBe(404);
    expect((await like(put(bruno.cookie), params({ publicationId: hidden.id }))).status).toBe(404);
    expect(await prisma.publicationLike.count()).toBe(1);
  });

  it("curtir não cria cópias nem altera importações", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const created = await create(ana.cookie);
    await like(put(bruno.cookie), params({ publicationId: created.id }));
    expect(await prisma.subject.count()).toBe(0);
  });
});

describe("publicações nunca são importadas", () => {
  it("a rota de importação procura só matérias: o id de uma publicação dá 404 e nada é criado", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const created = await create(ana.cookie);

    const response = await importSubject(jsonRequest("POST", "/x", { cookie: bruno.cookie }), params({ subjectId: created.id }));
    expect(response.status).toBe(404);
    expect(await prisma.subject.count()).toBe(0);
  });

  it("nenhuma rota de publicação oferece importação", async () => {
    // A rota da publicação só expõe leitura, edição e exclusão pelo dono.
    expect(Object.keys(publicationRoute).sort()).toEqual(["DELETE", "GET", "PATCH"]);

    // Não existe nenhum endpoint de importação sob /api/publications.
    const root = path.join(process.cwd(), "app", "api", "publications");
    const routes: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else routes.push(path.relative(root, full).replaceAll("\\", "/"));
      }
    };
    walk(root);
    expect(routes.sort()).toEqual(["[publicationId]/like/route.ts", "[publicationId]/route.ts", "route.ts"]);
    expect(routes.some((route) => route.includes("import"))).toBe(false);
  });

  it("PATCH não transforma uma publicação em matéria", async () => {
    const ana = await member("ana@exemplo.com");
    const created = await create(ana.cookie);
    const response = await patchPublication(
      jsonRequest("PATCH", "/x", { cookie: ana.cookie, body: { type: "SUBJECT" } }),
      params({ publicationId: created.id }),
    );
    expect(response.status).toBe(400);
  });
});
