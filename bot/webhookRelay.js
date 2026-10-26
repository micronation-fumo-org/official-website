import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";

const EVENT_TITLES = {
  "vote.created": "🗳️ 新投票已建立",
  "vote.published": "📢 投票已發布",
  "vote.started": "🟢 投票開始",
  "vote.closing_soon": "⏳ 投票即將截止",
  "vote.closed": "🔒 投票已結束",
  "ballot.cast": "✅ 收到新選票",
};

function verifySignature(headers, body, secret) {
  // Secret verification is optional for a private or otherwise protected Wispbyte endpoint.
  if (!secret) return true;
  const timestamp = headers["x-fumo-timestamp"];
  const supplied = headers["x-fumo-signature"];
  if (typeof timestamp !== "string" || typeof supplied !== "string" || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const actual = supplied.replace(/^sha256=/, "");
  if (!/^[a-f0-9]{64}$/i.test(actual)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

function buildEmbed(payload, event, websiteUrl) {
  const vote = payload.vote && typeof payload.vote === "object" ? payload.vote : {};
  const details = payload.details && typeof payload.details === "object" ? payload.details : {};
  const fields = [];
  if (typeof vote.name === "string" && vote.name) fields.push({ name: "投票主題", value: vote.name.slice(0, 1024) });
  if (typeof vote.publicId === "string" && vote.publicId) fields.push({ name: "投票 ID", value: vote.publicId.slice(0, 100), inline: true });
  if (typeof vote.startsAt === "string" && vote.startsAt) fields.push({ name: "開始時間", value: vote.startsAt.slice(0, 100), inline: true });
  if (typeof vote.deadline === "string" && vote.deadline) fields.push({ name: "截止時間", value: vote.deadline.slice(0, 100), inline: true });
  if (event === "ballot.cast") fields.push({ name: "隱私", value: "不包含投票選項", inline: true });
  const description = typeof vote.description === "string" && vote.description ? vote.description.slice(0, 1200) : typeof payload.text === "string" ? payload.text.slice(0, 1200) : "";
  return {
    title: EVENT_TITLES[event] || `📣 FUMO ${event}`,
    description,
    color: 0x5865f2,
    fields,
    url: typeof vote.url === "string" ? vote.url : websiteUrl,
    footer: { text: "FUMO 官方網站 Bot" },
    timestamp: typeof payload.occurredAt === "string" ? payload.occurredAt : new Date().toISOString(),
  };
}

export function startWebhookRelay({ client, guildId, channelId, websiteUrl, secret, path, port, mentionRoleId, mentionEvents }) {
  const events = new Set(mentionEvents);
  const server = createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/healthz") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: true, bot: client.isReady() }));
      return;
    }
    if (request.method === "GET" && request.url === "/channels") {
      const guild = guildId ? client.guilds.cache.get(guildId) : null;
      if (!guild) { response.writeHead(404); response.end("Guild not found"); return; }
      const channels = [...guild.channels.cache.values()]
        .filter(channel => channel.isTextBased() && channel.isSendable())
        .map(channel => ({ id: channel.id, name: channel.name, type: channel.type }))
        .sort((a, b) => a.name.localeCompare(b.name));
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ guildId, channels }));
      return;
    }
    if (request.method === "POST" && request.url === "/announce") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const target = await client.channels.fetch(typeof data.channelId === "string" ? data.channelId : channelId);
        if (!target?.isTextBased() || !target.isSendable()) throw new Error("Channel is not writable");
        const title = typeof data.title === "string" ? data.title.trim().slice(0, 256) : "";
        const content = typeof data.content === "string" ? data.content.trim().slice(0, 1900) : "";
        if (!title || !content) { response.writeHead(400); response.end("Title and content are required"); return; }
        const roleId = typeof data.roleId === "string" && /^\d{17,20}$/.test(data.roleId) ? data.roleId : "";
        const mention = roleId ? `<@&${roleId}>` : "";
        const message = await target.send({ content: mention, embeds: [{ title: `📢 ${title}`, description: content, color: 0x5865f2, url: websiteUrl, footer: { text: "FUMO 官方網站 Bot" }, timestamp: new Date().toISOString() }], allowedMentions: roleId ? { roles: [roleId] } : { parse: [] } });
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ok: true, messageUrl: message.url }));
      } catch (error) {
        console.error("Admin announcement failed", error);
        response.writeHead(500); response.end("Announcement failed");
      }
      return;
    }
    if (request.method !== "POST" || request.url !== path) {
      response.writeHead(404); response.end("Not found"); return;
    }
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8");
    if (body.length > 100000 || !verifySignature(request.headers, body, secret)) {
      response.writeHead(401); response.end("Invalid signature"); return;
    }
    try {
      const payload = JSON.parse(body);
      const event = request.headers["x-fumo-event"] || payload.event;
      if (typeof event !== "string") throw new Error("Missing event");
      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased() || !channel.isSendable()) throw new Error("Relay channel is not writable");
      const mention = mentionRoleId && events.has(event) ? `<@&${mentionRoleId}>` : "";
      await channel.send({ content: mention, embeds: [buildEmbed(payload, event, websiteUrl)], allowedMentions: mention ? { roles: [mentionRoleId] } : { parse: [] } });
      response.writeHead(204); response.end();
    } catch (error) {
      console.error("Website webhook relay failed", error);
      response.writeHead(500); response.end("Relay failed");
    }
  });
  server.listen(port, "0.0.0.0", () => console.log(`Website webhook relay listening on port ${port}${secret ? "" : " (secret not configured)"}`));
  return server;
}
