"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LoaderCircle, ShieldCheck, ShieldOff, UserPlus, UserRoundCheck, UserRoundX, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import {
  Alert,
  Badge,
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  ModalContent,
  ModalDescription,
  ModalTitle,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { createUserSchema, type UserRoleValue } from "@/lib/utils";

import { useToast } from "@/components/providers/toast-provider";
import {
  createAdminUser,
  getAdminUsers,
  issueAdminSetupCode,
  updateAdminUser,
  type AdminUser,
} from "@/lib/api";

import { SetupCodeDialog, type SetupCodeInfo } from "./setup-code-dialog";

type CreateValues = z.infer<typeof createUserSchema>;

type PendingAction =
  | { kind: "toggle-active"; user: AdminUser }
  | { kind: "toggle-role"; user: AdminUser }
  | { kind: "setup-code"; user: AdminUser };

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "Nunca";
}

function StatusBadges({ user }: { user: AdminUser }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{user.role === "ADMIN" ? "Administrador" : "Usuário"}</Badge>
      <Badge variant={user.isActive ? "success" : "danger"}>{user.isActive ? "Ativo" : "Inativo"}</Badge>
      {!user.hasPassword ? <Badge variant="warning">Aguardando primeiro acesso</Badge> : null}
    </div>
  );
}

function UserActions({
  user,
  isSelf,
  onAction,
}: {
  user: AdminUser;
  isSelf: boolean;
  onAction: (action: PendingAction) => void;
}) {
  if (isSelf) {
    return <p className="text-xs text-muted-foreground">Sua conta</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => onAction({ kind: "setup-code", user })} disabled={!user.isActive}>
        <KeyRound className="mr-1.5 h-3.5 w-3.5" />
        {user.hasPassword ? "Redefinir senha" : "Gerar código"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => onAction({ kind: "toggle-role", user })}>
        {user.role === "ADMIN" ? <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
        {user.role === "ADMIN" ? "Remover admin" : "Tornar admin"}
      </Button>
      <Button size="sm" variant={user.isActive ? "ghost" : "secondary"} onClick={() => onAction({ kind: "toggle-active", user })}>
        {user.isActive ? <UserRoundX className="mr-1.5 h-3.5 w-3.5" /> : <UserRoundCheck className="mr-1.5 h-3.5 w-3.5" />}
        {user.isActive ? "Desativar" : "Reativar"}
      </Button>
    </div>
  );
}

function confirmText(action: PendingAction) {
  const { user } = action;
  switch (action.kind) {
    case "toggle-active":
      return user.isActive
        ? { title: `Desativar ${user.name}?`, body: "A pessoa perde o acesso imediatamente e as sessões abertas são encerradas. Os dados dela são mantidos.", confirm: "Desativar" }
        : { title: `Reativar ${user.name}?`, body: "A pessoa poderá entrar novamente com a senha atual.", confirm: "Reativar" };
    case "toggle-role":
      return user.role === "ADMIN"
        ? { title: `Remover privilégios de ${user.name}?`, body: "A conta passa a ser de usuário comum. As sessões abertas serão encerradas.", confirm: "Remover admin" }
        : { title: `Tornar ${user.name} administrador?`, body: "Administradores podem criar e desativar contas e aprovar solicitações. As sessões abertas serão encerradas.", confirm: "Tornar admin" };
    case "setup-code":
      return {
        title: user.hasPassword ? `Redefinir a senha de ${user.name}?` : `Gerar código para ${user.name}?`,
        body: user.hasPassword
          ? "Um novo código será gerado. A senha atual continua valendo até o código ser usado; códigos anteriores deixam de valer."
          : "Um novo código de primeiro acesso será gerado; códigos anteriores deixam de valer.",
        confirm: "Gerar código",
      };
  }
}

