/* Additional cached Canvas illustrations, shared by shop and tank. */
(() => {
'use strict';
const old=window.AquariumDecorArt,ids=new Set(['crypt','pebbles','anubias','lava','urn','amazon','riccia','seiryu','arch','rotala','branchwood','lighthouse']);
function path(c,d,color,stroke='#526d5f70',w=.8){const p=new Path2D(d);if(color){c.fillStyle=color;c.fill(p);}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke(p);}return p;}
function oval(c,x,y,rx,ry,col){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=col;c.fill();}
function grad(c,a,b){const g=c.createLinearGradient(-25,-100,35,0);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
function leaf(c,bx,by,tx,ty,w,col,vein=true){path(c,`M${bx} ${by} Q${tx-w} ${ty+20} ${tx} ${ty} Q${tx+w} ${ty+20} ${bx} ${by}Z`,col);if(vein)path(c,`M${bx} ${by} Q${tx-2} ${ty+14} ${tx} ${ty}`,null,'#d6dea58c',.7);}
function stone(c,x,y,sx,sy,color){c.save();c.translate(x,y);c.scale(sx,sy);path(c,'M-22 -2 Q-33 -14 -20 -29 Q-6 -43 15 -31 Q31 -22 26 -5 Q6 4 -22 -2Z',color);path(c,'M-22 -23 Q-5 -40 13 -29 L-2 -13 L-25 -9Z','#f1edda44',null);c.restore();}
function draw(c,id,x,y,w,h){if(!ids.has(id))return old.draw(c,id,x,y,w,h);
 c.save();c.translate(x,y);c.scale(w/100,h/100);c.lineJoin='round';c.lineCap='round';
 const green=grad(c,'#a4bc7b','#477459'),rock=grad(c,'#c7c9ba','#7b8e85'),wood=grad(c,'#c2a177','#785b40');
 if(id==='crypt'){
  for(let i=0;i<9;i++){const xx=(i-4)*10,yy=-35-(i*17%45);path(c,`M0 0 Q${xx*.5} -20 ${xx} ${yy}`,null,'#627d56',1.3);const d=`M${xx*.3} -13 Q${xx-13} ${yy+20} ${xx-6} ${yy+9} L${xx-7} ${yy+5} L${xx} ${yy} Q${xx+11} ${yy+9} ${xx+9} ${yy+16} Q${xx+16} ${yy+22} ${xx*.3} -13Z`;path(c,d,green);path(c,`M${xx*.3} -13 L${xx} ${yy+4}`,null,'#bdc58a',.8);}
 }else if(id==='anubias'){
  path(c,'M-35 -6 Q0 -19 35 -5',null,'#806f4d',6);
  for(const [tx,ty]of [[-36,-49],[-19,-84],[9,-98],[37,-71],[31,-35],[-1,-55]]){path(c,`M0 -10 Q${tx*.5} -30 ${tx} ${ty+14}`,null,'#5b8056',2);c.save();c.translate(tx,ty+12);c.rotate(tx/100);oval(c,0,0,14,22,grad(c,'#669873','#365c48'));path(c,'M0 20 L0 -19',null,'#b3c49699',1);c.restore();}
 }else if(id==='amazon'){
  for(const [tx,ty,ww]of [[-42,-71,15],[39,-82,15],[-23,-100,15],[18,-104,16],[0,-109,12],[-44,-40,14],[45,-44,15]])leaf(c,0,-2,tx,ty,ww,green);
 }else if(id==='riccia'){
  oval(c,0,-8,48,10,'#70916c');
  for(let i=0;i<25;i++){const xx=-46+i*3.8,yy=-9-(i*11%32);path(c,`M${xx} -3 L${xx-2} ${yy} l-6 -8 M${xx-2} ${yy} l5 -10 M${xx-4} ${yy-3} l-5 1`,null,i%2?'#a4c380':'#7fab71',2.3);}
 }else if(id==='rotala'){
  for(let i=0;i<5;i++){const xx=-30+i*15,top=-70-(i*13%35);path(c,`M${xx} 0 Q${xx+8} -44 ${xx-3} ${top}`,null,'#916c60',1.5);for(let j=1;j<7;j++){const yy=top*j/7;leaf(c,xx+2,yy,xx-11,yy-12,5,j>4?'#bd8b7c':'#8d9d72');leaf(c,xx+2,yy,xx+15,yy-10,5,j>4?'#c49a85':'#929c72');}}
 }else if(id==='pebbles'){
  stone(c,-26,-1,.95,1,grad(c,'#d0c9b6','#9a9d8b'));stone(c,23,0,.9,.9,rock);stone(c,1,-16,1,1.3,grad(c,'#ded8c7','#a5af9e'));stone(c,-9,-1,.5,.5,'#c2bba4');
 }else if(id==='lava'){
  const clip=path(c,'M-45 0 L-52 -35 L-33 -64 L-17 -89 L12 -92 L37 -70 L49 -33 L43 0Z',grad(c,'#a58b7b','#705f59'));c.save();c.clip(clip);
  for(let i=0;i<34;i++){const xx=-42+(i*31)%86,yy=-6-(i*23)%82;oval(c,xx,yy,2+i%4,1.6+i%3,'#524e4666');path(c,`M${xx-2} ${yy+2} q3 2 5 -1`,null,'#d5b6a24f',.9);}c.restore();
 }else if(id==='seiryu'){
  path(c,'M-49 -1 L-40 -41 L-26 -70 L-16 -58 L-4 -110 L19 -94 L27 -55 L38 -63 L51 -2Z',grad(c,'#bec8c4','#637b79'));
  path(c,'M-4 -107 L6 -52 L-10 -23 L-19 0 M19 -92 L10 -46 L26 -20 M-38 -31 L-10 -43 L16 -34 L40 -42',null,'#e3e6d7b0',1.8);path(c,'M8 -50 L18 -85 L26 -53 L45 -4 L22 0Z','#4e696859',null);
 }else if(id==='urn'){
  const clay=grad(c,'#d1a17e','#946b51');path(c,'M-27 -4 Q-47 -33 -28 -65 L-22 -82 L22 -82 L28 -65 Q47 -33 27 -4 Q0 4 -27 -4Z',clay,'#8a6957',1.3);oval(c,0,-82,26,10,'#d9b293');oval(c,0,-83,19,6,'#5c5148');path(c,'M-29 -52 Q0 -42 29 -52 M-32 -30 Q0 -20 32 -30',null,'#dec1a477',2);path(c,'M-17 -67 Q-29 -34 -17 -13',null,'#e5c5a85c',3);
 }else if(id==='arch'){
  path(c,'M-52 0 L-49 -55 Q-42 -99 0 -99 Q44 -99 50 -55 L53 0 L29 0 L28 -51 Q25 -72 0 -73 Q-26 -73 -28 -51 L-29 0Z',rock,'#738a7c',1.3);
  path(c,'M-46 -63 L-26 -55 M-36 -83 L-19 -67 M-11 -96 L-8 -73 M15 -96 L10 -72 M37 -80 L23 -64 M48 -52 L28 -47 M-50 -27 L-28 -25 M30 -20 L51 -22',null,'#647e7180',1.5);path(c,'M-43 -9 L-40 -50 Q-34 -89 0 -89',null,'#e0dfc770',3);
 }else if(id==='branchwood'){
  path(c,'M-19 0 Q-4 -24 -9 -48 L-30 -68 L-46 -65 L-55 -73 L-33 -77 L-43 -95 L-37 -99 L-22 -77 L-9 -65 L-13 -100 L-5 -107 L1 -78 L5 -53 L25 -74 L27 -99 L34 -100 L34 -80 L49 -92 L54 -86 L33 -65 L11 -39 L6 -14 L28 -4 L16 1Z',wood,'#735e49',1.2);path(c,'M-10 -2 Q4 -35 -3 -62 L-8 -96 M0 -47 L29 -70 M-6 -54 L-29 -73',null,'#d5b5868c',1.1);
 }else if(id==='lighthouse'){
  stone(c,0,0,1.1,.45,rock);path(c,'M-23 -7 L-15 -77 L15 -77 L23 -7Z',grad(c,'#f0e5ca','#c1b79f'),'#a0957e',1);path(c,'M-19 -28 L19 -28 L17 -40 L-17 -40Z','#b98b7e',null);path(c,'M-16 -55 L16 -55 L15 -66 L-15 -66Z','#b98b7e',null);path(c,'M-19 -78 L-19 -95 L19 -95 L19 -78Z','#9eb6ac','#768c81',1);path(c,'M-25 -95 L0 -114 L25 -95Z','#b37f6c','#8f6e60',1);path(c,'M-24 -77 L24 -77 M-10 -94 L-10 -79 M10 -94 L10 -79',null,'#8a8170',2);path(c,'M-5 -8 L-5 -22 Q0 -30 5 -22 L5 -8Z','#708780',null);oval(c,0,-87,5,6,'#ede0a3');
 }
 c.restore();
}
window.AquariumDecorArt=Object.freeze({...old,draw});
})();
