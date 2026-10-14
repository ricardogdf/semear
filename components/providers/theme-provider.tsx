"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { themeStorageKey } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      storageKey={themeStorageKey}
      enableSystem={false}
    >
      {children}
    </NextThemesProvider>
  );
}
