import { notFound } from "next/navigation";

import { isDomainError } from "@/server/db";

/** Em páginas do servidor, converte o NOT_FOUND das regras de negócio na página 404 do Next. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (isDomainError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
}
