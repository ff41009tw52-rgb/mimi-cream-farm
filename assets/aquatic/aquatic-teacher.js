import { AQUATIC_CLASSES, AQUATIC_PLANTS, CATEGORY_OPTIONS, OBSERVATION_QUESTIONS, WATER_FLOW_OPTIONS } from './aquatic-data.js';
import { AquaticApi } from './aquatic-api.js?v=20260924-8';

const api = new AquaticApi();
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = {
  token: sessionStorage.getItem('aquatic.teacherToken'),
  dashboard: null,
  photoUrls: [],
  selectedPlantId: AQUATIC_PLANTS[0].id
};

let authSerial = 0;
const photoQueue = [];
let activePhotoLoads = 0;
const MAX_PHOTO_CONCURRENCY = 4;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
const seatLabel = (seat) => String(seat).padStart(2, '0');
const currentClass = () => $('#class-filter').value || AQUATIC_CLASSES[0];
const cloudDate = (value) => value ? new Date(String(value)) : null;
const sameTaipeiDay = (value) => {
  const date = cloudDate(value); if (!date || Number.isNaN(date.getTime())) return false;
  const options = { timeZone:'Asia/Taipei', year:'numeric', month:'2-digit', day:'2-digit' };
  return new Intl.DateTimeFormat('zh-TW', options).format(date) === new Intl.DateTimeFormat('zh-TW', options).format(new Date());
};
const formatTime = (value) => {
  const date = cloudDate(value); if (!date || Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-TW', { timeZone:'Asia/Taipei', dateStyle:'short', timeStyle:'short' }).format(date);
};

function toast(message) {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
}

function showDashboard() {
  $('#teacher-login-view').hidden = true;
  $('#teacher-dashboard-view').hidden = false;
  $('#student-detail-view').hidden = true;
  $('#teacher-logout').hidden = false;
}

function showLogin(message = '') {
  $('#teacher-login-view').hidden = false;
  $('#teacher-dashboard-view').hidden = true;
  $('#student-detail-view').hidden = true;
  $('#teacher-logout').hidden = true;
  $('#login-error').textContent = message;
  const password = $('#teacher-login-form input[name="password"]');
  password.required = !state.token;
  password.disabled = Boolean(state.token);
  password.closest('label').hidden = Boolean(state.token);
  $('#teacher-login-form button[type="submit"]').textContent = state.token ? '重試載入' : '確定';
}

function loginStatus(message = '') {
  const status = $('#login-status');
  status.textContent = message;
  status.hidden = !message;
}

function normalizeDashboard(data) {
  if (!data || !Array.isArray(data.students) || !Array.isArray(data.photos) || !data.plantCounts || typeof data.plantCounts !== 'object') {
    throw new Error('教師資料格式不完整，請重新整理後再試。');
  }
  return data;
}

function clearPhotoUrls() {
  state.photoUrls.forEach(URL.revokeObjectURL);
  state.photoUrls = [];
}

function pumpPhotoQueue() {
  while (activePhotoLoads < MAX_PHOTO_CONCURRENCY && photoQueue.length) {
    const job = photoQueue.shift();
    if (!job.img?.isConnected) { job.resolve(); continue; }
    activePhotoLoads += 1;
    (async () => {
      try {
        const blob = await job.urlFactory();
        if (!job.img.isConnected) return;
        const url = URL.createObjectURL(blob);
        state.photoUrls.push(url);
        job.img.src = url;
      } catch {
        if (job.img?.isConnected) job.img.alt = '照片暫時無法讀取';
      } finally {
        activePhotoLoads -= 1;
        job.resolve();
        pumpPhotoQueue();
      }
    })();
  }
}

function authPhoto(urlFactory, img) {
  return new Promise((resolve) => {
    photoQueue.push({ urlFactory, img, resolve });
    pumpPhotoQueue();
  });
}

function studentsInClass() {
  const students = Array.isArray(state.dashboard?.students) ? state.dashboard.students : [];
  return students.filter((student) => student.className === currentClass());
}

function matchingSeats() {
  const query = $('#student-search').value.trim();
  const students = new Map(studentsInClass().map((student) => [Number(student.seatNumber), student]));
  return Array.from({ length:30 }, (_, index) => {
    const seatNumber = index + 1;
    return { seatNumber, student:students.get(seatNumber) || null };
  }).filter((item) => !query || String(item.seatNumber).includes(query.replace(/^0+/, '')) || seatLabel(item.seatNumber).includes(query));
}

function studentComplete(student) {
  return Boolean(student && student.completedPlants === AQUATIC_PLANTS.length && student.classificationComplete && (student.environmentComplete || student.hasLegacyReflection));
}

function renderSummary() {
  const students = studentsInClass();
  const completed = students.filter(studentComplete).length;
  const startedToday = students.filter((student) => sameTaipeiDay(student.createdAt)).length;
  const average = students.reduce((sum, student) => sum + Number(student.completedPlants || 0), 0) / 30;
  const items = [
    ['今天已開始', `${startedToday} 人`],
    ['完成', `${completed} / 30`],
    ['未完成', `${30 - completed} 人`],
    ['平均完成植物', `${average.toFixed(1)} / 7`]
  ];
  $('#summary-cards').replaceChildren(...items.map(([label, value]) => {
    const node = document.createElement('div'); node.className = 'summary-card';
    const strong = document.createElement('strong'); strong.textContent = value;
    const span = document.createElement('span'); span.textContent = label;
    node.append(strong, span); return node;
  }));
  const counts = state.dashboard?.plantCounts?.[currentClass()] || {};
  $('#plant-progress-summary').replaceChildren(...AQUATIC_PLANTS.map((plant) => {
    const item = document.createElement('div');
    const name = document.createElement('span'); name.textContent = plant.name;
    const count = document.createElement('strong'); count.textContent = `${counts[plant.id] || 0} / 30`;
    item.append(name, count); return item;
  }));
  $('#dashboard-class-title').textContent = `${currentClass()}班`;
}

function renderFilters() {
  const select = $('#class-filter'); const selected = select.value || AQUATIC_CLASSES[0];
  select.replaceChildren(...AQUATIC_CLASSES.map((className) => new Option(`${className}班`, className)));
  select.value = AQUATIC_CLASSES.includes(selected) ? selected : AQUATIC_CLASSES[0];
}

function renderStudents() {
  const rows = matchingSeats(); const tbody = $('#student-rows'); tbody.replaceChildren();
  rows.forEach(({ seatNumber, student }) => {
    const tr = document.createElement('tr');
    const status = studentComplete(student) ? '已完成' : student ? '進行中' : '尚未開始';
    const environmentState = student?.environmentComplete ? '✓' : student?.hasLegacyReflection ? '舊版' : '—';
    [seatLabel(seatNumber), student ? `${student.completedPlants} / 7` : '0 / 7', student?.classificationComplete ? '✓' : '—', environmentState, status].forEach((value) => {
      const td = document.createElement('td'); td.textContent = value; tr.append(td);
    });
    tr.classList.toggle('not-started', !student);
    const action = document.createElement('td'); const button = document.createElement('button');
    button.type = 'button'; button.textContent = student ? '查看' : '尚未開始'; button.disabled = !student;
    if (student) button.addEventListener('click', () => openStudent(student.id));
    action.append(button); tr.append(action); tbody.append(tr);
  });
  $('#students-empty').hidden = rows.length > 0;
}

function renderPlantFilters() {
  $('#plant-filter').replaceChildren(...AQUATIC_PLANTS.map((plant) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = plant.name;
    button.classList.toggle('active', plant.id === state.selectedPlantId);
    button.addEventListener('click', () => { state.selectedPlantId = plant.id; renderPlantFilters(); renderPhotos(); });
    return button;
  }));
}

