import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 bg-background/70">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <div>
          <p className="font-[var(--font-heading)] text-xl font-semibold">Semear</p>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Plataforma para organizar estudos, processar conteudos e acompanhar simulados
            com uma experiencia moderna e pronta para escalar.
          </p>
        </div>
        <div className="grid gap-2 text-muted-foreground">
          <Link href="/features" className="hover:text-foreground">
            Funcionalidades
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Precos
          </Link>
          <Link
            href={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
            className="hover:text-foreground"
          >
            Login no app
          </Link>
        </div>
      </div>
    </footer>
  );
}
