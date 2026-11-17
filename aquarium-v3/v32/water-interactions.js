import { clamp, TAU } from './fish-rig.js?v=3.6.3';
import { canvasFishRenderer } from './fish-renderers.js?v=3.6.0';

const ALARM_TIME=3.2;
const FLEE_TIME=.65;

function steer(fish,dx,dy,weight,pace) {
  const length=Math.hypot(dx,dy);
  fish.intent.x=dx/Math.max(1,length);
  fish.intent.y=dy/Math.max(1,length);
  fish.intent.weight=weight;
  fish.intent.pace=pace;
}


export function createWaterInteractions(stage,canvas,getFish) {
  const ctx=canvas.getContext('2d');
  const hint=stage.querySelector('#water-hint');
  // Sample only around the pointer, using the same artwork and pose as the display.
  const pickRadius=4;
  const pickSize=2*pickRadius+1;
  const pickCanvas=document.createElement('canvas');
  const pickContext=pickCanvas.getContext('2d',{alpha:true,willReadFrequently:true});
  const picker=canvasFishRenderer(pickCanvas);
  picker.resize(pickSize,pickSize,1);
  const bubbles=[], rings=[], sharks=[], followers=[], groups=new Map();
  let width=1,height=1,scale=1,resolution=1,visible=false,enabled=true;
  let gesture=null,guide=null;

  function point(event) {
    const rect=stage.getBoundingClientRect();
    return {x:clamp(event.clientX-rect.left,0,width)/scale,y:clamp(event.clientY-rect.top,0,height)/scale};
  }

  function ring(x,y) {
    if (rings.length>=12) rings.shift();
    rings.push({x,y,age:0});
  }

  function bubble(x,y,amount) {
    while (bubbles.length+amount>54) bubbles.shift();
    for (let i=0;i<amount;i++) {
      bubbles.push({x:x+(Math.random()-.5)*12,y,drift:(Math.random()-.5)*29,
        lift:22+Math.random()*30,radius:3+Math.random()*5,age:0});
    }
  }

  function hitFish(x,y) {
    const fishes=getFish();
    let nearest=null;
    let bestDistance=pickRadius**2+1;
    for (let i=fishes.length-1;i>=0;i--) {
      const fish=fishes[i], {pose}=fish;
      if (!pose.width) continue;
      const dx=x-pose.x, dy=y-pose.y;
      const cos=Math.cos(pose.angle), sin=Math.sin(pose.angle);
      const bodyX=dx*cos+dy*sin, bodyY=dy*cos-dx*sin;
      if (Math.abs(bodyX)>pose.width*.70+pickRadius ||
          Math.abs(bodyY)>pose.width*(pose.aspect*.60+.15)+pickRadius) continue;
      picker.draw([{...pose,x:pickSize/2-dx,y:pickSize/2-dy}]);
      const {data}=pickContext.getImageData(0,0,pickSize,pickSize);
      const center=pickRadius*pickSize+pickRadius;
      if (data[center*4+3]>=32) return fish;
      // Prefer a direct hit, even through a transparent part of a foreground fish.
      for (let row=0;row<pickSize;row++) for (let col=0;col<pickSize;col++) {
        const distance=(row-pickRadius)**2+(col-pickRadius)**2;
        if (distance>=bestDistance || data[(row*pickSize+col)*4+3]<32) continue;
        nearest=fish;
        bestDistance=distance;
      }
    }
    return nearest;
  }

  function greet(fish,where) {
    fish.greet=.8;
    ring(where.x,where.y);
    bubble(where.x,where.y,fish.type==='clown' ? 8 : 6);
  }

  stage.addEventListener('pointerdown',event=>{
    if (!enabled || gesture || event.button!==0 || !event.isPrimary || event.target.closest('header,dialog,button,a')) return;
    const start=point(event);
    gesture={id:event.pointerId,...start,fish:hitFish(start.x*scale,start.y*scale)};
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove',event=>{
    if (gesture?.id!==event.pointerId) return;
    const where=point(event);
    const dragThreshold=event.pointerType==='touch' ? 16 : 12;
    if (!guide && Math.hypot(where.x-gesture.x,where.y-gesture.y)*scale<dragThreshold) return;
    if (!guide || Math.hypot(where.x-guide.trailX,where.y-guide.trailY)>24) {
      bubble(where.x,where.y,2);
      guide={...where,trailX:where.x,trailY:where.y};
    } else {
      guide.x=where.x;
      guide.y=where.y;
    }
  });
  function finish(event) {
    if (gesture?.id!==event.pointerId) return;
    if (event.type==='pointerup') {
      const where=point(event);
      if (guide) ring(guide.x,guide.y);
      else if (gesture.fish && getFish().includes(gesture.fish)) greet(gesture.fish,where);
    }
    gesture=guide=null;
  }
  stage.addEventListener('pointerup',finish);
  stage.addEventListener('pointercancel',finish);
  stage.addEventListener('lostpointercapture',finish);
  function updateAlarm(fish,dt) {
    let threat=null, nearest=Infinity;
    if (fish.type!=='shark' && fish.state!=='enter') {
      for (const shark of sharks) {
        if (Math.abs(shark.depth-fish.depth)>.48) continue;
        const distance=(fish.x-shark.x)**2+((fish.y-shark.y)*1.24)**2;
        if (distance<nearest && distance<(shark.width*.58+83)**2) {
          nearest=distance;
          threat=shark;
        }
      }
    }
    if (threat) {
      fish.threat=threat;
      fish.alarmTime=ALARM_TIME;
    } else {
      fish.alarmTime=Math.max(0,fish.alarmTime-dt);
      if (fish.alarmTime===0) fish.threat=null;
    }
    if (!fish.threat) return;
    let group=groups.get(fish.threat);
    if (!group) groups.set(fish.threat,group={x:0,y:0,count:0});
    group.x+=fish.x;
    group.y+=fish.y;
    group.count++;
  }

  function step(dt,world) {
    for (const [list,lifetime] of [[bubbles,1.35],[rings,.72]]) {
      for (let i=list.length-1;i>=0;i--) {
        list[i].age+=dt;
        if (list[i].age>lifetime) list.splice(i,1);
      }
    }
    const fishes=getFish();
    groups.clear();
    sharks.length=followers.length=0;
    for (const fish of fishes) {
      fish.intent.weight=0;
      fish.greet=Math.max(0,fish.greet-dt);
      if (fish.type==='shark' && fish.x>0 && fish.x<world.width) sharks.push(fish);
      if (guide && fish.state!=='enter' && guideDistance(fish)<252**2) followers.push(fish);
    }
    if (followers.length>5) {
      followers.sort((a,b)=>guideDistance(a)-guideDistance(b));
      followers.length=5;
    }
    for (const fish of fishes) updateAlarm(fish,dt);
    for (const fish of fishes) {
      if (fish.state==='enter') continue;
      if (fish.alarmTime>ALARM_TIME-FLEE_TIME) {
        const dx=fish.x-fish.threat.x, dy=fish.y-fish.threat.y;
        steer(fish,dx,dy || Math.sin(fish.floatPhase)*10,.94,2.06);
      } else if (guide && followers.includes(fish)) {
        const dx=guide.x-fish.x, dy=guide.y-fish.y;
        const distance=Math.hypot(dx,dy);
        steer(fish,dx,dy,clamp(distance/55,.2,.94),distance>80 ? 1.66 : .78);
      } else {
        const group=groups.get(fish.threat);
        if (group?.count>1) {
          const dx=group.x/group.count-fish.x, dy=group.y/group.count-fish.y;
          if (Math.hypot(dx,dy)>fish.width*.55) steer(fish,dx,dy,.67,1.16);
        }
      }
    }
  }

  function guideDistance(fish) { return (guide.x-fish.x)**2+(guide.y-fish.y)**2; }

  function circle(x,y,radius) {
    ctx.beginPath();
    ctx.arc(x,y,radius,0,TAU);
  }

  function draw() {
    const active=Boolean(guide || bubbles.length || rings.length);
    if (!active && !visible) return;
    visible=active;
    ctx.setTransform(resolution*scale,0,0,resolution*scale,0,0);
    ctx.clearRect(0,0,width/scale,height/scale);
    ctx.lineWidth=2.2;
    ctx.strokeStyle='#d4fff7';
    for (const {x,y,age,drift,lift,radius} of bubbles) {
      ctx.globalAlpha=.84*(1-age/1.35);
      circle(x+drift*age,y-lift*age,radius+age*3);
      ctx.stroke();
    }
    for (const {x,y,age} of rings) {
      ctx.globalAlpha=.77*(1-age/.72);
      circle(x,y,7+age*40);
      ctx.stroke();
    }
    if (guide) {
      ctx.globalAlpha=.92;
      circle(guide.x,guide.y,14);
      ctx.fillStyle='#a9f3e65a';
      ctx.fill();
      ctx.stroke();
      circle(guide.x-14,guide.y+13,5);
      ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  return {
    step,draw,
    resize(w,h,units) {
      width=w;
      height=h;
      scale=units;
      resolution=Math.min(1,1400/Math.max(w,h));
      canvas.width=Math.round(w*resolution);
      canvas.height=Math.round(h*resolution);
      draw();
    },
    setEnabled(value) {
      enabled=value;
      hint.hidden=!value;
      if (value) return;
      gesture=guide=null;
      bubbles.length=rings.length=0;
      for (const fish of getFish()) {
        fish.intent.weight=fish.greet=fish.alarmTime=0;
        fish.threat=null;
      }
      draw();
    },
  };
}
