/* Run against a local http server. Requires Playwright and Chromium.
   AQUARIUM_BROWSER_MODULE can point to a @sparticuz/chromium installation. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const server=require('node:http').createServer((req,res)=>{const root=path.resolve(__dirname,'../..');const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(data);});});
server.listen(8765,'127.0.0.1');
const URL=process.env.AQUARIUM_URL||'http://127.0.0.1:8765/aquarium-game.html?test=1';
const OUT=process.env.AQUARIUM_ARTIFACTS||path.resolve('artifacts/aquarium');
const KEY='aquarium_game_save_v1',MANUAL=KEY+'_manual';
(async()=>{
fs.mkdirSync(OUT,{recursive:true});
let launch={headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],executablePath:process.env.AQUARIUM_CHROMIUM||undefined};
if(process.env.AQUARIUM_BROWSER_MODULE){const mod=await import(process.env.AQUARIUM_BROWSER_MODULE);const bin=mod.default||mod;launch={...launch,args:bin.args,executablePath:await bin.executablePath()};}
const browser=await chromium.launch(launch);const errors=[],results=[];
const report=(name,details)=>{results.push({name,passed:true,details});console.log('PASS',name,details||'');};
async function pageFor(size={width:1440,height:960},initial){const context=await browser.newContext({viewport:size,deviceScaleFactor:1,hasTouch:true});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));if(initial!==undefined)await p.addInitScript(({key,value})=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(key,value);sessionStorage.setItem('seeded','1');}},{key:KEY,value:typeof initial==='string'?initial:JSON.stringify(initial)});await p.clock.install();await p.goto(URL);await p.clock.pauseAt(new Date(Date.now()+1000));return {p,context};}
const read=p=>p.evaluate(()=>aquariumDebug());
const advance=async(p,n)=>{await p.clock.runFor(n);};
async function settings(p){await p.locator('#settings').click();}
async function saveManual(p){await settings(p);await p.getByRole('button',{name:'存檔',exact:true}).click();}
async function buy(p,index=0){await p.locator('#shop').click();await p.locator('.buy').nth(index).click();await p.locator('#dialog-close').click();}
const {p,context}=await pageFor();
await p.screenshot({path:path.join(OUT,'aquarium-desktop.png')});
let initial=(await read(p)).state;assert.equal(initial.fishes.length,3);assert.equal(initial.coins,120);assert.equal(initial.schemaVersion,1);
const movements=new Map(initial.fishes.map(f=>[f.id,[]]));
await p.locator('#feed').click();const rect=await p.locator('#tank').boundingBox();
for(let i=0;i<3;i++){await p.touchscreen.tap(rect.x+rect.width*(.25+i*.25),rect.y+rect.height*.16);await advance(p,700);}
await p.screenshot({path:path.join(OUT,'aquarium-feeding.png')});
for(let i=0;i<8;i++){await advance(p,5000);let d=await read(p);for(const r of d.runtime){movements.get(r.id).push([r.x,r.y]);assert(r.x>.04&&r.x<.96&&r.y>.05&&r.y<.95);if(d.state.fishes.find(f=>f.id===r.id).species==='cory')assert(r.y>.65);}}
let d=await read(p);assert(d.diagnostics.eaten>0);assert(d.state.fishes.some(f=>f.hunger>initial.fishes.find(g=>g.id===f.id).hunger));assert(d.state.fishes.every(f=>f.growth>10));assert(d.state.waterQuality<100);assert(d.state.drops.length>0);assert(d.diagnostics.writes<60);
for(const positions of movements.values())assert(Math.hypot(positions[0][0]-positions.at(-1)[0],positions[0][1]-positions.at(-1)[1])>.005);
report('三種魚游動、追食、吃食、飽食、成長、水質下降', {eaten:d.diagnostics.eaten,writes:d.diagnostics.writes});
await p.locator('#stop-feed').click();const beforeCoin=d.state.coins,coin=d.state.drops[0];await p.touchscreen.tap(rect.x+coin.x*rect.width,rect.y+coin.y*rect.height);let after=await read(p);assert.equal(after.state.coins,beforeCoin+coin.value);report('點擊金幣與金額增加');
await buy(p);after=await read(p);assert.equal(after.state.fishes.length,4);assert.equal(after.state.coins,beforeCoin+coin.value-30);
await saveManual(p);const saved=JSON.parse(await p.evaluate(k=>localStorage.getItem(k),KEY));await p.reload();after=await read(p);assert.deepEqual(after.state.fishes.map(f=>f.id),saved.fishes.map(f=>f.id));assert.equal(after.state.coins,saved.coins);assert(Math.abs(after.state.waterQuality-saved.waterQuality)<1);assert(Math.abs(after.state.fishes[0].growth-saved.fishes[0].growth)<1);report('測試 A：餵食、收幣、購買、成長後重新整理保存個體與數值');
await buy(p);assert.equal((await read(p)).state.fishes.length,5);await settings(p);await p.getByRole('button',{name:'讀檔',exact:true}).click();await p.getByRole('button',{name:'確定讀取'}).click();assert.equal((await read(p)).state.fishes.length,4);assert.equal((await read(p)).state.coins,saved.coins);report('測試 B：手動快照可還原，自動存檔不覆蓋手動快照');
await p.close();const reopened=await context.newPage();reopened.on('pageerror',e=>errors.push(e.message));await reopened.goto(URL);assert.equal((await read(reopened)).state.fishes.length,4);report('測試 C：關閉分頁再開啟自動讀檔');
await reopened.evaluate(()=>localStorage.setItem('farm_tycoon_save_v2','farm-sentinel'));
await settings(reopened);await reopened.getByRole('button',{name:'重置',exact:true}).click();await reopened.getByRole('button',{name:'確認重置'}).click();assert.equal((await read(reopened)).state.fishes.length,4);await reopened.getByRole('button',{name:'確認重置'}).click();assert.equal((await read(reopened)).state.fishes.length,3);assert.equal(await reopened.evaluate(()=>localStorage.getItem('farm_tycoon_save_v2')),'farm-sentinel');assert.equal(await reopened.evaluate(k=>localStorage.getItem(k),MANUAL),null);report('測試 D：兩次確認後只重置養魚存檔');
await context.close();
// Deterministic fixtures exercise thresholds and long absences without days of waiting.
const fixture=structuredClone(initial);fixture.savedAt=Date.now();fixture.fishes[0].growth=34;fixture.fishes[1].growth=99;fixture.fishes.forEach(f=>f.hunger=85);fixture.waterQuality=20;
const grow=await pageFor(undefined,fixture);await grow.p.locator('#clean').click();await advance(grow.p,5000);d=await read(grow.p);assert.equal(d.state.fishes[0].growthStage,'亞成魚');assert.equal(d.state.fishes[1].growthStage,'成魚');assert(d.state.fishes[0].size>initial.fishes[0].size);assert(d.state.waterQuality>50);report('三階段門檻、體型變化、清潔恢復');await grow.context.close();
const offline=structuredClone(initial);offline.savedAt=Date.now()-180*24*3600000;const old=await pageFor(undefined,offline);d=await read(old.p);assert(d.state.fishes[0].hunger>=51&&d.state.fishes[0].growth<=17);assert(d.state.coins<=initial.coins+100);assert(d.state.waterQuality>90);assert(await old.p.locator('#toast').isVisible());await old.p.reload();assert.equal((await read(old.p)).state.coins,d.state.coins);report('半年離線僅計四小時、數值上限、重新整理不重複領取');await old.context.close();
const full=structuredClone(initial);full.savedAt=Date.now();full.coins=999;while(full.fishes.length<10)full.fishes.push({...full.fishes[0],id:'fixture-'+full.fishes.length});const cap=await pageFor(undefined,full);await cap.p.locator('#shop').click();await cap.p.locator('.buy').first().click();assert.equal((await read(cap.p)).state.fishes.length,10);assert.equal((await read(cap.p)).state.coins,999);assert.match(await cap.p.locator('#shop-message').innerText(),/住滿/);await cap.p.locator('#dialog-close').click();await cap.p.locator('#feed').click();const cr=await cap.p.locator('#tank').boundingBox();for(let i=0;i<25;i++){await cap.p.touchscreen.tap(cr.x+cr.width*.5,cr.y+60);await advance(cap.p,700);}assert((await read(cap.p)).food.length<=18);report('滿缸不可購買、飼料上限、觸控操作');await cap.context.close();
const poor=structuredClone(initial);poor.coins=0;poor.savedAt=Date.now();const funds=await pageFor(undefined,poor);await funds.p.locator('#shop').click();await funds.p.locator('.buy').first().click();assert.equal((await read(funds.p)).state.fishes.length,3);assert.match(await funds.p.locator('#shop-message').innerText(),/金幣不足/);report('金幣不足不購買');await funds.context.close();
for(const broken of ['{bad-json',JSON.stringify({...initial,schemaVersion:99}),JSON.stringify({...initial,coins:null})]){const err=await pageFor(undefined,broken);assert((await read(err.p)).saveBlocked);await err.p.locator('#clean').click();await advance(err.p,16000);assert.equal(await err.p.evaluate(k=>localStorage.getItem(k),KEY),broken);assert(await err.p.locator('#feed').isEnabled());await err.context.close();}report('JSON 損壞、未知版本、非法數值皆保留原資料並可試玩');
const fault=await browser.newContext();const fp=await fault.newPage();await fp.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Quota','QuotaExceededError');};});await fp.goto(URL);assert.match(await fp.locator('#save-status').innerText(),/無法儲存/);await fp.locator('#clean').click();assert(await fp.locator('#feed').isEnabled());await fault.close();report('儲存空間不足不白畫面');
for(const size of [{width:1024,height:768},{width:820,height:1180},{width:390,height:844}]){const tablet=await pageFor(size);assert(await tablet.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const box=await tablet.p.locator('#tank').boundingBox();assert(box.x>=0&&box.x+box.width<=size.width);for(const id of ['feed','shop','clean']){const b=await tablet.p.locator('#'+id).boundingBox();assert(b.width>=44&&b.height>=44&&b.y+b.height<=size.height);}await tablet.p.screenshot({path:path.join(OUT,`aquarium-${size.width}x${size.height}.png`),fullPage:true});await tablet.p.locator('#shop').click();await tablet.p.screenshot({path:path.join(OUT,`aquarium-shop-${size.width}.png`),fullPage:true});await tablet.p.locator('#dialog-close').click();assert(!(await tablet.p.locator('#dialog').isVisible()));await tablet.context.close();report(`版面 ${size.width}×${size.height} 與魚店關閉`);}
const tabs=await pageFor();const other=await tabs.context.newPage();await other.goto(URL);await tabs.p.waitForFunction(()=>aquariumDebug().conflict);const latest=await other.evaluate(k=>localStorage.getItem(k),KEY);await tabs.p.locator('#clean').click();assert.equal(await tabs.p.evaluate(k=>localStorage.getItem(k),KEY),latest);await tabs.context.close();report('兩分頁同時開啟時，舊分頁暫停並避免覆寫');
const leftover=structuredClone(initial);leftover.savedAt=Date.now();leftover.fishes=[];const waste=await pageFor(undefined,leftover);await waste.p.locator('#feed').click();const wr=await waste.p.locator('#tank').boundingBox();await waste.p.touchscreen.tap(wr.x+wr.width*.5,wr.y+50);await advance(waste.p,57000);assert.equal((await read(waste.p)).food.length,0);assert((await read(waste.p)).state.waterQuality<96);report('剩餘飼料沉底、消失並降低水質');await waste.context.close();
assert.deepEqual(errors,[]);report('瀏覽器無未捕捉例外');
fs.writeFileSync(path.join(OUT,'test-results.json'),JSON.stringify({at:new Date().toISOString(),browser:browser.version(),results,errors},null,2));await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
