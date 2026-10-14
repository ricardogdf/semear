import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db";

import { POST as approve } from "@/app/api/admin/access-requests/[requestId]/approve/route";
import { POST as reject } from "@/app/api/admin/access-requests/[requestId]/reject/route";
import { GET as listRequests } from "@/app/api/admin/access-requests/route";
import { POST as submit } from "@/app/api/access-requests/route";
import { POST as login } from "@/app/api/auth/login/route";

import { createUser, jsonRequest, params, resetDatabase, sessionCookieFor } from "./support/helpers";

beforeEach(resetDatabase);

const valid = { name: "Carla Mendes", email: "carla@exemplo.com", message: "Quero organizar meus estudos." };

describe("solicitação pública de acesso", () => {
  it("persiste a solicitação e NÃO cria conta", async () => {
    const response = await submit(jsonRequest("POST", "/api/access-requests", { body: valid }));
    expect(response.status).toBe(202);

    const stored = await prisma.accessRequest.findFirstOrThrow();
    expect(stored).toMatchObject({ name: "Carla Mendes", email: "carla@exemplo.com", status: "PENDING" });
    expect(await prisma.user.count()).toBe(0);

    const loginAttempt = await login(jsonRequest("POST", "/api/auth/login", { body: { email: "carla@exemplo.com", password: "qualquer-123" } }));
    expect(loginAttempt.status).toBe(401);
  });

  it("valida os dados no backend", async () => {
    const response = await submit(jsonRequest("POST", "/api/access-requests", { body: { name: "", email: "nao-email" } }));
    expect(response.status).toBe(400);
    expect(await prisma.accessRequest.count()).toBe(0);
  });

  it("não duplica solicitação pendente do mesmo e-mail", async () => {
    await submit(jsonRequest("POST", "/api/access-requests", { body: valid, ip: "10.0.0.1" }));
    await submit(jsonRequest("POST", "/api/access-requests", { body: { ...valid, email: "CARLA@exemplo.com" }, ip: "10.0.0.2" }));
    expect(await prisma.accessRequest.count()).toBe(1);
  });

  it("honeypot preenchido responde igual, mas não grava", async () => {
    const response = await submit(jsonRequest("POST", "/api/access-requests", { body: { ...valid, website: "spam" } }));
    expect(response.status).toBe(202);
    expect(await prisma.accessRequest.count()).toBe(0);
  });

  it("limita envios por IP", async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 7; index += 1) {
      const response = await submit(jsonRequest("POST", "/api/access-requests", {
        body: { ...valid, email: `pessoa${index}@exemplo.com` },
        ip: "10.9.9.9",
      }));
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 5).every((status) => status === 202)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("análise pelo administrador", () => {
  async function seed() {
    const admin = await createUser({ email: "admin@exemplo.com", role: "ADMIN" });
    const user = await createUser({ email: "user@exemplo.com" });
    await submit(jsonRequest("POST", "/api/access-requests", { body: valid }));
    const request = await prisma.accessRequest.findFirstOrThrow();
    return { request, adminCookie: await sessionCookieFor(admin.id), userCookie: await sessionCookieFor(user.id) };
  }

  it("usuário comum não lista nem aprova solicitações", async () => {
    const { request, userCookie } = await seed();
    expect((await listRequests(jsonRequest("GET", "/api/admin/access-requests", { cookie: userCookie }))).status).toBe(403);
    expect((await approve(jsonRequest("POST", "/x", { cookie: userCookie, body: { role: "ADMIN" } }), params({ requestId: request.id }))).status).toBe(403);
    expect(await prisma.user.count({ where: { email: valid.email } })).toBe(0);
  });

  it("aprovação cria a conta com código de primeiro acesso", async () => {
    const { request, adminCookie } = await seed();
    const listing = await (await listRequests(jsonRequest("GET", "/api/admin/access-requests?status=PENDING", { cookie: adminCookie }))).json();
    expect(listing).toHaveLength(1);

    const response = await approve(jsonRequest("POST", "/x", { cookie: adminCookie, body: { role: "USER" } }), params({ requestId: request.id }));
    expect(response.status).toBe(201);
    const { setupCode } = await response.json();
    expect(setupCode).toBeTruthy();

    const created = await prisma.user.findUniqueOrThrow({ where: { email: valid.email } });
    expect(created).toMatchObject({ role: "USER", passwordHash: null, isActive: true });
    expect((await prisma.accessRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("APPROVED");

    const again = await approve(jsonRequest("POST", "/x", { cookie: adminCookie, body: {} }), params({ requestId: request.id }));
    expect(again.status).toBe(409);
  });

  it("rejeição registra a decisão e não cria conta", async () => {
    const { request, adminCookie } = await seed();
    const response = await reject(jsonRequest("POST", "/x", { cookie: adminCookie, body: { note: "Fora do público" } }), params({ requestId: request.id }));
    expect(response.status).toBe(200);
    expect(await prisma.accessRequest.findUniqueOrThrow({ where: { id: request.id } })).toMatchObject({
      status: "REJECTED",
      reviewNote: "Fora do público",
    });
    expect(await prisma.user.count({ where: { email: valid.email } })).toBe(0);
  });
});
