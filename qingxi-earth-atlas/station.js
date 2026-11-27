'use strict';
const byId=id=>document.getElementById(id),model=window.RiverModel;
const icons={mount:'<path d="m1 18 7-11 4 6 4-9 7 14M4 20c4-3 6 1 10-1 3-2 4-2 7-1M7 10l1 2 2-1"/>',book:'<path d="M3 5c4-1 6-.5 9 2 3-2.5 6-3 9-2v14c-3-.8-6-.4-9 1.5-3-2-6-2.3-9-1.5zM12 7v13"/>',cube:'<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5m-9 5v10"/>',map:'<path d="m2 5 7-2 6 3 7-3v15l-7 3-6-3-7 3zm7-2v15m6-12v15"/>',compass:'<circle cx="12" cy="12" r="10"/><path d="m12 3 3 10-3-1-3 1z" fill="currentColor"/>',focus:'<path d="M3 8V3h5m8 0h5v5m0 8v5h-5m-8 0H3v-5"/><circle cx="12" cy="12" r="3"/>',wave:'<path d="M2 8c3-3.5 6 3.5 10 0s6 3.5 10 0M2 15c3-3.5 6 3.5 10 0s6 3.5 10 0"/>',sliders:'<path d="M3 6h6m4 0h8M3 12h12m4 0h2M3 18h3m4 0h11"/><circle cx="11" cy="6" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',buoy:'<path d="M6 17l3-10h6l3 10-6 2zM12 7V2m0 1 6 2-6 1M2 21c4-3 6 2 10 0s6 2 10 0"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',play:'<path d="m8 5 10 7-10 7z" fill="currentColor" stroke="none"/>',pause:'<path d="M8 5v14m8-14v14" stroke-width="3"/>',pin:'<path d="M19 10c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0z"/><circle cx="12" cy="10" r="2"/>'};
function icon(k){return '<svg aria-hidden="true" viewBox="0 0 24 24">'+icons[k]+'</svg>'}
for(const i of document.querySelectorAll('[data-icon]'))i.innerHTML=icon(i.dataset.icon);
const notes={A:['外彎・侵蝕岸','水流在外彎較快，容易帶走岸邊的泥沙。把年份往後拉，可以看見河岸退向陸地。'],B:['內彎・堆積岸','水流在內彎較慢，泥沙容易沉下來。把年份往後拉，可以看見淺色沙洲逐漸伸進河道。']};
function show(id){byId('noteTitle').textContent=notes[id][0];byId('noteText').textContent=notes[id][1];for(const k of ['A','B']){byId('info'+k).setAttribute('aria-pressed',String(k===id));byId('pin'+k).setAttribute('aria-pressed',String(k===id))}}
for(const id of ['A','B'])for(const prefix of ['pin','info'])byId(prefix+id).onclick=()=>show(id);
const launch=byId('launch'),play=byId('playYears'),slider=byId('year');
let time=0,running=false,years=0,auto=false,autoTime=0,mapMode=false;
function setLaunchText(txt){launch.querySelector('span').textContent=txt}
launch.onclick=()=>{time=0;running=true;launch.disabled=true;setLaunchText('浮標放流中');byId('floatLive').textContent='兩個浮標同時出發';model.setRun(0,true)};
function updateYear(n){years=Math.min(10,Math.max(0,Math.round(n*10)/10));slider.value=years;byId('yearLabel').textContent='第 '+years+' 年';model.year(years)}
function playback(v){auto=v;autoTime=years;play.querySelector('span').textContent=v?'暫停變化':'播放十年變化';play.querySelector('i').innerHTML=icon(v?'pause':'play')}
slider.oninput=()=>{playback(false);updateYear(+slider.value)};
play.onclick=()=>{if(!auto&&years>=10)updateYear(0);playback(!auto)};
byId('shoreline').onchange=e=>model.shore(e.target.checked);
function view(v){mapMode=v;model.view(v);byId('view2').setAttribute('aria-pressed',String(v));byId('view3').setAttribute('aria-pressed',String(!v));byId('gesture').textContent=v?'俯視比對 · 可縮放':'拖曳旋轉 · 雙指或滾輪縮放'}
byId('view2').onclick=()=>view(true);byId('view3').onclick=()=>view(false);byId('reset').onclick=()=>model.reset();byId('in').onclick=()=>model.magnify(1.16);byId('out').onclick=()=>model.magnify(1/1.16);
byId('guideOpen').onclick=()=>byId('guide').showModal();
model.tick(dt=>{if(running){time+=dt;for(const k of ['A','B'])byId('read'+k).textContent=Math.min(time,model.endTimes[k]).toFixed(1);if(time>=model.endTimes.B){running=false;launch.disabled=false;setLaunchText('再次放流');fieldRecords.add('河流與地形','中游河灣','同步放流','兩側各 8 公尺','外彎 4.8 秒，內彎 7.2 秒');byId('floatLive').textContent='外彎 4.8 秒，內彎 7.2 秒，兩個浮標都已抵達。'}model.setRun(time,running)}
 if(auto){autoTime+=dt*1.45;const y=Math.min(10,Math.floor(autoTime*10)/10);if(y!==years)updateYear(y);if(y>=10)playback(false)}});
show('A');
