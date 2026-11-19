import { createCollection } from './collection.js?v=3.6.4';
import { FISH, artworkRevisionFor } from './templates.js?v=3.6.5';

const byId=id=>document.getElementById(id);
const stage=byId('aquarium');
const gallery=byId('gallery-dialog');
const collection=createCollection();
const {createOcean}=stage.dataset.engine==='v32' ? await import('./v32/ocean.js?v=3.6.5') : await import('./swim.js');
const ocean=createOcean(byId('water'));
const current=new Map();
const testFish=new Map();
const motionSettings=byId('motion-settings');
const speedInput=byId('motion-speed');
const speedKey='class-aquarium-v3:motion-speed';
function applySpeed(value,persist=false) {
  const number=Number(value);
  const speed=Number.isFinite(number) ? Math.max(.25,Math.min(2,number)) : 1;
  ocean.setSpeed?.(speed);
  if (speedInput) {
    speedInput.value=String(speed);
    byId('motion-speed-value').textContent=speed.toFixed(2)+'×';
    speedInput.setAttribute('aria-valuetext',speed.toFixed(2)+' 倍');
  }
  if (persist) {
    try { localStorage.setItem(speedKey,String(speed)); } catch {}
  }
}
if (speedInput) {
  let saved=1;
  try { saved=localStorage.getItem(speedKey) ?? 1; } catch {}
  applySpeed(saved);
  speedInput.oninput=()=>applySpeed(speedInput.value,true);
  byId('motion-speed-reset').onclick=()=>applySpeed(1,true);
  motionSettings.addEventListener('toggle',toolbar);
  motionSettings.addEventListener('keydown',event=>{
    if (event.key==='Escape') {
      motionSettings.open=false;
      motionSettings.querySelector('summary').focus();
      event.preventDefault();
      event.stopPropagation();
    }
  });
}
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
  if (byId('motion-static-note')) byId('motion-static-note').hidden=!reduce;
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

function updateCounts() {
  stage.dataset.fishCount=String(current.size);
  const label=stage.dataset.engine==='v32' ? ' 隻' : ' 隻魚';
  const testing=testFish.size ? ` · 測試 ${testFish.size} 隻` : '';
  byId('total').textContent=current.size+label+testing;
}

const testSelect=byId('test-species');
if (testSelect) {
  const addTestButton=byId('add-test-fish');
  const clearTestButton=byId('clear-test-fish');
  const status=byId('test-fish-status');
  for (const [type,fish] of Object.entries(FISH)) {
    testSelect.add(new Option(fish.name,type));
  }

  addTestButton.onclick=async ()=>{
    const types=testSelect.value==='all' ? Object.keys(FISH) : [testSelect.value];
    const missing=types.filter(type=>!testFish.has(type));
    if (!missing.length) {
      status.textContent='選取的測試生物已在水族館。';
      return;
    }
    addTestButton.disabled=clearTestButton.disabled=testSelect.disabled=true;
    status.textContent='正在載入測試生物…';
    try {
      const {templateFish}=await import('./v32/sample-fish.js?v=3.6.5');
      const results=await Promise.allSettled(missing.map(async type=>{
        const canvas=await templateFish(type,true);
        const blob=await new Promise((resolve,reject)=>{
          canvas.toBlob(image=>image ? resolve(image) : reject(new Error('Could not encode test artwork')));
        });
        const id='test-fish-'+type;
        const url=URL.createObjectURL(blob);
        try {
          await ocean.add({id,type,artworkRevision:artworkRevisionFor(type)},url,false);
          testFish.set(type,id);
        } finally {
          URL.revokeObjectURL(url);
        }
      }));
      const added=results.filter(result=>result.status==='fulfilled').length;
      updateCounts();
      status.textContent=added===missing.length ? `已加入 ${added} 隻測試生物。`
        : `已加入 ${added} 隻，有 ${missing.length-added} 隻載入失敗，可以再試一次。`;
    } catch {
      status.textContent='無法載入測試生物，請再試一次。';
    } finally {
      addTestButton.disabled=testSelect.disabled=false;
      clearTestButton.disabled=!testFish.size;
    }
  };

  clearTestButton.onclick=()=>{
    for (const id of testFish.values()) ocean.remove(id);
    testFish.clear();
    updateCounts();
    clearTestButton.disabled=true;
    status.textContent='已移除測試生物。';
    addTestButton.focus();
  };
}

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
        const menu=motionSettings ? '設定 → 管理作品' : '作品與設定';
        byId('sea-error').textContent=`有作品無法載入，可在「${menu}」刪除後重新掃描。`;
      });
      changed=true;
    }
    if (changed || !initialized) {
      updateCounts();
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
  if (document.fullscreenElement && !gallery.open && !motionSettings?.open) {
    toolbarTimer=setTimeout(()=>{ if (!gallery.open && !motionSettings?.open) stage.classList.add('hide-toolbar'); },2600);
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
