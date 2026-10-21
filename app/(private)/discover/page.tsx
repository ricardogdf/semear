import type { Metadata } from "next";

import { DiscoverScreen } from "@/components/community/discover-screen";

export const metadata: Metadata = { title: "Conheça | Semear" };

export default function DiscoverPage() {
  return <DiscoverScreen />;
}
