import type { Metadata } from "next";
import { Suspense } from "react";

import { SimulationsWorkspace } from "@/components/simulations/simulations-workspace";

export const metadata: Metadata = { title: "Simulados | Semear" };

export default function SimulationsPage() {
  return (
    <Suspense>
      <SimulationsWorkspace />
    </Suspense>
  );
}
