const assert=require('node:assert/strict'),{context,plain,starter}=require('./schema.test.cjs');
const w=context(),D=w.AquariumData,E=w.AquariumEconomy,S=w.AquariumSave;
assert.equal(Object.keys(D.SPECIES).length,35);assert.equal(Object.keys(D.DECORATIONS).length,40);assert.equal(D.ACHIEVEMENTS.length,31);assert.equal(D.ACHIEVEMENTS.reduce((n,a)=>n+a.reward.coins,0),5215);
assert.deepEqual(plain(Object.values(D.FEEDS).map(f=>[f.price,f.pack])),[[10,10],[12,10],[16,10]]);assert.deepEqual(plain(D.TANK_TIERS.map(t=>t.price)),[0,650,2000,4000]);assert.deepEqual(plain(D.TANK_OFFERS.map(t=>t.price)),[4200,8800]);assert.deepEqual(plain(D.MARINE_OFFERS.map(t=>t.price)),[2800,7000,13000]);
for(const [id,row]of Object.entries(E.rows)){const s=D.SPECIES[id];assert.deepEqual(plain([s.price,s.coinInterval,...s.values]),plain(row));assert(s.coinInterval>=60&&s.coinInterval<=120);}
for(const [id,price]of Object.entries(E.prices))assert.equal(D.DECORATIONS[id].price,price);
const make=(species,growth=100,hunger=100)=>({species,growth,hunger,coinProgress:0});
let paid=0,credit=0;
for(const id of ['guppy','goldfish','cory','zebra','molly']){const f=make(id),g=make(id);const lump=E.advance(f,14400,{hungerRate:15/3600});let many=0;for(let i=0;i<14400;i++)many+=E.advance(g,1,{hungerRate:15/3600}).earned;assert.equal(many,lump.earned);assert(Math.abs(f.coinCredit-g.coinCredit)<1e-6);paid+=lump.earned;credit+=f.coinCredit;}
assert.equal(paid,2576);assert(Math.abs(paid+credit-2583.272727)<1e-5);
for(const hunger of [0,15,30,45,60,68,100]){const f=make('guppy',100,hunger);const q=E.advance(f,14400,{hungerRate:15/3600});assert(Math.abs(q.productive-Math.min(14400,hunger*240))<1e-6);assert.equal(q.earned,Math.floor(Math.min(14400,hunger*240)/90)*3);}
for(const id of Object.keys(D.SPECIES))for(const growth of [0,34.99,35,99.99,100]){const f=make(id,growth,68),g=make(id,growth,68);const one=E.advance(f,14400,{hungerRate:15/3600});let sum=0;for(let i=0;i<480;i++)sum+=E.advance(g,30,{hungerRate:15/3600}).earned;assert.equal(sum,one.earned,id);assert(Math.abs(f.growth-g.growth)<1e-6);assert(Math.abs(f.coinCredit-g.coinCredit)<1e-6);}
const original=plain(starter);original.tanks[0].drops=[{id:'stack',x:.3,y:.3,value:500}];original.tanks[0].fishes[0].coinCredit=.25;const loaded=S.validate(original);assert.equal(loaded.tanks[0].drops[0].value,500);assert.equal(loaded.fishes[0].coinCredit,.25);assert.deepEqual(plain(S.validate(plain(loaded))),plain(loaded));
const full=make('guppy');let held=0;E.advance(full,3600,{hungerRate:0,deposit:v=>{if(held+v>81)return false;held+=v;return true;}});assert.equal(held,81);assert.equal(full.coinProgress,90);assert(full.coinCredit>=3);const resume=E.advance(full,1,{hungerRate:0});assert(resume.earned>=3);
console.log('PASS 35 species, 40 decor, all prices, 5215 rewards, 4h parity, stage segmentation, starvation and retained cycle/stack; paid='+paid+', pending fractional credit='+credit);
