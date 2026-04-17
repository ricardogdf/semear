"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, LoaderCircle, Sparkles, UploadCloud, ArrowUpRight, CheckCircle2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";

import {
  Badge,
  Button,
  Input,
} from "@semear/ui";
import { uploadContentSchema } from "@semear/utils";

import { uploadContent } from "@/lib/api";

type UploadFormValues = z.infer<typeof uploadContentSchema>;

interface UploadFormProps {
  subjectOptions: Array<{ id: string; title: string }>;
}

export function UploadForm({ subjectOptions }: UploadFormProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [toast, setToast] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadContentSchema),
    defaultValues: {
      subjectId: "",
    },
  });

  // Auto-dismiss toast
  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const mutation = useMutation({
    mutationFn: uploadContent,
    onSuccess: (data) => {
      setToast({ type: "success", message: `"${data.title}" processado com sucesso! Resumo, tópicos e 30 questões geradas.` });
      setSelectedFile(null);
      form.reset({ subjectId: "" });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["contents"] });
      void queryClient.invalidateQueries({ queryKey: ["subject-options"] });
    },
    onError: (error) => {
      setToast({ type: "error", message: error.message || "Erro ao processar arquivo." });
    },
  });

  const isProcessing = mutation.isPending;

  const onSubmit = form.handleSubmit((values) => {
    if (!selectedFile) {
      setToast({ type: "error", message: "Selecione ou arraste um arquivo (.txt ou .pdf)." });
      return;
    }

    const formData = new FormData();
    formData.append("subjectId", values.subjectId);
    formData.append("file", selectedFile);
    
    mutation.mutate(formData);
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (isProcessing) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[2.5rem] border border-border/50 bg-card p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] md:p-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-6 left-1/2 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl border backdrop-blur-md ${
              toast.type === "success" 
                ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300" 
                : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <X className="h-5 w-5 shrink-0" />
            )}
            <p className="text-sm font-medium max-w-md">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium text-lg text-foreground">Central de Upload</h3>
          <p className="mt-1 text-sm text-muted-foreground">Arraste materiais para extração via IA.</p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
          <Sparkles className="mr-1 h-3 w-3" /> Processamento AI
        </Badge>
      </div>

      <div className="flex-1 space-y-6">
        <form className="space-y-6 flex flex-col h-full" onSubmit={onSubmit} id="upload-form">
          <motion.div
            animate={{ scale: isDragActive ? 0.98 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`relative flex min-h-[160px] flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-colors ${
              isProcessing 
                ? "pointer-events-none opacity-50 border-border/40" 
                : isDragActive 
                  ? "border-primary bg-primary/5 cursor-pointer" 
                  : "border-border/60 hover:bg-secondary/20 hover:border-primary/40 cursor-pointer"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
          >
            {selectedFile ? (
              <div className="flex flex-col items-center p-6 text-center">
                <FileText className="mb-3 h-8 w-8 text-primary" />
                <p className="font-medium text-sm text-foreground">{selectedFile.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                {!isProcessing && (
                  <span className="mt-4 rounded-full bg-secondary px-3 py-1 text-xs font-semibold hover:bg-secondary/80 transition-colors">
                    Trocar arquivo
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center p-6 text-center">
                <div className="mb-3 rounded-full bg-secondary p-3 shadow-inner">
                  <UploadCloud className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm text-foreground">Clique ou arraste aqui</p>
                <p className="mt-1 text-xs text-muted-foreground">Arquivos .txt ou .pdf</p>
              </div>
            )}
            <Input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf"
              className="hidden"
              disabled={isProcessing}
              onChange={(e) => {
                if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
              }}
            />
          </motion.div>

          {/* Seção Organização Estruturada */}
          <div className="space-y-4">
             <div>
                <label className="text-sm font-medium text-foreground">Matéria * (Selecione ou crie)</label>
                <div className="relative mt-2">
                  <Input
                    list="subjects-list"
                    placeholder="Digite ou selecione uma matéria..."
                    disabled={isProcessing}
                    {...form.register("subjectId")}
                    className="w-full rounded-2xl border border-input bg-secondary/30 px-4 py-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:bg-background h-[46px] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <datalist id="subjects-list">
                    {subjectOptions.map((subject) => (
                      <option key={subject.id} value={subject.title} />
                    ))}
                  </datalist>
                </div>
             </div>
          </div>

          <div className="mt-auto pt-4">
            <motion.div whileHover={isProcessing ? {} : { scale: 1.01 }} whileTap={isProcessing ? {} : { scale: 0.98 }}>
               <Button
                  type="submit"
                  form="upload-form"
                  className="group relative w-full h-[46px] overflow-hidden rounded-2xl bg-primary font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/95 hover:shadow-lg disabled:opacity-70"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Extraindo Conhecimento...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2 relative z-10 transition-transform group-hover:-translate-y-0.5">
                      Processar Conteúdo <ArrowUpRight className="h-4 w-4" />
                    </span>
                  )}
                  {/* Liquid Button Effect */}
                  {!isProcessing && (
                     <div className="absolute inset-0 z-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] transition-transform duration-1000 ease-in-out group-hover:translate-x-[100%]" />
                  )}
                </Button>
            </motion.div>
          </div>
        </form>
      </div>
    </div>
  );
}
