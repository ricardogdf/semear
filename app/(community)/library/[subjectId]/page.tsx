import type { Metadata } from "next";
import { cache } from "react";

import { PublicSubjectView } from "@/components/community/public-subject-view";
import { getPublicSubject } from "@/server/db";
import { getCurrentUser } from "@/server/http/current-user";
import { orNotFound } from "@/server/http/not-found";

type Props = { params: Promise<{ subjectId: string }> };

/** Matéria privada (de outra pessoa) ou cópia importada: 404, mesmo conhecendo a URL. */
const loadSubject = cache(async (subjectId: string) => {
  const viewer = await getCurrentUser();
  return orNotFound(getPublicSubject(viewer?.id ?? null, subjectId));
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subjectId } = await params;
  const subject = await loadSubject(subjectId);
  const title = `${subject.title} | Semear`;
  const description = subject.description || `Matéria publicada por ${subject.author.displayName} no Semear.`;
  const isPublic = subject.visibility === "PUBLIC";
  return {
    title,
    description,
    robots: isPublic ? undefined : { index: false, follow: false },
    alternates: { canonical: `/library/${subject.id}` },
    openGraph: isPublic ? { title, description, type: "article", url: `/library/${subject.id}`, siteName: "Semear" } : undefined,
  };
}

export default async function PublicSubjectPage({ params }: Props) {
  const { subjectId } = await params;
  const [subject, viewer] = await Promise.all([loadSubject(subjectId), getCurrentUser()]);
  return <PublicSubjectView subject={subject} authenticated={Boolean(viewer)} />;
}
