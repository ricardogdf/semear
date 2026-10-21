import type { Metadata } from "next";

import { LibraryScreen } from "@/components/community/library-screen";
import { requireUser } from "@/server/http/current-user";

export const metadata: Metadata = { title: "Biblioteca pública | Semear" };

/** A listagem é só para usuários autenticados; cada matéria publicada tem a própria página pública. */
export default async function LibraryPage() {
  await requireUser();
  return <LibraryScreen />;
}
