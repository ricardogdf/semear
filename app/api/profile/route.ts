import { NextResponse } from "next/server";

import { getOwnProfile, updateOwnProfile } from "@/server/db";
import { updateProfileSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

/** Perfil do próprio usuário: o alvo vem sempre da sessão, nunca de um parâmetro. */
export const GET = authRoute("user", async ({ user }) => NextResponse.json(await getOwnProfile(user.id)));

export const PATCH = authRoute("user", async ({ request, user }) => {
  const changes = await readJson(request, updateProfileSchema);
  return NextResponse.json(await updateOwnProfile(user.id, changes));
});
