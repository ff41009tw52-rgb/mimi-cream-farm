/* 悠悠水族箱 V0.3 — standalone, no network, no shared game storage. */
(() => {
'use strict';
const {CONFIG,SPECIES,DECORATIONS,PERSONALITIES,TANK_TIERS,VARIANTS,ACHIEVEMENTS}=window.AquariumData;
const {validate,personalityFor,snapX,nearestSnap}=window.AquariumSave;
const {buildPOI,tickEnvironment}=window.AquariumWorld;
const coinInterval=s=>s.coinInterval*CONFIG.COIN_SCALE;
const growthTime=s=>s.growthTime*CONFIG.GROWTH_SCALE;
const $=id=>document.getElementById(id), clamp=(v,a=0,b=100)=>Math.min(b,Math.max(a,v));
const rand=(a,b)=>a+Math.random()*(b-a), uid=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const stage=g=>g>=100?2:g>=35?1:0, stageName=g=>['幼魚','亞成魚','成魚'][stage(g)];
const timeLabel=t=>new Date(t).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false});
const canvas=$('tank'), ctx=canvas.getContext('2d'), dialog=$('dialog');
let state, W=1000,H=500,dpr=1, bg, runtime=new Map(), food=[],effects=[],selected=null,feeding=false;
let dirty=false,saveTimer=0,lastSaved=0,saveBlocked=false,conflict=false,simTime=0,feedAt=-99,cleanAt=-99;
let uiAccumulator=0,saveAccumulator=0,lastFrame=0,hiddenAt=0,toastTimer,dialogMode='',resetStep=0;
const diagnostics={writes:0,eaten:0,spawned:0,frames:0,frameMax:0,costTotal:0,costMax:0,bursts:0,pauses:0,discoveries:0,sounds:0,environmentVisits:0,environmentSeconds:0,variantUnlocks:0,achievementCompletions:0,achievementRewards:0};
let cleaning=null,audioCtx=null,audioLast=-99,audioEatLast=-99,shopTab='fish';
let foreground,poiCache={byId:new Map(),bySpecies:{}},editing=false,editSelection=null,drag=null,editPreview=null,editCacheDirty=false;
const shopVariants=new Map(),editorHandles=new Map();
const session=CONFIG.PLAYTEST?{version:'0.3',elapsedSeconds:0,first:{feed:null,fish:null,shop:null,buy:null,place:null},counts:{feed:0,shop:0,clean:0,buy:0,place:0},onboardingCompleted:false,jsErrors:0,frames:0,longFrames:0,frameMsTotal:0}:null;
const levelFor=x=>CONFIG.LEVEL_XP.reduce((l,v,i)=>x>=v?i+1:l,1);
const zones={left:'左側',center:'中央',right:'右側'};

