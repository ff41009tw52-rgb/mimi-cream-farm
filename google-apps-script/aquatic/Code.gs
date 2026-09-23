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
