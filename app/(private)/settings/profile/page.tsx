import type { Metadata } from "next";

import { ProfileSettings } from "@/components/community/profile-settings";

export const metadata: Metadata = { title: "Perfil público | Semear" };

export default function ProfileSettingsPage() {
  return <ProfileSettings />;
}
