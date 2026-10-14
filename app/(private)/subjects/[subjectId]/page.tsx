import type { Metadata } from "next";

import { SubjectWorkspace } from "@/components/subjects/subject-workspace";

export const metadata: Metadata = { title: "Matéria | Semear" };

export default async function SubjectDetailsPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  return <SubjectWorkspace subjectId={subjectId} />;
}
