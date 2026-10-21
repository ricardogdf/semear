"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { BookOpen, Compass, Heart, Users } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import type { RankingValue } from "@/lib/utils";

import { getRanking, type RankingItems } from "@/lib/api";

import { PublicationCard, PublicSubjectCard, UserCard } from "./cards";
import { EmptyState } from "./empty-state";
import { InfiniteList, pagedQueryOptions } from "./infinite-list";
import { PageHeader } from "./page-header";

function useRanking<K extends RankingValue>(ranking: K) {
  return useInfiniteQuery({
    queryKey: ["discover", ranking],
    queryFn: ({ pageParam }) => getRanking(ranking, pageParam),
    ...pagedQueryOptions,
  });
}

function SubjectsRanking() {
  const query = useRanking("subjects");
  return (
    <InfiniteList<RankingItems["subjects"]>
      ordered
      query={query}
      getKey={(item) => item.id}
      renderItem={(item, index) => <PublicSubjectCard subject={item} authenticated rank={index + 1} />}
      loadingLabel="Carregando matérias mais importadas…"
      errorTitle="Não foi possível carregar o ranking de matérias"
      empty={
        <EmptyState icon={BookOpen} title="Nenhuma matéria importada ainda">
          O ranking aparece quando matérias publicadas na biblioteca forem importadas por outros usuários.
        </EmptyState>
      }
    />
  );
}

function PublicationsRanking() {
  const query = useRanking("publications");
  return (
    <InfiniteList<RankingItems["publications"]>
      ordered
      query={query}
      getKey={(item) => item.id}
      renderItem={(item, index) => <PublicationCard publication={item} authenticated rank={index + 1} />}
      loadingLabel="Carregando publicações mais curtidas…"
      errorTitle="Não foi possível carregar o ranking de publicações"
      empty={
        <EmptyState icon={Heart} title="Nenhuma publicação curtida ainda">
          Curta artigos e TCCs públicos para que eles apareçam aqui.
        </EmptyState>
      }
    />
  );
}

function ProfilesRanking() {
  const query = useRanking("profiles");
  return (
    <InfiniteList<RankingItems["profiles"]>
      ordered
      query={query}
      getKey={(item) => item.id}
      renderItem={(item, index) => <UserCard user={item} authenticated rank={index + 1} />}
      loadingLabel="Carregando perfis com mais seguidores…"
      errorTitle="Não foi possível carregar o ranking de perfis"
      empty={
        <EmptyState icon={Users} title="Nenhum perfil com seguidores ainda">
          Siga colegas na pesquisa de usuários para formar este ranking.
        </EmptyState>
      }
    />
  );
}

/** Área "Conheça": três rankings calculados no servidor a partir das relações reais. */
export function DiscoverScreen() {
  return (
    <div className="space-y-6">
      <PageHeader icon={Compass} title="Conheça">
        Descubra as matérias mais importadas, as publicações mais curtidas e os perfis mais seguidos do Semear.
      </PageHeader>
      <Tabs defaultValue="subjects">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max">
            <TabsTrigger value="subjects">
              <BookOpen className="mr-2 h-4 w-4" aria-hidden /> Matérias mais importadas
            </TabsTrigger>
            <TabsTrigger value="publications">
              <Heart className="mr-2 h-4 w-4" aria-hidden /> Artigos mais curtidos
            </TabsTrigger>
            <TabsTrigger value="profiles">
              <Users className="mr-2 h-4 w-4" aria-hidden /> Perfis mais seguidos
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="subjects">
          <SubjectsRanking />
        </TabsContent>
        <TabsContent value="publications">
          <PublicationsRanking />
        </TabsContent>
        <TabsContent value="profiles">
          <ProfilesRanking />
        </TabsContent>
      </Tabs>
    </div>
  );
}
