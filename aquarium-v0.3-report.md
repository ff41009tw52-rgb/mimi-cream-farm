# 悠悠水族箱 V0.3 完成報告

日期：2026-10-08。以已完成的 V0.2 為 Source of Truth 擴充，保留原 10 種魚、12 種布置、Canvas 與三個主要操作。

## 版本與交付

- [V0.3 線上遊玩](https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v0.3.html)
- [V0.3 可攜 HTML](https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v0.3-standalone.html)：129,560 bytes；同一份模組來源生成，可下載後離線開啟。
- 開發 branch：`feat/aquarium-game-v03`；功能 PR [#65](https://github.com/ff41009tw52-rgb/mimi-cream-farm/pull/65)，復原保護修補 [#66](https://github.com/ff41009tw52-rgb/mimi-cream-farm/pull/66)、[#67](https://github.com/ff41009tw52-rgb/mimi-cream-farm/pull/67)，均已合併。
- 最終功能 commit：`be1d928117a80ed9d194d273a19e3a4c70ea1f91`；最終功能合併：`a76df83bd1230f4bc95fe76406a4b3256704cdc3`。
- [最終 CI](https://github.com/ff41009tw52-rgb/mimi-cream-farm/actions/runs/37713711206) 通過。PR #67 自動審查給予通過反應，沒有未解決的建議。
- 原 V0.1、V0.2 來源與入口均保留，舊存檔 key 不寫、不刪。

發布後真正網站 origin 的 7 組流程全部通過：新開局及引導、V0.2 自動／手動 migration、改名／布置／刷新／standalone、有效手動備份復原、原 V0.1 程式的連鎖 migration、三種尺寸觸控操作。JavaScript 錯誤0、載入失敗0。模組入口、standalone、5個 assets 與 V0.1／V0.2 入口共9個檔案均 HTTP200，逐位元組與本機來源一致。

## 已完成

| 項目 | 實際完成內容 |
|---|---|
| 魚的生活空間 | 依裝飾 tags 與魚種偏好建立 POI cache／shortlist，短暫探訪水草、岩石、沉木或遮蔽處 |
| 行為狀態 | explore、rest、feed、inspectDecoration、hide、school；食物優先，互動後回到巡遊 |
| 固定個性 | 好動、悠閒、貪吃、好奇、怕生；保存於每隻魚，modifier 約5–20% |
| Canvas 分層 | 背景／後景布置 → 魚與食物 → 洞穴／沉船前景 → 金幣／效果 |
| 半自由布置 | 左右拖動、16個隱藏 snap slot、底砂貼齊、箭頭微調、收起與重疊復原 |
| 同缸升級 | 4階段，魚容量10→12→15→18，布置容量12→15→18→20 |
| 配色收藏 | 7個特殊配色，以養成或永久成就解鎖；商店選色、圖鑑詳頁收藏 |
| 永久成就 | 10項，一次性領獎；同存檔匯入早期快照不能重領 |
| 新手引導 | 新進度三步：投食→魚卡→商店；可跳過、設定重看，舊進度不強制播放 |
| 本機試玩 | `?playtest=1` 正式數值，匿名操作／時間紀錄與JSON匯出，不傳網路 |
| 存檔升級 | schema1→2→3，真實V0.2自動／手動檔與原V0.1程式進度均通過 |
| 原功能 | 餵食、兩種飼料、清潔動畫／冷卻、音效、圖鑑、改名、送養、手動讀寫、JSON備份、離線、多分頁保護 |
| 驗證 | 正式60分鐘養成、15魚＋15布置效能、三種尺寸與mouse／emulated touch／pen |
| 交付 | 模組版、standalone、資料、測試、CI、20張實際截圖及本報告 |

## 未完成

**實體 iPad Safari、Android 平板及四年級學生班級試玩：尚未進行。**

viewport 與 emulated touch／pen 來自 Chromium，不能當作實機或學生測試結果。尚未取得學生的實際等待時間、課堂音量、實機耗電與溫度資料。

功能和線上驗證完成後，工作環境連線中斷，額外證據ZIP尚未產生。20張截圖已保存；完整報告改以本Repository檔案交付。這不影響已發布遊戲。

## 魚行為：POI、state、personality 如何合作

Species 先決定速度、加速度、轉向、水層、群聚、停頓、短衝與食物偏好；固定個性只做小幅 modifier。POI 暫時提供目的地與狀態，保留原 simulation／避讓。餓時食物會中斷環境探訪；吃飽的魚不積極追食，鼠魚優先搜尋近底食物。

裝飾 tags 為 `plant/tallPlant/wood/rock/bottom/shelter/curiosity`。孔雀魚偏水草、鼠魚偏沉木／岩石／底部遮蔽、神仙魚偏高水草、鬥魚偏安靜水草角落；群游魚較常留在開闊泳區。這是遊戲行為設計。

POI cache 只在布置或尺寸改變時重建。初次等待12–32秒，後續通常35–65秒重新選擇，行為最長12秒，抵達後停2.5–4.5秒。180秒／12魚測試中，環境互動占11.86%，觀察到15次抵達及躲藏；大部分時間仍自由游動。鼠魚維持底層，神仙魚仍比斑馬魚慢。

| 個性 | 差異 |
|---|---|
| 好動 | 速度×1.08、短衝機率×1.20、稍少停頓 |
| 悠閒 | 速度×0.90、停頓機率×1.15、停頓時間×1.18 |
| 貪吃 | 餓時食物吸引／追食modifier×1.18 |
| 好奇 | 環境探訪modifier×1.18、速度×1.03 |
| 怕生 | 速度×0.96、遮蔽偏好×1.18、略多停頓 |

神仙魚不分配好動個性。個性／配色不增加收入或成長。舊魚個性由穩定ID推導一次並保存。實際180秒移動樣本：好動孔雀0.0644、悠閒孔雀0.0522、斑馬0.0927、金魚0.0170、神仙0.0178 normalized寬度／秒，包含停頓及轉向，並非只抄設定速度。

## 魚種與正式數值

維持10種魚。35%成長為亞成魚、100%成魚；下表成魚時間以持續良好照顧計算。

| 魚種 | 價格 | Lv. | 成魚時間 | 水層／行為 | 產幣間隔 | 幼／亞成／成魚收益 |
|---|---:|---:|---:|---|---:|---|
| 孔雀魚 | 65 | 1 | 10分 | 中上；靈活轉向、短衝、弱群聚、探水草 | 45秒 | 2／4／6 |
| 金魚 | 110 | 1 | 20分 | 中至中下；平順加速、寬轉彎、停著擺尾、餓時加速 | 60秒 | 3／6／10 |
| 鼠魚 | 85 | 1 | 15分 | 底；短走再停、沉底飼料、沉木與岩石搜尋 | 55秒 | 2／5／7 |
| 斑馬魚 | 100 | 2 | 11分 | 中上；很快、群聚、開闊泳區 | 38秒 | 2／4／6 |
| 黑摩利 | 145 | 2 | 12分 | 中；穩定巡遊、成長較快 | 62秒 | 3／6／9 |
| 紅劍魚 | 190 | 3 | 16分 | 中；偶爾短衝、探索 | 57秒 | 3／6／11 |
| 白雲山魚 | 175 | 3 | 14分 | 中上；較強群聚、保留同伴距離 | 43秒 | 2／5／8 |
| 紅蓮燈 | 260 | 4 | 18分 | 中；小型、明顯群聚 | 47秒 | 3／6／10 |
| 神仙魚 | 390 | 4 | 30分 | 中；慢速、寬轉彎、偏高水草 | 82秒 | 4／10／18 |
| 鬥魚 | 480 | 5 | 24分 | 中上；獨立、多停頓、偏安靜角落 | 75秒 | 4／9／15 |

正常開局20金幣、孔雀／金魚／鼠魚三隻幼魚、水質100、容量10，河砂＋兩小水草＋小石頭。飽食及水質≥45才產幣，兩者>25才成長。餵食免費；清潔2.1秒、45秒冷卻、恢復38水質，水質>90不整理。

等級XP為0／45／130／300／1100；V0.2已獲等級由 `legacyLevelFloor` 保留，原Lv.5／XP620不降級、不改原XP。

## Economy：正式60分鐘

使用 shipped CONFIG、100ms RAF、36,000正常simulation steps，只加速測試時鐘，沒有金幣、XP、成長或CONFIG作弊，未開 `?test=1`。操作策略：30秒收錢；個魚飽食<55或平均<72時適量餵食、至少相隔120秒；水質<68清潔，間隔領取已達成成就。先買魚與小布置，再存錢升缸及買進階魚。

| 里程碑 | 結果 |
|---|---|
| 第一隻自己賺錢購買的魚 | 5:32，孔雀魚65 |
| 首批魚養成 | 孔雀約10分成魚；約20分原三隻均成魚 |
| 約20分 | 6魚／5種、Lv.3／XP266 |
| 第一次升缸 | 27:06，400金幣，Tier2 |
| 神仙魚 | 34:39購入，390金幣 |
| 60分 | 10魚／9種、Lv.4／XP896、Tier2／容量12、1161金幣、水質81.6 |
| 收藏 | 6件布置、白砂、3/7特殊配色解鎖、8/10成就完成並領取 |
| 第二次升缸 | 延長同一局至64:30，1550金幣，Tier3 |

收支：20初始＋2991實收＋85一次性成就−1325魚−210布置−400升缸＝1161。60分仍有鬥魚、全部魚種成就、90分鐘陪伴、4個配色與後續魚缸階段可追求。這是一條可重現操作路徑，玩家選擇會改變等待時間。

`?test=1` 集中設定：成長時間×0.04、產幣間隔×0.12、XP×4，獨立測試key。`?playtest=1`採正式數值。

## 魚缸升級

| Tier | 名稱 | 魚容量 | 布置容量 | 升級價 | 條件 |
|---:|---|---:|---:|---:|---|
| 1 | 小小水族箱 | 10 | 12 | 初始 | Lv.1 |
| 2 | 成長水族箱 | 12 | 15 | 400 | Lv.3 |
| 3 | 悠悠水族箱 | 15 | 18 | 1550 | Lv.4 |
| 4 | 豐富水族箱 | 18 | 20 | 4800 | Lv.5 |

同一缸容量與少量底砂細節改變，Canvas比例不變，不刪魚、不降低舊自訂容量。

## 布置

12項：河砂0、白砂65、黑砂95；小水草35、高水草60、莫絲50；小石頭40、大石頭70、沉木100、洞穴125、沉船165、寶箱150。底砂一次一種，其他可收藏多件。

編輯時魚放慢繼續游。X左右移動，Y依底砂固定，16個隱藏snap slot；箭頭微調與收起。非法重疊回復原位並提示。保存normalized X、snapIndex、lane；舊left／center／right與slot的原位置精確保留，第一次移動才吸附。只有裝飾拖動區攔截touch，空白水面／一般頁面仍可捲動；新放置物立即重畫。

## 特殊配色

| 魚種 | 配色 | 解鎖 |
|---|---|---|
| 孔雀魚 | 晴空藍 | 養成1隻孔雀成魚 |
| 孔雀魚 | 晚霞粉 | 同魚前台相伴90分鐘並領取「長久陪伴」 |
| 金魚 | 奶油白 | 養成1隻金魚成魚 |
| 黑摩利 | 珍珠銀 | 收藏三種水草並領取「水草小天地」 |
| 神仙魚 | 晨光金 | 累計養成3隻神仙成魚 |
| 鬥魚 | 蘭花紫 | 養成1隻鬥魚成魚 |
| 鬥魚 | 朝霞紅 | 發現10種並領取「魚類觀察家」 |

商店可選已解鎖配色，未解鎖顯示條件。圖鑑仍10張魚種卡，詳頁看配色。配色不加價、不增加能力，舊魚保持普通外觀。

## 永久成就

| 成就 | 條件 | 一次性獎勵 |
|---|---|---|
| 第一位新住客 | 首次自行買魚 | 10金幣 |
| 長大了！ | 首次成魚 | 10金幣 |
| 小小收藏家 | 發現5種 | 15金幣 |
| 魚類觀察家 | 發現10種 | 鬥魚朝霞紅 |
| 熱鬧水族箱 | 同時8魚 | 15金幣 |
| 我的風格 | 放5件布置 | 10金幣 |
| 水草小天地 | 收藏三種水草 | 黑摩利珍珠銀 |
| 清澈日常 | 前台累計30分鐘水質≥70 | 10金幣 |
| 長久陪伴 | 同魚前台相伴90分鐘 | 孔雀魚晚霞粉 |
| 一起長大 | 首次Tier2 | 15金幣 |

保存completed／rewardClaimed。同saveId的本機領獎紀錄防止匯入早期快照重領；保存失敗回復獎勵與狀態。前台30／90分鐘不靠離線累計。總金幣獎勵最多85。

## 存檔

| 項目 | 正式 | 快速測試 |
|---|---|---|
| schema／gameVersion | 3／0.3 | 3／0.3 |
| SAVE_KEY | aquarium_game_save_v3 | aquarium_game_save_v3_test |
| MANUAL_KEY | aquarium_game_save_v3_manual | aquarium_game_save_v3_test_manual |

讀取V0.3→V0.2→V0.1，先驗證舊schema、migration，再驗證新版才寫新key。舊v1／v2及各manual不寫不刪，合法手動檔同步升級，既有V0.3手動檔不覆蓋。未知或損壞資料停止覆寫。

保留魚ID、名字、createdAt、成長、飽食、產幣進度、金幣、水質、容量、Lv／XP、圖鑑、庫存、布置、底砂、音效及清潔冷卻。新增固定個性、配色、成魚紀錄、前台秒數、Tier、成就及引導。真實V0.2檔由舊程式實際20分鐘遊玩、改名、手動快照產生。

沿用15秒dirty Auto Save、900ms debounce、手動快照、JSON匯出／匯入前備份、validation、多分頁防護及4小時／120金幣離線上限。魚每幀位置、速度、方向、target、POI、泡泡、食物不保存；玩家設定的裝飾位置保存。

手動復原：無效備份不解鎖；玩家確認有效備份並成功寫回後才解除保存鎖。寫回遇QuotaExceededError仍保留原檔／鎖，提示重試，不顯示成功；恢復空間後可重試。後續改名、刷新、非法schema、壞ledger、離線重複結算、多分頁衝突皆已測。

standalone在真正file://通過V0.2自動／手動migration、刷新、原key保留、零外部請求；正式網站origin亦通過原V0.1與V0.2升級。

## 新手引導與匿名試玩

新進度三步：有效投食、看魚卡、開商店，可跳過並保存，設定可重看；舊玩家不強制播放。

playtest只在本機記錄前台與session時間、首次操作時間、操作次數、引導完成、JS error數、粗略FPS／long frames。設定可下載JSON；不含魚名、學生姓名、帳號、IP，也不傳網路。普通模式不顯示工程資訊。

## Performance

桌面無頭Chromium153.0.8010.0、1440×960、deviceScaleFactor1；真實RAF360幀約6秒，沒有虛擬時鐘。15魚＋15布置＋4飼料＋2金幣＋3魚正在環境互動同時存在。

| 量測 | 結果 |
|---|---:|
| FPS | 60.00 |
| p95 frame interval | 16.7ms |
| 最大frame interval | 16.8ms |
| 長幀 | 0 |
| simulation＋draw平均 | 0.71ms |
| simulation＋draw最大 | 5.90ms |

另測180秒行為simulation與60分鐘正式養成。FPS僅代表此Chromium環境，不能當作實體平板長時間測試。

## Responsive

| Viewport | 實測 | 結果 |
|---|---|---|
| 1024×768 | 8魚、商店／圖鑑／魚卡、touch拖動／snap／箭頭／收起／重疊復原／刷新 | 通過，無橫向溢出，主要按鈕≥44px |
| 820×1180 | 同上，拖動不滾整頁、空白處可一般捲動，保留大直式魚缸 | 通過，未硬砍高度 |
| 390×844 | 同上，dialog在可視區內可捲動及關閉 | 通過，無橫向溢出 |

mouse另測，CDP產生可信的emulated touch與pen Pointer事件。裝飾handle使用pointer capture，普通頁面捲動保留；魚卡關閉鍵44px。實機／學生：**尚未進行**。

## 驗證總表

| 測試 | 通過 |
|---|---|
| V0.2先行回歸 | 20主流程＋7追加保護＋獨立版＋JSON／音效gate |
| Schema | 1→2→3、全欄位保留、固定個性／位置、容量、非法資料拒絕 |
| V0.3玩家流程 | 16組 |
| 保存／錯誤保護 | 9組 |
| 魚生活／食物／壓力 | 4組 |
| 尺寸／Pointer | 4組 |
| 正式經濟 | 60分，延長同局64:30第二次升缸 |
| file://可攜 | 真實V0.2自動／手動、刷新、原key、零外部請求 |
| 發布後網站 | 7組，JS錯誤0、失敗請求0 |
| 原Repository | npm test通過 |
| CI | migration、syntax與生成檔一致性通過 |

高階功能／壓力截圖使用合法fixture，約8,000–9,000金幣不是正常開局。正式60分鐘照片與經濟結果從20金幣開局取得。

## 實際截圖

20張已交付。以下sandbox連結供ChatGPT內開啟；全為實際程式畫面。

| 編號 | 畫面 | 檔案 |
|---:|---|---|
| 1 | 正常主畫面 | [01-main.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/01-main.png) |
| 2 | 水草互動 | [02-plant-interaction.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/02-plant-interaction.png) |
| 3 | 鼠魚搜尋布置 | [03-cory-interaction.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/03-cory-interaction.png) |
| 4 | 個性魚卡 | [04-personality-card.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/04-personality-card.png) |
| 5 | 編輯魚缸 | [05-edit-mode.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/05-edit-mode.png) |
| 6 | 拖動布置 | [06-decor-drag.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/06-decor-drag.png) |
| 7 | 升級介面 | [07-tank-upgrade.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/07-tank-upgrade.png) |
| 8 | 升級後 | [08-upgraded-tank.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/08-upgraded-tank.png) |
| 9 | 特殊配色資訊 | [09-special-color.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/09-special-color.png) |
| 10 | 配色圖鑑 | [10-color-collection.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/10-color-collection.png) |
| 11 | 成就 | [11-achievements.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/11-achievements.png) |
| 12 | 新手引導 | [12-onboarding.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/12-onboarding.png) |
| 13 | 橫式平板 | [13-tablet-1024.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/13-tablet-1024.png) |
| 14 | 直式平板 | [14-portrait-820.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/14-portrait-820.png) |
| 15 | 手機 | [15-phone-390.png](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/15-phone-390.png) |

額外：[正式60分鐘](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/normal-60-minutes.png)、[15魚＋15布置](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/15-fish-15-decor.png)、[魚兒商店](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/shop-fish.png)、[布置商店](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/shop-decor.png)、[圖鑑](sandbox:/workspace/scratch/666ccaf29757/artifacts-v03/encyclopedia.png)。

## 新增／修改檔案

遊戲／測試21個新增檔，加本報告共22個；原V0.1／V0.2修改0個。兩次修補修改的檔案都屬於新V0.3來源。

| 檔案 | 用途 |
|---|---|
| aquarium-v0.3.html | 模組入口 |
| aquarium-v0.3-standalone.html | 生成可攜HTML |
| assets/aquarium-v03/aquarium-data.js | 集中設定、Species／tags、個性、Tier、配色、成就 |
| assets/aquarium-v03/aquarium-save.js | 驗證與migration |
| assets/aquarium-v03/aquarium-world.js | POI與state |
| assets/aquarium-v03/aquarium.js | simulation／Canvas／UI／保存 |
| assets/aquarium-v03/aquarium.css | 風格與響應式 |
| assets/aquarium-v03/README.md | 設計與重現指令 |
| scripts/build-aquarium-v03.py | standalone生成 |
| .github/workflows/test-aquarium-v03.yml | CI |
| tests/aquarium/schema-v03.test.cjs | Schema測試 |
| tests/aquarium/v03-harness.cjs | 瀏覽器／server／clock／fixture |
| tests/aquarium/browser-v03.test.cjs | 玩家流程 |
| tests/aquarium/browser-v03-guards.test.cjs | 保存保護 |
| tests/aquarium/browser-v03-life.test.cjs | 行為／效能 |
| tests/aquarium/browser-v03-longplay.test.cjs | 正式經濟 |
| tests/aquarium/browser-v03-responsive.test.cjs | 尺寸／Pointer |
| tests/aquarium/browser-v03-standalone.test.cjs | file:// |
| tests/aquarium/browser-v03-online.test.cjs | 網站origin |
| tests/aquarium/fixtures/v02-real-save.json | 真實V0.2自動檔 |
| tests/aquarium/fixtures/v02-real-manual.json | 真實V0.2手動檔 |
| aquarium-v0.3-report.md | 完成報告 |

重現指令見 [README](assets/aquarium-v03/README.md)。JSON證據曾保存於本次工作目錄，工作環境離線後未完成額外壓縮交付；本報告據實列出已確認結果與範圍。
