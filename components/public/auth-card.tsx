import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-secondary/20 px-4 py-10">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LogoMark className="h-10 w-10" />
        <span className="font-[var(--font-heading)] text-xl font-semibold tracking-tight">Semear</span>
      </Link>
      <main className="w-full max-w-md rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6">{children}</div>
      </main>
      {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
