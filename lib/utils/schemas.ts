import { z } from "zod";

import {
  accessRequestStatusValues,
  aiProviderValues,
  publicationTypeValues,
  rankingValues,
  subjectStatusValues,
  userRoleValues,
  visibilityValues,
} from "./types";

/**
 * Schemas de entrada compartilhados entre frontend (validação imediata) e backend
 * (validação obrigatória). O backend sempre revalida.
 */

const email = z
  .string({ required_error: "Informe o e-mail." })
  .trim()
  .min(1, "Informe o e-mail.")
  .max(254, "E-mail longo demais.")
  .email("Informe um e-mail válido.");

const personName = z
  .string({ required_error: "Informe o nome." })
  .trim()
  .min(2, "Informe o nome completo.")
  .max(120, "Nome longo demais.");

const passwordSchema = z
  .string({ required_error: "Informe a senha." })
  .min(10, "A senha deve ter pelo menos 10 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.")
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), "A senha deve conter letras e números.");

export const loginSchema = z.object({
  email,
  password: z.string({ required_error: "Informe a senha." }).min(1, "Informe a senha.").max(128),
});

export const passwordSetupSchema = z
  .object({
    email,
    code: z
      .string({ required_error: "Informe o código." })
      .trim()
      .min(16, "Código incompleto.")
      .max(40, "Código inválido."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual.").max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export const accessRequestSchema = z.object({
  name: personName,
  email,
  message: z.string().trim().max(1000, "Use no máximo 1000 caracteres.").optional().or(z.literal("")),
  /** Campo isca (honeypot): deve permanecer vazio. */
  website: z.string().max(500).optional(),
});

const userRoleSchema = z.enum(userRoleValues);

export const createUserSchema = z.object({
  name: personName,
  email,
  role: userRoleSchema.default("USER"),
});

export const updateUserSchema = z
  .object({
    name: personName.optional(),
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Nenhuma alteração informada.");

export const accessRequestStatusFilterSchema = z.enum(accessRequestStatusValues).optional();

export const approveAccessRequestSchema = z.object({
  role: userRoleSchema.default("USER"),
  name: personName.optional(),
  note: z.string().trim().max(500).optional(),
});

export const rejectAccessRequestSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const aiProviderSchema = z.enum(aiProviderValues);

export const connectAiProviderSchema = z.object({
  apiKey: z
    .string({ required_error: "Informe a chave de API." })
    .trim()
    .min(10, "Chave de API muito curta.")
    .max(500, "Chave de API longa demais.")
    .refine((value) => !/\s/.test(value), "A chave não deve conter espaços."),
});

export const setDefaultModelSchema = z.object({
  model: z.string().trim().min(1, "Selecione um modelo.").max(200),
});

export const aiPreferencesSchema = z.object({
  defaultProvider: aiProviderSchema.nullable(),
});

/** Seleção opcional de provedor/modelo para uma execução específica. */
export const aiSelectionSchema = z.object({
  provider: aiProviderSchema.optional(),
  model: z.string().trim().min(1).max(200).optional(),
});

const moduleTitle = z
  .string({ required_error: "Informe o nome do módulo." })
  .trim()
  .min(1, "Informe o nome do módulo.")
  .max(120, "Nome de módulo longo demais.");

export const uploadContentSchema = z.object({
  subjectId: z.string().trim().min(1, "Selecione ou digite uma matéria.").max(120, "Nome de matéria longo demais."),
  /** Módulo da matéria (existente ou novo). Vazio: aula sem módulo. */
  module: z.string().trim().max(120, "Nome de módulo longo demais.").optional(),
});

/** Criação e renomeação de módulo. */
export const moduleSchema = z.object({ title: moduleTitle }).strict();

/** Move a aula para outro módulo da mesma matéria (null: sem módulo) e/ou a marca como concluída. */
export const updateContentSchema = z
  .object({
    moduleId: z.string().trim().min(1).max(64).nullable().optional(),
    completed: z.boolean().optional(),
  })
  .strict()
  .refine((data) => data.moduleId !== undefined || data.completed !== undefined, "Nenhuma alteração informada.");

export const simulationSubmissionSchema = z.object({
  answers: z
    .array(
      z.object({
        questionIndex: z.number().int().min(0).max(99),
        answer: z.string().max(2000).nullable(),
      }),
    )
    .max(100),
});

export const generateSimulationSchema = z.object({
  subjectId: z.string().trim().min(1, "Matéria obrigatória."),
  /** Sorteia só das aulas deste módulo. Ausente ou null: matéria completa. */
  moduleId: z.string().trim().min(1).max(64).nullish(),
});

export const subjectStatusFilterSchema = z.enum(subjectStatusValues).optional();

export const updateSubjectSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    instructor: z.string().trim().max(120).optional(),
    workloadHours: z.number().int().min(0).max(2000).optional(),
    status: z.enum(subjectStatusValues).optional(),
    progress: z.number().int().min(0).max(100).optional(),
  })
  .strict();

// ---------- Comunidade ----------

/** Campo enviado vazio vira null (limpa o valor); campo ausente continua ausente (não altera). */
const emptyToNull = (value: string | null | undefined) => (value === undefined ? undefined : value || null);

/** Texto opcional: vazio limpa o campo. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}: use no máximo ${max} caracteres.`)
    .nullish()
    .transform(emptyToNull);

function isUrlWithProtocol(value: string, protocols: string[]) {
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** URL opcional com protocolo permitido (bloqueia javascript:, data: e credenciais embutidas). */
const optionalUrl = (protocols: string[], message: string) =>
  z
    .string()
    .trim()
    .max(500, "Endereço longo demais.")
    .nullish()
    .transform(emptyToNull)
    .refine((value) => !value || isUrlWithProtocol(value, protocols), message);

/** Recusa datas que não existem no calendário (ex.: 2024-02-31). */
function isRealDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Campos públicos do perfil, editáveis só pelo próprio usuário. */
export const updateProfileSchema = z
  .object({
    displayName: optionalText(80, "Nome de exibição"),
    bio: optionalText(500, "Biografia"),
    institution: optionalText(120, "Instituição"),
    course: optionalText(120, "Curso"),
    avatarUrl: optionalUrl(["https:"], "Use um endereço de imagem que comece com https://."),
  })
  .strict();

const pageParam = z.coerce.number().int().min(1, "Página inválida.").max(500, "Página inválida.").default(1);
const searchText = (max: number) => z.string().trim().max(max, "Pesquisa longa demais.").default("");

export const userSearchSchema = z.object({
  q: searchText(80),
  institution: searchText(120),
  course: searchText(120),
  page: pageParam,
});

export const pageQuerySchema = z.object({ page: pageParam });

export const librarySearchSchema = z.object({
  q: searchText(120),
  sort: z.enum(["recent", "popular"]).default("recent"),
  page: pageParam,
});

export const publicationSearchSchema = z.object({ q: searchText(120), page: pageParam });

export const rankingSchema = z.enum(rankingValues);

/** Publica ou despublica uma matéria original (cópias importadas são recusadas no servidor). */
export const subjectVisibilitySchema = z
  .object({
    visibility: z.enum(visibilityValues),
    description: z.string().trim().max(1000, "Descrição: use no máximo 1000 caracteres.").optional(),
  })
  .strict();

const publicationFields = {
  type: z.enum(publicationTypeValues, { errorMap: () => ({ message: "Escolha o tipo da publicação." }) }),
  title: z.string({ required_error: "Informe o título." }).trim().min(3, "Informe o título.").max(300, "Título longo demais."),
  authors: z
    .string({ required_error: "Informe o(s) autor(es)." })
    .trim()
    .min(2, "Informe o(s) autor(es).")
    .max(500, "Lista de autores longa demais."),
  abstract: z.string().trim().max(5000, "Resumo: use no máximo 5000 caracteres.").default(""),
  institution: optionalText(160, "Instituição"),
  publishedOn: z
    .string()
    .trim()
    .nullish()
    .transform(emptyToNull)
    .refine(
      (value) =>
        !value ||
        (/^\d{4}-\d{2}-\d{2}$/.test(value) && isRealDate(value) && value >= "1900-01-01" && value <= "2100-12-31"),
      "Data de publicação inválida.",
    ),
  externalUrl: optionalUrl(["https:", "http:"], "Use um endereço que comece com https:// ou http://."),
  visibility: z.enum(visibilityValues),
};

export const createPublicationSchema = z.object(publicationFields).strict();

export const updatePublicationSchema = z
  .object(publicationFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Nenhuma alteração informada.");
