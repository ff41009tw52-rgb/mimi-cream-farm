// Integer arithmetic is the source of truth. Pixels only select a tick index.
export function checkFraction(n,d) {
  if (!Number.isSafeInteger(n)||n<0||!Number.isSafeInteger(d)||d<1) throw new RangeError('Invalid fraction');
}
export function mixed(n,d) { checkFraction(n,d); return {whole:Math.floor(n/d),remainder:n%d,denominator:d}; }
export function improper(w,r,d) { checkFraction(r,d); if(!Number.isSafeInteger(w)||w<0||r>=d) throw new RangeError('Invalid mixed number'); return w*d+r; }
export function classify(n,d,form='fraction') { checkFraction(n,d); if(form==='mixed'&&n>d&&n%d) return '帶分數'; if(form==='integer') return '整數'; return n<d?'真分數':'假分數'; }
export function equal(a,b,c,d) {checkFraction(a,b);checkFraction(c,d);return a*d===c*b;}
export function ticks(start,end,d) { if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start)throw new RangeError('Invalid range');checkFraction(0,d);return Array.from({length:(end-start)*d+1},(_,i)=>({n:start*d+i,d,x:i/((end-start)*d)})); }
export function snap(ratio,start,end,d) {return Math.max(start*d,Math.min(end*d,start*d+Math.round(Math.max(0,Math.min(1,ratio))*(end-start)*d)));}
export function pizzaCheck(q,s) {
  if(!s.d) return 'uncut';
  if(s.d!==q.d) return 'denominator';
  if(s.count!==q.n) return s.count<q.n?'few':'many';
  if(q.group && s.groups!==Math.floor(q.n/q.d)) return 'group';
  if(q.classify && s.kind!==classify(q.n,q.d,q.form)) return 'classify';
  return 'ok';
}
export function railCheck(q,s) {
  if(!s.d)return 'unbuilt';
  if(s.d!==q.d)return 'denominator';
  if(q.type==='build')return 'ok';
  return equal(s.n,s.d,q.n,q.d)?'ok':s.n*q.d<q.n*s.d?'before':'after';
}
const Q=(stage,n,d,type,form='fraction',extra={})=>({stage,n,d,type,form,...extra});
export const lengths={quick:{pizza:7,rail:6},normal:{pizza:12,rail:10},full:{pizza:20,rail:18}};
export function makeTasks(game,length='normal',difficulty='standard',random=Math.random) {
 const rand=a=>a[Math.min(a.length-1,Math.floor(random()*a.length))];
 const ds=difficulty==='gentle'?[2,3,4]:difficulty==='advanced'?[3,4,5,6,8,10]:[2,3,4,5,6,8];
 let tasks=game==='pizza'?[
 Q(1,3,4,'cut'),Q(2,5,4,'serve','fraction',{classify:true}),Q(2,4,4,'serve','fraction',{classify:true}),
 Q(3,7,4,'group','fraction',{group:true}),Q(3,6,3,'group','fraction',{group:true}),
 Q(4,7,3,'reverse','mixed'),Q(5,8,4,'reverse','integer')]:[
 Q(1,0,4,'build'),Q(2,3,4,'stop'),Q(3,7,5,'stop'),Q(4,7,3,'stop','mixed'),Q(5,7,3,'pair'),Q(5,12,4,'stop')];
 while(tasks.length<lengths[length][game]) {
  const d=rand(ds), w=rand(difficulty==='advanced'?[1,2,3,4,5]:[1,2,3]),r=rand(Array.from({length:d-1},(_,i)=>i+1));
  if(game==='pizza') {
   const type=rand(['cut','serve','group','reverse','integer']);const n=type==='cut'?r:type==='integer'?w*d:w*d+r;
   tasks.push(Q(5,n,d,type==='integer'?'reverse':type,type==='reverse'?'mixed':type==='integer'?'integer':'fraction',{group:type==='group',classify:type==='serve'}));
  } else {
   const type=rand(['stop','stop','pair']),n=w*d+r;
   tasks.push(Q(5,n,d,type,type==='pair'?'fraction':rand(['fraction','mixed']),difficulty==='advanced'?{start:Math.max(0,w-1)}:{}));
  }
 }
 return tasks;
}
