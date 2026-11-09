# 語文故事屋與數學遊樂城

入口：`chinese.html`、`math.html`。僅這兩頁載入此目錄的樣式和程式；自然科學的檔案、資料、圖片與存檔皆不修改。

## 新增或上架遊戲

在 `games-data.js` 的 `catalogs.chinese` 或 `catalogs.math` 陣列增加一筆物件，不必修改首頁或 renderer。

| 欄位 | 用途 |
| --- | --- |
| `id` | 唯一且固定的識別碼 |
| `title` | 遊戲名稱 |
| `grades` | 年級字串陣列，例如 `["4", "5"]` |
| `topic` | 學習主題 |
| `description` | 遊戲介紹 |
| `icon` | 封面圖示或文字；無圖片時使用 |
| `artwork` | 卡片美術類別，可沿用既有值 |
| `cover` | 封面圖片路徑，空字串代表使用圖示 |
| `url` | 遊戲網址或相對路徑，未上架保持空字串 |
| `status` | `coming-soon` 預告、`published` 上架、`hidden` 隱藏 |
| `publishedAt` | 實際上架日期，建議含時區的 ISO 8601 字串 |
| `order` | 同日期或預告項目的順序，小數字優先 |
| `featured` | 是否列入精選，每個年級最多顯示排序前兩款 |

已上架項目優先，並依 `publishedAt` 新到舊排列；其他項目按 `order` 排列。只有 `published` 且具有 HTTP(S) 或有效相對連結的遊戲會顯示遊玩入口。上架前必須先新增遊戲本體並確認目標網址可載入；前端不會探測遠端網址是否存在。狀態為 `hidden` 的項目不顯示。

精選與全部列表同步篩選年級。未完成遊戲僅有「即將推出」狀態文字，沒有假連結或可點擊的卡片。

## 樣式與照片

`home.css` 所有規則都限定於 `.learning-world`；各科主題使用 `data-subject` 區分。新增主題時不修改自然首頁 CSS。圖案採用本目錄自有 SVG，不需要外部圖示服務。

頭像直接使用 `picture/mimi-solo.JPG`、`picture/cream-solo.JPG`，各自的入口沿用 `about.html`；頁尾合照使用 `picture/welcome-cats.JPG`。沒有新增儲存或登入程式。

## 驗證

執行 `node tests/learning-worlds.test.cjs`。另外以瀏覽器檢查兩頁在手機、平板與電腦寬度的圖片、年級篩選、空狀態、科目導覽及鍵盤焦點。
