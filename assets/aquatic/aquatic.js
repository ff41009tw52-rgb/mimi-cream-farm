import { AQUATIC_PLANTS, CATEGORY_OPTIONS, OBSERVATION_QUESTIONS, plantById } from './aquatic-data.js';
import { AquaticApi, clearStoredStudent, getStoredStudent, setStoredStudent } from './aquatic-api.js';
import { compressImage, getPhoto, photoKey, putPhoto } from './aquatic-storage.js';

const api = new AquaticApi();
const state = { student: getStoredStudent(), record: { observations: [], classification: {}, summary: null }, currentPlant: null, photoUrls: new Map() };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const views = ['profile', 'field-guide', 'plant', 'classification', 'complete'];

function showView(name) {
  views.forEach((id) => { $(`#${id}-view`).hidden = id !== name; });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toast(message) {
  const node = $('#toast'); node.textContent = message; node.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
}

function setConnection() {
  const node = $('#connection-status');
  const online = navigator.onLine;
  node.textContent = online ? '● 已連線' : '● 離線模式';
  node.classList.toggle('offline', !online);
}

function observationFor(plantId) {
  return state.record.observations.find((item) => item.plantId === plantId) || null;
}

function draftKey(plantId) { return `aquatic.draft.${state.student?.student?.id || 'new'}.${plantId}`; }
function saveDraft(plantId, value) { localStorage.setItem(draftKey(plantId), JSON.stringify(value)); }
function readDraft(plantId) { try { return JSON.parse(localStorage.getItem(draftKey(plantId)) || 'null'); } catch { return null; } }

function applyCrop(node, plant) {
  const draw = () => {
    const width = node.clientWidth || plant.crop.viewWidth;
    const scale = width / plant.crop.viewWidth;
    node.style.backgroundImage = `url('${plant.referenceImage}')`;
    node.style.backgroundSize = `${plant.crop.width * scale}px ${plant.crop.height * scale}px`;
    node.style.backgroundPosition = `${-plant.crop.x * scale}px ${-plant.crop.y * scale}px`;
  };
  draw(); new ResizeObserver(draw).observe(node);
}

async function loadRecord() {
  if (!state.student?.token) return;
  const result = await api.studentRecord(state.student.token);
  state.student.student = result.student;
  state.record = result.record;
  setStoredStudent(state.student);
}

function renderGuide() {
  const student = state.student.student;
  $('#student-greeting').textContent = `${student.className} ${student.seatNumber}號 ${student.studentName} 的圖鑑`;
  const completed = state.record.observations.filter((item) => item.completed).length;
  $('#progress-label').textContent = `${completed} / ${AQUATIC_PLANTS.length}`;
  $('#progress-bar').style.width = `${completed / AQUATIC_PLANTS.length * 100}%`;
  const grid = $('#plant-grid'); grid.replaceChildren();
  AQUATIC_PLANTS.forEach((plant) => {
    const observation = observationFor(plant.id);
    const card = document.createElement('article'); card.className = 'plant-card'; card.setAttribute('role', 'listitem');
    const thumb = document.createElement('div'); thumb.className = 'plant-thumb'; applyCrop(thumb, plant);
    const stateNode = document.createElement('span'); stateNode.className = `plant-state${observation?.completed ? ' done' : ''}`;
    stateNode.textContent = observation?.completed ? '✓ 已完成' : observation ? '已存草稿' : '待觀察';
    const body = document.createElement('div'); body.className = 'plant-card-body';
    const title = document.createElement('h2'); title.textContent = plant.name;
    const description = document.createElement('p'); description.textContent = observation?.notFound ? '今天沒有找到，已留下紀錄。' : plant.clues.join('・');
    const button = document.createElement('button'); button.className = 'primary-button'; button.type = 'button';
    button.textContent = observation ? '查看或修改' : '開始觀察'; button.addEventListener('click', () => openPlant(plant.id));
    body.append(title, description, button); card.append(thumb, stateNode, body); grid.append(card);
  });
  showView('field-guide');
}

function renderQuestions(answers = {}) {
  const list = $('#question-list'); list.replaceChildren();
  OBSERVATION_QUESTIONS.forEach((question, index) => {
    const wrapper = document.createElement(question.type === 'choice' ? 'fieldset' : 'div'); wrapper.className = 'question';
    const label = document.createElement(question.type === 'choice' ? 'legend' : 'label');
    label.textContent = `${index + 1}. ${question.label}`; wrapper.append(label);
    if (question.type === 'choice') {
      const choices = document.createElement('div'); choices.className = 'choice-list';
      question.options.forEach((option) => {
        const choice = document.createElement('label'); const input = document.createElement('input');
        input.type = 'radio'; input.name = question.id; input.value = option; input.checked = answers[question.id] === option;
        choice.append(input, document.createTextNode(option)); choices.append(choice);
      }); wrapper.append(choices);
    } else {
      const textarea = document.createElement('textarea'); textarea.name = question.id; textarea.maxLength = question.maxLength;
      textarea.placeholder = question.placeholder; textarea.value = answers[question.id] || ''; wrapper.append(textarea);
    }
    list.append(wrapper);
  });
}

async function setPhotoPreview(blob, { pending = false } = {}) {
  if (!blob) return;
  const plantId = state.currentPlant.id;
  if (state.photoUrls.has(plantId)) URL.revokeObjectURL(state.photoUrls.get(plantId));
  const url = URL.createObjectURL(blob); state.photoUrls.set(plantId, url);
  const img = new Image(); img.src = url; img.alt = `${state.currentPlant.name}的學生觀察照片`;
  $('#photo-preview').replaceChildren(img);
  const compareImg = img.cloneNode(); $('#student-photo-compare').replaceChildren(compareImg);
  $('#photo-message').textContent = pending ? '照片已保存在這台裝置，恢復連線後可重新上傳。' : '照片已壓縮並上傳。';
  $('#photo-message').classList.toggle('upload-state', pending);
  $('#retry-upload').hidden = !pending;
}

async function openPlant(plantId) {
  const plant = plantById(plantId); if (!plant) return;
  state.currentPlant = plant; const observation = observationFor(plantId); const draft = readDraft(plantId);
  $('#plant-title').textContent = plant.name;
  $('#plant-status').textContent = observation?.completed ? '已完成，可修改' : '觀察中';
  $('#textbook-description').textContent = plant.textbook;
  $('#textbook-page').textContent = `教材基準：使用者提供的課本第 ${plant.page} 頁參考圖。`;
  $('#reference-crop').replaceChildren(); applyCrop($('#reference-crop'), plant);
  $('#reference-crop').setAttribute('aria-label', `${plant.name}課本參考圖`);
  $('#photo-preview').innerHTML = '<p>還沒有照片</p>'; $('#student-photo-compare').textContent = '我的照片';
  $('#photo-message').textContent = '照片只會用在你的圖鑑與教師課堂檢視。'; $('#retry-upload').hidden = true;
  $('#not-found').checked = Boolean(draft?.notFound ?? observation?.notFound);
  renderQuestions(draft?.answers || observation?.answers || {});
  const localPhoto = await getPhoto(photoKey(state.student.student.id, plantId)).catch(() => null);
  if (localPhoto?.blob) await setPhotoPreview(localPhoto.blob, { pending: localPhoto.pending });
  else if (observation?.hasPhoto) {
    try { await setPhotoPreview(await api.studentPhoto(state.student.token, plantId)); } catch { $('#photo-message').textContent = '照片暫時無法讀取，請稍後再試。'; }
  }
  showView('plant');
}

function collectObservation() {
  const form = $('#observation-form'); const data = new FormData(form); const answers = {};
  OBSERVATION_QUESTIONS.forEach((question) => { answers[question.id] = String(data.get(question.id) || '').trim(); });
  return { answers, notFound: $('#not-found').checked };
}

async function uploadCurrentPhoto() {
  const key = photoKey(state.student.student.id, state.currentPlant.id); const local = await getPhoto(key);
  if (!local?.blob) throw new Error('請先拍攝或選擇照片。');
  await api.uploadPhoto(state.student.token, state.currentPlant.id, local.blob);
  await putPhoto(key, { ...local, pending: false }); await setPhotoPreview(local.blob);
}

async function handlePhoto(file) {
  if (!file) return;
  $('#photo-message').textContent = '正在壓縮照片…';
  try {
    const blob = await compressImage(file); const key = photoKey(state.student.student.id, state.currentPlant.id);
    await putPhoto(key, { blob, pending: true, updatedAt: Date.now() }); await setPhotoPreview(blob, { pending: true });
    try { await uploadCurrentPhoto(); toast('照片上傳完成'); } catch { toast('照片已先保存在這台裝置'); }
  } catch (error) { $('#photo-message').textContent = error.message; $('#photo-message').classList.add('upload-state'); }
}

function renderClassification() {
  const saved = state.record.classification || {}; const list = $('#classification-list'); list.replaceChildren();
  AQUATIC_PLANTS.forEach((plant) => {
    const row = document.createElement('div'); row.className = 'classify-row';
    const plantInfo = document.createElement('div'); plantInfo.className = 'classify-plant';
    const crop = document.createElement('div'); crop.className = 'mini-crop'; applyCrop(crop, plant);
    const copy = document.createElement('div'); copy.innerHTML = `<strong>${plant.name}</strong><small>${plant.textbook}</small>`; plantInfo.append(crop, copy);
    const select = document.createElement('select'); select.name = plant.id; select.required = true; select.setAttribute('aria-label', `${plant.name}的分類`);
    select.append(new Option('請選擇類別', ''));
    CATEGORY_OPTIONS.forEach((item) => select.append(new Option(`${item.id}｜${item.hint}`, item.id, false, saved[plant.id] === item.id)));
    row.append(plantInfo, select); list.append(row);
  });
  const summary = state.record.summary || {};
  $('#classification-form').elements.classificationReason.value = summary.classificationReason || '';
  $('#classification-form').elements.reflection.value = summary.reflection || '';
  showView('classification');
}

async function retryPendingUploads() {
  if (!navigator.onLine || !state.student?.token) return;
  for (const plant of AQUATIC_PLANTS) {
    const key = photoKey(state.student.student.id, plant.id); const local = await getPhoto(key).catch(() => null);
    if (!local?.pending) continue;
    try { await api.uploadPhoto(state.student.token, plant.id, local.blob); await putPhoto(key, { ...local, pending: false }); } catch { /* next online event retries */ }
  }
}

$('#profile-form').addEventListener('submit', async (event) => {
  event.preventDefault(); $('#profile-error').textContent = ''; const form = new FormData(event.currentTarget);
  const profile = { className: form.get('className'), seatNumber: form.get('seatNumber'), studentName: form.get('studentName') };
  try { state.student = await api.createProfile(profile); setStoredStudent(state.student); await loadRecord(); renderGuide(); }
  catch (error) { $('#profile-error').textContent = error.message; }
});

$('#photo-input').addEventListener('change', (event) => handlePhoto(event.target.files?.[0]));
$('#retry-upload').addEventListener('click', async () => { try { await uploadCurrentPhoto(); toast('重新上傳完成'); } catch (error) { toast(error.message); } });
$('#not-found').addEventListener('change', (event) => { $('#photo-input').disabled = event.target.checked; });
$('#observation-form').addEventListener('input', () => state.currentPlant && saveDraft(state.currentPlant.id, collectObservation()));
$('#observation-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const data = collectObservation(); const local = await getPhoto(photoKey(state.student.student.id, state.currentPlant.id)).catch(() => null);
  if (!data.notFound && !local?.blob && !observationFor(state.currentPlant.id)?.hasPhoto) { $('#observation-error').textContent = '請先拍下植物；如果今天沒有找到，請勾選「今天沒有找到」。'; return; }
  if (!data.notFound && Object.values(data.answers).some((value) => !value)) { $('#observation-error').textContent = '請完成每一題觀察紀錄。'; return; }
  $('#observation-error').textContent = '';
  try {
    if (local?.pending && navigator.onLine) await uploadCurrentPhoto().catch(() => {});
    await api.saveObservation(state.student.token, state.currentPlant.id, { ...data, completed: true });
    localStorage.removeItem(draftKey(state.currentPlant.id)); await loadRecord(); renderGuide(); toast('觀察紀錄已保存');
  } catch (error) { $('#observation-error').textContent = `${error.message} 草稿仍保存在這台裝置。`; saveDraft(state.currentPlant.id, data); }
});

