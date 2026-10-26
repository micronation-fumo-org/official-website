const API_ORIGIN = "https://fumo-api.micronationfumo.workers.dev";
const SITE_ORIGIN = "https://www.micronationfumo.org";

export async function onRequest(context) {
  const { request } = context;
  const pathname = new URL(request.url).pathname;
  if (!["/documents", "/documents/", "/documents/index.html"].includes(pathname)) return context.next();

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }

  const cookie = request.headers.get("cookie");
  if (!cookie) return redirectToLogin(request);

  let authResponse;
  try {
    authResponse = await fetch(`${API_ORIGIN}/api/auth/me`, {
      method: "GET",
      headers: {
        cookie,
        origin: SITE_ORIGIN,
        accept: "application/json",
      },
      redirect: "manual",
    });
  } catch {
    return new Response("登入服務暫時無法使用，請稍後再試。", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  if (!authResponse.ok) return redirectToLogin(request);
  const pageResponse = await context.next();
  const headers = new Headers(pageResponse.headers);
  headers.set("cache-control", "private, no-store");
  return new Response(pageResponse.body, { status: pageResponse.status, statusText: pageResponse.statusText, headers });
}

function redirectToLogin(request) {
  const current = new URL(request.url);
  const next = `${current.pathname}${current.search}${current.hash}`;
  const login = new URL("/login", current.origin);
  login.searchParams.set("next", next);
  return new Response(null, { status: 302, headers: { location: login.toString(), "cache-control": "private, no-store" } });
}
