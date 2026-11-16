export const TAU = Math.PI * 2;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const smoothstep = (start, end, value) => {
  const t = clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
};

// The original fish face right. Creature templates use their own orientation.
export const SPECIES = {
  clown:     {speed:66, width:110, tailHz:1.82, amplitude:.09, hinge:.72, wave:5.3, beat:.15, turnRate:2.08, rise:15, float:2.4, dash:.38},
  butterfly: {speed:43, width:102, tailHz:1.36, amplitude:.065, hinge:.78, wave:4.9, beat:.06, turnRate:1.68, rise:12, float:2.5, dash:.05},
  puffer:    {speed:33, width:100, tailHz:1.62, amplitude:.032, hinge:.78, wave:4.6, beat:.20, turnRate:1.52, rise:10, float:5.1, dash:0},
  shark:     {speed:75, width:174, tailHz:1.08, amplitude:.084, hinge:.75, wave:5.7, beat:.025, turnRate:1.57, rise:8, float:1.35, dash:.02},
  jelly:     {speed:23, width:68, tailHz:.52, amplitude:.068, turnRate:.94, rise:19, float:10, dash:0, habitat:[.23,.59], creature:'jelly'},
  ray:       {speed:47, width:151, tailHz:.63, amplitude:.16, turnRate:1.25, rise:11, float:3.6, dash:.04, habitat:[.47,.77], creature:'ray'},
  octopus:   {speed:27, width:116, tailHz:.59, amplitude:.12, turnRate:1.09, rise:9, float:4.5, dash:0, habitat:[.66,.84], creature:'octopus'},
  turtle:    {speed:39, width:128, tailHz:.66, amplitude:.17, turnRate:1.20, rise:10, float:2.2, dash:0, habitat:[.29,.69], creature:'turtle'},
};

export function profileFor(type) { return SPECIES[type] || SPECIES.clown; }

export function createStrip(columns,vertical=false) {
  return {x:new Float32Array(columns+1),y:new Float32Array(columns+1),vertical,
    span:vertical ? new Float32Array(columns+1) : null};
}

// A brief push followed by a longer release.
export function octopusStroke(phase) {
  return (.5+.5*Math.cos(phase))**2;
}

export function poseCreatureLegacy(strip,{creature,amplitude},phase,aspect,greeting=0,gain=1) {
  const strength=amplitude*clamp(gain,0,1.8)*(1+.32*greeting);
  const segments=strip.x.length-1;
  for (let i=0;i<=segments;i++) {
    const u=i/segments;
    if (creature==='ray') {
      // Keep the face steady while the outer fins follow a traveling wave.
      const wing=smoothstep(.46,1,Math.abs(u*2-1));
      const stroke=Math.sin(phase-wing*1.45);
      strip.x[i]=(u-.5)*(1-strength*.66*wing*(.5+.5*stroke));
      strip.y[i]=strength*wing*stroke;
    } else if (creature==='turtle') {
      // The artwork's shell occupies the middle 56 percent. Flex the flipper tips only.
      const flipper=smoothstep(.57,1,Math.abs(u*2-1));
      const stroke=Math.sin(phase-flipper*.56);
      strip.x[i]=(u-.5)*(1-strength*.59*flipper*(.5+.5*stroke));
      strip.y[i]=strength*flipper*stroke;
    } else if (creature==='jelly') {
      const arms=smoothstep(.36,1,u);
      const wave=Math.sin(phase-u*5);
      const bell=1-smoothstep(.32,.53,u);
      strip.x[i]=strength*wave*arms;
      strip.y[i]=aspect*(u-.5+strength*.88*Math.sin(phase)*Math.sin(Math.PI*u));
      strip.span[i]=1-bell*strength*(1+1.24*Math.sin(phase)+.52*greeting);
    } else {
      // The eyes end above this band. Delay the curl along the arms and between sides.
      const arms=smoothstep(.43,.96,u);
      const armPhase=phase-2.2*(u-.43);
      const left=octopusStroke(armPhase+.62), right=octopusStroke(armPhase-.62);
      strip.x[i]=strength*arms*(left-right)*.42;
      strip.y[i]=aspect*(u-.5+strength*arms*(.18-.95*octopusStroke(armPhase)));
      strip.span[i]=1+strength*arms*(.62-left-right);
    }
  }
  return strip;
}

