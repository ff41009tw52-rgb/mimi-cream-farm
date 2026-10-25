const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const plain=x=>JSON.parse(JSON.stringify(x));
function context(){const c=vm.createContext({window:{},location:{search:''},URLSearchParams,Date,Math,structuredClone,crypto:{randomUUID:()=>crypto.randomUUID()}});for(const p of ['assets/aquarium-v05/aquarium-data.js','assets/aquarium-v06/content.js','assets/aquarium-v06/design-content.js','assets/aquarium-v06/quality-content.js','assets/aquarium-v041-r2/aquarium-save.js','assets/aquarium-v05/aquarium-save.js','assets/aquarium-v06/data.js','assets/aquarium-v06/save.js'])vm.runInContext(fs.readFileSync(p,'utf8'),c,{filename:p});return c.window;}
const w=context(),D=w.AquariumData,S=w.AquariumSave;
const raw=JSON.parse(fs.readFileSync('tests/aquarium/fixtures/v02-real-save.json'));raw.savedAt=Date.now();
const v5=plain(w.AquariumV05Save.validate(raw));
const bonusIds=['fourSpecies','threePurchases','twoAdults','sevenDecor','twelveSpecies','fifteenSpecies'];
const legacyWithoutBonuses=plain(v5);for(const id of bonusIds)delete legacyWithoutBonuses.achievements[id];
const migratedBonus=S.validate(legacyWithoutBonuses);
for(const id of bonusIds)assert.deepEqual(plain(migratedBonus.achievements[id]),{completed:false,rewardClaimed:false});
const badOldAchievement=plain(legacyWithoutBonuses);delete badOldAchievement.achievements.firstPurchase;
assert.throws(()=>S.validate(badOldAchievement),'missing legacy achievements must still fail validation');
const oldFixtures=require('../aquarium/schema-v05.test.cjs');for(const input of [oldFixtures.v1,raw,oldFixtures.v3,v5]){const original=JSON.stringify(input),next=S.validate(input);assert.equal(next.tanks.flatMap(t=>t.fishes).length,input.fishes.length);assert.equal(JSON.stringify(input),original);}
const input=JSON.stringify(v5),m=S.validate(v5);assert.equal(JSON.stringify(v5),input);assert.equal(m.schemaVersion,5);assert.equal(m.tankCapacity,10);assert(m.onboarding.completed);assert.deepEqual(plain(m.fishes),v5.fishes);assert.deepEqual(plain(m.placedDecorations),v5.placedDecorations);assert.deepEqual(plain(S.validate(plain(m))),plain(m));
const large=plain(v5);large.tankTier=4;large.tankCapacity=18;large.fishes=Array.from({length:18},(_,i)=>({...v5.fishes[i%v5.fishes.length],id:'old-fish-'+i,name:'魚 '+i}));for(const [id,c]of Object.entries(large.collection)){const fs=large.fishes.filter(f=>f.species===id);c.total=Math.max(c.total,fs.length);c.adults=Math.max(c.adults,fs.filter(f=>f.adultRecorded).length);}
const upgraded=S.validate(large);assert.deepEqual(plain(upgraded.tanks.map(t=>t.fishes.length)),[10,8]);assert.equal(upgraded.coins,Math.min(D.CONFIG.MAX_COINS,large.coins+5970));assert.deepEqual(plain(upgraded.tanks.flatMap(t=>t.fishes)),large.fishes);assert.deepEqual(plain(S.validate(plain(upgraded))),plain(upgraded));
const starterRaw={...v5,fishes:v5.fishes.slice(0,3)};const starter=S.freshFromLegacy(starterRaw,'小星的家');assert.equal(starter.tankCapacity,5);assert.equal(starter.coins,20);assert.deepEqual(plain(starter.feedInventory),{general:0,small:0,protein:0});assert.equal(starter.onboarding.step,0);assert.equal(starter.tanks.length,1);
for(const mutate of [s=>s.feedInventory.general=-1,s=>s.feedInventory.small=NaN,s=>s.tanks[0].fishes.push(...s.tanks[0].fishes),s=>s.activeTankId='missing',s=>s.gifts.push('fake'),s=>s.tanks.push({...s.tanks[0]}),s=>s.onboarding.step=12,s=>s.tanks[0].name='<b>bad</b>']){const bad=plain(starter);mutate(bad);assert.throws(()=>S.validate(bad));}
assert.equal(Object.keys(D.FOOD_FOR).length,35);assert.deepEqual(plain(Object.values(D.FEEDS).map(x=>x.species.length)),[10,15,10]);assert.deepEqual(plain(D.TANK_TIERS.map(t=>t.capacity)),[5,7,9,10]);assert.deepEqual(plain(D.TANK_TIERS.slice(1).map(t=>t.price)),[80,220,480]);
// Every old 12-operation checkpoint migrates by event evidence, not by casting its number.
const migrationRows=[];
for(let n=0;n<=12;n++){
 const old=plain(starter);old.onboarding={step:n,completed:n===12,skipped:false,welcomed:n>0,paused:n===5,coinHintShown:false};old.gifts=['starter','smallLesson','fishCard'];old.coins=37;
 const untouched=JSON.stringify(old),next=S.validate(old);assert.equal(JSON.stringify(old),untouched);assert.equal(next.coins,37);assert(next.gifts.includes('fishCard'));assert.equal(next.onboarding.version,3);assert.equal(next.onboarding.step,n===12?21:Math.min(n,8));
 if(n>8&&n<12)assert(next.onboarding.events.includes('feed.shop'));
 if(n>10)assert(next.onboarding.events.includes('feed.buy'));
 assert.deepEqual(plain(S.validate(plain(next))),plain(next));migrationRows.push({old:n,newStep:next.onboarding.step,events:plain(next.onboarding.events),completed:next.onboarding.completed});
}
for(const mutate of [o=>o.version=9,o=>o.events.push('invented'),o=>o.events=['general.open'],o=>o.review=true,o=>o.supportAmounts.feed=15]){const bad=plain(starter);mutate(bad.onboarding);assert.throws(()=>S.validate(bad));}
// All version-2 checkpoints retain event evidence; completed seven-task saves stay completed.
const v2keys=S.TUTORIAL_KEYS.filter(k=>!k.startsWith('decor.'));
for(let n=0;n<=16;n++){
 const old=plain(starter);old.coins=77;old.gifts=['starter','smallLesson','fishCard','feedSupport','fishSupport'];
 old.onboarding={...S.newOnboarding(),version:2,step:n,events:v2keys.slice(0,n),completed:n===16,everCompleted:n===16,welcomed:true,supportAmounts:{feed:3,fish:9}};delete old.onboarding.hints;
 const original=JSON.stringify(old),next=S.validate(old);assert.equal(JSON.stringify(old),original);assert.equal(next.coins,77);assert.equal(next.onboarding.step,n===16?21:n);assert.equal(next.onboarding.supportAmounts.decor,0);assert.equal(next.onboarding.decorReuse,true);assert.equal(next.onboarding.completed,n===16);assert.deepEqual(plain(S.validate(plain(next))),plain(next));
}
console.log('PASS all 17 seven-task checkpoints migrate to version 3 without resetting completed saves or existing receipts');
const hashes=JSON.parse(fs.readFileSync('tests/aquarium/fixtures/v05-preserved-hashes.json'));for(const [p,h]of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),h,p);
const noNew=plain(starter);for(const id of D.NEW_ACHIEVEMENT_IDS)delete noNew.achievements[id];const extended=S.validate(noNew);assert.equal(extended.coins,noNew.coins);assert.deepEqual(plain(extended.tanks),noNew.tanks);for(const id of D.NEW_ACHIEVEMENT_IDS)assert.deepEqual(plain(extended.achievements[id]),{completed:false,rewardClaimed:false});const activity=plain(extended);activity.activity={firstCard:true,observeCrustacean:true};assert.deepEqual(plain(S.validate(activity).activity),activity.activity);activity.activity.firstCard='yes';assert.throws(()=>S.validate(activity));
console.log('PASS schema 5, old 18-fish free split, compensation, strict validation, 5+9+5 foods and original materials');
module.exports={context,plain,v5,large,starter:plain(starter),migrationRows};
