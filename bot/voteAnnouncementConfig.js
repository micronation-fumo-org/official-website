export const DEFAULT_VOTE_ANNOUNCEMENT_CHANNEL_ID = "1249237308096643186";
export const DEFAULT_VOTE_ANNOUNCEMENT_ROLE_ID = "1556182329238618154";

export function getVoteAnnouncementConfig(env = process.env) {
  return {
    channelId: env.VOTE_ANNOUNCEMENT_CHANNEL_ID || DEFAULT_VOTE_ANNOUNCEMENT_CHANNEL_ID,
    roleId: env.VOTE_ANNOUNCEMENT_ROLE_ID === undefined
      ? DEFAULT_VOTE_ANNOUNCEMENT_ROLE_ID
      : env.VOTE_ANNOUNCEMENT_ROLE_ID,
  };
}

export function buildVoteAnnouncementRoleOptions(roleId) {
  const normalizedRoleId = typeof roleId === "string" && /^\d{17,20}$/.test(roleId.trim())
    ? roleId.trim()
    : "";
  return {
    content: normalizedRoleId ? `<@&${normalizedRoleId}>` : "",
    allowedMentions: normalizedRoleId ? { roles: [normalizedRoleId] } : { parse: [] },
  };
}
