"use client";

import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";

import { Alert, Button } from "@/components/ui";
import { cn, type Page } from "@/lib/utils";

/**
 * Lista paginada com "Carregar mais": estados de carregamento, erro (com nova tentativa),
 * lista vazia e fim da lista. A ordem vem do servidor e é estável entre as páginas.
 */
export function InfiniteList<T>({
  query,
  getKey,
  renderItem,
  empty,
  loadingLabel,
  errorTitle,
  ordered = false,
  className,
}: {
  query: UseInfiniteQueryResult<InfiniteData<Page<T>>, Error>;
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  empty: React.ReactNode;
  loadingLabel: string;
  errorTitle: string;
  ordered?: boolean;
  className?: string;
}) {
  if (query.isPending) {
    return (
      <div className="flex min-h-[160px] items-center justify-center" role="status">
        <LoaderCircle className="h-6 w-6 animate-spin text-primary" aria-hidden />
        <span className="sr-only">{loadingLabel}</span>
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <Alert tone="danger" title={errorTitle}>
        <p>{query.error.message}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void query.refetch()}>
          Tentar novamente
        </Button>
      </Alert>
    );
  }

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  if (items.length === 0) return <>{empty}</>;

  const List = ordered ? "ol" : "ul";
  return (
    <div className="space-y-4">
      <List className={cn("grid gap-3", className)}>
        {items.map((item, index) => (
          <li key={getKey(item)}>{renderItem(item, index)}</li>
        ))}
      </List>
      {query.isFetchNextPageError ? (
        <Alert tone="danger">Não foi possível carregar mais itens: {query.error?.message}</Alert>
      ) : null}
      {query.hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {query.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Configuração comum das consultas paginadas (página 1, depois a seguinte enquanto houver). */
export const pagedQueryOptions = {
  initialPageParam: 1,
  getNextPageParam: <T,>(last: Page<T>) => (last.hasMore ? last.page + 1 : undefined),
};
