"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, KeyRound, LoaderCircle, PlugZap, RefreshCw, Unplug } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  FieldError,
  Label,
  Modal,
  ModalContent,
  ModalDescription,
  ModalTitle,
  Select,
} from "@/components/ui";
import type { AiProviderSettings, AiProviderValue, AiSettingsOverview } from "@/lib/utils";

import { useToast } from "@/components/providers/toast-provider";
import { PasswordInput } from "@/components/public/password-input";
import {
  connectAiProvider,
  disconnectAiProvider,
  getAiSettings,
  setAiDefaultModel,
  setDefaultAiProvider,
  testAiProvider,
} from "@/lib/api";

const errorLabels: Record<string, string> = {
  AUTHENTICATION: "A chave foi recusada pelo provedor na última tentativa.",
  PERMISSION: "A chave não tem permissão para os recursos necessários.",
};

export const AI_SETTINGS_QUERY_KEY = ["ai-settings"] as const;

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

function ProviderCard({ provider, disabled }: { provider: AiProviderSettings; disabled: boolean }) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [apiKey, setApiKey] = React.useState("");
  const [keyError, setKeyError] = React.useState<string | null>(null);
  const [model, setModel] = React.useState(provider.defaultModel ?? "");
  const [confirmDisconnect, setConfirmDisconnect] = React.useState(false);
  const inputId = `key-${provider.provider}`;

  React.useEffect(() => setModel(provider.defaultModel ?? ""), [provider.defaultModel]);

  const update = (data: AiSettingsOverview) => queryClient.setQueryData(AI_SETTINGS_QUERY_KEY, data);

  const connect = useMutation({
    mutationFn: () => connectAiProvider(provider.provider, apiKey.trim()),
    onSuccess: (data) => {
      update(data);
      setApiKey("");
      notify("success", `${provider.label} conectado. Escolha o modelo padrão.`);
    },
    onError: (error) => setKeyError(error.message),
  });
  const test = useMutation({
    mutationFn: () => testAiProvider(provider.provider),
    onSuccess: (data) => {
      update(data);
      notify("success", "Conexão funcionando. Lista de modelos atualizada.");
    },
    onError: (error) => {
      notify("error", error.message);
      void queryClient.invalidateQueries({ queryKey: AI_SETTINGS_QUERY_KEY });
    },
  });
  const saveModel = useMutation({
    mutationFn: () => setAiDefaultModel(provider.provider, model),
    onSuccess: (data) => {
      update(data);
      notify("success", "Modelo padrão salvo.");
    },
    onError: (error) => notify("error", error.message),
  });
  const disconnect = useMutation({
    mutationFn: () => disconnectAiProvider(provider.provider),
    onSuccess: (data) => {
      update(data);
      setConfirmDisconnect(false);
      notify("success", `${provider.label} desconectado e chave removida.`);
    },
    onError: (error) => notify("error", error.message),
  });

  function submitKey(event: React.FormEvent) {
    event.preventDefault();
    const value = apiKey.trim();
    if (value.length < 10 || /\s/.test(value)) {
      setKeyError("Informe uma chave de API válida (sem espaços).");
      return;
    }
    setKeyError(null);
    connect.mutate();
  }

  const busy = connect.isPending || test.isPending || saveModel.isPending || disconnect.isPending;

  return (
    <section
      aria-labelledby={`provider-${provider.provider}`}
      className="flex flex-col gap-5 rounded-[2rem] border border-border/60 bg-card p-5 sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`provider-${provider.provider}`} className="text-lg font-semibold">
            {provider.label}
          </h2>
          <p className="text-sm text-muted-foreground">{provider.product}</p>
        </div>
        {provider.connected ? (
          <Badge variant={provider.lastErrorCode ? "warning" : "success"}>
            {provider.lastErrorCode ? "Verificar chave" : "Conectado"}
          </Badge>
        ) : (
          <Badge variant="secondary">Não conectado</Badge>
        )}
      </header>

      {provider.connected ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Chave</dt>
            <dd className="font-mono">{provider.keyHint}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Última validação</dt>
            <dd>{formatDate(provider.lastValidatedAt)}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">
          {provider.apiKeyInstructions}{" "}
          <a
            href={provider.apiKeyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            Obter chave <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </p>
      )}

      {provider.lastErrorCode ? (
        <Alert tone="warning">
          {errorLabels[provider.lastErrorCode] ?? "A última chamada a este provedor falhou."} Atualize a chave ou teste a
          conexão.
        </Alert>
      ) : null}

      {provider.connected ? (
        <div className="grid gap-2">
          <Label htmlFor={`model-${provider.provider}`}>Modelo padrão</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              id={`model-${provider.provider}`}
              value={model}
              onChange={(event) => setModel(event.target.value)}
              disabled={busy || provider.models.length === 0}
            >
              <option value="">Selecione um modelo…</option>
              {provider.models.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.displayName === entry.id ? entry.id : `${entry.displayName} (${entry.id})`}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              disabled={busy || !model || model === provider.defaultModel}
              onClick={() => saveModel.mutate()}
            >
              {saveModel.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {provider.models.length} modelo(s) compatível(is) com geração estruturada, conforme a API do provedor.
            {!provider.defaultModel ? " Sem modelo padrão, será preciso escolher o modelo em cada envio." : ""}
          </p>
        </div>
      ) : null}

      <form onSubmit={submitKey} className="grid gap-2" autoComplete="off">
        <Label htmlFor={inputId}>{provider.connected ? "Substituir chave de API" : "Chave de API"}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <PasswordInput
            id={inputId}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={provider.connected ? "Cole a nova chave para substituir" : "Cole sua chave de API"}
            disabled={disabled || busy}
            aria-invalid={Boolean(keyError)}
            aria-describedby={keyError ? `${inputId}-error` : undefined}
          />
          <Button type="submit" className="shrink-0" disabled={disabled || busy || !apiKey.trim()}>
            {connect.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            {connect.isPending ? "Validando…" : provider.connected ? "Substituir" : "Conectar"}
          </Button>
        </div>
        <FieldError id={`${inputId}-error`} message={keyError} />
        <p className="text-xs text-muted-foreground">
          A chave é validada no provedor e guardada criptografada. Ela nunca é exibida novamente.
        </p>
      </form>

      {provider.connected ? (
        <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row">
          <Button type="button" variant="outline" disabled={busy} onClick={() => test.mutate()}>
            {test.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Testar conexão
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmDisconnect(true)}>
            <Unplug className="mr-2 h-4 w-4" />
            Desconectar
          </Button>
        </div>
      ) : null}

      <Modal open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <ModalContent>
          <ModalTitle>Desconectar {provider.label}?</ModalTitle>
          <ModalDescription className="mt-2">
            A chave criptografada será apagada. Envios futuros com este provedor exigirão uma nova chave.
          </ModalDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmDisconnect(false)}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
              {disconnect.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              Desconectar
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </section>
  );
}

export function AiSettingsScreen() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const query = useQuery({ queryKey: AI_SETTINGS_QUERY_KEY, queryFn: getAiSettings });

  const setDefault = useMutation({
    mutationFn: (provider: AiProviderValue | null) => setDefaultAiProvider(provider),
    onSuccess: (data) => {
      queryClient.setQueryData(AI_SETTINGS_QUERY_KEY, data);
      notify("success", "Provedor padrão atualizado.");
    },
    onError: (error) => notify("error", error.message),
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center" role="status">
        <LoaderCircle className="h-6 w-6 animate-spin text-primary" aria-hidden />
        <span className="sr-only">Carregando configurações…</span>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <Alert tone="danger" title="Não foi possível carregar as configurações">{query.error?.message}</Alert>;
  }

  const settings = query.data;
  const connected = settings.providers.filter((provider) => provider.connected);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 font-[var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
          <PlugZap className="h-6 w-6 text-primary" aria-hidden />
          Provedores de IA
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Conecte sua própria chave de API para processar suas aulas. A integração usa a <strong>API</strong> de cada
          provedor, com cobrança na sua conta de API — assinaturas dos aplicativos de chat não incluem, necessariamente,
          créditos de API. Suas chaves não são compartilhadas com outros usuários.
        </p>
      </header>

      {!settings.encryptionConfigured ? (
        <Alert tone="warning" title="Armazenamento de chaves indisponível">
          O servidor ainda não tem a chave de criptografia configurada (CREDENTIALS_ENCRYPTION_KEY). Por segurança, não é
          possível conectar provedores até que o administrador a configure.
        </Alert>
      ) : null}

      <section className="rounded-[2rem] border border-border/60 bg-card p-5 sm:p-6" aria-labelledby="default-provider">
        <h2 id="default-provider" className="font-semibold">Provedor padrão</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Usado quando você não escolher outro no envio de uma aula. Nunca trocamos de provedor automaticamente.
        </p>
        <div className="mt-4 max-w-sm">
          <Label htmlFor="default-provider-select" className="sr-only">Provedor padrão</Label>
          <Select
            id="default-provider-select"
            value={settings.defaultProvider ?? ""}
            disabled={connected.length === 0 || setDefault.isPending}
            onChange={(event) => setDefault.mutate((event.target.value || null) as AiProviderValue | null)}
          >
            <option value="">{connected.length === 0 ? "Nenhum provedor conectado" : "Sem provedor padrão"}</option>
            {connected.map((provider) => (
              <option key={provider.provider} value={provider.provider}>
                {provider.label}
              </option>
            ))}
          </Select>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        {settings.providers.map((provider) => (
          <ProviderCard key={provider.provider} provider={provider} disabled={!settings.encryptionConfigured} />
        ))}
      </div>
    </div>
  );
}
