"use client";

import type { SimulationSnapshot } from "@/lib/utils";

/**
 * Persistência local (sessionStorage) da tentativa em andamento: recarregar a página não
 * perde as respostas. O servidor continua sendo a fonte de verdade do prazo e da correção.
 */
const KEY = "semear-active-simulation";

export interface ActiveSimulation {
  subjectId: string;
  subjectTitle: string;
  simulation: SimulationSnapshot;
  answers: Record<number, string>;
}

export function loadActiveSimulation(): ActiveSimulation | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSimulation;
    // Descarta tentativas cujo prazo (com tolerância de 2 min do servidor) já passou.
    if (new Date(parsed.simulation.deadline).getTime() + 2 * 60 * 1000 < Date.now()) {
      window.sessionStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveSimulation(value: ActiveSimulation) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Armazenamento indisponível (modo privado): segue sem persistir.
  }
}

export function clearActiveSimulation() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
