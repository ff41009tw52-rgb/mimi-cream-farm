import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
  getFirestore, collection, doc, onSnapshot, getDocs, query, where,
  serverTimestamp, writeBatch, deleteDoc
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyC26_dnG8mHcIepXQMGOX-_-4ulJok9NWQ',
  authDomain: 'bird-650fa.firebaseapp.com',
  projectId: 'bird-650fa',
  storageBucket: 'bird-650fa.firebasestorage.app',
  messagingSenderId: '657973573508',
  appId: '1:657973573508:web:288a7518ede39903218fd1'
};

const APP_ID = 'minan-birds-v2';
const ADMIN_UID = 'wJ6v4ChXyUV0SLvh581L3K6ZEZB3';
const ADMIN_USER_HASH = '55d75a7fb38efdd36ed89f802c17cc6cdaf7babfaf2d2d1834e66aa5f4bbff98';
const ADMIN_EMAIL = atob('ZmY0MTAwOXR3NTJAZ21haWwuY29t');

const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb);
const db = getFirestore(fb);
const app = document.querySelector('#app');

const col = name => collection(db, 'artifacts', APP_ID, 'public', 'data', name);
const d = (name, id) => doc(db, 'artifacts', APP_ID, 'public', 'data', name, id);

let birds = [];
let observations = [];
let admin = false;
let view = 'home';
let selectedBird = null;
let editing = null;
let saving = false;
let lastDataError = '';

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const dateValue = v => v ? (new Date(v).getTime() || 0) : 0;

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2,'0')).join('');
}

function imageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => resolve(img);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function resizeCanvas(img, maxSide) {
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.width * ratio));
  c.height = Math.max(1, Math.round(img.height * ratio));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function canvasData(canvas, quality=.72) {
  const webp = canvas.toDataURL('image/webp', quality);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality);
}

async function compressImage(file) {
  const img = await imageFromFile(file);
  let full = resizeCanvas(img, 1000);
  const thumb = resizeCanvas(img, 360);
  let quality = .72;
  let imageData = canvasData(full, quality);
  for (let i=0; i<10 && imageData.length > 430000; i++) {
    quality = Math.max(.42, quality - .07);
    if (quality === .42 && imageData.length > 430000) {
      const smaller = document.createElement('canvas');
      smaller.width = Math.max(1, Math.round(full.width * .86));
      smaller.height = Math.max(1, Math.round(full.height * .86));
      smaller.getContext('2d').drawImage(full, 0, 0, smaller.width, smaller.height);
      full = smaller;
    }
    imageData = canvasData(full, quality);
  }
  const thumbnailData = canvasData(thumb, .68);
  if (imageData.length + thumbnailData.length > 600000) {
    throw new Error('圖片壓縮後仍過大，請改用解析度較低的照片。');
  }
  return { imageData, thumbnailData };
}

async function docsBy(collectionName, key, value) {
  const snap = await getDocs(query(col(collectionName), where(key, '==', value)));
  return snap.docs.map(x => ({id:x.id, ...x.data()})).sort((a,b)=>(a.order||0)-(b.order||0));
}

function go(next, payload=null) {
  view = next;
  if (payload) selectedBird = payload;
  window.scrollTo(0,0);
  render();
}

function setTopState() {
  const nav = document.querySelector('#adminNav');
  const foot = document.querySelector('#loginFoot');
  if (nav) nav.hidden = !admin;
  if (foot) foot.textContent = admin ? '登出管理' : '管理登入';
}

document.querySelector('#brand').onclick = () => go('home');
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
document.querySelector('#loginFoot').onclick = () => admin ? logout() : go('login');

onAuthStateChanged(auth, async user => {
  admin = user?.uid === ADMIN_UID;
  if (user && !admin) await signOut(auth);
  setTopState();
  if (!saving) render();
});

