const VOTE_TIME_ZONES = {
  taipei: "Asia/Taipei",
  paris: "Europe/Paris",
};

function parseInstant(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatInTimeZone(value, timeZone) {
  const timestamp = parseInstant(value);
  if (timestamp === null) return "";
  const parts = new Map(new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp)).map(({ type, value: part }) => [type, part]));
  return `${parts.get("year")}/${parts.get("month")}/${parts.get("day")} ${parts.get("hour")}:${parts.get("minute")}`;
}

export function isVoteAnnouncementDue(vote, now = Date.now()) {
  const meetingNumber = Number(vote?.regularMeetingNumber);
  if (!Number.isSafeInteger(meetingNumber) || meetingNumber < 1) return false;
  if (!(vote?.isPublished === true || vote?.isPublished === 1)) return false;
  if (vote?.isClosed === true || vote?.isClosed === 1) return false;

  const deadline = parseInstant(vote?.deadline);
  if (deadline === null || deadline <= now) return false;
  if (vote?.startsAt == null || vote.startsAt === "") return true;
  const startsAt = parseInstant(vote.startsAt);
  return startsAt !== null && startsAt <= now;
}

export function voteAnnouncementMarker(voteId) {
  return `FUMO-VOTE-START:${voteId}`;
}

export function buildVoteStartAnnouncement(vote, websiteUrl) {
  const meetingNumber = Number(vote?.regularMeetingNumber);
  if (!Number.isSafeInteger(meetingNumber) || meetingNumber < 1) {
    throw new Error("A positive regular meeting number is required for vote announcements");
  }
  const name = typeof vote.name === "string" ? vote.name.trim() : "";
  if (!name) throw new Error("Vote name is required for vote announcements");

  const startValue = vote.startsAt
    ? `台北時間：${formatInTimeZone(vote.startsAt, VOTE_TIME_ZONES.taipei)}\n巴黎時間：${formatInTimeZone(vote.startsAt, VOTE_TIME_ZONES.paris)}`
    : "立即開始";
  const deadlineValue = `台北時間：${formatInTimeZone(vote.deadline, VOTE_TIME_ZONES.taipei)}\n巴黎時間：${formatInTimeZone(vote.deadline, VOTE_TIME_ZONES.paris)}`;
  const description = [name, typeof vote.description === "string" ? vote.description.trim() : ""]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 4000);
  const publicId = String(vote.publicId || vote.customId || vote.id);
  const baseUrl = websiteUrl.endsWith("/") ? websiteUrl : `${websiteUrl}/`;

  return {
    embeds: [{
      title: `第 ${meetingNumber} 次${name}通知`,
      description,
      color: 0x00334d,
      fields: [
        { name: "開始時間", value: startValue, inline: false },
        { name: "截止時間", value: deadlineValue, inline: false },
      ],
      url: new URL(`votes/${encodeURIComponent(publicId)}`, baseUrl).toString(),
      footer: { text: `FUMO 官方網站 Bot · ${voteAnnouncementMarker(vote.id)}` },
      timestamp: new Date().toISOString(),
    }],
  };
}

/**
 * Process candidates from the durable API outbox. Claims are persisted by the
 * API; a missed acknowledgement is recovered by searching the channel marker.
 */
export async function processDueVoteAnnouncements(
  candidates,
  { now = Date.now(), websiteUrl, claim, findExisting, send, markSent, releaseClaim },
) {
  const results = [];
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    if (!isVoteAnnouncementDue(candidate, now)) continue;

    const claimResult = await claim(candidate.id);
    if (!claimResult?.claimed) continue;
    const vote = claimResult.vote || candidate;
    const claimToken = claimResult.claimToken;
    if (!claimToken || !isVoteAnnouncementDue(vote, now)) {
      await releaseClaim(vote.id, claimToken, "Vote is no longer eligible for an announcement").catch(() => {});
      continue;
    }

    let message = null;
    let recovered = false;
    try {
      message = await findExisting(vote);
      if (message) recovered = true;
      else message = await send(vote, buildVoteStartAnnouncement(vote, websiteUrl));
      await markSent(vote.id, claimToken, message.id);
      results.push({ voteId: vote.id, status: recovered ? "recovered" : "sent" });
    } catch (error) {
      // Keep the lease after a Discord send if acknowledgement failed. On lease
      // expiry, findExisting() recovers the already-posted message by its marker.
      if (!message) {
        await releaseClaim(vote.id, claimToken, error instanceof Error ? error.message : "Announcement failed").catch(() => {});
      }
      results.push({ voteId: vote.id, status: "failed" });
    }
  }
  return results;
}
