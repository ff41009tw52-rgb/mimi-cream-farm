const normalizeBase = (value) => String(value || '').trim().replace(/\/$/, '');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
  reader.onerror = () => reject(reader.error || new Error('照片讀取失敗。'));
  reader.readAsDataURL(blob);
});

const base64ToBlob = (base64, mimeType) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType || 'image/jpeg' });
};

export class AquaticApi {
  constructor(baseUrl = window.AQUATIC_API_URL) {
    this.baseUrl = normalizeBase(baseUrl);
  }

  get configured() {
    return Boolean(this.baseUrl && !this.baseUrl.includes('YOUR_GOOGLE_APPS_SCRIPT'));
  }

  async call(action, payload = {}, options = {}) {
    if (!this.configured) throw new Error('Google 雲端後端尚未完成設定。');
    const timeoutMs = Number(options.timeoutMs || 25000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(this.baseUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload }),
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        const timeoutError = new Error('Google 雲端回應較慢，正在重新連線。');
        timeoutError.code = 'TIMEOUT';
        timeoutError.retryable = true;
        throw timeoutError;
      }
      if (error && typeof error === 'object') error.retryable = true;
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const error = new Error(`Google 雲端服務暫時無法使用（${response.status}）。`);
      error.status = response.status;
      error.retryable = response.status >= 500 || response.status === 429;
      throw error;
    }

    const result = await response.json().catch(() => null);
    if (!result || result.ok !== true) {
      const error = new Error(result?.error || 'Google 雲端服務回傳了無法辨識的資料。');
      error.status = Number(result?.status || 500);
      error.retryable = error.status >= 500 || error.status === 429;
      throw error;
    }
    return result.data;
  }

  async callWithRetry(action, payload = {}, options = {}) {
    const attempts = Math.max(1, Number(options.attempts || 2));
    const timeoutMs = Number(options.timeoutMs || 45000);
    const retryDelayMs = Number(options.retryDelayMs || 900);
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await this.call(action, payload, { timeoutMs });
      } catch (error) {
        lastError = error;
        const canRetry = Boolean(error?.retryable) && attempt < attempts;
        if (!canRetry) throw error;
        await sleep(retryDelayMs * attempt);
      }
    }
    throw lastError || new Error('Google 雲端服務暫時無法使用。');
  }

  health() {
    return this.callWithRetry('health', {}, { attempts: 2, timeoutMs: 45000, retryDelayMs: 700 });
  }
  createProfile(profile) {
    return this.callWithRetry('studentLogin', profile, { attempts: 2, timeoutMs: 45000, retryDelayMs: 900 });
  }
  studentRecord(token) {
    return this.callWithRetry('studentRecord', { token }, { attempts: 2, timeoutMs: 45000, retryDelayMs: 900 });
  }
  saveObservation(token, plantId, data) { return this.call('saveObservation', { token, plantId, data }); }
  async uploadPhoto(token, plantId, blob) {
    return this.call('uploadPhoto', {
      token,
      plantId,
      mimeType: blob.type || 'image/jpeg',
      base64: await blobToBase64(blob)
    });
  }
  async studentPhoto(token, plantId) {
    const result = await this.callWithRetry('studentPhoto', { token, plantId }, { attempts: 2, timeoutMs: 45000, retryDelayMs: 700 });
    return base64ToBlob(result.base64, result.mimeType);
  }
  saveSummary(token, data) { return this.call('saveSummary', { token, data }); }

  teacherLogin(password) {
    return this.callWithRetry('teacherLogin', { password }, { attempts: 2, timeoutMs: 45000 });
  }
  teacherDashboard(token) {
    return this.callWithRetry('teacherDashboard', { token }, { attempts: 2, timeoutMs: 45000 });
  }
  teacherStudent(token, studentId) {
    return this.callWithRetry('teacherStudent', { token, studentId }, { attempts: 2, timeoutMs: 45000 });
  }
  teacherResetStudent(token, className, seatNumber) {
    return this.callWithRetry('teacherResetStudent', { token, className, seatNumber }, { attempts: 2, timeoutMs: 60000, retryDelayMs: 1200 });
  }
  async teacherPhoto(token, studentId, plantId) {
    const result = await this.callWithRetry('teacherPhoto', { token, studentId, plantId }, { attempts: 2, timeoutMs: 45000 });
    return base64ToBlob(result.base64, result.mimeType);
  }
}

export const getStoredStudent = () => {
  try { return JSON.parse(localStorage.getItem('aquatic.student') || 'null'); } catch { return null; }
};
export const setStoredStudent = (value) => localStorage.setItem('aquatic.student', JSON.stringify(value));
export const clearStoredStudent = () => localStorage.removeItem('aquatic.student');
