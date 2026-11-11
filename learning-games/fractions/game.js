import {mixed,classify,ticks,snap,pizzaCheck,railCheck,makeTasks,lengths} from './core.js';
const game=document.body.dataset.game, app=document.querySelector('#app'), isPizza=game==='pizza';
const titles=isPizza?['披薩切切樂','真分數與假分數','合成完整披薩','反向分數挑戰','混合訂單']:['建造軌道','尋找真分數','超過 1 的分數','帶分數挑戰','分數位置解謎'];
let length='normal',difficulty='standard',tasks=[],index=0,records=[],state,review=false,original=null,scale=1;
const $=s=>document.querySelector(s);
const frac=(n,d)=>`<span class="frac" role="math" aria-label="${d} 分之 ${n}"><span aria-hidden="true">${n}</span><span aria-hidden="true">${d}</span></span>`;
function amount(n,d,form='fraction') {const m=mixed(n,d);return form==='fraction'?frac(n,d):m.remainder===0?`<span>${m.whole}</span>`:m.whole===0?frac(n,d):`<span class="mixed" role="math" aria-label="${m.whole} 又 ${d} 分之 ${m.remainder}"><span>${m.whole}</span><span class="join">又</span>${frac(m.remainder,d)}</span>`;}
const cat=(orange=false)=>`<svg class="cat" viewBox="0 0 120 110" aria-hidden="true"><path d="M20 49 17 14 44 32Q60 24 77 32L103 14 100 53Q115 81 92 94Q60 110 28 94Q7 82 20 49" fill="${orange?'#df9952':'#fffdf5'}" stroke="#68627c" stroke-width="2.5"/><path d="M23 26 27 48 39 36M96 26 81 36 94 48" fill="#efc4bb"/><path d="M60 40Q44 64 30 72Q30 97 60 99Q90 97 90 72Q76 64 60 40" fill="#fffdf5"/>${orange?'<path d="m47 32 5 13m8-16v14m12-11-5 13" stroke="#ad662f" stroke-width="5"/>':''}<ellipse cx="40" cy="63" rx="6" ry="8" fill="${orange?'#8c884a':'#6e8d9e'}"/><ellipse cx="80" cy="63" rx="6" ry="8" fill="${orange?'#8c884a':'#6e8d9e'}"/><ellipse cx="41" cy="64" rx="2" ry="6" fill="#303650"/><ellipse cx="79" cy="64" rx="2" ry="6" fill="#303650"/><path d="m55 77 5 5 5-5" fill="#d79397"/><path d="M60 82v4m0 0q-5 5-10 0m10 0q5 5 10 0M17 72l18 3M16 84l18-3m52-6 18-3m-18 9 18 3" fill="none" stroke="#68627c" stroke-width="2"/></svg>`;
const pizzaArt=(size=100,d=4)=>`<svg viewBox="0 0 100 100" width="${size}" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#d59651"/><circle cx="50" cy="50" r="39" fill="#ffdf87"/><g fill="#d97152"><circle cx="34" cy="30" r="7"/><circle cx="68" cy="36" r="7"/><circle cx="40" cy="66" r="7"/><circle cx="70" cy="68" r="6"/></g>${Array.from({length:d},(_,i)=>`<path d="M50 50L${50+39*Math.cos(-Math.PI/2+i*2*Math.PI/d)} ${50+39*Math.sin(-Math.PI/2+i*2*Math.PI/d)}" stroke="#a66a35" stroke-width="2"/>`).join('')}</svg>`;
function bind(id,fn){$(id)?.addEventListener('click',fn);}
function speech(html,type=''){const m=$('#feedback');m.innerHTML=html;m.className='feedback '+type;}
function warn(text){const box=document.createElement('div');box.innerHTML=text;box.querySelectorAll('[role=math]').forEach(e=>{e.replaceWith(e.getAttribute('aria-label')||e.textContent);});state.errors.push(box.textContent.replace(/\s+/g,' '));speech(text,'warn');}
function setup(){
 app.innerHTML=`<section class="card intro-layout"><div><div class="scene-preview ${game}">${isPizza?'<div style="width:100%;height:22px;background:repeating-linear-gradient(90deg,#8065bc 0 30px,#fff7e9 30px 60px)"></div>'+pizzaArt()+cat():`<svg viewBox="0 0 360 140" aria-hidden="true"><path d="M15 110h330" stroke="#b2b6cc" stroke-width="12"/><path d="M15 110h330" stroke="#fff" stroke-width="2" stroke-dasharray="8 10"/><rect x="105" y="49" width="74" height="51" rx="12" fill="#5268c9"/><rect x="161" y="23" width="49" height="77" rx="9" fill="#8a72cb"/><rect x="170" y="33" width="29" height="26" rx="4" fill="#ffeaba"/><circle cx="128" cy="103" r="13" fill="#303650"/><circle cx="191" cy="103" r="13" fill="#303650"/><path d="M262 50v60m0-60 48 15-48 15" fill="#ffd36b" stroke="#a87d2b" stroke-width="3"/></svg>`}</div><ol class="instructions">${isPizza?'<li>看訂單，選切法，再點選披薩片。</li><li>不夠時補一個；點同一片可以取消。</li><li>把小片合成整個，再送出訂單。</li>':'<li>先看每個單位要平分成幾格。</li><li>點刻度、拖火車，或按前進與後退。</li><li>確認位置，再讓火車停靠。</li>'}</ol></div><div class="setup"><fieldset><legend>練習長度</legend><div class="options" id="length-options">${[['quick','快速練習','約 5 分鐘'],['normal','一般挑戰','約 10 分鐘'],['full','完整闖關','約 15～20 分鐘']].map(([v,t,h])=>`<button data-length="${v}" aria-pressed="${length===v}">${t}<small>${h}・${lengths[v][game]} 個任務</small></button>`).join('')}</div></fieldset><fieldset><legend>難度</legend><div class="options" id="difficulty-options">${[['gentle','慢慢探索','變化題使用 2～4 等份'],['standard','一般挑戰','變化題最多 8 等份'],['advanced','進階挑戰',isPizza?'最多 10 等份與 6 個披薩':'最多 10 等份，加入非零起點']].map(([v,t,h])=>`<button data-difficulty="${v}" aria-pressed="${difficulty===v}">${t}<small>${h}</small></button>`).join('')}</div></fieldset><p class="sub">先完成共同的基本操作，再依難度變換任務。沒有倒數計時，可以慢慢試。</p><button id="start" class="primary" style="width:100%;margin-top:16px">開始遊戲</button></div></section>`;
 app.querySelectorAll('[data-length]').forEach(b=>b.onclick=()=>{length=b.dataset.length;setup();});
 app.querySelectorAll('[data-difficulty]').forEach(b=>b.onclick=()=>{difficulty=b.dataset.difficulty;setup();});
 bind('#start',()=>{tasks=makeTasks(game,length,difficulty);index=0;records=[];review=false;original=null;round();});
}
function taskTarget(q){return q.type==='build'?`每個單位分成 <strong>${q.d}</strong> 格`:amount(q.n,q.d,q.form)+(isPizza?' 個':'');}
function round(){
 if(index>=tasks.length){results();return;}
 const q=tasks[index];
 state={d:0,selected:new Set(),packs:[],pizzas:1,n:(q.start||0)*q.d,kind:'',solved:false,errors:[],phase:0,first:null};
 const action=isPizza?(q.group?'選好片數後，每次合成一個完整披薩，再出餐。':q.form==='mixed'||q.form==='integer'?`每個披薩切 ${q.d} 等份，準備完整披薩與小片。`:'每個披薩大小相同。先選切法，再拿客人要的片數。'):(q.type==='build'?'0 到 1 是一個單位。先選等分數，再鋪好軌道。':`每個單位分成 ${q.d} 格。${q.type==='pair'?'先送第一位乘客，再找第二位乘客的下車位置。':'移動火車，找到車票上的位置。'}`);
 app.innerHTML=`<ol class="steps" aria-label="關卡進度">${titles.map((t,i)=>`<li class="${i+1===q.stage?'active':i+1<q.stage?'past':''}" ${i+1===q.stage?'aria-current="step"':''}>${i+1}. ${t}</li>`).join('')}</ol><div class="progressbar"><span>${review?'回顧':'任務'} ${index+1} / ${tasks.length}</span><progress max="${tasks.length}" value="${index}" aria-label="任務完成進度"></progress><span>完成 ${index}</span></div><div class="play-layout"><aside class="order">${cat(!isPizza)}<h2>${isPizza?'顧客訂單':q.type==='build'?'軌道工程單':'乘客車票'}</h2><div id="target" class="order-target">${taskTarget(q)}</div><p id="order-note">${action}</p></aside><div class="workbench"><section class="card"><h2 tabindex="-1" id="task-title">${titles[q.stage-1]}</h2><div id="workspace"></div><div id="feedback" class="feedback" role="status" aria-live="polite"></div><button id="next" class="primary next" hidden>${index===tasks.length-1?'查看成果':'下一個任務 →'}</button></section><details class="guide"><summary>操作說明</summary><p>${isPizza?'分母決定每個披薩平分成幾片；分子表示要拿幾片。合成整個後，可以按「拆回小片」重新選。更換切法會把這張訂單的披薩放回去。':'0 到 1、1 到 2 的長度一樣。每格都是一個單位分數。可點刻度或拖火車，左右方向鍵和下方按鈕也能移動。長軌道可以左右滑動。更換等分數時，火車回到軌道起點。'}</p></details></div></div>`;
 if(isPizza)renderPizza(q);else renderRail(q);
 bind('#next',()=>{if(state.solved){index++;round();}});
 $('#task-title').focus({preventScroll:true});
}
function finish(q,explanation){
 if(state.solved)return;state.solved=true;records.push({q:{...q},errors:[...state.errors]});
 speech(`<span class="success-stamp">${isPizza?'出餐完成':'停靠完成'}</span>${explanation}`,'good');
 $('#next').hidden=false;app.querySelector('progress').value=index+1;
 $('#workspace').querySelectorAll('button,select').forEach(b=>b.disabled=true);
 $('#workspace').querySelectorAll('[role=button]').forEach(b=>{b.setAttribute('aria-disabled','true');b.setAttribute('tabindex','-1');});
}
function cuttingTools(label,action){return `<div class="cut-tools"><label for="denominator">${label}</label><select id="denominator"><option value="">選等分數</option>${[2,3,4,5,6,8,10].map(d=>`<option value="${d}">${d} 等份</option>`).join('')}</select><button id="cut">${action}</button></div>`;}
function changeD(fn){bind('#cut',()=>{if(state.solved)return;const d=Number($('#denominator').value);if(!d){warn('先選擇每個單位要分成幾等份。');return;}state.d=d;state.selected.clear();state.packs=[];state.kind='';state.phase=0;state.first=null;speech('');fn();});}
const selectionCount=()=>state.selected.size+state.packs.length*state.d;
function wedge(i,d,r=85,c=100){const a=-Math.PI/2+i*2*Math.PI/d,b=a+2*Math.PI/d;return `M${c} ${c}L${c+r*Math.cos(a)} ${c+r*Math.sin(a)}A${r} ${r} 0 0 1 ${c+r*Math.cos(b)} ${c+r*Math.sin(b)}Z`;}
function renderPizza(q){
 $('#workspace').innerHTML=cuttingTools('每個披薩平分成','切好披薩')+`<div id="pizza-status" class="statusline">還沒切披薩。每個完整披薩都算 1 個。</div><div class="board"><div id="pizzas" class="pizzas"></div><div class="row"><button id="add">＋ 補一個披薩</button><span class="sub">每個披薩大小相同</span></div></div><div id="packing"><h3>出餐盤</h3><div id="packed" class="packed-tray"></div><div class="row"><button id="pack">合成 1 個</button><button id="unpack">拆回小片</button></div></div>${q.classify?'<div class="classify"><h3>訂單上的分數叫什麼？</h3><div class="row" id="kinds">'+['真分數','假分數','帶分數'].map(t=>`<button data-kind="${t}" aria-pressed="false">${t}</button>`).join('')+'</div></div>':''}<div class="controls"><button id="reset">重新操作</button><button id="check" class="primary">送出訂單</button></div>`;
 function draw(){
 const packedIds=new Set(state.packs.flat());
 $('#pizzas').innerHTML=Array.from({length:state.pizzas},(_,p)=>`<div class="pizza-item"><small>第 ${p+1} 個披薩 = 1 個</small><svg viewBox="0 0 200 200" role="group" aria-label="第 ${p+1} 個披薩${state.d?'，'+state.d+' 等份':'，還沒切'}"><circle cx="100" cy="100" r="94" fill="#d49855" stroke="#ad7139" stroke-width="2"/>${!state.d?'<circle cx="100" cy="100" r="85" fill="#ffdf8d"/>':Array.from({length:state.d},(_,i)=>{const id=p*state.d+i,chosen=state.selected.has(id),packed=packedIds.has(id),a=-Math.PI/2+(i+.5)*2*Math.PI/state.d,x=100+57*Math.cos(a),y=100+57*Math.sin(a);return `<path class="slice ${chosen?'chosen':''} ${packed?'packed':''}" data-piece="${id}" d="${wedge(i,state.d)}" fill="#ffe5a3" role="button" tabindex="${packed?-1:0}" aria-label="第 ${p+1} 個披薩第 ${i+1} 片，每片 ${state.d} 分之一${packed?'，已合成整個':''}" aria-pressed="${chosen||packed}" aria-disabled="${packed}"/><circle cx="${x}" cy="${y}" r="${state.d>6?5:8}" fill="#dc785a" pointer-events="none"/>${chosen?`<text class="slice-check" x="${x-8}" y="${y+7}">✓</text>`:''}`;}).join('')}</svg>${state.d?`<button data-whole="${p}">拿這一整個</button>`:''}</div>`).join('');
 $('#pizza-status').innerHTML=state.d?`已選 ${selectionCount()} 片，共 ${frac(selectionCount(),state.d)} 個<span class="sub">每片 ${frac(1,state.d)} 個</span>`:'還沒切披薩。每個完整披薩都算 1 個。';
 $('#packed').innerHTML=state.packs.map((_,i)=>`<div class="pack-unit">${pizzaArt(76,state.d)}<span>第 ${i+1} 個完整披薩</span></div>`).join('')+`<span>完整 ${state.packs.length} 個・散片 ${state.selected.size} 片</span>`;
 $('#add').disabled=state.pizzas>=6||state.solved;
 $('#unpack').disabled=!state.packs.length;
 app.querySelectorAll('[data-piece]').forEach(e=>{
 const toggle=()=>{if(state.solved||packedIds.has(+e.dataset.piece))return;const id=+e.dataset.piece;state.selected.has(id)?state.selected.delete(id):state.selected.add(id);draw();app.querySelector(`[data-piece="${id}"]`)?.focus({preventScroll:true});};
 e.addEventListener('click',toggle);e.addEventListener('keydown',v=>{if(['Enter',' '].includes(v.key)){v.preventDefault();toggle();}});
 });
 app.querySelectorAll('[data-whole]').forEach(e=>e.onclick=()=>{if(state.solved)return;const p=+e.dataset.whole;for(let i=0;i<state.d;i++){const id=p*state.d+i;if(!packedIds.has(id))state.selected.add(id);}draw();});
 }
 changeD(()=>{draw();app.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed','false'));});draw();
 bind('#add',()=>{if(state.solved||state.pizzas>=6)return;state.pizzas++;draw();});
 bind('#pack',()=>{if(state.solved)return;if(!state.d||state.selected.size<state.d){warn(`先選滿一個披薩需要的小片${state.d?'：每 '+state.d+' 片能合成 1 個':''}。`);return;}const ids=[...state.selected].slice(0,state.d);ids.forEach(i=>state.selected.delete(i));state.packs.push(ids);draw();speech(`剛剛把 ${state.d} 片放在一起，合成了 1 個完整披薩。`);});
 bind('#unpack',()=>{if(state.solved)return;const ids=state.packs.pop();if(ids)ids.forEach(i=>state.selected.add(i));draw();speech('已拆回小片，可以重新選取。');});
 app.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{state.kind=b.dataset.kind;app.querySelectorAll('[data-kind]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
 bind('#reset',()=>{if(state.solved)return;state.selected.clear();state.packs=[];state.kind='';draw();app.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed','false'));speech('披薩已放回，可以重新選。');});
 bind('#check',()=>{
 if(state.solved)return;const count=selectionCount(),code=pizzaCheck(q,{d:state.d,count,groups:state.packs.length,kind:state.kind});
 if(code==='ok'){const m=mixed(q.n,q.d);finish(q,`<div class="equation">${frac(q.n,q.d)} = ${amount(q.n,q.d,'mixed')} 個</div><p>${q.n} 片，每 ${q.d} 片組成 1 個，${m.remainder?'可以組成 '+m.whole+' 個，還有 '+m.remainder+' 片。':'剛好組成 '+m.whole+' 個，沒有剩下小片。'}</p><p>${q.n<q.d?'分子小於分母，是真分數，比 1 個少。':q.n===q.d?'分子等於分母，也是假分數，剛好等於 1。':q.form==='mixed'||q.form==='integer'?`${q.d} × ${m.whole} ＋ ${m.remainder} = ${q.n}，合起來是 ${q.n} 個${frac(1,q.d)}。`:`${q.n} ÷ ${q.d} = ${m.whole}${m.remainder?' … '+m.remainder:''}。分子大於分母，是假分數。`}</p>`);return;}
 const messages={uncut:'先選等分數，再按「切好披薩」。',denominator:`訂單要用 ${q.d} 等份。分母 ${q.d} 表示「每一個披薩」平分成 ${q.d} 片。<div class="hint-diagram" aria-label="一個單位分成 ${q.d} 等份">${'<span></span>'.repeat(q.d)}</div>`,few:`目前有 ${count} 片，還需要 ${q.n-count} 片。${q.n>state.pizzas*state.d?'這些披薩不夠，可以按「補一個披薩」。':'點還沒選的小片就能加入。'}`,many:`目前有 ${count} 片，多拿了 ${count-q.n} 片。點已選的小片取消；合成過的先拆回小片。`,group:`數量對了！接著把每 ${q.d} 片合成 1 個。還可以合成 ${Math.floor(q.n/q.d)-state.packs.length} 個。`,classify:q.n===q.d?'剛好 1 個也是假分數：分子和分母一樣大。':q.n<q.d?'圖中的量比 1 個少，分子比分母小，是真分數。':'圖中的量超過 1 個，訂單的分子比分母大，是假分數。'};
 warn(messages[code]);
 });
}
function renderRail(q){
 const start=q.start||0,end=q.type==='build'?1:Math.max(3,Math.ceil(q.n/q.d)+1);
 $('#workspace').innerHTML=cuttingTools('每個單位平分成','鋪好軌道')+`<div class="statusline" id="rail-status">先選等分數，建立刻度。</div><div class="rail-scroll" id="rail-scroll"><svg id="track" class="track" role="group" aria-label="分數軌道"></svg></div><p class="rail-note">每兩個相鄰整數間的長度都是 1。長軌道可左右滑動。</p><div class="row move-controls"><button id="back-unit">退 1 單位</button><button id="back-step">← 退 1 格</button><button id="forward-step">進 1 格 →</button><button id="forward-unit">進 1 單位</button></div><div class="controls"><button id="reset">回到起點</button><button id="check" class="primary">${q.type==='build'?'完成軌道':'確認停靠'}</button></div>`;
 let unit=240,width=800;
 function update(autoscroll=false){
 if(!state.d)return;
 $('#rail-status').innerHTML=`目前位置 ${frac(state.n,state.d)}<span class="sub">每格 ${frac(1,state.d)}・從 ${start} 出發走了 ${state.n-start*state.d} 格</span>`;
 const x=48+(state.n/state.d-start)*unit,train=$('#train');if(train){train.setAttribute('transform',`translate(${x} 156)`);train.setAttribute('aria-label',`火車，目前 ${state.d} 分之 ${state.n}，用左右方向鍵移動`);}
 if(autoscroll){const box=$('#rail-scroll');if(x<box.scrollLeft+55||x>box.scrollLeft+box.clientWidth-55)box.scrollLeft=Math.max(0,x-box.clientWidth/2);}
 }
 function move(n,auto=true){if(!state.d||state.solved)return;state.n=Math.max(start*state.d,Math.min(end*state.d,n));update(auto);}
 function draw(){
 unit=Math.max(240,(state.d||4)*44);width=96+(end-start)*unit;
 const svg=$('#track');svg.setAttribute('viewBox',`0 0 ${width} 250`);svg.style.width=width+'px';
 const points=state.d?ticks(start,end,state.d):Array.from({length:end-start+1},(_,i)=>({n:start+i,d:1,x:i/(end-start)}));
 svg.innerHTML=`<path d="M48 165H${width-48}" stroke="#9c92ae" stroke-width="13"/><path d="M48 165H${width-48}" stroke="#fff" stroke-width="3" stroke-dasharray="8 9"/>${points.map(t=>{const x=48+t.x*(width-96),integer=t.n%t.d===0;return `<g class="tick-target" data-tick="${t.n}"><rect x="${x-21}" y="143" width="42" height="75" fill="transparent"/><path d="M${x} ${integer?151:158}v${integer?39:25}" stroke="${integer?'#303650':'#716985'}" stroke-width="${integer?3:2}"/>${integer?`<text x="${x}" y="222" fill="#303650" font-size="22" font-weight="700" text-anchor="middle">${t.n/t.d}</text>`:''}</g>`;}).join('')}${state.first!==null?`<g aria-label="第一位乘客的位置"><path d="M${48+(state.first/q.d-start)*unit} 85v65" stroke="#ab6b1e" stroke-width="3"/><path d="M${48+(state.first/q.d-start)*unit} 85l35 12-35 12Z" fill="#ffd36b"/></g>`:''}${state.d?`<g id="train" class="train" role="button" tabindex="0"><title>橘咪咪的小火車</title><rect x="-31" y="-49" width="55" height="48" rx="9" fill="#5268c9"/><rect x="-9" y="-74" width="39" height="67" rx="6" fill="#8a72cb"/><rect x="-3" y="-68" width="27" height="29" rx="4" fill="#fff2b7"/><path d="M1-54-1-64 7-59 15-64 19-54Q20-43 10-43Q0-43 1-54" fill="#df9952" stroke="#754c32"/><circle cx="6" cy="-53" r="1.5" fill="#303650"/><circle cx="14" cy="-53" r="1.5" fill="#303650"/><circle cx="-17" cy="-1" r="9" fill="#303650"/><circle cx="20" cy="-1" r="9" fill="#303650"/><rect x="-40" y="-85" width="82" height="95" fill="transparent"/></g>`:''}`;
 svg.querySelectorAll('[data-tick]').forEach(e=>e.addEventListener('click',()=>move(+e.dataset.tick)));
 if(state.d){
 const train=$('#train');let dragging=false;
 train.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();move(e.key==='Home'?start*state.d:e.key==='End'?end*state.d:state.n+(e.key==='ArrowRight'?1:-1));}});
 train.addEventListener('pointerdown',e=>{if(state.solved)return;e.preventDefault();dragging=true;train.setPointerCapture(e.pointerId);});
 train.addEventListener('pointermove',e=>{if(!dragging)return;const rect=svg.getBoundingClientRect(),x=(e.clientX-rect.left)*width/rect.width;move(snap((x-48)/(width-96),start,end,state.d),false);});
 train.addEventListener('pointerup',()=>{dragging=false;update(true);});train.addEventListener('pointercancel',()=>dragging=false);
 }update();
 }
 changeD(()=>{state.n=start*state.d;$('#target').innerHTML=taskTarget(q);if(q.type==='pair')$('#order-note').textContent='先送第一位乘客，再找第二位乘客的下車位置。';draw();$('#rail-scroll').scrollLeft=0;});draw();
 [['#back-unit',()=>-state.d],['#back-step',()=>-1],['#forward-step',()=>1],['#forward-unit',()=>state.d]].forEach(([id,step])=>bind(id,()=>{if(!state.d){warn('先鋪好軌道，再移動火車。');return;}move(state.n+step());}));
 bind('#reset',()=>{if(state.solved)return;move(start*state.d);speech('火車已回到起點。');});
 bind('#check',()=>{
 if(state.solved)return;const code=railCheck(q,state);
 if(code!=='ok'){
 const m=mixed(q.n,q.d);warn(code==='unbuilt'?'先選等分數，按「鋪好軌道」。':code==='denominator'?`這張車票使用 ${q.d} 等份。請把「每個單位」分成 ${q.d} 格，重新鋪好軌道。`:`現在停在 ${frac(state.n,state.d)}，${code==='before'?'還沒到站':'已經超過了'}。目標在 ${m.whole}${m.remainder?' 和 '+(m.whole+1)+' 之間，從 '+m.whole+' 再往右走 '+m.remainder+' 格':' 的整數位置'}。`);return;
 }
 if(q.type==='pair'&&state.phase===0){state.first=state.n;state.phase=1;$('#target').innerHTML=amount(q.n,q.d,'mixed');$('#order-note').textContent='第一位乘客已下車（黃色旗子）。火車回到起點，送第二位乘客，看看會停在哪裡。';state.n=start*state.d;draw();$('#rail-scroll').scrollLeft=0;speech('換一張車票，再操作一次。');return;}
 finish(q,q.type==='build'?`<p>0 到 1 平分成 ${q.d} 格，每格是 ${frac(1,q.d)}。繼續用這樣的刻度找位置。</p>`:`<div class="equation">${frac(q.n,q.d)} = ${amount(q.n,q.d,'mixed')}</div><p>${q.type==='pair'?'兩位乘客在同一面旗子下車。假分數和帶分數的寫法不同，位置一樣。':`從 ${start} 出發，每格走 ${frac(1,q.d)}，走 ${q.n-start*q.d} 格，就停在這裡。`}</p>`);
 });
}
function results(){
 if(!review)original=[...records];
 const errors=records.filter(r=>r.errors.length),first=records.length-errors.length;
 app.innerHTML=`<section class="card"><span class="success-stamp">${review?'回顧完成':'本次任務完成'}</span><h2 style="margin-top:16px">${isPizza?'餐廳出餐紀錄':'火車行程紀錄'}</h2><div class="result-stats"><div class="stat"><strong>${records.length}</strong>完成任務</div><div class="stat"><strong>${first}</strong>第一次就完成</div><div class="stat"><strong>${errors.length}</strong>看提示後完成</div></div><h3>這次操作過的概念</h3><p>${isPizza?'等分與單位量、真分數與假分數、整數與帶分數的互換。':'等距刻度、真分數與超過 1 的位置、假分數與帶分數的同一位置。'}</p><div class="row">${errors.length?'<button class="primary" id="review">再操作需要提示的任務</button>':''}<button id="again">重新選擇挑戰</button>${review?'<button id="original">看原來的成果</button>':''}</div><details class="guide" ${errors.length?'open':''}><summary>任務紀錄與錯題回顧（${records.length}）</summary><ul class="results-list">${records.map((r,i)=>`<li><strong>${i+1}. ${titles[r.q.stage-1]}</strong><div class="equation">${r.q.type==='build'?'每個單位分成 '+r.q.d+' 格':`${amount(r.q.n,r.q.d,r.q.form)} = ${amount(r.q.n,r.q.d,r.q.form==='fraction'?'mixed':'fraction')}`}</div><div>${r.errors.length?'已修正並完成':'第一次就完成'}</div>${r.errors.map(e=>`<p class="review-errors">提示：${e}</p>`).join('')}</li>`).join('')}</ul></details><p class="sub">這份紀錄保留在本次遊戲中；重新整理頁面後會重新開始。</p></section>`;
 bind('#again',setup);bind('#review',()=>{tasks=errors.map(r=>({...r.q}));records=[];index=0;review=true;round();});bind('#original',()=>{records=[...original];review=false;results();});
 app.querySelector('h2').setAttribute('tabindex','-1');app.querySelector('h2').focus({preventScroll:true});window.scrollTo(0,0);
}
function font(delta){scale=Math.max(1,Math.min(1.6,Math.round((scale+delta)*10)/10));document.documentElement.style.setProperty('--scale',scale);$('#smaller').disabled=scale===1;$('#larger').disabled=scale===1.6;}
bind('#smaller',()=>font(-.2));bind('#larger',()=>font(.2));font(0);setup();
