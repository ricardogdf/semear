import { NextResponse } from "next/server";

import { listPublicSubjects } from "@/server/db";
import { librarySearchSchema } from "@/lib/utils";

import { authRoute } from "@/server/http/api";

/** Biblioteca pública: matérias originais publicadas. */
export const GET = authRoute("user", async ({ request, user }) => {
  const filters = librarySearchSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return NextResponse.json(await listPublicSubjects(user.id, filters));
});
