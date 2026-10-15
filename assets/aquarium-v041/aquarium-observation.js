/* Modal owns transient teaching controls only. It is ticked by the game's single RAF. */
(() => {
'use strict';
const C=window.AquariumObservationContent,R=window.AquariumObservationRenderer;
const $=id=>document.getElementById(id);
function create({getFish,drawSpecimen}){
 let topic='anatomy',partId='dorsal',time=0,speed=1,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 let labels=true,arrows=true,water=true,cutaway=false,focus='all',zoom=1,tracking=true,fishId=null,phase=-1,opener=null,draws=0;
 const modal=document.createElement('dialog');modal.id='observation';modal.setAttribute('aria-labelledby','obs-title');
 modal.innerHTML=`<header class="obs-header"><div><span class="eyebrow">觀察身邊的生命</span><h2 id="obs-title">${C.title}</h2></div><button id="obs-return" class="obs-return">返回水族箱</button></header>
 <div class="obs-scroll"><nav class="obs-tabs" role="tablist" aria-label="觀察主題">${Object.entries(C.topics).map(([key,v])=>`<button role="tab" id="obs-tab-${key}" data-topic="${key}" aria-controls="obs-panel">${v.tab}</button>`).join('')}</nav>
 <section class="obs-specimen" aria-label="我養的魚兒"><div class="specimen-window"><canvas id="obs-specimen" width="360" height="180" aria-label="目前選取魚兒的遊戲外形與游動"></canvas></div><div><label for="obs-fish-choice">我養的魚兒</label><select id="obs-fish-choice"></select><p id="obs-fish-note"></p></div><div class="specimen-actions"><button id="obs-track" aria-pressed="true">追蹤魚兒</button><button id="obs-enlarge" aria-pressed="false">放大魚兒</button></div></section>
 <section id="obs-panel" role="tabpanel" aria-labelledby="obs-tab-anatomy"><div class="obs-topic-intro"><h3 id="obs-topic-title"></h3><p id="obs-intro"></p><p class="obs-question" id="obs-question"></p></div>
 <div class="obs-workspace"><figure class="obs-figure"><figcaption><span>${C.schematic}</span><span id="obs-view-name">側面觀察</span></figcaption><div id="obs-vector"></div><div class="obs-topview" id="obs-topview" hidden><span>俯視：看左右擺動</span><canvas id="obs-top-canvas" aria-label="由上往下看，身體與尾部左右擺動的游動示意"></canvas></div><p id="obs-caption"></p></figure>
 <aside class="obs-detail"><p class="obs-hint" id="obs-hint"></p><div id="obs-part-list" class="obs-part-list" aria-label="選擇構造"></div><div class="obs-selection" aria-live="polite"><h4 id="obs-part-name"></h4><p id="obs-part-description"></p></div><p class="obs-review"><strong>複習重點</strong><span id="obs-review"></span></p></aside></div>
 <div id="obs-swim-options" class="obs-option-row" hidden><button data-focus="all">整體游動</button><button data-focus="tail">觀察尾鰭</button><button data-focus="fins">觀察其他鰭</button><button data-focus="turn">觀察轉彎</button></div>
 <div id="obs-breath-phases" class="obs-breath-phases" hidden>${C.phases.map((text,i)=>`<button data-phase="${i}"><span>${i+1}</span>${text}</button>`).join('')}</div>
 <div class="obs-controls"><button id="obs-play" class="obs-play">暫停</button><label class="obs-speed" for="obs-speed">播放速度 <output id="obs-speed-value">1×</output><input id="obs-speed" type="range" min="0.5" max="2" step="0.5" value="1" list="obs-speed-ticks" aria-valuetext="1 倍速"><datalist id="obs-speed-ticks"><option value="0.5"></option><option value="1"></option><option value="1.5"></option><option value="2"></option></datalist><span class="obs-ticks"><span>0.5×</span><span>1×</span><span>1.5×</span><span>2×</span></span></label><div class="obs-toggles"><button id="obs-label-toggle" aria-pressed="true">隱藏構造名稱</button><button id="obs-arrow-toggle" aria-pressed="true" hidden>隱藏方向箭頭</button><button id="obs-water-toggle" aria-pressed="true" hidden>顯示水流</button><button id="obs-cutaway" aria-pressed="false" hidden>看看鰓蓋裡面</button></div></div>
 <p class="obs-footnote">播放速度只改變觀察示意，養魚遊戲仍照原本的速度進行。</p></section></div>`;
 document.body.append(modal);const renderer=R.makeRenderer($('obs-vector'));
 const on=(id,fn)=>$(id).addEventListener('click',fn);
 function describe(id){partId=id;$('obs-part-name').textContent=C.parts[id].name;$('obs-part-description').textContent=C.parts[id].description;for(const b of $('obs-part-list').children)b.setAttribute('aria-pressed',String(b.dataset.partChoice===id));paint();}
 function partList(){const ids=topic==='breathing'?['mouth','cover','gills']:Object.keys(C.parts).filter(id=>id!=='gills');$('obs-part-list').replaceChildren();for(const id of ids){const b=document.createElement('button');b.textContent=C.parts[id].name;b.dataset.partChoice=id;b.setAttribute('aria-pressed',String(partId===id));b.addEventListener('click',()=>{if(id==='gills'&&!cutaway){cutaway=true;syncControls();}describe(id);});$('obs-part-list').append(b);}}
 function setTopic(key){topic=key;time=0;phase=-1;partId=key==='breathing'?'mouth':key==='swimming'?null:'dorsal';focus='all';const v=C.topics[key];
  for(const b of modal.querySelectorAll('[data-topic]')){const active=b.dataset.topic===key;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}
  $('obs-panel').setAttribute('aria-labelledby','obs-tab-'+key);$('obs-topic-title').textContent=v.title;$('obs-intro').textContent=v.intro;$('obs-question').textContent=v.question;$('obs-hint').textContent=v.hint;$('obs-review').textContent=v.review;
  $('obs-caption').textContent=key==='breathing'?C.breathingNote:C.diagramNote;$('obs-view-name').textContent=key==='breathing'?'頭部放大':key==='swimming'?'側面與俯視觀察':'側面觀察';
  $('obs-topview').hidden=key!=='swimming';$('obs-swim-options').hidden=key!=='swimming';$('obs-breath-phases').hidden=key!=='breathing';$('obs-arrow-toggle').hidden=key!=='swimming';$('obs-water-toggle').hidden=key!=='breathing';$('obs-cutaway').hidden=key!=='breathing';$('obs-label-toggle').hidden=key==='swimming';$('obs-part-list').hidden=key==='swimming';
  modal.dataset.topic=key;partList();if(partId)describe(partId);else{$('obs-part-name').textContent='身體與鰭相互配合';$('obs-part-description').textContent=C.swimHints.all;}
  syncControls();paint();
 }
 function syncControls(){
  modal.querySelector('.obs-specimen').classList.toggle('is-enlarged',zoom>1);
  $('obs-play').textContent=playing?'暫停':'播放';$('obs-play').setAttribute('aria-label',playing?'暫停觀察動畫':'播放觀察動畫');
  for(const [id,value] of [['obs-label-toggle',labels],['obs-arrow-toggle',arrows],['obs-water-toggle',water],['obs-cutaway',cutaway],['obs-track',tracking],['obs-enlarge',zoom>1]])$(id).setAttribute('aria-pressed',String(value));
  $('obs-label-toggle').textContent=labels?'隱藏構造名稱':'顯示構造名稱';$('obs-water-toggle').textContent=water?'隱藏水流':'顯示水流';$('obs-arrow-toggle').textContent=arrows?'隱藏方向箭頭':'顯示方向箭頭';$('obs-enlarge').textContent=zoom>1?'還原大小':'放大魚兒';
  for(const b of modal.querySelectorAll('[data-focus]'))b.setAttribute('aria-pressed',String(b.dataset.focus===focus));
 }
 function paint(){if(!modal.open)return;draws++;const b=renderer.draw({topic,time,partId,labels,water,cutaway,arrows,focus});
  if(topic==='breathing'&&phase!==b.phase){phase=b.phase;for(const el of modal.querySelectorAll('[data-phase]')){const active=Number(el.dataset.phase)===phase;el.classList.toggle('current-phase',active);el.setAttribute('aria-pressed',String(active));} $('obs-hint').textContent=C.phaseHints[phase];}
  if(topic==='swimming')R.drawTopView($('obs-top-canvas'),time,focus==='turn');
  drawSpecimen($('obs-specimen'),fishId,{tracking,zoom,time,playing});
 }
 function fishChoices(preferred){const fishes=getFish();$('obs-fish-choice').replaceChildren();for(const f of fishes){const option=document.createElement('option');option.value=f.id;option.textContent=f.name+' · '+f.speciesName;$('obs-fish-choice').append(option);}fishId=fishes.some(f=>f.id===preferred)?preferred:fishes[0]?.id||null;$('obs-fish-choice').value=fishId||'';$('obs-fish-note').textContent=C.specimenNote;}
 function open(id){opener=document.activeElement;fishChoices(id);time=0;phase=-1;speed=1;zoom=1;tracking=true;labels=arrows=water=true;cutaway=false;playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;$('obs-speed').value='1';$('obs-speed').setAttribute('aria-valuetext','1 倍速');$('obs-speed-value').textContent='1×';if(!modal.open)modal.showModal();document.body.classList.add('observation-open');setTopic('anatomy');$('obs-return').focus();}
 on('obs-return',()=>modal.close());modal.addEventListener('close',()=>{document.body.classList.remove('observation-open');opener?.focus();});
 for(const b of modal.querySelectorAll('[data-topic]'))b.addEventListener('click',()=>setTopic(b.dataset.topic));
 modal.querySelector('.obs-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const keys=Object.keys(C.topics);let i=keys.indexOf(topic);i=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;setTopic(keys[i]);$('obs-tab-'+keys[i]).focus();});
 for(const b of modal.querySelectorAll('[data-focus]'))b.addEventListener('click',()=>{focus=b.dataset.focus;partId=null;$('obs-part-name').textContent=b.textContent;$('obs-part-description').textContent=C.swimHints[focus];syncControls();paint();});
 for(const b of modal.querySelectorAll('[data-phase]'))b.addEventListener('click',()=>{time=[1.2,2.25,3.6][Number(b.dataset.phase)];playing=false;syncControls();paint();});
 const choosePart=e=>{const hit=e.target.closest('[data-part]');if(hit&&(topic==='anatomy'||topic==='breathing')){const id=hit.dataset.part;if(topic==='breathing'&&!['mouth','cover','gills','head'].includes(id))return;if(id==='gills'&&!cutaway){cutaway=true;syncControls();}describe(id);}};
 $('obs-vector').addEventListener('click',choosePart);$('obs-vector').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choosePart(e);}});
 on('obs-play',()=>{playing=!playing;syncControls();paint();});
 $('obs-speed').addEventListener('input',e=>{speed=Math.max(.5,Math.min(2,Number(e.target.value)||1));$('obs-speed-value').textContent=speed+'×';$('obs-speed').setAttribute('aria-valuetext',speed+' 倍速');});
 on('obs-label-toggle',()=>{labels=!labels;syncControls();paint();});on('obs-arrow-toggle',()=>{arrows=!arrows;syncControls();paint();});on('obs-water-toggle',()=>{water=!water;syncControls();paint();});on('obs-cutaway',()=>{cutaway=!cutaway;if(!cutaway&&partId==='gills')partId='cover';syncControls();describe(partId||'cover');});
 on('obs-track',()=>{tracking=!tracking;syncControls();paint();});on('obs-enlarge',()=>{zoom=zoom>1?1:1.55;syncControls();paint();});$('obs-fish-choice').addEventListener('change',e=>{fishId=e.target.value;paint();});
 return {open,tick(dt){if(!modal.open)return;if(playing)time+=Math.max(0,Math.min(.1,dt))*speed;paint();},debug:()=>({open:modal.open,topic,partId,time,speed,playing,labels,arrows,water,cutaway,focus,zoom,tracking,fishId,draws,phase})};
}
window.AquariumObservation=Object.freeze({create});
})();
