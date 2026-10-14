"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Alert, Button, FieldError, Input, Label } from "@/components/ui";
import { loginSchema } from "@/lib/utils";

import { login } from "@/lib/api";

import { PasswordInput } from "./password-input";

type FormValues = z.infer<typeof loginSchema>;

/** Aceita apenas caminhos internos para evitar redirecionamento aberto. */
function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/dashboard";
  }
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const form = useForm<FormValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors } = form.formState;

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      router.replace(safeNextPath(searchParams.get("next")));
      router.refresh();
    },
    onError: () => form.setValue("password", ""),
  });

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="grid gap-5">
      <div>
        <Label htmlFor="login-email">E-mail</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoFocus
          className="mt-2"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          {...form.register("email")}
        />
        <FieldError id="login-email-error" message={errors.email?.message} />
      </div>
      <div>
        <Label htmlFor="login-password">Senha</Label>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          className="mt-2"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          {...form.register("password")}
        />
        <FieldError id="login-password-error" message={errors.password?.message} />
      </div>

      {mutation.isError ? <Alert tone="danger">{mutation.error.message}</Alert> : null}

      <Button type="submit" size="lg" disabled={mutation.isPending || mutation.isSuccess}>
        {mutation.isPending || mutation.isSuccess ? (
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <LogIn className="mr-2 h-4 w-4" aria-hidden />
        )}
        {mutation.isPending ? "Entrando…" : mutation.isSuccess ? "Redirecionando…" : "Entrar"}
      </Button>
    </form>
  );
}
