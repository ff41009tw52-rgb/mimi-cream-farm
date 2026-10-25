const assert=require('node:assert/strict'),{harness}=require('./harness.cjs'),{context,plain,starter}=require('./schema.test.cjs');
(async()=>{
 const h=await harness(8872),w=context(),S=w.AquariumSave,D=w.AquariumData;
 const seed=step=>{const s=plain(starter);s.savedAt=Date.now();s.onboarding={...S.newOnboarding(),welcomed:true,step,events:S.TUTORIAL_KEYS.slice(0,step),completed:step===21,everCompleted:step===21};return plain(S.validate(s));};
 // Replacing a save acquires ownership asynchronously, then closes only the confirmation.
 const fresh=await h.create({state:seed(21)}),fp=fresh.p;await fp.locator('#home-new').click();await fp.getByRole('button',{name:'確認建立',exact:true}).click();await fp.waitForFunction(()=>aquariumDebug().started);assert.equal(await fp.locator('#dialog').evaluate(e=>e.open),false);await fp.locator('#tutorial-begin').click();assert.equal((await h.read(fp)).state.coins,20);assert.equal((await h.read(fp)).state.fishes.length,3);await fresh.context.close();
 // Lost auxiliary reward receipt: the durable payment journal must still prevent replay.
 const old=seed(21),a=D.ACHIEVEMENTS.find(a=>a.reward.coins>0&&a.reward.variant);
 old.achievements[a.id]={completed:true,rewardClaimed:false};old.rewardPaid={};
 const v=await h.create({state:old,seed:{[h.KEY+'_gifts_'+old.saveId]:{ids:[],emergencyAt:0,rewardPaid:{[a.id]:a.reward.coins}}}}),p=v.p;
 await p.locator('#home-continue').click();await p.waitForFunction(()=>aquariumDebug().started);
 let after=(await h.read(p)).state;assert(after.achievements[a.id].rewardClaimed);assert(after.unlockedVariants.includes(a.reward.variant));assert.equal(after.coins,old.coins);
 await p.reload();await p.locator('#home-continue').click();assert.equal((await h.read(p)).state.coins,old.coins);
 // Two actual pages compete for the same save; the second cannot start a writer.
 const second=await v.context.newPage();await second.goto('http://127.0.0.1:8872/aquarium-v0.6.html?debug=1');await second.locator('#home-continue').click();await second.waitForFunction(()=>document.getElementById('home-error').textContent.includes('另一個分頁'));
 assert.equal(await second.evaluate(()=>aquariumDebug().started),false);await p.close();await second.locator('#home-continue').click();await second.waitForFunction(()=>aquariumDebug().started);assert.equal((await h.read(second)).state.coins,old.coins);await v.context.close();
 // Exhausted historical one-time recovery: practice completes without another gift.
 const exhausted=seed(2);exhausted.feedInventory.general=0;exhausted.gifts.push('lessonGeneralRecovery');
 const r=await h.create({state:exhausted,size:{width:390,height:844},touch:true}),rp=r.p;await rp.locator('#home-continue').click();await rp.locator('#tank').tap({position:{x:120,y:40}});
 assert.equal((await h.read(rp)).state.onboarding.step,3);assert.equal((await h.read(rp)).state.feedInventory.general,0);await rp.reload();await rp.locator('#home-continue').click();assert.equal((await h.read(rp)).state.onboarding.step,3);await r.context.close();
 // A partially finished lesson in a marine tank reuses/practices decor rather than requiring a freshwater-only shop item.
 const marine=seed(17);marine.level=5;marine.legacyLevelFloor=5;const tank=S.emptyTank('marine-lesson','海水練習');tank.habitat='marine';marine.tanks.push(plain(tank));marine.activeTankId=tank.id;
 const empty=plain(marine);empty.onboarding={...S.newOnboarding(),welcomed:true,step:11,events:S.TUTORIAL_KEYS.slice(0,11)};
 const e=await h.create({state:plain(S.validate(empty))});await e.p.locator('#home-continue').click();await h.shop(e.p,'feed');await e.p.locator('#buy-feed-general').click();assert.equal((await h.read(e.p)).state.onboarding.step,12);await e.context.close();
 const m=await h.create({state:plain(S.validate(marine)),size:{width:820,height:1180},touch:true}),mp=m.p;await mp.locator('#home-continue').click();await h.shop(mp,'decor');await mp.locator('#tutorial-review-purchase').click();await mp.locator('#more-menu').click();await mp.locator('#tutorial-edit').click();await mp.locator('[data-select-decor]').first().click();await mp.locator('#edit-right').click();assert.equal((await h.read(mp)).state.onboarding.step,20);await mp.locator('#edit-done').click();await mp.locator('#more-menu').click();await mp.locator('#more-observe').click();assert((await h.read(mp)).state.onboarding.completed);await m.context.close();
 assert.deepEqual(h.errors,[]);h.saveResults('stability-results',{rewardJournalReplayProtected:true,singleWriter:true,exhaustedRecovery:true,marineLesson:true});await h.close();
})().catch(e=>{console.error(e);process.exit(1)});
