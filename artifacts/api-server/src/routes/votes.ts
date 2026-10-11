import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { votesTable, ballotsTable, voterAccountsTable, type InsertVote, type InsertBallot } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { z } from "zod";
import argon2 from "argon2";

const SHEET_ID = "1Iw5EY1LfFF-Ig9tJGVyWNBON20t9oE-0iFVFPPgsjk0";
const VOTER_GID = "1885327256";

// Default super-admin Discord ID
const DEFAULT_ADMIN_ID = "1406117683220709486";

// Admin levels: 0=user, 1=tier-1(basic: view+host), 2=tier-2(manage+edit), 9=super
const ADMIN_LEVEL_NONE = 0;
const ADMIN_LEVEL_TIER1 = 1;
const ADMIN_LEVEL_TIER2 = 2;
const ADMIN_LEVEL_SUPER = 9;

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  timeCost: 8,
  memoryCost: 128 * 1024, // 128 MiB in KiB
};

async function hashPassword(pwd: string): Promise<string> {
  return argon2.hash(pwd, ARGON2_OPTIONS);
}

async function verifyPassword(hash: string, pwd: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, pwd);
  } catch {
    return false;
  }
}

interface VoterRecord {
  countryName: string;
  reps: { name: string; id: string }[];
}

let memberStatesCache: { data: string[]; timestamp: number } | null = null;
let voterCache: { data: VoterRecord[]; timestamp: number } | null = null;
const SHEET_CACHE_TTL = 5 * 60 * 1000;

