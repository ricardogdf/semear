"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const focusDuration = 25 * 60;
const breakDuration = 5 * 60;

type PomodoroMode = "focus" | "break";

interface PomodoroStore {
  mode: PomodoroMode;
  isRunning: boolean;
  remainingSeconds: number;
  focusDuration: number;
  breakDuration: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void;
  setMode: (mode: PomodoroMode) => void;
  setFocusDuration: (duration: number) => void;
  setBreakDuration: (duration: number) => void;
}

export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      mode: "focus",
      isRunning: false,
      remainingSeconds: focusDuration,
      focusDuration,
      breakDuration,
      start: () => set({ isRunning: true }),
      pause: () => set({ isRunning: false }),
      reset: () =>
        set((state) => ({
          isRunning: false,
          remainingSeconds:
            state.mode === "focus" ? state.focusDuration : state.breakDuration,
        })),
      tick: () =>
        set((state) => {
          if (!state.isRunning) {
            return state;
          }

          if (state.remainingSeconds <= 1) {
            const nextMode = state.mode === "focus" ? "break" : "focus";

            return {
              mode: nextMode,
              isRunning: false,
              remainingSeconds:
                nextMode === "focus" ? state.focusDuration : state.breakDuration,
            };
          }

          return {
            remainingSeconds: state.remainingSeconds - 1,
          };
        }),
      setMode: (mode) =>
        set((state) => ({
          mode,
          isRunning: false,
          remainingSeconds: mode === "focus" ? state.focusDuration : state.breakDuration,
        })),
      setFocusDuration: (duration) =>
        set((state) => ({
          focusDuration: duration,
          remainingSeconds: state.mode === "focus" && !state.isRunning ? duration : state.remainingSeconds,
        })),
      setBreakDuration: (duration) =>
        set((state) => ({
          breakDuration: duration,
          remainingSeconds: state.mode === "break" && !state.isRunning ? duration : state.remainingSeconds,
        })),
    }),
    {
      name: "semear-pomodoro",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        isRunning: state.isRunning,
        remainingSeconds: state.remainingSeconds,
        focusDuration: state.focusDuration,
        breakDuration: state.breakDuration,
      }),
    },
  ),
);
