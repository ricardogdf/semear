import { NextResponse } from "next/server";

import { reprocessContent } from "@/server/db";
import { aiSelectionSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

export const maxDuration = 300;

export const POST = authRoute<{ contentId: string }>("user", async ({ request, user, params }) => {
  const selection = await readJson(request, aiSelectionSchema);
  return NextResponse.json(await reprocessContent(user.id, params.contentId, selection));
});
