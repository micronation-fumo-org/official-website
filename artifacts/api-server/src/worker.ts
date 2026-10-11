export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return json(null, 204);
    }

    if (url.pathname === "/api/healthz" && request.method === "GET") {
      try {
        const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM votes").first<{ count: number }>();
        return json({
          status: "ok",
          database: "d1",
          votes: Number(row?.count ?? 0),
          environment: env.ENVIRONMENT ?? "production",
        });
      } catch (error) {
        return json({ status: "error", database: "d1", message: String(error) }, 503);
      }
    }

    if (url.pathname === "/api/votes" && request.method === "GET") {
      const result = await env.DB.prepare(
        "SELECT id, name, description, deadline, options, allow_multiple AS allowMultiple, is_closed AS isClosed, created_at AS createdAt, updated_at AS updatedAt FROM votes ORDER BY created_at",
      ).all<Record<string, unknown>>();

      return json((result.results ?? []).map((vote) => ({
        ...vote,
        options: JSON.parse(String(vote.options)),
        allowMultiple: Boolean(vote.allowMultiple),
        isClosed: Boolean(vote.isClosed),
      })));
    }

    return json({ error: "Not found" }, 404);
  },
};
