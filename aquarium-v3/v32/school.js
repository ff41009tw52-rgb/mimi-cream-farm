import { clamp, createCreatureMesh, createStrip, octopusStroke, profileFor, TAU } from './fish-rig.js?v=3.6.0';

export function randomSource(seed) {
  let state=seed || 0x2f39b7c1;
  return ()=>{
    state^=state<<13;
    state^=state>>>17;
    state^=state<<5;
    return (state>>>0)/4294967296;
  };
}

function seedFor(id) {
  let hash=2166136261;
  for (const char of String(id)) hash=Math.imul(hash^char.charCodeAt(0),16777619);
  return hash;
}

export function angleDelta(target,current) {
  return Math.atan2(Math.sin(target-current),Math.cos(target-current));
}

function limits(fish,world) {
  const insetX=Math.min(world.width*.25,fish.width*.64+30);
  const insetY=Math.min(world.height*.25,fish.width*fish.aspect*.54+46);
  const top=Math.max(insetY,world.height*(fish.profile.habitat?.[0] ?? 0));
  const bottom=Math.min(world.height-insetY,world.height*(fish.profile.habitat?.[1] ?? 1));
  return {left:insetX,right:world.width-insetX,top,bottom:Math.max(top,bottom),insetY};
}

function chooseTarget(fish,world) {
  const {random,angle,profile}=fish;
  const {left,right,top,bottom}=limits(fish,world);
  const forward=Math.cos(angle)>=0 ? 1 : -1;
  const room=forward>0 ? right-fish.x : fish.x-left;
  const direction=room>world.width*.22 && random()>.23 ? forward : -forward;
  const travel=world.width*(.22+random()*.31);
  const yVariation=world.height*(.12+profile.rise/85);
  let y=clamp(fish.y+(random()-.5)*2*yVariation,top,bottom);
  if (direction!==forward && Math.abs(y-fish.y)<world.height*.095) {
    const turnTowardMiddle=fish.y<(top+bottom)/2 ? 1 : -1;
    y=clamp(fish.y+turnTowardMiddle*world.height*(.12+random()*.11),top,bottom);
  }
  fish.goalX=clamp(fish.x+direction*travel,left,right);
  fish.goalY=y;
  fish.targetAge=5+random()*6 + Math.abs(fish.goalX-fish.x)/fish.baseSpeed;
}

export function makeSwimmer(record, image, world, fresh) {
  const random=randomSource(seedFor(record.id));
  const profile=profileFor(record.type);
  const depth=.08+random()*.90;
  const width=profile.width*(.72+.44*depth)*(.94+.13*random());
  const aspect=(image.naturalHeight||image.height)/(image.naturalWidth||image.width);
  const baseSpeed=profile.speed*(.70+.42*depth)*(.87+.26*random());
  const side=random()<.5 ? 1 : -1;
  const band=profile.habitat;
  const y=world.height*(band ? band[0]+(band[1]-band[0])*random() : .19+.65*random());
  const x=fresh ? side>0 ? -width*.56 : world.width+width*.56 : world.width*(.11+.78*random());
  const angle=(side>0?0:Math.PI)+(fresh ? 0 : (random()-.5)*.54);
  const vertical=profile.creature==='jelly' || profile.creature==='octopus';
  const fish={
    id:record.id,type:record.type,image,aspect,profile,random,depth,width,baseSpeed,
    x,y,angle,yaw:0,speed:baseSpeed*(fresh ? 1.10 : .90),phase:random()*TAU,
    floatPhase:random()*TAU,age:0,state:fresh?'enter':'cruise',burst:0,
    paceTarget:.83+.33*random(),decisionAge:.6+random()*3.8,
    avoidX:0,avoidY:0,driftX:0,driftY:0,crowd:0,
    greet:0,feedRest:0,alarmTime:0,threat:null,intent:{x:0,y:0,weight:0,pace:1},
    mesh:profile.creature ? createCreatureMesh(depth>.52 ? 16 : 12,depth>.52 ? 18 : 14) : createStrip(depth>.52?18:10,vertical),
    fallbackMesh:profile.creature ? createCreatureMesh(8,10) : createStrip(depth>.61 ? 12 : 7,vertical),
    pose:{id:record.id,image,aspect},
  };
  if (fresh) {
    fish.goalX=world.width*(side>0 ? .27 : .73);
    const edges=limits(fish,world);
    fish.goalY=clamp(y+(random()-.5)*world.height*.14,
      profile.habitat ? edges.top : world.height*.16,profile.habitat ? edges.bottom : world.height*.83);
    fish.targetAge=Number.POSITIVE_INFINITY;
  } else chooseTarget(fish,world);
  return fish;
}

