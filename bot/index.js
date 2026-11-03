import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { startWebhookRelay } from "./webhookRelay.js";
import { extractApplicationOwnerId, isBotOwner } from "./ownerAuth.js";
import {
  createGuildBackup,
  getBackupDirectory,
  loadLatestGuildBackup,
  readBackupAttachment,
  restoreGuildBackup,
  saveGuildBackup,
} from "./guildBackup.js";
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
const ANNOUNCEMENT_AUTHOR = process.env.FUMO_ANNOUNCEMENT_AUTHOR || "FUMO 官方網站 Bot";
const PROPOSAL_CHANNEL_ID = process.env.FUMO_PROPOSAL_CHANNEL_ID || "1414537668406149140";
const ADMISSION_CHANNEL_ID = process.env.FUMO_ADMISSION_CHANNEL_ID || PROPOSAL_CHANNEL_ID;
const WELCOME_CHANNEL_ID = process.env.FUMO_WELCOME_CHANNEL_ID || ANNOUNCEMENT_CHANNEL_ID;
const FAREWELL_CHANNEL_ID = process.env.FUMO_FAREWELL_CHANNEL_ID || ANNOUNCEMENT_CHANNEL_ID;
const VERIFIED_ROLE_ID = process.env.FUMO_VERIFIED_ROLE_ID || "1249427737081286687";

function logAction(action, details = {}) {
  console.log(`[BOT_ACTION] ${JSON.stringify({ at: new Date().toISOString(), action, ...details })}`);
}

function normalizeCountryName(value) {
  return String(value || "").replace(/[\u00a0\u3000]/g, " ").trim().replace(/\s+/g, " ");
}

function buildCountryStatusMap(memberData) {
  const statusByCountry = new Map();
  for (const country of memberData.memberStates || []) statusByCountry.set(normalizeCountryName(country.fullName), "member");
  // 若同一國家同時出現在兩份資料，觀察國資料優先，避免誤套成員國。
  for (const country of memberData.observerStates || []) statusByCountry.set(normalizeCountryName(country.fullName), "observer");
  return statusByCountry;
}

