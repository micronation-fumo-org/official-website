export function hasValidBotBearerToken(secret: string | undefined, authorization: string | undefined): boolean {
  const expected = secret?.trim() ?? "";
  if (!expected || !authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);
  if (supplied.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
  }
  return difference === 0;
}

/** D1's legacy `YYYY-MM-DD HH:MM:SS` representation is UTC, not local time. */
export function storedUtcInstantToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}
