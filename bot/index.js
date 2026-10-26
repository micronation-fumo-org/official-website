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
const ANNOUNCEMENT_AUTHOR = process.env.FUMO_ANNOUNCEMENT_AUTHOR || "FUMO 官方網站 Bot";
const PROPOSAL_CHANNEL_ID = process.env.FUMO_PROPOSAL_CHANNEL_ID || "1414537668406149140";
const ADMISSION_CHANNEL_ID = process.env.FUMO_ADMISSION_CHANNEL_ID || PROPOSAL_CHANNEL_ID;

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
  new SlashCommandBuilder()
    .setName("整理提案")
    .setDescription("整理議事中心例行大會串文中的提案")
    .addStringOption(option => option.setName("會期").setDescription("例如 2026/11；留空則整理最新一期").setRequired(false).setMaxLength(20)),
  new SlashCommandBuilder()
    .setName("整理入聯")
    .setDescription("整理議事中心入聯提案申請串文中的國家資料")
    .addStringOption(option => option.setName("會期").setDescription("例如 2026/11；留空則整理最新一期").setRequired(false).setMaxLength(20)),
].map(command => command.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

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

function normalizeText(value) {
  return value.replace(/[\u200b\r]/g, "").replace(/：/g, ":").trim();
}

function getProposalField(content, labels) {
  const match = normalizeText(content).match(new RegExp(`(?:^|\\n)\\s*(?:◆\\s*[||]?\\s*)?(?:${labels.join("|")})\\s*:?\\s*(.+?)(?=\\n\\s*(?:◆|🔹|🔸)|$)`, "i"));
  return match?.[1]?.trim().replace(/\n+/g, " ") || "";
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
      const admission = admissionFromMessage(message.content || "");
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
      const proposal = proposalFromMessage(message.content || "");
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
    const proposal = proposalFromMessage(message.content || "");
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
  if (interaction.commandName === "整理入聯") {
    await interaction.deferReply();
    try {
      const channel = await client.channels.fetch(ADMISSION_CHANNEL_ID);
      if (!channel || (!channel.isTextBased() && !channel.threads)) throw new Error(`無法讀取入聯頻道 ${ADMISSION_CHANNEL_ID}（type ${channel?.type ?? "unknown"}）。`);
      const result = await collectAdmissionDigest(channel, interaction.options.getString("會期"));
      await sendLongReply(interaction, `**FUMO 入聯申請整理**\n\n${formatAdmissionDigest(result.period, result.applications, result.thread.name)}`);
    } catch (error) {
      console.error("Admission digest failed", error?.stack || error);
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
      await sendLongReply(interaction, `**${result.thread.name}**\n${formatProposalDigest(result.period, result.proposals)}`);
    } catch (error) {
      console.error("Proposal digest failed", error?.stack || error);
      const reason = error instanceof Error ? error.message : String(error);
      await interaction.editReply(`議案整理失敗：${reason.slice(0, 1500)}\n\n請確認 Bot 已啟用 Message Content Intent，並擁有議事中心頻道的 View Channel、Read Message History 權限；串文標題需符合「第 N 次議事中心決議提案申請-YYYY/MM」。`);
    }
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
  startWebhookRelay({ client, guildId: GUILD_ID, channelId: ANNOUNCEMENT_CHANNEL_ID, websiteUrl: WEBSITE_URL, secret: WEBHOOK_SECRET, path: WEBHOOK_PATH, port: BOT_HTTP_PORT, mentionRoleId: ANNOUNCEMENT_ROLE_ID, mentionEvents: BOT_MENTION_EVENTS, defaultAuthor: ANNOUNCEMENT_AUTHOR });
  registerCommands().catch(error => { console.error("Command registration failed", error); process.exitCode = 1; });
});
client.on("interactionCreate", interaction => handleInteraction(interaction).catch(error => console.error("Interaction failed", error)));
client.on("error", error => console.error("Discord client error", error));
process.on("unhandledRejection", error => console.error("Unhandled rejection", error));

await client.login(BOT_TOKEN);
