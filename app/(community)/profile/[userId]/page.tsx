import type { Metadata } from "next";
import { cache } from "react";

import { ProfileView } from "@/components/community/profile-view";
import { getPublicProfile } from "@/server/db";
import { getCurrentUser } from "@/server/http/current-user";
import { orNotFound } from "@/server/http/not-found";

type Props = { params: Promise<{ userId: string }> };

const loadProfile = cache(async (userId: string) => {
  const viewer = await getCurrentUser();
  return orNotFound(getPublicProfile(viewer?.id ?? null, userId));
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const profile = await loadProfile(userId);
  const academic = [profile.course, profile.institution].filter(Boolean).join(" · ");
  const description = profile.bio ?? (academic || "Perfil acadêmico no Semear.");
  const title = `${profile.displayName} | Semear`;
  return {
    title,
    description,
    // Perfis podem ser compartilhados, mas não são indexados por buscadores.
    robots: { index: false, follow: false },
    alternates: { canonical: `/profile/${profile.id}` },
    openGraph: { title, description, type: "profile", url: `/profile/${profile.id}`, siteName: "Semear" },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { userId } = await params;
  const [profile, viewer] = await Promise.all([loadProfile(userId), getCurrentUser()]);
  return <ProfileView profile={profile} authenticated={Boolean(viewer)} />;
}
