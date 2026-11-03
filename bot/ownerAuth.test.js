import assert from "node:assert/strict";
import test from "node:test";
import { extractApplicationOwnerId, isBotOwner } from "./ownerAuth.js";

const APPLICATION_OWNER_ID = "111111111111111111";
const SERVER_OWNER_ID = "222222222222222222";
const TEAM_ID = "333333333333333333";

test("resolves the owner from a user-owned Discord application", () => {
  assert.equal(extractApplicationOwnerId({ id: APPLICATION_OWNER_ID, username: "app-owner" }), APPLICATION_OWNER_ID);
});

test("resolves the owner user ID, not the team ID, for a team-owned application", () => {
  assert.equal(extractApplicationOwnerId({ id: TEAM_ID, ownerId: APPLICATION_OWNER_ID }), APPLICATION_OWNER_ID);
  assert.equal(extractApplicationOwnerId({ id: TEAM_ID, ownerId: null }), "");
});

test("authorizes only the Discord application owner, not the server owner", () => {
  assert.equal(isBotOwner(APPLICATION_OWNER_ID, APPLICATION_OWNER_ID), true);
  assert.equal(isBotOwner(SERVER_OWNER_ID, APPLICATION_OWNER_ID), false);
  assert.equal(isBotOwner(TEAM_ID, APPLICATION_OWNER_ID), false);
  assert.equal(isBotOwner(APPLICATION_OWNER_ID, ""), false);
});
