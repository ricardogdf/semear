import { z } from "zod";

import type { JsonSchema } from "./types";

export const lessonClassifications = ["SUBSTANTIVE", "INTRODUCTORY", "ADMINISTRATIVE", "INSUFFICIENT"] as const;
export type LessonClassification = (typeof lessonClassifications)[number];

// ---------- Classificação ----------

export const classificationValidator = z.object({
  canGenerateQuestions: z.boolean(),
  classification: z.enum(lessonClassifications),
  reason: z.string().trim().min(1).max(2000),
  scope: z.enum(["FULL", "PARTIAL", "NONE"]),
  relevantSections: z
    .array(z.object({ startQuote: z.string(), endQuote: z.string() }))
    .max(30),
});
export type ClassificationOutput = z.infer<typeof classificationValidator>;

export const classificationJsonSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["canGenerateQuestions", "classification", "reason", "scope", "relevantSections"],
  properties: {
    canGenerateQuestions: { type: "boolean" },
    classification: { type: "string", enum: [...lessonClassifications] },
    reason: { type: "string" },
    scope: { type: "string", enum: ["FULL", "PARTIAL", "NONE"] },
    relevantSections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["startQuote", "endQuote"],
        properties: {
          startQuote: { type: "string" },
          endQuote: { type: "string" },
        },
      },
    },
  },
};

// ---------- Material de estudo ----------

export const studyMaterialValidator = z.object({
  summary: z.string().trim().min(1),
  shortSummary: z.string().trim().min(1).max(1000),
  keywords: z.array(z.string().trim().min(1)).max(20),
});

export const studyMaterialJsonSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "shortSummary", "keywords"],
  properties: {
    summary: { type: "string" },
    shortSummary: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
  },
};

// ---------- Questões ----------
// A validação aqui é propositalmente estrutural; regras por questão (4 alternativas, resposta
// presente, trecho no texto) são aplicadas depois, descartando só as questões inválidas.

export const questionsValidator = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()),
        answer: z.string(),
        sourceExcerpt: z.string(),
      }),
    )
    .max(20),
});

export const questionsJsonSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options", "answer", "sourceExcerpt"],
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "string" },
          sourceExcerpt: { type: "string" },
        },
      },
    },
  },
};