onSnapshot(col('birds'), snap => {
  birds = snap.docs.map(x => ({id:x.id, ...x.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  lastDataError = '';
  if (!saving) render();
}, err => {
  console.error('Bird listener failed:', err);
  lastDataError = `${err.code || 'unknown'}：${err.message || '無法讀取鳥類資料'}`;
  if (!saving) render();
});

onSnapshot(col('observations'), snap => {
  observations = snap.docs.map(x => ({id:x.id, ...x.data()})).sort((a,b)=>dateValue(b.observationDate)-dateValue(a.observationDate));
  if (!saving) render();
}, err => {
  console.error('Observation listener failed:', err);
  lastDataError = `${err.code || 'unknown'}：${err.message || '無法讀取觀察資料'}`;
  if (!saving) render();
});

function render() {
  setTopState();
  if (view === 'home') return home();
  if (view === 'login') return login();
  if (view === 'admin') return adminPage();
  if (view === 'detail') return detail();
  if (view === 'birdform') return birdForm();
  if (view === 'obsform') return obsForm();
}

function home() {
  const first = birds[0];
  const error = lastDataError ? `<div class="err" style="margin:20px auto;max-width:760px">資料讀取異常：${esc(lastDataError)}</div>` : '';
  app.innerHTML = `
    <section class="hero">
      <div><span class="eyebrow">民安國小自然觀察</span><h1>民安羽跡</h1><h2>校園鳥類觀察站</h2><p>一起記錄，在民安校園裡留下的每一道羽跡。這裡是一本屬於我們的自然觀察圖鑑。</p></div>
      <div class="visual">${first?.coverThumb ? `<img src="${first.coverThumb}" alt="${esc(first.name)}">` : `<div class="empty"><div style="font-size:48px">⌁</div><b>等待第一道羽跡</b></div>`}</div>
    </section>
    ${error}
    <section class="section">
      <div class="sectionhead"><div><h2>校園鳥類</h2><div class="muted">認識民安校園的常客</div></div>${admin?'<button class="btn" id="newBird">＋ 記錄新鳥種</button>':''}</div>
      ${birds.length ? `<div class="grid">${birds.map(b => `<article class="card" data-bird="${b.id}"><div class="cover">${b.coverThumb?`<img src="${b.coverThumb}" alt="${esc(b.name)}">`:'<span>等待照片</span>'}</div><div class="cardbody"><h3>${esc(b.name)}</h3><p>${esc(b.shortDescription||'尚未提供簡介')}</p><div class="link">查看羽跡 →</div></div></article>`).join('')}</div>` : `<div class="emptybox"><div class="emptyicon">⌁</div><h3>第一道羽跡，正等待被發現</h3><p>民安校園的鳥類觀察紀錄將從這裡慢慢累積。</p>${admin?'<button class="btn" id="firstBird">記錄第一種鳥類</button>':''}</div>`}
    </section>`;
  document.querySelectorAll('[data-bird]').forEach(el => el.onclick = () => { selectedBird = birds.find(b=>b.id===el.dataset.bird); go('detail'); });
  const add = document.querySelector('#newBird') || document.querySelector('#firstBird');
  if (add) add.onclick = () => { editing = null; go('birdform'); };
}

function login() {
  app.innerHTML = `<div class="login"><div class="box"><div style="text-align:center;font-size:34px">▣</div><h2 style="text-align:center">管理員登入</h2><p class="muted" style="text-align:center">請輸入管理帳號與密碼</p><form id="loginForm"><div class="field"><label>管理帳號</label><input id="u" required autocomplete="username"></div><div class="field"><label>管理密碼</label><input id="p" type="password" required autocomplete="current-password"></div><div id="le"></div><button class="btn" style="width:100%">登入管理中心</button></form><div style="text-align:center;margin-top:18px"><button class="ghost" id="back">返回首頁</button></div></div></div>`;
  document.querySelector('#back').onclick = () => go('home');
  document.querySelector('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const le = document.querySelector('#le');
    le.innerHTML = '';
    try {
      if (await sha(document.querySelector('#u').value.trim()) !== ADMIN_USER_HASH) throw new Error('帳號不正確');
      const c = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, document.querySelector('#p').value);
      if (c.user.uid !== ADMIN_UID) { await signOut(auth); throw new Error('管理員 UID 不符'); }
      go('admin');
    } catch (err) {
      console.error('Login failed:', err);
      le.innerHTML = `<div class="err">登入失敗：${esc(err.code || err.message || '請檢查帳號密碼')}</div>`;
    }
  };
}

async function logout() { await signOut(auth); go('home'); }

function adminPage() {
  if (!admin) return go('login');
  app.innerHTML = `<div class="section"><div class="sectionhead"><div><h2>管理中心</h2><div class="muted">管理鳥類資料與校園觀察紀錄</div></div><div class="actions"><button class="btn btn2" id="newObs">＋ 新增觀察</button><button class="btn" id="newBird">＋ 新增鳥種</button></div></div>${lastDataError?`<div class="err">資料讀取異常：${esc(lastDataError)}</div>`:''}<div class="box"><h3>已建立的鳥種（${birds.length}）</h3>${birds.length?birds.map(b=>`<div class="adminrow"><img class="thumb" src="${b.coverThumb||''}"><div><b>${esc(b.name)}</b><div class="muted">${esc(b.shortDescription||'')}</div></div><div class="actions"><button class="btn btn2" data-view="${b.id}">查看</button><button class="btn btn2" data-edit="${b.id}">編輯</button><button class="btn danger" data-delbird="${b.id}">刪除</button></div></div>`).join(''):'<p class="muted">尚無鳥類資料。</p>'}</div><div class="box" style="margin-top:22px"><h3>觀察紀錄（${observations.length}）</h3>${observations.length?observations.map(o=>`<div class="adminrow"><img class="thumb" src="${o.firstThumb||''}"><div><b>${esc(birds.find(b=>b.id===o.birdId)?.name||'未知鳥種')}</b><div class="muted">${esc(o.observationDate)} · ${esc(o.location)}</div></div><div class="actions"><button class="btn btn2" data-editobs="${o.id}">編輯</button><button class="btn danger" data-delobs="${o.id}">刪除</button></div></div>`).join(''):'<p class="muted">尚無觀察紀錄。</p>'}</div></div>`;
  document.querySelector('#newBird').onclick = () => { editing=null; go('birdform'); };
  document.querySelector('#newObs').onclick = () => { editing=null; go('obsform'); };
  document.querySelectorAll('[data-view]').forEach(e => e.onclick = () => { selectedBird=birds.find(b=>b.id===e.dataset.view); go('detail'); });
  document.querySelectorAll('[data-edit]').forEach(e => e.onclick = () => { editing=birds.find(b=>b.id===e.dataset.edit); go('birdform'); });
  document.querySelectorAll('[data-editobs]').forEach(e => e.onclick = () => { editing=observations.find(o=>o.id===e.dataset.editobs); go('obsform'); });
  document.querySelectorAll('[data-delbird]').forEach(e => e.onclick = () => deleteBird(e.dataset.delbird));
  document.querySelectorAll('[data-delobs]').forEach(e => e.onclick = () => deleteObservation(e.dataset.delobs));
}

async function deleteBird(id) {
  if (!confirm('確定刪除這個鳥種及其所有觀察紀錄與照片嗎？')) return;
  saving = true;
  try {
    for (const o of observations.filter(x=>x.birdId===id)) await deleteObservation(o.id, true);
    for (const p of await docsBy('birdPhotos','birdId',id)) await deleteDoc(d('birdPhotos',p.id));
    await deleteDoc(d('birds',id));
  } finally {
    saving = false;
    go('admin');
  }
}

async function deleteObservation(id, silent=false) {
  if (!silent && !confirm('確定刪除這筆觀察紀錄嗎？')) return;
  for (const p of await docsBy('observationPhotos','observationId',id)) await deleteDoc(d('observationPhotos',p.id));
  await deleteDoc(d('observations',id));
}

async function detail() {
  if (!selectedBird) return go('home');
  app.innerHTML = '<div class="loading">正在整理鳥類圖鑑...</div>';
  try {
    const photos = await docsBy('birdPhotos','birdId',selectedBird.id);
    const birdObs = observations.filter(x=>x.birdId===selectedBird.id);
    app.innerHTML = `<div class="detailhero">${photos[0]?`<img src="${photos[0].imageData}" alt="${esc(selectedBird.name)}">`:''}</div><div class="detail"><article class="article"><button class="ghost" id="dh">← 返回校園鳥類</button><h1>${esc(selectedBird.name)}</h1><p class="muted" style="text-align:center">${esc(selectedBird.shortDescription||'')}</p>${photos.length?`<div class="gallery">${photos.map(p=>`<figure><img src="${p.thumbnailData||p.imageData}" data-full="${p.imageData}"><figcaption>${esc(p.caption||'')}</figcaption></figure>`).join('')}</div>`:''}<section><h3>辨識特徵</h3><p>${esc(selectedBird.identification||'尚未提供資料。')}</p></section><section><h3>生活習性</h3><p>${esc(selectedBird.habits||'尚未提供資料。')}</p></section><section><h3>在民安怎麼找到牠？</h3><p>${esc(selectedBird.minanTips||'尚未提供資料。')}</p></section><section><h3>校園觀察紀錄</h3><div id="obsDetail">${birdObs.length?birdObs.map(o=>`<div class="obs" data-od="${o.id}"><div class="chips"><span class="chip">${esc(o.observationDate)}</span><span class="chip">${esc(o.location)}</span></div><p>${esc(o.note||'')}</p><div class="odpics"></div></div>`).join(''):'<p class="muted">目前還沒有觀察紀錄。</p>'}</div></section></article></div>`;
    document.querySelector('#dh').onclick = () => go('home');
    document.querySelectorAll('.gallery img').forEach(i => i.onclick = () => window.open(i.dataset.full,'_blank'));
    for (const el of document.querySelectorAll('[data-od]')) {
      const pp = await docsBy('observationPhotos','observationId',el.dataset.od);
      el.querySelector('.odpics').innerHTML = pp.length ? `<div class="gallery">${pp.map(p=>`<figure><img src="${p.thumbnailData||p.imageData}" data-full="${p.imageData}"><figcaption>${esc(p.caption||'')}</figcaption></figure>`).join('')}</div>` : '';
    }
    document.querySelectorAll('.odpics img').forEach(i => i.onclick = () => window.open(i.dataset.full,'_blank'));
  } catch (err) {
    app.innerHTML = `<div class="emptybox"><div class="err">載入詳細資料失敗：${esc(err.code || err.message || '未知錯誤')}</div><button class="btn" id="dh">返回首頁</button></div>`;
    document.querySelector('#dh').onclick = () => go('home');
  }
}

function filePicker(max) {
  return `<div class="field"><label>照片（最多 ${max} 張）</label><div class="picker"><input id="files" type="file" accept="image/*" multiple><div id="previews" class="previews"></div></div></div>`;
}

function bindPicker(max) {
  const inp = document.querySelector('#files');
  const box = document.querySelector('#previews');
  let items = [];
  inp.onchange = () => {
    items = [...inp.files].filter(f=>f.type.startsWith('image/')).slice(0,max).map(f=>({file:f,url:URL.createObjectURL(f),caption:''}));
    box.innerHTML = items.map((x,i)=>`<div class="preview"><img src="${x.url}"><input data-cap="${i}" placeholder="照片說明（選填）"></div>`).join('');
    box.querySelectorAll('[data-cap]').forEach(x=>x.oninput=()=>items[+x.dataset.cap].caption=x.value);
  };
  return () => items;
}

function birdFields(v={}) {
  return `<div class="field"><label>鳥類名稱 *</label><input id="name" required value="${esc(v.name||'')}"></div><div class="field"><label>首頁簡短介紹 *</label><textarea id="short" required rows="2">${esc(v.shortDescription||'')}</textarea></div><div class="field"><label>辨識特徵</label><textarea id="ident" rows="4">${esc(v.identification||'')}</textarea></div><div class="field"><label>生活習性</label><textarea id="habits" rows="4">${esc(v.habits||'')}</textarea></div><div class="field"><label>在民安怎麼找到牠？</label><textarea id="tips" rows="3">${esc(v.minanTips||'')}</textarea></div>`;
}

function birdForm() {
  if (!admin) return go('login');
  app.innerHTML = `<div class="panel"><button class="ghost" id="back">← 返回管理中心</button><div class="box"><h2>${editing?'編輯鳥種':'新增鳥種'}</h2><form id="bf">${birdFields(editing||{})}${filePicker(8)}<div id="saveError"></div><button id="saveBirdBtn" class="btn" style="width:100%">儲存鳥種資料</button></form></div></div>`;
  document.querySelector('#back').onclick = () => go('admin');
  const getFiles = bindPicker(8);
  document.querySelector('#bf').onsubmit = async e => {
    e.preventDefault();
    const btn = document.querySelector('#saveBirdBtn');
    const errorBox = document.querySelector('#saveError');
    errorBox.innerHTML = '';
    btn.disabled = true;
    btn.textContent = '整理照片中…';
    saving = true;
    try {
      const data = {
        name: document.querySelector('#name').value.trim(),
        shortDescription: document.querySelector('#short').value.trim(),
        identification: document.querySelector('#ident').value.trim(),
        habits: document.querySelector('#habits').value.trim(),
        minanTips: document.querySelector('#tips').value.trim(),
        updatedAt: serverTimestamp()
      };
      const items = getFiles();
      const compressed = [];
      for (let i=0;i<items.length;i++) {
        btn.textContent = `處理照片 ${i+1}/${items.length}…`;
        compressed.push({...await compressImage(items[i].file), caption:items[i].caption});
      }
      btn.textContent = '寫入資料庫中…';
      const batch = writeBatch(db);
      const birdRef = editing ? d('birds', editing.id) : doc(col('birds'));
      const birdData = {...data};
      if (!editing) birdData.createdAt = serverTimestamp();
      if (compressed[0]) birdData.coverThumb = compressed[0].thumbnailData;
      else if (!editing) birdData.coverThumb = '';
      if (editing) batch.update(birdRef, birdData); else batch.set(birdRef, birdData);
      compressed.forEach((z,i) => {
        const pRef = doc(col('birdPhotos'));
        batch.set(pRef, {birdId:birdRef.id, imageData:z.imageData, thumbnailData:z.thumbnailData, caption:z.caption, order:Date.now()+i, createdAt:serverTimestamp()});
      });
      await batch.commit();
      editing = null;
      saving = false;
      alert('鳥種資料已儲存。');
      go('admin');
    } catch (err) {
      saving = false;
      console.error('Save bird failed:', err);
      btn.disabled = false;
      btn.textContent = '儲存鳥種資料';
      errorBox.innerHTML = `<div class="err">儲存失敗：${esc(err.code || err.message || '未知錯誤')}</div>`;
    }
  };
}

function obsFields(v={}) {
  return `<div class="twocol"><div class="field"><label>鳥種 *</label><select id="bird" required><option value="">-- 請選擇 --</option>${birds.map(b=>`<option value="${b.id}" ${b.id===v.birdId?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div><div class="field"><label>觀察日期 *</label><input id="odate" type="date" required value="${esc(v.observationDate||new Date().toISOString().slice(0,10))}"></div></div><div class="field"><label>觀察地點 *</label><input id="loc" required value="${esc(v.location||'前操場')}"></div><div class="field"><label>觀察補充</label><textarea id="note" rows="4">${esc(v.note||'')}</textarea></div>`;
}

function obsForm() {
  if (!admin) return go('login');
  if (!birds.length) { alert('請先新增至少一種鳥類。'); return go('admin'); }
  app.innerHTML = `<div class="panel"><button class="ghost" id="back">← 返回管理中心</button><div class="box"><h2>${editing?'編輯觀察紀錄':'新增觀察紀錄'}</h2><form id="of">${obsFields(editing||{})}${filePicker(12)}<div id="saveError"></div><button id="saveObsBtn" class="btn" style="width:100%">儲存觀察紀錄</button></form></div></div>`;
  document.querySelector('#back').onclick = () => go('admin');
  const getFiles = bindPicker(12);
  document.querySelector('#of').onsubmit = async e => {
    e.preventDefault();
    const btn = document.querySelector('#saveObsBtn');
    const errorBox = document.querySelector('#saveError');
    errorBox.innerHTML = '';
    btn.disabled = true;
    saving = true;
    try {
      const data = {
        birdId: document.querySelector('#bird').value,
        observationDate: document.querySelector('#odate').value,
        location: document.querySelector('#loc').value.trim(),
        note: document.querySelector('#note').value.trim(),
        updatedAt: serverTimestamp()
      };
      const items = getFiles();
      const compressed = [];
      for (let i=0;i<items.length;i++) {
        btn.textContent = `處理照片 ${i+1}/${items.length}…`;
        compressed.push({...await compressImage(items[i].file), caption:items[i].caption});
      }
      const existing = editing ? await docsBy('observationPhotos','observationId',editing.id) : [];
      const batch = writeBatch(db);
      const obsRef = editing ? d('observations', editing.id) : doc(col('observations'));
      const obsData = {...data};
      if (!editing) obsData.createdAt = serverTimestamp();
      obsData.photoCount = existing.length + compressed.length;
      obsData.firstThumb = existing[0]?.thumbnailData || compressed[0]?.thumbnailData || editing?.firstThumb || '';
      if (editing) batch.update(obsRef, obsData); else batch.set(obsRef, obsData);
      compressed.forEach((z,i) => {
        const pRef = doc(col('observationPhotos'));
        batch.set(pRef, {observationId:obsRef.id, birdId:data.birdId, imageData:z.imageData, thumbnailData:z.thumbnailData, caption:z.caption, order:Date.now()+i, createdAt:serverTimestamp()});
      });
      btn.textContent = '寫入資料庫中…';
      await batch.commit();
      editing = null;
      saving = false;
      alert('觀察紀錄已儲存。');
      go('admin');
    } catch (err) {
      saving = false;
      console.error('Save observation failed:', err);
      btn.disabled = false;
      btn.textContent = '儲存觀察紀錄';
      errorBox.innerHTML = `<div class="err">儲存失敗：${esc(err.code || err.message || '未知錯誤')}</div>`;
    }
  };
}

render();