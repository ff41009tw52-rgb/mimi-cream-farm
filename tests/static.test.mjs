import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [student, teacher, data, app, teacherApp, worker, schema] = await Promise.all([
  read('aquatic.html'), read('aquatic-teacher.html'), read('assets/aquatic/aquatic-data.js'),
  read('assets/aquatic/aquatic.js'), read('assets/aquatic/aquatic-teacher.js'),
  read('cloudflare/aquatic/worker.js'), read('cloudflare/aquatic/schema.sql')
]);

for (const name of ['大萍','浮萍','布袋蓮','水蘊草','睡蓮','臺灣萍蓬草','荷花']) assert.match(data, new RegExp(name));
for (const forbidden of ['Gemini','chatbot','植物辨識','AI 提示']) assert.doesNotMatch(`${student}${teacher}${data}${app}${teacherApp}${worker}`, new RegExp(forbidden, 'i'));
for (const id of ['profile-view','field-guide-view','plant-view','classification-view','complete-view']) assert.match(student, new RegExp(`id="${id}"`));
for (const id of ['teacher-login-view','teacher-dashboard-view','student-detail-view','photo-wall']) assert.match(teacher, new RegExp(`id="${id}"`));
assert.match(app, /compressImage/); assert.match(app, /retryPendingUploads/); assert.match(app, /navigator\.onLine/);
assert.match(worker, /AQUATIC_DB/); assert.match(worker, /AQUATIC_MEDIA/); assert.match(worker, /TEACHER_PASSWORD/); assert.match(worker, /SESSION_SECRET/);
for (const table of ['students','student_devices','observations','student_summaries']) assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
assert.match(student, /aquatic-data\.js|aquatic\.js/); assert.match(teacher, /aquatic-teacher\.js/);
console.log('Static aquatic checks passed.');

