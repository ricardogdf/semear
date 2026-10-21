import { NextResponse } from "next/server";

import { searchUsers } from "@/server/db";
import { userSearchSchema } from "@/lib/utils";

import { authRoute } from "@/server/http/api";

/** Pesquisa de usuários (só para usuários autenticados, com limite de taxa). */
export const GET = authRoute("user", async ({ request, user }) => {
  const filters = userSearchSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return NextResponse.json(await searchUsers(user.id, filters));
});
