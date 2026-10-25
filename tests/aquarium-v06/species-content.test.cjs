const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const files=['assets/aquarium-v05/aquarium-data.js','assets/aquarium-v06/content.js','assets/aquarium-v06/design-content.js','assets/aquarium-v06/quality-content.js'];
const c=vm.createContext({window:{},location:{search:""},URLSearchParams});for(const file of files)vm.runInContext(fs.readFileSync(file,'utf8'),c);
const plain=x=>JSON.parse(JSON.stringify(x)),before=plain(c.window.AquariumData);
vm.runInContext(fs.readFileSync('assets/aquarium-v06/species-content.js','utf8'),c);const after=plain(c.window.AquariumData);
assert.equal(Object.keys(after.SPECIES).length,35);
for(const [id,s]of Object.entries(after.SPECIES)){
 const {desc,knowledge,...rules}=s,{desc:oldDesc,knowledge:oldKnowledge,...oldRules}=before.SPECIES[id];assert.deepEqual(rules,oldRules,id+' must retain every non-reading field');
 for(const key of ['scientific','habitat','body','diet','habit','fun','care'])assert(knowledge[key]?.length>5,id+' '+key);
 assert(desc.length>10);assert(knowledge.sources.length);for(const ref of knowledge.sources){assert(ref.label);assert.equal(new URL(ref.url).protocol,'https:');}
 assert.equal(knowledge.sourceURL,knowledge.sources[0].url);
}
const {SPECIES:oldSpecies,...oldOther}=before,{SPECIES:newSpecies,...newOther}=after;assert.deepEqual(newOther,oldOther,'only reading content may change, including all prices, feeds, XP, achievements, tanks and decoration definitions');
for(const field of ['body','diet','habit','fun'])assert.equal(new Set(Object.values(after.SPECIES).map(s=>s.knowledge[field])).size,35,field+' must be species-specific');
assert.equal(after.SPECIES.dottyback.name,'紫繡雀鯛');assert.equal(after.SPECIES.dottyback.knowledge.scientific,'Pictichromis porphyrea');
assert.match(after.SPECIES.cory.knowledge.scientific,/類群/);assert.match(after.SPECIES.blackshrimp.knowledge.scientific,/spp\./);assert.match(after.SPECIES.pompomcrab.knowledge.habitat,/不能.*純淡水/);assert.match(after.SPECIES.kuhli.knowledge.scientific,/參考/);
console.log('PASS 35 unique, sourced species profiles; every non-reading catalog field unchanged');
