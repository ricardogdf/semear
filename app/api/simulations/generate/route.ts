import { NextResponse } from "next/server";

import { generateDynamicSimulation } from "@/server/db";
import { generateSimulationSchema } from "@/lib/utils";

import { authRoute, readJson } from "@/server/http/api";

export const POST = authRoute("user", async ({ request, user }) => {
  const { subjectId, moduleId } = await readJson(request, generateSimulationSchema);
  return NextResponse.json(await generateDynamicSimulation(user.id, subjectId, moduleId), { status: 201 });
});
