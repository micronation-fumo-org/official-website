const DEFAULT_API_BASE_URL = "https://fumo-api.micronationfumo.workers.dev";

const isProductionSite = typeof window !== "undefined" && (
  window.location.hostname === "www.micronationfumo.org" ||
  window.location.hostname === "micronationfumo.org"
);

export const API_BASE_URL = (
  isProductionSite ? "" : (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL)
).replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function googleOAuthStartUrl(mode: "login" | "link", next?: string): string {
  const origin = isProductionSite ? "https://www.micronationfumo.org" : API_BASE_URL;
  const query = new URLSearchParams({ mode });
  if (mode === "login" && (next === "/documents" || next === "/documents/")) query.set("next", next);
  return `${origin}/api/auth/google/start?${query.toString()}`;
}

export function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(apiUrl(path), { ...init, credentials: "include" });
}
