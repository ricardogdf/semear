import { NextResponse } from "next/server";

import { issueSetupCodeByAdmin } from "@/server/db";

import { authRoute } from "@/server/http/api";

/** Gera novo código de primeiro acesso/redefinição de senha (invalida o anterior). */
export const POST = authRoute<{ userId: string }>("admin", async ({ user, params }) =>
  NextResponse.json(await issueSetupCodeByAdmin(user, params.userId), {
    headers: { "Cache-Control": "no-store" },
  }),
);
