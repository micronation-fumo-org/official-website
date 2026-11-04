import { mkdir, readFile, rename, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ChannelType, PermissionFlagsBits } from "discord.js";

export const BACKUP_SCHEMA_VERSION = 1;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

const BOT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BACKUP_DIRECTORY = join(BOT_DIRECTORY, "data", "server-backups");
const SUPPORTED_CHANNEL_TYPES = new Set([
  ChannelType.GuildCategory,
  ChannelType.GuildText,
  ChannelType.GuildVoice,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildStageVoice,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
].filter(Number.isInteger));
const TEXT_CHANNEL_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
]);
const VOICE_CHANNEL_TYPES = new Set([ChannelType.GuildVoice, ChannelType.GuildStageVoice]);
const FORUM_CHANNEL_TYPES = new Set([ChannelType.GuildForum, ChannelType.GuildMedia]);
const SNOWFLAKE_PATTERN = /^\d{15,25}$/;
const BITFIELD_PATTERN = /^\d{1,40}$/;

export function getBackupDirectory(configuredPath = process.env.FUMO_GUILD_BACKUP_DIR) {
  return resolve(configuredPath || DEFAULT_BACKUP_DIRECTORY);
}

function serializeOverwrites(channel) {
  return [...channel.permissionOverwrites.cache.values()].map(overwrite => ({
    id: overwrite.id,
    type: overwrite.type,
    allow: overwrite.allow.bitfield.toString(),
    deny: overwrite.deny.bitfield.toString(),
  }));
}

function serializeUserLimit(value) {
  if (value === undefined || value === null) return 0;
  if (typeof value === "bigint") {
    if (value >= 0n && value <= 99n) return Number(value);
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const numericValue = Number(value);
    if (Number.isSafeInteger(numericValue)) return numericValue;
  }
  return value;
}

function safeDiagnosticValue(value) {
  if (value === null) return "null";
  if (typeof value === "string") {
    const shortened = value.length > 48 ? `${value.slice(0, 48)}…` : value;
    return JSON.stringify(shortened);
  }
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : String(value);
  if (typeof value === "bigint") return `${value}n`;
  return `<${typeof value}>`;
}

function userLimitErrorMessage(channel, value) {
  const channelId = typeof channel?.id === "string" && SNOWFLAKE_PATTERN.test(channel.id)
    ? channel.id
    : "invalid";
  const channelType = Number.isInteger(channel?.type) ? String(channel.type) : safeDiagnosticValue(channel?.type);
  return `語音頻道人數上限格式錯誤（channelId=${channelId}, channelType=${channelType}, valueType=${typeof value}, value=${safeDiagnosticValue(value)}）。`;
}

function serializeChannel(channel) {
  const entry = {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    position: channel.position,
    parentId: channel.parentId || null,
    permissionOverwrites: serializeOverwrites(channel),
  };

  const optionalProperties = {
    topic: channel.topic,
    nsfw: channel.nsfw,
    rateLimitPerUser: channel.rateLimitPerUser,
    bitrate: channel.bitrate,
    userLimit: VOICE_CHANNEL_TYPES.has(channel.type) ? serializeUserLimit(channel.userLimit) : undefined,
    rtcRegion: channel.rtcRegion,
    videoQualityMode: channel.videoQualityMode,
    defaultAutoArchiveDuration: channel.defaultAutoArchiveDuration,
    defaultThreadRateLimitPerUser: channel.defaultThreadRateLimitPerUser,
    defaultReactionEmoji: channel.defaultReactionEmoji
      ? {
        id: channel.defaultReactionEmoji.id ?? channel.defaultReactionEmoji.emojiId ?? null,
        name: channel.defaultReactionEmoji.name ?? channel.defaultReactionEmoji.emojiName ?? null,
      }
      : undefined,
    defaultSortOrder: channel.defaultSortOrder,
    defaultForumLayout: channel.defaultForumLayout,
    availableTags: Array.isArray(channel.availableTags)
      ? channel.availableTags.map(tag => ({
        name: tag.name,
        moderated: Boolean(tag.moderated),
        emoji: tag.emoji
          ? { id: tag.emoji.id ?? null, name: tag.emoji.name ?? null }
          : null,
      }))
      : undefined,
  };
  for (const [key, value] of Object.entries(optionalProperties)) {
    if (value !== undefined) entry[key] = value;
  }
  return entry;
}

