import { SubjectWorkspace } from "@/components/subjects/subject-workspace";

export default async function SubjectDetailsPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  
  return (
    <div className="flex-1 space-y-4 md:space-y-6">
      <div className="px-4 pb-4 md:px-8 mt-6">
        <SubjectWorkspace subjectId={subjectId} />
      </div>
    </div>
  );
}
