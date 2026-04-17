import { NextRequest, NextResponse } from "next/server";

import { submitSimulationResult } from "@semear/database";
import { simulationSubmissionSchema } from "@semear/utils";

interface RouteContext {
  params: Promise<{
    simulationId: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const body = await request.json();
    const parsedBody = simulationSubmissionSchema.parse(body);
    const { simulationId } = await context.params;

    const result = await submitSimulationResult({
      simulationId,
      subjectId: parsedBody.subjectId,
      answers: parsedBody.answers,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Nao foi possivel enviar o simulado.",
      },
      { status: 500 },
    );
  }
}
