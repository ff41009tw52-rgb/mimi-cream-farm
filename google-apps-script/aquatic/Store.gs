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