export function createGuildBackup(guild) {
  const everyoneRole = guild.roles.cache.get(guild.id);
  assert(everyoneRole?.permissions?.bitfield !== undefined, "無法讀取 @everyone 權限。");
  const roles = [...guild.roles.cache.values()]
    .filter(role => role.id !== guild.id && !role.managed)
    .sort((a, b) => a.position - b.position)
    .map(role => ({
      id: role.id,
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions.bitfield.toString(),
      position: role.position,
    }));

  const channels = [...guild.channels.cache.values()]
    .filter(channel => SUPPORTED_CHANNEL_TYPES.has(channel.type))
    .map(serializeChannel)
    .sort((a, b) => {
      const aIsCategory = a.type === ChannelType.GuildCategory;
      const bIsCategory = b.type === ChannelType.GuildCategory;
      if (aIsCategory !== bIsCategory) return aIsCategory ? -1 : 1;
      if (a.parentId !== b.parentId) return (a.parentId || "").localeCompare(b.parentId || "");
      return a.position - b.position;
    });

  const backup = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    sourceGuild: { id: guild.id, name: guild.name },
    everyonePermissions: everyoneRole.permissions.bitfield.toString(),
    roles,
    channels,
  };
  validateGuildBackup(backup);
  return backup;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validOptionalInteger(value, min, max) {
  return value === undefined || value === null || (Number.isInteger(value) && value >= min && value <= max);
}

