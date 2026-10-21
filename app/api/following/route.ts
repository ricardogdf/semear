import { NextResponse } from "next/server";

import { listFollowing } from "@/server/db";
import { pageQuerySchema } from "@/lib/utils";

import { authRoute } from "@/server/http/api";

/** Pessoas que o usuário da sessão segue (a lista de outra pessoa não é consultável). */
export const GET = authRoute("user", async ({ request, user }) => {
  const { page } = pageQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return NextResponse.json(await listFollowing(user.id, page));
});
