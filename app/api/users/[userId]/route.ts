import { NextResponse } from "next/server";

import { getPublicProfile } from "@/server/db";

import { publicRoute } from "@/server/http/api";

type Params = { userId: string };

/** Perfil público: visível sem login, apenas com dados e conteúdos públicos. */
export const GET = publicRoute<Params>(async ({ user, params }) =>
  NextResponse.json(await getPublicProfile(user?.id ?? null, params.userId)),
);
