const assert=require('node:assert/strict'),{harness}=require('./harness.cjs'),{context,plain,starter}=require('./schema.test.cjs');
(async()=>{const h=await harness(8882),w=context(),S=w.AquariumSave;
for(const size of [{width:320,height:640},{width:390,height:844},{width:820,height:1180},{width:1024,height:768}]){
 const s=plain(starter);s.savedAt=Date.now();s.onboarding={...S.newOnboarding(),welcomed:true,everCompleted:true,review:true,step:14,events:S.TUTORIAL_KEYS.slice(0,14)};
 const v=await h.create({state:s,size,touch:true,cadence:100}),p=v.p;await p.locator('#home-continue').tap();await p.locator('#game').waitFor({state:'visible'});await p.locator('#shop').tap();await p.locator('#tab-fish').tap();
 const b=p.locator('#tutorial-review-purchase');await b.waitFor({state:'visible'});await b.scrollIntoViewIfNeeded();await p.evaluate(()=>{window.__reviewButton=document.querySelector('#tutorial-review-purchase');});
 const rect=await b.boundingBox();await p.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await p.mouse.down();
 // A queued close notification can rerender the guide between pointerdown and pointerup.
 await p.evaluate(()=>document.querySelector('#dialog').dispatchEvent(new Event('close')));await p.evaluate(()=>new Promise(queueMicrotask));
 assert(await p.evaluate(()=>window.__reviewButton===document.querySelector('#tutorial-review-purchase')),'guide must not replace a pressed button');await p.mouse.up();assert.equal((await h.read(p)).state.onboarding.step,15);
 await p.evaluate(()=>{const t=document.querySelector('#toast');if(t.matches(':popover-open'))t.hidePopover();document.body.append(t);t.replaceChildren(document.createElement('span'));t.hidden=false;Object.assign(t.style,{inset:'0',width:'100vw',height:'100vh',maxHeight:'none',transform:'none'});t.showPopover();});await p.locator('#feed').tap();assert(await p.locator('#feeding-hint').isVisible(),'notification overlay must not intercept underlying controls');await p.evaluate(()=>{const t=document.querySelector('#toast');t.hidePopover();t.hidden=true;});
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await h.shot(p,'touch-stable-'+size.width);await v.context.close();
}
assert.deepEqual(h.errors,[]);h.saveResults('touch-stability-results',{pressedButtonRetained:true,phoneAndTablet:true,errors:h.errors});await h.close();console.log('PASS pressed guidance controls survive asynchronous rerenders on phone and tablet');
})().catch(e=>{console.error(e);process.exit(1)});
