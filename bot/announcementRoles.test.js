import assert from "node:assert/strict";
import test from "node:test";
import { buildRoleMentionOptions, normalizeAnnouncementRoleIds } from "./announcementRoles.js";

test("normalizes selected website announcement roles and removes duplicates or invalid IDs", () => {
  assert.deepEqual(
    normalizeAnnouncementRoleIds([" 123456789012345678 ", "234567890123456789", "123456789012345678", "not-a-role"]),
    ["123456789012345678", "234567890123456789"],
  );
});

test("keeps compatibility with a legacy single roleId payload", () => {
  assert.deepEqual(normalizeAnnouncementRoleIds(undefined, "123456789012345678"), ["123456789012345678"]);
});

test("uses selected roles as both mention content and the allowedMentions allowlist", () => {
  assert.deepEqual(buildRoleMentionOptions(["123456789012345678", "234567890123456789"]), {
    content: "<@&123456789012345678> <@&234567890123456789>",
    allowedMentions: { roles: ["123456789012345678", "234567890123456789"] },
  });
});

test("disables all mentions when no valid website roles were selected", () => {
  assert.deepEqual(buildRoleMentionOptions(["not-a-role"]), {
    content: "",
    allowedMentions: { parse: [] },
  });
});
