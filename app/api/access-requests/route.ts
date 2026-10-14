import { NextResponse } from "next/server";

import { submitAccessRequest } from "@/server/db";
import { accessRequestSchema } from "@/lib/utils";

import { getClientIp, publicRoute, readJson } from "@/server/http/api";

/**
 * Solicitação pública de acesso. Não cria conta. A resposta é sempre a mesma para não
 * revelar se o e-mail já tem conta ou solicitação pendente.
 */
export const POST = publicRoute(async ({ request }) => {
  const input = await readJson(request, accessRequestSchema);

  // Honeypot preenchido: provável robô. Responde como sucesso sem gravar.
  if (input.website) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  await submitAccessRequest({
    name: input.name,
    email: input.email,
    message: input.message,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ ok: true }, { status: 202 });
});
