import type { Metadata } from "next";

import { DashboardScreen } from "@/components/dashboard/dashboard-screen";
import { requireUser } from "@/server/http/current-user";

export const metadata: Metadata = { title: "Dashboard | Semear" };

export default async function DashboardPage() {
  const user = await requireUser();
  return <DashboardScreen userName={user.name} />;
}
