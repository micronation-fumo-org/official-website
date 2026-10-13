export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  PROMOTE_CODE?: string;
}

type Row = Record<string, any>;
type VoterRecord = { countryName: string; reps: { name: string; id: string }[] };
type MemberState = {
  fullName: string;
  shortName: string;
  abbreviation?: string;
  headOfState?: string;
  primeMinister?: string;
  governmentType: string;
  status: "member" | "observer";
};

const SHEET_ID = "1Iw5EY1LfFF-Ig9tJGVyWNBON20t9oE-0iFVFPPgsjk0";
const VOTER_GID = "1885327256";
const MEMBER_GID = "643747757";
const OBSERVER_GID = "1983936747";
const DEFAULT_ADMIN_ID = "1406117683220709486";
const ADMIN_LEVEL_TIER1 = 1;
const ADMIN_LEVEL_TIER2 = 2;
const ADMIN_LEVEL_SUPER = 9;
const PBKDF2_ITERATIONS = 120_000;

let seeded = false;
let voterCache: { data: VoterRecord[]; timestamp: number } | null = null;
let memberCache: { data: { memberStates: MemberState[]; observerStates: MemberState[]; allStates: MemberState[] }; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

function json(data: unknown, status = 200): Response {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (status === 204) return new Response(null, { status, headers });
  return Response.json(data, { status, headers });
}

function error(message: string, status: number): Response {
  return json({ error: message }, status);
}

async function body(request: Request): Promise<Row> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? value as Row : {};
  } catch {
    return {};
  }
}

function now(): string {
  return new Date().toISOString();
}

function mapVote(row: Row): Row {
  const deadline = String(row.deadline);
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description ?? "",
    deadline,
    options: JSON.parse(String(row.options)),
    allowMultiple: Boolean(row.allowMultiple),
    isClosed: Boolean(row.isClosed),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isExpired: new Date(deadline).getTime() < Date.now(),
    ballotCount: Number(row.ballotCount ?? 0),
    optionCount: JSON.parse(String(row.options)).length,
  };
}

function mapBallot(row: Row): Row {
  return {
    id: Number(row.id),
    voteId: Number(row.vote_id ?? row.voteId),
    voterId: row.voter_id ?? row.voterId,
    voterName: row.voter_name ?? row.voterName,
    countryName: row.country_name ?? row.countryName,
    selectedOptions: typeof row.selected_options === "string" ? JSON.parse(row.selected_options) : row.selectedOptions,
    createdAt: row.created_at ?? row.createdAt,
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { current += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { result.push(current.trim()); current = ""; continue; }
    current += char;
  }
  result.push(current.trim());
  return result;
}

async function fetchSheet(gid: string): Promise<string> {
  const response = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`);
  if (!response.ok) throw new Error(`Google Sheets fetch failed: ${response.status}`);
  return response.text();
}

async function getVoterRecords(): Promise<VoterRecord[]> {
  if (voterCache && Date.now() - voterCache.timestamp < CACHE_TTL) return voterCache.data;
  const csv = await fetchSheet(VOTER_GID);
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const index = (name: string) => headers.indexOf(name);
  const result: VoterRecord[] = [];
  for (const line of lines.slice(1)) {
    const parts = parseCsvLine(line);
    const countryName = parts[index("國家名稱")] ?? "";
    if (!countryName) continue;
    const reps: { name: string; id: string }[] = [];
    for (const n of [1, 2, 3]) {
      const id = parts[index(`第${n === 1 ? "一" : n === 2 ? "二" : "三"}代表ID`)] ?? "";
      const name = parts[index(`第${n === 1 ? "一" : n === 2 ? "二" : "三"}代表名稱`)] ?? "";
      if (id) reps.push({ id, name });
    }
    if (reps.length) result.push({ countryName, reps });
  }
  voterCache = { data: result, timestamp: Date.now() };
  return result;
}

function lookupVoter(records: VoterRecord[], voterId: string): { countryName: string; voterName: string } | null {
  for (const record of records) {
    const rep = record.reps.find((candidate) => candidate.id === voterId);
    if (rep) return { countryName: record.countryName, voterName: rep.name };
  }
  return null;
}

function parseMembers(csv: string, status: "member" | "observer"): MemberState[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const at = (name: string) => headers.indexOf(name);
  return lines.slice(1).map((line) => {
    const p = parseCsvLine(line);
    return {
      fullName: p[at("國家名稱")] ?? "",
      shortName: p[at("國家簡稱")] ?? "",
      abbreviation: p[at("國家代號")] || undefined,
      headOfState: p[at("最高領袖")] || undefined,
      primeMinister: p[at("最高首腦")] || undefined,
      governmentType: p[at("國家體制")] ?? "",
      status,
    };
  }).filter((state) => state.fullName);
}

async function getMembers() {
  if (memberCache && Date.now() - memberCache.timestamp < CACHE_TTL) return memberCache.data;
  const [memberCsv, observerCsv] = await Promise.all([fetchSheet(MEMBER_GID), fetchSheet(OBSERVER_GID)]);
  const memberStates = parseMembers(memberCsv, "member");
  const observerStates = parseMembers(observerCsv, "observer");
  const data = { memberStates, observerStates, allStates: [...memberStates, ...observerStates] };
  memberCache = { data, timestamp: Date.now() };
  return data;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await derivePassword(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(digest)}`;
}

async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const expected = base64ToBytes(parts[3]);
  const actual = await derivePassword(password, base64ToBytes(parts[2]), Number(parts[1]));
  if (actual.length !== expected.length) return false;
  let difference = 0;
  actual.forEach((byte, index) => { difference |= byte ^ expected[index]; });
  return difference === 0;
}

