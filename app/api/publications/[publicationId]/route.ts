import { NextResponse } from "next/server";

import { deletePublication, getPublication, updatePublication } from "@/server/db";
import { updatePublicationSchema } from "@/lib/utils";

import { authRoute, publicRoute, readJson } from "@/server/http/api";

type Params = { publicationId: string };

/** Pública para todos; privada só para quem a cadastrou. Publicações não podem ser importadas. */
export const GET = publicRoute<Params>(async ({ user, params }) =>
  NextResponse.json(await getPublication(user?.id ?? null, params.publicationId)),
);

export const PATCH = authRoute<Params>("user", async ({ request, user, params }) => {
  const changes = await readJson(request, updatePublicationSchema);
  return NextResponse.json(await updatePublication(user.id, params.publicationId, changes));
});

export const DELETE = authRoute<Params>("user", async ({ user, params }) => {
  await deletePublication(user.id, params.publicationId);
  return NextResponse.json({ ok: true });
});
