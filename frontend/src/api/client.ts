import { storage } from "@/src/utils/storage";

const API_BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

const TOKEN_KEY = "roadlens_auth_token";

export async function saveAuthToken(token: string) {
  await storage.secureSet(TOKEN_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  return storage.secureGet(TOKEN_KEY, null);
}

export async function clearAuthToken() {
  await storage.secureRemove(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "An error occurred";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  register: (body: any) => request<any>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: any) => request<any>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  demoLogin: (role: string) => request<any>("/auth/demo-login", { method: "POST", body: JSON.stringify({ role }) }),
  getMe: () => request<any>("/auth/me"),

  // AI Inspection
  analyzeImage: (body: any) => request<any>("/inspections/analyze", { method: "POST", body: JSON.stringify(body) }),

  // Complaints
  getComplaints: (params?: { status?: string; severity?: string; mine_only?: boolean; assigned_to_me?: boolean; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append("status", params.status);
    if (params?.severity) q.append("severity", params.severity);
    if (params?.mine_only) q.append("mine_only", "true");
    if (params?.assigned_to_me) q.append("assigned_to_me", "true");
    if (params?.search) q.append("search", params.search);
    const qs = q.toString();
    return request<any[]>(`/complaints${qs ? `?${qs}` : ""}`);
  },
  getComplaint: (id: string) => request<any>(`/complaints/${id}`),
  createComplaint: (body: any) => request<any>("/complaints", { method: "POST", body: JSON.stringify(body) }),
  updateComplaintStatus: (id: string, body: any) => request<any>(`/complaints/${id}/status`, { method: "PATCH", body: JSON.stringify(body) }),
  assignComplaint: (id: string, body: any) => request<any>(`/complaints/${id}/assign`, { method: "POST", body: JSON.stringify(body) }),

  // Authorities & Governance
  getAuthorities: () => request<any[]>("/authorities"),
  getAdminStats: () => request<any>("/admin/stats"),
  getAdminUsers: () => request<any[]>("/admin/users"),

  // Notifications
  getNotifications: () => request<any[]>("/notifications"),
  markNotificationRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => request<any>("/notifications/read-all", { method: "POST" }),
};
