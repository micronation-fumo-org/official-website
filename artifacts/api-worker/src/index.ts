import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { buildGoogleAuthorizationUrl, createPkceChallenge, fetchGoogleIdentity, randomToken } from "./googleOAuth";
import { deliverWebhook, dispatchVoteEvent, DISCORD_ROLE_ID, normalizeDiscordRoleIds, normalizeWebhookEvents, runVoteNotificationSweep, validateWebhookUrl, voteWebhookPayload, webhookSecret, webhookSummary, WEBHOOK_EVENTS, type WebhookEvent, type WebhookRow } from "./voteWebhooks";

interface Env {
  DB: D1Database;
  CORS_ORIGIN?: string;
  SESSION_TTL_DAYS?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
}
type Variables = { account: Account | null };
type App = Hono<{ Bindings: Env; Variables: Variables }>;

interface Account {
  id: number;
  voter_id: string;
  voter_name: string;
  country_name: string;
  password_hash: string;
  admin_level: number;
  created_at: string;
}
interface VoteRow {
  id: number;
  name: string;
  description: string;
  deadline: string;
  options: string;
  allow_multiple: number;
  is_closed: number;
  created_at: string;
  updated_at: string;
  custom_id: string | null;
  regular_meeting_number: number | null;
  starts_at: string | null;
  is_published: number;
  notify_started_at: string | null;
  notify_closing_soon_at: string | null;
  notify_closed_at: string | null;
}
interface BallotRow {
  id: number;
  vote_id: number;
  voter_id: string;
  voter_name: string;
  country_name: string;
  selected_options: string;
  created_at: string;
}

const SHEET_ID = "1ebE_1cZa2nqcdPwrFq_60wmElO1GDNtoG8zFPciqHFo";
const MEMBER_GID = "1958346154";
const OBSERVER_GID = "1711083489";
const VOTER_GID = "569164345";
const REGISTRATION_GID = "948800346";
const STAFF_SHEET_ID = "1Iw5EY1LfFF-Ig9tJGVyWNBON20t9oE-0iFVFPPgsjk0";
const SECRETARIAT_GID = "1303265265";
const COUNCIL_GID = "1574972161";
const HISTORICAL_VOTES_SPECIAL_GID = "281957361";
const HISTORICAL_VOTES_STANDARD_GID = "483555265";
const DEFAULT_ADMIN_ID = "1406117683220709486";
const ADMIN_NONE = 0;
const ADMIN_TIER1 = 1;
const ADMIN_TIER2 = 2;
const ADMIN_SUPER = 9;
const PBKDF2_ITERATIONS = 100000;
const SESSION_COOKIE = "fumo_session";
const SESSION_TTL_DAYS = 7;
const GOOGLE_STATE_COOKIE = "fumo_google_oauth_state";
const DEFAULT_GOOGLE_REDIRECT_URI = "https://www.micronationfumo.org/api/auth/google/callback";

const json = (value: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json", ...headers } });
const parseJson = async (c: any) => { try { return await c.req.json(); } catch { return null; } };
const account = async (db: D1Database, voterId: string) => (await db.prepare("SELECT * FROM voter_accounts WHERE voter_id = ?").bind(voterId).first<Account>()) ?? null;
const jsonArray = <T>(value: string): T[] => { try { return JSON.parse(value) as T[]; } catch { return []; } };
const asVote = (v: VoteRow, ballotCount = 0) => {
  const now = Date.now();
  const startsAt = v.starts_at ? Date.parse(v.starts_at) : null;
  const isPublished = Boolean(v.is_published);
  const isExpired = Date.parse(v.deadline) < now;
  const isUpcoming = isPublished && !v.is_closed && !isExpired && startsAt !== null && Number.isFinite(startsAt) && startsAt > now;
  return { id: v.id, customId: v.custom_id, publicId: v.custom_id || String(v.id), regularMeetingNumber: v.regular_meeting_number, name: v.name, description: v.description, deadline: v.deadline, startsAt: v.starts_at, options: jsonArray<string>(v.options), allowMultiple: Boolean(v.allow_multiple), isClosed: Boolean(v.is_closed), isExpired, isPublished, isUpcoming, ballotCount, createdAt: v.created_at, updatedAt: v.updated_at };
};
async function voteByPublicId(db: D1Database, value: string): Promise<VoteRow | null> {
  if (/^\d+$/.test(value)) return await db.prepare("SELECT * FROM votes WHERE id = ?").bind(Number(value)).first<VoteRow>() ?? null;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/.test(value)) return null;
  return await db.prepare("SELECT * FROM votes WHERE custom_id = ?").bind(value).first<VoteRow>() ?? null;
}

