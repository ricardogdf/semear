import type {
  DashboardOverview,
  SimulationResultSnapshot,
  SimulationSubjectSnapshot,
  SubjectScoreSnapshot,
  UploadedContentSnapshot,
} from "@semear/utils";

async function handleResponse<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Falha inesperada." }));
    throw new Error(error.message ?? "Falha inesperada.");
  }

  return response.json() as Promise<T>;
}

export function getDashboard() {
  return handleResponse<DashboardOverview>("/api/dashboard");
}

export function getSubjects(status?: string) {
  const search = status ? `?status=${status}` : "";

  return handleResponse<SubjectScoreSnapshot[]>(`/api/subjects${search}`);
}

export function getSubjectDetails(subjectId: string) {
  return handleResponse<SimulationSubjectSnapshot>(`/api/subjects/${subjectId}`);
}

export function getSimulations(subjectId?: string) {
  const search = subjectId ? `?subjectId=${subjectId}` : "";

  return handleResponse<SimulationSubjectSnapshot[]>(`/api/simulations${search}`);
}

export function getRecentContents() {
  return handleResponse<UploadedContentSnapshot[]>("/api/content");
}

export function getSubjectOptions() {
  return handleResponse<Array<{ id: string; title: string }>>("/api/subjects?compact=1");
}

export async function uploadContent(formData: FormData) {
  return handleResponse<UploadedContentSnapshot>("/api/content/upload", {
    method: "POST",
    body: formData,
  });
}

export async function submitSimulation(
  simulationId: string,
  payload: {
    subjectId: string;
    answers: Array<{ question: string; answer: string }>;
  },
) {
  return handleResponse<SimulationResultSnapshot>(
    `/api/simulations/${simulationId}/submit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function generateSimulation(subjectId: string) {
  return handleResponse<import("@semear/utils").SimulationSnapshot>(
    `/api/simulations/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subjectId }),
    },
  );
}
