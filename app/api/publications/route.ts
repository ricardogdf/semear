import { NextResponse } from "next/server";

import { createPublication, listOwnPublications, listPublicPublications } from "@/server/db";
import { createPublicationSchema, publicationSearchSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

/** Publicações públicas; com `?mine=1`, todas as do próprio usuário (para gerenciar). */
export const GET = authRoute("user", async ({ request, user }) => {
  const searchParams = new URL(request.url).searchParams;
  if (searchParams.get("mine") === "1") {
    return NextResponse.json(await listOwnPublications(user.id));
  }
  const filters = publicationSearchSchema.parse(Object.fromEntries(searchParams));
  return NextResponse.json(await listPublicPublications(user.id, filters));
});

export const POST = authRoute("user", async ({ request, user }) => {
  const input = await readJson(request, createPublicationSchema);
  return NextResponse.json(await createPublication(user.id, input), { status: 201 });
});
