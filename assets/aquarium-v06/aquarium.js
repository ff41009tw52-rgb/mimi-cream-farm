/* 悠悠水族箱 V0.6 — gift tutorial, schema 5 and shared multi-tank progression. */
(() => {
'use strict';
const {CONFIG,SPECIES,DECORATIONS,PERSONALITIES,TANK_TIERS,VARIANTS,ACHIEVEMENTS,FEEDS,FOOD_FOR,TANK_OFFERS}=window.AquariumData;
const {validate,personalityFor,snapX,nearestSnap}=window.AquariumSave;
const {buildPOI,tickEnvironment}=window.AquariumWorld;
let protectedBusy=false,practiceDecor=null,writerReady=false,writerPending=false;
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
const coinInterval=s=>s.coinInterval*CONFIG.COIN_SCALE;
const growthTime=s=>s.growthTime*CONFIG.GROWTH_SCALE;
const $=id=>document.getElementById(id), clamp=(v,a=0,b=100)=>Math.min(b,Math.max(a,v));
const rand=(a,b)=>a+Math.random()*(b-a), uid=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const residentStage=f=>SPECIES[f.species].category?['幼體','成長中','成體'][stage(f.growth)]:stageName(f.growth);
const stage=g=>g>=100?2:g>=35?1:0, stageName=g=>['幼魚','亞成魚','成魚'][stage(g)];
const timeLabel=t=>new Date(t).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false});
const canvas=$('tank'), ctx=canvas.getContext('2d'), dialog=$('dialog');
let started=false,batching=false,simulatingBackground=false,lastPersistedState=null;
const tankContexts=new Map();
let state, W=1000,H=500,dpr=1, bg, runtime=new Map(), food=[],effects=[],selected=null,feeding=false;
let dirty=false,saveTimer=0,lastSaved=0,saveBlocked=false,conflict=false,simTime=0,feedAt=-99;
let uiAccumulator=0,saveAccumulator=0,lastFrame=0,hiddenAt=0,toastTimer,dialogMode='',resetStep=0;
const diagnostics={backgroundBuilds:0,backgroundMs:0,writes:0,eaten:0,spawned:0,frames:0,frameMax:0,costTotal:0,costMax:0,bursts:0,pauses:0,discoveries:0,sounds:0,environmentVisits:0,environmentSeconds:0,variantUnlocks:0,achievementCompletions:0,achievementRewards:0};
let creatureCategory='all';
let audioCtx=null,audioLast=-99,audioEatLast=-99,shopTab='fish',decorCategory='plants',newFishFocus=null;
let middleground,foreground,poiCache={byId:new Map(),bySpecies:{}},editing=false,editSelection=null,drag=null,editPreview=null,editCacheDirty=false;
const shopVariants=new Map(),editorHandles=new Map();
const session=CONFIG.PLAYTEST?{version:'0.6',elapsedSeconds:0,first:{feed:null,fish:null,shop:null,buy:null,place:null},counts:{feed:0,shop:0,buy:0,place:0},onboardingCompleted:false,jsErrors:0,frames:0,longFrames:0,frameMsTotal:0}:null;
const levelFor=x=>CONFIG.LEVEL_XP.reduce((l,v,i)=>x>=v?i+1:l,1);
const zones={left:'左側',center:'中央',right:'右側'};

