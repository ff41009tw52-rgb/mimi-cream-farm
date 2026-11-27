'use strict';
window.RiverModel = (() => {
 const T=THREE,host=document.getElementById('viewport'),canvas=document.getElementById('ground'),film=document.getElementById('film'),ctx=film.getContext('2d');
 const scene=new T.Scene(),cam=new T.OrthographicCamera(-15,15,10,-10,.1,170),vec=new T.Vector3();
 let gpu=null;
 try{gpu=new T.WebGLRenderer({canvas,antialias:true,alpha:true});gpu.setClearColor(0,0)}catch(_){canvas.hidden=true}
 const mat=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}),terrain=new T.Mesh(new T.BufferGeometry(),mat),objects=new T.Mesh(new T.BufferGeometry(),mat);scene.add(terrain,objects);
 const raster=document.createElement('canvas'),rc=raster.getContext('2d');
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),lerp=(a,b,v)=>a+(b-a)*v;
 function seeded(n){return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
 const colorMap=new Map();
 function color(c,k){const key=c+'_'+Math.round(k*70);if(colorMap.has(key))return colorMap.get(key);const f=Number.parseInt(c.slice(1),16),rgb=[f>>16,(f>>8)&255,f&255].map(v=>clamp(Math.round(v*k),0,255));const val={rgb,css:'rgb('+rgb.join(',')+')'};colorMap.set(key,val);return val}
 let faces=[],groundFaces=[],propFaces=[],year=0,prevYear=-1,labels=true,shore=true,heading=-.31,tilt=.68,zoom=1,targetHeading=heading,targetTilt=tilt,targetZoom=1,top=false,dirty=true,resize=true;
 let W=900,H=520,pxRatio=1,elapsed=0,racing=false,finished=false,onFrame=()=>{},onMarker=()=>{};
 const endTimes={A:4.8,B:7.2};
 function tri(a,b,c,col,k=1){const ink=color(col,k);faces.push({a,b,c,ink})}
 function quad(a,b,c,d,col,k=1,varn=.008){tri(a,b,c,col,k);tri(a,c,d,col,k+varn)}
 function upload(target,fs){if(!gpu)return;const pa=new Float32Array(fs.length*9),cl=new Float32Array(pa.length);let n=0;for(const f of fs)for(const v of [f.a,f.b,f.c]){pa.set(v,n);const col=f.ink.rgb;cl[n]=col[0]/255;cl[n+1]=col[1]/255;cl[n+2]=col[2]/255;n+=3}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pa,3));g.setAttribute('color',new T.BufferAttribute(cl,3));target.geometry.dispose();target.geometry=g}
 const center=x=>.4+3.55*Math.cos(.245*x)-.105*x;
 const width=x=>2.03+.12*Math.cos(x*.44);
 const spread=x=>Math.exp(-x*x/26);
 function bank(x,s,t=year){return center(x)+s*width(x)+t*(s===1?.138:.155)*spread(x)}
 const edge=(x,s)=>s*(8.8-.69*Math.max(0,Math.abs(x)-10.1))+.11*Math.sin(x*1.35+s);
 function height(x,z,s,t=year){const d=Math.max(0,(z-bank(x,s,t))*s);
  const hill=s===-1?2.5*Math.exp(-((x+5)**2/13+(z+6.6)**2/5.4))+1.65*Math.exp(-((x-7.6)**2/16+(z+6.4)**2/5)):1.10*Math.exp(-((x+6.4)**2/18+(z-7.5)**2/4));
  return .09+Math.min(1,d/(s===1?.68:3.20))*(s===1?.67:.47)+hill*Math.min(1,d)+Math.min(1,d/2)*(.11*Math.cos(x*1.3-z*.4)+.15*Math.sin(x*.69+z*.6))}
 function buildGround(){
  faces=[];const N=45,walk=seeded(77),xs=i=>-12.7+25.4*i/N,bands=[0,.045,.10,.17,.27,.40,.57,.76,1];
  const green=['#90ad65','#99b56c','#a3bc75','#a9bf77','#a1b970','#99b26d'],water=['#a1d9c0','#78d3bf','#55c7b9','#3bb5b3','#2ea7aa','#279b9f','#26999e','#2b9fa1','#44b2ae','#67c4b7'];
  const land=(x,b,s)=>{const z=lerp(bank(x,s),edge(x,s),b);return [x,height(x,z,s),z]};
  const layers=[0,-.27,-.68,-.92,-1.38,-1.77,-2.07],strat=['#9b8e5b','#b48b59','#ceaa76','#b08a62','#987352','#796247'];
  function cut(a,b){const at=(v,l)=>[v[0]*(1+l*.008),l===0?v[1]:l+.055*Math.sin(v[0]*1.5+v[2]*1.9),v[2]*(1+l*.007)];for(let k=0;k<strat.length;k++)quad(at(a,layers[k]),at(b,layers[k]),at(b,layers[k+1]),at(a,layers[k+1]),strat[k],.98+.035*Math.cos((a[0]+a[2])*.76))}
  for(let i=0;i<N;i++){const x=xs(i),nx=xs(i+1);
   for(const s of [-1,1]){for(let j=0;j<bands.length-1;j++){const a=land(x,bands[j],s),b=land(nx,bands[j],s),c=land(nx,bands[j+1],s),d=land(x,bands[j+1],s);
     let col=green[Math.floor(walk()*green.length)];if(s===-1&&j<2+(Math.abs(x)<5.5?2:0))col=['#efd79e','#ecd39a','#e8cf92','#dbcc8c'][j];if(s===1&&j<2)col=j===0?'#bda782':'#b49c73';
     quad(a,b,c,d,col,.97+clamp((d[1]-a[1])*.14,-.13,.14));if(i===0)cut(a,d);if(i===N-1)cut(b,c)}
    cut(land(x,1,s),land(nx,1,s))}
   for(let j=0;j<10;j++){const point=(x,f)=>[x,.075,lerp(bank(x,-1),bank(x,1),f)];quad(point(x,j/10),point(nx,j/10),point(nx,(j+1)/10),point(x,(j+1)/10),water[j],1+.009*Math.cos(i*.8));if(i===0||i===N-1){const e=i===0?x:nx;cut(point(e,j/10),point(e,(j+1)/10))}}
  }
  groundFaces=faces;upload(terrain,faces);dirty=true
 }
 function shape(x,y,z,rx,rz,h,ratio,col,count=7,angle=0,dx=0,dz=0){const bottom=[],upper=[];for(let i=0;i<count;i++){const a=angle+i*2*Math.PI/count,s=Math.sin(a),c=Math.cos(a);bottom.push([x+rx*c,y,z+rz*s]);upper.push([x+dx+rx*c*ratio,y+h,z+dz+rz*s*ratio])}for(let i=0;i<count;i++){const j=(i+1)%count,k=.87+.17*(.5+.5*Math.cos(i*2*Math.PI/count+angle+.62));quad(bottom[i],bottom[j],upper[j],upper[i],col,k,0);tri(upper[i],upper[j],[x+dx,y+h+.015,z+dz],col,1.05)}}
 function props(){
  faces=[];const r=seeded(9601);
  function tree(x,z,s,h,dec){const y=height(x,z,s,0);shape(x,y-.02,z,h*.05,h*.05,h*.59,.75,'#786446',5);if(!dec){const col=['#426d52','#53825e','#4d7b54','#628956'][Math.floor(r()*4)];for(let j=0;j<3;j++)shape(x,y+h*(.18+j*.22),z,h*(.30-j*.052),h*(.30-j*.052),h*(.50-j*.025),.018,col,7,.4+j*.13)}else{const col=r()>.32?'#84a65b':'#a2ad59';shape(x,y+h*.34,z,h*.29,h*.28,h*.31,.94,col,8,.24);shape(x,y+h*.63,z,h*.27,h*.265,h*.36,.23,col,8,.24,-.04)}}
  const clusters=[[-8.4,-5.8,8],[-3.7,-7.4,6],[1.9,-6.6,6],[8.8,-6.2,5],[-8.3,6.7,6],[6.4,6.5,5],[10.7,2.8,4],[-11.2,1.7,3]];
  for(const [cx,cz,count] of clusters)for(let i=0;i<count*3;i++){const x=cx+(r()-.5)*5.3,z=cz+(r()-.5)*3.9,s=z>center(x)?1:-1;if(Math.abs(x)>12||s*(z-edge(x,s))>-.6||s*(z-bank(x,s,10))<1.18||Math.abs(z-bank(x,s,0))<1.12||Math.hypot(x-6.7,z+3.1)<2.5||r()<.39)continue;tree(x,z,s,1.1+r()*1.78,r()<.30)}
  for(let i=0;i<140;i++){const x=-12.1+r()*24.2,s=r()>.58?1:-1,z=bank(x,s,0)+s*(.18+r()**2*1.6),q=.065+r()**2*.24;if(s===1&&z<bank(x,1,10)+.09||s*(z-edge(x,s))>-.2)continue;shape(x,height(x,z,s,0)-.03,z,q,q*.74,q*.65,.48,s===1?'#a29980':'#c0b18a',6,r()*3)}
  const x=6.7,z=-3.1,y=height(x,z,-1,0),L=x-.92,R=x+.92,F=z+.66,B=z-.66,e=y+.80;
  const box=(x,y,z,wx,h,wz,c)=>shape(x,y,z,wx/Math.sqrt(2),wz/Math.sqrt(2),h,1,c,4,Math.PI/4);
  box(x,y-.05,z,1.58,.88,1.04,'#d2ae73');box(x+.13,y+.04,z+.53,.33,.58,.06,'#67503d');box(x-.42,y+.30,z+.53,.29,.28,.06,'#596b60');
  quad([L,e,F],[R,e,F],[R,e+.57,z],[L,e+.57,z],'#a65d43');quad([L,e,B],[R,e,B],[R,e+.57,z],[L,e+.57,z],'#bd704d');tri([L,e,F],[L,e+.57,z],[L,e,B],'#c49a63');tri([R,e,F],[R,e+.57,z],[R,e,B],'#caa16a');box(x-.5,e+.22,z-.17,.25,.53,.25,'#8c806d');
  propFaces=faces;upload(objects,faces)
 }
 props();
 function cameraUpdate(){const half=Math.max(top?10.7:9.25,15.0*H/W)/zoom;cam.left=-half*W/H;cam.right=-cam.left;cam.top=half;cam.bottom=-half;const cy=.48;cam.position.set(46*Math.sin(heading)*Math.cos(tilt),cy+46*Math.sin(tilt),46*Math.cos(heading)*Math.cos(tilt));cam.lookAt(0,cy,0);cam.updateProjectionMatrix();cam.updateMatrixWorld()}
 function project(v){vec.set(v[0],v[1],v[2]).project(cam);return [(vec.x+1)*W*.5,(1-vec.y)*H*.5,vec.z]}
 function drawBase(){if(gpu){gpu.render(scene,cam);return}rc.clearRect(0,0,W,H);const all=[];for(const fs of [groundFaces,propFaces])for(const f of fs){const a=project(f.a),b=project(f.b),c=project(f.c);all.push({a,b,c,col:f.ink.css,z:a[2]+b[2]+c[2]})}all.sort((a,b)=>b.z-a.z);
  for(const f of all){rc.beginPath();rc.moveTo(f.a[0],f.a[1]);rc.lineTo(f.b[0],f.b[1]);rc.lineTo(f.c[0],f.c[1]);rc.closePath();rc.fillStyle=f.col;rc.strokeStyle=f.col;rc.lineWidth=.42;rc.fill();rc.stroke()}}
 function stroke(points,col,weight,dash=[]){ctx.beginPath();for(let i=0;i<points.length;i++){const a=project(points[i]);if(!i)ctx.moveTo(a[0],a[1]);else ctx.lineTo(a[0],a[1])}ctx.strokeStyle=col;ctx.lineWidth=weight;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([])}
 const waveRandom=seeded(3421),streaks=Array.from({length:145},()=>[waveRandom()*24.3,.05+waveRandom()*.90,.16+waveRandom()*.49,waveRandom()]);
 function water(x,f,y=year){return [x,.10,lerp(bank(x,-1,y),bank(x,1,y),f)]}
 let paths={};
 function measure(id,f){const arr=[];let dist=0;for(let i=0;i<=160;i++){const v=water(-3.8+i*.065,f);if(i)dist+=Math.hypot(v[0]-arr[i-1].p[0],v[2]-arr[i-1].p[2]);arr.push({p:v,d:dist})}paths[id]=arr}
 function loc(id,dist){const arr=paths[id];let l=0,h=arr.length-1;while(h-l>1){const m=(l+h)>>1;if(arr[m].d<dist)l=m;else h=m}const f=clamp((dist-arr[l].d)/(arr[h].d-arr[l].d),0,1);return [lerp(arr[l].p[0],arr[h].p[0],f),.13,lerp(arr[l].p[2],arr[h].p[2],f)]}
 function floating(id,clock){const progress=clamp(elapsed/endTimes[id],0,1),d=progress*8,v=loc(id,d),base=project(v),unit=clamp(W/780,.78,1.35),col=id==='A'?'#c55a2c':'#255d86';
  if(racing&&progress>0&&progress<1){const tail=loc(id,Math.max(0,d-.74));for(const s of [-1,1])stroke([v,[tail[0],.12,tail[2]+s*.16]],'#f6f8dbe6',1.8*unit)}
  ctx.save();ctx.translate(base[0],base[1]);ctx.scale(unit,unit);ctx.beginPath();ctx.ellipse(0,.5,6,2.65,0,0,2*Math.PI);ctx.fillStyle='#17453c72';ctx.fill();ctx.translate(0,Math.sin(clock*4.1)*.56);
  ctx.beginPath();ctx.ellipse(0,-2,5.8,2.9,0,0,2*Math.PI);ctx.fillStyle='#ffedb2';ctx.fill();ctx.beginPath();ctx.arc(0,-4.1,3.9,0,2*Math.PI);ctx.fillStyle=col;ctx.fill();ctx.fillStyle='#f9f0d5';ctx.fillRect(-.65,-12,1.3,7);ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(6,-11);ctx.lineTo(0,-9);ctx.fill();ctx.restore()}
 const pinA=document.getElementById('pinA'),pinB=document.getElementById('pinB');
 function overlay(clock){ctx.clearRect(0,0,W,H);if(!gpu)ctx.drawImage(raster,0,0,raster.width,raster.height,0,0,W,H);
  for(const [start,f,len,alpha] of streaks){const x=(start+clock*(.57+f*.89))%24.4-12.5;stroke([water(x,f),water(x+len*.52,f),water(x+len,f)],'rgba(228,252,224,'+(.28+.46*alpha)+')',Math.max(1,W/720))}
  if(shore){for(const s of [-1,1]){const pts=[];for(let x=-7.8;x<=7.81;x+=.14){const z=bank(x,s,0);pts.push([x,s<0?Math.max(.15,height(x,z,s)+.035):.15,z])}stroke(pts,'#634e37c9',1.65,[5,5])}}
  for(const id of ['A','B']){const trail=[];for(let d=0;d<=8;d+=.25)trail.push(loc(id,d));stroke(trail,'#f5f3cda0',1.2,[3,6]);const e=project(loc(id,8));ctx.beginPath();ctx.ellipse(e[0],e[1],4.2,2.5,0,0,2*Math.PI);ctx.strokeStyle=id==='A'?'#994520':'#234e73';ctx.lineWidth=1.7;ctx.stroke();floating(id,clock)}
  for(const [p,x,s] of [[pinA,1.05,1],[pinB,-1.45,-1]]){const z=bank(x,s)+s*.36,q=project([x,height(x,z,s)+.24,z]);p.style.left=q[0]+'px';p.style.top=q[1]+'px'}
 }
 function view(v){top=v;targetHeading=v?0:-.31;targetTilt=v?Math.PI/2-.001:.68;targetZoom=1;dirty=true}
 const pointers=new Map();let pinch=0;
 host.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;host.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const [a,b]=pointers.values();pinch=Math.hypot(a[0]-b[0],a[1]-b[1])}});
 host.addEventListener('pointermove',e=>{const old=pointers.get(e.pointerId);if(!old)return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const [a,b]=pointers.values(),d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch>1)targetZoom=clamp(targetZoom*d/pinch,.7,1.8);pinch=d}else if(!top){targetHeading-=(e.clientX-old[0])*.008;targetTilt=clamp(targetTilt+(e.clientY-old[1])*.006,.33,1.4)}});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(ev,e=>pointers.delete(e.pointerId));
 function magnify(f){targetZoom=clamp(targetZoom*f,.7,1.8)}
 host.addEventListener('wheel',e=>{e.preventDefault();magnify(Math.exp(-e.deltaY*.0012))},{passive:false});
 host.addEventListener('keydown',e=>{if(e.target!==host)return;if(e.key==='ArrowLeft'&&!top)targetHeading-=.15;else if(e.key==='ArrowRight'&&!top)targetHeading+=.15;else if(e.key==='ArrowUp'&&!top)targetTilt=clamp(targetTilt+.12,.33,1.4);else if(e.key==='ArrowDown'&&!top)targetTilt=clamp(targetTilt-.12,.33,1.4);else if(['+','=','-'].includes(e.key))magnify(e.key==='-'?.9:1.10);else return;e.preventDefault()});
 new ResizeObserver(()=>resize=true).observe(host);
 let prev=performance.now(),clock=0;
 function frame(now){const dt=document.hidden?0:Math.min(.3,(now-prev)/1000);prev=now;clock+=dt;onFrame(dt);
  if(resize){W=Math.max(1,host.clientWidth);H=Math.max(1,host.clientHeight);pxRatio=Math.min(devicePixelRatio||1,1.65);if(gpu){gpu.setPixelRatio(pxRatio);gpu.setSize(W,H,false)}for(const surface of [raster,film]){surface.width=W*pxRatio;surface.height=H*pxRatio}ctx.setTransform(pxRatio,0,0,pxRatio,0,0);rc.setTransform(pxRatio,0,0,pxRatio,0,0);resize=false;dirty=true}
  if(year!==prevYear){buildGround();measure('A',.78);measure('B',.23);prevYear=year}
  if(Math.abs(heading-targetHeading)+Math.abs(tilt-targetTilt)+Math.abs(zoom-targetZoom)>.0004){const factor=1-Math.exp(-dt*11);heading=lerp(heading,targetHeading,factor);tilt=lerp(tilt,targetTilt,factor);zoom=lerp(zoom,targetZoom,factor);dirty=true}
  if(dirty){cameraUpdate();drawBase();document.querySelector('.north i').style.transform='rotate('+(-heading)+'rad)';dirty=false}
  overlay(clock);requestAnimationFrame(frame)}
 requestAnimationFrame(frame);
 return {endTimes,year:y=>year=y,shore:v=>shore=v,view,reset:()=>view(top),magnify,tick:fn=>onFrame=fn,setRun:(time,active)=>{elapsed=time;racing=active}};
})();
