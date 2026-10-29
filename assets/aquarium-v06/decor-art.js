/* Shared, deterministic 2D decoration art. Textures are drawn only into cached backgrounds/previews. */
(() => {
'use strict';
const P={river:{top:'#ded1b5',bottom:'#b8a68a',grain:['#f0e6d1','#bdac91','#d0bea0','#a49580']},white:{top:'#eeece3',bottom:'#cfcec7',grain:['#faf8ef','#d6d5ce','#e4e2d8','#bfc3bc']},black:{top:'#596360',bottom:'#343e3e',grain:['#77817a','#414d4a','#65706b','#a0a79b']}};
function path(c,d,fill,stroke,width=1){const p=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(p);}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke(p);}return p;}
function oval(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
function gradient(c,a,b,top,bottom){const g=c.createLinearGradient(-25,a,30,b);g.addColorStop(0,top);g.addColorStop(1,bottom);return g;}
function sand(c,id,width,height){
 const p=P[id]||P.river;c.fillStyle=gradient(c,0,height,p.top,p.bottom);c.fillRect(0,0,width,height);
 // Different grain geometry, density and dune shading; fixed budget, independent of canvas pixels.
 let seed=73;const rnd=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
 const count=id==='white'?180:id==='black'?230:270;
 for(let i=0;i<count;i++){const x=rnd()*width,y=rnd()*height,col=p.grain[i%4],r=(id==='river'?.55+rnd()*1.65:id==='white'?.4+rnd()*.8:.45+rnd()*1.1)*Math.max(.7,Math.min(1.2,width/650));
  if(id==='black'){path(c,`M${x-r} ${y} l${r*.8} ${-r*.65} l${r*1.4} ${r*.4} l${-r*.5} ${r*.8}Z`,col);}
  else oval(c,x,y,r,id==='river'?r*.55:r*.35,col);
 }
 c.globalAlpha=.24;
 for(let i=0;i<3;i++){const y=height*(.25+i*.27);path(c,`M0 ${y} Q${width*.25} ${y-height*.12} ${width*.55} ${y} T${width} ${y-height*.02}`,null,id==='black'?'#9ca69b':id==='white'?'#ffffff':'#f6eedf',id==='white'?2.4:1.2);}
 c.globalAlpha=1;
}
function leaf(c,x,y,dx,dy,w,fill){
 const tx=x+dx,ty=y+dy,curve=dx*.22;
 const outline=path(c,`M${x} ${y} C${x+curve-w} ${y+dy*.34} ${tx-w*.6} ${ty+Math.abs(dy)*.12} ${tx} ${ty} C${tx+w*.45} ${ty+Math.abs(dy)*.33} ${x+dx*.62+w} ${y+dy*.65} ${x} ${y}Z`,fill,'#3e79673b',.6);
 c.save();c.clip(outline);const light=c.createLinearGradient(x-w,y,tx+w,ty);light.addColorStop(0,'#284e4829');light.addColorStop(.5,'#f1edb82b');light.addColorStop(1,'#ffffdd09');c.fillStyle=light;c.fillRect(-80,-130,160,140);
 path(c,`M${x} ${y} Q${x+dx*.48-2} ${y+dy*.55} ${tx} ${ty}`,null,'#e5ebba80',.65);
 for(let j=1;j<5;j++){const t=j/6,xx=x+dx*t,yy=y+dy*t;path(c,`M${xx} ${yy} q${-w*.45} ${dy*.07} ${-w*.6} ${dy*.12} M${xx} ${yy} q${w*.48} ${dy*.03} ${w*.62} ${dy*.09}`,null,'#dce9b53b',.45);}c.restore();
}
function draw(c,id,x,y,width,height){
 c.save();c.translate(x,y);c.scale(width/100,height/100);
 const green=gradient(c,-100,0,'#a4c898','#43866c'),rock=gradient(c,-100,0,'#d5d7c9','#7c9188'),wood=gradient(c,-95,0,'#c4ab83','#806647');
 if(P[id]){const shape=path(c,'M-57 -31 L-24 -48 L59 -33 L25 -8Z',P[id].top);c.save();c.clip(shape);c.translate(-60,-50);sand(c,id,120,50);c.restore();}
 else if(id==='smallplant'){
  oval(c,0,-2,31,5,'#4f7a5b30');
  // A compact rosette of broad leaves, not a miniature stem plant.
  for(const [dx,dy,w]of [[-30,-65,11],[29,-69,11],[-45,-40,14],[43,-43,14],[-14,-93,12],[13,-98,12],[-31,-24,12],[31,-25,12],[0,-72,13]])leaf(c,0,-2,dx,dy,w,green);
  path(c,'M-13 -3 Q0 -14 14 -3',null,'#62855b',2);
 }else if(id==='tallplant'){
  // Tall ribbon leaves curl independently; silhouette differs from the rosette.
  for(const [base,tip,dy,w]of [[-20,-40,-78,12],[21,45,-87,11],[-8,-22,-100,13],[11,23,-98,11],[0,-4,-109,12]]){
   path(c,`M${base} 0 C${base-18} -37 ${tip+25} ${dy+14} ${tip} ${dy} C${tip-w} ${dy+28} ${base+w} -31 ${base+6} 0Z`,green,'#4a846c',.7);
   path(c,`M${base+3} -5 Q${tip+10} ${dy*.62} ${tip} ${dy+3}`,null,'#d2e0b678',.85);
  }
 }else if(id==='moss'){
  oval(c,0,-13,49,17,'#567a5d');
  for(let i=0;i<25;i++){const xx=-45+i*3.7,yy=-9-(i*13%17);const tone=i%3===0?'#a4bd88':i%3===1?'#77a375':'#5d906b';path(c,`M${xx} -3 Q${xx-4} ${yy-12} ${xx+2} ${yy-16} M${xx} ${yy-3} l-6 -5 M${xx+1} ${yy-6} l6 -5`,null,tone,2);}
 }else if(id==='smallrock'||id==='bigrock'){
  const shape=id==='smallrock'?'M-48 -3 Q-56 -30 -29 -61 Q-9 -83 15 -66 Q42 -64 49 -19 Q53 -4 35 0 L-30 0Z':'M-50 -4 Q-55 -40 -35 -68 Q-22 -103 9 -96 Q33 -91 38 -59 Q57 -37 49 -2Z';
  const clip=path(c,shape,rock,'#748b8066',1);
  c.save();c.clip(clip);const light=c.createRadialGradient(-22,-63,3,-5,-40,70);light.addColorStop(0,'#f4efdb88');light.addColorStop(1,'#314f4838');c.fillStyle=light;c.fillRect(-60,-110,120,115);path(c,'M-40 -32 Q-27 -50 -7 -44 T27 -57',null,'#f0ebd64d',1.4);
  for(let i=0;i<30;i++)oval(c,-46+(i*31)%93,-5-(i*19)%89,.6+i%3*.5,.55,i%2?'#f1eedd45':'#415e5c25');
  path(c,'M-19 -67 l7 20 -8 12 M12 -44 l8 15 -4 10',null,'#60796d6b',.9);c.restore();
  if(id==='bigrock'){path(c,'M-42 -21 Q-37 -35 -25 -32 Q-14 -25 -18 -17Z','#7f9d7d');path(c,'M-40 -24 l9 -4 7 4',null,'#c0cba277',1);}
 }else if(id==='cave'){
  path(c,'M-53 0 Q-57 -38 -32 -78 Q-13 -108 18 -92 Q48 -75 53 0Z',rock,'#758b7f',1.3);
  path(c,'M-46 -34 Q-41 -71 -19 -87 L-5 -83 L-16 -57Z','#dfe2ce70');path(c,'M26 -65 Q44 -49 49 -7 L35 0 L21 -38Z','#71877c7a');
  const dark=gradient(c,-70,0,'#263f3e','#56716a');path(c,'M-25 0 Q-30 -61 1 -66 Q34 -66 29 0Z',dark,'#728c78',2.5);
  path(c,'M-26 -3 Q-28 -61 1 -66 Q23 -68 30 -27',null,'#c3cdb19c',3);
  path(c,'M-21 -2 Q1 -12 25 -2Z','#9aab8f');
  path(c,'M-39 -58 l8 -9 8 3 M25 -69 l6 12 M-44 -18 l10 2',null,'#758d7b7a',1);
  oval(c,-26,-72,9,4,'#88a481');
 }else if(id==='wood'){
  path(c,'M-52 -4 Q-29 -23 -37 -51 L-45 -79 Q-38 -94 -29 -88 Q-16 -59 -9 -40 Q0 -57 1 -78 Q11 -87 16 -77 Q16 -50 4 -31 Q29 -41 43 -62 L54 -56 Q41 -23 15 -13 Q-14 6 -52 -4Z',wood,'#75634d',1.4);
  for(let i=0;i<5;i++)path(c,`M${-37+i*2} ${-77+i*2} Q${-20+i*2} -24 ${11+i*3} ${-22-i*2} Q34 ${-34-i*2} 45 ${-55+i}`,null,i%2?'#e0c49a8c':'#6d563b66',1);
  oval(c,-35,-83,7,4,'#dbca9d');oval(c,-35,-83,3,1.6,'#9a7c55');oval(c,47,-58,5,3,'#d2ba8a');
  path(c,'M-19 -4 Q-8 -17 6 -9 L13 -5Z','#729273');
 }else if(id==='ship'){
  // Splintered hull, open broken deck, leaning mast and torn sail.
  path(c,'M-58 -38 L-40 -35 L-30 -40 L-21 -29 L-9 -34 L4 -26 L18 -35 L27 -29 L56 -43 Q42 -4 22 0 L-28 -3 Q-48 -10 -58 -38Z',wood,'#74634d',1.6);
  path(c,'M-51 -32 Q-13 -16 48 -35',null,'#d6bd8b',2.5);
  path(c,'M-46 -21 Q-8 -5 40 -21 M-37 -11 L25 -7',null,'#6e563d',1.4);
  path(c,'M-20 -29 L-29 -98 M7 -28 L14 -71',null,'#7d694e',4);
  path(c,'M-28 -94 Q-6 -91 17 -76 L1 -71 L4 -62 L-12 -60 L-24 -64Z','#d5d2b3','#9c9d81',1);
  path(c,'M15 -69 L36 -50 L23 -51 L10 -43Z','#aabb9f','#879b86',.8);
  for(const xx of [-31,-10,16]){oval(c,xx,-20,5.5,7,'#4c6058');path(c,`M${xx-5} -23 Q${xx} -31 ${xx+5} -23`,null,'#bfa67a',1);}
  path(c,'M-5 -23 l5 8 -7 6 2 8',null,'#3d5550',2.7);oval(c,34,-8,9,3,'#7b9676');
 }else if(id==='chest'){
  const planks=gradient(c,-90,0,'#c3a26b','#8c6945');
  path(c,'M-39 -8 L-39 -54 L31 -54 L40 -43 L40 -8 L-31 0Z',planks,'#756148',1.5);
  path(c,'M31 -54 L40 -43 L40 -8 L31 -4Z','#785d3e');
  path(c,'M-40 -54 Q-43 -96 -3 -99 Q28 -100 32 -68 L32 -54Z',planks,'#7d6747',1.6);
  for(const xx of [-26,-8,11])path(c,`M${xx} -88 L${xx} -59 M${xx} -49 L${xx} -8`,null,'#70583c70',1);
  path(c,'M-26 -90 Q-30 -73 -26 -55 L-25 -5 M18 -93 Q25 -74 23 -55 L24 -5 M-38 -53 L32 -53',null,'#d8c083',4.2);
  for(const [xx,yy]of [[-26,-70],[23,-70],[-25,-16],[24,-16]])oval(c,xx,yy,1.5,1.8,'#8b7956');
  path(c,'M-7 -57 L7 -57 L7 -39 L-7 -39Z','#ead396','#9e8759',.9);oval(c,0,-49,1.5,2.5,'#715b3c');
 }
 c.restore();
}
window.AquariumDecorArt=Object.freeze({draw,sand,palettes:P});
})();
