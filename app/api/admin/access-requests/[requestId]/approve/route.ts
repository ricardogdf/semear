import { NextResponse } from "next/server";

import { approveAccessRequest } from "@/server/db";
import { approveAccessRequestSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

export const POST = authRoute<{ requestId: string }>("admin", async ({ request, user, params }) => {
  const input = await readJson(request, approveAccessRequestSchema);
  return NextResponse.json(await approveAccessRequest(user, params.requestId, input), {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
});
