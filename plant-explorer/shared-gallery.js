/* 全班共用植物圖鑑與校園地圖：唯讀同一個 Google Drive 收件端。 */
(function(){
  'use strict';
  const config=window.PLANT_DRIVE_CONFIG||{},endpoint=config.receiverUrl||'';
  const valid=/^https:\/\/script\.google\.com\/(?:macros\/s\/|a\/macros\/[A-Za-z0-9.-]+\/s\/)[A-Za-z0-9_-]+\/exec$/.test(endpoint);
  const section=document.getElementById('section-almanac');
  const mapSection=document.getElementById('section-map');
  if(!section||!mapSection)return;
  let cloudRecords=[],lastSync=0,loadingPromise=null,ready=false;
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
      mapStatus.textContent='尚未連接全班圖鑑；目前地圖只顯示本機紀錄。';
      return [];
    }
    if(loadingPromise)return loadingPromise;
    if(!force&&ready&&Date.now()-lastSync<60000)return cloudRecords;
    status.textContent='正在讀取全班雲端紀錄…';
    mapStatus.textContent='正在從雲端讀取全班植物標記…';
    loadingPromise=(async()=>{
      const results=[];
      for(let page=0;page<100;page++){
        const data=await request({action:'gallery',page:page});
        if(!data||!data.ok||!Array.isArray(data.records))throw new Error('收件端無法提供圖鑑資料');
        results.push(...data.records.filter(r=>r&&typeof r.revision==='string'));
        if(!data.hasMore||!data.records.length)break;
      }
      const unique=new Map();
      results.forEach(r=>unique.set(r.revision,r));
      cloudRecords=[...unique.values()].sort((a,b)=>String(b.submittedAt||'').localeCompare(String(a.submittedAt||'')));
      lastSync=Date.now();ready=true;
      renderGallery();renderCloudMap();
      return cloudRecords;
    })().catch(error=>{
      status.textContent='雲端同步失敗：'+error.message+'；本機作品仍保留。';
      mapStatus.textContent='雲端標記讀取失敗：'+error.message+'。請點「更新全班資料」重試。';
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
    try{
      const data=await request({action:'photo',revision,index});
      if(!data.ok||!safePhoto(data.photo))throw new Error('照片尚無法讀取');
      if(!img.isConnected)return;
      img.src=data.photo;img.alt='植物實拍照片 '+index;
    }catch{
      if(!img.isConnected)return;
      const box=img.closest('.shared-photo-box');
      if(box)box.textContent='照片暫時無法顯示，請稍後再試';
    }
  }
  function cardFor(r){
    const el=document.createElement('article');
    el.className='border border-slate-200 rounded-2xl p-3 bg-slate-50';
    el.innerHTML='<h4 class="text-lg font-black text-slate-900">'+esc(r.name||'待辨識植物')+'</h4><p class="text-xs text-slate-500 mb-3">📍 '+esc(r.location||'未填地點')+'　'+esc(r.date||'')+'</p><div class="shared-photos grid gap-2 mb-3"></div><div class="text-xs leading-6 text-slate-700">葉緣：'+esc(r.leafMarginName||'未記錄')+'<br>葉脈：'+esc(r.leafVenationName||'未記錄')+'<br>葉序：'+esc(r.leafArrangementName||'未記錄')+'<br>根系：'+esc(r.rootSystemName||'未記錄')+'<br>莖：'+esc(r.stemTypeName||'未記錄')+'</div>';
    const wrap=el.querySelector('.shared-photos');
    for(let n=1;n<=Math.min(3,Math.max(0,Number(r.photoCount)||0));n++){
      const box=document.createElement('div');box.className='shared-photo-box rounded-xl bg-slate-200 min-h-36 overflow-hidden flex items-center justify-center text-xs text-slate-500';
      const img=document.createElement('img');img.className='block w-full max-h-64 object-contain cursor-zoom-in';img.loading='lazy';img.alt='載入植物照片中';
      box.append(img);wrap.append(box);
      img.addEventListener('click',()=>{if(img.getAttribute('src'))photoDialog(img.src);});
      photo(img,r.revision,n);
    }
    return el;
  }
  function renderGallery(){
    cards.replaceChildren();
    const q=normalize(search.value);
    const filtered=cloudRecords.filter(r=>normalize(r.name).includes(q)||normalize(r.location).includes(q));
    status.textContent='全班雲端已有 '+cloudRecords.length+' 筆作品'+(q?'，目前符合 '+filtered.length+' 筆':'')+'。地圖與圖鑑同步使用相同紀錄。';
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
  function renderCloudMap(){
    const layer=document.getElementById('map-pins-layer'),count=document.getElementById('map-pins-count');
    if(!layer||!count)return;
    layer.querySelectorAll('.shared-cloud-pin').forEach(pin=>pin.remove());
    const f=document.getElementById('map-filter-feature')?.value||'ALL',localIDs=idsFromLocal();
    const remote=cloudRecords.filter(r=>!localIDs.has(r.revision)&&mapFilter(r,f));
    const localCount=ownRecords().filter(r=>Number.isFinite(r.mapX)&&Number.isFinite(r.mapY)&&localFilter(r,f)).length;
    const positions=mapLocations(),groups=new Map(),unknown=new Map();
    remote.forEach(r=>{
      const place=normalize(r.location),position=positions.get(place);
      const target=position?groups:unknown;
      if(!target.has(place))target.set(place,[]);
      target.get(place).push(r);
    });
    count.textContent=String(localCount+[...groups.values()].reduce((n,records)=>n+records.length,0));
    count.title='包含 '+localCount+' 筆本機定位紀錄及 '+[...groups.values()].reduce((n,records)=>n+records.length,0)+' 筆其他裝置上傳的雲端定位紀錄';
    for(const [place,items] of groups){
      const xy=positions.get(place),pin=document.createElement('button');
      pin.type='button';pin.className='shared-cloud-pin absolute -translate-x-1/2 -translate-y-full z-30 p-2 cursor-pointer focus:outline-emerald-500';
      pin.style.left=Math.max(5,Math.min(95,xy.x))+'%';
      pin.style.top=Math.max(10,Math.min(97,xy.y))+'%';
      pin.innerHTML='<span class="inline-flex flex-col items-center"><span class="text-[11px] font-black px-3 py-1.5 rounded-full bg-sky-700 text-white border-2 border-white shadow-lg whitespace-nowrap">🌐 '+esc(items[0].location||place)+' · '+items.length+' 筆</span><span class="text-xl leading-none drop-shadow">📍</span></span>';
      pin.setAttribute('aria-label','查看'+(items[0].location||place)+'的 '+items.length+' 筆全班觀察作品');
      pin.onclick=()=>openCloudDetails(items,items[0].location||place);layer.append(pin);
    }
    unknownPanel.replaceChildren();
    if(unknown.size){
      unknownPanel.classList.remove('hidden');
      const p=document.createElement('p');p.className='mb-2 font-bold text-amber-800';p.textContent='另有 '+[...unknown.values()].reduce((n,a)=>n+a.length,0)+' 筆雲端作品尚未對應校園地圖座標，仍可點選查看：';
      unknownPanel.append(p);
      for(const [place,items] of unknown){
        const btn=document.createElement('button');btn.type='button';btn.className='inline-block m-1 px-3 py-2 rounded-xl bg-amber-100 border border-amber-300 font-bold';
        btn.textContent=(items[0].location||'未填地點')+' · '+items.length+' 筆';btn.onclick=()=>openCloudDetails(items,items[0].location||'未填地點');unknownPanel.append(btn);
      }
    }else unknownPanel.classList.add('hidden');
    mapStatus.textContent=ready?
      '已同步雲端 '+cloudRecords.length+' 筆作品；目前地圖顯示 '+groups.size+' 個雲端地點、'+remote.length+' 筆符合篩選的其他裝置紀錄。藍色標記可查看植物照片。':
      '等待雲端資料同步；已儲存在本機的作品仍會顯示在地圖上。';
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
  const tab=document.getElementById('tab-almanac');
  if(tab){const label=tab.querySelector('span:nth-child(2)');if(label?.firstChild)label.firstChild.textContent='全班圖鑑 / 我的紀錄 (';}
  const mapHeader=mapSection.querySelector('h2')?.nextElementSibling;
  if(mapHeader)mapHeader.textContent='地圖整合本機與全班雲端植物紀錄；點擊藍色雲端標記可查看其他同學的照片。';
  panel.querySelector('#shared-refresh').onclick=()=>loadCloud(true).catch(()=>{});
  search.oninput=renderGallery;
  const mapReload=document.createElement('button');
  mapReload.type='button';mapReload.className='ml-3 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold';
  mapReload.textContent='↻ 更新全班地圖';
  mapReload.onclick=()=>loadCloud(true).catch(()=>{});
  mapStatus.append(mapReload);
  // 換頁、重新開啟或回到地圖時自動取最新版本，不要求學生手動匯入 JSON。
  setTimeout(()=>loadCloud(false).catch(()=>{}),700);
})();
