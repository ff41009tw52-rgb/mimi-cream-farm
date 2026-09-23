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
