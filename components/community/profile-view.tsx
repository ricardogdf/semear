"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, FileText, Pencil } from "lucide-react";

import type { PublicProfileSnapshot } from "@/lib/utils";

import { AcademicLine, PublicationCard, PublicSubjectCard } from "./cards";
import { EmptyState } from "./empty-state";
import { FollowButton } from "./follow-button";
import { ShareButton } from "./share-button";
import { UserAvatar } from "./user-avatar";

/** Perfil acadêmico público: dados acadêmicos, contagens, matérias publicadas e publicações. */
export function ProfileView({ profile, authenticated }: { profile: PublicProfileSnapshot; authenticated: boolean }) {
  const [followerCount, setFollowerCount] = React.useState(profile.followerCount);

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-border/60 bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <UserAvatar name={profile.displayName} avatarUrl={profile.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="break-words font-[var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
              {profile.displayName}
            </h1>
            <AcademicLine person={profile} className="mt-2 text-sm" />
            {profile.bio ? <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{profile.bio}</p> : null}
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex gap-1.5">
                <dt className="sr-only">Seguidores</dt>
                <dd data-testid="follower-count">
                  <strong>{followerCount.toLocaleString("pt-BR")}</strong>{" "}
                  <span className="text-muted-foreground">{followerCount === 1 ? "seguidor" : "seguidores"}</span>
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="sr-only">Seguindo</dt>
                <dd>
                  <strong>{profile.followingCount.toLocaleString("pt-BR")}</strong>{" "}
                  <span className="text-muted-foreground">seguindo</span>
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <FollowButton
              userId={profile.id}
              name={profile.displayName}
              isFollowing={profile.isFollowing}
              isSelf={profile.isSelf}
              authenticated={authenticated}
              onChange={(state) => setFollowerCount(state.followerCount)}
            />
            {profile.isSelf ? (
              <Link
                href="/settings/profile"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-xs font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden /> Editar perfil
              </Link>
            ) : null}
            <ShareButton href={`/profile/${profile.id}`} label="Copiar link do perfil" />
          </div>
        </div>
      </header>

      <section aria-labelledby="profile-subjects" className="space-y-3">
        <h2 id="profile-subjects" className="flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="h-5 w-5 text-primary" aria-hidden /> Matérias publicadas
          <span className="text-sm font-normal text-muted-foreground">({profile.subjects.length})</span>
        </h2>
        {profile.subjects.length === 0 ? (
          <EmptyState icon={BookOpen} title="Nenhuma matéria publicada">
            {profile.isSelf
              ? "Publique uma matéria na página dela (em Matérias) para que ela apareça aqui."
              : "Esta pessoa ainda não publicou matérias."}
          </EmptyState>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {profile.subjects.map((subject) => (
              <li key={subject.id}>
                <PublicSubjectCard subject={subject} authenticated={authenticated} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="profile-publications" className="space-y-3">
        <h2 id="profile-publications" className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5 text-primary" aria-hidden /> Artigos e publicações
          <span className="text-sm font-normal text-muted-foreground">({profile.publications.length})</span>
        </h2>
        {profile.publications.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhuma publicação pública">
            {profile.isSelf
              ? "Cadastre artigos e TCCs em Perfil público. Publicações privadas aparecem só para você, lá."
              : "Esta pessoa ainda não cadastrou publicações públicas."}
          </EmptyState>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {profile.publications.map((publication) => (
              <li key={publication.id}>
                <PublicationCard publication={publication} authenticated={authenticated} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
