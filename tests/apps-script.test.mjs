import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const script = await Promise.all([
  'google-apps-script/aquatic/Constants.gs',
  'google-apps-script/aquatic/Auth.gs',
  'google-apps-script/aquatic/Store.gs',
  'google-apps-script/aquatic/Code.gs'
].map((path) => readFile(new URL(path, root), 'utf8'))).then((parts) => parts.join('\n'));

class FakeRange {
  constructor(sheet, row, column, rowCount, columnCount) {
    Object.assign(this, { sheet, row, column, rowCount, columnCount });
  }
  getValues() {
    return Array.from({ length:this.rowCount }, (_, rowOffset) =>
      Array.from({ length:this.columnCount }, (_, columnOffset) =>
        this.sheet.rows[this.row - 1 + rowOffset]?.[this.column - 1 + columnOffset] ?? ''
      )
    );
  }
  setValues(values) {
    values.forEach((valuesRow, rowOffset) => valuesRow.forEach((value, columnOffset) => {
      const rowIndex = this.row - 1 + rowOffset;
      while (this.sheet.rows.length <= rowIndex) this.sheet.rows.push([]);
      this.sheet.rows[rowIndex][this.column - 1 + columnOffset] = value;
    }));
    return this;
  }
}

class FakeSheet {
  constructor(headers) { this.rows = [[...headers]]; }
  getLastRow() { return this.rows.length; }
  getRange(row, column, rowCount, columnCount) { return new FakeRange(this, row, column, rowCount, columnCount); }
  appendRow(values) { this.rows.push([...values]); }
}

const schemas = {
  Students: ['studentId', 'className', 'seatNumber', 'createdAt', 'updatedAt'],
  Observations: ['observationId', 'studentId', 'className', 'seatNumber', 'plantId', 'status', 'driveFileId', 'mimeType', 'answers', 'comparisonAnswers', 'notFoundReason', 'hasPhoto', 'createdAt', 'updatedAt'],
  Classification: ['studentId', 'className', 'seatNumber', 'classification', 'classificationReason', 'completedAt', 'createdAt', 'updatedAt'],
  Reflection: ['studentId', 'className', 'seatNumber', 'reflection', 'completedAt', 'createdAt', 'updatedAt']
};
const sheets = Object.fromEntries(Object.entries(schemas).map(([name, headers]) => [name, new FakeSheet(headers)]));
const properties = new Map([['TOKEN_SECRET', 'unit-test-token-secret'], ['TEACHER_PASSWORD', 'unit-test-password']]);
let uuid = 0;
const toBase64Url = (bytes) => Buffer.from(bytes).toString('base64url');

const context = vm.createContext({
  console,
  Date,
  JSON,
  Math,
  Number,
  Object,
  Set,
  String,
  Array,
  Boolean,
  Error,
  Utilities: {
    getUuid: () => `uuid-${++uuid}`,
    newBlob: (value) => {
      const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
      return { getBytes: () => [...buffer], getDataAsString: () => buffer.toString('utf8') };
    },
    base64EncodeWebSafe: toBase64Url,
    base64DecodeWebSafe: (value) => [...Buffer.from(value, 'base64url')],
    computeHmacSha256Signature: (value, secret) => [...crypto.createHmac('sha256', secret).update(value).digest()]
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (key) => properties.get(key) || null,
      setProperty: (key, value) => properties.set(key, value)
    })
  },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  configuredSpreadsheet_: () => ({ getSheetByName: (name) => sheets[name] || null }),
  ContentService: {
    MimeType: { JSON:'application/json' },
    createTextOutput: (text) => ({ text, setMimeType() { return this; } })
  }
});
vm.runInContext(script, context);

const student01a = context.route_({ action:'studentLogin', className:'307', seatNumber:1 });
const student01b = context.route_({ action:'studentLogin', className:'307', seatNumber:1 });
const student02 = context.route_({ action:'studentLogin', className:'307', seatNumber:2 });
assert.equal(student01a.student.id, student01b.student.id, '同班同座號必須回到同一學生');
assert.notEqual(student01a.student.id, student02.student.id, '不同座號不可共用學生紀錄');

context.route_({
  action:'saveObservation', token:student01a.token, plantId:'water-lettuce',
  data:{ completed:true, notFound:false, answers:{ location:'水面上', leaf_position:'漂浮在水面', root_position:'漂浮在水裡', feature:'葉片層層排列', difference:'和課本很像' } }
});
const record01 = context.route_({ action:'studentRecord', token:student01b.token });
const record02 = context.route_({ action:'studentRecord', token:student02.token });
assert.equal(record01.record.observations.length, 1);
assert.equal(record01.record.observations[0].answers.difference, '和課本很像');
assert.equal(record02.record.observations.length, 0);

assert.throws(() => context.route_({ action:'teacherDashboard', token:student01a.token }), /登入資訊已失效/);
const teacher = context.route_({ action:'teacherLogin', password:'unit-test-password' });
const dashboard = context.route_({ action:'teacherDashboard', token:teacher.token });
assert.equal(dashboard.students.length, 2);
assert.equal(dashboard.students.find((item) => item.seatNumber === 1).completedPlants, 1);
assert.equal(dashboard.students.find((item) => item.seatNumber === 2).completedPlants, 0);
console.log('Google Apps Script aquatic checks passed.');
