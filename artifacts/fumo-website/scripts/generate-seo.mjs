import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const SITE_ORIGIN = "https://www.micronationfumo.org";
const SITE_NAME = "聯合微國家組織 F.U.M.O.";
const PUBLIC_DIR = path.resolve(process.cwd(), "dist/public");
const API_BASE = (process.env.VITE_API_BASE_URL || "https://fumo-api.micronationfumo.workers.dev").replace(/\/$/, "");
const escapeHtml = (value = "") => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const text = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

async function fetchJson(route, fallback) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`${API_BASE}${route}`, { signal: controller.signal, headers: { accept: "application/json" } });
    if (response.ok) return await response.json();
  } catch {
  } finally {
    clearTimeout(timer);
  }
  try {
    const raw = execFileSync("curl", ["--fail", "--silent", "--show-error", "--connect-timeout", "3", "--max-time", "6", "-H", "accept: application/json", `${API_BASE}${route}`], { encoding: "utf8", timeout: 7000, maxBuffer: 8 * 1024 * 1024 });
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function parseRegulations(source) {
  const start = source.indexOf("export const regulations");
  const open = source.indexOf("[", start);
  if (start < 0 || open < 0) return [];
  let depth = 0, quote = "", escaped = false, objectStart = -1;
  const objects = [];
  for (let i = open + 1; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "{") { if (depth === 0) objectStart = i; depth++; }
    else if (char === "}" && depth > 0) {
      depth--;
      if (depth === 0 && objectStart >= 0) objects.push(source.slice(objectStart, i + 1));
    }
    else if (char === "]" && depth === 0) break;
  }
  const field = (block, name) => {
    const match = block.match(new RegExp(`\\b${name}\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`));
    if (!match) return "";
    try { return JSON.parse(`"${match[1]}"`); } catch { return match[1]; }
  };
  return objects.map((block) => ({
    name: field(block, "name"),
    nameEn: field(block, "nameEn"),
    path: field(block, "hackmdPath"),
    description: field(block, "description"),
    status: field(block, "status"),
  })).filter((entry) => entry.name);
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function markdownToHtml(source) {
  const lines = source.replace(/\r/g, "").split("\n").filter((line) => !/^`[^`]+`(?:\s+`[^`]+`)*$/.test(line.trim()));
  const blocks = [];
  let paragraph = [];
  let list = [];
  const flushParagraph = () => { if (paragraph.length) blocks.push(`<p>${paragraph.map(inlineMarkdown).join(" ")}</p>`); paragraph = []; };
  const flushList = () => { if (list.length) blocks.push(`<ol>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`); list = []; };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const level = Math.min(heading[1].length + 1, 6);
      blocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const ordered = line.match(/^\s*\d+[.、]\s+(.+)$/);
    if (ordered) { flushParagraph(); list.push(ordered[1]); continue; }
    if (/^\|?\s*:?-{3,}/.test(line)) continue;
    flushList();
    paragraph.push(line.replace(/^\|\s*/, "").replace(/\s*\|$/, ""));
  }
  flushParagraph(); flushList();
  return blocks.join("\n");
}

const navigation = `<nav aria-label="主要導覽"><a href="/">首頁</a> · <a href="/members">會員國與觀察國</a> · <a href="/staff">職位報告</a> · <a href="/regulations">法規</a> · <a href="/charter">憲章</a> · <a href="/votes">投票</a></nav>`;
const asLink = (href, label) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;

const [membersData, staffData, votesData] = await Promise.all([
  fetchJson("/api/members", { memberStates: [], observerStates: [], allStates: [] }),
  fetchJson("/api/staff-report", { staff: [] }),
  fetchJson("/api/votes", []),
]);

const websiteDescription = "聯合微國家組織（F.U.M.O.，Federation of United Micronations Organisation）致力於微國家之間的交流、合作、和平與組織治理。官網提供會員國名錄、組織憲章與法規、秘書處及議事中心公開職位報告，以及公開投票資訊。";
const pages = [];
function addPage({ path: pagePath, title, description, keywords, body, robots = "index, follow", indexable = true, type = "WebPage", extraSchema = {} }) {
  pages.push({ path: pagePath, title, description, keywords, body, robots, indexable, type, extraSchema });
}

