import type { NextResponse } from "next/server";

/**
 * Cookie de sessão: token opaco, HttpOnly, SameSite=Lax e Secure em produção.
 * Em produção usa o prefixo __Host- (exige HTTPS, Path=/ e nenhum Domain).
 */
const isProduction = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = isProduction ? "__Host-semear_session" : "semear_session";

function readCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return null;
}

export function getSessionTokenFromRequest(request: Request) {
  return readCookie(request.headers.get("cookie"), SESSION_COOKIE);
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