function renderPhotos() {
  clearPhotoUrls(); const wall = $('#photo-wall'); wall.replaceChildren();
  const plant = AQUATIC_PLANTS.find((item) => item.id === state.selectedPlantId);
  const students = new Map(studentsInClass().map((student) => [Number(student.seatNumber), student]));
  const dashboardPhotos = Array.isArray(state.dashboard?.photos) ? state.dashboard.photos : [];
  const photos = new Map(dashboardPhotos.filter((photo) => photo.className === currentClass() && photo.plantId === state.selectedPlantId).map((photo) => [Number(photo.seatNumber), photo]));
  for (let seatNumber = 1; seatNumber <= 30; seatNumber += 1) {
    const student = students.get(seatNumber); const photo = photos.get(seatNumber);
    const card = document.createElement('article'); card.className = 'wall-card';
    if (photo && student) {
      const img = new Image(); img.alt = `${currentClass()}班 ${seatLabel(seatNumber)}號拍攝的${plant.name}`; img.loading = 'lazy';
      card.append(img); authPhoto(() => api.teacherPhoto(state.token, student.id, state.selectedPlantId), img);
    } else {
      const placeholder = document.createElement('div'); placeholder.className = 'wall-placeholder'; placeholder.textContent = student ? '尚未拍攝' : '尚未開始'; card.append(placeholder);
    }
    const copy = document.createElement('div');
    const strong = document.createElement('strong'); strong.textContent = `${currentClass()}班 ${seatLabel(seatNumber)}號`;
    const span = document.createElement('span'); span.textContent = plant.name;
    copy.append(strong, span); card.append(copy); wall.append(card);
  }
}

