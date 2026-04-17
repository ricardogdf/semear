"use client";

import * as React from "react";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  );
}
