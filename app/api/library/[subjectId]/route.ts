import { NextResponse } from "next/server";

import { getPublicSubject } from "@/server/db";

import { publicRoute } from "@/server/http/api";

type Params = { subjectId: string };

/** Página pública de uma matéria original publicada (matérias privadas e cópias: 404). */
export const GET = publicRoute<Params>(async ({ user, params }) =>
  NextResponse.json(await getPublicSubject(user?.id ?? null, params.subjectId)),
);
