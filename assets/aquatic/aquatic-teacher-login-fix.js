import { AquaticApi } from './aquatic-api.js?v=20260924-6';

const form = document.querySelector('#teacher-login-form');
const loginView = document.querySelector('#teacher-login-view');
const dashboardView = document.querySelector('#teacher-dashboard-view');
const errorNode = document.querySelector('#login-error');
const submitButton = form?.querySelector('button[type="submit"]');
const api = new AquaticApi();

// 已有教師 token 時，先把登入卡隱藏，避免 Dashboard 載入期間仍看到登入畫面。
if (sessionStorage.getItem('aquatic.teacherToken') && loginView) {
  loginView.hidden = true;
}

// 如果既有 token 其實已失效，原本程式會把 token 清掉；這裡負責把登入畫面恢復。
const loginWatchdog = window.setInterval(() => {
  const hasToken = Boolean(sessionStorage.getItem('aquatic.teacherToken'));
  const dashboardVisible = dashboardView && !dashboardView.hidden;
  if (!hasToken && !dashboardVisible && loginView) {
    loginView.hidden = false;
    window.clearInterval(loginWatchdog);
  }
  if (dashboardVisible) window.clearInterval(loginWatchdog);
}, 300);

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const password = String(new FormData(form).get('password') || '');
    if (!password) return;

    if (errorNode) errorNode.textContent = '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = '登入中……';
    }

    try {
      const result = await api.teacherLogin(password);
      sessionStorage.setItem('aquatic.teacherToken', result.token);
      form.reset();
      if (loginView) loginView.hidden = true;
      // 重新載入後，由 aquatic-teacher.js 直接使用剛取得的 token 載入 Dashboard，
      // 避免手動登入與舊 token 的背景驗證同時完成造成畫面被切回登入頁。
      window.location.reload();
    } catch (error) {
      if (loginView) loginView.hidden = false;
      if (errorNode) errorNode.textContent = error?.message || '教師端登入失敗，請稍後再試。';
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = '確定';
      }
    }
  }, true);
}
