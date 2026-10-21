"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Calendar, Download, FileText, GraduationCap, Layers, Users } from "lucide-react";

import { Badge } from "@/components/ui";
import {
  cn,
  formatCount,
  formatDateOnly,
  formatImportCount,
  publicationTypeLabels,
  type AuthorSnapshot,
  type PublicationSnapshot,
  type PublicSubjectCardSnapshot,
  type UserCardSnapshot,
} from "@/lib/utils";

import { FollowButton } from "./follow-button";
import { ImportButton } from "./import-button";
import { LikeButton } from "./like-button";
import { ShareButton } from "./share-button";
import { UserAvatar } from "./user-avatar";

const cardClass = "rounded-3xl border border-border/60 bg-card p-4 sm:p-5";
const titleLinkClass =
  "rounded-md font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Posição no ranking (1º, 2º…), só quando a lista é um ranking. */
function RankBadge({ rank }: { rank?: number }) {
  if (rank === undefined) return null;
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        rank <= 3 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
      )}
    >
      <span className="sr-only">Posição </span>
      {rank}
    </span>
  );
}

/** "Curso · Instituição" quando disponíveis (nada é inventado quando faltam). */
export function AcademicLine({ person, className }: { person: Pick<AuthorSnapshot, "institution" | "course">; className?: string }) {
  if (!person.course && !person.institution) return null;
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
      {person.course ? (
        <span className="inline-flex items-center gap-1">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden /> {person.course}
        </span>
      ) : null}
      {person.institution ? (
        <span className="inline-flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" aria-hidden /> {person.institution}
        </span>
      ) : null}
    </p>
  );
}

export function UserCard({ user, authenticated, rank }: { user: UserCardSnapshot; authenticated: boolean; rank?: number }) {
  const [followerCount, setFollowerCount] = React.useState(user.followerCount);
  React.useEffect(() => setFollowerCount(user.followerCount), [user.followerCount]);

  return (
    <article className={cn(cardClass, "flex items-center gap-3 sm:gap-4")}>
      <RankBadge rank={rank} />
      <UserAvatar name={user.displayName} avatarUrl={user.avatarUrl} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate">
          <Link href={`/profile/${user.id}`} className={titleLinkClass}>
            {user.displayName}
          </Link>
          {user.isSelf ? <span className="ml-2 text-xs font-normal text-muted-foreground">(você)</span> : null}
        </h3>
        <AcademicLine person={user} className="mt-1" />
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" aria-hidden /> {formatCount(followerCount, "seguidor", "seguidores")}
        </p>
      </div>
      <FollowButton
        userId={user.id}
        name={user.displayName}
        isFollowing={user.isFollowing}
        isSelf={user.isSelf}
        authenticated={authenticated}
        onChange={(state) => setFollowerCount(state.followerCount)}
      />
    </article>
  );
}

export function PublicSubjectCard({
  subject,
  authenticated,
  rank,
}: {
  subject: PublicSubjectCardSnapshot;
  authenticated: boolean;
  rank?: number;
}) {
  const [importCount, setImportCount] = React.useState(subject.importCount);
  React.useEffect(() => setImportCount(subject.importCount), [subject.importCount]);

  return (
    <article className={cn(cardClass, "flex gap-3 sm:gap-4")}>
      <RankBadge rank={rank} />
      <div className="min-w-0 flex-1">
        <h3 className="break-words text-base">
          <Link href={`/library/${subject.id}`} className={titleLinkClass}>
            {subject.title}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          por{" "}
          <Link href={`/profile/${subject.author.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            {subject.author.displayName}
          </Link>
          {subject.publishedAt ? ` · publicada em ${new Date(subject.publishedAt).toLocaleDateString("pt-BR")}` : null}
        </p>
        <AcademicLine person={subject.author} className="mt-1" />
        {subject.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{subject.description}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Download className="h-3.5 w-3.5 text-primary" aria-hidden /> {formatImportCount(importCount)}
          </span>
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" aria-hidden /> {formatCount(subject.contentCount, "aula", "aulas")}
          </span>
          {subject.moduleCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" aria-hidden /> {formatCount(subject.moduleCount, "módulo", "módulos")}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ImportButton
            subjectId={subject.id}
            importedCopyId={subject.importedCopyId}
            isOwner={subject.isOwner}
            authenticated={authenticated}
            onImported={(result) => {
              if (!result.alreadyImported) setImportCount((count) => count + 1);
            }}
          />
          <ShareButton href={`/library/${subject.id}`} variant="ghost" />
        </div>
      </div>
    </article>
  );
}

export function PublicationMeta({ publication, className }: { publication: PublicationSnapshot; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
      {publication.institution ? (
        <span className="inline-flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" aria-hidden /> {publication.institution}
        </span>
      ) : null}
      {publication.publishedOn ? (
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" aria-hidden /> {formatDateOnly(publication.publishedOn)}
        </span>
      ) : null}
    </p>
  );
}

/** Publicação acadêmica: ver, curtir e compartilhar. Nunca tem botão de importação. */
export function PublicationCard({
  publication,
  authenticated,
  rank,
}: {
  publication: PublicationSnapshot;
  authenticated: boolean;
  rank?: number;
}) {
  return (
    <article className={cn(cardClass, "flex gap-3 sm:gap-4")}>
      <RankBadge rank={rank} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="px-2.5 py-0.5">
            {publicationTypeLabels[publication.type]}
          </Badge>
          {publication.visibility === "PRIVATE" ? (
            <Badge variant="warning" className="px-2.5 py-0.5">
              Privada
            </Badge>
          ) : null}
        </div>
        <h3 className="mt-2 break-words text-base">
          <Link href={`/publications/${publication.id}`} className={titleLinkClass}>
            {publication.title}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{publication.authors}</p>
        <PublicationMeta publication={publication} className="mt-1" />
        {publication.abstract ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{publication.abstract}</p>
        ) : null}
        {/* Publicação privada não tem curtida nem link para compartilhar: só quem cadastrou a vê. */}
        {publication.visibility === "PUBLIC" ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <LikeButton
              publicationId={publication.id}
              title={publication.title}
              liked={publication.likedByMe}
              likeCount={publication.likeCount}
              authenticated={authenticated}
            />
            <ShareButton href={`/publications/${publication.id}`} variant="ghost" />
          </div>
        ) : null}
      </div>
    </article>
  );
}
