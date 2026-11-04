# FUMO 官方網站 Discord Bot

這個 Bot 使用 Node.js + discord.js，部署在 Wispbyte；網站 API 仍部署在 Cloudflare Worker。Bot 目前提供：

- `/公告`：發布公告到指定頻道，可選擇視覺化 Embed（預設）或純文字
- `/身分組檢查`：比較 FUMO `/api/voters` 註冊名單與 Discord Server 成員，列出缺少或未註冊成員
- `/投票狀態`：檢查 FUMO 官方網站 API 狀態
- `/國家查詢`：以國家全名、簡稱或代號查詢成員國／觀察國公開資料、代表姓名與會員狀態；回覆連結至官網共用國家名錄，只讀取官方 API，不會修改資料或身分組
- `/驗證`：以 Discord ID 對照 FUMO 註冊名單，成功後加入成員國／觀察國身分組
- 新成員加入時自動私訊「開始驗證」按鈕，並在歡迎頻道發送中英文歡迎詞；成員離開時在同一頻道發送歡送 ASCII 訊息
- `/整理提案`：整理議事中心例行大會串文，整理席位更動案與一般提案
- `/整理入聯`：依「第 N 次議事中心入聯提案申請-YYYY/MM」串文，整理為「國家｜最高領導人｜貴國連結」；可指定 `會期`，留空則整理最新一期
- `/說話`：管理員指揮 Bot 發送一般文字訊息；在哪個頻道執行，Bot 就發送到哪個頻道。填入同頻道的 `回覆id` 可直接回覆指定訊息
- `/伺服器備份`：只有 Discord Bot 應用程式的擁有者可執行；備份自訂身分組、頻道／分類、常用頻道設定、排序及頻道權限覆寫，並保存本機 JSON、私密回傳可下載附件
- `/伺服器還原`：只有 Discord Bot 應用程式的擁有者可執行；使用 Bot 本機最新備份，或上傳已下載的 JSON。顯示預覽並再次確認後才建立架構
- 網站 Webhook relay：接收網站簽名事件，再由 Bot 發送 Discord Embed
- 網站 `/bot-admin`：管理員可選擇沿用 Embed 公告，或改用純文字訊息；純文字模式會以標題與內容直接組成 Discord 訊息

`/國家查詢` 以 `/api/members` 讀取國家名稱、簡稱、代號、政體、領袖與會員狀態，並以 `/api/voters` 讀取公開代表姓名。代表資料只顯示姓名，絕不輸出 Discord ID；國家連結指向共用的 `FUMO_WEBSITE_URL/members` 名錄頁，因現有 API 未提供各國專屬網址。

`/身分組檢查` 會依網站 `/api/members` 的成員國／觀察國資料檢查代表是否擁有正確身分組，也會統計秘書處與議事中心身分組人數。目前只做檢查，不會自動新增或移除身分組。確認比對結果後，再加入需要 `MANAGE_ROLES` 的同步指令，避免誤改成員權限。

伺服器備份不包含訊息、成員名單、Bot／整合管理的身分組或串文內容。還原會套用來源備份的 `@everyone` 基礎權限，並新增身分組與頻道；不會刪除既有頻道或自訂身分組。重複還原可能建立重複項目；還原時需給 Bot `Manage Roles` 與 `Manage Channels` 權限。來源備份若有管理員權限，也會照樣重建，請只還原可信任的備份。已離開目標伺服器的成員覆寫會略過。

主程式以共用的 `OWNER_ID` 變數保存 Discord Bot application owner ID，透過 Discord application 資料動態取得，後續指令可重用；不需要在 Wispbyte 手動設定此值。伺服器擁有者、具備 `Manage Guild`／`Administrator` 的成員及 `FUMO_BOT_ADMIN_IDS` 清單都不能代替 Bot application owner 使用或確認 `/伺服器備份`、`/伺服器還原`。

## 本機啟動

```bash
cd bot
npm install
cp .env.example .env
# 填入 .env 後執行
npm start
```

## 環境變數

