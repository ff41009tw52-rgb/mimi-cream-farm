# 悠悠水族箱 V0.3

V0.2 的獨立升級版本，主題是魚缸生命感與長期養成。保留原 10 種魚、12 種布置、Canvas 動畫與三個主要操作。入口 `aquarium-v0.3.html`；可攜版本由同一份來源生成：

```sh
python3 scripts/build-aquarium-v03.py
```

## 模組

- `aquarium-data.js`：正式／快速測試設定、魚種、裝飾 tags、5 個個性、魚缸階段、7 個特殊配色、10 項永久成就。
- `aquarium-save.js`：既有 schema 1/2 驗證、正式 1→2→3 migration、schema 3 驗證與穩定個性。先驗證舊資料，原物件與舊儲存 key 不變。
- `aquarium-world.js`：POI cache、魚種環境偏好、高階短暫狀態。
- `aquarium.js`：沿用 V0.2 simulation、操作、聲音、存檔、Canvas；整合新養成與 Pointer 布置。
- `aquarium.css`：延伸既有畫面，支援 1024×768、820×1180、390×844。

## 魚的生活空間

裝飾具 `plant/tallPlant/shelter/wood/rock/bottom/curiosity` tags。魚種資料決定各 tag 權重；群游魚保有 openWater 偏好。POI shortlist 在布置／尺寸改變時重建，每隻魚通常 35–65 秒才做一次環境選擇，最多停留 12 秒，抵達後約 2.5–4.5 秒離開。食物優先於環境互動。狀態為 explore/rest/feed/inspectDecoration/hide/school；原加速度、轉向、群聚、避讓和巡底邏輯繼續運作。

這些偏好是遊戲行為設計。180 秒可重現 simulation 中，環境活動約占 12%，其餘大部分時間仍自由游動。鼠魚不因 POI 或個性跑到上層；神仙魚仍比斑馬魚慢。

每隻魚的個性依 ID 決定一次並存檔：好動、悠閒、貪吃、好奇、怕生。modifier 約 ±5–20%，不改變收入或成長。神仙魚不分配好動個性。配色只在繪圖與收藏中使用，不參與 simulation。

背景／後景布置快取 → 魚與食物 → 洞穴／沉船前景遮擋 → 金幣／效果。短暫躲藏另有柔和淡出，沒有 3D 或 physics engine。

## 半自由布置

商店／我的魚缸 → 編輯魚缸。魚放慢繼續游，X 軸左右移動，Y 依物件與底砂固定，內部 16 個 snap slot。選取後提供箭頭微調與收起。invalid overlap 保留原位置，提示「這裡有點擠，換個位置看看。」

每件物件保存 normalized X、snapIndex、底層 lane。舊 left/center/right 與原 slot 的 X 精確保留，第一次移動才吸附。新放置物立即重畫。Pointer capture 支援 mouse/touch/pen；只有裝飾 hit area 使用 `touch-action:none`，空白魚缸仍可垂直捲動。沒有自由上下移動、旋轉或第二魚缸。

## 魚缸升級

| 階段 | 魚容量 | 布置容量 | 升級價 | 條件 |
|---|---:|---:|---:|---|
| 小小水族箱 | 10 | 12 | 初始 | Lv.1 |
| 成長水族箱 | 12 | 15 | 400 | Lv.3 |
| 悠悠水族箱 | 15 | 18 | 1550 | Lv.4 |
| 豐富水族箱 | 18 | 20 | 4800 | Lv.5 |

同一個魚缸增加容量與少量底砂細節，Canvas 比例不變。原存檔自訂容量保留，升級不降低原容量。

## 特殊配色與永久成就

7 個特殊配色：孔雀魚晴空藍／晚霞粉、金魚奶油白、黑摩利珍珠銀、神仙魚晨光金、鬥魚蘭花紫／朝霞紅。條件分別是養成成魚、累計 3 隻神仙成魚，或領取指定永久成就。商店可選擇已解鎖配色，未解鎖會顯示明確條件。圖鑑維持 10 張魚種卡，詳頁顯示配色收藏。

10 個成就涵蓋首購、首次成魚、發現 5/10 種、8 隻魚、5 件布置、三種水草、良好水質 30 分鐘、同魚相伴 90 分鐘、首次升缸。獎勵由玩家點按領取；總金幣獎勵最多 85，另有 3 個配色獎勵，沒有每日任務。

每個成就保存 completed/rewardClaimed。同一 saveId 的本機領獎紀錄防止匯入早期快照重領，領取保存失敗則回復獎勵與狀態。升級舊手動快照時會沿用自動存檔的 saveId。

