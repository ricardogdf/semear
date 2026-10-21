"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Compass, UserCheck, UserRoundSearch } from "lucide-react";

import { getFollowing } from "@/lib/api";

import { UserCard } from "./cards";
import { EmptyState } from "./empty-state";
import { InfiniteList, pagedQueryOptions } from "./infinite-list";
import { PageHeader } from "./page-header";

const actionLink =
  "inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Pessoas que o usuário segue. Deixar de seguir mantém o cartão (com "Seguir") até recarregar a lista. */
export function FollowingList() {
  const query = useInfiniteQuery({
    queryKey: ["following"],
    queryFn: ({ pageParam }) => getFollowing(pageParam),
    ...pagedQueryOptions,
  });

  return (
    <div className="space-y-6">
      <PageHeader icon={UserCheck} title="Seguindo">
        Pessoas que você acompanha. Abra um perfil para ver as matérias e publicações compartilhadas.
      </PageHeader>
      <InfiniteList
        query={query}
        getKey={(user) => user.id}
        renderItem={(user) => <UserCard user={user} authenticated />}
        loadingLabel="Carregando quem você segue…"
        errorTitle="Não foi possível carregar a lista"
        className="md:grid-cols-2"
        empty={
          <EmptyState
            icon={UserCheck}
            title="Você ainda não segue ninguém"
            action={
              <>
                <Link href="/people" className={actionLink}>
                  <UserRoundSearch className="h-4 w-4" aria-hidden /> Pesquisar usuários
                </Link>
                <Link href="/discover" className={actionLink}>
                  <Compass className="h-4 w-4" aria-hidden /> Conhecer perfis em destaque
                </Link>
              </>
            }
          >
            Siga colegas para acompanhar as matérias e publicações que eles compartilham.
          </EmptyState>
        }
      />
    </div>
  );
}
