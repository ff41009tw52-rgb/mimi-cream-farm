import { AQUATIC_CLASSES, AQUATIC_PLANTS, CATEGORY_OPTIONS, OBSERVATION_QUESTIONS, WATER_FLOW_OPTIONS, plantById } from './aquatic-data.js';
import { AquaticApi, clearStoredStudent, getStoredStudent, setStoredStudent } from './aquatic-api.js';
import { compressImage, getPhoto, photoKey, putPhoto } from './aquatic-storage.js';

const api = new AquaticApi();
const emptyRecord = () => ({ observations: [], classification: {}, environment: null, summary: null });
const state = { student: getStoredStudent(), record: emptyRecord(), currentPlant: null, photoUrls: new Map(), photoUploads: new Map(), cropObservers: new Map(), plantLoadId: 0 };
const $ = (selector, root = document) => root.querySelector(selector);
const views = ['profile', 'loading', 'field-guide', 'plant', 'classification', 'complete'];

function showView(name) {
  views.forEach((id) => { $(`#${id}-view`).hidden = id !== name; });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLoading(title, message) {
  $('#loading-title').textContent = title; $('#loading-message').textContent = message; showView('loading');
}

function toast(message) {
  const node = $('#toast'); node.textContent = message; node.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
}

function setConnection() {
  const node = $('#connection-status'); const online = navigator.onLine;
  node.textContent = online ? '● 已連線' : '● 離線模式'; node.classList.toggle('offline', !online);
}

function observationFor(plantId) { return state.record.observations.find((item) => item.plantId === plantId) || null; }
function recordKey(studentId) { return `aquatic.record.${studentId}`; }
function draftKey(plantId) { return `aquatic.draft.${state.student?.student?.id || 'new'}.${plantId}`; }
function saveDraft(plantId, value) { localStorage.setItem(draftKey(plantId), JSON.stringify({ ...value, updatedAt: Date.now() })); }
function readDraft(plantId) { try { return JSON.parse(localStorage.getItem(draftKey(plantId)) || 'null'); } catch { return null; } }
function readCachedRecord(studentId) { try { return JSON.parse(localStorage.getItem(recordKey(studentId)) || 'null'); } catch { return null; } }
function cacheRecord() { const id = state.student?.student?.id; if (id) localStorage.setItem(recordKey(id), JSON.stringify(state.record)); }

function stopCropObserver(node) {
  const observer = state.cropObservers.get(node); if (observer) observer.disconnect(); state.cropObservers.delete(node);
}

function stopCropObserversWithin(root) {
  state.cropObservers.forEach((observer, node) => {
    if (!node.isConnected || root.contains(node)) { observer.disconnect(); state.cropObservers.delete(node); }
  });
}

function applyCrop(node, plant) {
  stopCropObserver(node);
  const draw = () => {
    const width = node.clientWidth || plant.crop.viewWidth; const scale = width / plant.crop.viewWidth;
    node.style.backgroundImage = `url('${plant.referenceImage}')`;
    node.style.backgroundSize = `${plant.crop.width * scale}px ${plant.crop.height * scale}px`;
    node.style.backgroundPosition = `${-plant.crop.x * scale}px ${-plant.crop.y * scale}px`;
  };
  draw();
  if ('ResizeObserver' in window) { const observer = new ResizeObserver(draw); observer.observe(node); state.cropObservers.set(node, observer); }
}

function normalizeRecord(record) {
  return { ...emptyRecord(), ...(record || {}), observations: Array.isArray(record?.observations) ? record.observations : [], classification: record?.classification || {}, environment: record?.environment || record?.summary?.environment || null };
}

async function loadRecord({ rerender = false } = {}) {
  if (!state.student?.token) return;
  const result = await api.studentRecord(state.student.token);
  state.student.student = result.student; state.record = normalizeRecord(result.record); setStoredStudent(state.student); cacheRecord();
  if (rerender && !$('#field-guide-view').hidden) renderGuide();
}

function setObservation(plantId, changes) {
  const existing = observationFor(plantId);
  const next = { plantId, answers: {}, completed: false, hasPhoto: false, ...(existing || {}), ...changes };
  state.record.observations = [...state.record.observations.filter((item) => item.plantId !== plantId), next]; cacheRecord(); return next;
}

function renderGuide() {
  const student = state.student.student;
  $('#student-greeting').textContent = `${student.className}班 ${String(student.seatNumber).padStart(2, '0')}號｜我的水生植物觀察簿`;
  const completed = state.record.observations.filter((item) => item.completed).length;
  $('#progress-label').textContent = `${completed} / ${AQUATIC_PLANTS.length}`;
  $('#progress-bar').style.width = `${completed / AQUATIC_PLANTS.length * 100}%`;
  $('#open-classification').disabled = completed !== AQUATIC_PLANTS.length;
  $('#classification-help').textContent = completed === AQUATIC_PLANTS.length ? '七種植物都完成了，現在進行植物分類與環境調查。' : `還有 ${AQUATIC_PLANTS.length - completed} 種植物未完成，完成後就能進行分類。`;
  const grid = $('#plant-grid'); stopCropObserversWithin(grid); grid.replaceChildren();
  AQUATIC_PLANTS.forEach((plant) => {
    const observation = observationFor(plant.id); const draft = readDraft(plant.id);
    const card = document.createElement('article'); card.className = 'plant-card'; card.setAttribute('role', 'listitem');
    const thumb = document.createElement('div'); thumb.className = 'plant-thumb'; applyCrop(thumb, plant);
    const badge = document.createElement('span'); badge.className = `plant-state${observation?.completed ? ' done' : ''}`;
    badge.textContent = observation?.completed ? '✓ 已完成' : observation || draft ? '草稿' : '待觀察';
    const body = document.createElement('div'); body.className = 'plant-card-body';
    const title = document.createElement('h2'); title.textContent = plant.name;
    const description = document.createElement('p'); description.textContent = plant.clues.join('・');
    const button = document.createElement('button'); button.className = 'primary-button'; button.type = 'button'; button.textContent = '拍照做記錄';
    button.addEventListener('click', () => openPlant(plant.id)); body.append(title, description, button); card.append(thumb, badge, body); grid.append(card);
  });
  showView('field-guide');
}

function renderQuestions(answers = {}) {
  const list = $('#question-list'); list.replaceChildren();
  OBSERVATION_QUESTIONS.forEach((question, index) => {
    const wrapper = document.createElement('fieldset'); wrapper.className = 'question';
    const legend = document.createElement('legend'); legend.textContent = `${index + 1}. ${question.label}`; wrapper.append(legend);
    const choices = document.createElement('div'); choices.className = 'choice-list';
    question.options.forEach((option) => {
      const choice = document.createElement('label'); const input = document.createElement('input');
      input.type = 'radio'; input.name = question.id; input.value = option; input.checked = answers[question.id] === option;
      choice.append(input, document.createTextNode(option)); choices.append(choice);
    });
    wrapper.append(choices); list.append(wrapper);
  });
}

async function setPhotoPreview(blob, { pending = false } = {}) {
  if (!blob || !state.currentPlant) return;
  const plantId = state.currentPlant.id;
  if (state.photoUrls.has(plantId)) URL.revokeObjectURL(state.photoUrls.get(plantId));
  const url = URL.createObjectURL(blob); state.photoUrls.set(plantId, url);
  const img = new Image(); img.src = url; img.alt = `${state.currentPlant.name}的學生觀察照片`;
  $('#photo-preview').replaceChildren(img); $('#student-photo-compare').replaceChildren(img.cloneNode());
  $('#photo-message').textContent = pending ? '照片已保存在這台裝置，正在等待上傳。' : '照片已儲存到 Google 雲端。';
  $('#photo-message').classList.toggle('upload-state', pending); $('#retry-upload').hidden = !pending;
}

async function loadPlantPhoto(plantId, loadId) {
  const key = photoKey(state.student.student.id, plantId); const local = await getPhoto(key).catch(() => null);
  if (loadId !== state.plantLoadId || state.currentPlant?.id !== plantId) return;
  if (local?.blob) { await setPhotoPreview(local.blob, { pending: local.pending }); return; }
  if (!observationFor(plantId)?.hasPhoto) { $('#photo-preview').innerHTML = '<p>還沒有照片</p>'; $('#student-photo-compare').textContent = '我的照片'; return; }
  try {
    const blob = await api.studentPhoto(state.student.token, plantId);
    if (loadId !== state.plantLoadId || state.currentPlant?.id !== plantId) return;
    await putPhoto(key, { blob, pending: false, updatedAt: Date.now() }); await setPhotoPreview(blob);
  } catch { if (loadId === state.plantLoadId) $('#photo-message').textContent = '照片暫時無法讀取，其他內容仍可繼續填寫。'; }
}

function openPlant(plantId) {
  const plant = plantById(plantId); if (!plant) return;
  state.currentPlant = plant; state.plantLoadId += 1;
  const loadId = state.plantLoadId; const observation = observationFor(plantId); const draft = readDraft(plantId);
  $('#plant-title').textContent = plant.name;
  $('#plant-status').textContent = observation?.completed ? '✓ 已完成，可修改' : draft || observation ? '草稿' : '觀察中';
  $('#textbook-description').textContent = plant.textbook; $('#textbook-page').textContent = `教材基準：使用者提供的課本第 ${plant.page} 頁參考圖。`;
  applyCrop($('#reference-crop'), plant); $('#reference-crop').setAttribute('aria-label', `${plant.name}課本參考圖`);
  $('#photo-preview').innerHTML = observation?.hasPhoto ? '<p>照片載入中……</p>' : '<p>還沒有照片</p>';
  $('#student-photo-compare').textContent = observation?.hasPhoto ? '照片載入中……' : '我的照片';
  $('#photo-message').textContent = observation?.hasPhoto ? '正在背景載入照片，題目可以先作答。' : '照片只會用在你的圖鑑與教師課堂檢視。';
  $('#retry-upload').hidden = true; $('#observation-error').textContent = ''; $('#save-status').textContent = '';
  renderQuestions(draft?.answers || observation?.answers || {}); showView('plant'); loadPlantPhoto(plantId, loadId);
}

function collectObservation() {
  const data = new FormData($('#observation-form')); const answers = {};
  OBSERVATION_QUESTIONS.forEach((question) => { answers[question.id] = String(data.get(question.id) || '').trim(); }); return { answers };
}

async function uploadPlantPhoto(plantId) {
  if (state.photoUploads.has(plantId)) return state.photoUploads.get(plantId);
  const task = (async () => {
    const key = photoKey(state.student.student.id, plantId); const local = await getPhoto(key);
    if (!local?.blob) throw new Error('請先拍攝或選擇照片。');
    await api.uploadPhoto(state.student.token, plantId, local.blob); await putPhoto(key, { ...local, pending: false });
    setObservation(plantId, { hasPhoto: true });
    if (state.currentPlant?.id === plantId && !$('#plant-view').hidden) await setPhotoPreview(local.blob);
  })().finally(() => state.photoUploads.delete(plantId));
  state.photoUploads.set(plantId, task); return task;
}

const uploadCurrentPhoto = () => uploadPlantPhoto(state.currentPlant.id);

async function handlePhoto(file) {
  if (!file) return;
  $('#photo-message').textContent = '正在壓縮照片……';
  try {
    const plantId = state.currentPlant.id; const blob = await compressImage(file); const key = photoKey(state.student.student.id, plantId);
    await putPhoto(key, { blob, pending: true, updatedAt: Date.now() }); await setPhotoPreview(blob, { pending: true }); saveDraft(plantId, collectObservation());
    if (!navigator.onLine) { toast('網路較慢，照片已先保存在這台裝置'); return; }
    uploadPlantPhoto(plantId).then(() => toast('照片上傳完成')).catch(() => toast('照片已先保存在這台裝置'));
  } catch (error) { $('#photo-message').textContent = error.message; $('#photo-message').classList.add('upload-state'); }
}

function renderClassification() {
  const saved = state.record.classification || {}; const list = $('#classification-list'); stopCropObserversWithin(list); list.replaceChildren();
  AQUATIC_PLANTS.forEach((plant) => {
    const row = document.createElement('div'); row.className = 'classify-row';
    const info = document.createElement('div'); info.className = 'classify-plant';
    const crop = document.createElement('div'); crop.className = 'mini-crop'; applyCrop(crop, plant);
    const copy = document.createElement('div'); copy.innerHTML = `<strong>${plant.name}</strong><small>${plant.textbook}</small>`; info.append(crop, copy);
    const select = document.createElement('select'); select.name = plant.id; select.required = true; select.setAttribute('aria-label', `${plant.name}的分類`); select.append(new Option('請選擇類別', ''));
    CATEGORY_OPTIONS.forEach((item) => select.append(new Option(`${item.id}｜${item.hint}`, item.id, false, saved[plant.id] === item.id))); row.append(info, select); list.append(row);
  });
  const environment = state.record.environment || {};
  WATER_FLOW_OPTIONS.forEach(({ value }) => { $(`#classification-form input[name="waterFlow"][value="${value}"]`).checked = environment.waterFlow === value; });
  $('#classification-form').elements.aquaticPlant.checked = Boolean(environment.aquaticLife?.plant);
  $('#classification-form').elements.aquaticAnimal.checked = Boolean(environment.aquaticLife?.animal);
  $('#classification-form').elements.otherFindings.value = environment.otherFindings || ''; $('#classification-error').textContent = ''; showView('classification');
}

async function retryPendingUploads() {
  if (!navigator.onLine || !state.student?.token) return;
  for (const plant of AQUATIC_PLANTS) {
    const key = photoKey(state.student.student.id, plant.id); const local = await getPhoto(key).catch(() => null); if (!local?.pending) continue;
    try { await uploadPlantPhoto(plant.id); } catch { /* 下次恢復連線時重試 */ }
  }
}

async function saveDraftAndReturn() {
  if (!state.currentPlant) { renderGuide(); return; }
  const plantId = state.currentPlant.id; const data = collectObservation(); saveDraft(plantId, data); setObservation(plantId, { answers: data.answers, completed: false });
  renderGuide(); toast('紀錄已先保存在這台裝置');
  if (!state.student?.token || !navigator.onLine) return;
  api.saveObservation(state.student.token, plantId, { ...data, completed: false }).then(() => toast('草稿已同步到 Google 雲端')).catch(() => toast('網路較慢，草稿保留在這台裝置'));
  retryPendingUploads();
}

$('#profile-form').addEventListener('submit', async (event) => {
  event.preventDefault(); $('#profile-error').textContent = ''; const form = new FormData(event.currentTarget); const seatNumber = Number(form.get('seatNumber'));
  if (!Number.isInteger(seatNumber) || seatNumber < 1 || seatNumber > 25) { $('#profile-error').textContent = '座號請輸入 1～25。'; return; }
  const profile = { className: String(form.get('className')), seatNumber };
  showLoading('正在開啟觀察簿……', `${profile.className}班 ${String(seatNumber).padStart(2, '0')}號，正在載入雲端紀錄。`);
  try {
    const result = await api.createProfile(profile); state.student = { token: result.token, student: result.student }; setStoredStudent(state.student);
    state.record = normalizeRecord(result.record || readCachedRecord(result.student.id)); cacheRecord(); renderGuide();
    if (!result.record) loadRecord({ rerender: true }).catch(() => {}); retryPendingUploads();
  } catch (error) { showView('profile'); $('#profile-error').textContent = error.message; }
});

$('#photo-input').addEventListener('change', (event) => handlePhoto(event.target.files?.[0]));
$('#retry-upload').addEventListener('click', async () => { $('#photo-message').textContent = '正在重新上傳……'; try { await uploadCurrentPhoto(); toast('重新上傳完成'); } catch (error) { toast(error.message); } });
$('#observation-form').addEventListener('input', () => state.currentPlant && saveDraft(state.currentPlant.id, collectObservation()));
$('#observation-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const data = collectObservation(); const plantId = state.currentPlant.id; const local = await getPhoto(photoKey(state.student.student.id, plantId)).catch(() => null);
  if (!local?.blob && !observationFor(plantId)?.hasPhoto) { $('#observation-error').textContent = '請先拍下這種植物。'; return; }
  if (Object.values(data.answers).some((value) => !value)) { $('#observation-error').textContent = '請完成三個觀察選擇題。'; return; }
  $('#observation-error').textContent = ''; $('#save-status').textContent = '正在儲存……'; const button = $('#complete-observation'); button.disabled = true;
  try {
    if (local?.pending) { if (!navigator.onLine) throw new Error('目前沒有網路，紀錄已先保存在這台裝置。'); await uploadCurrentPhoto(); }
    await api.saveObservation(state.student.token, plantId, { ...data, completed: true });
    setObservation(plantId, { answers: data.answers, completed: true, hasPhoto: true, updatedAt: new Date().toISOString() }); localStorage.removeItem(draftKey(plantId));
    $('#save-status').textContent = '觀察紀錄已儲存'; renderGuide(); toast('觀察紀錄已儲存');
  } catch (error) { saveDraft(plantId, data); $('#save-status').textContent = '網路較慢，紀錄已先保存在這台裝置'; $('#observation-error').textContent = error.message; }
  finally { button.disabled = false; }
});

