"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Alert, Label, Select } from "@/components/ui";
import type { AiProviderValue, AiSettingsOverview } from "@/lib/utils";

import { AI_SETTINGS_QUERY_KEY } from "@/components/settings/ai-settings-screen";
import { getAiSettings } from "@/lib/api";

export interface AiSelection {
  provider: AiProviderValue | "";
  model: string;
}

/** Seleção inicial: provedor padrão do usuário e o modelo padrão dele. */
function defaultSelection(settings: AiSettingsOverview | undefined): AiSelection {
  const provider = settings?.providers.find((entry) => entry.provider === settings.defaultProvider && entry.connected)
    ?? settings?.providers.find((entry) => entry.connected);
  return { provider: provider?.provider ?? "", model: provider?.defaultModel ?? "" };
}

export function useAiSettings() {
  return useQuery({ queryKey: AI_SETTINGS_QUERY_KEY, queryFn: getAiSettings });
}

/**
 * Escolha explícita de provedor e modelo para uma execução. Mostra apenas provedores conectados
 * e modelos compatíveis informados pelo backend; o backend revalida a escolha.
 */
export function AiModelPicker({
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  value: AiSelection;
  onChange: (value: AiSelection) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const settingsQuery = useAiSettings();
  const settings = settingsQuery.data;
  const connected = settings?.providers.filter((provider) => provider.connected) ?? [];
  const current = connected.find((provider) => provider.provider === value.provider);

  React.useEffect(() => {
    if (settings && !value.provider) {
      const initial = defaultSelection(settings);
      if (initial.provider) onChange(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  if (settingsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando provedores de IA…</p>;
  }

  if (settingsQuery.isError) {
    return <Alert tone="danger">Não foi possível carregar os provedores de IA: {settingsQuery.error.message}</Alert>;
  }

  if (connected.length === 0) {
    return (
      <Alert tone="warning" title="Nenhum provedor de IA conectado">
        Para processar aulas, conecte sua chave da Anthropic, OpenAI ou Google em{" "}
        <Link href="/settings/ai" className="font-medium text-primary underline underline-offset-4">
          Provedores de IA
        </Link>
        .
      </Alert>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor={`${idPrefix}-provider`}>Provedor de IA</Label>
        <Select
          id={`${idPrefix}-provider`}
          className="mt-2"
          value={value.provider}
          disabled={disabled}
          onChange={(event) => {
            const provider = connected.find((entry) => entry.provider === event.target.value);
            onChange({ provider: provider?.provider ?? "", model: provider?.defaultModel ?? "" });
          }}
        >
          {connected.map((provider) => (
            <option key={provider.provider} value={provider.provider}>
              {provider.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-model`}>Modelo</Label>
        <Select
          id={`${idPrefix}-model`}
          className="mt-2"
          value={value.model}
          disabled={disabled || !current}
          onChange={(event) => onChange({ ...value, model: event.target.value })}
        >
          <option value="">Selecione…</option>
          {current?.models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.id}
              {model.id === current.defaultModel ? " (padrão)" : ""}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