function csvRows(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) { const ch = text[i];
    if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (ch === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}
async function sheetFrom(spreadsheetId: string, gid: string) { const r = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`); if (!r.ok) throw new Error(`Google Sheet ${r.status}`); return csvRows(await r.text()); }
async function sheet(gid: string) { return sheetFrom(SHEET_ID, gid); }
type HistoricalVoteKind = "special" | "standard";
interface HistoricalVoteRecord {
  kind: HistoricalVoteKind;
  meeting: string;
  code: string;
  title: string;
  totalVotes: string;
  turnout: string;
  result: string;
  countryVotes: { countryName: string; selection: string }[];
}
interface HistoricalVoteRecordsResponse {
  special: HistoricalVoteRecord[];
  standard: HistoricalVoteRecord[];
  fetchedAt: string;
}
function parseHistoricalVoteRows(rows: string[][], kind: HistoricalVoteKind): HistoricalVoteRecord[] {
  const header = rows[0] ?? [];
  const countryStart = kind === "standard" ? 6 : 3;
  const dataStart = kind === "standard" ? 5 : 1;
  const countryNames = header.slice(countryStart);
  let currentMeeting = "";
  const records: HistoricalVoteRecord[] = [];
  for (const row of rows.slice(dataStart)) {
    const meetingCell = (row[0] ?? "").trim();
    if (meetingCell) currentMeeting = meetingCell;
    const code = (row[1] ?? "").trim();
    const title = (row[2] ?? "").trim();
    if (!code && !title) continue;
    const countryVotes = countryNames.flatMap((countryName, index) => {
      const selection = (row[countryStart + index] ?? "").trim();
      return countryName.trim() && selection ? [{ countryName: countryName.trim(), selection }] : [];
    });
    records.push({
      kind,
      meeting: currentMeeting,
      code,
      title,
      totalVotes: kind === "standard" ? ((row[3] ?? "").trim() || String(countryVotes.length)) : String(countryVotes.length),
      turnout: kind === "standard" ? (row[4] ?? "").trim() : "",
      result: kind === "standard" ? (row[5] ?? "").trim() : "",
      countryVotes,
    });
  }
  return records.reverse();
}
let historicalVoteRecordsCache: { value: HistoricalVoteRecordsResponse; at: number } | null = null;
async function historicalVoteRecords(): Promise<HistoricalVoteRecordsResponse> {
  if (historicalVoteRecordsCache && Date.now() - historicalVoteRecordsCache.at < 300000) return historicalVoteRecordsCache.value;
  const [specialRows, standardRows] = await Promise.all([
    sheetFrom(STAFF_SHEET_ID, HISTORICAL_VOTES_SPECIAL_GID),
    sheetFrom(STAFF_SHEET_ID, HISTORICAL_VOTES_STANDARD_GID),
  ]);
  const value = {
    special: parseHistoricalVoteRows(specialRows, "special"),
    standard: parseHistoricalVoteRows(standardRows, "standard"),
    fetchedAt: new Date().toISOString(),
  };
  historicalVoteRecordsCache = { value, at: Date.now() };
  return value;
}
interface Member { fullName: string; shortName: string; abbreviation?: string; headOfState?: string; primeMinister?: string; governmentType: string; status: "member" | "observer"; }
interface Voter { countryName: string; reps: { name: string; id: string }[]; }
interface RegistrationEntry { countryName: string; voterName: string; id: string; }
interface StaffEntry { id: string; name: string; roles: string[]; areas: string[]; organizations: string[]; }
let membersCache: { value: { memberStates: Member[]; observerStates: Member[]; allStates: Member[] }; at: number } | null = null;
let votersCache: { value: Voter[]; at: number } | null = null;
let staffCache: { value: StaffEntry[]; at: number } | null = null;
async function members() {
  if (membersCache && Date.now() - membersCache.at < 300000) return membersCache.value;
  const parse = (rows: string[][], status: Member["status"]): Member[] => { const h = rows[0] ?? []; const idx = (n: string) => h.indexOf(n); return rows.slice(1).filter(r => r[idx("國家名稱")]).map(r => ({ fullName: r[idx("國家名稱")] ?? "", shortName: r[idx("國家簡稱")] ?? "", abbreviation: r[idx("國家代號")] || undefined, headOfState: r[idx("最高領袖")] || undefined, primeMinister: r[idx("最高首腦")] || undefined, governmentType: r[idx("國家體制")] ?? "", status })); };
  const [m, o] = await Promise.all([sheet(MEMBER_GID), sheet(OBSERVER_GID)]); const memberStates = parse(m, "member"); const observerStates = parse(o, "observer"); const value = { memberStates, observerStates, allStates: [...memberStates, ...observerStates] }; membersCache = { value, at: Date.now() }; return value;
}
async function voters() {
  if (votersCache && Date.now() - votersCache.at < 300000) return votersCache.value;
  const rows = await sheet(VOTER_GID); const h = rows[0] ?? []; const idx = (n: string) => h.indexOf(n); const value: Voter[] = [];
  for (const r of rows.slice(1)) { const countryName = r[idx("國家名稱")] ?? ""; if (!countryName) continue; const reps: { name: string; id: string }[] = []; for (let i = 1; i <= 3; i++) { const id = r[idx(`第${["一","二","三"][i - 1]}代表ID`)] ?? ""; if (id) reps.push({ name: r[idx(`第${["一","二","三"][i - 1]}代表名稱`)] ?? "", id }); } if (reps.length) value.push({ countryName, reps }); }
  votersCache = { value, at: Date.now() }; return value;
}
const findVoter = (list: Voter[], id: string) => { for (const v of list) { const rep = v.reps.find(r => r.id === id); if (rep) return { countryName: v.countryName, voterName: rep.name }; } return null; };
async function registrations() { const rows = await sheet(REGISTRATION_GID); const h = rows[0] ?? []; const idx = (n: string) => h.indexOf(n); return rows.slice(1).map(r => ({ countryName: r[idx("國家名稱")] ?? "", voterName: r[idx("註冊名稱")] ?? "", id: r[idx("註冊ID")] ?? "" })).filter(r => r.id && r.countryName && r.voterName); }
async function staffAccounts() {
  if (staffCache && Date.now() - staffCache.at < 300000) return staffCache.value;
  const [secretariat, council] = await Promise.all([
    fetch(`https://docs.google.com/spreadsheets/d/${STAFF_SHEET_ID}/export?format=csv&gid=${SECRETARIAT_GID}`).then(r => r.text()).then(csvRows),
    fetch(`https://docs.google.com/spreadsheets/d/${STAFF_SHEET_ID}/export?format=csv&gid=${COUNCIL_GID}`).then(r => r.text()).then(csvRows),
  ]);
  const byId = new Map<string, StaffEntry>();
  for (const [rows, organization] of [[secretariat, "秘書處"], [council, "議事中心"]] as const) {
    const h = rows[0] ?? []; const idAt = h.indexOf("使用者ID"); const nameAt = h.indexOf("暱稱"); const roleAt = h.indexOf("職稱");
    if (idAt < 0 || nameAt < 0 || roleAt < 0) continue;
    for (const r of rows.slice(1)) {
      const id = (r[idAt] ?? "").trim(); const name = (r[nameAt] ?? "").trim(); const role = (r[roleAt] ?? "").trim();
      if (!id || !name) continue;
      const area = (r[h.indexOf("負責區域")] ?? "").trim();
      const entry = byId.get(id) ?? { id, name, roles: [], areas: [], organizations: [] };
      if (role && !entry.roles.includes(role)) entry.roles.push(role);
      if (area && !entry.areas.includes(area)) entry.areas.push(area);
      if (!entry.organizations.includes(organization)) entry.organizations.push(organization);
      byId.set(id, entry);
    }
  }
  const value = [...byId.values()]; staffCache = { value, at: Date.now() }; return value;
}

