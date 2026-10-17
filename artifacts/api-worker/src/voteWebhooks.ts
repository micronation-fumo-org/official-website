/**
 * Vote lifecycle webhooks.
 *
 * Administrators register HTTPS endpoints and subscribe them to vote events.
 * Every delivery is signed with HMAC-SHA256 over `${timestamp}.${body}` so the
 * receiver can verify that the payload came from this Worker.
 *
 * Ballot choices are never included in a payload; `ballot.cast` only announces
 * that a ballot was recorded, together with the voting country.
 */

export const WEBHOOK_EVENTS = [
  "vote.created",
  "vote.published",
  "vote.started",
  "vote.closing_soon",
  "vote.closed",
  "ballot.cast",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
export type WebhookDeliveryEvent = WebhookEvent | "webhook.test";

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, { zh: string; en: string }> = {
  "vote.created": { zh: "投票建立", en: "Vote created" },
  "vote.published": { zh: "草稿發布", en: "Draft published" },
  "vote.started": { zh: "投票開始", en: "Voting started" },
  "vote.closing_soon": { zh: "即將截止", en: "Closing soon" },
  "vote.closed": { zh: "投票結束", en: "Vote closed" },
  "ballot.cast": { zh: "收到選票", en: "Ballot cast" },
};

export interface WebhookRow {
  id: number;
  name: string;
  url: string;
  secret: string;
  events: string;
  is_enabled: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VoteRecord {
  id: number;
  name: string;
  description: string;
  deadline: string;
  custom_id: string | null;
  regular_meeting_number: number | null;
  starts_at: string | null;
  is_closed: number;
  is_published: number;
  notify_started_at?: string | null;
  notify_closing_soon_at?: string | null;
  notify_closed_at?: string | null;
}

interface Database {
  DB: D1Database;
}

const SITE_ORIGIN = "https://www.micronationfumo.org";
const CLOSING_SOON_MS = 24 * 60 * 60 * 1000;
const DELIVERY_TIMEOUT_MS = 8000;
const MAX_URL_LENGTH = 512;
const MAX_STORED_PAYLOAD = 4000;

export function isWebhookEvent(value: string): value is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(value);
}

export function normalizeWebhookEvents(values: string[]): WebhookEvent[] {
  const unique: WebhookEvent[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!isWebhookEvent(trimmed) || unique.includes(trimmed)) continue;
    unique.push(trimmed);
  }
  return unique;
}

export function parseWebhookEvents(value: string): WebhookEvent[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? normalizeWebhookEvents(parsed.map(String)) : [];
  } catch {
    return [];
  }
}

export function webhookSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Only public HTTPS endpoints are allowed, so a webhook cannot be pointed at
 * loopback or private network addresses from inside Cloudflare.
 */
export function validateWebhookUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) return { ok: false, error: "請輸入 Webhook 網址。" };
  if (value.length > MAX_URL_LENGTH) return { ok: false, error: "Webhook 網址過長。" };
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "Webhook 網址格式不正確。" };
  }
  if (parsed.protocol !== "https:") return { ok: false, error: "Webhook 網址必須使用 HTTPS。" };
  if (parsed.username || parsed.password) return { ok: false, error: "Webhook 網址不可包含帳號或密碼。" };
  if (parsed.search || parsed.hash) return { ok: false, error: "Webhook 網址不可包含查詢字串或片段。" };
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || !hostname.includes(".")) return { ok: false, error: "Webhook 網址必須使用公開網域。" };
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return { ok: false, error: "Webhook 網址不可指向內部網路。" };
  }
  if (isPrivateHost(hostname)) return { ok: false, error: "Webhook 網址不可指向內部網路。" };
  return { ok: true, url: parsed.toString() };
}

