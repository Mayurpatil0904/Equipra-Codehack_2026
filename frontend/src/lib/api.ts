// src/lib/api.ts — typed API client for Equipra backend
const BASE =
  (import.meta as any).env?.VITE_API_URL ??
  "https://equipra-codehack-2026-backend.onrender.com/api";

// ── Token helpers ─────────────────────────────────────────────
export const token = {
  get:   ()          => localStorage.getItem("eq_token") ?? "",
  set:   (t: string) => localStorage.setItem("eq_token", t),
  clear: ()          => localStorage.removeItem("eq_token"),
};

// ── Core fetch wrapper ────────────────────────────────────────
async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const t = token.get();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? `HTTP ${res.status}`);
  return json.data as T;
}

async function reqForm<T>(method: string, path: string, form: FormData): Promise<T> {
  const t = token.get();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: t ? { Authorization: `Bearer ${t}` } : {},
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? `HTTP ${res.status}`);
  return json.data as T;
}

// ✅ NEW — for endpoints that return a raw file (xlsx/csv) instead of JSON.
// Fetches the file as a Blob, reads the filename from the
// Content-Disposition header if present, and triggers a browser download.
async function downloadFile(
  path: string,
  fallbackFilename: string
): Promise<void> {
  const t = token.get();
  const res = await fetch(`${BASE}${path}`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });

  if (!res.ok) {
    // Error responses are still JSON — surface the real message
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `HTTP ${res.status}`);
  }

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? fallbackFilename;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const get    = <T>(p: string)              => req<T>("GET",    p);
const post   = <T>(p: string, b: unknown)  => req<T>("POST",   p, b);
const patch  = <T>(p: string, b?: unknown) => req<T>("PATCH",  p, b);
const put    = <T>(p: string, b: unknown)  => req<T>("PUT",    p, b);
const del    = <T>(p: string)              => req<T>("DELETE", p);

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (d: { enrollmentId: string; password: string; collegeName: string; role: string }) =>
    post<{ token: string; user: any }>("/auth/login", d),
  me: () => get<any>("/auth/me"),
  changePassword: (d: { currentPassword: string; newPassword: string }) =>
    put<any>("/auth/change-password", d),
  colleges: () => get<any[]>("/auth/colleges"),
};

// ── Equipment ─────────────────────────────────────────────────
export const equipmentApi = {
  list: (p?: { category?: string; status?: string; q?: string }) => {
    const qs = p ? "?" + new URLSearchParams(p as any).toString() : "";
    return get<any[]>(`/equipment${qs}`);
  },
  get:        (slug: string)         => get<any>(`/equipment/${slug}`),
  categories: ()                     => get<string[]>("/equipment/categories"),
  create:     (d: any)               => post<any>("/equipment", d),
  update:     (slug: string, d: any) => patch<any>(`/equipment/${slug}`, d),
  remove:     (slug: string)         => del<any>(`/equipment/${slug}`),
  // ✅ NEW — Fault Scan page lookup by human-readable Equipment ID (EQ-0001),
  // returns FULL timeline history (not limited to 5)
  lookupByEquipmentId: (equipmentId: string) => get<any>(`/equipment/lookup/${equipmentId}`),

  // ✅ NEW — bulk-import many equipment items at once from Excel/CSV
  bulkUpload: (file: File) => {
    const f = new FormData();
    f.append("file", file);
    return reqForm<{ message: string; added: any[]; skipped: any[] }>(
      "POST", "/equipment/bulk-upload", f
    );
  },
  downloadBulkUploadTemplate: () =>
    downloadFile("/equipment/bulk-upload-template", "equipra-equipment-template.xlsx"),
};

