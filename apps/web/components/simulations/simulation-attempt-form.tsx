"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock3, LoaderCircle, ChevronLeft, ChevronRight, CheckCircle, Flag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Badge,
  Button,
} from "@semear/ui";
import type { SimulationSnapshot } from "@semear/utils";
import { submitSimulation } from "@/lib/api";

interface SimulationAttemptFormProps {
  subjectId: string;
  simulation: SimulationSnapshot;
  onBack?: () => void;
}

export function SimulationAttemptForm({
  subjectId,
  simulation,
  onBack
}: SimulationAttemptFormProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<number, string>>({});
  const [feedback, setFeedback] = React.useState<{score: number, correct: number} | null>(null);

  const queryClient = useQueryClient();
  const totalQuestions = simulation.questions.length;

  const mutation = useMutation({
    mutationFn: () => {
      // Compilar as respostas no formato esperado pelo backend
      const formattedAnswers = simulation.questions.map((q, idx) => ({
        question: q.question,
        answer: answers[idx] || "Nao respondida",
      }));
      return submitSimulation(simulation.id, { subjectId, answers: formattedAnswers });
    },
    onSuccess: (result) => {
      setFeedback({ score: result.score, correct: result.correctAnswers });
      void queryClient.invalidateQueries({ queryKey: ["simulations"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const handleSelectOption = (option: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: option }));
  };

  const currentQuestion = simulation.questions[currentQuestionIndex];
  if (!currentQuestion) {
     return <div className="p-8 text-center" >Carregando ou sem perguntas...</div>;
  }

  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const progressPercent = ((currentQuestionIndex) / totalQuestions) * 100;

  if (feedback) {
     return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-[2.5rem] border border-border/50 shadow-xl min-h-[500px]">
           <div className="h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10" />
           </div>
           <h2 className="text-3xl font-[var(--font-heading)] font-semibold mb-2">Simulado Concluído</h2>
           <p className="text-muted-foreground mb-8 text-lg">Média alcançada: <span className="font-bold text-foreground">{feedback.score} / {simulation.maxScore}</span></p>
           
           <div className="flex gap-4">
              <Button variant="outline" className="rounded-full px-6" onClick={onBack}>
                 Voltar para Simulados
              </Button>
           </div>
        </motion.div>
     )
  }

  return (
    <div className="flex flex-col min-h-[80vh] bg-card rounded-[2.5rem] border border-border/50 shadow-2xl overflow-hidden relative">
      {/* Engine Header */}
      <div className="flex items-center justify-between p-6 border-b border-border/40 bg-secondary/10">
         <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-background border border-border/50 text-muted-foreground hover:text-foreground rounded-full transition-colors">
               <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
               <h3 className="font-semibold">{simulation.title}</h3>
               <p className="text-xs text-muted-foreground mt-0.5">Pergunta {currentQuestionIndex + 1} de {totalQuestions}</p>
            </div>
         </div>
         <Badge variant="outline" className="bg-background shadow-sm px-3 py-1.5 flex gap-1.5 border-border/50">
            <Clock3 className="h-3.5 w-3.5" />
            {simulation.timeLimitMinutes} min
         </Badge>
      </div>

      {/* Progress Bar Top */}
      <div className="h-1.5 w-full bg-secondary">
         <motion.div 
           initial={{ width: 0 }} 
           animate={{ width: `${progressPercent}%` }} 
           className="h-full bg-primary" 
           transition={{ duration: 0.3 }}
         />
      </div>

      {/* Main Question Body */}
      <div className="flex-1 flex flex-col p-8 md:p-12 md:max-w-3xl mx-auto w-full relative">
         <AnimatePresence mode="wait">
            <motion.div
               key={currentQuestionIndex}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.2 }}
               className="flex-1 h-full"
            >
               <h2 className="text-2xl font-[var(--font-heading)] font-medium leading-relaxed text-foreground">
                  {currentQuestion.question}
               </h2>

               <div className="mt-10 grid gap-4">
                  {currentQuestion.options.map((option) => {
                     const isSelected = answers[currentQuestionIndex] === option;
                     return (
                       <button
                         key={option}
                         onClick={() => handleSelectOption(option)}
                         className={`group relative flex items-center justify-between w-full p-5 rounded-2xl border text-left transition-all ${
                           isSelected 
                           ? "bg-primary/5 border-primary shadow-[0_0_0_1px_hsl(var(--primary))]" 
                           : "bg-secondary/20 border-border/50 hover:bg-secondary/50 hover:border-border"
                         }`}
                       >
                          <span className={`${isSelected ? "font-semibold text-primary" : "text-foreground group-hover:text-foreground"}`}>
                             {option}
                          </span>
                          <div className={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected ? "border-primary bg-primary" : "border-muted-foreground/30 bg-transparent"
                            }`}
                          >
                             {isSelected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                          </div>
                       </button>
                     );
                  })}
               </div>
            </motion.div>
         </AnimatePresence>
      </div>

      {/* Engine Footer */}
      <div className="p-6 border-t border-border/40 bg-secondary/5 flex items-center justify-between">
         <Button 
           variant="outline" 
           disabled={currentQuestionIndex === 0 || mutation.isPending} 
           onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
           className="rounded-full pl-3 pr-5"
         >
           <ChevronLeft className="h-5 w-5 mr-1" /> Anterior
         </Button>
         
         {!isLastQuestion ? (
           <Button 
             className="rounded-full px-5 pr-3 shadow-md bg-primary hover:bg-primary/95 text-primary-foreground" 
             disabled={!answers[currentQuestionIndex]}
             onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
           >
             Próxima <ChevronRight className="h-5 w-5 ml-1" />
           </Button>
         ) : (
           <Button 
             className="rounded-full px-6 shadow-md bg-foreground hover:bg-foreground/90 text-background" 
             disabled={!answers[currentQuestionIndex] || mutation.isPending}
             onClick={() => mutation.mutate()}
           >
             {mutation.isPending ? <LoaderCircle className="h-5 w-5 mr-2 animate-spin" /> : <Flag className="h-4 w-4 mr-2" />}
             Finalizar Simulado
           </Button>
         )}
      </div>
    </div>
  );
}
