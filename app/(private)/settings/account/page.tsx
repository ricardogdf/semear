import type { Metadata } from "next";

import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { requireUser } from "@/server/http/current-user";

export const metadata: Metadata = { title: "Senha e acesso | Semear" };

export default async function AccountSettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">Senha e acesso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Conectado como <strong>{user.name}</strong> ({user.email}).
        </p>
      </header>
      <section className="rounded-[2rem] border border-border/60 bg-card p-5 sm:p-6">
        <h2 className="mb-1 font-semibold">Alterar senha</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Esqueceu a senha? Peça ao administrador um novo código e use a página de primeiro acesso.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
