/**
 * 植物探索家：Google 雲端硬碟「僅可收件」接收端。
 * 使用 zx5566zero@apps.ntpc.edu.tw 建立並部署「執行身分：我」。
 * 不提供列出、讀取或下載收件的 API；此網址公開後仍可能遭他人濫用。
 */
var PLANT_RECIPIENT = 'zx5566zero@apps.ntpc.edu.tw';
var PLANT_ALLOWED_ORIGIN = 'https://ff41009tw52-rgb.github.io';
var PLANT_FOLDER_NAME = '植物探索家_學生觀察作品';

function doGet(e) {
  var p = e && e.parameter || {};
  if (p.action !== 'status') {
    return ContentService.createTextOutput('植物探索家收件端已啟動。').setMimeType(ContentService.MimeType.TEXT);
  }
  // Status is a read-only JSONP lookup; never return students' names, images or records.
  var receipt = String(p.receipt || '');
  var prefix = String(p.prefix || '');
  if (!/^[a-f0-9-]{36}$/i.test(receipt) || !/^__plantStatus_[a-f0-9]{32}$/.test(prefix)) {
    return ContentService.createTextOutput('/* invalid receipt request */').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  var sent = CacheService.getScriptCache().get('plant_success_' + receipt) === '1';
  var result = { ok: true, sent: sent, receipt: receipt, recipient: PLANT_RECIPIENT };
  return ContentService.createTextOutput(prefix + '(' + JSON.stringify(result) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  var requestId = '';
  try {
    var payloadText = e && e.parameter && e.parameter.payload;
    if (!payloadText || payloadText.length > 4000000) throw new Error('資料為空或過大。');
    var payload = JSON.parse(payloadText);
    requestId = String(payload.requestId || '');
    if (payload.version !== 3 || !/^[a-f0-9-]{36}$/i.test(requestId)) throw new Error('傳送格式不正確。');
    var record = payload.record || {};
    var revision = String(record.uploadRevision || '');
    if (!/^[a-f0-9-]{36}$/i.test(revision)) throw new Error('作品編號不正確。');
    var name = cleanPart_(record.name, 100), cls = cleanPart_(record.className, 20);
    var group = cleanPart_(record.groupName, 30);
    if (!name || !cls || !group) throw new Error('請先填植物名稱、班級及座號／組別。');
    var photos = record.photos;
    if (!Array.isArray(photos) || photos.length < 1 || photos.length > 3) throw new Error('每筆作品需要 1 至 3 張照片。');
    var imageData = photos.map(function(data) {
      var match = typeof data === 'string' && data.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!match || data.length > 1050000) throw new Error('照片格式不正確或超過大小限制。');
      var bytes = Utilities.base64Decode(match[2]);
      if (bytes.length > 800000) throw new Error('照片太大，請重拍。');
      var ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      return { bytes: bytes, mime: 'image/' + match[1], ext: ext };
    });

    var folderName = [cls, group, name, revision].join('_');
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var root = getRootFolder_();
      var found = root.getFoldersByName(folderName);
      var folder = found.hasNext() ? found.next() : root.createFolder(folderName);
      var marker = folder.getFilesByName('收件完成.txt');
      if (!marker.hasNext()) {
        imageData.forEach(function(photo, index) {
          var fileName = '照片' + (index + 1) + '.' + photo.ext;
          if (!folder.getFilesByName(fileName).hasNext()) {
            folder.createFile(Utilities.newBlob(photo.bytes, photo.mime, fileName));
          }
        });
        var summary = {
          submittedAt: new Date().toISOString(),
          recipient: PLANT_RECIPIENT,
          recordId: cleanPart_(record.id, 100),
          uploadRevision: revision,
          name: name,
          className: cls,
          groupName: group,
          date: String(record.date || ''),
          location: cleanPart_(record.location, 100),
          leafMargin: cleanPart_(record.leafMarginName, 100),
          leafVenation: cleanPart_(record.leafVenationName, 100),
          leafArrangement: cleanPart_(record.leafArrangementName, 100),
          rootSystem: cleanPart_(record.rootSystemName, 100),
          stemType: cleanPart_(record.stemTypeName, 100),
          hasFlower: !!record.hasFlower,
          flowerDescription: cleanPart_(record.flowerDescription, 2000),
          photoCount: imageData.length
        };
        if (!folder.getFilesByName('觀察紀錄.json').hasNext()) {
          folder.createFile('觀察紀錄.json', JSON.stringify(summary, null, 2), MimeType.PLAIN_TEXT);
        }
        folder.createFile('收件完成.txt', '收到時間：' + summary.submittedAt + '\n交件編號：' + revision, MimeType.PLAIN_TEXT);
      }
    } finally {
      lock.releaseLock();
    }
    CacheService.getScriptCache().put('plant_success_' + revision, '1', 21600);
    return acknowledge_(requestId, { ok: true, receipt: revision, recipient: PLANT_RECIPIENT, photoCount: imageData.length });
  } catch (error) {
    console.error(error);
    return acknowledge_(requestId, { ok: false, error: error && error.message ? String(error.message).slice(0, 160) : '收件失敗' });
  }
}

function cleanPart_(value, maxLength) {
  return String(value == null ? '' : value).trim().replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, maxLength);
}

function getRootFolder_() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('PLANT_RECEIVER_FOLDER_ID');
  if (folderId) return DriveApp.getFolderById(folderId);
  var folder = DriveApp.createFolder(PLANT_FOLDER_NAME);
  props.setProperty('PLANT_RECEIVER_FOLDER_ID', folder.getId());
  return folder;
}

function acknowledge_(requestId, result) {
  return ContentService.createTextOutput(JSON.stringify(Object.assign({
    type: 'minan-plant-upload-result',
    requestId: requestId
  }, result))).setMimeType(ContentService.MimeType.JSON);
}
