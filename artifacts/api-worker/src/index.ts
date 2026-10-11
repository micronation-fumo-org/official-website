import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

interface Env {
  DB: D1Database;
  CORS_ORIGIN?: string;
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
const DEFAULT_ADMIN_ID = "1406117683220709486";
const ADMIN_NONE = 0;
const ADMIN_TIER1 = 1;
const ADMIN_TIER2 = 2;
const ADMIN_SUPER = 9;
const PBKDF2_ITERATIONS = 100000;

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const parseJson = async (c: any) => { try { return await c.req.json(); } catch { return null; } };
const account = async (db: D1Database, voterId: string) => (await db.prepare("SELECT * FROM voter_accounts WHERE voter_id = ?").bind(voterId).first<Account>()) ?? null;
const jsonArray = <T>(value: string): T[] => { try { return JSON.parse(value) as T[]; } catch { return []; } };
const asVote = (v: VoteRow, ballotCount = 0) => ({ id: v.id, name: v.name, description: v.description, deadline: v.deadline, options: jsonArray<string>(v.options), allowMultiple: Boolean(v.allow_multiple), isClosed: Boolean(v.is_closed), isExpired: new Date(v.deadline) < new Date(), ballotCount, createdAt: v.created_at, updatedAt: v.updated_at });

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
async function sheet(gid: string) { const r = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`); if (!r.ok) throw new Error(`Google Sheet ${r.status}`); return csvRows(await r.text()); }
interface Member { fullName: string; shortName: string; abbreviation?: string; headOfState?: string; primeMinister?: string; governmentType: string; status: "member" | "observer"; }
interface Voter { countryName: string; reps: { name: string; id: string }[]; }
interface RegistrationEntry { countryName: string; voterName: string; id: string; }
let membersCache: { value: { memberStates: Member[]; observerStates: Member[]; allStates: Member[] }; at: number } | null = null;
let votersCache: { value: Voter[]; at: number } | null = null;
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

const enc = new TextEncoder();
async function hashPassword(password: string) { const salt = crypto.getRandomValues(new Uint8Array(16)); const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]); const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256); return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(new Uint8Array(bits))}`; }
async function verifyPassword(password: string, stored: string) { const [kind, iter, salt, expected] = stored.split("$"); if (kind !== "pbkdf2") return false; const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]); const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromB64(salt), iterations: Number(iter), hash: "SHA-256" }, key, 256); return toB64(new Uint8Array(bits)) === expected; }
function toB64(bytes: Uint8Array) { let s = ""; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s); }
function fromB64(value: string) { const s = atob(value); return Uint8Array.from(s, c => c.charCodeAt(0)); }

