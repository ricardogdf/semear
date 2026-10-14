import { NextResponse } from "next/server";

import { updateUserByAdmin } from "@/server/db";
import { updateUserSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

export const PATCH = authRoute<{ userId: string }>("admin", async ({ request, user, params }) => {
  const changes = await readJson(request, updateUserSchema);
  return NextResponse.json(await updateUserByAdmin(user, params.userId, changes));
});
