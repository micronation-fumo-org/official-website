export type VoteDraftRecord = {
  id: number;
  publicId: string;
  name: string;
  description: string;
  deadline: string;
  options: string[];
  allowMultiple: boolean;
  customId: string | null;
  regularMeetingNumber: number | null;
  isPublished: boolean;
  ballotCount: number;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function valueFrom(record: UnknownRecord, camelCase: string, snakeCase: string): unknown {
  return record[camelCase] ?? record[snakeCase];
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function readOptions(value: unknown): string[] | null {
  let options = value;
  if (typeof options === "string") {
    try {
      options = JSON.parse(options) as unknown;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(options) || options.some(option => typeof option !== "string")) return null;
  return options as string[];
}

/** Resolve the edit ID from the route props first, with context params as a fallback. */
export function getVoteDraftEditId(
  routeParams?: Record<string, unknown>,
  contextParams?: Record<string, unknown>,
): string | undefined {
  const value = routeParams?.id || contextParams?.id;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Convert supported API response shapes into the exact model the edit form needs. */
export function parseVoteDraftResponse(payload: unknown): VoteDraftRecord {
  const envelope = asRecord(payload);
  const vote = asRecord(envelope?.vote) ?? envelope;
  if (!vote) throw new Error("投票草稿資料格式不正確，無法載入編輯內容。");

  const name = vote.name;
  const deadline = vote.deadline;
  const options = readOptions(vote.options);
  if (typeof name !== "string" || !name.trim() || typeof deadline !== "string" || !deadline || !options || options.length < 2) {
    throw new Error("投票草稿資料不完整，為避免覆蓋原內容，已停止開啟空白編輯表單。");
  }

  const id = toNullableNumber(vote.id);
  const customIdValue = valueFrom(vote, "customId", "custom_id");
  const customId = typeof customIdValue === "string" && customIdValue ? customIdValue : null;
  const publicIdValue = vote.publicId ?? vote.public_id;
  const publicId = typeof publicIdValue === "string" && publicIdValue
    ? publicIdValue
    : customId ?? (id === null ? "" : String(id));
  const ballotCount = toNullableNumber(valueFrom(vote, "ballotCount", "ballot_count")) ?? 0;
  const regularMeetingNumber = toNullableNumber(valueFrom(vote, "regularMeetingNumber", "regular_meeting_number"));
  const description = vote.description;

  return {
    id: id ?? 0,
    publicId,
    name,
    description: typeof description === "string" ? description : "",
    deadline,
    options,
    allowMultiple: toBoolean(valueFrom(vote, "allowMultiple", "allow_multiple")),
    customId,
    regularMeetingNumber,
    isPublished: toBoolean(valueFrom(vote, "isPublished", "is_published")),
    ballotCount,
  };
}
