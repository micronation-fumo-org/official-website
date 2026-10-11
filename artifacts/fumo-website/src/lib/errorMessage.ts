const errorTranslations: Array<[RegExp, string]> = [
  [/failed to fetch members/i, "載入成員資料失敗，請稍後再試。"],
  [/failed to fetch votes/i, "載入投票列表失敗，請稍後再試。"],
  [/failed to fetch vote/i, "載入投票資料失敗，請稍後再試。"],
  [/failed to fetch results/i, "載入投票結果失敗，請稍後再試。"],
  [/failed to fetch accounts/i, "載入帳戶資料失敗，請稍後再試。"],
  [/failed to (create|update) account/i, "更新帳戶資料失敗，請稍後再試。"],
  [/failed to create vote/i, "建立投票失敗，請稍後再試。"],
  [/failed to cast ballot/i, "提交投票失敗，請確認資料後再試。"],
  [/failed to close vote/i, "關閉投票失敗，請稍後再試。"],
  [/network|fetch failed|連線/i, "網路連線錯誤，請稍後再試。"],
  [/unauthorized|not authenticated|登入/i, "登入資訊已失效，請重新登入。"],
  [/forbidden|permission|administrator/i, "您沒有執行此操作的權限。"],
  [/not found/i, "找不到要求的資料。"],
  [/already.*(vot|register|exist)/i, "資料已存在，請勿重複操作。"],
  [/password/i, "密碼錯誤或不符合要求。"],
  [/required|missing|invalid/i, "輸入資料格式不正確，請檢查後再試。"],
];

export function toChineseError(error: unknown, fallback = "操作失敗，請稍後再試。") {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (!message || message === "undefined" || message === "null") return fallback;
  for (const [pattern, translation] of errorTranslations) {
    if (pattern.test(message)) return translation;
  }
  // API errors may already be Chinese; preserve them instead of replacing useful detail.
  if (/[\u4e00-\u9fff]/.test(message)) return message;
  return fallback;
}
