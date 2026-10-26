# FUMO 官方網站架構

## 1. 整體架構

Google Sheet 與 Cloudflare D1 分開使用：

- **Google Sheet**：使用使用者指定的「FUMO 官方網站資料 Sheet 模板」，管理國家、代表、註冊白名單、秘書處名冊、合作組織及歷史投票檔案。
- **Cloudflare D1**：管理網站帳號、密碼雜湊、管理員權限、投票項目、投票紀錄，以及 FUMO 成員共用文件與公開分享快照。
- **Cloudflare Pages**：託管 React/Vite 前端。
- **Cloudflare Workers**：提供獨立 API，連接 Google Sheet 與 D1。

```mermaid
flowchart TD
    U[使用者瀏覽器] --> P[Cloudflare Pages\nReact + Vite 前端]
    P -->|HTTPS /api/*| W[Cloudflare Worker\nfumo-api]
    W -->|SELECT / INSERT / UPDATE| D[(Cloudflare D1\nfumo-production)]
    W -->|公開 CSV 讀取| S[官方網站資料 Sheet 模板]

    D --> A[帳號與密碼雜湊]
    D --> V[投票項目]
    D --> B[投票紀錄]
    S --> M[成員國 / 觀察國]
    S --> R[代表 / 註冊白名單]
    S --> X[秘書處 / 合作組織 / 歷史投票]
```

## 2. 各服務責任

| 服務 | 負責內容 | 不負責內容 |
|---|---|---|
| Cloudflare Pages | 前端畫面、路由、表單、API 呼叫 | 不直接連接 D1、不保存密碼 |
| Cloudflare Worker | API、權限檢查、資料整合、CORS | 不把 Google Sheet 名冊複製到 D1 |
| Cloudflare D1 | 帳戶、投票、投票紀錄、管理員權限、共用文件與分享快照 | 不保存國家名冊的主要來源 |
| Google Sheet | 公開名冊、註冊白名單、合作組織與歷史投票檔案 | 不保存網站密碼；即時網站投票仍由 D1 管理 |

## 3. Google Sheet 分頁

| 用途 | GID |
|---|---:|
| 成員國 | `1958346154` |
| 觀察國 | `1711083489` |
| 投票代表與資格 | `569164345` |
| 註冊名單 | `948800346` |
| 秘書處名冊 | `1939375804` |
| 合作組織列表 | `1745343944` |
| 歷史投票紀錄（標準） | `248931932` |
| 歷史投票紀錄（特殊） | `1639143639` |

Worker 透過 Google Sheet 公開 CSV 匯出介面讀取：

```text
https://docs.google.com/spreadsheets/d/1ebE_1cZa2nqcdPwrFq_60wmElO1GDNtoG8zFPciqHFo/export?format=csv&gid=分頁GID
```

Worker 會在記憶體中快取資料約 5 分鐘，減少對 Google Sheet 的請求。

## 4. D1 資料表

### `voter_accounts`

保存網站帳戶資料：

- 代表 ID
- 代表名稱
- 國家名稱
- PBKDF2 密碼雜湊
- 管理員等級

### `votes`

保存投票項目：

- 投票名稱
- 說明
- 截止時間
- 選項
- 是否允許複選
- 是否已關閉

### `ballots`

保存投票紀錄：

- 投票 ID
- 代表 ID
- 代表名稱
- 國家名稱
- 選擇的選項
- 投票時間

### `fumo_workspace_documents` 與 `fumo_workspace_shares`

`fumo_workspace_documents` 保存所有已登入 FUMO 成員共用的文件標題、類別、Markdown 內容與更新時間；`fumo_workspace_shares` 保存建立分享時的唯讀內容快照。兩者以獨立資料表儲存，不修改既有帳戶、投票或選票資料。

## 5. 主要資料流程

### 5.1 顯示成員國

```text
瀏覽器
  → Pages 前端
  → Worker GET /api/members
  → Worker 讀取 Google Sheet 成員國與觀察國分頁
  → 回傳 JSON
  → 前端顯示
```

### 5.2 顯示投票

```text
瀏覽器
  → Pages 前端
  → Worker GET /api/votes/:id/results
  → Worker 查詢 D1 votes + ballots
  → 回傳 JSON
  → 前端顯示
```
投票進行中，結果回應會額外提供 `countryVotes`，包含國家名稱、所選選項及投票時間；前端每 5 秒重新查詢一次並顯示即時明細。進行中的投票不公開代表姓名，投票關閉或過期後才顯示正式結果中的代表名稱。

