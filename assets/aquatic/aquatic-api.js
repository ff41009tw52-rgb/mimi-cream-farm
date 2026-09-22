const normalizeBase = (value) => String(value || '').replace(/\/$/, '');

export class AquaticApi {
  constructor(baseUrl = window.AQUATIC_API_URL) {
    this.baseUrl = normalizeBase(baseUrl);
  }

  get configured() {
    return Boolean(this.baseUrl && !this.baseUrl.includes('YOUR-SUBDOMAIN'));
  }

  async request(path, { method = 'GET', token, body, headers = {}, responseType = 'json' } = {}) {
    if (!this.configured) throw new Error('後端服務尚未完成設定。');
    const requestHeaders = { ...headers };
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
    let payload = body;
    if (body && !(body instanceof Blob) && !(body instanceof FormData)) {
      requestHeaders['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const response = await fetch(`${this.baseUrl}${path}`, { method, headers: requestHeaders, body: payload });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const error = new Error(errorBody.error || `服務暫時無法使用（${response.status}）`);
      error.status = response.status;
      error.details = errorBody;
      throw error;
    }
    if (response.status === 204) return null;
    return responseType === 'blob' ? response.blob() : response.json();
  }

  health() { return this.request('/api/health'); }
  createProfile(profile) { return this.request('/api/student/profile', { method: 'POST', body: profile }); }
  studentRecord(token) { return this.request('/api/student/record', { token }); }
  saveObservation(token, plantId, data) { return this.request(`/api/student/observations/${encodeURIComponent(plantId)}`, { method: 'PUT', token, body: data }); }
  uploadPhoto(token, plantId, blob) { return this.request(`/api/student/observations/${encodeURIComponent(plantId)}/photo`, { method: 'PUT', token, body: blob, headers: { 'Content-Type': blob.type || 'image/jpeg' } }); }
  studentPhoto(token, plantId) { return this.request(`/api/student/observations/${encodeURIComponent(plantId)}/photo`, { token, responseType: 'blob' }); }
  saveSummary(token, body) { return this.request('/api/student/summary', { method: 'PUT', token, body }); }

  teacherLogin(password) { return this.request('/api/teacher/login', { method: 'POST', body: { password } }); }
  teacherDashboard(token) { return this.request('/api/teacher/dashboard', { token }); }
  teacherStudent(token, studentId) { return this.request(`/api/teacher/students/${encodeURIComponent(studentId)}`, { token }); }
  teacherPhoto(token, studentId, plantId) { return this.request(`/api/teacher/students/${encodeURIComponent(studentId)}/photos/${encodeURIComponent(plantId)}`, { token, responseType: 'blob' }); }
}

export const getStoredStudent = () => {
  try { return JSON.parse(localStorage.getItem('aquatic.student') || 'null'); } catch { return null; }
};
export const setStoredStudent = (value) => localStorage.setItem('aquatic.student', JSON.stringify(value));
export const clearStoredStudent = () => localStorage.removeItem('aquatic.student');
