const DISCORD_ROLE_ID_PATTERN = /^\d{17,20}$/;

export function normalizeAnnouncementRoleIds(roleIds, legacyRoleId = "") {
  const candidates = Array.isArray(roleIds) ? roleIds : [legacyRoleId];
  return [...new Set(candidates
    .filter(roleId => typeof roleId === "string")
    .map(roleId => roleId.trim())
    .filter(roleId => DISCORD_ROLE_ID_PATTERN.test(roleId)))];
}

export function buildRoleMentionOptions(roleIds) {
  const roles = normalizeAnnouncementRoleIds(roleIds);
  return {
    content: roles.map(roleId => `<@&${roleId}>`).join(" "),
    allowedMentions: roles.length ? { roles } : { parse: [] },
  };
}
