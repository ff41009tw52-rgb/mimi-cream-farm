import { AquaticApi } from './aquatic-api.js?v=20260924-6';

const api = new AquaticApi();
const detailRoot = document.querySelector('#student-detail');
const detailView = document.querySelector('#student-detail-view');
const toast = document.querySelector('#toast');

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

if (detailRoot) {
  new MutationObserver(ensureResetButton).observe(detailRoot, { childList: true, subtree: true });
}
if (detailView) {
  new MutationObserver(ensureResetButton).observe(detailView, { attributes: true, attributeFilter: ['hidden'] });
}
ensureResetButton();