function newFish(species,index=0,variant='normal'){const s=SPECIES[species],id=uid();return {id,species,personality:personalityFor(id,species),variant,playSeconds:0,adultRecorded:false,name:s.nickname+(index?` ${index+1}`:''),hunger:68,growth:0,growthStage:'幼魚',size:s.size*.7,mood:'開心',createdAt:Date.now(),coinProgress:coinInterval(s)*rand(.35,.55)};}
function starterExtras(fishes){
 const discovery={};for(const f of fishes){const d=discovery[f.species]||(discovery[f.species]={total:0,highestStage:0});d.total++;d.highestStage=Math.max(d.highestStage,stage(f.growth));}
 return {xp:0,level:1,careProgress:0,collection:discovery,purchasedDecorations:{river:1,smallplant:2,smallrock:1},placedDecorations:[{id:uid(),decoration:'smallplant',zone:'left',slot:'back1'},{id:uid(),decoration:'smallplant',zone:'right',slot:'back1'},{id:uid(),decoration:'smallrock',zone:'center',slot:'floor1'}],substrate:'river',soundEnabled:true,cleanReadyAt:0,mode:CONFIG.TEST_MODE?'test':'normal'};
}
function fresh(){const fishes=['guppy','goldfish','cory'].map(k=>newFish(k));const next=validate({schemaVersion:2,gameVersion:'0.2',savedAt:0,coins:CONFIG.START_COINS,waterQuality:100,tankCapacity:CONFIG.CAPACITY,fishes,drops:[],...starterExtras(fishes)});next.onboarding={completed:false,skipped:false,step:0};return next;}
function mood(f){return f.hunger<25?'肚子餓':state.waterQuality<35?'想要清澈的水':f.hunger>=90?'吃得好滿足':'開心';}
function syncFish(f){f.growthStage=stageName(f.growth);f.size=SPECIES[f.species].size*(.7+.3*f.growth/100);f.mood=mood(f);}
function snapshot(){return {...state,schemaVersion:CONFIG.SCHEMA_VERSION,gameVersion:CONFIG.GAME_VERSION,savedAt:Date.now(),fishes:state.fishes.map(f=>({...f})),drops:state.drops.map(c=>({...c}))};}
function save(manual=false){
  clearTimeout(saveTimer);saveTimer=0;
  if(saveBlocked||conflict){saveLabel();if(manual)toast('目前無法儲存進度。原存檔已保留。');return false;}
  try{
    const payload=snapshot(),json=JSON.stringify(payload);
    localStorage.setItem(CONFIG.SAVE_KEY,json);diagnostics.writes++;
    if(manual){localStorage.setItem(CONFIG.MANUAL_KEY,json);diagnostics.writes++;}
    state.savedAt=lastSaved=payload.savedAt;dirty=false;saveLabel();persistSession();
    if(manual)toast('✓ 遊戲已儲存，可隨時讀取這個時間點。');
    return true;
  }catch(error){$('save-status').textContent='⚠ 目前無法儲存進度';$('save-status').classList.add('error');if(manual)toast('儲存失敗，請確認瀏覽器有可用空間。');return false;}
}
function markDirty(important=false){dirty=true;if(important){save();return;}if(!saveTimer&&!saveBlocked&&!conflict)saveTimer=setTimeout(()=>save(),CONFIG.SAVE_DEBOUNCE_MS);}
function saveLabel(){const e=$('save-status');e.classList.toggle('error',saveBlocked||conflict);e.textContent=conflict?'⚠ 另一分頁已更新，請重新讀取':saveBlocked?'⚠ 原存檔已保留，暫停儲存':lastSaved?`✓ 已自動存檔 ${timeLabel(lastSaved)}`:'尚未儲存';}
function offline(seconds){
 const t=clamp(seconds,0,CONFIG.MAX_OFFLINE_TIME),hours=t/3600,oldWater=state.waterQuality;let reward=0,changed=false;
 for(const f of state.fishes){const before=stage(f.growth);if(f.hunger>25&&state.waterQuality>25){f.growth=clamp(f.growth+hours*CONFIG.OFFLINE_GROWTH_PER_HOUR*(900/SPECIES[f.species].growthTime));if(f.hunger>=45&&state.waterQuality>=45)reward+=Math.floor(hours*2*SPECIES[f.species].values[stage(f.growth)]);}
  f.hunger=clamp(f.hunger-hours*CONFIG.OFFLINE_HUNGER_PER_HOUR);syncFish(f);recordAdult(f);state.collection[f.species].highestStage=Math.max(state.collection[f.species].highestStage,stage(f.growth));if(stage(f.growth)!==before){gainXP(8,false);changed=true;}}
 state.waterQuality=clamp(state.waterQuality-hours*(.7+state.fishes.length*.15));reward=Math.min(reward,CONFIG.OFFLINE_MAX_REWARD,CONFIG.MAX_COINS-state.coins);state.coins+=reward;dirty=true;
 if(seconds>=60){const m=Math.floor(seconds/60),label=m>=60?`${Math.floor(m/60)} 小時 ${m%60} 分`:`${m} 分`;toast(`歡迎回來！離開了 ${label}${seconds>CONFIG.MAX_OFFLINE_TIME?'（最多計算 4 小時）':''}。水質下降 ${(oldWater-state.waterQuality).toFixed(1)}%${reward?`，獲得 ${reward} 金幣`:''}${changed?'，魚兒長大了':''}。`,6500);}
}
function initialize(){
 let stored=null,sourceKey=null,sourceManual=null;
 try{
  stored=localStorage.getItem(CONFIG.SAVE_KEY);
  if(!stored&&!CONFIG.TEST_MODE){for(const [key,manual]of [[CONFIG.V2_KEY,CONFIG.V2_MANUAL_KEY],[CONFIG.LEGACY_KEY,CONFIG.LEGACY_MANUAL_KEY]]){stored=localStorage.getItem(key);if(stored){sourceKey=key;sourceManual=manual;break;}}}
  state=stored?validate(JSON.parse(stored)):fresh();mergeRewardLedger();lastSaved=state.savedAt;
 }catch(error){state=fresh();saveBlocked=true;toast('無法讀取原存檔，已保留資料。可先試玩；設定中可以重試讀取。',8000);}
 state.fishes.forEach(syncFish);rebuildRuntime();if(stored&&!saveBlocked)offline(Math.max(0,(Date.now()-state.savedAt)/1000));
 if(!saveBlocked){
  const saved=save();
  if(sourceKey&&saved){try{const manual=localStorage.getItem(sourceManual);if(manual&&!localStorage.getItem(CONFIG.MANUAL_KEY)){const upgradedManual=validate(JSON.parse(manual));upgradedManual.saveId=state.saveId;localStorage.setItem(CONFIG.MANUAL_KEY,JSON.stringify(upgradedManual));}}catch(e){toast('自動進度已升級；舊手動快照仍保留，可用 JSON 匯入。',5000);}toast('已升級到 V0.3！原本的魚與布置都在，舊版本存檔也已保留。',6000);}
 }else saveLabel();evaluateGoals(false);updateUI();renderOnboarding();
}
function makeRuntime(f,i=0){const s=SPECIES[f.species],x=rand(.14,.86),y=rand(...s.depth);return {x,y,vx:(i%2?-.5:.5)*s.speed,vy:0,target:{x:rand(.15,.85),y},turn:i%2?-1:1,heading:0,phase:rand(0,6.28),wander:rand(2,6),pause:0,burst:0,direction:i%2?-1:1,position:{x,y},preferredDepth:s.depth,speed:s.speed,coinValue:s.values[stage(f.growth)],behavior:'巡遊',behaviorState:'explore',poi:null,poiWait:rand(12,32),poiRemaining:0,poiReached:false,hiddenAmount:0,environmentSeconds:0,environmentVisits:0};}
function rebuildRuntime(){runtime.clear();food=[];effects=[];cleaning=null;selected=null;$('fish-card').hidden=true;state.fishes.forEach((f,i)=>runtime.set(f.id,makeRuntime(f,i)));}
function toast(text,ms=3000){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,ms);}
function updateUI(){
 $('tank-name').textContent=TANK_TIERS[state.tankTier-1].name;$('tank-message').textContent=selected&&runtime.get(selected)?runtime.get(selected).behavior:'慢慢游，慢慢長大。';
 $('coins').textContent=state.coins.toLocaleString();$('water').textContent=Math.round(state.waterQuality);$('water-bar').style.width=`${state.waterQuality}%`;$('water-label').textContent=state.waterQuality>=70?'清澈':state.waterQuality>=40?'待清潔':'有點混濁';
 $('capacity').replaceChildren(document.createTextNode(`${state.fishes.length} `),Object.assign(document.createElement('small'),{textContent:`/ ${state.tankCapacity}`}));
 $('level').textContent=`水族 Lv.${state.level}`;const floor=CONFIG.LEVEL_XP[state.level-1],ceiling=CONFIG.LEVEL_XP[state.level];$('xp-bar').style.width=`${ceiling?(state.xp-floor)/(ceiling-floor)*100:100}%`;
 const next=Object.values(SPECIES).filter(s=>s.unlockLevel===state.level+1).map(s=>s.name);$('next-unlock').textContent=next.length?`下一級：${next.join('、')}`:`已解鎖全部魚種`;
 $('collect-all').hidden=!state.drops.length;$('collect-all').textContent=`收取金幣（${state.drops.length}）`;$('feed').disabled=editing;$('clean').disabled=!!cleaning||editing;$('clean').setAttribute('aria-label',cleaning?'正在清潔':'清潔水族箱');
 if(selected){const f=state.fishes.find(f=>f.id===selected);if(f){$('fish-name').textContent=f.name;$('fish-species').textContent=SPECIES[f.species].name;$('fish-stage').textContent=stageName(f.growth);$('fish-hunger').textContent=`${Math.round(f.hunger)}%`;$('fish-growth').textContent=`${Math.floor(f.growth)}%`;$('hunger-meter').value=f.hunger;$('growth-meter').value=f.growth;$('fish-mood').textContent=mood(f);const mins=Math.max(0,Math.floor((Date.now()-f.createdAt)/60000));$('fish-extra').textContent=`${SPECIES[f.species].depthName} · 相伴 ${mins>=60?Math.floor(mins/60)+' 小時':mins+' 分鐘'}`;$('fish-personality').textContent=`個性：${PERSONALITIES[f.personality].name} · ${PERSONALITIES[f.personality].desc}`;$('fish-color').textContent=f.variant==='normal'?'':VARIANTS[f.variant].name;$('rehome').disabled=state.fishes.length<=3;}}
}
function selectFish(id){if(editing)return;metric('fish');advanceOnboarding(1);selected=id;$('fish-card').hidden=false;updateUI();}
function closeCard(){selected=null;$('fish-card').hidden=true;}
function setFeeding(on){feeding=on;$('feed').setAttribute('aria-pressed',String(on));$('feeding-hint').hidden=!on;canvas.style.cursor=on?'crosshair':'pointer';if(on)closeCard();}
function feed(x){
 if(conflict)return;if(simTime-feedAt<CONFIG.FEED_COOLDOWN)return;if(food.length+CONFIG.FOOD_PER_DROP>CONFIG.MAX_FOOD){toast('飼料還很多，先讓魚兒吃完吧！');return;}
 feedAt=simTime;const kind=$('food-type').value;for(let i=0;i<CONFIG.FOOD_PER_DROP;i++)food.push({id:uid(),x:clamp(x+(i-1)*.017,.06,.94),y:.08+i*.006,bottom:0,phase:rand(0,7),kind});effects.push({x,y:.08,text:'',life:1,kind:'ripple'});sound('feed');metric('feed');advanceOnboarding(0);dirty=true;
}
function collect(c){
  if(conflict)return;
  const index=state.drops.findIndex(d=>d.id===c.id);if(index<0)return;
  state.drops.splice(index,1);state.coins=clamp(state.coins+c.value,0,CONFIG.MAX_COINS);effects.push({x:c.x,y:c.y,text:`+${c.value}`,life:1.5});
  const rect=canvas.getBoundingClientRect(),hud=$('coins').getBoundingClientRect(),el=document.createElement('i');el.className='coin-flight';el.style.left=`${rect.left+c.x*W}px`;el.style.top=`${rect.top+c.y*H}px`;document.body.append(el);
  const anim=el.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${hud.left-rect.left-c.x*W}px,${hud.top-rect.top-c.y*H}px) scale(.5)`,opacity:.3}],{duration:620,easing:'cubic-bezier(.25,.6,.35,1)'});anim.finished.then(()=>el.remove(),()=>el.remove());gainXP(1);sound('coin');markDirty(true);updateUI();
}
function clean(){
 if(conflict||cleaning)return;if(state.waterQuality>90){toast('現在很乾淨，不需要整理。');return;}
 const remaining=Math.ceil((state.cleanReadyAt-Date.now())/1000);if(remaining>0){toast(`剛整理過了，再等 ${remaining} 秒吧。`);return;}
 metric('clean');cleaning={elapsed:0,from:state.waterQuality,to:clamp(state.waterQuality+CONFIG.CLEAN_EFFICIENCY)};state.cleanReadyAt=Date.now()+(CONFIG.CLEAN_SECONDS+CONFIG.CLEAN_COOLDOWN)*1000;sound('clean');markDirty(true);updateUI();
}
function buy(species){
 if(conflict)return;const s=SPECIES[species];if(state.level<s.unlockLevel){shopMessage(`水族 Lv.${s.unlockLevel} 才能迎接${s.name}。`);return;}if(state.fishes.length>=state.tankCapacity){shopMessage('魚缸已經住滿了！可以從魚兒資訊卡送養，保留圖鑑紀錄。');return;}if(state.coins<s.price){shopMessage('金幣不足，先收集魚兒帶來的金幣吧。');return;}
 const variant=shopVariants.get(species)||'normal';if(variant!=='normal'&&!state.unlockedVariants.includes(variant)){shopMessage('先完成配色的解鎖條件吧。');return;}
 state.coins-=s.price;const first=!state.collection[species];const total=(state.collection[species]?.total||0);const f=newFish(species,total,variant);state.fishes.push(f);syncFish(f);runtime.set(f.id,makeRuntime(f,state.fishes.length));
 const history=state.collection[species];state.collection[species]={total:Math.min(9999,total+1),highestStage:history?.highestStage||0,adults:history?.adults||0,variants:[...new Set([...(history?.variants||['normal']),variant])]};state.stats.purchases++;metric('buy');evaluateGoals();gainXP(first?12:2);sound('buy');
 if(first){diagnostics.discoveries++;effects.push({x:.5,y:.4,text:`圖鑑新增：${s.name}`,life:3});toast(`圖鑑新增：${s.name}`,3500);}markDirty(true);updateUI();renderShop();shopMessage(`歡迎${f.name}！目前 ${state.fishes.length} / ${state.tankCapacity} 隻，剩下 ${state.coins} 金幣。`);
}
function shopMessage(text){const e=$('shop-message');if(e)e.textContent=text;else toast(text);}
function openDialog(title,mode){if(editing)finishEditing();closeCard();dialogMode=mode;$('dialog-title').textContent=title;$('dialog-content').replaceChildren();if(!dialog.open)dialog.showModal();}
function button(text,handler,cls=''){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;b.addEventListener('click',handler);return b;}
function shop(){if(editing)finishEditing();metric('shop');advanceOnboarding(2);openDialog('把喜歡的帶回家','shop');renderShop();}
function settings(){openDialog('照顧好每一段日常','settings');const list=document.createElement('div');list.className='settings-list';
  function row(title,desc,label,fn,danger=false){const r=document.createElement('div');r.className='setting-row';const p=document.createElement('p');p.textContent=title;const small=document.createElement('small');small.textContent=desc;p.append(small);r.append(p,button(label,fn,danger?'danger':''));list.append(r);}
  row('手動存檔','額外保留現在這一刻；自動存檔仍會持續。','存檔',()=>{if(save(true)){dialog.close();}});
  row('讀取手動存檔','回到上次手動保存的時間點。','讀檔',()=>confirmAction('讀取手動存檔？','目前進度將被手動存檔取代。確定要繼續嗎？',()=>loadSaved(true)));
  row('重新讀取自動存檔','讀取最近一次自動保存的進度。','讀取',()=>confirmAction('讀取自動存檔？','目前尚未保存的變更將被取代。確定要繼續嗎？',()=>loadSaved(false)));
  row('重置遊戲','重新開始，魚兒與金幣都會回到最初。','重置',()=>{resetStep=1;confirmAction('確定要重新開始嗎？','重置後，將重新獲得三隻幼魚與 20 金幣；圖鑑與布置也會重新開始。',()=>{resetStep=2;confirmAction('最後確認：刪除目前進度','目前的魚、水族箱與金幣進度將被刪除，且無法復原。',reset,true);},true);},true);
  row('音效',state.soundEnabled?'柔和的操作音效已開啟。':'音效已關閉。',state.soundEnabled?'關閉':'開啟',()=>{state.soundEnabled=!state.soundEnabled;markDirty(true);settings();});
  row('我的魚缸','升級同一個魚缸，或重新布置小住客的家。','查看',tankMenu);
  row('永久成就','留住每一個養成的小里程碑。','查看',achievements);
  row('重新觀看新手引導','三個小步驟，也可以隨時跳過。','重看',()=>{dialog.close();state.onboarding={completed:false,skipped:false,step:0};renderOnboarding();markDirty(true);});
  if(CONFIG.PLAYTEST)row('本次試玩摘要','只記錄本機匿名操作次數與時間。','匯出試玩摘要',exportSession);
  row('魚類圖鑑','看看已遇見的魚，以及下一位新朋友。','查看',encyclopedia);
  row('備份到檔案','下載 JSON 進度，之後可以匯入。','匯出',exportSave);
  row('匯入存檔檔案','支援 V0.1／V0.2／V0.3 JSON，先驗證再取代。','匯入',chooseImport);
  const note=document.createElement('p');note.className='dialog-note';note.textContent='進度保存在這台裝置的瀏覽器。使用相同瀏覽器回來，就能繼續照顧魚兒。';$('dialog-content').append(list,note);
}
function confirmAction(title,copy,fn,danger=false){openDialog(title,'confirm');const p=document.createElement('p');p.className='confirm-copy';p.textContent=copy;const actions=document.createElement('div');actions.className='confirm-actions';actions.append(button('取消',()=>{resetStep=0;dialog.close();}),button(danger?'確認重置':'確定讀取',fn,'confirm'+(danger?' danger':'')));$('dialog-content').append(p,actions);}
function loadSaved(manual){
  try{
    const text=localStorage.getItem(manual?CONFIG.MANUAL_KEY:CONFIG.SAVE_KEY);
    if(!text){toast(manual?'還沒有手動存檔，先按一次存檔吧。':'還沒有自動存檔。');dialog.close();return;}
    const next=validate(JSON.parse(text));mergeRewardLedger(next);
    const wasBlocked=saveBlocked;
    clearTimeout(saveTimer);saveTimer=0;state=next;
    evaluateGoals(false);renderOnboarding();conflict=saveBlocked=false;
    lastSaved=state.savedAt;state.fishes.forEach(syncFish);rebuildRuntime();buildBackground();
    if(!manual)offline(Math.max(0,(Date.now()-state.savedAt)/1000));
    dirty=true;const saved=save();
    if(!saved)saveBlocked=wasBlocked;
    updateUI();dialog.close();
    if(!saved){if(saveBlocked)saveLabel();toast('已讀取備份，但目前無法儲存。原自動存檔已保留，請確認瀏覽器有可用空間後重試。',6000);return;}
    toast('✓ 已讀取存檔。');
  }
  catch(e){if(!manual)saveBlocked=true;saveLabel();dialog.close();toast('這份存檔目前無法讀取，原資料已保留。',5000);}
}
function reset(){if(resetStep!==2)return;try{localStorage.removeItem(CONFIG.SAVE_KEY);localStorage.removeItem(CONFIG.MANUAL_KEY);localStorage.removeItem(CONFIG.SAVE_KEY+'_before_import');}catch(e){toast('無法刪除存檔，請檢查瀏覽器的儲存設定。');dialog.close();return;}
  clearTimeout(saveTimer);state=fresh();saveBlocked=conflict=false;resetStep=0;state.fishes.forEach(syncFish);rebuildRuntime();buildBackground();setFeeding(false);save();updateUI();dialog.close();renderOnboarding();toast('新的一缸，新的開始。');
}
function roster(){openDialog('我的魚兒','roster');state.fishes.forEach(f=>{const b=button('',()=>{dialog.close();selectFish(f.id);},'roster-item');const name=document.createElement('span');name.textContent=`${f.name} · ${SPECIES[f.species].name}`;const detail=document.createElement('small');detail.textContent=`${stageName(f.growth)} · 飽食 ${Math.round(f.hunger)}%`;b.append(name,detail);$('dialog-content').append(b);});}
function gainXP(amount,notify=true){
 const before=state.level;state.xp=clamp(state.xp+Math.round(amount*CONFIG.XP_SCALE),0,1000000);state.level=Math.max(state.legacyLevelFloor,levelFor(state.xp));dirty=true;
 if(state.level>before){sound('level');if(notify)toast(`水族升到 Lv.${state.level}！${Object.values(SPECIES).filter(s=>s.unlockLevel>before&&s.unlockLevel<=state.level).map(s=>s.name).join('、')}可以帶回家了。`,4500);if(dialog.open&&dialogMode==='shop')renderShop();}
}
function enableAudio(){try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});}catch(e){audioCtx=null;}}
function sound(kind){
 if(!state?.soundEnabled||!audioCtx||audioCtx.state!=='running'||simTime-audioLast<.08)return;if(kind==='eat'&&simTime-audioEatLast<.7)return;
 audioLast=simTime;if(kind==='eat')audioEatLast=simTime;
 const tones={feed:[450,330],eat:[610,670],coin:[760,950],buy:[470,690],level:[580,870],clean:[360,480]};const [start,end]=tones[kind]||tones.feed;
 try{const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),now=audioCtx.currentTime;osc.type='sine';osc.frequency.setValueAtTime(start,now);osc.frequency.exponentialRampToValueAtTime(end,now+.13);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(kind==='eat'?.018:.033,now+.014);gain.gain.exponentialRampToValueAtTime(.0001,now+.19);osc.connect(gain);gain.connect(audioCtx.destination);osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start(now);osc.stop(now+.21);diagnostics.sounds++;}catch(e){/* Audio support is optional; never stop simulation. */}
}
function paragraph(text,cls=''){const p=document.createElement('p');p.className=cls;p.textContent=text;return p;}
function previewFish(id,unknown=false,variant='normal'){const c=document.createElement('canvas');c.className='fish-preview';c.width=240;c.height=140;c.setAttribute('aria-label',unknown?'尚未發現的魚':SPECIES[id].name);const context=c.getContext('2d');if(unknown)context.globalAlpha=.12;drawFish(context,id,120,76,SPECIES[id].shape==='angel'?88:100,1,0,.7,variant);return c;}
function renderShop(){
 if(!dialog.open||dialogMode!=='shop')return;const root=$('dialog-content');root.replaceChildren();const tabs=document.createElement('div');tabs.className='tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','商店分類');
 for(const [id,label]of [['fish','魚兒'],['decor','布置']]){const b=button(label,()=>{shopTab=id;renderShop();},'tab'+(shopTab===id?' active':''));b.id='tab-'+id;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(shopTab===id));tabs.append(b);}
 const intro=paragraph(`水族 Lv.${state.level} · ${state.coins} 金幣 · ${shopTab==='fish'?'遇見下一位小住客。':'買下喜歡的，再左右布置小住客的家。'}`,'shop-intro');intro.id='shop-message';intro.setAttribute('role','status');const grid=document.createElement('div');grid.className='shop-grid';grid.setAttribute('role','tabpanel');grid.setAttribute('aria-labelledby','tab-'+shopTab);root.append(tabs);const shortcuts=document.createElement('div');shortcuts.className='shop-shortcuts';shortcuts.append(button('我的魚缸',tankMenu,'place-button'),button('永久成就',achievements,'place-button'));if(shopTab==='decor')shortcuts.append(button('編輯魚缸',startEditing,'place-button'));root.append(shortcuts,intro,grid);
 if(shopTab==='fish'){
  for(const [id,s]of Object.entries(SPECIES)){const locked=state.level<s.unlockLevel,card=document.createElement('article');card.className='shop-item'+(locked?' locked':'');const h=document.createElement('h3');h.textContent=s.name;const b=button(locked?`Lv.${s.unlockLevel} 解鎖`:`${s.price} 金幣 · 帶回家`,()=>buy(id),'buy');b.disabled=locked;b.dataset.species=id;const preview=previewFish(id,locked,shopVariants.get(id)||'normal');card.append(preview,h,paragraph(s.desc),paragraph(`${s.depthName} · ${s.growthLabel}成長`,'shop-detail'),b);appendVariantChoices(card,id,preview);grid.append(card);}
 }else{
  for(const [id,d]of Object.entries(DECORATIONS)){const card=document.createElement('article');card.className='shop-item decor-item';card.dataset.decoration=id;const p=document.createElement('canvas');p.className='fish-preview';p.width=240;p.height=140;p.setAttribute('aria-label',d.name);drawDecoration(p.getContext('2d'),id,120,117,90,80);const h=document.createElement('h3');h.textContent=d.name;const owned=state.purchasedDecorations[id]||0,used=state.placedDecorations.filter(p=>p.decoration===id).length;card.append(p,h,paragraph(d.desc),paragraph(d.kind==='substrate'?(state.substrate===id?'目前使用中':owned?'已收藏':'尚未購買'):`已收藏 ${owned} · 可放置 ${owned-used}`,'shop-detail'));
   const action=button(d.kind==='substrate'&&owned?(state.substrate===id?'使用中':'換上底砂'):`${d.price} 金幣 · ${d.kind==='substrate'?'買下':'買一件'}`,()=>buyDecoration(id),'buy');action.dataset.buyDecor=id;action.disabled=d.kind==='substrate'&&state.substrate===id;card.append(action);
   if(d.kind!=='substrate'){const place=button('放入魚缸',()=>placementDialog(id),'place-button');place.disabled=owned<=used;place.dataset.placeDecor=id;card.append(place);}grid.append(card);
  }
  if(state.placedDecorations.length){const placed=document.createElement('div');placed.className='placed-list';placed.append(paragraph('目前的布置','placed-title'));for(const item of state.placedDecorations){const row=document.createElement('div');row.className='placed-row';row.append(paragraph(`${DECORATIONS[item.decoration].name} · ${item.normX<.34?'左側':item.normX>.66?'右側':'中央'}`),button('收起',()=>{if(conflict)return;state.placedDecorations=state.placedDecorations.filter(d=>d.id!==item.id);buildBackground();markDirty(true);renderShop();},'text-button'));placed.append(row);}root.append(placed);}
 }
 root.append(paragraph(shopTab==='fish'?'好好照顧、收取金幣、遇見新魚，水族等級就會逐漸提升。':'底砂一次使用一種。編輯魚缸時，可左右拖動或用箭頭微調；物件會貼近底砂。','dialog-note'));
}
function buyDecoration(id){if(conflict)return;const d=DECORATIONS[id],owned=state.purchasedDecorations[id]||0;if(d.kind==='substrate'&&owned){state.substrate=id;buildBackground();markDirty(true);renderShop();return;}
 if(state.coins<d.price){shopMessage('金幣不足，先照顧魚兒累積一些吧。');return;}if(owned>=99){shopMessage('這件裝飾已經收藏很多了。');return;}state.coins-=d.price;state.purchasedDecorations[id]=owned+1;if(d.kind==='substrate')state.substrate=id;buildBackground();sound('buy');markDirty(true);updateUI();renderShop();shopMessage(`已收藏${d.name}！${d.kind==='substrate'?'已換上新的底砂。':'現在可以選擇放置位置。'}`);}
function placementDialog(id){
 if(conflict)return;const d=DECORATIONS[id];if((state.purchasedDecorations[id]||0)<=state.placedDecorations.filter(p=>p.decoration===id).length){toast('還沒有可放置的這件裝飾。');return;}
 if(state.placedDecorations.length>=TANK_TIERS[state.tankTier-1].decorCapacity){shopMessage('布置已滿，可以先收起一件，或升級魚缸。');return;}
 const order=[2,13,4,11,6,9,0,15,1,14,3,12,5,10,7,8];let item;
 for(const lane of [0,1]){for(const index of order){const candidate={id:uid(),decoration:id,normX:snapX(index),snapIndex:index,lane};if(canPlace(candidate)){item=candidate;break;}}if(item)break;}
 if(!item){shopMessage('這裡有點擠，換個位置看看。可以先收起一件布置。');return;}
 state.placedDecorations.push(item);metric('place');evaluateGoals();markDirty(true);startEditing(item.id);toast('已放入魚缸，左右拖動或用箭頭調整位置。');
}
function encyclopedia(){openDialog('魚類圖鑑','encyclopedia');const known=Object.keys(state.collection).length;$('dialog-content').append(paragraph(`已遇見 ${known} / ${Object.keys(SPECIES).length} 種魚。下一個驚喜，就在水族箱裡。`,'shop-intro'));const grid=document.createElement('div');grid.className='shop-grid encyclopedia-grid';for(const [id,s]of Object.entries(SPECIES)){const history=state.collection[id],unlocked=state.level>=s.unlockLevel,card=document.createElement('article');card.className='shop-item'+(!history?' undiscovered':'');card.dataset.entry=id;const h=document.createElement('h3');h.textContent=history||unlocked?s.name:'？？？';card.append(previewFish(id,!history),h);
 if(history){card.append(paragraph(s.desc),paragraph(`${s.depthName} · ${s.growthLabel}成長`,'shop-detail'),paragraph(`曾養 ${history.total} 隻 · 現有 ${state.fishes.filter(f=>f.species===id).length} 隻`,'collection-count'),paragraph(`最高養成：${['幼魚','亞成魚','成魚'][history.highestStage]}`,'collection-stage'),button(`配色收藏 ${history.variants.length} / ${1+Object.values(VARIANTS).filter(v=>v.species===id).length}`,()=>variantCollection(id),'place-button'));}else card.append(paragraph(unlocked?'已解鎖，帶回家後揭開牠的小秘密。':`水族 Lv.${s.unlockLevel} 解鎖`));grid.append(card);}$('dialog-content').append(grid);}
function renameFish(){const f=state.fishes.find(f=>f.id===selected);if(!f)return;openDialog('替魚兒取個名字','rename');const input=document.createElement('input');input.id='fish-new-name';input.type='text';input.value=f.name;input.maxLength=24;input.autocomplete='off';input.setAttribute('aria-label','新的魚兒名字');input.className='name-input';const note=paragraph('最多 12 個字，可用中文、英文與數字。','dialog-note'),error=paragraph('','name-error');error.id='name-error';error.setAttribute('role','status');
 function apply(){if(conflict)return;const value=input.value.trim();if(!value){error.textContent='請輸入名字，不能只留空白。';return;}if([...value].length>CONFIG.MAX_NAME){error.textContent='名字最多 12 個字。';return;}if(!/^[\p{L}\p{N} _·-]+$/u.test(value)){error.textContent='請使用中文、英文、數字；名字不能含 HTML 或特殊標記。';return;}f.name=value;markDirty(true);dialog.close();selectFish(f.id);toast('新名字已保存。');}
 const actions=document.createElement('div');actions.className='confirm-actions';actions.append(button('取消',()=>{dialog.close();selectFish(f.id);}),button('保存名字',apply,'confirm'));input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();apply();}});$('dialog-content').append(input,note,error,actions);input.focus();input.select();}
function rehomeFish(){const f=state.fishes.find(f=>f.id===selected);if(!f||state.fishes.length<=3||conflict)return;confirmAction('送養這位小住客？',`送養${f.name}後，牠會離開魚缸，圖鑑與最高養成紀錄仍會保留。送養不退金幣。`,()=>{state.fishes=state.fishes.filter(q=>q.id!==f.id);runtime.delete(f.id);markDirty(true);updateUI();dialog.close();toast('已送養，圖鑑紀錄仍保留。');},false);$('dialog-content').querySelector('.confirm').textContent='確認送養';}
function exportSave(){try{const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`aquarium-v03-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){toast('目前無法匯出，請稍後再試。');}}
function chooseImport(){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.id='save-import-file';input.hidden=true;$('dialog-content').append(input);input.addEventListener('change',async()=>{try{const file=input.files[0];if(!file)return;if(file.size>1024*1024)throw Error('檔案過大');const next=validate(JSON.parse(await file.text()));confirmAction('匯入這份進度？',`這份存檔有 ${next.fishes.length} 隻魚、${next.coins} 金幣。匯入會取代目前的 V0.3 進度；V0.1／V0.2 原存檔不會改動。`,()=>{if(conflict||saveBlocked){toast('目前存檔受保護，請先解決儲存問題。');return;}try{localStorage.setItem(CONFIG.SAVE_KEY+'_before_import',JSON.stringify(snapshot()));mergeRewardLedger(next);}catch(e){toast('目前無法完成匯入，原本進度仍保留。');return;}state=next;evaluateGoals(false);renderOnboarding();state.fishes.forEach(syncFish);clearTimeout(saveTimer);saveTimer=0;rebuildRuntime();buildBackground();markDirty(true);updateUI();dialog.close();toast('已匯入，原 V0.3 進度另有備份。');});}catch(e){toast('這份檔案無法讀取，原本進度仍保留。',4500);}});input.click();}