async function fetchSheet(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Sheets fetch failed: ${res.status} ${res.statusText} | ${text.slice(0, 200)}`);
  }
  return res.text();
}

async function getMemberStates(): Promise<string[]> {
  if (memberStatesCache && Date.now() - memberStatesCache.timestamp < SHEET_CACHE_TTL) {
    return memberStatesCache.data;
  }
  try {
    const res = await fetch("http://localhost:80/api/members");
    const data = (await res.json()) as { memberStates?: { fullName: string }[] };
    const names = data.memberStates?.map((m) => m.fullName) || [];
    memberStatesCache = { data: names, timestamp: Date.now() };
    return names;
  } catch {
    return memberStatesCache?.data || [];
  }
}

async function getVoterRecords(): Promise<VoterRecord[]> {
  if (voterCache && Date.now() - voterCache.timestamp < SHEET_CACHE_TTL) {
    return voterCache.data;
  }
  const csv = await fetchSheet(VOTER_GID);
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const col = {
    country: headers.indexOf("國家名稱"),
    r1name: headers.indexOf("第一代表名稱"),
    r1id: headers.indexOf("第一代表ID"),
    r2name: headers.indexOf("第二代表名稱"),
    r2id: headers.indexOf("第二代表ID"),
    r3name: headers.indexOf("第三代表名稱"),
    r3id: headers.indexOf("第三代表ID"),
  };

  const result: VoterRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    const countryName = col.country >= 0 ? parts[col.country]?.trim() : "";
    if (!countryName) continue;
    const reps: { name: string; id: string }[] = [];
    if (col.r1name >= 0 && col.r1id >= 0 && parts[col.r1id]?.trim()) {
      reps.push({ name: parts[col.r1name]?.trim(), id: parts[col.r1id]?.trim() });
    }
    if (col.r2name >= 0 && col.r2id >= 0 && parts[col.r2id]?.trim()) {
      reps.push({ name: parts[col.r2name]?.trim(), id: parts[col.r2id]?.trim() });
    }
    if (col.r3name >= 0 && col.r3id >= 0 && parts[col.r3id]?.trim()) {
      reps.push({ name: parts[col.r3name]?.trim(), id: parts[col.r3id]?.trim() });
    }
    if (reps.length > 0) {
      result.push({ countryName, reps });
    }
  }
  voterCache = { data: result, timestamp: Date.now() };
  return result;
}

function lookupVoter(voterRecords: VoterRecord[], voterId: string): { countryName: string; voterName: string } | null {
  for (const record of voterRecords) {
    const rep = record.reps.find((r) => r.id === voterId);
    if (rep) {
      return { countryName: record.countryName, voterName: rep.name };
    }
  }
  return null;
}

async function getAccount(voterId: string) {
  const rows = await db.select().from(voterAccountsTable).where(eq(voterAccountsTable.voterId, voterId)).limit(1);
  return rows[0] || null;
}

// Seed the default super-admin on startup
export async function seedDefaultAdmin() {
  try {
    const existing = await getAccount(DEFAULT_ADMIN_ID);
    if (!existing) {
      const hash = await hashPassword("changeme");
      await db.insert(voterAccountsTable).values({
        voterId: DEFAULT_ADMIN_ID,
        voterName: "系統最高管理員",
        countryName: "FUMO",
        passwordHash: hash,
        adminLevel: ADMIN_LEVEL_SUPER,
      });
      logger.info("Default super-admin account created (password: changeme)");
    } else if (existing.adminLevel < ADMIN_LEVEL_SUPER) {
      await db.update(voterAccountsTable)
        .set({ adminLevel: ADMIN_LEVEL_SUPER })
        .where(eq(voterAccountsTable.voterId, DEFAULT_ADMIN_ID));
      logger.info("Default super-admin account promoted to super level");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed default admin");
  }
}

// Schemas
const createVoteSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  deadline: z.string().datetime(),
  options: z.array(z.string().min(1)).min(2),
  allowMultiple: z.boolean().default(false),
  adminId: z.string().min(1),
});

const castBallotSchema = z.object({
  voterId: z.string().min(1),
  password: z.string().min(1),
  selectedOptions: z.array(z.string().min(1)),
});

const closeVoteSchema = z.object({
  adminId: z.string().min(1),
});

const registerSchema = z.object({
  voterId: z.string().min(1),
  password: z.string().min(4),
});

const adminAccountUpdateSchema = z.object({
  voterId: z.string().min(1),
  newPassword: z.string().min(4).optional(),
  adminLevel: z.number().int().min(0).max(9).optional(),
});

const router: IRouter = Router();

// List all votes
router.get("/votes", async (_req, res) => {
  try {
    const votes = await db.select().from(votesTable).orderBy(votesTable.createdAt);
    const now = new Date();
    res.json(votes.map((v) => ({
      ...v,
      isExpired: new Date(v.deadline) < now,
      optionCount: v.options.length,
    })));
  } catch (err) {
    logger.error({ err }, "Error listing votes");
    res.status(500).json({ error: "Failed to list votes" });
  }
});

// Create a vote (admins only, level >= 1)
router.post("/votes", async (req, res) => {
  try {
    const parsed = createVoteSchema.parse(req.body);
    const admin = await getAccount(parsed.adminId);
    if (!admin || admin.adminLevel < ADMIN_LEVEL_TIER1) {
      res.status(403).json({ error: "管理員權限不足。只有管理員才能建立投票。" });
      return;
    }
    const newVote: InsertVote = {
      name: parsed.name,
      description: parsed.description || "",
      deadline: new Date(parsed.deadline),
      options: parsed.options,
      allowMultiple: parsed.allowMultiple,
    };
    const result = await db.insert(votesTable).values(newVote).returning();
    res.status(201).json(result[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    logger.error({ err }, "Error creating vote");
    res.status(500).json({ error: "Failed to create vote" });
  }
});

// Get vote by ID
router.get("/votes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid vote ID" });
      return;
    }
    const vote = await db.select().from(votesTable).where(eq(votesTable.id, id)).limit(1);
    if (vote.length === 0) {
      res.status(404).json({ error: "Vote not found" });
      return;
    }
    const ballots = await db.select().from(ballotsTable).where(eq(ballotsTable.voteId, id));
    const now = new Date();
    res.json({
      ...vote[0],
      isExpired: new Date(vote[0].deadline) < now,
      isClosed: vote[0].isClosed,
      ballotCount: ballots.length,
      ballots: vote[0].isClosed || new Date(vote[0].deadline) < now ? ballots : [],
    });
  } catch (err) {
    logger.error({ err }, "Error getting vote");
    res.status(500).json({ error: "Failed to get vote" });
  }
});

// Cast a ballot
router.post("/votes/:id/ballot", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid vote ID" });
      return;
    }
    const parsed = castBallotSchema.parse(req.body);
    const vote = await db.select().from(votesTable).where(eq(votesTable.id, id)).limit(1);
    if (vote.length === 0) {
      res.status(404).json({ error: "Vote not found" });
      return;
    }
    if (vote[0].isClosed) {
      res.status(403).json({ error: "This vote is closed" });
      return;
    }
    if (new Date(vote[0].deadline) < new Date()) {
      res.status(403).json({ error: "Voting deadline has passed" });
      return;
    }

    // Validate voter
    const voterRecords = await getVoterRecords();
    const voterInfo = lookupVoter(voterRecords, parsed.voterId);
    if (!voterInfo) {
      res.status(403).json({ error: "Invalid voter ID. You are not registered as an eligible voter." });
      return;
    }

    // Check if country is a member state
    const memberStates = await getMemberStates();
    if (!memberStates.includes(voterInfo.countryName)) {
      res.status(403).json({ error: `Your country "${voterInfo.countryName}" is not a member state. Only member states may vote.` });
      return;
    }

    // Check account exists and password matches
    const account = await getAccount(parsed.voterId);
    if (!account) {
      res.status(403).json({ error: "Account not registered. Please register your password first." });
      return;
    }
    const passwordOk = await verifyPassword(account.passwordHash, parsed.password);
    if (!passwordOk) {
      res.status(403).json({ error: "Incorrect password." });
      return;
    }

    // Check for duplicate vote
    const existing = await db
      .select()
      .from(ballotsTable)
      .where(and(eq(ballotsTable.voteId, id), eq(ballotsTable.voterId, parsed.voterId)));
    if (existing.length > 0) {
      res.status(409).json({ error: "You have already voted in this vote" });
      return;
    }

    // Validate selected options
    for (const opt of parsed.selectedOptions) {
      if (!vote[0].options.includes(opt)) {
        res.status(400).json({ error: `Invalid option: "${opt}"` });
        return;
      }
    }
    if (!vote[0].allowMultiple && parsed.selectedOptions.length > 1) {
      res.status(400).json({ error: "This vote does not allow multiple selections" });
      return;
    }
    if (parsed.selectedOptions.length === 0) {
      res.status(400).json({ error: "You must select at least one option" });
      return;
    }

    const ballot: InsertBallot = {
      voteId: id,
      voterId: parsed.voterId,
      voterName: voterInfo.voterName,
      countryName: voterInfo.countryName,
      selectedOptions: parsed.selectedOptions,
    };
    await db.insert(ballotsTable).values(ballot);
    res.json({ success: true, message: "Ballot cast successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    logger.error({ err }, "Error casting ballot");
    res.status(500).json({ error: "Failed to cast ballot" });
  }
});

// Get vote results
router.get("/votes/:id/results", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid vote ID" });
      return;
    }
    const vote = await db.select().from(votesTable).where(eq(votesTable.id, id)).limit(1);
    if (vote.length === 0) {
      res.status(404).json({ error: "Vote not found" });
      return;
    }
    const ballots = await db.select().from(ballotsTable).where(eq(ballotsTable.voteId, id));
    const totalVoters = ballots.length;

    const optionCounts: Record<string, { count: number; voters: string[] }> = {};
    for (const opt of vote[0].options) {
      optionCounts[opt] = { count: 0, voters: [] };
    }

    for (const ballot of ballots) {
      for (const opt of ballot.selectedOptions) {
        if (optionCounts[opt]) {
          optionCounts[opt].count += 1;
          optionCounts[opt].voters.push(`@${ballot.voterName}`);
        }
      }
    }

    const results = vote[0].options.map((opt) => {
      const count = optionCounts[opt].count;
      const pct = totalVoters > 0 ? ((count / totalVoters) * 100).toFixed(1) : "0.0";
      return {
        option: opt,
        count,
        percentage: pct,
        weightedCount: count,
        weightedPercentage: pct,
        voters: optionCounts[opt].voters,
      };
    });

    res.json({
      voteId: id,
      voteName: vote[0].name,
      totalVoters,
      isClosed: vote[0].isClosed,
      isExpired: new Date(vote[0].deadline) < new Date(),
      results,
    });
  } catch (err) {
    logger.error({ err }, "Error getting results");
    res.status(500).json({ error: "Failed to get results" });
  }
});

// Close a vote (admins level >= 1)
router.post("/votes/:id/close", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid vote ID" });
      return;
    }
    const parsed = closeVoteSchema.parse(req.body);
    const admin = await getAccount(parsed.adminId);
    if (!admin || admin.adminLevel < ADMIN_LEVEL_TIER1) {
      res.status(403).json({ error: "管理員權限不足。只有管理員才能關閉投票。" });
      return;
    }
    await db.update(votesTable).set({ isClosed: true }).where(eq(votesTable.id, id));
    res.json({ success: true, message: "Vote closed" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    logger.error({ err }, "Error closing vote");
    res.status(500).json({ error: "Failed to close vote" });
  }
});

// Register account (only voters in Google Sheets can register)
router.post("/auth/register", async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const voterRecords = await getVoterRecords();
    const voterInfo = lookupVoter(voterRecords, parsed.voterId);
    if (!voterInfo) {
      res.status(403).json({ error: "Invalid voter ID. Not registered in eligible voters list." });
      return;
    }
    const existing = await getAccount(parsed.voterId);
    if (existing) {
      res.status(409).json({ error: "Account already exists. Please login instead." });
      return;
    }
    const hash = await hashPassword(parsed.password);
    await db.insert(voterAccountsTable).values({
      voterId: parsed.voterId,
      voterName: voterInfo.voterName,
      countryName: voterInfo.countryName,
      passwordHash: hash,
      adminLevel: ADMIN_LEVEL_NONE,
    });
    res.json({ success: true, voterId: parsed.voterId, voterName: voterInfo.voterName });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    logger.error({ err }, "Error registering account");
    res.status(500).json({ error: "Failed to register account" });
  }
});

// Login
router.post("/auth/login", async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const account = await getAccount(parsed.voterId);
    if (!account) {
      res.status(403).json({ error: "Account not found. Please register first." });
      return;
    }
    const passwordOk = await verifyPassword(account.passwordHash, parsed.password);
    if (!passwordOk) {
      res.status(403).json({ error: "Incorrect password." });
      return;
    }
    res.json({
      success: true,
      voterId: account.voterId,
      voterName: account.voterName,
      countryName: account.countryName,
      adminLevel: account.adminLevel,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    logger.error({ err }, "Error logging in");
    res.status(500).json({ error: "Failed to login" });
  }
});

// Change own password
router.post("/auth/change-password", async (req, res) => {
  try {
    const parsed = z.object({
      voterId: z.string().min(1),
      oldPassword: z.string().min(1),
      newPassword: z.string().min(4),
    }).parse(req.body);
    const account = await getAccount(parsed.voterId);
    if (!account) {
      res.status(403).json({ error: "Account not found." });
      return;
    }
    const passwordOk = await verifyPassword(account.passwordHash, parsed.oldPassword);
    if (!passwordOk) {
      res.status(403).json({ error: "Incorrect current password." });
      return;
    }
    const hash = await hashPassword(parsed.newPassword);
    await db.update(voterAccountsTable).set({ passwordHash: hash }).where(eq(voterAccountsTable.voterId, parsed.voterId));
    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    logger.error({ err }, "Error changing password");
    res.status(500).json({ error: "Failed to change password" });
  }
});

// Admin: list all accounts (requires adminLevel >= 1)
router.get("/admin/accounts", async (req, res) => {
  try {
    const adminVoterId = req.query.adminId as string;
    if (!adminVoterId) {
      res.status(400).json({ error: "Missing adminId" });
      return;
    }
    const admin = await getAccount(adminVoterId);
    if (!admin || admin.adminLevel < ADMIN_LEVEL_TIER1) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
    const accounts = await db.select().from(voterAccountsTable);
    res.json(accounts.map((a) => ({
      voterId: a.voterId,
      voterName: a.voterName,
      countryName: a.countryName,
      adminLevel: a.adminLevel,
      createdAt: a.createdAt,
    })));
  } catch (err) {
    logger.error({ err }, "Error listing accounts");
    res.status(500).json({ error: "Failed to list accounts" });
  }
});

// Admin: update account (reset password requires level >= 2; set tier requires level >= 9)
router.post("/admin/accounts", async (req, res) => {
  try {
    const adminVoterId = req.query.adminId as string;
    if (!adminVoterId) {
      res.status(400).json({ error: "Missing adminId" });
      return;
    }
    const admin = await getAccount(adminVoterId);
    if (!admin || admin.adminLevel < ADMIN_LEVEL_TIER1) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
    const parsed = adminAccountUpdateSchema.parse(req.body);
    const target = await getAccount(parsed.voterId);
    if (!target) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const updates: Partial<{ passwordHash: string; adminLevel: number }> = {};

    if (parsed.newPassword !== undefined) {
      if (admin.adminLevel < ADMIN_LEVEL_TIER2) {
        res.status(403).json({ error: "二階管理員以上才能重設密碼。" });
        return;
      }
      updates.passwordHash = await hashPassword(parsed.newPassword);
    }

    if (parsed.adminLevel !== undefined) {
      if (admin.adminLevel < ADMIN_LEVEL_SUPER) {
        res.status(403).json({ error: "只有最高管理員才能修改管理員級別。" });
        return;
      }
      // Cannot promote to super admin level via this endpoint (super can only be set via direct DB)
      if (parsed.adminLevel >= ADMIN_LEVEL_SUPER && target.voterId !== DEFAULT_ADMIN_ID) {
        res.status(403).json({ error: "無法將其他用戶提升為最高管理員。" });
        return;
      }
      updates.adminLevel = parsed.adminLevel;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No updates specified" });
      return;
    }

    await db.update(voterAccountsTable).set(updates).where(eq(voterAccountsTable.voterId, parsed.voterId));
    res.json({ success: true, message: "Account updated" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid input", details: err.errors });
      return;
    }
    logger.error({ err }, "Error updating account");
    res.status(500).json({ error: "Failed to update account" });
  }
});

// Admin: delete an entire vote (super admin only)
router.delete("/admin/votes/:voteId", async (req, res) => {
  try {
    const adminVoterId = req.query.adminId as string;
    if (!adminVoterId) {
      res.status(400).json({ error: "Missing adminId" });
      return;
    }
    const admin = await getAccount(adminVoterId);
    if (!admin || admin.adminLevel < ADMIN_LEVEL_SUPER) {
      res.status(403).json({ error: "只有最高管理員才能刪除投票。" });
      return;
    }
    const voteId = parseInt(req.params.voteId, 10);
    if (isNaN(voteId)) {
      res.status(400).json({ error: "Invalid vote ID" });
      return;
    }
    const vote = await db.select({ id: votesTable.id }).from(votesTable).where(eq(votesTable.id, voteId)).limit(1);
    if (vote.length === 0) {
      res.status(404).json({ error: "Vote not found" });
      return;
    }
    await db.delete(ballotsTable).where(eq(ballotsTable.voteId, voteId));
    await db.delete(votesTable).where(eq(votesTable.id, voteId));
    res.json({ success: true, message: "Vote deleted" });
  } catch (err) {
    logger.error({ err }, "Error deleting vote");
    res.status(500).json({ error: "Failed to delete vote" });
  }
});

// Admin: delete a ballot (requires level >= 2)
router.delete("/admin/ballots/:ballotId", async (req, res) => {
  try {
    const adminVoterId = req.query.adminId as string;
    if (!adminVoterId) {
      res.status(400).json({ error: "Missing adminId" });
      return;
    }
    const admin = await getAccount(adminVoterId);
    if (!admin || admin.adminLevel < ADMIN_LEVEL_TIER2) {
      res.status(403).json({ error: "二階管理員以上才能刪除投票記錄。" });
      return;
    }
    const ballotId = parseInt(req.params.ballotId, 10);
    if (isNaN(ballotId)) {
      res.status(400).json({ error: "Invalid ballot ID" });
      return;
    }
    await db.delete(ballotsTable).where(eq(ballotsTable.id, ballotId));
    res.json({ success: true, message: "Ballot deleted" });
  } catch (err) {
    logger.error({ err }, "Error deleting ballot");
    res.status(500).json({ error: "Failed to delete ballot" });
  }
});

// Admin: get all ballots for a vote (requires level >= 1)
router.get("/admin/votes/:voteId/ballots", async (req, res) => {
  try {
    const adminVoterId = req.query.adminId as string;
    if (!adminVoterId) {
      res.status(400).json({ error: "Missing adminId" });
      return;
    }
    const admin = await getAccount(adminVoterId);
    if (!admin || admin.adminLevel < ADMIN_LEVEL_TIER1) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
    const voteId = parseInt(req.params.voteId, 10);
    if (isNaN(voteId)) {
      res.status(400).json({ error: "Invalid vote ID" });
      return;
    }
    const ballots = await db.select().from(ballotsTable).where(eq(ballotsTable.voteId, voteId));
    res.json(ballots);
  } catch (err) {
    logger.error({ err }, "Error fetching admin ballots" );
    res.status(500).json({ error: "Failed to fetch ballots" });
  }
});

// Get eligible voters
router.get("/voters", async (_req, res) => {
  try {
    const voters = await getVoterRecords();
    const memberStates = await getMemberStates();
    const eligible = voters
      .filter((v) => memberStates.includes(v.countryName))
      .map((v) => ({ countryName: v.countryName, reps: v.reps }));
    res.json(eligible);
  } catch (err) {
    logger.error({ err }, "Error fetching voters");
    res.status(500).json({ error: "Failed to fetch voters" });
  }
});

export default router;
