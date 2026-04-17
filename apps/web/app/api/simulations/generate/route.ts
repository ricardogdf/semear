import { NextRequest, NextResponse } from "next/server";
import { generateDynamicSimulation } from "@semear/database";

export async function POST(request: NextRequest) {
  try {
    const { subjectId } = await request.json();

    if (!subjectId) {
      return NextResponse.json({ message: "ID da materia e obrigatorio." }, { status: 400 });
    }

    const simulation = await generateDynamicSimulation(subjectId);

    return NextResponse.json(simulation);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Nao foi possivel gerar o simulado.",
      },
      { status: 500 },
    );
  }
}
