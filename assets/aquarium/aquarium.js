/* 悠悠水族箱 V0.1 — standalone, no network, no shared game storage. */
(() => {
'use strict';
const CONFIG = Object.freeze({
  SAVE_KEY:'aquarium_game_save_v1', MANUAL_KEY:'aquarium_game_save_v1_manual',
  SCHEMA_VERSION:1, GAME_VERSION:'0.1', CAPACITY:10, START_COINS:120,
  MAX_COINS:999999, GROWTH_SECONDS:300, HUNGER_PER_SECOND:.055,
  WATER_PER_SECOND:.007, COIN_SECONDS:24, STAGE_VALUES:[1,3,5],
  MAX_FOOD:18, FOOD_PER_DROP:3, FEED_COOLDOWN:.65, FOOD_SINK_SPEED:.023,
  FOOD_BOTTOM_SECONDS:16, MAX_DROPS:24, AUTO_SAVE_SECONDS:15, SAVE_DEBOUNCE_MS:900,
  MAX_OFFLINE_TIME:4*60*60, OFFLINE_GROWTH_PER_HOUR:4, OFFLINE_HUNGER_PER_HOUR:4,
  OFFLINE_MAX_REWARD:100
});
// Species data and artwork are the extension points for future fish / PNG or WebP replacements.
const SPECIES = Object.freeze({
  guppy:{name:'孔雀魚',nickname:'小彩',size:68,speed:.071,depth:[.16,.59],price:30,color:'#ffc874',tail:'#f18962',desc:'輕巧的彩色尾巴，喜歡在中上層探索。',art:null},
  goldfish:{name:'金魚',nickname:'小金',size:91,speed:.045,depth:[.22,.76],price:60,color:'#ffb13e',tail:'#f48933',desc:'圓滾滾的慢遊派，悠閒逛遍整座魚缸。',art:null},
  cory:{name:'鼠魚',nickname:'小點',size:78,speed:.032,depth:[.76,.89],price:45,color:'#e4dbc0',tail:'#b5b9a2',desc:'有小鬍鬚的底層住客，愛在底砂旁散步。',art:null}
});
const $=id=>document.getElementById(id), clamp=(v,a=0,b=100)=>Math.min(b,Math.max(a,v));
const rand=(a,b)=>a+Math.random()*(b-a), uid=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const stage=g=>g>=100?2:g>=35?1:0, stageName=g=>['幼魚','亞成魚','成魚'][stage(g)];
const timeLabel=t=>new Date(t).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false});
const canvas=$('tank'), ctx=canvas.getContext('2d'), dialog=$('dialog');
let state, W=1000,H=500,dpr=1, bg, runtime=new Map(), food=[],effects=[],selected=null,feeding=false;
let dirty=false,saveTimer=0,lastSaved=0,saveBlocked=false,conflict=false,simTime=0,feedAt=-99,cleanAt=-99;
let uiAccumulator=0,saveAccumulator=0,lastFrame=0,hiddenAt=0,toastTimer,dialogMode='',resetStep=0;
const diagnostics={writes:0,eaten:0,spawned:0,frames:0,frameMax:0};
function newFish(species,index=0){const s=SPECIES[species];return {id:uid(),species,name:s.nickname+(index?` ${index+1}`:''),hunger:68,growth:0,growthStage:'幼魚',size:s.size*.7,mood:'開心',createdAt:Date.now(),coinProgress:rand(8,17)};}
function fresh(){return {schemaVersion:1,gameVersion:CONFIG.GAME_VERSION,savedAt:0,coins:CONFIG.START_COINS,waterQuality:100,tankCapacity:CONFIG.CAPACITY,fishes:Object.keys(SPECIES).map(k=>newFish(k)),drops:[]};}
function mood(f){return f.hunger<25?'肚子餓':state.waterQuality<35?'想要清澈的水':f.hunger>=90?'吃得好滿足':'開心';}
function syncFish(f){f.growthStage=stageName(f.growth);f.size=SPECIES[f.species].size*(.7+.3*f.growth/100);f.mood=mood(f);}
function migrate(raw){
  // Add explicit migrations here when schema changes. Unknown/future versions remain untouched.
  if(!raw || raw.schemaVersion!==CONFIG.SCHEMA_VERSION)throw Error('這份存檔版本目前無法讀取');
  return raw;
}
function validate(raw){
  const s=migrate(raw), finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
  if(!finite(s.savedAt,0,Number.MAX_SAFE_INTEGER)||!finite(s.coins,0,CONFIG.MAX_COINS)||!Number.isInteger(s.coins)||!finite(s.waterQuality,0,100)||!Number.isInteger(s.tankCapacity)||s.tankCapacity<1||s.tankCapacity>30||!Array.isArray(s.fishes)||s.fishes.length>s.tankCapacity||!Array.isArray(s.drops)||s.drops.length>CONFIG.MAX_DROPS)throw Error('存檔資料不完整');
  const ids=new Set();
  const fishes=s.fishes.map(f=>{
    if(!f||!Object.hasOwn(SPECIES,f.species)||typeof f.id!=='string'||!f.id||ids.has(f.id)||typeof f.name!=='string'||!f.name.trim()||f.name.length>40||!finite(f.hunger,0,100)||!finite(f.growth,0,100)||!finite(f.coinProgress,0,CONFIG.COIN_SECONDS)||!finite(f.createdAt,0,Number.MAX_SAFE_INTEGER))throw Error('魚兒的存檔資料不完整');
    ids.add(f.id);return {id:f.id,species:f.species,name:f.name,hunger:f.hunger,growth:f.growth,coinProgress:f.coinProgress,createdAt:f.createdAt};
  });
  const dropIds=new Set();const drops=s.drops.map(c=>{
    if(!c||typeof c.id!=='string'||dropIds.has(c.id)||!finite(c.x,0,1)||!finite(c.y,0,1)||!Number.isInteger(c.value)||!CONFIG.STAGE_VALUES.includes(c.value))throw Error('金幣的存檔資料不完整');
    dropIds.add(c.id);return {id:c.id,x:c.x,y:c.y,value:c.value};
  });
  return {schemaVersion:1,gameVersion:CONFIG.GAME_VERSION,savedAt:s.savedAt,coins:s.coins,waterQuality:s.waterQuality,tankCapacity:s.tankCapacity,fishes,drops};
}
function snapshot(){return {...state,schemaVersion:CONFIG.SCHEMA_VERSION,gameVersion:CONFIG.GAME_VERSION,savedAt:Date.now(),fishes:state.fishes.map(f=>({...f})),drops:state.drops.map(c=>({...c}))};}
function save(manual=false){
  clearTimeout(saveTimer);saveTimer=0;
  if(saveBlocked||conflict){saveLabel();if(manual)toast('目前無法儲存進度。原存檔已保留。');return false;}
  try{
    const payload=snapshot(),json=JSON.stringify(payload);
    localStorage.setItem(CONFIG.SAVE_KEY,json);diagnostics.writes++;
    if(manual){localStorage.setItem(CONFIG.MANUAL_KEY,json);diagnostics.writes++;}
    state.savedAt=lastSaved=payload.savedAt;dirty=false;saveLabel();
    if(manual)toast('✓ 遊戲已儲存，可隨時讀取這個時間點。');
    return true;
  }catch(error){$('save-status').textContent='⚠ 目前無法儲存進度';$('save-status').classList.add('error');if(manual)toast('儲存失敗，請確認瀏覽器有可用空間。');return false;}
}
function markDirty(important=false){dirty=true;if(important){save();return;}if(!saveTimer&&!saveBlocked&&!conflict)saveTimer=setTimeout(()=>save(),CONFIG.SAVE_DEBOUNCE_MS);}
function saveLabel(){const e=$('save-status');e.classList.toggle('error',saveBlocked||conflict);e.textContent=conflict?'⚠ 另一分頁已更新，請重新讀取':saveBlocked?'⚠ 原存檔已保留，暫停儲存':lastSaved?`✓ 已自動存檔 ${timeLabel(lastSaved)}`:'尚未儲存';}
function offline(seconds){
  const t=clamp(seconds,0,CONFIG.MAX_OFFLINE_TIME),hours=t/3600,oldWater=state.waterQuality;
  let reward=0;
  for(const f of state.fishes){
    if(f.hunger>25&&state.waterQuality>25){f.growth=clamp(f.growth+hours*CONFIG.OFFLINE_GROWTH_PER_HOUR);if(f.hunger>=45&&state.waterQuality>=45)reward+=Math.floor(hours*6*CONFIG.STAGE_VALUES[stage(f.growth)]);}
    f.hunger=clamp(f.hunger-hours*CONFIG.OFFLINE_HUNGER_PER_HOUR);syncFish(f);
  }
  state.waterQuality=clamp(state.waterQuality-hours*(.7+state.fishes.length*.15));
  reward=Math.min(reward,CONFIG.OFFLINE_MAX_REWARD,CONFIG.MAX_COINS-state.coins);state.coins+=reward;dirty=true;
  if(seconds>=60){const m=Math.floor(seconds/60),label=m>=60?`${Math.floor(m/60)} 小時 ${m%60} 分`:`${m} 分`;toast(`歡迎回來！離開了 ${label}${seconds>CONFIG.MAX_OFFLINE_TIME?'（最多計算 4 小時）':''}。水質下降 ${(oldWater-state.waterQuality).toFixed(1)}%${reward?`，獲得 ${reward} 金幣`:''}。`,6500);}
}
function initialize(){
  let stored=null;
  try{stored=localStorage.getItem(CONFIG.SAVE_KEY);state=stored?validate(JSON.parse(stored)):fresh();lastSaved=state.savedAt;
  }catch(error){state=fresh();saveBlocked=true;toast('無法讀取原存檔，已保留資料。你可以先試玩；設定中可重試讀取。',8000);}
  state.fishes.forEach(syncFish);rebuildRuntime();
  if(stored&&!saveBlocked)offline(Math.max(0,(Date.now()-state.savedAt)/1000));
  if(!saveBlocked)save();else saveLabel();updateUI();
}
function rebuildRuntime(){runtime.clear();food=[];effects=[];selected=null;$('fish-card').hidden=true;state.fishes.forEach((f,i)=>{
  const s=SPECIES[f.species],x=clamp(.2+i*.29,.12,.86),y=rand(...s.depth);
  runtime.set(f.id,{x,y,vx:(i%2?-.7:.7)*s.speed,vy:0,target:{x:rand(.15,.85),y:rand(...s.depth)},turn:i%2?-1:1,heading:0,phase:rand(0,6.28),wander:rand(2,6),pause:0,direction:i%2?-1:1,position:{x,y},preferredDepth:s.depth,speed:s.speed,coinValue:CONFIG.STAGE_VALUES[stage(f.growth)]});
});}
function toast(text,ms=3000){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,ms);}
function updateUI(){
  $('coins').textContent=state.coins.toLocaleString();$('water').textContent=Math.round(state.waterQuality);$('water-bar').style.width=`${state.waterQuality}%`;
  $('water-label').textContent=state.waterQuality>=70?'清澈':state.waterQuality>=35?'待清潔':'有點混濁';
  $('capacity').replaceChildren(document.createTextNode(`${state.fishes.length} `),Object.assign(document.createElement('small'),{textContent:`/ ${state.tankCapacity}`}));
  $('collect-all').hidden=!state.drops.length;$('collect-all').textContent=`收取金幣（${state.drops.length}）`;
  if(selected){const f=state.fishes.find(f=>f.id===selected);if(f){$('fish-name').textContent=f.name;$('fish-species').textContent=SPECIES[f.species].name;$('fish-stage').textContent=stageName(f.growth);$('fish-hunger').textContent=`${Math.round(f.hunger)}%`;$('fish-growth').textContent=`${Math.floor(f.growth)}%`;$('hunger-meter').value=f.hunger;$('growth-meter').value=f.growth;$('fish-mood').textContent=mood(f);}}
}
function selectFish(id){selected=id;$('fish-card').hidden=false;updateUI();}
function closeCard(){selected=null;$('fish-card').hidden=true;}
function setFeeding(on){feeding=on;$('feed').setAttribute('aria-pressed',String(on));$('feeding-hint').hidden=!on;canvas.style.cursor=on?'crosshair':'pointer';if(on)closeCard();}
function feed(x){
  if(conflict)return;
  if(simTime-feedAt<CONFIG.FEED_COOLDOWN)return;
  if(food.length+CONFIG.FOOD_PER_DROP>CONFIG.MAX_FOOD){toast('飼料還很多，先讓魚兒吃完吧！');return;}
  feedAt=simTime;for(let i=0;i<CONFIG.FOOD_PER_DROP;i++)food.push({id:uid(),x:clamp(x+(i-1)*.017,.06,.94),y:.08+i*.006,bottom:0,phase:rand(0,7)});
  effects.push({x,y:.08,text:'',life:1,kind:'ripple'});dirty=true;
}
function collect(c){
  if(conflict)return;
  const index=state.drops.findIndex(d=>d.id===c.id);if(index<0)return;
  state.drops.splice(index,1);state.coins=clamp(state.coins+c.value,0,CONFIG.MAX_COINS);effects.push({x:c.x,y:c.y,text:`+${c.value}`,life:1.5});
  const rect=canvas.getBoundingClientRect(),hud=$('coins').getBoundingClientRect(),el=document.createElement('i');el.className='coin-flight';el.style.left=`${rect.left+c.x*W}px`;el.style.top=`${rect.top+c.y*H}px`;document.body.append(el);
  const anim=el.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${hud.left-rect.left-c.x*W}px,${hud.top-rect.top-c.y*H}px) scale(.5)`,opacity:.3}],{duration:620,easing:'cubic-bezier(.25,.6,.35,1)'});anim.finished.then(()=>el.remove(),()=>el.remove());markDirty(true);updateUI();
}
function clean(){if(conflict)return;if(simTime-cleanAt<1)return;cleanAt=simTime;state.waterQuality=clamp(state.waterQuality+35);food=[];effects.push({kind:'clean',life:1.8});state.fishes.forEach(syncFish);markDirty(true);updateUI();toast('水族箱清爽了！剩下的飼料也清乾淨了。');}
function buy(species){
  if(conflict)return;
  const s=SPECIES[species];if(state.fishes.length>=state.tankCapacity){shopMessage('魚缸已經住滿了！');return;}if(state.coins<s.price){shopMessage('金幣不足');return;}
  state.coins-=s.price;const f=newFish(species,state.fishes.filter(f=>f.species===species).length);state.fishes.push(f);syncFish(f);
  runtime.set(f.id,{x:.5,y:rand(...s.depth),vx:s.speed*.4,vy:0,target:{x:rand(.15,.85),y:rand(...s.depth)},turn:1,heading:0,phase:rand(0,6),wander:2,pause:0,direction:1,position:{x:.5,y:.5},preferredDepth:s.depth,speed:s.speed,coinValue:1});
  markDirty(true);updateUI();shopMessage(`歡迎${f.name}！目前 ${state.fishes.length} / ${state.tankCapacity} 隻，剩下 ${state.coins} 金幣。`);
}
function shopMessage(text){const e=$('shop-message');if(e)e.textContent=text;else toast(text);}
function openDialog(title,mode){closeCard();dialogMode=mode;$('dialog-title').textContent=title;$('dialog-content').replaceChildren();if(!dialog.open)dialog.showModal();}
function button(text,handler,cls=''){const b=document.createElement('button');b.textContent=text;b.className=cls;b.addEventListener('click',handler);return b;}
function shop(){openDialog('挑一位新朋友','shop');const intro=document.createElement('p');intro.className='shop-intro';intro.id='shop-message';intro.setAttribute('role','status');intro.textContent=`帶牠回家，讓水族箱更熱鬧。你有 ${state.coins} 金幣。`;$('dialog-content').append(intro);const grid=document.createElement('div');grid.className='shop-grid';
  for(const [key,s] of Object.entries(SPECIES)){const card=document.createElement('article');card.className='shop-item';const preview=document.createElement('canvas');preview.className='fish-preview';preview.width=240;preview.height=140;preview.setAttribute('aria-label',s.name);drawFish(preview.getContext('2d'),key,120,75,100,1,0,0);const title=document.createElement('h3');title.textContent=s.name;const desc=document.createElement('p');desc.textContent=s.desc;card.append(preview,title,desc,button(`${s.price} 金幣 · 帶回家`,()=>buy(key),'buy'));grid.append(card);}
  const note=document.createElement('p');note.className='dialog-note';note.textContent='新住客都是幼魚。吃飽、住得舒服，就會長大並帶來金幣。';$('dialog-content').append(grid,note);
}
function settings(){openDialog('照顧好每一段日常','settings');const list=document.createElement('div');list.className='settings-list';
  function row(title,desc,label,fn,danger=false){const r=document.createElement('div');r.className='setting-row';const p=document.createElement('p');p.textContent=title;const small=document.createElement('small');small.textContent=desc;p.append(small);r.append(p,button(label,fn,danger?'danger':''));list.append(r);}
  row('手動存檔','額外保留現在這一刻；自動存檔仍會持續。','存檔',()=>{if(save(true)){dialog.close();}});
  row('讀取手動存檔','回到上次手動保存的時間點。','讀檔',()=>confirmAction('讀取手動存檔？','目前進度將被手動存檔取代。確定要繼續嗎？',()=>loadSaved(true)));
  row('重新讀取自動存檔','讀取最近一次自動保存的進度。','讀取',()=>confirmAction('讀取自動存檔？','目前尚未保存的變更將被取代。確定要繼續嗎？',()=>loadSaved(false)));
  row('重置遊戲','重新開始，魚兒與金幣都會回到最初。','重置',()=>{resetStep=1;confirmAction('確定要重新開始嗎？','重置後，將重新獲得三隻幼魚與 120 金幣。',()=>{resetStep=2;confirmAction('最後確認：刪除目前進度','目前的魚、水族箱與金幣進度將被刪除，且無法復原。',reset,true);},true);},true);
  const note=document.createElement('p');note.className='dialog-note';note.textContent='進度保存在這台裝置的瀏覽器。使用相同瀏覽器回來，就能繼續照顧魚兒。';$('dialog-content').append(list,note);
}
function confirmAction(title,copy,fn,danger=false){openDialog(title,'confirm');const p=document.createElement('p');p.className='confirm-copy';p.textContent=copy;const actions=document.createElement('div');actions.className='confirm-actions';actions.append(button('取消',()=>{resetStep=0;dialog.close();}),button(danger?'確認重置':'確定讀取',fn,'confirm'+(danger?' danger':'')));$('dialog-content').append(p,actions);}
function loadSaved(manual){
  try{const text=localStorage.getItem(manual?CONFIG.MANUAL_KEY:CONFIG.SAVE_KEY);if(!text){toast(manual?'還沒有手動存檔，先按一次存檔吧。':'還沒有自動存檔。');dialog.close();return;}const next=validate(JSON.parse(text));clearTimeout(saveTimer);saveTimer=0;state=next;conflict=false;if(!manual)saveBlocked=false;lastSaved=state.savedAt;state.fishes.forEach(syncFish);rebuildRuntime();if(!manual)offline(Math.max(0,(Date.now()-state.savedAt)/1000));dirty=true;save();updateUI();dialog.close();toast('✓ 已讀取存檔。');}
  catch(e){if(!manual)saveBlocked=true;saveLabel();dialog.close();toast('這份存檔目前無法讀取，原資料已保留。',5000);}
}
function reset(){if(resetStep!==2)return;try{localStorage.removeItem(CONFIG.SAVE_KEY);localStorage.removeItem(CONFIG.MANUAL_KEY);}catch(e){toast('無法刪除存檔，請檢查瀏覽器的儲存設定。');dialog.close();return;}
  clearTimeout(saveTimer);state=fresh();saveBlocked=conflict=false;resetStep=0;state.fishes.forEach(syncFish);rebuildRuntime();setFeeding(false);save();updateUI();dialog.close();toast('新的一缸，新的開始。');
}
function roster(){openDialog('我的魚兒','roster');state.fishes.forEach(f=>{const b=button('',()=>{dialog.close();selectFish(f.id);},'roster-item');const name=document.createElement('span');name.textContent=`${f.name} · ${SPECIES[f.species].name}`;const detail=document.createElement('small');detail.textContent=`${stageName(f.growth)} · 飽食 ${Math.round(f.hunger)}%`;b.append(name,detail);$('dialog-content').append(b);});}
function step(dt){
  simTime+=dt;diagnostics.frames++;diagnostics.frameMax=Math.max(diagnostics.frameMax,dt);
  state.waterQuality=clamp(state.waterQuality-dt*CONFIG.WATER_PER_SECOND*(1+state.fishes.length*.18));dirty=true;
  for(let i=food.length-1;i>=0;i--){const p=food[i];if(p.y<.9){p.y=Math.min(.9,p.y+CONFIG.FOOD_SINK_SPEED*dt);p.x=clamp(p.x+Math.sin(simTime+p.phase)*.003*dt,.05,.95);}else{p.bottom+=dt;if(p.bottom>CONFIG.FOOD_BOTTOM_SECONDS){food.splice(i,1);state.waterQuality=clamp(state.waterQuality-1.4);markDirty();}}}
  const claimed=new Set();let important=false;
  for(const f of state.fishes){
    const s=SPECIES[f.species],r=runtime.get(f.id),previousStage=stage(f.growth);
    f.hunger=clamp(f.hunger-CONFIG.HUNGER_PER_SECOND*dt);
    if(f.hunger>25&&state.waterQuality>25)f.growth=clamp(f.growth+dt/CONFIG.GROWTH_SECONDS*100);
    syncFish(f);if(stage(f.growth)!==previousStage){effects.push({x:r.x,y:r.y,text:`長成${f.growthStage}！`,life:2.8});important=true;}
    let target=null,best=Infinity;
    if(f.hunger<96){for(const p of food){if(claimed.has(p.id)||p.y<s.depth[0]-.12||p.y>s.depth[1]+.12)continue;const d=Math.hypot((p.x-r.x)*W,(p.y-r.y)*H);if(d<best&&d<Math.max(W*.5,260)){target=p;best=d;}}}
    r.wander-=dt;r.pause=Math.max(0,r.pause-dt);
    if(target){claimed.add(target.id);r.target={x:target.x,y:target.y};r.pause=0;if(best<Math.max(15,f.size*.27)){
      food.splice(food.indexOf(target),1);f.hunger=clamp(f.hunger+15);effects.push({x:r.x,y:r.y-.035,text:'+ 飽食',life:1.5});diagnostics.eaten++;markDirty();target=null;r.wander=0;
    }}else if(r.wander<=0||Math.hypot(r.x-r.target.x,r.y-r.target.y)<.035){r.target={x:rand(.12,.88),y:rand(...s.depth)};r.wander=rand(3,8);if(Math.random()<.22)r.pause=rand(.4,1.7);}
    // Soft steering: separation, edge repulsion and low-pass velocity; no position teleport on turns.
    let dx=r.target.x-r.x,dy=r.target.y-r.y,dist=Math.hypot(dx,dy)||1;
    let speed=s.speed*(f.hunger<25?.65:1)*(state.waterQuality<35?.7:1)*(target?1.4:1)*(r.pause>0?.15:1);
    let vx=dx/dist*speed,vy=dy/dist*speed*.7;
    for(const other of state.fishes){if(other.id===f.id)continue;const q=runtime.get(other.id),ox=r.x-q.x,oy=r.y-q.y,d=Math.hypot(ox,oy);if(d>.001&&d<.095){vx+=ox/d*(.095-d)*.34;vy+=oy/d*(.095-d)*.34;}}
    const marginX=Math.max(.065,(f.size*.6+8)/W),minY=Math.max(.11,s.depth[0]-.09),maxY=Math.min(.9,s.depth[1]+.06);
    if(r.x<marginX+.07)vx+=Math.max(0,marginX+.07-r.x)*.8;
    if(r.x>1-marginX-.07)vx-=Math.max(0,r.x-(1-marginX-.07))*.8;
    if(r.y<minY+.025)vy+=(minY+.025-r.y)*.5;if(r.y>maxY-.025)vy-=(r.y-maxY+.025)*.5;
    const smooth=1-Math.exp(-dt*1.8);r.vx+=(vx-r.vx)*smooth;r.vy+=(vy-r.vy)*smooth;
    r.x=clamp(r.x+r.vx*dt,marginX,1-marginX);r.y=clamp(r.y+r.vy*dt,minY,maxY);
    if(Math.abs(r.vx)>.003)r.direction=r.vx>0?1:-1;
    r.turn+=(r.direction-r.turn)*(1-Math.exp(-dt*4));r.heading+=(clamp(r.vy/(Math.abs(r.vx)+.02),-.35,.35)-r.heading)*(1-Math.exp(-dt*2));r.phase+=dt*(r.pause>0?3:7);
    r.position={x:r.x,y:r.y};r.coinValue=CONFIG.STAGE_VALUES[stage(f.growth)];
    if(f.hunger>=45&&state.waterQuality>=45){f.coinProgress=Math.min(CONFIG.COIN_SECONDS,f.coinProgress+dt);if(f.coinProgress>=CONFIG.COIN_SECONDS&&state.drops.length<CONFIG.MAX_DROPS){state.drops.push({id:uid(),x:clamp(r.x,.055,.945),y:clamp(r.y-.07,.13,.82),value:r.coinValue});f.coinProgress=0;diagnostics.spawned++;markDirty();}}
  }
  for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0)effects.splice(i,1);}
  if(effects.length>40)effects.splice(0,effects.length-40);
  if(important)markDirty(true);
  uiAccumulator+=dt;saveAccumulator+=dt;
  if(uiAccumulator>.25){uiAccumulator=0;updateUI();}
  if(saveAccumulator>=CONFIG.AUTO_SAVE_SECONDS){saveAccumulator=0;if(dirty)save();}
}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function path(c,d,color,stroke,width=1){const p=new Path2D(d);if(color){c.fillStyle=color;c.fill(p);}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke(p);}}
const fishImages={};for(const [key,s]of Object.entries(SPECIES)){if(s.art){const img=new Image();img.src=s.art;fishImages[key]=img;}}
function drawFish(c,key,x,y,size,turn,angle,phase){
  const s=SPECIES[key];c.save();c.translate(x,y);c.rotate(angle*.35);c.scale(size/100,size/100);c.scale(turn,1);
  if(fishImages[key]?.complete&&fishImages[key].naturalWidth){c.drawImage(fishImages[key],-50,-35,100,70);c.restore();return;}
  const wag=Math.sin(phase)*5;
  if(key==='guppy'){
    path(c,`M-16 0 Q-34 ${-19+wag} -54 ${-25+wag} Q-60 0 -53 ${25+wag} Q-33 ${18+wag} -16 0`,'#ef8769','#c26b51',1.2);
    c.globalAlpha=.55;for(let i=0;i<5;i++)path(c,`M-20 0 L-53 ${-20+i*10+wag}`,null,'#ffe1b0',1.2);c.globalAlpha=1;
    path(c,'M-6 -7 Q-8 -28 12 -17 L25 -3','#71bbb9');path(c,'M-8 8 L2 23 L14 8','#ecad65');
    const g=c.createLinearGradient(0,-15,0,15);g.addColorStop(0,'#e7eecb');g.addColorStop(.5,'#83c8be');g.addColorStop(1,'#51a9a1');ellipse(c,5,0,30,13,g);path(c,'M-13 -1 Q8 7 29 -2',null,'#f8d36d',5);
    ellipse(c,26,-4,5,6,'#fffbea');ellipse(c,28,-4,2.8,3.6,'#344e53');ellipse(c,29,-5,1,1.4,'white');path(c,'M35 4 Q39 6 41 1',null,'#3a8887',1.2);
    path(c,`M6 1 Q-7 ${12+Math.sin(phase)*3} 4 14 L15 2`,'#f0c171aa');
  }else if(key==='goldfish'){
    path(c,`M-19 0 Q-38 ${-25+wag} -57 ${-27+wag} Q-49 -3 -38 0 Q-56 13 -52 ${31+wag} Q-24 24 -19 0`,'#f89636','#e88a2f',1.4);
    path(c,`M-24 0 L-51 ${-19+wag} M-24 3 L-47 ${23+wag}`,null,'#ffd68a',2);
    path(c,'M-15 -15 Q-11 -37 9 -31 Q10 -23 25 -16','#ee9c35');
    const g=c.createLinearGradient(0,-25,0,25);g.addColorStop(0,'#ffd779');g.addColorStop(.45,'#ffb844');g.addColorStop(1,'#ed913b');ellipse(c,3,0,33,26,g);
    ellipse(c,7,11,23,11,'#ffd16b');ellipse(c,-5,-12,12,5,'#ffdf9299');
    for(let j=0;j<3;j++)path(c,`M${-10+j*9} -9 q-6 6 0 12`,null,'#da912b44',1);
    path(c,`M0 5 Q-12 ${23+Math.sin(phase)*4} 3 29 Q19 24 15 8`,'#ee9b34cc');
    ellipse(c,24,-8,7,8,'#fffbea');ellipse(c,27,-7,3.6,4.5,'#3c5350');ellipse(c,28,-9,1.3,1.6,'white');ellipse(c,27,7,5,3,'#ec9458');path(c,'M34 4 Q39 9 41 2',null,'#b76d31',1.5);
  }else{
    path(c,`M-24 1 L-51 ${-15+wag} Q-44 0 -50 ${15+wag} Z`,'#aab7a1','#819588',1.2);
    path(c,'M-15 -7 L-3 -29 Q7 -27 13 -9','#afbcab','#83968b',1);
    const g=c.createLinearGradient(0,-17,0,17);g.addColorStop(0,'#c6cdb6');g.addColorStop(.5,'#e7debb');g.addColorStop(1,'#bdbd9e');ellipse(c,0,1,35,16,g);
    path(c,'M-26 5 Q1 1 28 6',null,'#89978b',4);
    for(const [px,py,r]of [[-18,-6,3],[-7,-8,4],[6,-7,3],[0,1,2],[-13,3,2],[16,2,3]])ellipse(c,px,py,r,r*.8,'#8c9c87');
    path(c,`M-2 8 L-12 ${24+Math.sin(phase)*3} L15 13`,'#b6bfa5');
    ellipse(c,24,-5,5.5,6,'#faf5dd');ellipse(c,26,-4,3,4,'#405757');ellipse(c,27,-6,1,1.3,'white');
    path(c,'M32 7 Q41 10 43 6 M30 10 Q34 19 41 17',null,'#697c70',1.6);
  }
  c.restore();
}
function buildBackground(){
  bg=document.createElement('canvas');bg.width=Math.round(W*dpr);bg.height=Math.round(H*dpr);const c=bg.getContext('2d');c.scale(dpr,dpr);
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#c6efdf');g.addColorStop(.2,'#aee2dd');g.addColorStop(.68,'#70c4ca');g.addColorStop(1,'#67b8bb');c.fillStyle=g;c.fillRect(0,0,W,H);
  for(let i=0;i<4;i++){c.save();c.globalAlpha=.12;c.fillStyle='#ffffdf';c.beginPath();c.moveTo(W*(.05+i*.27),0);c.lineTo(W*(.17+i*.27),0);c.lineTo(W*(.37+i*.23),H*.86);c.lineTo(W*(.19+i*.23),H*.86);c.fill();c.restore();}
  path(c,`M0 38 Q${W*.17} 18 ${W*.32} 34 T${W*.67} 28 T${W} 34 L${W} 0 L0 0Z`,'#e4f8e980');path(c,`M0 37 Q${W*.17} 17 ${W*.32} 33 T${W*.67} 27 T${W} 33`,null,'#ffffff75',2);
  // Distant landscape and fine sand, rendered once per resize.
  path(c,`M0 ${H*.84} Q${W*.25} ${H*.72} ${W*.49} ${H*.86} Q${W*.8} ${H*.7} ${W} ${H*.79} L${W} ${H} L0 ${H}Z`,'#67b8b5');
  path(c,`M0 ${H*.9} Q${W*.19} ${H*.84} ${W*.4} ${H*.9} Q${W*.77} ${H*.84} ${W} ${H*.9} L${W} ${H} L0 ${H}Z`,'#e0d5ae');
  path(c,`M0 ${H*.94} Q${W*.27} ${H*.88} ${W*.56} ${H*.94} T${W} ${H*.94} L${W} ${H} L0 ${H}Z`,'#ece0bc');
  let seed=99;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<240;i++){ellipse(c,random()*W,(.915+random()*.085)*H,random()*1.5+.4,.5+random()*.5,i%2?'#d2c59e':'#fcf0d3');}
  function plant(x,y,height,color,lean=0){c.save();c.translate(x,y);c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-10+lean,-height*.5,lean,-height);c.stroke();for(let j=1;j<6;j++){const yy=-height*j/6,xx=lean*j/6,side=j%2?1:-1;path(c,`M${xx} ${yy} Q${xx+side*33} ${yy+8} ${xx+side*30} ${yy-25} Q${xx+side*8} ${yy-31} ${xx} ${yy-8}Z`,color);}c.restore();}
  plant(W*.085,H*.93,H*.43,'#59a78f',12);plant(W*.14,H*.93,H*.33,'#78b69a',-8);plant(W*.055,H*.94,H*.25,'#86bda0',-5);
  plant(W*.91,H*.92,H*.39,'#64a88f',-12);plant(W*.96,H*.94,H*.29,'#83b696',4);
  plant(W*.8,H*.94,H*.14,'#8ab290',8);
  function rock(x,y,w,h,color){path(c,`M${x-w*.5} ${y} L${x-w*.45} ${y-h*.55} Q${x-w*.1} ${y-h*1.1} ${x+w*.15} ${y-h} L${x+w*.47} ${y-h*.42} L${x+w*.5} ${y}Z`,color);path(c,`M${x-w*.45} ${y-h*.55} L${x-w*.07} ${y-h*.9} L${x+w*.15} ${y-h} L${x+w*.08} ${y-h*.36}Z`,'#ffffff24');}
  rock(W*.19,H*.94,W*.1,H*.12,'#9daea0');rock(W*.24,H*.95,W*.07,H*.075,'#bdc2ab');rock(W*.855,H*.945,W*.12,H*.16,'#99aea1');rock(W*.81,H*.96,W*.07,H*.07,'#b3bca7');
  ellipse(c,W*.48,H*.965,17,5,'#c1baa0');ellipse(c,W*.51,H*.96,9,4,'#d0c6a6');
}
function resize(){const r=canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);buildBackground();draw();}
function draw(){if(!state||!bg||!bg.width||!bg.height)return;ctx.clearRect(0,0,W,H);ctx.drawImage(bg,0,0,W,H);
  for(let i=0;i<13;i++){const x=(.05+(i*.073)%1)*W+Math.sin(simTime*.6+i)*8,y=H-((simTime*(9+i%4*3)+i*67)%(H+20));ctx.strokeStyle='#e9fff570';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,2+i%4,0,Math.PI*2);ctx.stroke();}
  for(const p of food){ellipse(ctx,p.x*W+1,p.y*H+2,3.7,3.5,'#458c9144');ellipse(ctx,p.x*W,p.y*H,3.5,3,'#bc8450');ellipse(ctx,p.x*W-1,p.y*H-1,1.4,1.1,'#ffe7a0');}
  for(const f of state.fishes){const r=runtime.get(f.id);if(!r)continue;const x=r.x*W,y=r.y*H;
    ellipse(ctx,x,H*.943,f.size*.34,f.size*.045,`rgba(51,116,111,${f.species==='cory'?.14:.045})`);
    if(selected===f.id){ctx.strokeStyle='#fffce6bb';ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.ellipse(x,y,f.size*.64,f.size*.44,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    drawFish(ctx,f.species,x,y+Math.sin(r.phase*.4)*1.7,f.size,r.turn,r.heading,r.phase);
  }
  if(state.waterQuality<70){ctx.fillStyle=`rgba(91,112,64,${(70-state.waterQuality)/100*.48})`;ctx.fillRect(0,0,W,H);}
  for(const coin of state.drops){const x=coin.x*W,y=coin.y*H+Math.sin(simTime*2+coin.x*5)*3;ctx.shadowColor='#fff3a7';ctx.shadowBlur=12;ellipse(ctx,x,y,14,14,'#edbd49');ctx.shadowBlur=0;ctx.lineWidth=2;ctx.strokeStyle='#fff0b3';ctx.beginPath();ctx.arc(x,y,10.5,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff6c6';ctx.font='bold 17px sans-serif';ctx.textAlign='center';ctx.fillText('＄',x,y+6);}
  for(const e of effects){ctx.save();if(e.kind==='clean'){ctx.fillStyle=`rgba(234,255,249,${e.life*.12})`;ctx.fillRect(0,0,W,H);}else if(e.kind==='ripple'){ctx.strokeStyle=`rgba(255,255,240,${e.life})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x*W,e.y*H,(1-e.life)*50+5,(1-e.life)*10+3,0,0,Math.PI*2);ctx.stroke();}else{ctx.globalAlpha=Math.min(1,e.life);ctx.textAlign='center';ctx.font='bold 14px "Microsoft JhengHei", sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#effcf5';const yy=e.y*H-20-(1.5-e.life)*16;ctx.strokeText(e.text,e.x*W,yy);ctx.fillStyle='#45836e';ctx.fillText(e.text,e.x*W,yy);}ctx.restore();}
}
function frame(t){if(!document.hidden&&!conflict){if(lastFrame)step(Math.min((t-lastFrame)/1000,.1));draw();}lastFrame=t;requestAnimationFrame(frame);}
canvas.addEventListener('pointerdown',e=>{const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/W,y=(e.clientY-rect.top)/H;
  const coin=[...state.drops].reverse().find(c=>Math.hypot((c.x-x)*W,(c.y-y)*H)<27);if(coin){collect(coin);return;}
  if(feeding){feed(x);return;}
  const f=[...state.fishes].reverse().find(f=>{const r=runtime.get(f.id);return Math.abs(r.x-x)*W<Math.max(27,f.size*.6)&&Math.abs(r.y-y)*H<Math.max(25,f.size*.35);});if(f)selectFish(f.id);else closeCard();
});
canvas.addEventListener('keydown',e=>{if(feeding&&(e.key==='Enter'||e.key===' ')){e.preventDefault();feed(.5);}if(e.key==='Escape'){setFeeding(false);closeCard();}});
$('feed').onclick=()=>setFeeding(!feeding);$('stop-feed').onclick=()=>setFeeding(false);$('close-card').onclick=closeCard;$('shop').onclick=shop;$('clean').onclick=clean;$('settings').onclick=settings;$('roster').onclick=roster;$('collect-all').onclick=()=>[...state.drops].forEach(collect);
$('dialog-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
// Visibility catches mobile backgrounding; pagehide is an extra best-effort flush.
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(dirty)save();hiddenAt=Date.now();}else{lastFrame=0;if(hiddenAt&&!conflict){offline((Date.now()-hiddenAt)/1000);save();updateUI();}hiddenAt=0;}});
window.addEventListener('pagehide',()=>{if(dirty)save();});window.addEventListener('beforeunload',()=>{if(dirty)save();});
window.addEventListener('storage',e=>{if(e.key===CONFIG.SAVE_KEY){conflict=true;clearTimeout(saveTimer);saveTimer=0;saveLabel();toast('另一個分頁已更新進度。請到設定重新讀取自動存檔，再繼續遊戲。',9000);}});
initialize();new ResizeObserver(resize).observe(canvas);resize();requestAnimationFrame(frame);
// Test diagnostics are read-only snapshots and exist only when explicitly requested locally.
if(new URLSearchParams(location.search).get('test')==='1')Object.defineProperty(window,'aquariumDebug',{value:()=>({state:structuredClone(state),runtime:[...runtime].map(([id,r])=>({id,...r})),food:structuredClone(food),diagnostics:{...diagnostics},config:CONFIG,saveBlocked,conflict})});
})();
