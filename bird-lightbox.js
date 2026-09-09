(function(){
  const STYLE_ID='minan-lightbox-style';
  const MODAL_ID='minan-lightbox';

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${MODAL_ID}{position:fixed;inset:0;z-index:99999;background:rgba(13,31,23,.92);display:none;align-items:center;justify-content:center;padding:28px;box-sizing:border-box;backdrop-filter:blur(8px)}
      #${MODAL_ID}.open{display:flex}
      #${MODAL_ID} .lb-stage{position:relative;width:min(1180px,96vw);height:min(88vh,900px);display:flex;align-items:center;justify-content:center}
      #${MODAL_ID} .lb-image{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.38);background:#fff}
      #${MODAL_ID} .lb-close,#${MODAL_ID} .lb-prev,#${MODAL_ID} .lb-next{position:absolute;border:0;background:rgba(255,255,255,.92);color:#244735;box-shadow:0 5px 18px rgba(0,0,0,.18);cursor:pointer;display:grid;place-items:center;font:inherit}
      #${MODAL_ID} .lb-close{right:0;top:0;width:46px;height:46px;border-radius:50%;font-size:28px;z-index:2}
      #${MODAL_ID} .lb-prev,#${MODAL_ID} .lb-next{top:50%;transform:translateY(-50%);width:48px;height:58px;border-radius:16px;font-size:30px;z-index:2}
      #${MODAL_ID} .lb-prev{left:4px}#${MODAL_ID} .lb-next{right:4px}
      #${MODAL_ID} .lb-caption{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);max-width:min(760px,82vw);padding:9px 14px;border-radius:999px;background:rgba(20,42,31,.78);color:#fff;text-align:center;font-size:15px;line-height:1.45;white-space:normal}
      #${MODAL_ID} .lb-count{position:absolute;left:14px;top:14px;padding:7px 11px;border-radius:999px;background:rgba(20,42,31,.7);color:#fff;font-size:13px}
      #${MODAL_ID} .lb-open-original{position:absolute;right:14px;bottom:14px;color:#fff;background:rgba(20,42,31,.78);border:1px solid rgba(255,255,255,.35);padding:8px 12px;border-radius:999px;text-decoration:none;font-size:13px}
      .gallery img,.odpics img,.detailhero img{cursor:zoom-in}
      @media (max-width:700px){
        #${MODAL_ID}{padding:12px}
        #${MODAL_ID} .lb-stage{width:100%;height:88vh}
        #${MODAL_ID} .lb-close{width:42px;height:42px;right:2px;top:2px}
        #${MODAL_ID} .lb-prev,#${MODAL_ID} .lb-next{width:42px;height:52px;border-radius:14px}
        #${MODAL_ID} .lb-prev{left:2px}#${MODAL_ID} .lb-next{right:2px}
        #${MODAL_ID} .lb-caption{bottom:8px;max-width:78vw;font-size:14px}
        #${MODAL_ID} .lb-open-original{display:none}
      }
    `;
    document.head.appendChild(style);
  }

  function parseDriveId(url){
    if(!url) return '';
    let m=url.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
    if(m) return m[1];
    m=url.match(/[?&]id=([A-Za-z0-9_-]+)/);
    return m?m[1]:'';
  }

  function bestImageUrl(img){
    const full=img.dataset.full||'';
    if(full.startsWith('data:image/')) return full;
    const id=parseDriveId(full)||parseDriveId(img.currentSrc||img.src||'');
    if(id) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w4000`;
    return full||img.currentSrc||img.src||'';
  }

  function originalUrl(img){
    const full=img.dataset.full||'';
    const id=parseDriveId(full)||parseDriveId(img.currentSrc||img.src||'');
    if(id) return `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
    return full&&!full.startsWith('data:image/')?full:'';
  }

  function captionOf(img){
    const fig=img.closest('figure');
    const cap=fig&&fig.querySelector('figcaption');
    return cap?cap.textContent.trim():'';
  }

  function makeModal(){
    let modal=document.getElementById(MODAL_ID);
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id=MODAL_ID;
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label','鳥類照片放大檢視');
    modal.innerHTML=`<div class="lb-stage"><button class="lb-close" type="button" aria-label="關閉">×</button><button class="lb-prev" type="button" aria-label="上一張">‹</button><img class="lb-image" alt="放大照片"><button class="lb-next" type="button" aria-label="下一張">›</button><div class="lb-count"></div><div class="lb-caption"></div><a class="lb-open-original" target="_blank" rel="noopener">開啟原始檔</a></div>`;
    document.body.appendChild(modal);
    return modal;
  }

  let items=[];
  let index=0;
  let previousOverflow='';

  function collect(clicked){
    const scope=clicked.closest('.gallery,.odpics,.detailhero')||document;
    items=[...scope.querySelectorAll('img')].filter(x=>x.offsetParent!==null);
    if(!items.length) items=[clicked];
    index=Math.max(0,items.indexOf(clicked));
  }

  function render(){
    const modal=makeModal();
    const img=items[index];
    if(!img) return;
    const shown=modal.querySelector('.lb-image');
    shown.src=bestImageUrl(img);
    shown.alt=img.alt||'鳥類照片';
    const cap=captionOf(img);
    const capEl=modal.querySelector('.lb-caption');
    capEl.textContent=cap;
    capEl.style.display=cap?'block':'none';
    modal.querySelector('.lb-count').textContent=items.length>1?`${index+1} / ${items.length}`:'';
    modal.querySelector('.lb-prev').style.display=items.length>1?'grid':'none';
    modal.querySelector('.lb-next').style.display=items.length>1?'grid':'none';
    const open=modal.querySelector('.lb-open-original');
    const original=originalUrl(img);
    if(original){open.href=original;open.style.display='inline-block'}else{open.removeAttribute('href');open.style.display='none'}
  }

  function open(clicked){
    injectStyle();
    const modal=makeModal();
    collect(clicked);
    render();
    previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    modal.classList.add('open');
    modal.querySelector('.lb-close').focus({preventScroll:true});
  }

  function close(){
    const modal=document.getElementById(MODAL_ID);
    if(!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow=previousOverflow;
  }

  function move(delta){
    if(!items.length) return;
    index=(index+delta+items.length)%items.length;
    render();
  }

  injectStyle();
  const modal=makeModal();
  modal.querySelector('.lb-close').addEventListener('click',close);
  modal.querySelector('.lb-prev').addEventListener('click',()=>move(-1));
  modal.querySelector('.lb-next').addEventListener('click',()=>move(1));
  modal.addEventListener('click',e=>{if(e.target===modal) close()});

  document.addEventListener('keydown',e=>{
    const m=document.getElementById(MODAL_ID);
    if(!m||!m.classList.contains('open')) return;
    if(e.key==='Escape') close();
    if(e.key==='ArrowLeft') move(-1);
    if(e.key==='ArrowRight') move(1);
  });

  let touchX=null;
  modal.addEventListener('touchstart',e=>{touchX=e.touches[0]?.clientX??null},{passive:true});
  modal.addEventListener('touchend',e=>{
    if(touchX===null) return;
    const x=e.changedTouches[0]?.clientX??touchX;
    const d=x-touchX;
    touchX=null;
    if(Math.abs(d)>45) move(d>0?-1:1);
  },{passive:true});

  // Capture phase：先攔截舊版 window.open，改用站內燈箱。
  document.addEventListener('click',e=>{
    const img=e.target.closest&&e.target.closest('.gallery img,.odpics img,.detailhero img');
    if(!img) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    open(img);
  },true);
})();
