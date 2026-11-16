import { createCollection } from './collection.js';
import { FISH } from './templates.js?v=3.4.1';

const byId=id=>document.getElementById(id);
const stage=byId('aquarium');
const gallery=byId('gallery-dialog');
const collection=createCollection();
const {createOcean}=stage.dataset.engine==='v32' ? await import('./v32/ocean.js?v=3.4.3') : await import('./swim.js');
const ocean=createOcean(byId('water'));
const current=new Map();
const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
let initialized=false, updating=false, refreshAgain=false, toolbarTimer, changing=false;
const prefs='class-aquarium-v3:display-settings';

function savedPreferences() {
  try { return JSON.parse(localStorage.getItem(prefs)) || {}; } catch { return {}; }
}
let manualMotion=savedPreferences().reduce;
byId('low').checked=Boolean(savedPreferences().low);
byId('reduce').checked=manualMotion ?? systemMotion.matches;
function mode() {
  const low=byId('low').checked, reduce=byId('reduce').checked;
  stage.classList.toggle('low',low);
  stage.classList.toggle('reduce',reduce);
  ocean.setMode(low,reduce);
}
mode();
function saveMode() {
  try { localStorage.setItem(prefs,JSON.stringify({low:byId('low').checked,reduce:manualMotion})); } catch {}
  mode();
}
byId('low').onchange=saveMode;
byId('reduce').onchange=()=>{ manualMotion=byId('reduce').checked; saveMode(); };
systemMotion.addEventListener('change',()=>{
  if (manualMotion!==undefined) return;
  byId('reduce').checked=systemMotion.matches;
  mode();
});

function renderGallery() {
  const items=byId('gallery');
  const keepFocus=document.activeElement?.dataset?.fishId;
  const fragment=document.createDocumentFragment();
  for (const entry of current.values()) {
    const item=document.createElement('li'), image=document.createElement('img'), label=document.createElement('span');
    const button=document.createElement('button');
    const name=FISH[entry.record.type]?.name || '彩繪魚';
    image.src=entry.url;
    image.alt='';
    label.textContent=name;
    button.textContent='刪除';
    button.dataset.fishId=entry.record.id;
    button.setAttribute('aria-label','刪除'+name+'作品');
    button.onclick=()=>mutate(()=>collection.remove(entry.record.id));
    item.append(image,label,button);
    fragment.append(item);
  }
  items.replaceChildren(fragment);
  if (keepFocus) {
    const replacement=[...items.querySelectorAll('button')].find(button=>button.dataset.fishId===keepFocus);
    (replacement || byId('close-gallery')).focus();
  }
  byId('gallery-count').textContent=`${current.size} 份作品`;
  byId('clear').disabled=!current.size || changing;
}
async function refresh() {
  if (updating) { refreshAgain=true; return; }
  updating=true;
  try {
    const records=await collection.list();
    const ids=new Set(records.map(record=>record.id));
    let changed=false;
    for (const [id,entry] of current) {
      if (ids.has(id)) continue;
      ocean.remove(id);
      URL.revokeObjectURL(entry.url);
      current.delete(id);
      changed=true;
    }
    for (const record of records) {
      if (current.has(record.id)) continue;
      const url=URL.createObjectURL(record.blob);
      current.set(record.id,{record,url});
      void ocean.add(record,url,initialized).then(()=>{
        if (current.has(record.id)) stage.dataset.renderedId=record.id;
      }).catch(()=>{
        byId('sea-error').hidden=false;
        byId('sea-error').textContent='有作品無法載入，可在「作品與設定」刪除後重新掃描。';
      });
      changed=true;
    }
    if (changed || !initialized) {
      stage.dataset.fishCount=current.size;
      byId('total').textContent=`${current.size} 隻${stage.dataset.engine==='v32' ? '' : '魚'}`;
      if (gallery.open) renderGallery();
    }
    initialized=true;
    if (byId('sea-error').dataset.storage) {
      byId('sea-error').hidden=true;
      delete byId('sea-error').dataset.storage;
    }
  } catch {
    const error=byId('sea-error');
    error.hidden=false;
    error.dataset.storage='1';
    error.textContent='無法讀取作品，請確認瀏覽器允許儲存網站資料，再重新整理。';
  } finally {
    updating=false;
    if (refreshAgain) { refreshAgain=false; void refresh(); }
  }
}
collection.subscribe(refresh);
setInterval(refresh,4000);
addEventListener('pageshow',refresh);
addEventListener('visibilitychange',()=>{ if (!document.hidden) void refresh(); });
void refresh();

async function mutate(action) {
  if (changing) return;
  changing=true;
  byId('clear').disabled=byId('confirm').disabled=true;
  byId('gallery-error').hidden=true;
  try {
    await action();
    byId('confirm-clear').hidden=true;
    await refresh();
  } catch {
    byId('gallery-error').hidden=false;
    byId('gallery-error').textContent='無法更新作品，請再試一次。';
  } finally {
    changing=false;
    byId('confirm').disabled=false;
    byId('clear').disabled=!current.size;
  }
}
byId('manage').onclick=()=>{
  renderGallery();
  gallery.showModal();
};
byId('close-gallery').onclick=()=>gallery.close();
gallery.addEventListener('close',()=>{
  byId('confirm-clear').hidden=true;
  byId('gallery-error').hidden=true;
  toolbar();
});
byId('clear').onclick=()=>{
  byId('confirm-clear').hidden=false;
  byId('cancel-clear').focus();
};
byId('cancel-clear').onclick=()=>{
  byId('confirm-clear').hidden=true;
  byId('clear').focus();
};
byId('confirm').onclick=()=>mutate(()=>collection.clear());
function toolbar() {
  stage.classList.remove('hide-toolbar');
  clearTimeout(toolbarTimer);
  if (document.fullscreenElement && !gallery.open) {
    toolbarTimer=setTimeout(()=>{ if (!gallery.open) stage.classList.add('hide-toolbar'); },2600);
  }
}
byId('fullscreen').onclick=async ()=>{
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      await stage.requestFullscreen();
      byId('fullscreen').blur();
    }
  } catch {
    byId('sea-error').textContent='瀏覽器無法切換全螢幕，可試著按 F11。';
    byId('sea-error').hidden=false;
  }
};
document.addEventListener('fullscreenchange',()=>{
  byId('fullscreen').textContent=document.fullscreenElement ? '退出全螢幕' : '全螢幕';
  toolbar();
});
stage.addEventListener('pointermove',toolbar);
stage.addEventListener('pointerdown',toolbar);
stage.addEventListener('focusin',toolbar);
