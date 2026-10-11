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

- Root directory：`artifacts/fumo-website`
- Build command：`pnpm install --frozen-lockfile && pnpm run build`
- Build output directory：`dist/public`
- Production branch：`main`

## 注意事項

- D1 migration 會建立投票、票券與帳戶資料表。
- Worker 使用 Web Crypto PBKDF2 儲存密碼雜湊，不依賴 Node.js native module。
- 第一次部署後請立即修改預設超級管理員密碼；預設帳號仍沿用既有 Discord ID，密碼為 `changeme`。
- 成員與投票資格資料仍由公開 Google Sheet 讀取；投票與帳戶資料則完全寫入 D1。
