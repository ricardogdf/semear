import Link from "next/link";
import { SearchX } from "lucide-react";

import { LogoMark } from "@/components/brand/logo-mark";

/** 404 único: conteúdo inexistente ou privado responde igual (não revela que a página existe). */
export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-4 text-center">
      <LogoMark />
      <SearchX className="h-10 w-10 text-muted-foreground" aria-hidden />
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          O endereço não existe ou o conteúdo é privado. Se alguém compartilhou este link com você, peça para conferir se
          o conteúdo ainda está público.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Ir para o início
      </Link>
    </main>
  );
}