function newFish(species,index=0,variant='normal'){const s=SPECIES[species],id=uid();return {id,species,personality:personalityFor(id,species),variant,playSeconds:0,adultRecorded:false,name:s.nickname+(index?` ${index+1}`:''),hunger:68,growth:0,growthStage:'幼魚',size:window.AquariumAppearance.size(species,0),mood:'開心',createdAt:Date.now(),coinProgress:coinInterval(s)*rand(.35,.55)};}
function starterExtras(fishes){
 const discovery={};for(const f of fishes){const d=discovery[f.species]||(discovery[f.species]={total:0,highestStage:0});d.total++;d.highestStage=Math.max(d.highestStage,stage(f.growth));}
 return {xp:0,level:1,careProgress:0,collection:discovery,purchasedDecorations:{river:1,smallplant:2,smallrock:1},placedDecorations:[{id:uid(),decoration:'smallplant',zone:'left',slot:'back1'},{id:uid(),decoration:'smallplant',zone:'right',slot:'back1'},{id:uid(),decoration:'smallrock',zone:'center',slot:'floor1'}],substrate:'river',soundEnabled:true,cleanReadyAt:0,mode:CONFIG.TEST_MODE?'test':'normal'};
}
function fresh(name){const fishes=['guppy','goldfish','cory'].map(k=>newFish(k));const next=window.AquariumSave.freshFromLegacy({schemaVersion:2,gameVersion:'0.2',savedAt:0,coins:CONFIG.START_COINS,waterQuality:100,tankCapacity:CONFIG.CAPACITY,fishes,drops:[],...starterExtras(fishes)},name);next.tankName=window.AquariumSave.tankName(name);next.onboarding=window.AquariumSave.newOnboarding();return next;}
function mood(f){return f.hunger<25?'肚子餓':f.hunger>=90?'吃得好滿足':'開心';}
function syncFish(f){f.growthStage=residentStage(f);f.size=window.AquariumAppearance.size(f.species,f.growth);f.mood=mood(f);}
function oldSnapshot(){return {...state,schemaVersion:CONFIG.SCHEMA_VERSION,gameVersion:CONFIG.GAME_VERSION,savedAt:Date.now(),fishes:state.fishes.map(f=>({...f})),drops:state.drops.map(c=>({...c}))};}
function snapshot(){return {...JSON.parse(JSON.stringify(state)),schemaVersion:5,gameVersion:'0.6',savedAt:Date.now()};}
function save(manual=false){
  clearTimeout(saveTimer);saveTimer=0;
  if(!started||saveBlocked||conflict){saveLabel();if(manual)toast('目前無法儲存進度。原存檔已保留。');return false;}
  let autoSaved=false;
  try{
    if(lastPersistedState!==null&&localStorage.getItem(CONFIG.SAVE_KEY)!==lastPersistedState){conflict=true;saveLabel();return false;}
    const payload=snapshot(),json=JSON.stringify(payload);
    localStorage.setItem(CONFIG.SAVE_KEY,json);diagnostics.writes++;
    state.savedAt=lastSaved=payload.savedAt;lastPersistedState=json;dirty=false;autoSaved=true;
    if(manual){localStorage.setItem(CONFIG.MANUAL_KEY,json);diagnostics.writes++;}
    saveLabel();persistSession();
    if(manual)toast('✓ 手動存檔完成！');
    return true;
  }catch(error){if(!autoSaved&&lastPersistedState){state=validate(JSON.parse(lastPersistedState));rebuildRuntime();updateUI();}$('save-status').textContent=autoSaved?'⚠ 自動存檔已完成，手動存檔失敗':'⚠ 目前無法儲存進度';$('save-status').classList.add('error');if(manual)toast(autoSaved?'最新進度已自動儲存；手動存檔未更新，請確認瀏覽器有可用空間。':'儲存失敗，請確認瀏覽器有可用空間。');return false;}
}
function markDirty(important=false){if(!started)return;if(batching){dirty=true;return;}dirty=true;if(important){save();return;}if(!saveTimer&&!saveBlocked&&!conflict)saveTimer=setTimeout(()=>save(),CONFIG.SAVE_DEBOUNCE_MS);}
function saveLabel(){const e=$('save-status');e.classList.toggle('error',saveBlocked||conflict);e.textContent=conflict?'⚠ 另一分頁已更新，請重新讀取':saveBlocked?'⚠ 原存檔已保留，暫停儲存':lastSaved?`✓ 已自動存檔 ${timeLabel(lastSaved)}`:'尚未儲存';}
function offline(seconds){
 const t=clamp(seconds,0,CONFIG.MAX_OFFLINE_TIME);if(t<=0)return;
 let reward=0,productive=0;
 if(!protectedTransaction(()=>{
  for(const f of allFish()){
   const before=stage(f.growth),result=window.AquariumEconomy.advance(f,t,{hungerRate:CONFIG.OFFLINE_HUNGER_PER_HOUR/3600,coinScale:CONFIG.COIN_SCALE,growthScale:CONFIG.GROWTH_SCALE});
   reward+=result.earned;productive=Math.max(productive,result.productive);syncFish(f);recordAdult(f);state.collection[f.species].highestStage=Math.max(state.collection[f.species].highestStage,stage(f.growth));if(stage(f.growth)!==before)gainXP(8,false);
  }
  const old=state.offlinePending;if(seconds>=60||reward||old)state.offlinePending={coins:Math.min(CONFIG.MAX_COINS,(old?.coins||0)+reward),seconds:(old?.seconds||0)+seconds,productive:(old?.productive||0)+productive,at:Date.now()};
 }))return;
 if(seconds>=60||state.offlinePending?.coins)showOffline();
}
function showOffline(){
 const q=state.offlinePending;if(!q||dialog.open||!state.onboarding.completed)return;
 const label=n=>{const m=Math.floor(n/60);return m>=60?`${Math.floor(m/60)} 小時 ${m%60} 分`:`${m} 分`;};
 openDialog('歡迎回來！','offline');
 $('dialog-content').append(paragraph('離開時間：'+label(q.seconds)),paragraph('有效產幣時間：'+label(q.productive)+'（每次最多累積 4 小時）'),paragraph('待領收益：'+q.coins+' 金幣','confirm-copy'),paragraph('離線每小時消耗 15% 飽足度。飽足度 0% 停產，請補充適合的飼料。'),paragraph('關閉視窗後，收益仍會保留在「更多 → 離線收益」。'));
 const claim=button('領取收益',()=>{
  if(!protectedTransaction(()=>{const pending=state.offlinePending;if(!pending)return false;const amount=Math.min(pending.coins,CONFIG.MAX_COINS-state.coins);state.coins+=amount;pending.coins-=amount;if(!pending.coins)state.offlinePending=null;}))return;
  dialog.close();updateUI();if(state.offlinePending)toast('金幣已達儲存上限，剩餘離線收益仍保留。');
 },'confirm');claim.id='offline-claim';$('dialog-content').append(claim);
}
function depositCoin(f,r,value){
 if(!value)return true;
 const tank=state.tanks.find(t=>t.id===state.activeTankId),total=state.drops.reduce((n,c)=>n+c.value,0);
 if(total+value>window.AquariumEconomy.capacity(tank))return false;
 if(state.drops.length<CONFIG.MAX_DROPS)state.drops.push({id:uid(),x:clamp(r.x,.06,.94),y:clamp(r.y-.07,.13,.82),value});
 else state.drops.reduce((a,b)=>a.value<=b.value?a:b).value+=value;
 diagnostics.spawned++;if(!simulatingBackground)tutorial.coin();markDirty();return true;
}
function initialize(){state=fresh();refreshHome();paintHomeFish();}
function makeRuntime(f,i=0){const s=SPECIES[f.species],x=rand(.14,.86),y=rand(...s.depth);return {visualSize:f.size,x,y,vx:(i%2?-.5:.5)*s.speed,vy:0,target:{x:rand(.15,.85),y},turn:i%2?-1:1,heading:0,phase:rand(0,6.28),wander:rand(2,6),pause:0,burst:0,direction:i%2?-1:1,position:{x,y},preferredDepth:s.depth,speed:s.speed,coinValue:s.values[stage(f.growth)],behavior:'巡遊',behaviorState:'explore',poi:null,poiWait:rand(12,32),poiRemaining:0,poiReached:false,hiddenAmount:0,environmentSeconds:0,environmentVisits:0};}
function allFish(){return state.tanks.flatMap(t=>t.fishes);}
function bindTank(t){const c=tankContexts.get(t.id);runtime=c.runtime;food=c.food;effects=c.effects;poiCache=c.poiCache;}
function rebuildRuntime(){allFish().forEach(syncFish);tankContexts.clear();const active=state.activeTankId;for(const t of state.tanks){state.activeTankId=t.id;tankContexts.set(t.id,{runtime:new Map(t.fishes.map((f,i)=>[f.id,makeRuntime(f,i)])),food:[],effects:[],poiCache:buildPOI(t.placedDecorations,DECORATIONS,decorLayout,W,H)});}state.activeTankId=active;bindTank(state.tanks.find(t=>t.id===active));selected=null;$('fish-card').hidden=true;}
function dismissToast(){const t=$('toast');clearTimeout(toastTimer);if(t.matches(':popover-open'))t.hidePopover();t.hidden=true;}
function toast(text,ms=6000){if(simulatingBackground)return;clearTimeout(toastTimer);const t=$('toast'),copy=document.createElement('span');t.classList.remove('decor-success');const host=dialog.open?dialog:document.body;if(t.parentElement!==host){if(t.matches(':popover-open'))t.hidePopover();host.append(t);}copy.textContent=text;const close=button('×',dismissToast,'toast-close');close.setAttribute('aria-label','關閉提示');t.replaceChildren(copy,close);t.hidden=false;try{t.showPopover();}catch(e){/* Older browsers use the fixed-position fallback. */}toastTimer=setTimeout(dismissToast,Math.max(ms,Math.min(14000,text.length*180)));}
function updateUI(){if(!state)return;checkFeatureHints();renderTankSelector();renderFeedChoices();
 $('tank-name').textContent=state.tankName;
 $('coins').textContent=state.coins.toLocaleString();
 const stored=state.drops.reduce((n,c)=>n+c.value,0),limit=window.AquariumEconomy.capacity(state.tanks.find(t=>t.id===state.activeTankId));let notice=$('coin-storage-note');if(!notice){notice=document.createElement('small');notice.id='coin-storage-note';notice.setAttribute('role','status');$('tank-name').closest('.tank-caption').append(notice);}notice.hidden=stored<limit-7;notice.textContent='金幣暫存已滿，點金幣收取後繼續累積';$('tank-name').title=stored>=limit-7?'金幣暫存已滿，點金幣收取後就會繼續累積。':'魚缸內待收金幣：'+stored+'（暫存上限 '+limit+'）';
 $('capacity').replaceChildren(document.createTextNode(`${state.fishes.length} `),Object.assign(document.createElement('small'),{textContent:`/ ${state.tankCapacity}`}));
 const nextTier=TANK_TIERS[state.tankTier],upgradeLink=$('tank-upgrade-shortcut');
 upgradeLink.textContent=nextTier?'升級魚缸 ↗':'魚缸已升滿';
 upgradeLink.disabled=!nextTier;
 upgradeLink.dataset.ready=String(!!nextTier&&state.level>=nextTier.level&&state.coins>=nextTier.price);
 upgradeLink.dataset.full=String(!!nextTier&&state.fishes.length>=state.tankCapacity);
 upgradeLink.title=nextTier?`下一級：${nextTier.capacity} 隻 · 養魚等級 ${nextTier.level} · ${nextTier.price} 金幣`:'目前已達到每缸最多 10 隻生物的上限';
 $('level').textContent=`養魚等級 ${state.level}`;const floor=CONFIG.LEVEL_XP[state.level-1],ceiling=CONFIG.LEVEL_XP[state.level];$('xp-bar').style.width=`${ceiling?(state.xp-floor)/(ceiling-floor)*100:100}%`;
 const next=Object.values(SPECIES).filter(s=>s.unlockLevel===state.level+1).map(s=>s.name);$('next-unlock').textContent=next.length?`下一級解鎖：${next.join('、')}`:`已解鎖全部魚種`;
 $('feed').disabled=editing;
 const claimable=ACHIEVEMENTS.filter(a=>state.achievements[a.id]?.completed&&!state.achievements[a.id].rewardClaimed).length;const more=$('more-menu');more.dataset.rewards=String(claimable);more.setAttribute('aria-label',claimable?`更多，有 ${claimable} 項成就可領獎`:'更多');let badge=$('achievement-badge');if(!badge){badge=document.createElement('small');badge.id='achievement-badge';more.append(badge);}badge.hidden=!claimable;badge.textContent=claimable?`${claimable} 項可領獎`:'';
 if(selected){const f=state.fishes.find(f=>f.id===selected);if(f){$('fish-name').textContent=f.name;$('fish-species').textContent=SPECIES[f.species].name;$('fish-stage').textContent=residentStage(f);const spec=SPECIES[f.species],payouts=spec.values,stages=spec.category?'幼體／成長中／成體':'幼魚／亞成魚／成魚';$('fish-growth-tip').textContent=`${stages}每次產幣 ${payouts[0]}／${payouts[1]}／${payouts[2]} 金幣，約每 ${Math.round(coinInterval(spec))} 秒一次。飽足度 0% 才停產；飽足度超過 25% 才會長大。`;$('observe-fish').textContent=SPECIES[f.species].category?'觀察這隻生物':'觀察這隻魚';$('fish-hunger').textContent=f.hunger>0&&f.hunger<1?'不到 1%':`${Math.round(f.hunger)}%`;$('fish-growth').textContent=`${Math.floor(f.growth)}%`;$('hunger-meter').value=f.hunger;$('growth-meter').value=f.growth;$('fish-mood').textContent=`目前狀態：${f.hunger<25?'肚子餓':runtime.get(f.id)?.behavior||mood(f)}`;$('fish-personality').textContent=`個性：${PERSONALITIES[f.personality].name}`;$('fish-food').textContent='食物：'+FEEDS[FOOD_FOR[f.species]].name;}}
}
function selectFish(id){if(editing)return;recordActivity('firstCard');metric('fish');selected=id;const f=state.fishes.find(f=>f.id===id),portrait=$('fish-portrait');portrait.replaceChildren();portrait.hidden=!f;if(!portrait.hidden)portrait.append(previewFish(f.species,false,f.variant));$('fish-card').hidden=false;updateUI();tutorial.report('fishOpened');}
function closeCard(){selected=null;$('fish-card').hidden=true;queueMicrotask(()=>tutorial.render());}
let selectedFeed=null;
function renderFeedChoices(){const root=$('feed-choices');if(!root)return;for(const id of Object.keys(FEEDS)){const b=$('feed-'+id);if(b){b.setAttribute('aria-pressed',String(selectedFeed===id));b.querySelector('small').textContent=`剩餘 ${state.feedInventory[id]} 份`;const names=[...new Set(state.fishes.filter(f=>FOOD_FOR[f.species]===id).map(f=>SPECIES[f.species].name))];b.querySelector('span').textContent=names.length?names.join('、'):'本缸目前沒有需要這種飼料的居民';}}$('feed-current').textContent=selectedFeed?`已選 ${FEEDS[selectedFeed].name} · 剩餘 ${state.feedInventory[selectedFeed]} 份`:'先選擇一種飼料';}
function setFeeding(on){feeding=on;selectedFeed=null;$('feed').setAttribute('aria-pressed',String(on));$('feeding-hint').hidden=!on;canvas.style.cursor=on?'crosshair':'pointer';if(on){closeCard();tutorial.report('feedOpened');}else $('surface-cue').hidden=true;renderFeedChoices();queueMicrotask(()=>tutorial.render());if(on&&innerWidth<=1050)requestAnimationFrame(()=>{if(feeding)$('feed-choices').scrollIntoView({block:'center'});});}
function selectFeed(id){if(!feeding||!FEEDS[id])return;selectedFeed=id;renderFeedChoices();tutorial.report('selected:'+id);$('surface-cue').hidden=false;canvas.focus({preventScroll:true});if(innerWidth<=1050)requestAnimationFrame(()=>{if(feeding)canvas.scrollIntoView({block:'start'});});}
function feed(x,confirmed=false){
 if(conflict||saveBlocked)return;if(!selectedFeed){toast('先選好飼料，再點魚缸上方的水面。');return;}
 const kind=selectedFeed;
 if((state.onboarding.review||!state.feedInventory[kind]&&state.gifts.includes(kind==='general'?'lessonGeneralRecovery':'lessonSmallRecovery'))&&tutorial.expects('fed:'+kind)){effects.push({x,y:.08,text:'練習投放',life:1,kind:'ripple'});tutorial.report('fed:'+kind);setFeeding(false);return;}
 if(tutorial.task()===1&&kind!=='general'||tutorial.task()===2&&kind!=='small'){toast('先選擇教學提示的飼料，再點水面。');return;}
 if(!state.feedInventory[kind]){toast('這種飼料用完了！可以到商店購買新的飼料。');$('feed-shop').hidden=false;return;}
 if(simTime-feedAt<CONFIG.FEED_COOLDOWN)return;if(food.length+3>CONFIG.MAX_FOOD){toast('魚缸裡還有飼料，等魚兒吃完再餵吧！');return;}
 if(!confirmed&&!state.fishes.some(f=>FOOD_FOR[f.species]===kind)){
  const tankId=state.activeTankId;
  confirmAction('這個魚缸沒有適合的魚兒','這個魚缸裡沒有魚兒會吃這種飼料，還要投放嗎？',()=>{if(state.activeTankId!==tankId||selectedFeed!==kind)return;dialog.close();feed(x,true);});$('dialog-content').querySelector('.confirm').textContent='仍要投放';return;
 }
 const previousStep=state.onboarding.step;let advanced=false;if(!protectedTransaction(()=>{state.feedInventory[kind]--;if(state.fishes.some(f=>FOOD_FOR[f.species]===kind)){state.activity??={};state.activity.firstFeed=true;}advanced=tutorial.record('fed:'+kind);}))return;
 feedAt=simTime;for(let i=0;i<3;i++)food.push({id:uid(),x:clamp(x+(i-1)*.017,.06,.94),y:.08+i*.006,bottom:0,phase:rand(0,7),kind});effects.push({x,y:.08,text:'',life:1,kind:'ripple'});sound('feed');metric('feed');tutorial.finish(previousStep,advanced);if(advanced)setFeeding(false);else renderFeedChoices();dirty=true;
}
function collect(c){
 if(conflict||saveBlocked||!state.drops.some(d=>d.id===c.id))return;
 const demonstration=c.id===demoCoinId(),beforeStep=state.onboarding.step;let advanced=false,reward=0;
 if(!protectedTransaction(()=>{
  const index=state.drops.findIndex(d=>d.id===c.id);if(index<0)return false;
  state.drops.splice(index,1);
  reward=demonstration&&(state.gifts.includes('demoCollected')||state.onboarding.review)?0:c.value;
  state.coins=clamp(state.coins+reward,0,CONFIG.MAX_COINS);if(reward){state.activity??={};state.activity.firstCoin=true;}
  if(demonstration&&!state.gifts.includes('demoCollected'))state.gifts.push('demoCollected');
  if(reward)gainXP(1,false);advanced=tutorial.record('coinCollected');
 }))return;
 effects.push({x:c.x,y:c.y,text:reward?'+'+reward:'練習完成',life:1.5});sound('coin');updateUI();tutorial.finish(beforeStep,advanced);tutorial.render();
}
function supportNotice(advanced){
 const message='金幣還差一點，已幫你補足這次需要的金額！',inline=$('onboarding-success');
 if(advanced&&inline){dismissToast();inline.textContent=message+' '+inline.textContent;inline.hidden=false;}else toast(message);
}
function supportKind(id){return id==='feedSupport'?'feed':id==='fishSupport'?'fish':'decor';}
function supportEvent(id){return supportKind(id)+'Bought';}
function supportAvailable(id,cost){return state.coins>=cost||(!state.onboarding.review&&!state.gifts.includes(id)&&tutorial.expects(supportEvent(id)));}
function applySupport(id,cost){
 if(state.coins>=cost)return 0;
 if(state.onboarding.review||state.gifts.includes(id)||!tutorial.expects(supportEvent(id)))return -1;
 const amount=cost-state.coins;state.coins+=amount;state.gifts.push(id);state.onboarding.supportAmounts[supportKind(id)]=amount;return amount;
}
function validFishName(raw){const name=raw.trim().normalize('NFC');if(!name)throw Error('請幫魚兒取個名字，不能只留空白。');if([...name].length>CONFIG.MAX_NAME)throw Error('名字最多 12 個字。');if(!/^[\p{L}\p{M}\p{N} _·・\-.'’()（）！!？?♡♥★☆]+$/u.test(name))throw Error('可使用中文、英文、數字、空格和常用名字符號。');return name;}
function buy(species){
 const s=SPECIES[species];if(!s||conflict||saveBlocked||protectedBusy)return;if((s.habitat||'freshwater')!==(activeTank().habitat||'freshwater')){shopMessage('請切換到適合這種生物的魚缸。');return;}
 if(state.level<s.unlockLevel){shopMessage('這種魚還沒解鎖，先提升養魚等級吧！');return;}
 if(state.fishes.length>=state.tankCapacity){shopMessage('魚缸住滿了！可以先升級，或到其他魚缸看看。');return;}
 if(state.onboarding.review&&tutorial.expects('fishBought')){tutorial.render();return;}
 const tankId=state.activeTankId;let variant=shopVariants.get(species)||'normal',completed=false;
 openDialog('迎接'+s.name,'purchase-name');
 const input=document.createElement('input');input.id='purchase-fish-name';input.type='text';input.className='name-input';input.value=s.nickname;input.maxLength=24;input.autocomplete='off';input.enterKeyHint='done';input.setAttribute('aria-label','魚兒名字，最多十二個字');
 const error=paragraph('','name-error');error.id='purchase-name-error';error.setAttribute('role','status');const form=document.createElement('form');form.className='purchase-form';const label=document.createElement('label');label.htmlFor=input.id;label.textContent='替新朋友取個名字';
 const actions=document.createElement('div');actions.className='confirm-actions';const cancel=button('取消',()=>{if(!completed)shop();});cancel.id='purchase-cancel';const confirm=button('確認購買',()=>form.requestSubmit(),'confirm');confirm.id='purchase-confirm';
 actions.append(cancel,confirm);let portrait=previewFish(species,false,variant);form.append(portrait);window.AquariumSpeciesGuide.identity(form,species);if(!s.category)appendPurchaseColors(form,species,variant,value=>{variant=value;shopVariants.set(species,value);portrait.replaceWith(portrait=previewFish(species,false,value));});form.append(paragraph('購買價格 · '+s.price+' 金幣','purchase-price'),label,input,paragraph('最多 12 個字，可用中文、英文、數字及常用名字符號。','dialog-note'),error,actions);$('dialog-content').append(form);
 form.addEventListener('submit',e=>{e.preventDefault();if(completed||confirm.disabled)return;let name;try{name=validFishName(input.value);}catch(err){error.textContent=err.message;input.focus();return;}confirm.disabled=true;const ok=completeFishPurchase(species,name,tankId,variant);if(ok)completed=true;else {confirm.disabled=false;error.textContent='還沒買成功。請確認金幣是否足夠、魚缸是否有空位，再試一次。';}});
 input.addEventListener('input',()=>{error.textContent='';});input.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.isComposing)e.preventDefault();});input.addEventListener('focus',()=>setTimeout(()=>input.isConnected&&input.scrollIntoView({block:'nearest'}),180));tutorial.render();
}
function appendPurchaseColors(root,id,current,onChange){
 const field=document.createElement('fieldset');field.className='purchase-colors';field.id='purchase-colors';const title=document.createElement('legend');title.textContent='幫你的新魚選一個顏色！';field.append(title);
 const colors=[['normal',{name:'自然配色',color:SPECIES[id].color,tail:SPECIES[id].tail}],...Object.entries(VARIANTS).filter(([,v])=>v.species===id&&v.basic),...Object.entries(VARIANTS).filter(([key,v])=>v.species===id&&!v.basic&&state.unlockedVariants.includes(key))];
 for(const [key,v]of colors){const b=button('',()=>{for(const other of field.querySelectorAll('button'))other.setAttribute('aria-pressed',String(other.dataset.variant===key));onChange(key);},'fish-color-swatch');b.dataset.variant=key;b.dataset.basic=String(key==='normal'||!!v.basic);b.setAttribute('aria-pressed',String(current===key));b.setAttribute('aria-label',v.name);const dot=document.createElement('span');dot.className='fish-color-dot';dot.style.background=`linear-gradient(135deg, ${v.color} 0% 55%, ${v.tail} 56% 100%)`;dot.setAttribute('aria-hidden','true');b.append(dot,document.createTextNode(v.name+(key!=='normal'&&!v.basic?' ✦':'')));field.append(b);}
 root.append(field,paragraph('特色配色是遊戲美術，與真實魚種的自然體色可能不同。','variant-note'));
}
function completeFishPurchase(species,name,tankId,variant){
 if(conflict||saveBlocked||protectedBusy)return;const speciesData=SPECIES[species];if(!speciesData)return;if((speciesData.habitat||'freshwater')!==(activeTank().habitat||'freshwater'))return false;
 if(state.activeTankId!==tankId){toast('魚缸已切換，請重新選擇新魚。');return false;}
 if(state.level<speciesData.unlockLevel){shopMessage('養魚等級還不夠，暫時不能買這種魚。');return;}
 if(state.fishes.length>=state.tankCapacity){shopMessage('魚缸住滿了！可以先升級，或到其他魚缸看看。');return;}
 if(variant!=='normal'&&(VARIANTS[variant]?.species!==species||!VARIANTS[variant]?.basic&&!state.unlockedVariants.includes(variant))){shopMessage('這個配色還沒解鎖。');return;}
 if(!supportAvailable('fishSupport',speciesData.price)){shopMessage('金幣還不夠，先回魚缸收集金幣吧。');return;}
 const beforeStep=state.onboarding.step;let f,advanced=false,subsidy=0;
 if(!protectedTransaction(()=>{
  subsidy=applySupport('fishSupport',speciesData.price);if(subsidy<0)return false;
  state.coins-=speciesData.price;const first=!state.collection[species],total=state.collection[species]?.total||0;
  if(VARIANTS[variant]?.basic&&!state.unlockedVariants.includes(variant))state.unlockedVariants.push(variant);
  f=newFish(species,total,variant);f.name=name;syncFish(f);state.fishes.push(f);
  const history=state.collection[species];state.collection[species]={total:Math.min(9999,total+1),highestStage:history?.highestStage||0,adults:history?.adults||0,variants:[...new Set([...(history?.variants||['normal']),variant])]};
  state.stats.purchases++;evaluateGoals(false);gainXP(first?12:2,false);advanced=tutorial.record('fishBought');
 })) return false;
 runtime.set(f.id,makeRuntime(f,state.fishes.length));metric('buy');sound('buy');updateUI();
 if(advanced){setFeeding(false);tutorial.finish(beforeStep,true);}
 function goSee(){dialog.close();if(state.activeTankId!==tankId)switchTank(tankId);setFeeding(false);newFishFocus={id:f.id,until:simTime+8};selectFish(f.id);requestAnimationFrame(()=>canvas.scrollIntoView({block:'nearest'}));}
 function keepShopping(){shopTab='fish';shop();}
 function purchaseActions(){const actions=document.createElement('div');actions.className='purchase-welcome-actions';const see=button('去看看牠',goSee,'confirm');see.id='purchase-see-fish';const keep=button('繼續逛商店',keepShopping);keep.id='purchase-keep-shopping';actions.append(see,keep);return actions;}
 function recognize(){openDialog('認識'+speciesData.name,'species-detail');const root=$('dialog-content');root.append(previewFish(species,false,variant));appendFishKnowledge(root,species);root.append(purchaseActions(),button('返回歡迎畫面',welcome,'back-button'));tutorial.render();}
 function welcome(){
  openDialog('歡迎'+speciesData.name+'加入水族箱！','purchase-success');const root=$('dialog-content');root.classList.add('species-welcome');
  root.append(previewFish(species,false,variant),paragraph('你取的名字：'+f.name,'welcome-nickname'));
  const fact=paragraph(speciesData.knowledge.fun,'welcome-fact');root.append(fact);
  const read=button(speciesData.category?'認識這隻生物':'認識這隻魚',recognize,'place-button');read.id='purchase-recognize';root.append(read,purchaseActions());
  if(advanced){
   const guide=paragraph(`新魚可以選色及命名。你的魚缸目前可以養 ${state.tankCapacity} 隻魚。點小居民數量旁的「升級魚缸」可以先看需要的等級和金幣，不會立刻扣錢。`,'tutorial-shop-copy');
   const preview=button('看看魚缸怎麼升級',()=>{tankMenu();tutorial.render();},'place-button');preview.id='tutorial-upgrade-preview';root.append(guide,preview);
  }
  if(subsidy)root.prepend(paragraph('金幣還差一點，已幫你補足這次需要的金額！','tutorial-shop-copy'));
  tutorial.render();
 }
 welcome();
 tutorial.render();return true;
}
function shopMessage(text){const e=$('shop-message');if(e){e.textContent=text;e.scrollIntoView({block:'nearest'});}else toast(text);}
function openDialog(title,mode){if(editing)finishEditing();closeCard();dialogMode=mode;$('dialog-title').textContent=title;$('dialog-content').replaceChildren();$('dialog-content').classList.remove('species-welcome');if(!dialog.open)dialog.showModal();}
function button(text,handler,cls=''){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.addEventListener('click',handler);return b;}
function shop(){if(!state.onboarding.completed)creatureCategory='all';if(editing)finishEditing();metric('shop');openDialog('商店','shop');renderShop();tutorial.report('shopOpened');}
function settings(){const expanded=document.querySelector('.save-tools')?.open||false;openDialog('設定','settings');const list=document.createElement('div');list.className='settings-list';
  function row(title,desc,label,fn,danger=false){const r=document.createElement('div');r.className='setting-row';const p=document.createElement('p');p.textContent=title;const small=document.createElement('small');small.textContent=desc;p.append(small);r.append(p,button(label,fn,danger?'danger':''));list.append(r);}
  row('手動存檔','另外存下目前的進度，遊戲也會繼續自動存檔。','存檔',()=>{if(save(true)){dialog.close();}});
  row('讀取手動存檔','回到上次按「存檔」時的遊戲進度。','讀檔',()=>confirmAction('讀取手動存檔？','讀取後，遊戲會回到上次手動存檔時的進度。確定要讀取嗎？',()=>loadSaved(true)));
  row('重新讀取自動存檔','回到最近一次自動存檔的進度。','讀取',()=>confirmAction('讀取自動存檔？','讀取後，尚未存檔的進度會消失。確定要讀取嗎？',()=>loadSaved(false)));
  row('重置遊戲','重新開始，魚兒與金幣都會回到最初。','重置',()=>{resetStep=1;confirmAction('確定要重新開始嗎？','重置後，將重新獲得三隻幼魚與 20 金幣；圖鑑與布置也會重新開始。',()=>{resetStep=2;confirmAction('最後確認：刪除目前進度','目前的魚、水族箱與金幣進度將被刪除，且無法復原。',reset,true);},true);},true);
  row('音效',state.soundEnabled?'柔和的操作音效已開啟。':'音效已關閉。',state.soundEnabled?'關閉':'開啟',()=>{state.soundEnabled=!state.soundEnabled;markDirty(true);settings();});


  row('水族箱名稱',state.tankName,'改名字',renameTank);
  row('接續新手教學','繼續未完成的操作教學。','接續',()=>{dialog.close();tutorial.resume();});
  row('重新觀看新手引導','從第一步開始，魚兒與進度都會保留。','重看',()=>{dialog.close();tutorial.replay();});
  row('返回首頁','先保存進度，之後可按繼續遊玩。','返回首頁',goHome);
  if(CONFIG.PLAYTEST)row('本次試玩摘要','只記錄本機匿名操作次數與時間。','匯出試玩摘要',exportSession);

  const note=document.createElement('p');note.className='dialog-note';note.textContent='遊戲會自動存檔。下次使用同一台裝置、同一個瀏覽器，按「繼續上次的遊戲」就能接著玩。請勿清除網站資料。';const saveTools=document.createElement('details');saveTools.className='save-tools';saveTools.open=expanded;const heading=document.createElement('summary');heading.textContent='存檔與進度';saveTools.append(heading);const advanced=document.createElement('div');advanced.className='settings-list';for(const r of [...list.children]){if(!['音效','水族箱名稱','接續新手教學','重新觀看新手引導','返回首頁','本次試玩摘要'].some(t=>r.querySelector('p').firstChild.textContent===t))advanced.append(r);}saveTools.append(advanced);$('dialog-content').append(list,note,saveTools);
}
function confirmAction(title,copy,fn,danger=false){openDialog(title,'confirm');const p=document.createElement('p');p.className='confirm-copy';p.textContent=copy;const actions=document.createElement('div');actions.className='confirm-actions';actions.append(button('取消',()=>{resetStep=0;dialog.close();}),button(danger?'確認重置':title==='確認移動魚兒？'?'確認移動':'確定讀取',fn,'confirm'+(danger?' danger':'')));$('dialog-content').append(p,actions);}
function loadSaved(manual){
  try{
    let text=localStorage.getItem(manual?CONFIG.MANUAL_KEY:CONFIG.SAVE_KEY);
    if(manual&&text){const current=localStorage.getItem(CONFIG.SAVE_KEY);if(current&&JSON.parse(current).saveId===JSON.parse(text).saveId)text=current;}
    if(navigator.locks&&!writerReady){toast('遊戲已在另一分頁開啟，請先關閉該分頁再繼續。');return;}
    if(!text){toast(manual?'還沒有手動存檔，先按一次存檔吧。':'還沒有自動存檔。');dialog.close();return;}
    const next=validate(JSON.parse(text));mergeRewardLedger(next);mergeGiftLedger(next);
    const wasBlocked=saveBlocked;
    clearTimeout(saveTimer);saveTimer=0;state=next;lastPersistedState=localStorage.getItem(CONFIG.SAVE_KEY);
    evaluateGoals(false);renderOnboarding();conflict=saveBlocked=false;
    lastSaved=state.savedAt;state.fishes.forEach(syncFish);rebuildRuntime();buildBackground();
    if(!manual)offline(Math.max(0,(Date.now()-state.savedAt)/1000));
    dirty=true;const saved=save();
    if(!saved)saveBlocked=wasBlocked;
    updateUI();dialog.close();
    if(!saved){if(saveBlocked)saveLabel();toast('已讀取備份，但目前無法儲存。原自動存檔已保留，請確認瀏覽器有可用空間後重試。',6000);return;}
    toast('已載入存檔，可以繼續照顧魚兒了。');
  }
  catch(e){if(!manual)saveBlocked=true;saveLabel();dialog.close();toast('這份存檔目前無法讀取，原資料已保留。',5000);}
}
async function reset(){if(resetStep!==2)return;resetStep=0;if(await activate(fresh(),{backup:'before_new'}))dialog.close();}

function moreMenu(){openDialog('更多功能','more');const list=document.createElement('div');list.className='more-grid';for(const [id,title,desc,fn]of [['more-observe','觀察生物','放大看魚兒和蝦蟹，也能複習魚的構造與呼吸',()=>{dialog.close();openObservation(selected);}],['roster','我的生物','查看飽足度、改名字或管理小居民',roster],['encyclopedia','生物圖鑑','收藏魚兒、蝦類與蟹類',encyclopedia],['tank-menu','我的魚缸','升級魚缸，安排喜歡的裝飾',tankMenu],['tutorial-edit','調整布置','移動魚缸內的裝飾',()=>{dialog.close();startEditing();}],['achievements','成就','查看進度與領取獎勵',achievements],['offline-income','離線收益','查看與領取保留的離線金幣',()=>{dialog.close();if(state.offlinePending)showOffline();else toast('目前沒有待領的離線收益。');}],['settings','設定','調整音效、重看教學或管理存檔',settings]]){const b=button('',fn,'more-item');b.id=id;const label=document.createElement('strong');label.textContent=id==='achievements'&&Number($('more-menu').dataset.rewards)?`成就 · ${$('more-menu').dataset.rewards} 項可領獎`:title;b.append(label,paragraph(desc));list.append(b);}$('dialog-content').append(list);tutorial.render();}
function fishMore(){const f=state.fishes.find(f=>f.id===selected);if(!f)return;openDialog(SPECIES[f.species].category?'更多生物資料':'更多魚兒資料','fish-more');const minutes=Math.max(0,Math.floor((Date.now()-f.createdAt)/60000)),root=$('dialog-content');root.append(residentPortrait(f),paragraph(`活動水層：${SPECIES[f.species].depthName}`),paragraph(`養育時間：${minutes>=60?Math.floor(minutes/60)+' 小時 '+minutes%60+' 分鐘':minutes+' 分鐘'}`),paragraph(`心情：${mood(f)}`),paragraph(`配色：${f.variant==='normal'?'普通配色':VARIANTS[f.variant].name}`),paragraph(PERSONALITIES[f.personality].desc));const manage=button(SPECIES[f.species].category?'管理生物':'管理魚兒',()=>manageFish(f.id),'place-button');manage.id='manage-fish';root.append(manage,button('回到個體資料',()=>{dialog.close();selectFish(f.id);},'back-button'));appendFishKnowledge(root,f.species);}

