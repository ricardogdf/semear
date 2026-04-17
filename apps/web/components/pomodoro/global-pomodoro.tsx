"use client";

import * as React from "react";
import { Play, Pause, Square, Settings2, Coffee, Target, Minimize2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { usePomodoroStore } from "@/lib/pomodoro-store";
import { formatMinutes } from "@semear/utils";
import { Button } from "@semear/ui";

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

  const percentage = mode === "focus" 
    ? ((focusDuration - remainingSeconds) / focusDuration) * 100 
    : ((breakDuration - remainingSeconds) / breakDuration) * 100;

  // Render Full Screen Rest Overlay
  if (mode === "break" && isRunning) {
    return (
      <AnimatePresence>
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-2xl"
        >
          <div className="text-center space-y-8">
             <motion.div 
               animate={{ scale: [1, 1.1, 1] }} 
               transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
               className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-accent/20"
             >
                <Coffee className="h-16 w-16 text-accent" />
             </motion.div>
             <div>
                <h1 className="text-4xl font-semibold tracking-tight">Tempo de Descanso</h1>
                <p className="mt-4 text-muted-foreground max-w-sm mx-auto leading-relaxed">
                   Afaste-se da tela, beba água e respire. Seu foco será recarregado em breve.
                </p>
             </div>
             <div className="text-[6rem] font-bold tracking-tighter text-foreground tabular-nums">
                {formatMinutes(remainingSeconds)}
             </div>
             <div className="flex justify-center gap-4 mt-8">
                <Button variant="outline" size="lg" onClick={pause} className="rounded-full px-8">
                  Pausar
                </Button>
                <Button variant="default" size="lg" onClick={() => setMode("focus")} className="rounded-full px-8">
                  Forçar Retorno
                </Button>
             </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            layoutId="pomodoro-container"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="fixed bottom-6 right-6 z-50 flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-border/40 bg-card shadow-2xl backdrop-blur-xl"
          >
            {/* Background Progress Ring Fake */}
             <svg className="absolute inset-0 h-full w-full -rotate-90 text-primary">
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
               ) : (
                 <Settings2 className="h-5 w-5 text-muted-foreground" />
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="fixed bottom-6 right-6 z-50 w-[360px] overflow-hidden rounded-[2.5rem] border border-border/50 bg-card p-6 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] backdrop-blur-3xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   {mode === "focus" ? (
                     <Target className="h-5 w-5 text-primary" />
                   ) : (
                     <Coffee className="h-5 w-5 text-accent" />
                   )}
                   <span className="font-semibold text-foreground">
                     {mode === "focus" ? "Modo Foco" : "Pausa Curta"}
                   </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-8 mt-4 flex items-center justify-center">
                 <div className="text-7xl font-bold tracking-tighter tabular-nums font-[var(--font-heading)]">
                    {formatMinutes(remainingSeconds)}
                 </div>
              </div>

              <div className="mb-8 grid grid-cols-2 bg-secondary/30 rounded-2xl p-1 gap-1">
                 <button
                   onClick={() => setMode("focus")}
                   className={`rounded-xl py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${mode === "focus" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                 >
                   Foco
                 </button>
                 <button
                   onClick={() => setMode("break")}
                   className={`rounded-xl py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${mode === "break" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                 >
                   Pausa
                 </button>
              </div>

              <div className="mb-6 space-y-4 px-2">
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                       <span>Tempo de Estudo</span>
                       <span>{focusDuration / 60} min</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" max="60" step="5" 
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
                      min="1" max="15" step="1" 
                      value={breakDuration / 60}
                      onChange={(e) => setBreakDuration(Number(e.target.value) * 60)}
                      className="w-full accent-accent" 
                    />
                 </div>
              </div>

              <div className="flex items-center gap-3">
                 <Button 
                   className="flex-1 rounded-2xl h-12" 
                   onClick={isRunning ? pause : start}
                   variant={isRunning ? "secondary" : "default"}
                 >
                    {isRunning ? <><Pause className="mr-2 w-4 h-4" /> Pausar</> : <><Play className="mr-2 w-4 h-4" /> Iniciar</>}
                 </Button>
                 <Button 
                   variant="outline" 
                   size="icon" 
                   className="h-12 w-12 rounded-2xl"
                   onClick={reset}
                 >
                    <Square className="h-4 w-4" />
                 </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
