/* 全班植物觀察圖鑑：從原 Google Drive 收件資料夾唯讀取得。 */
(function () {
  'use strict';
  const config=window.PLANT_DRIVE_CONFIG||{};
  const endpoint=config.receiverUrl||'';
  const originalTab=window.switchTab;
  const section=document.getElementById('section-almanac');
  if(!section)return;
  const panel=document.createElement('section');
  panel.id='shared-gallery';
  panel.className='bg-white border border-emerald-200 rounded-3xl p-4 sm:p-6 mb-5 shadow-sm';
  panel.innerHTML='<div class="flex flex-wrap items-center justify-between gap-3 mb-3"><div><h3 class="text-xl font-black text-emerald-900">🌿 全班植物觀察圖鑑</h3><p class="text-sm text-slate-600">欣賞大家拍攝的植物照片與觀察發現，不顯示學生個人資料。</p></div><button type="button" id="shared-refresh" class="px-4 py-2 bg-emerald-700 text-white rounded-xl font-bold">重新整理</button></div><p id="shared-status" role="status" class="text-sm text-slate-600 mb-3"></p><div id="shared-cards" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div><button type="button" id="shared-more" class="hidden mt-5 w-full py-3 border-2 border-emerald-400 text-emerald-900 rounded-xl font-bold">查看更多作品</button>';
  section.prepend(panel);
  const cards=panel.querySelector('#shared-cards'),status=panel.querySelector('#shared-status'),more=panel.querySelector('#shared-more');
  const valid=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint);
  let page=0,loading=false,loaded=false;
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function request(params){
    return new Promise((resolve,reject)=>{
      const id='__plantGallery_'+crypto.randomUUID().replace(/-/g,'');
      const script=document.createElement('script');
      let done=false;
      const finish=(e,data)=>{if(done)return;done=true;clearTimeout(timer);script.remove();delete window[id];e?reject(e):resolve(data);};
      const timer=setTimeout(()=>finish(Error('讀取逾時')),25000);
      window[id]=data=>finish(null,data);
      script.onerror=()=>finish(Error('雲端讀取失敗'));
      script.src=endpoint+'?'+new URLSearchParams({...params,callback:id,t:Date.now()});
      document.head.append(script);
    });
  }
  async function showPhoto(img,revision,index){
    img.alt='照片載入中';
    try{
      const result=await request({action:'photo',revision,index});
      if(!result.ok||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(result.photo||''))throw Error('照片讀取失敗');
      img.src=result.photo;img.alt='植物實拍照片 '+index;
    }catch{img.alt='照片暫時無法顯示';img.closest('.shared-photo-box').textContent='照片暫時無法顯示';}
  }
  function makeCard(r){
    const el=document.createElement('article');
    el.className='border border-slate-200 rounded-2xl p-3 bg-slate-50';
    el.innerHTML='<h4 class="text-lg font-black text-slate-900">'+esc(r.name||'待辨識植物')+'</h4><p class="text-xs text-slate-500 mb-3">'+esc(r.location||'校園')+'　'+esc(r.date||'')+'</p><div class="shared-photos grid gap-2 mb-3"></div><div class="text-xs leading-6 text-slate-700">葉緣：'+esc(r.leafMarginName||'未記錄')+'<br>葉脈：'+esc(r.leafVenationName||'未記錄')+'<br>葉序：'+esc(r.leafArrangementName||'未記錄')+'<br>根系：'+esc(r.rootSystemName||'未記錄')+'<br>莖：'+esc(r.stemTypeName||'未記錄')+'</div>';
    const wrap=el.querySelector('.shared-photos');
    for(let n=1;n<=Math.min(3,r.photoCount||0);n++){
      const box=document.createElement('div');
      box.className='shared-photo-box rounded-xl bg-slate-200 min-h-36 overflow-hidden flex items-center justify-center text-xs text-slate-500';
      box.textContent='載入照片中…';
      const img=document.createElement('img');img.className='block w-full max-h-64 object-contain';img.loading='lazy';
      box.replaceChildren(img);wrap.append(box);
      showPhoto(img,r.revision,n);
      img.addEventListener('click',()=>{if(img.src)window.open(img.src,'_blank','noopener');});
    }
    return el;
  }
  async function load(reset=false){
    if(loading)return;
    if(!valid){status.textContent='共用圖鑑尚未連接 Google 雲端硬碟；本機觀察紀錄仍可正常使用。';return;}
    loading=true;more.disabled=true;
    if(reset){page=0;cards.replaceChildren();}
    status.textContent='正在讀取雲端植物觀察紀錄…';
    try{
      const data=await request({action:'gallery',page});
      if(!data.ok||!Array.isArray(data.records))throw Error('雲端尚未開放圖鑑讀取');
      data.records.sort((a,b)=>String(b.submittedAt).localeCompare(String(a.submittedAt)));
      data.records.forEach(r=>cards.append(makeCard(r)));
      status.textContent=cards.children.length?'已載入 '+cards.children.length+' 筆全班共用觀察紀錄。':'目前尚無公開的植物觀察紀錄。';
      more.classList.toggle('hidden',!data.hasMore||!data.records.length);page++;loaded=true;
    }catch(e){status.textContent='共用圖鑑讀取失敗：'+e.message+'。請確認收件程式已更新部署。';}
    finally{loading=false;more.disabled=false;}
  }
  panel.querySelector('#shared-refresh').onclick=()=>load(true);
  more.onclick=()=>load(false);
  const tab=document.getElementById('tab-almanac');
  if(tab)tab.querySelector('span:nth-child(2)')?.replaceChildren(document.createTextNode('全班植物觀察圖鑑'));
  if(typeof originalTab==='function'){
    window.switchTab=function(id){originalTab(id);if(id==='almanac'&&!loaded)load(true);};
  }
  if(!section.classList.contains('hidden'))load(true);
})();
