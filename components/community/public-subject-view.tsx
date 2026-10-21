"use client";

import * as React from "react";
import Link from "next/link";
import { Download, FileText, Layers, Lock } from "lucide-react";

import { Alert, Badge } from "@/components/ui";
import {
  formatCount,
  formatImportCount,
  groupContentsByModule,
  type PublicSubjectDetailSnapshot,
} from "@/lib/utils";

import { AcademicLine } from "./cards";
import { ImportButton } from "./import-button";
import { ShareButton } from "./share-button";
import { UserAvatar } from "./user-avatar";

/** Página pública de uma matéria: apresentação, autoria, prévia das aulas e importação. */
export function PublicSubjectView({ subject, authenticated }: { subject: PublicSubjectDetailSnapshot; authenticated: boolean }) {
  const [importCount, setImportCount] = React.useState(subject.importCount);
  const groups = groupContentsByModule(subject.modules, subject.contents);
  const isPublic = subject.visibility === "PUBLIC";

  return (
    <div className="space-y-6">
      {!isPublic ? (
        <Alert tone="warning" title="Matéria privada">
          Só você vê esta página. Publique a matéria na sua biblioteca para que outras pessoas possam abri-la e importá-la.
        </Alert>
      ) : null}

      <header className="rounded-[2rem] border border-border/60 bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isPublic ? "success" : "warning"}>
            {isPublic ? "Matéria pública" : (
              <>
                <Lock className="mr-1 h-3 w-3" aria-hidden /> Privada
              </>
            )}
          </Badge>
          <Badge variant="outline">
            <Download className="mr-1 h-3 w-3" aria-hidden /> {formatImportCount(importCount)}
          </Badge>
        </div>
        <h1 className="mt-3 break-words font-[var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
          {subject.title}
        </h1>
        {subject.description ? (
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{subject.description}</p>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          <UserAvatar name={subject.author.displayName} avatarUrl={subject.author.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className="text-sm">
              Autoria de{" "}
              <Link href={`/profile/${subject.author.id}`} className="font-medium underline-offset-4 hover:underline">
                {subject.author.displayName}
              </Link>
            </p>
            <AcademicLine person={subject.author} />
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {formatCount(subject.contentCount, "aula", "aulas")}
          {subject.moduleCount > 0 ? ` · ${formatCount(subject.moduleCount, "módulo", "módulos")}` : ""}
          {subject.publishedAt ? ` · publicada em ${new Date(subject.publishedAt).toLocaleDateString("pt-BR")}` : ""}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {isPublic ? (
            <>
              <ImportButton
                subjectId={subject.id}
                importedCopyId={subject.importedCopyId}
                isOwner={subject.isOwner}
                authenticated={authenticated}
                onImported={(result) => {
                  if (!result.alreadyImported) setImportCount((count) => count + 1);
                }}
              />
              <ShareButton href={`/library/${subject.id}`} />
            </>
          ) : null}
        </div>
        {isPublic && !subject.isOwner ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Ao importar, você recebe uma cópia privada com o texto, os resumos e as questões das aulas para estudar e fazer
            simulados com o seu provedor de IA. A autoria original fica registrada e a cópia não pode ser publicada de novo.
          </p>
        ) : null}
      </header>

      <section aria-labelledby="lessons-preview" className="rounded-[2rem] border border-border/60 bg-card p-5 sm:p-6">
        <h2 id="lessons-preview" className="text-lg font-semibold">
          Aulas
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Prévia: título e resumo curto de cada aula.</p>
        {groups.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhuma aula nesta matéria.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {groups.map((group) => (
              <div key={group.moduleId ?? "sem-modulo"}>
                {subject.modules.length > 0 ? (
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" aria-hidden /> {group.title}
                  </h3>
                ) : null}
                <ul className="grid gap-2">
                  {group.contents.map((content) => (
                    <li key={content.id} className="rounded-2xl border border-border/50 p-4">
                      <p className="flex items-start gap-2 font-medium">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="break-words">{content.title}</span>
                      </p>
                      {content.shortSummary ? (
                        <p className="mt-1 text-sm text-muted-foreground">{content.shortSummary}</p>
                      ) : null}
                      {content.questionCount > 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatCount(content.questionCount, "questão de prática", "questões de prática")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