function photosPanelVisible() { return !$('#photos-panel').hidden; }
function renderAll() {
  renderFilters(); renderSummary(); renderStudents(); renderPlantFilters();
  if (photosPanelVisible()) renderPhotos(); else $('#photo-wall').replaceChildren();
}

async function loadDashboard(expectedToken = state.token, expectedSerial = authSerial) {
  if (!expectedToken) throw new Error('請先登入教師端。');
  const refresh = $('#teacher-refresh');
  if (refresh) { refresh.disabled = true; refresh.textContent = '載入中……'; }
  try {
    const dashboard = normalizeDashboard(await api.teacherDashboard(expectedToken));
    if (expectedToken !== state.token || expectedSerial !== authSerial) return false;
    state.dashboard = dashboard;
    renderAll();
    showDashboard();
    loginStatus();
    return true;
  } finally {
    if (refresh) { refresh.disabled = false; refresh.textContent = '重新整理'; }
  }
}

async function openStudent(studentId) {
  try {
    const data = await api.teacherStudent(state.token, studentId);
    if (!data?.student || !data?.record || !Array.isArray(data.record.observations)) throw new Error('學生資料格式不完整，請重新整理後再試。');
    clearPhotoUrls(); const root = $('#student-detail'); root.replaceChildren();
    const header = document.createElement('div'); header.className = 'detail-header';
    header.innerHTML = `<div><p class="eyebrow">學生完整紀錄</p><h1>${escapeHtml(data.student.className)}班 ${seatLabel(data.student.seatNumber)}號的水生植物觀察</h1></div><strong>${data.record.observations.filter((item) => item.completed).length} / 7 種已完成</strong>`;
    root.append(header); const grid = document.createElement('div'); grid.className = 'detail-grid';
    AQUATIC_PLANTS.forEach((plant) => {
      const observation = data.record.observations.find((item) => item.plantId === plant.id);
      const card = document.createElement('section'); card.className = 'card detail-plant';
      const head = document.createElement('div'); head.className = 'detail-plant-head'; const img = new Image(); img.alt = `${plant.name}學生照片`;
      const title = document.createElement('div');
      title.innerHTML = `<h2>${plant.name}</h2><p>${observation?.completed ? '觀察完成' : observation ? '草稿' : '尚未完成'}</p><small>最後記錄：${formatTime(observation?.updatedAt)}</small>`;
      head.append(img, title); card.append(head);
      if (observation?.hasPhoto) authPhoto(() => api.teacherPhoto(state.token, studentId, plant.id), img); else img.hidden = true;
      const answers = document.createElement('ul'); answers.className = 'answer-list';
      OBSERVATION_QUESTIONS.forEach((question) => {
        const li = document.createElement('li'); li.textContent = `${question.label} ${observation?.answers?.[question.id] || '—'}`; answers.append(li);
      });
      card.append(answers); grid.append(card);
    });
    const summary = document.createElement('section'); summary.className = 'card detail-summary';
    const classification = data.record.classification || {};
    const categories = CATEGORY_OPTIONS.map((category) => {
      const names = AQUATIC_PLANTS.filter((plant) => classification[plant.id] === category.id).map((plant) => plant.name).join('、') || '—';
      return `<dt>${category.id}</dt><dd>${names}</dd>`;
    }).join('');
    const environment = data.record.environment || data.record.summary?.environment || null;
    const flowLabel = WATER_FLOW_OPTIONS.find((item) => item.value === environment?.waterFlow)?.label || '—';
    const life = [];
    if (environment?.aquaticLife?.plant) life.push('有水生植物');
    if (environment?.aquaticLife?.animal) life.push('有水生動物');
    summary.innerHTML = `<h2>分類與環境調查</h2><dl>${categories}<dt>水流情形</dt><dd>${escapeHtml(flowLabel)}</dd><dt>水生生物</dt><dd>${escapeHtml(life.join('、') || '—')}</dd><dt>其他發現</dt><dd>${escapeHtml(environment?.otherFindings || '—')}</dd><dt>完成時間</dt><dd>${formatTime(environment?.completedAt || data.record.summary?.completedAt)}</dd></dl>`;
    grid.append(summary); root.append(grid); $('#teacher-dashboard-view').hidden = true; $('#student-detail-view').hidden = false; window.scrollTo(0, 0);
  } catch (error) {
    toast(error?.message || '學生資料載入失敗，請稍後再試。');
  }
}

