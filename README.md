# Official Website

## Cloudflare D1

本專案已加入 Cloudflare D1（SQLite）資料層，使用 Drizzle ORM：

- D1 schema：`lib/db/src/d1-schema.ts`
- D1 database factory：`lib/db/src/d1.ts`
- 初始 migration：`migrations/0001_initial.sql`
- Wrangler 設定：`wrangler.toml`
- Worker API：`artifacts/api-server/src/worker.ts`（`/api/healthz`、`/api/votes`）

### 建立 D1 database

```bash
pnpm install
npx wrangler d1 create official-website
# 將回傳的 database_id 填入 wrangler.toml
npx wrangler d1 migrations apply official-website --local
npx wrangler dev
```

部署到 Cloudflare：

```bash
npx wrangler d1 migrations apply official-website --remote
npx wrangler deploy
```

D1 不支援 PostgreSQL array/timestamp 型別，因此：

- `options` 與 `selected_options` 以 JSON 字串保存
- `deadline`、`created_at`、`updated_at` 以 ISO 8601 字串保存
- boolean 欄位使用 SQLite `INTEGER`（Drizzle `mode: "boolean"`）
- `ballots(vote_id, voter_id)` 有唯一索引，避免重複投票

目前原有 Express/PostgreSQL API 仍保留在 Node runtime；Cloudflare Worker 已提供 D1 health check 與投票列表讀取 API。其餘投票寫入、登入與管理 API 若要完全搬到 Cloudflare Workers，需將 Express handlers 改為 request/response-neutral 的 Worker handlers，並移除 Node-only 的 `argon2` 依賴。
