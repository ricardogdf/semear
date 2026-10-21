"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, UserRoundSearch } from "lucide-react";

import { Button, Input, Label } from "@/components/ui";

import { searchUsers, type UserSearchFilters } from "@/lib/api";

import { UserCard } from "./cards";
import { EmptyState } from "./empty-state";
import { InfiniteList, pagedQueryOptions } from "./infinite-list";
import { PageHeader } from "./page-header";

const emptyFilters: UserSearchFilters = { q: "", institution: "", course: "" };

/** Pesquisa por nome, com filtros de instituição e curso. A busca roda ao enviar (não a cada tecla). */
export function PeopleSearch() {
  const [draft, setDraft] = React.useState(emptyFilters);
  const [filters, setFilters] = React.useState(emptyFilters);

  const query = useInfiniteQuery({
    queryKey: ["people", filters],
    queryFn: ({ pageParam }) => searchUsers(filters, pageParam),
    ...pagedQueryOptions,
  });

  const hasFilters = Object.values(filters).some(Boolean);
  const field = (key: keyof UserSearchFilters) => ({
    value: draft[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [key]: event.target.value }),
  });

  return (
    <div className="space-y-6">
      <PageHeader icon={UserRoundSearch} title="Pesquisar usuários">
        Encontre colegas pelo nome e filtre por instituição ou curso.
      </PageHeader>

      <form
        role="search"
        className="grid gap-3 rounded-[2rem] border border-border/60 bg-card p-4 sm:p-5 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters({ q: draft.q.trim(), institution: draft.institution.trim(), course: draft.course.trim() });
        }}
      >
        <div>
          <Label htmlFor="people-q">Nome</Label>
          <Input id="people-q" className="mt-2" type="search" maxLength={80} placeholder="Ex.: Ana Souza" {...field("q")} />
        </div>
        <div>
          <Label htmlFor="people-institution">Instituição</Label>
          <Input id="people-institution" className="mt-2" maxLength={120} placeholder="Ex.: UFMG" {...field("institution")} />
        </div>
        <div>
          <Label htmlFor="people-course">Curso</Label>
          <Input id="people-course" className="mt-2" maxLength={120} placeholder="Ex.: Biologia" {...field("course")} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1 md:flex-none">
            <Search className="mr-2 h-4 w-4" aria-hidden /> Pesquisar
          </Button>
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraft(emptyFilters);
                setFilters(emptyFilters);
              }}
            >
              Limpar
            </Button>
          ) : null}
        </div>
      </form>

      <section aria-label="Resultados da pesquisa">
        <InfiniteList
          query={query}
          getKey={(user) => user.id}
          renderItem={(user) => <UserCard user={user} authenticated />}
          loadingLabel="Pesquisando usuários…"
          errorTitle="Não foi possível pesquisar"
          className="md:grid-cols-2"
          empty={
            <EmptyState icon={UserRoundSearch} title="Nenhum usuário encontrado">
              {hasFilters ? "Tente outro nome ou remova algum filtro." : "Ainda não há outros usuários na comunidade."}
            </EmptyState>
          }
        />
      </section>
    </div>
  );
}
