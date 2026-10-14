import { NextResponse } from "next/server";

import { listAccessRequests } from "@/server/db";
import { accessRequestStatusFilterSchema } from "@/lib/utils";

import { authRoute } from "@/server/http/api";

export const GET = authRoute("admin", async ({ request, user }) => {
  const status = accessRequestStatusFilterSchema.parse(
    new URL(request.url).searchParams.get("status") ?? undefined,
  );
  return NextResponse.json(await listAccessRequests(user, status));
});
