# 悠悠水族箱 V0.2

以 V0.1 的 Canvas、單一 simulation loop、dirty Auto Save／手動快照／離線結算架構擴充。V0.1 入口與資產未修改。

## 開啟

- `aquarium-v0.2-standalone.html`：約 83 KB 的完整單檔，不需連線、套件或外部素材。
- `aquarium-v0.2.html`：模組入口，與 `assets/aquarium-v02/` 一起使用。
- 加 `?test=1` 啟用快速模式：成長時間 4%、產幣間隔 12%、經驗 4 倍，使用獨立存檔；正式版不顯示工程控制項。
- 加 `?debug=1` 提供唯讀 `aquariumDebug()`，不改正式數值。
- `python3 scripts/build-aquarium-v02.py` 從模組來源重建單檔。

## 玩法與數值

初始孔雀魚／金魚／鼠魚各一隻、20 金幣、容量 10。餵食後點缸撒下三顆飼料，可選一般或沉底飼料；點金幣或「收取金幣」收入。保持飽食至少 45、水質至少 45 才產幣；飽食／水質大於 25 才成長。35% 進入亞成魚，100% 成魚。

所有平衡設定集中在 `aquarium-data.js`。每種魚以速度、加速度、轉彎速度、水層、群游傾向、停頓／短衝機率、食物偏好驅動同一模擬，不依魚種堆疊 if/else。Canvas 外形獨立於行為。

| 魚種 | 價格 | Lv | 成魚時間 | 幼／亞／成收益 | 每次間隔 | 行為 |
|---|---:|---:|---:|---|---:|---|
| 孔雀魚 | 65 | 1 | 10 分 | 2／4／6 | 45 秒 | 靈巧短衝，中上層，微弱群聚 |
| 金魚 | 110 | 1 | 20 分 | 3／6／10 | 60 秒 | 平順慢游、寬轉彎，停著擺尾 |
| 鼠魚 | 85 | 1 | 15 分 | 2／5／7 | 55 秒 | 底層短巡再停、偏好底餌 |
| 斑馬魚 | 100 | 2 | 11 分 | 2／4／6 | 38 秒 | 很快、中上層群聚 |
| 黑摩利 | 145 | 2 | 12 分 | 3／6／9 | 62 秒 | 中層穩定游、較快成長 |
| 紅劍魚 | 190 | 3 | 16 分 | 3／6／11 | 57 秒 | 中層探索、短衝 |
| 白雲山魚 | 175 | 3 | 14 分 | 2／5／8 | 43 秒 | 中上層、小型群游 |
| 紅蓮燈 | 260 | 4 | 18 分 | 3／6／10 | 47 秒 | 中層、強群聚 |
| 神仙魚 | 390 | 4 | 30 分 | 4／10／18 | 82 秒 | 大型、慢加速、寬轉向 |
| 鬥魚 | 480 | 5 | 24 分 | 4／9／15 | 75 秒 | 中上層獨立游、停頓 |

Lv.1–5 累計經驗門檻為 0／45／130／300／620。吃飼料 2、收取一枚產幣 1、魚跨成長階段 8、初次新魚種 12、重複購魚 2、每分鐘良好照顧 2、完成清潔 2。飽食已高時吃食不給經驗。清潔 +38、2.1 秒漸變，完成後再等 45 秒，水質 >90 不啟動。

商店只有「魚兒／布置」兩頁。12 種布置包含 3 底砂、3 水草、4 硬景、2 趣味裝飾。底砂持有一次、可切換；水草／硬景可買多件。左／中央／右各有 2 水草與 2 硬景位置，中央高度較低，最多 12 個放置物。衝突提示，不覆蓋。收起後可再放。

圖鉴保存總飼養次數與最高階段，當前數量由活魚計算。改名接受中英數、最多 12 字，拒絕空白與 HTML。送養需確認，至少留 3 魚、無退款，保留圖鑑，避免容量已滿後無法繼續蒐集。

## 存檔與升級

