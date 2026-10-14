import type { Metadata } from "next";

import { UsersScreen } from "@/components/admin/users-screen";
import { requireAdmin } from "@/server/http/current-user";

export const metadata: Metadata = { title: "Usuários | Semear" };

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  return <UsersScreen currentUserId={admin.id} />;
}
