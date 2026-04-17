import { NextRequest, NextResponse } from "next/server";

import { getSimulationSubjects } from "@semear/database";

export async function GET(request: NextRequest) {
  try {
    const subjectId = request.nextUrl.searchParams.get("subjectId") ?? undefined;
    return NextResponse.json(await getSimulationSubjects(subjectId));
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Nao foi possivel carregar os simulados.",
      },
      { status: 500 },
    );
  }
}
