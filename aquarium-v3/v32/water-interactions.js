import { clamp, TAU } from './fish-rig.js';

const ALARM_TIME=3.2;
const FLEE_TIME=.65;

function steer(fish,dx,dy,weight,pace) {
  const length=Math.hypot(dx,dy);
  fish.intent.x=dx/Math.max(1,length);
  fish.intent.y=dy/Math.max(1,length);
  fish.intent.weight=weight;
  fish.intent.pace=pace;
}

function hitFish(fishes,x,y) {
  for (let i=fishes.length-1;i>=0;i--) {
    const fish=fishes[i], {pose}=fish;
    if (!pose.width) continue;
    const dx=x-pose.x, dy=y-pose.y;
    const cos=Math.cos(pose.angle), sin=Math.sin(pose.angle);
    const u=(dx*cos+dy*sin)/Math.max(17,pose.width*.48);
    const v=(dy*cos-dx*sin)/Math.max(13,pose.width*pose.aspect*.45);
    if (u*u+v*v<=1) return fish;
  }
  return null;
}

export function createWaterInteractions(stage,canvas,getFish) {
  const ctx=canvas.getContext('2d');
  const hint=stage.querySelector('#water-hint');
  const pellets=[], bubbles=[], rings=[], sharks=[], followers=[], groups=new Map();
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

  function dropFood(where) {
    const x=clamp(where.x,width*.08/scale,width*.92/scale);
    const y=clamp(where.y,height*.1/scale,height*.76/scale);
    if (pellets.length>24) pellets.splice(0,pellets.length-24);
    for (let i=0;i<6;i++) {
      pellets.push({x:x+(i-2.5)*12,y:y-4-i%3*11,age:0,phase:i*1.6,radius:4+i%3*.6});
    }
    ring(where.x,where.y);
  }

  function greet(fish) {
    fish.greet=.8;
    const x=fish.pose.x/scale+Math.cos(fish.angle)*fish.width*.4;
    const y=fish.pose.y/scale+Math.sin(fish.angle)*fish.width*.4;
    bubble(x,y,fish.type==='clown' ? 8 : 4);
  }

  stage.addEventListener('pointerdown',event=>{
    if (!enabled || gesture || event.button!==0 || !event.isPrimary || event.target.closest('header,dialog,button,a')) return;
    const start=point(event);
    gesture={id:event.pointerId,...start,fish:hitFish(getFish(),start.x*scale,start.y*scale)};
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove',event=>{
    if (gesture?.id!==event.pointerId) return;
    const where=point(event);
    if (!guide && Math.hypot(where.x-gesture.x,where.y-gesture.y)*scale<12) return;
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
      else if (gesture.fish && getFish().includes(gesture.fish)) greet(gesture.fish);
      else dropFood(where);
    }
    gesture=guide=null;
  }
  stage.addEventListener('pointerup',finish);
  stage.addEventListener('pointercancel',finish);
  stage.addEventListener('lostpointercapture',finish);
  stage.addEventListener('keydown',event=>{
    if (!enabled || event.target!==stage || event.repeat || (event.key!=='Enter' && event.key!==' ')) return;
    event.preventDefault();
    dropFood({x:width*.5/scale,y:height*.45/scale});
  });

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

  function forage(fish) {
    if (fish.feedRest>0) return false;
    let target=null, best=(fish.type==='shark' ? 184 : 234)**2;
    const noticeDelay=.13+fish.depth*.65;
    for (const pellet of pellets) {
      if (pellet.eaten || pellet.age<noticeDelay) continue;
      const distance=(pellet.x-fish.x)**2+(pellet.y-fish.y)**2;
      if (distance<best) { target=pellet; best=distance; }
    }
    if (!target) return false;
    const dx=target.x-fish.x, dy=target.y-fish.y;
    const length=Math.sqrt(best);
    const mouthDistance=Math.hypot(dx-Math.cos(fish.angle)*fish.width*.34,dy-Math.sin(fish.angle)*fish.width*.34);
    if (mouthDistance<19 || length<17) {
      target.eaten=true;
      fish.feedRest=1.4+fish.depth*1.6;
      bubble(target.x,target.y,2);
      return false;
    }
    steer(fish,dx,dy,.94,length>70 ? 1.53 : .84);
    return true;
  }

  function step(dt,world) {
    for (const pellet of pellets) {
      pellet.age+=dt;
      pellet.x+=Math.sin(pellet.age*1.9+pellet.phase)*7*dt;
      pellet.y=Math.min(world.height*.86,pellet.y+11*dt);
    }
    for (const list of [pellets,bubbles,rings]) for (let i=list.length-1;i>=0;i--) {
      const item=list[i];
      if (list!==pellets) item.age+=dt;
      if (item.eaten || item.age>(list===pellets ? 7.2 : list===bubbles ? 1.35 : .72)) list.splice(i,1);
    }
    const fishes=getFish();
    groups.clear();
    sharks.length=followers.length=0;
    for (const fish of fishes) {
      fish.intent.weight=0;
      fish.feedRest=Math.max(0,fish.feedRest-dt);
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
      } else if (!pellets.length || !forage(fish)) {
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
    const active=Boolean(guide || pellets.length || bubbles.length || rings.length);
    if (!active && !visible) return;
    visible=active;
    ctx.setTransform(resolution*scale,0,0,resolution*scale,0,0);
    ctx.clearRect(0,0,width/scale,height/scale);
    for (const pellet of pellets) {
      if (pellet.eaten) continue;
      ctx.globalAlpha=clamp((7.2-pellet.age)*2,0,1);
      circle(pellet.x,pellet.y,pellet.radius);
      ctx.fillStyle='#ffd589';
      ctx.fill();
      ctx.strokeStyle='#5e623d';
      ctx.lineWidth=1.2;
      ctx.stroke();
    }
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
      pellets.length=bubbles.length=rings.length=0;
      for (const fish of getFish()) {
        fish.intent.weight=fish.greet=fish.alarmTime=0;
        fish.threat=null;
      }
      draw();
    },
  };
}
