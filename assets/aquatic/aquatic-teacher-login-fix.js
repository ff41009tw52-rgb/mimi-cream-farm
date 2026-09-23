import { AquaticApi } from './aquatic-api.js';

const form = document.querySelector('#teacher-login-form');
const errorNode = document.querySelector('#login-error');
const submitButton = form?.querySelector('button[type="submit"]');
const api = new AquaticApi();

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
      // 重新載入後，既有 aquatic-teacher.js 會從 sessionStorage 取得 token 並載入 Dashboard。
      window.location.reload();
    } catch (error) {
      if (errorNode) errorNode.textContent = error?.message || '教師端登入失敗，請稍後再試。';
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = '確定';
      }
    }
  }, true);
}
