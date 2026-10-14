import { beforeEach, describe, expect, it } from "vitest";

import { issueSetupCode, prisma } from "@/server/db";

import { POST as firstAccess } from "@/app/api/auth/first-access/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as dashboard } from "@/app/api/dashboard/route";

import { createUser, extractSessionCookie, jsonRequest, resetDatabase, sessionCookieFor, TEST_PASSWORD } from "./support/helpers";

beforeEach(resetDatabase);

describe("login", () => {
  it("login válido cria sessão com cookie HttpOnly e SameSite=Lax", async () => {
    await createUser({ email: "ana@exemplo.com" });
    const response = await login(jsonRequest("POST", "/api/auth/login", { body: { email: "ANA@exemplo.com ", password: TEST_PASSWORD } }));

    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/semear_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);

    const cookie = extractSessionCookie(response)!;
    const dashboardResponse = await dashboard(jsonRequest("GET", "/api/dashboard", { cookie }));
    expect(dashboardResponse.status).toBe(200);

    const stored = await prisma.session.findFirstOrThrow();
    expect(cookie).not.toContain(stored.tokenHash);
  });

  it("senha incorreta e e-mail inexistente geram a mesma resposta", async () => {
    await createUser({ email: "ana@exemplo.com" });
    const wrong = await login(jsonRequest("POST", "/api/auth/login", { body: { email: "ana@exemplo.com", password: "errada-123456" } }));
    const unknown = await login(jsonRequest("POST", "/api/auth/login", { body: { email: "ninguem@exemplo.com", password: "errada-123456" } }));

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await wrong.json()).toEqual(await unknown.json());
    expect(wrong.headers.get("set-cookie")).toBeNull();
  });

  it("valida a entrada no backend", async () => {
    const response = await login(jsonRequest("POST", "/api/auth/login", { body: { email: "invalido", password: "" } }));
    expect(response.status).toBe(400);
  });

  it("conta inativa ou sem senha não entra (mensagem genérica)", async () => {
    await createUser({ email: "inativa@exemplo.com", isActive: false });
    await createUser({ email: "semsenha@exemplo.com", withPassword: false });

    for (const email of ["inativa@exemplo.com", "semsenha@exemplo.com"]) {
      const response = await login(jsonRequest("POST", "/api/auth/login", { body: { email, password: TEST_PASSWORD } }));
      expect(response.status).toBe(401);
      expect((await response.json()).message).toBe("E-mail ou senha inválidos.");
    }
  });

  it("bloqueia após tentativas excessivas, mesmo com a senha certa", async () => {
    await createUser({ email: "alvo@exemplo.com" });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login(jsonRequest("POST", "/api/auth/login", { body: { email: "alvo@exemplo.com", password: "errada-123456" }, ip: "10.0.0.1" }));
    }
    const blocked = await login(jsonRequest("POST", "/api/auth/login", { body: { email: "alvo@exemplo.com", password: TEST_PASSWORD }, ip: "10.0.0.2" }));
    expect(blocked.status).toBe(429);
  });

  it("rejeita login vindo de outra origem (CSRF)", async () => {
    await createUser({ email: "ana@exemplo.com" });
    const response = await login(
      jsonRequest("POST", "/api/auth/login", { body: { email: "ana@exemplo.com", password: TEST_PASSWORD }, origin: "https://site-malicioso.com" }),
    );
    expect(response.status).toBe(403);
  });
});

describe("sessão e rotas privadas", () => {
  it("rotas privadas exigem sessão", async () => {
    expect((await dashboard(jsonRequest("GET", "/api/dashboard"))).status).toBe(401);
    expect((await dashboard(jsonRequest("GET", "/api/dashboard", { cookie: "semear_session=token-falso" }))).status).toBe(401);
  });

  it("logout revoga a sessão no servidor", async () => {
    const user = await createUser({ email: "ana@exemplo.com" });
    const cookie = await sessionCookieFor(user.id);
    expect((await dashboard(jsonRequest("GET", "/api/dashboard", { cookie }))).status).toBe(200);

    const response = await logout(jsonRequest("POST", "/api/auth/logout", { cookie }));
    expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
    expect((await dashboard(jsonRequest("GET", "/api/dashboard", { cookie }))).status).toBe(401);
    expect(await prisma.session.count()).toBe(0);
  });

  it("sessão expirada é recusada", async () => {
    const user = await createUser({ email: "ana@exemplo.com" });
    const cookie = await sessionCookieFor(user.id);
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await dashboard(jsonRequest("GET", "/api/dashboard", { cookie }))).status).toBe(401);
  });
});

describe("primeiro acesso com código", () => {
  it("define a senha com código válido, abre sessão e invalida o código", async () => {
    const user = await createUser({ email: "novo@exemplo.com", withPassword: false });
    const { code } = await issueSetupCode(user.id, null);

    const body = { email: "novo@exemplo.com", code: code.toLowerCase(), password: "nova-senha-123", confirmPassword: "nova-senha-123" };
    const response = await firstAccess(jsonRequest("POST", "/api/auth/first-access", { body }));
    expect(response.status).toBe(200);
    expect(extractSessionCookie(response)).not.toBeNull();

    const reuse = await firstAccess(jsonRequest("POST", "/api/auth/first-access", { body }));
    expect(reuse.status).toBe(400);

    const loginResponse = await login(jsonRequest("POST", "/api/auth/login", { body: { email: "novo@exemplo.com", password: "nova-senha-123" } }));
    expect(loginResponse.status).toBe(200);
  });

  it("recusa código errado, expirado ou de outro usuário", async () => {
    const owner = await createUser({ email: "dono@exemplo.com", withPassword: false });
    await createUser({ email: "outro@exemplo.com", withPassword: false });
    const { code } = await issueSetupCode(owner.id, null);

    const attempt = (email: string, value: string) =>
      firstAccess(jsonRequest("POST", "/api/auth/first-access", {
        body: { email, code: value, password: "nova-senha-123", confirmPassword: "nova-senha-123" },
      }));

    expect((await attempt("outro@exemplo.com", code)).status).toBe(400);
    expect((await attempt("dono@exemplo.com", "AAAA-BBBB-CCCC-DDDD-EEEE")).status).toBe(400);

    await prisma.passwordSetupToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await attempt("dono@exemplo.com", code)).status).toBe(400);
  });

  it("aplica a política de senha no backend", async () => {
    const user = await createUser({ email: "novo@exemplo.com", withPassword: false });
    const { code } = await issueSetupCode(user.id, null);
    const response = await firstAccess(jsonRequest("POST", "/api/auth/first-access", {
      body: { email: "novo@exemplo.com", code, password: "curta", confirmPassword: "curta" },
    }));
    expect(response.status).toBe(400);
  });
});
