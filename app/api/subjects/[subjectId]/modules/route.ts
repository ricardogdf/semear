import { NextResponse } from "next/server";

import { createModule } from "@/server/db";
import { moduleSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

export const POST = authRoute<{ subjectId: string }>("user", async ({ request, user, params }) => {
  const { title } = await readJson(request, moduleSchema);
  return NextResponse.json(await createModule(user.id, params.subjectId, title), { status: 201 });
});
