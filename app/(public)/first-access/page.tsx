import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/public/auth-card";
import { FirstAccessForm } from "@/components/public/first-access-form";

export const metadata: Metadata = { title: "Primeiro acesso | Semear" };

export default function FirstAccessPage() {
  return (
    <AuthCard
      title="Primeiro acesso"
      description="Use o código de uso único fornecido pelo administrador para definir sua senha. O mesmo procedimento serve para redefinir a senha."
      footer={
        <p>
          Já tem senha?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      }
    >
      <FirstAccessForm />
    </AuthCard>
  );
}
