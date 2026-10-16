# V0.4.1 魚類科學性局部校正

## 開發方向（取代先前全面重繪要求）

取消十種魚全面重繪。以正式入口引用的 `assets/aquarium-v041-r2/aquarium-fish-art.js` 為唯一遊戲魚圖來源；只有明顯構造問題才局部校正。沿用魚身輪廓、配色、鱗片、尾鰭與現有運動方式。完整課本複習維持獨立的硬骨魚示意圖。

## 十種魚盤點

| 魚種 | 結果與處理 |
|---|---|
| 孔雀魚 | 大尾觀賞雄魚外觀卻配扇形臀鰭；僅將臀鰭改為細長雄魚構造，保留其他輪廓和特殊配色。 |
| 金魚 | 本輪未發現需要改造的明顯構造錯誤；完整保留。 |
| 鼠魚 | 缺少常見鼠魚的脂鰭；只補在背鰭與尾鰭間的小脂鰭及前緣鰭棘。不改觸鬚、骨板、魚身或尾巴。 |
| 斑馬魚 | 保留水平條紋、小型魚鰭和原圖。 |
| 黑摩利 | 保留扇形臀鰭與配色；腹鰭原先沿用小魚位置，被較深的魚腹遮住，僅將其輪廓接到腹緣下方。說明扇形／細長臀鰭的雌雄差異。 |
| 紅劍魚 | 劍尾已正確連在尾鰭下緣，完整保留；只把不一致的扇形臀鰭改為細長雄魚構造。 |
| 白雲山魚 | 本輪保留原圖，沒有脂鰭。 |
| 紅蓮燈 | 原有小脂鰭的位置已合理，但與背鰭綁在同一路徑；保留其輪廓，拆為獨立、被動隨魚身運動的脂鰭，不再套背鰭鰭條及擺動。 |
| 神仙魚 | 保留原圖；觀察文字說明絲狀構造是腹鰭，並非觸鬚。 |
| 鬥魚 | 保留原長鰭觀賞造型，分別標示腹鰭與大片臀鰭。 |

沒有把「未發現明顯錯誤」宣稱為精密生物標本驗證。鼠魚與黑摩利是遊戲常用類群名稱，現有圖片是概括觀賞造型，未宣稱可作物種或性別鑑定。

## 玩家魚圖的構造標示

「看看我的魚」加入預設收起的「看看這隻魚的魚鰭」。點選名稱時，高亮直接畫在同一條魚、同一個 Path2D 與同一組動畫變換上。選取胸鰭或腹鰭不會放大主魚缸的鰭，也不使用替代示意魚。

- 十種魚各有簡短造型說明；只有鼠魚與紅蓮燈提供脂鰭選項。
- 畫面上顯示目前觀察的鰭名，下面提供一句作用或位置說明。
- 放大、左右翻轉及魚鰭擺動沿用既有渲染；標示跟著實際構造走。
- 觀察呼吸時收起魚鰭清單；課本複習仍保持獨立。
- 孔雀魚與紅劍魚採雄魚參考造型；幼魚以縮小造型表示，文字提醒不能據此判定實際幼魚性別。
- 沒有新增性別欄位、繁殖規則或存檔欄位；不隨機改變玩家原魚。

## 科學依據

1. Stewart et al. (2019), *Adipose fin development and its relation to the evolutionary origins of median fins*：研究常見鼠魚的脂鰭、前緣棘及被動構造。https://pmc.ncbi.nlm.nih.gov/articles/PMC6346007/
2. Bittencourt et al. (2020), *Phylogenetic relationships of the neon tetras Paracheirodon spp.*：紅蓮燈屬的外形、體側色帶與脂鰭位置。https://www.ni.bio.br/1982-0224-2019-0109/
3. University of Florida / IFAS, *Freshwater Ornamental Fish Commonly Cultured in Florida*：孔雀魚、摩利、劍尾魚等雄魚的臀鰭特化，以及常見觀賞魚外觀照片。https://ask.ifas.ufl.edu/publication/fa054
4. Florida Museum, *Green Swordtail*：雌雄對照，雄魚尾鰭下葉的劍狀延伸。https://www.floridamuseum.ufl.edu/discover-fish/florida-fishes-gallery/green-swordtail/

## 存檔、動畫與效能範圍

`aquarium-data.js`、`aquarium-save.js`、`aquarium-world.js` 完全未改。Schema 仍是 3，原 `aquarium_game_save_v4`／手動存檔鍵與獎勵紀錄保留。游速、行為、成長、收益和存檔流程都未改。新增鰭使用快取 Path2D；只在選取時疊加高亮，沒有新計時器、圖片下載或主魚缸標籤。

## 驗證

- 本機 JavaScript 語法、schema 保留測試、單檔重建及 diff 檢查通過。
- 新增 CI 瀏覽器測試：十種魚每一種鰭在左右方向、兩個擺動姿態確實高亮；脂鰭只出現在對應魚種；選魚重設標示、呼吸／教材頁收納、原存檔與魚隻不變；1024×768、820×1180、390×844 的 44px 觸控與無橫向溢出。
- 沿用現有十種魚／七種特殊配色、成長與追食、觀察、存檔防護、18 隻魚及平板回歸測試。
- 本次本機環境不啟用預覽伺服器，瀏覽器測試由 GitHub Actions 執行；結果以 PR 的實際 CI 紀錄為準。未宣稱實體 iPad 測試。

## 修改檔案

- `assets/aquarium-v041-r2/aquarium-fish-art.js`
- `assets/aquarium-v041-r2/aquarium-observation.js`
- `assets/aquarium-v041-r2/aquarium-observation.css`
- `assets/aquarium-v041-r2/aquarium.js`（只傳遞高亮部位並顯示鰭名）
- `aquarium-v0.4.1-standalone.html`（重新產生）
- `tests/aquarium/browser-v041-fin-anatomy.test.cjs`
- `.github/workflows/test-aquarium-v041.yml`
- 本報告

正式入口維持 https://ff41009tw52-rgb.github.io/mimi-cream-farm/aquarium-v0.4.html 。舊版獨立入口與原素材保留。
