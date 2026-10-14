import { NextResponse } from "next/server";

import { changeOwnPassword } from "@/server/db";
import { changePasswordSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";
import { getSessionTokenFromRequest } from "@/server/http/session";

/** Troca a própria senha. Encerra as demais sessões do usuário. */
export const POST = authRoute("user", async ({ request, user }) => {
  const input = await readJson(request, changePasswordSchema);
  await changeOwnPassword(user.id, input.currentPassword, input.newPassword, getSessionTokenFromRequest(request) ?? "");
  return NextResponse.json({ ok: true });
});
