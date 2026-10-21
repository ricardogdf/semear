import { NextResponse } from "next/server";

import { likePublication, unlikePublication } from "@/server/db";

import { authRoute } from "@/server/http/api";

type Params = { publicationId: string };

/** Quem curte é sempre o usuário da sessão; o corpo da requisição é ignorado. */
export const PUT = authRoute<Params>("user", async ({ user, params }) =>
  NextResponse.json(await likePublication(user.id, params.publicationId)),
);

export const DELETE = authRoute<Params>("user", async ({ user, params }) =>
  NextResponse.json(await unlikePublication(user.id, params.publicationId)),
);