// Long-lived progression is separate from transient swimming targets.
function recordAdult(f){
 if(f.growth>=100&&!f.adultRecorded){f.adultRecorded=true;state.collection[f.species].adults=Math.min(state.collection[f.species].total,(state.collection[f.species].adults||0)+1);dirty=true;}
}
function goalValue(a){
 const values={purchases:state.stats.purchases,adults:Object.values(state.collection).reduce((n,c)=>n+c.adults,0),species:Object.keys(state.collection).length,fish:state.stats.maxFish,decor:state.stats.maxDecor,plants:['smallplant','tallplant','moss'].filter(id=>state.purchasedDecorations[id]).length,water:state.stats.goodWaterSeconds,companionship:Math.max(0,...state.fishes.map(f=>f.playSeconds)),tier:state.tankTier};return values[a.metric]||0;
}
function unlockVariant(id,notify=true){if(state.unlockedVariants.includes(id))return;state.unlockedVariants.push(id);diagnostics.variantUnlocks++;dirty=true;if(notify)toast(`配色解鎖：${SPECIES[VARIANTS[id].species].name}・${VARIANTS[id].name}`,4500);}
function evaluateGoals(notify=true){
 state.stats.maxFish=Math.max(state.stats.maxFish,state.fishes.length);state.stats.maxDecor=Math.max(state.stats.maxDecor,state.placedDecorations.length);
 for(const a of ACHIEVEMENTS){const status=state.achievements[a.id];if(!status.completed&&goalValue(a)>=a.goal){status.completed=true;diagnostics.achievementCompletions++;dirty=true;if(notify)toast(`成就完成：${a.name}！可在「永久成就」領取。`,4000);}}
 for(const [id,v]of Object.entries(VARIANTS)){if(v.rule.type==='adult'&&(state.collection[v.rule.species]?.adults||0)>=v.rule.count)unlockVariant(id,notify);}
}
const rewardKey=(saveId=state.saveId)=>CONFIG.SAVE_KEY+'_rewards_'+saveId;
function readRewardLedger(saveId=state.saveId){const text=localStorage.getItem(rewardKey(saveId));const ids=text?JSON.parse(text):[];if(!Array.isArray(ids)||ids.some(id=>!ACHIEVEMENTS.some(a=>a.id===id)))throw Error('成就領取紀錄目前無法讀取');return ids;}
function mergeRewardLedger(next=state){
 const remembered=readRewardLedger(next.saveId);for(const id of remembered){next.achievements[id]={completed:true,rewardClaimed:true};const reward=ACHIEVEMENTS.find(a=>a.id===id).reward;if(reward.variant&&!next.unlockedVariants.includes(reward.variant))next.unlockedVariants.push(reward.variant);}
 const ids=[...new Set([...remembered,...ACHIEVEMENTS.filter(a=>next.achievements[a.id].rewardClaimed).map(a=>a.id)])];if(ids.length>remembered.length)localStorage.setItem(rewardKey(next.saveId),JSON.stringify(ids));
}
function rewardLabel(a){return a.reward.coins?`${a.reward.coins} 金幣`:`${VARIANTS[a.reward.variant].name}配色`;}
function achievements(){
 evaluateGoals(false);openDialog('每一個小里程碑','achievements');$('dialog-content').append(paragraph('永久成就，慢慢完成。每份獎勵只領取一次。','shop-intro'));const list=document.createElement('div');list.className='achievement-list';
 for(const a of ACHIEVEMENTS){const status=state.achievements[a.id],card=document.createElement('article');card.className='achievement-card'+(status.completed?' completed':'');card.dataset.achievement=a.id;const body=document.createElement('div');const h=document.createElement('h3');h.textContent=(status.completed?'✧ ':'')+a.name;let progress=Math.min(a.goal,goalValue(a));const label=['water','companionship'].includes(a.metric)?`${Math.floor(progress/60)} / ${a.goal/60} 分鐘`:`${Math.floor(progress)} / ${a.goal}`;body.append(h,paragraph(a.desc),paragraph(`${status.completed?'已完成':label} · ${rewardLabel(a)}`,'achievement-detail'));const b=button(status.rewardClaimed?'已領取':status.completed?'領取獎勵':'慢慢來',()=>claimAchievement(a.id),'place-button');b.disabled=!status.completed||status.rewardClaimed;b.dataset.claim=a.id;card.append(body,b);list.append(card);}$('dialog-content').append(list);
}
function claimAchievement(id){
 if(conflict||saveBlocked)return;const a=ACHIEVEMENTS.find(a=>a.id===id),status=state.achievements[id];if(!a||!status.completed||status.rewardClaimed)return;
 let previousLedger,key,previousState;try{
  const ids=readRewardLedger();if(ids.includes(id)){mergeRewardLedger();markDirty(true);achievements();return;}
  key=rewardKey();previousLedger=localStorage.getItem(key);previousState=structuredClone(state);
  localStorage.setItem(key,JSON.stringify([...ids,id]));status.rewardClaimed=true;
  if(a.reward.coins)state.coins=clamp(state.coins+a.reward.coins,0,CONFIG.MAX_COINS);if(a.reward.variant)unlockVariant(a.reward.variant);
  if(!save())throw Error('無法保存成就');diagnostics.achievementRewards++;updateUI();achievements();toast(`已領取：${rewardLabel(a)}。`);
 }catch(e){if(previousState){state=previousState;try{if(previousLedger===null)localStorage.removeItem(key);else localStorage.setItem(key,previousLedger);}catch(rollback){saveBlocked=true;}}saveLabel();toast('目前無法保存獎勵，請稍後再領取。');}
}
function tankMenu(){
 openDialog('小住客的家','tank');const tier=TANK_TIERS[state.tankTier-1],next=TANK_TIERS[state.tankTier];const hero=document.createElement('div');hero.className='tier-hero';const h=document.createElement('h3');h.textContent=tier.name;hero.append(h,paragraph(`可養 ${state.tankCapacity} 隻魚 · 可放 ${tier.decorCapacity} 件布置`));$('dialog-content').append(hero);
 const actions=document.createElement('div');actions.className='tank-actions';actions.append(button('編輯魚缸',startEditing,'confirm'),button('永久成就',achievements,'place-button'));$('dialog-content').append(actions);
 if(next){const card=document.createElement('div');card.className='tier-next';const title=document.createElement('h3');title.textContent=`下一階段：${next.name}`;const b=button(state.level<next.level?`水族 Lv.${next.level} 可升級`:`${next.price} 金幣 · 升級`,upgradeTank,'buy');b.id='upgrade-tank';b.disabled=state.level<next.level;card.append(title,paragraph(`能照顧 ${next.capacity} 隻魚，布置增加至 ${next.decorCapacity} 件。`),paragraph(`水族 Lv.${next.level} · 需要 ${next.price} 金幣。`,'shop-detail'),b);$('dialog-content').append(card);}else $('dialog-content').append(paragraph('魚缸已經長成豐富的小世界，繼續和魚兒相伴吧。','dialog-note'));
}
function upgradeTank(){
 if(conflict||saveBlocked)return;const next=TANK_TIERS[state.tankTier];if(!next||state.level<next.level)return;if(state.coins<next.price){toast('再存一些金幣，小住客的家就能長大。');return;}
 state.coins-=next.price;state.tankTier=next.tier;state.tankCapacity=Math.max(state.tankCapacity,next.capacity);evaluateGoals();buildBackground();markDirty(true);updateUI();tankMenu();sound('level');toast(`魚缸升級了！現在能照顧 ${state.tankCapacity} 隻魚。`,4500);
}
function appendVariantChoices(card,id,preview){
 const colors=Object.entries(VARIANTS).filter(([,v])=>v.species===id);if(!colors.length)return;const select=document.createElement('select');select.className='variant-select';select.setAttribute('aria-label',SPECIES[id].name+'配色');select.dataset.variantSpecies=id;select.append(Object.assign(document.createElement('option'),{value:'normal',textContent:'普通配色'}));for(const [key,v]of colors){const unlocked=state.unlockedVariants.includes(key);select.append(Object.assign(document.createElement('option'),{value:key,textContent:unlocked?v.name:`🔒 ${v.name} · ${v.condition}`,disabled:!unlocked}));}
 select.value=shopVariants.get(id)||'normal';select.addEventListener('change',()=>{shopVariants.set(id,select.value);preview.replaceWith(preview=previewFish(id,false,select.value));});card.insertBefore(select,card.querySelector('.buy'));card.append(paragraph('配色只有外觀差異。','variant-note'));
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
function endDecorDrag(e){if(!drag||drag.pointerId!==e.pointerId)return;e.preventDefault();if(!drag.moved){drag=null;editPreview=null;updateEditorLabel();return;}const item=state.placedDecorations.find(d=>d.id===drag.id),x=editPreview?.x??item.normX,index=nearestSnap(x),next={...item,normX:snapX(index),snapIndex:index};const changed=canPlace(next);if(changed){Object.assign(item,next);metric('place');markDirty(true);}else toast('這裡有點擠，換個位置看看。');drag=null;editPreview=null;editCacheDirty=false;buildBackground();updateEditorLabel();}
function cancelDecorDrag(){if(!drag)return;drag=null;editPreview=null;editCacheDirty=false;buildBackground();updateEditorLabel();}
function nudgeDecoration(delta){if(conflict)return;const item=state.placedDecorations.find(d=>d.id===editSelection);if(!item)return;const index=clamp(item.snapIndex+delta,0,CONFIG.SNAP_SLOTS-1),next={...item,normX:snapX(index),snapIndex:index};if(!canPlace(next)){toast('這裡有點擠，換個位置看看。');return;}Object.assign(item,next);metric('place');buildBackground();markDirty(true);updateEditorLabel();}
function storeSelectedDecoration(){if(conflict)return;state.placedDecorations=state.placedDecorations.filter(d=>d.id!==editSelection);editSelection=null;drag=null;editPreview=null;buildBackground();markDirty(true);updateEditorLabel();toast('已收起，仍保留在布置收藏裡。');}
function renderOnboarding(){
 const tutorial=state.onboarding,active=!tutorial.completed;$('onboarding').hidden=!active;const copy=['先餵餵看魚兒吧。','點一隻魚兒看看牠的狀態。','之後可以在這裡遇見新魚，也能布置魚缸。'];$('onboarding-copy').textContent=active?`${tutorial.step+1} / 3 · ${copy[tutorial.step]}`:'';
 $('feed').classList.toggle('onboarding-highlight',active&&tutorial.step===0);canvas.classList.toggle('onboarding-highlight',active&&tutorial.step===1);$('shop').classList.toggle('onboarding-highlight',active&&tutorial.step===2);if(session)session.onboardingCompleted=tutorial.completed;
}
function advanceOnboarding(step){if(state.onboarding.completed||state.onboarding.step!==step)return;state.onboarding.step++;if(state.onboarding.step===3)state.onboarding.completed=true;renderOnboarding();markDirty(true);}
function skipOnboarding(){state.onboarding={completed:true,skipped:true,step:3};renderOnboarding();markDirty(true);}
const sessionStartedAt=Date.now();
function metric(kind){if(!session)return;if(Object.hasOwn(session.counts,kind))session.counts[kind]++;if(Object.hasOwn(session.first,kind)&&session.first[kind]===null)session.first[kind]=+session.elapsedSeconds.toFixed(2);}
function sessionSummary(){return {...session,sessionDurationSeconds:Math.max(0,(Date.now()-sessionStartedAt)/1000),elapsedSeconds:+session.elapsedSeconds.toFixed(2),roughFPS:session.frames&&session.frameMsTotal?+(session.frames*1000/session.frameMsTotal).toFixed(1):null};}
function persistSession(){if(!session)return;try{localStorage.setItem('aquarium_v03_playtest_latest',JSON.stringify(sessionSummary()));}catch(e){/* Anonymous metrics must never stop saving or play. */}}
function exportSession(){if(!session)return;persistSession();const blob=new Blob([JSON.stringify(sessionSummary(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='aquarium-v03-playtest-summary.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function step(dt){
 simTime+=dt;state.stats.playSeconds+=dt;if(state.waterQuality>=70)state.stats.goodWaterSeconds+=dt;if(session)session.elapsedSeconds+=dt;diagnostics.frames++;diagnostics.frameMax=Math.max(diagnostics.frameMax,dt);state.waterQuality=clamp(state.waterQuality-dt*CONFIG.WATER_PER_SECOND*(1+state.fishes.length*.18));dirty=true;
 if(cleaning){cleaning.elapsed+=dt;const progress=Math.min(1,cleaning.elapsed/CONFIG.CLEAN_SECONDS);state.waterQuality=cleaning.from+(cleaning.to-cleaning.from)*(progress*progress*(3-2*progress));if(progress===1){cleaning=null;food=[];gainXP(2);markDirty(true);toast('水族箱乾淨多了！');}}
 for(let i=food.length-1;i>=0;i--){const p=food[i];if(p.y<.91){p.y=Math.min(.91,p.y+CONFIG.FOOD_SINK_SPEED*(p.kind==='sinking'?3.2:1)*dt);p.x=clamp(p.x+Math.sin(simTime+p.phase)*.003*dt,.05,.95);}else{p.bottom+=dt;if(p.bottom>CONFIG.FOOD_BOTTOM_SECONDS){food.splice(i,1);state.waterQuality=clamp(state.waterQuality-1.2);markDirty();}}}
 const claimed=new Set();let important=false;
 for(const f of state.fishes){
  const s=SPECIES[f.species],personality=PERSONALITIES[f.personality],r=runtime.get(f.id),previousStage=stage(f.growth);f.playSeconds+=dt;f.hunger=clamp(f.hunger-CONFIG.HUNGER_PER_SECOND*dt);
  if(f.hunger>25&&state.waterQuality>25)f.growth=clamp(f.growth+dt/growthTime(s)*100);syncFish(f);state.collection[f.species].highestStage=Math.max(state.collection[f.species].highestStage,stage(f.growth));
  if(stage(f.growth)!==previousStage){recordAdult(f);evaluateGoals();effects.push({x:r.x,y:r.y,text:`長成${f.growthStage}！`,life:2.8});gainXP(8);important=true;}
  let target=null,best=Infinity;
  if(f.hunger<91){for(const p of food){if(claimed.has(p.id)||p.y<s.depth[0]-(s.bottomDweller?.13:.12)||p.y>s.depth[1]+.1)continue;
    const distance=Math.hypot((p.x-r.x)*W,(p.y-r.y)*H),score=distance*(s.foodPreference==='bottom'&&p.y>.86?.38:1);if(score<best&&distance<Math.max(W*.5,260)){target=p;best=score;}}
  }
  const atEnvironment=tickEnvironment(r,f,s,dt,poiCache,!!target);if(atEnvironment){r.environmentSeconds+=dt;diagnostics.environmentSeconds+=dt;}if(r.environmentVisitedNow){r.environmentVisits++;diagnostics.environmentVisits++;}
  r.wander-=dt;r.pause=Math.max(0,r.pause-dt);const wasBurst=r.burst>0;r.burst=Math.max(0,r.burst-dt);if(wasBurst&&r.burst===0&&s.bottomDweller&&!target)r.pause=rand(...s.pauseDuration);
  if(target){claimed.add(target.id);r.target={x:target.x,y:target.y};r.pause=0;r.behavior=s.bottomDweller?'搜尋底餌':'追食';const distance=Math.hypot((target.x-r.x)*W,(target.y-r.y)*H);
   if(distance<Math.max(16,f.size*.26)){food.splice(food.indexOf(target),1);const hungry=f.hunger<86;f.hunger=clamp(f.hunger+13);effects.push({x:r.x,y:r.y-.035,text:'+ 飽食',life:1.5});diagnostics.eaten++;if(hungry)gainXP(2);sound('eat');markDirty();target=null;r.wander=0;}
  }else if(!atEnvironment&&(r.wander<=0||Math.hypot(r.x-r.target.x,r.y-r.target.y)<.04)){
   r.target={x:s.bottomDweller?clamp(r.x+(Math.random()>.5?1:-1)*rand(.08,.22),.1,.9):rand(.12,.88),y:s.bottomDweller?rand(s.depth[0]+.03,s.depth[1]):rand(...s.depth)};r.wander=rand(3,8);r.behavior=s.bottomDweller?'巡底':'巡遊';
   if(Math.random()<s.burstChance*personality.burst){r.burst=rand(.45,1.4);r.pause=0;diagnostics.bursts++;r.behavior='短衝';}else if(Math.random()<s.pauseChance*personality.pause){r.pause=rand(...s.pauseDuration)*personality.pauseTime;diagnostics.pauses++;r.behavior=s.bottomDweller?'停下搜尋':'停頓擺尾';}
  }
  let dx=r.target.x-r.x,dy=r.target.y-r.y,dist=Math.hypot(dx,dy)||1;
  r.behaviorState=target?'feed':atEnvironment?r.behaviorState:r.pause>0?'rest':'explore';
  const eagerness=target?(f.hunger<45?s.foodBoost*1.35:f.hunger<70?s.foodBoost:1.12):1;
  let speed=s.speed*personality.speed*(editing?.45:1)*(target&&f.hunger<70?personality.food:1)*(f.hunger<25?.7:1)*(state.waterQuality<40?.75:1)*eagerness*(r.burst>0&&!target?s.burstFactor:1)*(r.pause>0?.045:1);
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
  if(f.hunger>=45&&state.waterQuality>=45){f.coinProgress=Math.min(coinInterval(s),f.coinProgress+dt);if(f.coinProgress>=coinInterval(s)&&state.drops.length<CONFIG.MAX_DROPS){state.drops.push({id:uid(),x:clamp(r.x,.06,.94),y:clamp(r.y-.07,.13,.82),value:r.coinValue});f.coinProgress=0;diagnostics.spawned++;markDirty();}}
 }
 if(state.fishes.length&&state.waterQuality>=65&&state.fishes.reduce((n,f)=>n+f.hunger,0)/state.fishes.length>=45){state.careProgress+=dt;if(state.careProgress>=CONFIG.CARE_XP_SECONDS){state.careProgress%=CONFIG.CARE_XP_SECONDS;gainXP(2);}}
 for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0)effects.splice(i,1);}if(effects.length>40)effects.splice(0,effects.length-40);if(important)markDirty(true);
 uiAccumulator+=dt;saveAccumulator+=dt;if(uiAccumulator>.25){uiAccumulator=0;evaluateGoals(false);updateUI();}if(saveAccumulator>=CONFIG.AUTO_SAVE_SECONDS){saveAccumulator=0;if(dirty)save();}
}

function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function path(c,d,color,stroke,width=1){const p=new Path2D(d);if(color){c.fillStyle=color;c.fill(p);}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke(p);}}
const fishImages={};for(const [key,s]of Object.entries(SPECIES)){if(s.art){const img=new Image();img.src=s.art;fishImages[key]=img;}}
function drawFish(c,key,x,y,size,turn,angle,phase,variant='normal'){
  const palette=VARIANTS[variant],s=palette?{...SPECIES[key],...palette}:SPECIES[key];c.save();c.translate(x,y);c.rotate(angle*.35);c.scale(size/100,size/100);c.scale(turn,1);
  if(fishImages[key]?.complete&&fishImages[key].naturalWidth){c.drawImage(fishImages[key],-50,-35,100,70);c.restore();return;}
  const wag=Math.sin(phase)*5;
  if(key==='guppy'){
    path(c,`M-16 0 Q-34 ${-19+wag} -54 ${-25+wag} Q-60 0 -53 ${25+wag} Q-33 ${18+wag} -16 0`,s.tail,palette?s.color:'#c26b51',1.2);
    c.globalAlpha=.55;for(let i=0;i<5;i++)path(c,`M-20 0 L-53 ${-20+i*10+wag}`,null,'#ffe1b0',1.2);c.globalAlpha=1;
    path(c,'M-6 -7 Q-8 -28 12 -17 L25 -3','#71bbb9');path(c,'M-8 8 L2 23 L14 8','#ecad65');
    const g=c.createLinearGradient(0,-15,0,15);g.addColorStop(0,'#e7eecb');g.addColorStop(.5,palette?s.color:'#83c8be');g.addColorStop(1,palette?s.tail:'#51a9a1');ellipse(c,5,0,30,13,g);path(c,'M-13 -1 Q8 7 29 -2',null,palette?s.accent:'#f8d36d',5);
    ellipse(c,26,-4,5,6,'#fffbea');ellipse(c,28,-4,2.8,3.6,'#344e53');ellipse(c,29,-5,1,1.4,'white');path(c,'M35 4 Q39 6 41 1',null,'#3a8887',1.2);
    path(c,`M6 1 Q-7 ${12+Math.sin(phase)*3} 4 14 L15 2`,'#f0c171aa');
  }else if(key==='goldfish'){
    path(c,`M-19 0 Q-38 ${-25+wag} -57 ${-27+wag} Q-49 -3 -38 0 Q-56 13 -52 ${31+wag} Q-24 24 -19 0`,s.tail,palette?s.color:'#e88a2f',1.4);
    path(c,`M-24 0 L-51 ${-19+wag} M-24 3 L-47 ${23+wag}`,null,'#ffd68a',2);
    path(c,'M-15 -15 Q-11 -37 9 -31 Q10 -23 25 -16','#ee9c35');
    const g=c.createLinearGradient(0,-25,0,25);g.addColorStop(0,palette?s.accent:'#ffd779');g.addColorStop(.45,s.color);g.addColorStop(1,palette?s.tail:'#ed913b');ellipse(c,3,0,33,26,g);
    ellipse(c,7,11,23,11,palette?s.accent:'#ffd16b');ellipse(c,-5,-12,12,5,'#ffdf9299');
    for(let j=0;j<3;j++)path(c,`M${-10+j*9} -9 q-6 6 0 12`,null,'#da912b44',1);
    path(c,`M0 5 Q-12 ${23+Math.sin(phase)*4} 3 29 Q19 24 15 8`,'#ee9b34cc');
    ellipse(c,24,-8,7,8,'#fffbea');ellipse(c,27,-7,3.6,4.5,'#3c5350');ellipse(c,28,-9,1.3,1.6,'white');ellipse(c,27,7,5,3,'#ec9458');path(c,'M34 4 Q39 9 41 2',null,'#b76d31',1.5);
  }else if(key==='cory'){
    path(c,`M-24 1 L-51 ${-15+wag} Q-44 0 -50 ${15+wag} Z`,'#aab7a1','#819588',1.2);
    path(c,'M-15 -7 L-3 -29 Q7 -27 13 -9','#afbcab','#83968b',1);
    const g=c.createLinearGradient(0,-17,0,17);g.addColorStop(0,'#c6cdb6');g.addColorStop(.5,'#e7debb');g.addColorStop(1,'#bdbd9e');ellipse(c,0,1,35,16,g);
    path(c,'M-26 5 Q1 1 28 6',null,'#89978b',4);
    for(const [px,py,r]of [[-18,-6,3],[-7,-8,4],[6,-7,3],[0,1,2],[-13,3,2],[16,2,3]])ellipse(c,px,py,r,r*.8,'#8c9c87');
    path(c,`M-2 8 L-12 ${24+Math.sin(phase)*3} L15 13`,'#b6bfa5');
    ellipse(c,24,-5,5.5,6,'#faf5dd');ellipse(c,26,-4,3,4,'#405757');ellipse(c,27,-6,1,1.3,'white');
    path(c,'M32 7 Q41 10 43 6 M30 10 Q34 19 41 17',null,'#697c70',1.6);
  }
  else{drawVariant(c,key,phase,s);}
  c.restore();
}
function drawVariant(c,key,phase,s=SPECIES[key]){
 const wag=Math.sin(phase)*5;
 if(s.shape==='angel'){
  path(c,'M-18 -6 Q-22 -31 -10 -52 L21 -8 M-19 9 Q-19 35 -7 52 L23 8',s.tail,'#8cae9f',1.1);
  path(c,`M-19 0 L-44 ${-13+wag} Q-36 0 -43 ${13+wag}Z`,s.tail);path(c,'M-21 0 Q-8 -35 15 -25 Q35 -18 37 0 Q26 23 4 26 Q-13 22 -21 0Z',s.color,'#91aaa0',1.2);
  c.save();c.globalAlpha=.45;for(const x of [-8,6,20])path(c,`M${x} -23 L${x+3} 23`,null,'#698f87',5);c.restore();path(c,`M4 15 Q6 43 17 ${54+wag*.3} M14 13 Q21 36 31 44`,null,'#faf9d9',1.8);
  ellipse(c,29,-5,5.3,6.1,'#fff8d5');ellipse(c,31,-4,2.8,3.8,'#364f50');ellipse(c,32,-6,1,1.3,'white');return;
 }
 if(s.shape==='betta'){
  path(c,`M-17 0 Q-40 ${-40+wag} -63 -22 Q-76 1 -58 ${35+wag} Q-30 42 -17 6Z`,s.tail,'#9b719c',1.2);
  for(let i=0;i<7;i++)path(c,`M-19 1 Q-39 ${-14+i*5} -61 ${-17+i*7+wag}`,null,'#dec4d577',1.3);
  path(c,`M-12 -11 Q0 -41 20 -26 L28 -7 M-12 9 Q-1 ${40+wag} 26 27 L28 8`,s.color,s.tail,1);
  ellipse(c,5,0,31,15,s.color);ellipse(c,9,-6,18,5,'#a8c9df66');path(c,`M8 5 Q-3 29 17 ${31+wag*.3}`,null,'#c6aed6',2);ellipse(c,29,-5,5,5.8,'#fff8e4');ellipse(c,31,-4,2.6,3.5,'#344f62');ellipse(c,32,-6,1,1.2,'white');return;
 }
 const oval=s.shape==='oval',bodyHeight=oval?22:13;
 path(c,`M-22 0 L-51 ${-17+wag} Q-42 0 -51 ${17+wag}Z`,s.tail);
 if(s.shape==='sword')path(c,`M-34 6 L-68 ${31+wag*.3} L-29 17Z`,s.tail,'#b75f47',1);
 path(c,oval?'M-13 -11 Q-15 -35 15 -24 L25 -9':'M-11 -7 L-2 -23 L18 -8',s.tail);
 ellipse(c,2,0,35,bodyHeight,s.color);ellipse(c,-3,-bodyHeight*.4,21,bodyHeight*.25,'#ffffff20');
 if(s.pattern==='stripes'){for(const y of [-7,-3,2,6])path(c,`M-25 ${y} Q0 ${y-1} 28 ${y}`,null,'#537d88',2);}
 if(s.pattern==='line')path(c,'M-27 -2 Q0 -5 29 -2',null,'#fff5b8',3.5);
 if(s.pattern==='neon'){path(c,'M-30 -5 Q0 -8 30 -5',null,'#8ff8ed',4);path(c,'M-24 5 Q0 10 25 5',null,'#e96666',6);}
 if(oval)path(c,'M-27 5 Q-4 17 27 6',null,'#95b3ad',1.8);
 path(c,`M0 6 Q-10 ${21+Math.sin(phase)*3} 12 20 L16 7`,s.tail);
 ellipse(c,29,-4,5.5,6.3,'#fff9e7');ellipse(c,31,-4,2.8,3.7,'#334e53');ellipse(c,32,-6,1.1,1.4,'white');path(c,'M35 4 Q40 7 42 2',null,oval?'#b6c6c0':'#688f85',1.2);
}
function drawDecoration(c,id,x,y,width,height){
 const d=DECORATIONS[id];if(!d)return;c.save();c.translate(x,y);c.scale(width/100,height/100);
 if(d.kind==='substrate'){path(c,'M-57 -31 L-24 -48 L59 -33 L25 -8Z',d.color,'#9caf9d',1);for(let i=0;i<14;i++)ellipse(c,-40+(i*17)%84,-30-(i%3)*3,2,1,id==='black'?'#bac6b6':'#cdbb8f');}
 else if(d.kind==='plant'){
  if(id==='moss'){ellipse(c,0,-12,43,18,'#739978');for(let i=0;i<14;i++)ellipse(c,-36+i*5.5,-13-(i%3)*6,9,8,i%2?'#93b38b':'#80a482');}
  else{for(const [offset,lean,scale]of [[-20,-13,.75],[0,8,1],[22,16,.62]]){c.save();c.translate(offset,0);c.scale(.85,scale);path(c,`M0 0 Q-9 -50 ${lean} -98`,null,d.color,3);for(let j=1;j<6;j++){const yy=-j*16,xx=lean*j/6,side=j%2?1:-1;path(c,`M${xx} ${yy} Q${xx+side*30} ${yy+8} ${xx+side*26} ${yy-20} Q${xx+side*8} ${yy-27} ${xx} ${yy-6}Z`,j%2?d.color:'#8cbea0');}c.restore();}}
 }else if(id==='smallrock'||id==='bigrock'){
  path(c,'M-49 0 L-45 -45 Q-19 -108 10 -99 L45 -42 L49 0Z',d.color);path(c,'M-45 -45 L-7 -85 L10 -99 L9 -36Z','#dbe1cd66');path(c,'M9 -36 L45 -42 L49 0 L-7 0Z','#81968e33');
 }else if(id==='wood'){
  path(c,'M-50 -3 Q-27 -43 -43 -82 L-28 -93 Q0 -42 35 -61 L48 -46 Q17 -20 2 -8 L-28 0Z',d.color,'#806e56',2);path(c,'M-28 -74 Q-14 -38 24 -43 M-30 -39 Q-3 -15 26 -28',null,'#d4b58a',2);ellipse(c,0,-15,13,5,'#6c9b7c');
 }else if(id==='cave'){
  path(c,'M-54 0 Q-53 -79 -16 -96 Q28 -112 53 0Z',d.color,'#8e9f94',1.5);path(c,'M-22 0 Q-30 -63 3 -64 Q28 -62 29 0Z','#587f77');path(c,'M-22 0 Q-20 -51 5 -54 Q16 -53 25 -28',null,'#c7d3b855',4);ellipse(c,-31,-75,12,7,'#92ae8c');
 }else if(id==='ship'){
  path(c,'M-59 -31 Q-36 12 35 0 L58 -37 L-9 -26Z',d.color,'#876c52',2);path(c,'M-31 -30 L-30 -87 M-5 -30 L-6 -74',null,'#8e785d',4);path(c,'M-30 -85 L11 -65 L-29 -59Z','#d4c9a5');path(c,'M-6 -70 L28 -54 L-5 -49Z','#b9c7ad');for(const xx of [-35,-8,18])ellipse(c,xx,-16,5,7,'#726b58');path(c,'M-47 -7 L37 -7',null,'#d2b18a',2);
 }else if(id==='chest'){
  path(c,'M-39 -7 L-37 -54 L35 -54 L40 -7Z',d.color,'#8f6c42',2);path(c,'M-39 -54 Q-41 -94 1 -96 Q39 -88 35 -54Z','#c3a369','#967d51',2);path(c,'M-23 -89 L-21 -11 M21 -87 L22 -11 M-36 -54 L35 -54',null,'#eed595',5);path(c,'M-4 -58 L9 -58 L9 -40 L-4 -40Z','#f3d786');ellipse(c,3,-48,1.4,2,'#b18a46');
 }
 c.restore();
}
function decorLayout(item){const d=DECORATIONS[item.decoration],x=editPreview?.id===item.id?editPreview.x:item.normX;return {x:x*W,y:H*(d.kind==='plant'?.936+item.lane*.009:.948+item.lane*.014),width:Math.min(115,W*(d.kind==='plant'?.1:.11)),height:H*Math.min(x>.34&&x<.66?.23:.35,d.height||.13)};}

function buildBackground(){
  bg=document.createElement('canvas');bg.width=Math.round(W*dpr);bg.height=Math.round(H*dpr);const c=bg.getContext('2d');c.scale(dpr,dpr);
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#c6efdf');g.addColorStop(.2,'#aee2dd');g.addColorStop(.68,'#70c4ca');g.addColorStop(1,'#67b8bb');c.fillStyle=g;c.fillRect(0,0,W,H);
  for(let i=0;i<4;i++){c.save();c.globalAlpha=.12;c.fillStyle='#ffffdf';c.beginPath();c.moveTo(W*(.05+i*.27),0);c.lineTo(W*(.17+i*.27),0);c.lineTo(W*(.37+i*.23),H*.86);c.lineTo(W*(.19+i*.23),H*.86);c.fill();c.restore();}
  path(c,`M0 38 Q${W*.17} 18 ${W*.32} 34 T${W*.67} 28 T${W} 34 L${W} 0 L0 0Z`,'#e4f8e980');path(c,`M0 37 Q${W*.17} 17 ${W*.32} 33 T${W*.67} 27 T${W} 33`,null,'#ffffff75',2);
  // Distant landscape and fine sand, rendered once per resize.
  path(c,`M0 ${H*.84} Q${W*.25} ${H*.72} ${W*.49} ${H*.86} Q${W*.8} ${H*.7} ${W} ${H*.79} L${W} ${H} L0 ${H}Z`,'#67b8b5');
  path(c,`M0 ${H*.9} Q${W*.19} ${H*.84} ${W*.4} ${H*.9} Q${W*.77} ${H*.84} ${W} ${H*.9} L${W} ${H} L0 ${H}Z`,DECORATIONS[state.substrate].color);
  path(c,`M0 ${H*.94} Q${W*.27} ${H*.88} ${W*.56} ${H*.94} T${W} ${H*.94} L${W} ${H} L0 ${H}Z`,DECORATIONS[state.substrate].color);
  let seed=99;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<240;i++){ellipse(c,random()*W,(.915+random()*.085)*H,random()*1.5+.4,.5+random()*.5,state.substrate==='black'?(i%2?'#4e6561':'#a5b4a3'):(i%2?'#d2c59e':'#fcf0d3'));}
  for(const item of [...state.placedDecorations].sort((a,b)=>Number(DECORATIONS[a.decoration].kind!=='plant')-Number(DECORATIONS[b.decoration].kind!=='plant'))){const pos=decorLayout(item);drawDecoration(c,item.decoration,pos.x,pos.y,pos.width,pos.height);}
  foreground=document.createElement('canvas');foreground.width=bg.width;foreground.height=bg.height;const front=foreground.getContext('2d');front.scale(dpr,dpr);
  for(const item of state.placedDecorations){const d=DECORATIONS[item.decoration];if(!d.canHide)continue;const p=decorLayout(item);front.save();drawDecoration(front,item.decoration,p.x,p.y,p.width,p.height);front.globalCompositeOperation='destination-out';if(item.decoration==='cave'){front.translate(p.x,p.y);front.scale(p.width/100,p.height/100);path(front,'M-22 0 Q-30 -63 3 -64 Q28 -62 29 0Z','#000');}else{front.clearRect(p.x-p.width*.31,p.y-p.height*.19,p.width*.65,p.height*.08);}front.restore();}
  if(state.tankTier>=2){for(let i=0;i<state.tankTier+1;i++)ellipse(c,W*(.22+i*.15),H*.96,3.5,2,'#f6ecc2');}
  poiCache=buildPOI(state.placedDecorations,DECORATIONS,decorLayout,W,H);syncEditorHandles();

}
function resize(){const r=canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);buildBackground();draw();}
function draw(){if(!state||!bg||!bg.width||!bg.height)return;ctx.clearRect(0,0,W,H);ctx.drawImage(bg,0,0,W,H);
  for(let i=0;i<13;i++){const x=(.05+(i*.073)%1)*W+Math.sin(simTime*.6+i)*8,y=H-((simTime*(9+i%4*3)+i*67)%(H+20));ctx.strokeStyle='#e9fff570';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,2+i%4,0,Math.PI*2);ctx.stroke();}
  for(const p of food){ellipse(ctx,p.x*W+1,p.y*H+2,3.7,3.5,'#458c9144');ellipse(ctx,p.x*W,p.y*H,p.kind==='sinking'?4.7:3.5,p.kind==='sinking'?2.5:3,p.kind==='sinking'?'#be9b5d':'#bc8450');ellipse(ctx,p.x*W-1,p.y*H-1,1.4,1.1,'#ffe7a0');}
  for(const f of state.fishes){const r=runtime.get(f.id);if(!r)continue;const x=r.x*W,y=r.y*H;
    ellipse(ctx,x,H*.943,f.size*.34,f.size*.045,`rgba(51,116,111,${SPECIES[f.species].bottomDweller?.14:.045})`);
    if(selected===f.id){ctx.strokeStyle='#fffce6bb';ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.ellipse(x,y,f.size*.64,f.size*.44,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    ctx.save();ctx.globalAlpha=1-r.hiddenAmount*.65;drawFish(ctx,f.species,x,y+Math.sin(r.phase*.4)*1.7,f.size,r.turn,r.heading,r.phase,f.variant);ctx.restore();
  }
  if(foreground)ctx.drawImage(foreground,0,0,W,H);
  if(editing&&editSelection){const item=state.placedDecorations.find(d=>d.id===editSelection);if(item){const p=decorLayout(item);ctx.save();ctx.strokeStyle='#fffde6';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.strokeRect(p.x-p.width*.55-5,p.y-p.height-5,p.width*1.1+10,p.height+12);ctx.restore();}}
  if(state.waterQuality<70){const dirt=(70-state.waterQuality)/70;ctx.fillStyle=`rgba(91,112,64,${dirt*.32})`;ctx.fillRect(0,0,W,H);for(let i=0;i<Math.floor(dirt*24);i++){const xx=((i*137+43)%Math.floor(W)),yy=H*(.25+(i*7%61)/100);ellipse(ctx,xx,yy,3+i%4,5+i%3,'#6c986330');}for(let i=0;i<Math.floor(dirt*15);i++)ellipse(ctx,(.12+(i*17%77)/100)*W,H*(.91+(i%4)*.015),3,1.7,'#a2825b88');if(state.waterQuality<40){for(let i=0;i<7;i++)path(ctx,`M${W*(.03+i*.015)} ${H*.94} q-5 -13 3 -20 q6 -10 2 -22`,null,'#6c9c6880',3);}}
  if(cleaning){const progress=cleaning.elapsed/CONFIG.CLEAN_SECONDS,sweepX=progress*W;ctx.fillStyle='#ecfff340';ctx.fillRect(Math.max(0,sweepX-65),0,65,H);for(let i=0;i<18;i++){ctx.strokeStyle='#f5fff7b0';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(sweepX+Math.sin(i*2)*22,H*(i/18),5+i%3*2,0,Math.PI*2);ctx.stroke();}}
  for(const coin of state.drops){const x=coin.x*W,y=coin.y*H+Math.sin(simTime*2+coin.x*5)*3;ctx.shadowColor='#fff3a7';ctx.shadowBlur=12;ellipse(ctx,x,y,14,14,'#edbd49');ctx.shadowBlur=0;ctx.lineWidth=2;ctx.strokeStyle='#fff0b3';ctx.beginPath();ctx.arc(x,y,10.5,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff6c6';ctx.font='bold 17px sans-serif';ctx.textAlign='center';ctx.fillText('＄',x,y+6);}
  for(const e of effects){ctx.save();if(e.kind==='clean'){ctx.fillStyle=`rgba(234,255,249,${e.life*.12})`;ctx.fillRect(0,0,W,H);}else if(e.kind==='ripple'){ctx.strokeStyle=`rgba(255,255,240,${e.life})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x*W,e.y*H,(1-e.life)*50+5,(1-e.life)*10+3,0,0,Math.PI*2);ctx.stroke();}else{ctx.globalAlpha=Math.min(1,e.life);ctx.textAlign='center';ctx.font='bold 14px "Microsoft JhengHei", sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#effcf5';const yy=e.y*H-20-(1.5-e.life)*16;ctx.strokeText(e.text,e.x*W,yy);ctx.fillStyle='#45836e';ctx.fillText(e.text,e.x*W,yy);}ctx.restore();}
}
function frame(t){if(!document.hidden&&!conflict){const start=performance.now();if(editCacheDirty){editCacheDirty=false;buildBackground();}if(session&&lastFrame){const ms=t-lastFrame;session.frames++;session.frameMsTotal+=ms;if(ms>50)session.longFrames++;}if(lastFrame)step(Math.min((t-lastFrame)/1000,.1));draw();const cost=performance.now()-start;diagnostics.costTotal+=cost;diagnostics.costMax=Math.max(diagnostics.costMax,cost);}lastFrame=t;requestAnimationFrame(frame);}
canvas.addEventListener('pointerdown',e=>{if(editing)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/W,y=(e.clientY-rect.top)/H;
  const coin=[...state.drops].reverse().find(c=>Math.hypot((c.x-x)*W,(c.y-y)*H)<27);if(coin){collect(coin);return;}
  if(feeding){feed(x);return;}
  const f=[...state.fishes].reverse().find(f=>{const r=runtime.get(f.id);return Math.abs(r.x-x)*W<Math.max(27,f.size*.6)&&Math.abs(r.y-y)*H<Math.max(25,f.size*.35);});if(f)selectFish(f.id);else closeCard();
});
canvas.addEventListener('keydown',e=>{if(feeding&&(e.key==='Enter'||e.key===' ')){e.preventDefault();feed(.5);}if(e.key==='Escape'){setFeeding(false);closeCard();}});
$('feed').onclick=()=>setFeeding(!feeding);$('stop-feed').onclick=()=>setFeeding(false);$('close-card').onclick=closeCard;$('shop').onclick=shop;$('clean').onclick=clean;$('settings').onclick=settings;$('roster').onclick=roster;$('encyclopedia').onclick=encyclopedia;$('rename').onclick=renameFish;$('rehome').onclick=rehomeFish;$('collect-all').onclick=()=>[...state.drops].forEach(collect);
$('dialog-close').onclick=()=>dialog.close();$('tank-menu').onclick=tankMenu;$('edit-done').onclick=finishEditing;$('edit-left').onclick=()=>nudgeDecoration(-1);$('edit-right').onclick=()=>nudgeDecoration(1);$('edit-store').onclick=storeSelectedDecoration;$('onboarding-skip').onclick=()=>skipOnboarding();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
// Visibility catches mobile backgrounding; pagehide is an extra best-effort flush.
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(dirty)save();hiddenAt=Date.now();}else{lastFrame=0;if(hiddenAt&&!conflict){offline((Date.now()-hiddenAt)/1000);save();updateUI();}hiddenAt=0;}});
window.addEventListener('pagehide',()=>{if(dirty)save();});window.addEventListener('beforeunload',()=>{if(dirty)save();});
window.addEventListener('storage',e=>{if(e.key===CONFIG.SAVE_KEY){conflict=true;clearTimeout(saveTimer);saveTimer=0;saveLabel();toast('另一個分頁已更新進度。請到設定重新讀取自動存檔，再繼續遊戲。',9000);}});
document.addEventListener('pointerdown',()=>enableAudio(),{passive:true});document.addEventListener('keydown',()=>enableAudio());
if(CONFIG.TEST_MODE)document.querySelector('.version').textContent='V0.3 測試';
if(session){window.addEventListener('error',()=>session.jsErrors++);window.addEventListener('unhandledrejection',()=>session.jsErrors++);}
initialize();new ResizeObserver(resize).observe(canvas);resize();requestAnimationFrame(frame);
// Test diagnostics are read-only snapshots and exist only when explicitly requested locally.
if(CONFIG.TEST_MODE||new URLSearchParams(location.search).get('debug')==='1')Object.defineProperty(window,'aquariumDebug',{value:()=>({state:structuredClone(state),runtime:[...runtime].map(([id,r])=>({id,...r})),food:structuredClone(food),diagnostics:{...diagnostics},config:CONFIG,species:SPECIES,decorations:DECORATIONS,saveBlocked,conflict,cleaning:cleaning?{...cleaning}:null,audioState:audioCtx?.state||null,editing,editSelection,poi:[...poiCache.byId.values()],session:session?{...session}:null,tiers:TANK_TIERS,variants:VARIANTS,personalities:PERSONALITIES,achievementDefinitions:ACHIEVEMENTS})});
})();
