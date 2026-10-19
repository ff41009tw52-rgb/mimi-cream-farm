/* 悠悠水族箱 V0.6 — gift tutorial, schema 5 and shared multi-tank progression. */
(() => {
'use strict';
const {CONFIG,SPECIES,DECORATIONS,PERSONALITIES,TANK_TIERS,VARIANTS,ACHIEVEMENTS,FEEDS,FOOD_FOR,TANK_OFFERS}=window.AquariumData;
const {validate,personalityFor,snapX,nearestSnap}=window.AquariumSave;
const {buildPOI,tickEnvironment}=window.AquariumWorld;
const coinInterval=s=>s.coinInterval*CONFIG.COIN_SCALE;
const growthTime=s=>s.growthTime*CONFIG.GROWTH_SCALE;
const $=id=>document.getElementById(id), clamp=(v,a=0,b=100)=>Math.min(b,Math.max(a,v));
const rand=(a,b)=>a+Math.random()*(b-a), uid=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const stage=g=>g>=100?2:g>=35?1:0, stageName=g=>['幼魚','亞成魚','成魚'][stage(g)];
const timeLabel=t=>new Date(t).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false});
const canvas=$('tank'), ctx=canvas.getContext('2d'), dialog=$('dialog');
let started=false,batching=false,simulatingBackground=false,lastPersistedState=null;
const tankContexts=new Map();
let state, W=1000,H=500,dpr=1, bg, runtime=new Map(), food=[],effects=[],selected=null,feeding=false;
let dirty=false,saveTimer=0,lastSaved=0,saveBlocked=false,conflict=false,simTime=0,feedAt=-99;
let uiAccumulator=0,saveAccumulator=0,lastFrame=0,hiddenAt=0,toastTimer,dialogMode='',resetStep=0;
const diagnostics={writes:0,eaten:0,spawned:0,frames:0,frameMax:0,costTotal:0,costMax:0,bursts:0,pauses:0,discoveries:0,sounds:0,environmentVisits:0,environmentSeconds:0,variantUnlocks:0,achievementCompletions:0,achievementRewards:0};
let audioCtx=null,audioLast=-99,audioEatLast=-99,shopTab='fish';
let foreground,poiCache={byId:new Map(),bySpecies:{}},editing=false,editSelection=null,drag=null,editPreview=null,editCacheDirty=false;
const shopVariants=new Map(),editorHandles=new Map();
const session=CONFIG.PLAYTEST?{version:'0.6',elapsedSeconds:0,first:{feed:null,fish:null,shop:null,buy:null,place:null},counts:{feed:0,shop:0,buy:0,place:0},onboardingCompleted:false,jsErrors:0,frames:0,longFrames:0,frameMsTotal:0}:null;
const levelFor=x=>CONFIG.LEVEL_XP.reduce((l,v,i)=>x>=v?i+1:l,1);
const zones={left:'左側',center:'中央',right:'右側'};