const app: App = new Hono();
app.use("/*", async (c, next) => cors({ origin: c.env.CORS_ORIGIN || "*", allowMethods: ["GET", "POST", "DELETE", "OPTIONS"], allowHeaders: ["Content-Type"] })(c, next));
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
app.get("/api/healthz", c => c.json({ status: "ok" }));
app.get("/api/members", async c => { try { return c.json({ ...(await members()), source: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`, cached: Boolean(membersCache), lastUpdated: membersCache ? new Date(membersCache.at).toISOString() : null }); } catch (e) { return c.json({ error: "Failed to fetch member states", message: String(e) }, 500); } });
app.get("/api/voters", async c => { try { return c.json(await voters()); } catch (e) { return c.json({ error: "Failed to fetch voters", message: String(e) }, 500); } });

app.get("/api/votes", async c => { const rows = await c.env.DB.prepare("SELECT v.*, COUNT(b.id) AS ballot_count FROM votes v LEFT JOIN ballots b ON b.vote_id = v.id GROUP BY v.id ORDER BY v.created_at ASC").all<VoteRow & { ballot_count: number }>(); return c.json((rows.results ?? []).map(v => asVote(v, v.ballot_count))); });
app.post("/api/votes", async c => { const body = z.object({ name: z.string().min(1), description: z.string().optional(), deadline: z.string().datetime(), options: z.array(z.string().min(1)).min(2), allowMultiple: z.boolean().default(false), adminId: z.string().min(1) }).safeParse(await parseJson(c)); if (!body.success) return c.json({ error: "Invalid input", details: body.error.issues }, 400); const a = await account(c.env.DB, body.data.adminId); if (!a || a.admin_level < ADMIN_TIER1) return c.json({ error: "管理員權限不足。只有管理員才能建立投票。" }, 403); const r = await c.env.DB.prepare("INSERT INTO votes (name, description, deadline, options, allow_multiple) VALUES (?, ?, ?, ?, ?) RETURNING *").bind(body.data.name, body.data.description ?? "", body.data.deadline, JSON.stringify(body.data.options), body.data.allowMultiple ? 1 : 0).first<VoteRow>(); return c.json(r ? asVote(r) : { error: "Failed to create vote" }, 201); });
app.get("/api/votes/:id", async c => { const id = Number(c.req.param("id")); if (!Number.isInteger(id)) return c.json({ error: "Invalid vote ID" }, 400); const v = await c.env.DB.prepare("SELECT * FROM votes WHERE id = ?").bind(id).first<VoteRow>(); if (!v) return c.json({ error: "Vote not found" }, 404); const ballots = await c.env.DB.prepare("SELECT * FROM ballots WHERE vote_id = ? ORDER BY created_at ASC").bind(id).all<BallotRow>(); return c.json({ ...asVote(v, ballots.results.length), ballots: v.is_closed || new Date(v.deadline) < new Date() ? ballots.results.map(b => ({ ...b, selectedOptions: jsonArray<string>(b.selected_options) })) : [] }); });
app.post("/api/votes/:id/ballot", async c => { const id = Number(c.req.param("id")); const body = z.object({ voterId: z.string().min(1), password: z.string().min(1), selectedOptions: z.array(z.string().min(1)) }).safeParse(await parseJson(c)); if (!body.success || !Number.isInteger(id)) return c.json({ error: "Invalid input" }, 400); const v = await c.env.DB.prepare("SELECT * FROM votes WHERE id = ?").bind(id).first<VoteRow>(); if (!v) return c.json({ error: "Vote not found" }, 404); if (v.is_closed) return c.json({ error: "This vote is closed" }, 403); if (new Date(v.deadline) < new Date()) return c.json({ error: "Voting deadline has passed" }, 403); const vi = findVoter(await voters(), body.data.voterId); if (!vi) return c.json({ error: "Invalid voter ID. You are not registered as an eligible voter." }, 403); const ms = await members(); if (!ms.memberStates.some(m => m.fullName === vi.countryName)) return c.json({ error: `Your country "${vi.countryName}" is not a member state.` }, 403); const a = await account(c.env.DB, body.data.voterId); if (!a) return c.json({ error: "Account not registered. Please register your password first." }, 403); if (!(await verifyPassword(body.data.password, a.password_hash))) return c.json({ error: "Incorrect password." }, 403); if ((await c.env.DB.prepare("SELECT id FROM ballots WHERE vote_id = ? AND voter_id = ?").bind(id, body.data.voterId).first())) return c.json({ error: "You have already voted in this vote" }, 409); const options = jsonArray<string>(v.options); if (!body.data.selectedOptions.length || body.data.selectedOptions.some(o => !options.includes(o))) return c.json({ error: "Invalid selected options" }, 400); if (!v.allow_multiple && body.data.selectedOptions.length > 1) return c.json({ error: "This vote does not allow multiple selections" }, 400); await c.env.DB.prepare("INSERT INTO ballots (vote_id, voter_id, voter_name, country_name, selected_options) VALUES (?, ?, ?, ?, ?)").bind(id, body.data.voterId, vi.voterName, vi.countryName, JSON.stringify(body.data.selectedOptions)).run(); return c.json({ success: true, message: "Ballot cast successfully" }); });
app.get("/api/votes/:id/results", async c => { const id = Number(c.req.param("id")); const v = await c.env.DB.prepare("SELECT * FROM votes WHERE id = ?").bind(id).first<VoteRow>(); if (!v) return c.json({ error: "Vote not found" }, 404); const bs = await c.env.DB.prepare("SELECT * FROM ballots WHERE vote_id = ?").bind(id).all<BallotRow>(); const rows = jsonArray<string>(v.options).map(option => { const matching = (bs.results ?? []).filter(b => jsonArray<string>(b.selected_options).includes(option)); const count = matching.length; const percentage = bs.results.length ? (count / bs.results.length * 100).toFixed(1) : "0.0"; return { option, count, percentage, weightedCount: count, weightedPercentage: percentage, voters: matching.map(b => `@${b.voter_name}`) }; }); return c.json({ voteId: id, voteName: v.name, totalVoters: bs.results.length, isClosed: Boolean(v.is_closed), isExpired: new Date(v.deadline) < new Date(), results: rows }); });
app.post("/api/votes/:id/close", async c => { const id = Number(c.req.param("id")); const body = z.object({ adminId: z.string().min(1) }).safeParse(await parseJson(c)); if (!body.success) return c.json({ error: "Invalid input" }, 400); const a = await account(c.env.DB, body.data.adminId); if (!a || a.admin_level < ADMIN_TIER1) return c.json({ error: "管理員權限不足。" }, 403); await c.env.DB.prepare("UPDATE votes SET is_closed = 1, updated_at = datetime('now') WHERE id = ?").bind(id).run(); return c.json({ success: true, message: "Vote closed" }); });

app.post("/api/auth/register", async c => { const body = z.object({ voterId: z.string().min(1), password: z.string().min(4) }).safeParse(await parseJson(c)); if (!body.success) return c.json({ error: "請填寫 Discord ID 與密碼。" }, 400); const registration = (await registrations()).find(r => r.id === body.data.voterId); if (!registration) return c.json({ error: "此 ID 不在註冊名單中，請先由管理員加入註冊名單。" }, 403); if (await account(c.env.DB, body.data.voterId)) return c.json({ error: "Account already exists. Please login instead." }, 409); await c.env.DB.prepare("INSERT INTO voter_accounts (voter_id, voter_name, country_name, password_hash) VALUES (?, ?, ?, ?)").bind(body.data.voterId, registration.voterName, registration.countryName, await hashPassword(body.data.password)).run(); return c.json({ success: true, voterId: body.data.voterId, voterName: registration.voterName }); });
app.post("/api/auth/login", async c => { const body = z.object({ voterId: z.string().min(1), password: z.string().min(1) }).safeParse(await parseJson(c)); if (!body.success) return c.json({ error: "Invalid input" }, 400); const a = await account(c.env.DB, body.data.voterId); if (!a) return c.json({ error: "Account not found. Please register first." }, 403); if (!(await verifyPassword(body.data.password, a.password_hash))) return c.json({ error: "Incorrect password." }, 403); return c.json({ success: true, voterId: a.voter_id, voterName: a.voter_name, countryName: a.country_name, adminLevel: a.admin_level }); });
app.post("/api/auth/change-password", async c => { const body = z.object({ voterId: z.string().min(1), oldPassword: z.string().min(1), newPassword: z.string().min(4) }).safeParse(await parseJson(c)); if (!body.success) return c.json({ error: "Invalid input" }, 400); const a = await account(c.env.DB, body.data.voterId); if (!a || !(await verifyPassword(body.data.oldPassword, a.password_hash))) return c.json({ error: "Incorrect current password." }, 403); await c.env.DB.prepare("UPDATE voter_accounts SET password_hash = ?, updated_at = datetime('now') WHERE voter_id = ?").bind(await hashPassword(body.data.newPassword), body.data.voterId).run(); return c.json({ success: true }); });

async function requireAdmin(db: D1Database, voterId: string, level: number) { const a = await account(db, voterId); return a && a.admin_level >= level ? a : null; }
 app.get("/api/admin/accounts", async c => { const a = await requireAdmin(c.env.DB, c.req.query("adminId") ?? "", ADMIN_TIER1); if (!a) return c.json({ error: "管理員權限不足。" }, 403); const rows = await c.env.DB.prepare("SELECT voter_id, voter_name, country_name, admin_level, created_at FROM voter_accounts ORDER BY created_at ASC").all(); return c.json((rows.results ?? []).map((row: any) => ({ voterId: row.voter_id, voterName: row.voter_name, countryName: row.country_name, adminLevel: row.admin_level, createdAt: row.created_at }))); });
app.post("/api/admin/accounts", async c => { const admin = await requireAdmin(c.env.DB, c.req.query("adminId") ?? "", ADMIN_TIER1); if (!admin) return c.json({ error: "管理員權限不足。" }, 403); const body = z.object({ voterId: z.string().min(1), newPassword: z.string().min(4).optional(), adminLevel: z.number().int().min(0).max(9).optional() }).safeParse(await parseJson(c)); if (!body.success) return c.json({ error: "Invalid input" }, 400); const target = await account(c.env.DB, body.data.voterId); if (!target) return c.json({ error: "Account not found" }, 404); if (body.data.newPassword) { if (admin.admin_level < ADMIN_TIER2) return c.json({ error: "需要二階管理員權限。" }, 403); await c.env.DB.prepare("UPDATE voter_accounts SET password_hash = ?, updated_at = datetime('now') WHERE voter_id = ?").bind(await hashPassword(body.data.newPassword), body.data.voterId).run(); } if (body.data.adminLevel !== undefined) { if (admin.admin_level < ADMIN_SUPER || (body.data.adminLevel >= ADMIN_SUPER && body.data.voterId !== DEFAULT_ADMIN_ID)) return c.json({ error: "需要最高管理員權限，且不可任意設定最高管理員。" }, 403); await c.env.DB.prepare("UPDATE voter_accounts SET admin_level = ?, updated_at = datetime('now') WHERE voter_id = ?").bind(body.data.adminLevel, body.data.voterId).run(); } return c.json({ success: true }); });
app.delete("/api/admin/ballots/:ballotId", async c => { const a = await requireAdmin(c.env.DB, c.req.query("adminId") ?? "", ADMIN_TIER2); if (!a) return c.json({ error: "需要二階管理員權限。" }, 403); await c.env.DB.prepare("DELETE FROM ballots WHERE id = ?").bind(Number(c.req.param("ballotId"))).run(); return c.json({ success: true }); });
app.get("/api/admin/votes/:voteId/ballots", async c => { const a = await requireAdmin(c.env.DB, c.req.query("adminId") ?? "", ADMIN_TIER1); if (!a) return c.json({ error: "管理員權限不足。" }, 403); const rows = await c.env.DB.prepare("SELECT * FROM ballots WHERE vote_id = ? ORDER BY created_at ASC").bind(Number(c.req.param("voteId"))).all<BallotRow>(); return c.json((rows.results ?? []).map(b => ({ ...b, selectedOptions: jsonArray<string>(b.selected_options) }))); });

app.notFound(c => c.json({ error: "Not found" }, 404));
app.onError((err, c) => { console.error(err); return c.json({ error: "Internal server error" }, 500); });
export default app;
