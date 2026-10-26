/* Original articulated vector assets for the expanded catalog, plus cached material recolouring. */
(() => {
'use strict';
const D=window.AquariumData,fishOld=window.AquariumFishArt,decorOld=window.AquariumDecorArt,TAU=Math.PI*2;
const pathCache=new Map();function P(d){if(!pathCache.has(d))pathCache.set(d,new Path2D(d));return pathCache.get(d);}
function shape(c,d,fill,stroke='#526d7177',w=.8){const p=P(d);if(fill){c.fillStyle=fill;c.fill(p);}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke(p);}return p;}
function line(c,d,col,w=1){shape(c,d,null,col,w);}
function oval(c,x,y,rx,ry,col,edge){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=col;c.fill();if(edge){c.strokeStyle=edge;c.lineWidth=.8;c.stroke();}}
function gradient(c,a,b){const g=c.createLinearGradient(-20,-60,25,15);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
const forms={
 paradise:['M-32 0 Q-20 -21 5 -20 Q27 -20 38 -4 Q45 0 38 6 Q15 23 -9 16Z','M-30 0 Q-45 -12 -61 -27 L-51 0 L-62 29 Q-44 18 -29 5Z','M-23 -10 Q-28 -30 -9 -31 L27 -16Z','M-22 9 Q-33 31 -10 33 L28 12Z'],
 clown:['M-31 0 Q-24 -23 4 -23 Q29 -21 39 -4 Q43 2 36 8 Q21 24 -3 22 Q-24 17 -31 0Z'],
 maroon:['M-31 0 Q-23 -26 6 -24 Q32 -21 40 -3 L35 10 Q18 27 -4 22Z'],
 damsel:['M-31 0 Q-21 -21 3 -22 Q29 -17 38 -1 Q27 20 3 20 Q-23 15 -31 0Z'],
 chromis:['M-32 0 Q-15 -22 7 -20 L39 -1 Q23 22 1 18Z','M-30 -2 L-58 -22 L-47 1 L-57 23 L-29 5Z'],
 dart:['M-41 0 Q-9 -12 23 -8 L43 -2 L39 4 Q7 12 -40 5Z',null,'M-7 -8 L-12 -54 Q-3 -58 -1 -13 L17 -9Z'],
 dotty:['M-38 0 Q-13 -15 13 -12 Q34 -10 43 -2 L37 6 Q12 16 -17 10Z','M-36 0 Q-53 -16 -57 -10 L-57 13 Q-47 18 -35 5Z'],
 banggai:['M-29 0 L-13 -21 Q10 -28 31 -9 L39 -2 Q23 21 2 23 L-21 12Z','M-27 0 L-60 -32 L-49 1 L-60 34 L-26 5Z','M-17 -13 L-18 -48 L-4 -28 L3 -41 L25 -15Z','M-20 11 L-18 44 L1 28 L21 15Z'],
 pajama:['M-30 0 Q-21 -23 7 -22 L39 -2 Q28 24 1 22Z',null,'M-14 -15 L-17 -40 L2 -26 L18 -16Z'],
 goby:['M-39 0 Q-12 -11 13 -14 Q33 -15 42 -4 L40 6 Q24 19 6 10 L-37 6Z',null,'M-14 -7 Q-17 -32 -3 -29 L7 -11 L14 -34 L28 -12Z'],
 wrasse:['M-39 0 Q-22 -17 7 -14 Q31 -13 42 -3 L38 5 Q11 18 -21 10Z'],
 blueTang:['M-33 0 Q-25 -30 2 -32 Q32 -28 40 -4 Q43 4 34 14 Q19 35 -6 29 Q-28 22 -33 0Z'],
 yellowTang:['M-31 0 L-16 -29 Q6 -43 23 -17 L43 -4 L43 1 L31 7 Q20 38 -6 31 Q-29 24 -31 0Z',null,'M-26 -10 L-17 -47 Q5 -53 23 -19Z','M-25 12 Q-23 47 3 45 L27 18Z'],
 flame:['M-32 0 Q-21 -29 7 -28 Q32 -23 39 -4 L36 9 Q25 32 -1 28 Q-27 22 -32 0Z'],
 mandarin:['M-39 0 Q-22 -12 8 -15 Q32 -19 41 -5 L39 5 Q26 18 4 12 L-37 8Z',null,'M-19 -7 L-18 -33 Q-5 -38 0 -10 L12 -29 L30 -10Z'],
 butterfly:['M-30 0 Q-23 -34 5 -35 Q24 -32 32 -15 L45 -5 L44 1 L33 5 Q25 35 -1 32 Q-25 26 -30 0Z',null,'M-23 -15 Q-13 -47 10 -42 L25 -22 L32 -51 L32 -14Z']
};
const normalTail='M-29 -2 L-53 -19 Q-49 0 -53 21 L-29 5Z',normalDorsal='M-24 -11 Q-22 -30 -8 -29 L24 -13Z',normalAnal='M-23 9 Q-19 29 4 27 L27 13Z';
function fin(c,d,col,phase,tail,highlight){c.save();if(tail)c.scale(.9+Math.sin(phase)*.1,1);else c.rotate(Math.sin(phase)*.025);shape(c,d,highlight?'#f1c861':col);c.save();c.clip(P(d));for(let i=0;i<9;i++)line(c,`M-12 0 L${-56+i*10} ${i%2?-40:40}`,'#f8f0ce60',.6);c.restore();c.restore();}
function drawFish(c,key,x,y,size,turn=1,angle=0,phase=0,variant='normal',o={}){
 const base=D.SPECIES[key],v=D.VARIANTS[variant],s=v?.species===key?{...base,color:v.color,tail:v.tail}:base,f=forms[s?.form];if(!f)return fishOld.draw(c,key,x,y,size,turn,angle,phase,variant,o);
 const [body,tail=normalTail,dorsal=normalDorsal,anal=normalAnal]=f;
 c.save();c.translate(x,y);c.rotate(angle*.35);c.scale(size/100*(turn<0?-1:1)*(.2+.8*Math.abs(turn)),size/100);c.lineCap='round';c.lineJoin='round';
 fin(c,tail||normalTail,s.tail,phase,true,o.highlightPart==='tail');fin(c,dorsal||normalDorsal,s.tail+'bd',phase,false,o.highlightPart==='dorsal');fin(c,anal||normalAnal,s.tail+'bd',phase+.8,false,o.highlightPart==='anal');
 shape(c,body,gradient(c,s.color,'#'+s.color.slice(1).match(/../g).map(v=>Math.round(parseInt(v,16)*.73).toString(16).padStart(2,'0')).join('')));
 c.save();c.clip(P(body));
 const form=s.form;
 if(['clown','maroon'].includes(form)){for(const x0 of [-21,2,25]){line(c,`M${x0} -32 Q${x0-10} 0 ${x0+1} 32`,'#52646a',form==='clown'?13:7);line(c,`M${x0} -32 Q${x0-10} 0 ${x0+1} 32`,'#fff3d8',form==='clown'?9:4);}}
 if(['paradise','flame','banggai'].includes(form)){for(let i=0;i<(form==='banggai'?3:7);i++){const xx=-22+i*(form==='banggai'?23:8);line(c,`M${xx} -35 Q${xx-7} 0 ${xx+2} 34`,form==='paradise'?'#db8567':form==='flame'?'#574d68':'#465a65',form==='banggai'?9:4);}}
 if(form==='wrasse'){for(let i=0;i<6;i++)line(c,`M-44 ${-12+i*5} Q0 ${-19+i*6} 45 ${-7+i*4}`,'#e9b375',2);}
 if(form==='dart'){shape(c,'M1 -18 L55 -18 L55 20 L-8 20 Q12 5 1 -18Z',s.tail,null);}
 if(form==='pajama'){shape(c,'M-5 -30 L5 -30 L5 30 L-5 30Z','#4d6260',null);for(let i=0;i<18;i++)oval(c,8+i%5*6,-15+Math.floor(i/5)*9,2,2.4,'#b98278');}
 if(form==='blueTang'){shape(c,'M-23 -5 Q-4 -29 25 -16 Q19 -5 4 -4 Q-4 18 -23 12 L-30 0Z','#364d77',null);oval(c,8,-12,13,6,s.color);}
 if(form==='butterfly'){for(let i=0;i<10;i++){line(c,`M${-45+i*8} -34 l45 43`,'#b49c6e80',1.1);line(c,`M${-45+i*8} 32 l45 -43`,'#fff1c57a',1.1);}shape(c,'M17 -36 L28 -29 L34 33 L24 37Z','#465567',null);shape(c,'M-38 -31 L-17 -31 L-18 33 L-38 33Z','#e7c65c',null);}
 if(form==='mandarin'){for(let i=0;i<6;i++)line(c,`M${-34+i*12} -18 Q${-48+i*12} -1 ${-30+i*12} 8 T${-28+i*12} 25`,'#e7a366',4);for(let i=0;i<5;i++)oval(c,-17+i*11,-1+(i%2)*7,3,4,'#386a96');}
 if(form==='goby'){for(let i=0;i<28;i++)oval(c,-28+i%9*7,-8+Math.floor(i/9)*5,1,1.3,'#c1e7dd');}
 if(['damsel','chromis','dotty'].includes(form)){for(let i=0;i<35;i++)oval(c,-25+i%10*6,-11+Math.floor(i/10)*6,.75,.8,'#d7f3ed50');}
 if(form==='dotty')line(c,'M24 -9 L39 -4','#3b4266',2);if(form==='paradise')oval(c,23,-9,3.8,3.5,'#376b72');if(['blueTang','yellowTang'].includes(form))line(c,'M-32 -2 l7 3',form==='yellowTang'?'#fff5d9':'#a4c9db',1.4);if(form==='banggai')for(let i=0;i<16;i++)oval(c,-18+i%5*10,-12+Math.floor(i/5)*8,.8,1,'#f5f2de');
 shape(c,'M-28 -5 Q-1 -26 29 -8 Q0 -17 -24 0Z','#fff5d840',null);c.restore();
 fin(c,form==='mandarin'?'M22 4 Q1 -2 -3 21 Q11 35 29 8Z':'M23 4 Q9 0 6 17 Q20 24 28 7Z',s.tail+'aa',phase*1.5,false,o.highlightPart==='pectoral');
 fin(c,'M14 16 L5 30 L20 20Z',s.tail+'aa',phase,false,o.highlightPart==='pelvic');
 const ex=form==='goby'?32:form==='butterfly'?30:32;oval(c,ex,-6,3.7,4,'#2f4f59');oval(c,ex+1,-7.3,1.15,1.2,'#fff9df');line(c,'M25 -13 Q18 0 26 13',o.highlightPart==='gill'?'#f6c758':'#eef3d49c',1);line(c,'M37 3 L41 2','#5b646d',.8);
 if(o.highlightPart==='gills'){oval(c,20,1,5,10,'#edb477aa');}c.restore();
}
const bounds=Object.fromEntries(Object.entries(D.SPECIES).filter(([,s])=>forms[s.form]).map(([id])=>[id,{left:-64,right:48,top:-60,bottom:49}]));
window.AquariumFishArt=Object.freeze({...fishOld,draw:drawFish,hitBounds:Object.freeze({...fishOld.hitBounds,...bounds}),getFinInfo:key=>bounds[key]?{note:'以簡化造型觀察尾鰭、背鰭與胸鰭；幼魚依體型縮放呈現。',parts:[['dorsal','背鰭','協助保持平衡。'],['tail','尾鰭','擺動尾部與尾鰭推動身體。'],['pectoral','胸鰭','協助轉向、減速與保持位置。'],['pelvic','腹鰭','協助身體平衡。'],['anal','臀鰭','協助穩定游動方向。'],['gills','鰓','位於鰓蓋裡，和水進行氣體交換；亮色是位置示意。']].map(([id,name,description])=>({id,name,description}))}:fishOld.getFinInfo(key)});
const added=new Set(['foxtail','roundleaf','lilypad','mossrock','shrimphouse','rootarch','slatetunnel','mushroom','shellpile','starfish','seafan','staghorn','braincoral','anemone','reefcave','coraltower']);
function leaf(c,x,y,tx,ty,w,col){shape(c,`M${x} ${y} Q${tx-w} ${ty+12} ${tx} ${ty} Q${tx+w} ${ty+12} ${x} ${y}Z`,col);line(c,`M${x} ${y} L${tx} ${ty}`,'#eef0c875',.65);}
function stone(c,x,y,w,h){c.save();c.translate(x,y);c.scale(w,h);shape(c,'M-23 0 L-33 -21 L-20 -40 Q0 -52 23 -34 L31 -11 L22 0Z',gradient(c,'#d1d0bd','#758b86'));line(c,'M-27 -21 L-5 -31 L17 -19 M-5 -31 L1 -44','#eef0d894',1);c.restore();}
function newDecor(c,id,x,y,w,h){if(!added.has(id))return decorOld.draw(c,id,x,y,w,h);c.save();c.translate(x,y);c.scale(w/100,h/100);c.lineCap='round';c.lineJoin='round';const d=D.DECORATIONS[id],col=gradient(c,d.color,'#5b7c76');
 if(id==='foxtail'||id==='roundleaf'){for(let i=0;i<5;i++){const x0=-30+i*15,top=-60-(i*17%40);line(c,`M${x0} 0 Q${x0+5} -45 ${x0} ${top}`,'#5e8d6c',2);for(let j=0;j<7;j++){const yy=top*j/7;for(const side of [-1,1])if(id==='foxtail'){for(let k=0;k<3;k++)line(c,`M${x0} ${yy} l${side*(8+k*3)} ${-7+k*4}`,'#8fba85',1.4);}else leaf(c,x0,yy,x0+side*15,yy-13,9,col);}}}
 else if(id==='lilypad'){for(const [xx,yy,ss]of [[-23,-48,.85],[20,-74,1],[15,-23,.72]]){line(c,`M0 0 Q${xx-10} -30 ${xx} ${yy}`,'#789a65',2);c.save();c.translate(xx,yy);c.scale(ss,.48*ss);shape(c,'M0 0 L-26 -15 C-50 -5 -29 31 0 32 C43 31 46 -20 18 -26 L0 0Z',gradient(c,'#bed08e','#689d77'));for(let j=0;j<6;j++)line(c,`M0 0 L${Math.cos(j)*28} ${Math.sin(j)*24}`,'#dde6b478',.8);c.restore();}}
 else if(id==='mossrock'){stone(c,0,0,1.5,1.6);for(let i=0;i<32;i++)oval(c,-35+i%12*6,-48+Math.floor(i/12)*8,5,3.5,i%2?'#8daf76':'#b2c28c');}
 else if(id==='rootarch'){for(const side of [-1,1]){line(c,`M${side*40} 0 Q${side*38} -84 0 -82`,'#7b6551',14);line(c,`M${side*40-2} -3 Q${side*35} -72 0 -82`,'#b79871',8);for(let i=0;i<4;i++)line(c,`M${side*36} ${-i*16} l${side*(12-i)} -13`,'#8c7356',4);}line(c,'M-30 -63 Q0 -89 29 -62','#e5cc9970',2);}
 else if(id==='shrimphouse'||id==='slatetunnel'||id==='reefcave'){const slate=id==='slatetunnel';stone(c,-30,0,.65,slate?1.8:2);stone(c,29,0,.65,slate?1.8:2);stone(c,0,-48,slate?1.8:1.55,.65);oval(c,0,-25,19,24,'#456d7055');if(id==='shrimphouse'){for(let i=0;i<3;i++){oval(c,-27+i*27,-17,12,15,'#ab9377');oval(c,-27+i*27,-19,7,10,'#496a68');}}if(id==='reefcave')for(let i=0;i<13;i++)oval(c,-35+i%7*11,-65+Math.floor(i/7)*15,3.5,2,'#c5ccaa');}
 else if(id==='mushroom'){shape(c,'M-21 0 L-19 -53 L22 -53 L24 0Z',gradient(c,'#fff0cb','#c4aa86'));shape(c,'M-48 -50 Q-42 -99 -2 -101 Q38 -105 50 -50 Q0 -35 -48 -50Z',gradient(c,'#e7b4a0','#b97f79'));for(const [xx,yy,r]of [[-25,-64,6],[0,-85,8],[25,-63,7]])oval(c,xx,yy,r,r*.65,'#fff0d2');shape(c,'M-8 0 L-8 -23 Q0 -34 10 -23 L10 0Z','#6d796c');oval(c,26,-31,6,8,'#c4dfcc','#9bb59b');}
 else if(id==='shellpile'){for(const [xx,yy,sc]of [[-24,0,1],[25,-5,.8],[0,-20,.9]]){c.save();c.translate(xx,yy);c.scale(sc,sc);shape(c,'M0 0 Q-48 -21 -26 -44 Q-18 -50 -10 -45 Q0 -60 10 -45 Q22 -51 30 -37 Q40 -15 0 0Z',gradient(c,'#f7dfc5','#c0a995'));for(let i=0;i<7;i++)line(c,`M0 -2 Q${-27+i*9} -18 ${-25+i*8} -41`,'#fff4d6aa',1.2);c.restore();}}
 else if(id==='starfish'){shape(c,'M0 -81 L11 -48 L45 -49 L20 -27 L29 6 L0 -12 L-30 6 L-20 -27 L-46 -49 L-11 -48Z',gradient(c,'#edc4a2','#cc8d7f'));for(let i=0;i<5;i++){c.save();c.translate(0,-32);c.rotate(i*TAU/5);for(let j=0;j<5;j++)oval(c,0,-j*7,1.3,1.3,'#ffe5c5');c.restore();}}
 else if(id==='seafan'){for(let i=0;i<13;i++){const xx=-47+i*8,yy=-60-25*Math.sin(i/12*Math.PI);line(c,`M0 0 Q${xx*.4} -40 ${xx} ${yy}`,d.color,1.7);for(let j=1;j<5;j++)line(c,`M${xx*j/5} ${yy*j/5} q-10 -12 -11 -20 M${xx*j/5} ${yy*j/5} q10 -10 11 -20`,'#dab9cbbb',.8);}stone(c,0,1,.45,.35);}
 else if(id==='braincoral'){const b='M-46 -4 Q-59 -42 -30 -69 Q-6 -90 26 -70 Q56 -50 48 -5 Q0 8 -46 -4Z';shape(c,b,gradient(c,'#d1d9a3','#7faaa0'));c.save();c.clip(P(b));for(let i=0;i<9;i++){const xx=-48+i*12;line(c,`M${xx} 3 Q${xx-13} -13 ${xx+1} -24 T${xx+1} -48 T${xx+4} -86`,'#6e9d96',5);line(c,`M${xx-1} 3 Q${xx-14} -13 ${xx} -24 T${xx} -48 T${xx+3} -86`,'#e8e9b5',1.4);}c.restore();}
 else if(id==='anemone'){oval(c,0,-5,35,10,'#b59bb0');for(let i=0;i<27;i++){const xx=-43+i*3.3,yy=-25-(i*13%47);line(c,`M${xx*.6} -5 Q${xx+13} ${yy+12} ${xx} ${yy}`,i%2?'#d8b7d1':'#a5b9c6',4);oval(c,xx,yy,2.8,3.2,'#efd6db');}oval(c,0,-9,17,6,'#e7c5c5');}
 else if(id==='staghorn'||id==='coraltower'){if(id==='coraltower'){stone(c,0,0,1.4,2.2);for(let i=0;i<14;i++){const xx=-37+i%5*17,yy=-15-Math.floor(i/5)*24;oval(c,xx,yy,9,6,['#a6cbb6','#d5b1bf','#cdbb88'][i%3]);for(let j=0;j<4;j++)line(c,`M${xx-6+j*4} ${yy} l2 -9`,'#f0ddc8',1);}}else for(let i=0;i<5;i++){const xx=-36+i*18,yy=-53-(i*19%41);line(c,`M${xx*.6} 0 L${xx} ${yy}`,d.color,8);line(c,`M${xx} ${yy+25} l-13 -19 M${xx} ${yy+16} l12 -20`,'#c8dcd1',5);oval(c,xx,yy,3.5,4,'#e7ecdb');}}
 c.restore();}
const palettes={plant:[['原色',null],['深綠','#49745d'],['黃綠','#b1bd6d'],['紅綠','#b38976'],['紫紅','#ad7eaa']],rock:[['原色',null],['灰白','#c9ceca'],['墨黑','#354247'],['紅褐','#bd8c78'],['青灰','#7fa6a5']],wood:[['原色',null],['深棕','#80634f'],['淺棕','#c9ae83'],['灰褐','#a39c8b'],['暖紅棕','#b3826a']],soft:[['原色',null],['奶油白','#e4d5ad'],['天空藍','#91c4d8'],['粉紅','#dcafbb'],['紫色','#b6a4ce']]};
function colors(id){const d=D.DECORATIONS[id];return palettes[d.kind==='substrate'?'rock':d.tags.includes('wood')?'wood':d.kind==='plant'&&!['seafan','anemone'].includes(id)?'plant':d.tags.includes('rock')?'rock':'soft'];}
function hsl(r,g,b){r/=255;g/=255;b/=255;const hi=Math.max(r,g,b),lo=Math.min(r,g,b),l=(hi+lo)/2,d=hi-lo;if(!d)return [0,0,l];return [((hi===r?(g-b)/d+(g<b?6:0):hi===g?(b-r)/d+2:(r-g)/d+4)/6),d/(1-Math.abs(2*l-1)),l];}
function rgb(h,s,l){const a=s*Math.min(l,1-l),f=n=>{const k=(n+h*12)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))));};return [f(0),f(8),f(4)];}
function tint(canvas,hex){if(!hex)return;const c=canvas.getContext('2d'),im=c.getImageData(0,0,canvas.width,canvas.height),v=hex.slice(1).match(/../g).map(x=>parseInt(x,16)),target=hsl(...v);for(let i=0;i<im.data.length;i+=4){if(!im.data[i+3])continue;const old=hsl(im.data[i],im.data[i+1],im.data[i+2]),p=rgb(target[0],Math.min(.65,target[1])*(.55+old[1]*.45),Math.max(.08,Math.min(.96,target[2]+(old[2]-.5)*.6)));im.data[i]=p[0];im.data[i+1]=p[1];im.data[i+2]=p[2];}c.putImageData(im,0,0);}
const cache=new Map();function cached(key,make){if(cache.has(key))return cache.get(key);const out=make();cache.set(key,out);if(cache.size>96)cache.delete(cache.keys().next().value);return out;}
function drawDecor(c,id,x,y,w,h,color=0){if(!color)return newDecor(c,id,x,y,w,h);const ww=Math.ceil(w*1.35*2),hh=Math.ceil(h*1.25*2),key=[id,ww,hh,color].join(':');const image=cached(key,()=>{const a=document.createElement('canvas');a.width=ww;a.height=hh;const ctx=a.getContext('2d');newDecor(ctx,id,ww/2,hh*.94,w*2,h*2);tint(a,colors(id)[color][1]);return a;});c.drawImage(image,x-ww/4,y-hh*.47,ww/2,hh/2);}
function sand(c,id,w,h,color=0){if(!color)return decorOld.sand(c,id,w,h);const image=cached(['sand',id,w,h,color].join(':'),()=>{const a=document.createElement('canvas');a.width=Math.ceil(w);a.height=Math.ceil(h);decorOld.sand(a.getContext('2d'),id,w,h);tint(a,colors(id)[color][1]);return a;});c.drawImage(image,0,0,w,h);}
window.AquariumDecorArt=Object.freeze({...decorOld,draw:drawDecor,sand,colors});
})();
