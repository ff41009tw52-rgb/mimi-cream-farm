import { AQUATIC_PLANTS, CATEGORY_OPTIONS, OBSERVATION_QUESTIONS } from './aquatic-data.js';
import { AquaticApi } from './aquatic-api.js';

const api = new AquaticApi();
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { token: sessionStorage.getItem('aquatic.teacherToken'), dashboard: null, photoUrls: [] };

function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2600); }
function showDashboard() { $('#teacher-login-view').hidden = true; $('#teacher-dashboard-view').hidden = false; $('#student-detail-view').hidden = true; $('#teacher-logout').hidden = false; }
function clearPhotoUrls() { state.photoUrls.forEach(URL.revokeObjectURL); state.photoUrls = []; }
async function authPhoto(urlFactory, img) { try { const blob = await urlFactory(); const url = URL.createObjectURL(blob); state.photoUrls.push(url); img.src = url; } catch { img.alt = '照片暫時無法讀取'; } }

function filteredStudents() {
  const className = $('#class-filter').value; const query = $('#student-search').value.trim().toLowerCase();
  return state.dashboard.students.filter((student) => (!className || student.className === className) && (!query || `${student.seatNumber} ${student.studentName}`.toLowerCase().includes(query)));
}

function renderSummary() {
  const data = state.dashboard.summary;
  const items = [['學生人數', data.studentCount], ['已完成觀察', `${data.completedStudents} 人`], ['學生照片', `${data.photoCount} 張`], ['完成率', `${data.completionRate}%`]];
  $('#summary-cards').replaceChildren(...items.map(([label, value]) => { const node = document.createElement('div'); node.className = 'summary-card'; node.innerHTML = `<strong>${value}</strong><span>${label}</span>`; return node; }));
}

function renderFilters() {
  const select = $('#class-filter'); const current = select.value; select.replaceChildren(new Option('全部班級', ''));
  state.dashboard.classes.forEach((item) => select.append(new Option(`${item.className}（${item.studentCount} 人）`, item.className)));
  select.value = current;
}

function renderStudents() {
  const students = filteredStudents(); const tbody = $('#student-rows'); tbody.replaceChildren();
  students.forEach((student) => {
    const tr = document.createElement('tr');
    [student.className, student.seatNumber, student.studentName, `${student.completedPlants}/7`, student.classificationComplete ? '完成' : '未完成', student.hasReflection ? '完成' : '未完成'].forEach((value) => { const td = document.createElement('td'); td.textContent = value; tr.append(td); });
    const action = document.createElement('td'); const button = document.createElement('button'); button.type = 'button'; button.textContent = '查看'; button.addEventListener('click', () => openStudent(student.id)); action.append(button); tr.append(action); tbody.append(tr);
  });
  $('#students-empty').hidden = students.length > 0;
}

function renderPhotos() {
  clearPhotoUrls(); const allowed = new Set(filteredStudents().map((student) => student.id));
  const photos = state.dashboard.photos.filter((photo) => allowed.has(photo.studentId)); const wall = $('#photo-wall'); wall.replaceChildren();
  photos.forEach((photo) => {
    const card = document.createElement('article'); card.className = 'wall-card'; const img = new Image(); img.alt = `${photo.studentName}拍攝的${photo.plantName}`; img.loading = 'lazy';
    const copy = document.createElement('div'); copy.innerHTML = `<strong>${photo.plantName}</strong><span>${photo.className} ${photo.seatNumber}號 ${photo.studentName}</span>`;
    card.append(img, copy); wall.append(card); authPhoto(() => api.teacherPhoto(state.token, photo.studentId, photo.plantId), img);
  });
  $('#photos-empty').hidden = photos.length > 0;
}

function renderAll() { renderSummary(); renderFilters(); renderStudents(); renderPhotos(); }
async function loadDashboard() { state.dashboard = await api.teacherDashboard(state.token); renderAll(); showDashboard(); }

