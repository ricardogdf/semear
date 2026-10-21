"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, UserCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui";
import type { FollowState } from "@/lib/utils";

import { useToast } from "@/components/providers/toast-provider";
import { followUser, unfollowUser } from "@/lib/api";

import { LoginLink } from "./login-link";

/** Listas que mostram relações de seguimento: ficam desatualizadas e são recarregadas ao reabrir. */
export function useMarkCommunityStale() {
  const queryClient = useQueryClient();
  return React.useCallback(
    (...keys: string[]) => {
      for (const key of keys) {
        void queryClient.invalidateQueries({ queryKey: [key], refetchType: "none" });
      }
    },
    [queryClient],
  );
}

/**
 * Seguir / deixar de seguir. O estado só muda depois da confirmação do servidor, que devolve a
 * contagem real de seguidores. Anônimos veem um convite para entrar; o próprio perfil não tem botão.
 */
export function FollowButton({
  userId,
  name,
  isFollowing,
  isSelf,
  authenticated,
  onChange,
}: {
  userId: string;
  name: string;
  isFollowing: boolean;
  isSelf: boolean;
  authenticated: boolean;
  onChange?: (state: FollowState) => void;
}) {
  const { notify } = useToast();
  const markStale = useMarkCommunityStale();
  const [following, setFollowing] = React.useState(isFollowing);

  React.useEffect(() => setFollowing(isFollowing), [isFollowing]);

  const mutation = useMutation({
    mutationFn: () => (following ? unfollowUser(userId) : followUser(userId)),
    onSuccess: (state) => {
      setFollowing(state.isFollowing);
      onChange?.(state);
      markStale("following", "people", "discover");
    },
    onError: (error) => notify("error", error.message),
  });

  if (isSelf) return null;
  if (!authenticated) return <LoginLink>Entrar para seguir</LoginLink>;

  return (
    <Button
      type="button"
      size="sm"
      variant={following ? "outline" : "default"}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      aria-label={following ? `Deixar de seguir ${name}` : `Seguir ${name}`}
      title={following ? "Deixar de seguir" : undefined}
      className="shrink-0 gap-1.5"
    >
      {mutation.isPending ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : following ? (
        <UserCheck className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <UserPlus className="h-3.5 w-3.5" aria-hidden />
      )}
      {following ? "Seguindo" : "Seguir"}
    </Button>
  );
}
