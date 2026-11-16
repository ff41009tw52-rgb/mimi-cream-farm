# 班級彩繪水族館 V3.2 動畫與驗收

- [魚類游動比較](https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v3/animation-lab.html)
- [V3.4.1 展示端](https://ff41009tw52-rgb.github.io/mimi-cream-farm/class-aquarium-v3-display.html?v=3.4.1)
- [V3.1.2 展示端](https://ff41009tw52-rgb.github.io/mimi-cream-farm/class-aquarium-v3-1-2-display.html)
- [現有掃描端](https://ff41009tw52-rgb.github.io/mimi-cream-farm/class-aquarium-v3-scan.html?v=3.1.2)

展示端上方的「拍照掃描」會另開掃描頁。同一台裝置、同一瀏覽器設定檔開掃描與展示端，即可使用同一份水族館收藏。原版展示可直接開啟，同樣讀取這份作品。

展示頁初始保持靜音。點「播放背景音樂」會循環播放原創的 48 秒無人聲配樂，可用同一個按鈕暫停。音檔在網站內提供。

V3.3 可直接點魚打招呼、點空白水域餵食，或拖曳氣泡引導附近的魚。小魚遇到鄰近鯊魚時會先分散，之後往魚群會合。鍵盤聚焦水族館後，可用 Enter 或空白鍵在中央投餵。減少動態效果模式顯示靜態作品。互動為展示頁內的暫時狀態。

V3.4 加入水母、魟魚和章魚。新角色採正視姿態，水母有傘面收縮與觸手飄動，魟魚以兩側胸鰭拍動，章魚在下層擺動腕部。點擊時會加強各自的動作。

V3.4.1 加入海龜。[海洋生物 A4 著色紙](templates/aquarium-ocean-a4.pdf?v=3.4.1)的第 4 頁使用俯視海龜線稿。海龜隨行進方向轉身，中央龜殼保持平穩，兩側前鰭划動。舊著色紙角碼維持可識別。

## 比較和選型

| 比較欄 | 變形方式 | 觀察 |
| --- | --- | --- |
| A 原版 | 剛性 PNG、正弦往返、在端點縮窄翻向 | 筆觸整體平移，尾巴和身體相對位置固定 |
| B 單關節 | 身體維持形狀，尾段繞關節擺動，關節兩側共用接合座標 | 尾部已有動作，身體拐點較集中 |
| C 連續網格 | 固定 UV，將魚身由前到後分段，依水平波相位做透視投影 | 頭部保持穩定，身體後段與尾鰭呈現前後方向的透視變化 |

實驗頁同步使用同一張圖，A 欄採用 V3.1.2 的折返和縮窄模型並配合比較畫幅，B/C 共用示範路徑以便觀察魚身差異。包含四種模板、既有掃描作品與本機 PNG 讀取、六項參數、暫停和慢動作。

測試 PixiJS 8.23.0 的 MeshPlane、MeshRope 和自訂 MeshGeometry，以四種實際模板的比例在 24 個相位檢查三角形方向。MeshPlane 與自訂網格各為 0 次反折，MeshRope 在小丑魚累計 28 次反折。MeshRope 的截面沿路徑法線轉動，寬魚身在急彎處較易交疊。正式版採用自訂網格，前後段各用同一套頂點和 UV 邏輯，近景、遠景、備援使用不同密度。這樣也可與 B 欄的單關節共用紋理、頂點及接縫處理。

## 正式展示

| 魚種 | 游動特徵 | 基礎擺尾 |
| --- | --- | --- |
| 小丑魚 | 偶爾短暫加速、變換水層，尾擺較活潑 | 1.82 Hz |
| 蝴蝶魚 | 減速與轉向較柔和，變形從身體後半開始 | 1.36 Hz |
| 河豚 | 低速、微浮沉，圓身的前六成位形穩定 | 1.62 Hz，小幅 |
| 鯊魚 | 較長巡游與轉彎弧線，尾部週期較慢 | 1.08 Hz |

V3.2.1 將擺尾改為水平面上的脊線擺動。在略偏斜的視角下，從魚頭逐段投影到尾鰭，累積每一段的投影長度與深度，視角微微俯視帶來少量垂直位移。魚頭前四分之一保持原來的相對座標，身體色帶與尾鰭會隨朝向交替拉長與縮短。Canvas 與 WebGL 共用相同的變形計算。

V3.2.2 將魚的前半身固定在原相對座標，水平波動從魚身中線漸進至尾鰭。擺動角度降低，四種魚的尾端水平行程比 V3.2.1 少約 45%～56%。

V3.2.3 調整四種魚在水族館的顯示比例。以相同景深、個體縮放倍率計，小丑魚、蝴蝶魚及河豚的魚身長度放大約 21%～22%，鯊魚放大約 37%。鯊魚的基準長度約為小丑魚的 1.35 倍。減少動態效果模式以同一倍率縮放整群魚，使密集排列時仍保有個別比例。

每隻魚都保有當前位置、朝向、速度、目標、深度和游動狀態。目標會依可游距離、鄰魚和邊界更新。魚用有上限的角速度沿弧線轉向，頭部接近直上或直下時沿身體軸心短暫混合兩個背向，一般轉身維持圖片比例。共用紋理直接來自掃描 PNG，UV 固定。實際速度會調制擺尾頻率，轉彎角速度會加上腰尾的柔和彎曲。新魚先在左右畫面之外產生，再游進畫面。

近景魚較大、巡游略快。鄰近避讓看預測位置和深度，過近時加入有上限的側向漂移。40 隻跑 90 秒的固定種子測試中，每隻都重新選目標並轉向。最長的一次明顯重疊為 2.08 秒，此處以魚身中心橢圓與深度差做近似量測。

海洋保留 `assets/ocean.webp`，畫面依比例填滿。慢速光層、遠景岩影、中近景海草、不同大小氣泡和漂浮屑使用不同運動速度。珊瑚、前景岩石和沙地沿用既有插畫，新增動態集中在邊緣與水層中。

## 渲染與還原

- 硬體 WebGL 可用時使用本地 PixiJS。近景 18 欄網格，遠景 10 欄。每條魚解碼一次，同時重用紋理、拓撲及位置緩衝。刪除魚時釋放 GPU 紋理及網格緩衝。
- 偵測到軟體 WebGL、持續低幀率或 WebGL context 遺失會切到 Canvas 2D，保持魚的位置和作品。Canvas 使用 12 或 7 段變形。重新開頁時會重新選擇可用後端。
- 低效能模式限制更新率約 30 FPS，像素比例上限 .78，改用剛性貼圖並讓海草及岩影靜止。減少動態效果會以靜態排列呈現魚群並暫停更新迴圈。
- 掃描、辨識、透視校正、透明 PNG、IndexedDB 與 BroadcastChannel 由現有模組負責。V3.2 使用與 V3.1.2 相同的收藏及偏好設定。原版本提交為 [898c70f](https://github.com/ff41009tw52-rgb/mimi-cream-farm/commit/898c70f27d67ef20d4d3e5f56ab5d3a7a387e8f6)，原版動畫檔為 `swim.js`。

## 來源與授權

| 資源 | 授權與採用方式 |
| --- | --- |
| [PixiJS 8.23.0](https://pixijs.com/versions) · [Mesh 文件](https://pixijs.com/8.x/guides/components/scene-objects/mesh) | MIT。固定版本，從 npm 套件擷取 WebGL、Mesh 及紋理模組，以 esbuild 產生本地 ESM。完整原著權聲明及隨包的 colord（MIT）、eventemitter3（MIT）、earcut（ISC）放在 [PIXI-LICENSES.txt](v32/vendor/PIXI-LICENSES.txt)。 |
| [Paper Aquarium 原始碼](https://github.com/MrMoT9I/paper-aquarium/tree/32b0eb96e185689716f6c6bbce2f711eedb34693) | 程式與作者自製背景列 MIT。其購買的 3D 魚模另有授權。本專案採概念參考，包括作品映射到魚身、各魚擺尾相位及展示水域的分布。 |
| [PolyFish 技術文章](https://polyfish.mattscott.dev/making-of/creatures.html) · [原始碼及 MIT 授權](https://github.com/unclemattmakes/polyfish/tree/1c0d7636f2c71fd81d001a597c13554f9cbdd417) | 查有 MIT 原始碼。採概念參考，包括沿體長傳遞波相位、速度連動、轉向平滑及推進與滑行節奏。2D 實作為本專案自行撰寫。 |
| [Kenney Fish Pack](https://kenney.nl/assets/fish-pack) | 官方標示 CC0。列入比較資源，測試使用本專案原始圖和掃描 PNG。 |
| [OpenGameArt Underwater Background](https://opengameart.org/content/underwater-background-2) | donte 的資源頁標示 CC0，附件為 PNG 與 Krita ZIP。評估後採用原專案的海底插畫和新增 Canvas 光影、粒子與植物。 |
| 現有魚圖與海洋底圖 | 魚圖使用老師提供的四種模板及掃描產生的 PNG。比較頁的著色示範只在模板線稿上疊色。海洋底圖為 V3 原有插畫，額外動態圖層為本次自行撰寫。 |

## 修改檔案

- `animation-lab.html`、`v32/lab.js`、`v32/lab.css`、`v32/sample-fish.js` 提供三欄比較、控制及樣本圖。
- `v32/fish-rig.js`、`v32/fish-renderers.js` 管理擺尾方式、網格、WebGL 與 Canvas 備援。
- `v32/school.js`、`v32/ocean.js` 管理目標、速度、轉向、避讓和渲染生命週期。
- `v32/ocean-scene.js`、`v32/display-v32.css` 提供海草、岩影、水下光與粒子。
- `display.js` 保留展示與管理介面，依入口選擇動畫引擎。網站根目錄的兩個展示 HTML 分別使用 V3.2 和 V3.1.2。
- `tools/build-pixi-v32.mjs` 重建第三方模組。安裝開發工具版本 `esbuild@0.28.2 pixi.js@8.23.0 colord@2.13.0 earcut@3.2.4 eventemitter3@5.0.4` 後執行，可用 `PIXI_BUILD_DIR` 指向依賴所在的資料夾。

## 如何重跑測試

1. 執行 `node aquarium-v3/tests/v32-motion.mjs` 測四種頭尾形變、尾頻、40 隻魚的轉向、目標更新及重疊。
2. 執行 `python3 -m http.server 8765` 啟動靜態頁面。安裝 Playwright 和 Chromium 後，執行 `node aquarium-v3/tests/v32-animation.mjs` 從掃描端產生四種 PNG 並測兩展示版本、WebGL context 遺失、管理與 FPS。
3. 執行 `node aquarium-v3/tests/integration.mjs` 回歸驗證模擬相機、正式掃描與匯入、副窗同步、入場、成功提示及重複掃描。可用 `AQUARIUM_URL` 與 `CHROMIUM_PATH` 指定測試服務和瀏覽器。

效能與現場待驗項目見 [TEST-RESULTS.md](TEST-RESULTS.md)。
