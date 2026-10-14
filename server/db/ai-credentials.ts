import type { AiProvider, Prisma } from "@prisma/client";

import {
  AiProviderError,
  aiProviders,
  createProviderClient,
  type AiModelInfo,
  type AiProviderClient,
  type ProviderClientOptions,
} from "@/server/ai";
import { aiProviderValues, type AiSettingsOverview } from "@/lib/utils";

import { prisma } from "./client";
import { DomainError } from "./errors";
import {
  decryptSecret,
  EncryptionNotConfiguredError,
  encryptSecret,
  isEncryptionConfigured,
} from "./security/encryption";

/** Permite que os testes substituam a criação de clientes de provedor (sem rede). */
type ProviderClientFactory = (provider: AiProvider, options: ProviderClientOptions) => AiProviderClient;
let providerClientFactory: ProviderClientFactory = createProviderClient;

export function setProviderClientFactoryForTests(factory: ProviderClientFactory | null) {
  providerClientFactory = factory ?? createProviderClient;
}

export function getProviderClient(provider: AiProvider, apiKey: string, options: Partial<ProviderClientOptions> = {}) {
  return providerClientFactory(provider, { apiKey, ...options });
}

const VALIDATION_TIMEOUT_MS = 20_000;

function associatedData(userId: string, provider: AiProvider) {
  return `semear:ai-credential:${userId}:${provider}`;
}

function toModelList(value: Prisma.JsonValue): AiModelInfo[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    entry && typeof entry === "object" && !Array.isArray(entry) && typeof entry.id === "string"
      ? [{ id: entry.id, displayName: typeof entry.displayName === "string" ? entry.displayName : entry.id }]
      : [],
  );
}

export async function getAiSettings(userId: string): Promise<AiSettingsOverview> {
  const [user, credentials] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { defaultAiProvider: true } }),
    prisma.aiCredential.findMany({ where: { userId } }),
  ]);

  return {
    encryptionConfigured: isEncryptionConfigured(),
    defaultProvider: user?.defaultAiProvider ?? null,
    providers: aiProviderValues.map((provider) => {
      const credential = credentials.find((entry) => entry.provider === provider);
      const meta = aiProviders[provider];
      return {
        provider,
        label: meta.label,
        product: meta.product,
        apiKeyUrl: meta.apiKeyUrl,
        apiKeyInstructions: meta.apiKeyInstructions,
        connected: Boolean(credential),
        keyHint: credential ? `••••${credential.keyHint}` : null,
        defaultModel: credential?.defaultModel ?? null,
        models: credential ? toModelList(credential.availableModels) : [],
        lastValidatedAt: credential?.lastValidatedAt?.toISOString() ?? null,
        lastErrorCode: credential?.lastErrorCode ?? null,
      };
    }),
  };
}

/**
 * Valida a chave no provedor (listando modelos) e só então a armazena criptografada.
 * A chave nunca é devolvida ao cliente nem registrada em logs.
 */
export async function connectAiProvider(userId: string, provider: AiProvider, apiKey: string) {
  if (!isEncryptionConfigured()) {
    throw new EncryptionNotConfiguredError();
  }

  const models = await getProviderClient(provider, apiKey, {
    timeoutMs: VALIDATION_TIMEOUT_MS,
    maxRetries: 1,
  }).listModels();

  if (models.length === 0) {
    throw new DomainError(
      "VALIDATION",
      "A chave é válida, mas nenhum modelo compatível com geração estruturada de texto está disponível para ela.",
    );
  }

  const existing = await prisma.aiCredential.findUnique({ where: { userId_provider: { userId, provider } } });
  const encrypted = encryptSecret(apiKey, associatedData(userId, provider));
  const keepDefault = existing?.defaultModel && models.some((model) => model.id === existing.defaultModel);

  const data = {
    encryptedKey: encrypted.ciphertext,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    keyVersion: encrypted.keyVersion,
    keyHint: apiKey.slice(-4),
    availableModels: models as unknown as Prisma.InputJsonValue,
    defaultModel: keepDefault ? existing!.defaultModel : null,
    lastValidatedAt: new Date(),
    lastErrorCode: null,
  };

  await prisma.$transaction(async (tx) => {
    await tx.aiCredential.upsert({
      where: { userId_provider: { userId, provider } },
      create: { userId, provider, ...data },
      update: data,
    });
    await tx.user.updateMany({
      where: { id: userId, defaultAiProvider: null },
      data: { defaultAiProvider: provider },
    });
  });

  return { models };
}

async function getCredentialOrThrow(userId: string, provider: AiProvider) {
  const credential = await prisma.aiCredential.findUnique({ where: { userId_provider: { userId, provider } } });
  if (!credential) {
    throw new DomainError(
      "PRECONDITION_FAILED",
      `O provedor ${aiProviders[provider].label} não está conectado. Conecte sua chave de API em Configurações de IA.`,
    );
  }
  return credential;
}

