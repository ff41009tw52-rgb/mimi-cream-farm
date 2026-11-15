import assert from 'node:assert/strict';
import { PaperGate } from '../paper-gate.js';

const gate=new PaperGate();
const stable = {kind:'found',type:'clown',corners:[[0,0],[40,0],[40,40],[0,40]],signature:[90,130,60]};
assert.equal(gate.observe(stable),'stabilizing');
assert.equal(gate.observe({...stable,signature:[40,130,60]}),'stabilizing');
assert.equal(gate.observe(stable),'stabilizing');
assert.equal(gate.observe(stable),'stabilizing');
assert.equal(gate.observe(stable),'ready');
gate.latch('prior');
for (let i=0;i<12;i++) assert.equal(gate.observe(stable),'locked');
for (let i=0;i<4;i++) assert.equal(gate.observe({kind:'empty',removed:true}),'locked');
assert.equal(gate.observe({kind:'uncertain'}),'locked');
for (let i=0;i<4;i++) assert.equal(gate.observe({kind:'empty',removed:true}),'locked');
assert.equal(gate.observe({kind:'empty',removed:false}),'locked');
for (let i=0;i<4;i++) assert.equal(gate.observe({kind:'empty',removed:true}),'locked');
assert.equal(gate.observe({kind:'empty',removed:true}),'removed');
assert.equal(gate.observe(stable),'stabilizing');
assert.equal(gate.observe(stable),'stabilizing');
assert.equal(gate.observe(stable),'ready');
const jitterGate=new PaperGate();
const baseline={...stable,revision:2,signature:Array.from({length:28},(_,i)=>80+i)};
const shift=(x,y,signature=baseline.signature)=>({
  ...baseline,corners:baseline.corners.map(([u,v])=>[u+x,v+y]),signature,
});
const inkEdges=baseline.signature.map((value,i)=>i<5 ? value+60 : value+8);
assert.equal(jitterGate.observe(baseline),'stabilizing');
assert.equal(jitterGate.observe(shift(6,2,inkEdges)),'stabilizing');
assert.equal(jitterGate.observe(shift(-2,3)),'ready');
jitterGate.resetStability();
assert.equal(jitterGate.observe(baseline),'stabilizing');
assert.equal(jitterGate.observe(shift(6,0,baseline.signature.map(value=>value+40))),'stabilizing');
assert.equal(jitterGate.observe(baseline),'stabilizing');
assert.equal(jitterGate.observe(shift(14,0)),'stabilizing');
assert.equal(jitterGate.observe(shift(26,0)),'stabilizing');
assert.equal(jitterGate.observe(shift(38,0)),'stabilizing');
console.log('Paper gate passed: motion, stillness, duplicate, occlusion, removal, next scan');
