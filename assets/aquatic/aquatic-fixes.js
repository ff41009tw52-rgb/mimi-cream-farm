import { AQUATIC_PLANTS } from './aquatic-data.js';
import { AquaticApi, getStoredStudent } from './aquatic-api.js';
import { getPhoto, photoKey, putPhoto } from './aquatic-storage.js';

const api = new AquaticApi();
const objectUrls = new Map();
let refreshId = 0;

function cachedRecord(studentId) {
  try {
    return JSON.parse(localStorage.getItem(`aquatic.record.${studentId}`) || 'null') || { observations: [] };
  } catch {
    return { observations: [] };
  }
}

function observationFor(record, plantId) {
  return (record?.observations || []).find((item) => item.plantId === plantId) || null;
}

function setPlaceholder(thumb, text = '尚未拍攝') {
  const oldUrl = objectUrls.get(thumb);
  if (oldUrl) URL.revokeObjectURL(oldUrl);
  objectUrls.delete(thumb);
  thumb.classList.remove('student-thumb-photo');
  thumb.classList.add('student-thumb-placeholder');
  thumb.style.backgroundImage = 'none';
  const wrap = document.createElement('div');
  wrap.className = 'student-thumb-placeholder-inner';
  const icon = document.createElement('span');
  icon.className = 'student-thumb-placeholder-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '📷';
  const label = document.createElement('strong');
  label.textContent = text;
  wrap.append(icon, label);
  thumb.replaceChildren(wrap);
}

function setPhoto(thumb, blob, plantName) {
  const oldUrl = objectUrls.get(thumb);
  if (oldUrl) URL.revokeObjectURL(oldUrl);
  const url = URL.createObjectURL(blob);
  objectUrls.set(thumb, url);
  thumb.classList.remove('student-thumb-placeholder');
  thumb.classList.add('student-thumb-photo');
  thumb.style.backgroundImage = 'none';
  const img = new Image();
  img.src = url;
  img.alt = `${plantName}的學生拍攝照片`;
  thumb.replaceChildren(img);
}

async function resolvePhoto(studentSession, plant, observation) {
  const studentId = studentSession?.student?.id;
  if (!studentId) return null;
  const key = photoKey(studentId, plant.id);
  const local = await getPhoto(key).catch(() => null);
  if (local?.blob) return local.blob;
  if (!observation?.hasPhoto || !studentSession?.token) return null;
  const blob = await api.studentPhoto(studentSession.token, plant.id);
  await putPhoto(key, { blob, pending: false, updatedAt: Date.now() }).catch(() => {});
  return blob;
}

async function refreshGuideThumbnails() {
  const grid = document.querySelector('#plant-grid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.plant-card')];
  if (!cards.length) return;

  const studentSession = getStoredStudent();
  const studentId = studentSession?.student?.id;
  const record = studentId ? cachedRecord(studentId) : { observations: [] };
  const currentRefresh = ++refreshId;

  cards.forEach((card, index) => {
    const plant = AQUATIC_PLANTS[index];
    const thumb = card.querySelector('.plant-thumb');
    if (!plant || !thumb) return;
    const observation = observationFor(record, plant.id);
    setPlaceholder(thumb);

    resolvePhoto(studentSession, plant, observation)
      .then((blob) => {
        if (currentRefresh !== refreshId || !thumb.isConnected) return;
        if (blob) setPhoto(thumb, blob, plant.name);
      })
      .catch((error) => {
        console.error(`[aquatic] ${plant.name} photo load failed`, error);
        if (currentRefresh === refreshId && thumb.isConnected && observation?.hasPhoto) {
          setPlaceholder(thumb, '照片暫時無法讀取');
        }
      });
  });
}

const grid = document.querySelector('#plant-grid');
if (grid) {
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      refreshGuideThumbnails();
    });
  };
  new MutationObserver(schedule).observe(grid, { childList: true });
  schedule();
}

// 保留學生端簡潔訊息，但在開發者主控台留下真正的照片上傳錯誤。
const originalUploadPhoto = AquaticApi.prototype.uploadPhoto;
AquaticApi.prototype.uploadPhoto = async function patchedUploadPhoto(...args) {
  try {
    return await originalUploadPhoto.apply(this, args);
  } catch (error) {
    console.error('[aquatic] Google Drive photo upload failed', error);
    const message = document.querySelector('#photo-message');
    if (message && !document.querySelector('#plant-view')?.hidden) {
      message.textContent = '照片尚未上傳到 Google 雲端，已先保存在這台裝置。請稍後按「重新上傳」。';
      message.classList.add('upload-state');
    }
    throw error;
  }
};