const commands = [
  new SlashCommandBuilder()
    .setName("公告")
    .setDescription("在 FUMO 官方公告頻道發布公告")
    .addStringOption(option => option.setName("標題").setDescription("公告標題").setRequired(true).setMaxLength(256))
    .addStringOption(option => option.setName("內容").setDescription("公告內容").setRequired(true).setMaxLength(1900))
    .addStringOption(option => option.setName("格式").setDescription("公告呈現格式，預設為 Embed").addChoices({ name: "視覺化 Embed", value: "embed" }, { name: "純文字", value: "text" }).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),
  new SlashCommandBuilder()
    .setName("身分組檢查")
    .setDescription("比較 FUMO 註冊名單與 Discord Server 成員")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),
  new SlashCommandBuilder()
    .setName("投票狀態")
    .setDescription("查看 FUMO 官方網站 API 狀態"),
  new SlashCommandBuilder()
    .setName("驗證")
    .setDescription("對照 FUMO 註冊名單並取得對應身分組"),
  new SlashCommandBuilder()
    .setName("整理提案")
    .setDescription("整理議事中心例行大會串文中的提案")
    .addStringOption(option => option.setName("會期").setDescription("例如 2026/11；留空則整理最新一期").setRequired(false).setMaxLength(20)),
  new SlashCommandBuilder()
    .setName("整理入聯")
    .setDescription("整理議事中心入聯提案申請串文中的國家資料")
    .addStringOption(option => option.setName("會期").setDescription("例如 2026/11；留空則整理最新一期").setRequired(false).setMaxLength(20)),
  new SlashCommandBuilder()
    .setName("說話")
    .setDescription("讓 FUMO Bot 發送文字訊息")
    .addStringOption(option => option.setName("內容").setDescription("Bot 要說的內容").setRequired(true).setMaxLength(1900))
    .addStringOption(option => option.setName("回覆id").setDescription("可選；要回覆的同頻道訊息 ID").setRequired(false).setMaxLength(25)),
  new SlashCommandBuilder()
    .setName("伺服器備份")
    .setDescription("備份伺服器的身分組、頻道與權限架構（僅限 Bot 應用程式擁有者）"),
  new SlashCommandBuilder()
    .setName("伺服器還原")
    .setDescription("從本機最新備份或 JSON 檔建立伺服器架構（僅限 Bot 應用程式擁有者）")
    .addAttachmentOption(option => option.setName("備份檔").setDescription("選填；上傳先前下載的伺服器備份 JSON 檔").setRequired(false)),
].map(command => command.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const pendingGuildRestores = new Map();
let BOT_OWNER_ID = "";

function canManage(interaction) {
  return ADMIN_IDS.has(interaction.user.id) || Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
}

async function getBotOwnerId() {
  const application = await client.application.fetch();
  BOT_OWNER_ID = extractApplicationOwnerId(application.owner);
  if (!BOT_OWNER_ID) throw new Error("Discord 未提供有效的 Bot application owner ID");
  return BOT_OWNER_ID;
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

async function postAnnouncement(title, content, author, mode = "embed") {
  const channel = await client.channels.fetch(ANNOUNCEMENT_CHANNEL_ID);
  if (!channel?.isTextBased() || !channel.isSendable()) throw new Error("Announcement channel is not writable");
  const roleMention = ANNOUNCEMENT_ROLE_ID ? `<@&${ANNOUNCEMENT_ROLE_ID}>` : "";
  const allowedMentions = ANNOUNCEMENT_ROLE_ID ? { roles: [ANNOUNCEMENT_ROLE_ID] } : { parse: [] };
  let message;
  if (mode === "text") {
    const plainText = [roleMention, title, content].filter(Boolean).join("\n\n");
    if (plainText.length > 2000) throw new Error("Plain-text announcement exceeds Discord's 2000 character limit");
    message = await channel.send({ content: plainText, allowedMentions });
  } else {
    message = await channel.send({
      content: roleMention,
      embeds: [{ title: `📢 ${title}`, description: content, color: 0x5865f2, url: WEBSITE_URL, footer: { text: `FUMO 官方網站 · 發布者 ${author}` }, timestamp: new Date().toISOString() }],
      allowedMentions,
    });
  }
  return message.url;
}

async function postBotSpeech(content, channel, replyId = "") {
  if (!channel?.isTextBased() || !channel.isSendable()) throw new Error("目前頻道不可發送訊息");
  const payload = { content, allowedMentions: { parse: [] } };
  if (replyId) {
    if (!/^\d{15,25}$/.test(replyId)) throw new Error("回覆 ID 格式不正確");
    const target = await channel.messages.fetch(replyId);
    payload.reply = { messageReference: target.id, failIfNotExists: false };
  }
  return channel.send(payload);
}

async function compareRoles(guild) {
  const voters = await fumoFetch("/api/voters");
  const memberData = await fumoFetch("/api/members");
  const countryStatus = buildCountryStatusMap(memberData);
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
    const status = countryStatus.get(normalizeCountryName(registration.countryName));
    const expectedRole = status === "member" ? MEMBER_ROLE_ID : status === "observer" ? OBSERVER_ROLE_ID : null;
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

async function verifyMember(member) {
  const voters = await fumoFetch("/api/voters");
  const registration = (Array.isArray(voters) ? voters : []).flatMap(voter => (voter.reps || []).map(rep => ({ ...rep, countryName: voter.countryName }))).find(rep => rep.id === member.id);
  if (!registration) return { ok: false, reason: "not_registered" };
  const memberData = await fumoFetch("/api/members");
  const countryStatus = buildCountryStatusMap(memberData);
  const status = countryStatus.get(normalizeCountryName(registration.countryName));
  const roleId = status === "member" ? MEMBER_ROLE_ID : status === "observer" ? OBSERVER_ROLE_ID : "";
  if (!roleId) return { ok: false, reason: "country_role_missing", countryName: registration.countryName };
  const role = member.guild.roles.cache.get(roleId) || await member.guild.roles.fetch(roleId).catch(() => null);
  if (!role) return { ok: false, reason: "role_not_found", roleId, countryName: registration.countryName };
  const verifiedRole = member.guild.roles.cache.get(VERIFIED_ROLE_ID) || await member.guild.roles.fetch(VERIFIED_ROLE_ID).catch(() => null);
  if (!verifiedRole) return { ok: false, reason: "verified_role_not_found", roleId: VERIFIED_ROLE_ID, countryName: registration.countryName };
  await member.roles.add(role, "FUMO Discord 驗證");
  const oppositeRoleId = status === "member" ? OBSERVER_ROLE_ID : MEMBER_ROLE_ID;
  if (oppositeRoleId && member.roles.cache.has(oppositeRoleId)) await member.roles.remove(oppositeRoleId, "FUMO Discord 驗證：移除不符合目前國家狀態的身分組");
  await member.roles.add(verifiedRole, "FUMO Discord 驗證完成");
  return { ok: true, countryName: registration.countryName, roleName: role.name, verifiedRoleName: verifiedRole.name };
}

async function sendWelcomeMessage(member, joined) {
  const channel = await client.channels.fetch(joined ? WELCOME_CHANNEL_ID : FAREWELL_CHANNEL_ID);
  if (!channel?.isTextBased() || !channel.isSendable()) throw new Error(joined ? "歡迎頻道不可發送訊息" : "歡送頻道不可發送訊息");
  const content = joined
    ? `隆重歡迎 <@${member.id}> 造訪聯合微國家組織\nWarmly welcome <@${member.id}> to visit the Federation of United Micronation Organization.`
    : `<@${member.id}>\n☆ *　. 　☆　　 　 　   賽\n　. ∧＿∧　∩　* ☆ 　 優\n☆ ( ・∀・)/ .　　　      那\n. ⊂　　 ノ* ☆ 　　   　拉\n☆ * (つ ノ .☆ 　　　   　！\n　　 (ノ`;
  return channel.send({ content, allowedMentions: joined ? { users: [member.id] } : { parse: [] } });
}

async function sendVerificationDm(member) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("fumo_verify_member").setLabel("開始驗證").setStyle(ButtonStyle.Primary),
  );
  return member.send({ content: "歡迎加入 F.U.M.O.！請按下按鈕，讓 Bot 對照官方註冊名單並加入對應身分組。", components: [row] });
}

function normalizeText(value) {
  return value.replace(/[\u200b\r]/g, "").replace(/：/g, ":").trim();
}

function getProposalField(content, labels) {
  const text = normalizeText(content).replace(/\*\*/g, "");
  const lines = text.split("\n").map(line => line.trim());
  const wanted = labels.map(label => label.toLowerCase());
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lower = line.toLowerCase();
    const label = wanted.find(candidate => lower.includes(candidate));
    if (!label) continue;
    let value = line.slice(lower.indexOf(label) + label.length).replace(/^[\s:|｜]+/, "").trim();
    if (!value && lines[index + 1] && !/^(?:◆|🔹|🔸|I\.|II\.|III\.|一、|二、|三、)/i.test(lines[index + 1])) value = lines[index + 1].trim();
    const continuation = [];
    for (let next = index + 1; next < lines.length; next += 1) {
      if (/^(?:◆|🔹|🔸|I\.|II\.|III\.|一、|二、|三、)/i.test(lines[next])) break;
      if (value && lines[next]) continuation.push(lines[next]);
    }
    return [value, ...continuation].filter(Boolean).join(" ").trim();
  }
  return "";
}