const enc = new TextEncoder();
async function hashPassword(password: string) { const salt = crypto.getRandomValues(new Uint8Array(16)); const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]); const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256); return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(new Uint8Array(bits))}`; }
async function verifyPassword(password: string, stored: string) { const [kind, iter, salt, expected] = stored.split("$"); if (kind !== "pbkdf2") return false; const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]); const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromB64(salt), iterations: Number(iter), hash: "SHA-256" }, key, 256); return toB64(new Uint8Array(bits)) === expected; }
function toB64(bytes: Uint8Array) { let s = ""; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s); }
function fromB64(value: string) { const s = atob(value); return Uint8Array.from(s, c => c.charCodeAt(0)); }
function cookieValue(c: any, name: string) { const header = c.req.header("Cookie") || ""; const match = header.split(";").map((v: string) => v.trim()).find((v: string) => v.startsWith(`${name}=`)); return match ? decodeURIComponent(match.slice(name.length + 1)) : null; }
function hex(bytes: Uint8Array) { return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
async function sessionHash(token: string) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(token)))); }
function sessionCookie(token: string, maxAge: number) { return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=None`; }
function clearSessionCookie() { return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None`; }
async function createSession(db: D1Database, voterId: string) { const raw = toB64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); const hash = await sessionHash(raw); const days = SESSION_TTL_DAYS; await db.prepare("DELETE FROM auth_sessions WHERE expires_at <= datetime('now') OR voter_id = ?").bind(voterId).run(); await db.prepare("INSERT INTO auth_sessions (token_hash, voter_id, expires_at) VALUES (?, ?, datetime('now', ?))").bind(hash, voterId, `+${days} days`).run(); return { raw, maxAge: days * 86400 }; }
async function currentAccount(c: any): Promise<Account | null> { const token = cookieValue(c, SESSION_COOKIE); if (!token) return null; const row = await c.env.DB.prepare("SELECT a.* FROM auth_sessions s JOIN voter_accounts a ON a.voter_id = s.voter_id WHERE s.token_hash = ? AND s.expires_at > datetime('now')").bind(await sessionHash(token)).first() as Account | null; return row ?? null; }
function publicUser(a: Account) { return { voterId: a.voter_id, voterName: a.voter_name, countryName: a.country_name, adminLevel: a.admin_level }; }
interface AuditLogRow { id: number; actor_voter_id: string; actor_name: string; action: string; target_type: string; target_id: string; details_json: string; created_at: string; }
function auditStatement(db: D1Database, actor: Account, action: string, targetType: string, targetId: string | number, details: Record<string, string | number | boolean>) {
  return db.prepare("INSERT INTO admin_audit_logs (actor_voter_id, actor_name, action, target_type, target_id, details_json) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(actor.voter_id, actor.voter_name, action, targetType, String(targetId), JSON.stringify(details));
}
function parseAuditDetails(value: string) { try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; } }
function googleRedirectUri(env: Env) {
  const candidate = env.GOOGLE_REDIRECT_URI?.trim() || DEFAULT_GOOGLE_REDIRECT_URI;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" || parsed.hostname !== "www.micronationfumo.org" || parsed.pathname !== "/api/auth/google/callback" || parsed.search || parsed.hash) return DEFAULT_GOOGLE_REDIRECT_URI;
    return parsed.toString();
  } catch {
    return DEFAULT_GOOGLE_REDIRECT_URI;
  }
}
function googleStateCookie(state: string) { return `${GOOGLE_STATE_COOKIE}=${encodeURIComponent(state)}; Max-Age=600; Path=/api/auth/google/callback; HttpOnly; Secure; SameSite=Lax`; }
function clearGoogleStateCookie() { return `${GOOGLE_STATE_COOKIE}=; Max-Age=0; Path=/api/auth/google/callback; HttpOnly; Secure; SameSite=Lax`; }
function googleResultResponse(path: string, result: string, redirectUri: string, cookies: string[] = []) {
  const destination = new URL(path, new URL(redirectUri).origin);
  destination.searchParams.set("google", result);
  const headers = new Headers({ Location: destination.toString(), "Cache-Control": "no-store", Pragma: "no-cache" });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function background(c: any, promise: Promise<unknown>) {
  try { c.executionCtx.waitUntil(promise); } catch { void promise; }
}
/** Queues a webhook announcement without delaying the API response. */
function fireVoteEvent(c: any, event: WebhookEvent, vote: VoteRow, options: { ballotCount?: number; details?: Record<string, unknown> } = {}) {
  background(c, dispatchVoteEvent(c.env, event, voteWebhookPayload(vote, event, options)));
}
let lastNotificationSweepAt = 0;

const app: App = new Hono();
app.use("/*", async (c, next) => { const origin = c.req.header("Origin"); const allowed = (c.env.CORS_ORIGIN || "").split(",").map(v => v.trim()).filter(Boolean); return cors({ origin: origin && (allowed.length === 0 || allowed.includes(origin)) ? origin : (allowed[0] || "https://fumo-api.micronationfumo.workers.dev"), credentials: true, allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowHeaders: ["Content-Type"] })(c, next); });
app.use("/*", async (c, next) => {
  // Health checks must stay independent from database bootstrap so deployment
  // and D1 binding problems remain diagnosable instead of becoming opaque 500s.
  if (c.req.path === "/api/healthz") return next();
  try {
    const existing = await account(c.env.DB, DEFAULT_ADMIN_ID);
    if (!existing) {
      await c.env.DB.prepare("INSERT OR IGNORE INTO voter_accounts (voter_id, voter_name, country_name, password_hash, admin_level) VALUES (?, ?, ?, ?, ?)")
        .bind(DEFAULT_ADMIN_ID, "系統最高管理員", "FUMO", await hashPassword("changeme"), ADMIN_SUPER)
        .run();
    } else if (existing.admin_level < ADMIN_SUPER) {
      await c.env.DB.prepare("UPDATE voter_accounts SET admin_level = ?, updated_at = datetime('now') WHERE voter_id = ?")
        .bind(ADMIN_SUPER, DEFAULT_ADMIN_ID)
        .run();
    }
  } catch (error) {
    console.error("D1 bootstrap failed", error);
    return c.json({ error: "Database initialization failed", message: String(error) }, 500);
  }
  return next();
});
app.get("/api/healthz", c => {
  // Health checks double as a safety net for time-driven vote notifications when
  // the cron trigger is delayed; the cooldown keeps the extra query rare.
  const now = Date.now();
  if (now - lastNotificationSweepAt > 60000) {
    lastNotificationSweepAt = now;
    background(c, runVoteNotificationSweep(c.env).catch(error => console.error("Vote notification sweep failed", error)));
  }
  return c.json({ status: "ok" });
});
app.get("/api/auth/google/start", async c => {
  const clientId = c.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = googleRedirectUri(c.env);
  if (!clientId || !clientSecret) return googleResultResponse("/login", "not_configured", redirectUri, [clearGoogleStateCookie()]);

  const flow = c.req.query("mode") ?? "login";
  if (flow !== "login" && flow !== "link") return googleResultResponse("/login", "failed", redirectUri, [clearGoogleStateCookie()]);
  const actor = flow === "link" ? await currentAccount(c) : null;
  if (flow === "link" && !actor) return googleResultResponse("/login", "sign_in_first", redirectUri, [clearGoogleStateCookie()]);

  const state = randomToken();
  const verifier = randomToken();
  const stateHash = await sessionHash(state);
  const returnTo = flow === "link" ? "/login" : "/votes";
  await c.env.DB.prepare("DELETE FROM google_oauth_states WHERE expires_at <= datetime('now')").run();
  await c.env.DB.prepare("INSERT INTO google_oauth_states (state_hash, flow, voter_id, return_to, code_verifier, expires_at) VALUES (?, ?, ?, ?, ?, datetime('now', '+10 minutes'))")
    .bind(stateHash, flow, actor?.voter_id ?? null, returnTo, verifier).run();

  const challenge = await createPkceChallenge(verifier);
  const authorizationUrl = buildGoogleAuthorizationUrl(clientId, redirectUri, state, challenge);
  return new Response(null, { status: 302, headers: { Location: authorizationUrl, "Set-Cookie": googleStateCookie(state), "Cache-Control": "no-store", Pragma: "no-cache" } });
});

app.get("/api/auth/google/callback", async c => {
  const redirectUri = googleRedirectUri(c.env);
  const state = c.req.query("state");
  const stateCookie = cookieValue(c, GOOGLE_STATE_COOKIE);
  const clearCookie = clearGoogleStateCookie();
  if (!state || !stateCookie || state !== stateCookie) return googleResultResponse("/login", "invalid_state", redirectUri, [clearCookie]);

  const stateHash = await sessionHash(state);
  const oauthState = await c.env.DB.prepare("SELECT flow, voter_id, return_to, code_verifier FROM google_oauth_states WHERE state_hash = ? AND expires_at > datetime('now')")
    .bind(stateHash).first<{ flow: "login" | "link"; voter_id: string | null; return_to: string; code_verifier: string }>();
  if (!oauthState) return googleResultResponse("/login", "invalid_state", redirectUri, [clearCookie]);
  await c.env.DB.prepare("DELETE FROM google_oauth_states WHERE state_hash = ?").bind(stateHash).run();

  const returnTo = oauthState.return_to === "/votes" ? "/votes" : "/login";
  const googleError = c.req.query("error");
  if (googleError) return googleResultResponse("/login", googleError === "access_denied" ? "denied" : "failed", redirectUri, [clearCookie]);

  const clientId = c.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET?.trim();
  const code = c.req.query("code");
  if (!clientId || !clientSecret) return googleResultResponse("/login", "not_configured", redirectUri, [clearCookie]);
  if (!code || code.length > 2048) return googleResultResponse("/login", "failed", redirectUri, [clearCookie]);

  if (oauthState.flow === "link") {
    const actor = await currentAccount(c);
    if (!actor || actor.voter_id !== oauthState.voter_id) return googleResultResponse("/login", "session_changed", redirectUri, [clearCookie]);
  }

  const identity = await fetchGoogleIdentity(code, oauthState.code_verifier, clientId, clientSecret, redirectUri);
  if (!identity) return googleResultResponse("/login", "failed", redirectUri, [clearCookie]);

  if (oauthState.flow === "link") {
    const voterId = oauthState.voter_id;
    if (!voterId || !(await account(c.env.DB, voterId))) return googleResultResponse("/login", "session_changed", redirectUri, [clearCookie]);
    const owner = await c.env.DB.prepare("SELECT voter_id FROM google_account_links WHERE google_sub = ?").bind(identity.subject).first<{ voter_id: string }>();
    if (owner && owner.voter_id !== voterId) return googleResultResponse("/login", "google_already_linked", redirectUri, [clearCookie]);
    const currentLink = await c.env.DB.prepare("SELECT google_sub FROM google_account_links WHERE voter_id = ?").bind(voterId).first<{ google_sub: string }>();
    if (currentLink && currentLink.google_sub !== identity.subject) return googleResultResponse("/login", "account_already_linked", redirectUri, [clearCookie]);
    if (currentLink) {
      await c.env.DB.prepare("UPDATE google_account_links SET google_email = ?, updated_at = datetime('now') WHERE voter_id = ?").bind(identity.email, voterId).run();
    } else {
      try {
        await c.env.DB.prepare("INSERT INTO google_account_links (voter_id, google_sub, google_email) VALUES (?, ?, ?)").bind(voterId, identity.subject, identity.email).run();
      } catch {
        return googleResultResponse("/login", "google_already_linked", redirectUri, [clearCookie]);
      }
    }
    return googleResultResponse(returnTo, "connected", redirectUri, [clearCookie]);
  }

  const link = await c.env.DB.prepare("SELECT voter_id FROM google_account_links WHERE google_sub = ?").bind(identity.subject).first<{ voter_id: string }>();
  if (!link) return googleResultResponse("/login", "unlinked", redirectUri, [clearCookie]);
  const voterAccount = await account(c.env.DB, link.voter_id);
  if (!voterAccount) return googleResultResponse("/login", "unlinked", redirectUri, [clearCookie]);
  const session = await createSession(c.env.DB, voterAccount.voter_id);
  return googleResultResponse(returnTo, "login", redirectUri, [sessionCookie(session.raw, session.maxAge), clearCookie]);
});

app.get("/api/members", async c => { try { return c.json({ ...(await members()), cached: Boolean(membersCache), lastUpdated: membersCache ? new Date(membersCache.at).toISOString() : null }); } catch (e) { return c.json({ error: "Failed to fetch member states", message: String(e) }, 500); } });
app.get("/api/voters", async c => { try { return c.json(await voters()); } catch (e) { return c.json({ error: "Failed to fetch voters", message: String(e) }, 500); } });
app.get("/api/staff-report", async c => { try { const staff = await staffAccounts(); return c.json({ staff: staff.map(({ id: _id, ...entry }) => entry), lastUpdated: new Date().toISOString() }); } catch (e) { return c.json({ error: "Failed to fetch staff report", message: String(e) }, 500); } });
app.get("/api/vote-records", async c => {
  try {
    return c.json(await historicalVoteRecords(), 200, { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300" });
  } catch {
    return c.json({ error: "無法載入歷史投票紀錄，請稍後再試。" }, 502, { "Cache-Control": "no-store" });
  }
});

app.get("/api/votes", async c => {
  const actor = await currentAccount(c);
  const visibilityFilter = actor && actor.admin_level >= ADMIN_TIER1 ? "" : "WHERE v.is_published = 1";
  const rows = await c.env.DB.prepare(`SELECT v.*, COUNT(b.id) AS ballot_count FROM votes v LEFT JOIN ballots b ON b.vote_id = v.id ${visibilityFilter} GROUP BY v.id ORDER BY v.created_at ASC`).all<VoteRow & { ballot_count: number }>();
  return c.json((rows.results ?? []).map(v => asVote(v, v.ballot_count)));
});
app.post("/api/votes", async c => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    deadline: z.string().datetime(),
    options: z.array(z.string().min(1)).min(2),
    allowMultiple: z.boolean().default(false),
    customId: z.string().trim().min(1).max(48).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/).refine(value => !/^\d+$/.test(value), "自訂投票 ID 不可為純數字，以免與既有數字 ID 衝突。").refine(value => !/^create$/i.test(value), "自訂投票 ID 不可使用保留字 create。").optional().nullable(),
    regularMeetingNumber: z.number().int().positive().optional().nullable(),
    publishMode: z.enum(["immediate", "draft", "scheduled"]).default("immediate"),
    startsAt: z.string().datetime().optional().nullable(),
  }).superRefine((value, ctx) => {
    const now = Date.now();
    const deadline = Date.parse(value.deadline);
    if (deadline <= now) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["deadline"], message: "截止時間必須晚於目前時間。" });
    if (value.publishMode === "scheduled") {
      if (!value.startsAt) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startsAt"], message: "預約開始需要設定開始時間。" });
      } else {
        const startsAt = Date.parse(value.startsAt);
        if (startsAt <= now) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startsAt"], message: "預約開始時間必須在未來。" });
        if (deadline <= startsAt) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["deadline"], message: "截止時間必須晚於開始時間。" });
      }
    } else if (value.startsAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startsAt"], message: "只有預約開始模式可設定開始時間。" });
    }
  });
  const body = schema.safeParse(await parseJson(c));
  if (!body.success) return c.json({ error: "Invalid input", details: body.error.issues }, 400);
  const actor = await currentAccount(c);
  if (!actor || actor.admin_level < ADMIN_TIER1) return c.json({ error: "管理員權限不足。只有管理員才能建立投票。" }, 403);
  const customId = body.data.customId || null;
  const regularMeetingNumber = body.data.regularMeetingNumber ?? null;
  const startsAt = body.data.publishMode === "scheduled" ? body.data.startsAt ?? null : null;
  const isPublished = body.data.publishMode === "draft" ? 0 : 1;
  if (customId && await c.env.DB.prepare("SELECT id FROM votes WHERE custom_id = ?").bind(customId).first()) return c.json({ error: "此自訂投票 ID 已被使用，請更換其他 ID。" }, 409);
  let batch;
  try {
    batch = await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO votes (name, description, deadline, options, allow_multiple, custom_id, regular_meeting_number, starts_at, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(body.data.name, body.data.description ?? "", body.data.deadline, JSON.stringify(body.data.options), body.data.allowMultiple ? 1 : 0, customId, regularMeetingNumber, startsAt, isPublished),
      c.env.DB.prepare("INSERT INTO admin_audit_logs (actor_voter_id, actor_name, action, target_type, target_id, details_json) VALUES (?, ?, 'vote.create', 'vote', CAST(last_insert_rowid() AS TEXT), ?)").bind(actor.voter_id, actor.voter_name, JSON.stringify({ voteName: body.data.name, customId: customId ?? "", regularMeetingNumber: regularMeetingNumber ?? 0, publishMode: body.data.publishMode, startsAt: startsAt ?? "" })),
    ]);
  } catch (error) {
    if (customId && /UNIQUE constraint failed:\s*votes\.custom_id/i.test(String(error))) return c.json({ error: "此自訂投票 ID 已被使用，請更換其他 ID。" }, 409);
    throw error;
  }
  const id = Number(batch[0]?.meta?.last_row_id ?? 0);
  const created = id > 0 ? await c.env.DB.prepare("SELECT * FROM votes WHERE id = ?").bind(id).first<VoteRow>() : null;
  if (created) {
    if (body.data.publishMode === "immediate") {
      await c.env.DB.prepare("UPDATE votes SET notify_started_at = datetime('now') WHERE id = ?").bind(created.id).run();
    }
    fireVoteEvent(c, "vote.created", created, { details: { publishMode: body.data.publishMode, createdBy: actor.voter_name } });
    if (body.data.publishMode === "immediate") fireVoteEvent(c, "vote.started", created, { details: { reason: "created" } });
  }
  return c.json(created ? asVote(created) : { error: "Failed to create vote" }, created ? 201 : 500);
});
app.post("/api/admin/votes/:voteId/publish", async c => {
  const actor = await currentAccount(c);
  if (!actor || actor.admin_level < ADMIN_TIER1) return c.json({ error: "管理員權限不足。" }, 403);
  const vote = await voteByPublicId(c.env.DB, c.req.param("voteId"));
  if (!vote) return c.json({ error: "Vote not found" }, 404);
  if (vote.is_published) return c.json({ success: true, vote: asVote(vote) });
  if (Date.parse(vote.deadline) <= Date.now()) return c.json({ error: "草稿截止時間已過，請先建立新的投票。" }, 400);
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE votes SET is_published = 1, updated_at = datetime('now') WHERE id = ?").bind(vote.id),
    auditStatement(c.env.DB, actor, "vote.publish", "vote", vote.id, { voteName: vote.name, customId: vote.custom_id ?? "" }),
  ]);
  const published = await c.env.DB.prepare("SELECT * FROM votes WHERE id = ?").bind(vote.id).first<VoteRow>();
  if (published) {
    const startsAt = published.starts_at ? Date.parse(published.starts_at) : null;
    const openNow = (startsAt === null || !Number.isFinite(startsAt) || startsAt <= Date.now())
      && !published.is_closed
      && Date.parse(published.deadline) > Date.now();
    if (openNow) await c.env.DB.prepare("UPDATE votes SET notify_started_at = datetime('now') WHERE id = ?").bind(published.id).run();
    fireVoteEvent(c, "vote.published", published, { details: { publishedBy: actor.voter_name } });
    if (openNow) fireVoteEvent(c, "vote.started", published, { details: { reason: "published" } });
  }
  return c.json({ success: true, vote: published ? asVote(published) : asVote({ ...vote, is_published: 1 }) });
});
app.get("/api/votes/:id", async c => {
  const v = await voteByPublicId(c.env.DB, c.req.param("id"));
  const actor = await currentAccount(c);
  if (!v || (!v.is_published && (!actor || actor.admin_level < ADMIN_TIER1))) return c.json({ error: "Vote not found" }, 404);
  const ballots = await c.env.DB.prepare("SELECT * FROM ballots WHERE vote_id = ? ORDER BY created_at ASC").bind(v.id).all<BallotRow>();
  return c.json({ ...asVote(v, ballots.results.length), ballots: v.is_closed || new Date(v.deadline) < new Date() ? ballots.results.map(b => ({ ...b, selectedOptions: jsonArray<string>(b.selected_options) })) : [] });
});
app.post("/api/votes/:id/ballot", async c => {
  const body = z.object({ selectedOptions: z.array(z.string().min(1)), password: z.string().min(1) }).safeParse(await parseJson(c));
  if (!body.success) return c.json({ error: "Invalid input", details: body.error.issues }, 400);
  const v = await voteByPublicId(c.env.DB, c.req.param("id"));
  if (!v || !v.is_published) return c.json({ error: "Vote not found" }, 404);
  const id = v.id;
  if (v.starts_at && Date.parse(v.starts_at) > Date.now()) return c.json({ error: "Voting has not started yet." }, 403);
  if (v.is_closed) return c.json({ error: "This vote is closed" }, 403);
  if (new Date(v.deadline) < new Date()) return c.json({ error: "Voting deadline has passed" }, 403);
  const a = await currentAccount(c);
  if (!a) return c.json({ error: "請先登入。" }, 401);
  if (!(await verifyPassword(body.data.password, a.password_hash))) return c.json({ error: "Incorrect password." }, 403);
  const vi = findVoter(await voters(), a.voter_id);
  if (!vi) return c.json({ error: "Invalid voter ID. You are not registered as an eligible voter." }, 403);
  const ms = await members();
  if (!ms.memberStates.some(m => m.fullName === vi.countryName)) return c.json({ error: `Your country "${vi.countryName}" is not a member state.` }, 403);
  if ((await c.env.DB.prepare("SELECT id FROM ballots WHERE vote_id = ? AND country_name = ?").bind(id, vi.countryName).first())) return c.json({ error: "Your country has already voted in this vote. Each country may cast only one vote." }, 409);
  const options = jsonArray<string>(v.options);
  if (!body.data.selectedOptions.length || body.data.selectedOptions.some(o => !options.includes(o))) return c.json({ error: "Invalid selected options" }, 400);
  if (!v.allow_multiple && body.data.selectedOptions.length > 1) return c.json({ error: "This vote does not allow multiple selections" }, 400);
  await c.env.DB.prepare("INSERT INTO ballots (vote_id, voter_id, voter_name, country_name, selected_options) VALUES (?, ?, ?, ?, ?)").bind(id, a.voter_id, vi.voterName, vi.countryName, JSON.stringify(body.data.selectedOptions)).run();
  // Announce turnout without ever including the selected options in a webhook.
  fireVoteEvent(c, "ballot.cast", v, { details: { countryName: vi.countryName } });
  return c.json({ success: true, message: "Ballot cast successfully" });
});
app.get("/api/votes/:id/results", async c => {
  const v = await voteByPublicId(c.env.DB, c.req.param("id"));
  const actor = await currentAccount(c);
  if (!v || (!v.is_published && (!actor || actor.admin_level < ADMIN_TIER1))) return c.json({ error: "Vote not found" }, 404);
  const id = v.id;
  const ballots = await c.env.DB.prepare("SELECT * FROM ballots WHERE vote_id = ? ORDER BY created_at ASC").bind(id).all<BallotRow>();
  const allBallots = ballots.results ?? [];
  const isExpired = new Date(v.deadline) < new Date();
  const canRevealVoters = Boolean(v.is_closed) || isExpired;
  const countryVotes = allBallots.map(ballot => ({
    countryName: ballot.country_name,
    selectedOptions: jsonArray<string>(ballot.selected_options),
    votedAt: ballot.created_at,
  }));
  const rows = jsonArray<string>(v.options).map(option => {
    const matching = allBallots.filter(b => jsonArray<string>(b.selected_options).includes(option));
    const count = matching.length;
    const percentage = allBallots.length ? (count / allBallots.length * 100).toFixed(1) : "0.0";
    return {
      option,
      count,
      percentage,
      weightedCount: count,
      weightedPercentage: percentage,
      voters: canRevealVoters ? matching.map(b => `@${b.voter_name}`) : [],
    };
  });
  return c.json({ voteId: id, voteName: v.name, totalVoters: allBallots.length, isClosed: Boolean(v.is_closed), isExpired, results: rows, countryVotes });
});
app.post("/api/votes/:id/close", async c => {
  const actor = await currentAccount(c);
  if (!actor || actor.admin_level < ADMIN_TIER1) return c.json({ error: "管理員權限不足。" }, 403);
  const vote = await voteByPublicId(c.env.DB, c.req.param("id"));
  if (!vote) return c.json({ error: "Vote not found" }, 404);
  const id = vote.id;
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE votes SET is_closed = 1, notify_closed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").bind(id),
    auditStatement(c.env.DB, actor, "vote.close", "vote", id, { voteName: vote.name }),
  ]);
  fireVoteEvent(c, "vote.closed", { ...vote, is_closed: 1 }, { details: { reason: "manual", closedBy: actor.voter_name } });
  return c.json({ success: true, message: "Vote closed" });
});

app.post("/api/auth/register", async c => { const body = z.object({ voterId: z.string().min(1), password: z.string().min(4) }).safeParse(await parseJson(c)); if (!body.success) return c.json({ error: "請填寫 Discord ID 與密碼。" }, 400); const registration = (await registrations()).find(r => r.id === body.data.voterId); const staff = registration ? null : (await staffAccounts()).find(r => r.id === body.data.voterId); const identity = registration ?? (staff ? { countryName: "FUMO", voterName: staff.name, id: staff.id } : null); if (!identity) return c.json({ error: "此 ID 不在註冊名單中，請先由管理員加入註冊名單。" }, 403); if (await account(c.env.DB, body.data.voterId)) return c.json({ error: "Account already exists. Please login instead." }, 409); await c.env.DB.prepare("INSERT INTO voter_accounts (voter_id, voter_name, country_name, password_hash) VALUES (?, ?, ?, ?)").bind(body.data.voterId, identity.voterName, identity.countryName, await hashPassword(body.data.password)).run(); return c.json({ success: true, voterId: body.data.voterId, voterName: identity.voterName }); });
app.get("/api/auth/me", async c => { const a = await currentAccount(c); return a ? c.json(publicUser(a)) : c.json({ user: null }, 401); });
app.post("/api/auth/login", async c => { const body = z.object({ voterId: z.string().min(1), password: z.string().min(1) }).safeParse(await parseJson(c)); if (!body.success) return c.json({ error: "Invalid input" }, 400); const a = await account(c.env.DB, body.data.voterId); if (!a) return c.json({ error: "Account not found. Please register first." }, 403); if (!(await verifyPassword(body.data.password, a.password_hash))) return c.json({ error: "Incorrect password." }, 403); const session = await createSession(c.env.DB, a.voter_id); return json(publicUser(a), 200, { "Set-Cookie": sessionCookie(session.raw, session.maxAge) }); });
app.post("/api/auth/logout", async c => { const token = cookieValue(c, SESSION_COOKIE); if (token) await c.env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await sessionHash(token)).run(); return json({ success: true }, 200, { "Set-Cookie": clearSessionCookie() }); });
app.post("/api/auth/change-password", async c => { const body = z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(4) }).safeParse(await parseJson(c)); if (!body.success) return c.json({ error: "Invalid input" }, 400); const a = await currentAccount(c); if (!a || !(await verifyPassword(body.data.oldPassword, a.password_hash))) return c.json({ error: "Incorrect current password." }, 403); await c.env.DB.prepare("UPDATE voter_accounts SET password_hash = ?, updated_at = datetime('now') WHERE voter_id = ?").bind(await hashPassword(body.data.newPassword), a.voter_id).run(); return c.json({ success: true }); });

async function requireAdmin(db: D1Database, voterId: string, level: number) { const a = await account(db, voterId); return a && a.admin_level >= level ? a : null; }
 app.get("/api/admin/accounts", async c => { const a = await ((await currentAccount(c))?.admin_level ?? 0) >= ADMIN_TIER1 ? await currentAccount(c) : null; if (!a) return c.json({ error: "管理員權限不足。" }, 403); const rows = await c.env.DB.prepare("SELECT voter_id, voter_name, country_name, admin_level, created_at FROM voter_accounts ORDER BY created_at ASC").all(); return c.json((rows.results ?? []).map((row: any) => ({ voterId: row.voter_id, voterName: row.voter_name, countryName: row.country_name, adminLevel: row.admin_level, createdAt: row.created_at }))); });
app.post("/api/admin/accounts", async c => {
  const actor = await currentAccount(c);
  if (!actor || actor.admin_level < ADMIN_TIER1) return c.json({ error: "管理員權限不足。" }, 403);
  const body = z.object({ voterId: z.string().min(1), newPassword: z.string().min(4).optional(), adminLevel: z.number().int().min(0).max(9).optional() }).safeParse(await parseJson(c));
  if (!body.success) return c.json({ error: "Invalid input", details: body.error.issues }, 400);
  const target = await account(c.env.DB, body.data.voterId);
  if (!target) return c.json({ error: "Account not found" }, 404);
  if (body.data.newPassword && actor.admin_level < ADMIN_TIER2) return c.json({ error: "需要二階管理員權限。" }, 403);
  if (body.data.adminLevel !== undefined && (actor.admin_level < ADMIN_SUPER || (body.data.adminLevel >= ADMIN_SUPER && body.data.voterId !== DEFAULT_ADMIN_ID))) return c.json({ error: "需要最高管理員權限，且不可任意設定最高管理員。" }, 403);
  if (!body.data.newPassword && body.data.adminLevel === undefined) return c.json({ error: "No updates specified" }, 400);
  const statements: D1PreparedStatement[] = [];
  if (body.data.newPassword) {
    statements.push(c.env.DB.prepare("UPDATE voter_accounts SET password_hash = ?, updated_at = datetime('now') WHERE voter_id = ?").bind(await hashPassword(body.data.newPassword), body.data.voterId));
    statements.push(auditStatement(c.env.DB, actor, "account.password_reset", "account", body.data.voterId, { targetName: target.voter_name }));
  }
  if (body.data.adminLevel !== undefined) {
    statements.push(c.env.DB.prepare("UPDATE voter_accounts SET admin_level = ?, updated_at = datetime('now') WHERE voter_id = ?").bind(body.data.adminLevel, body.data.voterId));
    statements.push(auditStatement(c.env.DB, actor, "account.admin_level_changed", "account", body.data.voterId, { targetName: target.voter_name, previousAdminLevel: target.admin_level, newAdminLevel: body.data.adminLevel }));
  }
  await c.env.DB.batch(statements);
  return c.json({ success: true });
});
app.delete("/api/admin/votes/:voteId", async c => {
  const actor = await currentAccount(c);
  if (!actor || actor.admin_level < ADMIN_SUPER) return c.json({ error: "只有最高管理員才能刪除投票。" }, 403);
  const vote = await voteByPublicId(c.env.DB, c.req.param("voteId"));
  if (!vote) return c.json({ error: "Vote not found" }, 404);
  const voteId = vote.id;
  const count = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM ballots WHERE vote_id = ?").bind(voteId).first<{ count: number }>();
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM ballots WHERE vote_id = ?").bind(voteId),
    c.env.DB.prepare("DELETE FROM votes WHERE id = ?").bind(voteId),
    auditStatement(c.env.DB, actor, "vote.delete", "vote", voteId, { voteName: vote.name, deletedBallots: Number(count?.count ?? 0) }),
  ]);
  return c.json({ success: true, message: "Vote deleted" });
});
app.delete("/api/admin/ballots/:ballotId", async c => {
  const actor = await currentAccount(c);
  if (!actor || actor.admin_level < ADMIN_TIER2) return c.json({ error: "需要二階管理員權限。" }, 403);
  const ballotId = Number(c.req.param("ballotId"));
  if (!Number.isInteger(ballotId) || ballotId <= 0) return c.json({ error: "Invalid ballot ID" }, 400);
  const ballot = await c.env.DB.prepare("SELECT id, vote_id FROM ballots WHERE id = ?").bind(ballotId).first<{ id: number; vote_id: number }>();
  if (!ballot) return c.json({ error: "Ballot not found" }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM ballots WHERE id = ?").bind(ballotId),
    auditStatement(c.env.DB, actor, "ballot.delete", "ballot", ballotId, { voteId: ballot.vote_id }),
  ]);
  return c.json({ success: true });
});
app.get("/api/admin/audit-logs", async c => {
  const actor = await currentAccount(c);
  if (!actor || actor.admin_level < ADMIN_SUPER) return c.json({ error: "只有最高管理員才能查看管理操作紀錄。" }, 403);
  const rawLimit = Number(c.req.query("limit") ?? 25);
  const rawOffset = Number(c.req.query("offset") ?? 0);
  const limit = Number.isInteger(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 25;
  const offset = Number.isInteger(rawOffset) ? Math.min(1000000, Math.max(0, rawOffset)) : 0;
  const query = (c.req.query("q") ?? "").trim().slice(0, 100);
  const where = query ? " WHERE instr(lower(actor_voter_id || ' ' || actor_name || ' ' || action || ' ' || target_type || ' ' || target_id || ' ' || details_json), lower(?)) > 0" : "";
  const params = query ? [query] : [];
  const rows = await c.env.DB.prepare(`SELECT id, actor_voter_id, actor_name, action, target_type, target_id, details_json, created_at FROM admin_audit_logs${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .bind(...params, limit, offset).all<AuditLogRow>();
  const total = await c.env.DB.prepare(`SELECT COUNT(*) AS count FROM admin_audit_logs${where}`).bind(...params).first<{ count: number }>();
  const items = (rows.results ?? []).map(row => ({ id: row.id, actorVoterId: row.actor_voter_id, actorName: row.actor_name, action: row.action, targetType: row.target_type, targetId: row.target_id, details: parseAuditDetails(row.details_json), createdAt: row.created_at }));
  return c.json({ items, total: Number(total?.count ?? 0), limit, offset }, 200, { "Cache-Control": "no-store" });
});

