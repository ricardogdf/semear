import Link from "next/link";
import { BrainCircuit } from "lucide-react";

export function PublicHeader({ authenticated }: { authenticated: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BrainCircuit className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-[var(--font-heading)] text-lg font-semibold tracking-tight">Semear</span>
        </Link>

        <nav aria-label="Seções da página" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
          <a href="#funcionalidades" className="hover:text-foreground">Funcionalidades</a>
          <a href="#solicitar-acesso" className="hover:text-foreground">Solicitar acesso</a>
        </nav>

        <Link
          href={authenticated ? "/dashboard" : "/login"}
          className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {authenticated ? "Ir para o sistema" : "Entrar"}
        </Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Semear — plataforma de estudos gratuita e de acesso restrito.</p>
        <div className="flex gap-4">
          <Link href="/login" className="hover:text-foreground">Entrar</Link>
          <Link href="/first-access" className="hover:text-foreground">Primeiro acesso</Link>
        </div>
      </div>
    </footer>
  );
}
