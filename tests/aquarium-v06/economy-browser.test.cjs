const assert=require('node:assert/strict'),{harness}=require('./harness.cjs'),{context,plain,starter}=require('./schema.test.cjs');
(async()=>{const h=await harness(8878),w=context(),D=w.AquariumData,S=w.AquariumSave;
function seed(ids=['guppy','goldfish','cory','zebra','molly']){const s=plain(starter);s.savedAt=Date.now();s.coins=0;s.feedInventory={general:20,small:20,protein:20};s.rewardPaid={};s.onboarding={...S.newOnboarding(),step:21,events:[...S.TUTORIAL_KEYS],welcomed:true,completed:true,everCompleted:true,hints:[...S.HINT_IDS]};s.collection={};s.tanks[0].tier=4;s.tanks[0].fishes=ids.map((id,i)=>{s.collection[id]={total:1,adults:1,highestStage:2,variants:['normal']};return {...starter.tanks[0].fishes[0],id:'economy-'+i,species:id,personality:D.SPECIES[id].personalities[0],growth:100,hunger:100,adultRecorded:true,coinProgress:0,coinCredit:0};});return s;}
async function enter(p){await p.locator('#home-continue').click();await p.locator('#game').waitFor({state:'visible'});}
for(const width of [390,820,1440]){const s=seed();s.savedAt=Date.now()-14400000;const v=await h.create({state:s,size:{width,height:width===390?844:1180},touch:width<1000,cadence:100}),p=v.p;await enter(p);let d=(await h.read(p)).state;assert.equal(d.offlinePending.coins,2576);assert.equal(d.coins,0);assert(await p.locator('#offline-claim').isVisible());assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await h.shot(p,'economy-offline-'+width);await h.closeDialog(p);await p.reload();await enter(p);assert.equal((await h.read(p)).state.offlinePending.coins,2576);await p.locator('#offline-claim').click();assert.equal((await h.read(p)).state.coins,2576);await p.reload();await enter(p);assert.equal((await h.read(p)).state.coins,2576);assert.equal((await h.read(p)).state.offlinePending,null);const second=await v.context.newPage();await second.goto('http://127.0.0.1:8878/aquarium-v0.6.html?debug=1');await second.locator('#home-continue').click();await second.waitForFunction(()=>document.getElementById('home-error').textContent.includes('另一個分頁'));assert.equal(await second.evaluate(()=>aquariumDebug().started),false);await v.context.close();}
const v=await h.create({state:seed(),cadence:100,size:{width:390,height:844},touch:true}),p=v.p;await enter(p);await h.advance(p,40*60000);let d=(await h.read(p)).state;assert.equal(d.drops.length,30);assert(d.drops.some(c=>c.value>4));const total=d.drops.reduce((n,c)=>n+c.value,0);assert(total>350);const retained=plain(d.drops);await p.reload();await enter(p);assert.deepEqual((await h.read(p)).state.drops,retained);await p.locator('#feed').click();await p.locator('#feed-general').click();const coin=d.drops.find(c=>c.y<.5)||d.drops.at(-1),box=await p.locator('#tank').boundingBox();await p.locator('#tank').click({position:{x:box.width*coin.x,y:box.height*coin.y}});const collected=(await h.read(p)).state;assert.equal(collected.drops.length,29);assert(collected.coins>0);assert.equal(collected.coins,total-collected.drops.reduce((n,c)=>n+c.value,0));await h.shot(p,'economy-stacked-coins');await v.context.close();
// A failed main-save write cannot consume the offline cursor or its pending receipt.
const interrupted=seed();interrupted.savedAt=Date.now()-14400000;const iv=await h.create({state:interrupted}),ip=iv.p;await ip.evaluate(k=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===k&&JSON.parse(value).offlinePending?.coins)throw Error('offline quota');return original.call(this,key,value);};},h.KEY);await ip.locator('#home-continue').click();await ip.waitForFunction(()=>aquariumDebug().saveBlocked);assert.equal(await ip.evaluate(k=>JSON.parse(localStorage.getItem(k)).savedAt,h.KEY),interrupted.savedAt);await ip.reload();await enter(ip);assert.equal((await h.read(ip)).state.offlinePending.coins,2576);await ip.locator('#offline-claim').click();assert.equal((await h.read(ip)).state.coins,2576);await iv.context.close();
// Real payouts never stack onto a zero-reward tutorial demonstration coin.
const review=seed(['guppy']);review.onboarding={...S.newOnboarding(),welcomed:true,review:true,everCompleted:true,step:8,events:S.TUTORIAL_KEYS.slice(0,8)};const demo='tutorial-demo-'+review.saveId;review.tanks[0].drops=Array.from({length:30},(_,i)=>({id:i?'real-'+i:demo,x:.1+(i%8)*.1,y:.3+Math.floor(i/8)*.1,value:1}));const rv=await h.create({state:review,cadence:100});await enter(rv.p);await h.advance(rv.p,100000);let rs=(await h.read(rv.p)).state;assert.equal(rs.drops.find(c=>c.id===demo).value,1);assert(rs.drops.filter(c=>c.id!==demo).some(c=>c.value>1));await rv.p.locator('#tutorial-coin-target').click();assert.equal((await h.read(rv.p)).state.coins,0);await rv.context.close();
// The purchase, balance and all tank drops must persist together.
function collectionSeed(balance){
 const s=seed(['guppy']);
 s.coins=balance;
 delete s.coinCollectUnlocked;
 s.tanks[0].drops=[{id:'first-coin',x:.4,y:.4,value:8}];
 s.tanks.push({...plain(S.emptyTank('collection-tank','海水缸')),habitat:'marine',drops:[{id:'second-coin',x:.5,y:.5,value:13}]});
 return s;
}
for(const width of [390,820,1440]){
 const v=await h.create({state:collectionSeed(2000),size:{width,height:900},touch:width<1000}),p=v.p;
 await enter(p);
 const shortcut=p.locator('#coin-collect-all');
 await shortcut.click();
 await p.getByRole('button',{name:'取消',exact:true}).click();
 assert.equal((await h.read(p)).state.coins,2000);
 await shortcut.click();
 await p.getByRole('button',{name:'花 2,000 金幣 解鎖',exact:true}).click();
 assert.equal((await h.read(p)).state.coins,0);
 await p.reload();
 await enter(p);
 assert.equal((await h.read(p)).state.coinCollectUnlocked,true);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const before=(await h.read(p)).state;
 if(width<1000)await shortcut.tap();else await shortcut.click();
 const after=(await h.read(p)).state;
 assert.equal(after.coins,21);
 assert.equal(after.xp,before.xp+2);
 assert(after.tanks.every(t=>t.drops.length===0));
 await shortcut.click();
 assert.equal((await h.read(p)).state.coins,21);
 await p.reload();
 await enter(p);
 assert.equal((await h.read(p)).state.coins,21);
 await v.context.close();
}
const insufficient=await h.create({state:collectionSeed(1999)});
await enter(insufficient.p);
await insufficient.p.locator('#coin-collect-all').click();
assert.match(await insufficient.p.locator('#dialog-content').textContent(),/還差 1 金幣/);
assert.equal(await insufficient.p.locator('#dialog-content .confirm').count(),0);
await insufficient.context.close();
const full=collectionSeed(D.CONFIG.MAX_COINS-5);
full.coinCollectUnlocked=true;
full.offlinePending={coins:25,seconds:100,productive:100,at:Date.now()};
const capped=await h.create({state:full});
await enter(capped.p);
if(await capped.p.locator('#offline-claim').isVisible())await h.closeDialog(capped.p);
await capped.p.locator('#coin-collect-all').click();
const retainedCoins=(await h.read(capped.p)).state;
assert.equal(retainedCoins.coins,D.CONFIG.MAX_COINS);
assert.deepEqual(retainedCoins.tanks.map(t=>t.drops[0].value),[3,13]);
assert.equal(retainedCoins.offlinePending.coins,25);
await capped.context.close();
console.log('PASS one-time unlock, multi-tank collection, reload, insufficient funds and wallet cap across desktop and touch sizes');
// Six habitats settle independently; inactive tanks contribute to the same pending receipt.
const six=seed(['guppy']);for(let i=1;i<6;i++){const id=i<3?'guppy':'ocellaris',t=plain(six.tanks[0]);t.id='six-'+i;t.placedDecorations=[];t.habitat=i<3?'freshwater':'marine';t.fishes=[{...t.fishes[0],id:'six-fish-'+i,species:id,personality:D.SPECIES[id].personalities[0]}];six.tanks.push(t);if(six.collection[id]){six.collection[id].total++;six.collection[id].adults++;}else six.collection[id]={total:1,adults:1,highestStage:2,variants:['normal']};}six.savedAt=Date.now()-14400000;const sv=await h.create({state:six});await enter(sv.p);assert.equal((await h.read(sv.p)).state.offlinePending.coins,3*480+3*Math.floor(14400/105)*4);await sv.context.close();assert.deepEqual(h.errors,[]);h.saveResults('economy-results',{fiveAdultsPaid:2576,cycleCredit:7.2727272727272725,threeSizes:true,pendingClaimOnce:true,singleWriter:true,stackCount:30,stackTotal:total,sixTanks:true,errors:h.errors});await h.close();})().catch(e=>{console.error(e);process.exit(1)});
