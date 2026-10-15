import { describe, expect, it } from "vitest";

import { AiProviderError } from "./errors";
import { MIN_WORDS_FOR_ANALYSIS, processLesson, validateGeneratedQuestions } from "./pipeline";
import type { AiProviderClient, StructuredRequest } from "./types";

type Script = Record<string, unknown | (() => unknown)>;

/** Cliente falso: responde por nome de schema e valida com o mesmo validador do pipeline. */
function fakeClient(script: Script) {
  const calls: string[] = [];
  const client: AiProviderClient = {
    provider: "ANTHROPIC",
    async listModels() {
      return [];
    },
    async generateStructured<T>(_model: string, request: StructuredRequest<T>) {
      calls.push(request.schemaName);
      const entry = script[request.schemaName];
      const value = typeof entry === "function" ? (entry as () => unknown)() : entry;
      if (value instanceof Error) throw value;
      if (value === undefined) throw new Error(`sem script para ${request.schemaName}`);
      const parsed = request.validator.safeParse(value);
      if (!parsed.success) throw new AiProviderError("ANTHROPIC", "INVALID_RESPONSE");
      return parsed.data;
    },
  };
  return { client, calls };
}

const DIDACTIC =
  "A fotossíntese é o processo pelo qual as plantas convertem energia luminosa em energia química. " +
  "Ela ocorre nos cloroplastos, organelas que contêm clorofila, o pigmento responsável por absorver a luz. " +
  "Na fase clara, a energia da luz quebra moléculas de água e libera oxigênio. " +
  "Na fase escura, também chamada de ciclo de Calvin, o gás carbônico é fixado e transformado em glicose. " +
  "Fatores como intensidade luminosa, temperatura e concentração de gás carbônico influenciam a taxa de fotossíntese.";

const INTRO =
  "Sejam bem-vindos ao curso de Biologia Geral. Neste semestre veremos citologia, genética e ecologia. " +
  "As aulas acontecem às segundas e quartas. A avaliação terá duas provas e um trabalho em grupo. " +
  "O material de apoio estará no ambiente virtual e o atendimento acontece às sextas-feiras.";

const study = { summary: "# Resumo", shortSummary: "Resumo curto.", keywords: ["fotossíntese", "cloroplasto"] };

const validQuestion = {
  question: "Onde ocorre a fotossíntese?",
  options: ["Nos cloroplastos", "Nas mitocôndrias", "No núcleo", "Nos ribossomos"],
  answer: "Nos cloroplastos",
  sourceExcerpt: "Ela ocorre nos cloroplastos, organelas que contêm clorofila",
};

