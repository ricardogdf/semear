import { NextResponse } from "next/server";

import { deleteContent, moveContentToModule } from "@/server/db";
import { updateContentSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

type Params = { contentId: string };

export const PATCH = authRoute<Params>("user", async ({ request, user, params }) => {
  const { moduleId } = await readJson(request, updateContentSchema);
  return NextResponse.json(await moveContentToModule(user.id, params.contentId, moduleId));
});

export const DELETE = authRoute<Params>("user", async ({ user, params }) => {
  await deleteContent(user.id, params.contentId);
  return NextResponse.json({ ok: true });
});
