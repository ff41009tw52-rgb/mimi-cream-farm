# 悠悠水族箱 V0.4.1 精修

延續 V0.4 的養成、行為、裝飾、配色、成就、存檔及三主題觀察功能。

- 正式入口：`aquarium-v0.4.html` 與 `aquarium-v0.4.1.html`（相同內容）。
- 回退入口：`aquarium-v0.4.1-initial.html`，引用未修改的 `assets/aquarium-v041/`。
- 離線版：執行 `python3 scripts/build-aquarium-v041.py` 產生 `aquarium-v0.4.1-standalone.html`。
- `aquarium-fish-art.js`：十種原創分層 Canvas 魚，七種既有配色，快取 Path2D；尾、背、臀、胸鰭獨立動作，眼、嘴、鰓蓋線、魚鱗與鰭條細節。沒有外部圖片或新動畫迴圈。
- `draw(context, species, x, y, size, turn, heading, phase, variant, options)` 沿用主程式傳入的成長尺寸、轉向與相位。`hitBounds` 提供相同座標系的外形邊界；點選優先選魚身，最小約 54×50 px。
- 觀察用硬骨魚 SVG 保留在 `aquarium-observation-renderer.js`，與遊戲魚種美術分開，避免教材構造標示失準。
- 主畫面三大按鈕：餵食、商店、清潔。次入口：觀察魚兒、更多功能。金幣出現時顯示全部收取。
- 購買裝飾先記錄庫存，再尋找合法位置；失敗時仍保留庫存。自由拖動、吸附位置、箭頭微調與收回均保留。
- `schemaVersion: 3`、正式 `aquarium_game_save_v4`、手動 `aquarium_game_save_v4_manual` 與領獎紀錄鍵不變。V0.4 存檔直接承接，V0.1–V0.3 沿用既有 migration。
- `?test=1` 用原本獨立測試鍵；`?debug=1` 僅開啟唯讀診斷。
- 只有主 RAF 更新模擬；觀察速度只影響示意，音效、儲存失敗保護及多分頁衝突防護保留。

測試：`tests/aquarium/*v041*.cjs`；GitHub Actions 執行核心流程、存檔保護、版本承接、觸控與觀察、離線版及 10／15／18 魚效能場景。

觀察預設為「看看我的魚」；教材另在「課本複習」。外形頁沒有播放與速度；游動及呼吸頁保留。`options` 可傳 `breathing`、`breathTime`、`breathEmphasis`。詳細報告與實際截圖見 `aquarium-v0.4.1-report.md` 及 `docs/aquarium-v041-r2/`。
