import assert from "node:assert/strict";
import test from "node:test";
import { shouldIgnoreWebhookEvent } from "./webhookRelay.js";

test("the webhook relay ignores vote.started because the Bot outbox owns that notice", () => {
  assert.equal(shouldIgnoreWebhookEvent("vote.started"), true);
});

test("the webhook relay keeps unrelated website and vote lifecycle events", () => {
  assert.equal(shouldIgnoreWebhookEvent("vote.created"), false);
  assert.equal(shouldIgnoreWebhookEvent("vote.published"), false);
  assert.equal(shouldIgnoreWebhookEvent("vote.closing_soon"), false);
  assert.equal(shouldIgnoreWebhookEvent("vote.closed"), false);
  assert.equal(shouldIgnoreWebhookEvent("ballot.cast"), false);
  assert.equal(shouldIgnoreWebhookEvent("member.updated"), false);
});
