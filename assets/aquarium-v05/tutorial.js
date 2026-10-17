/* Only explicit successful game actions can advance the four steps. No simulation clock. */
(() => {
'use strict';
const steps=[
 {title:'餵餵魚兒',copy:'按「餵食」，再點一下魚缸水面，送上一些飼料。',action:'準備餵食',target:'feed',event:'fed',success:'成功了！魚兒會慢慢游過來吃東西。'},
 {title:'認識魚兒',copy:'點一下水族箱裡的魚，看看牠的名字和飽足度。也可以打開魚兒名單。',action:'打開魚兒名單',target:'tank',event:'fishOpened',success:'原來每隻魚都有自己的名字、個性和成長進度！'},
 {title:'逛逛商店',copy:'打開商店，看看有哪些魚兒和裝飾。',action:'前往商店',target:'shop',event:'shopOpened',success:'以後收集更多金幣，就能讓水族箱更熱鬧！'},
 {title:'觀察魚兒',copy:'按「觀察魚兒」，看看魚的身體構造和呼吸方式。',action:'前往觀察',target:'observe-review',event:'observationOpened',success:'你已經認識主要玩法，可以開始自由養魚了！'}];
function create({getState,changed,notify,actions}){
 const $=id=>document.getElementById(id);let active=false;
 const welcome=document.createElement('dialog');welcome.id='tutorial-welcome';welcome.innerHTML='<h2>歡迎來到你的水族箱！</h2><p>這裡有幾隻魚兒等著你照顧。我們先一起試試餵食、認識魚兒，再去商店和觀察區看看吧！</p><div class="welcome-actions"><button id="tutorial-begin">開始新手教學</button><button id="tutorial-skip">跳過教學，直接遊玩</button></div>';document.body.append(welcome);
 function render(){const o=getState().onboarding;const running=active&&!o.completed&&o.welcomed&&!o.paused;$('onboarding').hidden=!running;document.querySelectorAll('.onboarding-highlight').forEach(e=>e.classList.remove('onboarding-highlight'));if(!running)return;const s=steps[o.step];$('onboarding-step').textContent=(o.step+1)+' / 4';$('onboarding-title').textContent=s.title;$('onboarding-copy').textContent=s.copy;$('onboarding-action').textContent=s.action;$(s.target).classList.add('onboarding-highlight');}
 function skip(){Object.assign(getState().onboarding,{step:4,completed:true,skipped:true,welcomed:true,paused:false});welcome.close();changed();render();}
 $('tutorial-begin').onclick=()=>{Object.assign(getState().onboarding,{welcomed:true,paused:false});welcome.close();changed();render();};$('tutorial-skip').onclick=skip;$('onboarding-skip').onclick=skip;
 welcome.addEventListener('cancel',()=>{getState().onboarding.paused=true;changed();render();});
 $('onboarding-pause').onclick=()=>{getState().onboarding.paused=true;changed();render();notify('教學已暫停。到設定按「接續新手教學」，就能接著做。');};
 $('onboarding-action').onclick=()=>{const o=getState().onboarding;if(active&&!o.completed&&!o.paused)actions[o.step]();};
 return {render,setActive(on){active=on;if(!on)welcome.close();render();const o=getState().onboarding;if(on&&!o.completed&&!o.welcomed&&!o.paused&&!welcome.open)welcome.showModal();},report(event){const o=getState().onboarding;if(!active||o.completed||!o.welcomed||o.paused||steps[o.step].event!==event)return false;const s=steps[o.step];o.step++;if(o.step===4)o.completed=true;changed();render();notify(s.success);return true;},replay(){Object.assign(getState().onboarding,{step:0,completed:false,skipped:false,welcomed:false,paused:false});changed();this.setActive(true);},resume(){getState().onboarding.paused=false;changed();this.setActive(true);},coin(){const o=getState().onboarding;if(!active||o.coinHintShown)return;o.coinHintShown=true;changed();notify('魚兒帶來金幣了！點一下就能收取。');}};
}
window.AquariumTutorial=Object.freeze({create});
})();
