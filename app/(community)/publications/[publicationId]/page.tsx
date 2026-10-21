import type { Metadata } from "next";
import { cache } from "react";

import { PublicationView } from "@/components/community/publication-view";
import { getPublication } from "@/server/db";
import { getCurrentUser } from "@/server/http/current-user";
import { orNotFound } from "@/server/http/not-found";

type Props = { params: Promise<{ publicationId: string }> };

/** Publicação privada (de outra pessoa): 404, mesmo conhecendo a URL. */
const loadPublication = cache(async (publicationId: string) => {
  const viewer = await getCurrentUser();
  return orNotFound(getPublication(viewer?.id ?? null, publicationId));
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicationId } = await params;
  const publication = await loadPublication(publicationId);
  const title = `${publication.title} | Semear`;
  const description = publication.abstract.slice(0, 200) || `Publicação de ${publication.authors}.`;
  const isPublic = publication.visibility === "PUBLIC";
  return {
    title,
    description,
    robots: isPublic ? undefined : { index: false, follow: false },
    alternates: { canonical: `/publications/${publication.id}` },
    openGraph: isPublic
      ? { title, description, type: "article", url: `/publications/${publication.id}`, siteName: "Semear" }
      : undefined,
  };
}

export default async function PublicationPage({ params }: Props) {
  const { publicationId } = await params;
  const [publication, viewer] = await Promise.all([loadPublication(publicationId), getCurrentUser()]);
  return <PublicationView publication={publication} authenticated={Boolean(viewer)} />;
}