// ── Requests ──────────────────────────────────────────────────
export const requestsApi = {
  list: (p?: { status?: string }) => {
    const qs = p ? "?" + new URLSearchParams(p as any).toString() : "";
    return get<any[]>(`/requests${qs}`);
  },

  get: (id: string) =>
    get<any>(`/requests/${id}`),

  create: (d: any) =>
    post<any>("/requests", d),

  facultyDecision: (
    id: string,
    approved: boolean
  ) =>
    post<any>(
      `/requests/${id}/faculty-decision`,
      { approved }
    ),

  labDecision: (
    id: string,
    approved: boolean,
    msg: string
  ) =>
    post<any>(
      `/requests/${id}/lab-decision`,
      {
        approved,
        message: msg,
      }
    ),

  markReturned: (id: string, data: { conditionRating: number; damageNotes?: string; damagePercent?: number }) =>
    patch<any>(`/requests/${id}/return`, data),

  getByQr: (token: string) =>
    get<any>(`/requests/scan/${token}`),

  clearInspection: (slug: string, action: string) =>
    patch<any>(`/requests/equipment/${slug}/clear-inspection`, { action }),

  addMessage: (
    id: string,
    text: string
  ) =>
    post<any>(
      `/requests/${id}/messages`,
      { text }
    ),
};
// ── Teams ─────────────────────────────────────────────────────
export const teamsApi = {
  list:          ()                                        => get<any[]>("/teams"),
  get:           (code: string)                            => get<any>(`/teams/${code}`),
  create:        (d: { name: string; project: string })    => post<any>("/teams", d),
  uploadMembers: (code: string, file: File) => {
    const f = new FormData(); f.append("file", file);
    return reqForm<any>("POST", `/teams/${code}/upload-members`, f);
  },
  deactivate: (code: string) => patch<any>(`/teams/${code}/deactivate`),
};

// ── Fault Scans ───────────────────────────────────────────────
export const faultScanApi = {
  list:   (slug?: string) => get<any[]>(`/fault-scans${slug ? `?equipmentSlug=${slug}` : ""}`),
  create: (d: { equipmentSlug: string; result: "ok" | "fault"; notes?: string }) =>
    post<any>("/fault-scans", d),
};

// ── Feedback ──────────────────────────────────────────────────
export const feedbackApi = {
  submit:   (d: any)       => post<any>("/feedback", d),
  list:     (p?: any)      => get<any[]>(`/feedback${p ? "?" + new URLSearchParams(p).toString() : ""}`),
  markRead: (id: string)   => patch<any>(`/feedback/${id}/read`),
};

