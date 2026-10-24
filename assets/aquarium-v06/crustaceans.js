/* V0.6 original vector illustrations: one articulated master per species.
 * Coordinates are in 100-unit space. No image requests, random paint or save fields.
 * This same artwork supplies the tank, shop, collection, portraits and anatomy. */
(() => {
'use strict';
const original=window.AquariumFishArt,D=window.AquariumData,TAU=Math.PI*2;
const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
const bounds={blackshrimp:{left:-65,right:80,top:-37,bottom:35},blueshrimp:{left:-65,right:80,top:-37,bottom:35},microcrab:{left:-59,right:59,top:-49,bottom:52},pompomcrab:{left:-59,right:59,top:-55,bottom:49}};
const paths=new Map(),gold='#f1ba40';
function path(d){if(!paths.has(d))paths.set(d,new Path2D(d));return paths.get(d);}
function form(c,d,fill,edge,width=.85,dynamic=false){const p=dynamic?new Path2D(d):path(d);if(fill){c.fillStyle=fill;c.fill(p);}if(edge){c.strokeStyle=edge;c.lineWidth=width;c.stroke(p);}}
function line(c,pts,col,w=1.3){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=col;c.lineWidth=w;c.stroke();}
function oval(c,x,y,rx,ry,fill,edge=null,w=.8){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(edge){c.strokeStyle=edge;c.lineWidth=w;c.stroke();}}
function gradient(c,x1,y1,x2,y2,stops){const g=c.createLinearGradient(x1,y1,x2,y2);stops.forEach(([at,col])=>g.addColorStop(at,col));return g;}
function limb(c,points,p,width,selected=false){line(c,points,selected?'#996a25':p.edge,width+1);line(c,points,selected?gold:p.leg,width);line(c,points,selected?'#fff3a8':p.glint,Math.max(.35,width*.28));}
const palettes={
 blackshrimp:{edge:'#4a514c',leg:'#9a9180',glint:'#e9dfba',top:'#adb6a3',body:'#615c53',deep:'#414744',belly:'#baaa86',spot:'#e9d4a0',ink:'#353d38',fan:'#9b9f8599'},
 blueshrimp:{edge:'#345d88',leg:'#74b8d6',glint:'#daf4ed',top:'#bcefe9',body:'#388ec1',deep:'#575b9e',belly:'#8fcbdc',spot:'#a9e8f2',ink:'#345a9d',fan:'#78bddcb3'},
 microcrab:{edge:'#7a7962',leg:'#c4b99a',glint:'#f8efd4',top:'#f2e6c5',body:'#c1b597',deep:'#9b9e83',belly:'#e7dab6',spot:'#f8eed3',ink:'#898c6e'},
 pompomcrab:{edge:'#94745b',leg:'#d4ac83',glint:'#fff0ce',top:'#f3d7aa',body:'#c89c72',deep:'#a97c61',belly:'#ead0a1',spot:'#fff0c8',ink:'#a77854'}
};
const shell='M-8 -9 C0 -19 18 -19 31 -10 Q37 -6 36 1 L32 8 Q18 15 1 10 Q-7 5 -8 -9Z';
const segments=[
 'M-44 9 Q-41 3 -35 2 L-30 6 L-32 14 Q-39 18 -45 14Z',
 'M-37 2 Q-34 -4 -27 -5 L-22 0 L-24 11 Q-29 16 -36 13Z',
 'M-29 -5 Q-25 -11 -19 -11 L-14 -5 L-15 9 Q-21 14 -28 10Z',
 'M-21 -10 Q-17 -15 -11 -14 L-7 -7 L-7 8 Q-13 12 -20 8Z',
 'M-13 -13 Q-7 -17 -2 -13 L3 -5 L2 9 Q-4 12 -12 7Z',
 'M-5 -12 Q0 -15 6 -10 L10 -3 L8 10 Q1 13 -4 8Z'
];
function shrimp(c,key,gait,idle,motion,part){
 const p=palettes[key],swim=motion==='swim',walk=motion==='walk',move=swim||walk,step=move?gait:0;
 const shellFill=gradient(c,-10,-19,16,15,[[0,p.top],[.3,p.body],[.7,p.deep],[1,p.belly]]);
 const segmentFill=gradient(c,0,-16,0,18,[[0,p.top],[.36,p.body],[.7,p.deep],[1,p.belly]]);
 // Far-side legs remain separate from the near-side five walking appendages.
 c.save();c.globalAlpha*=.62;
 for(let i=0;i<5;i++){const x=2+i*5,k=move?Math.sin(step+i*1.4+Math.PI)*3:0;limb(c,[[x,6],[x-5+k,18],[x+3+k,28]],p,1,part==='legs');}c.restore();
 // Five pairs of delicate, leaflike swimmerets belong to the abdomen, not the back.
 c.save();c.rotate(swim?Math.sin(step)*.055:0);
 for(let i=0;i<5;i++){const x=-32+i*7,y=9-(i>1?2:0),a=Math.sin((swim?step*1.8:idle*.7)+i)*.22;c.save();c.translate(x,y);c.rotate(a);form(c,'M0 0 Q-7 7 -6 12 Q-1 13 2 2Z',part==='swimmerets'?'#f7cd64':p.fan,p.edge,.7);form(c,'M1 2 Q3 8 7 10 Q10 9 5 1Z',part==='swimmerets'?'#ffe9a3':p.fan,p.edge,.6);line(c,[[0,2],[-3,9]],p.glint,.6);c.restore();}
 // A five-lobed tail fan, with fine rays and a pointed central telson.
 c.save();c.translate(-43,11);c.rotate(swim?Math.sin(step*1.3)*.16:Math.sin(idle*.6)*.025);
 for(const [a,length,width] of [[-.77,16,5],[-.38,18,5],[.38,18,5],[.77,16,5]]){c.save();c.rotate(a);form(c,`M1 0 Q-6 ${-width} ${-length} -3 Q${-length-2} 2 ${-length+2} 5 Q-5 6 1 0Z`,part==='tail'?'#f6cc67':p.fan,p.edge,.8);line(c,[[0,0],[-length+2,1]],p.glint,.8);line(c,[[-3,1],[-length+3,3]],p.edge,.4);c.restore();}
 form(c,'M1 -2 L-16 -1 Q-19 1 -15 3 L2 3Z',part==='tail'?gold:p.body,p.edge,.7);c.restore();
 segments.forEach((d,i)=>{form(c,d,part==='abdomen'?'#f5ca62':segmentFill,p.edge,.9);form(c,d,null,p.glint,.3);});
 form(c,'M-40 7 Q-32 -1 -23 -5 T-5 -10',null,p.glint,1.1);
 // Small chromatophore-like flecks keep the shell textured without a flat recolour.
 for(let i=0;i<24;i++){const x=-39+i%12*3.1,y=4+Math.floor(i/12)*4-Math.sin((x+43)/44*Math.PI)*7;oval(c,x,y,i%3===0?.75:.4,.45,i%2?p.ink:p.spot);}
 c.restore();
 // Rostrum and translucent shield are distinct from the segmented abdomen.
 form(c,'M22 -12 L44 -15 L40 -11 L35 -8 L30 -5Z',part==='cephalothorax'?gold:p.body,p.edge,.8);
 line(c,[[29,-12],[30,-15],[33,-13],[35,-16],[37,-14]],p.edge,.65);
 form(c,shell,part==='cephalothorax'?'#f3c65c':shellFill,p.edge,1.05);
 c.save();c.clip(path(shell));
 form(c,'M-5 -10 Q11 -18 29 -9 Q20 -7 7 -6 Q-1 -5 -5 -10Z',key==='blueshrimp'?'#d2f7f15c':'#f1e3be4d');
 form(c,'M-2 4 Q11 9 32 4 L29 10 Q12 17 -3 8Z',p.belly+'66');
 for(let i=0;i<40;i++){const x=-3+(i*17%37),y=-12+(i*11%24);oval(c,x,y,i%4===0?.9:.45,i%3===0?.7:.4,i%3===0?p.spot+'99':p.ink+'66');}
 if(key==='blueshrimp'){form(c,'M-5 -8 Q12 -15 29 -7',null,'#c1f5f2',1.25);form(c,'M3 4 Q19 11 32 3',null,'#7774b98c',2.8);}else form(c,'M-4 -7 Q10 -13 24 -8',null,'#d7c49a',1.2);
 c.restore();
 form(c,'M24 -9 Q18 0 25 10',null,p.glint,.85);
 // Long antennae and a shorter sensory pair; their sweep is independent of steps.
 const sway=Math.sin(idle*.8)*3,antenna=part==='antennae'?gold:p.edge;
 form(c,`M29 -5 Q43 -10 52 ${-24+sway} Q63 -35 75 ${-29+sway}`,null,antenna,part==='antennae'?2:1.05,true);
 form(c,`M31 -3 Q47 -2 60 ${7+sway} Q70 16 76 12`,null,antenna,part==='antennae'?2:.95,true);
 form(c,`M32 -6 Q47 -18 58 ${-14-sway*.4} M33 -2 Q48 1 55 7`,null,part==='antennae'?gold:p.leg,1,true);
 // First two pairs have tiny pincers; the other three have longer walking tips.
 for(let i=0;i<5;i++){const x=23-i*5,k=move?Math.sin(step+i*1.45)*3:Math.sin(idle*1.8+i)*.5,front=i<2;
 const pts=front?[[x,7],[x+6+k,16],[x+13,13+Math.sin(idle*2+i)*2]]:[[x,8],[x-6+k,21],[x+4+k,30-i*.7]];
 limb(c,pts,p,1.25,part==='legs');const tip=pts[2];if(front){line(c,[[tip[0]-2,tip[1]-2],tip,[tip[0]+3,tip[1]-2]],part==='legs'?gold:p.edge,.9);}
 }
 oval(c,29,-10,2,2.1,p.ink);line(c,[[30,-5],[34,-9]],p.edge,1.3);oval(c,34,-9,3.3,3.5,'#243c40',p.leg,.7);oval(c,35,-10.2,1,1.1,'#fffdf2');oval(c,33.3,-7.8,.4,.4,'#9bbcb9');
 if(part==='gills'){form(c,shell,'#fff8df66');oval(c,14,2,11,7,'#f5bc82dd','#b27c55');for(let i=0;i<7;i++)form(c,`M${6+i*2.5} -2 Q${3+i*2.5} 3 ${7+i*2.5} 7`,null,'#fff6d4',.9);}
}
function crabLegs(c,p,micro,gait,motion,part){
 const knees=micro?[[27,-25],[34,-8],[33,15],[25,32]]:[[31,-17],[36,0],[34,17],[26,31]];
 const toes=micro?[[43,-41],[53,-17],[51,29],[35,47]]:[[48,-28],[53,5],[48,32],[35,44]];
 for(const side of [-1,1])for(let i=3;i>=0;i--){const active=motion==='walk',cycle=gait+i*Math.PI*.8+(side<0?Math.PI:0),sweep=active?Math.sin(cycle)*3.2:0,lift=active?Math.max(0,Math.cos(cycle))*2:0;
 const root=[side*(micro?10:18),-7+i*5],knee=[side*(knees[i][0]+sweep*.4),knees[i][1]+lift],toe=[side*(toes[i][0]+sweep),toes[i][1]-lift];
 const mid=[knee[0]+(toe[0]-knee[0])*.72,knee[1]+(toe[1]-knee[1])*.68];
 limb(c,[root,knee,mid,toe],p,micro?1.15:2.25,part==='legs');oval(c,knee[0],knee[1],micro?1.5:2.05,micro?1.5:2.05,part==='legs'?gold:p.belly,p.edge,.5);
 if(!micro)line(c,[[knee[0]*.94,knee[1]-1],[knee[0]*1.02,knee[1]+1]],p.ink,.8);
 }
}
const microShell='M-12 -6 Q-10 -13 -4 -14 Q0 -16 4 -14 Q11 -13 13 -5 Q16 3 10 10 Q5 15 -3 14 Q-13 13 -14 4 Q-15 -1 -12 -6Z';
const pomShell='M-19 -13 Q-12 -19 -5 -18 Q0 -15 5 -18 Q15 -19 21 -10 L23 -3 Q24 12 14 17 Q0 23 -15 16 Q-24 12 -23 0Z';
function crab(c,key,gait,idle,motion,part){
 const micro=key==='microcrab',p=palettes[key],shape=micro?microShell:pomShell;
 crabLegs(c,p,micro,gait,motion,part);
 const body=gradient(c,-12,-20,12,21,[[0,p.top],[.4,p.body],[1,p.deep]]);
 form(c,shape,part==='carapace'?'#f5c65c':body,p.edge,micro?.9:1.1);
 c.save();c.clip(path(shape));
 oval(c,-4,-8,micro?10:16,micro?6:9,'#fff3d74d');
 form(c,micro?'M-10 -6 Q-5 -2 -4 4 Q0 7 4 4 Q5 -2 10 -6':'M-16 -10 Q-9 -8 -7 0 Q0 7 7 0 Q9 -8 16 -10',null,p.ink+'88',.9);
 form(c,micro?'M-9 5 Q0 10 9 5':'M-15 9 Q0 17 15 9',null,p.glint,1);
 for(let i=0;i<(micro?28:42);i++){const x=(i*13%37)-18,y=(i*7%31)-15;oval(c,x,y,i%3===0?1:.5,i%3===0?.65:.4,i%3===0?p.ink+'66':p.spot+'bb');}
 if(!micro){form(c,'M-18 -10 Q-12 -14 -8 -12 M7 -12 Q14 -15 19 -8',null,'#fff1c7',1.4);oval(c,-12,1,3,4,'#b88a6780');oval(c,12,1,3,4,'#b88a6780');}
 c.restore();
 // Eyestalks are visible above the anterior shell; no angry brows or large teeth.
 for(const side of [-1,1]){const ex=side*(micro?5.6:9.2),ey=micro?-18:-21;
 limb(c,[[side*(micro?4:7),micro?-11:-15],[ex,ey]],p,micro?1.4:2.5,part==='eyes');
 oval(c,ex,ey,micro?2.1:3.1,micro?2.4:3.4,part==='eyes'?gold:'#344746',p.glint,.55);oval(c,ex+.6,ey-.9,micro?.65:.85,micro?.7:.95,'#fff9e6');
 }
 // Two chelipeds: small hairy pincers for the micro crab, broad fuzzy mitts for the pom-pom.
 for(const side of [-1,1]){const lift=Math.sin(idle*1.15+side)*1.8,reach=micro?19:32;
 limb(c,[[side*(micro?9:17),-9],[side*(micro?22:29),-20+lift],[side*reach,-29+lift]],p,micro?1.5:3.4,part==='claws');
 c.save();c.translate(side*reach,-31+lift);c.rotate(side*(.24+Math.sin(idle*.8+side)*.08));
 if(micro){
  form(c,'M-3 4 Q-6 -1 -3 -5 L-1 -8 L0 -3 L3 -7 Q6 -3 4 1 L2 5Z',part==='claws'?'#f4c15b':p.belly,p.edge,.8);
  for(let i=0;i<6;i++){const y=-4+i*1.6;line(c,[[-3,y],[-6,y-1]],part==='claws'?gold:p.leg,.55);line(c,[[3,y],[5,y-1]],part==='claws'?gold:p.leg,.55);}
 }else{
  const fuzz=gradient(c,-7,-11,7,8,[[0,'#fff2ce'],[.5,'#ddc49b'],[1,'#ba976d']]);
  oval(c,0,-2,9,9,part==='claws'?'#f3c65d':fuzz,p.edge,.6);
  // Fine setae grow directly on the claws, not sea anemones carried in the hands.
  for(let i=0;i<26;i++){const a=i/26*TAU,r=9+(i%4)*.7;line(c,[[Math.cos(a)*4,Math.sin(a)*4-2],[Math.cos(a)*r,Math.sin(a)*r-2]],part==='claws'?(i%2?'#fff3b5':gold):i%3?'#ebd6ae':'#b39470',.8);}
  form(c,'M-5 4 Q-7 0 -5 -4 L-3 -8 L-1 -4 L0 -1 L2 -5 L4 -8 Q7 -4 6 1 Q5 5 1 6Z',part==='claws'?'#f4c15b':'#d4a675',p.edge,.8);
  form(c,'M-3 -4 L0 0 L3 -4',null,'#fff1cd',1.1);oval(c,-5,-6,2,1,'#fff5dba6');
 }
 c.restore();}
 form(c,micro?'M-2 -10 L0 -8 L2 -10':'M-4 -13 Q0 -9 4 -13',null,p.edge,.8);
 if(part==='abdomen'){form(c,shape,'#fff8df66');form(c,'M-6 -4 Q0 -7 6 -4 L6 7 Q0 15 -6 7Z','#f3c25abf','#b38b4d',.8);for(let i=0;i<4;i++)line(c,[[-5,-1+i*3],[5,-1+i*3]],'#fff0b8',.8);}
 if(part==='gills'){form(c,shape,'#fff8df66');for(const side of [-1,1]){oval(c,side*(micro?8:14),2,micro?4:5.5,micro?8:11,'#f4bc82dd','#b27c55',.7);for(let i=0;i<6;i++)line(c,[[side*(micro?5:10),-5+i*3],[side*(micro?11:18),-3+i*3]],'#fff4d2',.8);}}
}
const shrimpParts=[['cephalothorax','頭胸部','頭和胸連在一起，外面覆著甲殼，保護裡面的器官。'],['abdomen','腹部','腹部分成一節一節，可以彎曲，協助游動。'],['antennae','觸角','用來感覺周圍的環境。'],['legs','步足','胸部有五對步足，前面的兩對具有小螯，可取食；其餘協助行走。'],['swimmerets','游泳足','腹面五對小附肢會擺動，協助游泳；不是魚鰭。'],['tail','尾部構造','尾節和尾肢組成尾扇，配合腹部彎曲協助快速移動。'],['gills','鰓及呼吸','鰓位於頭胸部甲殼內，和水進行氣體交換。亮起的區域是位置示意，外面通常看不到鰓。']];
const crabParts=[['carapace','頭胸甲','覆蓋頭胸部的硬殼，保護裡面的器官。'],['claws','螯足','最前面一對胸足末端像鉗子，可以取食；其餘四對步足協助行走。'],['legs','步足','四對步足有關節，可以行走或攀附，不是魚鰭。'],['eyes','眼睛','眼睛位在眼柄上，可以觀察周圍。'],['abdomen','腹部','腹部折在身體下方。這裡用透視色塊標出大致位置，從背面原本看不到。'],['gills','鰓及呼吸','鰓位於頭胸甲兩側的鰓室內。水流經鰓時進行氣體交換，不靠魚類那樣的鰓蓋開合。亮色只是位置示意。']];
function getFinInfo(key){if(!bounds[key])return original.getFinInfo(key);const shrimpType=D.SPECIES[key].category==='shrimp';return {note:(shrimpType?'看看觸角、步足與腹部小小的游泳足。':'看看螯足與四對步足，腹部折在身體下方。')+'這是簡化示意，體型成長用縮放表示；內部構造以透視色塊提示。',parts:(shrimpType?shrimpParts:crabParts).map(([id,name,description])=>({id,name,description}))};}
function draw(c,key,x,y,size,turn=1,angle=0,phase=0,variant='normal',options={}){
 if(!bounds[key])return original.draw(c,key,x,y,size,turn,angle,phase,variant,options);
 const isShrimp=D.SPECIES[key].category==='shrimp',motion=options.motion||'walk',gait=options.gait??phase,idle=options.idle??phase*.4;
 c.save();c.translate(x,y+(motion==='walk'?Math.sin(gait*2)*size*.003:0));c.rotate(angle*.2);
 c.scale(size/100*(isShrimp&&turn<0?-1:1),size/100);c.lineJoin='round';c.lineCap='round';
 if(isShrimp)shrimp(c,key,gait,idle,motion,options.highlightPart);else crab(c,key,gait,idle,motion,options.highlightPart);
 c.restore();
}
// Display scale is transient: historic saved sizes and growth remain untouched.
function displaySize(key,size){return key==='microcrab'?Math.max(36,size*1.16):key==='pompomcrab'?Math.max(47,size*1.08):Math.max(43,size*1.1);}
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
 const dx=r.target.x-r.x,dy=r.target.y-r.y,dist=Math.hypot(dx,dy),rest=r.crustRest>0||dist<.013;
 const swimming=shrimpType&&(r.crustMode==='短游'||r.escape>0),stride=swimming?1:.65+.35*Math.abs(Math.sin(r.phase));
 const speed=(target?Math.max(.04,s.speed*1.9):s.speed*(r.escape?3:1))*(rest?0:stride);let vx=dx/(dist||1)*speed,vy=dy/(dist||1)*speed*.72;
 for(const q of fishes){if(rest||q.id===f.id)continue;const rr=runtime.get(q.id),ox=r.x-rr.x,oy=r.y-rr.y,d=Math.hypot(ox,oy);if(d>.001&&d<.04){vx+=ox/d*.008;vy+=oy/d*.005;}}
 r.vx=vx;r.vy=vy;r.x=cap(r.x+vx*dt,Math.max(.06,f.size*.55/W),1-Math.max(.06,f.size*.55/W));r.y=cap(r.y+vy*dt,.45,.915);if(Math.abs(vx)>.001)r.direction=vx>0?1:-1;r.turn+=(r.direction-r.turn)*Math.min(1,dt*4);r.heading=0;r.phase+=dt*(rest?0:swimming?9:6);r.idlePhase=(r.idlePhase||0)+dt;r.crustMotion=rest?'rest':swimming?'swim':'walk';r.position={x:r.x,y:r.y};r.behavior=target?'撿食底餌':rest?'停下覓食':r.crustMode||'步行';r.behaviorState=target?'feed':rest?'rest':r.crustMode==='躲藏'?'hide':r.crustMode==='攀爬'?'climb':'walk';r.hiddenAmount+=(Number(r.behaviorState==='hide')*.5-r.hiddenAmount)*Math.min(1,dt*2);r.coinValue=s.values[f.growth>=100?2:f.growth>=35?1:0];
 return target&&Math.hypot((target.x-r.x)*W,(target.y-r.y)*H)<Math.max(15,f.size*.3);
}
window.AquariumCrustaceans=Object.freeze({tick,displaySize});
window.AquariumFishArt=Object.freeze({...original,draw,getFinInfo,hitBounds:Object.freeze({...original.hitBounds,...bounds})});
})();