addPage({
  path: "/",
  title: "聯合微國家組織 F.U.M.O.｜會員國交流、組織治理與國際合作",
  description: websiteDescription,
  keywords: "聯合微國家組織,FUMO,微國家,國際組織,微國家外交,會員國合作",
  type: "WebSite",
  body: `<h1>聯合微國家組織（F.U.M.O.）</h1><p>${escapeHtml(websiteDescription)}</p><h2>公開資訊</h2><ul><li>${asLink("/members", "會員國與觀察國名錄")}</li><li>${asLink("/charter", "聯合微國家組織憲章")}</li><li>${asLink("/regulations", "組織法規與規章")}</li><li>${asLink("/staff", "秘書處與議事中心職位報告")}</li><li>${asLink("/votes", "公開投票與決議資訊")}</li></ul><h2>組織宗旨</h2><p>FUMO 以促進微國家交流、國際合作、和平與秩序為核心，透過憲章、公開規章與議事程序建立共同治理架構。</p><p>官方社群：${asLink("https://discord.gg/MuSM3yXrQh", "FUMO Discord 社群")}</p>`,
});

const memberStates = Array.isArray(membersData?.memberStates) ? membersData.memberStates : (Array.isArray(membersData?.allStates) ? membersData.allStates.filter((state) => state.status === "member") : []);
const observerStates = Array.isArray(membersData?.observerStates) ? membersData.observerStates : (Array.isArray(membersData?.allStates) ? membersData.allStates.filter((state) => state.status === "observer") : []);
const memberList = [...memberStates.map((state) => ({ ...state, statusLabel: "會員國" })), ...observerStates.map((state) => ({ ...state, statusLabel: "觀察國" }))];
addPage({
  path: "/members",
  title: "FUMO 聯合微國家組織會員國與觀察國名錄｜成員國資訊",
  description: "瀏覽聯合微國家組織（FUMO）公開會員國與觀察國名錄，了解各成員的正式名稱、國家簡稱、國家體制與組織成員身分。",
  keywords: "FUMO會員國,觀察國,微國家名錄,成員國資訊,微國家外交",
  body: `<h1>會員國與觀察國名錄</h1><p>本頁列出 FUMO 公開的會員國與觀察國基本資料。資料以官方名錄為準，僅顯示國家名稱、簡稱、體制及成員身分。</p>${memberList.length ? `<ul>${memberList.map((state) => `<li><strong>${escapeHtml(text(state.fullName || state.name))}</strong>（${escapeHtml(text(state.shortName || ""))}）— ${escapeHtml(state.statusLabel)}${state.governmentType ? `；體制：${escapeHtml(text(state.governmentType))}` : ""}</li>`).join("")}</ul>` : `<p>會員國與觀察國名錄可於互動頁面查看；本次建置未能取得最新公開資料。請前往${asLink("/members", "會員國名錄頁面")}或稍後重新載入。</p>`}`,
});

const staff = Array.isArray(staffData?.staff) ? staffData.staff : [];
addPage({
  path: "/staff",
  title: "FUMO 秘書處與議事中心現任職位名錄｜聯合微國家組織",
  description: "查看聯合微國家組織 FUMO 秘書處與議事中心目前公開職位、職稱與職責分工。名錄只展示公開職務資訊，不公開私人帳號識別碼。",
  keywords: "FUMO秘書處,議事中心,組織職位,微國家職務名錄,秘書處成員",
  body: `<h1>秘書處與議事中心職位報告</h1><p>本頁整理 FUMO 公開的組織職位、職稱及負責領域。為保護隱私，不列出私人帳號 ID。</p>${staff.length ? `<ul>${staff.map((entry) => `<li><strong>${escapeHtml(text(entry.name))}</strong> — ${escapeHtml([...(entry.organizations || []), ...(entry.roles || [])].join("、"))}${entry.areas?.length ? `；負責範圍：${escapeHtml(entry.areas.join("、"))}` : ""}</li>`).join("")}</ul>` : `<p>目前沒有可供本次靜態建置使用的公開職位資料。互動名錄仍會從官方公開工作表同步。</p>`}${asLink("/staff", "開啟互動職位報告")}`,
});