function isPrivateHost(hostname: string): boolean {
  const bare = hostname.replace(/^\[|\]$/g, "");
  if (bare.includes(":")) return true; // IPv6 literals are not supported as webhook targets.
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(bare)) return false;
  const [a, b] = bare.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function webhookSummary(row: WebhookRow) {
  return {
    id: row.id,
    name: row.name,
    // Webhook paths often contain bearer tokens (e.g. Discord/Slack endpoints).
    // Never return that path to the browser after the endpoint is saved.
    url: webhookUrlLabel(row.url),
    events: parseWebhookEvents(row.events),
    isEnabled: Boolean(row.is_enabled),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function webhookUrlLabel(raw: string): string {
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}/…`;
  } catch {
    return "(invalid endpoint)";
  }
}

export function voteWebhookPayload(
  vote: VoteRecord,
  event: WebhookEvent,
  options: { ballotCount?: number; details?: Record<string, unknown>; occurredAt?: string } = {},
) {
  const publicId = vote.custom_id || String(vote.id);
  const occurredAt = options.occurredAt ?? new Date().toISOString();
  const deadline = formatInstant(vote.deadline);
  const startsAt = vote.starts_at ? formatInstant(vote.starts_at) : null;
  return {
    event,
    occurredAt,
    source: "fumo-api",
    content: summaryLine(event, vote.name, publicId, deadline, startsAt),
    text: summaryLine(event, vote.name, publicId, deadline, startsAt),
    vote: {
      id: vote.id,
      publicId,
      name: vote.name,
      description: vote.description ?? "",
      regularMeetingNumber: vote.regular_meeting_number,
      startsAt,
      deadline,
      isClosed: Boolean(vote.is_closed),
      isPublished: Boolean(vote.is_published),
      ballotCount: options.ballotCount ?? null,
      url: `${SITE_ORIGIN}/votes/${encodeURIComponent(publicId)}`,
      resultsUrl: `${SITE_ORIGIN}/votes/${encodeURIComponent(publicId)}`,
    },
    details: options.details ?? {},
  };
}

function summaryLine(event: WebhookEvent, name: string, publicId: string, deadline: string | null, startsAt: string | null) {
  const label = WEBHOOK_EVENT_LABELS[event]?.zh ?? event;
  const link = `${SITE_ORIGIN}/votes/${encodeURIComponent(publicId)}`;
  const parts = [`[FUMO] ${label}：${name}（${publicId}）`];
  if (event === "vote.started" && deadline) parts.push(`截止 ${deadline}`);
  else if (event === "vote.closing_soon" && deadline) parts.push(`將於 ${deadline} 截止`);
  else if (event === "vote.closed" && deadline) parts.push(`已於 ${deadline} 結束`);
  else if (event === "vote.created" && startsAt) parts.push(`預約開始 ${startsAt}`);
  parts.push(link);
  return parts.join(" · ");
}

/** D1 stores UTC timestamps as `YYYY-MM-DD HH:MM:SS`; expose them as ISO instants. */
function formatInstant(value: string): string;
function formatInstant(value: string | null): string | null;
function formatInstant(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : value;
}

export async function signWebhook(secret: string, timestamp: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function deliverWebhook(
  env: Database,
  webhook: WebhookRow,
  event: WebhookDeliveryEvent,
  payload: Record<string, unknown>,
  options: { record?: boolean } = {},
): Promise<{ ok: boolean; statusCode: number; error: string }> {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await signWebhook(webhook.secret, timestamp, body);
  const deliveryId = crypto.randomUUID();
  let ok = false;
  let statusCode = 0;
  let error = "";
  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "FUMO-Webhook/1.0",
        "X-FUMO-Event": event,
        "X-FUMO-Delivery": deliveryId,
        "X-FUMO-Timestamp": timestamp,
        "X-FUMO-Signature": `sha256=${signature}`,
      },
      body,
      signal: timeoutSignal(),
    });
    statusCode = response.status;
    ok = response.ok;
    if (!ok) error = `HTTP ${response.status}`;
    if (response.body) {
      try {
        await response.body.cancel();
      } catch {
        // The response body is irrelevant once the status is known.
      }
    }
  } catch (cause) {
    // Fetch errors can include the destination URL; keep endpoint tokens out
    // of persistent delivery logs and API responses.
    error = cause instanceof Error && cause.name === "AbortError" ? "Request timed out" : "Network error or timeout";
  }
  if (options.record !== false) {
    try {
      await env.DB.prepare(
        "INSERT INTO vote_webhook_deliveries (webhook_id, event, vote_id, status_code, ok, error, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(
          webhook.id,
          event,
          Number.isInteger(payload?.vote && (payload.vote as { id?: unknown }).id) ? Number((payload.vote as { id: number }).id) : null,
          statusCode || null,
          ok ? 1 : 0,
          error,
          body.slice(0, MAX_STORED_PAYLOAD),
        )
        .run();
    } catch {
      // Diagnostics must never break a delivery.
    }
  }
  return { ok, statusCode, error };
}

function timeoutSignal(): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(DELIVERY_TIMEOUT_MS);
  } catch {
    return undefined;
  }
}

export async function dispatchVoteEvent(
  env: Database,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const rows = await env.DB.prepare("SELECT * FROM vote_webhooks WHERE is_enabled = 1").all<WebhookRow>();
  const targets = (rows.results ?? []).filter(row => parseWebhookEvents(row.events).includes(event));
  if (!targets.length) return;
  await Promise.allSettled(targets.map(row => deliverWebhook(env, row, event, payload)));
}

export interface SweepResult {
  started: number;
  closingSoon: number;
  closed: number;
}

/**
 * Announces time-driven transitions: a scheduled vote opening, a vote entering
 * its final day, and a vote that reached its deadline without being closed
 * manually. Notification markers make every transition fire exactly once.
 */
export async function runVoteNotificationSweep(env: Database, now = Date.now()): Promise<SweepResult> {
  const result: SweepResult = { started: 0, closingSoon: 0, closed: 0 };
  const rows = await env.DB.prepare(
    "SELECT * FROM votes WHERE is_published = 1 AND (notify_started_at IS NULL OR notify_closing_soon_at IS NULL OR notify_closed_at IS NULL)",
  ).all<VoteRecord>();
  for (const vote of rows.results ?? []) {
    const deadline = Date.parse(vote.deadline.includes("T") ? vote.deadline : `${vote.deadline.replace(" ", "T")}Z`);
    const startsAt = vote.starts_at ? Date.parse(vote.starts_at.includes("T") ? vote.starts_at : `${vote.starts_at.replace(" ", "T")}Z`) : null;
    const expired = Number.isFinite(deadline) && deadline <= now;
    const isClosed = Boolean(vote.is_closed);

    if (!vote.notify_closed_at && (isClosed || expired)) {
      const marked = await markNotified(env, vote.id, "notify_closed_at");
      if (marked) {
        result.closed++;
        await dispatchVoteEvent(env, "vote.closed", voteWebhookPayload(vote, "vote.closed", {
          details: { reason: isClosed ? "manual" : "deadline" },
        }));
      }
      continue;
    }

    if (!vote.notify_started_at && !isClosed && !expired && (startsAt === null || startsAt <= now)) {
      const marked = await markNotified(env, vote.id, "notify_started_at");
      if (marked) {
        result.started++;
        await dispatchVoteEvent(env, "vote.started", voteWebhookPayload(vote, "vote.started", { details: { reason: "scheduled" } }));
      }
    }

    if (!vote.notify_closing_soon_at && !isClosed && !expired && (startsAt === null || startsAt <= now) && Number.isFinite(deadline) && deadline - now <= CLOSING_SOON_MS) {
      const marked = await markNotified(env, vote.id, "notify_closing_soon_at");
      if (marked) {
        result.closingSoon++;
        await dispatchVoteEvent(env, "vote.closing_soon", voteWebhookPayload(vote, "vote.closing_soon", {
          details: { reason: "deadline_within_24h" },
        }));
      }
    }
  }
  return result;
}

export async function markNotified(env: Database, voteId: number, column: "notify_started_at" | "notify_closing_soon_at" | "notify_closed_at"): Promise<boolean> {
  const updated = await env.DB.prepare(
    `UPDATE votes SET ${column} = datetime('now') WHERE id = ? AND ${column} IS NULL`,
  )
    .bind(voteId)
    .run();
  return Number(updated.meta?.changes ?? 0) > 0;
}
