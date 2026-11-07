import assert from "node:assert/strict";
import test from "node:test";
import {
  hasValidBotBearerToken,
  storedUtcInstantToIso,
} from "../src/botVoteAnnouncements.ts";

test("Bot API accepts only the configured server-side bearer token", () => {
  assert.equal(hasValidBotBearerToken("private-token", "Bearer private-token"), true);
  assert.equal(hasValidBotBearerToken("private-token", "Bearer wrong-token"), false);
  assert.equal(hasValidBotBearerToken(undefined, "Bearer private-token"), false);
  assert.equal(hasValidBotBearerToken("private-token", undefined), false);
});

test("D1 legacy datetime strings are converted as UTC instants, not host-local time", () => {
  assert.equal(
    storedUtcInstantToIso("2026-03-29 01:30:00"),
    "2026-03-29T01:30:00.000Z",
  );
  assert.equal(
    storedUtcInstantToIso("2026-03-29T01:30:00.000Z"),
    "2026-03-29T01:30:00.000Z",
  );
  assert.equal(storedUtcInstantToIso(null), null);
});