### 5.3 註冊帳戶

```text
瀏覽器提交代表 ID 與密碼
  → Worker GET Google Sheet 投票資格
  → 確認代表 ID 合法
  → Worker 使用 PBKDF2 雜湊密碼
  → Worker 將帳戶寫入 D1 voter_accounts
```

### 5.4 投票

```text
瀏覽器提交投票
  → Worker 驗證代表資格（Google Sheet）
  → Worker 驗證帳戶密碼（D1）
  → Worker 檢查投票期限與重複投票
  → Worker 將投票寫入 D1 ballots
```

## 6. API 分工

| API | 資料來源 | 用途 |
|---|---|---|
| `GET /api/healthz` | Worker | 健康檢查 |
| `GET /api/members` | Google Sheet | 成員國與觀察國 |
| `GET /api/voters` | Google Sheet | 投票代表與資格 |
| `GET /api/votes` | D1 | 投票列表 |
| `POST /api/votes` | D1 | 建立投票 |
| `GET /api/votes/:id` | D1 | 投票詳情 |
| `POST /api/votes/:id/ballot` | Google Sheet + D1 | 驗證資格並投票 |
| `GET /api/votes/:id/results` | D1 | 投票結果 |
| `POST /api/auth/register` | Google Sheet + D1 | 註冊帳戶 |
| `POST /api/auth/login` | D1 | 登入 |
| `POST /api/auth/change-password` | D1 | 修改密碼 |
| `GET /api/documents` | D1 + FUMO session | 列出所有成員共用文件 |
| `POST /api/documents` | D1 + FUMO session | 新增或更新共用文件 |
| `DELETE /api/documents/:id` | D1 + FUMO session | 刪除共用文件 |
| `POST /api/shares` | D1 + FUMO session | 建立唯讀公開快照，可自訂網址尾碼 |
| `GET /api/shares/:id` | D1 | 免登入讀取公開快照 |

## 7. 部署架構

### 前端：Cloudflare Pages

```text
GitHub: pengjun0429/official-website
Root directory: 留空
Framework preset: Vite
Build command:
pnpm install --frozen-lockfile && PORT=4173 BASE_PATH=/ pnpm --filter @workspace/fumo-website run build

Output directory:
artifacts/fumo-website/dist/public
```

環境變數：

```text
VITE_API_BASE_URL=https://fumo-api.micronationfumo.workers.dev
```

### 後端：Cloudflare Workers

```text
GitHub: pengjun0429/official-website
Root directory: artifacts/api-worker
Build command: pnpm install --frozen-lockfile
Deploy command: pnpm run deploy
Preview command: pnpm exec wrangler preview
Worker name: fumo-api
```

### 資料庫：Cloudflare D1

```text
Database name: fumo-production
Database ID: 12d68b57-505d-40e9-8581-5024867dbb01
Worker binding: DB
```

## 8. 安全原則

1. Google Sheet 只保存公開或半公開的名冊資料，不保存密碼。
2. 密碼只保存於 D1 的 PBKDF2 雜湊，不保存明文密碼。
3. 前端不直接連接 D1，所有資料操作必須經過 Worker API。
4. Worker 驗證代表資格時，以 Google Sheet 為準。
5. Worker 驗證已註冊帳戶、密碼及投票紀錄時，以 D1 為準。
6. Google Sheet 內容更新後，Worker 最多約 5 分鐘會讀到新資料，因為 Worker 有快取。
7. 若要完全避免名冊被公開讀取，應改用受保護的 Google Sheets API；目前架構使用公開 CSV 匯出，因此該分頁必須允許公開讀取。
8. 文件編輯頁 `/documents/` 由 Pages Function 檢查現有 FUMO session；文件讀寫與刪除 API 也會再次驗證 session，不能只靠前端隱藏介面。
9. `/share/:id` 與 `GET /api/shares/:id` 保持公開唯讀；分享建立時保存不可變快照，不公開來源文件的編輯權限。

## 9. 一句話總結

> **Google Sheet 管名冊，D1 管交易資料，Worker 做中介與權限驗證，Pages 管前端網站。**
