import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
  getFirestore, collection, doc, getDocs, getDoc, query, where,
  serverTimestamp, setDoc, updateDoc, deleteDoc
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
const DRIVE_WEB_APP = 'https://script.google.com/macros/s/AKfycbyXQHmi_FbPi_o8JlKO7G_5r_oAbylS4nTSixxInXAkO3zBbut-tjuSKIZM5ab6qQvM/exec';
const VERSION = '2026-09-10 Drive v4.0';

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
let busy = false;
let systemCheck = null;
let flash = '';
let booted = false;

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[m]));

const dateValue = v => v ? (new Date(v).getTime() || 0) : 0;

async function sha(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2,'0')).join('');
}

function errorText(err) {
  const code = err?.code || '';
  const msg = err?.message || String(err || '未知錯誤');
  return `${code ? code + '：' : ''}${msg}`;
}

let driveFrame = null;
let driveReady = false;
let driveReadyPromise = null;
const drivePending = new Map();

function ensureDriveBridge() {
  if (driveReady) return Promise.resolve(true);
  if (driveReadyPromise) return driveReadyPromise;

  driveReadyPromise = new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        driveReadyPromise = null;
        reject(new Error('Google Drive 圖片服務連線逾時，請確認 Apps Script 已部署為「任何人」可存取。'));
      }
    }, 20000);

    if (!driveFrame) {
      driveFrame = document.createElement('iframe');
      driveFrame.id = 'minanDriveBridge';
      driveFrame.src = DRIVE_WEB_APP;
      driveFrame.setAttribute('aria-hidden', 'true');
      driveFrame.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0;opacity:0;pointer-events:none';
      document.body.appendChild(driveFrame);
    }

    const check = () => {
      if (driveReady && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(true);
      } else if (!settled) {
        setTimeout(check, 150);
      }
    };
    check();
  });

  return driveReadyPromise;
}

window.addEventListener('message', event => {
  if (!driveFrame || event.source !== driveFrame.contentWindow) return;
  const msg = event.data || {};
  if (msg.source !== 'minan-drive-bridge') return;

  if (msg.type === 'ready') {
    driveReady = true;
    return;
  }

  if (!msg.requestId) return;
  const pending = drivePending.get(msg.requestId);
  if (!pending) return;
  drivePending.delete(msg.requestId);
  clearTimeout(pending.timer);

  if (msg.ok) pending.resolve(msg.result);
  else pending.reject(new Error(msg.error || 'Google Drive 圖片服務回傳錯誤'));
});

async function driveCall(action, payload, timeoutMs=120000) {
  await ensureDriveBridge();
  const requestId = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      drivePending.delete(requestId);
      reject(new Error(`Google Drive ${action} 操作逾時`));
    }, timeoutMs);

    drivePending.set(requestId, {resolve, reject, timer});
    driveFrame.contentWindow.postMessage({
      source: 'minan-bird-site',
      action,
      requestId,
      payload
    }, '*');
  });
}

async function currentIdToken() {
  if (!auth.currentUser || auth.currentUser.uid !== ADMIN_UID) {
    throw new Error('管理員登入已失效，請重新登入。');
  }
  return auth.currentUser.getIdToken(true);
}

async function drivePing() {
  const idToken = await currentIdToken();
  return driveCall('ping', {idToken}, 30000);
}

async function driveDelete(fileId) {
  if (!fileId) return;
  const idToken = await currentIdToken();
  return driveCall('delete', {idToken, fileId}, 60000);
}

function fileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('無法讀取圖片檔案'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function imageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('瀏覽器無法解析這張圖片，請改用 JPG、PNG 或 WebP。'));
    };
    img.src = url;
  });
}

function canvasBlob(canvas, type='image/jpeg', quality=.9) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('圖片轉換失敗')), type, quality);
  });
}

