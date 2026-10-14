import { NextResponse } from "next/server";

import { deleteContent } from "@/server/db";
import { authRoute } from "@/server/http/api";

export const DELETE = authRoute<{ contentId: string }>("user", async ({ user, params }) => {
  await deleteContent(user.id, params.contentId);
  return NextResponse.json({ ok: true });
});
