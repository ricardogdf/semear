import { cookies } from "next/headers";

import { AppShell } from "@/components/layout/app-shell";
import { SIDEBAR_COOKIE } from "@/components/layout/navigation";
import { PublicFooter, PublicHeader } from "@/components/public/public-header";
import { getCurrentUser } from "@/server/http/current-user";

// Páginas compartilháveis (perfis, matérias e publicações públicas): abrem sem login, mas cada
// página só mostra conteúdo público ou do próprio visitante. A sessão é validada a cada requisição.
export const dynamic = "force-dynamic";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (user) {
    const store = await cookies();
    return (
      <AppShell user={user} initialCollapsed={store.get(SIDEBAR_COOKIE)?.value === "collapsed"}>
        {children}
      </AppShell>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PublicHeader authenticated={false} />
      <main id="conteudo" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
