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

const SHEET_ID = "1Iw5EY1LfFF-Ig9tJGVyWNBON20t9oE-0iFVFPPgsjk0";
const MEMBER_GID = "643747757";
const OBSERVER_GID = "1983936747";

const HEADERS_TO_FETCH = [
  "流水號",
  "國家名稱",
  "國家簡稱",
  "國家代號",
  "最高領袖",
  "最高首腦",
  "國家體制",
  "駐國總幹事",
  "備註",
];

const HEADERS_TO_FETCH2 = [
  "流水號",
  "國家名稱",
  "國家簡稱",
  "國家代號",
  "最高領袖",
  "最高首腦",
  "國家體制",
  "駐國總幹事",
  "備註",
];

async function fetchSheet(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Sheets fetch failed: ${res.status} ${res.statusText} | ${text.slice(0, 200)}`);
  }
  return res.text();
}

function parseCSV(text: string): MemberState[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const colIndex = {
    fullName: headers.indexOf("國家名稱"),
    shortName: headers.indexOf("國家簡稱"),
    abbreviation: headers.indexOf("國家代號"),
    headOfState: headers.indexOf("最高領袖"),
    primeMinister: headers.indexOf("最高首腦"),
    governmentType: headers.indexOf("國家體制"),
  };

  const result: MemberState[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Simple CSV parsing - split by commas
    const parts = line.split(",");
    if (parts.length < 2) continue;

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
      source: "https://docs.google.com/spreadsheets/d/1Iw5EY1LfFF-Ig9tJGVyWNBON20t9oE-0iFVFPPgsjk0/edit",
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
