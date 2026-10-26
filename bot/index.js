import dotenv from "dotenv";
import { startWebhookRelay } from "./webhookRelay.js";
import {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

// Wispbyte may create the managed .env at /home/container or inside /bot.
// Load both locations without printing any secret values.
dotenv.config({ path: "/home/container/.env" });
dotenv.config({ path: "/home/container/bot/.env" });
dotenv.config();

const required = ["BOT_TOKEN", "DISCORD_APPLICATION_ID", "ANNOUNCEMENT_CHANNEL_ID", "FUMO_API_BASE_URL"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing environment variable: ${name}`);
}

const BOT_TOKEN = process.env.BOT_TOKEN;
const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID || "";
const ANNOUNCEMENT_CHANNEL_ID = process.env.ANNOUNCEMENT_CHANNEL_ID;
const ANNOUNCEMENT_ROLE_ID = process.env.ANNOUNCEMENT_ROLE_ID || "";
const API_BASE_URL = process.env.FUMO_API_BASE_URL.replace(/\/$/, "");
const WEBSITE_URL = process.env.FUMO_WEBSITE_URL || "https://www.micronationfumo.org";
const ADMIN_IDS = new Set((process.env.FUMO_BOT_ADMIN_IDS || "").split(",").map(value => value.trim()).filter(Boolean));
const MEMBER_ROLE_ID = process.env.FUMO_MEMBER_ROLE_ID || "1248257759195955343";
const OBSERVER_ROLE_ID = process.env.FUMO_OBSERVER_ROLE_ID || "1249238458699092049";
const SECRETARIAT_ROLE_ID = process.env.FUMO_SECRETARIAT_ROLE_ID || "1540730174302191666";
const COUNCIL_ROLE_ID = process.env.FUMO_COUNCIL_ROLE_ID || "1540730860624547920";
const WEBHOOK_SECRET = process.env.FUMO_WEBHOOK_SECRET || "";
const WEBHOOK_PATH = process.env.FUMO_WEBHOOK_PATH || "/fumo/webhook";
const BOT_HTTP_PORT = Number(process.env.PORT || process.env.BOT_HTTP_PORT || 3000);
const BOT_MENTION_EVENTS = (process.env.FUMO_BOT_MENTION_EVENTS || "vote.created,vote.published,vote.started,vote.closing_soon,vote.closed").split(",").map(value => value.trim()).filter(Boolean);

const commands = [
  new SlashCommandBuilder()
    .setName("公告")
    .setDescription("在 FUMO 官方公告頻道發布公告")
    .addStringOption(option => option.setName("標題").setDescription("公告標題").setRequired(true).setMaxLength(256))
    .addStringOption(option => option.setName("內容").setDescription("公告內容").setRequired(true).setMaxLength(1900))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),
  new SlashCommandBuilder()
    .setName("身分組檢查")
    .setDescription("比較 FUMO 註冊名單與 Discord Server 成員")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),
  new SlashCommandBuilder()
    .setName("投票狀態")
    .setDescription("查看 FUMO 官方網站 API 狀態"),
].map(command => command.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

function canManage(interaction) {
  return ADMIN_IDS.has(interaction.user.id) || Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
}

async function fumoFetch(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: "application/json", "User-Agent": "FUMO-Discord-Bot/1.0" } });
  if (!response.ok) throw new Error(`FUMO API ${response.status}`);
  return response.json();
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
  const route = GUILD_ID ? Routes.applicationGuildCommands(APPLICATION_ID, GUILD_ID) : Routes.applicationCommands(APPLICATION_ID);
  await rest.put(route, { body: commands });
  console.log(`Registered ${commands.length} slash commands${GUILD_ID ? ` in guild ${GUILD_ID}` : " globally"}.`);
}

async function postAnnouncement(title, content, author) {
  const channel = await client.channels.fetch(ANNOUNCEMENT_CHANNEL_ID);
  if (!channel?.isTextBased() || !channel.isSendable()) throw new Error("Announcement channel is not writable");
  const roleMention = ANNOUNCEMENT_ROLE_ID ? `<@&${ANNOUNCEMENT_ROLE_ID}>` : "";
  const message = await channel.send({
    content: roleMention,
    embeds: [{ title: `📢 ${title}`, description: content, color: 0x5865f2, url: WEBSITE_URL, footer: { text: `FUMO 官方網站 · 發布者 ${author}` }, timestamp: new Date().toISOString() }],
    allowedMentions: ANNOUNCEMENT_ROLE_ID ? { roles: [ANNOUNCEMENT_ROLE_ID] } : { parse: [] },
  });
  return message.url;
}

async function compareRoles(guild) {
  const voters = await fumoFetch("/api/voters");
  const memberData = await fumoFetch("/api/members");
  const memberCountries = new Set((memberData.memberStates || []).map(country => country.fullName));
  const observerCountries = new Set((memberData.observerStates || []).map(country => country.fullName));
  const registered = new Map();
  for (const voter of Array.isArray(voters) ? voters : []) {
    for (const representative of voter.reps || []) {
      if (/^\d{15,25}$/.test(representative.id)) registered.set(representative.id, { countryName: voter.countryName, name: representative.name });
    }
  }
  await guild.members.fetch();
  const members = [...guild.members.cache.values()].filter(member => !member.user.bot);
  const registeredMembers = members.filter(member => registered.has(member.id));
  const unregisteredMembers = members.filter(member => !registered.has(member.id));
  const absentMembers = [...registered.entries()].filter(([id]) => !guild.members.cache.has(id));
  const missingExpectedRoles = registeredMembers.flatMap(member => {
    const registration = registered.get(member.id);
    const expectedRole = memberCountries.has(registration.countryName) ? MEMBER_ROLE_ID : observerCountries.has(registration.countryName) ? OBSERVER_ROLE_ID : null;
    return expectedRole && !member.roles.cache.has(expectedRole) ? [{ member, registration, expectedRole }] : [];
  });
  const secretariatMembers = members.filter(member => member.roles.cache.has(SECRETARIAT_ROLE_ID));
  const councilMembers = members.filter(member => member.roles.cache.has(COUNCIL_ROLE_ID));
  const roleCounts = new Map();
  for (const member of registeredMembers) {
    for (const role of member.roles.cache.values()) {
      if (role.id === guild.id) continue;
      roleCounts.set(role.name, (roleCounts.get(role.name) || 0) + 1);
    }
  }
  const topRoles = [...roleCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => `${name}: ${count}`).join("\n") || "（沒有可統計的身分組）";
  return { registeredCount: registered.size, serverMemberCount: members.length, registeredMembers, unregisteredMembers, absentMembers, missingExpectedRoles, secretariatMembers, councilMembers, topRoles };
}

async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "投票狀態") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const health = await fumoFetch("/api/healthz");
      await interaction.editReply(`FUMO API 正常運作。\n網站：${WEBSITE_URL}\n狀態：${health.status || "ok"}`);
    } catch {
      await interaction.editReply("FUMO API 目前無法連線，請稍後再試。");
    }
    return;
  }
  if (!canManage(interaction)) {
    await interaction.reply({ content: "只有 FUMO 管理員或具備管理伺服器權限的成員可以使用此指令。", ephemeral: true });
    return;
  }
  if (interaction.commandName === "公告") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const url = await postAnnouncement(interaction.options.getString("標題", true), interaction.options.getString("內容", true), interaction.user.username);
      await interaction.editReply(`公告已發布：${url}`);
    } catch (error) {
      console.error("Announcement failed", error);
      await interaction.editReply("公告發布失敗，請確認 Bot 有公告頻道的 View Channel、Send Messages 與 Embed Links 權限。");
    }
    return;
  }
  if (interaction.commandName === "身分組檢查") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const result = await compareRoles(interaction.guild);
      const unregistered = result.unregisteredMembers.slice(0, 15).map(member => `<@${member.id}>`).join(" ") || "無";
      const absent = result.absentMembers.slice(0, 15).map(([id, data]) => `${data.name || id} (${id})`).join("\n") || "無";
      await interaction.editReply({ content: [
        "**FUMO 身分組／註冊名單檢查**",
        `註冊名單：${result.registeredCount} 人`,
        `Server 非 Bot 成員：${result.serverMemberCount} 人`,
        `已對上的成員：${result.registeredMembers.length} 人`,
        `缺少正確成員國／觀察國身分組：${result.missingExpectedRoles.length} 人`,
        `Server 中未出現在註冊名單：${result.unregisteredMembers.length} 人：${unregistered}`,
        `註冊名單中尚未加入 Server：${result.absentMembers.length} 人：\n${absent}`,
        `常見身分組：\n${result.topRoles}`,
        `秘書處身分組：${result.secretariatMembers.length} 人；議事中心身分組：${result.councilMembers.length} 人`,
        "\n目前只做檢查，不會自動新增或移除身分組。",
      ].join("\n") });
    } catch (error) {
      console.error("Role comparison failed", error);
      await interaction.editReply("身分組檢查失敗，請確認 Bot 已啟用 Server Members Intent，並能讀取 Server 成員清單。");
    }
  }
}

client.once("ready", readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  startWebhookRelay({ client, guildId: GUILD_ID, channelId: ANNOUNCEMENT_CHANNEL_ID, websiteUrl: WEBSITE_URL, secret: WEBHOOK_SECRET, path: WEBHOOK_PATH, port: BOT_HTTP_PORT, mentionRoleId: ANNOUNCEMENT_ROLE_ID, mentionEvents: BOT_MENTION_EVENTS });
  registerCommands().catch(error => { console.error("Command registration failed", error); process.exitCode = 1; });
});
client.on("interactionCreate", interaction => handleInteraction(interaction).catch(error => console.error("Interaction failed", error)));
client.on("error", error => console.error("Discord client error", error));
process.on("unhandledRejection", error => console.error("Unhandled rejection", error));

await client.login(BOT_TOKEN);
