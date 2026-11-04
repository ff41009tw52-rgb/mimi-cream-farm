/* 全班共用植物圖鑑與校園地圖：唯讀同一個 Google Drive 收件端。 */
(function(){
  'use strict';
  const config=window.PLANT_DRIVE_CONFIG||{},endpoint=config.receiverUrl||'';
  const valid=/^https:\/\/script\.google\.com\/(?:macros\/s\/|a\/macros\/[A-Za-z0-9.-]+\/s\/)[A-Za-z0-9_-]+\/exec$/.test(endpoint);
  const section=document.getElementById('section-almanac');
  const mapSection=document.getElementById('section-map');
  if(!section||!mapSection)return;
  let cloudRecords=[],lastSync=0,loadingPromise=null,ready=false,syncWarning='';
  const CACHE_KEY='minan_plant_shared_gallery_last_good_v1';
  const CACHE_MAX_AGE_MS=7*24*60*60*1000;
  const photoCache=new Map(),photoRequests=new Map();
  try{
    const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
    if(cached&&Array.isArray(cached.records)&&Date.now()-cached.savedAt<CACHE_MAX_AGE_MS){
      cloudRecords=cached.records.filter(r=>r&&typeof r.revision==='string').slice(0,1000);
      if(cloudRecords.length)syncWarning='目前顯示最近同步的雲端紀錄，正在重新檢查，離線快照不代表最新資料。';
    }
  }catch{}
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=s=>String(s||'').replace(/[\s\u3000]/g,'').trim();
  const safePhoto=s=>typeof s==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s);

  const panel=document.createElement('section');
  panel.id='shared-gallery';
  panel.className='bg-white border border-emerald-200 rounded-3xl p-4 sm:p-6 mb-5 shadow-sm';
  panel.innerHTML='<div class="flex flex-wrap items-center justify-between gap-3 mb-3"><div><h3 class="text-xl font-black text-emerald-900">🌿 全班植物觀察圖鑑</h3><p class="text-sm text-slate-600">這裡與校園地圖共用同一份雲端觀察紀錄，不顯示學生個人資料。</p></div><button type="button" id="shared-refresh" class="px-4 py-2 bg-emerald-700 text-white rounded-xl font-bold">更新全班資料</button></div><label class="block text-sm font-bold text-slate-700 mb-3">搜尋全班作品<input id="shared-search" class="block w-full mt-1 rounded-xl border-2 border-slate-200 px-3 py-2" type="search" placeholder="輸入植物名稱或觀察地點"></label><p id="shared-status" role="status" class="text-sm text-slate-600 mb-3">準備連線雲端…</p><div id="shared-cards" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>';
  section.prepend(panel);
  const cards=panel.querySelector('#shared-cards'),status=panel.querySelector('#shared-status'),search=panel.querySelector('#shared-search');
  const mapStatus=document.createElement('div');
  mapStatus.id='shared-map-status';
  mapStatus.className='rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900';
  mapStatus.setAttribute('role','status');
  mapStatus.textContent='全班植物標記準備同步雲端…';
  const mapFilters=mapSection.querySelector('#map-filter-feature')?.closest('.bg-white');
  if(mapFilters)mapFilters.after(mapStatus);
  const unknownPanel=document.createElement('div');
  unknownPanel.id='shared-map-unlocated';
  unknownPanel.className='hidden bg-white border border-amber-200 rounded-2xl p-4 text-sm';
  mapSection.append(unknownPanel);
  const mapStatusMessage=document.createElement('span');
  mapStatus.replaceChildren(mapStatusMessage);
  const originalMap=window.renderCampusMap,originalSwitch=window.switchTab;
  const idsFromLocal=()=>{
    try {return new Set((typeof sharedSpecimens==='undefined'?[]:sharedSpecimens).map(s=>s.uploadRevision).filter(Boolean));}
    catch {return new Set();}
  };
  const ownRecords=()=>{
    try{return typeof sharedSpecimens==='undefined'?[]:sharedSpecimens;}
    catch{return [];}
  };
  function request(params){
    return new Promise((resolve,reject)=>{
      const name='__plantGallery_'+crypto.randomUUID().replace(/-/g,'');
      const tag=document.createElement('script');
      let settled=false;
      const finish=(error,data)=>{
        if(settled)return;settled=true;
        clearTimeout(timer);tag.remove();delete window[name];
        error?reject(error):resolve(data);
      };
      const timer=setTimeout(()=>finish(new Error('雲端回應逾時')),25000);
      window[name]=data=>finish(null,data);
      tag.onerror=()=>finish(new Error('無法連上觀察資料庫'));
      tag.src=endpoint+'?'+new URLSearchParams({...params,callback:name,t:Date.now()});
      document.head.append(tag);
    });
  }
  async function loadCloud(force=false){
    if(!valid){
      status.textContent='雲端連線設定無效，目前仍可查看本機紀錄。';
      mapStatusMessage.textContent='尚未連接全班圖鑑；目前地圖只顯示本機紀錄。';
      return [];
    }
    if(loadingPromise)return loadingPromise;
    if(!force&&ready&&Date.now()-lastSync<30000)return cloudRecords;
    status.textContent='正在讀取全班雲端紀錄…';
    mapStatusMessage.textContent='正在從雲端讀取全班植物標記…';
    loadingPromise=(async()=>{
      let results=[],metadata=null;
      // 空清單可能是部署版本或收件資料夾切換造成，先重試再更新畫面。
      for(let attempt=0;attempt<3;attempt++){
        results=[];
        for(let page=0;page<100;page++){
          const data=await request({action:'gallery',page:page,fresh:force&&page===0?'1':'0'});
          if(!data||!data.ok||!Array.isArray(data.records))throw new Error('收件端無法提供圖鑑資料');
          if(page===0)metadata=data;else if(metadata.snapshot&&data.snapshot!==metadata.snapshot)throw new Error('雲端資料更新中，請再同步一次');
          results.push(...data.records.filter(r=>r&&typeof r.revision==='string'));
          if(!data.hasMore||!data.records.length)break;
        }
        if(results.length)break;
        if(attempt<2)await new Promise(resolve=>setTimeout(resolve,600*(attempt+1)));
      }
      const unique=new Map();results.forEach(r=>unique.set(r.revision,r));
      const latest=[...unique.values()].sort((a,b)=>String(b.submittedAt||'').localeCompare(String(a.submittedAt||'')));
      const confirmedEmpty=metadata&&metadata.schema==='minan-plants-v4'&&metadata.receiverFolders>0&&!metadata.warnings&&metadata.total===0;
      if(latest.length||confirmedEmpty){
        if(metadata&&metadata.warnings){const merged=new Map(cloudRecords.map(r=>[r.revision,r]));latest.forEach(r=>merged.set(r.revision,r));cloudRecords=[...merged.values()];syncWarning='部分舊作品仍待恢復，保留上次已確認的紀錄。';}else{cloudRecords=latest;syncWarning='';}
        try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),records:cloudRecords.slice(0,1000)}));}catch{}
      }else if(cloudRecords.length){
        syncWarning='雲端目前回傳 0 筆，保留上次已確認的 '+cloudRecords.length+' 筆資料；這不代表照片已經刪除。';
      }else{
        cloudRecords=[];
        syncWarning='雲端目前回傳 0 筆。請確認 Apps Script 是否指向原本的作品資料夾，以及收件程式是否重新部署。';
      }
      if(metadata&&typeof metadata.receiverFolders!=='number'){
        syncWarning+=' 雲端目前仍是舊版讀取程式，尚未啟用跨資料夾尋找。';
      }else if(metadata&&!metadata.receiverFolders){
        syncWarning+=' 雲端沒有找到可讀取的作品收件資料夾。';
      }
      lastSync=Date.now();ready=true;
      renderGallery();renderCloudMap();
      return cloudRecords;
    })().catch(error=>{
      syncWarning='雲端同步失敗：'+error.message+'；已保留的作品不會清除。';
      renderGallery();renderCloudMap();
      throw error;
    }).finally(()=>{loadingPromise=null;});
    return loadingPromise;
  }
  function photoDialog(src){
    const dialog=document.createElement('dialog');
    dialog.className='w-[95vw] max-w-4xl max-h-[95vh] rounded-2xl bg-white p-3 shadow-2xl';
    dialog.setAttribute('aria-label','植物照片放大檢視');
    dialog.innerHTML='<div class="flex justify-end mb-2"><button type="button" class="rounded-lg bg-emerald-700 text-white px-4 py-2 font-bold">關閉照片</button></div><img alt="植物照片放大圖" class="block w-full max-h-[78vh] object-contain rounded-xl">';
    dialog.querySelector('img').src=src;
    dialog.querySelector('button').onclick=()=>dialog.close();
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    dialog.addEventListener('close',()=>dialog.remove());
    document.body.append(dialog);dialog.showModal();
  }
  async function photo(img,revision,index){
    const key=revision+'#'+index;
    try{
      let data=photoCache.get(key);
      if(!data){
        if(!photoRequests.has(key))photoRequests.set(key,request({action:'photo',revision,index}).finally(()=>photoRequests.delete(key)));
        data=await photoRequests.get(key);
        if(!data.ok||!safePhoto(data.photo))throw new Error('照片尚無法讀取');
        photoCache.set(key,data);if(photoCache.size>90)photoCache.delete(photoCache.keys().next().value);
      }
      // Cached photos resolve before cardFor appends its new card to the page.
      // Set the source immediately, including during a gallery/map rerender.
      img.src=data.photo;img.alt='植物實拍照片 '+index;
    }catch{
      if(!img.isConnected)return;
      const box=img.closest('.shared-photo-box');
      if(box){img.hidden=true;const retry=document.createElement('button');retry.type='button';retry.className='p-3 text-emerald-800 font-bold';retry.textContent='照片暫時無法讀取 · 點此重試';retry.onclick=()=>{retry.remove();img.hidden=false;photo(img,revision,index);};box.append(retry);}
    }
  }
  function cardFor(r){
    const el=document.createElement('article');
    el.className='border border-slate-200 rounded-2xl p-3 bg-slate-50';
    el.innerHTML='<h4 class="text-lg font-black text-slate-900">'+esc(r.name||'待辨識植物')+'</h4><p class="text-xs text-slate-500 mb-3">📍 '+esc(r.location||'未填地點')+'　'+esc(r.date||'')+'</p><div class="shared-photos grid gap-2 mb-3"></div><div class="text-xs leading-6 text-slate-700">葉緣：'+esc(r.leafMarginName||'未記錄')+'<br>葉脈：'+esc(r.leafVenationName||'未記錄')+'<br>葉序：'+esc(r.leafArrangementName||'未記錄')+'<br>根系：'+esc(r.rootSystemName||'未記錄')+'<br>莖：'+esc(r.stemTypeName||'未記錄')+'</div>';
    const flower=document.createElement('p');flower.className='text-xs text-pink-800 leading-6 mt-2';flower.textContent=r.hasFlower?'花部：'+(r.flowerDescription||'有花朵'):'花部：未開花／未記錄';el.append(flower);
    const wrap=el.querySelector('.shared-photos');
    for(let n=1;n<=Math.min(3,Math.max(0,Number(r.photoCount)||0));n++){
      const box=document.createElement('div');box.className='shared-photo-box rounded-xl bg-slate-200 min-h-36 overflow-hidden flex items-center justify-center text-xs text-slate-500';
      const img=document.createElement('img');img.className='block w-full max-h-64 object-contain cursor-zoom-in';img.loading='lazy';img.alt='載入植物照片中';
      box.append(img);wrap.append(box);
      img.addEventListener('click',()=>{if(img.getAttribute('src'))photoDialog(img.src);});
      if(r._localPhotos&&safePhoto(r._localPhotos[n-1])){img.src=r._localPhotos[n-1];img.alt='本機待同步植物照片 '+n;}else photo(img,r.revision,n);
    }
    return el;
  }
  function renderGallery(){
    cards.replaceChildren();
    const q=normalize(search.value);
    const filtered=cloudRecords.filter(r=>normalize(r.name).includes(q)||normalize(r.location).includes(q));
    status.textContent=(syncWarning?syncWarning+' ':'')+'目前可顯示 '+cloudRecords.length+' 筆雲端作品'+(q?'，符合搜尋 '+filtered.length+' 筆':'')+'。地圖和圖鑑使用相同資料。';
    if(!filtered.length){cards.innerHTML='<p class="col-span-full text-slate-500 p-4 rounded-2xl bg-slate-50">目前沒有符合條件的雲端紀錄。</p>';return;}
    filtered.forEach(r=>cards.append(cardFor(r)));
  }
  function mapFilter(r,filter){
    if(filter==='ALL')return true;
    if(filter==='FLOWER')return !!r.hasFlower;
    if(filter==='NET')return String(r.leafVenationName||'').includes('網狀');
    if(filter==='PARALLEL')return String(r.leafVenationName||'').includes('平行');
    if(filter==='WOODY')return String(r.stemTypeName||'').includes('木本');
    if(filter==='HERB')return String(r.stemTypeName||'').includes('草本');
    if(filter==='VINE')return String(r.stemTypeName||'').includes('藤');
    return false;
  }
  function localFilter(r,filter){
    if(filter==='ALL')return true;
    if(filter==='FLOWER')return !!r.hasFlower;
    if(filter==='NET')return r.leafVenation==='net';
    if(filter==='PARALLEL')return r.leafVenation==='parallel';
    if(filter==='WOODY')return r.stemType==='woody';
    if(filter==='HERB')return r.stemType==='herbaceous';
    if(filter==='VINE')return r.stemType==='vine';
    return false;
  }
  function mapLocations(){
    const positions=new Map();
    try {
      if(typeof locations!=='undefined')locations.forEach(l=>positions.set(normalize(l[1]),{x:l[2],y:l[3]}));
    }catch{}
    document.querySelectorAll('#campus-map-labels .campus-map-label').forEach(button=>{
      const onClick=button.getAttribute('onclick')||'';
      const match=onClick.match(/showCampusLocation\('([^']+)'\)/);
      const x=parseFloat(button.style.left),y=parseFloat(button.style.top);
      if(match&&Number.isFinite(x)&&Number.isFinite(y)&&!positions.has(normalize(match[1])))positions.set(normalize(match[1]),{x,y});
    });
    return positions;
  }
  function openCloudDetails(list,place){
    const dialog=document.createElement('dialog');
    dialog.className='w-[96vw] max-w-4xl max-h-[90vh] rounded-2xl p-4 sm:p-6 bg-white shadow-2xl';
    dialog.setAttribute('aria-label',place+'的全班觀察作品');
    const top=document.createElement('div');
    top.className='flex justify-between gap-3 items-center mb-4';
    top.innerHTML='<h3 class="text-lg font-black text-emerald-900">'+esc(place)+' · '+list.length+' 筆觀察</h3><button type="button" class="px-4 py-2 bg-emerald-700 text-white font-bold rounded-xl shrink-0">關閉</button>';
    top.querySelector('button').onclick=()=>dialog.close();dialog.append(top);
    const listEl=document.createElement('div');listEl.className='grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[72vh] overflow-y-auto';
    list.forEach(r=>listEl.append(cardFor(r)));dialog.append(listEl);
    dialog.addEventListener('close',()=>dialog.remove());
    document.body.append(dialog);dialog.showModal();
  }
  function mapRecords(){
    const combined=new Map(cloudRecords.map(r=>[r.revision,r]));
    ownRecords().forEach(r=>{const revision=r.uploadRevision||r.id;if(combined.has(revision))return;if(r.uploadState==='sent'&&ready&&!syncWarning)return;const pics=Array.isArray(r.photos)?r.photos.filter(safePhoto):(safePhoto(r.photoData)?[r.photoData]:[]);combined.set(revision,{...r,revision,photoCount:pics.length,_localPhotos:pics});});
    return [...combined.values()];
  }
  function renderCloudMap(){
    const layer=document.getElementById('map-pins-layer'),count=document.getElementById('map-pins-count');
    if(!layer||!count)return;
    layer.replaceChildren();
    const f=document.getElementById('map-filter-feature')?.value||'ALL';
    const records=mapRecords().filter(r=>mapFilter(r,f));
    const positions=mapLocations(),groups=new Map(),unknown=new Map();
    records.forEach(r=>{
      const place=normalize(r.location)||'未填地點';
      const storedXY=Number.isFinite(r.mapX)&&Number.isFinite(r.mapY)?{x:r.mapX,y:r.mapY}:null;
      const position=positions.get(place)||storedXY;
      const key=position?position.x.toFixed(2)+','+position.y.toFixed(2):place;
      const target=position?groups:unknown;
      if(!target.has(key))target.set(key,{position,items:[]});
      target.get(key).items.push(r);
    });
    const located=[...groups.values()].reduce((n,g)=>n+g.items.length,0);
    count.textContent=String(located);count.title='本機與全班雲端去重後的定位紀錄';
    for(const group of groups.values()){
      const xy=group.position,items=group.items,place=items[0].location||'觀察地點',pin=document.createElement('button');
      pin.type='button';pin.className='shared-cloud-pin absolute -translate-x-1/2 -translate-y-full z-30 p-2 cursor-pointer focus:outline-emerald-500';
      pin.style.left=Math.max(5,Math.min(95,xy.x))+'%';pin.style.top=Math.max(10,Math.min(97,xy.y))+'%';
      pin.innerHTML='<span class="inline-flex flex-col items-center"><span class="text-[11px] font-black px-3 py-1.5 rounded-full bg-sky-700 text-white border-2 border-white shadow-lg whitespace-nowrap">🌿 '+esc(place)+' · '+items.length+' 筆</span><span class="text-xl leading-none drop-shadow">📍</span></span>';
      pin.setAttribute('aria-label','查看'+place+'的 '+items.length+' 筆觀察作品');pin.onclick=()=>openCloudDetails(items,place);layer.append(pin);
    }
    unknownPanel.replaceChildren();unknownPanel.classList.toggle('hidden',!unknown.size);
    if(unknown.size){const p=document.createElement('p');p.className='mb-2 font-bold text-amber-800';p.textContent='以下作品尚未對應地圖座標，仍可查看：';unknownPanel.append(p);for(const group of unknown.values()){const items=group.items,place=items[0].location||'未填地點',btn=document.createElement('button');btn.type='button';btn.className='m-1 px-3 py-2 rounded-xl bg-amber-100 font-bold';btn.textContent=place+' · '+items.length+' 筆';btn.onclick=()=>openCloudDetails(items,place);unknownPanel.append(btn);}}
    mapStatusMessage.textContent=(syncWarning?syncWarning+' ':'')+(ready?'已取得 '+cloudRecords.length+' 筆雲端作品；地圖共有 '+groups.size+' 個觀察地點，含本機尚未同步作品。':'正在讀取全班地圖；本機作品仍保留。');
  }
  if(typeof originalMap==='function'){
    window.renderCampusMap=function(){originalMap.apply(this,arguments);renderCloudMap();};
  }
  if(typeof originalSwitch==='function'){
    window.switchTab=function(tab){
      originalSwitch(tab);
      if(tab==='map'||tab==='almanac'){
        if(!ready||Date.now()-lastSync>60000)loadCloud(false).catch(()=>{});
        else {if(tab==='map')renderCloudMap();else renderGallery();}
      }
    };
  }
  const originalLocation=window.showCampusLocation;
  window.showCampusLocation=function(name){
    if(typeof originalLocation==='function')originalLocation(name);
    search.value=name||'';renderGallery();
    loadCloud(false).catch(()=>{});
  };
  window.addEventListener('plant-cloud-upload-success',()=>loadCloud(true).catch(()=>{}));
  const tab=document.getElementById('tab-almanac');
  if(tab){const label=tab.querySelector('span:nth-child(2)');if(label?.firstChild)label.firstChild.textContent='全班圖鑑 / 我的紀錄 (';}
  const mapHeader=mapSection.querySelector('h2')?.nextElementSibling;
  if(mapHeader)mapHeader.textContent='地圖整合本機與全班雲端植物紀錄；點擊觀察標記可查看該地點的全班照片與特徵。';
  panel.querySelector('#shared-refresh').onclick=()=>loadCloud(true).catch(()=>{});
  search.oninput=renderGallery;
  const mapReload=document.createElement('button');
  mapReload.type='button';mapReload.className='ml-3 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold';
  mapReload.textContent='↻ 更新全班地圖';
  mapReload.onclick=()=>loadCloud(true).catch(()=>{});
  mapStatus.append(mapReload);
  // 換頁、重新開啟或回到地圖時自動取最新版本，不要求學生手動匯入 JSON。
  if(cloudRecords.length){renderGallery();renderCloudMap();}
  window.addEventListener('online',()=>loadCloud(true).catch(()=>{}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadCloud(true).catch(()=>{});});
  setInterval(()=>{if(!document.hidden)loadCloud(false).catch(()=>{});},60000);
  setTimeout(()=>loadCloud(false).catch(()=>{}),700);
})();
