const {harness}=require('./harness.cjs'),{context,plain,starter}=require('./schema.test.cjs'),assert=require('node:assert/strict');
(async()=>{const h=await harness(8836),w=context(),S=w.AquariumSave,out=[];
 for(const size of [{width:1366,height:768},{width:1440,height:900},{width:390,height:844},{width:820,height:1180},{width:1024,height:768}]){
  const s=plain(starter);s.savedAt=Date.now();s.coins=0;s.gifts=['starter','smallLesson','level2','level4'];s.onboarding={...S.newOnboarding(),welcomed:true,step:15,events:S.TUTORIAL_KEYS.slice(0,15)};
  const v=await h.create({state:s,size,touch:true}),p=v.p;await p.locator('#home-continue').click();assert.equal(await p.locator('#onboarding-step').textContent(),'7 / 8');await h.shot(p,'decor-lesson-'+size.width+'-open');await p.locator('#shop').tap();await p.locator('#tab-decor').tap();await h.shot(p,'decor-lesson-'+size.width+'-buy');assert.equal((await h.read(p)).state.onboarding.step,17);await h.closeDialog(p);assert.equal((await h.read(p)).state.onboarding.step,17);await h.shop(p,'decor');await p.locator('[data-buy-decor=smallplant]').tap();assert.equal((await h.read(p)).state.onboarding.step,18);await p.locator('#tutorial-edit').tap();assert.equal((await h.read(p)).state.onboarding.step,19);await h.shot(p,'decor-lesson-'+size.width+'-select');
  const handle=p.locator('.decor-handle').first();await handle.tap();const before=(await h.read(p)).state.placedDecorations[0].normX;
  if(process.env.AQUARIUM_BROWSER!=='webkit'){
   const box=await handle.boundingBox(),session=await p.context().newCDPSession(p);const x=box.x+box.width/2,y=box.y+box.height/2,dx=Math.min(95,size.width*.22);
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  }else await p.locator('#edit-right').tap();
  assert.notEqual((await h.read(p)).state.placedDecorations[0].normX,before);assert.equal((await h.read(p)).state.onboarding.step,20);await h.shot(p,'decor-lesson-'+size.width+'-moved');await p.locator('#edit-done').tap();await p.locator('#observe-review').tap();assert((await h.read(p)).state.onboarding.completed);await p.locator('#obs-return').tap();await h.shot(p,'decor-lesson-'+size.width+'-complete');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(size.width>=1060)assert(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+3));
  out.push({size,engine:process.env.AQUARIUM_BROWSER||'chromium',input:process.env.AQUARIUM_BROWSER==='webkit'?'touch selection + move button':'CDP simulated touch drag',realDevice:false});await v.context.close();
 }
 assert.deepEqual(h.errors,[]);h.saveResults('decor-touch-results',{out,errors:h.errors,physicalDevicesTested:false});await h.close();console.log('PASS decoration lesson purchase/place/move at five sizes using touch input, plus single-screen desktop');
})().catch(e=>{console.error(e);process.exit(1)});
