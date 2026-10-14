import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AiProviderError } from "@/server/ai";
import { prisma } from "@/server/db";

import { DELETE as disconnect, PATCH as setModel, PUT as connect } from "@/app/api/ai/providers/[provider]/route";
import { POST as testConnection } from "@/app/api/ai/providers/[provider]/test/route";
import { GET as getSettings, PUT as setPreferences } from "@/app/api/ai/settings/route";

import {
  createUser,
  installFakeProvider,
  jsonRequest,
  params,
  resetDatabase,
  sessionCookieFor,
  uninstallFakeProvider,
} from "./support/helpers";

const KEY = "sk-ant-api03-CHAVE-SECRETA-DO-USUARIO-0001";

beforeEach(resetDatabase);
afterEach(uninstallFakeProvider);

async function connectedUser(email = "ana@exemplo.com") {
  const user = await createUser({ email });
  const cookie = await sessionCookieFor(user.id);
  return { user, cookie };
}

function connectRequest(cookie: string, apiKey = KEY, provider = "ANTHROPIC") {
  return connect(jsonRequest("PUT", `/api/ai/providers/${provider}`, { cookie, body: { apiKey } }), params({ provider }));
}

describe("conexão de provedores de IA", () => {
  it("valida a chave no provedor e armazena criptografada (sem texto puro no banco)", async () => {
    const fake = installFakeProvider({ models: [{ id: "claude-x", displayName: "Claude X" }] });
    const { user, cookie } = await connectedUser();

    const response = await connectRequest(cookie);
    expect(response.status).toBe(200);

    const credential = await prisma.aiCredential.findFirstOrThrow({ where: { userId: user.id } });
    expect(JSON.stringify(credential)).not.toContain("CHAVE-SECRETA");
    expect(credential.keyHint).toBe("0001");
    expect(fake.calls).toEqual([]);

    const settings = await response.json();
    expect(JSON.stringify(settings)).not.toContain("CHAVE-SECRETA");
    const anthropic = settings.providers.find((entry: { provider: string }) => entry.provider === "ANTHROPIC");
    expect(anthropic).toMatchObject({ connected: true, keyHint: "••••0001", models: [{ id: "claude-x", displayName: "Claude X" }] });
    expect(settings.defaultProvider).toBe("ANTHROPIC");
  });

  it("chave recusada pelo provedor não é armazenada", async () => {
    installFakeProvider({ listError: new AiProviderError("OPENAI", "AUTHENTICATION", { httpStatus: 401 }) });
    const { cookie } = await connectedUser();

    const response = await connectRequest(cookie, "sk-invalida-123456", "OPENAI");
    expect(response.status).toBe(422);
    expect((await response.json()).code).toBe("AI_AUTHENTICATION");
    expect(await prisma.aiCredential.count()).toBe(0);
  });

  it("limite e indisponibilidade do provedor retornam códigos distintos", async () => {
    const { cookie } = await connectedUser();

    installFakeProvider({ listError: new AiProviderError("GEMINI", "RATE_LIMIT", { httpStatus: 429 }) });
    expect((await connectRequest(cookie, "AIza-chave-teste-123", "GEMINI")).status).toBe(429);

    installFakeProvider({ listError: new AiProviderError("GEMINI", "UNAVAILABLE", { httpStatus: 503 }) });
    expect((await connectRequest(cookie, "AIza-chave-teste-123", "GEMINI")).status).toBe(503);
  });

  it("sem chave de criptografia configurada, recusa armazenar", async () => {
    installFakeProvider();
    const { cookie } = await connectedUser();
    const original = process.env.CREDENTIALS_ENCRYPTION_KEY;
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    try {
      const response = await connectRequest(cookie);
      expect(response.status).toBe(412);
      expect(await prisma.aiCredential.count()).toBe(0);
    } finally {
      process.env.CREDENTIALS_ENCRYPTION_KEY = original;
    }
  });

  it("modelo padrão só pode ser um modelo compatível listado", async () => {
    installFakeProvider({ models: [{ id: "claude-x", displayName: "X" }] });
    const { cookie } = await connectedUser();
    await connectRequest(cookie);

    const invalid = await setModel(jsonRequest("PATCH", "/x", { cookie, body: { model: "modelo-inventado" } }), params({ provider: "ANTHROPIC" }));
    expect(invalid.status).toBe(400);

    const ok = await setModel(jsonRequest("PATCH", "/x", { cookie, body: { model: "claude-x" } }), params({ provider: "ANTHROPIC" }));
    expect(ok.status).toBe(200);
    expect((await prisma.aiCredential.findFirstOrThrow()).defaultModel).toBe("claude-x");
  });

  it("testar conexão usa a chave armazenada e atualiza modelos", async () => {
    const fake = installFakeProvider({ models: [{ id: "claude-x", displayName: "X" }] });
    const { cookie } = await connectedUser();
    await connectRequest(cookie);

    fake.models = [{ id: "claude-x", displayName: "X" }, { id: "claude-y", displayName: "Y" }];
    const response = await testConnection(jsonRequest("POST", "/x", { cookie }), params({ provider: "ANTHROPIC" }));
    expect(response.status).toBe(200);
    const models = (await prisma.aiCredential.findFirstOrThrow()).availableModels as Array<{ id: string }>;
    expect(models.map((model) => model.id)).toEqual(["claude-x", "claude-y"]);
  });

  it("substituir a chave atualiza o registro; desconectar apaga a credencial", async () => {
    installFakeProvider();
    const { cookie } = await connectedUser();
    await connectRequest(cookie);
    const before = await prisma.aiCredential.findFirstOrThrow();

    await connectRequest(cookie, "sk-ant-api03-NOVA-CHAVE-0002");
    const after = await prisma.aiCredential.findFirstOrThrow();
    expect(after.id).toBe(before.id);
    expect(after.keyHint).toBe("0002");
    expect(after.encryptedKey).not.toBe(before.encryptedKey);

    const response = await disconnect(jsonRequest("DELETE", "/x", { cookie }), params({ provider: "ANTHROPIC" }));
    expect(response.status).toBe(200);
    expect(await prisma.aiCredential.count()).toBe(0);
    expect((await response.json()).defaultProvider).toBeNull();
  });

  it("provedor desconhecido e provedor padrão não conectado são recusados", async () => {
    installFakeProvider();
    const { cookie } = await connectedUser();
    expect((await connectRequest(cookie, KEY, "OPENROUTER")).status).toBe(400);

    const response = await setPreferences(jsonRequest("PUT", "/api/ai/settings", { cookie, body: { defaultProvider: "OPENAI" } }));
    expect(response.status).toBe(412);
  });

  it("isolamento: um usuário não vê nem usa a credencial de outro", async () => {
    installFakeProvider();
    const ana = await connectedUser("ana@exemplo.com");
    const bia = await connectedUser("bia@exemplo.com");
    await connectRequest(ana.cookie);

    const biaSettings = await (await getSettings(jsonRequest("GET", "/api/ai/settings", { cookie: bia.cookie }))).json();
    expect(biaSettings.providers.every((entry: { connected: boolean }) => !entry.connected)).toBe(true);

    const biaTest = await testConnection(jsonRequest("POST", "/x", { cookie: bia.cookie }), params({ provider: "ANTHROPIC" }));
    expect(biaTest.status).toBe(412);

    // Copiar a linha cifrada para outro usuário não permite decifrar (AAD vinculado ao dono).
    const anaCredential = await prisma.aiCredential.findFirstOrThrow({ where: { userId: ana.user.id } });
    await prisma.aiCredential.create({
      data: { ...anaCredential, id: undefined, userId: bia.user.id, createdAt: undefined, updatedAt: undefined, availableModels: anaCredential.availableModels ?? [] },
    });
    const stolen = await testConnection(jsonRequest("POST", "/x", { cookie: bia.cookie }), params({ provider: "ANTHROPIC" }));
    expect(stolen.status).toBe(412);
  });
});
