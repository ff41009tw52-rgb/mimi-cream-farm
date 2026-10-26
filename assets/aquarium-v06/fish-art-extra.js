/* Five separately drawn species. Original ten delegate to the unmodified renderer. */
(() => {
'use strict';
const original=window.AquariumFishArt,cache=new Map(),TAU=Math.PI*2;
function p(d){if(!cache.has(d))cache.set(d,new Path2D(d));return cache.get(d);}
function shape(c,d,fill,edge='#536e6570',w=.65){const a=typeof d==='string'?p(d):d;c.fillStyle=fill;c.fill(a);if(edge){c.strokeStyle=edge;c.lineWidth=w;c.stroke(a);}return a;}
function line(c,d,col,w=.65){c.strokeStyle=col;c.lineWidth=w;c.stroke(typeof d==='string'?p(d):d);}
function oval(c,x,y,rx,ry,col){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=col;c.fill();}
const forms={
 platy:{body:'M-28 0 C-21 -3 -19 -18 -3 -21 C15 -23 30 -13 36 -5 L41 -1 Q43 2 37 5 C27 21 8 25 -8 18 Q-23 11 -28 0Z',tail:'M-27 -2 Q-40 -9 -51 -20 Q-61 0 -51 22 Q-38 17 -26 5Z',dorsal:'M-15 -13 Q-18 -32 -8 -36 Q7 -36 21 -14Z',anal:'M-12 15 L-17 29 Q0 31 11 18Z',pelvic:'M10 17 Q3 27 16 28 L20 14Z',pectoral:'M22 4 Q8 2 5 18 Q15 24 25 7Z',eye:[32,-5],gill:'M25 -11 Q18 0 25 11',color:['#f6d2a0','#e8a16e','#bf785a'],fin:'#d68a6b',root:-27},
 harlequin:{body:'M-33 -1 C-23 -3 -18 -10 -7 -17 C5 -23 20 -15 29 -9 Q36 -5 40 -2 Q43 0 38 3 C29 8 18 19 6 19 C-9 17 -18 7 -33 4Z',tail:'M-32 -1 Q-45 -9 -54 -18 Q-51 -6 -45 1 Q-50 8 -54 18 Q-43 12 -31 4Z',dorsal:'M-9 -15 Q-7 -25 -2 -32 Q5 -30 12 -16Z',anal:'M-10 12 Q-15 19 -12 25 Q0 23 9 17Z',pelvic:'M17 9 L11 20 L23 12Z',pectoral:'M26 1 Q14 -1 11 10 Q22 13 28 4Z',eye:[32,-3],gill:'M25 -7 Q21 0 25 7',color:['#f6d7ad','#d99c77','#a96f62'],fin:'#cc8b69',root:-31},
 honey:{body:'M-31 0 C-23 -12 -8 -23 10 -22 Q31 -18 38 -5 Q44 0 37 6 C25 21 9 24 -7 19 Q-24 12 -31 0Z',tail:'M-29 -3 Q-41 -10 -50 -16 Q-57 0 -50 18 Q-39 17 -28 5Z',dorsal:'M-23 -10 L-22 -24 L-17 -29 L-13 -27 L-8 -32 Q12 -32 27 -13Z',anal:'M-23 9 Q-28 23 -17 27 Q6 32 29 12 L21 10Z',pelvic:'M23 13 Q17 33 -3 42 M19 13 Q12 29 -11 35',pectoral:'M23 2 Q8 0 2 14 Q14 22 27 5Z',eye:[32,-5],gill:'M25 -11 Q18 0 25 11',color:['#f0d88c','#dcb45e','#b38c4d'],fin:'#c5a05b',root:-30},
 bolivian:{body:'M-30 0 Q-24 -9 -12 -19 C5 -29 24 -24 32 -10 L39 -4 Q45 0 38 5 Q32 22 11 25 C-8 25 -21 13 -30 3Z',tail:'M-28 -2 L-52 -22 Q-49 -8 -43 0 Q-50 13 -53 24 L-28 6Z',dorsal:'M-23 -10 L-18 -30 L-14 -25 L-9 -44 L-5 -29 L0 -37 L4 -28 L9 -33 L14 -26 L22 -24 L27 -16Z',anal:'M-17 12 Q-22 27 -11 32 L9 21Z',pelvic:'M22 16 L14 37 L9 35 L13 14Z',pectoral:'M24 4 Q8 0 3 18 Q17 25 28 7Z',eye:[31,-7],gill:'M25 -14 Q19 -1 26 12',color:['#eddbad','#c7b786','#a69879'],fin:'#ca8d77',root:-29}
};
function fin(c,key,f,id,phase,highlight){
 const d=f[id];if(!d)return;c.save();
 const swing=Math.sin(phase*(id==='pectoral'?1.4:1)+(id==='tail'?0:1.1));
 if(id==='tail'){c.translate(f.root,0);c.scale(.86+swing*.13,1);c.translate(-f.root,0);}else if(id==='pectoral'){c.scale(1,.8+swing*.18);}else{c.rotate(swing*.012);}
 if(id==='pelvic'&&key==='honey'){line(c,d,highlight?'#ffd166':'#b9904f',highlight?2.8:1.1);c.restore();return;}
 const clip=shape(c,d,highlight?'#f3ca69':f.fin+'bd',highlight?'#a87725':'#657b6277',highlight?1.3:.65);
 c.save();c.clip(clip);for(let i=0;i<9;i++){const xx=-56+i*12;line(c,`M${id==='tail'?f.root:7} 2 L${xx} ${id==='dorsal'?-45:42}`,'#fff2c657',.55);}c.restore();c.restore();
}
function ordinary(c,key,phase,part,variant){const v=window.AquariumData.VARIANTS[variant],base=forms[key],f=v?.species===key?{...base,color:[v.accent,v.color,v.tail],fin:v.tail}:base;
 for(const id of ['tail','dorsal','anal','pelvic'])fin(c,key,f,id,phase,part===id);
 c.save();c.rotate(Math.sin(phase)*.008);
 const g=c.createLinearGradient(0,-24,7,24);f.color.forEach((v,i)=>g.addColorStop(i/2,v));const body=shape(c,f.body,g);
 c.save();c.clip(body);
 if(key==='harlequin'){
  // NParks: copper body, broad posterior wedge tapering into the caudal peduncle.
  // Curved lower edge and soft copper rim follow the same moving body layer.
  shape(c,'M1 -14 Q-7 -12 -17 -6 Q-25 -2 -33 0 L-32 3 Q-18 5 -7 15 Q-4 17 -1 15 Q2 7 1 -14Z','#a17468',null);
  const ink=c.createLinearGradient(-5,-12,-15,14);ink.addColorStop(0,'#394d50');ink.addColorStop(.55,'#303a40');ink.addColorStop(1,'#665457');
  shape(c,'M0 -13 C-6 -12 -18 -5 -32 1 Q-20 3 -8 13 Q-4 16 -2 14 Q1 4 0 -13Z',ink,null);
  line(c,'M-25 0 Q-10 -2 -2 -10','#7a8c8740',1);
  shape(c,'M-18 -5 Q1 -22 25 -9 Q5 -16 -13 -1Z','#ffefd33b',null);
 }
 if(key==='platy'){shape(c,'M-28 -7 Q-18 -3 -23 10 L-33 8Z','#685948');for(let i=0;i<8;i++)oval(c,-13+i*4,4+Math.sin(i)*6,.7,1.3,'#f7dab88c');}
 if(key==='honey'){line(c,'M-26 2 Q0 3 29 -1','#b7945660',1.5);shape(c,'M17 15 Q30 6 34 10 L33 25 L14 25Z','#9d8c5c50');}
 if(key==='bolivian'){oval(c,0,-1,5.8,8,'#525b55');shape(c,'M27 -20 L30 -8 L26 8 L25 18 L21 10 L24 -5 L23 -21Z','#4c555280');for(let i=0;i<11;i++)oval(c,-22+(i*11)%46,7+(i*5)%12,1.25,.75,i%2?'#aecac0':'#dcbe91');}
 for(let row=0;row<4;row++)for(let i=0;i<7;i++){const x=-18+i*6+(row%2)*3,y=-10+row*6;line(c,`M${x} ${y} q3 2 0 4`,'#fff6dd24',.4);}
 c.restore();line(c,f.gill,'#786f5470',.8);line(c,'M37 2 L41 1','#756d58',.65);
 const [ex,ey]=f.eye;oval(c,ex,ey,3.2,3.4,'#eeddb3');oval(c,ex+.3,ey,2.1,2.5,'#293f42');oval(c,ex+.9,ey-.9,.65,.65,'#fffdf1');c.restore();fin(c,key,f,'pectoral',phase,part==='pectoral');
}
function loach(c,phase,part,variant){
 const v=window.AquariumData.VARIANTS[variant],pal=v?.species==='kuhli'?[v.accent,v.color,v.tail]:['#ebd1a0','#c7a576','#a48262'];
 const yy=x=>Math.sin(phase*1.1+x*.055)*3.2*Math.max(0,(38-x)/95),pts=[];
 for(let i=0;i<=24;i++){const x=-57+i*4;pts.push([x,yy(x),4+Math.sin(i/24*Math.PI)*3]);}
 const body=new Path2D();body.moveTo(pts[0][0],pts[0][1]-pts[0][2]);for(const [x,y,r]of pts)body.lineTo(x,y-r);body.quadraticCurveTo(48,0,40,6);for(const [x,y,r]of [...pts].reverse())body.lineTo(x,y+r);body.closePath();
 const finAt=(id,d)=>shape(c,d,part===id?'#f2cc70':'#c6a577aa',part===id?'#ba8c38':'#88755377',.6);
 c.save();c.translate(-55,yy(-55));c.rotate(Math.sin(phase)*.1);finAt('tail','M0 -3 L-12 -9 Q-17 0 -12 9 L0 4Z');c.restore();
 c.save();c.translate(0,yy(-29));finAt('dorsal','M-39 -5 Q-35 -18 -28 -15 L-22 -5Z');finAt('anal','M-40 5 L-34 16 L-23 5Z');c.restore();
 finAt('pelvic','M-11 6 Q-17 18 -23 12 L-17 5Z');
 const g=c.createLinearGradient(0,-8,0,9);g.addColorStop(0,pal[0]);g.addColorStop(.5,pal[1]);g.addColorStop(1,pal[2]);shape(c,body,g);
 c.save();c.clip(body);for(let x=-51;x<29;x+=13){c.save();c.translate(x,yy(x));c.rotate(-.18);c.fillStyle='#66554d';c.fillRect(-3,-12,6.5,24);c.restore();}c.restore();
 finAt('pectoral','M28 4 Q20 4 19 15 Q28 16 32 6Z');line(c,'M34 -4 Q31 0 34 5','#89745b',.7);oval(c,38,-3,2,2.1,'#293f40');oval(c,38.6,-3.7,.5,.5,'#fff6dd');
 line(c,'M44 3 Q49 5 51 3 M43 5 Q46 10 50 9 M40 6 Q42 12 45 13','#937652',.7);
}
const bounds={platy:{left:-62,right:44,top:-38,bottom:33},harlequin:{left:-57,right:44,top:-34,bottom:28},honey:{left:-59,right:45,top:-35,bottom:44},kuhli:{left:-74,right:52,top:-22,bottom:22},bolivian:{left:-56,right:46,top:-46,bottom:39}};
function draw(c,key,x,y,size,turn=1,angle=0,phase=0,variant='normal',options={}){
 if(!bounds[key])return original.draw(c,key,x,y,size,turn,angle,phase,variant,options);
 const t=Math.max(-1,Math.min(1,turn));c.save();c.translate(x,y);c.rotate(angle*.35);c.scale(size/100*(t<0?-1:1)*(.15+.85*Math.abs(t)),size/100);c.lineJoin='round';c.lineCap='round';
 if(key==='kuhli')loach(c,phase,options.highlightPart,variant);else ordinary(c,key,phase,options.highlightPart,variant);c.restore();
}
const notes={platy:'月光魚身形圓潤，這裡採扇形臀鰭的雌魚概括造型；雄魚臀鰭較細長。',harlequin:'三角燈後半身有深色三角斑，尾鰭分叉，沒有脂鰭。',honey:'蜜糖麗麗魚的細絲是腹鰭，不是觸鬚；背鰭和臀鰭沿身體延伸。',kuhli:'酷利泥鰍身體細長，背鰭和臀鰭靠後，嘴邊有觸鬚；牠也有胸鰭、腹鰭和尾鰭。',bolivian:'玻利維亞鳳凰的背鰭前段具有較高的硬棘，體側有深色斑，腹鰭較尖。'};
function getFinInfo(key){if(!bounds[key])return original.getFinInfo(key);const names={dorsal:'背鰭',pectoral:'胸鰭',pelvic:'腹鰭',anal:'臀鰭',tail:'尾鰭'},desc={dorsal:'位於背部，幫助穩定身體。',pectoral:'在鰓蓋後方的兩側，協助轉向和調整姿態。',pelvic:key==='honey'?'腹側細長的絲狀鰭，可協助探察周圍。':'腹側成對的鰭，協助穩定與轉向。',anal:'身體後段腹側的鰭，幫助維持穩定。',tail:'身體最後方的鰭，隨身體擺動，幫助前進。'};return {note:notes[key],parts:Object.entries(names).map(([id,name])=>({id,name,description:desc[id]}))};}
window.AquariumFishArt=Object.freeze({...original,draw,getFinInfo,hitBounds:Object.freeze({...original.hitBounds,...bounds})});
})();
