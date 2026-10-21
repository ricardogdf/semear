import type { LucideIcon } from "lucide-react";

export function PageHeader({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <header>
      <h1 className="flex items-center gap-2 font-[var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
        <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden />
        {title}
      </h1>
      {children ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{children}</p> : null}
    </header>
  );
}
