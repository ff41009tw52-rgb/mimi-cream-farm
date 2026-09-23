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
