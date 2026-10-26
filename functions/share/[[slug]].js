const API_ORIGIN = "https://fumo-api.micronationfumo.workers.dev";
const SITE_ORIGIN = "https://www.micronationfumo.org";
const SHARE_ID_RE = /^[A-Za-z0-9_-]{1,48}$/;

const escapeHtml = value => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdown(markdown) {
  const lines = String(markdown).replace(/\r/g, "").split("\n");
  let html = "";
  let listMode = "";
  const closeList = () => {
    if (listMode) {
      html += listMode === "ul" ? "</ul>" : "</ol>";
      listMode = "";
    }
  };
  const cells = row => row.trim().replace(/^\||\|$/g, "").split("|").map(cell => cell.trim());
  const divider = row => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(row.trim());

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    let match;
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith("```")) {
      closeList();
      const code = [];
      while (++index < lines.length && !lines[index].trim().startsWith("```")) code.push(lines[index]);
      html += `<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`;
      continue;
    }
    if (line.includes("|") && index + 1 < lines.length && divider(lines[index + 1])) {
      closeList();
      const headers = cells(line);
      html += `<div class="table-scroll"><table><thead><tr>${headers.map(cell => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>`;
      index += 1;
      while (index + 1 < lines.length && lines[index + 1].trim().includes("|")) {
        index += 1;
        html += `<tr>${cells(lines[index]).map(cell => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`;
      }
      html += "</tbody></table></div>";
      continue;
    }
    if ((match = line.match(/^(#{1,6})\s+(.+)$/))) {
      closeList();
      const level = match[1].length;
      html += `<h${level}>${inlineMarkdown(match[2])}</h${level}>`;
      continue;
    }
    if (/^---+$/.test(line)) {
      closeList();
      html += "<hr>";
      continue;
    }
    if ((match = line.match(/^>\s?(.*)$/))) {
      closeList();
      html += `<blockquote>${inlineMarkdown(match[1])}</blockquote>`;
      continue;
    }
    if ((match = line.match(/^[-*]\s+(.+)$/))) {
      if (listMode !== "ul") {
        closeList();
        html += "<ul>";
        listMode = "ul";
      }
      const task = match[1].match(/^\[([ xX])\]\s+(.+)$/);
      html += task
        ? `<li class="task-item"><span class="task-check">${task[1].toLowerCase() === "x" ? "✓" : "□"}</span>${inlineMarkdown(task[2])}</li>`
        : `<li>${inlineMarkdown(match[1])}</li>`;
      continue;
    }
    if ((match = line.match(/^\d+\.\s+(.+)$/))) {
      if (listMode !== "ol") {
        closeList();
        html += "<ol>";
        listMode = "ol";
      }
      html += `<li>${inlineMarkdown(match[1])}</li>`;
      continue;
    }
    closeList();
    html += `<p>${inlineMarkdown(line)}</p>`;
  }
  closeList();
  return html || "<p class=empty>這份公開文件沒有內容。</p>";
}

function notFound() {
  return new Response(renderPage("找不到文件", "<p>此分享連結不存在或已無法使用。</p>", ""), {
    status: 404,
    headers: pageHeaders("no-store"),
  });
}

function pageHeaders(cacheControl) {
  return {
    "content-type": "text/html; charset=utf-8",
    "cache-control": cacheControl,
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; script-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  };
}

function renderPage(title, articleHtml, created) {
  const safeTitle = escapeHtml(title);
  const safeCreated = created ? escapeHtml(created) : "";
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#073b52">
  <meta name="description" content="FUMO 成員文件工作區的唯讀公開快照。">
  <link rel="icon" href="/fumo-badge.webp" type="image/webp">
  <title>${safeTitle}｜FUMO 文件分享</title>
  <style>
    :root{color-scheme:light;--navy:#073b52;--gold:#d9ad52;--ink:#253247;--muted:#728094;--line:#e6ebf0;--paper:#fff;--canvas:#f4f6f8;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif;color:var(--ink)}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--canvas)}a{color:#27649b}.bar{min-height:66px;background:var(--navy);color:#fff;display:flex;align-items:center;padding:12px max(20px,calc((100vw - 1040px)/2));gap:13px}.brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-weight:700}.brand img{width:37px;height:37px;border-radius:10px;object-fit:cover}.label{margin-left:auto;color:#e2c274;font-size:13px}.copy{border:1px solid #ffffff62;border-radius:8px;background:transparent;color:white;padding:8px 12px;font:inherit;font-size:13px;cursor:pointer}.copy:hover{background:#ffffff15}.wrap{max-width:900px;margin:0 auto;padding:34px 20px 48px}.eyebrow{color:#6381a2;font-size:11px;letter-spacing:.14em;font-weight:700}.heading h1{font-size:clamp(25px,4vw,38px);line-height:1.25;color:var(--navy);margin:10px 0}.meta{font-size:13px;color:var(--muted);margin:0 0 22px}.notice{border:1px solid #e8d9ad;background:#fffaf0;color:#795d24;padding:12px 15px;border-radius:10px;font-size:13px;line-height:1.6;margin-bottom:18px}.paper{background:var(--paper);border:1px solid var(--line);border-radius:14px;box-shadow:0 10px 34px #13293c0d;padding:clamp(20px,5vw,48px)}.article{font-size:15px;line-height:1.85;overflow-wrap:anywhere}.article h1,.article h2,.article h3,.article h4{color:var(--navy);line-height:1.4}.article h1{font-size:1.8em;margin:0 0 .8em}.article h2{font-size:1.35em;margin:1.6em 0 .55em;padding-bottom:.3em;border-bottom:1px solid var(--line)}.article h3{font-size:1.15em;margin:1.35em 0 .45em}.article p{margin:.8em 0}.article ul,.article ol{padding-left:1.5em}.article li{margin:.35em 0}.article blockquote{margin:1em 0;padding:.7em 1em;border-left:3px solid var(--gold);background:#faf8f1;color:#56667b}.article code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#f0f3f6;border-radius:4px;padding:.12em .35em;font-size:.9em}.article pre{overflow:auto;background:#f2f4f7;border:1px solid var(--line);border-radius:8px;padding:14px}.article pre code{background:none;padding:0;white-space:pre}.article hr{border:0;border-top:1px solid var(--line);margin:1.5em 0}.article .task-item{list-style:none;margin-left:-1.5em}.article .task-check{display:inline-block;width:1.4em;color:#6980a0}.table-scroll{overflow:auto;margin:1em 0}table{border-collapse:collapse;width:100%;min-width:360px;font-size:.92em}th,td{border:1px solid var(--line);padding:9px 11px;text-align:left}th{background:#f5f7fa;color:#314865}.empty{color:var(--muted)}.footer{border-top:1px solid var(--line);margin-top:28px;padding-top:15px;color:var(--muted);font-size:12px;line-height:1.6}.footer a{color:var(--navy);font-weight:650;text-decoration:none}.footer a:hover{text-decoration:underline}@media(max-width:520px){.bar{min-height:58px;padding:10px 14px;gap:8px}.brand{font-size:13px}.brand img{width:32px;height:32px}.label{font-size:11px}.copy{padding:7px 9px;font-size:12px}.wrap{padding:22px 13px 34px}.paper{padding:20px 17px}.article{font-size:14px}}
  </style>
  <script src="/documents/share-tools.js" defer></script>
</head>
<body>
  <header class="bar">
    <a class="brand" href="/" aria-label="前往 FUMO 官方網站"><img src="/fumo-badge.webp" alt="FUMO 徽章"><span>FUMO 文件工作區</span></a>
    <span class="label">唯讀公開頁面</span>
    <button class="copy" id="copyShare" type="button">複製連結</button>
  </header>
  <main class="wrap">
    <header class="heading"><div class="eyebrow">FUMO PUBLIC DOCUMENT</div><h1>${safeTitle}</h1><p class="meta">Markdown · 唯讀快照${safeCreated ? ` · 建立時間：${safeCreated}` : ""}</p></header>
    <aside class="notice">這是保存於雲端的唯讀快照。任何持有此連結的人都可以查看；來源文件修改後，請由 FUMO 成員重新建立分享。</aside>
    <section class="paper"><article class="article">${articleHtml}</article><footer class="footer">由 FUMO 文件工作區分享 · Markdown 唯讀檢視<br><a href="/">前往 FUMO 官方網站</a></footer></section>
  </main>
</body>
</html>`;
}

export async function onRequest(context) {
  const rawSlug = context.params.slug;
  const slug = typeof rawSlug === "string" ? rawSlug : (Array.isArray(rawSlug) && rawSlug.length === 1 ? rawSlug[0] : "");
  if (!slug || !SHARE_ID_RE.test(slug)) return notFound();

  let response;
  try {
    response = await fetch(`${API_ORIGIN}/api/shares/${encodeURIComponent(slug)}`, {
      method: "GET",
      headers: { origin: SITE_ORIGIN, accept: "application/json" },
      redirect: "manual",
    });
  } catch {
    return new Response("分享服務暫時無法使用，請稍後再試。", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (response.status === 404) return notFound();
  if (!response.ok) {
    return new Response("分享服務暫時無法使用，請稍後再試。", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  let share;
  try { share = await response.json(); } catch { return notFound(); }
  if (typeof share.title !== "string" || typeof share.content !== "string") return notFound();
  const created = share.created ? new Date(share.created) : null;
  const createdLabel = created && !Number.isNaN(created.valueOf()) ? `${created.toISOString().replace("T", " ").slice(0, 16)} UTC` : "";
  return new Response(renderPage(share.title, renderMarkdown(share.content), createdLabel), {
    status: 200,
    headers: pageHeaders("public, max-age=300"),
  });
}