app.get("/api/admin/votes/:voteId/ballots", async c => { const a = await ((await currentAccount(c))?.admin_level ?? 0) >= ADMIN_TIER1 ? await currentAccount(c) : null; if (!a) return c.json({ error: "管理員權限不足。" }, 403); const rows = await c.env.DB.prepare("SELECT * FROM ballots WHERE vote_id = ? ORDER BY created_at ASC").bind(Number(c.req.param("voteId"))).all<BallotRow>(); return c.json((rows.results ?? []).map(b => ({ ...b, selectedOptions: jsonArray<string>(b.selected_options) }))); });

async function requireTier2(c: any) {
  const actor = await currentAccount(c);
  return actor && actor.admin_level >= ADMIN_TIER2 ? actor : null;
}
async function webhookById(db: D1Database, value: string): Promise<WebhookRow | null> {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return (await db.prepare("SELECT * FROM vote_webhooks WHERE id = ?").bind(id).first<WebhookRow>()) ?? null;
}
async function auditWebhook(db: D1Database, actor: Account, action: string, webhookId: number, details: Record<string, unknown>) {
  await db.prepare("INSERT INTO admin_audit_logs (actor_voter_id, actor_name, action, target_type, target_id, details_json) VALUES (?, ?, ?, 'webhook', ?, ?)")
    .bind(actor.voter_id, actor.voter_name, action, String(webhookId), JSON.stringify(details)).run();
}
const webhookCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  url: z.string().trim().min(1).max(512),
  events: z.array(z.string().min(1)).min(1).max(WEBHOOK_EVENTS.length),
  discordRoleIds: z.array(z.string().regex(/^\d{17,20}$/)).max(10).optional(),
  mentionEvents: z.array(z.enum(WEBHOOK_EVENTS)).max(WEBHOOK_EVENTS.length).optional(),
  isEnabled: z.boolean().optional(),
});
const webhookUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  url: z.string().trim().min(1).max(512).optional(),
  events: z.array(z.string().min(1)).min(1).max(WEBHOOK_EVENTS.length).optional(),
  discordRoleIds: z.array(z.string().regex(/^\d{17,20}$/)).max(10).optional(),
  mentionEvents: z.array(z.enum(WEBHOOK_EVENTS)).max(WEBHOOK_EVENTS.length).optional(),
  isEnabled: z.boolean().optional(),
});

