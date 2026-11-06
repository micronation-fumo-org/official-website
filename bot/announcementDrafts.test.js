import assert from "node:assert/strict";
import test from "node:test";
import {
  ANNOUNCEMENT_DRAFT_TTL_MS,
  createAnnouncementDraft,
  deleteAnnouncementDraft,
  getAnnouncementDraft,
  pruneAnnouncementDrafts,
  updateAnnouncementDraft,
} from "./announcementDrafts.js";

const draftData = {
  id: "draft-1",
  userId: "111111111111111111",
  guildId: "222222222222222222",
  title: "初始標題",
  content: "初始內容",
  mode: "embed",
};

test("creates and edits a private draft without consuming it", () => {
  const drafts = new Map();
  const created = createAnnouncementDraft(drafts, draftData, 1000);
  assert.equal(created.expiresAt, 1000 + ANNOUNCEMENT_DRAFT_TTL_MS);

  const edited = updateAnnouncementDraft(drafts, draftData, {
    title: "修訂標題",
    content: "修訂內容",
  }, 2000);

  assert.equal(edited.title, "修訂標題");
  assert.equal(edited.content, "修訂內容");
  assert.equal(edited.mode, "embed");
  assert.equal(edited.expiresAt, 2000 + ANNOUNCEMENT_DRAFT_TTL_MS);
  assert.equal(drafts.has(draftData.id), true);
  assert.deepEqual(getAnnouncementDraft(drafts, draftData, 2000), edited);
});

test("only the creator in the same guild can read, edit, or delete a draft", () => {
  const drafts = new Map();
  createAnnouncementDraft(drafts, draftData, 1000);
  const otherUser = { ...draftData, userId: "333333333333333333" };
  const otherGuild = { ...draftData, guildId: "444444444444444444" };

  assert.equal(getAnnouncementDraft(drafts, otherUser, 1001), null);
  assert.equal(updateAnnouncementDraft(drafts, otherUser, { title: "偽造", content: "內容" }, 1001), null);
  assert.equal(deleteAnnouncementDraft(drafts, otherUser, 1001), false);
  assert.equal(getAnnouncementDraft(drafts, otherGuild, 1001), null);
  assert.equal(drafts.has(draftData.id), true);
  assert.equal(getAnnouncementDraft(drafts, draftData, 1001).title, "初始標題");
});

test("expires and prunes drafts after the configured lifetime", () => {
  const drafts = new Map();
  createAnnouncementDraft(drafts, draftData, 1000);
  assert.equal(getAnnouncementDraft(drafts, draftData, 1000 + ANNOUNCEMENT_DRAFT_TTL_MS), null);
  assert.equal(drafts.has(draftData.id), false);

  createAnnouncementDraft(drafts, draftData, 2000);
  assert.equal(pruneAnnouncementDrafts(drafts, 2000 + ANNOUNCEMENT_DRAFT_TTL_MS), 1);
  assert.equal(drafts.size, 0);
});

test("rejects blank or over-limit draft fields", () => {
  const drafts = new Map();
  assert.throws(() => createAnnouncementDraft(drafts, { ...draftData, title: "  " }), /標題不可為空/);
  assert.throws(() => createAnnouncementDraft(drafts, { ...draftData, content: "" }), /內容不可為空/);
  assert.throws(() => createAnnouncementDraft(drafts, { ...draftData, title: "標題".repeat(129) }), /256 字元/);
  assert.throws(() => createAnnouncementDraft(drafts, { ...draftData, content: "內".repeat(1901) }), /1900 字元/);
  assert.equal(drafts.size, 0);
});

test("only an explicit authorized delete removes a non-expired draft", () => {
  const drafts = new Map();
  createAnnouncementDraft(drafts, draftData, 1000);
  assert.equal(deleteAnnouncementDraft(drafts, draftData, 1001), true);
  assert.equal(drafts.size, 0);
});
