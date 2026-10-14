import { NextResponse } from "next/server";

import { getDashboardOverview } from "@/server/db";

import { authRoute } from "@/server/http/api";

export const GET = authRoute("user", async ({ user }) => NextResponse.json(await getDashboardOverview(user.id)));
