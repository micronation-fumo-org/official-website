import assert from "node:assert/strict";
import test from "node:test";
import { canEditVoteDraft, validateVoteDraftFields } from "../src/voteDrafts.ts";

const NOW = Date.parse("2026-11-06T12:00:00.000Z");
const validDraft = {
  name: "會員國提案",
  description: "供管理員預覽的草稿",
  deadline: "2026-11-08T12:00:00.000Z",
  options: ["同意", "反對"],
  allowMultiple: false,
  customId: "FUMO-VOTE-2026-01",
  regularMeetingNumber: 1,
};

test("accepts a complete draft with a future deadline", () => {
  assert.deepEqual(validateVoteDraftFields(validDraft, NOW), []);
});

test("rejects blank names, blank options, and fewer than two choices", () => {
  const issues = validateVoteDraftFields({
    ...validDraft,
    name: "  ",
    options: ["同意", "  "],
  }, NOW);
  assert.deepEqual(issues.map(issue => issue.path), ["name", "options"]);
  assert.ok(validateVoteDraftFields({ ...validDraft, options: ["同意"] }, NOW)
    .some(issue => issue.path === "options" && issue.message.includes("兩個")));
});

test("rejects invalid or elapsed deadlines", () => {
  assert.ok(validateVoteDraftFields({ ...validDraft, deadline: "not-a-date" }, NOW)
    .some(issue => issue.path === "deadline"));
  assert.ok(validateVoteDraftFields({ ...validDraft, deadline: "2026-11-06T11:59:59.000Z" }, NOW)
    .some(issue => issue.path === "deadline"));
});

test("only unpublished drafts without ballots are editable", () => {
  assert.equal(canEditVoteDraft(false, 0), true);
  assert.equal(canEditVoteDraft(true, 0), false);
  assert.equal(canEditVoteDraft(false, 1), false);
});
