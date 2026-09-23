var AQUATIC_CONFIG = Object.freeze({
  folderName: '水生植物觀察',
  classes: Object.freeze(['307', '308', '309', '310', '311', '312', '313']),
  plants: Object.freeze({
    'water-lettuce': '大萍',
    duckweed: '浮萍',
    'water-hyacinth': '布袋蓮',
    hydrilla: '水蘊草',
    'water-lily': '睡蓮',
    'yellow-water-lily': '臺灣萍蓬草',
    lotus: '荷花'
  }),
  categories: Object.freeze(['漂浮植物', '沉水植物', '浮葉植物', '挺水植物']),
  maxPhotoBytes: 6 * 1024 * 1024,
  studentTokenSeconds: 180 * 24 * 60 * 60,
  teacherTokenSeconds: 8 * 60 * 60,
  sheets: Object.freeze({
    Students: Object.freeze(['studentId', 'className', 'seatNumber', 'createdAt', 'updatedAt']),
    Observations: Object.freeze([
      'observationId', 'studentId', 'className', 'seatNumber', 'plantId', 'status',
      'driveFileId', 'mimeType', 'answers', 'comparisonAnswers', 'notFoundReason',
      'hasPhoto', 'createdAt', 'updatedAt'
    ]),
    Classification: Object.freeze([
      'studentId', 'className', 'seatNumber', 'classification', 'classificationReason',
      'completedAt', 'createdAt', 'updatedAt'
    ]),
    Reflection: Object.freeze([
      'studentId', 'className', 'seatNumber', 'reflection', 'completedAt', 'createdAt', 'updatedAt'
    ])
  })
});

function nowIso_() {
  return new Date().toISOString();
}

function cleanText_(value, maxLength) {
  return String(value == null ? '' : value)
    .normalize('NFKC')
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, maxLength);
}

function seatLabel_(seatNumber) {
  return String(Number(seatNumber)).padStart(2, '0');
}

function assertPlant_(plantId) {
  if (!Object.prototype.hasOwnProperty.call(AQUATIC_CONFIG.plants, plantId)) {
    throw apiError_('找不到這種教材植物。', 404);
  }
}

function assertClassSeat_(className, seatNumber) {
  var normalizedClass = cleanText_(className, 3);
  var normalizedSeat = Number(seatNumber);
  if (AQUATIC_CONFIG.classes.indexOf(normalizedClass) < 0 ||
      !Number.isInteger(normalizedSeat) || normalizedSeat < 1 || normalizedSeat > 25) {
    throw apiError_('請選擇班級，並輸入 1～25 的座號。', 400);
  }
  return { className: normalizedClass, seatNumber: normalizedSeat };
}
function base64UrlEncode_(value) {
  var bytes = typeof value === 'string'
    ? Utilities.newBlob(value).getBytes()
    : value;
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function base64UrlDecodeText_(value) {
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(value)).getDataAsString('UTF-8');
}

function tokenSecret_() {
  var properties = PropertiesService.getScriptProperties();
  var secret = properties.getProperty('TOKEN_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty('TOKEN_SECRET', secret);
  }
  return secret;
}

function sign_(payload) {
  return base64UrlEncode_(Utilities.computeHmacSha256Signature(payload, tokenSecret_()));
}

