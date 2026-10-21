"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";

import { cn } from "@/lib/utils";

/** Leva ao login e, depois dele, de volta para a página atual. */
export function LoginLink({ children, className }: { children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  return (
    <Link
      href={`/login?next=${encodeURIComponent(pathname)}`}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 text-xs font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <LogIn className="h-3.5 w-3.5" aria-hidden />
      {children}
    </Link>
  );
}
