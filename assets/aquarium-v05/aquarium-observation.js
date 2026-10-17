/* Modal owns transient teaching controls only. It is ticked by the game's single RAF. */
(() => {
'use strict';
const C=window.AquariumObservationContent,R=window.AquariumObservationRenderer;
const lessonTopics=Object.freeze({anatomy:C.topics.anatomy,breathing:C.topics.breathing});
const $=id=>document.getElementById(id);
function create({getFish,drawSpecimen}){
 let layer='mine',ownTime=0,ownPlaying=true,ownPart=null;
 let topic='anatomy',partId='dorsal';
 let labels=true,zoom=1,fishId=null,opener=null,draws=0;
 const modal=document.createElement('dialog');modal.id='observation';modal.setAttribute('aria-labelledby','obs-title');
 modal.innerHTML=`<header class="obs-header"><div><span class="eyebrow">觀察身邊的生命</span><h2 id="obs-title">${C.title}</h2></div><button id="obs-return" class="obs-return">返回水族箱</button></header>
 <nav class="obs-layers" aria-label="選擇觀察方式"><button id="obs-layer-mine" aria-pressed="true"><strong>看看我的魚</strong><small>放大看看牠的樣子</small></button><button id="obs-layer-book" aria-pressed="false"><strong>課本複習</strong><small>認識魚的構造與呼吸</small></button></nav>
 <div class="obs-scroll"><section id="obs-mine" aria-label="看看我的魚"><div class="own-fish-heading"><div><span class="eyebrow">這是你養的魚</span><h3 id="obs-own-name"></h3><p id="obs-own-info"></p></div><div><label for="obs-fish-choice">換一隻觀察</label><select id="obs-fish-choice"></select></div></div><p id="obs-own-active-part" class="own-hint" hidden></p><div class="obs-specimen"><div class="specimen-window"><canvas id="obs-specimen" width="1000" height="520" aria-label="目前選取魚兒的放大外形與動作"></canvas></div></div><p class="own-hint" id="obs-fish-note"></p><div class="own-controls"><button id="obs-own-play">暫停</button><button id="obs-own-breath">看魚怎麼呼吸</button></div><details id="obs-own-extra" class="obs-advanced"><summary>更多觀察選項</summary><button id="obs-enlarge" aria-pressed="false">放大魚兒</button></details><details id="obs-own-fins" class="own-fins"><summary>看看這隻魚的魚鰭</summary><p id="obs-own-shape-note"></p><div id="obs-own-fin-list" class="obs-part-list" aria-label="這隻魚的魚鰭"></div><p id="obs-own-fin-description" aria-live="polite">點選名稱會回到魚圖，對應的魚鰭會亮起來。</p><p class="own-footnote">魚圖是簡化的觀賞造型；幼魚以縮小造型表示，不用來判定實際魚兒的性別。</p></details><p class="own-footnote">魚種、配色與名字都來自你的魚缸。這裡的放大動作方便觀察，不會改變魚兒的成長。</p><button id="obs-to-book" class="obs-to-book">到課本複習，認識魚的構造與呼吸 →</button></section>
 <section id="obs-book" hidden aria-label="課本複習"><p class="book-intro">這裡用同一條鯉魚認識身體構造與呼吸；牠和你養的魚可能有不同外形。</p><nav class="obs-tabs" role="tablist" aria-label="課本複習主題">${Object.entries(lessonTopics).map(([key,v])=>`<button role="tab" id="obs-tab-${key}" data-topic="${key}" aria-controls="obs-panel">${v.tab}</button>`).join('')}</nav>
 <section id="obs-panel" role="tabpanel" aria-labelledby="obs-tab-anatomy"><div class="obs-topic-intro"><h3 id="obs-topic-title"></h3><p id="obs-intro"></p><p class="obs-question" id="obs-question"></p></div>
 <div class="obs-workspace"><figure class="obs-figure"><figcaption><span>${C.schematic}</span><span id="obs-view-name">側面觀察</span></figcaption><div id="obs-vector"></div><p id="obs-caption"></p></figure>
 <aside class="obs-detail"><p class="obs-hint" id="obs-hint"></p><p class="list-caption">也可以點名稱，找到同一個部位</p><div id="obs-part-list" class="obs-part-list" aria-label="構造名稱清單：也可以用名稱選取同一個部位"></div><div class="obs-selection" aria-live="polite"><h4 id="obs-part-name"></h4><p id="obs-part-description"></p></div><p class="obs-review"><strong>複習重點</strong><span id="obs-review"></span></p></aside></div>

 <div class="obs-controls"><details id="obs-display-options" class="obs-advanced"><summary>更多顯示選項</summary><button id="obs-label-toggle" aria-pressed="true">隱藏構造名稱</button></details></div>
 <div id="obs-breathing-lesson" hidden></div></section></section></div>`;
 document.body.append(modal);const renderer=R.makeRenderer($('obs-vector')),breathing=window.AquariumBreathingReview.create($('obs-breathing-lesson'));
 const lessonSiblings=[...$('obs-panel').children].filter(e=>e.id!=='obs-breathing-lesson');
 const on=(id,fn)=>$(id).addEventListener('click',fn);
 function describe(id){partId=id;$('obs-part-name').textContent=C.parts[id].name;$('obs-part-description').textContent=C.parts[id].description;for(const b of $('obs-part-list').children)b.setAttribute('aria-pressed',String(b.dataset.partChoice===id));paint();}
 function partList(){const ids=Object.keys(C.parts).filter(id=>id!=='gills');$('obs-part-list').replaceChildren();for(const id of ids){const b=document.createElement('button');b.textContent=C.parts[id].name;b.dataset.partChoice=id;b.setAttribute('aria-pressed',String(partId===id));b.addEventListener('click',()=>describe(id));$('obs-part-list').append(b);}}
 function setTopic(key){
  if(!Object.hasOwn(lessonTopics,key))return;
  topic=key;partId='dorsal';
  const isBreath=key==='breathing',v=lessonTopics[key];
  for(const b of modal.querySelectorAll('[data-topic]')){const active=b.dataset.topic===key;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}
  $('obs-panel').setAttribute('aria-labelledby','obs-tab-'+key);modal.dataset.topic=key;
  for(const el of lessonSiblings)el.hidden=isBreath;
  $('obs-breathing-lesson').hidden=!isBreath;
  breathing.setActive(modal.open&&layer==='book'&&isBreath);
  if(!isBreath){
   $('obs-topic-title').textContent=v.title;$('obs-intro').textContent=v.intro;$('obs-question').textContent=v.question;
   $('obs-hint').textContent=v.hint;$('obs-review').textContent=v.review;
   $('obs-caption').textContent='沿用呼吸教材的原版鯉魚；標記對應照片中可見的構造。';$('obs-view-name').textContent='側面觀察';
   partList();describe(partId);
  }
  syncControls();paint();
 }
 function syncControls(){
  $('obs-own-play').textContent=ownPlaying?'暫停':'播放';
  $('obs-own-active-part').hidden=!ownPart||!$('obs-own-fins').open;
  $('obs-fish-note').textContent='看看牠的尾鰭和胸鰭怎麼動。按「暫停」停下來看；想放大，可以打開「更多觀察選項」。';
  $('obs-label-toggle').setAttribute('aria-pressed',String(labels));
  $('obs-enlarge').setAttribute('aria-pressed',String(zoom>1));
  $('obs-label-toggle').textContent=labels?'隱藏構造名稱':'顯示構造名稱';
  $('obs-enlarge').textContent=zoom>1?'縮小魚兒':'放大魚兒';
 }
 function paint(){
  if(!modal.open)return;draws++;
  if(layer==='mine'){drawSpecimen($('obs-specimen'),fishId,{tracking:true,zoom,time:ownTime,playing:ownPlaying,highlightPart:$('obs-own-fins').open?ownPart:null});return;}
  if(topic==='anatomy')renderer.draw({topic:'anatomy',time:0,partId,labels,arrows:false,focus:'all'});
 }
 function fishChoices(preferred){const fishes=getFish();$('obs-fish-choice').replaceChildren();for(const f of fishes){const option=document.createElement('option');option.value=f.id;option.textContent=f.name+' · '+f.speciesName;$('obs-fish-choice').append(option);}fishId=fishes.some(f=>f.id===preferred)?preferred:fishes[0]?.id||null;$('obs-fish-choice').value=fishId||'';fishInfo();}
 function fishInfo(){const f=getFish().find(f=>f.id===fishId);ownPart=null;$('obs-own-active-part').hidden=true;const info=window.AquariumFishArt.getFinInfo(f?.species);$('obs-own-shape-note').textContent=info?.note||'';$('obs-own-fin-list').replaceChildren();$('obs-own-fin-description').textContent='點選名稱會回到魚圖，對應的魚鰭會亮起來。';for(const part of info?.parts||[]){const b=document.createElement('button');b.textContent=part.name;b.dataset.ownPart=part.id;b.setAttribute('aria-pressed','false');b.onclick=()=>{ownPart=ownPart===part.id?null:part.id;for(const button of $('obs-own-fin-list').children)button.setAttribute('aria-pressed',String(button.dataset.ownPart===ownPart));$('obs-own-fin-description').textContent=ownPart?part.name+'：'+part.description:'點選名稱會回到魚圖，對應的魚鰭會亮起來。';$('obs-own-active-part').textContent=$('obs-own-fin-description').textContent;syncControls();paint();revealOwnFin();};$('obs-own-fin-list').append(b);}$('obs-own-name').textContent=f?.name||'我的魚兒';$('obs-own-info').textContent=f?`${f.speciesName} · ${f.variantName} · 個性：${f.personalityName}`:'';}
 function setLayer(next){layer=next;modal.dataset.layer=layer;$('obs-mine').hidden=layer!=='mine';$('obs-book').hidden=layer!=='book';for(const key of ['mine','book'])$('obs-layer-'+key).setAttribute('aria-pressed',String(layer===key));if(layer==='book')setTopic(topic);else breathing.setActive(false);syncControls();paint();modal.querySelector('.obs-scroll').scrollTop=0;}
 on('obs-layer-mine',()=>setLayer('mine'));on('obs-layer-book',()=>setLayer('book'));on('obs-to-book',()=>setLayer('book'));on('obs-own-play',()=>{ownPlaying=!ownPlaying;syncControls();paint();});on('obs-own-breath',()=>{topic='breathing';setLayer('book');});
 function revealOwnFin(){if(ownPart&&$('obs-own-fins').open)$('obs-own-active-part').scrollIntoView({block:'start',behavior:'instant'});}
 $('obs-own-fins').addEventListener('toggle',()=>{syncControls();paint();});
 function open(id){opener=document.activeElement;$('obs-own-fins').open=false;$('obs-own-extra').open=false;$('obs-display-options').open=false;ownPart=null;ownTime=0;ownPlaying=true;fishChoices(id);zoom=1;labels=true;if(!modal.open)modal.showModal();document.body.classList.add('observation-open');topic='anatomy';setLayer('mine');$('obs-return').focus();}
 on('obs-return',()=>modal.close());modal.addEventListener('close',()=>{breathing.setActive(false);document.body.classList.remove('observation-open');opener?.focus();});
 for(const b of modal.querySelectorAll('[data-topic]'))b.addEventListener('click',()=>setTopic(b.dataset.topic));
 modal.querySelector('.obs-tabs').addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();
  const keys=Object.keys(lessonTopics),i=keys.indexOf(topic);
  const next=e.key==='Home'?0:e.key==='End'?keys.length-1:(i+(e.key==='ArrowRight'?1:-1)+keys.length)%keys.length;
  setTopic(keys[next]);$('obs-tab-'+keys[next]).focus();
 });
 const choosePart=e=>{const hit=e.target.closest('[data-part]');if(hit&&topic==='anatomy'&&hit.dataset.part!=='gills')describe(hit.dataset.part);};
 $('obs-vector').addEventListener('click',choosePart);$('obs-vector').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choosePart(e);}});
 on('obs-label-toggle',()=>{labels=!labels;syncControls();paint();});
 on('obs-enlarge',()=>{zoom=zoom>1?1:1.55;syncControls();paint();revealOwnFin();});$('obs-fish-choice').addEventListener('change',e=>{fishId=e.target.value;ownTime=0;fishInfo();paint();});
 return {open,tick(dt){
  if(!modal.open)return;
  if(layer==='book'&&topic==='breathing'){breathing.tick(dt);return;}
  if(layer==='mine'&&ownPlaying){ownTime+=Math.max(0,Math.min(.1,dt));paint();}
 },debug:()=>({open:modal.open,layer,ownTime,ownPlaying,ownPart,topic,partId,time:0,speed:1,playing:false,labels,arrows:false,focus:'all',zoom,tracking:true,fishId,draws,phase:-1,breathing:breathing.debug()})};

}
window.AquariumObservation=Object.freeze({create});
})();
