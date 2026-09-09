const SOURCE_URL = './bird-v4.js?v=20260910-2';

async function boot() {
  const res = await fetch(SOURCE_URL, {cache:'no-store'});
  if (!res.ok) throw new Error(`無法載入網站核心程式（HTTP ${res.status}）`);
  let src = await res.text();

  src = src.replace(
    "const VERSION = '2026-09-10 Drive v4.0';",
    "const VERSION = '2026-09-10 Drive v5.0';"
  );

  const start = src.indexOf('let driveFrame = null;');
  const end = src.indexOf('function fileAsDataURL(file) {');

  if (start < 0 || end < 0 || end <= start) {
    throw new Error('找不到舊版 Google Drive 橋接程式，無法套用 v5 更新。');
  }

  const replacement = `
async function currentIdToken() {
  if (!auth.currentUser || auth.currentUser.uid !== ADMIN_UID) {
    throw new Error('管理員登入已失效，請重新登入。');
  }
  return auth.currentUser.getIdToken(true);
}

function newDriveJobId() {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
}

async function submitDriveJob(action, payload, timeoutMs=120000) {
  const idToken = payload?.idToken || await currentIdToken();
  const jobId = newDriveJobId();
  const jobRef = d('uploadJobs', jobId);

  await setDoc(jobRef, {
    status: 'pending',
    action,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const frameName = 'minan_drive_' + jobId;
  const iframe = document.createElement('iframe');
  iframe.name = frameName;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'display:none;width:0;height:0;border:0';
  document.body.appendChild(iframe);

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = DRIVE_WEB_APP;
  form.target = frameName;
  form.enctype = 'multipart/form-data';
  form.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'payload';
  input.value = JSON.stringify({...payload, action, jobId, idToken});
  form.appendChild(input);
  document.body.appendChild(form);

  let cleaned = false;
  const cleanupDom = () => {
    if (cleaned) return;
    cleaned = true;
    form.remove();
    setTimeout(() => iframe.remove(), 500);
  };

  form.submit();

  const started = Date.now();

  try {
    while (Date.now() - started < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 700));

      const snap = await getDoc(jobRef);
      if (!snap.exists()) continue;

      const data = snap.data() || {};

      if (data.status === 'success') {
        try { await deleteDoc(jobRef); } catch {}
        cleanupDom();
        return data;
      }

      if (data.status === 'error') {
        throw new Error(data.error || 'Google Drive 圖片服務回報失敗');
      }
    }

    throw new Error('Google Drive 圖片服務逾時，請確認 Apps Script v3 已部署。');

  } catch (err) {
    try { await deleteDoc(jobRef); } catch {}
    cleanupDom();
    throw err;
  }
}

async function driveCall(action, payload, timeoutMs=120000) {
  return submitDriveJob(action, payload || {}, timeoutMs);
}

async function drivePing() {
  const idToken = await currentIdToken();
  return driveCall('ping', {idToken}, 45000);
}

async function driveDelete(fileId) {
  if (!fileId) return;
  const idToken = await currentIdToken();
  return driveCall('delete', {idToken, fileId}, 90000);
}

`;

  src = src.slice(0, start) + replacement + src.slice(end);

  src = src.replace(
`function photoFull(photo) {
  return photo?.driveUrl || photo?.driveImageUrl || photo?.imageUrl || photo?.imageData || photo?.thumbnailData || '';
}`,
`function photoFull(photo) {
  return photo?.driveImageUrl || photo?.imageUrl || photo?.imageData || photo?.thumbnailData || photo?.driveThumbnailUrl || '';
}`
  );

  const blob = new Blob([src + '\n//# sourceURL=bird-v5-runtime.js'], {type:'text/javascript'});
  const url = URL.createObjectURL(blob);

  try {
    await import(url);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

boot().catch(err => {
  console.error('Bird v5 boot failed:', err);
  const app = document.querySelector('#app');
  if (app) {
    app.innerHTML = '<div class="emptybox"><div class="err">網站新版載入失敗：' +
      String(err?.message || err) +
      '</div></div>';
  }
});
