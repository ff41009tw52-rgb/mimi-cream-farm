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
