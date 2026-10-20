import { NextResponse } from "next/server";

import { deleteModule, renameModule } from "@/server/db";
import { moduleSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

type Params = { moduleId: string };

export const PATCH = authRoute<Params>("user", async ({ request, user, params }) => {
  const { title } = await readJson(request, moduleSchema);
  return NextResponse.json(await renameModule(user.id, params.moduleId, title));
});

export const DELETE = authRoute<Params>("user", async ({ user, params }) => {
  await deleteModule(user.id, params.moduleId);
  return NextResponse.json({ ok: true });
});
