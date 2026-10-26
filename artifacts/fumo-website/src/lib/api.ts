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

export function discordOAuthStartUrl(mode: "login" | "link"): string {
  const origin = isProductionSite ? "https://www.micronationfumo.org" : API_BASE_URL;
  return `${origin}/api/auth/discord/start?${new URLSearchParams({ mode }).toString()}`;
}

export function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(apiUrl(path), { ...init, credentials: "include" });
}

export interface BotChannel { id: string; name: string; type: number; }
export interface BotChannelsResponse { guildId: string; channels: BotChannel[]; }

export async function fetchBotChannels(): Promise<BotChannelsResponse> {
  const response = await apiFetch("/api/admin/bot/channels");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "無法載入 Discord 頻道。");
  return data;
}

export async function fetchBotStatus(): Promise<{ ok: boolean; bot: boolean }> {
  const response = await apiFetch("/api/admin/bot/status");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "無法連線到 Discord Bot。");
  return data;
}

export async function sendBotAnnouncement(payload: { channelId: string; title: string; content: string; roleId?: string; author?: string }): Promise<{ ok: boolean; messageUrl?: string }> {
  const response = await apiFetch("/api/admin/bot/announce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "公告發布失敗。");
  return data;
}
