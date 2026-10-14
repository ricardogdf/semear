import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AiProviderError } from "@/server/ai";
import { prisma } from "@/server/db";

import { PUT as connect } from "@/app/api/ai/providers/[provider]/route";
import { POST as reprocess } from "@/app/api/content/[contentId]/reprocess/route";
import { POST as upload } from "@/app/api/content/upload/route";

import {
  createUser,
  installFakeProvider,
  jsonRequest,
  params,
  resetDatabase,
  sessionCookieFor,
  uninstallFakeProvider,
  type FakeProviderState,
} from "./support/helpers";

const DIDACTIC =
  "O ciclo da água descreve a circulação contínua da água no planeta. A evaporação transforma a água líquida dos oceanos em vapor por ação do calor do sol. " +
  "Na condensação, o vapor esfria nas camadas altas da atmosfera e forma as nuvens. A precipitação ocorre quando as gotículas se tornam pesadas e caem como chuva, neve ou granizo. " +
  "A infiltração leva parte da água para o subsolo, abastecendo os lençóis freáticos que alimentam rios e nascentes.";

const INTRO =
  "Olá, turma! Sejam bem-vindos à disciplina de Ciências Ambientais. Neste semestre estudaremos o ciclo da água, os biomas e a poluição. " +
  "As aulas serão às terças e quintas, com uma prova no meio e outra no fim do semestre. Os materiais ficarão disponíveis no portal da instituição.";

const study = { summary: "# Resumo", shortSummary: "Resumo.", keywords: ["ciclo da água"] };

function didacticResponders(state: FakeProviderState) {
  state.responders = {
    lesson_classification: () => ({
      canGenerateQuestions: true,
      classification: "SUBSTANTIVE",
      reason: "Explica as etapas do ciclo da água.",
      scope: "FULL",
      relevantSections: [],
    }),
    study_material: () => study,
    lesson_questions: () => ({
      questions: [
        {
          question: "Qual etapa forma as nuvens?",
          options: ["Condensação", "Evaporação", "Infiltração", "Precipitação"],
          answer: "Condensação",
          sourceExcerpt: "Na condensação, o vapor esfria nas camadas altas da atmosfera e forma as nuvens",
        },
      ],
    }),
  };
}

function uploadRequest(cookie: string, text: string, fields: Record<string, string> = {}, fileName = "aula.txt") {
  const form = new FormData();
  form.set("subjectId", fields.subjectId ?? "Ciências");
  form.set("file", new File([text], fileName, { type: "text/plain" }));
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return upload(new Request("http://localhost:3000/api/content/upload", {
    method: "POST",
    headers: { cookie, origin: "http://localhost:3000", host: "localhost:3000" },
    body: form,
  }));
}

async function userWithProvider(fake: FakeProviderState, email = "ana@exemplo.com") {
  const user = await createUser({ email });
  const cookie = await sessionCookieFor(user.id);
  fake.models = [{ id: "modelo-a", displayName: "A" }, { id: "modelo-b", displayName: "B" }];
  await connect(jsonRequest("PUT", "/api/ai/providers/ANTHROPIC", { cookie, body: { apiKey: "sk-ant-api03-chave-de-teste-1" } }), params({ provider: "ANTHROPIC" }));
  await prisma.aiCredential.updateMany({ where: { userId: user.id }, data: { defaultModel: "modelo-a" } });
  return { user, cookie };
}

beforeEach(resetDatabase);
afterEach(uninstallFakeProvider);