function manageFish(id){const f=state.fishes.find(f=>f.id===id);if(!f)return;openDialog(SPECIES[f.species].category?'管理生物':'管理魚兒','manage');$('dialog-content').append((SPECIES[f.species].category||SPECIES[f.species].form)?residentPortrait(f):paragraph(f.name+' · '+SPECIES[f.species].name),paragraph(allFish().length<=3?'目前所有魚缸合計只有三隻生物。請先購買新魚，才能送養其中一隻。':'送養後魚兒會離開魚缸，不會退還金幣；圖鑑紀錄保留，所有魚缸合計至少保留三隻生物。','dialog-note'));$('dialog-content').append(button('魚兒資料',()=>{dialog.close();selectFish(id);},'place-button'),button('改名字',()=>{selected=id;renameFish();},'place-button'),button('移動到其他魚缸',()=>moveFish(id),'place-button'));const b=button(SPECIES[f.species].category?'送養這隻生物（不退金幣）':'送養這隻魚（不退金幣）',()=>{selected=id;rehomeFish();},'place-button danger');b.id='rehome';b.disabled=allFish().length<=3;$('dialog-content').append(b,button('返回我的魚兒',roster,'back-button'));}
function roster(){
 openDialog('我的魚兒','roster');
 if(!state.fishes.length){const other=state.tanks.find(t=>t.fishes.length);$('dialog-content').append(paragraph('這個魚缸還沒有魚兒，快來迎接新朋友吧！'));if(other)$('dialog-content').append(button('查看 '+other.name+' 的魚兒',()=>{dialog.close();switchTank(other.id);roster();},'place-button'));}
 for(const f of state.fishes){
  const item=document.createElement('div');item.className='roster-manage-row';
  const view=button('',()=>{dialog.close();selectFish(f.id);},'roster-item');
  const name=document.createElement('span');name.textContent=`${f.name} · ${SPECIES[f.species].name}`;
  const detail=document.createElement('small');detail.textContent=`${residentStage(f)} · 飽足度 ${Math.round(f.hunger)}%`;
  if(f){view.classList.add('has-portrait');view.append(previewFish(f.species,false,f.variant));}
  view.append(name,detail);
  const manage=button('管理',()=>manageFish(f.id),'roster-manage');
  manage.setAttribute('aria-label','管理'+f.name);
  item.append(view,manage);$('dialog-content').append(item);
 }
 tutorial.render();
}
function gainXP(amount,notify=true){
 const before=state.level;state.xp=clamp(state.xp+Math.round(amount*CONFIG.XP_SCALE),0,1000000);state.level=Math.max(state.legacyLevelFloor,levelFor(state.xp));dirty=true;
 if(state.level>before){sound('level');if(notify)toast(`養魚等級升到 ${state.level}！${Object.values(SPECIES).filter(s=>s.unlockLevel>before&&s.unlockLevel<=state.level).map(s=>s.name).join('、')}可以購買了。`,4500);if(!batching&&dialog.open&&dialogMode==='shop')renderShop();}
}
function enableAudio(){try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});}catch(e){audioCtx=null;}}
function sound(kind){
 if(simulatingBackground||!state?.soundEnabled||!audioCtx||audioCtx.state!=='running'||simTime-audioLast<.08)return;if(kind==='eat'&&simTime-audioEatLast<.7)return;
 audioLast=simTime;if(kind==='eat')audioEatLast=simTime;
 const tones={feed:[450,330],eat:[610,670],coin:[760,950],buy:[470,690],level:[580,870]};const [start,end]=tones[kind]||tones.feed;
 try{const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),now=audioCtx.currentTime;osc.type='sine';osc.frequency.setValueAtTime(start,now);osc.frequency.exponentialRampToValueAtTime(end,now+.13);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(kind==='eat'?.018:.033,now+.014);gain.gain.exponentialRampToValueAtTime(.0001,now+.19);osc.connect(gain);gain.connect(audioCtx.destination);osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start(now);osc.stop(now+.21);diagnostics.sounds++;}catch(e){/* Audio support is optional; never stop simulation. */}
}
function paragraph(text,cls=''){const p=document.createElement('p');p.className=cls;p.textContent=text;return p;}
function appendFishKnowledge(root,id,collapsible=false){return window.AquariumSpeciesGuide.append(root,id,{collapsible});}
function previewFish(id,unknown=false,variant='normal'){
 const c=document.createElement('canvas'),crust=!!SPECIES[id].category,detailed=crust||!!SPECIES[id].form||id==='harlequin';
 c.className='fish-preview'+(crust?' crustacean-preview':detailed?' illustrated-preview':'');c.width=480;c.height=280;c.dataset.speciesArt=id;c.dataset.variant=variant;c.setAttribute('role','img');c.setAttribute('aria-label',unknown?'尚未發現的生物':SPECIES[id].name);
 const context=c.getContext('2d');context.scale(2,2);if(unknown)context.globalAlpha=.12;
 if(detailed){const b=window.AquariumFishArt.hitBounds[id],size=Math.min(21600/(b.right-b.left),11600/(b.bottom-b.top));drawFish(context,id,120-(b.left+b.right)*size/200,70-(b.top+b.bottom)*size/200,size,1,0,0,variant,{motion:'rest',idle:.7,gait:0});}
 else drawFish(context,id,120,76,SPECIES[id].shape==='angel'?88:100,1,0,.7,variant);
 return c;
}
function residentPortrait(f){const box=document.createElement('div');box.className='resident-portrait';box.append(previewFish(f.species,false,f.variant),paragraph(f.name+' · '+SPECIES[f.species].name,'fish-detail-name'));return box;}
function renderShop(){
 if(!dialog.open||dialogMode!=='shop')return;const root=$('dialog-content');root.replaceChildren();const tabs=document.createElement('div');tabs.className='tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','商店分類');
 for(const [id,label]of [['fish','魚兒'],['feed','飼料'],['decor','布置']]){const b=button(label,()=>{shopTab=id;renderShop();if(id==='feed')tutorial.report('feedShopOpened');if(id==='fish')tutorial.report('fishShopOpened');if(id==='decor')tutorial.report('decorShopOpened');tutorial.render();},'tab'+(shopTab===id?' active':''));b.id='tab-'+id;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(shopTab===id));tabs.append(b);}
 const intro=paragraph(`養魚等級 ${state.level} · ${state.coins} 金幣 · ${shopTab==='fish'?'魚兒、蝦類與蟹類都在這裡。遊戲共缸展示不代表真實混養建議。':shopTab==='feed'?'選擇適合魚兒的食物。':'購買後會自動放入魚缸。'}`,'shop-intro');intro.id='shop-message';intro.setAttribute('role','status');const grid=document.createElement('div');grid.className='shop-grid';grid.setAttribute('role','tabpanel');grid.setAttribute('aria-labelledby','tab-'+shopTab);root.append(tabs);const shortcuts=document.createElement('div');shortcuts.className='shop-shortcuts';shortcuts.append(button('我的魚缸',tankMenu,'place-button'));const available=ACHIEVEMENTS.filter(a=>state.achievements[a.id].completed&&!state.achievements[a.id].rewardClaimed).length;if(available)shortcuts.append(button(`成就有 ${available} 項可領獎`,achievements,'place-button'));if(shopTab==='decor')shortcuts.append(Object.assign(button('調整布置',()=>{if(tutorial.expects('decorEditing')){dialog.close();tutorial.render();}else startEditing();},'place-button'),{id:'shop-edit-decor'}));root.append(shortcuts,intro,grid);
 if(shopTab==='fish'){
  grid.classList.add('species-shop-grid');const filters=document.createElement('div');filters.className='decor-filters';for(const [id,label]of [['all','全部'],['fish','魚類'],['shrimp','蝦類'],['crab','蟹類']]){const b=button(label,()=>{creatureCategory=id;renderShop();},'decor-filter');b.dataset.creatureFilter=id;b.setAttribute('aria-pressed',String(creatureCategory===id));filters.append(b);}root.insertBefore(filters,grid);
  for(const [id,s]of Object.entries(SPECIES).filter(([,v])=>(v.habitat||'freshwater')===(activeTank().habitat||'freshwater')).filter(([,v])=>creatureCategory==='all'||(v.category||'fish')===creatureCategory).sort(([,a],[,b])=>Number(state.level<a.unlockLevel)-Number(state.level<b.unlockLevel)||a.unlockLevel-b.unlockLevel)){const locked=state.level<s.unlockLevel,card=document.createElement('article');card.className='shop-item'+(locked?' locked':'');const h=document.createElement('h3');h.textContent=s.name;const b=button(locked?`養魚等級 ${s.unlockLevel} 解鎖`:`購買 · ${s.price} 金幣`,()=>buy(id),'buy');b.disabled=locked;b.dataset.species=id;const preview=previewFish(id,false,shopVariants.get(id)||'normal');card.classList.add('creature-product');card.append(preview,h,paragraph(s.desc,'fish-brief'));const detail=button('詳細介紹',()=>{openDialog('認識'+s.name,'shop-species-detail');const root=$('dialog-content'),portrait=previewFish(id,false,shopVariants.get(id)||'normal');root.append(portrait);appendFishKnowledge(root,id);appendVariantChoices(root,id,portrait);const back=button('返回商店',()=>{shopTab='fish';shop();},'back-button');back.id='species-shop-back';root.append(back);tutorial.render();},'fish-detail');card.append(detail,b);grid.append(card);}
 }else if(shopTab==='feed'){renderFeedShop(grid);
 }else{
  const categories=document.createElement('div');categories.className='decor-filters';categories.setAttribute('aria-label','布置分類');for(const [key,label]of [['sand','底砂'],['plants',activeTank().habitat==='marine'?'珊瑚／海葵':'水草'],['nature','自然造景'],['special','特殊裝飾']]){const b=button(label,()=>{decorCategory=key;renderShop();},'decor-filter');b.id='decor-category-'+key;b.setAttribute('aria-pressed',String(decorCategory===key));categories.append(b);}root.insertBefore(categories,grid);
  for(const [id,d]of Object.entries(DECORATIONS).filter(([,d])=>d.category===decorCategory&&decorAllowed(d))){const card=document.createElement('article');card.className='shop-item decor-item';card.dataset.decoration=id;const p=document.createElement('canvas');p.className='fish-preview decor-preview';p.width=240;p.height=140;p.setAttribute('role','img');p.setAttribute('aria-label',d.name+'的商品預覽');drawDecorShopPreview(p,id);const h=document.createElement('h3');h.textContent=d.name;const owned=state.purchasedDecorations[id]||0,used=state.placedDecorations.filter(p=>p.decoration===id).length;const previewBox=document.createElement('div');previewBox.className='decor-showcase';previewBox.dataset.material=d.kind;previewBox.append(p);const category=document.createElement('span');category.className='decor-category';category.textContent=d.kind==='substrate'?'底砂材質':d.kind==='plant'?'水草布置':'魚缸擺件';previewBox.append(category);const status=paragraph(d.kind==='substrate'?(state.substrate===id?'目前使用中':owned?'已收藏':'尚未購買'):`已收藏 ${owned} · 可放置 ${owned-used}`,'shop-detail decor-stock');if(d.kind==='substrate'&&state.substrate===id)status.classList.add('is-using');card.append(previewBox,h,paragraph(d.desc,'decor-description'),...(d.playful?[paragraph('遊戲裝飾','game-decoration-note')]:[]),status);
   const action=button(d.kind==='substrate'&&owned?(state.substrate===id?'使用中':'換上底砂'):`${d.price} 金幣 · ${d.kind==='substrate'?'購買並換上':'購買並放置'}`,()=>buyDecoration(id),'buy');action.dataset.buyDecor=id;action.disabled=state.level<d.unlockLevel||d.kind==='substrate'&&state.substrate===id;if(state.level<d.unlockLevel){action.textContent='養魚等級 '+d.unlockLevel+' 解鎖';card.classList.add('locked');}card.append(action);
   if(d.kind!=='substrate'){const place=button('放入魚缸',()=>placementDialog(id),'place-button');place.hidden=owned<=used;place.disabled=owned<=used;place.dataset.placeDecor=id;card.append(place);}grid.append(card);
  }
  const legacyOwned=Object.entries(state.purchasedDecorations).filter(([id,n])=>n>0&&!decorAllowed(DECORATIONS[id]));if(legacyOwned.length){const box=document.createElement('details');const title=document.createElement('summary');title.textContent='原有收藏（其他水域）';box.append(title);for(const[id,n]of legacyOwned)box.append(paragraph(DECORATIONS[id].name+' ×'+n+' · 收藏保留，已擺放的物件不受影響。'));root.append(box);}
  if(state.placedDecorations.length){const placed=document.createElement('div');placed.className='placed-list';placed.append(paragraph('目前的布置','placed-title'));for(const item of state.placedDecorations){const row=document.createElement('div');row.className='placed-row';row.append(paragraph(`${DECORATIONS[item.decoration].name} · ${item.normX<.34?'左側':item.normX>.66?'右側':'中央'}`),button('收回裝飾',()=>{if(conflict)return;state.placedDecorations=state.placedDecorations.filter(d=>d.id!==item.id);buildBackground();markDirty(true);renderShop();},'text-button'));placed.append(row);}root.append(placed);}
 }
 tutorial.render();root.append(paragraph(shopTab==='fish'?'好好餵魚、收取金幣，養魚等級就會逐漸提升。':shopTab==='feed'?'飼料用完時，可以在這裡購買。先看看每包價格及庫存。':'按「調整布置」，就能移動魚缸裡的裝飾。','dialog-note'));
}
// Placement, support, ownership and event evidence form one recoverable transaction.
function decorAllowed(d){return !!d&&(!d.habitat||d.habitat==='both'||d.habitat===(activeTank().habitat||'freshwater'));}
function buyDecoration(id){
 if(conflict||saveBlocked||protectedBusy)return;const d=DECORATIONS[id];if(!d)return;if(!decorAllowed(d)){shopMessage('這件布置適合'+(d.habitat==='marine'?'海水缸':'淡水缸')+'，原本收藏與已擺放的布置都會保留。');return;}const owned=state.purchasedDecorations[id]||0;
 if(state.level<d.unlockLevel){shopMessage('養魚等級 '+d.unlockLevel+' 才能購買這件布置。');return;}
 if(state.onboarding.review&&tutorial.task()===7){shopMessage('這次只是練習，不必再花金幣。跟著提示看看商品就好。');return;}
 if(d.kind==='substrate'&&owned){if(!protectedTransaction(()=>{state.substrate=id;}))return;buildBackground();renderShop();shopMessage(`已換上${d.name}。`);return;}
 const lesson=tutorial.expects('decorBought')&&d.kind!=='substrate';
 if(owned>=99){shopMessage('這件裝飾的收藏數量已達上限。');return;}
 if(lesson&&!availableDecorPosition(id)){shopMessage('這裡暫時放不下。可以使用現有布置練習移動，不需要多花金幣。');tutorial.render();return;}
 if(!(lesson?supportAvailable('decorSupport',d.price):state.coins>=d.price)){shopMessage('金幣還不夠！先回魚缸收集金幣，再來購買。');return;}
 const previous=state.onboarding.step;let placed=false,advanced=false,subsidy=0;
 if(!protectedTransaction(()=>{
  subsidy=lesson?applySupport('decorSupport',d.price):0;if(subsidy<0)return false;
  state.coins-=d.price;state.purchasedDecorations[id]=owned+1;
  if(d.kind==='substrate'){state.substrate=id;placed=true;}else placed=placeDecoration(id);
  if(lesson&&!placed)return false;
  if(placed){state.activity??={};state.activity.firstDecor=true;}evaluateGoals(false);if(lesson&&placed)advanced=tutorial.record('decorBought');
 }))return;
 buildBackground();sound('buy');updateUI();
 if(advanced){dialog.close();tutorial.finish(previous,true);}else renderShop();
 const message=d.kind==='substrate'?`已換上${d.name}。`:placed?`已放入${d.name}！想換位置，可以按「調整布置」。`:`已購買${d.name}，暫時放在庫存。魚缸空間不足，可以收回裝飾或升級魚缸。`;
 if(subsidy)supportNotice(advanced);else if(!advanced)shopMessage(message);if(placed&&d.kind!=='substrate')placedNotice(id);
}
function placedNotice(id){toast('布置已放好！已放入'+DECORATIONS[id].name+'。如果想換位置，可以按「調整布置」。',8000);$('toast').classList.add('decor-success');$('toast').setAttribute('role','status');}
function availableDecorPosition(id){
 if(state.placedDecorations.length>=TANK_TIERS[state.tankTier-1].decorCapacity)return null;
 for(const lane of [0,1])for(const index of [2,13,4,11,6,9,0,15,1,14,3,12,5,10,7,8]){const candidate={decoration:id,normX:snapX(index),snapIndex:index,lane};if(canPlace(candidate))return candidate;}return null;
}
function placeDecoration(id){
 if(conflict||!decorAllowed(DECORATIONS[id])||(state.purchasedDecorations[id]||0)<=state.placedDecorations.filter(p=>p.decoration===id).length||state.placedDecorations.length>=TANK_TIERS[state.tankTier-1].decorCapacity)return false;
 const position=availableDecorPosition(id),item=position?{...position,id:uid()}:null;
 if(!item)return false;item.z=state.placedDecorations.length;state.placedDecorations.push(item);metric('place');return true;
}
function placementDialog(id){
 if(!placeDecoration(id)){shopMessage('魚缸目前放不下這件裝飾。它還在收藏裡，可以先收回其他裝飾，或升級魚缸。');return;}
 evaluateGoals();buildBackground();markDirty(true);updateUI();renderShop();placedNotice(id);
}
function encyclopedia(){openDialog('生物圖鑑','encyclopedia');const known=Object.keys(state.collection).length;const fishKnown=Object.keys(state.collection).filter(id=>!SPECIES[id].category).length;$('dialog-content').append(paragraph(`淡水魚 ${Object.keys(state.collection).filter(id=>!SPECIES[id].category&&SPECIES[id].habitat!=='marine').length} / 16 · 海水魚 ${Object.keys(state.collection).filter(id=>SPECIES[id].habitat==='marine').length} / 15 · 蝦蟹 ${known-fishKnown} / 4`,'shop-intro'),paragraph('淡水缸與海水缸分開展示；新增生物另有各自的生活水域。拳擊蟹採河口毛螯型，不表示適合純淡水。孔雀魚和黑摩利也能適應一定鹽度，但不表示牠們適合與海水魚混養。同樣生活在淡水中，不代表不同魚種一定適合混養。現實中能否混養，還須考慮水溫、體型、活動習性及魚缸大小；本遊戲的共同展示不代表真實飼養建議。','freshwater-guide'));const grid=document.createElement('div');grid.className='shop-grid encyclopedia-grid species-shop-grid';for(const [id,s]of Object.entries(SPECIES)){const history=state.collection[id],unlocked=state.level>=s.unlockLevel,card=document.createElement('article');card.className='shop-item'+(!history?' undiscovered':'');card.dataset.entry=id;const h=document.createElement('h3');h.textContent=s.name;card.append(previewFish(id,false,shopVariants.get(id)||allFish().filter(f=>f.species===id).at(-1)?.variant||history?.variants.at(-1)||'normal'),h,paragraph(s.category==='shrimp'?'蝦類':s.category==='crab'?'蟹類':'魚類','shop-detail'));
 appendFishKnowledge(card,id,true);if(history){const own=allFish().find(f=>f.species===id);if(own)card.append(button('科學觀察',()=>{const tank=state.tanks.find(t=>t.fishes.some(f=>f.id===own.id));dialog.close();if(tank.id!==state.activeTankId)switchTank(tank.id);openObservation(own.id);},'place-button'));else card.append(paragraph('曾經收藏過；再次飼養後可觀察動作。','dialog-note'));card.append(paragraph('遊戲食物：'+FEEDS[FOOD_FOR[id]].name),paragraph(s.desc),paragraph(`${s.depthName} · ${s.growthLabel}成長`,'shop-detail'),paragraph(`曾養 ${history.total} 隻 · 現有 ${allFish().filter(f=>f.species===id).length} 隻`,'collection-count'),paragraph(`最高養成：${(s.category?['幼體','成長中','成體']:['幼魚','亞成魚','成魚'])[history.highestStage]}`,'collection-stage'),button(`配色收藏 ${history.variants.length} / ${1+Object.values(VARIANTS).filter(v=>v.species===id).length}`,()=>variantCollection(id),'place-button'));}else card.append(paragraph(unlocked?'尚未收藏 · 已解鎖，可到商店迎接牠。':`養魚等級 ${s.unlockLevel} 解鎖`));grid.append(card);}$('dialog-content').append(grid);}