function decryptCredential(userId: string, credential: Awaited<ReturnType<typeof getCredentialOrThrow>>) {
  try {
    return decryptSecret(
      {
        ciphertext: credential.encryptedKey,
        iv: credential.iv,
        authTag: credential.authTag,
        keyVersion: credential.keyVersion,
      },
      associatedData(userId, credential.provider),
    );
  } catch (error) {
    if (error instanceof EncryptionNotConfiguredError) throw error;
    // Chave mestra trocada ou dado adulterado: não é possível usar a credencial.
    throw new DomainError(
      "PRECONDITION_FAILED",
      `Não foi possível ler a credencial armazenada de ${aiProviders[credential.provider].label}. Reconecte a chave de API.`,
    );
  }
}

/** Revalida a credencial armazenada e atualiza a lista de modelos. */
export async function testAiProvider(userId: string, provider: AiProvider) {
  const credential = await getCredentialOrThrow(userId, provider);
  const apiKey = decryptCredential(userId, credential);

  try {
    const models = await getProviderClient(provider, apiKey, {
      timeoutMs: VALIDATION_TIMEOUT_MS,
      maxRetries: 1,
    }).listModels();
    const keepDefault = credential.defaultModel && models.some((model) => model.id === credential.defaultModel);

    await prisma.aiCredential.update({
      where: { id: credential.id },
      data: {
        availableModels: models as unknown as Prisma.InputJsonValue,
        defaultModel: keepDefault ? credential.defaultModel : null,
        lastValidatedAt: new Date(),
        lastErrorCode: null,
      },
    });
    return { models };
  } catch (error) {
    if (error instanceof AiProviderError) {
      await prisma.aiCredential.update({ where: { id: credential.id }, data: { lastErrorCode: error.code } });
    }
    throw error;
  }
}

export async function setAiDefaultModel(userId: string, provider: AiProvider, model: string) {
  const credential = await getCredentialOrThrow(userId, provider);
  if (!toModelList(credential.availableModels).some((entry) => entry.id === model)) {
    throw new DomainError(
      "VALIDATION",
      "Modelo não disponível para esta credencial. Atualize a lista de modelos e tente novamente.",
    );
  }
  await prisma.aiCredential.update({ where: { id: credential.id }, data: { defaultModel: model } });
}

/** Remove a credencial (a linha criptografada é apagada do banco). */
export async function disconnectAiProvider(userId: string, provider: AiProvider) {
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.aiCredential.deleteMany({ where: { userId, provider } });
    if (deleted.count === 0) {
      throw new DomainError("NOT_FOUND", "Provedor não conectado.");
    }

    const user = await tx.user.findUnique({ where: { id: userId }, select: { defaultAiProvider: true } });
    if (user?.defaultAiProvider === provider) {
      const next = await tx.aiCredential.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
      await tx.user.update({ where: { id: userId }, data: { defaultAiProvider: next?.provider ?? null } });
    }
  });
}

export async function setDefaultAiProvider(userId: string, provider: AiProvider | null) {
  if (provider) {
    await getCredentialOrThrow(userId, provider);
  }
  await prisma.user.update({ where: { id: userId }, data: { defaultAiProvider: provider } });
}

interface ResolvedAiSelection {
  provider: AiProvider;
  model: string;
  apiKey: string;
}

/**
 * Resolve provedor e modelo para uma execução. Nunca troca de provedor silenciosamente:
 * se o escolhido (ou o padrão) não estiver utilizável, a execução é recusada com orientação.
 */
export async function resolveAiSelection(
  userId: string,
  requested: { provider?: AiProvider; model?: string },
): Promise<ResolvedAiSelection> {
  let provider = requested.provider;

  if (!provider) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { defaultAiProvider: true } });
    provider = user?.defaultAiProvider ?? undefined;
  }

  if (!provider) {
    throw new DomainError(
      "PRECONDITION_FAILED",
      "Nenhum provedor de IA conectado. Acesse Configurações de IA, conecte sua chave de API e escolha um modelo.",
    );
  }

  const credential = await getCredentialOrThrow(userId, provider);
  const model = requested.model ?? credential.defaultModel ?? undefined;

  if (!model) {
    throw new DomainError(
      "VALIDATION",
      `Selecione um modelo de ${aiProviders[provider].label} para processar o arquivo.`,
    );
  }

  if (!toModelList(credential.availableModels).some((entry) => entry.id === model)) {
    throw new DomainError(
      "VALIDATION",
      "O modelo selecionado não está na lista de modelos compatíveis desta credencial. Atualize a lista em Configurações de IA.",
    );
  }

  return { provider, model, apiKey: decryptCredential(userId, credential) };
}

export async function recordCredentialError(userId: string, provider: AiProvider, code: string) {
  await prisma.aiCredential.updateMany({ where: { userId, provider }, data: { lastErrorCode: code } });
}
