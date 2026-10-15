import Image from "next/image";

import { cn } from "@/lib/utils";

/** Logo do Semear; troca para a variante de corpo claro no tema escuro. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-9 w-9 shrink-0", className)} aria-hidden>
      <Image src="/brand/logo.png" alt="" fill sizes="48px" className="object-contain dark:hidden" priority />
      <Image src="/brand/logo-dark.png" alt="" fill sizes="48px" className="hidden object-contain dark:block" priority />
    </span>
  );
}
