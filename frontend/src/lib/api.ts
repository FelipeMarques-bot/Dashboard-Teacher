import axios from "axios";

const TOKEN_KEY = "dashboard_teacher_access_token";

function inferApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_URL ?? "").trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window === "undefined") {
    return "http://localhost:8000/api";
  }

  // Usa o mesmo host/porta do frontend e deixa o Vite fazer proxy de /api.
  return "/api";
}

export const api = axios.create({
  baseURL: inferApiBaseUrl(),
});

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function isPublicAuthRoute(url?: string): boolean {
  if (!url) {
    return false;
  }

  return ["/auth/login/", "/auth/google/", "/auth/register/", "/auth/refresh/"].some((path) =>
    url.endsWith(path),
  );
}

api.interceptors.request.use((config) => {
  if (isPublicAuthRoute(config.url)) {
    return config;
  }

  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
