import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

interface MemberState {
  fullName: string;
  shortName: string;
  abbreviation?: string;
  headOfState?: string;
  primeMinister?: string;
  governmentType: string;
  status: "member" | "observer";
}

const SHEET_ID = "1ebE_1cZa2nqcdPwrFq_60wmElO1GDNtoG8zFPciqHFo";
const MEMBER_GID = "1958346154";
const OBSERVER_GID = "1711083489";

async function fetchSheet(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Sheets fetch failed: ${res.status} ${res.statusText} | ${text.slice(0, 200)}`);
  }
  return res.text();
}

function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);

  return rows;
}

function findHeaderIndex(headers: string[], names: string[]): number {
  const normalizedHeaders = headers.map((header) => header.trim().replace(/\s+/g, ""));
  return names.reduce((foundIndex, name) => {
    if (foundIndex >= 0) return foundIndex;
    return normalizedHeaders.indexOf(name.trim().replace(/\s+/g, ""));
  }, -1);
}

function parseCSV(text: string): MemberState[] {
  const rows = parseCSVRows(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  const colIndex = {
    fullName: findHeaderIndex(headers, ["國家名稱", "正式國名"]),
    shortName: findHeaderIndex(headers, ["國家簡稱", "簡稱"]),
    abbreviation: findHeaderIndex(headers, ["國家代號", "代號", "縮寫"]),
    headOfState: findHeaderIndex(headers, ["最高領袖", "國家元首"]),
    primeMinister: findHeaderIndex(headers, ["最高首腦", "政府首腦"]),
    governmentType: findHeaderIndex(headers, ["國家體制", "政體"]),
  };

  const result: MemberState[] = [];
  for (const row of rows.slice(1)) {
    const parts = row.map((part) => part.trim());

    const fullName = colIndex.fullName >= 0 ? parts[colIndex.fullName]?.trim() : "";
    if (!fullName) continue;
    const hasAnyData = parts.slice(1).some((p) => p.trim());
    if (!hasAnyData) continue;

    result.push({
      fullName,
      shortName: colIndex.shortName >= 0 ? parts[colIndex.shortName]?.trim() || "" : "",
      abbreviation: colIndex.abbreviation >= 0 ? parts[colIndex.abbreviation]?.trim() || undefined : undefined,
      headOfState: colIndex.headOfState >= 0 ? parts[colIndex.headOfState]?.trim() || undefined : undefined,
      primeMinister: colIndex.primeMinister >= 0 ? parts[colIndex.primeMinister]?.trim() || undefined : undefined,
      governmentType: colIndex.governmentType >= 0 ? parts[colIndex.governmentType]?.trim() || "" : "",
      status: "member" as "member" | "observer",
    });
  }
  return result;
}

const router: IRouter = Router();

// Cache for 5 minutes
let cachedData: { memberStates: MemberState[]; observerStates: MemberState[]; allStates: MemberState[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getMemberStates(): Promise<{ memberStates: MemberState[]; observerStates: MemberState[]; allStates: MemberState[] }> {
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL_MS) {
    return {
      memberStates: cachedData.memberStates,
      observerStates: cachedData.observerStates,
      allStates: cachedData.allStates,
    };
  }

  try {
    const [memberCSV, observerCSV] = await Promise.all([
      fetchSheet(MEMBER_GID),
      fetchSheet(OBSERVER_GID),
    ]);

    const memberStates = parseCSV(memberCSV).map((m) => ({ ...m, status: "member" as const }));
    const observerStates = parseCSV(observerCSV).map((o) => ({ ...o, status: "observer" as const }));
    const allStates = [...memberStates, ...observerStates];

    cachedData = { memberStates, observerStates, allStates, timestamp: Date.now() };
    return { memberStates, observerStates, allStates };
  } catch (err) {
    logger.error({ err }, "Failed to fetch Google Sheets data");
    // If we have cached data, return stale data instead of error
    if (cachedData) {
      return {
        memberStates: cachedData.memberStates,
        observerStates: cachedData.observerStates,
        allStates: cachedData.allStates,
      };
    }
    throw err;
  }
}

router.get("/members", async (_req, res) => {
  try {
    const data = await getMemberStates();
    res.json({
      memberStates: data.memberStates,
      observerStates: data.observerStates,
      allStates: data.allStates,
      source: "https://docs.google.com/spreadsheets/d/1ebE_1cZa2nqcdPwrFq_60wmElO1GDNtoG8zFPciqHFo/edit",
      cached: cachedData ? Date.now() - cachedData.timestamp > CACHE_TTL_MS : false,
      lastUpdated: cachedData ? new Date(cachedData.timestamp).toISOString() : null,
    });
  } catch (err) {
    logger.error({ err }, "Error in /members endpoint");
    res.status(500).json({
      error: "Failed to fetch member states from Google Sheets",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
