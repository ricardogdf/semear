import { NextResponse } from "next/server";

import { submitSimulationResult } from "@/server/db";
import { simulationSubmissionSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

export const POST = authRoute<{ simulationId: string }>("user", async ({ request, user, params }) => {
  const { answers } = await readJson(request, simulationSubmissionSchema);
  return NextResponse.json(await submitSimulationResult(user.id, params.simulationId, answers), {
    status: 201,
  });
});
