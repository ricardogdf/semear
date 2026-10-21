import { NextResponse } from "next/server";

import { importSubject } from "@/server/db";

import { authRoute } from "@/server/http/api";

type Params = { subjectId: string };

/**
 * Importa uma matéria pública para a biblioteca pessoal. Só aceita matérias: o identificador é
 * procurado apenas entre matérias originais públicas, então o de uma publicação acadêmica dá 404.
 * 201: cópia criada. 200: já importada (devolve a cópia existente, sem nova contagem).
 */
export const POST = authRoute<Params>("user", async ({ user, params }) => {
  const result = await importSubject(user.id, params.subjectId);
  return NextResponse.json(result, { status: result.alreadyImported ? 200 : 201 });
});
