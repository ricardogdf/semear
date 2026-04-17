import { NextResponse } from "next/server";

import { getRecentContents } from "@semear/database";

export async function GET() {
  try {
    return NextResponse.json(await getRecentContents());
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Nao foi possivel carregar os conteudos.",
      },
      { status: 500 },
    );
  }
}
