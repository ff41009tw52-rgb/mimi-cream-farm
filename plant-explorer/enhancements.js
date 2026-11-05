(() => {
  'use strict';
  const byId=id=>document.getElementById(id), config=window.PLANT_DRIVE_CONFIG;
  function uid(){
    if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID();
    const bytes=new Uint8Array(16);
    if(window.crypto&&window.crypto.getRandomValues)window.crypto.getRandomValues(bytes);else for(let i=0;i<16;i++)bytes[i]=Math.floor(Math.random()*256);
    bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }
  const originalRender=renderAlmanac, originalPrint=populatePrintModal, originalMap=renderCampusMap;
  // Students upload anonymously; shared gallery reads only plant observation fields.
  let photos=[],editId=null,draftTimer,restoring=false,ready=false,uploadBusy=false,dbPromise,writeQueue=Promise.resolve();
  const MAX_PHOTOS=3;
  let activeUploadId=null,retryTimer=null,retryFailures=0,nextRetryAt=0;
  const openDB=()=>dbPromise ||= new Promise((resolve,reject)=>{const request=indexedDB.open('minan-plant-explorer',1);request.onupgradeneeded=()=>request.result.createObjectStore('data');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const read=async key=>{const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction('data').objectStore('data').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});};
  const write=(key,value)=>{const snapshot=JSON.parse(JSON.stringify(value));const op=writeQueue.catch(()=>{}).then(async()=>{const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction('data','readwrite');tx.objectStore('data').put(snapshot,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('儲存中斷'));});});writeQueue=op;return op;};
  const allPhotos=item=>Array.isArray(item.photos)?item.photos.filter(safePhoto).slice(0,MAX_PHOTOS):(safePhoto(item.photoData)?[item.photoData]:[]);
  const capture=()=>({...recordFromForm(),photos:[...photos],photoData:photos[0]||null,className:'',groupName:'',editId});
  const setDraftState=text=>byId('draft-state').textContent=text;
  function scheduleDraft(){if(restoring||!ready)return;clearTimeout(draftTimer);setDraftState('草稿保存中…');draftTimer=setTimeout(()=>write('draft',capture()).then(()=>setDraftState('✓ 草稿已自動保存')).catch(()=>setDraftState('草稿未保存，請下載備份')),350);}
  byId('observer-fields').replaceChildren();
  for(const g of groups){g.options.push(['unknown','未觀察到／無法判斷','看不清楚也可以如實記錄','🔎']);const b=document.createElement('button');b.type='button';b.className='option-card min-h-[90px] p-3.5 rounded-2xl border-2 border-slate-200 bg-white flex flex-col items-center justify-center text-center';b.dataset.value='unknown';b.setAttribute('aria-pressed','false');b.innerHTML=(g.id==='stem-type'?'':'<span class="text-2xl">🔎</span>')+'<span class="font-bold text-sm">未觀察到／無法判斷</span><span class="text-xs text-slate-500">看不清楚也可以如實記錄</span>';b.onclick=()=>{selectOption(g.id,'unknown','未觀察到／無法判斷',b);scheduleDraft();};byId('group-'+g.id).append(b);}
  document.addEventListener('input',scheduleDraft);document.addEventListener('change',scheduleDraft);document.addEventListener('click',e=>{if(e.target.closest('.option-card,.loc-tag'))scheduleDraft();});
  // Names are observations, not a pre-filled identification answer.
  byId('select-plant-preset').insertAdjacentHTML('afterbegin','<option value="">請選擇，或填寫暫定名稱</option>');
  byId('input-plant-name').placeholder='不知道名字？可填「待辨識植物」';
  function renderPhotos(){byId('photo-preview-container').classList.add('hidden');byId('btn-remove-photo').classList.add('hidden');const gallery=byId('photo-gallery');gallery.replaceChildren();photos.forEach((data,i)=>{const tile=document.createElement('div');tile.className='photo-tile';const img=document.createElement('img');img.src=data;img.alt='觀察照片 '+(i+1);const label=document.createElement('p');label.textContent=['照片 1 · 全株','照片 2 · 葉片','照片 3 · 其他細節'][i];label.className='text-xs mt-2';const remove=document.createElement('button');remove.textContent='移除這張';remove.type='button';remove.onclick=()=>{photos.splice(i,1);currentRecord.photoData=photos[0]||null;renderPhotos();scheduleDraft();};tile.append(img,label,remove);gallery.append(tile);});byId('photo-submit-panel').classList.toggle('hidden',!photos.length);byId('photo-submit-note').textContent='照片已備妥。確認植物名稱與 5 項特徵後，按下按鈕儲存並上傳。';byId('btn-photo-send').textContent='🌿 儲存並上傳照片';}
  handlePhotoUpload=async event=>{if(photoBusy||saving)return;const files=[...event.target.files];if(!files.length)return;photoBusy=true;const room=MAX_PHOTOS-photos.length;if(files.length>room)showNotification('最多保存 3 張照片，多出的照片不會加入。');try{for(const file of files.slice(0,room)){if(!/^image\//.test(file.type)||file.size>25*1024*1024)throw Error('請使用 25 MB 以下的照片。');const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);let data=canvas.toDataURL('image/jpeg',.78);if(data.length>1000000)data=canvas.toDataURL('image/jpeg',.5);if(data.length>1000000)throw Error('照片壓縮後仍太大，請換一張。');photos.push(data);}finally{URL.revokeObjectURL(url);}}currentRecord.photoData=photos[0]||null;showNotification('📸 照片已備妥！可按下方按鈕直接送出觀察紀錄。');}catch(e){showNotification(e.message||'無法讀取照片，請改用 JPG 或 PNG。');}finally{photoBusy=false;event.target.value='';renderPhotos();scheduleDraft();}};
  const oldSelect=handlePlantSelectChange;handlePlantSelectChange=value=>{oldSelect(value);scheduleDraft();};
  function fill(record){restoring=true;currentRecord={...record};photos=allPhotos(record);editId=record.editId||null;byId('input-plant-name').value=record.name||'';byId('select-plant-preset').value=plants.includes(record.name)?record.name:'__custom__';byId('input-date').value=record.date||today();byId('input-location').value=record.location||'';document.querySelectorAll('.loc-tag').forEach((b,i)=>b.setAttribute('aria-pressed',String(locations[i][1]===record.location)));for(const g of groups){document.querySelectorAll('#group-'+g.id+' button').forEach(b=>{const active=b.dataset.value===record[g.key];b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});}byId('toggle-flower').checked=!!record.hasFlower;toggleFlowerSection(!!record.hasFlower);byId('input-flower-description').value=record.flowerDescription||'';renderPhotos();updateCompletionMeter();restoring=false;}
  const baseReset=resetForm;resetForm=function(silent=false){if(photoBusy||saving&&!silent)return;if(!silent&&!confirm('要開始新紀錄嗎？尚未儲存的草稿將被清空。'))return;restoring=true;baseReset(true);photos=[];editId=null;byId('input-plant-name').value='';byId('select-plant-preset').value='';renderPhotos();restoring=false;if(ready){clearTimeout(draftTimer);write('draft',capture()).then(()=>setDraftState('可開始下一筆觀察')).catch(()=>setDraftState('草稿未保存'));}};
  byId('input-location').addEventListener('input',()=>{const loc=locations.find(x=>x[1]===byId('input-location').value.trim());currentRecord.mapX=loc?loc[2]:null;currentRecord.mapY=loc?loc[3]:null;document.querySelectorAll('.loc-tag').forEach(b=>b.setAttribute('aria-pressed','false'));});
  submitObservation=async()=>{if(!ready||saving||photoBusy||uploadBusy){showNotification('資料或照片處理中，請稍候。');return;}const record=capture();if(!record.name){showNotification('請填植物名稱，或填「待辨識植物」。');byId('input-plant-name').focus();return;}const missing=groups.find(g=>!record[g.key]);if(missing){showNotification('請記錄各部位；看不到時可以選「未觀察到／無法判斷」。');byId('group-'+missing.id).scrollIntoView({block:'center',behavior:'smooth'});return;}saving=true;document.querySelectorAll('.submit-button').forEach(b=>b.disabled=true);try{const old=sharedSpecimens.find(s=>s.id===editId);const item={...record,id:editId||'LOCAL-'+uid(),editId:null,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now(),creatorId:old?.creatorId||currentUserId,uploadRevision:uid(),uploadState:'pending'};const next=old?sharedSpecimens.map(s=>s.id===editId?item:s):[item,...sharedSpecimens];await write('records',next);sharedSpecimens=next;resetForm(true);renderAll();soundSuccess();switchTab('almanac');if(!allPhotos(item).length){showNotification('✓ 觀察紀錄已保存在本機。需要時可編輯並補拍照片。');}else if(!validEndpoint()){showNotification('照片已保留在這台裝置，雲端上傳暫時無法使用。');}else{showNotification('✓ 觀察紀錄已儲存，正在同步作品…');await uploadOne(item.id);}}catch{showNotification('儲存失敗，表單與照片已保留。請先下載備份。');}finally{saving=false;document.querySelectorAll('.submit-button').forEach(b=>b.disabled=false);}};
  function download(data,name,type){const a=document.createElement('a');const url=typeof data==='string'&&data.startsWith('data:')?data:URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=name;a.click();if(url.startsWith('blob:'))setTimeout(()=>URL.revokeObjectURL(url),1000);}
  renderAlmanac=function(){const q=byId('record-search').value.trim().toLowerCase(),all=sharedSpecimens;sharedSpecimens=all.filter(s=>[s.name,s.location].join(' ').toLowerCase().includes(q));originalRender();const visible=sharedSpecimens;sharedSpecimens=all;if(q&&!visible.length){byId('almanac-grid').textContent='沒有符合搜尋條件的紀錄。';return;}document.querySelectorAll('.specimen-card').forEach((card,i)=>{const item=visible[i];const badge=document.createElement('p');badge.className='record-badge '+(item.uploadState==='sent'?'sent':'pending');badge.setAttribute('role','status');badge.textContent=(activeUploadId===item.id?'☁️ 上傳中，請保持網頁開啟':item.uploadState==='sent'?'✓ 已上傳到全班圖鑑':allPhotos(item).length?'尚未上傳 · 照片已安全保留':'本機紀錄 · 尚未加入照片')+' · '+allPhotos(item).length+' 張照片';card.prepend(badge);const actions=document.createElement('div');actions.className='record-extra';const action=(text,fn)=>{const b=document.createElement('button');b.className='record-action';b.textContent=text;b.type='button';b.onclick=fn;actions.append(b);return b;};if(allPhotos(item).length&&item.uploadState!=='sent'){const retry=action(activeUploadId===item.id?'正在上傳…':'重新上傳',()=>uploadOne(item.id));retry.classList.add('primary');retry.disabled=uploadBusy||!validEndpoint();}action('編輯',()=>{if(uploadBusy)return;fill({...item,editId:item.id});switchTab('record');window.scrollTo({top:0,behavior:'smooth'});scheduleDraft();});allPhotos(item).forEach((data,n)=>action('下載照片 '+(n+1),()=>download(data,[item.name,n+1].join('_')+'.jpg')));card.append(actions);});};
  populatePrintModal=function(item){originalPrint(item);byId('print-observer').textContent='校園植物觀察';const box=byId('print-photo-container');box.querySelector('.photo-gallery')?.remove();byId('print-photo-img').classList.add('hidden');const gallery=document.createElement('div');gallery.className='photo-gallery';allPhotos(item).forEach((data,i)=>{const img=document.createElement('img');img.src=data;img.alt='觀察照片 '+(i+1);gallery.append(img);});box.append(gallery);box.classList.toggle('hidden',!gallery.children.length);};
  previewPrint=()=>populatePrintModal({...capture(),id:editId||'草稿預覽',name:byId('input-plant-name').value||'待辨識植物'});
  renderCampusMap=function(){const all=sharedSpecimens;sharedSpecimens=all.filter(s=>Number.isFinite(s.mapX)&&Number.isFinite(s.mapY));originalMap();sharedSpecimens=all;const missingMap=byId('main-campus-map-img').classList.contains('hidden');byId('map-pins-layer').classList.toggle('hidden',missingMap);if(missingMap){const box=byId('map-unavailable');box.replaceChildren();const wrap=document.createElement('div');wrap.className='w-full';const title=document.createElement('h3');title.textContent='📍 先從觀察地點探索';const note=document.createElement('p');note.className='text-sm my-3';note.textContent='校園底圖待補；以下依紀錄地點整理，不代表實際地圖位置。';const grid=document.createElement('div');grid.className='grid grid-cols-2 sm:grid-cols-3 gap-3';const names=[...new Set([...locations.map(l=>l[1]),...all.map(r=>r.location)])].filter(Boolean);names.forEach(name=>{const b=document.createElement('button');b.className='record-action';b.textContent=name+' · '+all.filter(r=>r.location===name).length+' 筆';b.onclick=()=>{byId('record-search').value=name;switchTab('almanac');};grid.append(b);});wrap.append(title,note,grid);box.append(wrap);}const unlocated=all.filter(s=>!Number.isFinite(s.mapX)||!Number.isFinite(s.mapY)).length;byId('map-pins-count').title=unlocated+' 筆自訂地點尚未定位';const positions=new Map();[...byId('map-pins-layer').children].forEach(pin=>{const key=pin.style.left+pin.style.top;if(!positions.has(key))positions.set(key,[]);positions.get(key).push(pin);});for(const pins of positions.values()){if(pins.length<2)continue;const first=pins[0];first.querySelector('span>span').textContent='🌿 此地 '+pins.length+' 筆觀察';first.onclick=()=>{byId('record-search').value=all.find(s=>Number(s.mapX)+'%'===first.style.left&&Number(s.mapY)+'%'===first.style.top)?.location||'';switchTab('almanac');};pins.slice(1).forEach(p=>p.remove());}};
  deleteSpecimen=async id=>{if(uploadBusy){showNotification('傳送中，請稍後再刪除。');return;}const item=sharedSpecimens.find(s=>s.id===id);if(!item||!confirm('刪除這台裝置的「'+item.name+'」？此操作無法復原。'))return;const next=sharedSpecimens.filter(s=>s.id!==id);try{await write('records',next);sharedSpecimens=next;renderAll();showNotification('已刪除本機紀錄。');}catch{showNotification('刪除失敗，紀錄已保留。');}};
  exportJSONData=()=>download(JSON.stringify({schema:'minan-plants-v2',exportedAt:new Date().toISOString(),records:sharedSpecimens},null,2),'植物探索家備份_'+today()+'.json','application/json');
  byId('record-search').oninput=()=>renderAlmanac();byId('import-records').onclick=()=>byId('import-file').click();
  byId('import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>50*1024*1024)throw Error('備份檔過大，請分批匯入。');const raw=JSON.parse(await file.text()),list=Array.isArray(raw)?raw:raw.records;if(!Array.isArray(list)||list.length>500)throw Error('不是有效的植物觀察備份。');const beforeCount=sharedSpecimens.length;const clean=list.map(r=>{if(!r||typeof r!=='object'||typeof r.name!=='string')throw Error('備份內容不完整。');const item={id:typeof r.id==='string'&&/^[\w-]{1,100}$/.test(r.id)?r.id:'LOCAL-'+uid(),name:r.name.slice(0,100),location:String(r.location||'').slice(0,100),date:/^\d{4}-\d{2}-\d{2}$/.test(r.date)?r.date:today(),className:String(r.className||'').slice(0,20),groupName:String(r.groupName||'').slice(0,30),createdAt:Number(r.createdAt)||Date.now(),photos:allPhotos(r),hasFlower:!!r.hasFlower,flowerDescription:String(r.flowerDescription||'').slice(0,2000),mapX:typeof r.mapX==='number'&&r.mapX>=0&&r.mapX<=100?r.mapX:null,mapY:typeof r.mapY==='number'&&r.mapY>=0&&r.mapY<=100?r.mapY:null,uploadState:'pending',uploadRevision:uid()};item.photoData=item.photos[0]||null;for(const g of groups){const opt=g.options.find(o=>o[0]===r[g.key])||g.options[g.options.length-1];item[g.key]=opt[0];item[g.key+'Name']=opt[1];}if(item.photos.some(p=>p.length>1500000))throw Error('備份照片過大。');return item;});const known=new Set(sharedSpecimens.map(r=>r.id)),next=[...sharedSpecimens,...clean.filter(r=>!known.has(r.id)&&(known.add(r.id),true))];await write('records',next);sharedSpecimens=next;renderAll();showNotification('已匯入 '+(next.length-beforeCount)+' 筆備份；相同編號保留原紀錄。');}catch(err){showNotification(err.message||'匯入失敗，原有紀錄未更動。');}e.target.value='';};
  const validEndpoint=()=>/^https:\/\/script\.google\.com\/(?:macros\/s\/|a\/macros\/[A-Za-z0-9.-]+\/s\/)[A-Za-z0-9_-]+\/exec$/.test(config?.receiverUrl||'');
  // A health-check timeout must never prevent sending the actual photo.
  // A durable server receipt, not the opaque POST response, confirms success.
  function getUploadReceipt(revision){return new Promise((resolve,reject)=>{
    const callback='__plantStatus_'+uid().replace(/-/g,''),script=document.createElement('script');let settled=false;
    const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);script.remove();delete window[callback];error?reject(error):resolve(value);};
    const timer=setTimeout(()=>finish(new Error('雲端確認較慢，稍後會重新查詢')),35000);
    window[callback]=result=>{if(!result||!result.ok||result.receipt!==revision||result.recipient!==config.recipient)finish(new Error('尚未收到有效雲端確認'));else finish(null,result);};
    script.onerror=()=>finish(new Error('目前無法查詢雲端收件狀態'));
    script.src=config.receiverUrl+'?action=status&receipt='+encodeURIComponent(revision)+'&prefix='+callback+'&t='+Date.now();document.head.append(script);
  });}
  async function postToReceiver(item){
    const body=new URLSearchParams();body.set('payload',JSON.stringify({version:3,requestId:uid(),record:{...item,className:'',groupName:'',photos:allPhotos(item),photoData:null}}));
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),75000);let postError;
    try{await fetch(config.receiverUrl,{method:'POST',mode:'no-cors',body,cache:'no-store',redirect:'follow',signal:controller.signal});}
    catch(error){postError=error;}finally{clearTimeout(timeout);}
    // A response can be lost even after Drive has saved the work. Check the
    // same receipt before retrying; the server also deduplicates this revision.
    for(const delay of [0,1500,4000]){
      if(navigator.onLine===false)break;
      if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
      try{const result=await getUploadReceipt(item.uploadRevision);if(result.sent)return result;}catch(error){console.warn('Receipt check delayed',error);}
    }
    throw postError||new Error('尚未確認雲端收件；作品已保留，可重新上傳');
  }
  function normalizeUploadRecord(record){
    const valid=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{16,100}$/.test(value);
    const uploadRevision=valid(record.uploadRevision)?record.uploadRevision:valid(record.receipt)?record.receipt:uid();
    const uploadState=['pending','uncertain','sent'].includes(record.uploadState)?record.uploadState:'pending';
    return {...record,uploadRevision,uploadState:uploadState==='sent'&&!valid(record.uploadRevision)&&!valid(record.receipt)?'pending':uploadState};
  }
  function scheduleRetry(){
    clearTimeout(retryTimer);
    if(!ready||!validEndpoint()||!sharedSpecimens.some(x=>x.uploadState!=='sent'&&allPhotos(x).length))return;
    nextRetryAt=Date.now()+Math.min(300000,30000*Math.pow(2,Math.min(retryFailures,4)));
    retryTimer=setTimeout(()=>{if(!document.hidden)retryPending();},Math.max(0,nextRetryAt-Date.now()));
  }
  async function uploadOne(id){
    if(uploadBusy)return false;
    let item=sharedSpecimens.find(s=>s.id===id);if(!item||!allPhotos(item).length)return false;
    if(!validEndpoint()){updateDriveState();showNotification('照片已保留，雲端上傳暫時無法使用。');return false;}
    uploadBusy=true;activeUploadId=id;clearTimeout(retryTimer);updateDriveState();renderAlmanac();
    try{
      const normalized=normalizeUploadRecord(item);
      if(normalized.uploadRevision!==item.uploadRevision||normalized.uploadState!==item.uploadState){const next=sharedSpecimens.map(r=>r.id===id?normalized:r);await write('records',next);sharedSpecimens=next;item=normalized;}
      if(navigator.onLine===false)throw new Error('目前離線');
      const result=await postToReceiver(item);
      if(result.receipt!==item.uploadRevision||result.recipient!==config.recipient)throw Error('尚未收到有效雲端確認');
      const next=sharedSpecimens.map(s=>s.id===id?{...s,uploadState:'sent',receipt:result.receipt,sentAt:Date.now()}:s);
      await write('records',next);sharedSpecimens=next;retryFailures=0;
      showNotification('✓ 「'+item.name+'」已上傳到全班圖鑑。');
      window.dispatchEvent(new CustomEvent('plant-cloud-upload-success',{detail:{revision:item.uploadRevision}}));return true;
    }catch(error){
      console.warn('Plant upload unconfirmed',error);retryFailures++;
      const next=sharedSpecimens.map(s=>s.id===id?{...s,uploadState:'uncertain'}:s);
      try{await write('records',next);sharedSpecimens=next;}catch{}
      showNotification('尚未完成上傳，照片已保留。可按「重新上傳」，連線恢復後也會自動補傳。');return false;
    }finally{uploadBusy=false;activeUploadId=null;updateDriveState();renderAlmanac();scheduleRetry();}
  }
  async function retryPending(){
    if(!ready||!validEndpoint()||uploadBusy||saving)return;
    for(const item of [...sharedSpecimens].filter(x=>x.uploadState!=='sent'&&allPhotos(x).length)){if(!(await uploadOne(item.id)))break;}
    updateDriveState();
  }
  byId('upload-pending').onclick=()=>retryPending();
  window.addEventListener('online',()=>{retryFailures=0;setTimeout(retryPending,1000);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()>=nextRetryAt)retryPending();});
  function updateDriveState(){
    const pending=sharedSpecimens.filter(x=>x.uploadState!=='sent'&&allPhotos(x).length).length;
    const sent=sharedSpecimens.filter(x=>x.uploadState==='sent').length;
    const status=byId('sync-status');status.style.display='block';
    status.textContent=uploadBusy?'☁️ 正在上傳並等待雲端確認，請保持網頁開啟。':pending?pending+' 筆照片作品尚未上傳；已保留在這台裝置，可到「我的紀錄」重新上傳。':sent?'✓ '+sent+' 筆照片作品已確認上傳到全班圖鑑。':'拍照後按「儲存並上傳」，作品會出現在全班圖鑑。';
    byId('drive-state').textContent=uploadBusy?'正在上傳':pending?'等待上傳':'準備就緒';
    byId('btn-submit-text').textContent=uploadBusy?'上傳中…':'儲存並上傳觀察紀錄';byId('mobile-submit-text').textContent=uploadBusy?'上傳中…':'儲存並上傳';
    const retry=byId('upload-pending');retry.hidden=!pending;retry.removeAttribute('aria-hidden');retry.removeAttribute('tabindex');retry.disabled=uploadBusy||!validEndpoint();retry.textContent='重新上傳未完成作品（'+pending+'）';
    renderPhotos();
  }
  window.addEventListener('beforeunload',e=>{if(photoBusy||saving||uploadBusy||byId('draft-state').textContent==='草稿保存中…'){e.preventDefault();e.returnValue='';}});
  (async()=>{try{
    const stored=await read('records');
    // A previous script-load failure can leave newer records in the base
    // localStorage cache even when an older IndexedDB database already exists.
    const storedIds=new Set((Array.isArray(stored)?stored:[]).map(r=>r.id));
    const source=Array.isArray(stored)?[...stored,...sharedSpecimens.filter(r=>!storedIds.has(r.id))]:sharedSpecimens;
    const normalized=source.map(normalizeUploadRecord);
    await write('records',normalized);sharedSpecimens=normalized;
    localStorage.removeItem('minan_plants_cache');
    const draft=await read('draft');if(draft)fill(draft);else resetForm(true);
    ready=true;setDraftState(draft?'✓ 已恢復上次草稿':'草稿自動保存');renderAll();updateDriveState();
    if(validEndpoint())setTimeout(retryPending,1000);
  }catch{setDraftState('瀏覽器無法儲存，請下載備份');showNotification('無法啟用本機資料庫，請檢查瀏覽器儲存權限。');}})();
})();
