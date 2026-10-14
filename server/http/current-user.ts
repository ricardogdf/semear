import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSessionUser, type SessionUser } from "@/server/db";

import { SESSION_COOKIE } from "./session";

/** Usuário da sessão atual em Server Components (null se não autenticado). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return getSessionUser(store.get(SESSION_COOKIE)?.value);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return user;
}