// Fixed UVs preserve the scanned drawing. Shared vertices let regions move without cutouts.
const grids=new Map();
export function createCreatureMesh(columns=16,rows=18) {
  const key=columns+':'+rows;
  let topology=grids.get(key);
  if (!topology) {
    const uv=new Float32Array((columns+1)*(rows+1)*2);
    const indices=new Uint32Array(columns*rows*6);
    for (let j=0;j<=rows;j++) for (let i=0;i<=columns;i++) {
      const a=j*(columns+1)+i;
      uv.set([i/columns,j/rows],a*2);
      if (i<columns && j<rows) {
        const b=a+columns+1;
        indices.set([a,a+1,b,b,a+1,b+1],(j*columns+i)*6);
      }
    }
    topology={uv,indices};
    grids.set(key,topology);
  }
  return {...topology,grid:true,columns,rows,positions:new Float32Array(topology.uv.length)};
}

// All coordinates below refer to the tightly cropped original artwork, not the A4 sheet.
export function poseCreature(mesh,{creature,amplitude},phase,aspect,greeting=0,gain=1) {
  const intensity=clamp(gain,0,1.8)*(1+.32*greeting);
  // Soft saturation limits extreme controls without abruptly clipping a stroke.
  const strength=amplitude*1.25*Math.tanh(intensity/1.25);
  const {uv,positions}=mesh;
  for (let i=0;i<uv.length;i+=2) {
    const x=uv[i]-.5, v=uv[i+1], side=x<0 ? -1 : 1, ax=Math.abs(x);
    let dx=0,dy=0;
    if (creature==='turtle') {
      // The broad foreflippers and small hindflippers have separate roots and strokes.
      // An elliptical exclusion keeps the shell rigid, including its outer plates.
      const outside=smoothstep(1.05,1.55,Math.hypot(x/.28,(v-.57)/.36));
      const front=outside*smoothstep(.17,.28,v)*(1-smoothstep(.56,.94,v));
      const rear=outside*smoothstep(.74,.94,v)*smoothstep(.08,.23,ax);
      const stroke=Math.sin(phase+.12*side)+.16*Math.sin(2*phase-.4);
      const frontAngle=side*strength*1.15*stroke;
      const rearAngle=side*strength*.90*Math.sin(phase-1.15+side*.24);
      const fx=x-side*.17, fy=(v-.30)*aspect;
      const rx=x-side*.15, ry=(v-.81)*aspect;
      dx=front*((Math.cos(frontAngle)-1)*fx-Math.sin(frontAngle)*fy)
        +rear*((Math.cos(rearAngle)-1)*rx-Math.sin(rearAngle)*ry);
      dy=front*(Math.sin(frontAngle)*fx+(Math.cos(frontAngle)-1)*fy)
        +rear*(Math.sin(rearAngle)*rx+(Math.cos(rearAngle)-1)*ry);
    } else if (creature==='octopus') {
      // Upper, sideways and lower arms respond at different phases. No horizontal
      // row is moved as a unit, so the raised arms can curl while the eyes stay together.
      const outer=smoothstep(.12,.29,ax);
      const upper=outer*(1-smoothstep(.38,.63,v));
      const middle=outer*smoothstep(.35,.56,v)*(1-smoothstep(.72,.90,v));
      const lower=smoothstep(.62,.92,v)*(1-smoothstep(.26,.46,ax));
      const upperWave=Math.sin(phase-.75-side*.45-ax*1.8);
      const midWave=Math.sin(phase-1.55+side*.65-v*1.2);
      const lowerWave=Math.sin(phase-2.6-side*.55-v*1.8);
      dx=strength*side*(upper*.23*upperWave+middle*.32*midWave+lower*.20*lowerWave);
      dy=strength*aspect*(upper*.27*Math.cos(phase-side*.45-ax*2)
        +middle*.21*Math.cos(phase-1.55+side*.65-v*1.2)
        +lower*.32*lowerWave);
      // Slight mantle breathing above the eyes; the eye band itself is not stretched.
      const mantle=(1-smoothstep(.22,.36,v))*(1-smoothstep(.12,.23,ax));
      dx+=strength*x*.20*mantle*Math.sin(phase);
      dy-=strength*aspect*.035*mantle*Math.sin(phase);
      // One tiny rigid lean links the head and arm action without distorting the eyes.
      const lean=strength*.09*Math.sin(phase-.35);
      dx+=(Math.cos(lean)-1)*x-Math.sin(lean)*(v-.52)*aspect;
      dy+=Math.sin(lean)*x+(Math.cos(lean)-1)*(v-.52)*aspect;
    } else if (creature==='ray') {
      const wing=smoothstep(.18,.47,ax)*(1-smoothstep(.50,1,v));
      const stroke=Math.sin(phase-ax*2.6-v*1.5);
      dx=-x*strength*.55*wing*(.5+.5*stroke);
      dy=strength*.50*wing*stroke;
      const tail=smoothstep(.66,1,v)*(1-smoothstep(.25,.46,ax));
      dx+=strength*.25*tail*Math.sin(phase-v*4.2);
    } else {
      // The bell contracts first; separate tentacle columns follow with a delay.
      const bell=1-smoothstep(.31,.48,v);
      const pulse=octopusStroke(phase);
      const arms=smoothstep(.32,.94,v);
      dx=-x*strength*1.5*bell*pulse
        +strength*.50*arms*Math.sin(phase-v*4.5+x*5.5);
      dy=aspect*(strength*.34*bell*(v-.12)*pulse
        +strength*.18*arms*Math.sin(phase-v*3.5+x*5.5));
    }
    positions[i]=x+dx;
    positions[i+1]=(v-.5)*aspect+dy;
  }
  return mesh;
}

