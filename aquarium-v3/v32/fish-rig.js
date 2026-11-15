export const TAU = Math.PI * 2;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const smoothstep = (start, end, value) => {
  const t = clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
};

// All four scanned templates face right. Distances along the body run nose to tail.
export const SPECIES = {
  clown:     {speed:66, width:91, tailHz:1.82, amplitude:.064, bendFrom:.28, hinge:.72, wave:7.4, turnRate:2.08, rise:15, float:2.4, dash:.38},
  butterfly: {speed:43, width:84, tailHz:1.36, amplitude:.044, bendFrom:.48, hinge:.78, wave:6.4, turnRate:1.68, rise:12, float:2.5, dash:.05},
  puffer:    {speed:33, width:82, tailHz:1.62, amplitude:.022, bendFrom:.63, hinge:.78, wave:5.8, turnRate:1.52, rise:10, float:5.1, dash:0},
  shark:     {speed:75, width:108, tailHz:1.08, amplitude:.052, bendFrom:.30, hinge:.75, wave:8.3, turnRate:1.57, rise:8, float:1.35, dash:.02},
};

export function profileFor(type) { return SPECIES[type] || SPECIES.clown; }

export function createStrip(columns) {
  return { x:new Float32Array(columns+1), y:new Float32Array(columns+1) };
}

// An oblique view makes the two sides of a horizontal tail beat project differently.
const viewYaw=.44;
const viewWidth=Math.cos(viewYaw);
const viewDepth=Math.sin(viewYaw);
const depthLift=.075;

function poseLateralWave(strip, fish, phase, strength, bend, bodyGain) {
  const columns=strip.x.length-1;
  const step=1/columns;
  const swing=Math.min(.92,strength*12);
  const steering=clamp(bend,-1,1)*fish.amplitude*2.4*bodyGain;
  let x=.5, depth=0;
  strip.x[columns]=x;
  strip.y[columns]=0;

  // Integrate the spine from the fixed nose to the tail, one strip at a time.
  for (let i=columns-1; i>=0; i--) {
    const s=1-(i+.5)*step;
    const body=smoothstep(fish.bendFrom,1,s);
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
export function stripTopology(columns) {
  if (meshes.has(columns)) return meshes.get(columns);
  const uv=new Float32Array((columns+1)*4);
  const indices=new Uint32Array(columns*6);
  for (let i=0;i<=columns;i++) {
    uv.set([i/columns,0,i/columns,1],i*4);
    if (i<columns) indices.set([i*2,i*2+2,i*2+1,i*2+2,i*2+3,i*2+1],i*6);
  }
  const result={uv,indices};
  meshes.set(columns,result);
  return result;
}

export function updatePositions(positions,strip,aspect) {
  for (let i=0;i<strip.x.length;i++) {
    const p=i*4, x=strip.x[i], y=strip.y[i], half=aspect/2;
    positions[p]=positions[p+2]=x;
    positions[p+1]=y-half;
    positions[p+3]=y+half;
  }
}

export function dorsalMix(angle) {
  // When the nose points up/down, blend the two dorsal poses around the same body axis.
  return smoothstep(-.13,.13,Math.cos(angle));
}