describe("processLesson: classificação antes da geração de questões", () => {
  it("aula com conteúdo didático: gera questões fundamentadas", async () => {
    const { client, calls } = fakeClient({
      lesson_classification: {
        canGenerateQuestions: true,
        classification: "SUBSTANTIVE",
        reason: "Explica a fotossíntese.",
        scope: "FULL",
        relevantSections: [],
      },
      study_material: study,
      lesson_questions: { questions: [validQuestion] },
    });

    const result = await processLesson(client, "m", DIDACTIC);

    expect(calls).toEqual(["lesson_classification", "study_material", "lesson_questions"]);
    expect(result.outcome).toBe("COMPLETED");
    expect(result.classification).toBe("SUBSTANTIVE");
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]!.options).toHaveLength(4);
    expect(result.questions[0]!.options).toContain("Nos cloroplastos");
  });

  it("aula introdutória: encerra sem gerar questões", async () => {
    const { client, calls } = fakeClient({
      lesson_classification: {
        canGenerateQuestions: false,
        classification: "INTRODUCTORY",
        reason: "Apresenta o curso e a avaliação.",
        scope: "NONE",
        relevantSections: [],
      },
      study_material: study,
    });

    const result = await processLesson(client, "m", INTRO);

    expect(calls).not.toContain("lesson_questions");
    expect(result.outcome).toBe("NO_QUESTIONS_NEEDED");
    expect(result.questions).toEqual([]);
    expect(result.summary).toBe("# Resumo");
  });

  it("aula administrativa: também não gera questões", async () => {
    const { client, calls } = fakeClient({
      lesson_classification: {
        canGenerateQuestions: false,
        classification: "ADMINISTRATIVE",
        reason: "Apenas cronograma e regras.",
        scope: "NONE",
        relevantSections: [],
      },
      study_material: study,
    });

    const result = await processLesson(client, "m", INTRO);
    expect(calls).not.toContain("lesson_questions");
    expect(result.outcome).toBe("NO_QUESTIONS_NEEDED");
  });

  it("aula mista: usa somente o trecho didático localizado no texto", async () => {
    const mixed = `${INTRO}\n\n${DIDACTIC}`;
    let questionPrompt = "";
    const { client } = fakeClient({
      lesson_classification: {
        canGenerateQuestions: true,
        classification: "SUBSTANTIVE",
        reason: "Começa com apresentação e depois explica a fotossíntese.",
        scope: "PARTIAL",
        relevantSections: [
          {
            startQuote: "A fotossíntese é o processo pelo qual as plantas",
            endQuote: "concentração de gás carbônico influenciam a taxa de fotossíntese",
          },
        ],
      },
      study_material: study,
      lesson_questions: () => ({ questions: [validQuestion] }),
    });
    const original = client.generateStructured.bind(client);
    client.generateStructured = async (model, request) => {
      if (request.schemaName === "lesson_questions") questionPrompt = request.prompt;
      return original(model, request);
    };

    const result = await processLesson(client, "m", mixed);

    expect(result.outcome).toBe("COMPLETED");
    expect(result.relevantExcerpts).toHaveLength(1);
    expect(result.relevantExcerpts[0]).toContain("A fotossíntese é o processo");
    expect(questionPrompt).toContain("ciclo de Calvin");
    expect(questionPrompt).not.toContain("Sejam bem-vindos");
  });

  it("aula mista com trechos não localizáveis: pede revisão e não gera questões", async () => {
    const { client, calls } = fakeClient({
      lesson_classification: {
        canGenerateQuestions: true,
        classification: "SUBSTANTIVE",
        reason: "Parte didática.",
        scope: "PARTIAL",
        relevantSections: [{ startQuote: "texto que não existe no material", endQuote: "outro trecho inventado aqui" }],
      },
      study_material: study,
    });

    const result = await processLesson(client, "m", `${INTRO} ${DIDACTIC}`);
    expect(calls).not.toContain("lesson_questions");
    expect(result.outcome).toBe("NEEDS_REVIEW");
    expect(result.reason).toMatch(/não foram localizados/);
  });

  it("conteúdo vazio ou curto: insuficiente, sem chamar o provedor", async () => {
    const { client, calls } = fakeClient({});
    const result = await processLesson(client, "m", "Aula 1. Introdução.");

    expect(calls).toEqual([]);
    expect(result.skippedAi).toBe(true);
    expect(result.outcome).toBe("NEEDS_REVIEW");
    expect(result.classification).toBe("INSUFFICIENT");
    expect(MIN_WORDS_FOR_ANALYSIS).toBeGreaterThan(3);
  });

  it("conteúdo ambíguo: marcado para revisão, sem resumo nem questões", async () => {
    const { client, calls } = fakeClient({
      lesson_classification: {
        canGenerateQuestions: false,
        classification: "INSUFFICIENT",
        reason: "Texto fragmentado; não é possível identificar o assunto.",
        scope: "NONE",
        relevantSections: [],
      },
    });

    const result = await processLesson(client, "m", DIDACTIC);
    expect(calls).toEqual(["lesson_classification"]);
    expect(result.outcome).toBe("NEEDS_REVIEW");
    expect(result.questions).toEqual([]);
  });

  it("resposta inválida do modelo: lança erro (não vira classificação negativa)", async () => {
    const { client } = fakeClient({ lesson_classification: { classification: "TALVEZ" } });
    await expect(processLesson(client, "m", DIDACTIC)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("classificação incoerente (introdutória com questões): lança INVALID_RESPONSE", async () => {
    const { client } = fakeClient({
      lesson_classification: {
        canGenerateQuestions: true,
        classification: "INTRODUCTORY",
        reason: "x",
        scope: "FULL",
        relevantSections: [],
      },
    });
    await expect(processLesson(client, "m", DIDACTIC)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("falha de comunicação com o provedor: propaga o erro normalizado", async () => {
    const { client } = fakeClient({
      lesson_classification: new AiProviderError("ANTHROPIC", "UNAVAILABLE", { httpStatus: 529 }),
    });
    await expect(processLesson(client, "m", DIDACTIC)).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("questões sem fundamento no texto são descartadas; se nenhuma sobra, pede revisão", async () => {
    const { client } = fakeClient({
      lesson_classification: {
        canGenerateQuestions: true,
        classification: "SUBSTANTIVE",
        reason: "Explica a fotossíntese.",
        scope: "FULL",
        relevantSections: [],
      },
      study_material: study,
      lesson_questions: {
        questions: [{ ...validQuestion, sourceExcerpt: "A fotossíntese foi descoberta em Marte em 1850" }],
      },
    });

    const result = await processLesson(client, "m", DIDACTIC);
    expect(result.questions).toEqual([]);
    expect(result.discardedQuestions).toBe(1);
    expect(result.outcome).toBe("NEEDS_REVIEW");
  });
});

describe("validateGeneratedQuestions", () => {
  it("descarta questões malformadas e duplicadas e remove letras das alternativas", () => {
    const { valid, discarded } = validateGeneratedQuestions(
      [
        { ...validQuestion, options: ["A - Nos cloroplastos", "B - Nas mitocôndrias", "C - No núcleo", "D - Nos ribossomos"], answer: "A - Nos cloroplastos" },
        validQuestion,
        { ...validQuestion, question: "Pergunta com 3 alternativas?", options: ["a", "b", "c"] },
        { ...validQuestion, question: "Resposta fora das alternativas?", answer: "Na raiz" },
        { ...validQuestion, question: "Alternativas repetidas?", options: ["x", "x", "y", "z"], answer: "y" },
      ],
      DIDACTIC,
    );

    expect(valid).toHaveLength(1);
    expect(valid[0]!.options).toContain("Nos cloroplastos");
    expect(valid[0]!.answer).toBe("Nos cloroplastos");
    expect(discarded).toBe(4);
  });
});
