import assert from "node:assert/strict";
import test from "node:test";
import { extractApplicationOwnerId, isBotOwner } from "./ownerAuth.js";

const OWNER_ID = "111111111111111111";
const GUILD_OWNER_ID = "222222222222222222";
const TEAM_ID = "333333333333333333";

test("resolves the owner from a user-owned Discord application", () => {
  assert.equal(extractApplicationOwnerId({ id: OWNER_ID, username: "app-owner" }), OWNER_ID);
});

test("resolves the owner user ID, not the team ID, for a team-owned application", () => {
  assert.equal(extractApplicationOwnerId({ id: TEAM_ID, ownerId: OWNER_ID }), OWNER_ID);
  assert.equal(extractApplicationOwnerId({ id: TEAM_ID, ownerId: null }), "");
});

test("authorizes only the Discord application owner, not the server owner", () => {
  assert.equal(isBotOwner(OWNER_ID, OWNER_ID), true);
  assert.equal(isBotOwner(GUILD_OWNER_ID, OWNER_ID), false);
  assert.equal(isBotOwner(TEAM_ID, OWNER_ID), false);
  assert.equal(isBotOwner(OWNER_ID, ""), false);
});
