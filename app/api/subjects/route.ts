import { NextResponse } from "next/server";

import { getSubjectOptions, getSubjectsOverview } from "@/server/db";
import { subjectStatusFilterSchema } from "@/lib/utils";

import { authRoute } from "@/server/http/api";

export const GET = authRoute("user", async ({ request, user }) => {
  const searchParams = new URL(request.url).searchParams;

  if (searchParams.get("compact") === "1") {
    return NextResponse.json(await getSubjectOptions(user.id));
  }

  const status = subjectStatusFilterSchema.parse(searchParams.get("status") ?? undefined);
  return NextResponse.json(await getSubjectsOverview(user.id, status));
});
