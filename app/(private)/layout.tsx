import { cookies } from "next/headers";

import { AppShell } from "@/components/layout/app-shell";
import { SIDEBAR_COOKIE } from "@/components/layout/navigation";
import { requireUser } from "@/server/http/current-user";

// Área privada: a sessão é validada no servidor em toda requisição.
export const dynamic = "force-dynamic";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const store = await cookies();

  return (
    <AppShell user={user} initialCollapsed={store.get(SIDEBAR_COOKIE)?.value === "collapsed"}>
      {children}
    </AppShell>
  );
}