const regulationsSource = await fs.readFile(path.resolve(process.cwd(), "src/data/regulations.ts"), "utf8").catch(() => "");
const regulations = parseRegulations(regulationsSource);
addPage({
  path: "/regulations",
  title: "FUMO 組織法規及成員國規範｜聯合微國家組織法規目錄",
  description: "查閱聯合微國家組織的憲章、成員資格、組織治理、選舉程序與秩序管理等公開法規，並前往官方文件來源閱讀完整條文。",
  keywords: "FUMO法規,組織憲章,成員國規範,議事規則,微國家治理",
  type: "CollectionPage",
  body: `<h1>組織法規與規章</h1><p>FUMO 公開規範涵蓋憲章、成員資格、組織治理、選舉程序及秩序管理。下列文件連結前往官方文件來源，完整條文與最新版狀態以原始文件為準。</p>${regulations.length ? `<ul>${regulations.map((item) => `<li>${asLink(item.path.startsWith("http") ? item.path : `https://hackmd.io/${item.path}`, item.name)}${item.description ? ` — ${escapeHtml(item.description)}` : ""}（${item.status === "complete" ? "已完成" : item.status === "draft" ? "草案" : "待完成"}）</li>`).join("")}</ul>` : `<p>法規目錄可由互動頁面查閱；請前往${asLink("/regulations", "法規頁面")}。</p>`}`,
});

const charterSource = await fs.readFile(path.resolve(process.cwd(), "src/data/charter.zh.md"), "utf8").catch(() => "");
addPage({
  path: "/charter",
  title: "聯合微國家組織憲章第七版｜FUMO 宗旨、架構與權利義務",
  description: "閱讀聯合微國家組織（FUMO）憲章第七版，了解組織宗旨與原則、會員國及觀察國、議事中心、秘書處、理事國，以及憲章修正規定。",
  keywords: "FUMO憲章,聯合微國家組織憲章,第七版,組織宗旨,會員國權利義務",
  body: `<h1>聯合微國家組織憲章第七版</h1><p>本頁提供憲章全文的可索引文字版本。正式文件及修訂狀態請參考${asLink("https://hackmd.io/@C_MoBbG-Q1CbFG1gDVFrcg/rJfgOxo5KGx", "官方憲章文件")}。</p>${markdownToHtml(charterSource)}`,
});

const votes = Array.isArray(votesData) ? votesData : [];
const voteDetails = await Promise.all(votes.map(async (vote) => ({ vote, results: await fetchJson(`/api/votes/${encodeURIComponent(vote.id)}/results`, null) })));
const voteStatus = (vote) => vote.isClosed ? "已關閉" : vote.isExpired ? "已截止" : "進行中";
addPage({
  path: "/votes",
  title: "FUMO 組織正式投票與決議｜聯合微國家組織投票公告",
  description: "瀏覽聯合微國家組織 FUMO 公開投票、議案狀態、投票期限與彙總結果。進行中的投票不公開個別投票者選擇。",
  keywords: "FUMO投票,組織決議,微國家投票,公開議案,投票結果",
  type: "CollectionPage",
  body: `<h1>公開投票與決議</h1><p>此處列出公開投票的議案說明、選項、截止時間與彙總結果。進行中的投票只顯示彙總票數，不顯示個別投票者或其選擇。</p>${votes.length ? `<ul>${votes.map((vote) => `<li>${asLink(`/votes/${encodeURIComponent(vote.id)}`, text(vote.name) || `投票 ${vote.id}`)} — ${voteStatus(vote)}；截止：${escapeHtml(text(vote.deadline))}；已投票 ${Number(vote.ballotCount) || 0} 國${vote.description ? `；${escapeHtml(text(vote.description))}` : ""}</li>`).join("")}</ul>` : `<p>目前沒有公開投票，或本次建置未能取得最新投票資料。若有投票，將於互動頁面顯示。</p>`}`,
});

for (const { vote, results } of voteDetails) {
  const pagePath = `/votes/${encodeURIComponent(vote.id)}`;
  const safeName = text(vote.name) || `投票 ${vote.id}`;
  const options = Array.isArray(vote.options) ? vote.options : [];
  const aggregateResults = Array.isArray(results?.results) ? results.results : [];
  const resultByOption = new Map(aggregateResults.map((result) => [result.option, result]));
  const resultsHtml = aggregateResults.length
    ? `<h2>公開彙總結果</h2><ul>${aggregateResults.map((result) => `<li>${escapeHtml(text(result.option))}：${Number(result.count) || 0} 票（${escapeHtml(text(result.percentage))}%）</li>`).join("")}</ul>`
    : "";
  addPage({
    path: pagePath,
    title: `${safeName}｜FUMO 聯合微國家組織正式投票與議案資訊`,
    description: text(vote.description) || `查看 FUMO 公開投票「${safeName}」的議案說明、投票選項、期限與彙總結果。進行中的投票不公開個別選擇。`,
    keywords: "FUMO投票,聯合微國家組織議案,公開投票,投票結果",
    type: "WebPage",
    extraSchema: { "@type": "WebPage" },
    body: `<h1>${escapeHtml(safeName)}</h1><p>${escapeHtml(text(vote.description) || "本次投票為聯合微國家組織的公開議案。")}</p><p>狀態：${voteStatus(vote)}；截止時間：${escapeHtml(text(vote.deadline))}；${vote.allowMultiple ? "可複選" : "單選"}。</p><h2>投票選項</h2><ul>${options.map((option) => `<li>${escapeHtml(text(option))}${resultByOption.has(option) ? ` — ${Number(resultByOption.get(option).count) || 0} 票（${escapeHtml(text(resultByOption.get(option).percentage))}%）` : ""}</li>`).join("")}</ul>${resultsHtml}<p>投票、登入與互動詳情請前往${asLink(pagePath, "投票互動頁面")}。公開頁不包含個人帳戶 ID、投票者名單或私人選項。</p>`,
  });
}

const privatePages = [
  ["/admin", "管理面板", "管理員專用帳戶與組織操作介面。"],
  ["/login", "登入", "使用已註冊帳戶登入 FUMO 官方網站。"],
  ["/register", "註冊", "依官方名冊註冊 FUMO 網站帳戶。"],
  ["/votes/create", "建立投票", "管理員建立組織投票的操作介面。"],
];
for (const [pagePath, label, description] of privatePages) addPage({
  path: pagePath,
  title: `${label}｜${SITE_NAME}`,
  description,
  keywords: "",
  robots: "noindex, nofollow",
  indexable: false,
  body: `<h1>${escapeHtml(label)}</h1><p>${escapeHtml(description)} 此頁不供搜尋引擎建立索引。</p>${asLink("/", "返回 FUMO 首頁")}`,
});

function translatedPairs(source) {
  return [...source.matchAll(/\bt\("((?:\\.|[^"\\])*)"\s*,\s*"((?:\\.|[^"\\])*)"\)/g)].map((match) => {
    const decode = (value) => { try { return JSON.parse(`"${value}"`); } catch { return value; } };
    return [decode(match[1]), decode(match[2])];
  });
}
function legalDocumentBody(source, fallbackTitle) {
  const pairs = translatedPairs(source);
  if (!pairs.length) return `<h1>${escapeHtml(fallbackTitle)}</h1><p>請至互動頁面查閱完整內容。</p>`;
  const title = pairs[0][0] || fallbackTitle;
  return `<h1>${escapeHtml(title)}</h1>${pairs.slice(1).map(([zh, en]) => {
    if (/^[一二三四五六七八九十]+、/.test(zh) || /^\d+\./.test(en)) return `<h2>${escapeHtml(zh)}</h2>`;
    return `<p>${escapeHtml(zh)}</p>`;
  }).join("")}`;
}
const privacySource = await fs.readFile(path.resolve(process.cwd(), "src/pages/Privacy.tsx"), "utf8").catch(() => "");
const termsSource = await fs.readFile(path.resolve(process.cwd(), "src/pages/Terms.tsx"), "utf8").catch(() => "");
addPage({
  path: "/privacy",
  title: "隱私權政策｜聯合微國家組織 FUMO 官方網站資料使用說明",
  description: "閱讀 FUMO 官方網站的隱私權政策，了解帳戶、登入及投票資料如何用於網站服務與組織作業。",
  keywords: "FUMO隱私權政策,資料使用,帳戶隱私,網站資料保護",
  body: legalDocumentBody(privacySource, "隱私權政策"),
});
addPage({
  path: "/terms",
  title: "使用條款｜聯合微國家組織 FUMO 官方網站服務規範",
  description: "查看使用聯合微國家組織 FUMO 官方網站、帳戶功能及公開投票服務時應遵守的使用條款。",
  keywords: "FUMO使用條款,網站規範,投票服務,帳戶服務",
  body: legalDocumentBody(termsSource, "使用條款"),
});

const indexTemplate = await fs.readFile(path.join(PUBLIC_DIR, "index.html"), "utf8");
const originMetadata = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_ORIGIN}/#organization`, name: "聯合微國家組織", alternateName: ["F.U.M.O.", "Federation of United Micronations Organisation"], url: SITE_ORIGIN, logo: `${SITE_ORIGIN}/opengraph.jpg`, sameAs: ["https://discord.gg/MuSM3yXrQh"] },
    { "@type": "WebSite", "@id": `${SITE_ORIGIN}/#website`, name: SITE_NAME, url: SITE_ORIGIN, inLanguage: ["zh-Hant", "en"], publisher: { "@id": `${SITE_ORIGIN}/#organization` } },
  ],
};
function jsonLdFor(page) {
  const url = new URL(page.path, SITE_ORIGIN).toString();
  const crumbs = [{ name: "首頁", path: "/" }];
  if (page.path !== "/") {
    const segment = page.path.split("/").filter(Boolean)[0];
    const routeName = segment === "members" ? "會員國與觀察國" : segment === "staff" ? "職位報告" : segment === "regulations" ? "法規" : segment === "charter" ? "憲章" : segment === "votes" ? "投票" : segment === "privacy" ? "隱私權政策" : segment === "terms" ? "使用條款" : "頁面";
    crumbs.push({ name: routeName, path: `/${segment}` });
    if (/^\/votes\/\d+$/.test(page.path)) crumbs.push({ name: page.title.split("｜")[0], path: page.path });
  }
  return {
    ...originMetadata,
    "@graph": [
      ...originMetadata["@graph"],
      { "@type": page.type, name: page.title, description: page.description, url, inLanguage: "zh-Hant", isPartOf: { "@id": `${SITE_ORIGIN}/#website` }, about: { "@id": `${SITE_ORIGIN}/#organization` } },
      { "@type": "BreadcrumbList", itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: new URL(crumb.path, SITE_ORIGIN).toString() })) },
    ],
  };
}

