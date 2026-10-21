import type { Metadata } from "next";

import { PeopleSearch } from "@/components/community/people-search";

export const metadata: Metadata = { title: "Pesquisar usuários | Semear" };

export default function PeoplePage() {
  return <PeopleSearch />;
}
