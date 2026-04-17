export interface Question {
  question: string;
  options: string[];
  answer: string;
}

export interface AIProcessor {
  summarize(text: string): Promise<string>;
  generateShortSummary(text: string): Promise<string>;
  generateMindMap(text: string): Promise<string>;
  extractKeywords(text: string): Promise<string[]>;
  generateQuestions(text: string): Promise<Question[]>;
}

export interface GradePoint {
  label: string;
  score: number;
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

export interface UploadedContentSnapshot {
  id: string;
  title: string;
  subjectTitle: string;
  source: "TXT" | "PDF";
  createdAt: string;
  summary: string;
  shortSummary: string;
  importantTopics: string;
  trainingQuestions: import("./types").Question[];
  body: string;
}

export interface SubjectScoreSnapshot {
  subjectId: string;
  title: string;
  status: SubjectStatusValue;
  progress: number;
  finalScore: number;
  averageScore: number;
  difficulty: number;
}

export interface SimulationResultSnapshot {
  id: string;
  simulationId: string;
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
  questions: Question[];
  latestResult?: SimulationResultSnapshot;
}

export interface SimulationSubjectSnapshot {
  id: string;
  title: string;
  status: SubjectStatusValue;
  finalScore: number;
  contents: UploadedContentSnapshot[];
  simulations: SimulationSnapshot[];
  history: SimulationResultSnapshot[];
}

export interface DashboardOverview {
  metrics: DashboardMetrics;
  evolution: GradePoint[];
  insights: DashboardInsight[];
  subjects: SubjectScoreSnapshot[];
  recentContents: UploadedContentSnapshot[];
}

export const subjectStatusValues = [
  "IN_PROGRESS",
  "APPROVED",
  "FAILED",
] as const;

export type SubjectStatusValue = (typeof subjectStatusValues)[number];
