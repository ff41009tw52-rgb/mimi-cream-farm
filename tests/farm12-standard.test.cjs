const assert = require('node:assert/strict');
const test = require('node:test');
const C = require('../assets/farm12/picturebook/gameplay-v3.js');
const crop = { id:'sweetpotatoleaf', days:3 };
const slot = (overrides={}) => ({id:0,crop,growth:0,isWatered:true,isFertilized:false,hasBug:false,hasWeed:false,hazardDays:0,...overrides});
const plot = (overrides={}) => ({id:0,isUnlocked:true,isNetted:false,isWindbreaked:false,slots:[slot()],...overrides});
const settle = (p, today='sunny', tomorrow='sunny', rng=()=>.99) => C.advanceFields([p],today,tomorrow,rng);

test('normal saves preserve depleted supplies and stay separate from test saves', () => {
  assert.notEqual(C.SAVE_KEY, 'farm_tycoon_save_v2_12_2');
  const empty = C.startingInventory(); assert.deepEqual(empty.seeds, {}); assert.equal(empty.scissors,10);
  const saved = {...empty,scissors:0,chili:0,seeds:{sweetpotatoleaf:0}};
  assert.deepEqual(C.normalizeInventory(JSON.parse(JSON.stringify(saved))), saved);
  assert.equal(C.count(0),0); assert.equal(C.count(500),500);
});
test('season boundaries allow typhoons only from day 91 through day 270', () => {
  for (const day of [1,3,4,90,271,365]) assert.notEqual(C.weatherForDay(day,()=>0),'typhoon');
  for (const day of [91,180,181,270]) assert.equal(C.weatherForDay(day,()=>0),'typhoon');
  const draws=[.08,.99]; assert.equal(C.weatherForDay(91,()=>draws.shift()),'sunny');
});
test('announcing a storm does not cause damage before players can protect fields', () => {
  const dawn=settle(plot(), 'sunny','typhoon');
  assert.equal(dawn.typhoonDamageCount,0); assert(dawn.nextPlots[0].slots[0].crop);
  assert.equal(dawn.nextPlots[0].slots[0].isWatered,true);
  const exposed=settle(plot(), 'typhoon','sunny',()=>0);
  assert.equal(exposed.typhoonDamageCount,1); assert.equal(exposed.nextPlots[0].slots[0].crop,null);
  const protectedField=settle(plot({isWindbreaked:true}), 'typhoon','sunny',()=>0);
  assert.equal(protectedField.typhoonDamageCount,0); assert(protectedField.nextPlots[0].slots[0].crop);
  const mature=settle(plot({slots:[slot({growth:3})]}),'typhoon','sunny',()=>0);
  assert.equal(mature.typhoonDamageCount,0); assert.equal(mature.nextPlots[0].slots[0].growth,3);
});
test('day 270 storm can be settled on day 271 without generating a winter storm', () => {
  const next=C.weatherForDay(271,()=>0); assert.equal(next,'rainy');
  assert.equal(settle(plot(),'typhoon',next,()=>0).typhoonDamageCount,1);
});
test('care is settled before new hazards, and mature growth is capped', () => {
  const next=settle(plot(),'sunny','sunny',()=>0).nextPlots[0].slots[0];
  assert.equal(next.growth,1); assert.equal(next.hasBug,true); assert.equal(next.hasWeed,true); assert.equal(next.hazardDays,0);
  const mature=settle(plot({slots:[slot({growth:2})]}),'sunny','sunny',()=>0).nextPlots[0].slots[0];
  assert.equal(mature.growth,3); assert.equal(mature.hasBug,false); assert.equal(mature.hasWeed,false);
  assert.equal(settle(plot({slots:[slot({growth:3})]})).nextPlots[0].slots[0].growth,3);
});
test('one missed hazard-treatment night leaves a rescue chance; next missed night kills crop', () => {
  const affected=plot({slots:[slot({hasBug:true,hasWeed:true})]});
  const first=settle(affected).nextPlots[0]; assert.equal(first.slots[0].growth,0); assert.equal(first.slots[0].hazardDays,1);
  assert.equal(settle(first).hasDeadCrops,true);
  const half=C.treatPlot(first,'weed',1).plot; assert.equal(half.slots[0].hazardDays,1);
  const healed=C.treatPlot(half,'chili',1).plot; assert.equal(healed.slots[0].hazardDays,0);
  healed.slots=healed.slots.map(s=>({...s,isWatered:true}));
  assert.equal(settle(healed).nextPlots[0].slots[0].growth,1);
});
test('both wet weather types provide water; sunny unwatered crops pause', () => {
  assert(C.rainy('typhoon')); assert(C.rainy('rainy')); assert(!C.rainy('sunny'));
  const dry=plot({isWindbreaked:true,slots:[slot({isWatered:false})]});
  assert.equal(settle(dry).nextPlots[0].slots[0].growth,0);
  for(const w of ['rainy','typhoon']) assert.equal(settle(dry,w).nextPlots[0].slots[0].growth,1);
});
test('eight planted slots remain eight slots and three well-tended nights reach first harvest', () => {
  let p=plot({slots:Array.from({length:8},(_,id)=>slot({id}))});
  for(let day=0;day<3;day++) {p={...p,slots:p.slots.map(s=>({...s,isWatered:true}))};p=settle(p).nextPlots[0];}
  assert.equal(p.slots.length,8);assert(p.slots.every(s=>s.growth===3));
});
