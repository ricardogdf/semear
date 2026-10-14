"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Inbox, LoaderCircle, X } from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  Label,
  Modal,
  ModalContent,
  ModalDescription,
  ModalTitle,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/ui";
import type { AccessRequestStatusValue, UserRoleValue } from "@/lib/utils";

import { useToast } from "@/components/providers/toast-provider";
import { approveAccessRequest, getAccessRequests, rejectAccessRequest, type AdminAccessRequest } from "@/lib/api";

import { SetupCodeDialog, type SetupCodeInfo } from "./setup-code-dialog";

const filters: Array<{ value: AccessRequestStatusValue | "ALL"; label: string }> = [
  { value: "PENDING", label: "Pendentes" },
  { value: "APPROVED", label: "Aprovadas" },
  { value: "REJECTED", label: "Rejeitadas" },
  { value: "ALL", label: "Todas" },
];

const statusBadge: Record<AccessRequestStatusValue, { label: string; variant: "warning" | "success" | "danger" }> = {
  PENDING: { label: "Pendente", variant: "warning" },
  APPROVED: { label: "Aprovada", variant: "success" },
  REJECTED: { label: "Rejeitada", variant: "danger" },
};

type Decision = { kind: "approve" | "reject"; request: AdminAccessRequest };

export function AccessRequestsScreen() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [filter, setFilter] = React.useState<AccessRequestStatusValue | "ALL">("PENDING");
  const [decision, setDecision] = React.useState<Decision | null>(null);
  const [role, setRole] = React.useState<UserRoleValue>("USER");
  const [note, setNote] = React.useState("");
  const [setupInfo, setSetupInfo] = React.useState<SetupCodeInfo | null>(null);

  const query = useQuery({
    queryKey: ["access-requests", filter],
    queryFn: () => getAccessRequests(filter === "ALL" ? undefined : filter),
  });

  const mutation = useMutation({
    mutationFn: async (current: Decision) =>
      current.kind === "approve"
        ? approveAccessRequest(current.request.id, { role, note: note.trim() || undefined })
        : rejectAccessRequest(current.request.id, { note: note.trim() || undefined }),
    onSuccess: (result, current) => {
      setDecision(null);
      if (current.kind === "approve" && "setupCode" in result) {
        setSetupInfo({
          name: current.request.name,
          email: current.request.email,
          code: result.setupCode,
          expiresAt: result.setupCodeExpiresAt,
        });
      } else {
        notify("success", "Solicitação rejeitada.");
      }
      void queryClient.invalidateQueries({ queryKey: ["access-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  function openDecision(next: Decision) {
    setRole("USER");
    setNote("");
    mutation.reset();
    setDecision(next);
  }

  const requests = query.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 font-[var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
          <Inbox className="h-6 w-6 text-primary" aria-hidden />
          Solicitações de acesso
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pedidos enviados pela página pública. Aprovar cria a conta e gera o código de primeiro acesso.
        </p>
      </header>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <TabsList>
            {filters.map((entry) => (
              <TabsTrigger key={entry.value} value={entry.value}>
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {query.isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center" role="status">
          <LoaderCircle className="h-6 w-6 animate-spin text-primary" aria-hidden />
          <span className="sr-only">Carregando solicitações…</span>
        </div>
      ) : query.isError ? (
        <Alert tone="danger" title="Não foi possível carregar as solicitações">{query.error.message}</Alert>
      ) : requests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Nenhuma solicitação {filter === "PENDING" ? "pendente" : "neste filtro"}.
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {requests.map((request) => (
            <li key={request.id} className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{request.name}</p>
                  <p className="break-all text-sm text-muted-foreground">{request.email}</p>
                </div>
                <Badge variant={statusBadge[request.status].variant}>{statusBadge[request.status].label}</Badge>
              </div>
              {request.message ? (
                <p className="whitespace-pre-wrap rounded-2xl bg-secondary/40 p-3 text-sm">{request.message}</p>
              ) : (
                <p className="text-sm italic text-muted-foreground">Sem mensagem.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Recebida em {new Date(request.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                {request.reviewedAt
                  ? ` · analisada por ${request.reviewedByName ?? "—"} em ${new Date(request.reviewedAt).toLocaleDateString("pt-BR")}`
                  : ""}
              </p>
              {request.reviewNote ? <p className="text-xs text-muted-foreground">Observação: {request.reviewNote}</p> : null}
              {request.status === "PENDING" && request.emailAlreadyRegistered ? (
                <Alert tone="warning">Já existe uma conta com este e-mail. Rejeite a solicitação ou gerencie a conta em Usuários.</Alert>
              ) : null}
              {request.status === "PENDING" ? (
                <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
                  <Button onClick={() => openDecision({ kind: "approve", request })} disabled={request.emailAlreadyRegistered}>
                    <Check className="mr-2 h-4 w-4" />
                    Aprovar e criar conta
                  </Button>
                  <Button variant="outline" onClick={() => openDecision({ kind: "reject", request })}>
                    <X className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Modal open={Boolean(decision)} onOpenChange={(open) => !open && setDecision(null)}>
        <ModalContent>
          <ModalTitle>
            {decision?.kind === "approve" ? `Aprovar ${decision.request.name}?` : `Rejeitar ${decision?.request.name}?`}
          </ModalTitle>
          <ModalDescription className="mt-2">
            {decision?.kind === "approve"
              ? "Uma conta será criada sem senha e você receberá o código de primeiro acesso."
              : "A pessoa não receberá acesso. A decisão fica registrada."}
          </ModalDescription>
          <div className="mt-5 grid gap-4">
            {decision?.kind === "approve" ? (
              <div>
                <Label htmlFor="decision-role">Permissão</Label>
                <Select id="decision-role" className="mt-2" value={role} onChange={(event) => setRole(event.target.value as UserRoleValue)}>
                  <option value="USER">Usuário</option>
                  <option value="ADMIN">Administrador</option>
                </Select>
              </div>
            ) : null}
            <div>
              <Label htmlFor="decision-note">
                Observação interna <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea id="decision-note" className="mt-2 min-h-[80px]" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
            {mutation.isError ? <Alert tone="danger">{mutation.error.message}</Alert> : null}
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDecision(null)}>
              Cancelar
            </Button>
            <Button
              variant={decision?.kind === "reject" ? "danger" : "default"}
              disabled={mutation.isPending}
              onClick={() => decision && mutation.mutate(decision)}
            >
              {mutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              {decision?.kind === "approve" ? "Aprovar" : "Rejeitar"}
            </Button>
          </div>
        </ModalContent>
      </Modal>

      <SetupCodeDialog info={setupInfo} onClose={() => setSetupInfo(null)} />
    </div>
  );
}
