const assert=require('node:assert/strict');
async function completeDecor(p,{review=false}={}){
 await p.locator('#shop').click();await p.locator('#tab-decor').click();
 if(review||await p.locator('#tutorial-review-purchase').count())await p.locator('#tutorial-review-purchase').click();
 else await p.locator('[data-buy-decor=smallplant]').click();
 assert.equal((await p.evaluate(()=>aquariumDebug())).state.onboarding.step,18);
 await p.locator('#more-menu').click();await p.locator('#tutorial-edit').click();assert.equal((await p.evaluate(()=>aquariumDebug())).state.onboarding.step,19);
 await p.locator('[data-select-decor]').first().click();await p.locator('#edit-right').click();
 assert.equal((await p.evaluate(()=>aquariumDebug())).state.onboarding.step,20);
 await p.locator('#edit-done').click();
}
module.exports={completeDecor};
