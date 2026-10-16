# 悠悠水族箱 V0.4.2 完成交付報告

## 已完成與版本基準

以 main `1f16132a4e994828edcbdb66a40a013a5f65b679`（已合併 PR #72）為基礎，實際比對 PR #71 `c23b435c7eedfa8f2940048b0b76a87b5ed1d476`，沒有直接合併其舊觀察程式。

- 開發分支：`feat/aquarium-v042-completion`
- 整合 PR：[#73](https://github.com/ff41009tw52-rgb/mimi-cream-farm/pull/73)
- 功能驗收 commit：`c6f4ad1788b677a189c378af23cb73299a47ccdd`
- 新版：[aquarium-v0.4.2.html](https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v0.4.2.html)
- 正式入口：[aquarium-v0.4.html](https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v0.4.html)，本 PR 將其更新為同一份 V0.4.2 HTML；合併後由原 GitHub Pages 流程部署。
- [實際截圖與原站比較](https://ff41009tw52-rgb.github.io/mimi-cream-farm/docs/aquarium-v042/index.html)

## A. 已有成果承接

### PR #72 全數保留

正式共用 `assets/aquarium-v041-r2/aquarium-fish-art.js` 原檔，沒有修改，也沒有複製另一套。魚身、魚鱗、魚鰭、配色、七種特殊配色、游動動畫與先前局部科學修正全數保留。鼠魚／紅蓮燈脂鰭、孔雀魚／紅劍魚雄魚臀鰭、黑摩利腹鰭仍是 PR #72 版本。

`getFinInfo` 保持為玩家魚種鰭部文字的唯一來源。精確高亮仍直接使用原魚圖的 Path2D、縮放與動畫變換；放大或翻轉不另套替代圖。

### PR #71 選擇性整合

| 項目 | 本次處理 |
|---|---|
| 跟隨按鈕 | 移除，自己的魚預設置中。 |
| 放大魚兒 | 保留原 1／1.55 倍切換，收進「更多觀察選項」。 |
| 呼吸入口 | 改為「看魚怎麼呼吸」，直接進完整原版教材。 |
| 游動「觀察其他鰭」 | 移除泛用多鰭高亮按鈕；不動玩家魚的逐鰭清單。 |
| 構造名稱開關 | 收進「更多顯示選項」，預設顯示名稱。 |
| 提示與說明 | 依最新 CSS 選擇性整合，保持已修正文案。 |
| `fishFinNotes`、另一套魚鰭短文區 | 捨棄，避免重複 `getFinInfo`，以及舊文字與已修正圖片不一致。 |
| 舊觀察控制器與舊 standalone | 捨棄，不覆蓋 PR #72。 |

**PR #71 不應再原封不動合併。**必要部分已在 #73 整合；本次未合併或關閉 #71。

## B. 原呼吸教材整合

### 重用來源與動畫

來源是未修改的 `fish-breathing-review.html`，原檔 416,955 bytes。其單張內嵌 WebP 抽出為 `assets/aquarium-v042/carp-review.webp`，299,184 bytes，與原 data URI 解碼後逐位元相同。

原 `FishRenderer` 逐字抽出為 `breathing-renderer.js`，完整保留：

- 鯉魚全身與頭部放大的原視野。
- 固定魚身、下顎、鰓蓋、魚鰓快取圖層。
- 嘴部條帶位移、鰓蓋開合、鰓絲與水流箭頭。
- 原 4.8 秒動畫週期；「看吸水」固定在 25，「看排水」固定在 75。

原 `<main>` 介面與 CSS 抽出為 `breathing-template.js`，在 Shadow DOM 中隔離，避免遊戲 CSS 污染原教材。保留播放／暫停、看吸水、看排水、0.25×～2×（間距 0.25）、顯示水流、透視鰓蓋、全身及頭部雙圖、複習文字。

### 時間與資源管理

`breathing-review.js` 使用水族箱既有主迴圈的 `tick(dt)`；沒有第二個 RAF、interval 或動畫計時器。首次進入才載入原圖，分層快取只準備一次。暫停時不持續重繪；切換主題或關閉觀察視窗即停止渲染，並斷開 ResizeObserver。多次進出重用同一個控制器與快取。

觀察速度不改變魚兒成長、飽足度、水質或收益。課本呼吸頁不再顯示舊簡化教材、三階段按鈕或另一組播放／速度／透視／水流控制。原站保持不變，舊渲染器只供其他教材主題與 V0.4.1 回退使用。

### 原站與整合版比較

32 組相同尺寸、階段、全身／頭部、透視及水流條件的渲染像素完全相同。另檢視了原站與整合版的實際瀏覽器截圖。

| 原站 | 整合版 |
|---|---|
| [原站吸水](docs/aquarium-v042/original-breathing-intake.webp) | [整合吸水與控制區](docs/aquarium-v042/v042-breathing-intake.webp) |
| [原站排水](docs/aquarium-v042/original-breathing-outflow.webp) | [整合排水與控制區](docs/aquarium-v042/v042-breathing-outflow.webp) |
| [原站透視](docs/aquarium-v042/original-breathing-cutaway.webp) | [整合雙圖透視](docs/aquarium-v042/v042-1440-breathing.webp) |
| [原始吸水頭部同尺寸輸出](docs/aquarium-v042/compare-original-intake-head-cutaway.webp) | [整合吸水頭部同尺寸輸出](docs/aquarium-v042/compare-integrated-intake-head-cutaway.webp) |
| [原始排水頭部同尺寸輸出](docs/aquarium-v042/compare-original-outflow-head-cutaway.webp) | [整合排水頭部同尺寸輸出](docs/aquarium-v042/compare-integrated-outflow-head-cutaway.webp) |

保留原教學畫面與控制順序；差異只在外層網站導航改用水族箱視窗導航、內層左右留白移除、滑桿觸控高度至少 44px。小螢幕沿用原站上下雙圖排列，在觀察視窗內捲動到控制與複習文字。容器寬度會影響換行與畫布尺寸，沒有替換成簡略魚圖。部分截圖拍攝的是捲動後的控制區，不表示原魚圖被移除。

正常入口載入小型模組及原 WebP，沒有將 400KB HTML 複製進遊戲。離線版由建置腳本打包同一份原圖與模組，較大體積是為了完全離線可用。

## C. 十種魚鰭驗收

全部直接保留 PR #72 的原圖與位置，本輪沒有局部改圖。測試涵蓋 17 組普通／特殊配色、左右方向、兩種大小、兩個動作姿態，共 696 筆逐鰭高亮檢查，並逐條實際切換玩家魚、點擊魚鰭、驗證放大與選取重設。

| 魚種 | 可互動魚鰭 | 驗收與處理 |
|---|---|---|
| 孔雀魚 | 背、胸、腹、雄魚臀、尾鰭 | 通過，原圖保留 |
| 金魚 | 背、胸、腹、臀、尾鰭 | 通過，原圖保留 |
| 鼠魚 | 背、胸、腹、臀、尾、脂鰭 | 通過，原圖保留 |
| 斑馬魚 | 背、胸、腹、臀、尾鰭 | 通過，原圖保留 |
| 黑摩利 | 背、胸、腹、臀、尾鰭 | 通過，原圖保留 |
| 紅劍魚 | 背、胸、腹、雄魚臀、尾鰭 | 通過，原圖保留 |
| 白雲山魚 | 背、胸、腹、臀、尾鰭 | 通過，原圖保留 |
| 紅蓮燈 | 背、胸、腹、臀、尾、脂鰭 | 通過，原圖保留 |
| 神仙魚 | 背、胸、絲狀腹、臀、尾鰭 | 通過，原圖保留 |
| 鬥魚 | 背、胸、腹、臀、尾鰭 | 通過，原圖保留 |

只對鼠魚和紅蓮燈提供脂鰭標示，沒有為未畫出的構造強行加標。這是原圖與互動對應的回歸驗收，不宣稱遊戲簡圖可作真魚性別或物種鑑定。

[逐魚與逐鰭測試資料](docs/aquarium-v042/v042-fin-results.json)

## D. 介面精修

- 一般提示桌面 18px、小螢幕 17px，固定於畫面上方；保留關閉按鈕與足夠閱讀時間，測試確認不遮擋餵食／商店／清潔。
- 新手引導內文 17px；商店提示 17～18px；觀察說明與確認對話提高閱讀性。
- 金幣不足：「金幣還不夠！先回魚缸收集金幣，再來購買。」
- 高水質：「魚缸很乾淨，現在不用清潔。可以先餵魚或觀察魚兒。」
- 魚缸已滿的既有正確說明不再重寫。送養、載入與重置保留取消、確認。
- 水色微調，增加低對比水面波光及少量沉木年輪；都在既有背景快取中繪製。保留已完成的水草葉脈、砂粒、岩石紋理，不堆疊高成本特效。
- 統一魚缸外框、商店／圖鑑共用卡片、裝飾預覽、成就卡片、分頁、觀察背景與提示框的柔和綠、米白風格。

水質下降、清潔冷卻、飽足度、成長、收益、價格、容量、個性、群游、配色解鎖和成就規則沒有修改。

## E. 測試、相容性與部署

### 實際執行結果

功能 commit `c6f4ad1` 的以下 PR 測試全部通過：

- [V0.4.2 原呼吸教材與完整遊戲驗收](https://github.com/ff41009tw52-rgb/mimi-cream-farm/actions/runs/38867768165)
- [V0.4.1 既有回歸](https://github.com/ff41009tw52-rgb/mimi-cream-farm/actions/runs/38867768199)
- [V0.4 既有回歸](https://github.com/ff41009tw52-rgb/mimi-cream-farm/actions/runs/38867768158)
- [V0.3 存檔與離線版](https://github.com/ff41009tw52-rgb/mimi-cream-farm/actions/runs/38867768215)

包含餵食追食、收金幣、商店、裝飾、清潔、成長、成就、改名、送養、手動與自動存檔、讀檔／匯出匯入、配色解鎖、防重複領獎、多分頁衝突、儲存失敗保護及離線版。新增呼吸畫面一致性、0.25×／2× 時間差異、暫停、重複進出只建立一份快取、離開不繪製、遊戲時鐘不受影響等驗證。

### 存檔安全

schemaVersion 保持 3，正式 key 為 `aquarium_game_save_v4`、`aquarium_game_save_v4_manual`，獎勵紀錄鍵不變。僅 gameVersion 更新為 `0.4.2`，不需要新增 migration。

已實際測試 V0.4.1 → V0.4.2 承接並重新整理：魚、名字、個性、配色、成長、飽足度、金幣、等級、圖鑑、裝飾、成就、音效及手動快照保留。V0.1／V0.2／V0.3 的既有升級測試也通過。

原 `aquarium-data.js`、`aquarium-save.js`、`aquarium-world.js`、魚類美術及回退入口以 SHA-256 保護。新版只在 `version.js` 覆寫版本字串，其餘數值逐項相同。

回退入口保留：

- [V0.4 原版](https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v0.4.0.html)
- [V0.4.1](https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v0.4.1.html)
- [V0.4 離線版](https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v0.4-standalone.html)
- [V0.4.1 離線版](https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v0.4.1-standalone.html)
- [V0.4.2 離線版](https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v0.4.2-standalone.html)

### 效能與螢幕尺寸

GitHub Actions Chromium、真實 requestAnimationFrame；非實體平板。每組包含 15 件裝飾、飼料、金幣，15 魚測試另含環境互動。

| 魚數／尺寸 | 實測 FPS | 平均模擬與繪製時間 |
|---|---:|---:|
| 10 魚，1440×900 | 60.00 | 1.86 ms |
| 15 魚，1440×960 | 57.67 | 2.45 ms |
| 18 魚，1440×900 | 48.87 | 3.02 ms |
| 18 魚，1024×768 | 49.77 | 3.20 ms |
| 18 魚，820×1180 | 47.79 | 3.38 ms |
| 18 魚，390×844 | 53.20 | 2.65 ms |

1440×900、1024×768、820×1180、390×844 的呼吸教材、控制項、魚鰭放大、提示字級、44px 操作尺寸與無橫向溢出檢查通過。原版遊戲的觸控魚身、商店、圖鑑、改名及布置也通過。

[效能資料](docs/aquarium-v042/capacity-performance.json) · [整合測試](docs/aquarium-v042/v042-integration-results.json) · [存檔承接](docs/aquarium-v042/upgrade-results.json) · [離線版測試](docs/aquarium-v042/standalone-results.json)

### 尚未完成／驗證限制

本次要求的程式整合已完成。尚未執行實體 iPad／iPhone、Safari 或班級學生試用；模擬觸控結果不代表這些實機皆已測過。PR #71 保持未合併，應以本報告的取捨記錄為準。

### 修改檔案

- `aquarium-v0.4.html`：正式入口切換；新增 `aquarium-v0.4.2.html`、`aquarium-v0.4.2-standalone.html`。
- 新增 `assets/aquarium-v042/`：`version.js`、`aquarium.js`、`aquarium-observation.js`、`refinements.css`、`breathing-renderer.js`、`breathing-template.js`、`breathing-review.js`、`carp-review.webp`。
- 新增 `scripts/build-aquarium-v042.py`。
- 新增 `tests/aquarium/source-v042.test.cjs`、`browser-v042.test.cjs`、`browser-v042-fins.test.cjs`、`browser-v042-upgrade.test.cjs`、`browser-v042-standalone.test.cjs`、`fixtures/v042-preserved-hashes.json`。
- `tests/aquarium/v041-harness.cjs`、`browser-v041.test.cjs`、`browser-v041-guards.test.cjs`：新增指定測試入口能力，預設仍測 V0.4.1，保留原斷言。
- 新增 `.github/workflows/test-aquarium-v042.yml`；V0.4.1 workflow 的正式入口檢查改比對 V0.4.2，原版回歸保留。
- 新增 `docs/aquarium-v042/` 的實際截圖、比較頁、測試 JSON 與本報告。截圖採無損 WebP 壓縮，未重繪或修改內容。
