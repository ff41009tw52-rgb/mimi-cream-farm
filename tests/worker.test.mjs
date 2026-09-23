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

const invalidProfile = await worker.fetch(new Request('https://example.test/api/student/profile', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:'{"className":"999","seatNumber":26}' }), {});
assert.equal(invalidProfile.status, 400);

class ProfileDb {
  constructor() { this.students = []; this.devices = []; }
  prepare(sql) {
    const db = this; let values = [];
    return {
      bind(...args) { values = args; return this; },
      async first() {
        if (sql.includes('FROM students WHERE class_name=? AND seat_number=?')) return db.students.find((row) => row.class_name === values[0] && row.seat_number === values[1]) || null;
        throw new Error(`Unexpected first query: ${sql}`);
      },
      async run() {
        if (sql.startsWith('INSERT OR IGNORE INTO students')) {
          const [id, className, seatNumber] = values;
          if (!db.students.some((row) => row.class_name === className && row.seat_number === seatNumber)) db.students.push({ id, class_name:className, seat_number:seatNumber, student_name:'', created_at:'2026-09-23 00:00:00', updated_at:'2026-09-23 00:00:00' });
          return {};
        }
        if (sql.startsWith('INSERT INTO student_devices')) { db.devices.push({ token_hash:values[0], student_id:values[1] }); return {}; }
        throw new Error(`Unexpected run query: ${sql}`);
      }
    };
  }
}

const profileDb = new ProfileDb();
const loginRequest = () => new Request('https://example.test/api/student/profile', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:'{"className":"307","seatNumber":1}' });
const firstLogin = await worker.fetch(loginRequest(), { AQUATIC_DB:profileDb });
const secondLogin = await worker.fetch(loginRequest(), { AQUATIC_DB:profileDb });
assert.equal(firstLogin.status, 200); assert.equal(secondLogin.status, 200);
const firstBody = await firstLogin.json(); const secondBody = await secondLogin.json();
assert.equal(firstBody.student.id, secondBody.student.id);
assert.equal(firstBody.student.className, '307'); assert.equal(firstBody.student.seatNumber, 1);
assert.equal('studentName' in firstBody.student, false);
assert.equal(profileDb.students.length, 1);

const missing = await worker.fetch(new Request('https://example.test/api/unknown'), {});
assert.equal(missing.status, 404);
console.log('Worker checks passed.');