function withHead(html, page) {
  let output = html.replace(/<html\b[^>]*>/i, '<html lang="zh-Hant">');
  output = output.replace(/<title>[\s\S]*?<\/title>/i, "");
  output = output.replace(/<meta\b[^>]*>/gi, (tag) => {
    const name = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const property = tag.match(/\bproperty\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const names = new Set(["description", "robots", "keywords", "twitter:card", "twitter:title", "twitter:description", "twitter:image"]);
    const properties = new Set(["og:title", "og:description", "og:type", "og:url", "og:site_name", "og:locale", "og:image"]);
    return names.has(name) || properties.has(property) ? "" : tag;
  });
  output = output.replace(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/gi, "");
  output = output.replace(/<script\b(?=[^>]*\bid\s*=\s*["']seo-jsonld["'])[^>]*>[\s\S]*?<\/script>/gi, "");
  const url = new URL(page.path, SITE_ORIGIN).toString();
  const meta = [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    `<meta name="robots" content="${escapeHtml(page.robots)}" />`,
    page.keywords ? `<meta name="keywords" content="${escapeHtml(page.keywords)}" />` : "",
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:type" content="${page.path.startsWith("/votes/") ? "article" : "website"}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="zh_TW" />`,
    `<meta property="og:image" content="${SITE_ORIGIN}/opengraph.jpg" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
    `<meta name="twitter:image" content="${SITE_ORIGIN}/opengraph.jpg" />`,
    `<script id="seo-jsonld" type="application/ld+json">${JSON.stringify(jsonLdFor(page)).replace(/</g, "\\u003c")}</script>`,
  ].filter(Boolean).join("\n    ");
  output = output.replace(/<head\b[^>]*>/i, (head) => `${head}\n    ${meta}`);
  const fallback = `<main id="seo-fallback" style="max-width:72rem;margin:0 auto;padding:2rem 1rem;font:16px/1.7 system-ui,sans-serif;color:#18243a"><header><strong>${SITE_NAME}</strong>${navigation}</header><article>${page.body}</article><footer><p>${asLink("/privacy", "隱私權政策")} · ${asLink("/terms", "使用條款")}</p></footer></main>`;
  output = output.replace(/<div\s+id="root"\s*><\/div>/i, `${fallback}<div id="root"></div>`);
  return output;
}

await fs.mkdir(PUBLIC_DIR, { recursive: true });
for (const page of pages) {
  const relative = page.path === "/" ? "index.html" : `${page.path.replace(/^\//, "")}/index.html`;
  const destination = path.join(PUBLIC_DIR, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, withHead(indexTemplate, page), "utf8");
}

const lastmod = new Date().toISOString().slice(0, 10);
const sitemapEntries = pages.filter((page) => page.indexable).map((page) => `  <url><loc>${escapeHtml(new URL(page.path, SITE_ORIGIN).toString())}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n");
await fs.writeFile(path.join(PUBLIC_DIR, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`, "utf8");
const llms = `# ${SITE_NAME}\n\n> 聯合微國家組織（F.U.M.O.；Federation of United Micronations Organisation）官方網站，提供組織治理、會員國資訊、公開法規及正式投票資訊。\n\n## 公開頁面\n\n- [組織首頁](${SITE_ORIGIN}/): 組織使命、架構與公開資訊入口。\n- [會員國與觀察國](${SITE_ORIGIN}/members): 公開國家名稱、簡稱、體制與成員身分。\n- [職位報告](${SITE_ORIGIN}/staff): 秘書處與議事中心公開職稱及職責，不含私人帳號 ID。\n- [組織法規](${SITE_ORIGIN}/regulations): 憲章、成員資格、治理及程序規章索引。\n- [組織憲章](${SITE_ORIGIN}/charter): 憲章第七版文字內容與官方文件連結。\n- [公開投票](${SITE_ORIGIN}/votes): 公開議案、狀態及彙總資訊；進行中的投票不顯示個別選擇。\n- [隱私權政策](${SITE_ORIGIN}/privacy)\n- [使用條款](${SITE_ORIGIN}/terms)\n\n## 官方文件\n\n- [FUMO 憲章（繁體中文）](https://hackmd.io/@C_MoBbG-Q1CbFG1gDVFrcg/rJfgOxo5KGx)\n- [FUMO 憲章（English）](https://hackmd.io/@C_MoBbG-Q1CbFG1gDVFrcg/ryHGtgtiGg)\n- [網站地圖](${SITE_ORIGIN}/sitemap.xml)\n\n## 準確性與隱私\n\n請以各頁所連結的官方文件及最新公開名錄為準。網站帳戶、管理操作紀錄、私人識別碼、密碼及個人投票選擇不屬於公開資料，也不應被索引或推論。\n`;
await fs.writeFile(path.join(PUBLIC_DIR, "llms.txt"), llms, "utf8");
console.log(`Generated ${pages.length} SEO-ready HTML routes and sitemap.xml (${memberList.length} public states, ${staff.length} public staff entries, ${votes.length} public votes).`);
