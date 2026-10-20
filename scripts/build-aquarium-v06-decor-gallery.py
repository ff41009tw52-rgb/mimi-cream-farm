#!/usr/bin/env python3
"""Archive real CI screenshots as a small review gallery, with no external assets."""
from pathlib import Path
import argparse,json,html
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('artifacts',type=Path);p.add_argument('--commit',required=True);p.add_argument('--run',required=True);a=p.parse_args()
out=Path(__file__).resolve().parent.parent/'docs/aquarium-v06-decor';out.mkdir(parents=True,exist_ok=True)
rows=[]
for width in [1440,390]:
 for key,title in [('river','河砂'),('white','白砂'),('black','黑砂'),('plants','小水草／高水草／莫絲'),('rocks','小石頭／大石頭／洞穴'),('woodwork','沉木／沉船／寶箱'),('shop-top','布置商店'),('shop-objects','造景商品'),('shop-plants','水草商品'),('shop-bottom','洞穴／沉船／寶箱商品')]:rows.append((f'decor-{width}-{key}',f'{width}px：{title}'))
for width in [1366,1440,390,820,1024]:
 for key,title in [('open','第七項：打開商店'),('buy','真正購買並放置'),('select','選取與移動裝飾'),('moved','位置變更成功'),('complete','完成八項教學後的完整遊戲')]:rows.append((f'decor-lesson-{width}-{key}',f'{width}px：{title}'))
for width in [820,1024]:rows.extend([(f'decor-{width}-plants',f'{width}px 平板：缸內布置'),(f'decor-{width}-shop-objects',f'{width}px 平板：商店造景')])
rows.extend([('decor-support-5','5 金幣買小水草：僅補足差額'),('decor-support-100','100 金幣買小水草：不補助'),('decor-performance-30','手機：三缸三十魚及多件布置')])
items=[]
for stem,title in rows:
 src=a.artifacts/(stem+'.png')
 if not src.exists():continue
 im=Image.open(src).convert('RGB');im.save(out/(stem+'.webp'),'WEBP',quality=86,method=6)
 items.append({'file':stem+'.webp','title':title,'width':im.width,'height':im.height})
meta={'commit':a.commit,'ciRun':a.run,'screenshots':items,'physicalDevicesTested':False};(out/'gallery.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
figures=''.join(f'<figure><a href="{x["file"]}"><img loading="lazy" src="{x["file"]}" alt="{html.escape(x["title"])}"></a><figcaption>{html.escape(x["title"])}</figcaption></figure>' for x in items)
(out/'index.html').write_text('''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>悠悠水族箱｜布置美術與八項教學驗收</title><style>body{margin:0;background:#edf3e8;color:#285a50;font:17px/1.7 system-ui,sans-serif}main{max-width:1300px;margin:auto;padding:28px 20px}h1{font-size:28px}a{color:#236f60}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}figure{margin:0;padding:12px;border:1px solid #c9d9c4;border-radius:15px;background:#fffdf5}img{display:block;width:100%;height:340px;object-fit:contain;background:#e2ede4}figcaption{padding:9px 3px}code{overflow-wrap:anywhere}</style><main><a href="../">回遊戲</a><h1>布置美術與八項教學｜實際畫面</h1><p>以下為 GitHub Actions 自動化瀏覽器的真實遊戲截圖。手機與平板為視窗尺寸／觸控模擬，沒有實機驗證；點圖片可看原尺寸。</p><p><a href="https://github.com/ff41009tw52-rgb/mimi-cream-farm/actions/runs/'''+a.run+'">本輪測試</a> · 提交 <code>'+a.commit+'</code></p><div class="grid">'+figures+'</div></main></html>')
for name in ['decor-results.json','decor-touch-results.json','eight-task-results.json']:
 src=a.artifacts/name
 if src.exists():(out/name).write_bytes(src.read_bytes())
print(f'{len(items)} real screenshots archived at {out}')
