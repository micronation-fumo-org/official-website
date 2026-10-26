# FUMO 前後端分離部署

本專案現在分成兩個可獨立部署的部分：

- `artifacts/fumo-website`：Vite + React 靜態前端，可部署至 Cloudflare Pages。
- `artifacts/api-worker`：Cloudflare Worker API，資料儲存在 Cloudflare D1。

## 1. 安裝依賴

```bash
pnpm install
```

## 2. 建立 D1

在 `artifacts/api-worker` 執行：

```bash
pnpm exec wrangler d1 create fumo-production
```

將輸出的 `database_id` 填入 `artifacts/api-worker/wrangler.toml`，取代
`REPLACE_WITH_D1_DATABASE_ID`。

## 3. 套用 schema

本機預覽：

```bash
pnpm exec wrangler d1 migrations apply fumo-production --local
```

正式環境：

```bash
pnpm exec wrangler d1 migrations apply fumo-production --remote
```

包含管理操作紀錄功能的 Worker 版本，必須先成功套用 `0004_admin_audit_logs.sql` 再部署 Worker。新增自訂投票 ID 與例行大會分區時，先套用 `0005_vote_ids_and_regular_meetings.sql`；新增草稿與預約開始功能時，先套用 `0006_vote_drafts_and_scheduling.sql`；新增 Google 帳戶連結時，先套用 `0007_google_oauth_account_links.sql`；新增 Discord 帳戶連結時，先套用 `0014_discord_oauth_account_links.sql`。這些 migration 只新增資料表與索引，不修改既有帳戶、投票或選票內容。部署前可先執行 `pnpm exec wrangler d1 migrations list fumo-production --remote` 檢查套用狀態。

管理員建立投票時可選擇立即公開、儲存為僅管理員可見的草稿，或設定未來開始時間。預約投票會公開顯示為「即將開始」，到開始時間後由 API 自動允許投票；投票時間由 API 即時判斷，不依賴排程服務。草稿可由管理員在投票詳情頁手動發布，發布操作會寫入管理操作紀錄。

Google OAuth 使用 Cloudflare Worker secrets `GOOGLE_CLIENT_ID` 與 `GOOGLE_CLIENT_SECRET`。Google Cloud OAuth 用戶端需登記以下 Authorized redirect URI（必須完全相符）：`https://www.micronationfumo.org/api/auth/google/callback`。Worker 僅請求 `openid email profile` 身分範圍；只將 Google subject 與已驗證電子郵件寫入 D1，不保存 OAuth 存取權杖或更新權杖，也不授權讀取 Google Drive 或 Sheets。第一次綁定必須先以既有 FUMO 帳戶登入；只有已綁定的 Google 帳戶可用於後續登入。

Discord OAuth 使用 Cloudflare Worker secrets `DISCORD_CLIENT_ID` 與 `DISCORD_CLIENT_SECRET`。Discord Developer Portal 需登記以下 Redirect URL（必須完全相符）：`https://www.micronationfumo.org/api/auth/discord/callback`。Worker 僅請求 `identify`；Discord 使用者 ID 必須存在於 FUMO 註冊名單，才可建立或登入對應帳戶。Discord 登入會與既有 session、ID／密碼登入及 Google 登入共用同一套 FUMO 帳戶與權限，不會移除或取代任何現有登入方式。

## 4. 部署 API

```bash
pnpm --filter @workspace/api-worker run deploy
```

記下 Worker URL，並在 Cloudflare Pages 的環境變數設定：

```text
VITE_API_BASE_URL=https://fumo-api.<your-subdomain>.workers.dev
```

## 5. 建置前端

```bash
pnpm --filter @workspace/fumo-website run build
```

Cloudflare Pages 設定建議：

- Root directory：`/`（repository root）
- Build command：`pnpm install --frozen-lockfile && PORT=4173 BASE_PATH=/ pnpm --filter @workspace/fumo-website run build`
- Build output directory：`artifacts/fumo-website/dist/public`
- Production branch：`main`

Pages Functions 必須放在 repository root 的 `functions/` 目錄，而非前端靜態輸出目錄；新增路由需與既有 `functions/api/` 同層。

前端 build 會在 Vite 打包後，產生繁體中文公開頁面的可索引 HTML、`sitemap.xml` 與 `llms.txt`。建置階段會嘗試從公開 API 取得最新會員國、職位及投票摘要；若 API 暫時無法連線，仍會輸出安全的說明頁與 sitemap，不會因此使建置失敗。可透過 `VITE_API_BASE_URL` 指定建置期公開 API。

## 注意事項

- D1 migrations 會建立投票、選票、帳戶、登入 session 與管理操作紀錄資料表；新增 Worker 功能前應先套用相應 migration。
- 文件工作區需先套用 `artifacts/api-worker/migrations/0013_fumo_document_workspace.sql`，再部署 Worker；此 migration 只新增文件與分享資料表。主站 `/documents/` 會使用既有 FUMO session，公開 `/share/:id` 頁面不要求登入。
- Worker 使用 Web Crypto PBKDF2 儲存密碼雜湊，不依賴 Node.js native module。
- 第一次部署後請立即修改預設超級管理員密碼；預設帳號仍沿用既有 Discord ID，密碼為 `changeme`。
- 成員與投票資格資料仍由公開 Google Sheet 讀取；投票與帳戶資料則完全寫入 D1。
