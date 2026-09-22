import assert from 'node:assert/strict';
import worker from '../cloudflare/aquatic/worker.js';

const response = await worker.fetch(new Request('https://example.test/api/health', { headers: { Origin:'https://ff41009tw52-rgb.github.io' } }), {});
assert.equal(response.status, 200);
assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://ff41009tw52-rgb.github.io');
assert.deepEqual(await response.json(), { ok:true, service:'aquatic-observation-api', database:false, media:false, ai:false });

const preflight = await worker.fetch(new Request('https://example.test/api/student/profile', { method:'OPTIONS', headers:{ Origin:'http://localhost:4173' } }), {});
assert.equal(preflight.status, 204);
assert.match(preflight.headers.get('Access-Control-Allow-Methods'), /PUT/);

const teacher = await worker.fetch(new Request('https://example.test/api/teacher/login', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:'{"password":"test"}' }), {});
assert.equal(teacher.status, 503);
assert.match((await teacher.json()).error, /尚未設定/);

const missing = await worker.fetch(new Request('https://example.test/api/unknown'), {});
assert.equal(missing.status, 404);
console.log('Worker checks passed.');

