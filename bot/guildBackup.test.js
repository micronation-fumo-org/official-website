import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ChannelType } from "discord.js";
import {
  createGuildBackup,
  loadLatestGuildBackup,
  parseGuildBackup,
  restoreGuildBackup,
  saveGuildBackup,
  validateGuildBackup,
} from "./guildBackup.js";

const SOURCE_GUILD_ID = "111111111111111111";
const SOURCE_ROLE_ID = "222222222222222222";
const USER_ID = "333333333333333333";
const TARGET_GUILD_ID = "999999999999999999";
const ALLOW = (1n << 10n).toString();
const DENY = "0";

function overwrite(id, type = 0, allow = ALLOW, deny = DENY) {
  return { id, type, allow: { bitfield: BigInt(allow) }, deny: { bitfield: BigInt(deny) } };
}

function sourceGuild() {
  const everyone = {
    id: SOURCE_GUILD_ID,
    name: "原始伺服器",
    roles: { cache: new Map([
      [SOURCE_GUILD_ID, { id: SOURCE_GUILD_ID, name: "@everyone", managed: false, position: 0, color: 0, hoist: false, mentionable: false, permissions: { bitfield: 0n } }],
      [SOURCE_ROLE_ID, { id: SOURCE_ROLE_ID, name: "成員", managed: false, position: 2, color: 0x336699, hoist: true, mentionable: false, permissions: { bitfield: 2048n } }],
      ["444444444444444444", { id: "444444444444444444", name: "Bot Managed", managed: true, position: 3, color: 0, hoist: false, mentionable: false, permissions: { bitfield: 0n } }],
    ]) },
    channels: { cache: new Map([
      ["555555555555555555", {
        id: "555555555555555555", name: "社群", type: ChannelType.GuildCategory, position: 0, parentId: null,
        permissionOverwrites: { cache: new Map([[SOURCE_ROLE_ID, overwrite(SOURCE_ROLE_ID)]]) },
      }],
      ["666666666666666666", {
        id: "666666666666666666", name: "聊天", type: ChannelType.GuildText, position: 1, parentId: "555555555555555555",
        topic: "一般討論", nsfw: false, rateLimitPerUser: 2, defaultAutoArchiveDuration: 1440, defaultThreadRateLimitPerUser: 2,
        permissionOverwrites: { cache: new Map([[SOURCE_ROLE_ID, overwrite(SOURCE_ROLE_ID)], [USER_ID, overwrite(USER_ID, 1)]]) },
      }],
      ["777777777777777778", {
        id: "777777777777777778", name: "提案", type: ChannelType.GuildForum, position: 2, parentId: "555555555555555555",
        topic: "提案討論", nsfw: false, defaultAutoArchiveDuration: 4320, defaultThreadRateLimitPerUser: 1,
        defaultReactionEmoji: { id: null, name: "👍" },
        availableTags: [
          { name: "草案", moderated: false, emoji: { id: null, name: "📌" } },
          { name: "投票", moderated: true, emoji: { id: "888888888888888888", name: null } },
        ],
        permissionOverwrites: { cache: new Map() },
      }],
      ["777777777777777777", {
        id: "777777777777777777", name: "舊串文", type: ChannelType.PublicThread, position: 2, parentId: "666666666666666666",
        permissionOverwrites: { cache: new Map() },
      }],
    ]) },
  };
  return everyone;
}

function validBackup() {
  return createGuildBackup(sourceGuild());
}

test("serializes restorable roles and channels while omitting managed roles and threads", () => {
  const backup = validBackup();
  assert.equal(backup.schemaVersion, 1);
  assert.deepEqual(backup.roles.map(role => role.id), [SOURCE_ROLE_ID]);
  assert.deepEqual(backup.channels.map(channel => channel.name), ["社群", "聊天", "提案"]);
  assert.equal(backup.channels[1].topic, "一般討論");
  assert.equal(backup.channels[1].defaultAutoArchiveDuration, 1440);
  assert.equal(backup.channels[1].permissionOverwrites.length, 2);
  assert.deepEqual(backup.channels[2].defaultReactionEmoji, { id: null, name: "👍" });
  assert.deepEqual(backup.channels[2].availableTags, [
    { name: "草案", moderated: false, emoji: { id: null, name: "📌" } },
    { name: "投票", moderated: true, emoji: { id: "888888888888888888", name: null } },
  ]);
  assert.equal(validateGuildBackup(backup), backup);
});

