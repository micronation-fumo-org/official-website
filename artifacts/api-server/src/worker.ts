export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/healthz" && request.method === "GET") {
      try {
        const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM votes").first<{ count: number }>();
        return Response.json({
          status: "ok",
          database: "d1",
          votes: Number(row?.count ?? 0),
          environment: env.ENVIRONMENT ?? "production",
        });
      } catch (error) {
        return Response.json({ status: "error", database: "d1", message: String(error) }, { status: 503 });
      }
    }

    if (url.pathname === "/api/votes" && request.method === "GET") {
      const result = await env.DB.prepare(
        "SELECT id, name, description, deadline, options, allow_multiple AS allowMultiple, is_closed AS isClosed, created_at AS createdAt, updated_at AS updatedAt FROM votes ORDER BY created_at",
      ).all<Record<string, unknown>>();

      return Response.json((result.results ?? []).map((vote) => ({
        ...vote,
        options: JSON.parse(String(vote.options)),
        allowMultiple: Boolean(vote.allowMultiple),
        isClosed: Boolean(vote.isClosed),
      })));
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
