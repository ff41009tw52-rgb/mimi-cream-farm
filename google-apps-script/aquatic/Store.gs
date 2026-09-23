function sheet_(name) {
  var spreadsheet = configuredSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet && AQUATIC_CONFIG.sheets[name]) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, AQUATIC_CONFIG.sheets[name].length).setValues([AQUATIC_CONFIG.sheets[name]]);
    sheet.setFrozenRows(1);
    sheet.setHiddenGridlines(true);
  }
  if (!sheet) throw apiError_('資料庫缺少 ' + name + ' 工作表。', 500);
  return sheet;
}

function rows_(sheetName, spreadsheet) {
  // The dashboard reads several tabs from one workbook; open it only once.
  var sheet = spreadsheet ? spreadsheet.getSheetByName(sheetName) || sheet_(sheetName) : sheet_(sheetName);
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
      student: studentJson_(student),
      record: recordFor_(student.studentId)
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

function observationRowComplete_(row) {
  if (!row || String(row.status) !== 'completed' || !String(row.driveFileId || '').trim()) return false;
  var answers = parseJson_(row.answers, {});
  return ['location', 'leaf_position', 'root_position'].every(function (key) {
    return Boolean(String(answers[key] || '').trim());
  });
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
    completed: observationRowComplete_(row),
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
  var existing = findObservation_(student.studentId, plantId);
  var legacyAnswers = existing ? parseJson_(existing.answers, {}) : {};
  var legacyComparison = existing ? parseJson_(existing.comparisonAnswers, {}) : {};
  var answers = {
    location: cleanText_(sourceAnswers.location, 80),
    leaf_position: cleanText_(sourceAnswers.leaf_position, 80),
    root_position: cleanText_(sourceAnswers.root_position, 80),
    feature: cleanText_(sourceAnswers.feature || legacyAnswers.feature, 80)
  };
  var comparisonAnswers = { difference: cleanText_(sourceAnswers.difference || legacyComparison.difference, 120) };
  var required = [answers.location, answers.leaf_position, answers.root_position];
  if (completed && required.some(function (value) { return !value; })) {
    throw apiError_('請完成三個觀察選擇題。', 400);
  }
  if (completed && (!existing || !existing.driveFileId)) {
    throw apiError_('請先上傳植物照片。', 400);
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    upsertObservationObject_(student, plantId, {
      status: completed ? 'completed' : 'draft',
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
  var completedPlants = observationRowsFor_(student.studentId).filter(observationRowComplete_).length;
  if (completedPlants !== Object.keys(AQUATIC_CONFIG.plants).length) {
    throw apiError_('請先完成七種植物觀察。', 400);
  }
  var classification = {};
  Object.keys(AQUATIC_CONFIG.plants).forEach(function (plantId) {
    var value = cleanText_((body.classification || {})[plantId], 12);
    if (AQUATIC_CONFIG.categories.indexOf(value) < 0) {
      throw apiError_('請替七種植物都選擇一個分類。', 400);
    }
    classification[plantId] = value;
  });
  var environment = body.environment || {};
  var waterFlow = cleanText_(environment.waterFlow, 12);
  if (['fast', 'slow', 'still'].indexOf(waterFlow) < 0) throw apiError_('請選擇水流情形。', 400);
  var aquaticLife = environment.aquaticLife || {};
  var normalizedLife = { plant: Boolean(aquaticLife.plant), animal: Boolean(aquaticLife.animal) };
  var otherFindings = cleanText_(environment.otherFindings, 240);
  var completedAt = nowIso_();
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    upsertByStudent_('Classification', student, {
      classification: JSON.stringify(classification),
      completedAt: completedAt
    });
    upsertByStudent_('Environment', student, {
      waterFlow: waterFlow,
      aquaticLife: JSON.stringify(normalizedLife),
      otherFindings: otherFindings,
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
  var environmentRow = rows_('Environment').find(function (row) { return String(row.studentId) === String(studentId); });
  var environment = environmentRow ? {
    waterFlow: String(environmentRow.waterFlow || ''),
    aquaticLife: parseJson_(environmentRow.aquaticLife, { plant: false, animal: false }),
    otherFindings: String(environmentRow.otherFindings || ''),
    completedAt: String(environmentRow.completedAt || '')
  } : null;
  var summary = null;
  if (classificationRow || reflectionRow || environmentRow) {
    summary = {
      classificationReason: classificationRow ? String(classificationRow.classificationReason || '') : '',
      reflection: reflectionRow ? String(reflectionRow.reflection || '') : '',
      environment: environment,
      completedAt: String((environmentRow && environmentRow.completedAt) || (reflectionRow && reflectionRow.completedAt) || (classificationRow && classificationRow.completedAt) || '')
    };
  }
  return {
    observations: observationRowsFor_(studentId).map(observationJson_),
    classification: classificationRow ? parseJson_(classificationRow.classification, {}) : {},
    environment: environment,
    summary: summary
  };
}

function teacherDashboard_() {
  var startedAt = Date.now();
  var spreadsheet = configuredSpreadsheet_();
  var students = rows_('Students', spreadsheet);
  var observations = rows_('Observations', spreadsheet);
  var classifications = rows_('Classification', spreadsheet);
  var reflections = rows_('Reflection', spreadsheet);
  var environments = rows_('Environment', spreadsheet);
  var sheetsMs = Date.now() - startedAt;
  var classificationIds = new Set(classifications.filter(function (row) { return row.completedAt; }).map(function (row) { return String(row.studentId); }));
  var reflectionIds = new Set(reflections.filter(function (row) { return String(row.reflection || '').trim(); }).map(function (row) { return String(row.studentId); }));
  var environmentIds = new Set(environments.filter(function (row) { return row.completedAt; }).map(function (row) { return String(row.studentId); }));
  var plantCounts = {};
  AQUATIC_CONFIG.classes.forEach(function (className) {
    plantCounts[className] = {};
    Object.keys(AQUATIC_CONFIG.plants).forEach(function (plantId) { plantCounts[className][plantId] = 0; });
  });
  var completedByStudent = new Map();
  observations.forEach(function (row) {
    if (!observationRowComplete_(row)) return;
    var id = String(row.studentId);
    completedByStudent.set(id, (completedByStudent.get(id) || 0) + 1);
  });
  var studentOutput = students.map(function (student) {
    var completedPlants = completedByStudent.get(String(student.studentId)) || 0;
    return Object.assign(studentJson_(student), {
      completedPlants: completedPlants,
      classificationComplete: classificationIds.has(String(student.studentId)),
      environmentComplete: environmentIds.has(String(student.studentId)),
      hasLegacyReflection: reflectionIds.has(String(student.studentId))
    });
  });
  observations.forEach(function (row) {
    if (plantCounts[row.className] && observationRowComplete_(row) && plantCounts[row.className][row.plantId] != null) {
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
    return student.completedPlants === Object.keys(AQUATIC_CONFIG.plants).length && student.classificationComplete && (student.environmentComplete || student.hasLegacyReflection);
  }).length;
  console.info('aquatic.teacherDashboard sheetsMs=' + sheetsMs + ' aggregateMs=' + (Date.now() - startedAt - sheetsMs));
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
