import assert from "node:assert/strict";
import test from "node:test";
import { botAnnouncementSchema } from "../src/botAnnouncementSchema.ts";

const baseAnnouncement = {
  channelId: "123456789012345678",
  mode: "embed",
  title: "網站公告",
  content: "公告內容",
};

test("website announcement requests accept the selected role IDs", () => {
  const result = botAnnouncementSchema.safeParse({
    ...baseAnnouncement,
    roleIds: ["123456789012345678", "234567890123456789"],
  });
  assert.equal(result.success, true);
  assert.deepEqual(result.data.roleIds, ["123456789012345678", "234567890123456789"]);
});

test("website announcement requests remain compatible with a legacy roleId", () => {
  const result = botAnnouncementSchema.safeParse({ ...baseAnnouncement, roleId: "123456789012345678" });
  assert.equal(result.success, true);
  assert.equal(result.data.roleId, "123456789012345678");
});

test("website announcement requests reject malformed selected role IDs", () => {
  const result = botAnnouncementSchema.safeParse({ ...baseAnnouncement, roleIds: ["invalid"] });
  assert.equal(result.success, false);
});

test("website announcement requests cap selected roles to Discord's allowlist size", () => {
  const roleIds = Array.from({ length: 101 }, (_, index) => String(10000000000000000 + index));
  const result = botAnnouncementSchema.safeParse({ ...baseAnnouncement, roleIds });
  assert.equal(result.success, false);
});
