import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db";

import { GET as listFollowing } from "@/app/api/following/route";
import { GET as getOwnProfile, PATCH as patchProfile } from "@/app/api/profile/route";
import { DELETE as unfollow, PUT as follow } from "@/app/api/users/[userId]/follow/route";
import { GET as getProfile } from "@/app/api/users/[userId]/route";
import { GET as searchUsers } from "@/app/api/users/route";

import { createUser, jsonRequest, params, resetDatabase, sessionCookieFor } from "./support/helpers";

beforeEach(resetDatabase);

async function member(email: string, profile: { name?: string; institution?: string; course?: string; displayName?: string } = {}) {
  const user = await createUser({ email, name: profile.name });
  if (profile.institution || profile.course || profile.displayName) {
    await prisma.user.update({
      where: { id: user.id },
      data: { institution: profile.institution, course: profile.course, displayName: profile.displayName },
    });
  }
  return { user, cookie: await sessionCookieFor(user.id) };
}

const get = (path: string, cookie?: string) => jsonRequest("GET", path, { cookie });
const put = (cookie?: string, body?: unknown) => jsonRequest("PUT", "/x", { cookie, body });
const del = (cookie?: string) => jsonRequest("DELETE", "/x", { cookie });

async function profileOf(userId: string, cookie?: string) {
  return getProfile(get(`/api/users/${userId}`, cookie), params({ userId }));
}

describe("perfil acadêmico público", () => {
  it("abre sem login e não expõe e-mail, papel nem dados da conta", async () => {
    const ana = await member("ana.secreta@exemplo.com", { name: "Ana Souza", institution: "UFMG", course: "Biologia" });
    await prisma.user.update({ where: { id: ana.user.id }, data: { bio: "Pesquisa ecologia.", role: "ADMIN" } });

    const response = await profileOf(ana.user.id);
    expect(response.status).toBe(200);
    const profile = await response.json();
    expect(profile).toMatchObject({
      id: ana.user.id,
      displayName: "Ana Souza",
      institution: "UFMG",
      course: "Biologia",
      bio: "Pesquisa ecologia.",
      followerCount: 0,
      followingCount: 0,
      isFollowing: false,
      isSelf: false,
      subjects: [],
      publications: [],
    });
    const raw = JSON.stringify(profile);
    for (const secret of ["ana.secreta@exemplo.com", "ADMIN", "passwordHash", "scrypt", "lastLoginAt"]) {
      expect(raw).not.toContain(secret);
    }
  });

  it("perfil de conta desativada ou inexistente responde 404", async () => {
    const ana = await member("ana@exemplo.com");
    await prisma.user.update({ where: { id: ana.user.id }, data: { isActive: false } });
    expect((await profileOf(ana.user.id)).status).toBe(404);
    expect((await profileOf("nao-existe")).status).toBe(404);
  });

  it("o próprio usuário edita o perfil; o nome de exibição substitui o nome da conta", async () => {
    const ana = await member("ana@exemplo.com", { name: "Ana Maria Souza" });

    const response = await patchProfile(
      jsonRequest("PATCH", "/api/profile", {
        cookie: ana.cookie,
        body: { displayName: "Ana S.", bio: "Estudante de biologia.", institution: "UFMG", course: "Biologia", avatarUrl: "https://exemplo.com/foto.png" },
      }),
    );
    expect(response.status).toBe(200);

    const profile = await (await profileOf(ana.user.id)).json();
    expect(profile).toMatchObject({ displayName: "Ana S.", bio: "Estudante de biologia.", avatarUrl: "https://exemplo.com/foto.png" });

    // Campo vazio limpa o valor.
    await patchProfile(jsonRequest("PATCH", "/api/profile", { cookie: ana.cookie, body: { displayName: "", bio: "" } }));
    const own = await (await getOwnProfile(get("/api/profile", ana.cookie))).json();
    expect(own).toMatchObject({ name: "Ana Maria Souza", displayName: null, bio: null, institution: "UFMG" });
  });

  it("recusa campos não permitidos e URLs de foto inseguras", async () => {
    const ana = await member("ana@exemplo.com");
    const patch = (body: unknown) => patchProfile(jsonRequest("PATCH", "/api/profile", { cookie: ana.cookie, body }));

    // Não há como alterar outro usuário, e-mail ou papel pelo perfil.
    expect((await patch({ id: "outro", displayName: "X" })).status).toBe(400);
    expect((await patch({ email: "novo@exemplo.com" })).status).toBe(400);
    expect((await patch({ role: "ADMIN" })).status).toBe(400);
    expect((await patch({ avatarUrl: "javascript:alert(1)" })).status).toBe(400);
    expect((await patch({ avatarUrl: "http://exemplo.com/foto.png" })).status).toBe(400);
    expect((await patch({ avatarUrl: "https://user:senha@exemplo.com/foto.png" })).status).toBe(400);
    expect((await patch({ bio: "x".repeat(501) })).status).toBe(400);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: ana.user.id } });
    expect(stored).toMatchObject({ role: "USER", email: "ana@exemplo.com", avatarUrl: null });
  });

  it("editar o perfil exige sessão", async () => {
    const response = await patchProfile(jsonRequest("PATCH", "/api/profile", { body: { displayName: "X" } }));
    expect(response.status).toBe(401);
  });
});

