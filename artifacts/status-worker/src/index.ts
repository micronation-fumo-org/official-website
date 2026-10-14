type ComponentState = "operational" | "outage";
type OverallState = ComponentState | "degraded";

interface ComponentStatus {
  id: string;
  name: string;
  description: string;
  status: ComponentState;
  responseTimeMs: number | null;
  httpStatus: number | null;
}

const SITE_URL = "https://www.micronationfumo.org/";
const API_HEALTH_URL = "https://www.micronationfumo.org/api/healthz";
const VOTE_API_URL = "https://www.micronationfumo.org/api/votes";
const PROBE_TIMEOUT_MS = 8_000;

const PAGE = String.raw`<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="theme-color" content="#07364a" />
    <meta name="description" content="查看聯合微國家組織 F.U.M.O. 官方網站、API 與投票資料服務的即時運作狀態。" />
    <link rel="canonical" href="https://status.micronationfumo.org/" />
    <title>系統狀態｜聯合微國家組織 F.U.M.O.</title>
    <style>
      :root { color-scheme: light; font-family: Inter, "Noto Sans TC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #163340; background: #f2f6f8; font-synthesis: none; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: linear-gradient(145deg, #f5f8fa 0%, #edf3f5 55%, #f8f7f2 100%); }
      a { color: inherit; }
      .topline { height: 5px; background: linear-gradient(90deg, #07364a 0 72%, #d7ad51 72% 100%); }
      .wrap { width: min(100% - 36px, 920px); margin: 0 auto; padding: 40px 0 32px; }
      header { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 34px; }
      .brand { display: flex; align-items: center; gap: 13px; text-decoration: none; }
      .mark { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: #07364a; color: #fff; font-family: Georgia, serif; font-size: 17px; font-weight: 700; letter-spacing: -.04em; box-shadow: 0 5px 14px #07364a24; }
      .brand-name { display: block; color: #07364a; font-size: 15px; font-weight: 760; letter-spacing: .02em; }
      .brand-sub { display: block; margin-top: 3px; color: #72858d; font-size: 11px; letter-spacing: .12em; }
      .eyebrow { margin: 0 0 10px; color: #967329; font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
      h1 { margin: 0; color: #07364a; font-family: Georgia, "Noto Serif TC", serif; font-size: clamp(30px, 5vw, 42px); font-weight: 650; letter-spacing: -.025em; line-height: 1.2; }
      .intro { margin: 12px 0 0; color: #637982; font-size: 15px; line-height: 1.7; }
      .summary { display: flex; align-items: center; gap: 15px; margin: 30px 0 25px; padding: 22px 24px; border: 1px solid #dfe8ea; border-radius: 15px; background: #fff; box-shadow: 0 10px 30px #173d4d0a; }
      .summary-dot { flex: 0 0 auto; width: 13px; height: 13px; border-radius: 50%; background: #b9c6ca; box-shadow: 0 0 0 5px #b9c6ca1c; }
      .summary[data-state="operational"] .summary-dot { background: #16875c; box-shadow: 0 0 0 5px #16875c1c; }
      .summary[data-state="degraded"] .summary-dot { background: #c48a22; box-shadow: 0 0 0 5px #c48a221c; }
      .summary[data-state="outage"] .summary-dot { background: #c44848; box-shadow: 0 0 0 5px #c448481c; }
      .summary-copy { flex: 1; min-width: 0; }
      .summary-title { margin: 0; color: #173944; font-size: 17px; font-weight: 750; }
      .summary-meta { margin: 5px 0 0; color: #768a91; font-size: 12px; }
      .refresh { flex: 0 0 auto; border: 1px solid #d9e4e7; border-radius: 9px; padding: 9px 12px; color: #315764; background: #fff; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: background .15s ease, border-color .15s ease; }
      .refresh:hover { border-color: #aebfc4; background: #f7fafb; }
      .refresh:focus-visible, a:focus-visible { outline: 3px solid #d7ad51; outline-offset: 3px; }
      .refresh:disabled { cursor: wait; opacity: .6; }
      .section-label { margin: 26px 2px 11px; color: #72868d; font-size: 11px; font-weight: 800; letter-spacing: .15em; }
      .components { overflow: hidden; border: 1px solid #dfe8ea; border-radius: 15px; background: #fff; box-shadow: 0 10px 30px #173d4d0a; }
      .component { display: flex; align-items: center; gap: 14px; padding: 18px 22px; border-bottom: 1px solid #edf1f2; }
      .component:last-child { border-bottom: 0; }
      .component-icon { display: grid; place-items: center; flex: 0 0 auto; width: 34px; height: 34px; border-radius: 10px; color: #738a92; background: #f1f5f6; font-size: 16px; font-weight: 800; }
      .component[data-state="operational"] .component-icon { color: #16875c; background: #eaf6f0; }
      .component[data-state="outage"] .component-icon { color: #b53939; background: #fff0ef; }
      .component-copy { flex: 1; min-width: 0; }
      .component-name { margin: 0; color: #203e49; font-size: 14px; font-weight: 720; }
      .component-description { margin: 4px 0 0; color: #84949a; font-size: 12px; }
      .component-result { flex: 0 0 auto; text-align: right; }
      .component-state { display: block; color: #748990; font-size: 12px; font-weight: 700; }
      .component[data-state="operational"] .component-state { color: #16875c; }
      .component[data-state="outage"] .component-state { color: #b53939; }
      .component-latency { display: block; margin-top: 4px; color: #91a0a5; font-size: 11px; font-variant-numeric: tabular-nums; }
      footer { display: flex; justify-content: space-between; gap: 16px; margin-top: 22px; color: #89989d; font-size: 11px; line-height: 1.7; }
      footer a { color: #526f79; text-decoration-color: #bccbd0; text-underline-offset: 3px; }
      @media (max-width: 540px) { .wrap { width: min(100% - 28px, 920px); padding-top: 27px; } header { margin-bottom: 27px; } .summary { align-items: flex-start; padding: 18px; gap: 12px; } .refresh { padding: 8px 9px; } .component { padding: 16px; gap: 11px; } .component-description { max-width: 210px; } footer { flex-direction: column; gap: 4px; } }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; } }
    </style>
  </head>
  <body>
    <div class="topline" aria-hidden="true"></div>
    <main class="wrap">
      <header>
        <a class="brand" href="https://www.micronationfumo.org/" rel="noopener">
          <span class="mark" aria-hidden="true">F.</span>
          <span><span class="brand-name">聯合微國家組織</span><span class="brand-sub">F.U.M.O. SYSTEM STATUS</span></span>
        </a>
        <a href="https://www.micronationfumo.org/" style="color:#607983;font-size:12px;text-decoration:none">返回官方網站 ↗</a>
      </header>
      <section aria-labelledby="page-title">
        <p class="eyebrow">SERVICE STATUS</p>
        <h1 id="page-title">系統狀態</h1>
        <p class="intro">查看 F.U.M.O. 官方網站與線上服務的即時運作情況。</p>
      </section>
      <section class="summary" id="summary" data-state="unknown" aria-live="polite">
        <span class="summary-dot" aria-hidden="true"></span>
        <div class="summary-copy">
          <p class="summary-title" id="summary-title">正在檢查服務狀態…</p>
          <p class="summary-meta" id="summary-meta">第一次載入可能需要數秒。</p>
        </div>
        <button class="refresh" id="refresh" type="button">立即重新檢查</button>
      </section>
      <p class="section-label">受監測的服務</p>
      <section class="components" id="components" aria-label="服務狀態列表">
        <div class="component" data-state="unknown" data-id="website"><span class="component-icon" aria-hidden="true">…</span><div class="component-copy"><p class="component-name">官方網站</p><p class="component-description">公開網站入口與首頁回應</p></div><div class="component-result"><span class="component-state">檢查中</span><span class="component-latency">—</span></div></div>
        <div class="component" data-state="unknown" data-id="api"><span class="component-icon" aria-hidden="true">…</span><div class="component-copy"><p class="component-name">官方 API</p><p class="component-description">API Worker 健康端點</p></div><div class="component-result"><span class="component-state">檢查中</span><span class="component-latency">—</span></div></div>
        <div class="component" data-state="unknown" data-id="votes"><span class="component-icon" aria-hidden="true">…</span><div class="component-copy"><p class="component-name">投票資料服務</p><p class="component-description">投票資料 API 與資料庫讀取</p></div><div class="component-result"><span class="component-state">檢查中</span><span class="component-latency">—</span></div></div>
      </section>
      <footer>
        <span>狀態會自動更新；此頁顯示即時檢查，不代表歷史可用率。</span>
        <span>F.U.M.O. · Federation of United Micronations Organisation</span>
      </footer>
    </main>
    <script>
      const labels = { operational: "運作正常", outage: "無法連線" };
      const summary = document.getElementById("summary");
      const summaryTitle = document.getElementById("summary-title");
      const summaryMeta = document.getElementById("summary-meta");
      const refreshButton = document.getElementById("refresh");
      const displayTime = (value) => new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Taipei" }).format(new Date(value));
      async function refreshStatus() {
        refreshButton.disabled = true;
        try {
          const response = await fetch("/api/status", { cache: "no-store", headers: { accept: "application/json" } });
          if (!response.ok) throw new Error("status request failed");
          const payload = await response.json();
          summary.dataset.state = payload.overall;
          summaryTitle.textContent = payload.overall === "operational" ? "所有系統正常" : payload.overall === "degraded" ? "部分服務異常" : "目前有服務中斷";
          summaryMeta.textContent = "最後檢查：" + displayTime(payload.checkedAt) + " · 約每 30 秒自動更新";
          for (const component of payload.components) {
            const row = document.querySelector('[data-id="' + component.id + '"]');
            if (!row) continue;
            row.dataset.state = component.status;
            row.querySelector(".component-icon").textContent = component.status === "operational" ? "✓" : "!";
            row.querySelector(".component-state").textContent = labels[component.status];
            row.querySelector(".component-latency").textContent = component.responseTimeMs === null ? "無回應" : component.responseTimeMs + " ms";
          }
        } catch {
          summary.dataset.state = "outage";
          summaryTitle.textContent = "狀態資料暫時無法載入";
          summaryMeta.textContent = "請稍後再試，或使用「立即重新檢查」。";
        } finally {
          refreshButton.disabled = false;
        }
      }
      refreshButton.addEventListener("click", refreshStatus);
      refreshStatus();
      window.setInterval(refreshStatus, 30000);
    </script>
  </body>
</html>`;

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...securityHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function probe(
  id: string,
  name: string,
  description: string,
  url: string,
  validateJson = false,
): Promise<ComponentStatus> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: validateJson ? "application/json" : "text/html, application/json" },
      signal: controller.signal,
    });
    let operational = response.ok;
    if (validateJson && response.ok) {
      try {
        const body = await response.json() as { status?: string };
        operational = body.status === "ok";
      } catch {
        operational = false;
      }
    } else {
      await response.body?.cancel();
    }

    return {
      id,
      name,
      description,
      status: operational ? "operational" : "outage",
      responseTimeMs: Date.now() - startedAt,
      httpStatus: response.status,
    };
  } catch {
    return {
      id,
      name,
      description,
      status: "outage",
      responseTimeMs: null,
      httpStatus: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getStatus(): Promise<Response> {
  const components = await Promise.all([
    probe("website", "官方網站", "公開網站入口與首頁回應", SITE_URL),
    probe("api", "官方 API", "API Worker 健康端點", API_HEALTH_URL, true),
    probe("votes", "投票資料服務", "投票資料 API 與資料庫讀取", VOTE_API_URL),
  ]);
  const available = components.filter((component) => component.status === "operational").length;
  const overall: OverallState = available === components.length
    ? "operational"
    : available === 0
      ? "outage"
      : "degraded";

  return jsonResponse({ overall, checkedAt: new Date().toISOString(), components });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" && (request.method === "GET" || request.method === "HEAD")) {
      return new Response(request.method === "HEAD" ? null : PAGE, {
        status: 200,
        headers: {
          ...securityHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        },
      });
    }

    if (url.pathname === "/api/status" && request.method === "GET") {
      return getStatus();
    }

    if (url.pathname === "/healthz" && request.method === "GET") {
      return jsonResponse({ status: "ok", service: "fumo-status" });
    }

    if (url.pathname === "/robots.txt" && request.method === "GET") {
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: { ...securityHeaders, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
      });
    }

    return jsonResponse({ error: "Not found" }, 404);
  },
};