function safeEqual_(left, right) {
  var a = String(left == null ? '' : left);
  var b = String(right == null ? '' : right);
  if (a.length !== b.length) return false;
  var result = 0;
  for (var index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

function makeToken_(role, subject, lifetimeSeconds) {
  var payload = base64UrlEncode_(JSON.stringify({
    role: role,
    sub: subject,
    exp: Math.floor(Date.now() / 1000) + lifetimeSeconds,
    nonce: Utilities.getUuid()
  }));
  return payload + '.' + sign_(payload);
}

function verifyToken_(token, expectedRole) {
  var parts = String(token || '').split('.');
  if (parts.length !== 2 || !safeEqual_(parts[1], sign_(parts[0]))) {
    throw apiError_('登入資訊已失效，請重新登入。', 401);
  }
  var payload;
  try {
    payload = JSON.parse(base64UrlDecodeText_(parts[0]));
  } catch (error) {
    throw apiError_('登入資訊已失效，請重新登入。', 401);
  }
  if (payload.role !== expectedRole || !payload.sub || Number(payload.exp) < Math.floor(Date.now() / 1000)) {
    throw apiError_('登入資訊已失效，請重新登入。', 401);
  }
  return payload;
}

function requireStudent_(token) {
  var payload = verifyToken_(token, 'student');
  var student = findStudentById_(payload.sub);
  if (!student) throw apiError_('找不到學生觀察簿，請重新登入。', 401);
  return student;
}

function requireTeacher_(token) {
  verifyToken_(token, 'teacher');
}

function teacherLogin_(password) {
  var configured = PropertiesService.getScriptProperties().getProperty('TEACHER_PASSWORD');
  if (!configured) throw apiError_('教師端尚未設定。', 503);
  if (!safeEqual_(password, configured)) throw apiError_('教師密碼不正確。', 401);
  return {
    token: makeToken_('teacher', 'dashboard', AQUATIC_CONFIG.teacherTokenSeconds),
    expiresIn: AQUATIC_CONFIG.teacherTokenSeconds
  };
}
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('水生植物設定')
    .addItem('初始化資料庫與雲端資料夾', 'setupAquatic')
    .addItem('設定教師密碼', 'setTeacherPassword')
    .addToUi();
}

function setupAquatic() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('請從「水生植物觀察資料庫」開啟 Apps Script。');
  spreadsheet.setSpreadsheetTimeZone('Asia/Taipei');
  ensureSchema_(spreadsheet);

  var driveRoot = DriveApp.getRootFolder();
  var folders = driveRoot.getFoldersByName(AQUATIC_CONFIG.folderName);
  var aquaticFolder = folders.hasNext() ? folders.next() : driveRoot.createFolder(AQUATIC_CONFIG.folderName);
  var properties = PropertiesService.getScriptProperties();
  properties.setProperties({
    SPREADSHEET_ID: spreadsheet.getId(),
    DRIVE_ROOT_FOLDER_ID: aquaticFolder.getId()
  });
  tokenSecret_();
  SpreadsheetApp.getUi().alert('資料庫與私人照片資料夾已完成設定。');
}

function setTeacherPassword() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.prompt('設定教師專區密碼', '密碼只會保存在 Apps Script 伺服器端，不會寫入 GitHub。', ui.ButtonSet.OK_CANCEL);
  if (result.getSelectedButton() !== ui.Button.OK) return;
  var password = String(result.getResponseText() || '').trim();
  if (password.length < 4) {
    ui.alert('密碼至少需要 4 個字元。');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('TEACHER_PASSWORD', password);
  ui.alert('教師密碼已儲存在 Apps Script 伺服器端。');
}

function ensureSchema_(spreadsheet) {
  Object.keys(AQUATIC_CONFIG.sheets).forEach(function (sheetName) {
    var headers = AQUATIC_CONFIG.sheets[sheetName];
    var sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
    var current = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
    var hasDifferentHeader = headers.some(function (header, index) { return current[index] !== header; });
    if (hasDifferentHeader && current.some(String)) {
      throw new Error(sheetName + ' 工作表欄位與程式需求不同，已停止修改。');
    }
    if (hasDifferentHeader) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.setHiddenGridlines(true);
  });
}

function configuredSpreadsheet_() {
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) throw apiError_('後端尚未初始化。', 503);
  return SpreadsheetApp.openById(spreadsheetId);
}

