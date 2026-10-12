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
  [/invalid voter id/i, "此帳戶不在有投票資格的代表名單中；請確認登入的是登記帳戶，或請管理員更新代表名冊。"],
  [/invalid (selected )?options?|invalid option/i, "投票選項與伺服器資料不一致。請重新整理頁面後再選一次；若仍發生，請通知管理員檢查該投票選項。"],
  [/^投票欄位驗證失敗：/i, "投票資料未符合伺服器欄位要求："],
  [/password/i, "密碼錯誤或不符合要求。"],
  [/required|missing|invalid/i, "輸入資料格式不正確，請檢查後再試。"],
];

export function toChineseError(error: unknown, fallback = "操作失敗，請稍後再試。") {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (!message || message === "undefined" || message === "null") return fallback;
  const validationFailure = message.match(/^投票欄位驗證失敗：(.+)$/);
  if (validationFailure) return `投票資料未符合伺服器欄位要求：${validationFailure[1]}`;
  for (const [pattern, translation] of errorTranslations) {
    if (pattern.test(message)) return translation;
  }
  // API errors may already be Chinese; preserve them instead of replacing useful detail.
  if (/[\u4e00-\u9fff]/.test(message)) return message;
  return fallback;
}
