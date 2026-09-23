const normalizeBase = (value) => String(value || '').trim().replace(/\/$/, '');

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

  async call(action, payload = {}) {
    if (!this.configured) throw new Error('Google 雲端後端尚未完成設定。');
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    });
    if (!response.ok) throw new Error(`Google 雲端服務暫時無法使用（${response.status}）。`);
    const result = await response.json().catch(() => null);
    if (!result || result.ok !== true) {
      const error = new Error(result?.error || 'Google 雲端服務回傳了無法辨識的資料。');
      error.status = Number(result?.status || 500);
      throw error;
    }
    return result.data;
  }

  health() { return this.call('health'); }
  createProfile(profile) { return this.call('studentLogin', profile); }
  studentRecord(token) { return this.call('studentRecord', { token }); }
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
    const result = await this.call('studentPhoto', { token, plantId });
    return base64ToBlob(result.base64, result.mimeType);
  }
  saveSummary(token, data) { return this.call('saveSummary', { token, data }); }

  teacherLogin(password) { return this.call('teacherLogin', { password }); }
  teacherDashboard(token) { return this.call('teacherDashboard', { token }); }
  teacherStudent(token, studentId) { return this.call('teacherStudent', { token, studentId }); }
  async teacherPhoto(token, studentId, plantId) {
    const result = await this.call('teacherPhoto', { token, studentId, plantId });
    return base64ToBlob(result.base64, result.mimeType);
  }
}

export const getStoredStudent = () => {
  try { return JSON.parse(localStorage.getItem('aquatic.student') || 'null'); } catch { return null; }
};
export const setStoredStudent = (value) => localStorage.setItem('aquatic.student', JSON.stringify(value));
export const clearStoredStudent = () => localStorage.removeItem('aquatic.student');
