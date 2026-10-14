"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Alert, Button, FieldError, Input, Label, Textarea } from "@/components/ui";
import { accessRequestSchema } from "@/lib/utils";

import { submitAccessRequest } from "@/lib/api";

type FormValues = z.infer<typeof accessRequestSchema>;

export function AccessRequestForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(accessRequestSchema),
    defaultValues: { name: "", email: "", message: "", website: "" },
  });
  const mutation = useMutation({ mutationFn: submitAccessRequest });
  const { errors } = form.formState;

  if (mutation.isSuccess) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-3xl border border-success/30 bg-success/10 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
        <h3 className="text-lg font-semibold">Solicitação recebida</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Obrigado! Um administrador vai analisar o pedido. Se for aprovado, você receberá as instruções de
          primeiro acesso pelo administrador. Enviar novamente não acelera a análise.
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="grid gap-5"
      aria-describedby={mutation.isError ? "access-request-error" : undefined}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="ar-name">Nome completo</Label>
          <Input
            id="ar-name"
            autoComplete="name"
            className="mt-2"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "ar-name-error" : undefined}
            {...form.register("name")}
          />
          <FieldError id="ar-name-error" message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="ar-email">E-mail</Label>
          <Input
            id="ar-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className="mt-2"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "ar-email-error" : undefined}
            {...form.register("email")}
          />
          <FieldError id="ar-email-error" message={errors.email?.message} />
        </div>
      </div>

      <div>
        <Label htmlFor="ar-message">
          Como pretende usar o Semear? <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id="ar-message"
          className="mt-2"
          maxLength={1000}
          placeholder="Ex.: organizar as aulas do curso de Pedagogia e treinar para as provas."
          aria-invalid={Boolean(errors.message)}
          {...form.register("message")}
        />
        <FieldError message={errors.message?.message} />
      </div>

      {/* Campo isca para robôs: invisível e fora da navegação por teclado. */}
      <div aria-hidden="true" className="absolute left-[-10000px] h-px w-px overflow-hidden">
        <label htmlFor="ar-website">Não preencha este campo</label>
        <input id="ar-website" tabIndex={-1} autoComplete="off" {...form.register("website")} />
      </div>

      {mutation.isError ? (
        <Alert id="access-request-error" tone="danger" title="Não foi possível enviar">
          {mutation.error.message}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          A solicitação não cria uma conta. O acesso só é liberado após aprovação.
        </p>
        <Button type="submit" size="lg" disabled={mutation.isPending} className="w-full sm:w-auto">
          {mutation.isPending ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="mr-2 h-4 w-4" aria-hidden />
          )}
          {mutation.isPending ? "Enviando…" : "Solicitar acesso"}
        </Button>
      </div>
    </form>
  );
}
