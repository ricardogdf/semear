"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FileText, Library, Search } from "lucide-react";

import { Button, Input, Label, Select, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";

import { getLibrary, getPublications } from "@/lib/api";

import { PublicationCard, PublicSubjectCard } from "./cards";
import { EmptyState } from "./empty-state";
import { InfiniteList, pagedQueryOptions } from "./infinite-list";
import { PageHeader } from "./page-header";

function SearchBox({ id, label, placeholder, onSearch }: { id: string; label: string; placeholder: string; onSearch: (value: string) => void }) {
  const [value, setValue] = React.useState("");
  return (
    <form
      role="search"
      className="flex flex-1 items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
      <div className="flex-1">
        <Label htmlFor={id}>{label}</Label>
        <Input id={id} type="search" className="mt-2" maxLength={120} placeholder={placeholder} value={value} onChange={(event) => setValue(event.target.value)} />
      </div>
      <Button type="submit" variant="outline" aria-label="Pesquisar">
        <Search className="h-4 w-4" aria-hidden />
      </Button>
    </form>
  );
}

function SubjectsTab() {
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<"recent" | "popular">("recent");
  const query = useInfiniteQuery({
    queryKey: ["library", { q, sort }],
    queryFn: ({ pageParam }) => getLibrary({ q, sort }, pageParam),
    ...pagedQueryOptions,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <SearchBox id="library-q" label="Pesquisar matérias" placeholder="Título ou descrição" onSearch={setQ} />
        <div className="sm:w-52">
          <Label htmlFor="library-sort">Ordenar por</Label>
          <Select id="library-sort" className="mt-2" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="recent">Mais recentes</option>
            <option value="popular">Mais importadas</option>
          </Select>
        </div>
      </div>
      <InfiniteList
        query={query}
        getKey={(subject) => subject.id}
        renderItem={(subject) => <PublicSubjectCard subject={subject} authenticated />}
        loadingLabel="Carregando matérias públicas…"
        errorTitle="Não foi possível carregar a biblioteca"
        className="lg:grid-cols-2"
        empty={
          <EmptyState icon={Library} title={q ? "Nenhuma matéria encontrada" : "Nenhuma matéria publicada ainda"}>
            {q
              ? "Tente outros termos."
              : "Quando alguém publicar uma matéria, ela aparece aqui. Você pode publicar as suas na página de cada matéria."}
          </EmptyState>
        }
      />
    </div>
  );
}

function PublicationsTab() {
  const [q, setQ] = React.useState("");
  const query = useInfiniteQuery({
    queryKey: ["publications", { q }],
    queryFn: ({ pageParam }) => getPublications(q, pageParam),
    ...pagedQueryOptions,
  });

  return (
    <div className="space-y-5">
      <SearchBox id="publications-q" label="Pesquisar publicações" placeholder="Título, autores ou resumo" onSearch={setQ} />
      <InfiniteList
        query={query}
        getKey={(publication) => publication.id}
        renderItem={(publication) => <PublicationCard publication={publication} authenticated />}
        loadingLabel="Carregando publicações…"
        errorTitle="Não foi possível carregar as publicações"
        className="lg:grid-cols-2"
        empty={
          <EmptyState icon={FileText} title={q ? "Nenhuma publicação encontrada" : "Nenhuma publicação cadastrada ainda"}>
            {q ? "Tente outros termos." : "Cadastre seus artigos e TCCs em Perfil público."}
          </EmptyState>
        }
      />
    </div>
  );
}

/** Biblioteca pública: matérias para importar e publicações acadêmicas para ler, curtir e compartilhar. */
export function LibraryScreen() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Library} title="Biblioteca pública">
        Matérias publicadas por outros usuários (importe para estudar com seus próprios simulados) e publicações
        acadêmicas para ler, curtir e compartilhar.
      </PageHeader>
      <Tabs defaultValue="subjects">
        <TabsList>
          <TabsTrigger value="subjects">Matérias</TabsTrigger>
          <TabsTrigger value="publications">Publicações</TabsTrigger>
        </TabsList>
        <TabsContent value="subjects">
          <SubjectsTab />
        </TabsContent>
        <TabsContent value="publications">
          <PublicationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
