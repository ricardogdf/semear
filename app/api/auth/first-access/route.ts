import { NextResponse } from "next/server";

import { completePasswordSetup } from "@/server/db";
import { passwordSetupSchema } from "@/lib/utils";

import { getClientIp, publicRoute, readJson } from "@/server/http/api";
import { setSessionCookie } from "@/server/http/session";

/** Define a senha com o código de uso único emitido pelo administrador. */
export const POST = publicRoute(async ({ request }) => {
  const input = await readJson(request, passwordSetupSchema);
  const session = await completePasswordSetup(input, {
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });

  const response = NextResponse.json({ user: session.user });
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
});