describe("pesquisa de usuários", () => {
  it("encontra por nome, filtra por instituição e curso e informa quem o visitante segue", async () => {
    const ana = await member("ana@exemplo.com", { name: "Ana Souza", institution: "UFMG", course: "Biologia" });
    const bruno = await member("bruno@exemplo.com", { name: "Bruno Lima", institution: "USP", course: "Biologia" });
    await member("bia@exemplo.com", { name: "Beatriz Souza", institution: "UFMG", course: "Direito" });
    await follow(put(ana.cookie), params({ userId: bruno.user.id }));

    const search = async (query: string) =>
      (await searchUsers(get(`/api/users?${query}`, ana.cookie))).json();

    const bySurname = await search("q=souza");
    expect(bySurname.items.map((user: { displayName: string }) => user.displayName)).toEqual(["Ana Souza", "Beatriz Souza"]);
    expect(bySurname.items[0]).toMatchObject({ isSelf: true });

    const biology = await search("course=biologia");
    expect(biology.items.map((user: { displayName: string }) => user.displayName)).toEqual(["Ana Souza", "Bruno Lima"]);
    expect(biology.items[1]).toMatchObject({ isFollowing: true, followerCount: 1 });

    const ufmgLaw = await search("institution=ufmg&course=direito");
    expect(ufmgLaw.items.map((user: { displayName: string }) => user.displayName)).toEqual(["Beatriz Souza"]);

    expect((await search("q=ninguem")).items).toEqual([]);
    expect(JSON.stringify(biology)).not.toContain("@exemplo.com");
  });

  it("quem tem nome de exibição não é encontrado pelo nome da conta", async () => {
    const ana = await member("ana@exemplo.com");
    await member("carla@exemplo.com", { name: "Carla Nome Civil", displayName: "Carla Bio" });

    const byPrivate = await (await searchUsers(get("/api/users?q=civil", ana.cookie))).json();
    expect(byPrivate.items).toEqual([]);
    const byPublic = await (await searchUsers(get("/api/users?q=bio", ana.cookie))).json();
    expect(byPublic.items.map((user: { displayName: string }) => user.displayName)).toEqual(["Carla Bio"]);
  });

  it("pagina com ordem estável e não lista contas desativadas", async () => {
    const ana = await member("ana@exemplo.com", { name: "Aluno 00" });
    for (let index = 1; index <= 13; index += 1) {
      await member(`aluno${index}@exemplo.com`, { name: `Aluno ${String(index).padStart(2, "0")}` });
    }
    const inactive = await member("inativo@exemplo.com", { name: "Aluno Inativo" });
    await prisma.user.update({ where: { id: inactive.user.id }, data: { isActive: false } });

    const first = await (await searchUsers(get("/api/users?q=aluno", ana.cookie))).json();
    const second = await (await searchUsers(get("/api/users?q=aluno&page=2", ana.cookie))).json();
    expect(first).toMatchObject({ page: 1, pageSize: 12, hasMore: true });
    expect(second).toMatchObject({ page: 2, hasMore: false });
    const names = [...first.items, ...second.items].map((user: { displayName: string }) => user.displayName);
    expect(names).toHaveLength(14);
    expect(new Set(names).size).toBe(14);
    expect(names).not.toContain("Aluno Inativo");
  });

  it("exige sessão, valida parâmetros e limita abusos", async () => {
    const ana = await member("ana@exemplo.com");
    expect((await searchUsers(get("/api/users?q=ana"))).status).toBe(401);
    expect((await searchUsers(get(`/api/users?q=${"a".repeat(81)}`, ana.cookie))).status).toBe(400);
    expect((await searchUsers(get("/api/users?page=0", ana.cookie))).status).toBe(400);

    await prisma.rateLimitEvent.createMany({ data: Array.from({ length: 60 }, () => ({ key: `search:user:${ana.user.id}` })) });
    expect((await searchUsers(get("/api/users?q=ana", ana.cookie))).status).toBe(429);
  });
});

