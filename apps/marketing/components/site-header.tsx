import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Funcionalidades" },
  { href: "/pricing", label: "Precos" },
  { href: "/login", label: "Login" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-[var(--font-heading)] text-2xl font-semibold">
          Semear
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegacao principal">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
          className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-glow transition hover:bg-primary/90"
        >
          Entrar no app
        </Link>
      </div>
    </header>
  );
}
