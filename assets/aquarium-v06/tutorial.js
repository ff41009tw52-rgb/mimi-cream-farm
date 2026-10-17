/* Gifts are persisted by the game transaction, never by replaying presentation. */
(() => {
'use strict';
const steps=[
 {title:'第一步：按下餵食！',copy:'先找到魚缸下方的「餵食」按鈕，按一下，準備給魚兒吃東西。',target:'feed',event:'feedOpened'},
 {title:'第二步：選擇飼料！',copy:'先選擇「綜合飼料」，孔雀魚和金魚都可以吃。不同魚兒有不同的飼料，要記得選擇適合牠們的食物。',target:'feed-general',event:'selected:general'},
 {title:'第三步：點一下魚缸的水面！',copy:'已經選好飼料了！現在請直接點一下魚缸裡的水面，飼料就會掉進水裡，魚兒會游過來吃。不是再按一次餵食，也不是按魚兒的身體，只要點魚缸的水面就可以了！',target:'tank',event:'fed:general',success:'成功了！你把飼料放進水裡了！再看看孔雀魚和金魚會不會游過來吃。'},
 {title:'再送你一份飼料！',copy:'你已經學會餵魚了！再送你小型魚飼料 ×5 份，這次試著餵餵看鼠魚吧！',target:'onboarding-gift',event:'smallGift'},
 {title:'替鼠魚準備食物',copy:'先按下真正的「餵食」按鈕。鼠魚吃小型魚飼料，和孔雀魚、金魚的飼料不同。',target:'feed',event:'feedOpened'},
 {title:'選擇小型魚飼料',copy:'請選擇「小型魚飼料」。記得先選好飼料，再點水面！',target:'feed-small',event:'selected:small'},
 {title:'再點一下魚缸水面',copy:'現在直接點魚缸裡的水面，送一份小型魚飼料給鼠魚。不用點中鼠魚。',target:'tank',event:'fed:small',success:'太好了！你已經知道怎麼替不同魚兒選擇飼料了。'},
 {title:'認識你的魚兒',copy:'點一下魚兒，或打開「我的魚兒」名單並選一隻，看看名字、飽足度和牠適合的食物。完成後送你 10 金幣！',target:'tank',event:'fishOpened'},
 {title:'到商店補充飼料',copy:'按下魚缸下方的「商店」。剛才送你的 10 金幣，可以用來補充飼料。',target:'shop',event:'shopOpened'},
 {title:'找到飼料商品',copy:'按商店的「飼料」分頁，看看每包數量、價格和目前庫存。',target:'tab-feed',event:'feedShopOpened'},
 {title:'買第一包飼料',copy:'選擇綜合飼料，按「購買」。買其他已解鎖、適合目前魚兒的飼料也可以。真的買成功才算完成喔！',target:'buy-feed-general',event:'feedBought',success:'現在你會自己補充飼料了！以後飼料快用完時，記得到商店購買。'},
 {title:'看看魚的科學祕密',copy:'關閉商店後，按「觀察魚兒」。這裡可以認識魚的身體構造，還能看到魚是怎麼呼吸的。',target:'observe-review',event:'observationOpened',success:'你已經學會經營自己的水族箱了！慢慢養魚，享受你的小小水世界。'}];
function create({getState,changed,notify,grant,ensureFeeding}){
 const $=id=>document.getElementById(id);let active=false;
 const welcome=document.createElement('dialog');welcome.id='tutorial-welcome';welcome.innerHTML='<h2>歡迎來到悠悠水族箱！</h2><p>這裡有孔雀魚、金魚和鼠魚，牠們正在等你照顧！我們先學會怎麼餵食，再慢慢認識其他功能。</p><div class="gift-card">第一份照顧禮物<strong>綜合飼料 ×8 份</strong></div><div class="welcome-actions"><button id="tutorial-begin">收下飼料，開始學習！</button><button id="tutorial-skip">跳過教學，直接遊玩</button></div>';document.body.append(welcome);
 function render(){document.getElementById('tutorial-dialog-copy')?.remove();const o=getState().onboarding,running=active&&!o.completed&&o.welcomed&&!o.paused;$('onboarding').hidden=!running;document.querySelectorAll('.onboarding-highlight').forEach(e=>e.classList.remove('onboarding-highlight'));$('surface-cue').hidden=true;if(!running)return;const s=steps[o.step];$('onboarding-step').textContent=(o.step+1)+' / '+steps.length;$('onboarding-title').textContent=s.title;$('onboarding-copy').textContent=s.copy;$('onboarding-action').textContent='找到操作位置';$('onboarding-gift').hidden=o.step!==3;$(s.target)?.classList.add('onboarding-highlight');$('surface-cue').hidden=![2,6].includes(o.step);if(['tab-feed','buy-feed-general'].includes(s.target)&&$('dialog').open){const p=document.createElement('p');p.id='tutorial-dialog-copy';p.className='tutorial-shop-copy';p.textContent=s.copy;$('dialog-content').prepend(p);}}
 function skip(){if(!grant('starter')||!grant('smallLesson'))return;Object.assign(getState().onboarding,{step:12,completed:true,skipped:true,welcomed:true,paused:false});welcome.close();changed();render();}
 $('tutorial-begin').onclick=()=>{if(!grant('starter'))return;Object.assign(getState().onboarding,{welcomed:true,paused:false});welcome.close();changed();render();};$('tutorial-skip').onclick=skip;$('onboarding-skip').onclick=skip;
 $('onboarding-gift').onclick=()=>{if(grant('smallLesson'))api.report('smallGift');};
 welcome.addEventListener('cancel',()=>{getState().onboarding.paused=true;changed();render();});$('onboarding-pause').onclick=()=>{getState().onboarding.paused=true;changed();render();notify('教學已暫停，到設定可以接續。');};
 $('onboarding-action').onclick=()=>{const o=getState().onboarding;if(o.completed)return;const e=$(steps[o.step].target);e?.scrollIntoView({block:'center',behavior:'smooth'});e?.focus({preventScroll:true});};
 const api={render,setActive(on){active=on;if(!on)welcome.close();const o=getState().onboarding;if(on&&o.welcomed&&!o.paused&&[1,2,5,6].includes(o.step))ensureFeeding(o.step===2?'general':o.step===6?'small':null);render();if(on&&!o.completed&&!o.welcomed&&!o.paused&&!welcome.open)welcome.showModal();},report(event){const o=getState().onboarding;if(!active||o.completed||!o.welcomed||o.paused||steps[o.step].event!==event)return false;if(o.step===7&&!grant('fishCard'))return false;const s=steps[o.step];o.step++;if(o.step===12)o.completed=true;changed();render();if(s.success)notify(s.success);return true;},replay(){Object.assign(getState().onboarding,{step:0,completed:false,skipped:false,welcomed:false,paused:false});changed();this.setActive(true);},resume(){getState().onboarding.paused=false;const n=getState().onboarding.step;if([1,2,5,6].includes(n))ensureFeeding(n===2?'general':n===6?'small':null);changed();this.setActive(true);},coin(){const o=getState().onboarding;if(!active||o.coinHintShown)return;o.coinHintShown=true;changed();notify('魚兒帶來金幣了！點一下就能收取。');}};return api;
}
window.AquariumTutorial=Object.freeze({create,steps});
})();
