import type { Metadata } from "next";

import { SubjectsTable } from "@/components/subjects/subjects-table";

export const metadata: Metadata = { title: "Matérias | Semear" };

export default function SubjectsPage() {
  return <SubjectsTable />;
}
