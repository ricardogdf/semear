import { NextResponse } from "next/server";

import { deleteSubject, getSubjectDetail, updateSubject } from "@/server/db";
import { updateSubjectSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

type Params = { subjectId: string };

export const GET = authRoute<Params>("user", async ({ user, params }) =>
  NextResponse.json(await getSubjectDetail(user.id, params.subjectId)),
);

export const PATCH = authRoute<Params>("user", async ({ request, user, params }) => {
  const changes = await readJson(request, updateSubjectSchema);
  await updateSubject(user.id, params.subjectId, changes);
  return NextResponse.json(await getSubjectDetail(user.id, params.subjectId));
});

export const DELETE = authRoute<Params>("user", async ({ user, params }) => {
  await deleteSubject(user.id, params.subjectId);
  return NextResponse.json({ ok: true });
});
