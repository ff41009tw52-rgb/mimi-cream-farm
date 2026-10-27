/* V0.6 economy: one clock for online and offline production. Stable catalog IDs. */
(() => {
'use strict';
const D=window.AquariumData;
const rows={
 guppy:[240,90,1,2,3],goldfish:[350,110,1,2,4],cory:[290,100,1,2,4],zebra:[390,90,1,2,3],molly:[490,110,1,2,4],swordtail:[650,100,1,3,4],whitecloud:[590,90,1,2,3],cardinal:[900,85,1,2,4],angel:[1350,120,2,3,6],betta:[1600,120,2,3,6],platy:[450,95,1,2,3],harlequin:[750,85,1,2,3],honey:[1150,115,1,3,5],kuhli:[1200,115,1,3,5],bolivian:[1700,120,2,3,6],paradise:[1050,110,1,3,5],
 blackshrimp:[200,110,1,1,2],blueshrimp:[420,115,1,2,3],microcrab:[780,120,1,2,3],pompomcrab:[1250,120,1,2,4],
 ocellaris:[900,105,1,2,4],maroon:[1200,110,1,2,4],blueDevil:[750,90,1,2,3],chromis:[800,90,1,2,3],firefish:[1100,105,1,2,4],dottyback:[1250,110,1,2,4],banggai:[1550,115,1,3,5],pajama:[1500,115,1,3,5],watchman:[1400,115,1,3,5],sixline:[1950,115,2,3,5],blueTang:[2800,120,2,4,6],yellowTang:[2700,120,2,4,6],flame:[3500,120,2,4,7],mandarin:[3800,120,2,4,7],butterfly:[4200,120,2,4,7]
};
const prices={river:0,white:160,black:210,smallplant:80,tallplant:150,moss:120,smallrock:90,bigrock:170,wood:240,cave:310,ship:450,chest:420,crypt:90,pebbles:100,anubias:180,lava:210,urn:260,amazon:290,riccia:250,seiryu:330,arch:390,rotala:460,branchwood:560,lighthouse:900,foxtail:110,roundleaf:130,lilypad:210,mossrock:210,shrimphouse:270,rootarch:400,slatetunnel:460,mushroom:650,shellpile:120,starfish:190,seafan:300,staghorn:360,braincoral:430,anemone:490,reefcave:550,coraltower:850};
const rewards={'第一隻新魚兒':80,'長大了！':90,'小小收藏家':180,'魚類觀察家':300,'熱鬧水族箱':240,'我的風格':120,'水草小天地':140,'細心照顧':100,'長久陪伴':150,'一起長大':180,'認識新朋友':150,'採購小達人':120,'養魚真有耐心':140,'水族箱設計家':220,'魚類探索家':450,'魚類研究家':650,'開飯囉':30,'認識小居民':30,'收好第一枚':40,'飼料準備好':50,'動手布置':50,'仔細看一看':50,'蝦蝦新朋友':80,'蟹蟹新朋友':140,'發現不同構造':65,'蝦蟹收藏家':400,'小小設計師':50,'色彩魔法師':50,'七彩水族箱':120,'布置達人':300,'海底設計家':450};
for(const key of Object.keys(D.SPECIES))if(!rows[key])throw Error('Missing economy species: '+key);
for(const a of D.ACHIEVEMENTS)if(rewards[a.name]===undefined)throw Error('Missing reward: '+a.name);
window.AquariumData=Object.freeze({...D,SPECIES:Object.freeze(Object.fromEntries(Object.entries(D.SPECIES).map(([id,s])=>[id,Object.freeze({...s,price:rows[id][0],coinInterval:rows[id][1],values:Object.freeze(rows[id].slice(2))})]))),DECORATIONS:Object.freeze(Object.fromEntries(Object.entries(D.DECORATIONS).map(([id,s])=>[id,Object.freeze({...s,price:prices[id]})]))),ACHIEVEMENTS:Object.freeze(D.ACHIEVEMENTS.map(a=>Object.freeze({...a,reward:Object.freeze({...a.reward,coins:rewards[a.name]})}))),MARINE_OFFERS:Object.freeze(D.MARINE_OFFERS.map((o,i)=>Object.freeze({...o,price:[2800,7000,13000][i]}))),CONFIG:Object.freeze({...D.CONFIG,OFFLINE_HUNGER_PER_HOUR:15,OFFLINE_MAX_REWARD:D.CONFIG.MAX_COINS})});
const stage=g=>g>=100?2:g>=35?1:0;
// Segment at hunger, growth and payout boundaries. Fractional credits and elapsed
// cycle seconds persist; neither changing stages nor repeated loads rounds them up.
function advance(f,seconds,{hungerRate,coinScale=1,growthScale=1,deposit=()=>true}={}){
 const s=window.AquariumData.SPECIES[f.species],interval=s.coinInterval*coinScale,rate=100/(s.growthTime*growthScale);
 f.coinCredit??=f.coinProgress/interval*s.values[stage(f.growth)];let remaining=seconds,earned=0,productive=0;
 while(remaining>1e-8){
  const fed=f.hunger>1e-8,growing=f.hunger>25+1e-8&&f.growth<100,st=stage(f.growth);
  const boundary=growing?(st===0?35:100):100;
  let dt=Math.min(remaining,fed&&hungerRate>0?f.hunger/hungerRate:Infinity,growing?(boundary-f.growth)/rate:Infinity,growing&&hungerRate>0?(f.hunger-25)/hungerRate:Infinity,fed?Math.max(0,interval-f.coinProgress):Infinity);
  if(dt<1e-8&&fed&&f.coinProgress>=interval-1e-8){
   const value=Math.floor(f.coinCredit+1e-8);
   if(deposit(value)!==false){earned+=value;f.coinCredit=Math.max(0,f.coinCredit-value);f.coinProgress=0;continue;}
   // Storage is full: freeze this pending cycle, without discarding its payout.
   dt=remaining;
   if(growing)dt=Math.min(dt,(boundary-f.growth)/rate,hungerRate>0?(f.hunger-25)/hungerRate:Infinity);
   if(fed&&hungerRate>0)dt=Math.min(dt,f.hunger/hungerRate);
  }else if(fed){f.coinProgress=Math.min(interval,f.coinProgress+dt);f.coinCredit+=dt/interval*s.values[st];productive+=dt;}
  if(growing)f.growth=Math.min(boundary,f.growth+rate*dt);
  f.hunger=Math.max(0,f.hunger-hungerRate*dt);remaining-=dt;
 }
 if(f.hunger>1e-8&&f.coinProgress>=interval-1e-8){const value=Math.floor(f.coinCredit+1e-8);if(deposit(value)!==false){earned+=value;f.coinCredit=Math.max(0,f.coinCredit-value);f.coinProgress=0;}}
 // A cycle completed exactly as hunger reached zero still belongs to productive time.
 else if(productive>0&&f.coinProgress>=interval-1e-8){const value=Math.floor(f.coinCredit+1e-8);if(deposit(value)!==false){earned+=value;f.coinCredit=Math.max(0,f.coinCredit-value);f.coinProgress=0;}}
 return {earned,productive};
}
const capacity=t=>Math.max(540,Math.ceil(t.fishes.reduce((n,f)=>{const s=window.AquariumData.SPECIES[f.species];return n+2400*s.values[2]/s.coinInterval;},0))+70);
window.AquariumEconomy=Object.freeze({advance,capacity,rows:Object.freeze(rows),prices:Object.freeze(prices),rewards:Object.freeze(rewards)});
})();
