"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LoaderCircle, ChevronLeft, Play, LayoutList, Trophy, FileText, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  Badge,
  Card,
  Button
} from "@semear/ui";
import { formatStatusLabel, getStatusVariant } from "@semear/utils";

import { getSimulations, generateSimulation } from "@/lib/api";
import { SimulationAttemptForm } from "./simulation-attempt-form";

export function SimulationsWorkspace() {
  const simulationsQuery = useQuery({
    queryKey: ["simulations"],
    queryFn: () => getSimulations(),
  });
  
  const [activeSubjectId, setActiveSubjectId] = React.useState<string | null>(null);
  const [activeSimulationId, setActiveSimulationId] = React.useState<string | null>(null);
  const [activeContentId, setActiveContentId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const openSubjectId = urlParams.get("open");
      if (openSubjectId && !activeSubjectId) {
        setActiveSubjectId(openSubjectId);
        window.history.replaceState({}, '', '/simulations');
      }
    }
  }, [activeSubjectId]);

  const generateMutation = useMutation({
     mutationFn: generateSimulation,
     onSuccess: (sim) => {
        setActiveSimulationId(sim.id);
        simulationsQuery.refetch();
     },
     onError: (err) => {
        alert(err.message || "Erro ao gerar simulado");
     }
  });

  if (simulationsQuery.isLoading) {
    return (
      <Card className="rounded-[2.5rem] border-none shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] bg-card min-h-[400px] flex items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (simulationsQuery.isError) {
    return (
      <Card className="rounded-[2.5rem] border border-destructive/20 bg-destructive/5 text-destructive p-8 text-center">
        {(simulationsQuery.error as Error).message}
      </Card>
    );
  }

  const subjects = simulationsQuery.data || [];
  const activeSubject = subjects.find(s => s.id === activeSubjectId);
  const activeSimulation = activeSubject?.simulations.find(s => s.id === activeSimulationId) || (generateMutation.data?.id === activeSimulationId ? generateMutation.data : null);

  // Modo S3: Tela de um Único Simulado Rodando (Wizard)
  if (activeSubject && activeSimulation) {
    return (
      <SimulationAttemptForm
        subjectId={activeSubject.id}
        simulation={activeSimulation}
        onBack={() => {
           setActiveSimulationId(null);
           simulationsQuery.refetch();
        }}
      />
    );
  }

  // Modo S2: Detalhes da Matéria e Listagem de Aulas/Simulados
  if (activeSubject) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <button 
          onClick={() => setActiveSubjectId(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/50 group-hover:bg-secondary">
             <ChevronLeft className="h-4 w-4" />
          </div>
          Voltar para listagem
        </button>

        <div className="rounded-[2.5rem] border border-border/50 bg-card p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-8 border-b border-border/40">
              <div>
                <h1 className="text-2xl font-[var(--font-heading)] font-semibold">{activeSubject.title}</h1>
                <p className="text-muted-foreground mt-2">Navegue pelas aulas processadas ou inicie um simulado.</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={getStatusVariant(activeSubject.status)}>{formatStatusLabel(activeSubject.status)}</Badge>
                <div className="flex items-center gap-2 rounded-2xl bg-secondary/40 px-4 py-2 border border-border/50">
                   <Trophy className="h-4 w-4 text-warning" />
                   <span className="font-semibold">{activeSubject.finalScore} pt(s) Acumulados</span>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-10">
               {/* Coluna Aulas */}
               <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                     <FileText className="h-5 w-5 text-primary" />
                     Arquivos de Aulas
                  </h3>
                  
                  {activeSubject.contents.length === 0 ? (
                     <div className="p-6 border border-dashed border-border/60 rounded-2xl text-center text-sm text-muted-foreground">
                        Nenhum arquivo de aula foi enviado para esta área ainda.
                     </div>
                  ) : (
                     <div className="space-y-4">
                        {activeSubject.contents.map(content => {
                           const isExpanded = activeContentId === content.id;
                           return (
                             <div key={content.id} className={`rounded-2xl border transition-all overflow-hidden ${isExpanded ? 'border-primary/50 bg-primary/5 shadow-md' : 'border-border/40 hover:border-primary/30'}`}>
                                <div 
                                  className="p-4 flex flex-col cursor-pointer"
                                  onClick={() => setActiveContentId(isExpanded ? null : content.id)}
                                >
                                   <div className="flex items-center justify-between">
                                      <h4 className="font-medium text-foreground">{content.title}</h4>
                                      <Badge variant="outline" className="text-[10px]">{content.source}</Badge>
                                   </div>
                                   {!isExpanded && <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{content.shortSummary || content.summary.split('\n').filter(Boolean)[0]?.slice(0, 100)}</p>}
                                </div>
                                
                                <AnimatePresence>
                                   {isExpanded && (
                                     <motion.div 
                                       initial={{ height: 0, opacity: 0 }} 
                                       animate={{ height: "auto", opacity: 1 }} 
                                       exit={{ height: 0, opacity: 0 }}
                                       className="px-4 pb-4 border-t border-border/40"
                                     >
                                        <div className="pt-4 space-y-4">
                                           <div>
                                             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Palavras Chave</span>
                                             <div className="flex flex-wrap gap-2">
                                               {content.importantTopics.split(',').map(t => t.trim()).filter(Boolean).map((topic, idx) => (
                                                 <Badge key={idx} variant="outline" className="px-3 py-1.5 text-xs bg-background shadow-sm border-border/60 text-foreground">
                                                   {topic}
                                                 </Badge>
                                               ))}
                                             </div>
                                           </div>
                                           <div>
                                             <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Resumo</span>
                                             <p className="text-sm leading-relaxed text-muted-foreground">{content.summary.split('\n').filter(Boolean).slice(0, 3).join(' ').slice(0, 200)}...</p>
                                           </div>
                                        </div>
                                     </motion.div>
                                   )}
                                </AnimatePresence>
                             </div>
                           )
                        })}
                     </div>
                  )}
               </div>

               {/* Coluna Simulados */}
               <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                     <CheckCircle2 className="h-5 w-5 text-primary" />
                     Simulados Dinâmicos
                  </h3>
                  
                  <div className="bg-secondary/20 border border-border/40 rounded-[2rem] p-6 mb-6">
                     <p className="text-sm text-muted-foreground mb-6">
                        O sistema sorteará 30 perguntas aleatórias de todos os documentos desta disciplina.
                     </p>
                     
                     <Button 
                       className="w-full rounded-full shadow-lg h-12"
                       disabled={activeSubject.contents.length === 0 || generateMutation.isPending}
                       onClick={() => generateMutation.mutate(activeSubject.id)}
                     >
                        {generateMutation.isPending ? <LoaderCircle className="h-5 w-5 animate-spin mr-2"/> : <Play className="h-4 w-4 mr-2" />}
                        {generateMutation.isPending ? "Montando..." : "Gerar e Iniciar (30Q)"}
                     </Button>
                  </div>

                  <h3 className="font-medium text-sm text-muted-foreground mb-3">Histórico Recente</h3>
                  <div className="grid gap-3">
                     {activeSubject.history.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Nenhum simulado feito.</p>
                     )}
                     {activeSubject.history.map(hist => (
                        <div key={hist.id} className="p-4 rounded-2xl border border-border/40 bg-background/50 flex items-center justify-between transition-colors hover:bg-secondary/20">
                           <div>
                              <p className="font-semibold text-sm">Simulado Dinâmico</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{new Date(hist.submittedAt).toLocaleDateString()}</p>
                           </div>
                           <div className="text-right">
                              <p className="font-[var(--font-heading)] font-semibold text-primary">{Number(hist.score).toFixed(1)} / 10</p>
                              <p className="text-[10px] text-muted-foreground">{hist.correctAnswers}/{hist.totalQuestions} acertos</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
        </div>
      </motion.div>
    )
  }

  // Modo S1: Tabela/Grid de Todas as Matérias
  return (
    <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-[var(--font-heading)] font-semibold flex items-center gap-2">
            <LayoutList className="h-6 w-6 text-primary" />
            Central de Avaliações
         </h1>
         <p className="text-muted-foreground mt-1">Acesse as aulas processadas e avaliações geradas.</p>
       </div>

       <div className="grid gap-4">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Disciplina</div>
            <div className="text-center">Aulas</div>
            <div className="text-center">Simulados Feitos</div>
            <div className="text-right">Acumulado</div>
          </div>

          <AnimatePresence>
            {subjects.map((subject) => {
              return (
                <motion.div 
                  key={subject.id}
                  layoutId={`workspace-subject-${subject.id}`}
                  onClick={() => setActiveSubjectId(subject.id)}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 cursor-pointer rounded-3xl border border-border/40 bg-card p-5 transition-all hover:shadow-md hover:border-primary/30 group"
                >
                  <div className="flex items-center gap-4">
                     <div className="h-10 w-10 shrink-0 rounded-2xl bg-secondary/50 flex items-center justify-center font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {subject.title.charAt(0)}
                     </div>
                     <div>
                        <h4 className="font-semibold">{subject.title}</h4>
                        <Badge variant={getStatusVariant(subject.status)} className="mt-1 text-[9px] px-1.5 py-0">
                          {formatStatusLabel(subject.status)}
                        </Badge>
                     </div>
                  </div>

                  <div className="flex flex-col md:items-center text-sm">
                    <span className="md:hidden text-xs text-muted-foreground mb-1">Aulas Processadas</span>
                    <span className="font-medium">{subject.contents.length} Arquivos</span>
                  </div>

                  <div className="flex flex-col md:items-center text-sm">
                    <span className="md:hidden text-xs text-muted-foreground mb-1">Simulados Feitos</span>
                    <span className="font-medium">{subject.history.length > 0 ? `${subject.history.length} Provas` : 'Nenhum'}</span>
                  </div>

                  <div className="flex flex-col md:items-end text-right">
                     <span className="md:hidden text-xs text-muted-foreground mb-1">Desempenho</span>
                     <span className="text-lg font-[var(--font-heading)] font-semibold text-foreground">
                        {subject.finalScore} <span className="text-xs font-normal text-muted-foreground uppercase">pts</span>
                     </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
       </div>
    </div>
  );
}
