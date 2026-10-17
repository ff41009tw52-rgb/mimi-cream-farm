/* Canonical schema 5: shared progression plus an extensible array of independent tanks. */
(() => {
'use strict';
const legacy=window.AquariumV05Save,{CONFIG,FEEDS,TANK_TIERS,SPECIES}=window.AquariumData;
const GIFT_IDS=['starter','smallLesson','fishCard','level2','level4','migration'];
const clone=x=>JSON.parse(JSON.stringify(x));
const finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
const integer=(x,a,b)=>Number.isInteger(x)&&finite(x,a,b);
const tankKeys={fishes:'fishes',drops:'drops',tankTier:'tier',tankName:'name',purchasedDecorations:'purchasedDecorations',placedDecorations:'placedDecorations',substrate:'substrate'};
function attach(s){for(const [key,field]of Object.entries(tankKeys))Object.defineProperty(s,key,{configurable:true,enumerable:false,get(){return s.tanks.find(t=>t.id===s.activeTankId)[field];},set(v){s.tanks.find(t=>t.id===s.activeTankId)[field]=v;}});Object.defineProperty(s,'tankCapacity',{configurable:true,enumerable:false,get(){return TANK_TIERS[s.tankTier-1].capacity;}});return s;}
function emptyTank(id,name,tier=1){return {id,name,tier,fishes:[],drops:[],purchasedDecorations:{river:1},placedDecorations:[],substrate:'river'};}
function migrate(raw){
 const v=legacy.validate(raw),s=clone(v),tanks=[];
 const count=Math.max(1,Math.ceil(v.fishes.length/10),Math.ceil(v.tankCapacity/10));
 for(let i=0;i<count;i++){const t=emptyTank('migrated-'+(i+1),i===0?v.tankName:'搬遷魚缸 '+(i+1),4);t.fishes=v.fishes.slice(i*10,(i+1)*10);if(i===0)Object.assign(t,{drops:v.drops,purchasedDecorations:v.purchasedDecorations,placedDecorations:v.placedDecorations,substrate:v.substrate});tanks.push(t);}
 for(const k of [...Object.keys(tankKeys),'tankCapacity'])delete s[k];
 const oldSpent=[0,400,1950,6750][v.tankTier-1]||0,compensation=Math.max(0,oldSpent-780);
 return attach({...s,schemaVersion:5,gameVersion:'0.6',coins:Math.min(CONFIG.MAX_COINS,v.coins+compensation),tanks,activeTankId:tanks[0].id,feedInventory:{general:20,small:15,protein:v.fishes.some(f=>['angel','betta'].includes(f.species))?10:0},feedPurchases:{general:0,small:0,protein:0},gifts:['starter','smallLesson','fishCard','migration'],emergencyAt:0,migration:{from:raw.schemaVersion,oldTier:v.tankTier,compensation,freeTanks:count,originalCoins:v.coins},onboarding:{step:12,completed:true,skipped:false,welcomed:true,paused:false,coinHintShown:v.onboarding.coinHintShown}});
}
function validate(raw){
 if(raw?.schemaVersion!==5)return migrate(raw);
 const r=clone(raw);
 if(!Array.isArray(r.tanks)||!r.tanks.length||r.tanks.length>CONFIG.MAX_TANKS||typeof r.activeTankId!=='string')throw Error('魚缸資料不完整。');
 const tankIds=new Set(),fishIds=new Set(),decorIds=new Set(),dropIds=new Set();let shared;
 const o=r.onboarding;
 if(!o||!integer(o.step,0,12)||['completed','skipped','welcomed','paused','coinHintShown'].some(k=>typeof o[k]!=='boolean')||o.completed!==(o.step===12)||(o.skipped&&!o.completed))throw Error('新手教學資料不完整。');
 const tanks=r.tanks.map(t=>{
  if(!t||typeof t.id!=='string'||!t.id||t.id.length>120||tankIds.has(t.id)||!integer(t.tier,1,4)||!Array.isArray(t.fishes)||t.fishes.length>TANK_TIERS[t.tier-1].capacity||!Array.isArray(t.placedDecorations)||t.placedDecorations.length>TANK_TIERS[t.tier-1].decorCapacity)throw Error('魚缸容量或內容不完整。');
  tankIds.add(t.id);const name=legacy.tankName(t.name);if(name!==t.name)throw Error('魚缸名稱不完整。');
  const validated=legacy.validate({...r,schemaVersion:4,gameVersion:'0.5',tankName:name,tankTier:4,tankCapacity:18,fishes:t.fishes,drops:t.drops,purchasedDecorations:t.purchasedDecorations,placedDecorations:t.placedDecorations,substrate:t.substrate,onboarding:{step:4,completed:true,skipped:false,welcomed:true,paused:false,coinHintShown:o.coinHintShown}});
  shared=validated;
  for(const [rows,ids]of [[validated.fishes,fishIds],[validated.placedDecorations,decorIds],[validated.drops,dropIds]])for(const row of rows){if(ids.has(row.id))throw Error('不同魚缸有重複的資料。');ids.add(row.id);}
  return {id:t.id,name,tier:t.tier,fishes:validated.fishes,drops:validated.drops,purchasedDecorations:validated.purchasedDecorations,placedDecorations:validated.placedDecorations,substrate:validated.substrate};
 });
 if(!tankIds.has(r.activeTankId))throw Error('目前魚缸不存在。');
 for(const species of Object.keys(SPECIES)){const fs=tanks.flatMap(t=>t.fishes).filter(f=>f.species===species),c=shared.collection[species];if(fs.length&&(!c||c.total<fs.length||c.adults<fs.filter(f=>f.adultRecorded).length))throw Error('跨魚缸圖鑑紀錄不完整。');}
 const inventory={},purchases={};for(const id of Object.keys(FEEDS)){if(!integer(r.feedInventory?.[id],0,999999)||!integer(r.feedPurchases?.[id],0,999999))throw Error('飼料庫存或購買紀錄不完整。');inventory[id]=r.feedInventory[id];purchases[id]=r.feedPurchases[id];}
 if(!Array.isArray(r.gifts)||new Set(r.gifts).size!==r.gifts.length||r.gifts.some(id=>!GIFT_IDS.includes(id))||!finite(r.emergencyAt,0,Number.MAX_SAFE_INTEGER))throw Error('贈禮紀錄不完整。');
 let migration=null;if(r.migration!=null){const m=r.migration;if(!integer(m.from,1,4)||!integer(m.oldTier,1,4)||!integer(m.compensation,0,CONFIG.MAX_COINS)||!integer(m.freeTanks,1,CONFIG.MAX_TANKS)||!integer(m.originalCoins,0,CONFIG.MAX_COINS))throw Error('移轉紀錄不完整。');migration={...m};}
 const s={...shared};for(const k of [...Object.keys(tankKeys),'tankCapacity'])delete s[k];
 return attach({...s,schemaVersion:5,gameVersion:'0.6',tanks,activeTankId:r.activeTankId,feedInventory:inventory,feedPurchases:purchases,gifts:[...r.gifts],emergencyAt:r.emergencyAt,migration,onboarding:{...o}});
}
function freshFromLegacy(raw,name){const s=migrate(raw);s.coins=CONFIG.START_COINS;s.tanks=[{...s.tanks[0],id:'tank-1',name:legacy.tankName(name),tier:1}];s.activeTankId='tank-1';s.feedInventory={general:0,small:0,protein:0};s.gifts=[];s.migration=null;s.onboarding={step:0,completed:false,skipped:false,welcomed:false,paused:false,coinHintShown:false};return validate(s);}
window.AquariumSave=Object.freeze({...legacy,validate,attach,emptyTank,freshFromLegacy,GIFT_IDS});
})();
