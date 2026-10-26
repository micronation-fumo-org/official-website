# FUMO 官方網站 Discord Bot

這個 Bot 使用 Node.js + discord.js，部署在 Wispbyte；網站 API 仍部署在 Cloudflare Worker。Bot 目前提供：

- `/公告`：發布 Embed 公告到指定頻道
- `/身分組檢查`：比較 FUMO `/api/voters` 註冊名單與 Discord Server 成員，列出缺少或未註冊成員
- `/投票狀態`：檢查 FUMO 官方網站 API 狀態

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
- `FUMO_API_BASE_URL`：例如 `https://fumo-api.micronationfumo.workers.dev`
- `FUMO_WEBSITE_URL`：預設為 `https://www.micronationfumo.org`
- `FUMO_BOT_ADMIN_IDS`：額外允許使用管理指令的 Discord User ID，逗號分隔
- `FUMO_MEMBER_ROLE_ID`：成員國身分組，預設 `1248257759195955343`
- `FUMO_OBSERVER_ROLE_ID`：觀察國身分組，預設 `1249238458699092049`
- `FUMO_SECRETARIAT_ROLE_ID`：秘書處身分組，預設 `1540730174302191666`
- `FUMO_COUNCIL_ROLE_ID`：議事中心身分組，預設 `1540730860624547920`

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

## Discord Developer Portal

建立 Bot User，啟用：

- `Server Members Intent`：`/身分組檢查` 需要讀取完整 Server 成員清單

邀請 Bot 時至少給予：

- View Channel
- Send Messages
- Embed Links
- Read Message History

若日後啟用自動身分組同步，Bot 還需要 `Manage Roles`，而且 Bot 的最高身分組必須高於它要管理的身分組。
