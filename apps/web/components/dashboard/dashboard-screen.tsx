"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BrainCircuit, CircleOff, LoaderCircle, Target, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import { Badge } from "@semear/ui";
import { formatStatusLabel, getStatusVariant } from "@semear/utils";

import { getDashboard, getSubjectOptions } from "@/lib/api";

import { GradeTrendChart } from "./grade-trend-chart";
import { UploadForm } from "../upload/upload-form";

const metricCards = [
  { key: "totalSubjects", label: "Total de matérias", icon: Target },
  { key: "approvedSubjects", label: "Aprovadas", icon: TrendingUp },
  { key: "failedSubjects", label: "Reprovadas", icon: CircleOff },
  { key: "inProgressSubjects", label: "Em andamento", icon: ArrowUpRight },
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
};

export function DashboardScreen() {
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  const subjectOptionsQuery = useQuery({
    queryKey: ["subject-options"],
    queryFn: getSubjectOptions,
  });

  if (dashboardQuery.isLoading || subjectOptionsQuery.isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (dashboardQuery.isError || subjectOptionsQuery.isError) {
    return (
      <div className="min-h-[240px] py-16 text-center text-sm text-muted-foreground">
        {(dashboardQuery.error as Error | undefined)?.message ??
          (subjectOptionsQuery.error as Error | undefined)?.message ??
          "Não foi possível carregar o dashboard."}
      </div>
    );
  }

  const dashboard = dashboardQuery.data;
  const subjectOptions = subjectOptionsQuery.data;

  if (!dashboard || !subjectOptions) {
    return null;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-12 gap-6"
    >
      {/* Hero / Upload (Bento Top Row) */}
      <motion.div variants={itemVariants} className="md:col-span-8 space-y-6">
        <div className="rounded-[2.5rem] bg-card p-8 border border-border/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold text-secondary-foreground mb-4">
               Semear Dashboard
            </div>
            <h2 className="font-[var(--font-heading)] text-3xl md:text-5xl font-semibold tracking-tight leading-tight">
              Acompanhe seu fluxo de estudos em tempo real.
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground text-sm leading-relaxed">
              Resumos, simulados e tracking de tempo integrados em um painel que respira junto com seu progresso.
            </p>
          </div>
          <div className="absolute -right-8 top-0 h-full w-1/3 min-w-[200px] opacity-10 pointer-events-none">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent to-primary rounded-full blur-3xl transform scale-150" />
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metricCards.map((item) => (
            <motion.div
              layout
              key={item.key}
              className="rounded-[2rem] border border-border/50 bg-card p-6 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)]"
            >
              <item.icon className="h-5 w-5 text-muted-foreground mb-4" />
              <p className="text-3xl font-[var(--font-heading)] font-semibold">
                {dashboard.metrics[item.key]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground tracking-tight">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Upload Spotlight */}
      <motion.div variants={itemVariants} className="md:col-span-4 h-full">
        <UploadForm subjectOptions={subjectOptions} />
      </motion.div>

      {/* Insights & Chart Row */}
      <motion.div variants={itemVariants} className="md:col-span-12">
        <div className="rounded-[2.5rem] bg-card p-8 border border-border/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
          <div className="grid md:grid-cols-[1.5fr_1fr] gap-8">
            {/* Chart Side */}
            <div>
              <div className="mb-6">
                <h3 className="font-medium text-lg">Evolução Geral</h3>
                <p className="text-sm text-muted-foreground">Progresso comparativo nos últimos simulados.</p>
              </div>
              <GradeTrendChart data={dashboard.evolution} />
            </div>

            {/* Insights Side */}
            <div className="flex flex-col">
            <div className="mb-6">
              <h3 className="font-medium text-lg">Insights da IA</h3>
              <p className="text-sm text-muted-foreground">Sugestões em tempo real baseadas no seu desempenho.</p>
            </div>
            
            <div className="space-y-4 flex-1">
              {dashboard.insights.map((insight, idx) => (
                 <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.15, type: "spring", stiffness: 100 }}
                  className="group relative rounded-2xl border border-border/40 bg-background/50 p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 flex-shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{insight.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Focus & Content Row */}
      <motion.div variants={itemVariants} className="md:col-span-12">
        <div className="rounded-[2.5rem] bg-card p-8 border border-border/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] h-full">
           <div className="mb-6">
            <h3 className="font-medium text-lg">Conteúdos Recentes processados</h3>
            <p className="text-sm text-muted-foreground">Resumos gerados pelos simulados e mock de IA.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dashboard.recentContents.map((content) => (
              <div
                key={content.id}
                className="rounded-3xl border border-border/40 bg-secondary/20 p-5 hover:bg-secondary/40 transition-colors"
              >
                <Badge variant="outline" className="mb-3 text-[10px] shadow-sm bg-background/50 backdrop-blur-md">
                  {content.source}
                </Badge>
                <div className="mb-3">
                  <p className="font-medium text-sm">{content.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{content.subjectTitle}</p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                  {content.shortSummary || content.summary.split('\n').filter(Boolean).slice(0, 2).join(' ').slice(0, 150)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
      
      {/* Full width Subjects Table alternative */}
      <motion.div variants={itemVariants} className="md:col-span-12">
        <div className="rounded-[2.5rem] bg-card p-8 border border-border/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
           <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-lg">Matérias Estudando</h3>
              <p className="text-sm text-muted-foreground">Suas principais matérias ordenadas por atividade.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard.subjects.map((subject) => (
              <motion.div
                layoutId={`subject-${subject.subjectId}`}
                key={subject.subjectId}
                className="group relative overflow-hidden rounded-[2rem] border border-border/40 bg-background/40 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-6">
                  <div>
                    <h4 className="font-medium text-sm">{subject.title}</h4>
                  </div>
                  <Badge variant={getStatusVariant(subject.status)} className="text-[10px] shrink-0">
                    {formatStatusLabel(subject.status)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-4">
                   <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{subject.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <motion.div 
                          className="h-full bg-primary rounded-full" 
                          initial={{ width: 0 }}
                          animate={{ width: `${subject.progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                   </div>
                   <div className="border-l border-border/50 pl-4">
                     <p className="text-[10px] text-muted-foreground mb-1">Nota</p>
                     <p className="font-semibold text-lg leading-none">{subject.finalScore}</p>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

    </motion.div>
  );
}
