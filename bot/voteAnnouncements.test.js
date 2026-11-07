import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVoteStartAnnouncement,
  isVoteAnnouncementDue,
  processDueVoteAnnouncements,
  voteAnnouncementMarker,
} from "./voteAnnouncements.js";

const START = Date.parse("2026-03-29T01:30:00.000Z");
const vote = {
  id: 27,
  publicId: "FUMO-AG-2026-27",
  name: "例行大會",
  description: "請代表依照各自立場進行投票。",
  regularMeetingNumber: 43,
  isPublished: true,
  isClosed: false,
  startsAt: "2026-03-29T01:30:00.000Z",
  deadline: "2026-03-30T01:30:00.000Z",
};

test("a scheduled vote is not sent before its UTC start instant", () => {
  assert.equal(isVoteAnnouncementDue(vote, START - 1), false);
});

test("a scheduled vote becomes due exactly at the start instant", () => {
  assert.equal(isVoteAnnouncementDue(vote, START), true);
});

test("Bot announcement uses the configured meeting number and both local time zones", () => {
  const payload = buildVoteStartAnnouncement(vote, "https://www.micronationfumo.org");
  const embed = payload.embeds[0];
  assert.equal(embed.title, "第 43 次例行大會通知");
  assert.match(embed.fields[0].value, /台北時間：2026\/03\/29 09:30/);
  assert.match(embed.fields[0].value, /巴黎時間：2026\/03\/29 03:30/);
  assert.match(embed.fields[1].value, /巴黎時間：2026\/03\/30 03:30/);
  assert.equal(embed.url, "https://www.micronationfumo.org/votes/FUMO-AG-2026-27");
  assert.match(embed.footer.text, new RegExp(voteAnnouncementMarker(vote.id)));
});

test("the Bot title follows each vote's editable meeting number and name", () => {
  const customized = buildVoteStartAnnouncement({ ...vote, regularMeetingNumber: 8, name: "臨時會議" }, "https://www.micronationfumo.org");
  assert.equal(customized.embeds[0].title, "第 8 次臨時會議通知");
});

test("missing or invalid meeting numbers are never guessed", () => {
  assert.equal(isVoteAnnouncementDue({ ...vote, regularMeetingNumber: null }, START), false);
  assert.throws(() => buildVoteStartAnnouncement({ ...vote, regularMeetingNumber: null }, "https://www.micronationfumo.org"));
});

test("the bot claims and sends once when due, then persists the Discord message ID", async () => {
  const calls = [];
  const results = await processDueVoteAnnouncements([vote], {
    now: START,
    websiteUrl: "https://www.micronationfumo.org",
    claim: async id => ({ claimed: true, claimToken: "claim-27", vote: { ...vote, id } }),
    findExisting: async () => null,
    send: async (_claimedVote, payload) => {
      calls.push(["channel.send", payload.embeds[0].title]);
      return { id: "123456789012345678" };
    },
    markSent: async (...args) => calls.push(["markSent", ...args]),
    releaseClaim: async (...args) => calls.push(["releaseClaim", ...args]),
  });

  assert.deepEqual(calls, [
    ["channel.send", "第 43 次例行大會通知"],
    ["markSent", 27, "claim-27", "123456789012345678"],
  ]);
  assert.deepEqual(results, [{ voteId: 27, status: "sent" }]);
});

test("a restarted bot finds an already-posted marker and records it without resending", async () => {
  let sends = 0;
  let savedMessageId = "";
  const existingMessage = { id: "987654321098765432" };
  const results = await processDueVoteAnnouncements([vote], {
    now: START,
    websiteUrl: "https://www.micronationfumo.org",
    claim: async id => ({ claimed: true, claimToken: "retry-27", vote: { ...vote, id } }),
    findExisting: async () => existingMessage,
    send: async () => { sends += 1; return { id: "111111111111111111" }; },
    markSent: async (_id, _token, messageId) => { savedMessageId = messageId; },
    releaseClaim: async () => {},
  });

  assert.equal(sends, 0);
  assert.equal(savedMessageId, existingMessage.id);
  assert.deepEqual(results, [{ voteId: 27, status: "recovered" }]);
});
