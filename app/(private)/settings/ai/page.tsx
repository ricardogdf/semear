import type { Metadata } from "next";

import { AiSettingsScreen } from "@/components/settings/ai-settings-screen";

export const metadata: Metadata = { title: "Provedores de IA | Semear" };

export default function AiSettingsPage() {
  return <AiSettingsScreen />;
}