## 存檔

| 項目 | 正式模式 | 快速測試 |
|---|---|---|
| schemaVersion | 3 | 3 |
| gameVersion | 0.3 | 0.3 |
| SAVE_KEY | `aquarium_game_save_v3` | `aquarium_game_save_v3_test` |
| MANUAL_KEY | `aquarium_game_save_v3_manual` | `aquarium_game_save_v3_test_manual` |

正式讀取順序：V0.3 → V0.2 → V0.1。新 key 驗證成功後才寫；舊 key 永遠不寫、不刪。有效舊手動快照也升級，已有 V0.3 手動快照不覆蓋。損壞／未知版本停止覆寫；損壞舊手動檔保留，不阻擋合法自動進度。

魚 ID、名字、金幣、水質、成長、飽食、時間、容量、等級、XP、圖鑑、庫存、布置、底砂、音效及清潔冷卻均保留。舊魚保持普通外觀，個性固定，不強制新手引導。

新玩家 Lv.1–5 XP 為 0/45/130/300/1100，延後最後魚種解鎖。`legacyLevelFloor` 保留 V0.2 已獲得的等級；例如原 Lv.5/XP620 仍是 Lv.5，XP 不變，也不降級。

保留 15 秒 dirty Auto Save、900ms debounce、JSON 匯入前備份、多分頁防護與離線上限 4 小時／120 金幣。魚每幀位置、速度、目標、POI、泡泡、食物與效果不存；裝飾位置、長期遊玩計數與待收金幣會存。90 分鐘相伴與良好水質成就只計算前台遊玩時間。

## 新手引導與試玩

真正新存檔只播三步：有效投食 → 查看魚卡 → 打開商店。可跳過，設定可重看。舊進度不強制播放。

`?playtest=1` 使用正式數值，不加速；僅在本機保存匿名操作次數、首次操作時間、前台遊玩秒數、session duration、引導完成、JS error 數、粗略 FPS/long frames。設定可匯出 JSON；不含魚名、姓名、帳號、IP，不發送網路資料。`?test=1` 才使用集中設定的快速模式與獨立 key。`?debug=1` 提供只讀快照，不是可寫入的作弊 API。

## 實際測試

```sh
node tests/aquarium/schema-v03.test.cjs
AQUARIUM_CHROMIUM=/path/to/chromium node tests/aquarium/browser-v03.test.cjs
AQUARIUM_CHROMIUM=/path/to/chromium node tests/aquarium/browser-v03-guards.test.cjs
AQUARIUM_CHROMIUM=/path/to/chromium node tests/aquarium/browser-v03-life.test.cjs
AQUARIUM_CHROMIUM=/path/to/chromium node tests/aquarium/browser-v03-longplay.test.cjs
AQUARIUM_CHROMIUM=/path/to/chromium node tests/aquarium/browser-v03-responsive.test.cjs
AQUARIUM_CHROMIUM=/path/to/chromium node tests/aquarium/browser-v03-standalone.test.cjs
# 發布後，檢查真正的網站 origin（可用 AQUARIUM_BASE_URL 指定）：
AQUARIUM_CHROMIUM=/path/to/chromium node tests/aquarium/browser-v03-online.test.cjs
```

瀏覽器測試使用 Playwright，各腳本自帶 HTTP server。可用 `AQUARIUM_ARTIFACTS` 指定截圖與結果位置。schema fixtures 是由 V0.2 程式實際匯出的自動／手動存檔。高等級功能／壓力測試用 fixture；正式經濟測試只用新開局與使用者操作。

正式 60 分鐘、100ms RAF 可重現 simulation clock：不改 CONFIG、金幣、growth、XP。第一隻新魚 **5:32**，第一次升級 **27:06**。60 分鐘 10 隻魚／9 種、Lv.4／XP896、6 件布置、3/7 特殊配色、Tier2、1161 金幣；同一局延長到 **64:30** 實際買到第二次升級。鬥魚、最後魚缸升級、部分配色與長久陪伴成就仍未完成。

15 魚＋15 布置＋飼料＋金幣＋環境互動的實際 RAF 測試約 60 FPS。1024×768、820×1180、390×844 均測商店、圖鑑、魚卡、拖動、snap、箭頭、收起、重疊保護、刷新與頁面捲動；無橫向溢出。

**實體 iPad Safari、Android 平板與四年級學生班級試玩：尚未進行。** viewport／emulated touch/pen 不等於實機。FPS 僅代表這個 Chromium 測試環境。
