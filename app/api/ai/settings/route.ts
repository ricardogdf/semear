import { NextResponse } from "next/server";

import { getAiSettings, setDefaultAiProvider } from "@/server/db";
import { aiPreferencesSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

/** Configurações de IA do próprio usuário. Nunca inclui as chaves (apenas os 4 últimos caracteres). */
export const GET = authRoute("user", async ({ user }) => NextResponse.json(await getAiSettings(user.id)));

export const PUT = authRoute("user", async ({ request, user }) => {
  const input = await readJson(request, aiPreferencesSchema);
  await setDefaultAiProvider(user.id, input.defaultProvider);
  return NextResponse.json(await getAiSettings(user.id));
});
