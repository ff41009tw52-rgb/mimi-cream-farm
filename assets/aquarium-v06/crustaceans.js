/* V0.6-only articulated crustacean art and benthic locomotion. */
(() => {
'use strict';
const original=window.AquariumFishArt,D=window.AquariumData,TAU=Math.PI*2;
const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
const bounds={blackshrimp:{left:-55,right:69,top:-29,bottom:31},blueshrimp:{left:-55,right:69,top:-29,bottom:31},microcrab:{left:-54,right:54,top:-48,bottom:48},pompomcrab:{left:-51,right:51,top:-47,bottom:43}};
function line(c,pts,col,w=1.3){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=col;c.lineWidth=w;c.stroke();}
function oval(c,x,y,rx,ry,fill,edge='#46675b88'){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=fill;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=.8;c.stroke();}}
function shrimp(c,key,t,part){
 const blue=key==='blueshrimp',body=blue?'#59a6c6':'#a1a38b',edge=blue?'#427b99':'#717b65',hi='#f2c651';
 // Five pairs of walking legs on the thorax; five swimmeret pairs below abdomen.
 for(let side=0;side<2;side++)for(let i=0;i<5;i++){const x=7+i*4,k=Math.sin(t*1.4+i*1.3+side*Math.PI)*3;line(c,[[x,7],[x-4+k,17+side*2],[x+5+k,24+side*3]],part==='legs'?hi:edge,part==='legs'?2.3:1);}
 for(let i=0;i<5;i++){const x=-27+i*6,k=Math.sin(t*1.6+i)*3;line(c,[[x,8],[x-3+k,18],[x+1+k,20]],part==='swimmerets'?hi:edge,part==='swimmerets'?2.4:1.1);}
 // Tail fan, segmented abdomen, then rounded head-thorax shield.
 for(let i=-1;i<=1;i++){c.save();c.translate(-42,9);c.rotate(i*.42+Math.sin(t)*.05);oval(c,-5,0,10,4,part==='tail'?hi:body);c.restore();}
 for(let i=0;i<6;i++){const x=-37+i*8,y=6-Math.sin(i/5*Math.PI)*5;oval(c,x,y,7,6+i*.5,part==='abdomen'?hi:body,edge);}
 const g=c.createLinearGradient(0,-15,0,13);g.addColorStop(0,blue?'#b4e0e7':'#d6d8bd');g.addColorStop(1,body);oval(c,17,-1,21,13,part==='cephalothorax'?hi:g,edge);
 line(c,[[25,-12],[43,-13],[35,-7]],edge,1.4);
 for(let i=0;i<8;i++)oval(c,-30+i*8,3+(i%3)*2,.8,.8,blue?'#286d9277':'#515c5088',null);
 line(c,[[31,-5],[42,-6],[58,-23+Math.sin(t*.5)*2],[67,-25]],part==='antennae'?hi:edge,part==='antennae'?2.3:1);
 line(c,[[33,-3],[49,0],[65,12+Math.sin(t*.7)*3]],part==='antennae'?hi:edge,part==='antennae'?2.3:1);
 line(c,[[27,7],[35,14],[41,11+Math.sin(t*1.7)*3]],edge,1.3);
 oval(c,33,-7,3,3,'#304d4c');oval(c,33.8,-8,.8,.8,'#fffce9',null);
 if(part==='gills'){oval(c,14,3,12,7,'#efb17ecc','#bf8568');for(let i=0;i<6;i++)line(c,[[5+i*3,-1],[7+i*3,8]],'#fff0cf',.8);}
}
function crab(c,key,t,part){
 const micro=key==='microcrab',hi='#f2c651',body=micro?'#b8bba1':'#c1a98c',edge=micro?'#798b76':'#876e5a';
 for(const side of [-1,1])for(let i=0;i<4;i++){const k=Math.sin(t+i*1.7+(side<0?Math.PI:0))*3;
 line(c,[[side*13,-7+i*7],[side*(micro?33:29),-25+i*16+k],[side*(micro?50:45),-33+i*24-k]],part==='legs'?hi:edge,part==='legs'?3:micro?1.3:2.2);
 oval(c,side*(micro?33:29),-25+i*16+k,1.6,1.6,body,null);
 }
 const g=c.createLinearGradient(0,-19,0,19);g.addColorStop(0,micro?'#e0e0c7':'#e2cbb0');g.addColorStop(1,body);oval(c,0,0,micro?17:22,micro?16:19,part==='carapace'?hi:g,edge);
 for(let i=0;i<9;i++)oval(c,(i%3-1)*9,Math.floor(i/3)*8-8,1.2,1,micro?'#788d7055':'#927a6344',null);
 for(const side of [-1,1]){const lift=Math.sin(t*.85+side)*3;line(c,[[side*13,-9],[side*26,-22+lift],[side*31,-32+lift]],part==='claws'?hi:edge,part==='claws'?3:2);
 oval(c,side*31,-32+lift,micro?4:7,micro?6:6,part==='claws'?hi:body,edge);line(c,[[side*31,-35+lift],[side*34,-41+lift],[side*29,-38+lift]],edge,1);
 if(!micro)for(let i=0;i<16;i++){const a=i/16*TAU;line(c,[[side*31+Math.cos(a)*4,-32+lift+Math.sin(a)*3],[side*31+Math.cos(a)*10,-32+lift+Math.sin(a)*9]],part==='claws'?hi:'#d8c5a4',1.2);}
 line(c,[[side*8,-13],[side*10,-21]],part==='eyes'?hi:edge,2);oval(c,side*10,-22,2.7,3,part==='eyes'?hi:'#344c49');oval(c,side*10+.6,-23,.7,.7,'#fffcec',null);
 }
 if(part==='abdomen'){oval(c,0,5,7,11,'#f2c651bb');for(let i=0;i<4;i++)line(c,[[-5,i*4],[5,i*4]],'#92764f',.8);}
 if(part==='gills')for(const side of [-1,1]){oval(c,side*12,2,6,11,'#edb28bcc');for(let i=0;i<5;i++)line(c,[[side*8,-6+i*4],[side*16,-3+i*4]],'#fff0ce',1);}
}
const shrimpParts=[['cephalothorax','頭胸部','頭和胸連在一起，外面覆著甲殼，保護裡面的器官。'],['abdomen','腹部','腹部分成一節一節，可以彎曲，協助游動。'],['antennae','觸角','用來感覺周圍的環境。'],['legs','步足','胸部有五對步足，前面的兩對具有小螯，可取食；其餘協助行走。'],['swimmerets','游泳足','腹面五對小附肢會擺動，協助游泳；不是魚鰭。'],['tail','尾部構造','尾節和尾肢組成尾扇，配合腹部彎曲協助快速移動。'],['gills','鰓及呼吸','鰓位於頭胸部甲殼內，和水進行氣體交換。亮起的區域是位置示意，外面通常看不到鰓。']];
const crabParts=[['carapace','頭胸甲','覆蓋頭胸部的硬殼，保護裡面的器官。'],['claws','螯足','最前面一對胸足末端像鉗子，可以取食；其餘四對步足協助行走。'],['legs','步足','四對步足有關節，可以行走或攀附，不是魚鰭。'],['eyes','眼睛','眼睛位在眼柄上，可以觀察周圍。'],['abdomen','腹部','腹部折在身體下方。這裡用透視色塊標出大致位置，從背面原本看不到。'],['gills','鰓及呼吸','鰓位於頭胸甲兩側的鰓室內。水流經鰓時進行氣體交換，不靠魚類那樣的鰓蓋開合。亮色只是位置示意。']];
function getFinInfo(key){if(!bounds[key])return original.getFinInfo(key);const shrimpType=D.SPECIES[key].category==='shrimp';return {note:(shrimpType?'看看觸角、步足與腹部小小的游泳足。':'看看螯足與四對步足，腹部折在身體下方。')+'這是簡化示意，體型成長用縮放表示；內部構造以透視色塊提示。',parts:(shrimpType?shrimpParts:crabParts).map(([id,name,description])=>({id,name,description}))};}
function draw(c,key,x,y,size,turn=1,angle=0,phase=0,variant='normal',options={}){if(!bounds[key])return original.draw(c,key,x,y,size,turn,angle,phase,variant,options);c.save();c.translate(x,y);c.rotate(angle*.2);c.scale(size/100*(D.SPECIES[key].category==='shrimp'&&turn<0?-1:1),size/100);c.lineJoin='round';c.lineCap='round';if(D.SPECIES[key].category==='shrimp')shrimp(c,key,phase,options.highlightPart);else crab(c,key,phase,options.highlightPart);c.restore();}
// A small independent walking/climbing model; it shares growth, economy and food rules.
function tick(r,f,s,dt,{target,fishes,runtime,decorations,layout,W,H}){
 r.crustTimer=(r.crustTimer||0)-dt;r.crustRest=Math.max(0,(r.crustRest||0)-dt);r.escape=Math.max(0,(r.escape||0)-dt);
 const shrimpType=s.category==='shrimp',anchors=decorations.map(d=>({d,kind:D.DECORATIONS[d.decoration],p:layout(d)})).filter(a=>['plant','wood','rock','shelter'].some(tag=>a.kind.tags.includes(tag)));
 if(!target&&r.crustTimer<=0){r.crustTimer=5+Math.random()*7;r.crustRest=1+Math.random()*3;const a=anchors.length?anchors[Math.floor(Math.random()*anchors.length)]:null;
  if(a&&Math.random()<.7){const climb=a.kind.kind==='plant'||a.kind.tags.includes('wood'),fraction=climb?.35+Math.random()*.4:.18;r.target={x:cap(a.p.x/W,.08,.92),y:cap((a.p.y-a.p.height*fraction)/H,.48,.90)};r.crustMode=climb?'攀爬':'躲藏';}
  else{r.target={x:cap(r.x+(Math.random()-.5)*.32,.08,.92),y:.89};r.crustMode='步行';}
  if(shrimpType&&Math.random()<.12){r.target.y=.70;r.crustMode='短游';r.crustRest=0;}
 }
 if(shrimpType&&!target&&!r.escape){const near=fishes.find(q=>!D.SPECIES[q.species].category&&Math.hypot((r.x-runtime.get(q.id).x)*W,(r.y-runtime.get(q.id).y)*H)<(q.size+f.size)*.45);if(near){r.escape=1.1;r.target={x:cap(r.x+(r.x<runtime.get(near.id).x?-.12:.12),.08,.92),y:cap(r.y-.055,.65,.90)};r.crustMode='躲避';r.crustRest=0;}}
 if(target){r.target={x:target.x,y:target.y};r.crustRest=0;r.crustMode='覓食';}
 const dx=r.target.x-r.x,dy=r.target.y-r.y,dist=Math.hypot(dx,dy)||1,rest=r.crustRest>0||dist<.013;
 const speed=(target?Math.max(.04,s.speed*1.9):s.speed*(r.escape?3:1))*(rest?0:1);let vx=dx/dist*speed,vy=dy/dist*speed*.72;
 for(const q of fishes){if(q.id===f.id)continue;const rr=runtime.get(q.id),ox=r.x-rr.x,oy=r.y-rr.y,d=Math.hypot(ox,oy);if(d>.001&&d<.04){vx+=ox/d*.008;vy+=oy/d*.005;}}
 r.vx=vx;r.vy=vy;r.x=cap(r.x+vx*dt,Math.max(.06,f.size*.55/W),1-Math.max(.06,f.size*.55/W));r.y=cap(r.y+vy*dt,.45,.915);if(Math.abs(vx)>.001)r.direction=vx>0?1:-1;r.turn+=(r.direction-r.turn)*Math.min(1,dt*4);r.heading=0;r.phase+=dt*(rest?2:7);r.position={x:r.x,y:r.y};r.behavior=target?'撿食底餌':rest?'停下覓食':r.crustMode||'步行';r.behaviorState=target?'feed':rest?'rest':r.crustMode==='躲藏'?'hide':r.crustMode==='攀爬'?'climb':'walk';r.hiddenAmount+=(Number(r.behaviorState==='hide')*.5-r.hiddenAmount)*Math.min(1,dt*2);r.coinValue=s.values[f.growth>=100?2:f.growth>=35?1:0];
 return target&&Math.hypot((target.x-r.x)*W,(target.y-r.y)*H)<Math.max(15,f.size*.3);
}
window.AquariumCrustaceans=Object.freeze({tick});
window.AquariumFishArt=Object.freeze({...original,draw,getFinInfo,hitBounds:Object.freeze({...original.hitBounds,...bounds})});
})();