function configuredRootFolder_() {
  var folderId = PropertiesService.getScriptProperties().getProperty('DRIVE_ROOT_FOLDER_ID');
  if (!folderId) throw apiError_('照片資料夾尚未初始化。', 503);
  return DriveApp.getFolderById(folderId);
}
function sheet_(name) {
  var sheet = configuredSpreadsheet_().getSheetByName(name);
  if (!sheet) throw apiError_('資料庫缺少 ' + name + ' 工作表。', 500);
  return sheet;
}

function rows_(sheetName) {
  var sheet = sheet_(sheetName);
  var lastRow = sheet.getLastRow();
  var headers = AQUATIC_CONFIG.sheets[sheetName];
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, headers.length).getValues().map(function (values, offset) {
    var row = { _row: offset + 2 };
    headers.forEach(function (header, index) { row[header] = values[index]; });
    return row;
  });
}

function appendObject_(sheetName, object) {
  var headers = AQUATIC_CONFIG.sheets[sheetName];
  sheet_(sheetName).appendRow(headers.map(function (header) {
    return object[header] == null ? '' : object[header];
  }));
}

function updateObjectRow_(sheetName, rowNumber, object) {
  var headers = AQUATIC_CONFIG.sheets[sheetName];
  sheet_(sheetName).getRange(rowNumber, 1, 1, headers.length).setValues([headers.map(function (header) {
    return object[header] == null ? '' : object[header];
  })]);
}

function findStudent_(className, seatNumber) {
  return rows_('Students').find(function (row) {
    return String(row.className) === String(className) && Number(row.seatNumber) === Number(seatNumber);
  }) || null;
}

function findStudentById_(studentId) {
  return rows_('Students').find(function (row) { return String(row.studentId) === String(studentId); }) || null;
}

function studentJson_(student) {
  return {
    id: String(student.studentId),
    className: String(student.className),
    seatNumber: Number(student.seatNumber),
    createdAt: String(student.createdAt),
    updatedAt: String(student.updatedAt)
  };
}

function loginStudent_(className, seatNumber) {
  var identity = assertClassSeat_(className, seatNumber);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var student = findStudent_(identity.className, identity.seatNumber);
    if (!student) {
      var timestamp = nowIso_();
      var created = {
        studentId: Utilities.getUuid(),
        className: identity.className,
        seatNumber: identity.seatNumber,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      appendObject_('Students', created);
      student = created;
    }
    return {
      token: makeToken_('student', String(student.studentId), AQUATIC_CONFIG.studentTokenSeconds),
      student: studentJson_(student)
    };
  } finally {
    lock.releaseLock();
  }
}

function observationRowsFor_(studentId) {
  return rows_('Observations').filter(function (row) { return String(row.studentId) === String(studentId); });
}

function findObservation_(studentId, plantId) {
  return observationRowsFor_(studentId).find(function (row) { return String(row.plantId) === String(plantId); }) || null;
}

function parseJson_(value, fallback) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(String(value || '')); } catch (error) { return fallback; }
}

function observationJson_(row) {
  var answers = parseJson_(row.answers, {});
  var comparison = parseJson_(row.comparisonAnswers, {});
  if (comparison.difference && !answers.difference) answers.difference = comparison.difference;
  return {
    plantId: String(row.plantId),
    answers: answers,
    notFound: String(row.status) === 'not_found',
    notFoundReason: String(row.notFoundReason || ''),
    completed: ['completed', 'not_found'].indexOf(String(row.status)) >= 0,
    hasPhoto: Boolean(row.driveFileId),
    updatedAt: String(row.updatedAt || '')
  };
}