// ── Messages ──────────────────────────────────────────────────
export const messagesApi = {
  threads:   ()                               => get<any[]>("/messages/threads"),
  getThread: (partnerId: string)              => get<any>(`/messages/threads/${partnerId}`),
  send:      (partnerId: string, text: string) => post<any>(`/messages/threads/${partnerId}`, { text }),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationsApi = {
  list:        ()           => get<any[]>("/notifications"),
  markRead:    (id: string) => patch<any>(`/notifications/${id}/read`),
  markAllRead: ()           => patch<any>("/notifications/read-all"),
};

// ── Admin ─────────────────────────────────────────────────────
export const adminApi = {
  stats:             ()                         => get<any>("/admin/stats"),
  users:             (p?: { role?: string; q?: string; isActive?: string }) => {
    const qs = p ? "?" + new URLSearchParams(p as any).toString() : "";
    return get<any[]>(`/admin/users${qs}`);
  },
  
  createUser:        (d: any)                   => post<any>("/admin/users", d),
  updateUser:        (id: string, d: any)       => patch<any>(`/admin/users/${id}`, d),
  deactivateUser:    (id: string)               => patch<any>(`/admin/users/${id}/deactivate`),
  // ✅ NEW — reactivate a deactivated user, or permanently delete one
  reactivateUser:    (id: string)               => patch<any>(`/admin/users/${id}/reactivate`),
  deleteUser:        (id: string)               => del<any>(`/admin/users/${id}`),
  resetUserPassword: (id: string, newPassword: string) =>
    patch<any>(`/admin/users/${id}/reset-password`, { newPassword }),
  colleges:          ()                         => get<any[]>("/admin/colleges"),
  createCollege:     (d: { name: string })      => post<any>("/admin/colleges", d),
  updateCollege: (id: string, d: any) =>
  patch<any>(`/admin/colleges/${id}`, d),

  deleteCollege: (id: string) =>
  del<any>(`/admin/colleges/${id}`),

  // ✅ NEW — bank-statement-style equipment transaction report,
  // downloaded directly as a file (xlsx or csv)
  downloadEquipmentReport: (p: { from: string; to: string; format: "xlsx" | "csv"; department?: string }) => {
    const qs = new URLSearchParams(p as any).toString();
    const ext = p.format === "csv" ? "csv" : "xlsx";
    return downloadFile(`/admin/equipment-report?${qs}`, `equipra-transactions-${p.from}_to_${p.to}.${ext}`);
  },

  // ✅ NEW — bulk-import students/faculty from Excel/CSV
  bulkUploadUsers: (file: File) => {
    const f = new FormData();
    f.append("file", file);
    return reqForm<{ message: string; added: any[]; skipped: any[] }>(
      "POST", "/admin/users/bulk-upload", f
    );
  },
  downloadUserTemplate: () =>
    downloadFile("/admin/users/bulk-upload-template", "equipra-users-template.xlsx"),

  // ✅ NEW — editable semester folder labels (Students tab grouping)
  listSemesterFolders:  ()                          => get<any[]>("/admin/semester-folders"),
  upsertSemesterFolder: (key: string, label: string) =>
    put<any>(`/admin/semester-folders/${encodeURIComponent(key)}`, { label }),
};

// ── Professors ────────────────────────────────────────────────
export const professorsApi = {
  list: () => get<{ id: string; name: string; enrollmentId: string; department: string }[]>("/professors"),
};

// ── Projects (IoT Module) ─────────────────────────────────────
export const projectsApi = {
  list: () => get<any[]>("/projects"),
  get:  (id: string) => get<any>(`/projects/${id}`),
  create: (d: any) => post<any>("/projects", d),
  update: (id: string, d: any) => patch<any>(`/projects/${id}`, d),
  remove: (id: string) => del<any>(`/projects/${id}`),

  // Look up a student/faculty by enrollment ID to add as a member
  lookupUser: (enrollmentId: string) =>
    get<{ id: string; name: string; enrollmentId: string; department: string; role: string }>(
      `/projects/lookup-user/${encodeURIComponent(enrollmentId)}`
    ),

  // Members
  addMember:    (id: string, userId: string, role?: string) =>
    post<any>(`/projects/${id}/members`, { userId, role }),
  removeMember: (id: string, userId: string) =>
    del<any>(`/projects/${id}/members/${userId}`),

  // Devices
  listDevices:  (projectId: string) =>
    get<any[]>(`/projects/${projectId}/devices`),
  createDevice: (projectId: string, d: any) =>
    post<any>(`/projects/${projectId}/devices`, d),
  getDeviceKey: (deviceId: string) =>
    get<any>(`/telemetry/devices/${deviceId}/key`),
  regenerateDeviceKey: (deviceId: string) =>
    post<any>(`/telemetry/devices/${deviceId}/regenerate-key`, {}),
  deleteDevice: (deviceId: string) =>
    del<any>(`/telemetry/devices/${deviceId}`),

  // Telemetry definitions
  saveTelemetryDefs: (projectId: string, defs: any[]) =>
    put<any>(`/projects/${projectId}/telemetry-defs`, defs),

  // Documents (link references)
  listDocuments: (projectId: string) =>
    get<any[]>(`/projects/${projectId}/documents`),
  addDocument: (projectId: string, d: { name: string; type: string; url: string }) =>
    post<any>(`/projects/${projectId}/documents`, d),
  deleteDocument: (projectId: string, docId: string) =>
    del<any>(`/projects/${projectId}/documents/${docId}`),

  // Equipment auto-linking
  listLinkedEquipment: (projectId: string) =>
    get<any[]>(`/projects/${projectId}/equipment`),
  listLinkableEquipment: (projectId: string) =>
    get<any[]>(`/projects/${projectId}/equipment/available`),
  linkEquipment: (projectId: string, d: { equipmentId: string; requestId?: string }) =>
    post<any>(`/projects/${projectId}/equipment`, d),
  unlinkEquipment: (projectId: string, linkId: string) =>
    del<any>(`/projects/${projectId}/equipment/${linkId}`),
};

// ── Telemetry (IoT Module & Optical Vibrometer) ───────────────
export const telemetryApi = {
  // Live polling — call every 3 seconds in the dashboard
  live:    (deviceId: string) =>
    get<any>(`/telemetry/live/${deviceId}`),
  // Historical data for charts
  history: (deviceId: string, params?: { limit?: number; field?: string; since?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as any).toString() : "";
    return get<any>(`/telemetry/history/${deviceId}${qs}`);
  },

  // Optical Laser Vibrometer & Physical Hardware Telemetry Sessions
  saveSession: (data: {
    experimentName?: string;
    peakFrequencyHz: number;
    averageRmsDb: number;
    durationSeconds?: number;
    isFiltered?: boolean;
    studentNotes?: string;
    equipmentId?: string;
  }) => post<any>("/telemetry/sessions", data),

  getMyHistory: () => get<any[]>("/telemetry/sessions/my-history"),

  getByEquipment: (equipmentId: string) =>
    get<{ equipment: any; sessions: any[] }>(`/telemetry/sessions/equipment/${equipmentId}`),
};

// ── AI Analytics ──────────────────────────────────────────────
export const analyticsApi = {
  getProjectAnalytics: (projectId: string) =>
    get<any>(`/analytics/${projectId}`),
  getFieldAnalytics: (projectId: string, fieldName: string, limit?: number) =>
    get<any>(`/analytics/${projectId}/field/${fieldName}${limit ? `?limit=${limit}` : ""}`),
};

// ── Competitions ──────────────────────────────────────────────
export const competitionsApi = {
  list:       (active?: boolean) => get<any[]>(`/competitions${active !== undefined ? `?active=${active}` : ""}`),
  get:        (id: string) => get<any>(`/competitions/${id}`),
  create:     (d: any) => post<any>("/competitions", d),
  update:     (id: string, d: any) => patch<any>(`/competitions/${id}`, d),
  remove:     (id: string) => del<any>(`/competitions/${id}`),
  submitEntry:  (compId: string, d: any) => post<any>(`/competitions/${compId}/entries`, d),
  updateEntry:  (entryId: string, d: any) => patch<any>(`/competitions/entries/${entryId}`, d),
  deleteEntry:  (entryId: string) => del<any>(`/competitions/entries/${entryId}`),
  myEntries:    () => get<any[]>("/competitions/my-entries"),
};

// ── Lab Analytics (admin) ─────────────────────────────────────
export const labAnalyticsApi = {
  overview:             () => get<any>("/lab-analytics/overview"),
  byDepartment:         () => get<any[]>("/lab-analytics/by-department"),
  byType:               () => get<any>("/lab-analytics/by-type"),
  deviceHealth:         () => get<any[]>("/lab-analytics/device-health"),
  equipmentUtilization: () => get<any>("/lab-analytics/equipment-utilization"),
  activityTimeline:     (limit?: number) => get<any[]>(`/lab-analytics/timeline${limit ? `?limit=${limit}` : ""}`),
};

// ── Project Templates ─────────────────────────────────────────
export const templatesApi = {
  list:   () => get<any[]>("/templates"),
  get:    (id: string) => get<any>(`/templates/${id}`),
  create: (d: any) => post<any>("/templates", d),
  remove: (id: string) => del<any>(`/templates/${id}`),
  apply:  (id: string, d: { name: string; description: string; guideId: string }) =>
    post<any>(`/templates/${id}/apply`, d),
};

// ── AI (admin) ────────────────────────────────────────────────
export const aiApi = {
  discoverCompetitions: (department?: string) => post<any>("/ai/discover-competitions", { department }),
  labInsights:          () => get<any>("/ai/lab-insights"),
};

// ── Global Search ─────────────────────────────────────────────
export const searchApi = {
  search: (q: string) => get<any>(`/search?q=${encodeURIComponent(q)}`),
};

// ── Student Accountability & Trust Score ──────────────────────
export const trustScoreApi = {
  getMine:        () => get<any>("/trust-score/me"),
  getUser:        (userId: string) => get<any>(`/trust-score/user/${userId}`),
  getLeaderboard: () => get<any>("/trust-score/leaderboard"),
};

// ── Hackathon Team Matchmaking ────────────────────────────────
export const matchmakingApi = {
  list: (params?: { competitionId?: string; department?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.competitionId) q.set("competitionId", params.competitionId);
    if (params?.department) q.set("department", params.department);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return get<any[]>(`/matchmaking${qs ? `?${qs}` : ""}`);
  },
  get:          (id: string) => get<any>(`/matchmaking/${id}`),
  create:       (d: any) => post<any>("/matchmaking", d),
  apply:        (id: string, d: { role: string; pitch?: string }) => post<any>(`/matchmaking/${id}/apply`, d),
  updateStatus: (appId: string, status: "ACCEPTED" | "REJECTED") =>
    patch<any>(`/matchmaking/applications/${appId}/status`, { status }),
  delete:       (id: string) => del<any>(`/matchmaking/${id}`),
};

// ── Project Public Showcase & Portfolio ───────────────────────
export const showcaseApi = {
  list: (params?: { department?: string; tech?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.department) q.set("department", params.department);
    if (params?.tech) q.set("tech", params.tech);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return get<any[]>(`/showcase${qs ? `?${qs}` : ""}`);
  },
  get:    (id: string) => get<any>(`/showcase/${id}`),
  toggle: (id: string, d: { isPublicShowcase?: boolean; showcaseHeadline?: string }) =>
    patch<any>(`/showcase/${id}/toggle`, d),
  like:   (id: string) => post<any>(`/showcase/${id}/like`, {}),
};


