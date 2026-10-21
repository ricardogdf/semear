import { NextResponse } from "next/server";

import { DomainError, rankProfiles, rankPublications, rankSubjects } from "@/server/db";
import { pageQuerySchema, rankingSchema } from "@/lib/utils";

import { authRoute } from "@/server/http/api";

type Params = { ranking: string };

const rankings = { subjects: rankSubjects, publications: rankPublications, profiles: rankProfiles };

/** Rankings da área "Conheça", calculados no banco a partir das relações reais. */
export const GET = authRoute<Params>("user", async ({ request, user, params }) => {
  const ranking = rankingSchema.safeParse(params.ranking);
  if (!ranking.success) {
    throw new DomainError("NOT_FOUND", "Ranking não encontrado.");
  }
  const { page } = pageQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  return NextResponse.json(await rankings[ranking.data](user.id, page));
});
