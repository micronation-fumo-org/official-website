export const ANNOUNCEMENT_DRAFT_TTL_MS = 30 * 60 * 1000;
const MAX_TITLE_LENGTH = 256;
const MAX_CONTENT_LENGTH = 1900;
const VALID_MODES = new Set(["embed", "text"]);

function validateDraftFields({ id, userId, guildId, title, content, mode }) {
  if (typeof id !== "string" || !id) throw new TypeError("草稿 ID 不可為空");
  if (typeof userId !== "string" || !userId) throw new TypeError("建立者不可為空");
  if (typeof guildId !== "string" || !guildId) throw new TypeError("伺服器不可為空");
  if (typeof title !== "string" || !title.trim()) throw new TypeError("公告標題不可為空");
  if (title.length > MAX_TITLE_LENGTH) throw new RangeError("公告標題超過 256 字元");
  if (typeof content !== "string" || !content.trim()) throw new TypeError("公告內容不可為空");
  if (content.length > MAX_CONTENT_LENGTH) throw new RangeError("公告內容超過 1900 字元");
  if (!VALID_MODES.has(mode)) throw new TypeError("公告格式不正確");
}

export function createAnnouncementDraft(drafts, draft, now = Date.now()) {
  if (!(drafts instanceof Map)) throw new TypeError("草稿儲存區必須是 Map");
  validateDraftFields(draft);
  const stored = { ...draft, expiresAt: now + ANNOUNCEMENT_DRAFT_TTL_MS };
  drafts.set(stored.id, stored);
  return { ...stored };
}

export function getAnnouncementDraft(drafts, { id, userId, guildId }, now = Date.now()) {
  const draft = drafts.get(id);
  if (!draft) return null;
  if (draft.expiresAt <= now) {
    drafts.delete(id);
    return null;
  }
  if (draft.userId !== userId || draft.guildId !== guildId) return null;
  return { ...draft };
}

export function updateAnnouncementDraft(drafts, { id, userId, guildId }, fields, now = Date.now()) {
  const current = getAnnouncementDraft(drafts, { id, userId, guildId }, now);
  if (!current) return null;
  const updated = { ...current, ...fields };
  validateDraftFields(updated);
  updated.expiresAt = now + ANNOUNCEMENT_DRAFT_TTL_MS;
  drafts.set(id, updated);
  return { ...updated };
}

export function deleteAnnouncementDraft(drafts, { id, userId, guildId }, now = Date.now()) {
  if (!getAnnouncementDraft(drafts, { id, userId, guildId }, now)) return false;
  return drafts.delete(id);
}

export function pruneAnnouncementDrafts(drafts, now = Date.now()) {
  let removed = 0;
  for (const [id, draft] of drafts) {
    if (draft.expiresAt <= now) {
      drafts.delete(id);
      removed += 1;
    }
  }
  return removed;
}
