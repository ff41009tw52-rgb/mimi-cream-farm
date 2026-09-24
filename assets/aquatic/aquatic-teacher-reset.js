import { AQUATIC_PLANTS } from './aquatic-data.js';
import { AquaticApi } from './aquatic-api.js?v=20260924-8';

const api = new AquaticApi();
const detailRoot = document.querySelector('#student-detail');
const detailView = document.querySelector('#student-detail-view');
const photoWall = document.querySelector('#photo-wall');
const photosPanel = document.querySelector('#photos-panel');
const toast = document.querySelector('#toast');
const repairedPhotoUrls = new Set();
let lastTeacherStudent = null;
let lastDashboard = null;
let photoRepairQueued = false;

// Cache the same API responses the main teacher app is already requesting.
// This avoids an extra dashboard request just to discover student IDs for photos.
const originalTeacherStudent = AquaticApi.prototype.teacherStudent;
AquaticApi.prototype.teacherStudent = async function patchedTeacherStudent(...args) {
  const result = await originalTeacherStudent.apply(this, args);
  lastTeacherStudent = result;
  queuePhotoRepair();
  return result;
};

const originalTeacherDashboard = AquaticApi.prototype.teacherDashboard;
AquaticApi.prototype.teacherDashboard = async function patchedTeacherDashboard(...args) {
  const result = await originalTeacherDashboard.apply(this, args);
  lastDashboard = result;
  queuePhotoRepair();
  return result;
};

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function currentStudentIdentity() {
  const title = detailRoot?.querySelector('h1')?.textContent || '';
  const match = title.match(/(\d{3})班\s*(\d{1,2})號/);
  if (!match) return null;
  return { className: match[1], seatNumber: Number(match[2]) };
}

function ensureResetButton() {
  if (!detailRoot || detailView?.hidden) return;
  const header = detailRoot.querySelector('.detail-header');
  if (!header || header.querySelector('[data-reset-student]')) return;
  const identity = currentStudentIdentity();
  if (!identity) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary-button';
  button.dataset.resetStudent = 'true';
  button.textContent = '還原此學生資料';
  button.style.borderColor = '#b91c1c';
  button.style.color = '#991b1b';
  button.style.background = '#fff7f7';

  button.addEventListener('click', async () => {
    const label = `${identity.className}班 ${String(identity.seatNumber).padStart(2, '0')}號`;
    const first = window.confirm(`確定要把 ${label} 還原成全新狀態嗎？\n\n會清除植物答案、分類、環境調查與雲端照片。`);
    if (!first) return;
    const second = window.confirm(`最後確認：${label} 的雲端紀錄會被刪除，照片資料夾會移到 Google Drive 垃圾桶。\n\n確定繼續嗎？`);
    if (!second) return;

    const token = sessionStorage.getItem('aquatic.teacherToken');
    if (!token) { showToast('教師登入已失效，請重新登入。'); return; }

    button.disabled = true;
    button.textContent = '正在還原……';
    try {
      await api.teacherResetStudent(token, identity.className, identity.seatNumber);
      showToast(`${label} 已還原為全新狀態`);
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      button.disabled = false;
      button.textContent = '還原此學生資料';
      showToast(error.message || '還原失敗，請稍後再試。');
    }
  });

  header.append(button);
}

function plantIdForName(name) {
  return AQUATIC_PLANTS.find((plant) => plant.name === String(name || '').trim())?.id || '';
}

function classSeatFromText(value) {
  const match = String(value || '').match(/(\d{3})班\s*(\d{1,2})號/);
  return match ? { className: match[1], seatNumber: Number(match[2]) } : null;
}

function studentForIdentity(dashboard, identity) {
  if (!identity || !Array.isArray(dashboard?.students)) return null;
  return dashboard.students.find((student) =>
    String(student.className) === String(identity.className) &&
    Number(student.seatNumber) === Number(identity.seatNumber)
  ) || null;
}

async function fetchTeacherPhotoWithRetry(token, studentId, plantId) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await api.teacherPhoto(token, studentId, plantId);
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError;
}

async function loadTeacherPhoto(img, studentId, plantId) {
  if (!img || !studentId || !plantId || img.getAttribute('src') || img.dataset.photoRepairLoading === '1') return;
  const token = sessionStorage.getItem('aquatic.teacherToken');
  if (!token) return;

  img.dataset.photoRepairLoading = '1';
  img.hidden = false;
  try {
    const blob = await fetchTeacherPhotoWithRetry(token, studentId, plantId);
    if (img.getAttribute('src')) return;
    const url = URL.createObjectURL(blob);
    repairedPhotoUrls.add(url);
    img.src = url;
    img.hidden = false;
    img.dataset.photoRepairLoaded = '1';
  } catch (error) {
    img.alt = '照片暫時無法讀取';
    console.error('[aquatic teacher] photo load failed', { studentId, plantId, error });
  } finally {
    delete img.dataset.photoRepairLoading;
  }
}

function repairStudentDetailPhotos() {
  if (!detailRoot || detailView?.hidden || !lastTeacherStudent?.student || !lastTeacherStudent?.record) return;
  const visibleIdentity = currentStudentIdentity();
  const student = lastTeacherStudent.student;
  if (!visibleIdentity || String(student.className) !== String(visibleIdentity.className) || Number(student.seatNumber) !== Number(visibleIdentity.seatNumber)) return;

  const observations = Array.isArray(lastTeacherStudent.record.observations) ? lastTeacherStudent.record.observations : [];
  detailRoot.querySelectorAll('.detail-plant').forEach((card) => {
    const plantId = plantIdForName(card.querySelector('h2')?.textContent);
    const observation = observations.find((item) => item.plantId === plantId);
    if (!plantId || !observation?.hasPhoto) return;
    const img = card.querySelector('img');
    if (!img || img.getAttribute('src')) return;
    loadTeacherPhoto(img, student.id, plantId);
  });
}

function repairPhotoWall() {
  if (!photoWall || photosPanel?.hidden || !lastDashboard) return;
  photoWall.querySelectorAll('.wall-card').forEach((card) => {
    const img = card.querySelector('img');
    if (!img || img.getAttribute('src')) return;
    const identity = classSeatFromText(card.querySelector('strong')?.textContent);
    const student = studentForIdentity(lastDashboard, identity);
    const plantId = plantIdForName(card.querySelector('span')?.textContent);
    if (student && plantId) loadTeacherPhoto(img, student.id, plantId);
  });
}

function queuePhotoRepair() {
  if (photoRepairQueued) return;
  photoRepairQueued = true;
  requestAnimationFrame(() => {
    photoRepairQueued = false;
    ensureResetButton();
    repairStudentDetailPhotos();
    repairPhotoWall();
  });
}

if (detailRoot) {
  new MutationObserver(queuePhotoRepair).observe(detailRoot, { childList: true, subtree: true });
}
if (detailView) {
  new MutationObserver(queuePhotoRepair).observe(detailView, { attributes: true, attributeFilter: ['hidden'] });
}
if (photoWall) {
  new MutationObserver(queuePhotoRepair).observe(photoWall, { childList: true, subtree: true });
}
if (photosPanel) {
  new MutationObserver(queuePhotoRepair).observe(photosPanel, { attributes: true, attributeFilter: ['hidden'] });
}

window.addEventListener('pagehide', () => {
  repairedPhotoUrls.forEach((url) => URL.revokeObjectURL(url));
  repairedPhotoUrls.clear();
});

ensureResetButton();
queuePhotoRepair();
