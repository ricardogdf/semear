import { NextResponse } from "next/server";

import { login } from "@/server/db";
import { loginSchema } from "@/lib/utils";

import { getClientIp, publicRoute, readJson } from "@/server/http/api";
import { setSessionCookie } from "@/server/http/session";

export const POST = publicRoute(async ({ request }) => {
  const input = await readJson(request, loginSchema);
  const session = await login(input.email, input.password, {
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });

  const response = NextResponse.json({ user: session.user });
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
});
