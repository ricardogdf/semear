import { NextResponse } from "next/server";

import { createUserByAdmin, listUsers } from "@/server/db";
import { createUserSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

export const GET = authRoute("admin", async ({ user }) => NextResponse.json(await listUsers(user)));

/** Cria a conta e devolve o código de primeiro acesso (exibido uma única vez ao administrador). */
export const POST = authRoute("admin", async ({ request, user }) => {
  const input = await readJson(request, createUserSchema);
  return NextResponse.json(await createUserByAdmin(user, input), { status: 201 });
});