async function prepareDriveImage(file) {
  if (!file || !file.type?.startsWith('image/')) throw new Error('選取的檔案不是圖片');

  const DIRECT_LIMIT = 5 * 1024 * 1024;
  if (file.size <= DIRECT_LIMIT && ['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) {
    return {
      fileName: file.name,
      mimeType: file.type,
      dataBase64: await fileAsDataURL(file),
      originalBytes: file.size,
      converted: false
    };
  }

  const img = await imageFromFile(file);
  let maxSide = 3000;
  let quality = .90;
  let blob = null;

  for (let attempt=0; attempt<8; attempt++) {
    const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * ratio));
    canvas.height = Math.max(1, Math.round(img.height * ratio));
    const ctx = canvas.getContext('2d', {alpha:false});
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    blob = await canvasBlob(canvas, 'image/jpeg', quality);
    if (blob.size <= 6 * 1024 * 1024) break;
    if (quality > .80) quality -= .04;
    else maxSide = Math.round(maxSide * .85);
  }

  if (!blob || blob.size > 8 * 1024 * 1024) {
    throw new Error('照片仍然過大，請使用較小的原始檔案。');
  }

  const stem = file.name.replace(/\.[^.]+$/, '') || 'bird';
  return {
    fileName: `${stem}.jpg`,
    mimeType: 'image/jpeg',
    dataBase64: await fileAsDataURL(blob),
    originalBytes: file.size,
    convertedBytes: blob.size,
    converted: true
  };
}

async function uploadDriveItem(item, kind, progress) {
  if (progress) progress('正在準備高畫質照片…');
  const prepared = await prepareDriveImage(item.file);
  if (progress) progress('正在上傳至 Google Drive…');
  const idToken = await currentIdToken();

  const result = await driveCall('upload', {
    idToken,
    kind,
    fileName: prepared.fileName,
    mimeType: prepared.mimeType,
    dataBase64: prepared.dataBase64
  }, 180000);

  if (!result?.fileId) throw new Error('Google Drive 上傳成功後未回傳 fileId');

  return {
    driveFileId: result.fileId,
    driveImageUrl: result.imageUrl || '',
    driveThumbnailUrl: result.thumbnailUrl || '',
    driveUrl: result.driveUrl || '',
    fileName: result.fileName || prepared.fileName,
    mimeType: result.mimeType || prepared.mimeType,
    fileSize: result.size || prepared.convertedBytes || prepared.originalBytes || 0,
    caption: item.caption || ''
  };
}

async function docsBy(collectionName, key, value) {
  const snap = await getDocs(query(col(collectionName), where(key, '==', value)));
  return snap.docs.map(x => ({id:x.id, ...x.data()})).sort((a,b)=>(a.order||0)-(b.order||0));
}

