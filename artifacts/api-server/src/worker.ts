import { createD1Db, d1VotesTable } from "@workspace/db/d1";

export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/healthz" && request.method === "GET") {
      try {
        const db = createD1Db(env.DB);
        await db.select({ id: d1VotesTable.id }).from(d1VotesTable).limit(1);
        return Response.json({ status: "ok", database: "d1", environment: env.ENVIRONMENT ?? "unknown" });
      } catch (error) {
        console.error(error);
        return Response.json({ status: "error", database: "d1" }, { status: 503 });
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
