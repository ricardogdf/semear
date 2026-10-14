import { NextResponse } from "next/server";

import { getContentProcessingHistory } from "@/server/db";

import { authRoute } from "@/server/http/api";

export const GET = authRoute<{ contentId: string }>("user", async ({ user, params }) =>
  NextResponse.json(await getContentProcessingHistory(user.id, params.contentId)),
);