function upsertObservationObject_(student, plantId, changes) {
  var existing = findObservation_(student.studentId, plantId);
  var timestamp = nowIso_();
  var base = existing || {
    observationId: String(student.studentId) + ':' + plantId,
    studentId: String(student.studentId),
    className: String(student.className),
    seatNumber: Number(student.seatNumber),
    plantId: plantId,
    status: 'draft',
    driveFileId: '',
    mimeType: '',
    answers: '{}',
    comparisonAnswers: '{}',
    notFoundReason: '',
    hasPhoto: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  Object.keys(changes).forEach(function (key) { base[key] = changes[key]; });
  base.updatedAt = timestamp;
  if (existing) updateObjectRow_('Observations', existing._row, base);
  else appendObject_('Observations', base);
  return base;
}

function saveObservation_(student, plantId, data) {
  assertPlant_(plantId);
  data = data || {};
  var notFound = Boolean(data.notFound);
  var completed = Boolean(data.completed);
  var sourceAnswers = data.answers || {};
  var answers = {
    location: cleanText_(sourceAnswers.location, 80),
    leaf_position: cleanText_(sourceAnswers.leaf_position, 80),
    root_position: cleanText_(sourceAnswers.root_position, 80),
    feature: cleanText_(sourceAnswers.feature, 80)
  };
  var comparisonAnswers = { difference: cleanText_(sourceAnswers.difference, 120) };
  var required = [answers.location, answers.leaf_position, answers.root_position, answers.feature, comparisonAnswers.difference];
  if (completed && !notFound && required.some(function (value) { return !value; })) {
    throw apiError_('請完成每一題觀察紀錄。', 400);
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    upsertObservationObject_(student, plantId, {
      status: completed ? (notFound ? 'not_found' : 'completed') : 'draft',
      answers: JSON.stringify(answers),
      comparisonAnswers: JSON.stringify(comparisonAnswers),
      notFoundReason: notFound ? cleanText_(data.notFoundReason || '今天沒有找到', 160) : ''
    });
  } finally {
    lock.releaseLock();
  }
  return { saved: true };
}

function upsertByStudent_(sheetName, student, changes) {
  var existing = rows_(sheetName).find(function (row) { return String(row.studentId) === String(student.studentId); });
  var timestamp = nowIso_();
  var base = existing || {
    studentId: String(student.studentId),
    className: String(student.className),
    seatNumber: Number(student.seatNumber),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  Object.keys(changes).forEach(function (key) { base[key] = changes[key]; });
  base.updatedAt = timestamp;
  if (existing) updateObjectRow_(sheetName, existing._row, base);
  else appendObject_(sheetName, base);
}

function saveSummary_(student, body) {
  body = body || {};
  var classification = {};
  Object.keys(AQUATIC_CONFIG.plants).forEach(function (plantId) {
    var value = cleanText_((body.classification || {})[plantId], 12);
    if (AQUATIC_CONFIG.categories.indexOf(value) < 0) {
      throw apiError_('請替七種植物都選擇一個分類。', 400);
    }
    classification[plantId] = value;
  });
  var reason = cleanText_(body.classificationReason, 180);
  var reflection = cleanText_(body.reflection, 240);
  if (!reason || !reflection) throw apiError_('請完成分類理由和觀察心得。', 400);
  var completedAt = nowIso_();
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    upsertByStudent_('Classification', student, {
      classification: JSON.stringify(classification),
      classificationReason: reason,
      completedAt: completedAt
    });
    upsertByStudent_('Reflection', student, {
      reflection: reflection,
      completedAt: completedAt
    });
  } finally {
    lock.releaseLock();
  }
  return { saved: true };
}

function recordFor_(studentId) {
  var classificationRow = rows_('Classification').find(function (row) { return String(row.studentId) === String(studentId); });
  var reflectionRow = rows_('Reflection').find(function (row) { return String(row.studentId) === String(studentId); });
  var summary = null;
  if (classificationRow || reflectionRow) {
    summary = {
      classificationReason: classificationRow ? String(classificationRow.classificationReason || '') : '',
      reflection: reflectionRow ? String(reflectionRow.reflection || '') : '',
      completedAt: String((reflectionRow && reflectionRow.completedAt) || (classificationRow && classificationRow.completedAt) || '')
    };
  }
  return {
    observations: observationRowsFor_(studentId).map(observationJson_),
    classification: classificationRow ? parseJson_(classificationRow.classification, {}) : {},
    summary: summary
  };
}

function teacherDashboard_() {
  var students = rows_('Students');
  var observations = rows_('Observations');
  var classifications = rows_('Classification');
  var reflections = rows_('Reflection');
  var classificationIds = new Set(classifications.filter(function (row) { return row.completedAt; }).map(function (row) { return String(row.studentId); }));
  var reflectionIds = new Set(reflections.filter(function (row) { return String(row.reflection || '').trim(); }).map(function (row) { return String(row.studentId); }));
  var plantCounts = {};
  AQUATIC_CONFIG.classes.forEach(function (className) {
    plantCounts[className] = {};
    Object.keys(AQUATIC_CONFIG.plants).forEach(function (plantId) { plantCounts[className][plantId] = 0; });
  });
  var studentOutput = students.map(function (student) {
    var completedPlants = observations.filter(function (row) {
      return String(row.studentId) === String(student.studentId) && ['completed', 'not_found'].indexOf(String(row.status)) >= 0;
    }).length;
    return Object.assign(studentJson_(student), {
      completedPlants: completedPlants,
      classificationComplete: classificationIds.has(String(student.studentId)),
      hasReflection: reflectionIds.has(String(student.studentId))
    });
  });
  observations.forEach(function (row) {
    if (plantCounts[row.className] && ['completed', 'not_found'].indexOf(String(row.status)) >= 0 && plantCounts[row.className][row.plantId] != null) {
      plantCounts[row.className][row.plantId] += 1;
    }
  });
  var photos = observations.filter(function (row) { return Boolean(row.driveFileId); }).map(function (row) {
    return {
      studentId: String(row.studentId),
      className: String(row.className),
      seatNumber: Number(row.seatNumber),
      plantId: String(row.plantId),
      plantName: AQUATIC_CONFIG.plants[row.plantId] || ''
    };
  });
  var completedStudents = studentOutput.filter(function (student) {
    return student.completedPlants === Object.keys(AQUATIC_CONFIG.plants).length && student.classificationComplete && student.hasReflection;
  }).length;
  return {
    summary: {
      studentCount: studentOutput.length,
      completedStudents: completedStudents,
      photoCount: photos.length,
      completionRate: studentOutput.length ? Math.round(completedStudents / studentOutput.length * 100) : 0
    },
    classes: AQUATIC_CONFIG.classes.map(function (className) {
      return { className: className, studentCount: studentOutput.filter(function (student) { return student.className === className; }).length };
    }),
    students: studentOutput,
    photos: photos,
    plantCounts: plantCounts
  };
}
function getOrCreateFolder_(parent, name) {
  var folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function photoFolderFor_(student, plantId) {
  var classFolder = getOrCreateFolder_(configuredRootFolder_(), String(student.className) + '班');
  var seatFolder = getOrCreateFolder_(classFolder, seatLabel_(student.seatNumber) + '號');
  return getOrCreateFolder_(seatFolder, AQUATIC_CONFIG.plants[plantId]);
}

function uploadPhoto_(student, plantId, mimeType, base64) {
  assertPlant_(plantId);
  var type = cleanText_(mimeType, 40).toLowerCase();
  if (['image/jpeg', 'image/png', 'image/webp'].indexOf(type) < 0) {
    throw apiError_('照片格式必須是 JPG、PNG 或 WebP。', 415);
  }
  var bytes;
  try { bytes = Utilities.base64Decode(String(base64 || '')); }
  catch (error) { throw apiError_('照片內容無效。', 400); }
  if (!bytes.length || bytes.length > AQUATIC_CONFIG.maxPhotoBytes) {
    throw apiError_('照片內容無效或超過 6 MB。', 413);
  }
  var extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  var timestamp = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd-HHmmss');
  var filename = timestamp + '-' + Utilities.getUuid().slice(0, 8) + '.' + extension;
  var blob = Utilities.newBlob(bytes, type, filename);
  var file = photoFolderFor_(student, plantId).createFile(blob);
  file.setDescription(String(student.className) + '班 ' + seatLabel_(student.seatNumber) + '號｜' + AQUATIC_CONFIG.plants[plantId]);

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    upsertObservationObject_(student, plantId, {
      driveFileId: file.getId(),
      mimeType: type,
      hasPhoto: true
    });
  } finally {
    lock.releaseLock();
  }
  return { uploaded: true, plantId: plantId };
}

function photoFor_(studentId, plantId) {
  assertPlant_(plantId);
  var observation = findObservation_(studentId, plantId);
  if (!observation || !observation.driveFileId) throw apiError_('尚無照片。', 404);
  var blob;
  try { blob = DriveApp.getFileById(String(observation.driveFileId)).getBlob(); }
  catch (error) { throw apiError_('照片檔案不存在或目前無法讀取。', 404); }
  return {
    mimeType: String(observation.mimeType || blob.getContentType() || 'image/jpeg'),
    base64: Utilities.base64Encode(blob.getBytes())
  };
}
function apiError_(message, status) {
  var error = new Error(message);
  error.status = status || 500;
  return error;
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseRequest_(event) {
  var text = event && event.postData ? event.postData.contents : '';
  if (!text || text.length > 9 * 1024 * 1024) throw apiError_('資料內容過大或格式錯誤。', 413);
  try { return JSON.parse(text); }
  catch (error) { throw apiError_('資料格式錯誤。', 400); }
}

function route_(request) {
  var action = cleanText_(request.action, 60);
  if (action === 'health') {
    return { service: 'aquatic-observation-google', sheets: true, drive: true, ai: false };
  }
  if (action === 'studentLogin') return loginStudent_(request.className, request.seatNumber);
  if (action === 'teacherLogin') return teacherLogin_(request.password);

  if (action === 'studentRecord') {
    var student = requireStudent_(request.token);
    return { student: studentJson_(student), record: recordFor_(student.studentId) };
  }
  if (action === 'saveObservation') {
    return saveObservation_(requireStudent_(request.token), cleanText_(request.plantId, 40), request.data);
  }
  if (action === 'uploadPhoto') {
    return uploadPhoto_(requireStudent_(request.token), cleanText_(request.plantId, 40), request.mimeType, request.base64);
  }
  if (action === 'studentPhoto') {
    var photoStudent = requireStudent_(request.token);
    return photoFor_(photoStudent.studentId, cleanText_(request.plantId, 40));
  }
  if (action === 'saveSummary') {
    return saveSummary_(requireStudent_(request.token), request.data);
  }

  if (action === 'teacherDashboard') {
    requireTeacher_(request.token);
    return teacherDashboard_();
  }
  if (action === 'teacherStudent') {
    requireTeacher_(request.token);
    var teacherStudent = findStudentById_(cleanText_(request.studentId, 80));
    if (!teacherStudent) throw apiError_('找不到學生。', 404);
    return { student: studentJson_(teacherStudent), record: recordFor_(teacherStudent.studentId) };
  }
  if (action === 'teacherPhoto') {
    requireTeacher_(request.token);
    var targetStudent = findStudentById_(cleanText_(request.studentId, 80));
    if (!targetStudent) throw apiError_('找不到學生。', 404);
    return photoFor_(targetStudent.studentId, cleanText_(request.plantId, 40));
  }
  throw apiError_('找不到這個 API 功能。', 404);
}

function doPost(event) {
  try {
    return jsonOutput_({ ok: true, data: route_(parseRequest_(event)) });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonOutput_({
      ok: false,
      status: Number(error && error.status) || 500,
      error: error && error.message ? error.message : '伺服器暫時發生錯誤。'
    });
  }
}

function doGet() {
  return jsonOutput_({ ok: true, data: { service: 'aquatic-observation-google', ready: true } });
}
