# 悠悠水族箱 V0.4

從 main `a56c9719f323d2c8924f8510503db0bc0cb7e598` 的 V0.3 建立獨立版本，維持 10 種魚、12 種布置、個性、環境互動、配色收藏、成就與半自由布置。不修改 V0.1～V0.3 或既有呼吸教學頁。

## 入口與建置

- `aquarium-v0.4.html`：模組版。
- `aquarium-v0.4-standalone.html`：單檔離線版，由 `python3 scripts/build-aquarium-v04.py` 產生，請勿手動修改。
- 魚兒資料卡 →「觀察魚兒」；頁尾 →「觀察與複習」。

## 模組

- `aquarium-data.js`：原 V0.3 經濟、魚種、裝飾及養成資料；僅調整版本、獨立 key 與介面文案。
- `aquarium-save.js`：沿用 schema 1→2→3 migration 和 validation。
- `aquarium-world.js`：原環境偏好與互動，原樣保留。
- `aquarium.js`：原遊戲主迴圈、操作、保存；整合觀察入口與一次 `observation.tick(dt)`。
- `aquarium-observation-content.js`：教師可修改的主題、提問、提示、部位說明、複習重點。
- `aquarium-observation-renderer.js`：原創 SVG 硬骨魚、鰓蓋內的鰓、呼吸週期、游動俯視 Canvas。
- `aquarium-observation.js`：三分頁、選魚、縮放、追蹤、暫停、速度與顯示控制。只存記憶體。
- `aquarium-observation.css`：淡綠、淺藍、米白響應式視窗。

## 時間與存檔

觀察模組沒有額外 RAF、setInterval 或 localStorage。主遊戲照原速度運作；示意時間才乘 0.5–2 倍。玩家魚的預覽沿用真正的魚種、配色及 runtime 動作；暫停時固定預覽姿態。關閉視窗後不再繪製觀察內容。

schema 維持 3。正常 key `aquarium_game_save_v4`、手動快照 `_manual`；快速模式 `aquarium_game_save_v4_test`。首次開啟且沒有 V4 檔時，依序檢查 V3／V2／V1，驗證後另存 V4。舊自動檔、手動檔與已領成就 ledger 保留；V3 ledger 合併到 V4 防止回讀早期快照重領。損壞資料停止覆寫並提示。

`?test=1` 快速測試；`?debug=1` 唯讀診斷；`?playtest=1` 沿用匿名本機試玩摘要。觀察畫面不顯示工程資料。

## 測試

安裝 Playwright 與 Chromium 後執行（自訂 Chromium 可指定 `AQUARIUM_CHROMIUM`）：

```sh
node tests/aquarium/schema-v04.test.cjs
node tests/aquarium/browser-v04.test.cjs
node tests/aquarium/browser-v04-guards.test.cjs
node tests/aquarium/browser-v04-observation.test.cjs
node tests/aquarium/browser-v04-life.test.cjs
node tests/aquarium/browser-v04-standalone.test.cjs
```

完整教材核對、限制與實測結果見根目錄 `aquarium-observation-curriculum-report.md`。