function messageText(message) {
  const parts = [message.content || ""];
  for (const embed of message.embeds || []) {
    if (embed.title) parts.push(embed.title);
    if (embed.description) parts.push(embed.description);
    for (const field of embed.fields || []) parts.push(`${field.name}\n${field.value}`);
  }
  return parts.filter(Boolean).join("\n");
}

function proposalFromMessage(content) {
  const country = getProposalField(content, ["國家席位名稱 Proposal country", "国家席位名称 Proposal country"]);
  const representative = getProposalField(content, ["提案代表 Proposal representative"]);
  const title = getProposalField(content, ["提案標題 Proposal title", "提案标题 Proposal title"]);
  const proposalContent = getProposalField(content, ["內容 Content", "内容 Content"]);
  if ((!title && !proposalContent) || (!country && !representative && !title)) return null;
  return { country: country || "未填寫", representative: representative || "未填寫", title: title || "未填寫", content: proposalContent || "未填寫" };
}

function proposalPeriod(threadName) {
  const period = threadName.match(/第.+?次\s*(?:議事中心|議會中心)\s*決議提案申請\s*[-－–—]\s*(\d{4})[/／-](\d{1,2})/i);
  return period ? `${period[1]}/${period[2].padStart(2, "0")}` : "";
}

function isSeatChange(title) {
  return /^🔸/.test(title.trim()) || /(升格|降格|取消席次|席位更動|席位变动|入聯|退聯|入联|退联)/i.test(title);
}

function admissionPeriod(threadName) {
  const period = threadName.match(/第.+?次\s*議事中心\s*入聯提案申請\s*[-－–—]\s*(\d{4})[/／-](\d{1,2})/i);
  return period ? `${period[1]}/${period[2].padStart(2, "0")}` : "";
}

function admissionFromMessage(content) {
  const name = getProposalField(content, ["貴國國號（中/英）", "貴國國號(中/英)", "Name of Your Nation \\(ZN/EN\\)", "Name of Your Nation"]);
  const flag = getProposalField(content, ["貴國國旗", "National Flag of Your Country"]);
  const code = getProposalField(content, ["貴國國家代碼", "National Code"]);
  const role = getProposalField(content, ["申請者於貴國身分", "Applicant’s Position/Role in Your Nation", "Applicant's Position/Role in Your Nation"]);
  const links = getProposalField(content, ["國家相關連結（Discord、官方網站、社群媒體等）", "國家相關連結", "Relevant Links of Your Nation"]);
  const locations = getProposalField(content, ["貴國主要活躍地點", "Main active locations"]);
  const introduction = getProposalField(content, ["貴國國情介紹", "Introduction to Your Nation"]);
  const reasons = getProposalField(content, ["申請入聯緣由", "Reasons for Applying for Membership"]);
  if (!name && !code && !role && !introduction && !reasons) return null;
  return { name: name || "未填寫", flag: flag || "未提供文字（請查看附件）", code: code || "未填寫", role: role || "未填寫", links: links || "未填寫", locations: locations || "未填寫", introduction: introduction || "未填寫", reasons: reasons || "未填寫" };
}

