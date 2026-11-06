export interface VoteDraftFields {
  name: string;
  description: string;
  deadline: string;
  options: string[];
  allowMultiple: boolean;
  customId: string | null;
  regularMeetingNumber: number | null;
}

export interface VoteDraftIssue {
  path: string;
  message: string;
}

export function validateVoteDraftFields(fields: VoteDraftFields, now = Date.now()): VoteDraftIssue[] {
  const issues: VoteDraftIssue[] = [];
  if (!fields.name.trim()) issues.push({ path: "name", message: "請輸入投票名稱。" });
  if (!Number.isFinite(Date.parse(fields.deadline)) || Date.parse(fields.deadline) <= now) {
    issues.push({ path: "deadline", message: "截止時間必須晚於目前時間。" });
  }
  if (fields.options.length < 2) issues.push({ path: "options", message: "至少需要兩個選項。" });
  if (fields.options.some(option => !option.trim())) {
    issues.push({ path: "options", message: "投票選項不可留白。" });
  }
  return issues;
}

export function canEditVoteDraft(isPublished: boolean, ballotCount: number): boolean {
  return !isPublished && ballotCount === 0;
}
