# FUMO Status Worker

獨立提供 FUMO 官方網站即時狀態頁的 Cloudflare Worker。它不依賴主網站 Pages 專案，也不修改正式 API Worker。

## 監測項目

- 官方網站首頁 HTTP 回應
- 官方網站公開的 API 健康端點
- 投票資料 API（以 HTTP 回應確認 API 與資料庫讀取可用；不回傳或保存投票資料）

狀態由 `/api/status` 即時探測，頁面每 30 秒重新查詢。此版本不保存歷史可用率或事故紀錄。

## 部署

從 repo 根目錄執行：

```bash
artifacts/api-worker/node_modules/.bin/wrangler deploy --config artifacts/status-worker/wrangler.toml
```

目前已發布的測試網址是 `https://fumo-status.micronationfumo.workers.dev/`。可用 `/healthz` 驗證 Worker；狀態 JSON 位於 `/api/status`。

## 自訂網域

本設定只啟用 `workers.dev` 測試網址，**不會新增或修改 DNS，也不會綁定 `status.micronationfumo.org`**。若要接上自訂網域，請在 Cloudflare Dashboard 的 **Workers & Pages → fumo-status → Settings → Domains & Routes → Add Custom Domain** 加入 `status.micronationfumo.org`，並依 Cloudflare 提示完成 DNS/TLS。完成後使用 `https://status.micronationfumo.org/`。
