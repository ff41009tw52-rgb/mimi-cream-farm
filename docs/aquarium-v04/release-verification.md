# V0.4 發布驗證

2026-10-14 15:58（臺灣），已完成正式網站驗證。

- 正式入口：https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v0.4.html
- 單檔入口：https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v0.4-standalone.html
- 15 張實際截圖：https://ff41009tw52-rgb.github.io/mimi-cream-farm/docs/aquarium-v04/
- [PR #68](https://github.com/ff41009tw52-rgb/mimi-cream-farm/pull/68)：已合併。
- 實作 commit：`3321110eb97a66bbad81f584f3ab13cdab5a0909`。
- 合併 commit：`c64a0cab4a7414b1d4a466ed7372778f8355de61`。
- [PR CI](https://github.com/ff41009tw52-rgb/mimi-cream-farm/actions/runs/38531238306)：成功。
- [Pages 部署](https://github.com/ff41009tw52-rgb/mimi-cream-farm/actions/runs/38531493150)：成功。

## 正式網址實測

隔離 Chromium 153.0.8010.0 測試環境，沒有讀寫教師或學生的實際瀏覽器進度。

1. 模組入口、單檔入口、全部 7 個 JS／2 個 CSS，共 11 個發布檔案與本機測試來源逐位元相同。
2. 正式新進度：三隻魚、餵食、魚兒資料卡入口、點選胸鰭、游動轉彎／慢速／暫停、呼吸透視、返回、重新整理通過。
3. 實際以 1024×768 操作主流程，另以 820×1180、390×844 觸控操作呼吸與返回；沒有橫向溢出。
4. 由正式 V0.3 頁面改名並產生自動／手動快照，交給 V0.4 讀取；名字正確、V3 原始資料原文未改。
5. 模組版切到正式單檔版，沿用 V4 進度；觀察與透視仍可操作。
6. 無 JavaScript 例外，無失敗的 HTTP 請求。

原始結果：[online-results.json](test-results/online-results.json)。

## 限制

實體 iPad／Android、Safari／Firefox、真人音效聽感與課堂學生使用仍未測。氧氣、設備與魚缸小事件沒有擴充，符合本次優先完成用詞與觀察複習的範圍。
