const DISCORD_ID_RE = /\b\d{15,25}\b/g;
const DISCORD_MENTION_RE = /<@!?\d{15,25}>/g;

export function normalizeCountryName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u00a0\u3000]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function cleanDisplayText(value, maxLength = 1024) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f\u200b-\u200d\ufeff]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function escapeDiscordMarkdown(value) {
  return cleanDisplayText(value).replace(/[\\`*_{}\[\]()<>#+\-.!|~]/g, "\\$&");
}

function statusLabel(status) {
  if (status === "member") return "成員國";
  if (status === "observer") return "觀察國";
  return "未提供";
}

function countryStates(memberData) {
  const states = Array.isArray(memberData?.allStates)
    ? memberData.allStates
    : [...(Array.isArray(memberData?.memberStates) ? memberData.memberStates : []), ...(Array.isArray(memberData?.observerStates) ? memberData.observerStates : [])];
  const byName = new Map();
  for (const state of states) {
    if (!state || typeof state !== "object") continue;
    const key = normalizeCountryName(state.fullName);
    if (!key) continue;
    const existing = byName.get(key);
    // 與 Bot 既有身分組比對邏輯一致：重複資料以觀察國狀態優先。
    if (!existing || state.status === "observer") byName.set(key, state);
  }
  return [...byName.values()];
}

function matchScore(state, query) {
  const values = [state.fullName, state.shortName, state.abbreviation]
    .map(normalizeCountryName)
    .filter(Boolean);
  if (values.some(value => value === query && normalizeCountryName(state.fullName) === query)) return 0;
  if (values.some(value => value === query)) return 1;
  if (values.some(value => value.startsWith(query))) return 2;
  if (values.some(value => value.includes(query))) return 3;
  return Number.POSITIVE_INFINITY;
}

export function findCountryMatches(memberData, query) {
  const normalizedQuery = normalizeCountryName(query);
  if (!normalizedQuery) return [];

  const scored = countryStates(memberData)
    .map(state => ({ state, score: matchScore(state, normalizedQuery) }))
    .filter(item => Number.isFinite(item.score));
  if (scored.length === 0) return [];

  const bestScore = Math.min(...scored.map(item => item.score));
  return scored.filter(item => item.score === bestScore).slice(0, 10).map(item => item.state);
}

function safeRepresentativeName(value) {
  const name = cleanDisplayText(value, 256)
    .replace(DISCORD_MENTION_RE, " ")
    .replace(DISCORD_ID_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name ? escapeDiscordMarkdown(name) : "";
}

export function getPublicRepresentativeNames(voters, countryName) {
  const target = normalizeCountryName(countryName);
  if (!target || !Array.isArray(voters)) return [];

  const names = [];
  const seen = new Set();
  for (const voter of voters) {
    if (normalizeCountryName(voter?.countryName) !== target || !Array.isArray(voter?.reps)) continue;
    for (const representative of voter.reps) {
      // 只讀取姓名欄位；刻意不存取或回傳 Discord ID。
      const name = safeRepresentativeName(representative?.name);
      const key = normalizeCountryName(name);
      if (!name || !key || seen.has(key)) continue;
      seen.add(key);
      names.push(name);
      if (names.length >= 3) return names;
    }
  }
  return names;
}

export function createCountryEmbedData(state, representativeNames, websiteUrl, { representativesAvailable = true } = {}) {
  const directoryUrl = new URL("/members", websiteUrl).toString();
  const representatives = Array.isArray(representativeNames)
    ? [...new Set(representativeNames.map(safeRepresentativeName).filter(Boolean))].slice(0, 3)
    : [];
  const fields = [
    { name: "會員狀態", value: statusLabel(state?.status), inline: true },
  ];

  const shortName = escapeDiscordMarkdown(state?.shortName);
  if (shortName) fields.push({ name: "國家簡稱", value: shortName, inline: true });
  const abbreviation = escapeDiscordMarkdown(state?.abbreviation);
  if (abbreviation) fields.push({ name: "國家代號", value: abbreviation, inline: true });
  const governmentType = escapeDiscordMarkdown(state?.governmentType);
  if (governmentType) fields.push({ name: "政體", value: governmentType, inline: true });

  fields.push({
    name: "代表",
    value: representatives.length
      ? representatives.join("\n").slice(0, 1024)
      : representativesAvailable ? "未列出公開代表姓名。" : "目前無法載入代表資料，請稍後重試。",
    inline: false,
  });

  const headOfState = escapeDiscordMarkdown(state?.headOfState);
  if (headOfState) fields.push({ name: "最高領袖", value: headOfState, inline: true });
  const primeMinister = escapeDiscordMarkdown(state?.primeMinister);
  if (primeMinister && normalizeCountryName(primeMinister) !== normalizeCountryName(state?.headOfState)) {
    fields.push({ name: "最高首腦", value: primeMinister, inline: true });
  }

  fields.push({ name: "國家連結", value: `[前往 FUMO 官方國家名錄](${directoryUrl})`, inline: false });
  return {
    title: escapeDiscordMarkdown(state?.fullName).slice(0, 256) || "FUMO 國家查詢",
    url: directoryUrl,
    color: state?.status === "member" ? 0x5865f2 : 0x8e7cc3,
    fields,
    footer: { text: "資料來源：FUMO 官方網站公開 API；代表姓名欄不顯示 Discord ID。" },
  };
}

export function formatCountryMatches(matches) {
  return matches.map(state => `・${cleanDisplayText(state?.fullName, 100)}（${statusLabel(state?.status)}）`).join("\n");
}