async function openStudent(studentId) {
  try {
    const data = await api.teacherStudent(state.token, studentId); clearPhotoUrls(); const root = $('#student-detail'); root.replaceChildren();
    const header = document.createElement('div'); header.className = 'detail-header'; header.innerHTML = `<div><p class="eyebrow">學生完整紀錄</p><h1>${data.student.className} ${data.student.seatNumber}號 ${data.student.studentName}</h1></div><strong>${data.record.observations.filter((item) => item.completed).length} / 7 種已完成</strong>`; root.append(header);
    const grid = document.createElement('div'); grid.className = 'detail-grid';
    AQUATIC_PLANTS.forEach((plant) => {
      const observation = data.record.observations.find((item) => item.plantId === plant.id); const card = document.createElement('section'); card.className = 'card detail-plant';
      const head = document.createElement('div'); head.className = 'detail-plant-head'; const img = new Image(); img.alt = `${plant.name}學生照片`;
      const title = document.createElement('div'); title.innerHTML = `<h2>${plant.name}</h2><p>${observation?.notFound ? '今天沒有找到' : observation?.completed ? '觀察完成' : '尚未完成'}</p>`; head.append(img, title); card.append(head);
      if (observation?.hasPhoto) authPhoto(() => api.teacherPhoto(state.token, studentId, plant.id), img); else { img.hidden = true; }
      const answers = document.createElement('ul'); answers.className = 'answer-list';
      OBSERVATION_QUESTIONS.forEach((question) => { const li = document.createElement('li'); li.textContent = `${question.label} ${observation?.answers?.[question.id] || '—'}`; answers.append(li); }); card.append(answers); grid.append(card);
    });
    const summary = document.createElement('section'); summary.className = 'card detail-summary'; const categories = CATEGORY_OPTIONS.map((category) => { const names = AQUATIC_PLANTS.filter((plant) => data.record.classification?.[plant.id] === category.id).map((plant) => plant.name).join('、') || '—'; return `<dt>${category.id}</dt><dd>${names}</dd>`; }).join('');
    summary.innerHTML = `<h2>分類與心得</h2><dl>${categories}<dt>分類理由</dt><dd>${data.record.summary?.classificationReason || '—'}</dd><dt>觀察心得</dt><dd>${data.record.summary?.reflection || '—'}</dd></dl>`; grid.append(summary); root.append(grid);
    $('#teacher-dashboard-view').hidden = true; $('#student-detail-view').hidden = false; window.scrollTo(0, 0);
  } catch (error) { toast(error.message); }
}

$('#teacher-login-form').addEventListener('submit', async (event) => { event.preventDefault(); $('#login-error').textContent = ''; try { const result = await api.teacherLogin(new FormData(event.currentTarget).get('password')); state.token = result.token; sessionStorage.setItem('aquatic.teacherToken', state.token); await loadDashboard(); } catch (error) { $('#login-error').textContent = error.message; } });
$('#teacher-refresh').addEventListener('click', async () => { try { await loadDashboard(); toast('資料已更新'); } catch (error) { toast(error.message); } });
$('#class-filter').addEventListener('change', () => { renderStudents(); renderPhotos(); }); $('#student-search').addEventListener('input', () => { renderStudents(); renderPhotos(); });
$$('[data-tab]').forEach((button) => button.addEventListener('click', () => { $$('[data-tab]').forEach((item) => item.classList.toggle('active', item === button)); $('#students-panel').hidden = button.dataset.tab !== 'students'; $('#photos-panel').hidden = button.dataset.tab !== 'photos'; }));
$('#detail-back').addEventListener('click', () => { clearPhotoUrls(); showDashboard(); });
$('#teacher-logout').addEventListener('click', () => { sessionStorage.removeItem('aquatic.teacherToken'); state.token = null; $('#teacher-dashboard-view').hidden = true; $('#student-detail-view').hidden = true; $('#teacher-login-view').hidden = false; $('#teacher-logout').hidden = true; });

(async function boot() { if (!state.token) return; try { await loadDashboard(); } catch { sessionStorage.removeItem('aquatic.teacherToken'); state.token = null; } })();
