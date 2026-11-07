import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVoteAnnouncementRoleOptions,
  DEFAULT_VOTE_ANNOUNCEMENT_CHANNEL_ID,
  DEFAULT_VOTE_ANNOUNCEMENT_ROLE_ID,
  getVoteAnnouncementConfig,
} from "./voteAnnouncementConfig.js";

test("vote-start notifications default to the dedicated owner-provided channel and role", () => {
  assert.deepEqual(getVoteAnnouncementConfig({}), {
    channelId: "1249237308096643186",
    roleId: "1556182329238618154",
  });
  assert.equal(DEFAULT_VOTE_ANNOUNCEMENT_CHANNEL_ID, "1249237308096643186");
  assert.equal(DEFAULT_VOTE_ANNOUNCEMENT_ROLE_ID, "1556182329238618154");
});

test("dedicated vote-start environment variables override their defaults without reading shared announcement settings", () => {
  assert.deepEqual(getVoteAnnouncementConfig({
    ANNOUNCEMENT_CHANNEL_ID: "111111111111111111",
    ANNOUNCEMENT_ROLE_ID: "222222222222222222",
    VOTE_ANNOUNCEMENT_CHANNEL_ID: "333333333333333333",
    VOTE_ANNOUNCEMENT_ROLE_ID: "444444444444444444",
  }), {
    channelId: "333333333333333333",
    roleId: "444444444444444444",
  });
});

test("an explicitly empty dedicated vote role disables role pings", () => {
  assert.deepEqual(getVoteAnnouncementConfig({ VOTE_ANNOUNCEMENT_ROLE_ID: "" }).roleId, "");
  assert.deepEqual(buildVoteAnnouncementRoleOptions(""), {
    content: "",
    allowedMentions: { parse: [] },
  });
});

test("vote-start role mentions allow only the configured dedicated role", () => {
  assert.deepEqual(buildVoteAnnouncementRoleOptions("1556182329238618154"), {
    content: "<@&1556182329238618154>",
    allowedMentions: { roles: ["1556182329238618154"] },
  });
});