async function loadData() {
  const [birdSnap, obsSnap] = await Promise.all([getDocs(col('birds')), getDocs(col('observations'))]);
  birds = birdSnap.docs.map(x => ({id:x.id, ...x.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  observations = obsSnap.docs.map(x => ({id:x.id, ...x.data()})).sort((a,b)=>dateValue(b.observationDate)-dateValue(a.observationDate));
}

function photoThumb(photo) {
  return photo?.driveThumbnailUrl || photo?.thumbnailUrl || photo?.thumbnailData || photo?.driveImageUrl || photo?.imageUrl || photo?.imageData || '';
}

function photoDisplay(photo) {
  return photo?.driveThumbnailUrl || photo?.driveImageUrl || photo?.thumbnailUrl || photo?.imageUrl || photo?.imageData || photo?.thumbnailData || '';
}

function photoFull(photo) {
  return photo?.driveUrl || photo?.driveImageUrl || photo?.imageUrl || photo?.imageData || photo?.thumbnailData || '';
}

async function deletePhoto(collectionName, photo) {
  if (photo?.driveFileId) await driveDelete(photo.driveFileId);
  await deleteDoc(d(collectionName, photo.id));
}

function setTopState() {
  const nav = document.querySelector('#adminNav');
  const foot = document.querySelector('#loginFoot');
  if (nav) nav.hidden = !admin;
  if (foot) foot.textContent = admin ? '登出管理' : '管理登入';
}

function go(next, payload=null) {
  if (busy) return;
  view = next;
  if (payload) selectedBird = payload;
  window.scrollTo(0,0);
  render();
}

document.querySelector('#brand').onclick = () => go('home');
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
document.querySelector('#loginFoot').onclick = () => admin ? logout() : go('login');

async function runSystemCheck() {
  if (!auth.currentUser || auth.currentUser.uid !== ADMIN_UID) {
    systemCheck = {ok:false, text:'管理員登入狀態不正確'};
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const ref = d('birds', `__diag_${suffix}`);
  try {
    await setDoc(ref, {_diagnostic:true,name:'系統檢查',shortDescription:'temporary',createdAt:serverTimestamp(),updatedAt:serverTimestamp(),coverThumb:''});
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Firestore 寫入後無法讀回');
    await deleteDoc(ref);

    const ping = await drivePing();
    if (!ping?.ok) throw new Error('Google Drive 圖片服務驗證失敗');

    systemCheck = {ok:true, text:'Firebase 與 Google Drive 高畫質圖片服務皆正常'};
  } catch (err) {
    try { await deleteDoc(ref); } catch {}
    systemCheck = {ok:false, text:errorText(err)};
  }
}

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
  app.innerHTML = `
    <section class="hero">
      <div><span class="eyebrow">民安國小自然觀察</span><h1>民安羽跡</h1><h2>校園鳥類觀察站</h2><p>一起記錄，在民安校園裡留下的每一道羽跡。這裡是一本屬於我們的自然觀察圖鑑。</p></div>
      <div class="visual">${first?.coverThumb ? `<img src="${first.coverThumb}" alt="${esc(first.name)}">` : `<div class="empty"><div style="font-size:48px">⌁</div><b>等待第一道羽跡</b></div>`}</div>
    </section>
    <section class="section">
      <div class="sectionhead"><div><h2>校園鳥類</h2><div class="muted">認識民安校園的常客</div></div>${admin?'<button class="btn" id="newBird">＋ 記錄新鳥種</button>':''}</div>
      ${birds.length ? `<div class="grid">${birds.map(b => `<article class="card" data-bird="${b.id}"><div class="cover">${b.coverThumb?`<img src="${b.coverThumb}" alt="${esc(b.name)}">`:'<span>等待照片</span>'}</div><div class="cardbody"><h3>${esc(b.name)}</h3><p>${esc(b.shortDescription||'尚未提供簡介')}</p><div class="link">查看羽跡 →</div></div></article>`).join('')}</div>` : `<div class="emptybox"><div class="emptyicon">⌁</div><h3>第一道羽跡，正等待被發現</h3><p>民安校園的鳥類觀察紀錄將從這裡慢慢累積。</p>${admin?'<button class="btn" id="firstBird">記錄第一種鳥類</button>':''}</div>`}
    </section>`;
  document.querySelectorAll('[data-bird]').forEach(el => el.onclick = () => {
    selectedBird = birds.find(b=>b.id===el.dataset.bird);
    go('detail');
  });
  const add = document.querySelector('#newBird') || document.querySelector('#firstBird');
  if (add) add.onclick = () => { editing = null; go('birdform'); };
}

function login() {
  app.innerHTML = `<div class="login"><div class="box"><div style="text-align:center;font-size:34px">▣</div><h2 style="text-align:center">管理員登入</h2><p class="muted" style="text-align:center">請輸入管理帳號與密碼</p><form id="loginForm"><div class="field"><label>管理帳號</label><input id="u" required autocomplete="username"></div><div class="field"><label>管理密碼</label><input id="p" type="password" required autocomplete="current-password"></div><div id="le"></div><button id="loginBtn" class="btn" style="width:100%">登入管理中心</button></form><div style="text-align:center;margin-top:18px"><button class="ghost" id="back">返回首頁</button></div></div></div>`;
  document.querySelector('#back').onclick = () => go('home');
  document.querySelector('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const le = document.querySelector('#le');
    const btn = document.querySelector('#loginBtn');
    le.innerHTML = '';
    btn.disabled = true;
    btn.textContent = '登入中…';
    try {
      if (await sha(document.querySelector('#u').value.trim()) !== ADMIN_USER_HASH) throw new Error('帳號不正確');
      const c = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, document.querySelector('#p').value);
      if (c.user.uid !== ADMIN_UID) { await signOut(auth); throw new Error('管理員 UID 不符'); }
      admin = true;
      await loadData();
      systemCheck = {ok:true, text:'正在檢查 Google Drive 圖片服務…'};
      view = 'admin';
      render();
      await runSystemCheck();
      render();
    } catch (err) {
      le.innerHTML = `<div class="err">登入失敗：${esc(errorText(err))}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '登入管理中心';
    }
  };
}

async function logout() {
  await signOut(auth);
  admin = false;
  systemCheck = null;
  flash = '';
  view = 'home';
  render();
}

function adminPage() {
  if (!admin) return go('login');
  const diag = systemCheck ? `<div class="${systemCheck.ok?'emptybox':'err'}" style="margin-bottom:18px;padding:14px 18px"><b>系統檢查：</b> ${esc(systemCheck.text)} <span class="muted">（${VERSION}）</span></div>` : '';
  const notice = flash ? `<div class="emptybox" style="margin-bottom:18px;padding:14px 18px">${esc(flash)}</div>` : '';

  app.innerHTML = `<div class="section"><div class="sectionhead"><div><h2>管理中心</h2><div class="muted">文字資料存 Firestore，新照片以高畫質保存到 Google Drive</div></div><div class="actions"><button class="btn btn2" id="checkBtn">重新檢查</button><button class="btn btn2" id="newObs">＋ 新增觀察</button><button class="btn" id="newBird">＋ 新增鳥種</button></div></div>${diag}${notice}<div class="box"><h3>已建立的鳥種（${birds.length}）</h3>${birds.length?birds.map(b=>`<div class="adminrow"><img class="thumb" src="${b.coverThumb||''}"><div><b>${esc(b.name)}</b><div class="muted">${esc(b.shortDescription||'')}</div></div><div class="actions"><button class="btn btn2" data-view="${b.id}">查看</button><button class="btn btn2" data-edit="${b.id}">編輯</button><button class="btn danger" data-delbird="${b.id}">刪除</button></div></div>`).join(''):'<p class="muted">尚無鳥類資料。</p>'}</div><div class="box" style="margin-top:22px"><h3>觀察紀錄（${observations.length}）</h3>${observations.length?observations.map(o=>`<div class="adminrow"><img class="thumb" src="${o.firstThumb||''}"><div><b>${esc(birds.find(b=>b.id===o.birdId)?.name||'未知鳥種')}</b><div class="muted">${esc(o.observationDate)} · ${esc(o.location)}</div></div><div class="actions"><button class="btn btn2" data-editobs="${o.id}">編輯</button><button class="btn danger" data-delobs="${o.id}">刪除</button></div></div>`).join(''):'<p class="muted">尚無觀察紀錄。</p>'}</div></div>`;

  flash = '';
  document.querySelector('#checkBtn').onclick = async () => {
    systemCheck={ok:true,text:'檢查中…'};
    render();
    await runSystemCheck();
    render();
  };
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
  busy = true;
  try {
    const relatedObs = observations.filter(x=>x.birdId===id);
    for (const o of relatedObs) await deleteObservation(o.id, true);
    const photos = await docsBy('birdPhotos','birdId',id);
    for (const p of photos) await deletePhoto('birdPhotos', p);
    await deleteDoc(d('birds',id));
    await loadData();
    flash='鳥種及相關照片已刪除。';
  } catch (err) {
    systemCheck={ok:false,text:`刪除失敗：${errorText(err)}`};
  } finally {
    busy=false;
    view='admin';
    render();
  }
}

async function deleteObservation(id, silent=false) {
  if (!silent && !confirm('確定刪除這筆觀察紀錄嗎？')) return;
  const photos = await docsBy('observationPhotos','observationId',id);
  for (const p of photos) await deletePhoto('observationPhotos', p);
  await deleteDoc(d('observations',id));
  if (!silent) {
    await loadData();
    flash='觀察紀錄已刪除。';
    view='admin';
    render();
  }
}

async function detail() {
  if (!selectedBird) return go('home');
  app.innerHTML = '<div class="loading">正在整理鳥類圖鑑...</div>';

  try {
    const photos = await docsBy('birdPhotos','birdId',selectedBird.id);
    const birdObs = observations.filter(x=>x.birdId===selectedBird.id);
    const hero = photos[0] ? photoDisplay(photos[0]) : '';

    app.innerHTML = `<div class="detailhero">${hero?`<img src="${hero}" alt="${esc(selectedBird.name)}">`:''}</div><div class="detail"><article class="article"><button class="ghost" id="dh">← 返回校園鳥類</button><h1>${esc(selectedBird.name)}</h1><p class="muted" style="text-align:center">${esc(selectedBird.shortDescription||'')}</p>${photos.length?`<div class="gallery">${photos.map(p=>`<figure><img src="${photoThumb(p)}" data-full="${esc(photoFull(p))}"><figcaption>${esc(p.caption||'')}</figcaption></figure>`).join('')}</div>`:''}<section><h3>辨識特徵</h3><p>${esc(selectedBird.identification||'尚未提供資料。')}</p></section><section><h3>生活習性</h3><p>${esc(selectedBird.habits||'尚未提供資料。')}</p></section><section><h3>在民安怎麼找到牠？</h3><p>${esc(selectedBird.minanTips||'尚未提供資料。')}</p></section><section><h3>校園觀察紀錄</h3><div id="obsDetail">${birdObs.length?birdObs.map(o=>`<div class="obs" data-od="${o.id}"><div class="chips"><span class="chip">${esc(o.observationDate)}</span><span class="chip">${esc(o.location)}</span></div><p>${esc(o.note||'')}</p><div class="odpics"></div></div>`).join(''):'<p class="muted">目前還沒有觀察紀錄。</p>'}</div></section></article></div>`;

    document.querySelector('#dh').onclick = () => go('home');
    document.querySelectorAll('.gallery img').forEach(i => i.onclick = () => {
      const target = i.dataset.full;
      if (target) window.open(target,'_blank','noopener');
    });

    for (const el of document.querySelectorAll('[data-od]')) {
      const pp = await docsBy('observationPhotos','observationId',el.dataset.od);
      el.querySelector('.odpics').innerHTML = pp.length ? `<div class="gallery">${pp.map(p=>`<figure><img src="${photoThumb(p)}" data-full="${esc(photoFull(p))}"><figcaption>${esc(p.caption||'')}</figcaption></figure>`).join('')}</div>` : '';
    }
    document.querySelectorAll('.odpics img').forEach(i => i.onclick = () => {
      const target = i.dataset.full;
      if (target) window.open(target,'_blank','noopener');
    });
  } catch (err) {
    app.innerHTML = `<div class="emptybox"><div class="err">載入詳細資料失敗：${esc(errorText(err))}</div><button class="btn" id="dh">返回首頁</button></div>`;
    document.querySelector('#dh').onclick = () => go('home');
  }
}

function filePicker(max) {
  return `<div class="field"><label>照片（最多 ${max} 張）</label><div class="picker"><input id="files" type="file" accept="image/*" multiple><div class="muted" style="margin-top:8px">新照片將保存到 Google Drive；小於 5MB 的 JPG/PNG/WebP 會盡量保留原檔，大圖則自動轉成約 3000px 高畫質 JPG。</div><div id="previews" class="previews"></div></div></div>`;
}

function bindPicker(max) {
  const inp = document.querySelector('#files');
  const box = document.querySelector('#previews');
  let items = [];
  inp.onchange = () => {
    items.forEach(x => URL.revokeObjectURL(x.url));
    items = [...inp.files].filter(f=>f.type.startsWith('image/')).slice(0,max).map(f=>({
      file:f,
      url:URL.createObjectURL(f),
      caption:''
    }));
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

  app.innerHTML = `<div class="panel"><button class="ghost" id="back">← 返回管理中心</button><div class="box"><h2>${editing?'編輯鳥種':'新增鳥種'}</h2>${editing?'<p class="muted">原有照片會保留；新選照片會追加為 Google Drive 高畫質照片。</p>':''}<form id="bf">${birdFields(editing||{})}${filePicker(8)}<div id="saveStatus" class="muted" style="margin:10px 0"></div><div id="saveError"></div><button id="saveBirdBtn" class="btn" style="width:100%">儲存鳥種資料</button></form></div></div>`;

  document.querySelector('#back').onclick = () => go('admin');
  const getFiles = bindPicker(8);

  document.querySelector('#bf').onsubmit = async e => {
    e.preventDefault();
    const btn = document.querySelector('#saveBirdBtn');
    const status = document.querySelector('#saveStatus');
    const errorBox = document.querySelector('#saveError');
    btn.disabled = true;
    errorBox.innerHTML = '';
    busy = true;

    const birdRef = editing ? d('birds', editing.id) : doc(col('birds'));
    const uploaded = [];

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

      for (let i=0; i<items.length; i++) {
        status.textContent = `照片 ${i+1}/${items.length}：準備上傳…`;
        const meta = await uploadDriveItem(items[i], 'bird', msg => {
          status.textContent = `照片 ${i+1}/${items.length}：${msg}`;
        });
        uploaded.push({...meta, caption:items[i].caption});
      }

      status.textContent = '正在寫入鳥類資料…';
      if (editing) await updateDoc(birdRef, data);
      else await setDoc(birdRef, {...data, createdAt:serverTimestamp(), coverThumb:''});

      for (let i=0; i<uploaded.length; i++) {
        const pRef = doc(col('birdPhotos'));
        const z = uploaded[i];
        await setDoc(pRef, {
          birdId: birdRef.id,
          storage: 'google-drive',
          driveFileId: z.driveFileId,
          driveImageUrl: z.driveImageUrl,
          driveThumbnailUrl: z.driveThumbnailUrl,
          driveUrl: z.driveUrl,
          fileName: z.fileName,
          mimeType: z.mimeType,
          fileSize: z.fileSize,
          caption: z.caption,
          order: Date.now()+i,
          createdAt: serverTimestamp()
        });
      }

      if (uploaded[0]) {
        await updateDoc(birdRef, {
          coverThumb: uploaded[0].driveThumbnailUrl || uploaded[0].driveImageUrl,
          updatedAt: serverTimestamp()
        });
      }

      await loadData();
      const saved = birds.find(b=>b.id===birdRef.id);
      if (!saved) throw new Error('資料已送出，但重新讀取後找不到剛新增的鳥種。');

      editing = null;
      flash = `已成功儲存「${saved.name}」${uploaded.length?`，Google Drive 高畫質照片 ${uploaded.length} 張`:''}。`;
      view = 'admin';
      busy = false;
      render();
    } catch (err) {
      for (const z of uploaded) {
        try { await driveDelete(z.driveFileId); } catch {}
      }
      busy = false;
      btn.disabled = false;
      btn.textContent = '儲存鳥種資料';
      status.textContent = '';
      errorBox.innerHTML = `<div class="err">儲存失敗：${esc(errorText(err))}<br><small>版本：${VERSION}</small></div>`;
    }
  };
}

function obsFields(v={}) {
  return `<div class="twocol"><div class="field"><label>鳥種 *</label><select id="bird" required><option value="">-- 請選擇 --</option>${birds.map(b=>`<option value="${b.id}" ${b.id===v.birdId?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div><div class="field"><label>觀察日期 *</label><input id="odate" type="date" required value="${esc(v.observationDate||new Date().toISOString().slice(0,10))}"></div></div><div class="field"><label>觀察地點 *</label><input id="loc" required value="${esc(v.location||'前操場')}"></div><div class="field"><label>觀察補充</label><textarea id="note" rows="4">${esc(v.note||'')}</textarea></div>`;
}

function obsForm() {
  if (!admin) return go('login');
  if (!birds.length) {
    alert('請先新增至少一種鳥類。');
    return go('admin');
  }

  app.innerHTML = `<div class="panel"><button class="ghost" id="back">← 返回管理中心</button><div class="box"><h2>${editing?'編輯觀察紀錄':'新增觀察紀錄'}</h2>${editing?'<p class="muted">原有照片會保留；新選照片會追加為 Google Drive 高畫質照片。</p>':''}<form id="of">${obsFields(editing||{})}${filePicker(12)}<div id="saveStatus" class="muted" style="margin:10px 0"></div><div id="saveError"></div><button id="saveObsBtn" class="btn" style="width:100%">儲存觀察紀錄</button></form></div></div>`;

  document.querySelector('#back').onclick = () => go('admin');
  const getFiles = bindPicker(12);

  document.querySelector('#of').onsubmit = async e => {
    e.preventDefault();
    const btn = document.querySelector('#saveObsBtn');
    const status = document.querySelector('#saveStatus');
    const errorBox = document.querySelector('#saveError');
    btn.disabled = true;
    errorBox.innerHTML = '';
    busy = true;

    const obsRef = editing ? d('observations', editing.id) : doc(col('observations'));
    const uploaded = [];

    try {
      const data = {
        birdId: document.querySelector('#bird').value,
        observationDate: document.querySelector('#odate').value,
        location: document.querySelector('#loc').value.trim(),
        note: document.querySelector('#note').value.trim(),
        updatedAt: serverTimestamp()
      };

      const items = getFiles();

      for (let i=0; i<items.length; i++) {
        status.textContent = `照片 ${i+1}/${items.length}：準備上傳…`;
        const meta = await uploadDriveItem(items[i], 'observation', msg => {
          status.textContent = `照片 ${i+1}/${items.length}：${msg}`;
        });
        uploaded.push({...meta, caption:items[i].caption});
      }

      status.textContent = '正在寫入觀察資料…';
      if (editing) await updateDoc(obsRef, data);
      else await setDoc(obsRef, {...data, createdAt:serverTimestamp(), firstThumb:'', photoCount:0});

      const existing = editing ? await docsBy('observationPhotos','observationId',editing.id) : [];
      let first = existing[0] ? photoThumb(existing[0]) : (editing?.firstThumb || '');

      for (let i=0; i<uploaded.length; i++) {
        const pRef = doc(col('observationPhotos'));
        const z = uploaded[i];
        await setDoc(pRef, {
          observationId: obsRef.id,
          birdId: data.birdId,
          storage: 'google-drive',
          driveFileId: z.driveFileId,
          driveImageUrl: z.driveImageUrl,
          driveThumbnailUrl: z.driveThumbnailUrl,
          driveUrl: z.driveUrl,
          fileName: z.fileName,
          mimeType: z.mimeType,
          fileSize: z.fileSize,
          caption: z.caption,
          order: Date.now()+i,
          createdAt: serverTimestamp()
        });
        if (!first) first = z.driveThumbnailUrl || z.driveImageUrl;
      }

      await updateDoc(obsRef, {
        firstThumb: first,
        photoCount: existing.length + uploaded.length,
        updatedAt: serverTimestamp()
      });

      await loadData();
      if (!observations.find(o=>o.id===obsRef.id)) throw new Error('資料已送出，但重新讀取後找不到剛新增的觀察紀錄。');

      editing = null;
      flash = `觀察紀錄已成功儲存${uploaded.length?`，Google Drive 高畫質照片 ${uploaded.length} 張`:''}。`;
      view = 'admin';
      busy = false;
      render();
    } catch (err) {
      for (const z of uploaded) {
        try { await driveDelete(z.driveFileId); } catch {}
      }
      busy = false;
      btn.disabled = false;
      btn.textContent = '儲存觀察紀錄';
      status.textContent = '';
      errorBox.innerHTML = `<div class="err">儲存失敗：${esc(errorText(err))}<br><small>版本：${VERSION}</small></div>`;
    }
  };
}

onAuthStateChanged(auth, async user => {
  admin = user?.uid === ADMIN_UID;
  if (user && !admin) {
    try { await signOut(auth); } catch {}
  }

  setTopState();

  if (!booted) {
    booted = true;
    try {
      await loadData();
    } catch (err) {
      app.innerHTML = `<div class="emptybox"><div class="err">資料讀取失敗：${esc(errorText(err))}</div></div>`;
      return;
    }
    render();
  } else if (!busy) {
    render();
  }
});

setTimeout(async () => {
  if (!booted) {
    booted = true;
    try {
      await loadData();
      render();
    } catch (err) {
      app.innerHTML = `<div class="emptybox"><div class="err">資料讀取失敗：${esc(errorText(err))}</div></div>`;
    }
  }
}, 1800);