async function collectAdmissionDigest(channel, requestedPeriod) {
  if (channel.isThread?.() && channel.parentId) {
    const parent = await client.channels.fetch(channel.parentId);
    if (parent?.threads) return collectAdmissionDigest(parent, requestedPeriod);
  }
  if (!channel?.threads) throw new Error(`ID ${ADMISSION_CHANNEL_ID} 不是可讀取串文的 Forum／文字頻道（type ${channel?.type ?? "unknown"}）。`);
  const threads = new Map();
  for (const thread of channel.threads.cache.values()) threads.set(thread.id, thread);
  const active = await channel.threads.fetchActive();
  for (const thread of active.threads.values()) threads.set(thread.id, thread);
  let before;
  for (let page = 0; page < 10; page += 1) {
    const archived = await channel.threads.fetchArchived({ limit: 100, ...(before ? { before } : {}) });
    for (const thread of archived.threads.values()) threads.set(thread.id, thread);
    if (!archived.hasMore || !archived.threads.size) break;
    before = archived.threads.last().id;
  }
  const matchingThreads = [...threads.values()]
    .filter(thread => admissionPeriod(thread.name) && (!requestedPeriod || admissionPeriod(thread.name) === requestedPeriod))
    .sort((a, b) => admissionPeriod(b.name).localeCompare(admissionPeriod(a.name)) || b.createdTimestamp - a.createdTimestamp);
  const targetThread = matchingThreads[0];
  if (!targetThread) throw new Error(`找不到符合「第 N 次議事中心入聯提案申請-YYYY/MM」格式的串文${requestedPeriod ? `（${requestedPeriod}）` : ""}。`);
  const applications = [];
  for (const thread of [targetThread]) {
    const messages = await thread.messages.fetch({ limit: 100 });
    for (const message of messages.values()) {
      const admission = admissionFromMessage(messageText(message));
      if (admission) { applications.push({ thread, admission }); break; }
    }
  }
  if (!applications.length) throw new Error(`在串文「${targetThread.name}」中找不到符合入聯表格欄位的申請。`);
  return { period: admissionPeriod(targetThread.name), thread: targetThread, applications };
}

function formatAdmissionDigest(period, applications, threadName) {
  const rows = applications.map(({ admission }, index) => `${index + 1}. ${admission.name}｜${admission.role}｜${admission.links}`);
  return `${period} 入聯提案整理\n\n來源串文：${threadName}\n\n國家｜最高領導人｜貴國連結\n${rows.join("\n")}`;
}

async function collectProposalDigest(channel, requestedPeriod) {
  if (channel.isThread?.()) {
    if (channel.parentId) {
      const parent = await client.channels.fetch(channel.parentId);
      if (parent?.threads) return collectProposalDigest(parent, requestedPeriod);
    }
    const period = proposalPeriod(channel.name);
    if (!period || (requestedPeriod && period !== requestedPeriod)) throw new Error(`指定的串文標題不符合格式：${channel.name}`);
    const messages = await channel.messages.fetch({ limit: 100 });
    const unique = new Map();
    for (const message of messages.values()) {
      const proposal = proposalFromMessage(messageText(message));
      if (proposal) unique.set(`${proposal.country}|${proposal.representative}|${proposal.title}`, proposal);
    }
    return { thread: channel, period, proposals: [...unique.values()] };
  }
  if (!channel.threads) throw new Error(`ID ${channel.id} 是 ${channel.name || "未知頻道"}（type ${channel.type}），不是可列出串文的母頻道；請改填 Forum／文字頻道 ID，或直接使用單一串文 ID。`);
  const threads = new Map();
  for (const thread of channel.threads.cache.values()) threads.set(thread.id, thread);
  const active = await channel.threads.fetchActive();
  for (const thread of active.threads.values()) threads.set(thread.id, thread);
  let before;
  for (let page = 0; page < 10; page += 1) {
    const archived = await channel.threads.fetchArchived({ limit: 100, ...(before ? { before } : {}) });
    for (const thread of archived.threads.values()) threads.set(thread.id, thread);
    if (!archived.hasMore || !archived.threads.size) break;
    before = archived.threads.last().id;
  }
  const matches = [...threads.values()].filter(thread => proposalPeriod(thread.name) && (!requestedPeriod || proposalPeriod(thread.name) === requestedPeriod));
  matches.sort((a, b) => proposalPeriod(b.name).localeCompare(proposalPeriod(a.name)) || b.createdTimestamp - a.createdTimestamp);
  const thread = matches[0];
  if (!thread) {
    const available = [...threads.values()].map(item => item.name).filter(Boolean).slice(0, 8);
    throw new Error(`找不到符合格式的例行大會串文；頻道目前讀到 ${threads.size} 個串文${available.length ? `：${available.join("、")}` : "。"}`);
  }
  const messages = await thread.messages.fetch({ limit: 100 });
  const unique = new Map();
  for (const message of messages.values()) {
    const proposal = proposalFromMessage(messageText(message));
    if (proposal) unique.set(`${proposal.country}|${proposal.representative}|${proposal.title}`, proposal);
  }
  return { thread, period: proposalPeriod(thread.name), proposals: [...unique.values()] };
}

