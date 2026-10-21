"use client";

import * as React from "react";
import { Check, Link2 } from "lucide-react";

import { Button, Input, Modal, ModalContent, ModalDescription, ModalTitle } from "@/components/ui";

/** Endereço completo: caminhos internos ganham a origem atual; endereços externos ficam como estão. */
function absoluteUrl(href: string) {
  return new URL(href, window.location.origin).toString();
}

/**
 * Copia um link para a área de transferência. "Link copiado!" só aparece depois que a cópia é
 * confirmada; se o navegador recusar, abre o link selecionado para copiar manualmente.
 */
export function ShareButton({
  href,
  label = "Copiar link",
  variant = "outline",
}: {
  /** Caminho interno (ex.: /library/abc) ou endereço externo completo. */
  href: string;
  label?: string;
  variant?: "outline" | "ghost" | "secondary";
}) {
  const [copied, setCopied] = React.useState(false);
  const [fallbackUrl, setFallbackUrl] = React.useState<string | null>(null);
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    const url = absoluteUrl(href);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard indisponível");
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
      setFallbackUrl(url);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant={variant} onClick={copy} className="gap-1.5">
        {copied ? <Check className="h-3.5 w-3.5 text-success" aria-hidden /> : <Link2 className="h-3.5 w-3.5" aria-hidden />}
        {copied ? "Link copiado!" : label}
      </Button>
      <span role="status" className="sr-only">
        {copied ? "Link copiado!" : ""}
      </span>

      <Modal open={fallbackUrl !== null} onOpenChange={(open) => !open && setFallbackUrl(null)}>
        <ModalContent>
          <ModalTitle>Copie o link</ModalTitle>
          <ModalDescription className="mt-2">
            O navegador não permitiu copiar automaticamente. Selecione o endereço abaixo e copie (Ctrl+C ou ⌘+C).
          </ModalDescription>
          <Input
            readOnly
            autoFocus
            aria-label="Link para compartilhar"
            value={fallbackUrl ?? ""}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-4 font-mono text-xs"
          />
        </ModalContent>
      </Modal>
    </>
  );
}
