import type { Metadata } from "next";

import { FollowingList } from "@/components/community/following-list";

export const metadata: Metadata = { title: "Seguindo | Semear" };

export default function FollowingPage() {
  return <FollowingList />;
}
