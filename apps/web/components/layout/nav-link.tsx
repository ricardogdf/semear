"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { cn } from "@semear/utils";

interface NavLinkProps {
  href: string;
  label: string;
  description?: string;
}

export function NavLink({ href, label }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "relative flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
      )}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-secondary/50 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-border/40"
          initial={false}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </Link>
  );
}
