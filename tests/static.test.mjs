import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [student, teacher, data, api, storage, app, teacherApp, constants, auth, setup, store, photos, router, deployWorkflow] = await Promise.all([
  read('aquatic.html'), read('aquatic-teacher.html'), read('assets/aquatic/aquatic-data.js'),
  read('assets/aquatic/aquatic-api.js'), read('assets/aquatic/aquatic-storage.js'),
  read('assets/aquatic/aquatic.js'), read('assets/aquatic/aquatic-teacher.js'),
  read('google-apps-script/aquatic/Constants.gs'), read('google-apps-script/aquatic/Auth.gs'),
  read('google-apps-script/aquatic/Setup.gs'), read('google-apps-script/aquatic/Store.gs'),
  read('google-apps-script/aquatic/Photos.gs'), read('google-apps-script/aquatic/Code.gs'),
  read('.github/workflows/deploy-aquatic-worker.yml')
]);
const server = `${constants}${auth}${setup}${store}${photos}${router}`;

for (const name of ['大萍','浮萍','布袋蓮','水蘊草','睡蓮','臺灣萍蓬草','荷花']) assert.match(data, new RegExp(name));
for (const forbidden of ['Gemini','chatbot','植物辨識','AI 提示']) assert.doesNotMatch(`${student}${teacher}${data}${app}${teacherApp}${server}`, new RegExp(forbidden, 'i'));
for (const id of ['profile-view','field-guide-view','plant-view','classification-view','complete-view']) assert.match(student, new RegExp(`id="${id}"`));
for (const id of ['teacher-login-view','teacher-dashboard-view','student-detail-view','photo-wall']) assert.match(teacher, new RegExp(`id="${id}"`));
assert.match(app, /compressImage/); assert.match(app, /retryPendingUploads/); assert.match(app, /navigator\.onLine/);
assert.match(api, /text\/plain;charset=utf-8/); assert.match(api, /studentLogin/); assert.match(api, /teacherDashboard/);
assert.match(storage, /maxEdge = 1280/);
assert.doesNotMatch(`${student}${teacher}${api}`, /aquatic-observation-api\.ff41009tw52\.workers\.dev/);
assert.match(student, /YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL/); assert.match(teacher, /YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL/);

for (const className of ['307','308','309','310','311','312','313']) assert.match(data, new RegExp(`'${className}'`));
assert.match(student, /id="student-class"/); assert.doesNotMatch(student, /name="studentName"/); assert.doesNotMatch(teacher, /<th>姓名<\/th>/);
assert.match(teacher, /id="plant-filter"/); assert.match(teacherApp, /length:25/); assert.match(teacherApp, /selectedPlantId/);

for (const sheetName of ['Students','Observations','Classification','Reflection']) assert.match(constants, new RegExp(sheetName));
for (const field of ['className','seatNumber','plantId','status','driveFileId','answers','comparisonAnswers','notFoundReason','classification','reflection','createdAt','updatedAt']) assert.match(constants, new RegExp(field));
assert.match(constants, /水生植物觀察/); assert.match(setup, /DRIVE_ROOT_FOLDER_ID/); assert.match(setup, /SPREADSHEET_ID/);
assert.match(auth, /TEACHER_PASSWORD/); assert.match(auth, /computeHmacSha256Signature/); assert.match(auth, /verifyToken_\(token, 'student'\)/);
assert.match(router, /requireTeacher_/); assert.match(router, /requireStudent_/); assert.match(photos, /DriveApp\.getFileById/);
assert.doesNotMatch(photos, /setSharing|ANYONE|DOMAIN_WITH_LINK/);
assert.doesNotMatch(`${student}${teacher}${api}${server}`, /1227/);

assert.doesNotMatch(deployWorkflow, /r2 bucket|d1 execute|wrangler deploy/i);
assert.match(deployWorkflow, /No R2 action is performed/);
console.log('Static aquatic checks passed.');