| 項目 | 正式 | 測試 |
|---|---|---|
| SAVE_KEY | `aquarium_game_save_v2` | `aquarium_game_save_v2_test` |
| MANUAL_KEY | `aquarium_game_save_v2_manual` | `aquarium_game_save_v2_test_manual` |
| schemaVersion／gameVersion | 2／0.2 | 2／0.2 |

正式版先找 V0.2 存檔；尚無時讀 `aquarium_game_save_v1`，嚴格驗證後 migration 1→2，保留魚 ID、名字、飽食、成長、金幣、水質與容量，初始化等級、圖鑑、布置、音效。寫入 V0.2 key，**完全不寫或刪除 V0.1 key**。有效的舊手動快照也升級至新手動 key，無新手動檔時才複製。未知 schema、損壞或非法資料保留原文、停止覆寫。

同源、同瀏覽器可自動升級；Chromium 也實測兩個本機 standalone 檔案可讀舊 key。其他瀏覽器的 file:// 儲存支援不一致，若改網址／瀏覽器，需使用 JSON 匯入。V0.2 設定可匯出／匯入 1 MiB 內的 V0.1/V0.2 JSON；驗證成功並確認後，先將目前 V0.2 備份至 `SAVE_KEY + '_before_import'`。備份失敗不匯入。測試檔不混入正式模式。

15 秒 dirty Auto Save；吃食／產幣合併 900ms；購買／命名／布置／階段成長等立即保存。離線上限 4 小時、收益上限 120，結算立即保存以防重複領取。新資料包括 xp／level／careProgress／collection／purchasedDecorations／placedDecorations／substrate／soundEnabled／cleanReadyAt／mode。魚瞬間 x/y、速度、目標、飼料、泡泡與效果不存；裝飾位置與待收金幣仍存。多分頁衝突停止模擬與保存，設定重讀後繼續。

## 音效與效能

只有短促的正弦波操作音效，不載入聲音檔／背景音樂。第一個 pointer／鍵盤操作才建立 AudioContext；失敗或被禁止不影響遊戲。吃食聲至少間隔 0.7 秒，其他至少 0.08 秒，音量低。開關保存。

保留單一 requestAnimationFrame、delta time 0.1 秒上限、DPR 上限 2、Canvas 背景快取。沒有新增大量 DOM 動畫或 interval。背景只在 resize、裝飾／底砂變動或讀檔時重畫。

## 驗證

```
AQUARIUM_CHROMIUM=/path/to/chromium AQUARIUM_ARTIFACTS=/path/to/artifacts node tests/aquarium/browser-v02.test.cjs
AQUARIUM_CHROMIUM=/path/to/chromium AQUARIUM_ARTIFACTS=/path/to/artifacts node tests/aquarium/browser-v02-additional.test.cjs
AQUARIUM_CHROMIUM=/path/to/chromium AQUARIUM_ARTIFACTS=/path/to/artifacts node tests/aquarium/browser-v02-longplay.test.cjs
AQUARIUM_CHROMIUM=/path/to/chromium AQUARIUM_ARTIFACTS=/path/to/artifacts node tests/aquarium/browser-v02-online.test.cjs
```

測試用 Playwright，腳本自帶伺服器。一般模式成長與經濟使用正式 simulation 加速時鐘；十魚效能使用實際 RAF、不加速。涵蓋正式開局／收入、五種魚以上行為、十魚十布置飼料金幣、裝飾／圖鑑／命名保存、V0.1 自動與手動 migration、實際 V0.1 程式存檔、手動快照／JSON 匯入／離線／多分頁／存檔損壞／容量不足／音效／測試隔離／重置。兩個平板 viewport 與手機採 hasTouch，實際點按商店／裝飾／圖鑑／資訊卡，檢查無橫向溢出與 44px 主要按鈕。

正式入口為 `https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v0.2.html`。V0.1 入口仍為 `aquarium-game.html`，首頁與其他遊戲保持原樣。上線測試腳本以獨立瀏覽器 context 檢查實際網站開局、V0.1 同源升級、購魚、改名、布置、刷新、單檔入口与兩種平板。未做實體 iPad Safari／Android 性能驗證或學生班級試玩，瀏覽器結果不是實機保證。
