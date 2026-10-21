import { NextResponse } from "next/server";

import { getSubjectDetail, setSubjectVisibility } from "@/server/db";
import { subjectVisibilitySchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

type Params = { subjectId: string };

/** Publica ou despublica uma matéria original do próprio usuário (cópias importadas: 403). */
export const PUT = authRoute<Params>("user", async ({ request, user, params }) => {
  const input = await readJson(request, subjectVisibilitySchema);
  await setSubjectVisibility(user.id, params.subjectId, input);
  return NextResponse.json(await getSubjectDetail(user.id, params.subjectId));
});