function renameFish(){const f=state.fishes.find(f=>f.id===selected);if(!f)return;openDialog('替魚兒取個名字','rename');const input=document.createElement('input');input.id='fish-new-name';input.type='text';input.value=f.name;input.maxLength=24;input.autocomplete='off';input.setAttribute('aria-label','新的魚兒名字');input.className='name-input';const note=paragraph('最多 12 個字，可用中文、英文、數字及常用名字符號。','dialog-note'),error=paragraph('','name-error');error.id='name-error';error.setAttribute('role','status');
 function apply(){if(conflict)return;let value;try{value=validFishName(input.value);}catch(e){error.textContent=e.message;return;}if(!protectedTransaction(()=>{const fish=allFish().find(q=>q.id===f.id);if(!fish)return false;fish.name=value;}))return;dialog.close();selectFish(f.id);toast('新名字已保存。');}
 const actions=document.createElement('div');actions.className='confirm-actions';actions.append(button('取消',()=>{dialog.close();selectFish(f.id);}),button('保存名字',apply,'confirm'));input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();apply();}});$('dialog-content').append(input,note,error,actions);input.focus();input.select();}
function rehomeFish(){const f=state.fishes.find(f=>f.id===selected);if(!f||allFish().length<=3||conflict)return;confirmAction('送養這隻魚兒？',`送養${f.name}後，牠會離開魚缸，圖鑑與最高養成紀錄仍會保留。送養不退金幣。`,()=>{if(!protectedTransaction(()=>{if(!state.fishes.some(q=>q.id===f.id)||allFish().length<=3)return false;state.fishes=state.fishes.filter(q=>q.id!==f.id);}))return;runtime.delete(f.id);updateUI();dialog.close();toast('已送養，圖鑑紀錄仍保留。');},false);$('dialog-content').querySelector('.confirm').textContent='確認送養';}
function exportSave(){try{const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`aquarium-v06-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){toast('目前無法匯出，請稍後再試。');}}
function chooseImport(){chooseFile();}

// Long-lived progression is separate from transient swimming targets.
function recordAdult(f){
 if(f.growth>=100&&!f.adultRecorded){f.adultRecorded=true;state.collection[f.species].adults=Math.min(state.collection[f.species].total,(state.collection[f.species].adults||0)+1);dirty=true;}
}
function recordActivity(id){if(!started||state.activity?.[id]||conflict||saveBlocked)return;if(protectedTransaction(()=>{state.activity??={};state.activity[id]=true;evaluateGoals(false);}))updateUI();}
function goalValue(a){
 const extras={designMove:Number(!!state.activity?.designMove),designColor:Number(!!state.activity?.designColor),threeColors:Math.max(0,...state.tanks.map(t=>window.AquariumDecorArt.distinctColors(t.placedDecorations))),designCount:Math.max(0,...state.tanks.map(t=>t.placedDecorations.length)),marineDecor:Math.max(0,...state.tanks.filter(t=>t.habitat==='marine').map(t=>new Set(t.placedDecorations.filter(d=>DECORATIONS[d.decoration].habitat==='marine').map(d=>d.decoration)).size))};if(Object.hasOwn(extras,a.metric))return extras[a.metric];
 const values={purchases:Math.max(0,state.stats.purchases-Object.entries(state.collection).filter(([id])=>SPECIES[id].category).reduce((n,[,c])=>n+c.total,0)),adults:Object.entries(state.collection).filter(([id])=>!SPECIES[id].category).reduce((n,[,c])=>n+c.adults,0),species:Object.keys(state.collection).filter(id=>!SPECIES[id].category).length,fish:state.stats.maxFish,decor:state.stats.maxDecor,plants:['smallplant','tallplant','moss'].filter(id=>state.tanks.some(t=>t.purchasedDecorations[id])).length,care:state.stats.careSeconds,companionship:Math.max(0,...allFish().map(f=>f.playSeconds)),tier:Math.max(...state.tanks.map(t=>t.tier))};const known=Object.keys(state.collection);Object.assign(values,{shrimp:known.filter(id=>SPECIES[id].category==='shrimp').length,crab:known.filter(id=>SPECIES[id].category==='crab').length,crustaceans:known.filter(id=>SPECIES[id].category).length,feedPurchases:Object.values(state.feedPurchases).reduce((a,b)=>a+b,0)});return values[a.metric]||Number(!!state.activity?.[a.metric])||0;
}
function unlockVariant(id,notify=true){if(state.unlockedVariants.includes(id))return;state.unlockedVariants.push(id);diagnostics.variantUnlocks++;dirty=true;if(notify)toast(`配色解鎖：${SPECIES[VARIANTS[id].species].name}・${VARIANTS[id].name}`,4500);}
function evaluateGoals(notify=true){
 state.stats.maxFish=Math.max(state.stats.maxFish,allFish().length);state.stats.maxDecor=Math.max(state.stats.maxDecor,...state.tanks.map(t=>t.placedDecorations.length));
 for(const a of ACHIEVEMENTS){const status=state.achievements[a.id];if(!status.completed&&goalValue(a)>=a.goal){status.completed=true;diagnostics.achievementCompletions++;dirty=true;if(notify)toast(`成就完成：${a.name}！可在「成就」領取。`,4000);}}
 for(const [id,v]of Object.entries(VARIANTS)){if(v.rule.type==='adult'&&(state.collection[v.rule.species]?.adults||0)>=v.rule.count)unlockVariant(id,notify);}
}
const rewardKey=(saveId=state.saveId)=>CONFIG.SAVE_KEY+'_rewards_'+saveId;
function readRewardLedger(saveId=state.saveId,key=rewardKey(saveId)){const text=localStorage.getItem(key);const ids=text?JSON.parse(text):[];if(!Array.isArray(ids)||ids.some(id=>!ACHIEVEMENTS.some(a=>a.id===id)))throw Error('成就領取紀錄目前無法讀取');return ids;}
function mergeRewardLedger(next=state,fromV3=false){
 const remembered=[...new Set([...readRewardLedger(next.saveId),...readRewardLedger(next.saveId,CONFIG.V5_KEY+'_rewards_'+next.saveId),...readRewardLedger(next.saveId,CONFIG.V4_KEY+'_rewards_'+next.saveId),...(!CONFIG.TEST_MODE?readRewardLedger(next.saveId,CONFIG.V3_KEY+'_rewards_'+next.saveId):[])])];for(const id of remembered){next.achievements[id]={completed:true,rewardClaimed:true};const reward=ACHIEVEMENTS.find(a=>a.id===id).reward;if(reward.variant&&!next.unlockedVariants.includes(reward.variant))next.unlockedVariants.push(reward.variant);}
 const ids=[...new Set([...remembered,...ACHIEVEMENTS.filter(a=>next.achievements[a.id].rewardClaimed).map(a=>a.id)])];if(fromV3||ids.length>remembered.length)localStorage.setItem(rewardKey(next.saveId),JSON.stringify(ids));
}
function rewardLabel(a){return [a.reward.coins?`${a.reward.coins} 金幣`:null,a.reward.variant?`${VARIANTS[a.reward.variant].name}配色`:null].filter(Boolean).join(' ＋ ');}
function achievements(){
 evaluateGoals(false);openDialog('我的成就','achievements');$('dialog-content').append(paragraph('從簡單到挑戰，完成成就就能領金幣或特殊配色！每項獎勵只能領一次。','shop-intro'));const list=document.createElement('div');list.className='achievement-list';
 const priority=a=>state.achievements[a.id].rewardClaimed?2:state.achievements[a.id].completed?0:1;
 for(const a of [...ACHIEVEMENTS].sort((a,b)=>priority(a)-priority(b))){const status=state.achievements[a.id],card=document.createElement('article');card.className='achievement-card'+(status.completed?' completed':'');card.dataset.achievement=a.id;card.dataset.status=status.rewardClaimed?'claimed':status.completed?'ready':'pending';const body=document.createElement('div');const h=document.createElement('h3');h.textContent=(status.completed?'✧ ':'')+a.name;let progress=Math.min(a.goal,goalValue(a));const label=['care','companionship'].includes(a.metric)?`${Math.floor(progress/60)} / ${a.goal/60} 分鐘`:`${Math.floor(progress)} / ${a.goal}`;const difficulty=a.metric==='crustaceans'?'進階':a.reward.coins>=60?'長期':a.goal>=12&&a.metric==='species'||a.goal>=7&&a.metric==='decor'?'進階':a.goal>=3&&['species','purchases'].includes(a.metric)||a.metric==='adults'&&a.goal>=2?'中等':'入門';body.append(h,paragraph(a.desc),paragraph(`${difficulty}挑戰 · ${status.completed?'已完成':label} · ${rewardLabel(a)}`,'achievement-detail'));const b=button(status.rewardClaimed?'已領取':status.completed?'領取獎勵':'慢慢來',()=>claimAchievement(a.id),'place-button');b.disabled=!status.completed||status.rewardClaimed;b.dataset.claim=a.id;card.append(body,b);list.append(card);}$('dialog-content').append(list);
}
// Missing historical amounts are unknown, not evidence of an old payment.
function grantRewardDifference(){
 const known=()=>ACHIEVEMENTS.filter(a=>state.achievements[a.id].rewardClaimed&&Object.hasOwn(state.rewardPaid||{},a.id)&&(state.rewardPaid[a.id]||0)<(a.reward.coins||0));
 if(!known().length)return;let total=0;
 if(protectedTransaction(()=>{for(const a of known()){const difference=(a.reward.coins||0)-state.rewardPaid[a.id],amount=Math.min(difference,CONFIG.MAX_COINS-state.coins);if(amount<=0)continue;state.coins+=amount;state.rewardPaid[a.id]+=amount;total+=amount;}})&&total)toast('已依領獎紀錄補上 '+total+' 金幣，原有進度和配色都保留。',7000);
}
function claimAchievement(id){
 if(conflict||saveBlocked)return;const a=ACHIEVEMENTS.find(a=>a.id===id),status=state.achievements[id];if(!a||!status.completed||status.rewardClaimed)return;
 const ids=readRewardLedger();if(ids.includes(id)){mergeRewardLedger();markDirty(true);achievements();return;}
 if(!protectedTransaction(()=>{state.achievements[id].rewardClaimed=true;state.rewardPaid??={};state.rewardPaid[id]=a.reward.coins||0;state.coins=clamp(state.coins+(a.reward.coins||0),0,CONFIG.MAX_COINS);if(a.reward.variant)unlockVariant(a.reward.variant);}))return;
 try{localStorage.setItem(rewardKey(),JSON.stringify([...ids,id]));}catch(e){/* Saved state and the journal retain the awarded amount. */}
 diagnostics.achievementRewards++;updateUI();achievements();toast('完成「'+a.name+'」！已領取 '+rewardLabel(a)+'。');
}
function tankMenu(){
 openDialog('我的魚缸','tank');const tier=TANK_TIERS[state.tankTier-1],next=TANK_TIERS[state.tankTier];const hero=document.createElement('div');hero.className='tier-hero';const h=document.createElement('h3');h.textContent=`魚缸等級 ${tier.tier} · ${tier.name}`;hero.append(h,paragraph(`可養 ${state.tankCapacity} 隻生物 · 可放 ${tier.decorCapacity} 件布置`));$('dialog-content').append(hero);
 const actions=document.createElement('div');actions.className='tank-actions';actions.append(button('調整布置',startEditing,'confirm'),button('成就',achievements,'place-button'));$('dialog-content').append(actions);
 if(next){const card=document.createElement('div');card.className='tier-next';const title=document.createElement('h3');title.textContent=`下一級魚缸：${next.name}`;const b=button(state.level<next.level?`養魚等級 ${next.level} 可升級`:`${next.price} 金幣 · 升級`,upgradeTank,'buy');b.id='upgrade-tank';b.disabled=state.level<next.level;card.append(title,paragraph(`升級後可養 ${next.capacity} 隻生物（目前 ${state.tankCapacity} 隻），最多可放 ${next.decorCapacity} 件布置。`),paragraph(`需要養魚等級 ${next.level} · ${next.price} 金幣。目前 ${state.coins} 金幣${state.coins<next.price?`，還差 ${next.price-state.coins} 金幣`:'，金幣足夠'}。${state.level<next.level?'等級還沒到，先照顧生物、收取金幣吧！':'等級條件已達成。'}`,'shop-detail'),b);$('dialog-content').append(card);}else $('dialog-content').append(paragraph('魚缸已升到最高等級，每缸最多可以養 10 隻魚。','dialog-note'));
 renderTankOffers();
}
function upgradeTank(){
 if(conflict||saveBlocked)return;const next=TANK_TIERS[state.tankTier];if(!next||state.level<next.level)return;if(state.coins<next.price){toast('金幣還不夠！多收集一些，就能升級魚缸。');return;}
 if(!protectedTransaction(()=>{state.coins-=next.price;state.tankTier=next.tier;evaluateGoals(false);if(!state.onboarding.hints.includes('upgrade'))state.onboarding.hints.push('upgrade');}))return;buildBackground();updateUI();tankMenu();sound('level');toast(`升級成功！現在最多可以養 ${state.tankCapacity} 隻魚兒和蝦蟹了！`,4500);
}
function appendVariantChoices(card,id,preview){
 const colors=Object.entries(VARIANTS).filter(([,v])=>v.species===id);if(!colors.length)return;const select=document.createElement('select');select.className='variant-select';select.setAttribute('aria-label',SPECIES[id].name+'配色');select.dataset.variantSpecies=id;select.append(Object.assign(document.createElement('option'),{value:'normal',textContent:'普通配色'}));for(const [key,v]of colors){const unlocked=v.basic||state.unlockedVariants.includes(key);select.append(Object.assign(document.createElement('option'),{value:key,textContent:unlocked?v.name:`🔒 ${v.name} · ${v.condition}`,disabled:!unlocked}));}
 select.value=shopVariants.get(id)||'normal';select.addEventListener('change',()=>{shopVariants.set(id,select.value);preview.replaceWith(preview=previewFish(id,false,select.value));});card.append(select);card.append(paragraph('配色只有外觀差異。','variant-note'));
}
function variantCollection(id){
 const s=SPECIES[id],c=state.collection[id];openDialog(`${s.name}的配色收藏`,'variants');const colors=[['normal',{name:'普通配色',condition:'第一次養過這種魚。'}],...Object.entries(VARIANTS).filter(([,v])=>v.species===id)];$('dialog-content').append(paragraph(`已發現配色 ${c?.variants.length||0} / ${colors.length}。解鎖後，可以在商店選擇。`,'shop-intro'));const grid=document.createElement('div');grid.className='shop-grid variant-grid';for(const [key,v]of colors){const owned=c?.variants.includes(key),unlocked=key==='normal'||v.basic||state.unlockedVariants.includes(key),card=document.createElement('article');card.className='shop-item';card.dataset.color=key;const h=document.createElement('h3');h.textContent=v.name;card.append(previewFish(id,!unlocked,key),h,paragraph(owned?'已收藏':unlocked?'已解鎖，還沒養過。':`🔒 ${v.condition}`));grid.append(card);}$('dialog-content').append(grid,button('回到魚類圖鑑',encyclopedia,'back-button'));
}
function canPlace(){return true;}
function editableDecorations(){return practiceDecor?[practiceDecor]:state.placedDecorations;}
const designHistory=[];
function rememberDesign(){designHistory.push({tank:state.activeTankId,placed:structuredClone(state.placedDecorations),substrateColor:activeTank().substrateColor||0});if(designHistory.length>30)designHistory.shift();}
function activeTank(){return state.tanks.find(t=>t.id===state.activeTankId);}
function undoDesign(){const old=designHistory.pop();if(!old||old.tank!==state.activeTankId)return;if(!protectedTransaction(()=>{state.placedDecorations=old.placed;activeTank().substrateColor=old.substrateColor;}))return;editSelection=state.placedDecorations.some(d=>d.id===editSelection)?editSelection:null;buildBackground();updateEditorLabel();}
function constrainDesign(item){
 const p=decorLayout({...item,id:'__bounds__'}),a=(item.rotation||0)*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a),corners=[[-p.width*.65,0],[p.width*.65,0],[-p.width*.65,-p.height*1.15],[p.width*.65,-p.height*1.15]].map(([x,y])=>({x:x*cs-y*sn,y:x*sn+y*cs}));
 const left=Math.min(...corners.map(v=>v.x)),right=Math.max(...corners.map(v=>v.x)),top=Math.min(...corners.map(v=>v.y)),bottom=Math.max(...corners.map(v=>v.y));
 return {...item,posX:clamp(p.x,Math.min(W/2,6-left),Math.max(W/2,W-6-right))/W,posY:clamp(p.y,Math.min(H/2,6-top),Math.max(H/2,H-6-bottom))/H};
}
function startEditing(id){
 if(conflict)return;
 if(!practiceDecor&&(state.onboarding.review&&tutorial.task()===7||!state.placedDecorations.length&&(tutorial.expects('decorEditing')||tutorial.expects('decorMoved'))))practiceDecor={id:'practice-decor',decoration:activeTank().habitat==='marine'?'smallrock':'smallplant',normX:snapX(7),snapIndex:7,lane:0};
 dialog.close();closeCard();setFeeding(false);editing=true;designHistory.length=0;editSelection=typeof id==='string'?id:null;editPreview=null;drag=null;
 for(const r of runtime.values()){r.poi=null;r.poiWait=Math.max(r.poiWait,15);r.pause=0;}
 $('edit-toolbar').hidden=false;$('design-workspace').classList.add('is-editing');resize();$('decor-handles').hidden=false;canvas.classList.add('editing');buildBackground();updateEditorLabel();updateUI();draw();tutorial.report('decorEditing');tutorial.render();
}
function finishEditing(){if(!editing)return;editing=false;practiceDecor=null;drag=null;editPreview=null;editSelection=null;$('edit-toolbar').hidden=true;$('design-workspace').classList.remove('is-editing');$('decor-handles').hidden=true;resize();canvas.classList.remove('editing');buildBackground();markDirty(true);updateUI();tutorial.render();}
let overlapChoices=[];
function selectDecoration(id){editSelection=id;updateEditorLabel();draw();}
function renderSwatches(root,id,value,select){const shades=window.AquariumDecorArt.swatches(id);root.replaceChildren(...shades.map(({name,hex},i)=>{const b=button('',()=>select(i),'design-swatch');b.dataset.color=String(i);b.style.setProperty('--swatch',hex);b.setAttribute('aria-label',name);b.title=name;b.setAttribute('aria-pressed',String(value===i));if(i===0)b.dataset.original='true';const label=document.createElement('span');label.textContent=i===0?'原':value===i?'✓':'';b.append(label);return b;}));}
function updateEditorLabel(){
 const items=editableDecorations(),item=items.find(d=>d.id===editSelection);$('edit-label').textContent=item?DECORATIONS[item.decoration].name:'點一下裝飾，就能拖動或修改';
 const rail=$('edit-thumbnails'),signature=items.map(i=>[i.id,i.color||0].join(':')).join('|');if(rail.dataset.signature!==signature){rail.dataset.signature=signature;rail.replaceChildren(...items.map((i,n)=>{const b=button('',()=>selectDecoration(i.id),'design-thumbnail');b.dataset.selectDecor=i.id;b.setAttribute('aria-label','選取第 '+(n+1)+' 件'+DECORATIONS[i.decoration].name);const c=document.createElement('canvas');c.width=108;c.height=84;window.AquariumDecorArt.draw(c.getContext('2d'),i.decoration,54,78,62,62,i.color||0);const name=document.createElement('span');name.textContent=(n+1)+'. '+DECORATIONS[i.decoration].name;b.append(c,name);return b;}));}
 for(const b of rail.children)b.setAttribute('aria-pressed',String(b.dataset.selectDecor===editSelection));
 for(const id of ['edit-left','edit-right','edit-up','edit-down','edit-store','edit-bottom','edit-front','edit-back','edit-flip','edit-scale','edit-rotation'])if($(id))$(id).disabled=!item||id==='edit-store'&&tutorial.expects('decorMoved');
 $('edit-undo').disabled=!designHistory.length;$('edit-overlap').disabled=overlapChoices.filter(id=>items.some(i=>i.id===id)).length<2;
 $('edit-color').hidden=!item;
 if(item){renderSwatches($('edit-color'),item.decoration,item.color||0,v=>changeDesign('color',v));$('edit-scale').value=item.scale||1;$('edit-rotation').value=item.rotation||0;$('edit-scale-value').textContent=Math.round((item.scale||1)*100)+'%';$('edit-angle-value').textContent=(item.rotation||0)+'°';$('edit-flip').setAttribute('aria-pressed',String(!!item.flip));}
 renderSwatches($('edit-sand-color'),state.substrate,activeTank().substrateColor||0,changeSandColor);
 for(const b of $('edit-planes').children){b.disabled=!item;b.setAttribute('aria-pressed',String((item?.plane||'middle')===b.dataset.plane));}
 for(const [id,h]of editorHandles){h.classList.toggle('selected',id===editSelection);const d=items.find(d=>d.id===id);h.style.zIndex=String(id===editSelection?100:(['back','middle','front'].indexOf(d?.plane||'middle')*26)+(d?.z??items.indexOf(d))+1);}
}
function syncEditorHandles(){
 if(!editing)return;const container=$('decor-handles'),ids=new Set(editableDecorations().map(d=>d.id));for(const [id,b]of editorHandles)if(!ids.has(id)){b.remove();editorHandles.delete(id);}
 for(const item of editableDecorations()){let b=editorHandles.get(item.id);if(!b){b=button('',()=>selectDecoration(item.id),'decor-handle');b.dataset.decorId=item.id;b.id='decor-handle-'+item.id;b.addEventListener('keydown',e=>{const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(dirs[e.key]){e.preventDefault();editSelection=item.id;nudgeDecoration(...dirs[e.key]);}});b.setAttribute('aria-label','選取'+DECORATIONS[item.decoration].name);b.addEventListener('pointerdown',e=>beginDecorDrag(e,item.id));b.addEventListener('pointermove',moveDecorDrag);b.addEventListener('pointerup',endDecorDrag);b.addEventListener('pointercancel',cancelDecorDrag);container.append(b);editorHandles.set(item.id,b);}
 const p=decorLayout(item);Object.assign(b.style,{left:(p.x-Math.max(44,p.width*1.3)/2)+'px',top:(p.y-Math.max(44,p.height*1.15))+'px',width:Math.max(44,p.width*1.3)+'px',height:Math.max(44,p.height*1.15)+'px',transform:'rotate('+(item.rotation||0)+'deg)',transformOrigin:'50% 100%',zIndex:String(item.id===editSelection?100:['back','middle','front'].indexOf(item.plane||'middle')*26+(item.z??state.placedDecorations.indexOf(item))+1)});}
}
function beginDecorDrag(e,id){if(!editing||conflict||e.button>0)return;e.preventDefault();e.stopPropagation();const item=editableDecorations().find(d=>d.id===id);if(!item)return;const p=decorLayout(item),r=canvas.getBoundingClientRect();overlapChoices=document.elementsFromPoint(e.clientX,e.clientY).map(el=>el.dataset?.decorId).filter(Boolean);editSelection=id;drag={id,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false,offsetX:(e.clientX-r.left)-p.x,offsetY:(e.clientY-r.top)-p.y};e.currentTarget.setPointerCapture(e.pointerId);updateEditorLabel();}
function moveDecorDrag(e){if(!drag||drag.pointerId!==e.pointerId)return;e.preventDefault();if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<4&&!drag.moved)return;drag.moved=true;const item=editableDecorations().find(d=>d.id===drag.id),r=canvas.getBoundingClientRect(),next=constrainDesign({...item,posX:(e.clientX-r.left-drag.offsetX)/W,posY:(e.clientY-r.top-drag.offsetY)/H});editPreview={...next,id:item.id,x:next.posX,y:next.posY};editCacheDirty=true;$('edit-label').textContent=DECORATIONS[item.decoration].name;}
function endDecorDrag(e){if(!drag||drag.pointerId!==e.pointerId)return;e.preventDefault();const moved=drag.moved,item=editableDecorations().find(d=>d.id===drag.id),next=editPreview?{...item,posX:editPreview.x,posY:editPreview.y}:null;drag=null;editPreview=null;if(moved&&next)commitDecorMove(item,next);editCacheDirty=false;buildBackground();updateEditorLabel();tutorial.render();}
function cancelDecorDrag(){drag=null;editPreview=null;editCacheDirty=false;buildBackground();updateEditorLabel();}
function nudgeDecoration(dx,dy=0){const item=editableDecorations().find(d=>d.id===editSelection);if(!item||conflict||saveBlocked)return;const p=decorLayout(item);commitDecorMove(item,constrainDesign({...item,posX:p.x/W+dx*.012,posY:p.y/H+dy*.018}));buildBackground();updateEditorLabel();tutorial.render();}
function commitDecorMove(item,next,kind='move'){
 if(!item||conflict||saveBlocked)return false;if(next.posX!==undefined){next.normX=clamp(next.posX,.04,.96);next.snapIndex=nearestSnap(next.normX);}if(JSON.stringify(item)===JSON.stringify(next))return false;
 const before=state.onboarding.step;let advanced=false;rememberDesign();
 if(!protectedTransaction(()=>{if(!practiceDecor)Object.assign(item,next);state.activity??={};if(kind==='move'){state.activity.designMove=true;advanced=tutorial.record('decorMoved');}if(kind==='color')state.activity.designColor=true;evaluateGoals(false);})){designHistory.pop();return false;}
 if(practiceDecor)Object.assign(practiceDecor,next);metric('place');tutorial.finish(before,advanced);return true;
}
function changeDesign(key,value){const item=editableDecorations().find(d=>d.id===editSelection);if(!item)return;let next={...item,[key]:value};if(['scale','rotation','flip'].includes(key))next=constrainDesign(next);commitDecorMove(item,next,key==='color'?'color':'transform');buildBackground();updateEditorLabel();}
function layerDesign(direction){const items=[...state.placedDecorations].sort((a,b)=>(a.z??state.placedDecorations.indexOf(a))-(b.z??state.placedDecorations.indexOf(b))),index=items.findIndex(i=>i.id===editSelection),to=clamp(index+direction,0,items.length-1);if(index<0||index===to)return;rememberDesign();[items[index],items[to]]=[items[to],items[index]];if(!protectedTransaction(()=>items.forEach((i,z)=>i.z=z)))designHistory.pop();buildBackground();updateEditorLabel();}
function changeSandColor(value){if((activeTank().substrateColor||0)===value)return;rememberDesign();if(!protectedTransaction(()=>{activeTank().substrateColor=value;}))designHistory.pop();buildBackground();updateEditorLabel();draw();}
function setupDesignToolbar(){
 const root=$('edit-toolbar'),aquarium=document.querySelector('.aquarium'),workspace=document.createElement('div');workspace.id='design-workspace';workspace.className='design-workspace';aquarium.before(workspace);workspace.append(aquarium,root);document.querySelector('.tank-viewport').append($('decor-handles'));
 root.setAttribute('aria-label','布置編輯工具');root.innerHTML=`<div class="design-heading"><strong>調整布置</strong><button id="edit-done">完成布置 ✓</button></div><p id="edit-label" aria-live="polite"></p><div class="design-selection"><div id="edit-thumbnails" class="design-thumbnails" aria-label="用圖片選取布置"></div><button id="edit-overlap" title="換選同一位置下方的布置">換選重疊物件</button></div><div id="edit-color" class="design-swatches" role="group" aria-label="物件配色"></div><div class="design-tabs" role="tablist" aria-label="布置工具"></div><div class="design-body"></div><div class="design-footer"></div>`;
 $('edit-done').onclick=finishEditing;$('edit-overlap').onclick=()=>{const valid=overlapChoices.filter(id=>editableDecorations().some(i=>i.id===id));selectDecoration(valid[(valid.indexOf(editSelection)+1)%valid.length]);};
 const body=root.querySelector('.design-body'),tabs=root.querySelector('.design-tabs'),panels={};
 for(const [id,name]of [['move','移動'],['shape','大小／旋轉'],['layer','前後景'],['sand','底砂色']]){const b=button(name,()=>activate(id),'design-tab');b.id='design-tab-'+id;b.setAttribute('role','tab');b.setAttribute('aria-controls','design-panel-'+id);tabs.append(b);const panel=document.createElement('div');panel.id='design-panel-'+id;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',b.id);panels[id]=panel;body.append(panel);}
 function activate(id){for(const [key,p]of Object.entries(panels)){p.hidden=key!==id;const t=$('design-tab-'+key);t.setAttribute('aria-selected',String(key===id));t.tabIndex=key===id?0:-1;}}
 tabs.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const ids=Object.keys(panels),i=ids.findIndex(id=>!panels[id].hidden),next=e.key==='Home'?0:e.key==='End'?ids.length-1:(i+(e.key==='ArrowRight'?1:-1)+ids.length)%ids.length;activate(ids[next]);$('design-tab-'+ids[next]).focus();};
 const add=(root,id,label,fn)=>{const b=button(label,fn);b.id=id;root.append(b);return b;};
 const arrows=document.createElement('div');arrows.className='design-arrows';panels.move.append(arrows);for(const [id,label,dx,dy]of [['up','↑',0,-1],['left','←',-1,0],['down','↓',0,1],['right','→',1,0]])add(arrows,'edit-'+id,label,()=>nudgeDecoration(dx,dy)).setAttribute('aria-label',({up:'向上',left:'向左',down:'向下',right:'向右'})[id]+'微調裝飾');
 add(panels.move,'edit-bottom','對齊底部',()=>{const i=editableDecorations().find(d=>d.id===editSelection);if(i)commitDecorMove(i,constrainDesign({...i,posY:.95}));buildBackground();updateEditorLabel();});
 function range(id,label,min,max,step,value,fn){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type='range';input.id=id;Object.assign(input,{min,max,step,value});const out=document.createElement('output');out.id=id==='edit-scale'?'edit-scale-value':'edit-angle-value';input.oninput=()=>{out.textContent=id==='edit-scale'?Math.round(input.value*100)+'%':input.value+'°';};input.onchange=()=>fn(Number(input.value));l.append(input,out);panels.shape.append(l);}
 range('edit-scale','大小',.6,1.4,.05,1,v=>changeDesign('scale',v));range('edit-rotation','旋轉',-180,180,5,0,v=>changeDesign('rotation',v));add(panels.shape,'edit-flip','左右翻轉',()=>{const i=editableDecorations().find(d=>d.id===editSelection);changeDesign('flip',!i?.flip);});
 const planes=document.createElement('div');planes.id='edit-planes';planes.setAttribute('aria-label','和魚兒的前後位置');panels.layer.append(planes);for(const [id,label]of [['back','後景'],['middle','中景'],['front','前景']]){const b=add(planes,'edit-plane-'+id,label,()=>changeDesign('plane',id));b.dataset.plane=id;}
 add(panels.layer,'edit-back','往後一層',()=>layerDesign(-1));add(panels.layer,'edit-front','往前一層',()=>layerDesign(1));
 const sand=document.createElement('div');sand.id='edit-sand-color';sand.className='design-swatches';sand.setAttribute('role','group');sand.setAttribute('aria-label','底砂配色');panels.sand.append(sand);
 const footer=root.querySelector('.design-footer');add(footer,'edit-undo','↶ 復原',undoDesign);add(footer,'edit-store','收回布置',storeSelectedDecoration);activate('move');
}
function placementReminder(){openDialog('這裡放不下裝飾','placement');$('dialog-content').append(paragraph('裝飾已留在原來的位置，沒有遺失。可以換到較空的位置，或先收回另一件裝飾。','confirm-copy'),button('回去調整布置',()=>{dialog.close();startEditing();},'confirm'));}
function storeSelectedDecoration(){if(editing)rememberDesign();if(tutorial.expects('decorMoved')){toast('先試著移動裝飾，完成教學後就能自由收回。');return;}if(practiceDecor){toast('這是複習用的裝飾，不會加入收藏。');return;}if(conflict)return;state.placedDecorations=state.placedDecorations.filter(d=>d.id!==editSelection);editSelection=null;drag=null;editPreview=null;buildBackground();markDirty(true);updateEditorLabel();toast('已收回裝飾，仍保留在布置收藏裡。');}
function renderOnboarding(){tutorial.render();}
const sessionStartedAt=Date.now();
function metric(kind){if(!session)return;if(Object.hasOwn(session.counts,kind))session.counts[kind]++;if(Object.hasOwn(session.first,kind)&&session.first[kind]===null)session.first[kind]=+session.elapsedSeconds.toFixed(2);}
function sessionSummary(){return {...session,sessionDurationSeconds:Math.max(0,(Date.now()-sessionStartedAt)/1000),elapsedSeconds:+session.elapsedSeconds.toFixed(2),roughFPS:session.frames&&session.frameMsTotal?+(session.frames*1000/session.frameMsTotal).toFixed(1):null};}
function persistSession(){if(!session)return;try{localStorage.setItem('aquarium_v04_playtest_latest',JSON.stringify(sessionSummary()));}catch(e){/* Anonymous metrics must never stop saving or play. */}}
function exportSession(){if(!session)return;persistSession();const blob=new Blob([JSON.stringify(sessionSummary(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='aquarium-v04-playtest-summary.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function stepTank(dt){
 for(let i=food.length-1;i>=0;i--){const p=food[i];if(p.y<.91){p.y=Math.min(.91,p.y+CONFIG.FOOD_SINK_SPEED*dt);p.x=clamp(p.x+Math.sin(simTime+p.phase)*.003*dt,.05,.95);}else{p.bottom+=dt;if(p.bottom>CONFIG.FOOD_BOTTOM_SECONDS){food.splice(i,1);markDirty();}}}
 const claimed=new Set();let important=false;
 for(const f of state.fishes){
  const s=SPECIES[f.species],personality=PERSONALITIES[f.personality],r=runtime.get(f.id),previousStage=stage(f.growth);f.playSeconds+=dt;
  window.AquariumEconomy.advance(f,dt,{hungerRate:CONFIG.HUNGER_PER_SECOND,coinScale:CONFIG.COIN_SCALE,growthScale:CONFIG.GROWTH_SCALE,deposit:value=>depositCoin(f,r,value)});syncFish(f);r.visualSize+=(f.size-r.visualSize)*(1-Math.exp(-dt*5));state.collection[f.species].highestStage=Math.max(state.collection[f.species].highestStage,stage(f.growth));
  if(stage(f.growth)!==previousStage){recordAdult(f);evaluateGoals();effects.push({x:r.x,y:r.y,text:`長成${f.growthStage}！`,life:2.8});gainXP(8);important=true;}
  let target=null,best=Infinity;
  if(f.hunger<91){for(const p of food){if(FOOD_FOR[f.species]!==p.kind||claimed.has(p.id)||p.y<s.depth[0]-(s.bottomDweller?.13:.12)||p.y>s.depth[1]+.1)continue;
    const distance=Math.hypot((p.x-r.x)*W,(p.y-r.y)*H),score=distance*(s.foodPreference==='bottom'&&p.y>.86?.38:1);if(score<best&&distance<Math.hypot(W,H)){target=p;best=score;}}
  }
  if(s.category){
   if(target)claimed.add(target.id);
   if(window.AquariumCrustaceans.tick(r,f,s,dt,{target,fishes:state.fishes,runtime,decorations:state.placedDecorations,layout:decorLayout,W,H})){food.splice(food.indexOf(target),1);const hungry=f.hunger<86;f.hunger=clamp(f.hunger+13);effects.push({x:r.x,y:r.y-.035,text:'+ 飽足度',life:1.5});diagnostics.eaten++;if(new URLSearchParams(location.search).get('debug')==='1'){diagnostics.meals??=[];diagnostics.meals.push({fishId:f.id,species:f.species,kind:target.kind});if(diagnostics.meals.length>100)diagnostics.meals.shift();}if(hungry)gainXP(2);sound('eat');markDirty();target=null;r.wander=0;}
  }else{
  const atEnvironment=tickEnvironment(r,f,s,dt,poiCache,!!target);if(atEnvironment){r.environmentSeconds+=dt;diagnostics.environmentSeconds+=dt;}if(r.environmentVisitedNow){r.environmentVisits++;diagnostics.environmentVisits++;}
  r.wander-=dt;r.pause=Math.max(0,r.pause-dt);const wasBurst=r.burst>0;r.burst=Math.max(0,r.burst-dt);if(wasBurst&&r.burst===0&&s.bottomDweller&&!target)r.pause=rand(...s.pauseDuration);
  if(target){claimed.add(target.id);r.target={x:target.x,y:target.y};r.pause=0;r.behavior=s.bottomDweller?'搜尋底餌':'追食';const distance=Math.hypot((target.x-r.x)*W,(target.y-r.y)*H);
   if(distance<Math.max(16,f.size*.26)){food.splice(food.indexOf(target),1);const hungry=f.hunger<86;f.hunger=clamp(f.hunger+13);effects.push({x:r.x,y:r.y-.035,text:'+ 飽足度',life:1.5});diagnostics.eaten++;if(new URLSearchParams(location.search).get('debug')==='1'){diagnostics.meals??=[];diagnostics.meals.push({fishId:f.id,species:f.species,kind:target.kind});if(diagnostics.meals.length>100)diagnostics.meals.shift();}if(hungry)gainXP(2);sound('eat');markDirty();target=null;r.wander=0;}
  }else if(!atEnvironment&&(r.wander<=0||Math.hypot(r.x-r.target.x,r.y-r.target.y)<.04)){
   r.target={x:s.bottomDweller?clamp(r.x+(Math.random()>.5?1:-1)*rand(.08,.22),.1,.9):rand(.12,.88),y:s.bottomDweller?rand(s.depth[0]+.03,s.depth[1]):rand(...s.depth)};r.wander=rand(3,8);r.behavior=s.bottomDweller?'巡底':'巡遊';
   if(Math.random()<s.burstChance*personality.burst){r.burst=rand(.45,1.4);r.pause=0;diagnostics.bursts++;r.behavior='短衝';}else if(Math.random()<s.pauseChance*personality.pause){r.pause=rand(...s.pauseDuration)*personality.pauseTime;diagnostics.pauses++;r.behavior=s.bottomDweller?'停下搜尋':'停頓擺尾';}
  }
  let dx=r.target.x-r.x,dy=r.target.y-r.y,dist=Math.hypot(dx,dy)||1;
  r.behaviorState=target?'feed':atEnvironment?r.behaviorState:r.pause>0?'rest':'explore';
  const eagerness=target?(f.hunger<45?s.foodBoost*1.35:f.hunger<70?s.foodBoost:1.12):1;
  let speed=s.speed*personality.speed*(editing?.45:1)*(target&&f.hunger<70?personality.food:1)*(f.hunger<25?.7:1)*eagerness*(r.burst>0&&!target?s.burstFactor:1)*(r.pause>0?.045:1);
  let vx=dx/dist*speed,vy=dy/dist*speed*.7,near=0,cx=0,cy=0,ax=0,ay=0;
  for(const other of state.fishes){if(other.id===f.id)continue;const q=runtime.get(other.id),ox=r.x-q.x,oy=r.y-q.y,d=Math.hypot(ox,oy);
   const separation=Math.max(.06,(f.size+other.size)*.44/Math.min(W,H));if(d>.001&&d<separation){vx+=ox/d*(separation-d)*.43;vy+=oy/d*(separation-d)*.43;}
   if(!target&&other.species===f.species&&d<.32&&d>separation*.9){near++;cx+=q.x;cy+=q.y;ax+=q.vx;ay+=q.vy;}
  }
  if(near&&s.schoolingStrength&&!atEnvironment){if(!target&&r.pause===0)r.behaviorState='school';vx+=(cx/near-r.x)*s.schoolingStrength*.12+ax/near*s.schoolingStrength*.25;vy+=(cy/near-r.y)*s.schoolingStrength*.12+ay/near*s.schoolingStrength*.25;}
  const artBounds=window.AquariumFishArt.hitBounds[f.species],marginX=Math.max(.065,(f.size*Math.max(-artBounds.left,artBounds.right)/100+10)/W),minY=Math.max(.105,(f.size*-artBounds.top/100+12)/H,s.depth[0]-(s.bottomDweller?.06:.07)),maxY=Math.min(.915,1-(f.size*artBounds.bottom/100+10)/H,Math.max(s.depth[1]+.035,atEnvironment&&!s.bottomDweller?r.poi.y+.035:0));
  if(r.x<marginX+.08){vx+=(marginX+.08-r.x)*1.1;if(r.x<=marginX+.002)r.target.x=.5;}
  if(r.x>1-marginX-.08){vx-=(r.x-(1-marginX-.08))*1.1;if(r.x>=1-marginX-.002)r.target.x=.5;}
  if(r.y<minY+.03)vy+=(minY+.03-r.y)*.8;if(r.y>maxY-.03)vy-=(r.y-maxY+.03)*.8;
  const desiredAngle=Math.atan2(vy,vx);r.motionAngle??=Math.atan2(r.vy,r.vx);let angleDiff=((desiredAngle-r.motionAngle+Math.PI*3)%(Math.PI*2))-Math.PI;r.motionAngle+=clamp(angleDiff,-s.turnSpeed*dt,s.turnSpeed*dt);
  const desiredSpeed=Math.min(Math.hypot(vx,vy),Math.max(speed*1.25,s.speed*.22));r.magnitude??=Math.hypot(r.vx,r.vy);r.magnitude+=(desiredSpeed-r.magnitude)*(1-Math.exp(-dt*s.acceleration));r.vx=Math.cos(r.motionAngle)*r.magnitude;r.vy=Math.sin(r.motionAngle)*r.magnitude;
  r.x=clamp(r.x+r.vx*dt,marginX,1-marginX);r.y=clamp(r.y+r.vy*dt,minY,maxY);if(Math.abs(r.vx)>.006)r.direction=r.vx>0?1:-1;
  r.turn+=(r.direction-r.turn)*(1-Math.exp(-dt*s.turnSpeed));r.heading+=(clamp(r.vy/(Math.abs(r.vx)+.02),-.4,.4)-r.heading)*(1-Math.exp(-dt*2));r.phase+=dt*(r.pause>0?3:s.bottomDweller?7:5+r.magnitude*35);r.position={x:r.x,y:r.y};r.coinValue=s.values[stage(f.growth)];r.hiddenAmount+=(Number(r.behaviorState==='hide')-r.hiddenAmount)*(1-Math.exp(-dt*2.5));
  }

 }
 for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0)effects.splice(i,1);}if(effects.length>40)effects.splice(0,effects.length-40);
}
function step(dt){
 simTime+=dt;state.stats.playSeconds+=dt;const fishes=allFish();if(fishes.length&&fishes.every(f=>f.hunger>=45))state.stats.careSeconds+=dt;if(session)session.elapsedSeconds+=dt;diagnostics.frames++;diagnostics.frameMax=Math.max(diagnostics.frameMax,dt);dirty=true;
 const active=state.activeTankId;batching=true;
 try{for(const t of state.tanks){state.activeTankId=t.id;bindTank(t);simulatingBackground=t.id!==active;stepTank(dt);}}
 finally{state.activeTankId=active;bindTank(state.tanks.find(t=>t.id===active));simulatingBackground=false;batching=false;}
 if(fishes.length&&fishes.reduce((n,f)=>n+f.hunger,0)/fishes.length>=45){state.careProgress+=dt;if(state.careProgress>=CONFIG.CARE_XP_SECONDS){state.careProgress%=CONFIG.CARE_XP_SECONDS;gainXP(2);}}
 uiAccumulator+=dt;saveAccumulator+=dt;if(uiAccumulator>.25){uiAccumulator=0;evaluateGoals(false);checkLevelGifts();updateUI();}if(saveAccumulator>=CONFIG.AUTO_SAVE_SECONDS){saveAccumulator=0;if(dirty)save();}
}

function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function path(c,d,color,stroke,width=1){const p=new Path2D(d);if(color){c.fillStyle=color;c.fill(p);}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke(p);}}
const fishImages={};for(const [key,s]of Object.entries(SPECIES)){if(s.art){const img=new Image();img.src=s.art;fishImages[key]=img;}}
function drawFish(c,key,x,y,size,turn,angle,phase,variant='normal',options={}){
 window.AquariumFishArt.draw(c,key,x,y,size,turn,angle,phase,variant,options);
}
// Hit geometry follows the same origin, heading, turn width and scale as the art.
// A generous body target is preferred to a neighbouring fish's trailing fins.
function visualSize(f){return runtime.get(f.id)?.visualSize??f.size;}
function fishHitScore(f,x,y){
 if(SPECIES[f.species].category){
  const r=runtime.get(f.id),size=visualSize(f),scale=size/100,a=r.heading*.2,dx=(x-r.x)*W,dy=(y-r.y)*H-(r.crustMotion==='walk'?Math.sin(r.phase*2)*size*.003:0),px=dx*Math.cos(a)+dy*Math.sin(a),py=-dx*Math.sin(a)+dy*Math.cos(a),sign=SPECIES[f.species].category==='shrimp'&&r.turn<0?-1:1,b=window.AquariumFishArt.hitBounds[f.species];
  const body=Math.hypot(px/Math.max(25,32*scale),py/Math.max(22,20*scale));if(body<=1)return body;
  const left=sign<0?-b.right:b.left,right=sign<0?-b.left:b.right;
  return px>=Math.min(-25,left*scale)&&px<=Math.max(25,right*scale)&&py>=Math.min(-22,b.top*scale)&&py<=Math.max(22,b.bottom*scale)?2+Math.hypot(px,py)/100:Infinity;
 }
 const r=runtime.get(f.id),a=r.heading*.35,dx=(x-r.x)*W,dy=(y-r.y)*H-Math.sin(r.phase*.4)*1.7;
 const px=dx*Math.cos(a)+dy*Math.sin(a),py=-dx*Math.sin(a)+dy*Math.cos(a),scale=visualSize(f)/100,width=.15+.85*Math.abs(r.turn),sign=r.turn<0?-1:1,b=window.AquariumFishArt.hitBounds[f.species];
 const bodyX=px-sign*6*scale*width,body=Math.hypot(bodyX/Math.max(27,35*scale*width),py/Math.max(25,(f.species==='angel'?29:20)*scale));
 if(body<=1)return body;
 const left=sign<0?-b.right:b.left,right=sign<0?-b.left:b.right;
 if(px>=Math.min(-27,left*scale*width)&&px<=Math.max(27,right*scale*width)&&py>=Math.min(-25,b.top*scale)&&py<=Math.max(25,b.bottom*scale))return 2+Math.hypot(px,py)/100;
 return Infinity;
}
// Retain merchandise framing; the object and material renderers also draw the aquarium.
function drawDecorShopPreview(canvas,id){
 const d=DECORATIONS[id],c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 c.clearRect(0,0,w,h);
 if(d.kind==='substrate'){
  const palette=window.AquariumDecorArt.palettes[id];
  c.beginPath();c.moveTo(10,67);c.bezierCurveTo(46,46,81,76,121,63);c.bezierCurveTo(165,49,192,57,230,72);c.lineTo(230,125);c.quadraticCurveTo(230,131,221,131);c.lineTo(19,131);c.quadraticCurveTo(10,131,10,124);c.closePath();
  c.fillStyle=palette.top;c.fill();c.strokeStyle='#61776a65';c.lineWidth=1.1;c.stroke();
  c.save();c.clip();c.translate(10,45);window.AquariumDecorArt.sand(c,id,220,86);c.restore();
  c.beginPath();c.moveTo(14,94);c.quadraticCurveTo(120,87,226,98);c.strokeStyle='#ffffff55';c.lineWidth=2;c.stroke();
 }else{
  const shadow=c.createRadialGradient(120,123,12,120,123,80);shadow.addColorStop(0,'#56776e30');shadow.addColorStop(1,'#56776e00');
  c.fillStyle=shadow;c.beginPath();c.ellipse(120,121,90,17,0,0,Math.PI*2);c.fill();
  drawDecoration(c,id,120,121,116,106);
 }
}
function drawDecoration(c,id,x,y,width,height,color=0){window.AquariumDecorArt.draw(c,id,x,y,width,height,color);}
function paintPlaced(c,item){const p=decorLayout(item);c.save();c.translate(p.x,p.y);c.rotate((item.rotation||0)*Math.PI/180);c.scale(item.flip?-1:1,1);drawDecoration(c,item.decoration,0,0,p.width,p.height,item.color||0);c.restore();}
function decorLayout(item){
 const d=DECORATIONS[item.decoration],x=editPreview?.id===item.id?editPreview.x:(item.posX??item.normX);
 const base=Math.min(115,Math.max(44,W*(d.kind==='plant'?.1:.11))),width=item.decoration==='smallrock'?Math.max(36,base*.82):base;
 const limit=H*(x>.34&&x<.66?.23:.35),ratios={smallrock:.62,bigrock:.87,cave:.91,wood:.84,ship:.68,chest:.82};
 const height=d.kind==='ground'?Math.max(24,Math.min(limit,width*(ratios[item.decoration]||d.ratio||.85))):Math.max(26,H*Math.min(x>.34&&x<.66?.23:.35,d.height||.13));
 const y=editPreview?.id===item.id?editPreview.y:item.posY;return {x:x*W,y:H*(y??(d.kind==='plant'?.936+item.lane*.009:.948+item.lane*.014)),width:width*(item.scale||1),height:height*(item.scale||1)};
}

function buildBackground(){
  const buildStarted=performance.now();diagnostics.backgroundBuilds++;
  bg=document.createElement('canvas');bg.width=Math.round(W*dpr);bg.height=Math.round(H*dpr);const c=bg.getContext('2d');c.scale(dpr,dpr);
  if(activeTank().habitat==='marine')window.AquariumSceneArt.marine(c,W,H,state.substrate,activeTank().substrateColor||0);else{
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,activeTank().habitat==='marine'?'#e4f5fb':'#d9f1e2');g.addColorStop(.2,activeTank().habitat==='marine'?'#b8e1ef':'#bce5dc');g.addColorStop(.68,activeTank().habitat==='marine'?'#80bfd9':'#91cecc');g.addColorStop(1,activeTank().habitat==='marine'?'#669ebd':'#73b6ba');c.fillStyle=g;c.fillRect(0,0,W,H);
  const glow=c.createRadialGradient(W*.35,0,0,W*.35,H*.12,W*.65);glow.addColorStop(0,'#fff9d855');glow.addColorStop(1,'#fff9d800');c.fillStyle=glow;c.fillRect(0,0,W,H);
  for(let i=0;i<4;i++){c.save();const ray=c.createLinearGradient(0,0,0,H*.85);ray.addColorStop(0,'#fffde72b');ray.addColorStop(1,'#fffde700');c.fillStyle=ray;c.beginPath();c.moveTo(W*(.05+i*.27),0);c.lineTo(W*(.17+i*.27),0);c.lineTo(W*(.37+i*.23),H*.86);c.lineTo(W*(.19+i*.23),H*.86);c.fill();c.restore();}
  // Distant reeds and soft caustics are part of the cached backdrop, never rebuilt per frame.
  c.save();c.globalAlpha=.14;for(const side of [0,1])for(let i=0;i<7;i++){const x=W*(side? .89+i*.018:.02+i*.019),height=H*(.17+(i%3)*.055);path(c,`M${x} ${H*.9} Q${x-13} ${H*.9-height*.5} ${x+8} ${H*.9-height}`,null,'#367b75',4);for(let j=1;j<4;j++){const y=H*.9-height*j/4;path(c,`M${x} ${y} Q${x-24} ${y-14} ${x-17} ${y-30} Q${x+1} ${y-21} ${x} ${y}`,'#3b837a');}}c.restore();
  path(c,`M0 38 Q${W*.17} 18 ${W*.32} 34 T${W*.67} 28 T${W} 34 L${W} 0 L0 0Z`,'#e4f8e980');path(c,`M0 37 Q${W*.17} 17 ${W*.32} 33 T${W*.67} 27 T${W} 33`,null,'#ffffff75',2);
  // Subtle surface glints, cached with the water (no extra animation loop).
  c.save();c.globalAlpha=.22;for(let i=0;i<9;i++){const x=W*(.07+i*.105);path(c,`M${x} ${17+i%3*8} q${W*.025} -4 ${W*.05} 0`,null,'#fffce4',1.3);}c.restore();
  // Distant landscape and fine sand, rendered once per resize.
  path(c,`M0 ${H*.84} Q${W*.25} ${H*.72} ${W*.49} ${H*.86} Q${W*.8} ${H*.7} ${W} ${H*.79} L${W} ${H} L0 ${H}Z`,'#67b8b5');
  const sandShape=new Path2D(`M0 ${H*.9} Q${W*.19} ${H*.84} ${W*.4} ${H*.9} Q${W*.77} ${H*.84} ${W} ${H*.9} L${W} ${H} L0 ${H}Z`);
  c.save();c.clip(sandShape);c.translate(0,H*.84);window.AquariumDecorArt.sand(c,state.substrate,W,H*.16,activeTank().substrateColor||0);c.restore();
  }
  middleground=document.createElement('canvas');middleground.dataset.sceneLayer='middle';middleground.width=bg.width;middleground.height=bg.height;const middle=middleground.getContext('2d');middle.scale(dpr,dpr);
  foreground=document.createElement('canvas');foreground.dataset.sceneLayer='front';foreground.width=bg.width;foreground.height=bg.height;const front=foreground.getContext('2d');front.scale(dpr,dpr);
  const placed=[...state.placedDecorations,...(practiceDecor?[practiceDecor]:[])].sort((a,b)=>(a.z??state.placedDecorations.indexOf(a))-(b.z??state.placedDecorations.indexOf(b)));
  for(const item of placed)paintPlaced(item.plane==='back'?c:item.plane==='front'?front:middle,item);
  diagnostics.middleDecor=placed.filter(i=>!i.plane||i.plane==='middle').length;diagnostics.frontDecor=placed.filter(i=>i.plane==='front').length;
  if(state.tankTier>=2){for(let i=0;i<state.tankTier+1;i++)ellipse(c,W*(.22+i*.15),H*.96,3.5,2,'#f6ecc2');}
  diagnostics.backgroundMs+=performance.now()-buildStarted;
  poiCache=buildPOI(state.placedDecorations,DECORATIONS,decorLayout,W,H);if(tankContexts.has(state.activeTankId))tankContexts.get(state.activeTankId).poiCache=poiCache;syncEditorHandles();

}
function resize(){const r=canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);buildBackground();draw();}
function residentDepth(f,r){if(selected===f.id||editing)return 2;const seed=[...f.id].reduce((n,c)=>n+c.charCodeAt(0),0),wave=Math.sin(simTime*.14+seed*.17);return wave<-.35?0:wave>.55?2:1;}
function draw(){if(!state||!bg||!bg.width||!bg.height)return;ctx.clearRect(0,0,W,H);ctx.drawImage(bg,0,0,W,H);
  for(let i=0;i<13;i++){const x=(.05+(i*.073)%1)*W+Math.sin(simTime*.6+i)*8,y=H-((simTime*(9+i%4*3)+i*67)%(H+20));ctx.strokeStyle='#e9fff570';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,2+i%4,0,Math.PI*2);ctx.stroke();}
  for(const p of food){ellipse(ctx,p.x*W+1,p.y*H+2,3.7,3.5,'#458c9144');ellipse(ctx,p.x*W,p.y*H,3.8,3.2,FEEDS[p.kind].color);ellipse(ctx,p.x*W-1,p.y*H-1,1.4,1.1,'#ffe7a0');}
  for(let depth=0;depth<3;depth++){
  for(const f of state.fishes){const r=runtime.get(f.id);if(!r||residentDepth(f,r)!==depth)continue;const x=r.x*W,y=r.y*H;
    ellipse(ctx,x,H*.943,f.size*.34,f.size*.045,`rgba(51,116,111,${SPECIES[f.species].bottomDweller?.14:.045})`);
    if(selected===f.id){ctx.strokeStyle='#fffce6bb';ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.ellipse(x,y,f.size*.64,f.size*.44,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    ctx.save();ctx.globalAlpha=1-r.hiddenAmount*.65;drawFish(ctx,f.species,x,y+(SPECIES[f.species].category?0:Math.sin(r.phase*.4)*1.7),visualSize(f),r.turn,r.heading,r.phase,f.variant,{motion:r.crustMotion||'rest',gait:r.phase,idle:r.idlePhase||0});ctx.restore();
    if(newFishFocus?.id===f.id&&simTime<newFishFocus.until){ctx.save();ctx.strokeStyle='#e8b64f';ctx.lineWidth=3;ctx.setLineDash([5,4]);ctx.beginPath();ctx.ellipse(x,y,f.size*.66,Math.max(27,f.size*.38),0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  }
    if(depth===0&&middleground)ctx.drawImage(middleground,0,0,W,H);
    if(depth===1&&foreground){ctx.save();ctx.globalAlpha=.86;ctx.drawImage(foreground,0,0,W,H);ctx.restore();}
  }
  if(editing&&editSelection){const item=editableDecorations().find(d=>d.id===editSelection);if(item){const p=decorLayout(item);ctx.save();ctx.strokeStyle='#fffde6';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.translate(p.x,p.y);ctx.rotate((item.rotation||0)*Math.PI/180);ctx.strokeRect(-p.width*.65-5,-p.height*1.15-5,p.width*1.3+10,p.height*1.15+10);ctx.restore();}}
  for(const coin of state.drops){const x=coin.x*W,y=coin.y*H+Math.sin(simTime*2+coin.x*5)*3;ctx.shadowColor='#fff3a7';ctx.shadowBlur=12;ellipse(ctx,x,y,14,14,'#edbd49');ctx.shadowBlur=0;ctx.lineWidth=2;ctx.strokeStyle='#fff0b3';ctx.beginPath();ctx.arc(x,y,10.5,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff6c6';ctx.font='bold 17px sans-serif';ctx.textAlign='center';ctx.fillText('＄',x,y+6);}
  for(const e of effects){ctx.save();if(e.kind==='ripple'){ctx.strokeStyle=`rgba(255,255,240,${e.life})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x*W,e.y*H,(1-e.life)*50+5,(1-e.life)*10+3,0,0,Math.PI*2);ctx.stroke();}else{ctx.globalAlpha=Math.min(1,e.life);ctx.textAlign='center';ctx.font='bold 14px "Microsoft JhengHei", sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#effcf5';const yy=e.y*H-20-(1.5-e.life)*16;ctx.strokeText(e.text,e.x*W,yy);ctx.fillStyle='#45836e';ctx.fillText(e.text,e.x*W,yy);}ctx.restore();}
}
let specimenPose=null;
const observation=window.AquariumObservation.create({
 onObserve:species=>{recordActivity('firstObserve');if(SPECIES[species]?.category)recordActivity('observeCrustacean');},
 getFish:()=>state.fishes.map(f=>({...f,speciesName:SPECIES[f.species].name,personalityName:PERSONALITIES[f.personality].name,variantName:f.variant==='normal'?'普通配色':VARIANTS[f.variant].name})),
 drawSpecimen:(target,id,{tracking,zoom,playing,time,breathing,highlightPart})=>{
  const c=target.getContext('2d'),f=state.fishes.find(f=>f.id===id);c.clearRect(0,0,target.width,target.height);if(!f)return;
  if(playing||specimenPose?.id!==id)specimenPose={id,...runtime.get(id)};
  const r=specimenPose,b=window.AquariumFishArt.hitBounds[f.species],crust=!!SPECIES[f.species].category,fit=Math.min(44000/(b.bottom-b.top),82000/(b.right-b.left)),size=Math.min((crust?fit*.82:Math.min(Math.max(350,f.size*4),fit*.65))*zoom,fit);
  const marginX=Math.max(Math.abs(b.left),b.right)*size/100+30,marginY=Math.max(Math.abs(b.top),b.bottom)*size/100+25;
  const facing=SPECIES[f.species].category==='shrimp'&&r.turn<0?-1:1;
  const x=tracking?(crust?target.width*.5-facing*(b.left+b.right)*size/200:target.width*.52):clamp(r.x*target.width,marginX,target.width-marginX),y=tracking?(crust?target.height*.5-(b.top+b.bottom)*size/200:target.height*.48):clamp(r.y*target.height,marginY,target.height-marginY);
  const turn=breathing?(r.turn<0?-1:1):r.turn;
  target.dataset.speciesArt=f.species;target.setAttribute('aria-label',SPECIES[f.species].name+'的放大構造與動作');
  window.AquariumFishArt.draw(c,f.species,x,y,size,turn,r.heading,r.phase,f.variant,{breathing:true,breathTime:time,breathEmphasis:breathing,highlightPart,motion:r.crustMotion||'rest',gait:r.phase,idle:r.idlePhase||0});
  if(highlightPart){const part=window.AquariumFishArt.getFinInfo(f.species).parts.find(p=>p.id===highlightPart);if(part){c.fillStyle='#246e61';c.font='600 24px sans-serif';c.textAlign='left';c.fillText('正在觀察：'+part.name,24,36);}}
 }

});
// Only V0.6 gets the simplified observation UI; do not edit the shared V0.5 module.
const ownView=$('obs-mine'),zoomButton=$('obs-enlarge');
if(ownView&&zoomButton){const row=document.createElement('div');row.className='own-direct-zoom';row.append(zoomButton);$('obs-own-extra').before(row);ownView.querySelectorAll(':scope > .own-footnote').forEach(node=>node.remove());$('obs-to-book')?.remove();$('obs-own-breath')?.remove();}
function openObservation(id){if(editing)finishEditing();setFeeding(false);observation.open(id);tutorial.report('observationOpened');}
$('observe-fish').onclick=()=>openObservation(selected);

