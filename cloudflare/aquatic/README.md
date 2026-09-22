# 水生植物觀察雲端服務

此 Worker 僅處理課堂觀察資料，不含任何 AI 功能。

## 綁定

- D1：`AQUATIC_DB`，資料庫名稱 `aquatic-observation-db`
- R2：`AQUATIC_MEDIA`，Bucket 名稱 `aquatic-observation-media`
- Secret：`TEACHER_PASSWORD`
- Secret：`SESSION_SECRET`（建議 32 bytes 以上的隨機字串）

## 首次部署

1. 建立 D1 與 R2，將 D1 ID 填入 `wrangler.toml`。
2. 對 D1 套用 `schema.sql`。
3. 設定兩個 Secret 後部署 Worker。
4. 將 Worker 網址填入 `aquatic.html` 與 `aquatic-teacher.html` 的 `AQUATIC_API_URL`。

前端只接受教材所列七種植物 ID。照片經瀏覽器壓縮後上傳 R2，D1 只保存檔案 key 與觀察資料。
