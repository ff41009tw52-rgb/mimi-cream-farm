import test from 'node:test';
import assert from 'node:assert/strict';
import {mixed,improper,classify,equal,ticks,snap,pizzaCheck,railCheck,makeTasks,lengths} from '../learning-games/fractions/core.js';
test('true/improper/mixed classification including numerator = denominator',()=>{
 assert.equal(classify(3,4),'真分數');assert.equal(classify(4,4),'假分數');assert.equal(classify(8,4),'假分數');assert.equal(classify(7,3,'mixed'),'帶分數');assert.equal(classify(2,1,'integer'),'整數');
});
test('round-trip conversion for every numerator 0..200 and denominator 2..20',()=>{
 for(let d=2;d<=20;d++)for(let n=0;n<=200;n++){const m=mixed(n,d);assert.equal(improper(m.whole,m.remainder,d),n);assert.ok(m.remainder<d);assert.equal(m.remainder===0,n%d===0);}
 assert.deepEqual(mixed(7,4),{whole:1,remainder:3,denominator:4});assert.deepEqual(mixed(6,3),{whole:2,remainder:0,denominator:3});assert.equal(improper(2,1,3),7);assert.equal(improper(3,0,4),12);
});
test('invalid fractions and mixed values rejected',()=>{
 for(const [n,d] of [[1,0],[-1,4],[1,2.5],[NaN,4],[1,Infinity]])assert.throws(()=>mixed(n,d),RangeError);
 assert.throws(()=>improper(2,3,3),RangeError);assert.throws(()=>improper(-1,1,3),RangeError);
});
test('pizza checks uncut, wrong denominator, too few/many, missing grouping, and incorrect classification',()=>{
 const q={n:7,d:4,group:true},s={d:4,count:7,groups:1};assert.equal(pizzaCheck(q,s),'ok');
 assert.equal(pizzaCheck(q,{...s,d:0}),'uncut');assert.equal(pizzaCheck(q,{...s,d:8}),'denominator');assert.equal(pizzaCheck(q,{...s,count:6}),'few');assert.equal(pizzaCheck(q,{...s,count:8}),'many');assert.equal(pizzaCheck(q,{...s,groups:0}),'group');
 const c={n:4,d:4,classify:true};assert.equal(pizzaCheck(c,{d:4,count:4,kind:'真分數'}),'classify');assert.equal(pizzaCheck(c,{d:4,count:4,kind:'假分數'}),'ok');
});
test('ticks are equal spaced with exact integer labels, including nonzero origins',()=>{
 for(const d of [2,3,4,5,6,8,10])for(const [a,b] of [[0,1],[0,4],[4,6],[10,12]]){
  const t=ticks(a,b,d);assert.equal(t.length,(b-a)*d+1);assert.equal(t[0].n,a*d);assert.equal(t.at(-1).n,b*d);
  for(let i=1;i<t.length;i++){assert.equal(t[i].n-t[i-1].n,1);assert.ok(Math.abs(t[i].x-t[i-1].x-1/((b-a)*d))<1e-12);}
  for(const p of t)assert.equal(snap(p.x,a,b,d),p.n);
 }
 assert.equal(snap(-4,4,6,3),12);assert.equal(snap(10,4,6,3),18);
});
test('train uses rational math and rebuilt denominator, not pixel equality',()=>{
 for(const [n,d] of [[3,4],[7,5],[7,3],[12,4],[17,3],[67,6]]){
  assert.equal(railCheck({n,d},{n,d}),'ok');assert.equal(railCheck({n,d},{n:n-1,d}),'before');assert.equal(railCheck({n,d},{n:n+1,d}),'after');assert.equal(railCheck({n,d},{n,d:0}),'unbuilt');assert.equal(railCheck({n,d},{n:n*2,d:d*2}),'denominator');
  const m=mixed(n,d);assert.ok(equal(n,d,improper(m.whole,m.remainder,d),d));
 }
 assert.equal(railCheck({type:'build',n:0,d:4},{n:0,d:4}),'ok');
});
test('all sessions contain stages 1-5 and remain solvable within pizza capacity and track bounds',()=>{
 for(const game of ['pizza','rail'])for(const length of Object.keys(lengths))for(const difficulty of ['gentle','standard','advanced'])for(const r of [0,.13,.49,.83,.9999]){
  const tasks=makeTasks(game,length,difficulty,()=>r);assert.equal(tasks.length,lengths[length][game]);assert.equal(new Set(tasks.map(q=>q.stage)).size,5);
  for(const q of tasks){assert.ok([2,3,4,5,6,8,10].includes(q.d));assert.ok(q.n/q.d<=6);assert.ok(q.n/q.d>=(q.start||0));if(q.form==='mixed')assert.ok(q.n>q.d&&q.n%q.d>0);if(q.form==='integer')assert.equal(q.n%q.d,0);if(q.type==='pair')assert.equal(q.form,'fraction');}
 }
});