function formatProposalDigest(period, proposals) {
  const seatChanges = proposals.filter(proposal => isSeatChange(proposal.title));
  const general = proposals.filter(proposal => !isSeatChange(proposal.title));
  const date = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replace(/\s/g, "").replace(/年|月/g, "/").replace(/日/g, "");
  const render = proposal => `[[${proposal.title}]]`;
  return `${date} 議案整理（${period}）\n\n席位更動案：\n${seatChanges.length ? seatChanges.map(render).join("\n") : "無"}\n\n一般提案：\n${general.length ? general.map(render).join("\n") : "無"}`;
}

async function sendLongReply(interaction, text) {
  const chunks = [];
  for (let index = 0; index < text.length; index += 1900) chunks.push(text.slice(index, index + 1900));
  await interaction.editReply(chunks[0] || "沒有找到可整理的提案。");
  for (const chunk of chunks.slice(1)) await interaction.followUp({ content: chunk });
}

function prunePendingGuildRestores() {
  const now = Date.now();
  for (const [id, pending] of pendingGuildRestores) {
    if (pending.expiresAt <= now) pendingGuildRestores.delete(id);
  }
}

async function handleGuildRestoreButton(interaction) {
  const [, action, restoreId] = interaction.customId.split(":");
  const pending = pendingGuildRestores.get(restoreId);
  if (!pending || pending.expiresAt <= Date.now()) {
    pendingGuildRestores.delete(restoreId);
    await interaction.reply({ content: "這個還原確認已失效；請重新執行 /伺服器還原。", ephemeral: true });
    return;
  }
  if (action !== "confirm" && action !== "cancel") {
    await interaction.reply({ content: "無效的還原操作。", ephemeral: true });
    return;
  }
  await interaction.deferUpdate();
  let botOwnerId;
  try {
    botOwnerId = await getBotOwnerId();
  } catch (error) {
    console.error("Could not verify Bot application owner", error?.stack || error);
    await interaction.followUp({ content: "目前無法確認 Discord Bot 應用程式擁有者，操作已拒絕；請稍後重試。", ephemeral: true });
    return;
  }
  if (interaction.guildId !== pending.guildId || !isBotOwner(interaction.user.id, botOwnerId) || interaction.user.id !== pending.ownerId || pending.ownerId !== botOwnerId) {
    await interaction.followUp({ content: "只有此 Discord Bot 應用程式的擁有者可以確認。", ephemeral: true });
    return;
  }
  if (action === "cancel") {
    pendingGuildRestores.delete(restoreId);
    await interaction.editReply({ content: "已取消伺服器還原；沒有建立任何項目。", components: [] });
    return;
  }

  pendingGuildRestores.delete(restoreId);
  try {
    const result = await restoreGuildBackup(interaction.guild, pending.backup);
    logAction("guild.restore.completed", {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      sourceGuildId: pending.backup.sourceGuild.id,
      createdRoles: result.createdRoles,
      createdChannels: result.createdChannels,
      skippedOverwrites: result.skippedOverwrites,
      skippedChannels: result.skippedChannels,
    });
    const details = [
      `伺服器架構還原完成：建立 ${result.createdRoles} 個身分組、${result.createdChannels} 個頻道。`,
      result.skippedOverwrites ? `略過 ${result.skippedOverwrites} 個無法對應的權限覆寫（角色不存在，或指定成員尚未加入）。` : "所有可對應的權限覆寫均已建立。",
      result.skippedChannels ? `另略過 ${result.skippedChannels} 個缺少分類的頻道。` : "",
      result.everyonePermissionsUpdated ? "@everyone 基礎權限已依備份套用。" : "",
      result.roleOrderRestored ? "身分組順序已按備份排列。" : "",
    ].filter(Boolean).join("\n");
    await interaction.editReply({ content: details, components: [] });
  } catch (error) {
    console.error("Guild restore failed", error?.stack || error);
    logAction("guild.restore.failed", { userId: interaction.user.id, guildId: interaction.guildId, error: String(error) });
    await interaction.editReply({
      content: `伺服器還原未能完成：${String(error?.message || error).slice(0, 1200)}\n若部分項目已建立，請先檢查目前伺服器再決定是否重試；還原不會刪除既有頻道或自訂身分組，但 @everyone 權限會依備份更新。`,
      components: [],
    });
  }
}

