import type { PaginatedPlayers, Player } from "../types/player";
import type { ActiveSessionResponse, Attendance, PaginatedSessions, TrainingSession } from "../types/training";

export function getApiUrl(): string {
  if (typeof window !== "undefined" && window.location.hostname) {
    const host = window.location.hostname;
    if (process.env.NEXT_PUBLIC_API_URL) {
      // If configured with localhost/127.0.0.1 but accessed via LAN IP on phone, swap to current LAN host
      if (host !== "localhost" && host !== "127.0.0.1") {
        return process.env.NEXT_PUBLIC_API_URL.replace(/localhost|127\.0\.0\.1/, host);
      }
      return process.env.NEXT_PUBLIC_API_URL;
    }
    return `http://${host}:8000/api/v1`;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
}

const tokenKey = "ftms_token";

export function getToken() {
  return typeof window === "undefined" ? null : window.localStorage.getItem(tokenKey);
}

export function saveToken(token: string) {
  window.localStorage.setItem(tokenKey, token);
}

export function clearToken() {
  window.localStorage.removeItem(tokenKey);
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/login") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?next=${next}`);
  }
}

async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${getApiUrl()}${path}`, { ...options, headers });
  // Expired / revoked session: force re-login (except for the login call itself)
  if (response.status === 401 && path !== "/auth/login") {
    clearToken();
    redirectToLogin();
  }
  return response;
}

export async function login(username: string, password: string) {
  const response = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  if (response.status === 429) throw new Error("LOGIN_THROTTLED");
  if (!response.ok) throw new Error("LOGIN_FAILED");
  const payload = await response.json();
  saveToken(payload.data.token);
}

/** Returns true when the stored token is still valid on the server. */
export async function verifySession(): Promise<boolean> {
  if (!getToken()) return false;
  try {
    const response = await request("/auth/me", { cache: "no-store" });
    return response.ok;
  } catch {
    // Network error: keep the user in (offline-tolerant); API calls will re-check
    return true;
  }
}

export async function logout() {
  try {
    await request("/auth/logout", { method: "POST" });
  } finally {
    clearToken();
    window.location.replace("/login");
  }
}

export async function getPlayers(params: { search?: string; status?: string; position?: string } = {}): Promise<PaginatedPlayers> {
  const query = new URLSearchParams({ per_page: "100" });
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const response = await request(`/players?${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error("PLAYERS_UNAVAILABLE");
  return response.json();
}

export async function getPlayer(id: number): Promise<Player> {
  const response = await request(`/players/${id}`, { cache: "no-store" });
  if (!response.ok) throw new Error("PLAYER_UNAVAILABLE");
  return (await response.json()).data;
}

export async function createPlayer(input: FormData | Record<string, string | number>): Promise<Player> {
  const isFormData = input instanceof FormData;
  const response = await request("/players", {
    method: "POST",
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
    body: isFormData ? input : JSON.stringify(input),
  });
  const payload = await response.json();
  if (!response.ok) {
    const validationMessage = payload.errors
      ? Object.values(payload.errors as Record<string, string[]>).flat().join(" ")
      : payload.message;
    throw new Error(validationMessage || "Pemain tidak dapat disimpan ke server.");
  }
  return payload.data;
}

export async function updatePlayer(id: number, input: FormData | Record<string, string | number>) {
  const isFormData = input instanceof FormData;
  if (isFormData) input.append("_method", "PUT");
  const response = await request(`/players/${id}`, { method: isFormData ? "POST" : "PUT", headers: isFormData ? undefined : { "Content-Type": "application/json" }, body: isFormData ? input : JSON.stringify(input) });
  if (!response.ok) throw new Error("PLAYER_UPDATE_FAILED");
  return (await response.json()).data as Player;
}

