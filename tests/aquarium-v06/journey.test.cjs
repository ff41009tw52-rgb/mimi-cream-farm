/* Normal economy, all purchases through visible UI, no injected save or money.
 * Virtual time includes 1.5 seconds for each automated UI action. */
const assert=require('node:assert/strict'),{harness}=require('./harness.cjs');
(async()=>{
 const long=process.env.AQUARIUM_LONG_JOURNEY==='1';
 const h=await harness(8852),v=await h.create({query:'',cadence:100}),p=v.p;
 const read=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),h.KEY);
 const start=await p.evaluate(()=>Date.now()),milestones={};
 const mark=async name=>{milestones[name]=+((await p.evaluate(()=>Date.now())-start)/60000).toFixed(2);};
 const click=async selector=>{await p.locator(selector).click();await h.advance(p,1500);};
 const close=()=>click('#dialog-close');
 async function shop(tab){await click('#shop');await click('#tab-'+tab);}
 async function feed(kind){
  await h.advance(p,800);
  if(await p.locator('#stop-feed').isVisible())await click('#stop-feed');
  await click('#feed');await click('#feed-'+kind);
  const r=await p.locator('#tank').boundingBox();
  await p.locator('#tank').click({position:{x:r.width*.3,y:r.height*.14}});
  await h.advance(p,1500);
  if(await p.locator('#stop-feed').isVisible())await click('#stop-feed');
 }
 async function claim(){
  await click('#more-menu');await click('#achievements');
  for(let n=0;n<30;n++){
   const b=p.locator('.achievement-card[data-status=ready] [data-claim]').first();
   if(!await b.count())break;await b.click();await h.advance(p,1500);if(!milestones.firstAchievement)await mark('firstAchievement');
  }
  await close();
 }
 await click('#home-new');await click('#tutorial-begin');await feed('general');
 await click('#onboarding-gift');await feed('small');
 await click('#more-menu');await click('#roster');
 await p.locator('.roster-item').first().click();await h.advance(p,1500);
 await click('#close-card');await click('#tutorial-coin-target');
 await shop('feed');await click('#buy-feed-general');await mark('firstFeedPurchase');
 await shop('fish');await click('[data-species=guppy].buy');
 await click('#purchase-confirm');await mark('firstFishPurchase');await close();
 await shop('decor');await click('[data-buy-decor=smallplant]');
 await mark('firstDecoration');await click('#more-menu');await click('#tutorial-edit');
 await p.locator('[data-select-decor]').first().click();await h.advance(p,1500);
 await click('#edit-right');await click('#edit-done');
 await click('#more-menu');await click('#more-observe');await click('#obs-return');await mark('tutorialComplete');await claim();
 await shop('fish');await click('[data-species=blackshrimp].buy');
 await click('#purchase-confirm');await mark('firstCrustacean');await close();await claim();
 for(let minute=1;minute<=(long?180:25);minute++){
  await h.advance(p,60000);
  // Collect visible coins one by one, as a player does; there is no bulk control.
  for(let n=0;n<100;n++){
   const current=await read(),tank=current.tanks.find(t=>t.id===current.activeTankId),coin=tank.drops.at(-1);
   if(!coin)break;
   const r=await p.locator('#tank').boundingBox();
   await p.locator('#tank').click({position:{x:coin.x*r.width,y:coin.y*r.height}});
   await h.advance(p,1500);
  }
  const s=await read();assert(s.coins>=0);
  if(!milestones.firstUpgrade&&s.level>=2&&s.coins>=80){
   await click('#tank-upgrade-shortcut');await click('#upgrade-tank');await close();await mark('firstUpgrade');
  }
  if(minute%3===0){
   await claim();const now=await read();
   for(const kind of ['general','small',...(now.level>=4?['protein']:[])]){
    if(now.feedInventory[kind]<2){await shop('feed');await click('#buy-feed-'+kind);await close();}
    await feed(kind);
   }
  }
  if(long){
   let current=await read();
   if(!milestones.paradisePurchase&&current.level>=4&&current.coins>=254){
    await shop('fish');await click('[data-species=paradise].buy');await click('#purchase-confirm');await close();await mark('paradisePurchase');
   }
   current=await read();
   if(!milestones.marineTank&&current.level>=5&&current.coins>=950){
    await click('#tank-upgrade-shortcut');await click('#buy-marine-tank');await click('#dialog-content .confirm');await mark('marineTank');
    await shop('fish');await click('[data-species=ocellaris].buy');await click('#purchase-confirm');await close();await mark('marineFish');break;
   }
  }else if(milestones.firstUpgrade&&minute>=10)break;
 }
 const end=await read();assert(milestones.firstUpgrade,'normal new players must reach the first upgrade');
 assert(milestones.firstUpgrade<=20);assert(end.tanks[0].tier>=2);
 if(long){assert(milestones.paradisePurchase);assert(milestones.marineTank);assert(milestones.marineFish);assert.equal(end.tanks.length,2);}else assert.equal(end.tanks[0].fishes.length,5);assert(end.tanks[0].fishes.every(f=>f.hunger>25));
 assert.equal(await p.evaluate(()=>typeof window.aquariumDebug),'undefined');assert.deepEqual(h.errors,[]);
 h.saveResults(long?'long-journey-results':'journey-results',{normalMode:true,debugOrSaveMutations:false,clock:'virtual time, normal gameplay speed, 1.5 seconds per UI action',milestones,coins:end.coins,level:end.level,feedInventory:end.feedInventory});
 await h.shot(p,'new-player-journey');
 h.pass('normal new-player feed/fish/decor/crustacean purchases and first upgrade through visible UI',milestones);
 await v.context.close();await h.close();
})().catch(e=>{console.error(e);process.exit(1);});
