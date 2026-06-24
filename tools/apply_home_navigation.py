from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
HOME_BUTTON = ROOT / "home-button.js"

TITLE_REPLACEMENTS = {
    "氣溫的測量(涵)": "氣溫的測量",
    "改變施力臂與抗力臂(洪)": "改變施力臂與抗力臂",
    "獨角仙飼養大師(澔)": "獨角仙飼養大師",
    "鬥魚行為觀察實驗(駿)": "鬥魚行為觀察實驗",
    "手臂運動原理互動教學(凱)": "手臂運動原理互動教學",
    "操作動滑輪(昀)": "操作動滑輪",
    "槓桿與輪軸對對碰(昀)": "槓桿與輪軸對對碰",
    "槓桿與輪軸對對碰2(昀)": "槓桿與輪軸對對碰2",
    "電路接線挑戰賽(澔)": "電路接線挑戰賽",
}

HOME_BUTTON_SCRIPT = r'''(() => {
  const buttonId = 'farm-home-button';
  if (document.getElementById(buttonId)) return;

  const style = document.createElement('style');
  style.textContent = `
    #${buttonId} {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 16px;
      border: 3px solid #FFFFFF;
      border-radius: 999px;
      background: #FF8C42;
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.24);
      font-family: "Microsoft JhengHei", "微軟正黑體", sans-serif;
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
      text-decoration: none;
      transition: transform 0.18s ease, background-color 0.18s ease;
    }
    #${buttonId}:hover { background: #E8752E; transform: translateY(-2px); }
    #${buttonId}:focus-visible { outline: 4px solid #2D7A2D; outline-offset: 3px; }
    @media (max-width: 600px) {
      #${buttonId} { top: 8px; right: 8px; padding: 10px 13px; font-size: 14px; }
    }
  `;
  document.head.appendChild(style);

  const button = document.createElement('a');
  button.id = buttonId;
  button.href = 'index.html';
  button.setAttribute('aria-label', '回到農場首頁');
  button.innerHTML = '<span aria-hidden="true">🏡</span><span>回到農場首頁</span>';
  document.body.appendChild(button);
})();
'''


def get_activity_pages(index_html: str) -> list[str]:
    pattern = r'<a\s+href="([^"#?]+\.html)"[^>]*class="open-btn"'
    pages = re.findall(pattern, index_html)
    return list(dict.fromkeys(pages))


def update_index(index_html: str) -> str:
    for old, new in TITLE_REPLACEMENTS.items():
        index_html = index_html.replace(old, new)
    # 活動全部改為在原分頁開啟；不開新分頁就不會有 reverse-tabnabbing 風險。
    index_html = re.sub(r'\s+target="_blank"', '', index_html)
    index_html = re.sub(r'\s+rel="noopener noreferrer"', '', index_html)
    return index_html


def add_home_button(page_html: str) -> str:
    tag = '<script src="home-button.js"></script>'
    if tag in page_html:
        return page_html
    match = re.search(r'</body\s*>', page_html, flags=re.IGNORECASE)
    if not match:
        raise ValueError('找不到 </body>，無法插入回到農場首頁按鈕。')
    return page_html[:match.start()] + f'    {tag}\n' + page_html[match.start():]


def check(index_html: str, pages: list[str]) -> None:
    errors = []
    if 'target="_blank"' in index_html:
        errors.append('首頁仍含有 target="_blank"。')
    for old in TITLE_REPLACEMENTS:
        if old in index_html:
            errors.append(f'首頁仍含有合作教師名稱：{old}')
    if not HOME_BUTTON.exists():
        errors.append('缺少共用回首頁按鈕檔案 home-button.js。')
    for page in pages:
        path = ROOT / page
        if not path.exists():
            errors.append(f'找不到活動頁：{page}')
            continue
        if '<script src="home-button.js"></script>' not in path.read_text(encoding='utf-8'):
            errors.append(f'活動頁尚未加入回首頁按鈕：{page}')
    if errors:
        raise SystemExit('\n'.join(errors))


def main() -> None:
    original_index = INDEX.read_text(encoding='utf-8')
    pages = get_activity_pages(original_index)
    if not pages:
        raise SystemExit('首頁找不到活動卡片連結。')

    if '--check' in sys.argv:
        check(original_index, pages)
        print(f'驗證成功：{len(pages)} 個活動頁均已加入回首頁按鈕。')
        return

    INDEX.write_text(update_index(original_index), encoding='utf-8')
    HOME_BUTTON.write_text(HOME_BUTTON_SCRIPT, encoding='utf-8')
    for page in pages:
        path = ROOT / page
        if not path.exists():
            raise SystemExit(f'找不到活動頁：{page}')
        original_page = path.read_text(encoding='utf-8')
        path.write_text(add_home_button(original_page), encoding='utf-8')

    updated_index = INDEX.read_text(encoding='utf-8')
    check(updated_index, pages)
    print(f'更新完成：首頁與 {len(pages)} 個活動頁。')


if __name__ == '__main__':
    main()
