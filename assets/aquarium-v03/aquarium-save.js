/* Schema 1 → 2 → 3. The source object and old storage keys are never mutated. */
(() => {
'use strict';
const {CONFIG,SPECIES,DECORATIONS,PERSONALITIES,TANK_TIERS,VARIANTS,ACHIEVEMENTS}=window.AquariumData;
const coinInterval=s=>s.coinInterval*CONFIG.COIN_SCALE;
const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
const stage=g=>g>=100?2:g>=35?1:0;
const levelFor=x=>CONFIG.LEVEL_XP.reduce((l,v,i)=>x>=v?i+1:l,1);
const zones={left:'左側',center:'中央',right:'右側'};
const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
const hash=text=>[...text].reduce((h,c)=>Math.imul(h^c.codePointAt(0),16777619)>>>0,2166136261);
const personalityFor=(id,species)=>{const allowed=SPECIES[species].personalities;return allowed[hash(id)%allowed.length];};
const snapX=i=>.06+.88*i/(CONFIG.SNAP_SLOTS-1);
const nearestSnap=x=>Math.max(0,Math.min(CONFIG.SNAP_SLOTS-1,Math.round((x-.06)/.88*(CONFIG.SNAP_SLOTS-1))));
function starterExtras(fishes){
 const discovery={};for(const f of fishes){const d=discovery[f.species]||(discovery[f.species]={total:0,highestStage:0});d.total++;d.highestStage=Math.max(d.highestStage,stage(f.growth));}
 return {xp:0,level:1,careProgress:0,collection:discovery,purchasedDecorations:{river:1,smallplant:2,smallrock:1},placedDecorations:[{id:uid(),decoration:'smallplant',zone:'left',slot:'back1'},{id:uid(),decoration:'smallplant',zone:'right',slot:'back1'},{id:uid(),decoration:'smallrock',zone:'center',slot:'floor1'}],substrate:'river',soundEnabled:true,cleanReadyAt:0,mode:CONFIG.TEST_MODE?'test':'normal'};
}
function migrateV1(raw){
 if(!raw||![1,2].includes(raw.schemaVersion))throw Error('這份存檔版本目前無法讀取');
 if(raw.schemaVersion===2)return raw;
 // Validate ALL legacy state before supplementing. Never write or delete the V0.1 source key.
 const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
 if(!finite(raw.savedAt,0,Number.MAX_SAFE_INTEGER)||!Number.isInteger(raw.coins)||!finite(raw.coins,0,CONFIG.MAX_COINS)||!finite(raw.waterQuality,0,100)||!Number.isInteger(raw.tankCapacity)||raw.tankCapacity<1||raw.tankCapacity>30||!Array.isArray(raw.fishes)||raw.fishes.length>raw.tankCapacity||!Array.isArray(raw.drops)||raw.drops.length>24)throw Error('V0.1 存檔資料不完整');
 const ids=new Set();for(const f of raw.fishes){if(!f||!['guppy','goldfish','cory'].includes(f.species)||typeof f.id!=='string'||!f.id||ids.has(f.id)||typeof f.name!=='string'||!f.name.trim()||f.name.length>40||!finite(f.hunger,0,100)||!finite(f.growth,0,100)||!finite(f.coinProgress,0,24)||!finite(f.createdAt,0,Number.MAX_SAFE_INTEGER))throw Error('V0.1 魚兒資料不完整');ids.add(f.id);}
 const fishes=raw.fishes.map(f=>({...f,coinProgress:Math.min(f.coinProgress,coinInterval(SPECIES[f.species]))}));
 return {...raw,schemaVersion:2,gameVersion:'0.2',fishes,...starterExtras(fishes)};
}
function validateV2(raw){
 const s=migrateV1(raw),finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
 if(!finite(s.savedAt,0,Number.MAX_SAFE_INTEGER)||!Number.isInteger(s.coins)||!finite(s.coins,0,CONFIG.MAX_COINS)||!finite(s.waterQuality,0,100)||!Number.isInteger(s.tankCapacity)||s.tankCapacity<1||s.tankCapacity>30||!Array.isArray(s.fishes)||s.fishes.length>s.tankCapacity||!Array.isArray(s.drops)||s.drops.length>CONFIG.MAX_DROPS)throw Error('存檔資料不完整');
 const ids=new Set();const fishes=s.fishes.map(f=>{
  if(!f||!Object.hasOwn(SPECIES,f.species)||typeof f.id!=='string'||!f.id||ids.has(f.id)||typeof f.name!=='string'||!f.name.trim()||f.name.length>40||/[<>]/.test(f.name)||!finite(f.hunger,0,100)||!finite(f.growth,0,100)||!finite(f.coinProgress,0,Math.max(24,coinInterval(SPECIES[f.species])))||!finite(f.createdAt,0,Number.MAX_SAFE_INTEGER))throw Error('魚兒的存檔資料不完整');
  ids.add(f.id);return {id:f.id,species:f.species,name:f.name,hunger:f.hunger,growth:f.growth,coinProgress:Math.min(f.coinProgress,coinInterval(SPECIES[f.species])),createdAt:f.createdAt};
 });
 const dropIds=new Set();const drops=s.drops.map(c=>{if(!c||typeof c.id!=='string'||dropIds.has(c.id)||!finite(c.x,0,1)||!finite(c.y,0,1)||!Number.isInteger(c.value)||c.value<1||c.value>18)throw Error('金幣的存檔資料不完整');dropIds.add(c.id);return {id:c.id,x:c.x,y:c.y,value:c.value};});
 if(!finite(s.xp,0,1000000)||!Number.isInteger(s.xp)||s.level!==[0,45,130,300,620].reduce((l,v,i)=>s.xp>=v?i+1:l,1)||!finite(s.careProgress,0,CONFIG.CARE_XP_SECONDS)||typeof s.soundEnabled!=='boolean'||!finite(s.cleanReadyAt,0,Number.MAX_SAFE_INTEGER)||!s.collection||typeof s.collection!=='object'||Array.isArray(s.collection)||!s.purchasedDecorations||typeof s.purchasedDecorations!=='object'||Array.isArray(s.purchasedDecorations)||!Array.isArray(s.placedDecorations)||s.placedDecorations.length>12||!['river','white','black'].includes(s.substrate)||s.mode!==(CONFIG.TEST_MODE?'test':'normal'))throw Error('V0.2 養成資料不完整');
 const collection={};for(const [id,d]of Object.entries(s.collection)){if(!Object.hasOwn(SPECIES,id)||!d||!Number.isInteger(d.total)||d.total<1||d.total>9999||!Number.isInteger(d.highestStage)||d.highestStage<0||d.highestStage>2)throw Error('圖鑑資料不完整');collection[id]={total:d.total,highestStage:d.highestStage};}
 for(const f of fishes){const d=collection[f.species];if(!d||d.total<fishes.filter(q=>q.species===f.species).length||d.highestStage<stage(f.growth))throw Error('圖鑑與魚隻資料不一致');}
 const purchased={};for(const [id,n]of Object.entries(s.purchasedDecorations)){if(!Object.hasOwn(DECORATIONS,id)||!Number.isInteger(n)||n<1||n>99)throw Error('裝飾庫存不完整');purchased[id]=n;}if(!purchased[s.substrate])throw Error('底砂尚未購買');
 const occupied=new Set(),decorIds=new Set();const placed=s.placedDecorations.map(d=>{const item=DECORATIONS[d.decoration];const slots=item?.kind==='plant'?['back1','back2']:['floor1','floor2'];if(!d||!item||item.kind==='substrate'||typeof d.id!=='string'||!d.id||decorIds.has(d.id)||!Object.hasOwn(zones,d.zone)||!slots.includes(d.slot)||occupied.has(d.zone+d.slot)||!purchased[d.decoration])throw Error('裝飾位置不完整');decorIds.add(d.id);occupied.add(d.zone+d.slot);return {id:d.id,decoration:d.decoration,zone:d.zone,slot:d.slot};});
 for(const [id,n]of Object.entries(purchased)){if(placed.filter(d=>d.decoration===id).length>n)throw Error('裝飾數量不完整');}
 return {schemaVersion:2,gameVersion:CONFIG.GAME_VERSION,savedAt:s.savedAt,coins:s.coins,waterQuality:s.waterQuality,tankCapacity:s.tankCapacity,fishes,drops,xp:s.xp,level:s.level,careProgress:s.careProgress,collection,purchasedDecorations:purchased,placedDecorations:placed,substrate:s.substrate,soundEnabled:s.soundEnabled,cleanReadyAt:s.cleanReadyAt,mode:s.mode};
}

function upgradeV2(s){
 const fishes=s.fishes.map(f=>({...f,personality:personalityFor(f.id,f.species),variant:'normal',playSeconds:0,adultRecorded:f.growth>=100}));
 const collection=Object.fromEntries(Object.entries(s.collection).map(([id,c])=>[id,{...c,adults:Math.max(c.highestStage===2?1:0,fishes.filter(f=>f.species===id&&f.adultRecorded).length),variants:['normal']}]))
 const placedDecorations=s.placedDecorations.map(d=>{const index=d.slot.endsWith('2')?1:0,normX={left:[.1,.2],center:[.43,.57],right:[.8,.91]}[d.zone][index];return {id:d.id,decoration:d.decoration,normX,snapIndex:nearestSnap(normX),lane:index};});
 const tankTier=[...TANK_TIERS].reverse().find(t=>t.capacity<=s.tankCapacity)?.tier||1;
 return {...s,schemaVersion:3,gameVersion:'0.3',saveId:'tank-'+hash(fishes.filter(f=>f.createdAt===Math.min(...fishes.map(q=>q.createdAt))).map(f=>f.id).sort().join('|')).toString(16),fishes,collection,placedDecorations,tankTier,
  legacyLevelFloor:s.level,unlockedVariants:[],achievements:Object.fromEntries(ACHIEVEMENTS.map(a=>[a.id,{completed:false,rewardClaimed:false}])),
  stats:{purchases:Math.max(0,Object.values(s.collection).reduce((n,c)=>n+c.total,0)-3),maxFish:fishes.length,maxDecor:placedDecorations.length,goodWaterSeconds:0,playSeconds:0},
  onboarding:{completed:true,skipped:false,step:3}};
}
function validate(raw){
 const s=raw?.schemaVersion===3?raw:upgradeV2(validateV2(raw));
 if(s.schemaVersion!==3||!finite(s.savedAt,0,Number.MAX_SAFE_INTEGER)||!Number.isInteger(s.coins)||!finite(s.coins,0,CONFIG.MAX_COINS)||!finite(s.waterQuality,0,100)||!Number.isInteger(s.tankCapacity)||!finite(s.tankCapacity,1,30)||!Array.isArray(s.fishes)||s.fishes.length>s.tankCapacity||!Array.isArray(s.drops)||s.drops.length>CONFIG.MAX_DROPS)throw Error('存檔資料不完整');
 if(typeof s.saveId!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(s.saveId)||!Number.isInteger(s.tankTier)||!TANK_TIERS[s.tankTier-1]||!Number.isInteger(s.xp)||!finite(s.xp,0,1000000)||!Number.isInteger(s.legacyLevelFloor)||!finite(s.legacyLevelFloor,1,5)||s.level!==Math.max(s.legacyLevelFloor,levelFor(s.xp))||!finite(s.careProgress,0,CONFIG.CARE_XP_SECONDS)||typeof s.soundEnabled!=='boolean'||!finite(s.cleanReadyAt,0,Number.MAX_SAFE_INTEGER)||s.mode!==(CONFIG.TEST_MODE?'test':'normal'))throw Error('V0.3 養成資料不完整');
 const tier=TANK_TIERS[s.tankTier-1];if(s.tankTier>1&&s.tankCapacity<tier.capacity)throw Error('魚缸容量不完整');
 const ids=new Set();const fishes=s.fishes.map(f=>{
  if(!f||!Object.hasOwn(SPECIES,f.species)||typeof f.id!=='string'||!f.id||f.id.length>120||ids.has(f.id)||typeof f.name!=='string'||!f.name.trim()||f.name.length>40||/[<>]/.test(f.name)||!finite(f.hunger,0,100)||!finite(f.growth,0,100)||!finite(f.coinProgress,0,Math.max(24,coinInterval(SPECIES[f.species])))||!finite(f.createdAt,0,Number.MAX_SAFE_INTEGER)||!SPECIES[f.species].personalities.includes(f.personality)||!(f.variant==='normal'||VARIANTS[f.variant]?.species===f.species)||!finite(f.playSeconds,0,1e9)||typeof f.adultRecorded!=='boolean'||f.adultRecorded!==(f.growth>=100))throw Error('魚兒的存檔資料不完整');
  ids.add(f.id);return {id:f.id,species:f.species,name:f.name,hunger:f.hunger,growth:f.growth,coinProgress:Math.min(f.coinProgress,coinInterval(SPECIES[f.species])),createdAt:f.createdAt,personality:f.personality,variant:f.variant,playSeconds:f.playSeconds,adultRecorded:f.adultRecorded};
 });
 const dropIds=new Set();const drops=s.drops.map(c=>{if(!c||typeof c.id!=='string'||dropIds.has(c.id)||!finite(c.x,0,1)||!finite(c.y,0,1)||!Number.isInteger(c.value)||c.value<1||c.value>18)throw Error('金幣資料不完整');dropIds.add(c.id);return {id:c.id,x:c.x,y:c.y,value:c.value};});
 if(!s.collection||typeof s.collection!=='object'||Array.isArray(s.collection))throw Error('圖鑑資料不完整');
 const collection={};for(const [id,c]of Object.entries(s.collection)){if(!Object.hasOwn(SPECIES,id)||!c||!Number.isInteger(c.total)||!finite(c.total,1,9999)||!Number.isInteger(c.highestStage)||!finite(c.highestStage,0,2)||!Number.isInteger(c.adults)||!finite(c.adults,0,c.total)||!Array.isArray(c.variants)||!c.variants.includes('normal')||new Set(c.variants).size!==c.variants.length||c.variants.some(v=>v!=='normal'&&VARIANTS[v]?.species!==id))throw Error('圖鑑資料不完整');collection[id]={total:c.total,highestStage:c.highestStage,adults:c.adults,variants:[...c.variants]};}
 for(const f of fishes){const c=collection[f.species];if(!c||c.total<fishes.filter(q=>q.species===f.species).length||c.highestStage<stage(f.growth)||c.adults<fishes.filter(q=>q.species===f.species&&q.adultRecorded).length||!c.variants.includes(f.variant))throw Error('圖鑑與魚兒資料不一致');}
 if(!s.purchasedDecorations||typeof s.purchasedDecorations!=='object'||Array.isArray(s.purchasedDecorations)||!Array.isArray(s.placedDecorations)||s.placedDecorations.length>tier.decorCapacity||!['river','white','black'].includes(s.substrate))throw Error('裝飾資料不完整');
 const purchased={};for(const [id,n]of Object.entries(s.purchasedDecorations)){if(!Object.hasOwn(DECORATIONS,id)||!Number.isInteger(n)||!finite(n,1,99))throw Error('装飾庫存不完整');purchased[id]=n;}if(!purchased[s.substrate])throw Error('底砂尚未購買');
 const decorIds=new Set();const placed=s.placedDecorations.map(d=>{if(!d||!DECORATIONS[d.decoration]||DECORATIONS[d.decoration].kind==='substrate'||typeof d.id!=='string'||!d.id||decorIds.has(d.id)||!purchased[d.decoration]||!finite(d.normX,.04,.96)||!Number.isInteger(d.snapIndex)||!finite(d.snapIndex,0,CONFIG.SNAP_SLOTS-1)||Math.abs(snapX(d.snapIndex)-d.normX)>.035||![0,1].includes(d.lane))throw Error('裝飾位置不完整');decorIds.add(d.id);return {id:d.id,decoration:d.decoration,normX:d.normX,snapIndex:d.snapIndex,lane:d.lane};});
 for(const [id,n]of Object.entries(purchased)){if(placed.filter(d=>d.decoration===id).length>n)throw Error('裝飾數量不完整');}
 if(!Array.isArray(s.unlockedVariants)||new Set(s.unlockedVariants).size!==s.unlockedVariants.length||s.unlockedVariants.some(v=>!Object.hasOwn(VARIANTS,v)))throw Error('配色資料不完整');
 for(const f of fishes){if(f.variant!=='normal'&&!s.unlockedVariants.includes(f.variant))throw Error('魚兒配色尚未解鎖');}
 const achievements={};for(const a of ACHIEVEMENTS){const v=s.achievements?.[a.id];if(!v||typeof v.completed!=='boolean'||typeof v.rewardClaimed!=='boolean'||(v.rewardClaimed&&!v.completed))throw Error('成就資料不完整');achievements[a.id]={completed:v.completed,rewardClaimed:v.rewardClaimed};}
 const stats={};for(const k of ['purchases','maxFish','maxDecor','goodWaterSeconds','playSeconds']){if(!finite(s.stats?.[k],0,1e9))throw Error('養成紀錄不完整');stats[k]=s.stats[k];}
 if(!s.onboarding||typeof s.onboarding.completed!=='boolean'||typeof s.onboarding.skipped!=='boolean'||!Number.isInteger(s.onboarding.step)||!finite(s.onboarding.step,0,3)||(s.onboarding.completed&&s.onboarding.step!==3)||(!s.onboarding.completed&&s.onboarding.step===3))throw Error('新手引導資料不完整');
 return {schemaVersion:3,gameVersion:CONFIG.GAME_VERSION,savedAt:s.savedAt,saveId:s.saveId,coins:s.coins,waterQuality:s.waterQuality,tankCapacity:s.tankCapacity,tankTier:s.tankTier,legacyLevelFloor:s.legacyLevelFloor,fishes,drops,xp:s.xp,level:s.level,careProgress:s.careProgress,collection,purchasedDecorations:purchased,placedDecorations:placed,substrate:s.substrate,soundEnabled:s.soundEnabled,cleanReadyAt:s.cleanReadyAt,mode:s.mode,unlockedVariants:[...s.unlockedVariants],achievements,stats,onboarding:{...s.onboarding}};
}
window.AquariumSave=Object.freeze({validate,personalityFor,snapX,nearestSnap});
})();
