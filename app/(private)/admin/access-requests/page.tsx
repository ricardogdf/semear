import type { Metadata } from "next";

import { AccessRequestsScreen } from "@/components/admin/access-requests-screen";

export const metadata: Metadata = { title: "Solicitações de acesso | Semear" };

export default function AdminAccessRequestsPage() {
  return <AccessRequestsScreen />;
}