- `BOT_TOKEN`：Discord Bot Token，只放在 Wispbyte Environment Variables
- `DISCORD_APPLICATION_ID`：Discord Application ID
- `DISCORD_GUILD_ID`：測試 Server ID；設定後指令會立即註冊到該 Server。留空則註冊為全域指令
- `ANNOUNCEMENT_CHANNEL_ID`：公告頻道 ID
- `ANNOUNCEMENT_ROLE_ID`：公告要提及的身分組 ID，可留空
- `FUMO_WELCOME_CHANNEL_ID`：歡迎／歡送頻道 ID；未設定時沿用公告頻道
- `FUMO_API_BASE_URL`：例如 `https://fumo-api.micronationfumo.workers.dev`
- `FUMO_WEBSITE_URL`：預設為 `https://www.micronationfumo.org`
- `FUMO_BOT_ADMIN_IDS`：額外允許使用管理指令的 Discord User ID，逗號分隔
- `FUMO_MEMBER_ROLE_ID`：成員國身分組，預設 `1248257759195955343`
- `FUMO_OBSERVER_ROLE_ID`：觀察國身分組，預設 `1249238458699092049`
- `FUMO_SECRETARIAT_ROLE_ID`：秘書處身分組，預設 `1540730174302191666`
- `FUMO_COUNCIL_ROLE_ID`：議事中心身分組，預設 `1540730860624547920`
- `FUMO_WEBHOOK_SECRET`：可選；留空時不驗證簽名，直接接收網站事件
- `FUMO_WEBHOOK_PATH`：預設 `/fumo/webhook`
- `BOT_HTTP_PORT`：預設 `3000`；Wispbyte 若提供 `PORT`，會優先使用 `PORT`
- `FUMO_BOT_MENTION_EVENTS`：要提及公告身分組的事件，逗號分隔
- `FUMO_ANNOUNCEMENT_AUTHOR`：公告預設發布者名稱，預設為 `FUMO 官方網站 Bot`
- `FUMO_PROPOSAL_CHANNEL_ID`：議案整理來源頻道，預設為 `1414537668406149140`
- `FUMO_ADMISSION_CHANNEL_ID`：入聯整理來源 Forum 頻道，未設定時沿用 `FUMO_PROPOSAL_CHANNEL_ID`
- `FUMO_GUILD_BACKUP_DIR`：伺服器架構 JSON 的本機保存目錄；預設為 `bot/data/server-backups`（相對於 `bot/`）

## Wispbyte 設定

選擇 Node.js Docker image，將 `bot/` 目錄內容上傳到伺服器根目錄，或使用 Wispbyte GitHub Integration 拉取 repo 後把工作目錄指到 `bot`。Wispbyte 的 Node.js 伺服器會在有 `package.json` 時安裝依賴。

網站 repo 的 GitHub Actions 目前只有版本標籤觸發的 Release workflow，沒有 Wispbyte Bot 自動部署 workflow。推送 `main` 不代表執行中的 Bot 已更新；除非 Wispbyte 已設定追蹤此 repository/branch 的 GitHub Integration 並自動重啟，否則需要在 Wispbyte 更新 Bot 檔案並重啟。網站 `/bot-admin` 的純文字選項會同時檢查 API Worker 與 `/healthz` 回報的 `features.announcementText`，只有兩者都部署新版後才會啟用。

Bot 架構備份檔預設保存在 Wispbyte 執行環境的 `bot/data/server-backups/`。若主機磁碟清除、重建或更換，Bot 本機檔案可能消失；每次 `/伺服器備份` 也會私密回傳 JSON 附件，建議另外下載保存。更換主機時可在新伺服器執行 `/伺服器還原` 並附上該 JSON。

如果 Wispbyte 伺服器根目錄就是整個 `official-website` repo，不能在 `/home/container` 直接執行 `npm install`，因為網站根目錄的 `preinstall` 只允許 pnpm。請在 Startup command 使用：

```bash
cd /home/container/bot && npm ci --omit=dev && exec node index.js
```

如果你只把 `bot/` 裡面的檔案上傳到 `/home/container`，才使用：

```bash
npm ci --omit=dev && exec node index.js
```

使用自訂 Startup command 時，不需要依賴預設的 `JS_FILE`；如果面板仍要求填寫，填 `bot/index.js`。Wispbyte 官方建議將 Token 放在 Startup → Environment variables，不要提交 `.env` 或把 Token 寫入 Git。

## 讓 Bot 取代 Discord Webhook

Bot 會在 `FUMO_WEBHOOK_PATH` 提供 HTTP endpoint。先在 Wispbyte 為 Bot 啟用可公開存取的 HTTPS 網址，再到 FUMO 網站管理後台新增一般 Webhook：網址填 `https://你的-wispbyte-網域/fumo/webhook`，事件依需要選擇。`FUMO_WEBHOOK_SECRET` 留空即可直接接收；若之後要防止陌生人呼叫 endpoint，再讓網站 Webhook secret 與 Bot Secret 完全相同。Bot 收到事件後會用 Bot 身分發送 Embed；原本的 Discord `discord.com/api/webhooks/...` endpoint 可以停用。網站 Bot 後台的 Embed 公告可自訂發布者顯示名稱，預設為 `FUMO 官方網站 Bot`；選擇純文字時標題與內容會直接作為一般訊息發送。

## Discord Developer Portal

建立 Bot User，啟用：

- `Server Members Intent`：`/身分組檢查` 需要讀取完整 Server 成員清單
- `Message Content Intent`：`/整理提案` 需要讀取提案串文內容
- Bot 還需要 `Manage Roles`，且 Bot 最高身分組要高於成員國／觀察國身分組，`/驗證` 才能加上身分組

邀請 Bot 時至少給予：

- View Channel
- Send Messages
- Embed Links
- Read Message History

若日後啟用自動身分組同步，Bot 還需要 `Manage Roles`，而且 Bot 的最高身分組必須高於它要管理的身分組。
