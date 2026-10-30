// src/lib/api.ts

const BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:5000/api";

// ── Token storage ─────────────────────────────────────────────
export const tokenStore = {
  get: () => localStorage.getItem("equipra_token"),

  set: (t: string) =>
    localStorage.setItem("equipra_token", t),

  clear: () =>
    localStorage.removeItem("equipra_token"),
};

// ── Core fetch wrapper ────────────────────────────────────────
async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false
): Promise<T> {
  const token = tokenStore.get();

  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, {
    method,

    headers,

    body: isFormData
      ? (body as FormData)
      : body
      ? JSON.stringify(body)
      : undefined,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json.message ??
        `Request failed with status ${res.status}`
    );
  }

  return json.data as T;
}

const get = <T>(path: string) =>
  req<T>("GET", path);

const post = <T>(
  path: string,
  body: unknown
) => req<T>("POST", path, body);

const put = <T>(
  path: string,
  body: unknown
) => req<T>("PUT", path, body);

const patch = <T>(
  path: string,
  body?: unknown
) => req<T>("PATCH", path, body);

const del = <T>(path: string) =>
  req<T>("DELETE", path);

const postForm = <T>(
  path: string,
  form: FormData
) => req<T>("POST", path, form, true);

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (data: {
    enrollmentId: string;
    password: string;
    collegeName: string;
    role: "STUDENT" | "FACULTY" | "ADMIN";
  }) =>
    post<{
      token: string;
      user: any;
    }>("/auth/login", data),

  me: () =>
    get<any>("/auth/me"),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) =>
    put<any>(
      "/auth/change-password",
      data
    ),
};

// ── Equipment ─────────────────────────────────────────────────
export const equipmentApi = {
  list: (params?: {
    category?: string;
    status?: string;
    q?: string;
  }) => {
    const qs = new URLSearchParams(
      params as any
    ).toString();

    return get<any[]>(
      `/equipment${qs ? `?${qs}` : ""}`
    );
  },

  get: (slug: string) =>
    get<any>(`/equipment/${slug}`),

  categories: () =>
    get<string[]>("/equipment/categories"),

  create: (data: any) =>
    post<any>("/equipment", data),

  update: (
    slug: string,
    data: any
  ) =>
    patch<any>(
      `/equipment/${slug}`,
      data
    ),

  delete: (slug: string) =>
    del<any>(`/equipment/${slug}`),
};

// ── Requests ──────────────────────────────────────────────────
export const requestsApi = {
  list: (params?: {
    status?: string;
  }) => {
    const qs = new URLSearchParams(
      params as any
    ).toString();

    return get<any[]>(
      `/requests${qs ? `?${qs}` : ""}`
    );
  },

  get: (id: string) =>
    get<any>(`/requests/${id}`),

  create: (data: any) =>
    post<any>("/requests", data),

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
    message: string
  ) =>
    post<any>(
      `/requests/${id}/lab-decision`,
      { approved, message }
    ),

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
  list: () =>
    get<any[]>("/teams"),

  get: (code: string) =>
    get<any>(`/teams/${code}`),

  create: (data: {
    name: string;
    project: string;
  }) =>
    post<any>("/teams", data),

  uploadMembers: (
    code: string,
    file: File
  ) => {
    const form = new FormData();

    form.append("file", file);

    return postForm<any>(
      `/teams/${code}/upload-members`,
      form
    );
  },

  deactivate: (code: string) =>
    patch<any>(
      `/teams/${code}/deactivate`
    ),
};

// ── Fault Scans ───────────────────────────────────────────────
export const faultScanApi = {
  list: (equipmentSlug?: string) => {
    const qs = equipmentSlug
      ? `?equipmentSlug=${equipmentSlug}`
      : "";

    return get<any[]>(
      `/fault-scans${qs}`
    );
  },

  create: (data: {
    equipmentSlug: string;
    result: "ok" | "fault";
    notes?: string;
  }) =>
    post<any>("/fault-scans", data),
};

// ── Feedback ──────────────────────────────────────────────────
export const feedbackApi = {
  submit: (data: {
    department: string;
    type: string;
    message: string;
    rating: number;
  }) =>
    post<any>("/feedback", data),

  list: (params?: {
    department?: string;
    unread?: boolean;
  }) => {
    const qs = new URLSearchParams(
      params as any
    ).toString();

    return get<any[]>(
      `/feedback${qs ? `?${qs}` : ""}`
    );
  },

  markRead: (id: string) =>
    patch<any>(
      `/feedback/${id}/read`
    ),
};

// ── Messages ──────────────────────────────────────────────────
export const messagesApi = {
  threads: () =>
    get<any[]>("/messages/threads"),

  getThread: (partnerId: string) =>
    get<any>(
      `/messages/threads/${partnerId}`
    ),

  send: (
    partnerId: string,
    text: string
  ) =>
    post<any>(
      `/messages/threads/${partnerId}`,
      { text }
    ),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationsApi = {
  list: () =>
    get<any[]>("/notifications"),

  markRead: (id: string) =>
    patch<any>(
      `/notifications/${id}/read`
    ),

  markAllRead: () =>
    patch<any>(
      "/notifications/read-all"
    ),
};

// ── Admin ─────────────────────────────────────────────────────
export const adminApi = {
  stats: () =>
    get<any>("/admin/stats"),

  users: (params?: {
    role?: string;
    q?: string;
  }) => {
    const qs = new URLSearchParams(
      params as any
    ).toString();

    return get<any[]>(
      `/admin/users${qs ? `?${qs}` : ""}`
    );
  },

  createUser: (data: any) =>
    post<any>("/admin/users", data),

  deactivateUser: (id: string) =>
    patch<any>(
      `/admin/users/${id}/deactivate`
    ),

  colleges: () =>
    get<any[]>("/admin/colleges"),
};
