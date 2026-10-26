const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {context}=require('./schema.test.cjs');
const w=context(),calls=[];
w.AquariumFishArt={draw:(...args)=>calls.push(args),getFinInfo:()=>({fish:true}),hitBounds:{guppy:{left:-50,right:50,top:-30,bottom:30}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../assets/aquarium-v06/crustaceans.js'),'utf8'),{window:w,Math,Map});
const A=w.AquariumCrustaceans;
for(const key of ['blackshrimp','blueshrimp','microcrab','pompomcrab']){
 const s=w.AquariumData.SPECIES[key],f={id:key,species:key,size:s.size,growth:100},r={x:.5,y:.89,target:{x:.7,y:.89},phase:1,turn:1,direction:1,heading:0,crustTimer:10,crustRest:3,escape:0,hiddenAmount:0};
 const world={target:null,fishes:[f],runtime:new Map([[key,r]]),decorations:[],layout:()=>{},W:1000,H:600};
 const before=JSON.stringify(f);A.tick(r,f,s,.1,world);
 assert.equal(r.x,.5);assert.equal(r.y,.89);assert.equal(r.phase,1);assert.equal(r.crustMotion,'rest');assert(r.idlePhase>0);
 r.crustRest=0;A.tick(r,f,s,.1,world);assert(r.x>.5);assert(r.phase>1);assert.equal(r.crustMotion,'walk');
 if(s.category==='shrimp'){r.crustMode='短游';A.tick(r,f,s,.1,world);assert.equal(r.crustMotion,'swim');}
 r.target={x:r.x,y:r.y};A.tick(r,f,s,.1,world);assert.equal(r.crustMotion,'rest');assert.equal(r.vx,0);
 assert.equal(JSON.stringify(f),before,'motion must never change saved fish fields');
 assert.equal(A.displaySize(key,1),1,'no second multiplier or minimum should flatten growth');assert.equal(A.displaySize(key,60),60);
 const parts=w.AquariumFishArt.getFinInfo(key).parts.map(p=>p.id);assert(parts.includes('gills'));assert(parts.includes('legs'));assert(!parts.includes('dorsal'));
}
const args=[{},'guppy',10,20,50,1,0,.2,'normal',{highlightPart:'tail'}];w.AquariumFishArt.draw(...args);assert.deepEqual(calls[0],args);assert.equal(w.AquariumFishArt.getFinInfo('guppy').fish,true);
console.log('PASS articulated crustacean rest/walk/swim, immutable saves and unchanged fish renderer');
