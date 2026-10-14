import { requireAdmin } from "@/server/http/current-user";

/** Área administrativa: o papel é verificado no servidor (e novamente em cada rota de API). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
