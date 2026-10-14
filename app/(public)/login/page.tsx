import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthCard } from "@/components/public/auth-card";
import { LoginForm } from "@/components/public/login-form";
import { getCurrentUser } from "@/server/http/current-user";

export const metadata: Metadata = { title: "Entrar | Semear" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  return (
    <AuthCard
      title="Entrar"
      description="Acesso restrito a usuários autorizados."
      footer={
        <div className="flex flex-col gap-2">
          <p>
            Recebeu um código do administrador?{" "}
            <Link href="/first-access" className="font-medium text-primary underline-offset-4 hover:underline">
              Primeiro acesso
            </Link>
          </p>
          <p>
            Ainda não tem acesso?{" "}
            <Link href="/#solicitar-acesso" className="font-medium text-primary underline-offset-4 hover:underline">
              Solicite aqui
            </Link>
          </p>
        </div>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
