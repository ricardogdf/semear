import { NextResponse } from "next/server";

import { rejectAccessRequest } from "@/server/db";
import { rejectAccessRequestSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

export const POST = authRoute<{ requestId: string }>("admin", async ({ request, user, params }) => {
  const input = await readJson(request, rejectAccessRequestSchema);
  await rejectAccessRequest(user, params.requestId, input.note);
  return NextResponse.json({ ok: true });
});
