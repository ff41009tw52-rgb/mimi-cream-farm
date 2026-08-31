import { mountEmbeddedPage } from '../runtime/embedded-page.js';

const pageHtml = "<!DOCTYPE html>\n<html lang=\"zh-TW\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>橘咪咪與白奶油的科學農場</title>\n<link rel=\"stylesheet\" href=\"farm-ui.css\">\n<style>body{margin:0;font-family:system-ui,\"Noto Sans TC\",sans-serif;background:#f0fdf4;color:#166534;display:grid;place-items:center;min-height:100vh}.box{background:#fff;border:3px solid #86efac;border-radius:24px;padding:28px;text-align:center;box-shadow:0 8px 24px #0001}p{font-weight:700}</style>\n</head>\n<body>\n<div class=\"box\"><h1>🌱 科學農場載入中</h1><p>正在準備小白菜救援任務……</p></div>\n<script>\nconst sourceUrl='https://raw.githubusercontent.com/ff41009tw52-rgb/mimi-cream-farm/3281db76110cf7f2c56f58bbd64834b1889054db/40.html';\nfetch(sourceUrl).then(r=>r.text()).then(html=>{\nhtml=html.replaceAll('edge/cabbage-dry.png','./picture/cabbage-dry.png').replaceAll('edge/cabbage-low-light.png','./picture/cabbage-low-light.png').replaceAll('edge/cabbage-pest.png','./picture/cabbage-pest.png').replaceAll('Christmascream.jpg','./picture/Christmascream.jpg').replaceAll('Christmasmimi.jpg','./picture/Christmasmimi.jpg').replaceAll('./assets/illustrations/cream.svg','./picture/Christmascream.jpg').replaceAll('./assets/illustrations/mimi.svg','./picture/Christmasmimi.jpg');\nhtml=html.replace('</head>','<link rel=\"stylesheet\" href=\"farm-ui.css\"></head>').replace('</body>','<script src=\"farm-ui.js\"><\\/script></body>');\ndocument.open();document.write(html);document.close();\n}).catch(()=>{document.body.innerHTML='<div class=\"box\"><h1>暫時無法載入網站</h1><p>請重新整理後再試一次。</p></div>'});\n</script>\n<script src=\"farm-ui.js\"></script>\n</body>\n</html>\n";

export function mount(root, context = {}) {
  return mountEmbeddedPage(root, {
    html: pageHtml,
    baseUrl: new URL('../../', import.meta.url).href,
    title: String(context.game?.title || '科學農場互動遊戲')
  });
}
