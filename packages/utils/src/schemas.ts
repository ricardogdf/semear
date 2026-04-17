import { z } from "zod";

import { subjectStatusValues } from "./types";

export const uploadContentSchema = z.object({
  subjectId: z.string().min(1, "Selecione uma materia."),
});

export const simulationAnswerSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1, "Selecione uma resposta."),
});

export const simulationSubmissionSchema = z.object({
  subjectId: z.string().min(1),
  answers: z.array(simulationAnswerSchema).min(1),
});

export const subjectStatusFilterSchema = z.enum(subjectStatusValues).optional();
