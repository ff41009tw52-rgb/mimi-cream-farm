function deleteStudentRows_(sheetName, studentId) {
  var targetRows = rows_(sheetName)
    .filter(function (row) { return String(row.studentId) === String(studentId); })
    .map(function (row) { return Number(row._row); })
    .sort(function (left, right) { return right - left; });
  var targetSheet = sheet_(sheetName);
  targetRows.forEach(function (rowNumber) { targetSheet.deleteRow(rowNumber); });
  return targetRows.length;
}

function trashStudentPhotoFolder_(student) {
  var root = configuredRootFolder_();
  var classFolders = root.getFoldersByName(String(student.className) + '班');
  var trashed = 0;
  while (classFolders.hasNext()) {
    var classFolder = classFolders.next();
    var seatFolders = classFolder.getFoldersByName(seatLabel_(student.seatNumber) + '號');
    while (seatFolders.hasNext()) {
      seatFolders.next().setTrashed(true);
      trashed += 1;
    }
  }
  return trashed;
}

function resetStudentBySeat_(className, seatNumber) {
  var identity = assertClassSeat_(className, seatNumber);
  var student = findStudent_(identity.className, identity.seatNumber);
  if (!student) throw apiError_('這個座號目前沒有可還原的學生資料。', 404);

  var result = {
    className: String(student.className),
    seatNumber: Number(student.seatNumber),
    studentId: String(student.studentId),
    trashedPhotoFolders: 0,
    deletedRows: {}
  };

  result.trashedPhotoFolders = trashStudentPhotoFolder_(student);

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    ['Observations', 'Classification', 'Reflection', 'Environment'].forEach(function (sheetName) {
      result.deletedRows[sheetName] = deleteStudentRows_(sheetName, student.studentId);
    });
    result.deletedRows.Students = deleteStudentRows_('Students', student.studentId);
  } finally {
    lock.releaseLock();
  }

  return {
    reset: true,
    className: result.className,
    seatNumber: result.seatNumber,
    trashedPhotoFolders: result.trashedPhotoFolders,
    deletedRows: result.deletedRows
  };
}