$('#plant-view [data-back]').addEventListener('click', saveDraftAndReturn);
$('#classification-view [data-back]').addEventListener('click', renderGuide);
$('#open-classification').addEventListener('click', () => {
  if (state.record.observations.filter((item) => item.completed).length !== AQUATIC_PLANTS.length) { toast('請先完成七種植物觀察'); return; }
  renderClassification();
});
$('#classification-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = new FormData(event.currentTarget); const classification = {};
  AQUATIC_PLANTS.forEach((plant) => { classification[plant.id] = String(form.get(plant.id) || ''); });
  const environment = { waterFlow: String(form.get('waterFlow') || ''), aquaticLife: { plant: form.has('aquaticPlant'), animal: form.has('aquaticAnimal') }, otherFindings: String(form.get('otherFindings') || '').trim() };
  const submit = $('#classification-form button[type="submit"]'); submit.disabled = true; submit.textContent = '正在儲存……';
  try {
    await api.saveSummary(state.student.token, { classification, environment }); state.record.classification = classification; state.record.environment = environment;
    state.record.summary = { ...(state.record.summary || {}), environment, completedAt: new Date().toISOString() }; cacheRecord();
    $('#completion-summary').textContent = `你記錄了 ${state.record.observations.filter((item) => item.completed).length} 種植物，並完成植物分類與環境調查。`; showView('complete'); toast('整份觀察紀錄已儲存');
  } catch (error) { $('#classification-error').textContent = error.message; }
  finally { submit.disabled = false; submit.textContent = '完成整份觀察紀錄'; }
});

