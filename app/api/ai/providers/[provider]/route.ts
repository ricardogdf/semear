import { NextResponse } from "next/server";

import {
  connectAiProvider,
  disconnectAiProvider,
  getAiSettings,
  setAiDefaultModel,
} from "@/server/db";
import { aiProviderSchema, connectAiProviderSchema, setDefaultModelSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

type Params = { provider: string };

/** Conecta ou substitui a chave: valida no provedor e armazena criptografada. */
export const PUT = authRoute<Params>("user", async ({ request, user, params }) => {
  const provider = aiProviderSchema.parse(params.provider);
  const { apiKey } = await readJson(request, connectAiProviderSchema);
  await connectAiProvider(user.id, provider, apiKey);
  return NextResponse.json(await getAiSettings(user.id));
});

/** Define o modelo padrão do provedor (precisa estar na lista de modelos compatíveis). */
export const PATCH = authRoute<Params>("user", async ({ request, user, params }) => {
  const provider = aiProviderSchema.parse(params.provider);
  const { model } = await readJson(request, setDefaultModelSchema);
  await setAiDefaultModel(user.id, provider, model);
  return NextResponse.json(await getAiSettings(user.id));
});

/** Desconecta: a credencial criptografada é apagada do banco. */
export const DELETE = authRoute<Params>("user", async ({ user, params }) => {
  const provider = aiProviderSchema.parse(params.provider);
  await disconnectAiProvider(user.id, provider);
  return NextResponse.json(await getAiSettings(user.id));
});
