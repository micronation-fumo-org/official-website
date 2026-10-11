import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Cloudflare D1 schema.
 *
 * D1 is SQLite-based, so PostgreSQL arrays and timestamps are represented as
 * JSON/text values. Use parseJsonArray() at the Worker boundary.
 */
export const d1VotesTable = sqliteTable("votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 255 }).notNull(),
  description: text("description"),
  deadline: text("deadline").notNull(),
  options: text("options").notNull(),
  allowMultiple: integer("allow_multiple", { mode: "boolean" }).notNull().default(false),
  isClosed: integer("is_closed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const d1BallotsTable = sqliteTable("ballots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  voteId: integer("vote_id").notNull().references(() => d1VotesTable.id),
  voterId: text("voter_id").notNull(),
  voterName: text("voter_name").notNull(),
  countryName: text("country_name").notNull(),
  selectedOptions: text("selected_options").notNull(),
  createdAt: text("created_at").notNull(),
});

export const d1VoterAccountsTable = sqliteTable(
  "voter_accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    voterId: text("voter_id").notNull(),
    voterName: text("voter_name").notNull(),
    countryName: text("country_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    adminLevel: integer("admin_level").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({ voterIdUnique: uniqueIndex("voter_accounts_voter_id_unique").on(table.voterId) }),
);

export const insertD1VoteSchema = createInsertSchema(d1VotesTable).omit({ id: true });
export const insertD1BallotSchema = createInsertSchema(d1BallotsTable).omit({ id: true });
export const insertD1VoterAccountSchema = createInsertSchema(d1VoterAccountsTable).omit({ id: true });

export type InsertD1Vote = z.infer<typeof insertD1VoteSchema>;
export type D1Vote = typeof d1VotesTable.$inferSelect;
export type InsertD1Ballot = z.infer<typeof insertD1BallotSchema>;
export type D1Ballot = typeof d1BallotsTable.$inferSelect;
export type InsertD1VoterAccount = z.infer<typeof insertD1VoterAccountSchema>;
export type D1VoterAccount = typeof d1VoterAccountsTable.$inferSelect;

export function parseJsonArray(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("Expected a JSON encoded string array");
  }
  return parsed;
}

export function toJsonArray(values: string[]): string {
  return JSON.stringify(values);
}