export function UsersScreen({ currentUserId }: { currentUserId: string }) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const usersQuery = useQuery({ queryKey: ["admin-users"], queryFn: getAdminUsers });
  const [createOpen, setCreateOpen] = React.useState(false);
  const [pending, setPending] = React.useState<PendingAction | null>(null);
  const [setupInfo, setSetupInfo] = React.useState<SetupCodeInfo | null>(null);

  const form = useForm<CreateValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", role: "USER" },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const createMutation = useMutation({
    mutationFn: (values: CreateValues) => createAdminUser(values),
    onSuccess: (result, values) => {
      setCreateOpen(false);
      form.reset();
      setSetupInfo({ name: values.name, email: values.email, code: result.setupCode, expiresAt: result.setupCodeExpiresAt });
      void refresh();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (action: PendingAction) => {
      if (action.kind === "toggle-active") return updateAdminUser(action.user.id, { isActive: !action.user.isActive });
      if (action.kind === "toggle-role") {
        return updateAdminUser(action.user.id, { role: (action.user.role === "ADMIN" ? "USER" : "ADMIN") as UserRoleValue });
      }
      return issueAdminSetupCode(action.user.id);
    },
    onSuccess: (result, action) => {
      setPending(null);
      if (action.kind === "setup-code" && "setupCode" in result) {
        setSetupInfo({ name: action.user.name, email: action.user.email, code: result.setupCode, expiresAt: result.setupCodeExpiresAt });
      } else {
        notify("success", "Conta atualizada.");
      }
      void refresh();
    },
    onError: (error) => {
      setPending(null);
      notify("error", error.message);
    },
  });

  const users = usersQuery.data ?? [];
  const confirm = pending ? confirmText(pending) : null;
  const { errors } = form.formState;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-[var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
            <Users className="h-6 w-6 text-primary" aria-hidden />
            Usuários
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie contas, defina permissões e controle o acesso. Não há cadastro público.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          Novo usuário
        </Button>
      </header>

      {usersQuery.isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center" role="status">
          <LoaderCircle className="h-6 w-6 animate-spin text-primary" aria-hidden />
          <span className="sr-only">Carregando usuários…</span>
        </div>
      ) : usersQuery.isError ? (
        <Alert tone="danger" title="Não foi possível carregar os usuários">{usersQuery.error.message}</Alert>
      ) : (
        <>
          {/* Cartões — telas pequenas */}
          <ul className="grid gap-3 lg:hidden">
            {users.map((user) => (
              <li key={user.id} className="rounded-3xl border border-border/60 bg-card p-4">
                <p className="font-medium">{user.name}</p>
                <p className="break-all text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-3">
                  <StatusBadges user={user} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Último acesso: {formatDate(user.lastLoginAt)}</p>
                <div className="mt-4">
                  <UserActions user={user} isSelf={user.id === currentUserId} onAction={setPending} />
                </div>
              </li>
            ))}
          </ul>

          {/* Tabela — telas largas */}
          <div className="hidden rounded-[2rem] border border-border/60 bg-card p-2 lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadges user={user} />
                    </TableCell>
                    <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
                    <TableCell>
                      {formatDate(user.createdAt)}
                      {user.createdByName ? <p className="text-xs text-muted-foreground">por {user.createdByName}</p> : null}
                    </TableCell>
                    <TableCell>
                      <UserActions user={user} isSelf={user.id === currentUserId} onAction={setPending} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Modal open={createOpen} onOpenChange={setCreateOpen}>
        <ModalContent>
          <ModalTitle>Novo usuário</ModalTitle>
          <ModalDescription className="mt-2">
            A conta é criada sem senha. Você receberá um código de primeiro acesso para entregar à pessoa.
          </ModalDescription>
          <form noValidate onSubmit={form.handleSubmit((values) => createMutation.mutate(values))} className="mt-5 grid gap-4">
            <div>
              <Label htmlFor="nu-name">Nome</Label>
              <Input id="nu-name" className="mt-2" autoComplete="off" {...form.register("name")} />
              <FieldError message={errors.name?.message} />
            </div>
            <div>
              <Label htmlFor="nu-email">E-mail</Label>
              <Input id="nu-email" type="email" inputMode="email" className="mt-2" autoComplete="off" {...form.register("email")} />
              <FieldError message={errors.email?.message} />
            </div>
            <div>
              <Label htmlFor="nu-role">Permissão</Label>
              <Select id="nu-role" className="mt-2" {...form.register("role")}>
                <option value="USER">Usuário</option>
                <option value="ADMIN">Administrador</option>
              </Select>
            </div>
            {createMutation.isError ? <Alert tone="danger">{createMutation.error.message}</Alert> : null}
            <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Criar conta
              </Button>
            </div>
          </form>
        </ModalContent>
      </Modal>

      <Modal open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <ModalContent>
          <ModalTitle>{confirm?.title}</ModalTitle>
          <ModalDescription className="mt-2">{confirm?.body}</ModalDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button
              variant={pending?.kind === "toggle-active" && pending.user.isActive ? "danger" : "default"}
              disabled={actionMutation.isPending}
              onClick={() => pending && actionMutation.mutate(pending)}
            >
              {actionMutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              {confirm?.confirm}
            </Button>
          </div>
        </ModalContent>
      </Modal>

      <SetupCodeDialog info={setupInfo} onClose={() => setSetupInfo(null)} />
    </div>
  );
}