async function getAccount(env: Env, voterId: string): Promise<Row | null> {
  return env.DB.prepare("SELECT * FROM voter_accounts WHERE voter_id = ? LIMIT 1").bind(voterId).first<Row>();
}

async function ensureDefaultAdmin(env: Env): Promise<void> {
  if (seeded) return;
  const existing = await getAccount(env, DEFAULT_ADMIN_ID);
  if (!existing) {
    await env.DB.prepare("INSERT INTO voter_accounts (voter_id, voter_name, country_name, password_hash, admin_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(DEFAULT_ADMIN_ID, "系統最高管理員", "FUMO", await hashPassword("changeme"), ADMIN_LEVEL_SUPER, now(), now()).run();
  } else if (Number(existing.admin_level) < ADMIN_LEVEL_SUPER) {
    await env.DB.prepare("UPDATE voter_accounts SET admin_level = ?, updated_at = ? WHERE voter_id = ?").bind(ADMIN_LEVEL_SUPER, now(), DEFAULT_ADMIN_ID).run();
  }
  seeded = true;
}

async function requireAdmin(env: Env, voterId: string, level: number): Promise<Row | null> {
  const account = await getAccount(env, voterId);
  return account && Number(account.admin_level) >= level ? account : null;
}

async function listVotes(env: Env): Promise<Row[]> {
  const rows = await env.DB.prepare(`SELECT v.*, (SELECT COUNT(*) FROM ballots b WHERE b.vote_id = v.id) AS ballotCount FROM votes v ORDER BY v.created_at`).all<Row>();
  return (rows.results ?? []).map(mapVote);
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const method = request.method;
  const parts = path.split("/").filter(Boolean);

  if (method === "OPTIONS") return json(null, 204);
  if (method === "GET" && path === "/healthz") {
    const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM votes").first<Row>();
    return json({ status: "ok", database: "d1", votes: Number(row?.count ?? 0), environment: env.ENVIRONMENT ?? "production" });
  }
  if (method === "GET" && path === "/members") return json({ ...(await getMembers()), source: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit` });
  if (method === "GET" && path === "/voters") {
    const [voters, members] = await Promise.all([getVoterRecords(), getMembers()]);
    return json(voters.filter((voter) => members.memberStates.some((state) => state.fullName === voter.countryName)));
  }

  if (method === "GET" && path === "/votes") return json(await listVotes(env));
  if (method === "POST" && path === "/votes") {
    const input = await body(request);
    if (!input.name || !input.deadline || !Array.isArray(input.options) || input.options.length < 2 || !input.adminId) return error("Invalid input", 400);
    if (!await requireAdmin(env, String(input.adminId), ADMIN_LEVEL_TIER1)) return error("管理員權限不足。只有管理員才能建立投票。", 403);
    const timestamp = now();
    const result = await env.DB.prepare("INSERT INTO votes (name, description, deadline, options, allow_multiple, is_closed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)")
      .bind(String(input.name), String(input.description ?? ""), String(input.deadline), JSON.stringify(input.options), input.allowMultiple ? 1 : 0, timestamp, timestamp).run();
    return json({ id: Number(result.meta.last_row_id), name: input.name, description: input.description ?? "", deadline: input.deadline, options: input.options, allowMultiple: Boolean(input.allowMultiple), isClosed: false, createdAt: timestamp, updatedAt: timestamp }, 201);
  }

  const voteId = parts[0] === "votes" ? Number(parts[1]) : NaN;
  if (parts[0] === "votes" && Number.isInteger(voteId) && parts.length === 2 && method === "GET") {
    const vote = await env.DB.prepare("SELECT v.*, (SELECT COUNT(*) FROM ballots b WHERE b.vote_id = v.id) AS ballotCount FROM votes v WHERE v.id = ?").bind(voteId).first<Row>();
    if (!vote) return error("Vote not found", 404);
    const mapped = mapVote(vote);
    const ballots = await env.DB.prepare("SELECT * FROM ballots WHERE vote_id = ? ORDER BY id").bind(voteId).all<Row>();
    return json({ ...mapped, ballots: mapped.isClosed || mapped.isExpired ? (ballots.results ?? []).map(mapBallot) : [] });
  }
  if (parts[0] === "votes" && Number.isInteger(voteId) && parts[2] === "results" && method === "GET") {
    const vote = await env.DB.prepare("SELECT * FROM votes WHERE id = ?").bind(voteId).first<Row>();
    if (!vote) return error("Vote not found", 404);
    const options = JSON.parse(String(vote.options)) as string[];
    const ballots = await env.DB.prepare("SELECT * FROM ballots WHERE vote_id = ? ORDER BY created_at ASC").bind(voteId).all<Row>();
    const allBallots = ballots.results ?? [];
    const isExpired = new Date(String(vote.deadline)).getTime() < Date.now();
    const countryVotes = allBallots.map((ballot) => ({
      countryName: ballot.country_name,
      selectedOptions: JSON.parse(String(ballot.selected_options)) as string[],
      votedAt: ballot.created_at,
    }));
    const counts: Record<string, { count: number; voters: string[] }> = Object.fromEntries(options.map((option) => [option, { count: 0, voters: [] }]));
    for (const ballot of allBallots) for (const option of JSON.parse(String(ballot.selected_options)) as string[]) if (counts[option]) { counts[option].count += 1; counts[option].voters.push(`@${ballot.voter_name}`); }
    const total = allBallots.length;
    const canRevealVoters = Boolean(vote.is_closed) || isExpired;
    return json({ voteId, voteName: vote.name, totalVoters: total, isClosed: Boolean(vote.is_closed), isExpired, results: options.map((option) => ({ option, count: counts[option].count, percentage: total ? ((counts[option].count / total) * 100).toFixed(1) : "0.0", weightedCount: counts[option].count, weightedPercentage: total ? ((counts[option].count / total) * 100).toFixed(1) : "0.0", voters: canRevealVoters ? counts[option].voters : [] })), countryVotes });
  }
  if (parts[0] === "votes" && Number.isInteger(voteId) && parts[2] === "ballot" && method === "POST") {
    const input = await body(request);
    const vote = await env.DB.prepare("SELECT * FROM votes WHERE id = ?").bind(voteId).first<Row>();
    if (!vote) return error("Vote not found", 404);
    if (vote.is_closed) return error("This vote is closed", 403);
    if (new Date(String(vote.deadline)).getTime() < Date.now()) return error("Voting deadline has passed", 403);
    if (!input.voterId || !input.password || !Array.isArray(input.selectedOptions) || !input.selectedOptions.length) return error("Invalid input", 400);
    const voterInfo = lookupVoter(await getVoterRecords(), String(input.voterId));
    if (!voterInfo) return error("Invalid voter ID. You are not registered as an eligible voter.", 403);
    const members = await getMembers();
    if (!members.memberStates.some((state) => state.fullName === voterInfo.countryName)) return error(`Your country "${voterInfo.countryName}" is not a member state. Only member states may vote.`, 403);
    const account = await getAccount(env, String(input.voterId));
    if (!account) return error("Account not registered. Please register your password first.", 403);
    if (!await verifyPassword(String(account.password_hash), String(input.password))) return error("Incorrect password.", 403);
    const duplicate = await env.DB.prepare("SELECT id FROM ballots WHERE vote_id = ? AND country_name = ?").bind(voteId, voterInfo.countryName).first();
    if (duplicate) return error("Your country has already voted in this vote. Each country may cast only one vote.", 409);
    const options = JSON.parse(String(vote.options)) as string[];
    if ((input.selectedOptions as unknown[]).some((option) => typeof option !== "string" || !options.includes(option))) return error("Invalid option", 400);
    if (!vote.allow_multiple && input.selectedOptions.length > 1) return error("This vote does not allow multiple selections", 400);
    await env.DB.prepare("INSERT INTO ballots (vote_id, voter_id, voter_name, country_name, selected_options, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(voteId, input.voterId, voterInfo.voterName, voterInfo.countryName, JSON.stringify(input.selectedOptions), now()).run();
    return json({ success: true, message: "Ballot cast successfully" });
  }
  if (parts[0] === "votes" && Number.isInteger(voteId) && parts[2] === "close" && method === "POST") {
    const input = await body(request);
    if (!await requireAdmin(env, String(input.adminId ?? ""), ADMIN_LEVEL_TIER1)) return error("管理員權限不足。只有管理員才能關閉投票。", 403);
    await env.DB.prepare("UPDATE votes SET is_closed = 1, updated_at = ? WHERE id = ?").bind(now(), voteId).run();
    return json({ success: true, message: "Vote closed" });
  }

  if (method === "POST" && path === "/auth/register") {
    const input = await body(request);
    if (!input.voterId || typeof input.password !== "string" || input.password.length < 4) return error("Invalid input", 400);
    const voterInfo = lookupVoter(await getVoterRecords(), String(input.voterId));
    if (!voterInfo) return error("Invalid voter ID. Not registered in eligible voters list.", 403);
    if (await getAccount(env, String(input.voterId))) return error("Account already exists. Please login instead.", 409);
    await env.DB.prepare("INSERT INTO voter_accounts (voter_id, voter_name, country_name, password_hash, admin_level, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)").bind(input.voterId, voterInfo.voterName, voterInfo.countryName, await hashPassword(input.password), now(), now()).run();
    return json({ success: true, voterId: input.voterId, voterName: voterInfo.voterName });
  }
  if (method === "POST" && path === "/auth/login") {
    const input = await body(request);
    const account = await getAccount(env, String(input.voterId ?? ""));
    if (!account) return error("Account not found. Please register first.", 403);
    if (!await verifyPassword(String(account.password_hash), String(input.password ?? ""))) return error("Incorrect password.", 403);
    return json({ success: true, voterId: account.voter_id, voterName: account.voter_name, countryName: account.country_name, adminLevel: Number(account.admin_level) });
  }
  if (method === "POST" && path === "/auth/change-password") {
    const input = await body(request);
    const account = await getAccount(env, String(input.voterId ?? ""));
    if (!account || !await verifyPassword(String(account.password_hash), String(input.oldPassword ?? ""))) return error("Incorrect current password.", 403);
    await env.DB.prepare("UPDATE voter_accounts SET password_hash = ?, updated_at = ? WHERE voter_id = ?").bind(await hashPassword(String(input.newPassword)), now(), input.voterId).run();
    return json({ success: true, message: "Password changed successfully" });
  }

  const adminId = url.searchParams.get("adminId") ?? "";
  if (path === "/admin/accounts" && method === "GET") {
    if (!await requireAdmin(env, adminId, ADMIN_LEVEL_TIER1)) return error("Admin access required.", 403);
    const rows = await env.DB.prepare("SELECT voter_id, voter_name, country_name, admin_level, created_at FROM voter_accounts ORDER BY id").all<Row>();
    return json((rows.results ?? []).map((account) => ({ voterId: account.voter_id, voterName: account.voter_name, countryName: account.country_name, adminLevel: Number(account.admin_level), createdAt: account.created_at })));
  }
  if (path === "/admin/accounts" && method === "POST") {
    const admin = await requireAdmin(env, adminId, ADMIN_LEVEL_TIER1);
    if (!admin) return error("Admin access required.", 403);
    const input = await body(request);
    const target = await getAccount(env, String(input.voterId ?? ""));
    if (!target) return error("Account not found", 404);
    if (input.newPassword !== undefined && Number(admin.admin_level) < ADMIN_LEVEL_TIER2) return error("二階管理員以上才能重設密碼。", 403);
    if (input.adminLevel !== undefined && Number(admin.admin_level) < ADMIN_LEVEL_SUPER) return error("只有最高管理員才能修改管理員級別。", 403);
    if (input.adminLevel !== undefined && Number(input.adminLevel) >= ADMIN_LEVEL_SUPER && target.voter_id !== DEFAULT_ADMIN_ID) return error("無法將其他用戶提升為最高管理員。", 403);
    if (input.newPassword === undefined && input.adminLevel === undefined) return error("No updates specified", 400);
    await env.DB.prepare("UPDATE voter_accounts SET password_hash = COALESCE(?, password_hash), admin_level = COALESCE(?, admin_level), updated_at = ? WHERE voter_id = ?").bind(input.newPassword === undefined ? null : await hashPassword(String(input.newPassword)), input.adminLevel === undefined ? null : Number(input.adminLevel), now(), input.voterId).run();
    return json({ success: true, message: "Account updated" });
  }
  if (parts[0] === "admin" && parts[1] === "votes" && parts.length === 3 && method === "DELETE") {
    const targetVoteId = Number(parts[2]);
    if (!Number.isInteger(targetVoteId) || targetVoteId <= 0) return error("Invalid vote ID", 400);
    if (!await requireAdmin(env, adminId, ADMIN_LEVEL_SUPER)) return error("只有最高管理員才能刪除投票。", 403);
    const vote = await env.DB.prepare("SELECT id FROM votes WHERE id = ?").bind(targetVoteId).first<Row>();
    if (!vote) return error("Vote not found", 404);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM ballots WHERE vote_id = ?").bind(targetVoteId),
      env.DB.prepare("DELETE FROM votes WHERE id = ?").bind(targetVoteId),
    ]);
    return json({ success: true, message: "Vote deleted" });
  }
  if (parts[0] === "admin" && parts[1] === "ballots" && method === "DELETE") {
    if (!await requireAdmin(env, adminId, ADMIN_LEVEL_TIER2)) return error("二階管理員以上才能刪除投票記錄。", 403);
    await env.DB.prepare("DELETE FROM ballots WHERE id = ?").bind(Number(parts[2])).run();
    return json({ success: true, message: "Ballot deleted" });
  }
  if (parts[0] === "admin" && parts[1] === "votes" && parts[3] === "ballots" && method === "GET") {
    if (!await requireAdmin(env, adminId, ADMIN_LEVEL_TIER1)) return error("Admin access required.", 403);
    const rows = await env.DB.prepare("SELECT * FROM ballots WHERE vote_id = ? ORDER BY id").bind(Number(parts[2])).all<Row>();
    return json((rows.results ?? []).map(mapBallot));
  }
  if (path === "/admin/promote" && method === "POST") {
    const input = await body(request);
    const expected = env.PROMOTE_CODE;
    if (!expected || input.code !== expected) return error("驗證碼錯誤或尚未設定。", 403);
    const account = await getAccount(env, String(input.voterId ?? ""));
    if (!account) return error("Account not found", 404);
    await env.DB.prepare("UPDATE voter_accounts SET admin_level = ?, updated_at = ? WHERE voter_id = ?").bind(ADMIN_LEVEL_TIER1, now(), input.voterId).run();
    return json({ success: true, message: "帳戶已提升為管理員" });
  }

  return error("Not found", 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      await ensureDefaultAdmin(env);
      return await handleApi(request, env);
    } catch (cause) {
      console.error(cause);
      return error("Internal server error", 500);
    }
  },
};