$$('[data-back]').forEach((button) => button.addEventListener('click', () => { if (state.currentPlant) saveDraft(state.currentPlant.id, collectObservation()); renderGuide(); }));
$('#open-classification').addEventListener('click', renderClassification);
$('#classification-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = new FormData(event.currentTarget); const classification = {};
  AQUATIC_PLANTS.forEach((plant) => { classification[plant.id] = form.get(plant.id); });
  const body = { classification, classificationReason: String(form.get('classificationReason')).trim(), reflection: String(form.get('reflection')).trim() };
  try { await api.saveSummary(state.student.token, body); await loadRecord(); $('#completion-summary').textContent = `你記錄了 ${state.record.observations.filter((item) => item.completed).length} 種植物。老師現在可以在教師端看到你的照片、觀察答案、分類和心得。`; showView('complete'); }
  catch (error) { $('#classification-error').textContent = error.message; }
});

$('#switch-student').addEventListener('click', () => { clearStoredStudent(); state.student = null; showView('profile'); });
$('#review-record').addEventListener('click', renderGuide);
window.addEventListener('online', () => { setConnection(); retryPendingUploads(); }); window.addEventListener('offline', setConnection); setConnection();

(async function boot() {
  if (!state.student?.token) { showView('profile'); return; }
  try { await loadRecord(); renderGuide(); retryPendingUploads(); }
  catch (error) { if (error.status === 401) clearStoredStudent(); showView('profile'); $('#profile-error').textContent = '請重新輸入資料開啟觀察紀錄。'; }
})();