$('#switch-student').addEventListener('click', () => {
  clearStoredStudent(); state.photoUrls.forEach(URL.revokeObjectURL); state.photoUrls.clear(); state.student = null; state.record = emptyRecord(); showView('profile');
});
$('#review-record').addEventListener('click', renderGuide);
window.addEventListener('online', () => { setConnection(); retryPendingUploads(); }); window.addEventListener('offline', setConnection); setConnection();
window.addEventListener('beforeunload', () => state.cropObservers.forEach((observer) => observer.disconnect()));

AQUATIC_CLASSES.forEach((className) => $('#student-class').append(new Option(`${className}班`, className)));

(async function boot() {
  if (!state.student?.token) { showView('profile'); return; }
  const cached = readCachedRecord(state.student.student?.id);
  if (cached) { state.record = normalizeRecord(cached); renderGuide(); } else showLoading('正在開啟觀察簿……', '正在載入上次的雲端紀錄。');
  try { await loadRecord({ rerender: Boolean(cached) }); if (!cached) renderGuide(); retryPendingUploads(); }
  catch (error) {
    if (error.status === 401) clearStoredStudent();
    if (!cached) { showView('profile'); $('#profile-error').textContent = '請重新輸入資料開啟觀察紀錄。'; } else toast('目前顯示這台裝置上次保存的資料');
  }
})();