export function validateGuildBackup(backup) {
  assert(backup && typeof backup === "object" && !Array.isArray(backup), "備份 JSON 格式錯誤。");
  assert(backup.schemaVersion === BACKUP_SCHEMA_VERSION, "不支援此備份版本。");
  assert(typeof backup.createdAt === "string" && Number.isFinite(Date.parse(backup.createdAt)), "備份時間格式錯誤。");
  assert(backup.sourceGuild && SNOWFLAKE_PATTERN.test(backup.sourceGuild.id), "備份缺少有效的來源伺服器 ID。");
  assert(typeof backup.sourceGuild.name === "string" && backup.sourceGuild.name.length <= 100, "來源伺服器名稱格式錯誤。");
  assert(BITFIELD_PATTERN.test(backup.everyonePermissions), "@everyone 權限格式錯誤。");
  assert(Array.isArray(backup.roles) && backup.roles.length <= 249, "身分組清單無效或超過 Discord 上限。");
  assert(Array.isArray(backup.channels) && backup.channels.length <= 500, "頻道清單無效或超過 Discord 上限。");

  const roleIds = new Set([backup.sourceGuild.id]);
  for (const role of backup.roles) {
    assert(role && typeof role === "object", "身分組資料格式錯誤。");
    assert(SNOWFLAKE_PATTERN.test(role.id) && !roleIds.has(role.id), "身分組 ID 無效或重複。");
    assert(typeof role.name === "string" && role.name.length >= 1 && role.name.length <= 100, "身分組名稱格式錯誤。");
    assert(Number.isInteger(role.color) && role.color >= 0 && role.color <= 0xffffff, "身分組顏色格式錯誤。");
    assert(typeof role.hoist === "boolean" && typeof role.mentionable === "boolean", "身分組設定格式錯誤。");
    assert(BITFIELD_PATTERN.test(role.permissions), "身分組權限格式錯誤。");
    assert(Number.isInteger(role.position) && role.position >= 0 && role.position <= 10000, "身分組排序格式錯誤。");
    roleIds.add(role.id);
  }

  const channelIds = new Set();
  for (const channel of backup.channels) {
    assert(channel && typeof channel === "object", "頻道資料格式錯誤。");
    assert(SNOWFLAKE_PATTERN.test(channel.id) && !channelIds.has(channel.id), "頻道 ID 無效或重複。");
    assert(typeof channel.name === "string" && channel.name.length >= 1 && channel.name.length <= 100, "頻道名稱格式錯誤。");
    assert(SUPPORTED_CHANNEL_TYPES.has(channel.type), "備份包含不支援的頻道類型。");
    assert(Number.isInteger(channel.position) && channel.position >= 0 && channel.position <= 10000, "頻道排序格式錯誤。");
    assert(channel.parentId === null || SNOWFLAKE_PATTERN.test(channel.parentId), "頻道分類 ID 格式錯誤。");
    assert(Array.isArray(channel.permissionOverwrites) && channel.permissionOverwrites.length <= 100, "頻道權限覆寫格式錯誤。");
    for (const overwrite of channel.permissionOverwrites) {
      assert(overwrite && SNOWFLAKE_PATTERN.test(overwrite.id), "權限覆寫 ID 格式錯誤。");
      assert(overwrite.type === 0 || overwrite.type === 1, "權限覆寫類型格式錯誤。");
      assert(BITFIELD_PATTERN.test(overwrite.allow) && BITFIELD_PATTERN.test(overwrite.deny), "權限覆寫位元格式錯誤。");
    }
    if (channel.topic !== undefined && channel.topic !== null) assert(typeof channel.topic === "string" && channel.topic.length <= 1024, "頻道主題格式錯誤。");
    if (channel.nsfw !== undefined) assert(typeof channel.nsfw === "boolean", "頻道 NSFW 設定格式錯誤。");
    assert(validOptionalInteger(channel.rateLimitPerUser, 0, 21600), "頻道慢速模式格式錯誤。");
    assert(validOptionalInteger(channel.bitrate, 8000, 512000), "語音頻道位元率格式錯誤。");
    assert(validOptionalInteger(channel.userLimit, 0, 99), userLimitErrorMessage(channel, channel.userLimit));
    assert(validOptionalInteger(channel.defaultAutoArchiveDuration, 60, 10080), "串文封存時間格式錯誤。");
    assert(validOptionalInteger(channel.defaultThreadRateLimitPerUser, 0, 21600), "串文慢速模式格式錯誤。");
    if (channel.defaultReactionEmoji !== undefined && channel.defaultReactionEmoji !== null) {
      assert(typeof channel.defaultReactionEmoji === "object", "Forum 預設表情格式錯誤。");
      assert(channel.defaultReactionEmoji.id === null || SNOWFLAKE_PATTERN.test(channel.defaultReactionEmoji.id), "Forum 預設表情 ID 格式錯誤。");
      assert(channel.defaultReactionEmoji.name === null || (typeof channel.defaultReactionEmoji.name === "string" && channel.defaultReactionEmoji.name.length <= 32), "Forum 預設表情名稱格式錯誤。");
    }
    if (channel.availableTags !== undefined) {
      assert(Array.isArray(channel.availableTags) && channel.availableTags.length <= 20, "Forum 標籤格式錯誤。");
      for (const tag of channel.availableTags) {
        assert(typeof tag.name === "string" && tag.name.length >= 1 && tag.name.length <= 20 && typeof tag.moderated === "boolean", "Forum 標籤資料格式錯誤。");
        if (tag.emoji !== undefined && tag.emoji !== null) {
          assert(typeof tag.emoji === "object", "Forum 標籤 emoji 格式錯誤。");
          assert(tag.emoji.id === null || SNOWFLAKE_PATTERN.test(tag.emoji.id), "Forum 標籤 emoji ID 格式錯誤。");
          assert(tag.emoji.name === null || (typeof tag.emoji.name === "string" && tag.emoji.name.length <= 32), "Forum 標籤 emoji 名稱格式錯誤。");
        }
      }
    }
    channelIds.add(channel.id);
  }

  const categories = new Set(backup.channels.filter(channel => channel.type === ChannelType.GuildCategory).map(channel => channel.id));
  for (const channel of backup.channels) {
    if (channel.parentId) assert(categories.has(channel.parentId), "頻道所屬分類未包含在備份內。");
  }
  return backup;
}

