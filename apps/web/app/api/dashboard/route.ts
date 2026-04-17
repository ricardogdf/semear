import { NextResponse } from "next/server";

import { getDashboardOverview } from "@semear/database";

export async function GET() {
  try {
    const overview = await getDashboardOverview();
    return NextResponse.json(overview);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Nao foi possivel carregar o dashboard.",
      },
      { status: 500 },
    );
  }
}
