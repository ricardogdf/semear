"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Alert, Button, FieldError, Input, Label } from "@/components/ui";
import { passwordSetupSchema } from "@/lib/utils";

import { completeFirstAccess } from "@/lib/api";

import { PasswordInput } from "./password-input";

type FormValues = z.infer<typeof passwordSetupSchema>;

export function FirstAccessForm() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(passwordSetupSchema),
    defaultValues: { email: "", code: "", password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const mutation = useMutation({
    mutationFn: completeFirstAccess,
    onSuccess: () => {
      router.replace("/dashboard");
      router.refresh();
    },
  });

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="grid gap-5">
      <div>
        <Label htmlFor="fa-email">E-mail da conta</Label>
        <Input id="fa-email" type="email" autoComplete="username" inputMode="email" className="mt-2" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
        <FieldError message={errors.email?.message} />
      </div>
      <div>
        <Label htmlFor="fa-code">Código de acesso</Label>
        <Input
          id="fa-code"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
          className="mt-2 font-mono tracking-wider"
          aria-invalid={Boolean(errors.code)}
          {...form.register("code")}
        />
        <FieldError message={errors.code?.message} />
      </div>
      <div>
        <Label htmlFor="fa-password">Nova senha</Label>
        <PasswordInput
          id="fa-password"
          autoComplete="new-password"
          className="mt-2"
          aria-invalid={Boolean(errors.password)}
          aria-describedby="fa-password-hint"
          {...form.register("password")}
        />
        <p id="fa-password-hint" className="mt-1.5 text-xs text-muted-foreground">
          Mínimo de 10 caracteres, com letras e números.
        </p>
        <FieldError message={errors.password?.message} />
      </div>
      <div>
        <Label htmlFor="fa-confirm">Confirme a nova senha</Label>
        <PasswordInput id="fa-confirm" autoComplete="new-password" className="mt-2" aria-invalid={Boolean(errors.confirmPassword)} {...form.register("confirmPassword")} />
        <FieldError message={errors.confirmPassword?.message} />
      </div>

      {mutation.isError ? <Alert tone="danger">{mutation.error.message}</Alert> : null}

      <Button type="submit" size="lg" disabled={mutation.isPending || mutation.isSuccess}>
        {mutation.isPending || mutation.isSuccess ? (
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <KeyRound className="mr-2 h-4 w-4" aria-hidden />
        )}
        Definir senha e entrar
      </Button>
    </form>
  );
}