$('#teacher-login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const serial = ++authSerial;
  $('#login-error').textContent = '';
  loginStatus(state.token ? '正在重新讀取班級資料……' : '正在驗證教師密碼……');
  if (submit) { submit.disabled = true; submit.textContent = '處理中……'; }
  try {
    const result = state.token ? { token: state.token } : await api.teacherLogin(new FormData(form).get('password'));
    if (serial !== authSerial) return;
    state.token = result.token;
    sessionStorage.setItem('aquatic.teacherToken', state.token);
    form.reset();
    loginStatus('密碼已驗證，正在讀取班級資料……');
    const loaded = await loadDashboard(state.token, serial);
    if (!loaded && serial === authSerial) showLogin('教師資料載入被新的登入動作取代，請按「重試載入」。');
  } catch (error) {
    if (serial !== authSerial) return;
    if (error?.status === 401) {
      sessionStorage.removeItem('aquatic.teacherToken');
      state.token = null;
    }
    showLogin(state.token ? '教師身分已驗證，但班級資料暫時無法載入。請按「重試載入」，無須重輸密碼。' : (error?.message || '教師端暫時無法載入，請稍後再試。'));
    loginStatus();
  } finally {
    if (serial === authSerial && submit) { submit.disabled = false; submit.textContent = state.token ? '重試載入' : '確定'; }
  }
});

$('#teacher-refresh').addEventListener('click', async () => {
  try {
    await loadDashboard(state.token, authSerial);
    toast('資料已更新');
  } catch (error) {
    toast(error?.message || '資料更新失敗，請稍後再試。');
  }
});

$('#class-filter').addEventListener('change', () => {
  $('#student-search').value = ''; renderSummary(); renderStudents();
  if (photosPanelVisible()) renderPhotos();
});
$('#student-search').addEventListener('input', renderStudents);
$$('[data-tab]').forEach((button) => button.addEventListener('click', () => {
  $$('[data-tab]').forEach((item) => item.classList.toggle('active', item === button));
  $('#students-panel').hidden = button.dataset.tab !== 'students';
  $('#photos-panel').hidden = button.dataset.tab !== 'photos';
  if (button.dataset.tab === 'photos') renderPhotos();
}));
$('#detail-back').addEventListener('click', () => { clearPhotoUrls(); showDashboard(); });
$('#teacher-logout').addEventListener('click', () => {
  authSerial += 1;
  sessionStorage.removeItem('aquatic.teacherToken');
  state.token = null;
  state.dashboard = null;
  clearPhotoUrls();
  showLogin();
  loginStatus();
});

(async function boot() {
  showLogin();
  if (!state.token) return;
  const tokenAtBoot = state.token;
  const serialAtBoot = authSerial;
  loginStatus('正在讀取班級資料……');
  try {
    await loadDashboard(tokenAtBoot, serialAtBoot);
  } catch (error) {
    if (tokenAtBoot !== state.token || serialAtBoot !== authSerial) return;
    if (error?.status === 401) {
      sessionStorage.removeItem('aquatic.teacherToken');
      state.token = null;
      showLogin('教師登入已失效，請重新登入。');
      loginStatus();
    } else {
      showLogin('教師身分已驗證，但班級資料暫時無法載入。請按「重試載入」，無須重輸密碼。');
      loginStatus();
    }
  }
})();
