"use client";

import * as React from "react";

import { cn, getInitials } from "@/lib/utils";

const sizes = {
  sm: "h-10 w-10 rounded-xl text-sm",
  md: "h-12 w-12 rounded-2xl text-base",
  lg: "h-20 w-20 rounded-3xl text-2xl",
} as const;

/** Foto de perfil (URL https do próprio usuário) ou, sem ela ou se não carregar, as iniciais. */
export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: {
  name: string;
  avatarUrl: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const classes = cn("shrink-0", sizes[size], className);

  if (avatarUrl && !failed) {
    return (
      // Imagem externa informada pelo usuário: <img> simples, sem enviar o endereço da página (no-referrer).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn(classes, "border border-border/60 bg-secondary object-cover")}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        classes,
        "flex items-center justify-center bg-gradient-to-br from-primary/80 to-primary font-bold text-primary-foreground",
      )}
    >
      {getInitials(name)}
    </span>
  );
}
