const SNOWFLAKE_PATTERN = /^\d{15,25}$/;

export function extractApplicationOwnerId(owner) {
  if (!owner || typeof owner !== "object") return "";

  // Team-owned applications expose the actual owner as ownerId; never authorize by team ID.
  if ("ownerId" in owner) {
    return typeof owner.ownerId === "string" && SNOWFLAKE_PATTERN.test(owner.ownerId)
      ? owner.ownerId
      : "";
  }

  // User-owned applications expose the owner as a Discord User.
  return typeof owner.id === "string" && SNOWFLAKE_PATTERN.test(owner.id) ? owner.id : "";
}

export function isBotOwner(userId, botOwnerId) {
  return typeof userId === "string"
    && typeof botOwnerId === "string"
    && SNOWFLAKE_PATTERN.test(botOwnerId)
    && userId === botOwnerId;
}