export function parseGuildBackup(buffer) {
  assert(Buffer.isBuffer(buffer) && buffer.length <= MAX_BACKUP_BYTES, "備份檔超過 5 MB 或格式無效。");
  let backup;
  try {
    backup = JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new Error("無法讀取備份檔，請提供有效的 JSON 檔。");
  }
  return validateGuildBackup(backup);
}

export async function readBackupAttachment(attachment) {
  assert(attachment && attachment.size <= MAX_BACKUP_BYTES, "備份檔超過 5 MB。");
  const response = await fetch(attachment.url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("無法下載 Discord 備份附件。");
  const buffer = Buffer.from(await response.arrayBuffer());
  return parseGuildBackup(buffer);
}

export async function saveGuildBackup(backup, directory = getBackupDirectory()) {
  validateGuildBackup(backup);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const destination = join(directory, `${backup.sourceGuild.id}.json`);
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(backup, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, destination);
  return destination;
}

export async function loadLatestGuildBackup(directory = getBackupDirectory()) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("找不到本機備份；請先執行 /伺服器備份，或上傳備份 JSON 檔。");
    throw error;
  }

  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile() || !/^\d{15,25}\.json$/.test(entry.name)) continue;
    const path = join(directory, entry.name);
    try {
      const details = await stat(path);
      if (details.size > MAX_BACKUP_BYTES) continue;
      const backup = parseGuildBackup(await readFile(path));
      candidates.push({ backup, path });
    } catch {
      // Ignore incomplete or invalid local files; the latest valid snapshot may still be usable.
    }
  }
  candidates.sort((a, b) => Date.parse(b.backup.createdAt) - Date.parse(a.backup.createdAt));
  if (!candidates.length) throw new Error("找不到有效的本機備份；請先執行 /伺服器備份，或上傳備份 JSON 檔。");
  return candidates[0];
}

function channelCreateOptions(channel, parentId, permissionOverwrites) {
  const options = {
    name: channel.name,
    type: channel.type,
    position: channel.position,
    permissionOverwrites,
  };
  if (parentId) options.parent = parentId;
  if (TEXT_CHANNEL_TYPES.has(channel.type)) {
    if (typeof channel.topic === "string") options.topic = channel.topic;
    if (typeof channel.nsfw === "boolean") options.nsfw = channel.nsfw;
    if (channel.rateLimitPerUser !== undefined) options.rateLimitPerUser = channel.rateLimitPerUser;
    if (channel.defaultAutoArchiveDuration !== undefined) options.defaultAutoArchiveDuration = channel.defaultAutoArchiveDuration;
    if (channel.defaultThreadRateLimitPerUser !== undefined) options.defaultThreadRateLimitPerUser = channel.defaultThreadRateLimitPerUser;
  }
  if (VOICE_CHANNEL_TYPES.has(channel.type)) {
    if (channel.bitrate !== undefined) options.bitrate = channel.bitrate;
    if (channel.userLimit !== undefined && channel.userLimit !== null) options.userLimit = channel.userLimit;
    if (channel.rtcRegion !== undefined) options.rtcRegion = channel.rtcRegion;
    if (channel.videoQualityMode !== undefined) options.videoQualityMode = channel.videoQualityMode;
  }
  if (FORUM_CHANNEL_TYPES.has(channel.type)) {
    for (const property of ["defaultReactionEmoji", "availableTags", "defaultSortOrder", "defaultForumLayout"]) {
      if (channel[property] !== undefined) options[property] = channel[property];
    }
  }
  return options;
}

