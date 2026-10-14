"use client";

import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "./api";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          // Não insiste em erros de autenticação/permissão/validação.
          !(error instanceof ApiError && error.status < 500) && failureCount < 2,
      },
    },
  });
}
