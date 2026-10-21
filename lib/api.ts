import type {
  AccessRequestStatusValue,
  AiProviderValue,
  AiSettingsOverview,
  ContentDetailSnapshot,
  CurrentUser,
  DashboardOverview,
  FollowState,
  ImportResult,
  LikeState,
  OwnProfileSnapshot,
  Page,
  PublicationSnapshot,
  PublicationTypeValue,
  PublicSubjectCardSnapshot,
  RankingValue,
  UserCardSnapshot,
  VisibilityValue,
  SimulationSnapshot,
  SimulationSubjectSnapshot,
  SimulationSubmissionResult,
  SubjectDetailSnapshot,
  SubjectOption,
  SubjectScoreSnapshot,
  UserRoleValue,
} from "@/lib/utils";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(status: number, message: string, code?: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Requisições que saem depois do logout recebem 401; sem esta trava, elas redirecionariam para
 * /login?next=… no lugar da navegação do próprio logout. A página é recarregada em seguida.
 */
let sessionEnding = false;

async function request<T>(input: string, init: RequestInit = {}, options: { redirectOn401?: boolean } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, { ...init, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "Sem conexão com o servidor. Verifique sua internet e tente novamente.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
    } | null;

    if (response.status === 401 && options.redirectOn401 !== false && !sessionEnding && typeof window !== "undefined") {
      const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
      window.location.assign(`/login?next=${next}`);
    }

    throw new ApiError(
      response.status,
      body?.message ?? "Falha inesperada. Tente novamente.",
      body?.code,
      body?.fieldErrors,
    );
  }

  return (await response.json()) as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

// ---------- Autenticação (páginas públicas não redirecionam em 401) ----------

export const login = (body: { email: string; password: string }) =>
  request<{ user: CurrentUser }>("/api/auth/login", json("POST", body), { redirectOn401: false });

export const completeFirstAccess = (body: { email: string; code: string; password: string; confirmPassword: string }) =>
  request<{ user: CurrentUser }>("/api/auth/first-access", json("POST", body), { redirectOn401: false });

export const logout = () => {
  sessionEnding = true;
  return request<{ ok: true }>("/api/auth/logout", json("POST"), { redirectOn401: false });
};

export const changePassword = (body: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
  request<{ ok: true }>("/api/auth/password", json("POST", body));

export const submitAccessRequest = (body: { name: string; email: string; message?: string; website?: string }) =>
  request<{ ok: true }>("/api/access-requests", json("POST", body), { redirectOn401: false });

// ---------- Estudo ----------

export const getDashboard = () => request<DashboardOverview>("/api/dashboard");

export const getSubjects = (status?: string) =>
  request<SubjectScoreSnapshot[]>(`/api/subjects${status ? `?status=${encodeURIComponent(status)}` : ""}`);

export const getSubjectOptions = () => request<SubjectOption[]>("/api/subjects?compact=1");

export const getSubjectDetails = (subjectId: string) =>
  request<SubjectDetailSnapshot>(`/api/subjects/${encodeURIComponent(subjectId)}`);

export const updateSubject = (subjectId: string, body: Record<string, unknown>) =>
  request<SubjectDetailSnapshot>(`/api/subjects/${encodeURIComponent(subjectId)}`, json("PATCH", body));

export const deleteSubject = (subjectId: string) =>
  request<{ ok: true }>(`/api/subjects/${encodeURIComponent(subjectId)}`, json("DELETE"));

interface ModuleRecord {
  id: string;
  title: string;
}

export const createModule = (subjectId: string, title: string) =>
  request<ModuleRecord>(`/api/subjects/${encodeURIComponent(subjectId)}/modules`, json("POST", { title }));

export const renameModule = (moduleId: string, title: string) =>
  request<ModuleRecord>(`/api/modules/${encodeURIComponent(moduleId)}`, json("PATCH", { title }));

export const deleteModule = (moduleId: string) =>
  request<{ ok: true }>(`/api/modules/${encodeURIComponent(moduleId)}`, json("DELETE"));

export const uploadContent = (formData: FormData) =>
  request<ContentDetailSnapshot>("/api/content/upload", { method: "POST", body: formData });

export const reprocessContent = (contentId: string, body: { provider?: AiProviderValue; model?: string }) =>
  request<ContentDetailSnapshot>(`/api/content/${encodeURIComponent(contentId)}/reprocess`, json("POST", body));

export const deleteContent = (contentId: string) =>
  request<{ ok: true }>(`/api/content/${encodeURIComponent(contentId)}`, json("DELETE"));

export const setContentCompleted = (contentId: string, completed: boolean) =>
  request<ContentDetailSnapshot>(`/api/content/${encodeURIComponent(contentId)}`, json("PATCH", { completed }));

/** Move a aula para um módulo da matéria; `null` deixa a aula direto na matéria. */
export const moveContentToModule = (contentId: string, moduleId: string | null) =>
  request<ContentDetailSnapshot>(`/api/content/${encodeURIComponent(contentId)}`, json("PATCH", { moduleId }));

interface ProcessingRun {
  id: string;
  provider: AiProviderValue;
  model: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
  classification: string | null;
  reason: string | null;
  questionsGenerated: number;
  errorCode: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export const getProcessingRuns = (contentId: string) =>
  request<ProcessingRun[]>(`/api/content/${encodeURIComponent(contentId)}/runs`);

export const getSimulations = () => request<SimulationSubjectSnapshot[]>("/api/simulations");

/** Sem `moduleId`, o simulado é da matéria completa. */
export const generateSimulation = (subjectId: string, moduleId?: string | null) =>
  request<SimulationSnapshot>("/api/simulations/generate", json("POST", { subjectId, moduleId: moduleId ?? null }));

export const submitSimulation = (
  simulationId: string,
  answers: Array<{ questionIndex: number; answer: string | null }>,
) =>
  request<SimulationSubmissionResult>(
    `/api/simulations/${encodeURIComponent(simulationId)}/submit`,
    json("POST", { answers }),
  );

// ---------- Comunidade ----------

/** Monta a query string ignorando valores vazios. */
function toQuery(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const getOwnProfile = () => request<OwnProfileSnapshot>("/api/profile");

export const updateOwnProfile = (body: Partial<Omit<OwnProfileSnapshot, "id" | "name">>) =>
  request<OwnProfileSnapshot>("/api/profile", json("PATCH", body));

export interface UserSearchFilters {
  q: string;
  institution: string;
  course: string;
}

export const searchUsers = (filters: UserSearchFilters, page: number) =>
  request<Page<UserCardSnapshot>>(`/api/users${toQuery({ ...filters, page })}`);

export const followUser = (userId: string) =>
  request<FollowState>(`/api/users/${encodeURIComponent(userId)}/follow`, json("PUT"));

export const unfollowUser = (userId: string) =>
  request<FollowState>(`/api/users/${encodeURIComponent(userId)}/follow`, json("DELETE"));

export const getFollowing = (page: number) => request<Page<UserCardSnapshot>>(`/api/following${toQuery({ page })}`);

export const setSubjectVisibility = (subjectId: string, body: { visibility: VisibilityValue; description?: string }) =>
  request<SubjectDetailSnapshot>(`/api/subjects/${encodeURIComponent(subjectId)}/visibility`, json("PUT", body));

export const getLibrary = (filters: { q: string; sort: "recent" | "popular" }, page: number) =>
  request<Page<PublicSubjectCardSnapshot>>(`/api/library${toQuery({ ...filters, page })}`);

export const importSubject = (subjectId: string) =>
  request<ImportResult>(`/api/library/${encodeURIComponent(subjectId)}/import`, json("POST"));

export const getPublications = (q: string, page: number) =>
  request<Page<PublicationSnapshot>>(`/api/publications${toQuery({ q, page })}`);

export const getOwnPublications = () => request<PublicationSnapshot[]>("/api/publications?mine=1");

export interface PublicationPayload {
  type: PublicationTypeValue;
  title: string;
  authors: string;
  abstract: string;
  institution: string;
  publishedOn: string;
  externalUrl: string;
  visibility: VisibilityValue;
}

export const createPublication = (body: PublicationPayload) =>
  request<PublicationSnapshot>("/api/publications", json("POST", body));

export const updatePublication = (publicationId: string, body: Partial<PublicationPayload>) =>
  request<PublicationSnapshot>(`/api/publications/${encodeURIComponent(publicationId)}`, json("PATCH", body));

export const deletePublication = (publicationId: string) =>
  request<{ ok: true }>(`/api/publications/${encodeURIComponent(publicationId)}`, json("DELETE"));

export const likePublication = (publicationId: string) =>
  request<LikeState>(`/api/publications/${encodeURIComponent(publicationId)}/like`, json("PUT"));

export const unlikePublication = (publicationId: string) =>
  request<LikeState>(`/api/publications/${encodeURIComponent(publicationId)}/like`, json("DELETE"));

export interface RankingItems {
  subjects: PublicSubjectCardSnapshot;
  publications: PublicationSnapshot;
  profiles: UserCardSnapshot;
}

export const getRanking = <K extends RankingValue>(ranking: K, page: number) =>
  request<Page<RankingItems[K]>>(`/api/discover/${ranking}${toQuery({ page })}`);

// ---------- Provedores de IA ----------

export const getAiSettings = () => request<AiSettingsOverview>("/api/ai/settings");

export const setDefaultAiProvider = (defaultProvider: AiProviderValue | null) =>
  request<AiSettingsOverview>("/api/ai/settings", json("PUT", { defaultProvider }));

export const connectAiProvider = (provider: AiProviderValue, apiKey: string) =>
  request<AiSettingsOverview>(`/api/ai/providers/${provider}`, json("PUT", { apiKey }));

export const setAiDefaultModel = (provider: AiProviderValue, model: string) =>
  request<AiSettingsOverview>(`/api/ai/providers/${provider}`, json("PATCH", { model }));

export const testAiProvider = (provider: AiProviderValue) =>
  request<AiSettingsOverview>(`/api/ai/providers/${provider}/test`, json("POST"));

export const disconnectAiProvider = (provider: AiProviderValue) =>
  request<AiSettingsOverview>(`/api/ai/providers/${provider}`, json("DELETE"));

// ---------- Administração ----------

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRoleValue;
  isActive: boolean;
  hasPassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  createdByName: string | null;
  pendingSetupCodeExpiresAt: string | null;
}

interface SetupCodeResult {
  userId?: string;
  setupCode: string;
  setupCodeExpiresAt: string;
}

export interface AdminAccessRequest {
  id: string;
  name: string;
  email: string;
  message: string | null;
  status: AccessRequestStatusValue;
  createdAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  reviewNote: string | null;
  createdUserId: string | null;
  emailAlreadyRegistered: boolean;
}

export const getAdminUsers = () => request<AdminUser[]>("/api/admin/users");

export const createAdminUser = (body: { name: string; email: string; role: UserRoleValue }) =>
  request<SetupCodeResult>("/api/admin/users", json("POST", body));

export const updateAdminUser = (userId: string, body: { name?: string; role?: UserRoleValue; isActive?: boolean }) =>
  request<{ id: string }>(`/api/admin/users/${encodeURIComponent(userId)}`, json("PATCH", body));

export const issueAdminSetupCode = (userId: string) =>
  request<SetupCodeResult>(`/api/admin/users/${encodeURIComponent(userId)}/setup-code`, json("POST"));

export const getAccessRequests = (status?: AccessRequestStatusValue) =>
  request<AdminAccessRequest[]>(`/api/admin/access-requests${status ? `?status=${status}` : ""}`);

export const approveAccessRequest = (requestId: string, body: { role: UserRoleValue; note?: string }) =>
  request<SetupCodeResult>(`/api/admin/access-requests/${encodeURIComponent(requestId)}/approve`, json("POST", body));

export const rejectAccessRequest = (requestId: string, body: { note?: string }) =>
  request<{ ok: true }>(`/api/admin/access-requests/${encodeURIComponent(requestId)}/reject`, json("POST", body));
