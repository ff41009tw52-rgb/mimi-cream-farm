export const TAU = Math.PI * 2;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const smoothstep = (start, end, value) => {
  const t = clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
};

// All four scanned templates face right. Distances along the body run nose to tail.
export const SPECIES = {
  clown:     {speed:66, width:110, tailHz:1.82, amplitude:.064, hinge:.72, wave:5.3, turnRate:2.08, rise:15, float:2.4, dash:.38},
  butterfly: {speed:43, width:102, tailHz:1.36, amplitude:.044, hinge:.78, wave:4.9, turnRate:1.68, rise:12, float:2.5, dash:.05},
  puffer:    {speed:33, width:100, tailHz:1.62, amplitude:.022, hinge:.78, wave:4.6, turnRate:1.52, rise:10, float:5.1, dash:0},
  shark:     {speed:75, width:148, tailHz:1.08, amplitude:.052, hinge:.75, wave:5.7, turnRate:1.57, rise:8, float:1.35, dash:.02},
  jelly:     {speed:23, width:68, tailHz:.52, turnRate:.94, rise:19, float:10, dash:0, habitat:[.23,.59], creature:'jelly'},
  ray:       {speed:47, width:151, tailHz:.63, turnRate:1.25, rise:11, float:3.6, dash:.04, habitat:[.47,.77], creature:'ray'},
  octopus:   {speed:27, width:116, tailHz:.73, turnRate:1.09, rise:9, float:4.5, dash:0, habitat:[.66,.84], creature:'octopus'},
};

export function profileFor(type) { return SPECIES[type] || SPECIES.clown; }

export function createStrip(columns,vertical=false) {
  return {x:new Float32Array(columns+1),y:new Float32Array(columns+1),vertical,
    span:vertical ? new Float32Array(columns+1) : null};
}

export function poseCreature(strip,creature,phase,aspect,greeting=0) {
  const segments=strip.x.length-1;
  for (let i=0;i<=segments;i++) {
    const u=i/segments;
    if (creature==='ray') {
      const wing=Math.abs(u*2-1);
      const stroke=Math.sin(phase-wing*1.9);
      strip.x[i]=(u-.5)*(1-.10*wing*wing*(.5+.5*stroke));
      strip.y[i]=stroke*wing**2.2*(.10+.048*greeting);
    } else {
      const arms=smoothstep(.36,1,u);
      const wave=Math.sin(phase-u*5);
      strip.x[i]=wave*arms*(creature==='jelly' ? .047 : .039);
      strip.y[i]=(u-.5)*aspect+.045*Math.sin(phase)*Math.sin(Math.PI*u)
        +(creature==='octopus' ? .025*arms*wave : 0);
      const bell=1-smoothstep(.32,.53,u);
      strip.span[i]=creature==='jelly'
        ? 1-bell*(.065+.069*Math.sin(phase)+.064*greeting)
        : 1+arms*(.10*wave+.14*greeting);
    }
  }
  return strip;
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
    const yaw=viewYaw+swing*weight*Math.sin(phase-fish.wave*s)+steering*body;
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