export function creatureHeading(creature,heading) {
  return creature==='turtle' ? heading+Math.PI/2 : .12*Math.sin(heading);
}

// An oblique view makes the two sides of a horizontal tail beat project differently.
const viewYaw=.44;
const viewWidth=Math.cos(viewYaw);
const viewDepth=Math.sin(viewYaw);
const depthLift=.075;

function poseLateralWave(strip, fish, phase, strength, bend, bodyGain) {
  const columns=strip.x.length-1;
  const step=1/columns;
  const swing=Math.min(.58,strength*4.4);
  const steering=clamp(bend,-1,1)*fish.amplitude*.9*bodyGain;
  let x=.5, depth=0;
  strip.x[columns]=x;
  strip.y[columns]=0;

  // Integrate the spine from the fixed nose to the tail, one strip at a time.
  for (let i=columns-1; i>=0; i--) {
    const s=(columns-i-.5)/columns;
    // Keep the front half rigid, including the center strip on odd resolutions.
    const rearProgress=(s-.5)*2;
    const body=smoothstep(0,.36,rearProgress)*(.28+.72*rearProgress);
    const tail=smoothstep(fish.hinge-.13,1,s);
    const weight=clamp(body*bodyGain+(1-bodyGain)*tail,0,1.24);
    const yaw=viewYaw+swing*weight*Math.sin(phase+(fish.beat||0)*Math.sin(phase)-fish.wave*s)+steering*body;
    const projectedWidth=clamp(Math.cos(yaw)/viewWidth,.46,1.12);
    x-=step*projectedWidth;
    depth+=step*(Math.sin(yaw)-viewDepth);
    strip.x[i]=x;
    // A slightly elevated viewpoint leaves only a small vertical cue for depth.
    strip.y[i]=depth*depthLift;
  }
  return strip;
}

export function poseStrip(strip, model, fish, phase, pace, bend, tailGain=1, bodyGain=1) {
  const columns=strip.x.length-1;
  const strength=fish.amplitude*tailGain*clamp(.78+pace*.22,.72,1.23);
  if (model==='wave') return poseLateralWave(strip,fish,phase,strength,bend,bodyGain);

  const hingeAngle=Math.atan2(strength*Math.sin(phase),1-fish.hinge);
  const lengthShift=1-Math.cos(hingeAngle);
  const lift=Math.sin(hingeAngle);
  for (let i=0; i<=columns; i++) {
    const u=i/columns;
    const joint=model==='hinge' ? Math.max(0,1-u-fish.hinge) : 0;
    strip.x[i]=u-.5+joint*lengthShift;
    strip.y[i]=joint*lift;
  }
  return strip;
}

const meshes=new Map();
export function stripTopology(columns,vertical=false) {
  const key=vertical ? -columns : columns;
  if (meshes.has(key)) return meshes.get(key);
  const uv=new Float32Array((columns+1)*4);
  const indices=new Uint32Array(columns*6);
  for (let i=0;i<=columns;i++) {
    const u=i/columns, a=i*2;
    uv.set(vertical ? [0,u,1,u] : [u,0,u,1],i*4);
    if (i<columns) indices.set(vertical ? [a,a+1,a+2,a+2,a+1,a+3] : [a,a+2,a+1,a+2,a+3,a+1],i*6);
  }
  const result={uv,indices};
  meshes.set(key,result);
  return result;
}

export function updatePositions(positions,strip,aspect) {
  if (strip.grid) { positions.set(strip.positions); return; }
  for (let i=0;i<strip.x.length;i++) {
    const p=i*4, x=strip.x[i], y=strip.y[i], half=aspect/2;
    if (strip.vertical) {
      positions[p]=x-strip.span[i]/2;
      positions[p+2]=x+strip.span[i]/2;
      positions[p+1]=positions[p+3]=y;
    } else {
      positions[p]=positions[p+2]=x;
      positions[p+1]=y-half;
      positions[p+3]=y+half;
    }
  }
}

export function dorsalMix(angle) {
  // When the nose points up/down, blend the two dorsal poses around the same body axis.
  return smoothstep(-.13,.13,Math.cos(angle));
}
