import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const votesTable = pgTable("votes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  options: text("options").array().notNull(),
  allowMultiple: boolean("allow_multiple").notNull().default(false),
  isClosed: boolean("is_closed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const ballotsTable = pgTable("ballots", {
  id: serial("id").primaryKey(),
  voteId: integer("vote_id").notNull(),
  voterId: text("voter_id").notNull(),
  voterName: text("voter_name").notNull(),
  countryName: text("country_name").notNull(),
  selectedOptions: text("selected_options").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// adminLevel: 0=user, 1=tier-1 admin (basic: view+host polls), 2=tier-2 admin (full manage), 9=super admin
export const voterAccountsTable = pgTable("voter_accounts", {
  id: serial("id").primaryKey(),
  voterId: text("voter_id").notNull().unique(),
  voterName: text("voter_name").notNull(),
  countryName: text("country_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  adminLevel: integer("admin_level").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVoteSchema = createInsertSchema(votesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBallotSchema = createInsertSchema(ballotsTable).omit({ id: true, createdAt: true });
export const insertVoterAccountSchema = createInsertSchema(voterAccountsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votesTable.$inferSelect;
export type InsertBallot = z.infer<typeof insertBallotSchema>;
export type Ballot = typeof ballotsTable.$inferSelect;
export type InsertVoterAccount = z.infer<typeof insertVoterAccountSchema>;
export type VoterAccount = typeof voterAccountsTable.$inferSelect;
