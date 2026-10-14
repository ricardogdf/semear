"use client";

import * as React from "react";
import { Play, Pause, Square, Settings2, Coffee, Target, Minimize2, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { usePomodoroStore } from "@/lib/pomodoro-store";
import { formatMinutes } from "@/lib/utils";
import { Button } from "@/components/ui";

export function GlobalPomodoro() {
  const {
    mode,
    isRunning,
    remainingSeconds,
    focusDuration,
    breakDuration,
    start,
    pause,
    reset,
    tick,
    setMode,
    setFocusDuration,
    setBreakDuration,
  } = usePomodoroStore();

  const [isOpen, setIsOpen] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  React.useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      tick();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning, tick]);

  const isFocus = mode === "focus";
  const percentage = isFocus
    ? ((focusDuration - remainingSeconds) / focusDuration) * 100
    : ((breakDuration - remainingSeconds) / breakDuration) * 100;

  const skipBreak = () => setMode("focus");

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <>
      {/* Floating pill (closed state) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            aria-label={`Abrir Pomodoro: ${isFocus ? "foco" : "pausa"}, ${formatMinutes(remainingSeconds)} restantes${isRunning ? "" : ", pausado"}`}
            layoutId="pomodoro-container"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border/40 bg-card shadow-2xl backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 md:right-6 md:h-16 md:w-16"
          >
            <svg
              viewBox="0 0 64 64"
              className={`absolute inset-0 h-full w-full -rotate-90 ${isFocus ? "text-primary" : "text-accent"}`}
              aria-hidden="true"
            >
              <circle
                cx="32"
                cy="32"
                r="30"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray="188.5"
                strokeDashoffset={188.5 - (188.5 * percentage) / 100}
                className="transition-all duration-1000 ease-linear"
                strokeLinecap="round"
              />
            </svg>
            <div className="z-10 flex flex-col items-center justify-center bg-card rounded-full w-[calc(100%-8px)] h-[calc(100%-8px)]">
              {!isHovered ? (
                <span className="text-xs font-bold tabular-nums">
                  {formatMinutes(remainingSeconds)}
                </span>
              ) : isFocus ? (
                <Settings2 className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Coffee className="h-5 w-5 text-accent" />
              )}
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-background/20 backdrop-blur-sm"
            />
            <motion.div
              layoutId="pomodoro-container"
              role="dialog"
              aria-label="Pomodoro"
              className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[360px] overflow-y-auto rounded-[2rem] border border-border/50 bg-card p-5 sm:p-6 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] backdrop-blur-3xl md:bottom-6 md:right-6 md:w-[360px]"
            >
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isFocus ? (
                    <Target className="h-5 w-5 text-primary" />
                  ) : (
                    <Coffee className="h-5 w-5 text-accent" />
                  )}
                  <span className="font-semibold text-foreground">
                    {isFocus ? "Modo Foco" : "Pausa Curta"}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Minimizar Pomodoro"
                  autoFocus
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>

              {/* Timer */}
              <div className="mb-8 mt-4 flex items-center justify-center">
                <div
                  className={`text-7xl font-bold tracking-tighter tabular-nums font-[var(--font-heading)] ${!isFocus ? "text-accent" : ""}`}
                >
                  {formatMinutes(remainingSeconds)}
                </div>
              </div>

              {/* Settings sliders */}
              <div className="mb-6 space-y-4 px-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tempo de Estudo</span>
                    <span>{focusDuration / 60} min</span>
                  </div>
                  <input
                    type="range"
                    aria-label="Tempo de estudo em minutos"
                    min="5"
                    max="60"
                    step="5"
                    value={focusDuration / 60}
                    onChange={(e) => setFocusDuration(Number(e.target.value) * 60)}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tempo de Pausa</span>
                    <span>{breakDuration / 60} min</span>
                  </div>
                  <input
                    type="range"
                    aria-label="Tempo de pausa em minutos"
                    min="1"
                    max="15"
                    step="1"
                    value={breakDuration / 60}
                    onChange={(e) => setBreakDuration(Number(e.target.value) * 60)}
                    className="w-full accent-accent"
                  />
                </div>
              </div>

              {/* Controls */}
              {isFocus ? (
                <div className="flex items-center gap-3">
                  <Button
                    className="flex-1 rounded-2xl h-12"
                    onClick={isRunning ? pause : start}
                    variant={isRunning ? "secondary" : "default"}
                  >
                    {isRunning ? (
                      <><Pause className="mr-2 w-4 h-4" /> Pausar</>
                    ) : (
                      <><Play className="mr-2 w-4 h-4" /> Iniciar</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-2xl"
                    onClick={reset}
                    aria-label="Reiniciar ciclo"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full rounded-2xl h-12"
                  variant="outline"
                  onClick={skipBreak}
                >
                  <SkipForward className="mr-2 w-4 h-4" />
                  Pular Pausa
                </Button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
