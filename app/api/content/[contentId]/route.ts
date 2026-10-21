import { NextResponse } from "next/server";

import { deleteContent, updateContent } from "@/server/db";
import { updateContentSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

type Params = { contentId: string };

export const PATCH = authRoute<Params>("user", async ({ request, user, params }) => {
  const changes = await readJson(request, updateContentSchema);
  return NextResponse.json(await updateContent(user.id, params.contentId, changes));
});

export const DELETE = authRoute<Params>("user", async ({ user, params }) => {
  await deleteContent(user.id, params.contentId);
  return NextResponse.json({ ok: true });
});
