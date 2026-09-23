import assert from 'node:assert/strict';
import { AquaticApi } from '../assets/aquatic/aquatic-api.js';

const api = new AquaticApi('https://example.test/exec');
const requests = [];
api.call = async (action, payload, options) => {
  requests.push({ action, payload, options });
  return action === 'teacherLogin' ? { token: 'test-token' } : { students: [], photos: [], plantCounts: {} };
};

assert.deepEqual(await api.teacherLogin('unit-test-password'), { token: 'test-token' });
assert.deepEqual(await api.teacherDashboard('test-token'), { students: [], photos: [], plantCounts: {} });
assert.deepEqual(requests.map(({ action, options }) => [action, options.timeoutMs]), [
  ['teacherLogin', 40000], ['teacherDashboard', 45000]
]);
assert.equal(requests.length, 2, 'teacher requests do not silently retry');

api.call = async () => { throw Object.assign(new Error('教師密碼不正確'), { status: 401 }); };
await assert.rejects(api.teacherLogin('wrong-password'), /教師密碼不正確/);

console.log('Aquatic teacher API timing tests passed.');
