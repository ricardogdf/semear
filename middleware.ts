import { NextResponse, type NextRequest } from "next/server";

/**
 * Redireciona para o login quem acessa uma página privada sem cookie de sessão.
 * É apenas conveniência de navegação: a validação real da sessão (e do papel) acontece
 * no servidor, nos layouts privados e em cada rota de API.
 */
const PRIVATE_PREFIXES = ["/dashboard", "/subjects", "/simulations", "/settings", "/admin", "/people", "/following", "/discover"];
/** Privadas só no endereço exato: /library/<id> e /profile/<id> são páginas públicas compartilháveis. */
const PRIVATE_EXACT = ["/library", "/profile"];
const SESSION_COOKIES = ["__Host-semear_session", "semear_session"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPrivate =
    PRIVATE_EXACT.includes(pathname) ||
    PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isPrivate && !SESSION_COOKIES.some((name) => request.cookies.has(name))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/subjects/:path*",
    "/simulations/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/people/:path*",
    "/following/:path*",
    "/discover/:path*",
    "/library",
    "/profile",
  ],
};
