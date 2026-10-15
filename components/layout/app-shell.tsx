"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { LogoMark } from "@/components/brand/logo-mark";
import { Badge, SheetContent } from "@/components/ui";
import { cn, type CurrentUser } from "@/lib/utils";

import { logout } from "@/lib/api";

import { GlobalPomodoro } from "../pomodoro/global-pomodoro";
import { NavLink } from "./nav-link";
import { navigationSections, SIDEBAR_COOKIE } from "./navigation";
import { ThemeToggle } from "./theme-toggle";

interface AppShellProps {
  user: CurrentUser;
  initialCollapsed: boolean;
  children: React.ReactNode;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Semear — ir para o dashboard"
    >
      <LogoMark />
      <span className={cn("font-[var(--font-heading)] text-lg font-semibold tracking-tight", collapsed && "sr-only")}>
        Semear
      </span>
    </Link>
  );
}

function Navigation({ user, collapsed, onNavigate }: { user: CurrentUser; collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-6">
      {navigationSections
        .filter((section) => !section.adminOnly || user.role === "ADMIN")
        .map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <p
              className={cn(
                "px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground",
                collapsed && "sr-only",
              )}
            >
              {section.title}
            </p>
            {section.items.map((item) => (
              <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
    </nav>
  );
}

function UserPanel({ user, collapsed }: { user: CurrentUser; collapsed?: boolean }) {
  const [pending, setPending] = React.useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await logout();
    } finally {
      // Navegação completa: descarta o cache de dados do cliente da sessão encerrada.
      window.location.assign("/login");
    }
  }

  return (
    <div className={cn("flex items-center gap-3 rounded-2xl p-2", collapsed ? "flex-col" : "bg-secondary/40")}>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-primary text-sm font-bold text-primary-foreground"
        aria-hidden
        title={collapsed ? `${user.name} (${user.email})` : undefined}
      >
        {initials(user.name)}
      </span>
      <div className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        {user.role === "ADMIN" ? (
          <Badge variant="default" className="mt-1 px-2 py-0 text-[10px]">
            Administrador
          </Badge>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        aria-label="Sair da conta"
        title="Sair"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function AppShell({ user, initialCollapsed, children }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(initialCollapsed);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <a
        href="#conteudo"
        className="sr-only z-[70] rounded-xl bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>

      {/* Menu lateral — desktop e tablet */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/60 bg-card/80 backdrop-blur-xl transition-[width] duration-200 ease-out md:flex",
          collapsed ? "w-[4.75rem]" : "w-64",
        )}
      >
        <div className={cn("flex h-16 items-center gap-2 px-4", collapsed ? "justify-center" : "justify-between")}>
          <Brand collapsed={collapsed} />
        </div>

        <div className={cn("flex-1 px-3 py-4", collapsed ? "overflow-visible" : "overflow-y-auto")}>
          <Navigation user={user} collapsed={collapsed} />
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 p-3">
          <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between")}>
            <ThemeToggle />
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
          <UserPanel user={user} collapsed={collapsed} />
        </div>
      </aside>

      {/* Barra superior + drawer — celulares */}
      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/60 bg-card/90 px-4 backdrop-blur-xl md:hidden">
          <Dialog.Trigger
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Dialog.Trigger>
          <Brand />
          <ThemeToggle />
        </header>
        <SheetContent aria-describedby={undefined}>
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <div className="flex h-16 items-center px-5">
            <Brand />
          </div>
          <div className="flex-1 px-3 py-2">
            <Navigation user={user} onNavigate={() => setDrawerOpen(false)} />
          </div>
          <div className="border-t border-border/60 p-3 pb-safe">
            <UserPanel user={user} />
          </div>
        </SheetContent>
      </Dialog.Root>

      <main
        id="conteudo"
        tabIndex={-1}
        className={cn(
          "min-w-0 outline-none transition-[padding] duration-200 ease-out",
          collapsed ? "md:pl-[4.75rem]" : "md:pl-64",
        )}
      >
        <div className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-6 sm:px-6 md:pt-8 lg:px-8">{children}</div>
      </main>

      <GlobalPomodoro />
    </div>
  );
}
