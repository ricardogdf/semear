import { NextResponse } from "next/server";

import { followUser, unfollowUser } from "@/server/db";

import { authRoute } from "@/server/http/api";

type Params = { userId: string };

/** O seguidor é sempre o usuário da sessão; o corpo da requisição é ignorado. */
export const PUT = authRoute<Params>("user", async ({ user, params }) =>
  NextResponse.json(await followUser(user.id, params.userId)),
);

export const DELETE = authRoute<Params>("user", async ({ user, params }) =>
  NextResponse.json(await unfollowUser(user.id, params.userId)),
);
