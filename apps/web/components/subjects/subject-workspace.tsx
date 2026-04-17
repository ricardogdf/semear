"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, ChevronLeft, FileText, BookOpen, Key, BrainCircuit } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

import { Badge, Card, CardContent, Button } from "@semear/ui";
import { formatStatusLabel, getStatusVariant } from "@semear/utils";
import { getSubjectDetails } from "@/lib/api";

type Tab = "raw" | "summary" | "topics" | "questions";

export function SubjectWorkspace({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  
  const { data: subject, isLoading, isError, error } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: () => getSubjectDetails(subjectId),
  });

  const [activeContentId, setActiveContentId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<Tab>("summary");
  const [questionAnswers, setQuestionAnswers] = React.useState<Record<number, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);

  React.useEffect(() => {
     setQuestionAnswers({});
     setCurrentQuestionIndex(0);
  }, [activeTab, activeContentId]);

  React.useEffect(() => {
    if (subject?.contents && subject.contents.length > 0 && !activeContentId) {
      setActiveContentId(subject.contents[0]?.id || null);
    }
  }, [subject, activeContentId]);

  if (isLoading) {
    return (
      <Card className="rounded-[2.5rem] border-none shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] bg-card min-h-[400px] flex items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (isError || !subject) {
    return (
      <Card className="rounded-[2.5rem] border border-destructive/20 bg-destructive/5 text-destructive p-8 text-center">
        {error ? error.message : "Erro ao carregar disciplina."}
      </Card>
    );
  }

  const activeContent = subject.contents.find(c => c.id === activeContentId);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <button 
        onClick={() => router.push("/subjects")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/50 group-hover:bg-secondary">
           <ChevronLeft className="h-4 w-4" />
        </div>
        Voltar para Matérias
      </button>

      <div className="rounded-[2.5rem] border border-border/50 bg-card p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-8 border-b border-border/40">
          <div>
            <h1 className="text-3xl font-[var(--font-heading)] font-semibold">{subject.title}</h1>
            <p className="text-muted-foreground mt-2">Área de Estudos Dedicada</p>
          </div>
          <Badge variant={getStatusVariant(subject.status)}>{formatStatusLabel(subject.status)}</Badge>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-10">
           {/* Barra Lateral: Arquivos / Aulas */}
           <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                 <FileText className="h-5 w-5 text-primary" />
                 Aulas Processadas
              </h3>
              
              {subject.contents.length === 0 ? (
                 <div className="p-6 border border-dashed border-border/60 rounded-2xl text-center text-sm text-muted-foreground">
                    Nenhum arquivo enviado. Vá para o Dashboard para subir uma aula.
                 </div>
              ) : (
                 <div className="space-y-3">
                    {subject.contents.map(content => (
                       <button
                         key={content.id}
                         onClick={() => setActiveContentId(content.id)}
                         className={`w-full text-left p-4 rounded-2xl border transition-all ${
                           activeContentId === content.id 
                             ? 'border-primary/50 bg-primary/10 shadow-sm' 
                             : 'border-border/40 hover:border-primary/30 bg-secondary/20 hover:bg-secondary/40'
                         }`}
                       >
                         <h4 className="font-medium text-foreground text-sm line-clamp-2">{content.title}</h4>
                         <p className="text-xs text-muted-foreground mt-2">{new Date(content.createdAt).toLocaleDateString()}</p>
                       </button>
                    ))}
                 </div>
              )}
           </div>

           {/* Área Principal de Estudo */}
           <div>
              {!activeContent ? (
                <div className="h-full flex items-center justify-center p-12 border border-dashed border-border/60 rounded-3xl text-muted-foreground">
                  Selecione uma aula à esquerda para começar a estudar.
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                   {/* Abas */}
                   <div className="flex flex-wrap items-center gap-2 mb-8 bg-secondary/30 p-1.5 rounded-3xl border border-border/40 w-max max-w-full">
                      <TabButton 
                        active={activeTab === "summary"} 
                        onClick={() => setActiveTab("summary")} 
                        icon={<BookOpen className="w-4 h-4" />} 
                        label="Resumo Teórico" 
                      />
                      <TabButton 
                        active={activeTab === "raw"} 
                        onClick={() => setActiveTab("raw")} 
                        icon={<FileText className="w-4 h-4" />} 
                        label="Texto Completo" 
                      />
                      <TabButton 
                        active={activeTab === "topics"} 
                        onClick={() => setActiveTab("topics")} 
                        icon={<Key className="w-4 h-4" />} 
                        label="Tópicos Chave" 
                      />
                      <TabButton 
                        active={activeTab === "questions"} 
                        onClick={() => setActiveTab("questions")} 
                        icon={<BrainCircuit className="w-4 h-4" />} 
                        label={`Questões (${activeContent.trainingQuestions.length})`} 
                      />
                   </div>

                   {/* Conteúdo das Abas */}
                   <AnimatePresence mode="wait">
                     <motion.div
                       key={activeTab}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       transition={{ duration: 0.2 }}
                     >
                        {activeTab === "summary" && (
                          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:font-[var(--font-heading)] prose-a:text-primary prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-p:mb-8 prose-p:leading-relaxed prose-li:mb-4">
                             <ReactMarkdown>{activeContent.summary}</ReactMarkdown>
                          </div>
                        )}

                        {activeTab === "raw" && (
                          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-8 font-sans">
                             {activeContent.body}
                          </div>
                        )}

                        {activeTab === "topics" && (
                          <div className="bg-secondary/20 border border-border/40 p-6 rounded-3xl">
                            <h3 className="font-semibold text-lg mb-6 text-foreground">Termos e Palavras Importantes</h3>
                            <div className="flex flex-wrap gap-3">
                               {activeContent.importantTopics.split(',').map(topic => topic.trim()).filter(Boolean).map((topic, i) => (
                                  <Badge key={i} variant="outline" className="px-4 py-2 text-sm bg-background shadow-sm border-border/60 text-foreground">
                                    {topic}
                                  </Badge>
                               ))}
                            </div>
                          </div>
                        )}

                        {activeTab === "questions" && (
                          <div className="space-y-6">
                             <div className="p-4 rounded-3xl bg-secondary/20 border border-border/40 text-foreground text-sm">
                                <div className="flex items-center gap-3 mb-4 text-primary font-medium">
                                   <BrainCircuit className="w-5 h-5 shrink-0" />
                                   <p>Acompanhe seu Progresso</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {activeContent.trainingQuestions.map((q: any, i: number) => {
                                    const isAnswered = questionAnswers[i] !== undefined;
                                    const isCorrect = isAnswered && questionAnswers[i] === q.answer;
                                    
                                    let btnStyle = "bg-secondary hover:bg-secondary/80 text-muted-foreground";
                                    if (isAnswered) {
                                      if (isCorrect) btnStyle = "bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30";
                                      else btnStyle = "bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30";
                                    }
                                    if (currentQuestionIndex === i) {
                                      btnStyle += " ring-2 ring-primary ring-offset-2 ring-offset-background";
                                    }
                                    
                                    return (
                                      <button 
                                        key={i} 
                                        onClick={() => setCurrentQuestionIndex(i)}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${btnStyle}`}
                                      >
                                        {i + 1}
                                      </button>
                                    );
                                  })}
                                </div>
                             </div>

                             <div className="relative">
                               {(() => {
                                 const i = currentQuestionIndex;
                                 const q = activeContent.trainingQuestions[i] as any;
                                 if (!q) return null;
                                 
                                 const selectedAnswer = questionAnswers[i];
                                 
                                 return (
                                   <motion.div
                                     key={i}
                                     initial={{ opacity: 0, x: 20 }}
                                     animate={{ opacity: 1, x: 0 }}
                                     exit={{ opacity: 0, x: -20 }}
                                     transition={{ duration: 0.3 }}
                                   >
                                     <Card className="rounded-[2.5rem] border border-border/50 shadow-sm">
                                       <CardContent className="p-8">
                                          <div className="flex justify-between items-center mb-6">
                                            <Badge variant="outline" className="bg-secondary/30">Questão {i + 1} de {activeContent.trainingQuestions.length}</Badge>
                                          </div>
                                          <p className="font-semibold text-lg mb-8 leading-relaxed">{q.question}</p>
                                          <div className="space-y-3">
                                            {(q.options || []).map((opt: string, optIdx: number) => {
                                               const isSelected = selectedAnswer === opt;
                                               const isCorrectOption = q.answer === opt;
                                               
                                               let buttonClass = "bg-secondary/20 hover:bg-secondary/50 text-foreground border-border/30";
                                               
                                               if (selectedAnswer) {
                                                  if (isCorrectOption) {
                                                     buttonClass = "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400";
                                                  } else if (isSelected && !isCorrectOption) {
                                                     buttonClass = "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400";
                                                  } else {
                                                     buttonClass = "opacity-50 blur-[0.5px] pointer-events-none border-transparent";
                                                  }
                                               }

                                               return (
                                                 <button 
                                                    key={optIdx}
                                                    disabled={!!selectedAnswer}
                                                    onClick={() => setQuestionAnswers(prev => ({...prev, [i]: opt}))}
                                                    className={`w-full text-left p-5 rounded-2xl border transition-all ${buttonClass}`}
                                                 >
                                                    {opt}
                                                 </button>
                                               );
                                            })}
                                          </div>
                                       </CardContent>
                                     </Card>
                                   </motion.div>
                                 )
                               })()}
                             </div>

                             <div className="flex justify-between items-center pt-4">
                               <Button 
                                 variant="outline" 
                                 disabled={currentQuestionIndex === 0}
                                 onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))}
                                 className="rounded-full px-6"
                               >
                                 Anterior
                               </Button>
                               <Button 
                                 disabled={currentQuestionIndex === activeContent.trainingQuestions.length - 1}
                                 onClick={() => setCurrentQuestionIndex(p => Math.min(activeContent.trainingQuestions.length - 1, p + 1))}
                                 className="rounded-full px-6"
                               >
                                 Próxima
                               </Button>
                             </div>
                          </div>
                        )}
                     </motion.div>
                   </AnimatePresence>
                </div>
              )}
           </div>
        </div>
      </div>
    </motion.div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
        active ? 'text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
      }`}
    >
      {active && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute inset-0 rounded-full bg-primary"
          initial={false}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );
}
