import { NextResponse } from "next/server";

import { logout } from "@/server/db";

import { publicRoute } from "@/server/http/api";
import { clearSessionCookie, getSessionTokenFromRequest } from "@/server/http/session";

/** Encerra a sessão: apaga o registro no banco (revogação) e remove o cookie. */
export const POST = publicRoute(async ({ request }) => {
  await logout(getSessionTokenFromRequest(request));
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
});
