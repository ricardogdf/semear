"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { Alert, Button, Modal, ModalContent, ModalDescription, ModalTitle } from "@/components/ui";

export interface SetupCodeInfo {
  name: string;
  email: string;
  code: string;
  expiresAt: string;
}

/**
 * Exibe o código de primeiro acesso uma única vez. O código não fica salvo em texto puro:
 * fechar esta janela significa ter que gerar outro.
 */
export function SetupCodeDialog({ info, onClose }: { info: SetupCodeInfo | null; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => setCopied(false), [info?.code]);

  async function copy() {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal open={Boolean(info)} onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        <ModalTitle>Código de primeiro acesso</ModalTitle>
        <ModalDescription className="mt-2">
          Entregue este código a <strong>{info?.name}</strong> ({info?.email}) por um canal seguro. Ele é de uso único,
          vale até {info ? new Date(info.expiresAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""} e
          deve ser usado em <strong>/first-access</strong> para definir a senha.
        </ModalDescription>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <output
            aria-label="Código de acesso"
            className="flex-1 select-all break-all rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-center font-mono text-base font-semibold tracking-wider sm:text-lg"
          >
            {info?.code}
          </output>
          <Button type="button" variant="secondary" onClick={copy} aria-live="polite">
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>

        <Alert tone="warning" className="mt-4">
          Este código não será exibido novamente. Se ele se perder, gere um novo (o anterior deixa de valer).
        </Alert>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Concluir</Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
