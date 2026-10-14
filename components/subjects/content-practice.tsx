"use client";

import * as React from "react";

import { Button } from "@/components/ui";
import { cn, type Question } from "@/lib/utils";

/** Prática livre das questões de uma aula, com correção imediata e o trecho que fundamenta a resposta. */
export function ContentPractice({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = React.useState<Record<number, string>>({});
  const [index, setIndex] = React.useState(0);
  const question = questions[index];

  React.useEffect(() => {
    setAnswers({});
    setIndex(0);
  }, [questions]);

  if (!question) {
    return <p className="text-sm text-muted-foreground">Esta aula não tem questões de prática.</p>;
  }

  const selected = answers[index];
  const correctCount = Object.entries(answers).filter(([key, value]) => questions[Number(key)]?.answer === value).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Questões" className="flex flex-wrap gap-2">
          {questions.map((entry, position) => {
            const answered = answers[position] !== undefined;
            const right = answered && answers[position] === entry.answer;
            return (
              <button
                key={position}
                type="button"
                onClick={() => setIndex(position)}
                aria-current={position === index ? "step" : undefined}
                aria-label={`Questão ${position + 1}${answered ? (right ? ", correta" : ", incorreta") : ""}`}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !answered && "bg-secondary text-muted-foreground hover:bg-secondary/80",
                  answered && right && "border border-success/40 bg-success/15 text-success",
                  answered && !right && "border border-danger/40 bg-danger/10 text-danger",
                  position === index && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
              >
                {position + 1}
              </button>
            );
          })}
        </nav>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {correctCount} de {Object.keys(answers).length} corretas
        </p>
      </div>

      <div className="rounded-3xl border border-border/50 bg-card p-5 sm:p-8">
        <p className="text-xs font-medium text-muted-foreground">
          Questão {index + 1} de {questions.length}
        </p>
        <p className="mt-3 text-base font-semibold leading-relaxed sm:text-lg">{question.question}</p>
        <div className="mt-6 grid gap-3" role="group" aria-label="Alternativas">
          {question.options.map((option) => {
            const isSelected = selected === option;
            const isCorrect = question.answer === option;
            return (
              <button
                key={option}
                type="button"
                disabled={selected !== undefined}
                onClick={() => setAnswers((current) => ({ ...current, [index]: option }))}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left text-sm transition sm:text-base",
                  selected === undefined && "border-border/40 bg-secondary/20 hover:bg-secondary/50",
                  selected !== undefined && isCorrect && "border-success/40 bg-success/10",
                  selected !== undefined && isSelected && !isCorrect && "border-danger/40 bg-danger/10",
                  selected !== undefined && !isSelected && !isCorrect && "border-transparent opacity-60",
                )}
              >
                {option}
                {selected !== undefined && isCorrect ? <span className="sr-only"> (resposta correta)</span> : null}
                {isSelected && !isCorrect ? <span className="sr-only"> (sua resposta, incorreta)</span> : null}
              </button>
            );
          })}
        </div>
        {selected !== undefined && question.sourceExcerpt ? (
          <blockquote className="mt-5 rounded-r-xl border-l-4 border-primary bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            <span className="block text-xs font-semibold uppercase tracking-wider text-foreground">Trecho da aula</span>
            “{question.sourceExcerpt}”
          </blockquote>
        ) : null}
      </div>

      <div className="flex justify-between gap-3">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex((current) => current - 1)}>
          Anterior
        </Button>
        <Button disabled={index === questions.length - 1} onClick={() => setIndex((current) => current + 1)}>
          Próxima
        </Button>
      </div>
    </div>
  );
}
