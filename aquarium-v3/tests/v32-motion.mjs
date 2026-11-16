import assert from 'node:assert/strict';
import { FISH } from '../templates.js';
import { angleDelta, makeSwimmer, stepSchool } from '../v32/school.js';
import { SPECIES, createStrip, poseStrip, TAU } from '../v32/fish-rig.js';

const world={width:960,height:540}, types=Object.keys(FISH);
const previousWidths={clown:91,butterfly:84,puffer:82,shark:108};
const sameDepthWidths=Object.fromEntries(types.map(type=>{
  const [,,width,height]=FISH[type].bounds;
  const fish=makeSwimmer({id:'size-reference',type},{width,height},world,false);
  assert.equal(fish.aspect,height/width,`${type}: resizing changed the artwork proportions`);
  assert.ok(SPECIES[type].width/previousWidths[type]>=1.18,`${type}: size did not increase by at least 18%`);
  return [type,fish.width];
}));
const sharkToClown=sameDepthWidths.shark/sameDepthWidths.clown;
assert.ok(sharkToClown>=1.25 && sharkToClown<=1.40,`shark to clown length ratio ${sharkToClown}`);
const fishes=Array.from({length:40},(_,i)=>{
  const type=types[i%types.length], [,,width,height]=FISH[type].bounds;
  return makeSwimmer({id:'swimmer-'+i,type},{width,height},world,false);
});
const overlap=new Map(), goalChanges=new Set(), turns=new Set();
const fps=60;
let longestOverlap=0,maxAngleChange=0;
for (let tick=0;tick<90*fps;tick++) {
  const headings=fishes.map(fish=>fish.angle);
  const goals=fishes.map(fish=>fish.goalX);
  stepSchool(fishes,world,1/fps);
  for (const [i,fish] of fishes.entries()) {
    maxAngleChange=Math.max(maxAngleChange,Math.abs(angleDelta(fish.angle,headings[i])));
    if (fish.goalX!==goals[i]) goalChanges.add(fish.id);
    if (Math.cos(fish.angle)*Math.cos(headings[i])<0) turns.add(fish.id);
  }
  if (tick<600) continue;
  for (let i=0;i<fishes.length;i++) {
    for (let j=i+1;j<fishes.length;j++) {
      const a=fishes[i],b=fishes[j],key=i*40+j;
      const dx=(a.x-b.x)/((a.width+b.width)*.29);
      const dy=(a.y-b.y)/((a.width*a.aspect+b.width*b.aspect)*.32);
      if (dx*dx+dy*dy<1 && Math.abs(a.depth-b.depth)<.45) {
        const duration=(overlap.get(key)||0)+1/fps;
        overlap.set(key,duration);
        longestOverlap=Math.max(longestOverlap,duration);
      } else overlap.delete(key);
    }
  }
}
assert.equal(goalChanges.size,40);
assert.equal(turns.size,40);
assert.ok(maxAngleChange<.055, `heading step ${maxAngleChange}`);
assert.ok(longestOverlap<3,`longest severe overlap ${longestOverlap}s`);

const entrance=types.map((type,index)=>{
  const [,,width,height]=FISH[type].bounds;
  return makeSwimmer({id:'enter-'+index,type},{width,height},world,true);
});
assert.ok(entrance.every(f=>f.x<0||f.x>world.width));
for (let tick=0;tick<120;tick++) stepSchool(entrance,world,1/fps);
assert.ok(entrance.every(f=>f.x>f.width/2*-1 && f.x<world.width+f.width/2));
assert.equal(new Set(Object.values(SPECIES).map(p=>p.tailHz)).size,4);
const priorTailTravel={clown:.1378,butterfly:.1009,puffer:.0415,shark:.0969};
const range=values=>Math.max(...values)-Math.min(...values);
const lateralTravel={};
for (const [type,profile] of Object.entries(SPECIES)) {
  const hinge=createStrip(18);
  poseStrip(hinge,'hinge',profile,Math.PI/2,1,0);
  assert.ok(Math.abs(hinge.y[0])>.015,`${type}: comparison hinge is not animated`);
  for (const columns of [7,10,12,18]) {
    const strip=createStrip(columns), tailXs=[], tailYs=[], rearXs=[];
    for (let i=0;i<48;i++) {
      poseStrip(strip,'wave',profile,i/48*TAU,1,0);
      assert.ok(strip.x.every((x,j)=>j===0||x>strip.x[j-1]),`${type}: crossed mesh columns`);
      tailXs.push(strip.x[0]);
      tailYs.push(strip.y[0]);
      rearXs.push(strip.x[Math.floor(columns*.3)]);
      poseStrip(strip,'wave',profile,i/48*TAU,2,1,1.8,1.5);
      assert.ok(strip.x.every((x,j)=>j===0||x>strip.x[j-1]),`${type}: extreme lab controls folded the mesh`);
      for (let j=Math.floor(columns/2);j<=columns;j++) {
        assert.ok(Math.abs(strip.x[j]-(j/columns-.5))<.000001,`${type}: front half was warped`);
        assert.ok(Math.abs(strip.y[j])<.000001,`${type}: front half moved vertically`);
      }
    }
    const tail=range(tailXs), lift=range(tailYs), rear=range(rearXs);
    assert.ok(tail>.02 && tail>5*lift,`${type}: tail motion is not predominantly horizontal`);
    assert.ok(tail<priorTailTravel[type]*.75,`${type}: tail swing is too large`);
    assert.ok(rear>.004 && rear<tail,`${type}: rear body does not sway gently`);
    if (columns===18) {
      lateralTravel[type]=Object.fromEntries(Object.entries({tail,rear,lift})
        .map(([part,travel])=>[part,Number((travel*100).toFixed(2))]));
    }
  }
}
console.log(JSON.stringify({fishes:40,simulatedSeconds:90,changedTarget:goalChanges.size,
  turned:turns.size,maxTurnDegrees:maxAngleChange*180/Math.PI,longestOverlapSeconds:longestOverlap,
  sharkToClown,lateralTravelPercent:lateralTravel},null,2));
