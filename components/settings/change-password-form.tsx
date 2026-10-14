"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Alert, Button, FieldError, Label } from "@/components/ui";
import { changePasswordSchema } from "@/lib/utils";

import { useToast } from "@/components/providers/toast-provider";
import { PasswordInput } from "@/components/public/password-input";
import { changePassword } from "@/lib/api";

type FormValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const { notify } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors } = form.formState;
  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      form.reset();
      notify("success", "Senha alterada. As outras sessões foram encerradas.");
    },
  });

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="grid max-w-md gap-5">
      <div>
        <Label htmlFor="cp-current">Senha atual</Label>
        <PasswordInput id="cp-current" autoComplete="current-password" className="mt-2" {...form.register("currentPassword")} />
        <FieldError message={errors.currentPassword?.message} />
      </div>
      <div>
        <Label htmlFor="cp-new">Nova senha</Label>
        <PasswordInput id="cp-new" autoComplete="new-password" className="mt-2" {...form.register("newPassword")} />
        <p className="mt-1.5 text-xs text-muted-foreground">Mínimo de 10 caracteres, com letras e números.</p>
        <FieldError message={errors.newPassword?.message} />
      </div>
      <div>
        <Label htmlFor="cp-confirm">Confirme a nova senha</Label>
        <PasswordInput id="cp-confirm" autoComplete="new-password" className="mt-2" {...form.register("confirmPassword")} />
        <FieldError message={errors.confirmPassword?.message} />
      </div>
      {mutation.isError ? <Alert tone="danger">{mutation.error.message}</Alert> : null}
      <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto">
        {mutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
        Alterar senha
      </Button>
    </form>
  );
}
