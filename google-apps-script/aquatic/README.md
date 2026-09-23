# 水生植物觀察 Google Apps Script 後端

這個 Apps Script 專案取代 Cloudflare Worker、D1 與 R2 的前端依賴：

- Google Sheets 保存學生、三題植物觀察、分類與環境調查。
- Google Drive 保存私人植物照片。
- Apps Script Web App 驗證學生／教師 token，代理照片存取。
- 教師密碼只保存在 Script Properties，不寫入 GitHub Pages。

人工部署請只使用 `ManualDeploy.gs` 的整合內容；若用模組方式則使用 `Constants.gs`、`Auth.gs`、`Setup.gs`、`Store.gs`、`Photos.gs`、`Admin.gs`、`Code.gs`，**不要同時貼上整合版與模組版**，避免重複定義。整合版由 `node scripts/build-aquatic-manual.mjs` 產生，提交前應執行該命令。現有專案更新後請部署「新版本」的 Web App，不需重新執行初始化或更動教師密碼。

新版會保留既有 `Reflection` 與舊版五題資料，並在第一次讀取或儲存時安全建立 `Environment` 工作表。環境調查欄位為 `waterFlow`、`aquaticLife`、`otherFindings`，不需要刪除或手動搬移舊資料。

請勿將 Drive 資料夾或照片改成公開分享。Apps Script 會在第一次上傳時才建立「班級／座號／植物」子資料夾。
