/* Eight tasks, real operation events, and a separately versioned save model. */
(() => {
'use strict';
const keys=window.AquariumSave.TUTORIAL_KEYS;
const tasks=['先餵餵看魚兒！','不同魚兒，吃不同的飼料','看看魚兒吃飽了沒','來收集金幣吧','到商店買飼料','買一隻新魚兒','布置自己的水族箱','觀察魚的身體與呼吸'];
const steps=[
 {task:1,target:'feed',event:'feedOpened',copy:'先按魚缸下方的「餵食」，準備餵魚。'},
 {task:1,target:'feed-general',event:'selected:general',copy:'選擇「綜合飼料」。在遊戲裡，孔雀魚和金魚會吃這種飼料。'},
 {task:1,target:'tank',event:'fed:general',copy:'現在點一下魚缸上方的水面，飼料就會掉進去！不用點魚兒，也不用再按「餵食」。',success:'成功了！魚兒會慢慢游過來尋找食物。'},
 {task:2,target:'onboarding-gift',event:'smallGift',copy:'在這個遊戲裡，鼠魚吃小型魚飼料。先收下 5 份飼料，再試著餵鼠魚。'},
 {task:2,target:'feed',event:'feedOpened',copy:'再按「餵食」，準備替鼠魚選擇食物。'},
 {task:2,target:'feed-small',event:'selected:small',copy:'選擇「小型魚飼料」。看看還剩幾份，以及哪些魚會吃。'},
 {task:2,target:'tank',event:'fed:small',copy:'點一下魚缸上方的水面，放入小型魚飼料。不用點中鼠魚。',success:'很好！現在你知道怎麼替不同的魚兒選擇飼料了。'},
 {task:3,target:'more-menu',event:'fishOpened',copy:'按「更多」→「我的魚兒」，選一條魚，看看牠的飽足度、成長進度和適合的飼料。'},
 {task:4,target:'tutorial-coin-target',event:'coinCollected',copy:'魚兒吃飽後，會慢慢帶來金幣。點一下魚缸裡的金幣，就能收起來。',success:'做得好！收集金幣後，就能購買飼料、新魚和裝飾。'},
 {task:5,target:'shop',event:'shopOpened',copy:'飼料快用完了，就到商店補充吧！先按「商店」。'},
 {task:5,target:'tab-feed',shopTab:'feed',event:'feedShopOpened',copy:'選擇「飼料」分頁，看看每包價格和現有庫存。'},
 {task:5,target:'buy-feed-general',shopTab:'feed',event:'feedBought',copy:'選一種魚兒會吃的飼料，按「購買」，看看數量有沒有增加。',success:'現在你會自己補充飼料了！飼料快用完時，記得再來商店補充。'},
 {task:6,target:'shop',event:'shopOpened',copy:'除了原本的魚兒，也可以到商店買新魚。我們一起試試吧！'},
 {task:6,target:'tab-fish',shopTab:'fish',event:'fishShopOpened',copy:'選擇「魚兒」分頁，看看目前等級已解鎖的魚和價格。'},
 {task:6,target:'tutorial-fish-buy',shopTab:'fish',event:'fishBought',copy:'挑一條已解鎖的魚，按「購買」，幫牠取名字，再確認購買。每個魚缸都有數量上限，升級後才能養更多魚。',success:'新魚加入了！記得照顧牠，讓水族箱越來越熱鬧。'},
 {task:7,target:'shop',event:'shopOpened',copy:'除了養魚，也可以買水草、石頭和其他裝飾。先按「商店」看看吧！'},
 {task:7,target:'tab-decor',shopTab:'decor',event:'decorShopOpened',copy:'按一下「布置」，看看可以放進水族箱的裝飾。'},
 {task:7,target:'tutorial-decor-buy',shopTab:'decor',event:'decorBought',copy:'選一件喜歡的裝飾，按「購買並放置」，就能放進魚缸。先從小水草試試看吧！',success:'裝飾放好了！現在試著調整它的位置。'},
 {task:7,target:'tutorial-edit',event:'decorEditing',copy:'按「調整布置」，再選取一件裝飾。'},
 {task:7,target:'decor-handles',event:'decorMoved',copy:'選一件裝飾，把它拖到別的位置。也可以按左右箭頭移動。',success:'完成了！以後你可以自由布置自己的水族箱。'},
 {task:8,target:'more-menu' ,event:'observationOpened',copy:'按「更多」→「觀察魚兒」，認識魚的身體構造與呼吸。',success:'恭喜你完成新手教學！記得餵食、觀察魚兒、收集金幣，讓你的水族箱慢慢成長。'}
];
function create({getState,commit,notify,grant,ensureFeeding,prepareCoin,prepareFish,prepareFood,prepareDecor,prepareEditing,reviewPurchase}){
 const $=id=>document.getElementById(id);let active=false,lastLocated='';
 const welcome=document.createElement('dialog');welcome.id='tutorial-welcome';document.body.append(welcome);
 const coinTarget=document.createElement('button');coinTarget.id='tutorial-coin-target';coinTarget.hidden=true;coinTarget.type='button';coinTarget.textContent='點這枚金幣';document.querySelector('.tank-viewport').append(coinTarget);
 const success=document.createElement('p');success.id='onboarding-success';success.hidden=true;$('onboarding-copy').after(success);
 function expects(event){const o=getState().onboarding;return active&&!o.completed&&o.welcomed&&steps[o.step]?.event===event;}
 function record(event){const o=getState().onboarding;if(!expects(event))return false;const key=keys[o.step];if(!o.events.includes(key))o.events.push(key);const n=keys.findIndex(k=>!o.events.includes(k));o.step=n<0?keys.length:n;o.completed=o.step===keys.length;if(o.completed){o.everCompleted=true;if(!o.review&&!getState().gifts.includes('tutorialComplete'))getState().gifts.push('tutorialComplete');}return true;}
 function finish(previous,advanced,options={}){if(!advanced)return false;render();const text=options.viewOnly?'已看過購買流程，現在繼續下一項任務。':steps[previous]?.success||'';success.textContent=text;success.hidden=!text||getState().onboarding.completed;if(text&&getState().onboarding.completed)notify(text);return true;}
 function render(){
  $('tutorial-dialog-copy')?.remove();$('tutorial-review-purchase')?.remove();$('tutorial-room-help')?.remove();coinTarget.hidden=true;
  const o=getState().onboarding,running=active&&!o.completed&&o.welcomed;$('onboarding').hidden=!running;
  document.querySelectorAll('.onboarding-highlight').forEach(e=>e.classList.remove('onboarding-highlight'));$('surface-cue').hidden=true;if(!running)return;
  const s=steps[o.step];$('onboarding-step').textContent=s.task+' / 8';$('onboarding-step').setAttribute('aria-label','第 '+s.task+' / 8 項任務');$('onboarding-title').textContent=tasks[s.task-1];
  let target=$(s.target),copy=s.copy;
  $('onboarding-gift').hidden=o.step!==3;$('onboarding-gift').parentElement.hidden=o.step!==3;$('onboarding-gift').textContent=o.review?'練習替鼠魚選飼料':'收下小型魚飼料 ×5 份';
  if([1,2,5,6].includes(o.step)&&$('feeding-hint').hidden&&!$('dialog').open)ensureFeeding([2,6].includes(o.step)?(o.step===2?'general':'small'):null);
  if([0,1,2,4,5,6].includes(o.step)&&!o.review)prepareFood(o.step<3?'general':'small');
  if(o.step===8){const coin=prepareCoin();if(coin){coinTarget.hidden=false;coinTarget.style.left=coin.x*100+'%';coinTarget.style.top=coin.y*100+'%';coinTarget.onclick=coin.collect;target=coinTarget;if(!$('fish-card').hidden){coinTarget.hidden=true;target=$('close-card');copy='先看看資料卡上的飽足度、成長和飼料，再按右上角 ×，回魚缸收金幣。';}}else copy='這一步暫時無法進行，請重新整理網頁。如果還是不行，請老師協助。';}
  if(s.shopTab){
   const tab=$('tab-'+s.shopTab),shopOpen=!!tab&&$('dialog').open;
   if(!shopOpen){target=$('shop');copy='再按「商店」，繼續剛才的'+(s.task===5?'飼料':s.task===6?'購魚':'布置')+'操作。';}
   else if(tab.getAttribute('aria-selected')!=='true'){target=tab;}
   else if(o.step===11){const suitable=[...document.querySelectorAll('[id^="buy-feed-"]')].find(b=>!b.disabled&&getState().fishes.some(f=>window.AquariumData.FOOD_FOR[f.species]===b.id.slice(9)));if(suitable)target=suitable;
    if(o.review){target=reviewPurchase('feed',()=>api.report('feedBought'));copy='複習時只查看價格、購買按鈕和庫存，不需要再次消費。';}}
   else if(o.step===14){const status=prepareFish();if(status?.review){target=reviewPurchase('fish',()=>api.report('fishBought',{viewOnly:true}));copy=o.review?'複習購魚流程：看解鎖狀態、價格和購買按鈕，不需要再次消費。':'魚缸都住滿了！這次先查看購魚流程。日後升級或移魚空出位置，再迎接新魚。';}
    else if(status?.move){target=status.move;copy='這個魚缸滿了！先換到還有空位的魚缸，再買新魚。';}
    else target=document.querySelector('.buy[data-species]:not(:disabled)');}
   else if(o.step===17){const status=prepareDecor();if(status?.review){target=reviewPurchase('decor',()=>api.report('decorBought',{viewOnly:true}));copy=o.review?'複習先看看商品與放置方式，不需要再次購買。接著練習移動裝飾。':'已經有布置或目前空間不足，這次直接使用現有裝飾練習，不必再購買。';}else {target=document.querySelector('[data-buy-decor="smallplant"]')||$('decor-category-plants');if(target?.id==='decor-category-plants')copy='先選「水草」分類，找找便宜的小水草。';}}
   if(shopOpen){const p=document.createElement('p');p.id='tutorial-dialog-copy';p.className='tutorial-shop-copy';p.textContent=s.task+' / 8 '+tasks[s.task-1]+' '+copy;$('dialog-content').prepend(p);}
  }
  if(o.step===18||o.step===19){const status=prepareEditing();target=status.target;if(status.copy)copy=status.copy;}
  if(s.task===3&&$('dialog').open){if($('roster')){target=$('roster');copy='按「我的魚兒」，就能找到正在照顧的魚。';}else if(document.querySelector('.roster-item')){target=document.querySelector('.roster-item');copy='點一條魚的名字，看看飽足度、成長進度與適合的飼料。';}}
  if(o.step===14&&$('purchase-fish-name')){target=$('purchase-fish-name');copy='幫新魚取個名字，再按「確認購買」。取消不會扣金幣。';}
  if($('purchase-see-fish')){target=$('purchase-see-fish');copy='新魚已加入！按「去看看牠」認識新朋友，再接續教學。';}
   if(s.task===8&&$('dialog').open&&$('more-observe')){target=$('more-observe');copy='按「觀察魚兒」，看看魚的外形與呼吸方式。';}
  if(o.review&&s.task<=2)copy+='（重新練習不會扣飼料，也不會重複送禮物。）';
  if($('dialog').open&&target&&!$('dialog').contains(target)){target=$('dialog-close');copy='先按視窗右上角 ×，回到魚缸，再繼續教學標示的操作。';}
  $('onboarding-copy').textContent=copy;target?.classList.add('onboarding-highlight');$('surface-cue').hidden=![2,6].includes(o.step);
  const signature=o.step+':'+target?.id+':'+$('dialog').open;if(signature!==lastLocated){lastLocated=signature;requestAnimationFrame(()=>{if(!target||target.closest('[hidden]'))return;const b=target.getBoundingClientRect();if(b.top<0||b.bottom>innerHeight)target.scrollIntoView({block:'nearest',behavior:'smooth'});});}
 }
 function openWelcome(){const review=getState().onboarding.review;welcome.innerHTML='<h2>'+ (review?'再練習八個養魚任務':'歡迎來到悠悠水族箱！')+'</h2><p>'+(review?'再練習餵魚、看魚兒、收金幣和逛商店。禮物不會重複領取。':'孔雀魚、金魚和鼠魚正在等你照顧！我們先學會餵食，再慢慢經營水族箱。')+'</p>'+(review?'':'<div class="gift-card">送你的第一份飼料<strong>綜合飼料 ×8 份</strong></div>')+'<div class="welcome-actions"><button id="tutorial-begin">'+(review?'開始複習':'收下飼料，開始餵魚！')+'</button></div>';
  $('tutorial-begin').onclick=()=>{if(!commit(()=>{if(!review)grant('starter');Object.assign(getState().onboarding,{welcomed:true,paused:false});}))return;welcome.close();render();};if(!welcome.open)welcome.showModal();}
 $('onboarding-gift').onclick=()=>{const n=getState().onboarding.step;if(!commit(()=>{if(!getState().onboarding.review)grant('smallLesson');record('smallGift');}))return;finish(n,true);};
 welcome.addEventListener('cancel',e=>e.preventDefault());
 const api={render,expects,record,finish,task(){return steps[getState().onboarding.step]?.task||0;},setActive(on){active=on;if(!on)welcome.close();const o=getState().onboarding;if(on&&!o.completed&&!o.welcomed)openWelcome();if(on&&o.welcomed&&[1,2,5,6].includes(o.step))ensureFeeding(o.step===2?'general':o.step===6?'small':null);render();},report(event,options={}){if(!expects(event))return false;const n=getState().onboarding.step;if(!commit(()=>record(event)))return false;return finish(n,true,options);},replay(){const o=getState().onboarding;if(!o.everCompleted){notify('先完成這次教學，就能從設定重新複習。');return;}if(!commit(()=>{getState().onboarding={...window.AquariumSave.newOnboarding(),everCompleted:true,review:true,hints:[...o.hints],supportAmounts:{...o.supportAmounts}};}))return;lastLocated='';this.setActive(true);},resume(){this.setActive(true);},coin(){const o=getState().onboarding;if(!active||o.coinHintShown)return;o.coinHintShown=true;notify('魚兒吃得飽，就會慢慢帶來金幣！看到金幣，點一下就能收取。');}};return api;
}
window.AquariumTutorial=Object.freeze({create,steps,tasks});
})();