test("parses a JSON backup and rejects malformed or unsupported structures", () => {
  const backup = validBackup();
  assert.equal(parseGuildBackup(Buffer.from(JSON.stringify(backup))).sourceGuild.id, SOURCE_GUILD_ID);
  assert.throws(() => parseGuildBackup(Buffer.from("not json")), /有效的 JSON/);
  assert.throws(() => validateGuildBackup({ ...backup, schemaVersion: 99 }), /不支援此備份版本/);
  assert.throws(() => validateGuildBackup({ ...backup, channels: [{ ...backup.channels[1], parentId: "888888888888888888" }] }), /分類未包含/);
  assert.throws(() => validateGuildBackup({ ...backup, roles: [{ ...backup.roles[0], permissions: "not-a-bitfield" }] }), /權限格式錯誤/);
  const invalidTagEmoji = structuredClone(backup);
  invalidTagEmoji.channels[2].availableTags[0].emoji = { id: "invalid", name: "📌" };
  assert.throws(() => validateGuildBackup(invalidTagEmoji), /標籤 emoji ID 格式錯誤/);
});

test("saves local snapshots atomically and chooses the most recent valid backup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fumo-guild-backup-test-"));
  try {
    const first = validBackup();
    first.createdAt = "2026-01-01T00:00:00.000Z";
    await saveGuildBackup(first, directory);
    const second = structuredClone(first);
    second.sourceGuild = { id: "888888888888888888", name: "新伺服器" };
    second.createdAt = "2026-01-02T00:00:00.000Z";
    await saveGuildBackup(second, directory);
    const loaded = await loadLatestGuildBackup(directory);
    assert.equal(loaded.backup.sourceGuild.id, second.sourceGuild.id);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("restores roles, categories, channel permission mappings, and skips absent members", async () => {
  const backup = validBackup();
  let roleSequence = 0;
  let channelSequence = 0;
  const createdRoles = [];
  const createdChannels = [];
  const targetRoles = new Map([[TARGET_GUILD_ID, { id: TARGET_GUILD_ID }]]);
  const targetGuild = {
    id: TARGET_GUILD_ID,
    roles: {
      cache: targetRoles,
      async fetch() {},
      async edit(id, options) { this.editedEveryone = { id, options }; },
      async create(options) {
        const role = { id: `90000000000000000${++roleSequence}`, options };
        targetRoles.set(role.id, role);
        createdRoles.push(role);
        return role;
      },
      async setPositions(positions) { this.positions = positions; },
    },
    channels: {
      cache: new Map(),
      async fetch() {},
      async create(options) {
        const channel = { id: `80000000000000000${++channelSequence}`, options };
        createdChannels.push(channel);
        return channel;
      },
    },
    members: {
      me: { permissions: { has: () => true } },
      async fetch() { throw new Error("Member is not present"); },
    },
  };

  const result = await restoreGuildBackup(targetGuild, backup);
  assert.equal(result.createdRoles, 1);
  assert.equal(result.createdChannels, 3);
  assert.equal(result.skippedOverwrites, 1);
  assert.equal(result.skippedChannels, 0);
  assert.equal(result.roleOrderRestored, true);
  assert.equal(result.everyonePermissionsUpdated, true);
  assert.equal(targetGuild.roles.editedEveryone.id, TARGET_GUILD_ID);
  assert.equal(targetGuild.roles.editedEveryone.options.permissions, 0n);
  assert.equal(createdRoles[0].options.name, "成員");
  assert.equal(createdChannels[1].options.parent, createdChannels[0].id);
  assert.equal(createdChannels[1].options.topic, "一般討論");
  assert.equal(createdChannels[1].options.defaultAutoArchiveDuration, 1440);
  assert.equal(createdChannels[1].options.defaultThreadRateLimitPerUser, 2);
  assert.equal(createdChannels[1].options.permissionOverwrites.length, 1);
  assert.equal(createdChannels[1].options.permissionOverwrites[0].id, createdRoles[0].id);
  assert.deepEqual(createdChannels[2].options.defaultReactionEmoji, { id: null, name: "👍" });
  assert.deepEqual(createdChannels[2].options.availableTags, [
    { name: "草案", moderated: false, emoji: { id: null, name: "📌" } },
    { name: "投票", moderated: true, emoji: { id: "888888888888888888", name: null } },
  ]);
});
