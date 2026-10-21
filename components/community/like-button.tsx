"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Heart, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui";
import { cn, formatCount } from "@/lib/utils";

import { useToast } from "@/components/providers/toast-provider";
import { likePublication, unlikePublication } from "@/lib/api";

import { useMarkCommunityStale } from "./follow-button";
import { LoginLink } from "./login-link";

/**
 * Curtir / remover curtida (uma por usuário por publicação, garantido no servidor). A contagem
 * exibida é sempre a devolvida pelo servidor após a operação.
 */
export function LikeButton({
  publicationId,
  title,
  liked: initialLiked,
  likeCount: initialCount,
  authenticated,
}: {
  publicationId: string;
  title: string;
  liked: boolean;
  likeCount: number;
  authenticated: boolean;
}) {
  const { notify } = useToast();
  const markStale = useMarkCommunityStale();
  const [state, setState] = React.useState({ liked: initialLiked, likeCount: initialCount });

  React.useEffect(() => setState({ liked: initialLiked, likeCount: initialCount }), [initialLiked, initialCount]);

  const mutation = useMutation({
    mutationFn: () => (state.liked ? unlikePublication(publicationId) : likePublication(publicationId)),
    onSuccess: (next) => {
      setState(next);
      markStale("discover", "publications", "profile");
    },
    onError: (error) => notify("error", error.message),
  });

  const count = (
    <span className="text-xs text-muted-foreground" aria-live="polite">
      {formatCount(state.likeCount, "curtida", "curtidas")}
    </span>
  );

  if (!authenticated) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <LoginLink>Entrar para curtir</LoginLink>
        {count}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        aria-pressed={state.liked}
        aria-label={`Curtir “${title}”`}
        title={state.liked ? "Remover curtida" : "Curtir"}
        className={cn("gap-1.5", state.liked && "border-danger/40 text-danger hover:bg-danger/10")}
      >
        {mutation.isPending ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Heart className={cn("h-3.5 w-3.5", state.liked && "fill-current")} aria-hidden />
        )}
        {state.liked ? "Curtido" : "Curtir"}
      </Button>
      {count}
    </div>
  );
}
