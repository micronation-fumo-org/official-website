const API_ORIGIN = "https://fumo-api.micronationfumo.workers.dev";

export const onRequest = async ({ request, params }: { request: Request; params: { path?: string | string[] } }) => {
  const segments = Array.isArray(params.path) ? params.path : (params.path ? [params.path] : []);
  const target = `${API_ORIGIN}/api/${segments.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;
  const headers = new Headers(request.headers);
  headers.set("Origin", "https://www.micronationfumo.org");
  const upstream = await fetch(new Request(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  }));
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("Access-Control-Allow-Origin", "https://www.micronationfumo.org");
  responseHeaders.set("Access-Control-Allow-Credentials", "true");
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
};
