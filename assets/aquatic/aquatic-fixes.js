import { AQUATIC_PLANTS, OBSERVATION_QUESTIONS } from './aquatic-data.js';
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

function isStrictlyComplete(observation) {
  if (!observation?.completed || !observation?.hasPhoto) return false;
  return OBSERVATION_QUESTIONS.every((question) => String(observation?.answers?.[question.id] || '').trim());
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

function setCompletionBadge(badge, complete) {
  if (!badge) return;
  badge.className = `plant-state${complete ? ' done' : ''}`;
  badge.textContent = complete ? '✓ 已完成' : '未完成';
}

function updateStrictGuideState(completedCount) {
  const button = document.querySelector('#open-classification');
  const help = document.querySelector('#classification-help');
  if (button) button.disabled = completedCount !== AQUATIC_PLANTS.length;
  if (help) {
    help.textContent = completedCount === AQUATIC_PLANTS.length
      ? '七種植物都完整完成了，現在進行植物分類與環境調查。'
      : `還有 ${AQUATIC_PLANTS.length - completedCount} 種植物未完整完成；照片與三題都完成後才算完成。`;
  }
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
  let verifiedComplete = 0;
  updateStrictGuideState(0);

  cards.forEach((card, index) => {
    const plant = AQUATIC_PLANTS[index];
    const thumb = card.querySelector('.plant-thumb');
    const badge = card.querySelector('.plant-state');
    if (!plant || !thumb) return;

    const observation = observationFor(record, plant.id);
    const candidate = isStrictlyComplete(observation);

    setCompletionBadge(badge, false);
    setPlaceholder(thumb);
    if (!candidate) return;

    resolvePhoto(studentSession, plant, observation)
      .then((blob) => {
        if (currentRefresh !== refreshId || !thumb.isConnected) return;
        if (!blob) return;
        setPhoto(thumb, blob, plant.name);
        setCompletionBadge(badge, true);
        verifiedComplete += 1;
        updateStrictGuideState(verifiedComplete);
      })
      .catch((error) => {
        console.error(`[aquatic] ${plant.name} photo load failed`, error);
        if (currentRefresh === refreshId && thumb.isConnected) {
          setPlaceholder(thumb, '照片暫時無法讀取');
          setCompletionBadge(badge, false);
          updateStrictGuideState(verifiedComplete);
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

// 環境調查只存在於最後的「分類與環境調查」頁面。
// 不在單株植物頁建立、同步或繼承任何環境調查草稿，避免切換植物時答案混入。

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
