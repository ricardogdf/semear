import { NextRequest, NextResponse } from "next/server";
import { getSimulationSubjects } from "@semear/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  try {
    const { subjectId } = await params;
    const subjects = await getSimulationSubjects(subjectId);
    
    if (!subjects || subjects.length === 0) {
      return NextResponse.json({ message: "Matéria não encontrada." }, { status: 404 });
    }

    return NextResponse.json(subjects[0]);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Não foi possivel carregar a matéria.",
      },
      { status: 500 },
    );
  }
}
