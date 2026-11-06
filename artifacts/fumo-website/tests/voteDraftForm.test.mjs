import assert from "node:assert/strict";
import test from "node:test";
import { getVoteDraftEditId, parseVoteDraftResponse } from "../src/lib/voteDraftForm.ts";

const expected = {
  id: 41,
  publicId: "FUMO-VOTE-2026-01",
  name: "會員國提案",
  description: "這是已儲存的草稿說明。",
  deadline: "2026-11-08T12:00:00.000Z",
  options: ["同意", "反對", "棄權"],
  allowMultiple: true,
  customId: "FUMO-VOTE-2026-01",
  regularMeetingNumber: 12,
  isPublished: false,
  ballotCount: 0,
};

test("prefers the edit route component params and falls back to route context params", () => {
  assert.equal(getVoteDraftEditId({ id: "FUMO-VOTE-2026-01" }, { id: "old-id" }), "FUMO-VOTE-2026-01");
  assert.equal(getVoteDraftEditId({}, { id: "41" }), "41");
  assert.equal(getVoteDraftEditId({}, {}), undefined);
});

test("hydrates every saved draft field from the API vote response", () => {
  assert.deepEqual(parseVoteDraftResponse(expected), expected);
});

test("accepts an enveloped response with database-style field names", () => {
  const draft = parseVoteDraftResponse({ vote: {
    id: "41",
    custom_id: "FUMO-VOTE-2026-01",
    name: "會員國提案",
    description: "這是已儲存的草稿說明。",
    deadline: "2026-11-08T12:00:00.000Z",
    options: JSON.stringify(["同意", "反對", "棄權"]),
    allow_multiple: 1,
    regular_meeting_number: 12,
    is_published: 0,
    ballot_count: 0,
  } });
  assert.deepEqual(draft, expected);
});

test("rejects incomplete successful responses instead of filling a blank editor", () => {
  assert.throws(
    () => parseVoteDraftResponse({ isPublished: false, name: "", options: [] }),
    /資料不完整/,
  );
});
