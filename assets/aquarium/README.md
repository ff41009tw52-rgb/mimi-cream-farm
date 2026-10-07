# 悠悠水族箱 V0.1

獨立入口：`aquarium-game.html`。原生 HTML / CSS / JavaScript，無外部套件、字型或素材請求。可透過靜態伺服器開啟，或將入口與 assets/aquarium 一起下載後開啟 HTML。正式使用以固定網址及相同瀏覽器為準；各瀏覽器對 file:// 儲存的支援可能不同。

## 已完成

- 孔雀魚、金魚、鼠魚，各有外形、速度、水層偏好與個體資料。Canvas 自製圖形，尾鰭與胸鰭擺動、漸進翻身、隨機停頓、避邊界與同伴分離。requestAnimationFrame + delta time，背景只於 resize 重畫，像素比上限 2。
- 按餵食後點缸投放，三顆飼料從水面緩慢下沉。飢餓魚會轉向追食、吃掉飼料並增加飽食度。鼠魚只追靠近底層的飼料。
- 魚隻資訊卡、飽食度、心情、幼魚／亞成魚／成魚。飢餓或低水質會減速，不死亡、不遺失魚。
- 良好照顧下約 105 秒進入亞成魚，約 5 分鐘完全成長。階段收益 1 / 3 / 5；初始金幣 120；魚價 30 / 60 / 45。
- 魚產出可點擊金幣，收取動畫、買魚與容量 10 隻限制。
- 水質緩慢降低、剩食污染、混濁效果、免費清潔（每次 +35 並清除剩食）。飼料上限 18、投食間隔 0.65 秒、金幣上限 24 顆。
- 滑鼠與 pointer / 觸控支援、魚兒名單與收取金幣的鍵盤替代操作。商店及設定採原生 dialog。

## 存檔架構

| 項目 | 設定 |
|---|---|
| 自動存檔 SAVE_KEY | `aquarium_game_save_v1` |
| 手動快照 MANUAL_KEY | `aquarium_game_save_v1_manual` |
| schemaVersion | 1 |
| gameVersion | 0.1 |
| 自動保存週期 | dirty state + 每 15 秒保存 |
| 合併寫入 | 吃食、產幣、剩食污染使用 900ms 合併排程 |
| 立即保存 | 買魚、收幣、階段成長、清潔、讀檔、重置、離線结算 |
| 離開保存 | visibilitychange、pagehide、beforeunload，盡可能同步保存 |
| 存檔顯示 | HUD「✓ 已自動存檔 HH:mm」，失敗則顯示警示 |
| 手動保存 | 同步保存最新自動檔，另建不被 Auto Save 更新的手動快照 |
| 讀檔 | 設定中選手動快照或最近自動檔；必須確認才取代目前狀態 |
| 長期資料 | savedAt、coins、waterQuality、tankCapacity、個別 fishes、待收 drops |
| 個體資料 | UUID、species、name、hunger、growth、growthStage、size、mood、createdAt、coinProgress |
| 動畫資料 | position、speed、direction、preferredDepth 等只在記憶體；不逐幀寫入 |

目前 main 的 `games/12/index.js` 農場為 localStorage 儲存／讀檔互動，key 是 `farm_tycoon_save_v2`。本遊戲沿用容易理解的存檔／讀檔方式，新增需求指定的 Auto Save、存檔時間與保護機制，完全不讀寫農場 key。

### 離線與防護

- 最多計算 4 小時；每小時飽食 -4，良好狀態時成長 +4 個百分點，水質依魚數稍降。收益每次最多 100，只有良好照顧狀態可累積。
- 1 分鐘以上才提示回歸摘要；所有數值 clamp；結算後立即保存，避免刷新重複領取。
- schema 有 migration 入口，未知版本直接拒絕覆寫。JSON、個體、金幣等驗證失败時保留原文、停止自動覆蓋並提供可操作的暫時遊戲。
- localStorage 無法讀写或空間不足時捕捉例外。HUD 清楚顯示未能保存；不能聲稱進度已保存。
- 另一分頁寫入同 key 時，舊分頁暫停模擬與保存，提醒重新讀取。
- 重置需兩次確認，只 removeItem 上述兩個養魚 key，絕不呼叫 localStorage.clear()。

## 檔案

- `aquarium-game.html`：獨立入口與語意化 UI。
- `assets/aquarium/aquarium.css`：桌面、平板、手機樣式。
- `assets/aquarium/aquarium.js`：CONFIG、SPECIES、存檔、模擬、繪圖與 UI。
- `assets/aquarium/README.md`：使用與架構說明。
- `tests/aquarium/browser.test.cjs`：真實 Chromium 功能與存檔回歸測試。

所有平衡參數集中在 CONFIG，魚種集中在 SPECIES；art 欄位可設置 PNG / WebP 路徑替代目前圖形。

## 驗證與限制

測試腳本自帶本機靜態伺服器，使用 Playwright。可用 `AQUARIUM_CHROMIUM` 指定 Chromium 執行檔；`AQUARIUM_ARTIFACTS` 指定截圖／結果輸出目錄。直接執行 `node tests/aquarium/browser.test.cjs`。

瀏覽器模擬桌面 1440×960、平板 1024×768 / 820×1180 與手機 390×844；涵蓋操作、存讀檔 A–D、容量、金額、成長門檻、離線上限、資料損壞、儲存失敗、剩食、多分頁保護。部分時間依賴案例使用 Playwright 虛擬時鐘及可控 localStorage 測試樣本；不改正式遊戲參數。`?test=1` 僅公開唯讀診斷快照，不提供修改遊戲的 API。

未做 iPad Safari / Android 實機效能保證、雲端同步或多装置共用存檔。此版本不加入首頁、不修改其他遊戲、不合併 main、不部署 GitHub Pages。

## V0.2 建議（未實作）

優先讓學生試玩，觀察餵食是否容易理解、魚的大小與金幣速度是否適合。確認核心體驗後，再加入少量魚種、可購買的底砂與裝飾、圖鑑、精緻轉身動畫。水質若擴充，仍以一眼看懂為原則。