describe("upload e processamento", () => {
  it("sem provedor conectado: recusa e não salva nada", async () => {
    installFakeProvider();
    const user = await createUser({ email: "ana@exemplo.com" });
    const response = await uploadRequest(await sessionCookieFor(user.id), DIDACTIC);

    expect(response.status).toBe(412);
    expect((await response.json()).message).toMatch(/Configurações de IA/);
    expect(await prisma.content.count()).toBe(0);
    expect(await prisma.subject.count()).toBe(0);
  });

  it("aula didática: gera questões e registra provedor, modelo e histórico", async () => {
    const fake = installFakeProvider();
    didacticResponders(fake);
    const { cookie } = await userWithProvider(fake);

    const response = await uploadRequest(cookie, DIDACTIC);
    expect(response.status).toBe(201);
    const content = await response.json();

    expect(content).toMatchObject({
      processingStatus: "COMPLETED",
      classification: "SUBSTANTIVE",
      aiProvider: "ANTHROPIC",
      aiModel: "modelo-a",
      questionCount: 1,
    });
    expect(fake.calls.map((call) => call.model)).toEqual(["modelo-a", "modelo-a", "modelo-a"]);
    expect(fake.calls[0]!.apiKey).toBe("sk-ant-api03-chave-de-teste-1");

    const run = await prisma.contentProcessingRun.findFirstOrThrow();
    expect(run).toMatchObject({ status: "SUCCEEDED", provider: "ANTHROPIC", model: "modelo-a", questionsGenerated: 1 });
  });

  it("aula introdutória: processada sem questões", async () => {
    const fake = installFakeProvider();
    fake.responders = {
      lesson_classification: () => ({
        canGenerateQuestions: false,
        classification: "INTRODUCTORY",
        reason: "Apresentação da disciplina e do cronograma.",
        scope: "NONE",
        relevantSections: [],
      }),
      study_material: () => study,
    };
    const { cookie } = await userWithProvider(fake);

    const content = await (await uploadRequest(cookie, INTRO)).json();
    expect(content).toMatchObject({ processingStatus: "NO_QUESTIONS_NEEDED", classification: "INTRODUCTORY", questionCount: 0 });
    expect(fake.calls.map((call) => call.schemaName)).not.toContain("lesson_questions");
  });

  it("escolha explícita de modelo por execução é respeitada; modelo fora da lista é recusado", async () => {
    const fake = installFakeProvider();
    didacticResponders(fake);
    const { cookie } = await userWithProvider(fake);

    await uploadRequest(cookie, DIDACTIC, { provider: "ANTHROPIC", model: "modelo-b" });
    expect(new Set(fake.calls.map((call) => call.model))).toEqual(new Set(["modelo-b"]));

    const invalid = await uploadRequest(cookie, DIDACTIC, { provider: "ANTHROPIC", model: "modelo-inexistente" });
    expect(invalid.status).toBe(400);
  });

  it("provedor não conectado na execução: não troca silenciosamente de provedor", async () => {
    const fake = installFakeProvider();
    didacticResponders(fake);
    const { cookie } = await userWithProvider(fake);

    const response = await uploadRequest(cookie, DIDACTIC, { provider: "OPENAI", model: "gpt-5" });
    expect(response.status).toBe(412);
    expect(fake.calls).toEqual([]);
  });

  it("falha do provedor: aula fica FAILED (sem questões falsas) e pode ser reprocessada", async () => {
    const fake = installFakeProvider();
    fake.responders = {
      lesson_classification: () => new AiProviderError("ANTHROPIC", "UNAVAILABLE", { httpStatus: 529, detail: "Overloaded" }),
    };
    const { cookie } = await userWithProvider(fake);

    const response = await uploadRequest(cookie, DIDACTIC);
    expect(response.status).toBe(201);
    const content = await response.json();
    expect(content.processingStatus).toBe("FAILED");
    expect(content.classification).toBeNull();
    expect(content.errorMessage).toMatch(/indisponível/);
    expect(await prisma.contentProcessingRun.findFirstOrThrow()).toMatchObject({ status: "FAILED", errorCode: "UNAVAILABLE" });

    didacticResponders(fake);
    const retried = await reprocess(jsonRequest("POST", "/x", { cookie, body: {} }), params({ contentId: content.id }));
    expect(retried.status).toBe(200);
    expect((await retried.json()).processingStatus).toBe("COMPLETED");
    expect(await prisma.contentProcessingRun.count()).toBe(2);
  });

  it("chave revogada no provedor: erro registrado na credencial", async () => {
    const fake = installFakeProvider();
    fake.responders = { lesson_classification: () => new AiProviderError("ANTHROPIC", "AUTHENTICATION", { httpStatus: 401 }) };
    const { cookie } = await userWithProvider(fake);

    const content = await (await uploadRequest(cookie, DIDACTIC)).json();
    expect(content.processingStatus).toBe("FAILED");
    expect((await prisma.aiCredential.findFirstOrThrow()).lastErrorCode).toBe("AUTHENTICATION");
  });

  it("rejeita formato inválido, arquivo vazio e PDF falso", async () => {
    const fake = installFakeProvider();
    const { cookie } = await userWithProvider(fake);

    expect((await uploadRequest(cookie, "conteudo", {}, "aula.docx")).status).toBe(400);
    expect((await uploadRequest(cookie, "", {}, "aula.txt")).status).toBe(400);
    expect((await uploadRequest(cookie, "não sou um pdf", {}, "aula.pdf")).status).toBe(400);
    expect(await prisma.content.count()).toBe(0);
  });

  it("extrai texto de PDF real", async () => {
    const fake = installFakeProvider();
    didacticResponders(fake);
    const { cookie } = await userWithProvider(fake);
    const pdf =
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n" +
      "4 0 obj<</Length 52>>stream\nBT /F1 18 Tf 20 100 Td (Ola mundo semear) Tj ET\nendstream endobj\n" +
      "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";

    const form = new FormData();
    form.set("subjectId", "PDFs");
    form.set("file", new File([pdf], "aula.pdf", { type: "application/pdf" }));
    const response = await upload(new Request("http://localhost:3000/api/content/upload", {
      method: "POST",
      headers: { cookie, origin: "http://localhost:3000", host: "localhost:3000" },
      body: form,
    }));

    expect(response.status).toBe(201);
    const stored = await prisma.content.findFirstOrThrow();
    expect(stored.body).toBe("Ola mundo semear");
    expect(stored.body).not.toMatch(/fallback/i);
    // Texto curto demais: marcado como insuficiente sem chamar o provedor.
    expect(stored.processingStatus).toBe("NEEDS_REVIEW");
    expect(fake.calls).toEqual([]);
  });
});
