import { NextResponse } from "next/server";

import { getSimulationSubjects } from "@/server/db";

import { authRoute } from "@/server/http/api";

export const GET = authRoute("user", async ({ user }) => NextResponse.json(await getSimulationSubjects(user.id)));