async function handleInteraction(interaction) {
  if (interaction.isButton() && interaction.customId.startsWith("guild_restore:")) {
    await handleGuildRestoreButton(interaction);
    return;
  }
  if (interaction.isButton() && interaction.customId === "fumo_verify_member") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const guild = GUILD_ID ? client.guilds.cache.get(GUILD_ID) : null;
      const member = guild ? await guild.members.fetch(interaction.user.id) : null;
      if (!member) throw new Error("找不到目前 Server 成員");
      const result = await verifyMember(member);
      logAction(result.ok ? "member.verified_by_button" : "member.verification_button_failed", { userId: interaction.user.id, guildId: guild.id, countryName: result.countryName || null, roleName: result.roleName || null, verifiedRoleName: result.verifiedRoleName || null, reason: result.reason || null });
      if (result.ok) await interaction.editReply(`驗證成功！已為你加入「${result.roleName}」及「${result.verifiedRoleName}」身分組（${result.countryName}）。`);
      else if (result.reason === "not_registered") await interaction.editReply("驗證失敗：你的 Discord ID 不在 FUMO 官方註冊名單中，請先完成網站註冊或聯絡管理員。");
      else if (result.reason === "verified_role_not_found") await interaction.editReply("驗證失敗：伺服器尚未設定已驗證身分組，請聯絡管理員。");
      else await interaction.editReply("驗證失敗：請聯絡 FUMO 管理員協助處理。");
    } catch (error) {
      console.error("Verification button failed", error?.stack || error);
      logAction("member.verification_button_error", { userId: interaction.user.id, error: String(error) });
      await interaction.editReply("驗證失敗，請確認你仍在 F.U.M.O. Server 中，或聯絡管理員。");
    }
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  logAction("command.received", { command: interaction.commandName, userId: interaction.user.id, username: interaction.user.username, guildId: interaction.guildId, channelId: interaction.channelId });
  if (interaction.commandName === "伺服器備份" || interaction.commandName === "伺服器還原") {
    await interaction.deferReply({ ephemeral: true });
    let botOwnerId;
    try {
      botOwnerId = await getBotOwnerId();
    } catch (error) {
      console.error("Could not verify Bot application owner", error?.stack || error);
      await interaction.editReply("目前無法確認 Discord Bot 應用程式擁有者，操作已拒絕；請稍後重試。");
      return;
    }
    if (!isBotOwner(interaction.user.id, botOwnerId)) {
      await interaction.editReply("此指令僅限 Discord Bot 應用程式的擁有者使用。");
      return;
    }
    if (!interaction.guild || !interaction.guildId) {
      await interaction.editReply("請在伺服器頻道使用此指令。");
      return;
    }
    try {
      if (interaction.commandName === "伺服器備份") {
        await interaction.guild.roles.fetch();
        await interaction.guild.channels.fetch();
        const backup = createGuildBackup(interaction.guild);
        let savedLocally = true;
        try {
          await saveGuildBackup(backup);
        } catch (error) {
          savedLocally = false;
          console.error("Could not save guild backup locally", error?.stack || error);
        }
        const fileName = `server-backup-${interaction.guild.id}-${backup.createdAt.slice(0, 10)}.json`;
        const file = Buffer.from(`${JSON.stringify(backup, null, 2)}\n`, "utf8");
        logAction("guild.backup.created", {
          userId: interaction.user.id,
          guildId: interaction.guildId,
          roleCount: backup.roles.length,
          channelCount: backup.channels.length,
          savedLocally,
        });
        await interaction.editReply({
          content: `已備份「${interaction.guild.name}」：${backup.roles.length} 個身分組、${backup.channels.length} 個頻道。${savedLocally ? `\n備份已保存於 Bot 本機目錄：${getBackupDirectory()}。` : "\n警告：Bot 本機保存失敗，請下載下方附件自行保管，並檢查備份目錄設定。"}\n此 JSON 附件可用於之後的 /伺服器還原。`,
          files: [{ attachment: file, name: fileName }],
        });
        return;
      }

      const attachment = interaction.options.getAttachment("備份檔");
      let backup;
      if (attachment) {
        backup = await readBackupAttachment(attachment);
      } else {
        backup = (await loadLatestGuildBackup()).backup;
      }
      prunePendingGuildRestores();
      const restoreId = randomUUID();
      pendingGuildRestores.set(restoreId, {
        backup,
        guildId: interaction.guildId,
        ownerId: botOwnerId,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`guild_restore:confirm:${restoreId}`).setLabel("確認開始還原").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`guild_restore:cancel:${restoreId}`).setLabel("取消").setStyle(ButtonStyle.Secondary),
      );
      logAction("guild.restore.awaiting_confirmation", {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        sourceGuildId: backup.sourceGuild.id,
        roleCount: backup.roles.length,
        channelCount: backup.channels.length,
        attachedFile: Boolean(attachment),
      });
      await interaction.editReply({
        content: [
          `將從「${backup.sourceGuild.name}」（來源 ID：${backup.sourceGuild.id}）建立 ${backup.roles.length} 個身分組及 ${backup.channels.length} 個頻道。`,
          "還原會更新目標伺服器的 @everyone 基礎權限，並新增備份中的身分組與頻道；不會刪除或覆蓋現有自訂身分組、頻道。重複執行可能產生重複項目。",
          "頻道權限會依備份重建；備份內的管理員權限也會保留。只使用你信任的備份。",
          "沒有包含訊息、成員名單或 Bot 管理的整合身分組。Bot 需要 Manage Roles 與 Manage Channels 權限。",
          "請在 10 分鐘內由 Discord Bot 應用程式擁有者確認。",
        ].join("\n"),
        components: [row],
      });
    } catch (error) {
      console.error(`Guild ${interaction.commandName} failed`, error?.stack || error);
      logAction(`guild.${interaction.commandName === "伺服器備份" ? "backup" : "restore"}.failed`, { userId: interaction.user.id, guildId: interaction.guildId, error: String(error) });
      const message = interaction.commandName === "伺服器還原" && /找不到.*備份/.test(String(error?.message || error))
        ? error.message
        : interaction.commandName === "伺服器還原"
          ? `讀取備份失敗：${String(error?.message || error).slice(0, 1000)}`
          : "建立備份失敗，請稍後重試並確認 Bot 能讀取頻道及身分組。";
      await interaction.editReply({ content: message, components: [] });
    }
    return;
  }
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
  if (interaction.commandName === "驗證") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const member = interaction.member;
      if (!member || !member.roles?.add) throw new Error("只能在 Server 頻道使用驗證指令");
      const result = await verifyMember(member);
      logAction(result.ok ? "member.verified" : "member.verification_failed", { userId: interaction.user.id, guildId: interaction.guildId, countryName: result.countryName || null, roleName: result.roleName || null, verifiedRoleName: result.verifiedRoleName || null, reason: result.reason || null });
      if (result.ok) await interaction.editReply(`驗證成功！已為你加入「${result.roleName}」及「${result.verifiedRoleName}」身分組（${result.countryName}）。`);
      else if (result.reason === "not_registered") await interaction.editReply("驗證失敗：你的 Discord ID 不在 FUMO 官方註冊名單中，請先完成網站註冊或聯絡管理員。");
      else if (result.reason === "country_role_missing") await interaction.editReply(`驗證失敗：找不到「${result.countryName}」對應的成員國／觀察國資料。`);
      else if (result.reason === "role_not_found") await interaction.editReply("驗證失敗：伺服器尚未設定對應身分組，請聯絡管理員。");
      else if (result.reason === "verified_role_not_found") await interaction.editReply("驗證失敗：伺服器尚未設定已驗證身分組，請聯絡管理員。");
      else await interaction.editReply("驗證失敗，請稍後再試或聯絡管理員。");
    } catch (error) {
      console.error("Member verification failed", error?.stack || error);
      logAction("member.verification_error", { userId: interaction.user.id, guildId: interaction.guildId, error: String(error) });
      await interaction.editReply("驗證失敗：Bot 可能缺少 Manage Roles 權限，或目前無法連線到 FUMO 官方網站。");
    }
    return;
  }
  if (!canManage(interaction)) {
    logAction("command.denied", { command: interaction.commandName, userId: interaction.user.id, channelId: interaction.channelId });
    await interaction.reply({ content: "只有 FUMO 管理員或具備管理伺服器權限的成員可以使用此指令。", ephemeral: true });
    return;
  }
  if (interaction.commandName === "說話") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const content = interaction.options.getString("內容", true).trim();
      const replyId = interaction.options.getString("回覆id")?.trim() || "";
      const message = await postBotSpeech(content, interaction.channel, replyId);
      logAction("speech.sent", { userId: interaction.user.id, channelId: interaction.channelId, messageId: message.id, replyId: replyId || null, content });
      await interaction.editReply(`Bot 已發言：${message.url}`);
    } catch (error) {
      console.error("Bot speech failed", error?.stack || error);
      logAction("speech.failed", { userId: interaction.user.id, channelId: interaction.channelId, error: String(error) });
      await interaction.editReply("Bot 發言失敗，請確認頻道 ID 正確，並給予 Bot View Channel 與 Send Messages 權限。");
    }
    return;
  }
  if (interaction.commandName === "整理入聯") {
    await interaction.deferReply();
    try {
      const channel = await client.channels.fetch(ADMISSION_CHANNEL_ID);
      if (!channel || (!channel.isTextBased() && !channel.threads)) throw new Error(`無法讀取入聯頻道 ${ADMISSION_CHANNEL_ID}（type ${channel?.type ?? "unknown"}）。`);
      const result = await collectAdmissionDigest(channel, interaction.options.getString("會期"));
      logAction("admission.digest", { userId: interaction.user.id, threadId: result.thread.id, period: result.period, applicationCount: result.applications.length });
      await sendLongReply(interaction, `**FUMO 入聯申請整理**\n\n${formatAdmissionDigest(result.period, result.applications, result.thread.name)}`);
    } catch (error) {
      console.error("Admission digest failed", error?.stack || error);
      logAction("admission.digest.failed", { userId: interaction.user.id, error: String(error) });
      const reason = error instanceof Error ? error.message : String(error);
      await interaction.editReply(`入聯整理失敗：${reason.slice(0, 1500)}\n\n請確認 Bot 已啟用 Message Content Intent，並擁有入聯 Forum 頻道的 View Channel、Read Message History 權限。`);
    }
    return;
  }
  if (interaction.commandName === "整理提案") {
    await interaction.deferReply();
    try {
      const channel = await client.channels.fetch(PROPOSAL_CHANNEL_ID);
      if (!channel || (!channel.isTextBased() && !channel.threads)) throw new Error(`無法讀取 ID ${PROPOSAL_CHANNEL_ID}：這不是文字或 Forum 頻道（type ${channel?.type ?? "unknown"}）。`);
      const result = await collectProposalDigest(channel, interaction.options.getString("會期"));
      logAction("proposal.digest", { userId: interaction.user.id, threadId: result.thread.id, period: result.period, proposalCount: result.proposals.length });
      await sendLongReply(interaction, `**${result.thread.name}**\n${formatProposalDigest(result.period, result.proposals)}`);
    } catch (error) {
      console.error("Proposal digest failed", error?.stack || error);
      logAction("proposal.digest.failed", { userId: interaction.user.id, error: String(error) });
      const reason = error instanceof Error ? error.message : String(error);
      await interaction.editReply(`議案整理失敗：${reason.slice(0, 1500)}\n\n請確認 Bot 已啟用 Message Content Intent，並擁有議事中心頻道的 View Channel、Read Message History 權限；串文標題需符合「第 N 次議事中心決議提案申請-YYYY/MM」。`);
    }
    return;
  }
  if (interaction.commandName === "公告") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const title = interaction.options.getString("標題", true);
      const content = interaction.options.getString("內容", true);
      const mode = interaction.options.getString("格式") || "embed";
      const url = await postAnnouncement(title, content, interaction.user.username, mode);
      logAction("announcement.sent", { userId: interaction.user.id, channelId: ANNOUNCEMENT_CHANNEL_ID, messageUrl: url, mode, title, content });
      await interaction.editReply(`公告已發布：${url}`);
    } catch (error) {
      console.error("Announcement failed", error);
      logAction("announcement.failed", { userId: interaction.user.id, error: String(error) });
      await interaction.editReply("公告發布失敗，請確認公告頻道的 View Channel 與 Send Messages 權限；Embed 模式另需 Embed Links。");
    }
    return;
  }
  if (interaction.commandName === "身分組檢查") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const result = await compareRoles(interaction.guild);
      logAction("roles.compared", { userId: interaction.user.id, guildId: interaction.guildId, registeredCount: result.registeredCount, serverMemberCount: result.serverMemberCount });
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

