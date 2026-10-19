/* Gifts are persisted by the game transaction, never by replaying presentation. */
(() => {
'use strict';
const steps=[
 {title:'按下「餵食」',copy:'請先按魚缸下方的「餵食」，準備給魚兒吃東西。',target:'feed',event:'feedOpened'},
 {title:'選擇「綜合飼料」',copy:'請選「綜合飼料」。在這個遊戲裡，孔雀魚和金魚吃這種飼料。',target:'feed-general',event:'selected:general'},
 {title:'點一下魚缸上方的水面',copy:'選好飼料後，請點魚缸上方標示的水面，飼料就會掉進水裡。不用點魚兒，也不用再按一次「餵食」。',target:'tank',event:'fed:general',success:'成功投放飼料了！看看孔雀魚和金魚會不會游過來吃。'},
 {title:'試試另一種飼料',copy:'收下小型魚飼料 ×5 份，再試著餵餵看鼠魚。',target:'onboarding-gift',event:'smallGift'},
 {title:'再按一次「餵食」',copy:'請按魚缸下方的「餵食」，準備投放另一種飼料。',target:'feed',event:'feedOpened'},
 {title:'選擇小型魚飼料',copy:'請選「小型魚飼料」。在這個遊戲裡，鼠魚吃這種飼料。',target:'feed-small',event:'selected:small'},
 {title:'點水面，餵餵鼠魚',copy:'點一下魚缸上方標示的水面，放入小型魚飼料。不用點中鼠魚。',target:'tank',event:'fed:small',success:'太好了！你已經知道怎麼替不同魚兒選擇飼料了。'},
 {title:'看看你的魚兒',copy:'點魚缸裡的一隻魚，或按「我的魚兒」選擇魚兒。看看牠的飽足度、成長進度及適合的飼料。吃飽了，魚兒才會慢慢長大並帶來金幣。',target:'tank',event:'fishOpened'},
 {title:'打開商店',copy:'按魚缸下方的「商店」，準備購買飼料。',target:'shop',event:'shopOpened'},
 {title:'看看飼料商店',copy:'打開商店的「飼料」分頁，查看每包價格和目前庫存。',target:'tab-feed',event:'feedShopOpened'},
 {title:'購買一包飼料',copy:'挑一種目前魚兒能吃的飼料，按「購買」。購買成功後，庫存就會增加。',target:'buy-feed-general',event:'feedBought',success:'現在你會自己補充飼料了！以後飼料快用完時，記得到商店購買。'},
 {title:'觀察魚的構造與呼吸',copy:'關閉商店，再按「觀察魚兒」，看看魚的身體構造和呼吸方式。',target:'observe-review',event:'observationOpened',success:'新手教學完成！記得照顧魚兒、收取金幣，讓水族箱慢慢熱鬧起來。'}];
function create({getState,changed,notify,grant,ensureFeeding}){
 const $=id=>document.getElementById(id);let active=false,lastLocatedStep=-1;
 const welcome=document.createElement('dialog');welcome.id='tutorial-welcome';welcome.innerHTML='<h2>歡迎來到悠悠水族箱！</h2><p>這裡有孔雀魚、金魚和鼠魚，牠們正在等你照顧！我們先學會怎麼餵食，再慢慢認識其他功能。</p><div class="gift-card">第一份照顧禮物<strong>綜合飼料 ×8 份</strong></div><div class="welcome-actions"><button id="tutorial-begin">收下飼料，開始學習！</button></div>';document.body.append(welcome);
 function render(){document.getElementById('tutorial-dialog-copy')?.remove();const o=getState().onboarding,running=active&&!o.completed&&o.welcomed&&!o.paused;$('onboarding').hidden=!running;document.querySelectorAll('.onboarding-highlight').forEach(e=>e.classList.remove('onboarding-highlight'));$('surface-cue').hidden=true;if(!running)return;const s=steps[o.step];$('onboarding-step').textContent=(o.step+1)+' / '+steps.length;$('onboarding-title').textContent=s.title;$('onboarding-copy').textContent=s.copy;$('onboarding-gift').hidden=o.step!==3;$('onboarding-gift').parentElement.hidden=o.step!==3;$(s.target)?.classList.add('onboarding-highlight');$('surface-cue').hidden=![2,6].includes(o.step);if(o.step!==lastLocatedStep){lastLocatedStep=o.step;requestAnimationFrame(()=>{const target=$(s.target);if(!target||target.closest('[hidden]'))return;const bounds=target.getBoundingClientRect();if(bounds.top<0||bounds.bottom>innerHeight)target.scrollIntoView({block:'nearest',behavior:'smooth'});});}if(['tab-feed','buy-feed-general'].includes(s.target)&&$('dialog').open){const p=document.createElement('p');p.id='tutorial-dialog-copy';p.className='tutorial-shop-copy';p.textContent=s.copy;$('dialog-content').prepend(p);}}
 $('tutorial-begin').onclick=()=>{if(!grant('starter'))return;Object.assign(getState().onboarding,{welcomed:true,paused:false});welcome.close();changed();render();};
 $('onboarding-gift').onclick=()=>{if(grant('smallLesson'))api.report('smallGift');};
 welcome.addEventListener('cancel',e=>e.preventDefault());
 const api={render,setActive(on){active=on;if(!on)welcome.close();const o=getState().onboarding;if(on&&o.paused&&!o.completed){o.paused=false;changed();}if(on&&o.welcomed&&!o.paused&&[1,2,5,6].includes(o.step))ensureFeeding(o.step===2?'general':o.step===6?'small':null);render();if(on&&!o.completed&&!o.welcomed&&!o.paused&&!welcome.open)welcome.showModal();},report(event){const o=getState().onboarding;if(!active||o.completed||!o.welcomed||o.paused||steps[o.step].event!==event)return false;if(o.step===7&&!grant('fishCard'))return false;const s=steps[o.step];o.step++;if(o.step===12)o.completed=true;changed();render();if(s.success)notify(s.success);return true;},replay(){Object.assign(getState().onboarding,{step:0,completed:false,skipped:false,welcomed:false,paused:false});lastLocatedStep=-1;changed();this.setActive(true);},resume(){getState().onboarding.paused=false;const n=getState().onboarding.step;if([1,2,5,6].includes(n))ensureFeeding(n===2?'general':n===6?'small':null);changed();this.setActive(true);},coin(){const o=getState().onboarding;if(!active||o.coinHintShown)return;o.coinHintShown=true;changed();notify('魚兒吃得飽，就會慢慢帶來金幣！看到魚缸裡的金幣，點一下就能收取。');}};return api;
}
window.AquariumTutorial=Object.freeze({create,steps});
})();