export async function deletePlayer(id: number) {
  const response = await request(`/players/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("PLAYER_DELETE_FAILED");
}

export async function getTrainingSessions(): Promise<PaginatedSessions> {
  const response = await request("/training/sessions?per_page=50", { cache: "no-store" });
  if (!response.ok) throw new Error("TRAINING_UNAVAILABLE");
  return response.json();
}

export async function createTrainingSession(input: Record<string, string>) {
  const response = await request("/training/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error("TRAINING_CREATE_FAILED");
  return (await response.json()).data as TrainingSession;
}

export async function rescheduleTraining(id: number, input: Record<string, string>) {
  const response = await request(`/training/sessions/${id}/reschedule`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error("TRAINING_RESCHEDULE_FAILED");
  return (await response.json()).data as TrainingSession;
}

export async function getUpcomingTraining(): Promise<TrainingSession | null> {
  const response = await request("/training/upcoming", { cache: "no-store" });
  if (!response.ok) throw new Error("UPCOMING_TRAINING_UNAVAILABLE");
  return (await response.json()).data;
}

export async function getActiveSession(sessionId?: number | string): Promise<ActiveSessionResponse> {
  const query = sessionId ? `?session_id=${sessionId}` : "";
  const response = await request(`/training/sessions/active${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error("ACTIVE_SESSION_UNAVAILABLE");
  return (await response.json()).data;
}

export async function openSessionAttendance(sessionId: number | string) {
  const response = await request(`/training/sessions/${sessionId}/open-attendance`, { method: "POST" });
  if (!response.ok) throw new Error("OPEN_ATTENDANCE_FAILED");
  return (await response.json()).data;
}

export async function closeSessionAttendance(sessionId: number | string) {
  const response = await request(`/training/sessions/${sessionId}/close-attendance`, { method: "POST" });
  if (!response.ok) throw new Error("CLOSE_ATTENDANCE_FAILED");
  return (await response.json()).data;
}

export async function reopenSessionAttendance(sessionId: number | string) {
  const response = await request(`/training/sessions/${sessionId}/reopen-attendance`, { method: "POST" });
  if (!response.ok) throw new Error("REOPEN_ATTENDANCE_FAILED");
  return (await response.json()).data;
}

export async function getAttendance(sessionId?: number | string): Promise<Attendance[]> {
  const query = sessionId ? `?training_session_id=${sessionId}` : "";
  const response = await request(`/attendance${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error("ATTENDANCE_UNAVAILABLE");
  return (await response.json()).data;
}

export async function createAttendance(input: {
  player_id: number | string;
  training_session_id: number | string;
  status?: string;
  method?: string;
  verification_method?: string;
  confidence?: number;
}) {
  const response = await request("/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("ATTENDANCE_CREATE_FAILED");
  return (await response.json()).data as Attendance;
}

export async function createKioskAttendance(input: {
  player_id: number | string;
  training_session_id: number | string;
  verification_method: string;
  confidence?: number;
  status?: string;
}) {
  // Public kiosk route (also resilient when unauthenticated)
  const response = await request("/kiosk/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("KIOSK_ATTENDANCE_FAILED");
  return await response.json();
}

export interface ServerFaceEntry {
  player_id: number;
  name: string;
  jersey: string;
  descriptors: number[][];
  registered_at: string | null;
}

export async function registerPlayerFace(id: number | string, input: { descriptors: number[][]; photo?: string | null }) {
  const response = await request(`/players/${id}/face/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("FACE_REGISTER_FAILED");
  return (await response.json()).data as { player_id: number; samples: number; photo: string | null; registered_at: string };
}

export async function getPlayerFace(id: number | string) {
  const response = await request(`/players/${id}/face`, { cache: "no-store" });
  if (!response.ok) throw new Error("FACE_UNAVAILABLE");
  return (await response.json()).data as { player_id: number; registered: boolean; samples: number; photo: string | null; registered_at: string | null };
}

export async function getFaceDescriptors(): Promise<ServerFaceEntry[]> {
  const response = await request("/face/descriptors", { cache: "no-store" });
  if (!response.ok) throw new Error("FACE_DESCRIPTORS_UNAVAILABLE");
  return (await response.json()).data;
}

export async function deletePlayerFace(id: number | string) {
  const response = await request(`/players/${id}/face`, { method: "DELETE" });
  if (!response.ok) throw new Error("FACE_DELETE_FAILED");
}

export async function createEvaluation(input: { player_id: number; scores: Record<string, number>; notes?: string }) {
  const response = await request("/evaluations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error("EVALUATION_CREATE_FAILED");
  return (await response.json()).data;
}
