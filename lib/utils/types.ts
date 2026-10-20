export interface Question {
  question: string;
  options: string[];
  answer: string;
  /** Trecho do material que fundamenta a resposta (questões geradas a partir de 2026-10). */
  sourceExcerpt?: string;
}

/** Questão enviada durante o simulado: sem gabarito. */
export interface SimulationQuestion {
  question: string;
  options: string[];
}

export const aiProviderValues = ["ANTHROPIC", "OPENAI", "GEMINI"] as const;
export type AiProviderValue = (typeof aiProviderValues)[number];

export const contentProcessingStatusValues = [
  "PROCESSING",
  "COMPLETED",
  "NO_QUESTIONS_NEEDED",
  "NEEDS_REVIEW",
  "FAILED",
] as const;
export type ContentProcessingStatusValue = (typeof contentProcessingStatusValues)[number];

export const contentClassificationValues = [
  "SUBSTANTIVE",
  "INTRODUCTORY",
  "ADMINISTRATIVE",
  "INSUFFICIENT",
] as const;
export type ContentClassificationValue = (typeof contentClassificationValues)[number];

export const userRoleValues = ["USER", "ADMIN"] as const;
export type UserRoleValue = (typeof userRoleValues)[number];

export const accessRequestStatusValues = ["PENDING", "APPROVED", "REJECTED"] as const;
export type AccessRequestStatusValue = (typeof accessRequestStatusValues)[number];

export interface GradePoint {
  label: string;
  score: number;
  submittedAt: string;
}

export interface DashboardInsight {
  id: string;
  title: string;
  description: string;
}

export interface DashboardMetrics {
  totalSubjects: number;
  approvedSubjects: number;
  failedSubjects: number;
  inProgressSubjects: number;
}

/** Resumo de uma aula (listagens). */
export interface ContentSummarySnapshot {
  id: string;
  title: string;
  subjectId: string;
  subjectTitle: string;
  /** Módulo da matéria ao qual a aula pertence (null: sem módulo). */
  moduleId: string | null;
  moduleTitle: string | null;
  source: "TXT" | "PDF";
  createdAt: string;
  shortSummary: string;
  processingStatus: ContentProcessingStatusValue;
  classification: ContentClassificationValue | null;
  classificationReason: string | null;
  questionCount: number;
  aiProvider: AiProviderValue | null;
  aiModel: string | null;
  processedAt: string | null;
  inputTruncated: boolean;
  errorMessage: string | null;
}

/** Aula completa (área de estudo do próprio dono). */
export interface ContentDetailSnapshot extends ContentSummarySnapshot {
  originalFileName: string;
  body: string;
  summary: string;
  importantTopics: string;
  trainingQuestions: Question[];
  relevantExcerpts: string[];
}

export interface SubjectScoreSnapshot {
  subjectId: string;
  title: string;
  status: SubjectStatusValue;
  progress: number;
  /** Nota da matéria (0–10): média das notas mais recentes de cada simulado. */
  finalScore: number;
  /** Média de todas as tentativas (0–10). */
  averageScore: number;
  difficulty: number;
  contentCount: number;
  moduleCount: number;
  attemptCount: number;
}

/** Módulo de uma matéria. */
export interface ModuleSnapshot {
  id: string;
  title: string;
  contentCount: number;
  /** Questões das aulas processadas do módulo. */
  availableQuestionCount: number;
}

/** Matéria para os campos de escolha (envio de aula), com os módulos dela. */
export interface SubjectOption {
  id: string;
  title: string;
  modules: Array<{ id: string; title: string }>;
}

export interface SimulationResultSnapshot {
  id: string;
  simulationId: string;
  /** Nota normalizada de 0 a 10. */
  score: number;
  submittedAt: string;
  correctAnswers: number;
  totalQuestions: number;
}

export interface SimulationSnapshot {
  id: string;
  title: string;
  timeLimitMinutes: number;
  maxScore: number;
  createdAt: string;
  /** Prazo final para envio (ISO). */
  deadline: string;
  questions: SimulationQuestion[];
  latestResult?: SimulationResultSnapshot;
}

export interface SimulationBreakdownItem {
  question: string;
  options: string[];
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface SimulationSubmissionResult extends SimulationResultSnapshot {
  breakdown: SimulationBreakdownItem[];
}

export interface SimulationSubjectSnapshot {
  id: string;
  title: string;
  status: SubjectStatusValue;
  finalScore: number;
  contents: ContentSummarySnapshot[];
  history: SimulationResultSnapshot[];
  availableQuestionCount: number;
}

export interface SubjectDetailSnapshot {
  id: string;
  title: string;
  instructor: string;
  workloadHours: number;
  status: SubjectStatusValue;
  progress: number;
  difficulty: number;
  finalScore: number;
  modules: ModuleSnapshot[];
  contents: ContentDetailSnapshot[];
  history: SimulationResultSnapshot[];
}

export interface DashboardOverview {
  metrics: DashboardMetrics;
  evolution: GradePoint[];
  insights: DashboardInsight[];
  subjects: SubjectScoreSnapshot[];
  recentContents: ContentSummarySnapshot[];
}

export interface AiProviderSettings {
  provider: AiProviderValue;
  label: string;
  product: string;
  apiKeyUrl: string;
  apiKeyInstructions: string;
  connected: boolean;
  keyHint: string | null;
  defaultModel: string | null;
  models: Array<{ id: string; displayName: string }>;
  lastValidatedAt: string | null;
  lastErrorCode: string | null;
}

export interface AiSettingsOverview {
  encryptionConfigured: boolean;
  defaultProvider: AiProviderValue | null;
  providers: AiProviderSettings[];
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRoleValue;
}

export const subjectStatusValues = ["IN_PROGRESS", "APPROVED", "FAILED"] as const;

export type SubjectStatusValue = (typeof subjectStatusValues)[number];