function separate(fishes) {
  for (const fish of fishes) {
    fish.avoidX=0;
    fish.avoidY=0;
    fish.driftX=0;
    fish.driftY=0;
    fish.crowd=0;
    fish.nextX=fish.x+Math.cos(fish.angle)*fish.speed*.47;
    fish.nextY=fish.y+Math.sin(fish.angle)*fish.speed*.47;
  }
  for (let i=0;i<fishes.length;i++) {
    const a=fishes[i];
    for (let j=i+1;j<fishes.length;j++) {
      const b=fishes[j];
      const depthWeight=1-Math.abs(a.depth-b.depth)*.69;
      const dx=a.nextX-b.nextX, dy=a.nextY-b.nextY;
      const rx=(a.width+b.width)*.57+13;
      const ry=(a.width*a.aspect+b.width*b.aspect)*.65+14;
      // A small sideways drift also frees slowly moving neighbors with almost identical headings.
      const closeX=(a.x-b.x)/(rx*.78), closeY=(a.y-b.y)/(ry*.76);
      const closest=Math.hypot(closeX,closeY);
      if (closest<1) {
        const strength=(1-closest)*depthWeight;
        const awayX=closest>.004 ? closeX/closest : 0;
        const awayY=closest>.004 ? closeY/closest : (i%2 ? 1 : -1);
        const driftX=awayX*strength*69, driftY=awayY*strength*114;
        a.driftX+=driftX; b.driftX-=driftX;
        a.driftY+=driftY; b.driftY-=driftY;
      }
      const ellipse=dx*dx/(rx*rx)+dy*dy/(ry*ry);
      if (ellipse>=1) continue;
      const range=Math.sqrt(ellipse);
      const strength=(1-range)*depthWeight;
      const directionX=range>.004 ? dx/(rx*range) : 0;
      const directionY=range>.004 ? dy/(ry*range) : (i%2 ? 1 : -1);
      const x=directionX*strength*.48, y=directionY*strength*1.26;
      a.avoidX+=x; b.avoidX-=x;
      a.avoidY+=y; b.avoidY-=y;
      a.crowd=Math.max(a.crowd,strength);
      b.crowd=Math.max(b.crowd,strength);
    }
  }
}

function advance(fish,world,dt) {
  const {profile, random}=fish;
  fish.age+=dt;
  fish.targetAge-=dt;
  fish.decisionAge-=dt;
  fish.burst=Math.max(0,fish.burst-dt);
  if (fish.state==='dart' && fish.burst===0) fish.state='cruise';
  if (fish.state!=='enter' && fish.decisionAge<=0) {
    fish.decisionAge=1.9+random()*4.6;
    fish.paceTarget=.75+random()*.37;
    fish.burst=random()<profile.dash ? .26+random()*.57 : 0;
    fish.state=fish.burst ? 'dart' : fish.paceTarget<.88 ? 'glide' : 'cruise';
  }

  let dx=fish.goalX-fish.x, dy=fish.goalY-fish.y;
  let range=Math.hypot(dx,dy);
  if (range<fish.width*.43 || fish.targetAge<=0) {
    if (fish.state==='enter') fish.state='cruise';
    chooseTarget(fish,world);
    dx=fish.goalX-fish.x; dy=fish.goalY-fish.y;
    range=Math.hypot(dx,dy);
  }
  const facingX=Math.cos(fish.angle), facingY=Math.sin(fish.angle);
  const {left,right,top,bottom,insetY}=limits(fish,world);
  const approachX=fish.x+facingX*fish.speed*.67;
  const approachY=fish.y+facingY*fish.speed*.67;
  const wallX=fish.state==='enter' ? 0 : (Math.max(0,left-approachX)-Math.max(0,approachX-right))/48;
  const wallY=(Math.max(0,top-approachY)-Math.max(0,approachY-bottom))/43;
  const {intent}=fish;
  const cruiseWeight=1-intent.weight;
  const targetX=dx/Math.max(1,range)*cruiseWeight+intent.x*intent.weight+clamp(fish.avoidX,-1.1,1.1)+wallX;
  const targetY=dy/Math.max(1,range)*cruiseWeight+intent.y*intent.weight+clamp(fish.avoidY,-1.6,1.6)+wallY;
  const turn=angleDelta(Math.atan2(targetY,targetX),fish.angle);
  const maxTurn=profile.turnRate*(1+.22*fish.crowd+.26*intent.weight);
  const aim=clamp(turn*2.8,-maxTurn,maxTurn);
  fish.yaw+=(aim-fish.yaw)*(1-Math.exp(-6*dt));
  fish.angle=angleDelta(fish.angle+fish.yaw*dt,0);

  const throttle=fish.state==='enter' ? 1.16 : fish.burst>0 ? 1.46 : fish.paceTarget;
  const turning=Math.min(1,Math.abs(turn)/Math.PI);
  const pace=throttle*cruiseWeight+intent.pace*intent.weight;
  const greeting=fish.type==='shark' || profile.creature==='octopus' || profile.creature==='ray' ? fish.greet*.38 : 0;
  const thrust=profile.creature==='octopus' ? .86+.34*octopusStroke(fish.phase-.62)
    : profile.creature==='jelly' ? .84+.40*octopusStroke(fish.phase-.35)
    : profile.creature==='turtle' ? .94+.12*octopusStroke(fish.phase-.4) : 1;
  const targetSpeed=fish.baseSpeed*(pace+greeting)*thrust*(1-.29*turning)*(1-.25*fish.crowd);
  fish.speed+=(targetSpeed-fish.speed)*(1-Math.exp(-(fish.burst>0?3.8:2.1)*dt));
  const verticalInset=insetY*.66;
  const edgeDrift=(Math.max(0,verticalInset-fish.y)-Math.max(0,fish.y-world.height+verticalInset))*.83;
  const driftLimit=fish.baseSpeed*.62;
  fish.x+=(Math.cos(fish.angle)*fish.speed+clamp(fish.driftX,-driftLimit,driftLimit))*dt;
  fish.y+=(Math.sin(fish.angle)*fish.speed+clamp(fish.driftY+edgeDrift,-driftLimit,driftLimit))*dt;
  const strokePace=fish.speed/fish.baseSpeed;
  fish.phase=(fish.phase+TAU*profile.tailHz*(.50+.50*strokePace)*dt)%TAU;
}

export function stepSchool(fishes,world,dt) {
  if (dt<=0 || !fishes.length) return;
  separate(fishes);
  for (const fish of fishes) advance(fish,world,dt);
}

export function resizeSchool(fishes,previous,next) {
  const sx=next.width/previous.width, sy=next.height/previous.height;
  for (const fish of fishes) {
    fish.x*=sx;
    fish.y*=sy;
    fish.goalX*=sx;
    fish.goalY*=sy;
  }
}