app.get("/api/admin/webhooks", async c => {
  const actor = await requireTier2(c);
  if (!actor) return c.json({ error: "需要二階管理員權限。" }, 403);
  const rows = await c.env.DB.prepare("SELECT * FROM vote_webhooks ORDER BY created_at DESC, id DESC").all<WebhookRow>();
  return c.json({ events: WEBHOOK_EVENTS, items: (rows.results ?? []).map(webhookSummary) }, 200, { "Cache-Control": "no-store" });
});
app.post("/api/admin/webhooks", async c => {
  const actor = await requireTier2(c);
  if (!actor) return c.json({ error: "需要二階管理員權限。" }, 403);
  const body = webhookCreateSchema.safeParse(await parseJson(c));
  if (!body.success) return c.json({ error: "Invalid input", details: body.error.issues }, 400);
  const target = validateWebhookUrl(body.data.url);
  if (!target.ok) return c.json({ error: target.error }, 400);
  const events = normalizeWebhookEvents(body.data.events);
  if (!events.length) return c.json({ error: "請至少選擇一個事件。" }, 400);
  const discordRoleIds = normalizeDiscordRoleIds(body.data.discordRoleIds ?? [DISCORD_ROLE_ID]);
  const mentionEvents = normalizeWebhookEvents(body.data.mentionEvents ?? [...WEBHOOK_EVENTS]);
  const count = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM vote_webhooks").first<{ count: number }>();
  if (Number(count?.count ?? 0) >= 10) return c.json({ error: "最多只能設定 10 個 Webhook。" }, 409);
  const secret = webhookSecret();
  const inserted = await c.env.DB.prepare("INSERT INTO vote_webhooks (name, url, secret, events, discord_role_ids, mention_events, is_enabled, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(body.data.name, target.url, secret, JSON.stringify(events), JSON.stringify(discordRoleIds), JSON.stringify(mentionEvents), body.data.isEnabled === false ? 0 : 1, actor.voter_id).run();
  const id = Number(inserted.meta?.last_row_id ?? 0);
  const row = id > 0 ? await c.env.DB.prepare("SELECT * FROM vote_webhooks WHERE id = ?").bind(id).first<WebhookRow>() : null;
  if (!row) return c.json({ error: "Failed to create webhook" }, 500);
  await auditWebhook(c.env.DB, actor, "webhook.create", id, { name: row.name, endpointHost: new URL(row.url).host, events, discordRoleCount: discordRoleIds.length, mentionEvents });
  return c.json({ success: true, webhook: webhookSummary(row), secret }, 201, { "Cache-Control": "no-store" });
});
app.patch("/api/admin/webhooks/:id", async c => {
  const actor = await requireTier2(c);
  if (!actor) return c.json({ error: "需要二階管理員權限。" }, 403);
  const existing = await webhookById(c.env.DB, c.req.param("id"));
  if (!existing) return c.json({ error: "Webhook not found" }, 404);
  const body = webhookUpdateSchema.safeParse(await parseJson(c));
  if (!body.success) return c.json({ error: "Invalid input", details: body.error.issues }, 400);
  const statements: D1PreparedStatement[] = [];
  const details: Record<string, unknown> = { name: existing.name };
  if (body.data.name !== undefined) { statements.push(c.env.DB.prepare("UPDATE vote_webhooks SET name = ? WHERE id = ?").bind(body.data.name, existing.id)); details.name = body.data.name; }
  if (body.data.url !== undefined) {
    const target = validateWebhookUrl(body.data.url);
    if (!target.ok) return c.json({ error: target.error }, 400);
    statements.push(c.env.DB.prepare("UPDATE vote_webhooks SET url = ? WHERE id = ?").bind(target.url, existing.id));
    details.endpointHost = new URL(target.url).host;
  }
  if (body.data.events !== undefined) {
    const events = normalizeWebhookEvents(body.data.events);
    if (!events.length) return c.json({ error: "請至少選擇一個事件。" }, 400);
    statements.push(c.env.DB.prepare("UPDATE vote_webhooks SET events = ? WHERE id = ?").bind(JSON.stringify(events), existing.id));
    details.events = events;
  }
  if (body.data.discordRoleIds !== undefined) {
    const discordRoleIds = normalizeDiscordRoleIds(body.data.discordRoleIds);
    statements.push(c.env.DB.prepare("UPDATE vote_webhooks SET discord_role_ids = ? WHERE id = ?").bind(JSON.stringify(discordRoleIds), existing.id));
    details.discordRoleCount = discordRoleIds.length;
  }
  if (body.data.mentionEvents !== undefined) {
    const mentionEvents = normalizeWebhookEvents(body.data.mentionEvents);
    statements.push(c.env.DB.prepare("UPDATE vote_webhooks SET mention_events = ? WHERE id = ?").bind(JSON.stringify(mentionEvents), existing.id));
    details.mentionEvents = mentionEvents;
  }
  if (body.data.isEnabled !== undefined) {
    statements.push(c.env.DB.prepare("UPDATE vote_webhooks SET is_enabled = ? WHERE id = ?").bind(body.data.isEnabled ? 1 : 0, existing.id));
    details.isEnabled = body.data.isEnabled;
  }
  if (!statements.length) return c.json({ error: "沒有要更新的欄位。" }, 400);
  statements.push(c.env.DB.prepare("UPDATE vote_webhooks SET updated_at = datetime('now') WHERE id = ?").bind(existing.id));
  await c.env.DB.batch(statements);
  await auditWebhook(c.env.DB, actor, "webhook.update", existing.id, details);
  const updated = await c.env.DB.prepare("SELECT * FROM vote_webhooks WHERE id = ?").bind(existing.id).first<WebhookRow>();
  return c.json({ success: true, webhook: updated ? webhookSummary(updated) : null });
});
app.post("/api/admin/webhooks/:id/secret", async c => {
  const actor = await requireTier2(c);
  if (!actor) return c.json({ error: "需要二階管理員權限。" }, 403);
  const existing = await webhookById(c.env.DB, c.req.param("id"));
  if (!existing) return c.json({ error: "Webhook not found" }, 404);
  const secret = webhookSecret();
  await c.env.DB.prepare("UPDATE vote_webhooks SET secret = ?, updated_at = datetime('now') WHERE id = ?").bind(secret, existing.id).run();
  await auditWebhook(c.env.DB, actor, "webhook.secret_rotated", existing.id, { name: existing.name });
  return c.json({ success: true, secret }, 200, { "Cache-Control": "no-store" });
});
app.post("/api/admin/webhooks/:id/test", async c => {
  const actor = await requireTier2(c);
  if (!actor) return c.json({ error: "需要二階管理員權限。" }, 403);
  const existing = await webhookById(c.env.DB, c.req.param("id"));
  if (!existing) return c.json({ error: "Webhook not found" }, 404);
  const payload = {
    event: "webhook.test",
    occurredAt: new Date().toISOString(),
    source: "fumo-api",
    content: "[FUMO] 測試通知：Webhook 連線正常。",
    text: "[FUMO] 測試通知：Webhook 連線正常。",
    vote: null,
    details: { requestedBy: actor.voter_name },
  };
  const result = await deliverWebhook(c.env, existing, "webhook.test", payload);
  await auditWebhook(c.env.DB, actor, "webhook.test", existing.id, { name: existing.name, statusCode: result.statusCode, ok: result.ok });
  return c.json({ success: result.ok, statusCode: result.statusCode, error: result.error }, result.ok ? 200 : 502);
});
app.get("/api/admin/webhooks/:id/deliveries", async c => {
  const actor = await requireTier2(c);
  if (!actor) return c.json({ error: "需要二階管理員權限。" }, 403);
  const existing = await webhookById(c.env.DB, c.req.param("id"));
  if (!existing) return c.json({ error: "Webhook not found" }, 404);
  const rawLimit = Number(c.req.query("limit") ?? 20);
  const limit = Number.isInteger(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 20;
  const rows = await c.env.DB.prepare("SELECT id, event, vote_id, status_code, ok, error, created_at FROM vote_webhook_deliveries WHERE webhook_id = ? ORDER BY created_at DESC, id DESC LIMIT ?")
    .bind(existing.id, limit).all();
  return c.json({ items: rows.results ?? [] }, 200, { "Cache-Control": "no-store" });
});
app.delete("/api/admin/webhooks/:id", async c => {
  const actor = await requireTier2(c);
  if (!actor) return c.json({ error: "需要二階管理員權限。" }, 403);
  const existing = await webhookById(c.env.DB, c.req.param("id"));
  if (!existing) return c.json({ error: "Webhook not found" }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM vote_webhook_deliveries WHERE webhook_id = ?").bind(existing.id),
    c.env.DB.prepare("DELETE FROM vote_webhooks WHERE id = ?").bind(existing.id),
  ]);
  await auditWebhook(c.env.DB, actor, "webhook.delete", existing.id, { name: existing.name, endpointHost: new URL(existing.url).host });
  return c.json({ success: true });
});
app.notFound(c => c.json({ error: "Not found" }, 404));
app.onError((err, c) => { console.error(err); return c.json({ error: "Internal server error" }, 500); });
export default {
  fetch: app.fetch,
  scheduled: (_event: ScheduledController, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(runVoteNotificationSweep(env).catch(error => console.error("Vote notification sweep failed", error)));
  },
} satisfies ExportedHandler<Env>;
