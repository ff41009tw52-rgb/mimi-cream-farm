const root=require('node:path').resolve(__dirname,'../..');
const {harness}=require(root+'/tests/aquarium-v06/harness.cjs'),assert=require('node:assert/strict');
(async()=>{const h=await harness(8830),{p,context}=await h.create({size:{width:390,height:844},touch:true,clock:false});await p.locator('#home-new').tap();await p.locator('#tutorial-begin').tap();await p.locator('#feed').tap();await p.waitForFunction(()=>{const r=document.getElementById('feed-choices').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;});await p.locator('#feed-general').tap();await p.waitForFunction(()=>Math.abs(document.getElementById('tank').getBoundingClientRect().top)<20);await h.shot(p,'mobile-water-target');await p.locator('#tank').tap({position:{x:120,y:55}});assert.equal((await h.read(p)).state.feedInventory.general,7);assert.equal((await h.read(p)).state.onboarding.step,3);const original=(await h.read(p)).state;await context.close();
const s=JSON.parse(JSON.stringify(original));s.feedInventory.general=0;s.onboarding={step:0,completed:false,skipped:false,welcomed:false,paused:false,coinHintShown:false};const v=await h.create({state:s}),q=v.p;await q.locator('#home-continue').click();const ledger=await q.evaluate(k=>JSON.parse(localStorage.getItem(k)),h.KEY+'_gifts_'+s.saveId);assert(ledger.ids.includes('starter'));await q.locator('#tutorial-begin').click();assert.equal((await h.read(q)).state.feedInventory.general,1);await v.context.close();
const c=await h.create({state:original}),a=c.p;await a.locator('#home-continue').click();const second=await c.context.newPage();await second.goto('http://127.0.0.1:8830/aquarium-v0.6.html?debug=1');await second.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.coins++;localStorage.setItem(k,JSON.stringify(s));},h.KEY);await a.waitForFunction(()=>aquariumDebug().conflict);const latest=await a.evaluate(k=>localStorage.getItem(k),h.KEY);await a.locator('#feed').click();await a.locator('#feed-general').click();await a.locator('#tank').click({position:{x:120,y:55}});assert.equal(await a.evaluate(k=>localStorage.getItem(k),h.KEY),latest);await c.context.close();
// An auto-save can fit while the larger manual snapshot exceeds the storage quota.
// Keep the committed auto-save live and preserve the previous manual snapshot.
const partial=await h.create({state:original}),mp=partial.p;
await mp.locator('#home-continue').click();await h.settings(mp);
await mp.getByRole('button',{name:'存檔',exact:true}).click();
const manualBefore=await mp.evaluate(k=>localStorage.getItem(k+'_manual'),h.KEY);
await h.advance(mp,3000);const liveBefore=(await h.read(mp)).state;
assert(liveBefore.tanks[0].fishes[0].hunger<JSON.parse(manualBefore).tanks[0].fishes[0].hunger);
await mp.evaluate(k=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,v){if(key===k+'_manual')throw new DOMException('quota','QuotaExceededError');return set.call(this,key,v);};},h.KEY);
await h.settings(mp);await mp.getByRole('button',{name:'存檔',exact:true}).click();
const committed=await mp.evaluate(k=>JSON.parse(localStorage.getItem(k)),h.KEY),liveAfter=(await h.read(mp)).state;
assert.equal(liveAfter.tanks[0].fishes[0].hunger,liveBefore.tanks[0].fishes[0].hunger);
assert.equal(liveAfter.tanks[0].fishes[0].hunger,committed.tanks[0].fishes[0].hunger);
assert.equal(await mp.evaluate(k=>localStorage.getItem(k+'_manual'),h.KEY),manualBefore);
assert((await mp.locator('#save-status').textContent()).includes('自動存檔已完成'));
await mp.reload();await mp.locator('#home-continue').click();
assert(Math.abs((await h.read(mp)).state.tanks[0].fishes[0].hunger-committed.tanks[0].fishes[0].hunger)<.1);
await partial.context.close();assert.deepEqual(h.errors,[]);h.saveResults('extra-results',{mobileAutoScroll:true,importedGiftLedger:true,multiTabConflict:true,partialManualQuota:true,errors:h.errors});await h.close();console.log('PASS actual mobile auto-scroll, imported-claim persistence stale-tab feeding protection and partial manual quota consistency');})().catch(e=>{console.error(e);process.exit(1)});
