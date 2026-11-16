import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FISH } from '../templates.js';
import { angleDelta, makeSwimmer, stepSchool } from '../v32/school.js';
import { SPECIES, createStrip, poseCreature, poseStrip, updatePositions, TAU } from '../v32/fish-rig.js';

const world={width:960,height:540};
const previousWidths={clown:91,butterfly:84,puffer:82,shark:108};
const types=Object.keys(previousWidths);
const sameDepthWidths=Object.fromEntries(Object.keys(FISH).map(type=>{
  const [,,width,height]=FISH[type].bounds;
  const fish=makeSwimmer({id:'size-reference',type},{width,height},world,false);
  assert.equal(fish.aspect,height/width,`${type}: resizing changed the artwork proportions`);
  if (type in previousWidths) assert.ok(SPECIES[type].width/previousWidths[type]>=1.18,`${type}: size did not increase by at least 18%`);
  return [type,fish.width];
}));
const sharkToClown=sameDepthWidths.shark/sameDepthWidths.clown;
const artwork=JSON.parse(readFileSync(new URL('../tools/artwork.json',import.meta.url),'utf8'));
const silhouetteAreas=Object.fromEntries(Object.entries(sameDepthWidths).map(([type,width])=>{
  const {outline,width:sourceWidth}=artwork[type];
  const signedDoubleArea=outline.reduce((area,[x,y],index)=>{
    const [nextX,nextY]=outline[(index+1)%outline.length];
    return area+x*nextY-y*nextX;
  },0);
  return [type,Math.abs(signedDoubleArea)*.5*(width/sourceWidth)**2];
}));
const sharkToClownArea=silhouetteAreas.shark/silhouetteAreas.clown;
assert.ok(sharkToClownArea>=1.05 && sharkToClownArea<=1.25,`shark to clown silhouette ratio ${sharkToClownArea}`);
for (const type of ['shark','ray','turtle']) {
  assert.ok(silhouetteAreas[type]>silhouetteAreas.butterfly,`${type}: large species silhouette is smaller than a butterflyfish`);
}
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
assert.equal(new Set(types.map(type=>SPECIES[type].tailHz)).size,4);
const priorTailTravel={clown:.0625,butterfly:.0443,puffer:.0227,shark:.0493};
const maxTailTravel={clown:.11,butterfly:.08,puffer:.04,shark:.10};
const range=values=>Math.max(...values)-Math.min(...values);
const lateralTravel={};
for (const type of types) {
  const profile=SPECIES[type];
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
    assert.ok(tail>priorTailTravel[type]*1.18,`${type}: tail swing did not increase`);
    assert.ok(tail<maxTailTravel[type],`${type}: tail swing is too large`);
    assert.ok(rear>.004 && rear<tail,`${type}: rear body does not sway gently`);
    if (columns===18) {
      lateralTravel[type]=Object.fromEntries(Object.entries({tail,rear,lift})
        .map(([part,travel])=>[part,Number((travel*100).toFixed(2))]));
    }
  }
}
for (const type of ['jelly','ray','octopus','turtle']) {
  const [,,width,height]=FISH[type].bounds;
  const fish=makeSwimmer({id:'creature-'+type,type},{width,height},world,false);
  const {profile,aspect}=fish;
  for (const mesh of [fish.mesh,fish.fallbackMesh,createStrip(18,fish.mesh.vertical)]) {
    const points=new Float32Array(mesh.x.length*4);
    for (let frame=0;frame<48;frame++) {
      poseCreature(mesh,profile,frame*TAU/48,aspect,1,1.8);
      const axis=mesh.vertical ? mesh.y : mesh.x;
      assert.ok(axis.every((value,index)=>index===0 || value>axis[index-1]),`${type}: folded mesh`);
      updatePositions(points,mesh,aspect);
      assert.ok(points.every(Number.isFinite),`${type}: invalid mesh coordinates`);
      for (let i=0;i<mesh.x.length;i++) {
        const u=i/(mesh.x.length-1);
        if ((type==='turtle' && Math.abs(u-.5)<.28) || (type==='ray' && Math.abs(u-.5)<=.23)) {
          assert.ok(mesh.y[i]===0 && Math.abs(mesh.x[i]-(u-.5))<1e-6,`${type}: center should remain steady`);
        }
        if (type==='octopus' && u<=.43) {
          assert.ok(mesh.x[i]===0 && mesh.span[i]===1 && Math.abs(mesh.y[i]-(u-.5)*aspect)<1e-6,'octopus head should remain steady');
        }
      }
    }
    poseCreature(mesh,profile,1,aspect,0,0);
    assert.ok(mesh.x.every((value,i)=>Math.abs(value-(mesh.vertical ? 0 : i/(mesh.x.length-1)-.5))<1e-6));
    assert.ok(!mesh.span || mesh.span.every(value=>value===1));
  }
}
console.log(JSON.stringify({fishes:40,simulatedSeconds:90,changedTarget:goalChanges.size,
  turned:turns.size,maxTurnDegrees:maxAngleChange*180/Math.PI,longestOverlapSeconds:longestOverlap,
  sharkToClown,sharkToClownArea,lateralTravelPercent:lateralTravel},null,2));
