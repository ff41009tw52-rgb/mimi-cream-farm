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
    const badge = card.querySelector('.plant-state');
    if (!plant || !thumb) return;

    const observation = observationFor(record, plant.id);
    const complete = isStrictlyComplete(observation);

    if (badge) {
      badge.className = `plant-state${complete ? ' done' : ''}`;
      badge.textContent = complete ? '✓ 已完成' : '未完成';
    }

    setPlaceholder(thumb);
    if (!complete) return;

    resolvePhoto(studentSession, plant, observation)
      .then((blob) => {
        if (currentRefresh !== refreshId || !thumb.isConnected) return;
        if (blob) setPhoto(thumb, blob, plant.name);
      })
      .catch((error) => {
        console.error(`[aquatic] ${plant.name} photo load failed`, error);
        if (currentRefresh === refreshId && thumb.isConnected) {
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

function currentStudentId() {
  return getStoredStudent()?.student?.id || '';
}

function environmentKey() {
  const id = currentStudentId();
  return id ? `aquatic.environmentDraft.${id}` : '';
}

function normalizeEnvironment(value) {
  return {
    waterFlow: ['fast', 'slow', 'still'].includes(value?.waterFlow) ? value.waterFlow : '',
    aquaticLife: {
      plant: Boolean(value?.aquaticLife?.plant),
      animal: Boolean(value?.aquaticLife?.animal)
    },
    otherFindings: String(value?.otherFindings || '')
  };
}

function readEnvironmentDraft() {
  const key = environmentKey();
  if (key) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved) return normalizeEnvironment(saved);
    } catch { /* ignore broken local draft */ }
  }
  const id = currentStudentId();
  const record = id ? cachedRecord(id) : null;
  return normalizeEnvironment(record?.environment || record?.summary?.environment || null);
}

function writeEnvironmentDraft(value) {
  const key = environmentKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(normalizeEnvironment(value)));
}

function collectInlineEnvironment() {
  const root = document.querySelector('#inline-environment');
  if (!root) return normalizeEnvironment(null);
  const checkedFlow = root.querySelector('input[name="envWaterFlowInline"]:checked');
  return normalizeEnvironment({
    waterFlow: checkedFlow?.value || '',
    aquaticLife: {
      plant: Boolean(root.querySelector('input[name="envAquaticPlantInline"]')?.checked),
      animal: Boolean(root.querySelector('input[name="envAquaticAnimalInline"]')?.checked)
    },
    otherFindings: root.querySelector('textarea[name="envOtherFindingsInline"]')?.value || ''
  });
}

function fillInlineEnvironment(value = readEnvironmentDraft()) {
  const root = document.querySelector('#inline-environment');
  if (!root) return;
  const environment = normalizeEnvironment(value);
  root.querySelectorAll('input[name="envWaterFlowInline"]').forEach((input) => {
    input.checked = input.value === environment.waterFlow;
  });
  const plant = root.querySelector('input[name="envAquaticPlantInline"]');
  const animal = root.querySelector('input[name="envAquaticAnimalInline"]');
  const findings = root.querySelector('textarea[name="envOtherFindingsInline"]');
  if (plant) plant.checked = environment.aquaticLife.plant;
  if (animal) animal.checked = environment.aquaticLife.animal;
  if (findings) findings.value = environment.otherFindings;
}

function fillClassificationEnvironment(value = readEnvironmentDraft()) {
  const form = document.querySelector('#classification-form');
  if (!form) return;
  const environment = normalizeEnvironment(value);
  form.querySelectorAll('input[name="waterFlow"]').forEach((input) => {
    input.checked = input.value === environment.waterFlow;
  });
  const plant = form.querySelector('input[name="aquaticPlant"]');
  const animal = form.querySelector('input[name="aquaticAnimal"]');
  const findings = form.querySelector('textarea[name="otherFindings"]');
  if (plant) plant.checked = environment.aquaticLife.plant;
  if (animal) animal.checked = environment.aquaticLife.animal;
  if (findings) findings.value = environment.otherFindings;
}

function collectClassificationEnvironment() {
  const form = document.querySelector('#classification-form');
  if (!form) return normalizeEnvironment(null);
  const checkedFlow = form.querySelector('input[name="waterFlow"]:checked');
  return normalizeEnvironment({
    waterFlow: checkedFlow?.value || '',
    aquaticLife: {
      plant: Boolean(form.querySelector('input[name="aquaticPlant"]')?.checked),
      animal: Boolean(form.querySelector('input[name="aquaticAnimal"]')?.checked)
    },
    otherFindings: form.querySelector('textarea[name="otherFindings"]')?.value || ''
  });
}

const inlineEnvironment = document.querySelector('#inline-environment');
if (inlineEnvironment) {
  const saveInline = () => {
    const value = collectInlineEnvironment();
    writeEnvironmentDraft(value);
    fillClassificationEnvironment(value);
    const status = document.querySelector('#inline-environment-status');
    if (status) status.textContent = '環境調查已自動保存在這台裝置。';
  };
  inlineEnvironment.addEventListener('change', saveInline);
  inlineEnvironment.addEventListener('input', saveInline);
  fillInlineEnvironment();
}

const classificationForm = document.querySelector('#classification-form');
if (classificationForm) {
  const mirrorClassification = () => {
    const value = collectClassificationEnvironment();
    writeEnvironmentDraft(value);
    fillInlineEnvironment(value);
  };
  classificationForm.addEventListener('change', mirrorClassification);
  classificationForm.addEventListener('input', mirrorClassification);
}

const plantView = document.querySelector('#plant-view');
if (plantView) {
  new MutationObserver(() => {
    if (!plantView.hidden) fillInlineEnvironment();
  }).observe(plantView, { attributes: true, attributeFilter: ['hidden'] });
}

const classificationView = document.querySelector('#classification-view');
if (classificationView) {
  new MutationObserver(() => {
    if (!classificationView.hidden) fillClassificationEnvironment();
  }).observe(classificationView, { attributes: true, attributeFilter: ['hidden'] });
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
