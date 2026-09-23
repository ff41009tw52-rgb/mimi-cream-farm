# 水生植物觀察 Google Apps Script 後端

這個 Apps Script 專案取代 Cloudflare Worker、D1 與 R2 的前端依賴：

- Google Sheets 保存學生、三題植物觀察、分類與環境調查。
- Google Drive 保存私人植物照片。
- Apps Script Web App 驗證學生／教師 token，代理照片存取。
- 教師密碼只保存在 Script Properties，不寫入 GitHub Pages。

部署前，請從「水生植物觀察資料庫」試算表開啟綁定的 Apps Script 專案，加入本目錄所有 `.gs` 檔案與 `appsscript.json`。先執行 `setupAquatic`，再透過試算表選單設定教師密碼，最後將 Web App 部署為由擁有者執行。

新版會保留既有 `Reflection` 與舊版五題資料，並在第一次讀取或儲存時安全建立 `Environment` 工作表。環境調查欄位為 `waterFlow`、`aquaticLife`、`otherFindings`，不需要刪除或手動搬移舊資料。

請勿將 Drive 資料夾或照片改成公開分享。Apps Script 會在第一次上傳時才建立「班級／座號／植物」子資料夾。
