import { once } from "node:events";
import assert from "node:assert/strict";
import test from "node:test";
import { shouldIgnoreWebhookEvent, startWebhookRelay } from "./webhookRelay.js";

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

async function startTestRelay(t) {
  let sentPayload;
  const channel = {
    id: "channel-1",
    isTextBased: () => true,
    isSendable: () => true,
    send: async payload => {
      sentPayload = payload;
      return { id: "message-1", url: "https://discord.com/channels/guild-1/channel-1/message-1" };
    },
  };
  const roleList = [
    { id: "guild-1", name: "@everyone", position: 0, mentionable: true, managed: false },
    { id: "123456789012345678", name: "Council", position: 2, mentionable: true, managed: false },
    { id: "234567890123456789", name: "Members", position: 1, mentionable: false, managed: false },
    { id: "345678901234567890", name: "Managed role", position: 3, mentionable: false, managed: true },
  ];
  const guild = {
    id: "guild-1",
    channels: { cache: { values: () => [channel] } },
    roles: { cache: { values: () => roleList } },
  };
  const server = startWebhookRelay({
    client: {
      channels: { fetch: async () => channel },
      guilds: { cache: { get: id => id === guild.id ? guild : null } },
      isReady: () => true,
    },
    guildId: guild.id,
    channelId: channel.id,
    websiteUrl: "https://www.micronationfumo.org",
    secret: "",
    path: "/fumo/webhook",
    port: 0,
    mentionRoleId: "456789012345678901",
    mentionEvents: ["vote.published"],
    defaultAuthor: "FUMO Bot",
  });
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    sentPayload: () => sentPayload,
    getRoles: () => fetch(`${baseUrl}/roles`),
    sendAnnouncement: payload => fetch(`${baseUrl}/announce`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelId: channel.id, mode: "embed", title: "Website announcement", content: "Announcement body", ...payload }),
    }),
    sendVoteEvent: () => fetch(`${baseUrl}/fumo/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-fumo-event": "vote.published" },
      body: JSON.stringify({ event: "vote.published", vote: { name: "Test vote", startsAt: "2026-03-29T01:30:00.000Z", deadline: "2026-03-30T01:30:00.000Z" } }),
    }),
  };
}

test("the website role picker endpoint returns selectable roles, excluding everyone and managed roles", async t => {
  const relay = await startTestRelay(t);
  const response = await relay.getRoles();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).roles.map(({ id, name }) => ({ id, name })), [
    { id: "123456789012345678", name: "Council" },
    { id: "234567890123456789", name: "Members" },
  ]);
});

test("a website announcement mentions only its selected roles and allowlists those roles", async t => {
  const relay = await startTestRelay(t);
  const response = await relay.sendAnnouncement({ roleIds: ["123456789012345678", "234567890123456789"] });
  assert.equal(response.status, 200);
  assert.equal(relay.sentPayload().content, "<@&123456789012345678> <@&234567890123456789>");
  assert.deepEqual(relay.sentPayload().allowedMentions, { roles: ["123456789012345678", "234567890123456789"] });
});

test("the website announcement relay remains compatible with a legacy single roleId payload", async t => {
  const relay = await startTestRelay(t);
  const response = await relay.sendAnnouncement({ roleId: "123456789012345678" });
  assert.equal(response.status, 200);
  assert.equal(relay.sentPayload().content, "<@&123456789012345678>");
  assert.deepEqual(relay.sentPayload().allowedMentions, { roles: ["123456789012345678"] });
});

test("website plain-text announcements allow only their selected roles", async t => {
  const relay = await startTestRelay(t);
  const response = await relay.sendAnnouncement({ mode: "text", title: "", roleIds: ["123456789012345678"] });
  assert.equal(response.status, 200);
  assert.equal(relay.sentPayload().content, "<@&123456789012345678>\n\nAnnouncement body");
  assert.deepEqual(relay.sentPayload().allowedMentions, { roles: ["123456789012345678"] });
});

test("vote webhook times show Taipei UTC+8 and Paris local time", async t => {
  const relay = await startTestRelay(t);
  const response = await relay.sendVoteEvent();
  assert.equal(response.status, 204);
  const fields = relay.sentPayload().embeds[0].fields;
  assert.match(fields.find(field => field.name === "開始時間").value, /台北時間（UTC\+8）：2026\/03\/29 09:30\n巴黎時間：2026\/03\/29 03:30/);
  assert.match(fields.find(field => field.name === "截止時間").value, /台北時間（UTC\+8）：2026\/03\/30 09:30\n巴黎時間：2026\/03\/30 03:30/);
});

test("the pre-existing automated vote-event role mention remains unchanged", async t => {
  const relay = await startTestRelay(t);
  const response = await relay.sendVoteEvent();
  assert.equal(response.status, 204);
  assert.equal(relay.sentPayload().content, "<@&456789012345678901>");
  assert.deepEqual(relay.sentPayload().allowedMentions, { roles: ["456789012345678901"] });
});