describe("seguir usuários", () => {
  it("segue e deixa de seguir, atualizando as contagens dos dois perfis", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const target = params({ userId: bruno.user.id });

    const followed = await follow(put(ana.cookie), target);
    expect(followed.status).toBe(200);
    expect(await followed.json()).toEqual({ isFollowing: true, followerCount: 1 });

    expect(await (await profileOf(bruno.user.id, ana.cookie)).json()).toMatchObject({ followerCount: 1, isFollowing: true });
    expect(await (await profileOf(ana.user.id, ana.cookie)).json()).toMatchObject({ followingCount: 1, isSelf: true });
    // Visitante anônimo vê a contagem, mas nunca "seguindo".
    expect(await (await profileOf(bruno.user.id)).json()).toMatchObject({ followerCount: 1, isFollowing: false });

    const unfollowed = await unfollow(del(ana.cookie), target);
    expect(await unfollowed.json()).toEqual({ isFollowing: false, followerCount: 0 });
    // Repetir não muda nada.
    expect(await (await unfollow(del(ana.cookie), target)).json()).toEqual({ isFollowing: false, followerCount: 0 });
    expect(await prisma.follow.count()).toBe(0);
  });

  it("não segue a si mesmo, nem pela API nem direto no banco", async () => {
    const ana = await member("ana@exemplo.com");
    const response = await follow(put(ana.cookie), params({ userId: ana.user.id }));
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe("Você não pode seguir a si mesmo.");

    await expect(prisma.follow.create({ data: { followerId: ana.user.id, followingId: ana.user.id } })).rejects.toThrow();
    expect(await prisma.follow.count()).toBe(0);
  });

  it("não cria relações duplicadas, mesmo com requisições simultâneas", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const target = params({ userId: bruno.user.id });

    const responses = await Promise.all(Array.from({ length: 8 }, () => follow(put(ana.cookie), target)));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(await prisma.follow.count({ where: { followingId: bruno.user.id } })).toBe(1);

    await expect(prisma.follow.create({ data: { followerId: ana.user.id, followingId: bruno.user.id } })).rejects.toThrow();
  });

  it("o seguidor é sempre o usuário da sessão (ignora identificadores enviados pelo cliente)", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    const carla = await member("carla@exemplo.com");

    await follow(put(ana.cookie, { followerId: carla.user.id }), params({ userId: bruno.user.id }));
    const relation = await prisma.follow.findFirstOrThrow();
    expect(relation).toMatchObject({ followerId: ana.user.id, followingId: bruno.user.id });
  });

  it("exige sessão e não segue contas inexistentes ou desativadas", async () => {
    const ana = await member("ana@exemplo.com");
    const bruno = await member("bruno@exemplo.com");
    expect((await follow(put(), params({ userId: bruno.user.id }))).status).toBe(401);
    expect((await follow(put(ana.cookie), params({ userId: "nao-existe" }))).status).toBe(404);
    await prisma.user.update({ where: { id: bruno.user.id }, data: { isActive: false } });
    expect((await follow(put(ana.cookie), params({ userId: bruno.user.id }))).status).toBe(404);
  });

  it("cada usuário vê apenas a própria lista de pessoas seguidas", async () => {
    const ana = await member("ana@exemplo.com", { name: "Ana", institution: "UFMG", course: "Biologia" });
    const bruno = await member("bruno@exemplo.com", { name: "Bruno" });
    const carla = await member("carla@exemplo.com", { name: "Carla" });
    await follow(put(ana.cookie), params({ userId: bruno.user.id }));
    await follow(put(ana.cookie), params({ userId: carla.user.id }));
    await follow(put(bruno.cookie), params({ userId: ana.user.id }));

    const anaList = await (await listFollowing(get("/api/following", ana.cookie))).json();
    expect(anaList.items.map((user: { displayName: string }) => user.displayName).sort()).toEqual(["Bruno", "Carla"]);
    expect(anaList.items.every((user: { isFollowing: boolean }) => user.isFollowing)).toBe(true);

    // Parâmetros de outro usuário são ignorados: a lista é sempre a da sessão.
    const brunoList = await (await listFollowing(get(`/api/following?userId=${ana.user.id}`, bruno.cookie))).json();
    expect(brunoList.items).toEqual([expect.objectContaining({ displayName: "Ana", institution: "UFMG", course: "Biologia" })]);

    expect((await (await listFollowing(get("/api/following", carla.cookie))).json()).items).toEqual([]);
    expect((await listFollowing(get("/api/following"))).status).toBe(401);
  });
});