function newFish(species,index=0,variant='normal'){const s=SPECIES[species],id=uid();return {id,species,personality:personalityFor(id,species),variant,playSeconds:0,adultRecorded:false,name:s.nickname+(index?` ${index+1}`:''),hunger:68,growth:0,growthStage:'幼魚',size:s.size*.7,mood:'開心',createdAt:Date.now(),coinProgress:coinInterval(s)*rand(.35,.55)};}
function starterExtras(fishes){
 const discovery={};for(const f of fishes){const d=discovery[f.species]||(discovery[f.species]={total:0,highestStage:0});d.total++;d.highestStage=Math.max(d.highestStage,stage(f.growth));}
 return {xp:0,level:1,careProgress:0,collection:discovery,purchasedDecorations:{river:1,smallplant:2,smallrock:1},placedDecorations:[{id:uid(),decoration:'smallplant',zone:'left',slot:'back1'},{id:uid(),decoration:'smallplant',zone:'right',slot:'back1'},{id:uid(),decoration:'smallrock',zone:'center',slot:'floor1'}],substrate:'river',soundEnabled:true,cleanReadyAt:0,mode:CONFIG.TEST_MODE?'test':'normal'};
}
function fresh(name){const fishes=['guppy','goldfish','cory'].map(k=>newFish(k));const next=window.AquariumSave.freshFromLegacy({schemaVersion:2,gameVersion:'0.2',savedAt:0,coins:CONFIG.START_COINS,waterQuality:100,tankCapacity:CONFIG.CAPACITY,fishes,drops:[],...starterExtras(fishes)},name);next.tankName=window.AquariumSave.tankName(name);next.onboarding={completed:false,skipped:false,step:0,welcomed:false,paused:false,coinHintShown:false};return next;}
function mood(f){return f.hunger<25?'肚子餓':f.hunger>=90?'吃得好滿足':'開心';}
function syncFish(f){f.growthStage=stageName(f.growth);f.size=SPECIES[f.species].size*(.7+.3*f.growth/100);f.mood=mood(f);}
function oldSnapshot(){return {...state,schemaVersion:CONFIG.SCHEMA_VERSION,gameVersion:CONFIG.GAME_VERSION,savedAt:Date.now(),fishes:state.fishes.map(f=>({...f})),drops:state.drops.map(c=>({...c}))};}
function snapshot(){return {...JSON.parse(JSON.stringify(state)),schemaVersion:5,gameVersion:'0.6',savedAt:Date.now()};}
function save(manual=false){
  clearTimeout(saveTimer);saveTimer=0;
  if(!started||saveBlocked||conflict){saveLabel();if(manual)toast('目前無法儲存進度。原存檔已保留。');return false;}
  let autoSaved=false;
  try{
    const payload=snapshot(),json=JSON.stringify(payload);
    localStorage.setItem(CONFIG.SAVE_KEY,json);diagnostics.writes++;
    state.savedAt=lastSaved=payload.savedAt;lastPersistedState=json;dirty=false;autoSaved=true;
    if(manual){localStorage.setItem(CONFIG.MANUAL_KEY,json);diagnostics.writes++;}
    saveLabel();persistSession();
    if(manual)toast('✓ 遊戲已儲存，可隨時讀取這個時間點。');
    return true;
  }catch(error){if(!autoSaved&&lastPersistedState){state=validate(JSON.parse(lastPersistedState));rebuildRuntime();updateUI();}$('save-status').textContent=autoSaved?'⚠ 自動存檔已完成，手動存檔失敗':'⚠ 目前無法儲存進度';$('save-status').classList.add('error');if(manual)toast(autoSaved?'最新進度已自動儲存；手動存檔未更新，請確認瀏覽器有可用空間。':'儲存失敗，請確認瀏覽器有可用空間。');return false;}
}
function markDirty(important=false){if(!started)return;if(batching){dirty=true;return;}dirty=true;if(important){save();return;}if(!saveTimer&&!saveBlocked&&!conflict)saveTimer=setTimeout(()=>save(),CONFIG.SAVE_DEBOUNCE_MS);}
function saveLabel(){const e=$('save-status');e.classList.toggle('error',saveBlocked||conflict);e.textContent=conflict?'⚠ 另一分頁已更新，請重新讀取':saveBlocked?'⚠ 原存檔已保留，暫停儲存':lastSaved?`✓ 已自動存檔 ${timeLabel(lastSaved)}`:'尚未儲存';}
function offline(seconds){
 const t=clamp(seconds,0,CONFIG.MAX_OFFLINE_TIME),hours=t/3600;let reward=0,changed=false;
 for(const f of allFish()){const before=stage(f.growth);if(f.hunger>25){f.growth=clamp(f.growth+hours*CONFIG.OFFLINE_GROWTH_PER_HOUR*(900/SPECIES[f.species].growthTime));if(f.hunger>=45)reward+=Math.floor(hours*2*SPECIES[f.species].values[stage(f.growth)]);}
  f.hunger=clamp(f.hunger-hours*CONFIG.OFFLINE_HUNGER_PER_HOUR);syncFish(f);recordAdult(f);state.collection[f.species].highestStage=Math.max(state.collection[f.species].highestStage,stage(f.growth));if(stage(f.growth)!==before){gainXP(8,false);changed=true;}}
 reward=Math.min(reward,CONFIG.OFFLINE_MAX_REWARD,CONFIG.MAX_COINS-state.coins);state.coins+=reward;dirty=true;
 if(seconds>=60){const m=Math.floor(seconds/60),label=m>=60?`${Math.floor(m/60)} 小時 ${m%60} 分`:`${m} 分`;toast(`歡迎回來！離開了 ${label}${seconds>CONFIG.MAX_OFFLINE_TIME?'（最多計算 4 小時）':''}${reward?`，獲得 ${reward} 金幣`:''}${changed?'，魚兒長大了':''}。`,6500);}
}
function initialize(){state=fresh();refreshHome();paintHomeFish();}
function makeRuntime(f,i=0){const s=SPECIES[f.species],x=rand(.14,.86),y=rand(...s.depth);return {x,y,vx:(i%2?-.5:.5)*s.speed,vy:0,target:{x:rand(.15,.85),y},turn:i%2?-1:1,heading:0,phase:rand(0,6.28),wander:rand(2,6),pause:0,burst:0,direction:i%2?-1:1,position:{x,y},preferredDepth:s.depth,speed:s.speed,coinValue:s.values[stage(f.growth)],behavior:'巡遊',behaviorState:'explore',poi:null,poiWait:rand(12,32),poiRemaining:0,poiReached:false,hiddenAmount:0,environmentSeconds:0,environmentVisits:0};}
function allFish(){return state.tanks.flatMap(t=>t.fishes);}
function bindTank(t){const c=tankContexts.get(t.id);runtime=c.runtime;food=c.food;effects=c.effects;poiCache=c.poiCache;}
function rebuildRuntime(){allFish().forEach(syncFish);tankContexts.clear();const active=state.activeTankId;for(const t of state.tanks){state.activeTankId=t.id;tankContexts.set(t.id,{runtime:new Map(t.fishes.map((f,i)=>[f.id,makeRuntime(f,i)])),food:[],effects:[],poiCache:buildPOI(t.placedDecorations,DECORATIONS,decorLayout,W,H)});}state.activeTankId=active;bindTank(state.tanks.find(t=>t.id===active));selected=null;$('fish-card').hidden=true;}
function dismissToast(){const t=$('toast');clearTimeout(toastTimer);if(t.matches(':popover-open'))t.hidePopover();t.hidden=true;}
function toast(text,ms=6000){if(simulatingBackground)return;clearTimeout(toastTimer);const t=$('toast'),copy=document.createElement('span');copy.textContent=text;const close=button('×',dismissToast,'toast-close');close.setAttribute('aria-label','關閉提示');t.replaceChildren(copy,close);t.hidden=false;try{t.showPopover();}catch(e){/* Older browsers use the fixed-position fallback. */}toastTimer=setTimeout(dismissToast,Math.max(ms,Math.min(14000,text.length*180)));}
function updateUI(){if(!state)return;renderTankSelector();renderFeedChoices();
 $('tank-name').textContent=state.tankName;$('tank-message').textContent=selected&&runtime.get(selected)?runtime.get(selected).behavior:'慢慢游，慢慢長大。';
 $('coins').textContent=state.coins.toLocaleString();
 $('capacity').replaceChildren(document.createTextNode(`${state.fishes.length} `),Object.assign(document.createElement('small'),{textContent:`/ ${state.tankCapacity}`}));
 $('level').textContent=`養魚等級 ${state.level}`;const floor=CONFIG.LEVEL_XP[state.level-1],ceiling=CONFIG.LEVEL_XP[state.level];$('xp-bar').style.width=`${ceiling?(state.xp-floor)/(ceiling-floor)*100:100}%`;
 const next=Object.values(SPECIES).filter(s=>s.unlockLevel===state.level+1).map(s=>s.name);$('next-unlock').textContent=next.length?`下一級解鎖：${next.join('、')}`:`已解鎖全部魚種`;
 $('collect-all').hidden=!state.drops.length;$('collect-all').textContent=`全部收取（${state.drops.length}）`;$('feed').disabled=editing;
 if(selected){const f=state.fishes.find(f=>f.id===selected);if(f){$('fish-name').textContent=f.name;$('fish-species').textContent=SPECIES[f.species].name;$('fish-stage').textContent=stageName(f.growth);$('fish-hunger').textContent=`${Math.round(f.hunger)}%`;$('fish-growth').textContent=`${Math.floor(f.growth)}%`;$('hunger-meter').value=f.hunger;$('growth-meter').value=f.growth;$('fish-mood').textContent=`目前狀態：${f.hunger<25?'肚子餓':runtime.get(f.id)?.behavior||mood(f)}`;$('fish-personality').textContent=`個性：${PERSONALITIES[f.personality].name}`;$('fish-food').textContent='食物：'+FEEDS[FOOD_FOR[f.species]].name;}}
}
function selectFish(id){if(editing)return;metric('fish');selected=id;$('fish-card').hidden=false;updateUI();tutorial.report('fishOpened');}
function closeCard(){selected=null;$('fish-card').hidden=true;}
let selectedFeed=null;
function renderFeedChoices(){const root=$('feed-choices');if(!root)return;for(const id of Object.keys(FEEDS)){const b=$('feed-'+id);if(b){b.setAttribute('aria-pressed',String(selectedFeed===id));b.querySelector('small').textContent=`剩餘 ${state.feedInventory[id]} 份`;}}$('feed-current').textContent=selectedFeed?`已選 ${FEEDS[selectedFeed].name} · 剩餘 ${state.feedInventory[selectedFeed]} 份`:'先選擇一種飼料';}
function setFeeding(on){feeding=on;selectedFeed=null;$('feed').setAttribute('aria-pressed',String(on));$('feeding-hint').hidden=!on;canvas.style.cursor=on?'crosshair':'pointer';if(on){closeCard();tutorial.report('feedOpened');}else $('surface-cue').hidden=true;renderFeedChoices();if(on&&innerWidth<=1050)requestAnimationFrame(()=>{if(feeding)$('feed-choices').scrollIntoView({block:'center'});});}
function selectFeed(id){if(!feeding||!FEEDS[id])return;selectedFeed=id;renderFeedChoices();tutorial.report('selected:'+id);$('surface-cue').hidden=false;canvas.focus({preventScroll:true});if(innerWidth<=1050)requestAnimationFrame(()=>{if(feeding)canvas.scrollIntoView({block:'start'});});}
function feed(x,confirmed=false){
 if(conflict||saveBlocked)return;if(!selectedFeed){toast('先選擇一種飼料，再點魚缸水面。');return;}
 const kind=selectedFeed;
 if(!state.feedInventory[kind]){toast('這種飼料用完了！可以到商店購買新的飼料。');$('feed-shop').hidden=false;return;}
 if(simTime-feedAt<CONFIG.FEED_COOLDOWN)return;if(food.length+3>CONFIG.MAX_FOOD){toast('飼料還很多，先讓魚兒吃完吧！');return;}
 if(!confirmed&&!state.fishes.some(f=>FOOD_FOR[f.species]===kind)){
  const tankId=state.activeTankId;
  confirmAction('這個魚缸沒有適合的魚兒','這個魚缸目前沒有魚兒會吃這種飼料，確定要投放嗎？',()=>{if(state.activeTankId!==tankId||selectedFeed!==kind)return;dialog.close();feed(x,true);});$('dialog-content').querySelector('.confirm').textContent='仍要投放';return;
 }
 state.feedInventory[kind]--;if(!save())return;
 feedAt=simTime;for(let i=0;i<3;i++)food.push({id:uid(),x:clamp(x+(i-1)*.017,.06,.94),y:.08+i*.006,bottom:0,phase:rand(0,7),kind});effects.push({x,y:.08,text:'',life:1,kind:'ripple'});sound('feed');metric('feed');const advanced=tutorial.report('fed:'+kind);if(advanced)setFeeding(false);else renderFeedChoices();dirty=true;
}
function collect(c){
  if(conflict)return;
  const index=state.drops.findIndex(d=>d.id===c.id);if(index<0)return;
  state.drops.splice(index,1);state.coins=clamp(state.coins+c.value,0,CONFIG.MAX_COINS);effects.push({x:c.x,y:c.y,text:`+${c.value}`,life:1.5});
  const rect=canvas.getBoundingClientRect(),hud=$('coins').getBoundingClientRect(),el=document.createElement('i');el.className='coin-flight';el.style.left=`${rect.left+c.x*W}px`;el.style.top=`${rect.top+c.y*H}px`;document.body.append(el);
  const anim=el.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${hud.left-rect.left-c.x*W}px,${hud.top-rect.top-c.y*H}px) scale(.5)`,opacity:.3}],{duration:620,easing:'cubic-bezier(.25,.6,.35,1)'});anim.finished.then(()=>el.remove(),()=>el.remove());gainXP(1);sound('coin');markDirty(true);updateUI();
}
function buy(species){
 if(conflict||saveBlocked)return;const s=SPECIES[species];if(state.level<s.unlockLevel){shopMessage(`養魚等級達到 ${s.unlockLevel}，就能購買${s.name}。`);return;}if(state.fishes.length>=state.tankCapacity){shopMessage('魚缸住滿了！可以升級魚缸，或到魚兒管理中送養。');return;}if(state.coins<s.price){shopMessage('金幣還不夠！先回魚缸收集金幣，再來購買。');return;}
 const variant=shopVariants.get(species)||'normal';if(variant!=='normal'&&!state.unlockedVariants.includes(variant)){shopMessage('這個配色還沒解鎖。可以到魚類圖鑑查看需要完成的條件。');return;}
 state.coins-=s.price;const first=!state.collection[species];const total=(state.collection[species]?.total||0);const f=newFish(species,total,variant);state.fishes.push(f);syncFish(f);runtime.set(f.id,makeRuntime(f,state.fishes.length));
 const history=state.collection[species];state.collection[species]={total:Math.min(9999,total+1),highestStage:history?.highestStage||0,adults:history?.adults||0,variants:[...new Set([...(history?.variants||['normal']),variant])]};state.stats.purchases++;metric('buy');evaluateGoals();gainXP(first?12:2);sound('buy');
 if(first){diagnostics.discoveries++;effects.push({x:.5,y:.4,text:`圖鑑新增：${s.name}`,life:3});toast(`圖鑑新增：${s.name}`,3500);}markDirty(true);updateUI();renderShop();shopMessage(`歡迎${f.name}！目前 ${state.fishes.length} / ${state.tankCapacity} 隻，剩下 ${state.coins} 金幣。`);
}
function shopMessage(text){const e=$('shop-message');if(e){e.textContent=text;e.scrollIntoView({block:'nearest'});}else toast(text);}
function openDialog(title,mode){if(editing)finishEditing();closeCard();dialogMode=mode;$('dialog-title').textContent=title;$('dialog-content').replaceChildren();if(!dialog.open)dialog.showModal();}
function button(text,handler,cls=''){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.addEventListener('click',handler);return b;}
function shop(){if(editing)finishEditing();metric('shop');openDialog('商店','shop');renderShop();tutorial.report('shopOpened');}
function settings(){const expanded=document.querySelector('.save-tools')?.open||false;openDialog('設定','settings');const list=document.createElement('div');list.className='settings-list';
  function row(title,desc,label,fn,danger=false){const r=document.createElement('div');r.className='setting-row';const p=document.createElement('p');p.textContent=title;const small=document.createElement('small');small.textContent=desc;p.append(small);r.append(p,button(label,fn,danger?'danger':''));list.append(r);}
  row('手動存檔','額外保留現在這一刻；自動存檔仍會持續。','存檔',()=>{if(save(true)){dialog.close();}});
  row('讀取手動存檔','回到上次手動保存的時間點。','讀檔',()=>confirmAction('讀取手動存檔？','目前進度將被手動存檔取代。確定要繼續嗎？',()=>loadSaved(true)));
  row('重新讀取自動存檔','讀取最近一次自動保存的進度。','讀取',()=>confirmAction('讀取自動存檔？','目前尚未保存的變更將被取代。確定要繼續嗎？',()=>loadSaved(false)));
  row('重置遊戲','重新開始，魚兒與金幣都會回到最初。','重置',()=>{resetStep=1;confirmAction('確定要重新開始嗎？','重置後，將重新獲得三隻幼魚與 20 金幣；圖鑑與布置也會重新開始。',()=>{resetStep=2;confirmAction('最後確認：刪除目前進度','目前的魚、水族箱與金幣進度將被刪除，且無法復原。',reset,true);},true);},true);
  row('音效',state.soundEnabled?'柔和的操作音效已開啟。':'音效已關閉。',state.soundEnabled?'關閉':'開啟',()=>{state.soundEnabled=!state.soundEnabled;markDirty(true);settings();});


  row('水族箱名稱',state.tankName,'改名字',renameTank);
  row('接續新手教學','繼續未完成的操作教學。','接續',()=>{dialog.close();tutorial.resume();});
  row('重新觀看新手引導','從第一步開始，魚兒與進度都會保留。','重看',()=>{dialog.close();tutorial.replay();});
  row('返回首頁','先保存進度，之後可按繼續遊玩。','返回首頁',goHome);
  if(CONFIG.PLAYTEST)row('本次試玩摘要','只記錄本機匿名操作次數與時間。','匯出試玩摘要',exportSession);

  row('下載存檔','下載進度檔案，之後可以載入。','下載',exportSave);
  row('載入存檔檔案','選擇進度檔案，確認後再載入。','選擇檔案',chooseImport);
  const note=document.createElement('p');note.className='dialog-note';note.textContent='進度保存在這台裝置的瀏覽器。使用相同瀏覽器回來，就能繼續照顧魚兒。';const saveTools=document.createElement('details');saveTools.className='save-tools';saveTools.open=expanded;const heading=document.createElement('summary');heading.textContent='存檔與進度';saveTools.append(heading);const advanced=document.createElement('div');advanced.className='settings-list';for(const r of [...list.children]){if(!['音效','水族箱名稱','接續新手教學','重新觀看新手引導','返回首頁','本次試玩摘要'].some(t=>r.querySelector('p').firstChild.textContent===t))advanced.append(r);}saveTools.append(advanced);$('dialog-content').append(list,note,saveTools);
}
function confirmAction(title,copy,fn,danger=false){openDialog(title,'confirm');const p=document.createElement('p');p.className='confirm-copy';p.textContent=copy;const actions=document.createElement('div');actions.className='confirm-actions';actions.append(button('取消',()=>{resetStep=0;dialog.close();}),button(danger?'確認重置':title==='確認移動魚兒？'?'確認移動':'確定讀取',fn,'confirm'+(danger?' danger':'')));$('dialog-content').append(p,actions);}
function loadSaved(manual){
  try{
    const text=localStorage.getItem(manual?CONFIG.MANUAL_KEY:CONFIG.SAVE_KEY);
    if(!text){toast(manual?'還沒有手動存檔，先按一次存檔吧。':'還沒有自動存檔。');dialog.close();return;}
    const next=validate(JSON.parse(text));mergeRewardLedger(next);mergeGiftLedger(next);
    const wasBlocked=saveBlocked;
    clearTimeout(saveTimer);saveTimer=0;state=next;
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
function reset(){if(resetStep!==2)return;resetStep=0;activate(fresh(),{backup:'before_new'});dialog.close();}
const fishBrief={guppy:'小巧活潑，展開繽紛的大尾巴。',goldfish:'圓潤的身體，慢慢擺動尾鰭。',cory:'在底砂巡游，尋找沉底飼料。',zebra:'帶著水平條紋，輕快地游。',molly:'深色魚身，穩穩地游動。',swordtail:'尾鰭下方有細長的劍狀延伸。',whitecloud:'細細的色帶，喜歡靠近同伴。',cardinal:'藍紅相映的小型群游魚。',angel:'高高的魚鰭，姿態優雅。',betta:'飄逸的長鰭，喜歡獨自巡游。'};
function moreMenu(){openDialog('更多功能','more');const list=document.createElement('div');list.className='more-grid';for(const [id,title,desc,fn]of [['roster','我的魚兒','看看狀態、改名字與管理魚兒',roster],['encyclopedia','魚類圖鑑','收藏魚種與特別配色',encyclopedia],['tank-menu','我的魚缸','升級魚缸與調整布置',tankMenu],['achievements','成就','查看進度與領取獎勵',achievements],['settings','設定','音效、新手引導與存檔',settings]]){const b=button('',fn,'more-item');b.id=id;const label=document.createElement('strong');label.textContent=title;b.append(label,paragraph(desc));list.append(b);}$('dialog-content').append(list);}
function fishMore(){const f=state.fishes.find(f=>f.id===selected);if(!f)return;openDialog('更多魚兒資料','fish-more');const minutes=Math.max(0,Math.floor((Date.now()-f.createdAt)/60000));$('dialog-content').append(paragraph(f.name+' · '+SPECIES[f.species].name,'fish-detail-name'),paragraph(`活動水層：${SPECIES[f.species].depthName}`),paragraph(`已養時間：${minutes>=60?Math.floor(minutes/60)+' 小時 '+minutes%60+' 分鐘':minutes+' 分鐘'}`),paragraph(`心情：${mood(f)}`),paragraph(`配色：${f.variant==='normal'?'普通配色':VARIANTS[f.variant].name}`),paragraph(PERSONALITIES[f.personality].desc));const manage=button('管理魚兒',()=>manageFish(f.id),'place-button');manage.id='manage-fish';$('dialog-content').append(manage,button('回到魚兒資料',()=>{dialog.close();selectFish(f.id);},'back-button'));}
function manageFish(id){const f=state.fishes.find(f=>f.id===id);if(!f)return;openDialog('管理魚兒','manage');$('dialog-content').append(paragraph(f.name+' · '+SPECIES[f.species].name),paragraph('送養後，魚兒會離開魚缸，圖鑑紀錄會保留。所有魚缸合計至少保留三隻魚。','dialog-note'));$('dialog-content').append(button('移動到其他魚缸',()=>moveFish(id),'place-button'));const b=button('送養這隻魚',()=>{selected=id;rehomeFish();},'place-button danger');b.id='rehome';b.disabled=allFish().length<=3;$('dialog-content').append(b,button('返回我的魚兒',roster,'back-button'));}
function roster(){openDialog('我的魚兒','roster');state.fishes.forEach(f=>{const b=button('',()=>{dialog.close();selectFish(f.id);},'roster-item');const name=document.createElement('span');name.textContent=`${f.name} · ${SPECIES[f.species].name}`;const detail=document.createElement('small');detail.textContent=`${stageName(f.growth)} · 飽足度 ${Math.round(f.hunger)}%`;b.append(name,detail);$('dialog-content').append(b);});}
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
function previewFish(id,unknown=false,variant='normal'){const c=document.createElement('canvas');c.className='fish-preview';c.width=240;c.height=140;c.setAttribute('aria-label',unknown?'尚未發現的魚':SPECIES[id].name);const context=c.getContext('2d');if(unknown)context.globalAlpha=.12;drawFish(context,id,120,76,SPECIES[id].shape==='angel'?88:100,1,0,.7,variant);return c;}
function renderShop(){
 if(!dialog.open||dialogMode!=='shop')return;const root=$('dialog-content');root.replaceChildren();const tabs=document.createElement('div');tabs.className='tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','商店分類');
 for(const [id,label]of [['fish','魚兒'],['feed','飼料'],['decor','布置']]){const b=button(label,()=>{shopTab=id;renderShop();if(id==='feed')tutorial.report('feedShopOpened');tutorial.render();},'tab'+(shopTab===id?' active':''));b.id='tab-'+id;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(shopTab===id));tabs.append(b);}
 const intro=paragraph(`養魚等級 ${state.level} · ${state.coins} 金幣 · ${shopTab==='fish'?'遇見下一隻魚兒。':shopTab==='feed'?'選擇適合魚兒的食物。':'購買後會自動放入魚缸。'}`,'shop-intro');intro.id='shop-message';intro.setAttribute('role','status');const grid=document.createElement('div');grid.className='shop-grid';grid.setAttribute('role','tabpanel');grid.setAttribute('aria-labelledby','tab-'+shopTab);root.append(tabs);const shortcuts=document.createElement('div');shortcuts.className='shop-shortcuts';shortcuts.append(button('我的魚缸',tankMenu,'place-button'));if(shopTab==='decor')shortcuts.append(button('調整布置',startEditing,'place-button'));root.append(shortcuts,intro,grid);
 if(shopTab==='fish'){
  for(const [id,s]of Object.entries(SPECIES).sort(([,a],[,b])=>Number(state.level<a.unlockLevel)-Number(state.level<b.unlockLevel)||a.unlockLevel-b.unlockLevel)){const locked=state.level<s.unlockLevel,card=document.createElement('article');card.className='shop-item'+(locked?' locked':'');const h=document.createElement('h3');h.textContent=s.name;const b=button(locked?`養魚等級 ${s.unlockLevel} 解鎖`:`購買 · ${s.price} 金幣`,()=>buy(id),'buy');b.disabled=locked;b.dataset.species=id;const preview=previewFish(id,locked,shopVariants.get(id)||'normal');card.append(preview,h,paragraph(fishBrief[id],'fish-brief'),b);const detail=document.createElement('details');detail.className='fish-detail';const summary=document.createElement('summary');summary.textContent='詳細介紹與配色';detail.append(summary,paragraph(s.desc),paragraph(`${s.depthName} · ${s.growthLabel}成長`,'shop-detail'));appendVariantChoices(detail,id,preview);card.append(detail);grid.append(card);}
 }else if(shopTab==='feed'){renderFeedShop(grid);
 }else{
  for(const [id,d]of Object.entries(DECORATIONS)){const card=document.createElement('article');card.className='shop-item decor-item';card.dataset.decoration=id;const p=document.createElement('canvas');p.className='fish-preview';p.width=240;p.height=140;p.setAttribute('aria-label',d.name);drawDecoration(p.getContext('2d'),id,120,117,90,80);const h=document.createElement('h3');h.textContent=d.name;const owned=state.purchasedDecorations[id]||0,used=state.placedDecorations.filter(p=>p.decoration===id).length;card.append(p,h,paragraph(d.desc),paragraph(d.kind==='substrate'?(state.substrate===id?'目前使用中':owned?'已收藏':'尚未購買'):`已收藏 ${owned} · 可放置 ${owned-used}`,'shop-detail'));
   const action=button(d.kind==='substrate'&&owned?(state.substrate===id?'使用中':'換上底砂'):`${d.price} 金幣 · ${d.kind==='substrate'?'購買並換上':'購買並放置'}`,()=>buyDecoration(id),'buy');action.dataset.buyDecor=id;action.disabled=d.kind==='substrate'&&state.substrate===id;card.append(action);
   if(d.kind!=='substrate'){const place=button('放入魚缸',()=>placementDialog(id),'place-button');place.hidden=owned<=used;place.disabled=owned<=used;place.dataset.placeDecor=id;card.append(place);}grid.append(card);
  }
  if(state.placedDecorations.length){const placed=document.createElement('div');placed.className='placed-list';placed.append(paragraph('目前的布置','placed-title'));for(const item of state.placedDecorations){const row=document.createElement('div');row.className='placed-row';row.append(paragraph(`${DECORATIONS[item.decoration].name} · ${item.normX<.34?'左側':item.normX>.66?'右側':'中央'}`),button('收回裝飾',()=>{if(conflict)return;state.placedDecorations=state.placedDecorations.filter(d=>d.id!==item.id);buildBackground();markDirty(true);renderShop();},'text-button'));placed.append(row);}root.append(placed);}
 }
 tutorial.render();root.append(paragraph(shopTab==='fish'?'好好餵魚、收取金幣，養魚等級就會逐漸提升。':shopTab==='feed'?'飼料用完時，可以在這裡購買。先看看每包價格及庫存。':'按「調整布置」，就能移動魚缸裡的裝飾。','dialog-note'));
}
// Ownership is recorded before placement. A full tank keeps the purchase in inventory.
function buyDecoration(id){
 if(conflict||saveBlocked)return;const d=DECORATIONS[id],owned=state.purchasedDecorations[id]||0;
 if(d.kind==='substrate'&&owned){state.substrate=id;buildBackground();markDirty(true);renderShop();shopMessage(`已換上${d.name}。`);return;}
 if(state.coins<d.price){shopMessage('金幣還不夠！先回魚缸收集金幣，再來購買。');return;}if(owned>=99){shopMessage('這件裝飾已經收藏很多了。');return;}
 state.coins-=d.price;state.purchasedDecorations[id]=owned+1;let placed=true;
 if(d.kind==='substrate')state.substrate=id;else placed=placeDecoration(id);
 evaluateGoals();buildBackground();sound('buy');markDirty(true);updateUI();renderShop();
 shopMessage(d.kind==='substrate'?`已換上${d.name}。`:placed?`已放入${d.name}！想換位置，可以按「調整布置」。`:`已購買${d.name}，暫時放在庫存。魚缸空間不足，可以收回裝飾或升級魚缸。`);
}
function placeDecoration(id){
 if(conflict||(state.purchasedDecorations[id]||0)<=state.placedDecorations.filter(p=>p.decoration===id).length||state.placedDecorations.length>=TANK_TIERS[state.tankTier-1].decorCapacity)return false;
 const order=[2,13,4,11,6,9,0,15,1,14,3,12,5,10,7,8];let item;
 for(const lane of [0,1]){for(const index of order){const candidate={id:uid(),decoration:id,normX:snapX(index),snapIndex:index,lane};if(canPlace(candidate)){item=candidate;break;}}if(item)break;}
 if(!item)return false;state.placedDecorations.push(item);metric('place');return true;
}
function placementDialog(id){
 if(!placeDecoration(id)){shopMessage('暫時沒有合適的位置。裝飾仍在庫存，可以先收回一件或升級魚缸。');return;}
 evaluateGoals();buildBackground();markDirty(true);updateUI();renderShop();shopMessage(`已放入${DECORATIONS[id].name}！想換位置，可以按「調整布置」。`);
}
function encyclopedia(){openDialog('魚類圖鑑','encyclopedia');const known=Object.keys(state.collection).length;$('dialog-content').append(paragraph(`已遇見 ${known} / ${Object.keys(SPECIES).length} 種魚。下一個驚喜，就在水族箱裡。`,'shop-intro'));const grid=document.createElement('div');grid.className='shop-grid encyclopedia-grid';for(const [id,s]of Object.entries(SPECIES)){const history=state.collection[id],unlocked=state.level>=s.unlockLevel,card=document.createElement('article');card.className='shop-item'+(!history?' undiscovered':'');card.dataset.entry=id;const h=document.createElement('h3');h.textContent=history||unlocked?s.name:'？？？';card.append(previewFish(id,!history),h);
 if(history){card.append(paragraph(s.desc),paragraph(`${s.depthName} · ${s.growthLabel}成長`,'shop-detail'),paragraph(`曾養 ${history.total} 隻 · 現有 ${allFish().filter(f=>f.species===id).length} 隻`,'collection-count'),paragraph(`最高養成：${['幼魚','亞成魚','成魚'][history.highestStage]}`,'collection-stage'),button(`配色收藏 ${history.variants.length} / ${1+Object.values(VARIANTS).filter(v=>v.species===id).length}`,()=>variantCollection(id),'place-button'));}else card.append(paragraph(unlocked?'已解鎖，帶回家後揭開牠的小秘密。':`養魚等級 ${s.unlockLevel} 解鎖`));grid.append(card);}$('dialog-content').append(grid);}
function renameFish(){const f=state.fishes.find(f=>f.id===selected);if(!f)return;openDialog('替魚兒取個名字','rename');const input=document.createElement('input');input.id='fish-new-name';input.type='text';input.value=f.name;input.maxLength=24;input.autocomplete='off';input.setAttribute('aria-label','新的魚兒名字');input.className='name-input';const note=paragraph('最多 12 個字，可用中文、英文與數字。','dialog-note'),error=paragraph('','name-error');error.id='name-error';error.setAttribute('role','status');
 function apply(){if(conflict)return;const value=input.value.trim();if(!value){error.textContent='請輸入名字，不能只留空白。';return;}if([...value].length>CONFIG.MAX_NAME){error.textContent='名字最多 12 個字。';return;}if(!/^[\p{L}\p{N} _·-]+$/u.test(value)){error.textContent='請使用中文、英文、數字；名字不能含 HTML 或特殊標記。';return;}f.name=value;markDirty(true);dialog.close();selectFish(f.id);toast('新名字已保存。');}
 const actions=document.createElement('div');actions.className='confirm-actions';actions.append(button('取消',()=>{dialog.close();selectFish(f.id);}),button('保存名字',apply,'confirm'));input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();apply();}});$('dialog-content').append(input,note,error,actions);input.focus();input.select();}
function rehomeFish(){const f=state.fishes.find(f=>f.id===selected);if(!f||allFish().length<=3||conflict)return;confirmAction('送養這隻魚兒？',`送養${f.name}後，牠會離開魚缸，圖鑑與最高養成紀錄仍會保留。送養不退金幣。`,()=>{state.fishes=state.fishes.filter(q=>q.id!==f.id);runtime.delete(f.id);markDirty(true);updateUI();dialog.close();toast('已送養，圖鑑紀錄仍保留。');},false);$('dialog-content').querySelector('.confirm').textContent='確認送養';}
function exportSave(){try{const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`aquarium-v06-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){toast('目前無法匯出，請稍後再試。');}}
function chooseImport(){chooseFile();}

