import { beforeEach, describe, expect, it } from "vitest";

import { bootstrapAdmin, prisma } from "@/server/db";

import { GET as dashboard } from "@/app/api/dashboard/route";
import { PATCH as updateUser } from "@/app/api/admin/users/[userId]/route";
import { POST as issueCode } from "@/app/api/admin/users/[userId]/setup-code/route";
import { GET as listUsers, POST as createUser_ } from "@/app/api/admin/users/route";
import { POST as firstAccess } from "@/app/api/auth/first-access/route";

import { createUser, jsonRequest, params, resetDatabase, sessionCookieFor } from "./support/helpers";

beforeEach(resetDatabase);

async function setup() {
  const admin = await createUser({ email: "admin@exemplo.com", role: "ADMIN" });
  const user = await createUser({ email: "user@exemplo.com" });
  return {
    admin,
    user,
    adminCookie: await sessionCookieFor(admin.id),
    userCookie: await sessionCookieFor(user.id),
  };
}

describe("endpoints administrativos", () => {
  it("usuário comum recebe 403 em todos os endpoints administrativos", async () => {
    const { user, admin, userCookie } = await setup();

    expect((await listUsers(jsonRequest("GET", "/api/admin/users", { cookie: userCookie }))).status).toBe(403);
    expect((await createUser_(jsonRequest("POST", "/api/admin/users", {
      cookie: userCookie,
      body: { name: "Intruso", email: "x@exemplo.com", role: "ADMIN" },
    }))).status).toBe(403);
    expect((await updateUser(jsonRequest("PATCH", `/api/admin/users/${user.id}`, { cookie: userCookie, body: { role: "ADMIN" } }), params({ userId: user.id }))).status).toBe(403);
    expect((await issueCode(jsonRequest("POST", `/api/admin/users/${admin.id}/setup-code`, { cookie: userCookie }), params({ userId: admin.id }))).status).toBe(403);

    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("USER");
    expect(await prisma.user.count()).toBe(2);
  });

  it("sem sessão: 401", async () => {
    expect((await listUsers(jsonRequest("GET", "/api/admin/users"))).status).toBe(401);
  });

  it("administrador cria usuário sem conhecer a senha; o usuário define a própria", async () => {
    const { adminCookie } = await setup();

    const response = await createUser_(jsonRequest("POST", "/api/admin/users", {
      cookie: adminCookie,
      body: { name: "Bruno Lima", email: "Bruno@Exemplo.com", role: "USER" },
    }));
    expect(response.status).toBe(201);
    const { userId, setupCode } = await response.json();

    const created = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(created.email).toBe("bruno@exemplo.com");
    expect(created.passwordHash).toBeNull();
    expect(await prisma.passwordSetupToken.count({ where: { userId, tokenHash: setupCode } })).toBe(0);

    const setupResponse = await firstAccess(jsonRequest("POST", "/api/auth/first-access", {
      body: { email: "bruno@exemplo.com", code: setupCode, password: "senha-do-bruno-1", confirmPassword: "senha-do-bruno-1" },
    }));
    expect(setupResponse.status).toBe(200);
  });

  it("recusa e-mail duplicado e dados inválidos", async () => {
    const { adminCookie } = await setup();
    const duplicate = await createUser_(jsonRequest("POST", "/api/admin/users", {
      cookie: adminCookie,
      body: { name: "Outro", email: "user@exemplo.com" },
    }));
    expect(duplicate.status).toBe(409);

    const invalid = await createUser_(jsonRequest("POST", "/api/admin/users", {
      cookie: adminCookie,
      body: { name: "X", email: "nao-e-email", role: "SUPERUSER" },
    }));
    expect(invalid.status).toBe(400);
  });

  it("desativar conta invalida as sessões ativas imediatamente", async () => {
    const { user, userCookie, adminCookie } = await setup();
    expect((await dashboard(jsonRequest("GET", "/api/dashboard", { cookie: userCookie }))).status).toBe(200);

    const response = await updateUser(
      jsonRequest("PATCH", `/api/admin/users/${user.id}`, { cookie: adminCookie, body: { isActive: false } }),
      params({ userId: user.id }),
    );
    expect(response.status).toBe(200);
    expect((await dashboard(jsonRequest("GET", "/api/dashboard", { cookie: userCookie }))).status).toBe(401);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it("administrador não altera o próprio papel nem se desativa", async () => {
    const { admin, adminCookie } = await setup();
    for (const body of [{ role: "USER" }, { isActive: false }]) {
      const response = await updateUser(jsonRequest("PATCH", `/api/admin/users/${admin.id}`, { cookie: adminCookie, body }), params({ userId: admin.id }));
      expect(response.status).toBe(403);
    }
  });

  it("impede deixar o sistema sem administrador ativo (inclusive com operações simultâneas)", async () => {
    const { admin, adminCookie } = await setup();
    const second = await createUser({ email: "admin2@exemplo.com", role: "ADMIN" });
    const secondCookie = await sessionCookieFor(second.id);

    // Dois administradores tentam rebaixar um ao outro ao mesmo tempo.
    const [first, other] = await Promise.all([
      updateUser(jsonRequest("PATCH", `/api/admin/users/${admin.id}`, { cookie: secondCookie, body: { role: "USER" } }), params({ userId: admin.id })),
      updateUser(jsonRequest("PATCH", `/api/admin/users/${second.id}`, { cookie: adminCookie, body: { isActive: false } }), params({ userId: second.id })),
    ]);

    expect([first.status, other.status].filter((status) => status === 200).length).toBeLessThanOrEqual(1);
    expect(await prisma.user.count({ where: { role: "ADMIN", isActive: true } })).toBeGreaterThanOrEqual(1);
  });

  it("rebaixar outro administrador é permitido enquanto restar um ativo", async () => {
    const { admin } = await setup();
    const second = await createUser({ email: "admin2@exemplo.com", role: "ADMIN" });
    const response = await updateUser(
      jsonRequest("PATCH", `/api/admin/users/${admin.id}`, { cookie: await sessionCookieFor(second.id), body: { role: "USER" } }),
      params({ userId: admin.id }),
    );
    expect(response.status).toBe(200);
    expect(await prisma.user.count({ where: { role: "ADMIN", isActive: true } })).toBe(1);
  });

  it("rejeita campos não permitidos no PATCH (sem atribuição em massa)", async () => {
    const { user, adminCookie } = await setup();
    const response = await updateUser(
      jsonRequest("PATCH", `/api/admin/users/${user.id}`, { cookie: adminCookie, body: { passwordHash: "x", email: "y@z.com" } }),
      params({ userId: user.id }),
    );
    expect(response.status).toBe(400);
  });
});

describe("inicialização do primeiro administrador", () => {
  it("cria o primeiro admin uma única vez", async () => {
    const first = await bootstrapAdmin({ email: "root@exemplo.com", name: "Root" });
    expect(first.created).toBe(true);
    expect(first.code).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){4}$/);

    await expect(bootstrapAdmin({ email: "outro@exemplo.com", name: "Outro" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await prisma.user.count({ where: { role: "ADMIN" } })).toBe(1);
  });

  it("permite reemitir o código de um admin existente (recuperação pelo servidor)", async () => {
    await bootstrapAdmin({ email: "root@exemplo.com", name: "Root" });
    const reissued = await bootstrapAdmin({ email: "root@exemplo.com", reissue: true });
    expect(reissued.created).toBe(false);
    expect(await prisma.passwordSetupToken.count({ where: { usedAt: null } })).toBe(1);
  });
});