export async function restoreGuildBackup(guild, unvalidatedBackup) {
  const backup = validateGuildBackup(unvalidatedBackup);
  await guild.roles.fetch();
  await guild.channels.fetch();
  const botMember = guild.members.me || await guild.members.fetchMe();
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) throw new Error("Bot 缺少 Manage Roles 權限。");
  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) throw new Error("Bot 缺少 Manage Channels 權限。");
  if (guild.roles.cache.size + backup.roles.length > 250) throw new Error("目前伺服器的身分組數量不足以容納此備份。");
  if (guild.channels.cache.size + backup.channels.length > 500) throw new Error("目前伺服器的頻道數量不足以容納此備份。");

  const stats = { createdRoles: 0, createdChannels: 0, skippedOverwrites: 0, skippedChannels: 0, roleOrderRestored: false };
  const roleMap = new Map([[backup.sourceGuild.id, guild.id]]);
  const restoredRoles = [];
  for (const roleData of [...backup.roles].sort((a, b) => a.position - b.position)) {
    try {
      const role = await guild.roles.create({
        name: roleData.name,
        color: roleData.color,
        hoist: roleData.hoist,
        mentionable: roleData.mentionable,
        permissions: BigInt(roleData.permissions),
        reason: `伺服器架構備份還原（來源 ${backup.sourceGuild.id}）`,
      });
      roleMap.set(roleData.id, role.id);
      restoredRoles.push({ role, sourcePosition: roleData.position });
      stats.createdRoles += 1;
    } catch (error) {
      throw new Error(`建立身分組「${roleData.name}」失敗；目前已建立 ${stats.createdRoles} 個身分組。${error.message}`);
    }
  }

  if (restoredRoles.length) {
    try {
      await guild.roles.setPositions(restoredRoles.map(({ role }, index) => ({ role: role.id, position: index + 1 })));
      stats.roleOrderRestored = true;
    } catch (error) {
      console.warn("Could not restore role order", error?.message || error);
    }
  }

  const memberLookup = new Map();
  const channelMap = new Map();
  const categories = backup.channels
    .filter(channel => channel.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);
  const otherChannels = backup.channels
    .filter(channel => channel.type !== ChannelType.GuildCategory)
    .sort((a, b) => {
      if (a.parentId !== b.parentId) return (a.parentId || "").localeCompare(b.parentId || "");
      return a.position - b.position;
    });

  async function resolveOverwrites(entries) {
    const resolved = [];
    for (const overwrite of entries) {
      let id;
      if (overwrite.type === 0) {
        id = roleMap.get(overwrite.id);
      } else {
        if (!memberLookup.has(overwrite.id)) {
          memberLookup.set(overwrite.id, guild.members.fetch(overwrite.id).catch(() => null));
        }
        const member = await memberLookup.get(overwrite.id);
        id = member?.id;
      }
      if (!id) {
        stats.skippedOverwrites += 1;
        continue;
      }
      resolved.push({ id, type: overwrite.type, allow: BigInt(overwrite.allow), deny: BigInt(overwrite.deny) });
    }
    return resolved;
  }

  for (const channelData of [...categories, ...otherChannels]) {
    const parentId = channelData.parentId ? channelMap.get(channelData.parentId) : undefined;
    if (channelData.parentId && !parentId) {
      stats.skippedChannels += 1;
      continue;
    }
    const permissionOverwrites = await resolveOverwrites(channelData.permissionOverwrites);
    try {
      const channel = await guild.channels.create(channelCreateOptions(channelData, parentId, permissionOverwrites));
      channelMap.set(channelData.id, channel.id);
      stats.createdChannels += 1;
    } catch (error) {
      throw new Error(`建立頻道「${channelData.name}」失敗；目前已建立 ${stats.createdRoles} 個身分組及 ${stats.createdChannels} 個頻道。${error.message}`);
    }
  }
  try {
    await guild.roles.edit(guild.id, {
      permissions: BigInt(backup.everyonePermissions),
      reason: `伺服器架構備份還原（來源 ${backup.sourceGuild.id}）`,
    });
    stats.everyonePermissionsUpdated = true;
  } catch (error) {
    throw new Error(`伺服器架構已建立，但更新 @everyone 基礎權限失敗：${error.message}`);
  }
  return stats;
}
