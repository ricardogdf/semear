import Link from "next/link";
import { Sparkles, BrainCircuit, LogOut, Settings } from "lucide-react";

import { ThemeToggle } from "./theme-toggle";
import { NavLink } from "./nav-link";
import { GlobalPomodoro } from "../pomodoro/global-pomodoro";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/subjects", label: "Matérias" },
  { href: "/simulations", label: "Simulados" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/40 bg-card/50 backdrop-blur-xl md:flex shadow-[20px_0_40px_-20px_rgba(0,0,0,0.02)]">
        <div className="flex h-16 items-center px-6">
          <Link href="/dashboard" className="flex items-center gap-2 transition hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-[0.5rem] bg-primary text-primary-foreground shadow-sm">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <span className="font-[var(--font-heading)] font-semibold tracking-tight text-foreground">Semear</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-8">
          <nav className="flex flex-col space-y-1">
            <div className="px-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Geral
            </div>
            {navigation.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        </div>

        {/* Account Module - Rodapé da Sidebar */}
        <div className="mt-auto px-4 pb-6">
          <div className="mb-4 flex items-center justify-between px-2">
            <div className="flex items-center gap-2 rounded-full border border-border/50 bg-secondary/30 px-3 py-1 text-[10px] uppercase font-bold text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <Sparkles className="h-3 w-3 text-accent" />
              <span>AI-Ready</span>
            </div>
            <ThemeToggle />
          </div>
          <div className="group flex w-full items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-secondary/40">
             <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-primary text-primary-foreground shadow-sm">
                Ana
             </div>
             <div className="flex flex-1 items-center justify-between">
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium">Ana Souza</span>
                  <span className="text-xs text-muted-foreground">ana@telove.com</span>
                </div>
                <button aria-label="Sair" className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <LogOut className="h-4 w-4" />
                </button>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <GlobalPomodoro />
    </div>
  );
}