// Long-lived progression is separate from transient swimming targets.
function recordAdult(f){
 if(f.growth>=100&&!f.adultRecorded){f.adultRecorded=true;state.collection[f.species].adults=Math.min(state.collection[f.species].total,(state.collection[f.species].adults||0)+1);dirty=true;}
}
function goalValue(a){
 const values={purchases:state.stats.purchases,adults:Object.values(state.collection).reduce((n,c)=>n+c.adults,0),species:Object.keys(state.collection).length,fish:state.stats.maxFish,decor:state.stats.maxDecor,plants:['smallplant','tallplant','moss'].filter(id=>state.tanks.some(t=>t.purchasedDecorations[id])).length,care:state.stats.careSeconds,companionship:Math.max(0,...allFish().map(f=>f.playSeconds)),tier:Math.max(...state.tanks.map(t=>t.tier))};return values[a.metric]||0;
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
function rewardLabel(a){return a.reward.coins?`${a.reward.coins} 金幣`:`${VARIANTS[a.reward.variant].name}配色`;}
function achievements(){
 evaluateGoals(false);openDialog('每一個小里程碑','achievements');$('dialog-content').append(paragraph('成就，慢慢完成。每份獎勵只領取一次。','shop-intro'));const list=document.createElement('div');list.className='achievement-list';
 for(const a of ACHIEVEMENTS){const status=state.achievements[a.id],card=document.createElement('article');card.className='achievement-card'+(status.completed?' completed':'');card.dataset.achievement=a.id;const body=document.createElement('div');const h=document.createElement('h3');h.textContent=(status.completed?'✧ ':'')+a.name;let progress=Math.min(a.goal,goalValue(a));const label=['care','companionship'].includes(a.metric)?`${Math.floor(progress/60)} / ${a.goal/60} 分鐘`:`${Math.floor(progress)} / ${a.goal}`;body.append(h,paragraph(a.desc),paragraph(`${status.completed?'已完成':label} · ${rewardLabel(a)}`,'achievement-detail'));const b=button(status.rewardClaimed?'已領取':status.completed?'領取獎勵':'慢慢來',()=>claimAchievement(a.id),'place-button');b.disabled=!status.completed||status.rewardClaimed;b.dataset.claim=a.id;card.append(body,b);list.append(card);}$('dialog-content').append(list);
}
function claimAchievement(id){
 if(conflict||saveBlocked)return;const a=ACHIEVEMENTS.find(a=>a.id===id),status=state.achievements[id];if(!a||!status.completed||status.rewardClaimed)return;
 let previousLedger,key,previousState;try{
  const ids=readRewardLedger();if(ids.includes(id)){mergeRewardLedger();markDirty(true);achievements();return;}
  key=rewardKey();previousLedger=localStorage.getItem(key);previousState=structuredClone(state);
  localStorage.setItem(key,JSON.stringify([...ids,id]));status.rewardClaimed=true;
  if(a.reward.coins)state.coins=clamp(state.coins+a.reward.coins,0,CONFIG.MAX_COINS);if(a.reward.variant)unlockVariant(a.reward.variant);
  if(!save())throw Error('無法保存成就');diagnostics.achievementRewards++;updateUI();achievements();toast(`已領取：${rewardLabel(a)}。`);
 }catch(e){if(previousState){state=window.AquariumSave.attach(previousState);try{if(previousLedger===null)localStorage.removeItem(key);else localStorage.setItem(key,previousLedger);}catch(rollback){saveBlocked=true;}}saveLabel();toast('目前無法保存獎勵，請稍後再領取。');}
}
function tankMenu(){
 openDialog('我的魚缸','tank');const tier=TANK_TIERS[state.tankTier-1],next=TANK_TIERS[state.tankTier];const hero=document.createElement('div');hero.className='tier-hero';const h=document.createElement('h3');h.textContent=`魚缸等級 ${tier.tier} · ${tier.name}`;hero.append(h,paragraph(`可養 ${state.tankCapacity} 隻魚 · 可放 ${tier.decorCapacity} 件布置`));$('dialog-content').append(hero);
 const actions=document.createElement('div');actions.className='tank-actions';actions.append(button('調整布置',startEditing,'confirm'),button('成就',achievements,'place-button'));$('dialog-content').append(actions);
 renderTankOffers();if(next){const card=document.createElement('div');card.className='tier-next';const title=document.createElement('h3');title.textContent=`下一級魚缸：${next.name}`;const b=button(state.level<next.level?`養魚等級 ${next.level} 可升級`:`${next.price} 金幣 · 升級`,upgradeTank,'buy');b.id='upgrade-tank';b.disabled=state.level<next.level;card.append(title,paragraph(`能照顧 ${next.capacity} 隻魚，布置增加至 ${next.decorCapacity} 件。`),paragraph(`養魚等級 ${next.level} · 需要 ${next.price} 金幣。`,'shop-detail'),b);$('dialog-content').append(card);}else $('dialog-content').append(paragraph('魚缸已經長成豐富的小世界，繼續陪伴魚兒長大吧。','dialog-note'));
}
function upgradeTank(){
 if(conflict||saveBlocked)return;const next=TANK_TIERS[state.tankTier];if(!next||state.level<next.level)return;if(state.coins<next.price){toast('再存一些金幣，魚兒的家就能長大。');return;}
 state.coins-=next.price;state.tankTier=next.tier;evaluateGoals();buildBackground();markDirty(true);updateUI();tankMenu();sound('level');toast(`魚缸升級了！現在能照顧 ${state.tankCapacity} 隻魚。`,4500);
}
function appendVariantChoices(card,id,preview){
 const colors=Object.entries(VARIANTS).filter(([,v])=>v.species===id);if(!colors.length)return;const select=document.createElement('select');select.className='variant-select';select.setAttribute('aria-label',SPECIES[id].name+'配色');select.dataset.variantSpecies=id;select.append(Object.assign(document.createElement('option'),{value:'normal',textContent:'普通配色'}));for(const [key,v]of colors){const unlocked=state.unlockedVariants.includes(key);select.append(Object.assign(document.createElement('option'),{value:key,textContent:unlocked?v.name:`🔒 ${v.name} · ${v.condition}`,disabled:!unlocked}));}
 select.value=shopVariants.get(id)||'normal';select.addEventListener('change',()=>{shopVariants.set(id,select.value);preview.replaceWith(preview=previewFish(id,false,select.value));});card.append(select);card.append(paragraph('配色只有外觀差異。','variant-note'));
}
function variantCollection(id){
 const s=SPECIES[id],c=state.collection[id];openDialog(`${s.name}的配色收藏`,'variants');const colors=[['normal',{name:'普通配色',condition:'第一次養過這種魚。'}],...Object.entries(VARIANTS).filter(([,v])=>v.species===id)];$('dialog-content').append(paragraph(`已發現配色 ${c?.variants.length||0} / ${colors.length}。解鎖後，可以在商店選擇。`,'shop-intro'));const grid=document.createElement('div');grid.className='shop-grid variant-grid';for(const [key,v]of colors){const owned=c?.variants.includes(key),unlocked=key==='normal'||state.unlockedVariants.includes(key),card=document.createElement('article');card.className='shop-item';card.dataset.color=key;const h=document.createElement('h3');h.textContent=v.name;card.append(previewFish(id,!unlocked,key),h,paragraph(owned?'已收藏':unlocked?'已解鎖，還沒養過。':`🔒 ${v.condition}`));grid.append(card);}$('dialog-content').append(grid,button('回到魚類圖鑑',encyclopedia,'back-button'));
}
function canPlace(item,ignoreId=item.id){
 const d=DECORATIONS[item.decoration];return !state.placedDecorations.some(other=>{if(other.id===ignoreId||other.lane!==item.lane)return false;const q=DECORATIONS[other.decoration];if(q.kind!==d.kind)return false;const spacing=(q.footprint+d.footprint)*(d.kind==='plant'?.29:.36);return Math.abs(other.normX-item.normX)<spacing;});
}
function startEditing(id){
 dialog.close();closeCard();setFeeding(false);editing=true;editSelection=typeof id==='string'?id:null;editPreview=null;drag=null;for(const r of runtime.values()){r.poi=null;r.poiWait=Math.max(r.poiWait,15);r.pause=0;}
 $('edit-toolbar').hidden=false;$('decor-handles').hidden=false;canvas.classList.add('editing');buildBackground();updateEditorLabel();updateUI();draw();
}
function finishEditing(){
 if(!editing)return;editing=false;drag=null;editPreview=null;editSelection=null;$('edit-toolbar').hidden=true;$('decor-handles').hidden=true;canvas.classList.remove('editing');buildBackground();markDirty(true);updateUI();
}
function updateEditorLabel(){const item=state.placedDecorations.find(d=>d.id===editSelection);$('edit-label').textContent=item?`正在布置：${DECORATIONS[item.decoration].name}`:'點選一件布置，左右拖動';for(const id of ['edit-left','edit-right','edit-store'])$(id).disabled=!item;for(const [id,handle]of editorHandles)handle.classList.toggle('selected',id===editSelection);}
function syncEditorHandles(){
 if(!editing)return;const container=$('decor-handles'),ids=new Set(state.placedDecorations.map(d=>d.id));for(const [id,b]of editorHandles)if(!ids.has(id)){b.remove();editorHandles.delete(id);}
 for(const item of state.placedDecorations){let b=editorHandles.get(item.id);if(!b){b=button('',()=>{editSelection=item.id;updateEditorLabel();},'decor-handle');b.dataset.decorId=item.id;b.setAttribute('aria-label','選取'+DECORATIONS[item.decoration].name);b.addEventListener('pointerdown',e=>beginDecorDrag(e,item.id));b.addEventListener('pointermove',moveDecorDrag);b.addEventListener('pointerup',endDecorDrag);b.addEventListener('pointercancel',cancelDecorDrag);container.append(b);editorHandles.set(item.id,b);}const p=decorLayout(item);b.style.left=(p.x-Math.max(44,p.width*1.1)/2)+'px';b.style.top=(p.y-Math.max(44,p.height))+'px';b.style.width=Math.max(44,p.width*1.1)+'px';b.style.height=Math.max(44,p.height)+'px';b.style.zIndex=String(item.id===editSelection?3:1);}
}
function beginDecorDrag(e,id){if(!editing||conflict||e.button>0)return;e.preventDefault();const item=state.placedDecorations.find(d=>d.id===id);if(!item)return;editSelection=id;drag={id,pointerId:e.pointerId,startX:item.normX,moved:false,offset:(e.clientX-canvas.getBoundingClientRect().left)/W-item.normX};e.currentTarget.setPointerCapture(e.pointerId);updateEditorLabel();syncEditorHandles();}
function moveDecorDrag(e){if(!drag||drag.pointerId!==e.pointerId)return;e.preventDefault();const nextX=clamp((e.clientX-canvas.getBoundingClientRect().left)/W-drag.offset,.06,.94);if(Math.abs(nextX-drag.startX)*W<4&&!drag.moved)return;drag.moved=true;editPreview={id:drag.id,x:clamp((e.clientX-canvas.getBoundingClientRect().left)/W-drag.offset,.06,.94)};editCacheDirty=true;}
function endDecorDrag(e){if(!drag||drag.pointerId!==e.pointerId)return;e.preventDefault();if(!drag.moved){drag=null;editPreview=null;updateEditorLabel();return;}const item=state.placedDecorations.find(d=>d.id===drag.id),x=editPreview?.x??item.normX,index=nearestSnap(x),next={...item,normX:snapX(index),snapIndex:index};const changed=canPlace(next);if(changed){Object.assign(item,next);metric('place');markDirty(true);}else placementReminder();drag=null;editPreview=null;editCacheDirty=false;buildBackground();updateEditorLabel();}
function cancelDecorDrag(){if(!drag)return;drag=null;editPreview=null;editCacheDirty=false;buildBackground();updateEditorLabel();}
function nudgeDecoration(delta){if(conflict)return;const item=state.placedDecorations.find(d=>d.id===editSelection);if(!item)return;const index=clamp(item.snapIndex+delta,0,CONFIG.SNAP_SLOTS-1),next={...item,normX:snapX(index),snapIndex:index};if(!canPlace(next)){placementReminder();return;}Object.assign(item,next);metric('place');buildBackground();markDirty(true);updateEditorLabel();}
function placementReminder(){openDialog('這裡放不下裝飾','placement');$('dialog-content').append(paragraph('裝飾已留在原來的位置，沒有遺失。可以換到較空的位置，或先收回另一件裝飾。','confirm-copy'),button('回去調整布置',()=>{dialog.close();startEditing();},'confirm'));}
function storeSelectedDecoration(){if(conflict)return;state.placedDecorations=state.placedDecorations.filter(d=>d.id!==editSelection);editSelection=null;drag=null;editPreview=null;buildBackground();markDirty(true);updateEditorLabel();toast('已收回裝飾，仍保留在布置收藏裡。');}
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
  const s=SPECIES[f.species],personality=PERSONALITIES[f.personality],r=runtime.get(f.id),previousStage=stage(f.growth);f.playSeconds+=dt;f.hunger=clamp(f.hunger-CONFIG.HUNGER_PER_SECOND*dt);
  if(f.hunger>25)f.growth=clamp(f.growth+dt/growthTime(s)*100);syncFish(f);state.collection[f.species].highestStage=Math.max(state.collection[f.species].highestStage,stage(f.growth));
  if(stage(f.growth)!==previousStage){recordAdult(f);evaluateGoals();effects.push({x:r.x,y:r.y,text:`長成${f.growthStage}！`,life:2.8});gainXP(8);important=true;}
  let target=null,best=Infinity;
  if(f.hunger<91){for(const p of food){if(FOOD_FOR[f.species]!==p.kind||claimed.has(p.id)||p.y<s.depth[0]-(s.bottomDweller?.13:.12)||p.y>s.depth[1]+.1)continue;
    const distance=Math.hypot((p.x-r.x)*W,(p.y-r.y)*H),score=distance*(s.foodPreference==='bottom'&&p.y>.86?.38:1);if(score<best&&distance<Math.hypot(W,H)){target=p;best=score;}}
  }
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
  const marginX=Math.max(.065,(f.size*.62+8)/W),minY=Math.max(.105,s.depth[0]-(s.bottomDweller?.06:.07)),maxY=Math.min(.915,Math.max(s.depth[1]+.035,atEnvironment&&!s.bottomDweller?r.poi.y+.035:0));
  if(r.x<marginX+.08){vx+=(marginX+.08-r.x)*1.1;if(r.x<=marginX+.002)r.target.x=.5;}
  if(r.x>1-marginX-.08){vx-=(r.x-(1-marginX-.08))*1.1;if(r.x>=1-marginX-.002)r.target.x=.5;}
  if(r.y<minY+.03)vy+=(minY+.03-r.y)*.8;if(r.y>maxY-.03)vy-=(r.y-maxY+.03)*.8;
  const desiredAngle=Math.atan2(vy,vx);r.motionAngle??=Math.atan2(r.vy,r.vx);let angleDiff=((desiredAngle-r.motionAngle+Math.PI*3)%(Math.PI*2))-Math.PI;r.motionAngle+=clamp(angleDiff,-s.turnSpeed*dt,s.turnSpeed*dt);
  const desiredSpeed=Math.min(Math.hypot(vx,vy),Math.max(speed*1.25,s.speed*.22));r.magnitude??=Math.hypot(r.vx,r.vy);r.magnitude+=(desiredSpeed-r.magnitude)*(1-Math.exp(-dt*s.acceleration));r.vx=Math.cos(r.motionAngle)*r.magnitude;r.vy=Math.sin(r.motionAngle)*r.magnitude;
  r.x=clamp(r.x+r.vx*dt,marginX,1-marginX);r.y=clamp(r.y+r.vy*dt,minY,maxY);if(Math.abs(r.vx)>.006)r.direction=r.vx>0?1:-1;
  r.turn+=(r.direction-r.turn)*(1-Math.exp(-dt*s.turnSpeed));r.heading+=(clamp(r.vy/(Math.abs(r.vx)+.02),-.4,.4)-r.heading)*(1-Math.exp(-dt*2));r.phase+=dt*(r.pause>0?3:s.bottomDweller?7:5+r.magnitude*35);r.position={x:r.x,y:r.y};r.coinValue=s.values[stage(f.growth)];r.hiddenAmount+=(Number(r.behaviorState==='hide')-r.hiddenAmount)*(1-Math.exp(-dt*2.5));
  if(f.hunger>=45){f.coinProgress=Math.min(coinInterval(s),f.coinProgress+dt);if(f.coinProgress>=coinInterval(s)&&state.drops.length<CONFIG.MAX_DROPS){state.drops.push({id:uid(),x:clamp(r.x,.06,.94),y:clamp(r.y-.07,.13,.82),value:r.coinValue});f.coinProgress=0;diagnostics.spawned++;if(!simulatingBackground)tutorial.coin();markDirty();}}
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
function drawFish(c,key,x,y,size,turn,angle,phase,variant='normal'){
 window.AquariumFishArt.draw(c,key,x,y,size,turn,angle,phase,variant);
}
// Hit geometry follows the same origin, heading, turn width and scale as the art.
// A generous body target is preferred to a neighbouring fish's trailing fins.
function fishHitScore(f,x,y){
 const r=runtime.get(f.id),a=r.heading*.35,dx=(x-r.x)*W,dy=(y-r.y)*H-Math.sin(r.phase*.4)*1.7;
 const px=dx*Math.cos(a)+dy*Math.sin(a),py=-dx*Math.sin(a)+dy*Math.cos(a),scale=f.size/100,width=.15+.85*Math.abs(r.turn),sign=r.turn<0?-1:1,b=window.AquariumFishArt.hitBounds[f.species];
 const bodyX=px-sign*6*scale*width,body=Math.hypot(bodyX/Math.max(27,35*scale*width),py/Math.max(25,(f.species==='angel'?29:20)*scale));
 if(body<=1)return body;
 const left=sign<0?-b.right:b.left,right=sign<0?-b.left:b.right;
 if(px>=Math.min(-27,left*scale*width)&&px<=Math.max(27,right*scale*width)&&py>=Math.min(-25,b.top*scale)&&py<=Math.max(25,b.bottom*scale))return 2+Math.hypot(px,py)/100;
 return Infinity;
}
function drawDecoration(c,id,x,y,width,height){
 const d=DECORATIONS[id];if(!d)return;c.save();c.translate(x,y);c.scale(width/100,height/100);const material=c.createLinearGradient(-30,-100,38,0);material.addColorStop(0,d.kind==='plant'?'#b2d2a8':id==='wood'?'#c4ad82':'#d7dec7');material.addColorStop(.38,d.color);material.addColorStop(1,id==='wood'?'#7f7056':d.kind==='plant'?'#518774':'#82978a');
 if(d.kind==='substrate'){path(c,'M-57 -31 L-24 -48 L59 -33 L25 -8Z',material,'#9caf9d',1);for(let i=0;i<14;i++)ellipse(c,-40+(i*17)%84,-30-(i%3)*3,2,1,id==='black'?'#bac6b6':'#cdbb8f');}
 else if(d.kind==='plant'){
  if(id==='moss'){ellipse(c,0,-12,43,18,'#739978');for(let i=0;i<14;i++)ellipse(c,-36+i*5.5,-13-(i%3)*6,9,8,i%2?'#93b38b':'#80a482');}
  else{for(const [offset,lean,scale]of [[-20,-13,.75],[0,8,1],[22,16,.62]]){c.save();c.translate(offset,0);c.scale(.85,scale);path(c,`M0 0 Q-9 -50 ${lean} -98`,null,d.color,3);for(let j=1;j<6;j++){const yy=-j*16,xx=lean*j/6,side=j%2?1:-1;path(c,`M${xx} ${yy} Q${xx+side*30} ${yy+8} ${xx+side*26} ${yy-20} Q${xx+side*8} ${yy-27} ${xx} ${yy-6}Z`,material);path(c,`M${xx} ${yy-3} Q${xx+side*13} ${yy-5} ${xx+side*23} ${yy-18}`,null,'#d7e8b877',.7);for(let v=0;v<3;v++)path(c,`M${xx+side*(6+v*4)} ${yy-4-v*3} l${side*4} -7`,null,'#d9eacb44',.45);}c.restore();}}
 }else if(id==='smallrock'||id==='bigrock'){
  path(c,'M-49 0 L-45 -45 Q-19 -108 10 -99 L45 -42 L49 0Z',material);path(c,'M-45 -45 L-7 -85 L10 -99 L9 -36Z','#dbe1cd66');path(c,'M9 -36 L45 -42 L49 0 L-7 0Z','#81968e33');c.save();c.clip(new Path2D('M-49 0 L-45 -45 Q-19 -108 10 -99 L45 -42 L49 0Z'));for(let i=0;i<42;i++)ellipse(c,-48+(i*29)%97,-5-(i*17)%92,i%3*.65+.45,.6,i%2?'#ecedd03d':'#59766b25');path(c,'M-24 -72 L-19 -50 L-27 -32 M9 -35 L14 -21 L7 -8',null,'#637c7333',.8);c.restore();
 }else if(id==='wood'){
  path(c,'M-50 -3 Q-27 -43 -43 -82 L-28 -93 Q0 -42 35 -61 L48 -46 Q17 -20 2 -8 L-28 0Z',material,'#806e56',2);path(c,'M-28 -74 Q-14 -38 24 -43 M-30 -39 Q-3 -15 26 -28',null,'#d4b58a',2);for(let i=0;i<5;i++)path(c,`M${-35+i*3} ${-72+i*5} Q${-24+i*2} ${-34+i*2} ${11+i*3} ${-38+i*2}`,null,i%2?'#73655166':'#e2c79988',.65);ellipse(c,0,-15,13,5,'#6c9b7c');c.save();c.translate(-25,-68);c.rotate(-.5);for(let n=0;n<3;n++){c.beginPath();c.ellipse(0,0,2+n*2,4+n*3,0,0,Math.PI*2);c.strokeStyle='#e5cea344';c.lineWidth=.65;c.stroke();}c.restore();
 }else if(id==='cave'){
  path(c,'M-54 0 Q-53 -79 -16 -96 Q28 -112 53 0Z',material,'#8e9f94',1.5);path(c,'M-22 0 Q-30 -63 3 -64 Q28 -62 29 0Z','#587f77');path(c,'M-22 0 Q-20 -51 5 -54 Q16 -53 25 -28',null,'#c7d3b855',4);ellipse(c,-31,-75,12,7,'#92ae8c');
 }else if(id==='ship'){
  path(c,'M-59 -31 Q-36 12 35 0 L58 -37 L-9 -26Z',material,'#876c52',2);path(c,'M-31 -30 L-30 -87 M-5 -30 L-6 -74',null,'#8e785d',4);path(c,'M-30 -85 L11 -65 L-29 -59Z','#d4c9a5');path(c,'M-6 -70 L28 -54 L-5 -49Z','#b9c7ad');for(const xx of [-35,-8,18])ellipse(c,xx,-16,5,7,'#726b58');path(c,'M-47 -7 L37 -7',null,'#d2b18a',2);
 }else if(id==='chest'){
  path(c,'M-39 -7 L-37 -54 L35 -54 L40 -7Z',material,'#8f6c42',2);path(c,'M-39 -54 Q-41 -94 1 -96 Q39 -88 35 -54Z','#c3a369','#967d51',2);path(c,'M-23 -89 L-21 -11 M21 -87 L22 -11 M-36 -54 L35 -54',null,'#eed595',5);path(c,'M-4 -58 L9 -58 L9 -40 L-4 -40Z','#f3d786');ellipse(c,3,-48,1.4,2,'#b18a46');
 }
 c.restore();
}
function decorLayout(item){const d=DECORATIONS[item.decoration],x=editPreview?.id===item.id?editPreview.x:item.normX;return {x:x*W,y:H*(d.kind==='plant'?.936+item.lane*.009:.948+item.lane*.014),width:Math.min(115,W*(d.kind==='plant'?.1:.11)),height:H*Math.min(x>.34&&x<.66?.23:.35,d.height||.13)};}

function buildBackground(){
  bg=document.createElement('canvas');bg.width=Math.round(W*dpr);bg.height=Math.round(H*dpr);const c=bg.getContext('2d');c.scale(dpr,dpr);
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#d9f1e2');g.addColorStop(.2,'#bce5dc');g.addColorStop(.68,'#91cecc');g.addColorStop(1,'#73b6ba');c.fillStyle=g;c.fillRect(0,0,W,H);
  const glow=c.createRadialGradient(W*.35,0,0,W*.35,H*.12,W*.65);glow.addColorStop(0,'#fff9d855');glow.addColorStop(1,'#fff9d800');c.fillStyle=glow;c.fillRect(0,0,W,H);
  for(let i=0;i<4;i++){c.save();const ray=c.createLinearGradient(0,0,0,H*.85);ray.addColorStop(0,'#fffde72b');ray.addColorStop(1,'#fffde700');c.fillStyle=ray;c.beginPath();c.moveTo(W*(.05+i*.27),0);c.lineTo(W*(.17+i*.27),0);c.lineTo(W*(.37+i*.23),H*.86);c.lineTo(W*(.19+i*.23),H*.86);c.fill();c.restore();}
  // Distant reeds and soft caustics are part of the cached backdrop, never rebuilt per frame.
  c.save();c.globalAlpha=.14;for(const side of [0,1])for(let i=0;i<7;i++){const x=W*(side? .89+i*.018:.02+i*.019),height=H*(.17+(i%3)*.055);path(c,`M${x} ${H*.9} Q${x-13} ${H*.9-height*.5} ${x+8} ${H*.9-height}`,null,'#367b75',4);for(let j=1;j<4;j++){const y=H*.9-height*j/4;path(c,`M${x} ${y} Q${x-24} ${y-14} ${x-17} ${y-30} Q${x+1} ${y-21} ${x} ${y}`,'#3b837a');}}c.restore();
  path(c,`M0 38 Q${W*.17} 18 ${W*.32} 34 T${W*.67} 28 T${W} 34 L${W} 0 L0 0Z`,'#e4f8e980');path(c,`M0 37 Q${W*.17} 17 ${W*.32} 33 T${W*.67} 27 T${W} 33`,null,'#ffffff75',2);
  // Subtle surface glints, cached with the water (no extra animation loop).
  c.save();c.globalAlpha=.22;for(let i=0;i<9;i++){const x=W*(.07+i*.105);path(c,`M${x} ${17+i%3*8} q${W*.025} -4 ${W*.05} 0`,null,'#fffce4',1.3);}c.restore();
  // Distant landscape and fine sand, rendered once per resize.
  path(c,`M0 ${H*.84} Q${W*.25} ${H*.72} ${W*.49} ${H*.86} Q${W*.8} ${H*.7} ${W} ${H*.79} L${W} ${H} L0 ${H}Z`,'#67b8b5');
  path(c,`M0 ${H*.9} Q${W*.19} ${H*.84} ${W*.4} ${H*.9} Q${W*.77} ${H*.84} ${W} ${H*.9} L${W} ${H} L0 ${H}Z`,DECORATIONS[state.substrate].color);
  path(c,`M0 ${H*.94} Q${W*.27} ${H*.88} ${W*.56} ${H*.94} T${W} ${H*.94} L${W} ${H} L0 ${H}Z`,DECORATIONS[state.substrate].color);
  let seed=99;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  c.save();c.globalAlpha=.16;for(let i=0;i<5;i++)path(c,`M0 ${H*(.925+i*.014)} Q${W*.3} ${H*(.9+i*.016)} ${W*.6} ${H*(.93+i*.013)} T${W} ${H*(.92+i*.014)}`,null,'#fff5d4',1.4);c.restore();
  for(let i=0;i<340;i++){ellipse(c,random()*W,(.915+random()*.085)*H,random()*1.5+.4,.5+random()*.5,state.substrate==='black'?(i%2?'#4e6561':'#a5b4a3'):(i%2?'#d2c59e':'#fcf0d3'));}
  for(const item of [...state.placedDecorations].sort((a,b)=>Number(DECORATIONS[a.decoration].kind!=='plant')-Number(DECORATIONS[b.decoration].kind!=='plant'))){const pos=decorLayout(item);drawDecoration(c,item.decoration,pos.x,pos.y,pos.width,pos.height);}
  foreground=document.createElement('canvas');foreground.width=bg.width;foreground.height=bg.height;const front=foreground.getContext('2d');front.scale(dpr,dpr);
  for(const item of state.placedDecorations){const d=DECORATIONS[item.decoration];if(!d.canHide)continue;const p=decorLayout(item);front.save();drawDecoration(front,item.decoration,p.x,p.y,p.width,p.height);front.globalCompositeOperation='destination-out';if(item.decoration==='cave'){front.translate(p.x,p.y);front.scale(p.width/100,p.height/100);path(front,'M-22 0 Q-30 -63 3 -64 Q28 -62 29 0Z','#000');}else{front.clearRect(p.x-p.width*.31,p.y-p.height*.19,p.width*.65,p.height*.08);}front.restore();}
  if(state.tankTier>=2){for(let i=0;i<state.tankTier+1;i++)ellipse(c,W*(.22+i*.15),H*.96,3.5,2,'#f6ecc2');}
  poiCache=buildPOI(state.placedDecorations,DECORATIONS,decorLayout,W,H);if(tankContexts.has(state.activeTankId))tankContexts.get(state.activeTankId).poiCache=poiCache;syncEditorHandles();

}
function resize(){const r=canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);buildBackground();draw();}
function draw(){if(!state||!bg||!bg.width||!bg.height)return;ctx.clearRect(0,0,W,H);ctx.drawImage(bg,0,0,W,H);
  for(let i=0;i<13;i++){const x=(.05+(i*.073)%1)*W+Math.sin(simTime*.6+i)*8,y=H-((simTime*(9+i%4*3)+i*67)%(H+20));ctx.strokeStyle='#e9fff570';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,2+i%4,0,Math.PI*2);ctx.stroke();}
  for(const p of food){ellipse(ctx,p.x*W+1,p.y*H+2,3.7,3.5,'#458c9144');ellipse(ctx,p.x*W,p.y*H,3.8,3.2,FEEDS[p.kind].color);ellipse(ctx,p.x*W-1,p.y*H-1,1.4,1.1,'#ffe7a0');}
  for(const f of state.fishes){const r=runtime.get(f.id);if(!r)continue;const x=r.x*W,y=r.y*H;
    ellipse(ctx,x,H*.943,f.size*.34,f.size*.045,`rgba(51,116,111,${SPECIES[f.species].bottomDweller?.14:.045})`);
    if(selected===f.id){ctx.strokeStyle='#fffce6bb';ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.ellipse(x,y,f.size*.64,f.size*.44,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    ctx.save();ctx.globalAlpha=1-r.hiddenAmount*.65;drawFish(ctx,f.species,x,y+Math.sin(r.phase*.4)*1.7,f.size,r.turn,r.heading,r.phase,f.variant);ctx.restore();
  }
  if(foreground)ctx.drawImage(foreground,0,0,W,H);
  if(editing&&editSelection){const item=state.placedDecorations.find(d=>d.id===editSelection);if(item){const p=decorLayout(item);ctx.save();ctx.strokeStyle='#fffde6';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.strokeRect(p.x-p.width*.55-5,p.y-p.height-5,p.width*1.1+10,p.height+12);ctx.restore();}}
  for(const coin of state.drops){const x=coin.x*W,y=coin.y*H+Math.sin(simTime*2+coin.x*5)*3;ctx.shadowColor='#fff3a7';ctx.shadowBlur=12;ellipse(ctx,x,y,14,14,'#edbd49');ctx.shadowBlur=0;ctx.lineWidth=2;ctx.strokeStyle='#fff0b3';ctx.beginPath();ctx.arc(x,y,10.5,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff6c6';ctx.font='bold 17px sans-serif';ctx.textAlign='center';ctx.fillText('＄',x,y+6);}
  for(const e of effects){ctx.save();if(e.kind==='ripple'){ctx.strokeStyle=`rgba(255,255,240,${e.life})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x*W,e.y*H,(1-e.life)*50+5,(1-e.life)*10+3,0,0,Math.PI*2);ctx.stroke();}else{ctx.globalAlpha=Math.min(1,e.life);ctx.textAlign='center';ctx.font='bold 14px "Microsoft JhengHei", sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#effcf5';const yy=e.y*H-20-(1.5-e.life)*16;ctx.strokeText(e.text,e.x*W,yy);ctx.fillStyle='#45836e';ctx.fillText(e.text,e.x*W,yy);}ctx.restore();}
}
let specimenPose=null;
const observation=window.AquariumObservation.create({
 getFish:()=>state.fishes.map(f=>({...f,speciesName:SPECIES[f.species].name,personalityName:PERSONALITIES[f.personality].name,variantName:f.variant==='normal'?'普通配色':VARIANTS[f.variant].name})),
 drawSpecimen:(target,id,{tracking,zoom,playing,time,breathing,highlightPart})=>{
  const c=target.getContext('2d'),f=state.fishes.find(f=>f.id===id);c.clearRect(0,0,target.width,target.height);if(!f)return;
  if(playing||specimenPose?.id!==id)specimenPose={id,...runtime.get(id)};
  const r=specimenPose,b=window.AquariumFishArt.hitBounds[f.species],fit=Math.min(44000/(b.bottom-b.top),82000/(b.right-b.left)),size=Math.min(Math.min(Math.max(350,f.size*4),fit*.65)*zoom,fit);
  const marginX=Math.max(Math.abs(b.left),b.right)*size/100+30,marginY=Math.max(Math.abs(b.top),b.bottom)*size/100+25;
  const x=tracking?target.width*.52:clamp(r.x*target.width,marginX,target.width-marginX),y=tracking?target.height*.48:clamp(r.y*target.height,marginY,target.height-marginY);
  const turn=breathing?(r.turn<0?-1:1):r.turn;
  window.AquariumFishArt.draw(c,f.species,x,y,size,turn,r.heading,r.phase,f.variant,{breathing:true,breathTime:time,breathEmphasis:breathing,highlightPart});
  if(highlightPart){const part=window.AquariumFishArt.getFinInfo(f.species).parts.find(p=>p.id===highlightPart);if(part){c.fillStyle='#246e61';c.font='600 24px sans-serif';c.textAlign='left';c.fillText('正在觀察：'+part.name,24,36);}}
 }

});
function openObservation(id){if(editing)finishEditing();setFeeding(false);observation.open(id);tutorial.report('observationOpened');}
$('observe-fish').onclick=()=>openObservation(selected);
$('observe-review').onclick=()=>openObservation(selected);
function frame(t){if(started&&!document.hidden&&!conflict){const start=performance.now();if(editCacheDirty){editCacheDirty=false;buildBackground();}if(session&&lastFrame){const ms=t-lastFrame;session.frames++;session.frameMsTotal+=ms;if(ms>50)session.longFrames++;}const dt=lastFrame?Math.min((t-lastFrame)/1000,.1):0;if(lastFrame)step(dt);draw();observation.tick(dt);const cost=performance.now()-start;diagnostics.costTotal+=cost;diagnostics.costMax=Math.max(diagnostics.costMax,cost);}lastFrame=t;requestAnimationFrame(frame);}
canvas.addEventListener('click',e=>{if(editing)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/W,y=(e.clientY-rect.top)/H;
  if(feeding){if(y>.28){toast('請點魚缸上方的水面，不用點魚兒。');return;}feed(x);return;}
  const coin=[...state.drops].reverse().find(c=>Math.hypot((c.x-x)*W,(c.y-y)*H)<27);if(coin){collect(coin);return;}
  const hit=state.fishes.map(f=>({f,score:fishHitScore(f,x,y)})).filter(h=>Number.isFinite(h.score)).sort((a,b)=>a.score-b.score)[0];if(hit)selectFish(hit.f.id);else closeCard();
});
canvas.addEventListener('keydown',e=>{if(feeding&&(e.key==='Enter'||e.key===' ')){e.preventDefault();feed(.5);}if(e.key==='Escape'){setFeeding(false);closeCard();}});
$('feed').onclick=()=>setFeeding(!feeding);$('stop-feed').onclick=()=>setFeeding(false);$('close-card').onclick=closeCard;$('shop').onclick=shop;$('more-menu').onclick=moreMenu;$('fish-more').onclick=fishMore;$('rename').onclick=renameFish;$('collect-all').onclick=()=>[...state.drops].forEach(collect);
$('dialog-close').onclick=()=>dialog.close();$('edit-done').onclick=finishEditing;$('edit-left').onclick=()=>nudgeDecoration(-1);$('edit-right').onclick=()=>nudgeDecoration(1);$('edit-store').onclick=storeSelectedDecoration;dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
// Visibility catches mobile backgrounding; pagehide is an extra best-effort flush.
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(dirty)save();hiddenAt=Date.now();}else{lastFrame=0;if(started&&hiddenAt&&!conflict){offline((Date.now()-hiddenAt)/1000);save();updateUI();}hiddenAt=0;}});
window.addEventListener('pagehide',()=>{if(dirty)save();});window.addEventListener('beforeunload',()=>{if(dirty)save();});
window.addEventListener('storage',e=>{if(e.key===CONFIG.SAVE_KEY){if(!started){refreshHome();return;}conflict=true;clearTimeout(saveTimer);saveTimer=0;saveLabel();toast('另一個分頁已更新進度。請到設定重新讀取自動存檔，再繼續遊戲。',9000);}});
document.addEventListener('pointerdown',()=>enableAudio(),{passive:true});document.addEventListener('keydown',()=>enableAudio());
if(CONFIG.TEST_MODE)document.querySelector('.version').textContent='V0.6 測試';
if(session){window.addEventListener('error',()=>session.jsErrors++);window.addEventListener('unhandledrejection',()=>session.jsErrors++);}
const tutorial=window.AquariumTutorial.create({getState:()=>state,changed:()=>markDirty(true),notify:toast,grant:grantGift,ensureFeeding:kind=>{setFeeding(true);if(kind){selectedFeed=kind;renderFeedChoices();if(innerWidth<=1050)requestAnimationFrame(()=>canvas.scrollIntoView({block:'start'}));}}});
const sourceKeys=()=>[[CONFIG.SAVE_KEY,CONFIG.MANUAL_KEY],[CONFIG.V5_KEY,CONFIG.V5_MANUAL_KEY],[CONFIG.V4_KEY,CONFIG.V4_MANUAL_KEY],...(!CONFIG.TEST_MODE?[[CONFIG.V3_KEY,CONFIG.V3_MANUAL_KEY],[CONFIG.V2_KEY,CONFIG.V2_MANUAL_KEY],[CONFIG.LEGACY_KEY,CONFIG.LEGACY_MANUAL_KEY]]:[])];
function findStored(){for(const [key,manual]of sourceKeys()){const raw=localStorage.getItem(key);if(raw)return {key,manual,raw};}return null;}
function refreshHome(){
 $('home-continue').hidden=true;$('home-summary').textContent='';$('home-error').textContent='';
 try{const stored=findStored();if(stored){const s=validate(JSON.parse(stored.raw));$('home-continue').hidden=false;$('home-summary').textContent=`${s.tankName} · ${s.tanks.length} 個魚缸 · ${s.tanks.reduce((n,t)=>n+t.fishes.length,0)} 隻魚 · ${s.coins} 金幣`;$('home-continue').onclick=()=>continueSaved();}}
 catch(e){$('home-error').textContent='本機存檔暫時無法讀取，原資料仍保留。可以載入 JSON 備份，或確認後開始新水族箱。';}
}
function paintHomeFish(){const c=$('home-fish').getContext('2d');c.clearRect(0,0,760,300);window.AquariumFishArt.draw(c,'guppy',178,145,155,1,-.03,.8,'normal');window.AquariumFishArt.draw(c,'goldfish',520,158,172,-1,.02,1.4,'normal');window.AquariumFishArt.draw(c,'cory',365,245,105,1,0,2,'normal');}
function backupCurrent(tag){const stored=findStored();if(stored)localStorage.setItem(CONFIG.SAVE_KEY+'_'+tag,stored.raw);}
function activate(candidate,{backup=null,elapsed=0,manualSource=null}={}){
 let next;
 try{next=validate(candidate);if(backup)backupCurrent(backup);mergeRewardLedger(next);mergeGiftLedger(next);next.savedAt=Date.now();localStorage.setItem(CONFIG.SAVE_KEY,JSON.stringify(next));}
 catch(e){toast('目前無法保存新進度，原本存檔仍保留。請確認瀏覽器有可用空間，再試一次。',8000);return false;}
 clearTimeout(saveTimer);saveTimer=0;state=next;started=true;dirty=false;saveBlocked=conflict=false;lastSaved=next.savedAt;lastFrame=0;simTime=0;saveAccumulator=0;feedAt=-99;
 $('home').hidden=true;$('game').hidden=false;window.scrollTo(0,0);setFeeding(false);allFish().forEach(syncFish);rebuildRuntime();resize();buildBackground();
 if(elapsed)offline(elapsed);evaluateGoals(false);save();checkLevelGifts();updateUI();tutorial.setActive(true);
 if(manualSource){try{const raw=localStorage.getItem(manualSource);if(raw&&!localStorage.getItem(CONFIG.MANUAL_KEY)){const m=validate(JSON.parse(raw));m.saveId=next.saveId;localStorage.setItem(CONFIG.MANUAL_KEY,JSON.stringify(m));}}catch(e){toast('進度已承接，舊手動存檔仍保留；可下載舊版備份後再匯入。');}}
 return true;
}
function continueSaved(){try{const source=findStored();if(!source)throw Error('沒有存檔');const next=validate(JSON.parse(source.raw));activate(next,{elapsed:Math.max(0,(Date.now()-next.savedAt)/1000),manualSource:source.key!==CONFIG.SAVE_KEY?source.manual:null});}catch(e){$('home-error').textContent='無法讀取這份進度，原存檔仍保留。可以選擇 JSON 備份重新載入。';}}
function newTank(){let name;try{name=window.AquariumSave.tankName($('tank-new-name').value);}catch(e){$('home-error').textContent=e.message;return;}
 const begin=()=>{if(activate(fresh(name),{backup:'before_new'}))dialog.close();};try{if(findStored()){confirmAction('建立新的水族箱？','目前進度會被新的三隻幼魚與 20 金幣取代。建議先繼續遊戲並下載存檔；確認後會另保留一份替換前備份。',begin);$('dialog-content').querySelector('.confirm').textContent='確認建立';}else begin();}catch(e){toast('目前無法讀取儲存空間，請確認瀏覽器的儲存設定。');}}
function goHome(){if(!save()){toast('尚未成功保存。請先下載存檔，再返回首頁。');return;}dialog.close();tutorial.setActive(false);started=false;dirty=false;clearTimeout(saveTimer);saveTimer=0;dismissToast();$('game').hidden=true;$('home').hidden=false;refreshHome();window.scrollTo(0,0);}
function renameTank(){openDialog('替水族箱改名字','tank-name');const input=document.createElement('input');input.id='tank-rename';input.className='name-input';input.value=state.tankName;input.maxLength=20;input.setAttribute('aria-label','水族箱名稱，最多 10 個字');const error=paragraph('','name-error');error.setAttribute('role','status');const actions=document.createElement('div');actions.className='confirm-actions';actions.append(button('取消',()=>dialog.close()),button('保存名稱',()=>{if(conflict)return;try{state.tankName=window.AquariumSave.tankName(input.value);markDirty(true);updateUI();dialog.close();toast('水族箱名稱已保存。');}catch(e){error.textContent=e.message;}},'confirm'));$('dialog-content').append(input,error,actions);input.focus();}
function chooseFile(){
 let input=$('save-import-file');if(!input){input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.id='save-import-file';input.hidden=true;document.body.append(input);input.addEventListener('change',async()=>{
 const file=input.files?.[0];if(!file)return;
 try{if(file.size>1024*1024)throw Error('檔案太大，請選擇水族箱下載的 JSON 存檔。');const next=validate(JSON.parse(await file.text()));const date=new Date(next.savedAt).toLocaleString('zh-TW',{hour12:false});confirmAction('載入這份水族箱進度？',`水族箱：${next.tankName}。魚缸：${next.tanks.length} 個。魚兒：${next.tanks.reduce((n,t)=>n+t.fishes.length,0)} 隻。金幣：${next.coins}。儲存日期：${date}。格式已確認，可安全升級。確認後取代目前進度，原進度另留備份。`,()=>{if(started&&(conflict||saveBlocked)){toast('另一分頁已更新進度。請先重新讀取，再載入檔案。');return;}if(activate(next,{backup:'before_import'})){dialog.close();toast('存檔已載入！原本進度另有備份。');}});$('dialog-content').querySelector('.confirm').textContent='確認載入';}
 catch(e){toast('這份檔案無法讀取，原本進度仍保留。請選擇從水族箱下載的 JSON 存檔。',8000);}
 });}input.value='';input.click();
}

const giftRewards={starter:{general:8},smallLesson:{small:5},fishCard:{coins:10},level2:{small:3},level4:{protein:3}};
function giftKey(id=state.saveId){return CONFIG.SAVE_KEY+'_gifts_'+id;}
function readGifts(id=state.saveId){const raw=localStorage.getItem(giftKey(id));if(!raw)return {ids:[],emergencyAt:0};const v=JSON.parse(raw);if(!v||!Array.isArray(v.ids)||v.ids.some(x=>!window.AquariumSave.GIFT_IDS.includes(x))||typeof v.emergencyAt!=='number'||!Number.isFinite(v.emergencyAt)||v.emergencyAt<0||v.emergencyAt>Number.MAX_SAFE_INTEGER)throw Error('贈禮帳本無法讀取');return v;}
function mergeGiftLedger(next){const ledger=readGifts(next.saveId);next.gifts=[...new Set([...next.gifts,...ledger.ids])];next.emergencyAt=Math.max(next.emergencyAt,ledger.emergencyAt);localStorage.setItem(giftKey(next.saveId),JSON.stringify({ids:next.gifts,emergencyAt:next.emergencyAt}));}
function grantGift(id){
 if(conflict||saveBlocked)return false;let previous,ledgerRaw;
 try{const ledger=readGifts();if(state.gifts.includes(id)||ledger.ids.includes(id)){state.gifts=[...new Set([...state.gifts,...ledger.ids])];return true;}
 previous=JSON.stringify(state);ledgerRaw=localStorage.getItem(giftKey());const reward=giftRewards[id];if(!reward)return false;
 state.gifts.push(id);if(reward.coins)state.coins=Math.min(CONFIG.MAX_COINS,state.coins+reward.coins);
 for(const kind of Object.keys(FEEDS))if(reward[kind]&&!(id==='level4'&&state.feedInventory.protein>0))state.feedInventory[kind]=Math.min(999999,state.feedInventory[kind]+reward[kind]);
 localStorage.setItem(giftKey(),JSON.stringify({ids:[...new Set([...ledger.ids,...state.gifts])],emergencyAt:Math.max(ledger.emergencyAt,state.emergencyAt)}));
 if(!save())throw Error('無法保存贈禮');updateUI();return true;
 }catch(e){if(previous){state=window.AquariumSave.attach(JSON.parse(previous));try{if(ledgerRaw===null)localStorage.removeItem(giftKey());else localStorage.setItem(giftKey(),ledgerRaw);}catch(ignore){saveBlocked=true;}}toast('目前無法保存贈禮，請稍後再試。');return false;}
}
function checkLevelGifts(){if(state.level>=2&&!state.gifts.includes('level2')){if(grantGift('level2'))toast('養魚等級 2：送你小型魚飼料 ×3 份，鼠魚、斑馬魚、白雲山魚和紅蓮燈都適用。');}if(state.level>=4&&!state.gifts.includes('level4')){if(grantGift('level4'))toast('你解鎖了高蛋白飼料！神仙魚和鬥魚可以吃這種飼料，記得在商店補充喔！');}}
function feedShop(){shopTab='feed';shop();tutorial.report('feedShopOpened');tutorial.render();}
function renderFeedShop(grid){for(const [id,d]of Object.entries(FEEDS)){const card=document.createElement('article');card.className='shop-item feed-item';const h=document.createElement('h3');h.textContent=d.name;const dot=document.createElement('span');dot.className='feed-bag';dot.style.background=d.color;dot.textContent='10';const names=d.species.map(x=>SPECIES[x].name).join('、');const b=button(state.level<d.level?`養魚等級 ${d.level} 解鎖`:`購買 · ${d.price} 金幣`,()=>buyFeed(id),'buy');b.id='buy-feed-'+id;b.disabled=state.level<d.level;card.append(dot,h,paragraph(names),paragraph(`每包 ${d.pack} 份 · ${d.price} 金幣`),paragraph(`現有庫存：${state.feedInventory[id]} 份`,'feed-stock'),b);grid.append(card);}const help=button('申請緊急飼料',emergencyFeed,'place-button');help.id='emergency-feed';grid.append(help,paragraph('遊戲將食物簡化為三類，不代表真實魚類只能吃這一種。飼料不足且金幣不足時，每 10 分鐘可申請適用的救急份量。','dialog-note'));}
function buyFeed(id){if(conflict||saveBlocked)return;const d=FEEDS[id];if(!d||state.level<d.level)return;if(state.coins<d.price){shopMessage('金幣還不夠，可以收取金幣，或在飼料用完時申請緊急飼料。');return;}if(state.feedInventory[id]>999999-d.pack||state.feedPurchases[id]>=999999){shopMessage('目前庫存已足夠。');return;}state.coins-=d.price;state.feedInventory[id]+=d.pack;state.feedPurchases[id]++;if(!save()){renderShop();return;}if(allFish().some(f=>FOOD_FOR[f.species]===id))tutorial.report('feedBought');renderShop();updateUI();shopMessage(`已購買${d.name} ×${d.pack} 份！目前 ${state.feedInventory[id]} 份。`);sound('buy');}
function emergencyFeed(){if(conflict||saveBlocked)return;let before,raw;try{const ledger=readGifts(),now=Date.now(),last=Math.max(ledger.emergencyAt,state.emergencyAt),missing=Object.keys(FEEDS).filter(id=>allFish().some(f=>FOOD_FOR[f.species]===id)&&state.feedInventory[id]===0&&state.coins<FEEDS[id].price);if(!missing.length){shopMessage('目前有可用飼料或足夠金幣，可以先使用庫存或購買飼料。');return;}if(last&&now-last<CONFIG.EMERGENCY_COOLDOWN){shopMessage(`請再等 ${Math.ceil((CONFIG.EMERGENCY_COOLDOWN-(now-last))/60000)} 分鐘，就能再申請。`);return;}before=JSON.stringify(state);raw=localStorage.getItem(giftKey());for(const id of missing)state.feedInventory[id]=Math.max(3,Math.ceil(allFish().filter(f=>FOOD_FOR[f.species]===id).length*5/3));state.emergencyAt=now;localStorage.setItem(giftKey(),JSON.stringify({ids:[...new Set([...ledger.ids,...state.gifts])],emergencyAt:now}));if(!save())throw Error('write');renderShop();updateUI();shopMessage('緊急飼料已送到！先讓餓肚子的魚兒吃飽，再慢慢收集金幣。');}catch(e){if(before){state=window.AquariumSave.attach(JSON.parse(before));try{if(raw===null)localStorage.removeItem(giftKey());else localStorage.setItem(giftKey(),raw);}catch(ignore){saveBlocked=true;}}toast('救急飼料尚未成功保存，請稍後再試。');}}
function renderTankSelector(){const root=$('tank-selector');if(!root)return;const signature=state.tanks.map(t=>[t.id,t.name,t.tier,t.fishes.length,t.drops.length,t.id===state.activeTankId].join('|')).join(';');if(root.dataset.signature===signature)return;root.dataset.signature=signature;root.replaceChildren();for(const t of state.tanks){const b=button('',()=>switchTank(t.id),'tank-switch');b.dataset.tankId=t.id;b.setAttribute('aria-pressed',String(t.id===state.activeTankId));const name=document.createElement('strong');name.textContent=t.name;b.append(name,paragraph(`${t.fishes.length} / ${TANK_TIERS[t.tier-1].capacity} 隻 · 魚缸 ${t.tier} 級${t.drops.length?' · 有金幣':''}`));root.append(b);}const add=button('＋ 新魚缸',tankMenu,'tank-add');root.append(add);}
function switchTank(id){if(conflict||saveBlocked||id===state.activeTankId||!state.tanks.some(t=>t.id===id))return;if(editing)finishEditing();if($('observation')?.open)$('obs-return').click();setFeeding(false);closeCard();state.activeTankId=id;bindTank(state.tanks.find(t=>t.id===id));specimenPose=null;feedAt=-99;buildBackground();save();updateUI();draw();tutorial.render();}
function renderTankOffers(){const offer=TANK_OFFERS.find(o=>o.number===state.tanks.length+1);if(!offer)return;const box=document.createElement('section');box.className='new-tank-offer';const b=button(state.level<offer.level?`養魚等級 ${offer.level} 可解鎖`:`購買第 ${offer.number} 個魚缸 · ${offer.price} 金幣`,()=>{if(conflict||saveBlocked||state.level<offer.level||state.tanks.length>=CONFIG.MAX_TANKS)return;if(state.coins<offer.price){toast('再存一些金幣，就能迎接新的小水世界。');return;}confirmAction('購買新的空魚缸？',`${offer.price} 金幣，起始可養 5 隻魚，之後可升級至 10 隻。`,()=>{if(conflict||saveBlocked||state.tanks.length!==offer.number-1||state.coins<offer.price||state.level<offer.level)return;state.coins-=offer.price;const t=window.AquariumSave.emptyTank(uid(),`第 ${offer.number} 個魚缸`);state.tanks.push(t);tankContexts.set(t.id,{runtime:new Map(),food:[],effects:[],poiCache:buildPOI([],DECORATIONS,decorLayout,W,H)});if(save()){dialog.close();switchTank(t.id);toast('新魚缸準備好了！可在設定命名，或從其他魚缸移入魚兒。');}});$('dialog-content').querySelector('.confirm').textContent='確認購買';},'buy');b.id='buy-tank';b.disabled=state.level<offer.level;box.append(paragraph(`下一個魚缸：第 ${offer.number} 缸 · 養魚等級 ${offer.level} · ${offer.price} 金幣`),b);$('dialog-content').append(box);}
function moveFish(id){const f=state.fishes.find(f=>f.id===id);if(!f)return;const source=state.activeTankId;openDialog('移動魚兒','move');$('dialog-content').append(paragraph(`替${f.name}選一個新的家。名字、成長、飽足度、個性及配色都會保留。`));for(const t of state.tanks.filter(t=>t.id!==source)){const cap=TANK_TIERS[t.tier-1].capacity;const b=button(`${t.name} · ${t.fishes.length} / ${cap} 隻`,()=>confirmAction('確認移動魚兒？',`${f.name}將搬到${t.name}，不收取費用。`,()=>{if(conflict||saveBlocked)return;const from=state.tanks.find(q=>q.id===source),to=state.tanks.find(q=>q.id===t.id),fish=from.fishes.find(q=>q.id===id);if(!fish||to.fishes.length>=TANK_TIERS[to.tier-1].capacity){toast('目標魚缸已滿，魚兒仍在原缸。');return;}from.fishes=from.fishes.filter(q=>q.id!==id);to.fishes.push(fish);if(save()){tankContexts.get(source).runtime.delete(id);tankContexts.get(t.id).runtime.set(id,makeRuntime(fish,to.fishes.length));closeCard();dialog.close();updateUI();toast('魚兒已安全搬家！');}}),'place-button');b.dataset.moveTo=t.id;b.disabled=t.fishes.length>=cap;$('dialog-content').append(b);}if(state.tanks.length<2)$('dialog-content').append(paragraph('擁有第二個魚缸後，就能替魚兒搬家。'));}
for(const id of Object.keys(FEEDS))$('feed-'+id).onclick=()=>selectFeed(id);
$('feed-shop').onclick=feedShop;$('roster-shortcut').onclick=roster;
$('home-new').onclick=newTank;$('home-import').onclick=chooseFile;

initialize();new ResizeObserver(resize).observe(canvas);resize();requestAnimationFrame(frame);
// Test diagnostics are read-only snapshots and exist only when explicitly requested locally.
if(CONFIG.TEST_MODE||new URLSearchParams(location.search).get('debug')==='1')Object.defineProperty(window,'aquariumDebug',{value:()=>({state:{...structuredClone(state),fishes:structuredClone(state.fishes),drops:structuredClone(state.drops),tankName:state.tankName,tankTier:state.tankTier,tankCapacity:state.tankCapacity},runtime:[...runtime].map(([id,r])=>({id,...r})),food:structuredClone(food),diagnostics:{...diagnostics},config:CONFIG,species:SPECIES,decorations:DECORATIONS,saveBlocked,conflict,started,audioState:audioCtx?.state||null,editing,editSelection,poi:[...poiCache.byId.values()],session:session?{...session}:null,tiers:TANK_TIERS,variants:VARIANTS,personalities:PERSONALITIES,achievementDefinitions:ACHIEVEMENTS,observation:observation.debug()})});
})();
