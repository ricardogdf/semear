import { NextRequest, NextResponse } from "next/server";

import { getSubjectOptions, getSubjectsOverview } from "@semear/database";
import { subjectStatusValues, type SubjectStatusValue } from "@semear/utils";

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status");
    const compact = request.nextUrl.searchParams.get("compact");

    if (compact === "1") {
      return NextResponse.json(await getSubjectOptions());
    }

    const parsedStatus =
      status && subjectStatusValues.includes(status as (typeof subjectStatusValues)[number])
        ? status
        : undefined;

    return NextResponse.json(await getSubjectsOverview(parsedStatus as SubjectStatusValue | undefined));
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Nao foi possivel carregar as materias.",
      },
      { status: 500 },
    );
  }
}
