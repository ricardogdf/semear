import { NextResponse } from "next/server";

import { getAiSettings, testAiProvider } from "@/server/db";
import { aiProviderSchema } from "@/lib/utils";

import { authRoute } from "@/server/http/api";

/** Testa a conexão com a chave armazenada e atualiza a lista de modelos compatíveis. */
export const POST = authRoute<{ provider: string }>("user", async ({ user, params }) => {
  const provider = aiProviderSchema.parse(params.provider);
  await testAiProvider(user.id, provider);
  return NextResponse.json(await getAiSettings(user.id));
});
