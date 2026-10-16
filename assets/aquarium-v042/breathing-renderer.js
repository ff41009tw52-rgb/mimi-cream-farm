// Extracted verbatim from fish-breathing-review.html. Do not redraw.
(()=>{

const FishRenderer=(()=>{
 const jaw='M61 579Q85 581 121 603Q175 627 272 625L288 700L35 700L35 577Z';
 const cover='M314 445Q371 438 401 496Q424 551 393 608Q369 650 308 668L275 652Q310 608 304 542Q296 482 314 445Z';
 const path=s=>new Path2D(s);
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 function prepare(image,factory){
  const fixed=factory(1536,1024),j=factory(310,170),lid=factory(160,250);
  fixed.width=1536;fixed.height=1024;j.width=310;j.height=170;lid.width=160;lid.height=250;
  const f=fixed.getContext('2d');f.clip(path('M-300 -300H2000V1500H-300Z '+jaw+' '+cover),'evenodd');f.drawImage(image,0,0,1536,1024);
  const q=j.getContext('2d');q.translate(-30,-570);q.clip(path(jaw));q.drawImage(image,0,0,1536,1024);
  const l=lid.getContext('2d');l.translate(-270,-435);l.clip(path(cover));l.drawImage(image,0,0,1536,1024);
  const gills=factory(160,250);gills.width=160;gills.height=250;
  const g=gills.getContext('2d');g.translate(-270,-435);paintGills(g);
  return{fixed,jaw:j,lid,gills};
 }
 const jawShift=x=>36*Math.pow(clamp(1-(x-60)/120),1.3);
 function motion(p){p=clamp(p,0,100);return{mouth:p<50?Math.pow(Math.max(0,Math.sin(Math.PI*p/50)),.85):0,cover:p>=50?Math.pow(Math.max(0,Math.sin(Math.PI*(p-50)/50)),.85):0};}
 function stroke(ctx,d,color,width,dashes=[]){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(dashes);ctx.stroke(path(d));ctx.setLineDash([]);}
 function arrow(ctx,d,x,y,angle,color,width=10){stroke(ctx,d,color,width);ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=color;ctx.fill(path('M0 0L-26 -13L-21 0L-26 13Z'));ctx.restore();}
 // Layered gill arches with dense filaments, following the supplied textbook reference.
 // The opening amplitude is intentionally exaggerated for classroom observation.
 function paintGills(ctx){
  ctx.save();ctx.clip(path(cover));
  const bed=ctx.createLinearGradient(285,470,414,610);
  bed.addColorStop(0,'#f0b8a5');bed.addColorStop(.45,'#a92d35');bed.addColorStop(1,'#efbaa4');
  ctx.fillStyle=bed;ctx.fill(path(cover));
  for(let layer=0;layer<4;layer++){
   const x0=323-layer*9,bulge=49-layer*6,top=459+layer*12,span=194-layer*12;
   const root=t=>[x0+Math.sin(Math.PI*t)*bulge,top+span*t];
   for(let i=0;i<76;i++){
    const t=i/75,[x,y]=root(t),len=(17+15*Math.sin(Math.PI*t))*(1-layer*.10);
    const dx=len*(.65+.35*Math.sin(Math.PI*t)),dy=(t-.5)*len*.95;
    const grad=ctx.createLinearGradient(x,y,x+dx,y+dy);
    grad.addColorStop(0,layer%2?'#9c1f32':'#b32638');grad.addColorStop(.55,'#d94a57');grad.addColorStop(1,'#f18a88');
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+dx*.58,y+dy*.25-2,x+dx,y+dy);
    ctx.lineWidth=3.2;ctx.lineCap='round';ctx.strokeStyle='#8e2634';ctx.stroke();
    ctx.lineWidth=1.9;ctx.strokeStyle=grad;ctx.stroke();
   }
   ctx.beginPath();for(let i=0;i<=40;i++){const [x,y]=root(i/40);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}
   ctx.strokeStyle='#f39b91';ctx.lineWidth=4;ctx.stroke();
   ctx.strokeStyle='#bb4149';ctx.lineWidth=1.3;ctx.stroke();
  }
  stroke(ctx,'M313 450Q371 437 403 499Q426 559 390 613Q362 653 310 667','#edc7a7',4);
  ctx.restore();
 }
 function draw(ctx,img,opts={}){
  const p=opts.progress??25,m=motion(p),w=ctx.canvas.width,h=ctx.canvas.height;
  const view=opts.closeup?[-65,395,640,355]:[-145,70,1800,875];
  ctx.clearRect(0,0,w,h);ctx.save();const scale=Math.min(w/view[2],h/view[3]);ctx.translate((w-view[2]*scale)/2,(h-view[3]*scale)/2);ctx.scale(scale,scale);ctx.translate(-view[0],-view[1]);
  if(!img){ctx.restore();return;}
  // Leave the mouth opening transparent so it always matches the page background.
  ctx.drawImage(img.fixed,0,0);
  ctx.drawImage(img.gills,270,435);
  ctx.save();ctx.globalAlpha=opts.cutaway?.04:1;
  ctx.translate(270,435);ctx.scale(1-m.cover*.30,1);ctx.translate(-270,-435);
  ctx.drawImage(img.lid,270,435);
  if(m.cover>.01){ctx.globalAlpha=(opts.cutaway?.10:.95)*m.cover;stroke(ctx,'M314 445Q371 438 401 496Q424 551 393 608Q369 650 308 668','#f5dc9c',5);}
  ctx.restore();
  if(m.mouth<.001)ctx.drawImage(img.jaw,30,570);else for(let x=0;x<310;x+=3){const sw=Math.min(3,310-x);ctx.drawImage(img.jaw,x,0,sw,170,30+x,570+m.mouth*jawShift(30+x+sw/2),sw+.25,170);}
  if(m.mouth>.02){ctx.globalAlpha=m.mouth*.75;stroke(ctx,'M65 578Q90 583 116 601','#9b7f50',2);ctx.globalAlpha=1;}
  const inlet=opts.inlet,inside=opts.inside,outlet=opts.outlet;
  if(inlet)arrow(ctx,'M-125 631Q-45 612 54 602',54,602,-.10,'#2188b4',9);
  if(inside){ctx.globalAlpha=.85;stroke(ctx,'M138 601Q234 560 340 556','#2188b4',8,[14,12]);ctx.globalAlpha=1;}
  if(outlet)arrow(ctx,'M390 580Q452 628 546 653',546,653,.3,'#2188b4',9);
  if(opts.gas){
   const g=clamp(opts.gasProgress||0);
   if(g>.55)arrow(ctx,'M341 552Q427 491 526 502',526,502,0,'#b77b18',5);
   for(let i=0;i<5;i++){let x,y;const sx=-96+i*24,sy=606+(i%2)*16;if(g<.55){const t=g/.55;x=sx+(341-sx)*t;y=sy+(553-sy)*t;}else{const t=(g-.55)/.45;if(i<3){x=341+(502+i*23-341)*t;y=553+(481+i*22-553)*t;}else{x=341+(525+(i-3)*25-341)*t;y=553+(650+(i-3)*20-553)*t;}}ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fillStyle='#d59a2e';ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle='#fff4d5';ctx.stroke();}
  }
  if(Number.isInteger(opts.route)){const points=[[-100,628],[70,602],[341,557],[540,653]],pos=points[clamp(opts.route,0,3)];ctx.beginPath();ctx.arc(pos[0],pos[1],13,0,Math.PI*2);ctx.fillStyle='#2188b4';ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='white';ctx.stroke();}
  if(opts.highlight){const q={mouth:[88,607,64,56],cover:[375,554,52,112],gills:[337,555,51,89]}[opts.highlight];if(q){ctx.beginPath();ctx.ellipse(...q,0,0,Math.PI*2);ctx.strokeStyle='#b48324';ctx.lineWidth=3.5;ctx.setLineDash([8,7]);ctx.stroke();ctx.setLineDash([]);}}
  ctx.restore();return m;
 }
 return {draw,motion,prepare};
})();
window.AquariumBreathingRenderer=FishRenderer;
})();
