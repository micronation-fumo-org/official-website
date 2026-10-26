# FUMO 官方網站 Discord Bot

這個 Bot 使用 Node.js + discord.js，部署在 Wispbyte；網站 API 仍部署在 Cloudflare Worker。Bot 目前提供：

- `/公告`：發布 Embed 公告到指定頻道
- `/身分組檢查`：比較 FUMO `/api/voters` 註冊名單與 Discord Server 成員，列出缺少或未註冊成員
- `/投票狀態`：檢查 FUMO 官方網站 API 狀態
- `/驗證`：以 Discord ID 對照 FUMO 註冊名單，成功後加入成員國／觀察國身分組
- 新成員加入時自動歡迎，成員離開時自動歡送
- `/整理提案`：整理議事中心例行大會串文，整理席位更動案與一般提案
- `/整理入聯`：依「第 N 次議事中心入聯提案申請-YYYY/MM」串文，整理為「國家｜最高領導人｜貴國連結」；可指定 `會期`，留空則整理最新一期
- `/說話`：管理員指揮 Bot 發送一般文字訊息；在哪個頻道執行，Bot 就發送到哪個頻道。填入同頻道的 `回覆id` 可直接回覆指定訊息
- 網站 Webhook relay：接收網站簽名事件，再由 Bot 發送 Discord Embed

`/身分組檢查` 會依網站 `/api/members` 的成員國／觀察國資料檢查代表是否擁有正確身分組，也會統計秘書處與議事中心身分組人數。目前只做檢查，不會自動新增或移除身分組。確認比對結果後，再加入需要 `MANAGE_ROLES` 的同步指令，避免誤改成員權限。

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

## Wispbyte 設定

選擇 Node.js Docker image，將 `bot/` 目錄內容上傳到伺服器根目錄，或使用 Wispbyte GitHub Integration 拉取 repo 後把工作目錄指到 `bot`。Wispbyte 的 Node.js 伺服器會在有 `package.json` 時安裝依賴。

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

Bot 會在 `FUMO_WEBHOOK_PATH` 提供 HTTP endpoint。先在 Wispbyte 為 Bot 啟用可公開存取的 HTTPS 網址，再到 FUMO 網站管理後台新增一般 Webhook：網址填 `https://你的-wispbyte-網域/fumo/webhook`，事件依需要選擇。`FUMO_WEBHOOK_SECRET` 留空即可直接接收；若之後要防止陌生人呼叫 endpoint，再讓網站 Webhook secret 與 Bot Secret 完全相同。Bot 收到事件後會用 Bot 身分發送 Embed；原本的 Discord `discord.com/api/webhooks/...` endpoint 可以停用。網站 Bot 後台的公告可以自訂 Embed 頂部的發布者名稱，預設為 `FUMO 官方網站 Bot`；Discord 訊息時間會自動顯示當下時間。

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