function frame(t){if(started&&!document.hidden&&!conflict){const start=performance.now();if(editCacheDirty){editCacheDirty=false;buildBackground();}if(session&&lastFrame){const ms=t-lastFrame;session.frames++;session.frameMsTotal+=ms;if(ms>50)session.longFrames++;}const dt=lastFrame?Math.min((t-lastFrame)/1000,.1):0;if(lastFrame)step(dt);draw();observation.tick(dt);const cost=performance.now()-start;diagnostics.costTotal+=cost;diagnostics.costMax=Math.max(diagnostics.costMax,cost);}lastFrame=t;requestAnimationFrame(frame);}
canvas.addEventListener('click',e=>{
 if(editing)return;
 const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/W,y=(e.clientY-rect.top)/H;
 // Collecting a coin or selecting a fish must remain possible while feeding.
 const coin=[...state.drops].reverse().find(c=>Math.hypot((c.x-x)*W,(c.y-y)*H)<27);
 if(coin){collect(coin);return;}
 const hit=state.fishes.map(f=>({f,score:fishHitScore(f,x,y)})).filter(h=>Number.isFinite(h.score)).sort((a,b)=>a.score-b.score)[0];
 if(hit){selectFish(hit.f.id);return;}
 if(feeding){if(y>.28){toast('點魚缸上方的水面可以餵食；點魚兒看資料，點金幣即可收取。');return;}feed(x);return;}
 closeCard();
});
canvas.addEventListener('keydown',e=>{if(feeding&&(e.key==='Enter'||e.key===' ')){e.preventDefault();feed(.5);}if(e.key==='Escape'){setFeeding(false);closeCard();}});
$('feed').onclick=()=>setFeeding(!feeding);$('stop-feed').onclick=()=>setFeeding(false);$('close-card').onclick=closeCard;$('shop').onclick=shop;$('more-menu').onclick=moreMenu;$('fish-more').onclick=fishMore;$('rename').onclick=renameFish;
$('dialog-close').onclick=()=>dialog.close();$('edit-done').onclick=finishEditing;$('edit-left').onclick=()=>nudgeDecoration(-1);$('edit-right').onclick=()=>nudgeDecoration(1);$('edit-store').onclick=storeSelectedDecoration;dialog.addEventListener('close',()=>queueMicrotask(()=>tutorial.render()));dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
// Visibility catches mobile backgrounding; pagehide is an extra best-effort flush.
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(dirty)save();hiddenAt=Date.now();}else{lastFrame=0;if(started&&hiddenAt&&!conflict){offline((Date.now()-hiddenAt)/1000);save();updateUI();}hiddenAt=0;}});
window.addEventListener('pagehide',()=>{if(dirty)save();});window.addEventListener('beforeunload',()=>{if(dirty)save();});
window.addEventListener('storage',e=>{if(e.key===CONFIG.SAVE_KEY||started&&e.key===giftKey()){if(!started){refreshHome();return;}conflict=true;clearTimeout(saveTimer);saveTimer=0;saveLabel();toast('另一個分頁已更新進度。請到設定重新讀取自動存檔，再繼續遊戲。',9000);}});
document.addEventListener('pointerdown',()=>enableAudio(),{passive:true});document.addEventListener('keydown',()=>enableAudio());
if(CONFIG.TEST_MODE)document.querySelector('.version').textContent='測試中';
if(session){window.addEventListener('error',()=>session.jsErrors++);window.addEventListener('unhandledrejection',()=>session.jsErrors++);}
const tutorial=window.AquariumTutorial.create({getState:()=>state,commit:protectedTransaction,notify:toast,grant:applyTutorialGift,prepareCoin:prepareLessonCoin,prepareFish:prepareLessonFish,prepareFood:prepareLessonFood,prepareDecor:prepareLessonDecor,prepareEditing:prepareLessonEditing,reviewPurchase,ensureFeeding:kind=>{setFeeding(true);if(kind){selectedFeed=kind;renderFeedChoices();if(innerWidth<=1050)requestAnimationFrame(()=>canvas.scrollIntoView({block:'start'}));}}});
const sourceKeys=()=>[[CONFIG.SAVE_KEY,CONFIG.MANUAL_KEY],[CONFIG.V5_KEY,CONFIG.V5_MANUAL_KEY],[CONFIG.V4_KEY,CONFIG.V4_MANUAL_KEY],...(!CONFIG.TEST_MODE?[[CONFIG.V3_KEY,CONFIG.V3_MANUAL_KEY],[CONFIG.V2_KEY,CONFIG.V2_MANUAL_KEY],[CONFIG.LEGACY_KEY,CONFIG.LEGACY_MANUAL_KEY]]:[])];
function findStored(){for(const [key,manual]of sourceKeys()){let raw=localStorage.getItem(key);if(raw){if(key===CONFIG.SAVE_KEY){const candidate=JSON.parse(raw);if(candidate.saveId){recoverTutorialTransaction(candidate.saveId);raw=localStorage.getItem(key);}}return {key,manual,raw};}}return null;}
function refreshHome(){
 $('home-continue').hidden=true;$('home-summary').textContent='';$('home-error').textContent='';
 try{const stored=findStored();if(stored){const s=validate(JSON.parse(stored.raw));$('home-continue').hidden=false;$('home-summary').textContent=`${s.tankName} · ${s.tanks.length} 個魚缸 · ${s.tanks.reduce((n,t)=>n+t.fishes.length,0)} 隻魚 · ${s.coins} 金幣`;$('home-continue').onclick=()=>continueSaved();}}
 catch(e){$('home-error').textContent='本機存檔暫時無法讀取。請勿重置遊戲或清除網站資料，原本進度可能仍保留在這台裝置上。';}
}
function paintHomeFish(){const c=$('home-fish').getContext('2d');c.clearRect(0,0,760,300);window.AquariumFishArt.draw(c,'guppy',178,145,155,1,-.03,.8,'normal');window.AquariumFishArt.draw(c,'goldfish',520,158,172,-1,.02,1.4,'normal');window.AquariumFishArt.draw(c,'cory',365,245,105,1,0,2,'normal');}
function backupCurrent(tag){const stored=findStored();if(stored)localStorage.setItem(CONFIG.SAVE_KEY+'_'+tag,stored.raw);}
function activate(candidate,{backup=null,elapsed=0,manualSource=null}={}){
 // Hold a browser-managed single-writer lock for this page's lifetime. A closed
 // or crashed tab releases it automatically, without expiring localStorage leases.
 if(navigator.locks&&!writerReady){
  if(writerPending)return false;writerPending=true;
  return new Promise(resolveActivation=>navigator.locks.request(CONFIG.SAVE_KEY+'_writer',{ifAvailable:true},async lock=>{
   writerPending=false;
   if(!lock){const message='遊戲已在另一個分頁開啟。請先關閉那個分頁，再按繼續遊戲。';$('home-error').textContent=message;toast(message,9000);resolveActivation(false);return;}
   writerReady=true;resolveActivation(activate(candidate,{backup,elapsed,manualSource}));
   await new Promise(resolve=>window.addEventListener('pagehide',()=>{writerReady=false;conflict=true;resolve();},{once:true}));
  }).catch(()=>{writerPending=false;resolveActivation(false);toast('暫時無法取得存檔使用權，請重新整理後再試。');}));
 }
 let next;
 try{next=validate(candidate);if(backup)backupCurrent(backup);const recovered=next.saveId?recoverTutorialTransaction(next.saveId):null;if(recovered&&!backup)next=validate(recovered);mergeRewardLedger(next);mergeGiftLedger(next);if(recovered&&!backup)elapsed=Math.max(0,(Date.now()-next.savedAt)/1000);lastPersistedState=JSON.stringify(next);localStorage.setItem(CONFIG.SAVE_KEY,lastPersistedState);}
 catch(e){toast('目前無法保存新進度，原本存檔仍保留。請確認瀏覽器有可用空間，再試一次。',8000);return false;}
 clearTimeout(saveTimer);saveTimer=0;state=next;shopVariants.clear();for(const [id,c]of Object.entries(state.collection))shopVariants.set(id,c.variants.at(-1)||'normal');for(const f of allFish())shopVariants.set(f.species,f.variant);started=true;dirty=false;saveBlocked=conflict=false;lastSaved=next.savedAt;lastFrame=0;simTime=0;saveAccumulator=0;feedAt=-99;
 $('home').hidden=true;$('game').hidden=false;window.scrollTo(0,0);setFeeding(false);allFish().forEach(syncFish);rebuildRuntime();resize();buildBackground();
 grantRewardDifference();if(elapsed)offline(elapsed);evaluateGoals(false);save();checkLevelGifts();updateUI();tutorial.setActive(true);if(state.offlinePending&&state.onboarding.completed)showOffline();
 if(manualSource){try{const raw=localStorage.getItem(manualSource);if(raw&&!localStorage.getItem(CONFIG.MANUAL_KEY)){const m=validate(JSON.parse(raw));m.saveId=next.saveId;localStorage.setItem(CONFIG.MANUAL_KEY,JSON.stringify(m));}}catch(e){toast('進度已承接，舊手動存檔仍保留；可下載舊版備份後再匯入。');}}
 return true;
}
async function continueSaved(){try{const source=findStored();if(!source)throw Error('沒有存檔');const next=validate(JSON.parse(source.raw));await activate(next,{elapsed:Math.max(0,(Date.now()-next.savedAt)/1000),manualSource:source.key!==CONFIG.SAVE_KEY?source.manual:null});}catch(e){$('home-error').textContent='無法讀取這份進度，原本資料仍保留。請勿重置遊戲或清除網站資料。';}}
function newTank(){let name;try{name=window.AquariumSave.tankName($('tank-new-name').value);}catch(e){$('home-error').textContent=e.message;return;}
 const begin=async()=>{if(await activate(fresh(name),{backup:'before_new'}))dialog.close();};try{if(findStored()){confirmAction('建立新的水族箱？','目前進度會被新的三隻幼魚與 20 金幣取代。確認後會另保留一份替換前的本機備份。',begin);$('dialog-content').querySelector('.confirm').textContent='確認建立';}else begin();}catch(e){toast('目前無法讀取儲存空間，請確認瀏覽器的儲存設定。');}}