client.once("ready", async readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  logAction("bot.ready", { botUserId: readyClient.user.id, guildId: GUILD_ID || null, port: BOT_HTTP_PORT });
  try {
    await getBotOwnerId();
    logAction("bot.application_owner.loaded");
  } catch (error) {
    console.error("Bot application owner lookup failed; owner-only commands will fail closed until Discord can be reached", error?.stack || error);
  }
  startWebhookRelay({ client, guildId: GUILD_ID, channelId: ANNOUNCEMENT_CHANNEL_ID, websiteUrl: WEBSITE_URL, secret: WEBHOOK_SECRET, path: WEBHOOK_PATH, port: BOT_HTTP_PORT, mentionRoleId: ANNOUNCEMENT_ROLE_ID, mentionEvents: BOT_MENTION_EVENTS, defaultAuthor: ANNOUNCEMENT_AUTHOR, logAction });
  registerCommands().catch(error => { console.error("Command registration failed", error); process.exitCode = 1; });
});
client.on("guildMemberAdd", member => {
  sendVerificationDm(member)
    .then(message => logAction("member.verification_dm_sent", { userId: member.id, guildId: member.guild.id, messageId: message.id }))
    .catch(error => { console.error("Verification DM failed", error); logAction("member.verification_dm_failed", { userId: member.id, guildId: member.guild.id, error: String(error) }); });
  sendWelcomeMessage(member, true)
    .then(message => logAction("member.welcome_sent", { userId: member.id, guildId: member.guild.id, channelId: message.channelId, messageId: message.id }))
    .catch(error => { console.error("Welcome message failed", error); logAction("member.welcome_failed", { userId: member.id, guildId: member.guild.id, error: String(error) }); });
});
client.on("guildMemberRemove", member => {
  sendWelcomeMessage(member, false)
    .then(message => logAction("member.farewell_sent", { userId: member.id, guildId: member.guild.id, channelId: message.channelId, messageId: message.id }))
    .catch(error => { console.error("Farewell message failed", error); logAction("member.farewell_failed", { userId: member.id, guildId: member.guild.id, error: String(error) }); });
});
client.on("interactionCreate", interaction => handleInteraction(interaction).catch(error => console.error("Interaction failed", error)));
client.on("error", error => console.error("Discord client error", error));
process.on("unhandledRejection", error => console.error("Unhandled rejection", error));

await client.login(BOT_TOKEN);
