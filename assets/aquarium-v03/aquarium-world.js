/* Occasional environmental decisions sit above the existing steering simulation. */
(() => {
'use strict';
const {SPECIES,PERSONALITIES}=window.AquariumData;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a);
function buildPOI(placed,decorations,layout,W,H){
 const byId=new Map(),bySpecies={};
 for(const d of placed){const item=decorations[d.decoration],p=layout(d);byId.set(d.id,{id:d.id,decoration:d.decoration,x:p.x/W,y:(p.y-p.height*item.anchor)/H,tags:item.tags||[],canHide:!!item.canHide});}
 for(const [id,s]of Object.entries(SPECIES)){bySpecies[id]=[...byId.values()].map(p=>({...p,weight:p.tags.reduce((n,t)=>n+(s.environment[t]||0),0)/(s.environment.openWater||1),y:s.bottomDweller?clamp(p.y,.825,.90):clamp(p.y,.18,.82)})).filter(p=>p.weight>0);}
 return {byId,bySpecies};
}
function finish(r,s,p){r.poi=null;r.poiRemaining=0;r.poiWait=rand(...s.poiInterval)/p.poi;r.wander=0;r.hiddenAmount=0;}
function tickEnvironment(r,f,s,dt,cache,hasFood){
 const personality=PERSONALITIES[f.personality];r.poiWait-=dt;r.environmentVisitedNow=false;
 if(hasFood){if(r.poi)finish(r,s,personality);r.poiWait=Math.max(r.poiWait,15);return false;}
 if(r.poi&&!cache.byId.has(r.poi.id))finish(r,s,personality);
 if(r.poi){
  r.poiRemaining-=dt;if(r.poiRemaining<=0){finish(r,s,personality);return false;}
  const distance=Math.hypot(r.x-r.poi.x,r.y-r.poi.y);
  if(distance<.042&&!r.poiReached){r.poiReached=true;r.poiRemaining=Math.min(r.poiRemaining,rand(2.5,4.5));r.environmentVisitedNow=true;}
  r.target={x:r.poi.x,y:r.poi.y};r.burst=0;r.pause=0;
  if(r.poiReached){
   r.behaviorState=r.poi.canHide&&s.size<120?'hide':'rest';r.behavior=r.behaviorState==='hide'?'在小角落躲一會兒':s.bottomDweller?'在布置旁搜尋':'在綠葉旁停一停';
   if(s.bottomDweller&&!r.poi.canHide){r.target.x+=Math.sin(r.poiRemaining*1.7)*.035;r.behaviorState='inspectDecoration';}
   else r.pause=.2;
  }else{r.behaviorState='inspectDecoration';r.behavior=s.bottomDweller?'巡視底層布置':'看看魚缸布置';}
  return true;
 }
 if(r.poiWait<=0){
  r.poiWait=rand(...s.poiInterval)/personality.poi;
  if(Math.random()>Math.min(.85,s.poiChance*personality.poi))return false;
  const choices=(cache.bySpecies[f.species]||[]).filter(p=>Math.hypot(r.x-p.x,r.y-p.y)<(s.bottomDweller?.38:.46));
  const weighted=choices.map(p=>({point:p,weight:p.weight*(personality.shelter&&p.tags.some(t=>['plant','shelter'].includes(t))?personality.shelter:1)/(1+Math.hypot(r.x-p.x,r.y-p.y)*5)}));
  let choice=Math.random()*weighted.reduce((n,p)=>n+p.weight,0);
  const selected=weighted.find(p=>(choice-=p.weight)<=0);
  if(selected){r.poi=selected.point;r.poiRemaining=12;r.poiReached=false;r.target={x:r.poi.x,y:r.poi.y};r.behaviorState='inspectDecoration';r.behavior=s.bottomDweller?'巡視底層布置':'看看魚缸布置';return true;}
 }
 return false;
}
window.AquariumWorld=Object.freeze({buildPOI,tickEnvironment});
})();