function goHome(){if(!save()){toast('尚未成功保存。請先下載存檔，再返回首頁。');return;}dialog.close();tutorial.setActive(false);started=false;dirty=false;clearTimeout(saveTimer);saveTimer=0;dismissToast();$('game').hidden=true;$('home').hidden=false;refreshHome();window.scrollTo(0,0);}
function renameTank(){openDialog('替水族箱改名字','tank-name');const input=document.createElement('input');input.id='tank-rename';input.className='name-input';input.value=state.tankName;input.maxLength=20;input.setAttribute('aria-label','水族箱名稱，最多 10 個字');const error=paragraph('','name-error');error.setAttribute('role','status');const actions=document.createElement('div');actions.className='confirm-actions';actions.append(button('取消',()=>dialog.close()),button('保存名稱',()=>{if(conflict)return;try{state.tankName=window.AquariumSave.tankName(input.value);markDirty(true);updateUI();dialog.close();toast('水族箱名稱已保存。');}catch(e){error.textContent=e.message;}},'confirm'));$('dialog-content').append(input,error,actions);input.focus();}
function chooseFile(){
 let input=$('save-import-file');if(!input){input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.id='save-import-file';input.hidden=true;document.body.append(input);input.addEventListener('change',async()=>{
 const file=input.files?.[0];if(!file)return;
 try{if(file.size>1024*1024)throw Error('檔案太大，請選擇水族箱下載的 JSON 存檔。');const next=validate(JSON.parse(await file.text()));const date=new Date(next.savedAt).toLocaleString('zh-TW',{hour12:false});confirmAction('載入這份水族箱進度？',`水族箱：${next.tankName}。魚缸：${next.tanks.length} 個。魚兒：${next.tanks.reduce((n,t)=>n+t.fishes.length,0)} 隻。金幣：${next.coins}。儲存日期：${date}。格式已確認，可安全升級。確認後取代目前進度，原進度另留備份。`,async()=>{if(started&&(conflict||saveBlocked)){toast('另一分頁已更新進度。請先重新讀取，再載入檔案。');return;}if(await activate(next,{backup:'before_import'})){dialog.close();toast('存檔已載入！原本進度另有備份。');}});$('dialog-content').querySelector('.confirm').textContent='確認載入';}
 catch(e){toast('這份檔案無法讀取，原本進度仍保留。請選擇從水族箱下載的 JSON 存檔。',8000);}
 });}input.value='';input.click();
}

