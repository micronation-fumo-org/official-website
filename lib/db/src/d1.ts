import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./d1-schema";

export type D1Db = DrizzleD1Database<typeof schema>;

/** Create a request-safe Drizzle client from a Cloudflare D1 binding. */
export function createD1Db(binding: D1Database): D1Db {
  return drizzle(binding, { schema });
}

export { schema };
export * from "./d1-schema";
