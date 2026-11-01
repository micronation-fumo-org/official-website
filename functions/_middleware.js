const MAINTENANCE_HOST = "www.micronationfumo.org";

const MAINTENANCE_HTML = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#00334D">
  <title>網站維護中｜聯合微國家組織 FUMO</title>
  <style>
    :root { color-scheme: light; --blue: #00334D; --ink: #1d1d1f; --muted: #6e6e73; --line: #d2d2d7; }
    * { box-sizing: border-box; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 28px; background: #fff; color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif; -webkit-font-smoothing: antialiased; }
    main { width: min(100%, 680px); padding: clamp(28px, 7vw, 68px); border: 1px solid var(--line); }
    .brand { margin: 0 0 34px; color: var(--blue); font-size: 14px; font-weight: 700; letter-spacing: .03em; }
    .eyebrow { margin: 0 0 14px; color: var(--muted); font-size: 12px; letter-spacing: .12em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(32px, 6vw, 52px); font-weight: 600; letter-spacing: -.055em; line-height: 1.15; }
    .message { margin: 20px 0 0; color: #515154; font-size: 16px; line-height: 1.8; }
    .rule { width: 32px; height: 2px; margin-top: 32px; background: var(--blue); }
    .english { margin: 18px 0 0; color: var(--muted); font-size: 13px; line-height: 1.7; }
  </style>
</head>
<body>
  <main>
    <p class="brand">FUMO · 聯合微國家組織</p>
    <p class="eyebrow">Federation of United Micronations Organisation</p>
    <h1>網站維護中</h1>
    <p class="message">我們正在更新官方網站，請稍後再訪。</p>
    <div class="rule" aria-hidden="true"></div>
    <p class="english">The official website is being updated. Please check back later.</p>
  </main>
</body>
</html>`;

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const isApiRequest = url.pathname === "/api" || url.pathname.startsWith("/api/");
  const isCertificateChallenge = url.pathname.startsWith("/.well-known/acme-challenge/");

  if (hostname !== MAINTENANCE_HOST || isApiRequest || isCertificateChallenge) {
    return next();
  }

  return new Response(request.method === "HEAD" ? null : MAINTENANCE_HTML, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