const giftRewards={starter:{general:8},smallLesson:{small:5},level2:{small:3},level4:{protein:3},lessonGeneralRecovery:{general:1},lessonSmallRecovery:{small:1}};
function giftKey(id=state.saveId){return CONFIG.SAVE_KEY+'_gifts_'+id;}
function readGifts(id=state.saveId){
 const raw=localStorage.getItem(giftKey(id));if(!raw)return {ids:[],emergencyAt:0,tutorialEvents:[]};const v=JSON.parse(raw);
 if(!v||!Array.isArray(v.ids)||v.ids.some(x=>!window.AquariumSave.GIFT_IDS.includes(x))||typeof v.emergencyAt!=='number'||!Number.isFinite(v.emergencyAt)||v.emergencyAt<0||v.emergencyAt>Number.MAX_SAFE_INTEGER||v.tutorialEvents&&(!Array.isArray(v.tutorialEvents)||v.tutorialEvents.some(x=>!window.AquariumSave.TUTORIAL_KEYS.includes(x))))throw Error('贈禮帳本無法讀取');
 if(v.supportAmounts&&(!Number.isInteger(v.supportAmounts.feed)||v.supportAmounts.feed<0||v.supportAmounts.feed>14||!Number.isInteger(v.supportAmounts.fish)||v.supportAmounts.fish<0||v.supportAmounts.fish>CONFIG.MAX_COINS))throw Error('購物補助紀錄不完整');
 if(v.hints&&(!Array.isArray(v.hints)||v.hints.some(k=>!window.AquariumSave.HINT_IDS.includes(k))))throw Error('功能提示紀錄不完整');
 if(v.supportAmounts?.decor!==undefined&&(!Number.isInteger(v.supportAmounts.decor)||v.supportAmounts.decor<0||v.supportAmounts.decor>CONFIG.MAX_COINS))throw Error('布置補助紀錄不完整');
 if(v.pending&&validate(v.pending).saveId!==id)throw Error('交易進度與贈禮帳本不符');return v;
}
function ledgerRecord(ledger,next=state){return {rewardPaid:{...(ledger.rewardPaid||{}),...(next.rewardPaid||{})},hints:[...new Set([...(ledger.hints||[]),...next.onboarding.hints])],ids:[...new Set([...ledger.ids,...next.gifts])],emergencyAt:Math.max(ledger.emergencyAt,next.emergencyAt),tutorialEvents:[...new Set([...(ledger.tutorialEvents||[]),...(!next.onboarding.review?next.onboarding.events:[])])],supportAmounts:{feed:Math.max(ledger.supportAmounts?.feed||0,next.onboarding.supportAmounts.feed),fish:Math.max(ledger.supportAmounts?.fish||0,next.onboarding.supportAmounts.fish),decor:Math.max(ledger.supportAmounts?.decor||0,next.onboarding.supportAmounts.decor)}};}
function recoverTutorialTransaction(id){
 const ledger=readGifts(id);if(!ledger.pending)return null;const pending=validate(ledger.pending),raw=localStorage.getItem(CONFIG.SAVE_KEY),current=raw?JSON.parse(raw):null;
 const needsCommit=!current||current.saveId!==id||current.onboarding?.transactionId!==pending.onboarding.transactionId;
 if(needsCommit)localStorage.setItem(CONFIG.SAVE_KEY,JSON.stringify(pending));
 const clean={...ledger};delete clean.pending;localStorage.setItem(giftKey(id),JSON.stringify(clean));return needsCommit?pending:null;
}
function mergeGiftLedger(next){
 const ledger=readGifts(next.saveId);next.rewardPaid??={};for(const [id,v]of Object.entries(ledger.rewardPaid||{})){if(!ACHIEVEMENTS.some(a=>a.id===id)||!Number.isInteger(v)||v<0||v>CONFIG.MAX_COINS)throw Error('獎勵補發紀錄不完整');next.rewardPaid[id]=Math.max(next.rewardPaid[id]||0,v);next.achievements[id]={completed:true,rewardClaimed:true};const variant=ACHIEVEMENTS.find(a=>a.id===id).reward.variant;if(variant&&!next.unlockedVariants.includes(variant))next.unlockedVariants.push(variant);}next.gifts=[...new Set([...next.gifts,...ledger.ids])];next.emergencyAt=Math.max(next.emergencyAt,ledger.emergencyAt);
 const o=next.onboarding;o.hints=[...new Set([...o.hints,...(ledger.hints||[])])];if(!o.review){o.events=[...new Set([...o.events,...(ledger.tutorialEvents||[])])];if(o.everCompleted||next.gifts.includes('tutorialComplete'))o.events=[...window.AquariumSave.TUTORIAL_KEYS];const n=window.AquariumSave.TUTORIAL_KEYS.findIndex(k=>!o.events.includes(k));o.step=n<0?window.AquariumSave.TUTORIAL_KEYS.length:n;o.completed=n<0;o.everCompleted||=o.completed;if(o.completed&&!next.gifts.includes('tutorialComplete'))next.gifts.push('tutorialComplete');}
 o.supportAmounts={feed:Math.max(o.supportAmounts.feed,ledger.supportAmounts?.feed||0),fish:Math.max(o.supportAmounts.fish,ledger.supportAmounts?.fish||0),decor:Math.max(o.supportAmounts.decor,ledger.supportAmounts?.decor||0)};
 if(next.gifts.includes('demoCollected'))for(const t of next.tanks)t.drops=t.drops.filter(c=>c.id!=='tutorial-demo-'+next.saveId);
 localStorage.setItem(giftKey(next.saveId),JSON.stringify(ledgerRecord(ledger,next)));
}
// Write-ahead snapshot couples support, payment, delivery and event evidence.
// A crash after the journal write is completed on the next load; failed writes roll back.
function protectedTransaction(mutate){
 if(!started||conflict||saveBlocked||protectedBusy)return false;
 if(lastPersistedState!==null&&localStorage.getItem(CONFIG.SAVE_KEY)!==lastPersistedState){conflict=true;saveLabel();toast('另一個分頁已更新進度，請重新讀取自動存檔。');return false;}
 protectedBusy=true;const before=JSON.stringify(state),key=giftKey();let raw,ledger,written=false;const wasBatching=batching;
 try{
  raw=localStorage.getItem(key);ledger=readGifts();state.rewardPaid??={};for(const[id,v]of Object.entries(ledger.rewardPaid||{})){if(!ACHIEVEMENTS.some(a=>a.id===id)||!Number.isInteger(v)||v<0||v>CONFIG.MAX_COINS)throw Error('獎勵帳本無法讀取');state.rewardPaid[id]=Math.max(state.rewardPaid[id]||0,v);}state.gifts=[...new Set([...state.gifts,...ledger.ids])];batching=true;
  if(mutate()===false){state=window.AquariumSave.attach(JSON.parse(before));return false;}
  state.onboarding.transactionId=uid();const pending=validate(snapshot()),record=ledgerRecord(ledger);localStorage.setItem(key,JSON.stringify({...record,pending}));written=true;
  batching=wasBatching;if(!save())throw Error('無法保存交易');
  try{localStorage.setItem(key,JSON.stringify(record));}catch(e){/* The durable journal will be reconciled before the next load. */}
  return true;
 }catch(e){state=window.AquariumSave.attach(JSON.parse(before));rebuildRuntime();if(written)try{if(raw===null)localStorage.removeItem(key);else localStorage.setItem(key,raw);}catch(ignore){saveBlocked=true;}updateUI();toast('這次操作尚未成功保存，資源已保留。請確認儲存空間後再試。');return false;}
 finally{batching=wasBatching;protectedBusy=false;}
}
function applyTutorialGift(id){if(state.gifts.includes(id))return;const reward=giftRewards[id];if(!reward)return;state.gifts.push(id);for(const kind of Object.keys(FEEDS))if(reward[kind]&&!(id==='level4'&&state.feedInventory.protein>0))state.feedInventory[kind]=Math.min(999999,state.feedInventory[kind]+reward[kind]);}
function grantGift(id){if(!protectedTransaction(()=>applyTutorialGift(id)))return false;updateUI();return true;}
function prepareLessonFood(kind){const id=kind==='general'?'lessonGeneralRecovery':'lessonSmallRecovery';if(state.feedInventory[kind]||state.gifts.includes(id))return;if(grantGift(id))toast('補上一份練習需要的飼料。選好飼料後，再點魚缸上方的水面。');}
function demoCoinId(){return 'tutorial-demo-'+state.saveId;}
function prepareLessonCoin(){
 let c=state.drops[0];if(!c){const candidate={id:demoCoinId(),x:.25,y:.3,value:1};if(!protectedTransaction(()=>{state.drops.push(candidate);if(!state.gifts.includes('demoCoin'))state.gifts.push('demoCoin');}))return null;c=candidate;}
 return {...c,collect:()=>collect(c)};
}
function prepareLessonFish(){
 if(state.onboarding.review)return {review:true};if(state.fishes.length<state.tankCapacity)return {};
 const available=state.tanks.find(t=>t.fishes.length<TANK_TIERS[t.tier-1].capacity);if(!available)return {review:true};
 const move=button('切換到 '+available.name,()=>{dialog.close();switchTank(available.id);shopTab='fish';shop();tutorial.render();},'place-button');move.id='tutorial-room-help';$('dialog-content').append(move);return {move};
}
function prepareLessonDecor(){
 const starter={river:1,smallplant:2,smallrock:1};
 const already=Object.entries(state.purchasedDecorations).some(([id,n])=>n>(starter[id]||0));
 return {review:activeTank().habitat==='marine'||state.onboarding.review||state.onboarding.decorReuse||state.gifts.includes('decorSupport')||already||!availableDecorPosition('smallplant')};
}
function prepareLessonEditing(){
 if(dialog.open){if(dialogMode==='more'&&$('tutorial-edit'))return {target:$('tutorial-edit'),copy:'在「更多」選單選「調整布置」，再移動魚缸裡的裝飾。'};return {target:$('dialog-close'),copy:'先按視窗右上角 ×，回到魚缸。'};}
 if(!editing)return {target:$('more-menu'),copy:'按「更多」→「調整布置」，再選取裝飾，試著移動位置。'};
 const item=editableDecorations().find(d=>d.id===editSelection)||editableDecorations()[0];
 return {target:item?editorHandles.get(item.id):$('edit-done')};
}
function showFeatureHint(id,text,action){
 if(state.onboarding.hints.includes(id)||!started||protectedBusy||conflict||saveBlocked)return false;
 if(!protectedTransaction(()=>state.onboarding.hints.push(id)))return false;
 let box=$('feature-hint');if(!box){box=document.createElement('aside');box.id='feature-hint';box.setAttribute('role','status');document.querySelector('#game .controls').before(box);}
 box.replaceChildren(paragraph(text));if(action)box.append(button(id==='upgrade'?'查看升級條件':'我的魚缸',()=>{box.hidden=true;tankMenu();},'place-button'));
 box.append(button('知道了',()=>{box.hidden=true;},'place-button'));box.hidden=false;return true;
}
function checkFeatureHints(){
 if(!started||!state.onboarding.completed||protectedBusy||$('feature-hint')&&!$('feature-hint').hidden)return;
 const o=state.onboarding,next=TANK_TIERS[state.tankTier];
 if(state.level>=5&&!o.hints.includes('marineReady'))showFeatureHint('marineReady','海水缸解鎖了！海水含有較多鹽分，適合不同的生物。遊戲分開淡水與海水，真實飼養還需要合適的設備與照顧。',true);
 else if(state.level>=3&&state.level<5&&!o.hints.includes('marineSoon'))showFeatureHint('marineSoon','繼續養魚，到養魚等級 5 就能開啟海水缸，認識珊瑚礁附近的魚兒。');
 else if(allFish().some(f=>state.feedInventory[FOOD_FOR[f.species]]<=2)&&!o.hints.includes('foodBudget'))showFeatureHint('foodBudget','飼料快用完了！請先留 10～16 金幣補充適合的飼料；也可以收取魚缸金幣、領取已完成的成就獎勵。');
 else if(!o.hints.includes('backup'))showFeatureHint('backup','遊戲會自動存檔。下次使用同一台裝置、同一個瀏覽器，按「繼續上次的遊戲」就能接著玩。');
 else if(state.level>=4&&state.tanks.length===1&&!o.hints.includes('tank2'))showFeatureHint('tank2','現在可以開啟新的魚缸了！每缸最多十隻、可獨立命名，金幣與飼料共用。',true);
 else if(state.tanks.every(t=>t.tier===1)&&next&&!o.hints.includes('upgrade')&&(state.fishes.length>=state.tankCapacity||(state.level>=next.level&&state.coins>=next.price)))showFeatureHint('upgrade',`想養更多魚嗎？點小居民數量旁的「升級魚缸」，看看從 ${state.tankCapacity} 隻增加到 ${next.capacity} 隻需要什麼條件。`,true);
}
function reviewPurchase(kind,done){const b=button(kind==='fish'?'看看購魚流程（不消費）':kind==='decor'?'使用現有布置練習（不消費）':'看看購買與庫存（不消費）',()=>{done();dialog.close();tutorial.render();},'place-button');b.id='tutorial-review-purchase';$('dialog-content').append(b);return b;}
function checkLevelGifts(){if(state.level>=2&&!state.gifts.includes('level2')){if(grantGift('level2'))toast('養魚等級 2：送你小型魚飼料 ×3 份，鼠魚、斑馬魚、白雲山魚、紅蓮燈和三角燈都適用。');}if(state.level>=4&&!state.gifts.includes('level4')){if(grantGift('level4'))toast('你解鎖了高蛋白飼料！神仙魚、鬥魚、蜜糖麗麗魚、酷利泥鰍和玻利維亞鳳凰都適用，記得在商店補充喔！');}}
function feedShop(){shopTab='feed';shop();tutorial.report('feedShopOpened');tutorial.render();}
function renderFeedShop(grid){
 for(const [id,d] of Object.entries(FEEDS)){
  const card=document.createElement('article');card.className='shop-item feed-item';card.dataset.feed=id;
  const display=document.createElement('div');display.className='feed-display';display.style.setProperty('--feed-main',d.color);
  const bag=document.createElement('div');bag.className='feed-bag';bag.dataset.feed=id;bag.setAttribute('role','img');bag.setAttribute('aria-label',d.name+'的袋裝飼料示意圖');
  const brand=document.createElement('span');brand.className='feed-brand';brand.textContent='悠悠水族箱';
  const seal=document.createElement('span');seal.className='feed-seal';seal.setAttribute('aria-hidden','true');
  const fishMark=document.createElementNS('http://www.w3.org/2000/svg','svg');fishMark.setAttribute('viewBox','0 0 80 48');fishMark.setAttribute('aria-hidden','true');fishMark.classList.add('feed-fishmark');
  const body=document.createElementNS('http://www.w3.org/2000/svg','path');body.setAttribute('d','M10 24Q35 -2 59 24Q35 50 10 24Z M58 24L73 8V40Z');body.setAttribute('fill','currentColor');
  const eye=document.createElementNS('http://www.w3.org/2000/svg','circle');eye.setAttribute('cx','25');eye.setAttribute('cy','20');eye.setAttribute('r','2.2');eye.setAttribute('fill','#285b50');fishMark.append(body,eye);
  const windowEl=document.createElement('span');windowEl.className='feed-bag-window';windowEl.setAttribute('aria-hidden','true');
  const pack=document.createElement('span');pack.className='feed-pack-count';pack.textContent=d.pack+' 份裝';
  bag.append(seal,brand,fishMark,windowEl,pack);display.append(bag);
  const h=document.createElement('h3');h.textContent=d.name;
  const names=d.species.map(x=>SPECIES[x].name).join('、');
  const suitable=paragraph(names,'feed-species');suitable.setAttribute('aria-label','適合魚種：'+names);
  const detail=paragraph(`每包 ${d.pack} 份 · ${d.price} 金幣`,'feed-package-detail');
  const stock=paragraph(`現有庫存：${state.feedInventory[id]} 份`,'feed-stock');
  const b=button(state.level<d.level?`養魚等級 ${d.level} 解鎖`:`購買 · ${d.price} 金幣`,()=>buyFeed(id),'buy');
  b.id='buy-feed-'+id;b.disabled=state.level<d.level;
  card.append(display,h,suitable,detail,stock,b);grid.append(card);
 }
 grid.append(paragraph('遊戲把飼料簡化成三種。記得留金幣補充飼料；飽足度大於 0% 會正常產幣，0% 停產。已產生的金幣仍可收取，也可到「更多 → 成就」查看可領獎勵。','dialog-note'));
}
function buyFeed(id){
 if(conflict||saveBlocked||protectedBusy)return;const d=FEEDS[id];if(!d||state.level<d.level)return;
 const suitable=(state.fishes.length?state.fishes:allFish()).some(f=>FOOD_FOR[f.species]===id);
 if(tutorial.expects('feedBought')&&!suitable){shopMessage('先選已飼養的魚兒能吃的飼料。');return;}
 if(state.feedInventory[id]>999999-d.pack||state.feedPurchases[id]>=999999){shopMessage('飼料庫存已達上限，暫時不能再買了。');return;}
 if(!supportAvailable('feedSupport',d.price)){shopMessage('金幣還不夠，先回魚缸收金幣，存夠再買飼料吧！');return;}
 const beforeStep=state.onboarding.step;let advanced=false,subsidy=0;
 if(!protectedTransaction(()=>{subsidy=applySupport('feedSupport',d.price);if(subsidy<0)return false;state.coins-=d.price;state.feedInventory[id]+=d.pack;state.feedPurchases[id]++;if(suitable)advanced=tutorial.record('feedBought');})){renderShop();return;}
 updateUI();sound('buy');if(advanced){dialog.close();tutorial.finish(beforeStep,true);}else renderShop();
 const message='已購買'+d.name+' ×'+d.pack+' 份！目前 '+state.feedInventory[id]+' 份。';if(subsidy)supportNotice(advanced);else if(!advanced)shopMessage(message);
}
function renderTankSelector(){const root=$('tank-selector');if(!root)return;const signature=state.tanks.map(t=>[t.id,t.name,t.tier,t.fishes.length,t.drops.length,t.id===state.activeTankId].join('|')).join(';');if(root.dataset.signature===signature)return;root.dataset.signature=signature;root.replaceChildren();for(const t of state.tanks){const b=button('',()=>switchTank(t.id),'tank-switch');b.dataset.tankId=t.id;b.setAttribute('aria-pressed',String(t.id===state.activeTankId));const name=document.createElement('strong');name.textContent=t.name;b.append(name,paragraph(`${t.habitat==='marine'?'海水':'淡水'} · ${t.fishes.length} / ${TANK_TIERS[t.tier-1].capacity} 隻 · 魚缸 ${t.tier} 級${t.drops.length?' · 有金幣':''}`));root.append(b);}const add=button('＋ 新魚缸',tankMenu,'tank-add');root.append(add);}
function switchTank(id){if(conflict||saveBlocked||id===state.activeTankId||!state.tanks.some(t=>t.id===id))return;if(editing)finishEditing();if($('observation')?.open)$('obs-return').click();setFeeding(false);closeCard();state.activeTankId=id;bindTank(state.tanks.find(t=>t.id===id));specimenPose=null;feedAt=-99;buildBackground();save();updateUI();draw();tutorial.render();}
function renderTankOffers(){
 for(const habitat of ['freshwater','marine']){
 const count=state.tanks.filter(t=>(t.habitat||'freshwater')===habitat).length,offer=(habitat==='marine'?window.AquariumData.MARINE_OFFERS:TANK_OFFERS).find(o=>o.number===count+1);if(!offer)continue;
 const type=habitat==='marine'?'海水缸':'淡水缸',box=document.createElement('section');box.className='new-tank-offer';
 const b=button(state.level<offer.level?'養魚等級 '+offer.level+' 可解鎖':'購買第 '+offer.number+' 個'+type+' · '+offer.price+' 金幣',()=>{
 if(conflict||saveBlocked||state.level<offer.level||state.coins<offer.price){toast('請先達到等級並存夠金幣。');return;}
 confirmAction('購買新的'+type+'？',offer.price+' 金幣；可獨立命名、升級及布置，起始可養五隻生物。'+(habitat==='marine'&&count===0?' 建議另外留 750～900 金幣迎接第一隻海水魚，也記得留錢補充飼料。':''),()=>{
 if(conflict||saveBlocked||state.tanks.filter(t=>(t.habitat||'freshwater')===habitat).length!==count)return;
 let t;if(!protectedTransaction(()=>{if(state.coins<offer.price||state.level<offer.level)return false;state.coins-=offer.price;t=window.AquariumSave.emptyTank(uid(),'第 '+offer.number+' 個'+type);t.habitat=habitat;if(habitat==='marine'){t.substrate='white';t.purchasedDecorations.white=1;}state.tanks.push(t);}))return;
 tankContexts.set(t.id,{runtime:new Map(),food:[],effects:[],poiCache:buildPOI([],DECORATIONS,decorLayout,W,H)});dialog.close();switchTank(t.id);toast(type+'準備好了！可以開始迎接新居民。');});$('dialog-content').querySelector('.confirm').textContent='確認購買';
 },'buy');b.id=habitat==='marine'?'buy-marine-tank':'buy-tank';b.disabled=state.level<offer.level;box.append(paragraph('下一個'+type+'：第 '+offer.number+' 缸 · 等級 '+offer.level+' · '+offer.price+' 金幣'),b);$('dialog-content').append(box);
 }
}
function moveFish(id){const introduce=state.tanks.length>1&&!state.onboarding.hints.includes('move');if(introduce&&!protectedTransaction(()=>state.onboarding.hints.push('move')))return;const f=state.fishes.find(f=>f.id===id);if(!f)return;const source=state.activeTankId;openDialog('移動魚兒','move');if(introduce)$('dialog-content').append(paragraph('想讓魚兒住進另一個魚缸嗎？你可以把牠移過去，不需要重新購買。','tutorial-shop-copy'));$('dialog-content').append(paragraph(`替${f.name}選一個新的家。名字、成長、飽足度、個性及配色都會保留。`));for(const t of state.tanks.filter(t=>t.id!==source&&(t.habitat||'freshwater')===(SPECIES[f.species].habitat||'freshwater'))){const cap=TANK_TIERS[t.tier-1].capacity;const b=button(`${t.name} · ${t.fishes.length} / ${cap} 隻`,()=>confirmAction('確認移動魚兒？',`${f.name}將搬到${t.name}，不收取費用。`,()=>{if(conflict||saveBlocked)return;const from=state.tanks.find(q=>q.id===source),to=state.tanks.find(q=>q.id===t.id),fish=from.fishes.find(q=>q.id===id);if(!fish||(to.habitat||'freshwater')!==(SPECIES[fish.species].habitat||'freshwater')||to.fishes.length>=TANK_TIERS[to.tier-1].capacity){toast('目標魚缸已滿，魚兒仍在原缸。');return;}from.fishes=from.fishes.filter(q=>q.id!==id);to.fishes.push(fish);if(save()){tankContexts.get(source).runtime.delete(id);tankContexts.get(t.id).runtime.set(id,makeRuntime(fish,to.fishes.length));closeCard();dialog.close();updateUI();toast('魚兒已安全搬家！');}}),'place-button');b.dataset.moveTo=t.id;b.disabled=t.fishes.length>=cap;$('dialog-content').append(b);}if(state.tanks.length<2)$('dialog-content').append(paragraph('擁有第二個魚缸後，就能替魚兒搬家。'));}
for(const id of Object.keys(FEEDS))$('feed-'+id).onclick=()=>selectFeed(id);
$('feed-shop').onclick=feedShop;$('tank-upgrade-shortcut').onclick=tankMenu;
$('home-new').onclick=newTank;

setupDesignToolbar();initialize();new ResizeObserver(resize).observe(canvas);resize();requestAnimationFrame(frame);
// Test diagnostics are read-only snapshots and exist only when explicitly requested locally.
if(CONFIG.TEST_MODE||new URLSearchParams(location.search).get('debug')==='1')Object.defineProperty(window,'aquariumDebug',{value:()=>({state:{...structuredClone(state),fishes:structuredClone(state.fishes),drops:structuredClone(state.drops),tankName:state.tankName,tankTier:state.tankTier,tankCapacity:state.tankCapacity},runtime:[...runtime].map(([id,r])=>({id,...r})),food:structuredClone(food),diagnostics:{...diagnostics,sceneDepths:state.fishes.map(f=>({id:f.id,depth:residentDepth(f,runtime.get(f.id))}))},config:CONFIG,species:SPECIES,decorations:DECORATIONS,saveBlocked,conflict,started,audioState:audioCtx?.state||null,editing,editSelection,poi:[...poiCache.byId.values()],session:session?{...session}:null,tiers:TANK_TIERS,variants:VARIANTS,personalities:PERSONALITIES,achievementDefinitions:ACHIEVEMENTS,observation:observation.debug()})});
})();
