/**
 * 植物探索家：Google 雲端硬碟「僅可收件」接收端。
 * 使用 zx5566zero@apps.ntpc.edu.tw 建立並部署「執行身分：我」。
 * 以相同雲端硬碟收件並提供不含學生個資的植物作品圖鑑；公開部署前須確認照片安全。
 */
var PLANT_RECIPIENT = 'zx5566zero@apps.ntpc.edu.tw';
var PLANT_ALLOWED_ORIGIN = 'https://ff41009tw52-rgb.github.io';
var PLANT_FOLDER_NAME = '植物探索家_學生觀察作品';

function doGet(e) {
  var p = e && e.parameter || {};
  if (p.action === 'gallery' || p.action === 'photo') {
    return publicGallery_(p);
  }
  if (p.action !== 'status') {
    return ContentService.createTextOutput('植物探索家收件端已啟動。').setMimeType(ContentService.MimeType.TEXT);
  }
  var receipt = String(p.receipt || '');
  var prefix = String(p.prefix || '');
  if (!/^[a-f0-9-]{36}$/i.test(receipt) || !/^__plantStatus_[a-f0-9]{32}$/.test(prefix)) {
    return ContentService.createTextOutput('/* invalid receipt request */').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  var sent = CacheService.getScriptCache().get('plant_success_' + receipt) === '1';
  return jsonp_(prefix, { ok: true, sent: sent, receipt: receipt, recipient: PLANT_RECIPIENT });
}

/**
 * 公開展示僅限本收件資料夾中的作品，不回傳班級、座號、姓名或電子郵件。
 * 如不允許校外瀏覽，請勿以「所有人」部署本 Apps Script；須另加身分驗證。
 */
/**
 * 從舊有屬性指定資料夾及同名收件資料夾讀取。
 * 避免重新部署、變更收件身分或腳本屬性後，只看到新建立的空資料夾。
 */
function findPlantRoots_() {
  var roots = [], seen = {};
  function add(folder) {
    try {
      var id = folder.getId();
      if (!seen[id] && roots.length < 30) { seen[id] = true; roots.push(folder); }
    } catch (ignored) {}
  }
  var folderId = PropertiesService.getScriptProperties().getProperty('PLANT_RECEIVER_FOLDER_ID');
  if (folderId) {
    try { add(DriveApp.getFolderById(folderId)); }
    catch (ignored) { console.warn('Previous receiver folder could not be opened'); }
  }
  var sameName = DriveApp.getFoldersByName(PLANT_FOLDER_NAME);
  while (sameName.hasNext() && roots.length < 30) add(sameName.next());
  return roots;
}
function listPlantEntries_(roots) {
  var records = [], seen = {};
  roots.forEach(function(root) {
    var folders = root.getFolders();
    while (folders.hasNext()) {
      var folder = folders.next();
      var idMatch = folder.getName().match(/_([a-f0-9-]{36})$/i);
      if (!idMatch || !folder.getFilesByName('收件完成.txt').hasNext()) continue;
      var revision = idMatch[1];
      if (seen[revision]) continue;
      var summaries = folder.getFilesByName('觀察紀錄.json');
      if (!summaries.hasNext()) continue;
      try {
        var record = JSON.parse(summaries.next().getBlob().getDataAsString('UTF-8'));
        seen[revision] = true;
        records.push({
          revision: revision,
          name: String(record.name || '').slice(0,100),
          date: String(record.date || '').slice(0,20),
          location: String(record.location || '').slice(0,100),
          leafMarginName: String(record.leafMargin || '').slice(0,100),
          leafVenationName: String(record.leafVenation || '').slice(0,100),
          leafArrangementName: String(record.leafArrangement || '').slice(0,100),
          rootSystemName: String(record.rootSystem || '').slice(0,100),
          stemTypeName: String(record.stemType || '').slice(0,100),
          hasFlower: !!record.hasFlower,
          flowerDescription: String(record.flowerDescription || '').slice(0,200),
          mapX: typeof record.mapX === 'number' && record.mapX >= 0 && record.mapX <= 100 ? record.mapX : null,
          mapY: typeof record.mapY === 'number' && record.mapY >= 0 && record.mapY <= 100 ? record.mapY : null,
          photoCount: Math.min(3, Math.max(0, Number(record.photoCount) || 0)),
          submittedAt: String(record.submittedAt || '')
        });
      } catch (ignored) {
        console.warn('Skipping malformed observation for ' + revision);
      }
    }
  });
  records.sort(function(a,b) { return b.submittedAt.localeCompare(a.submittedAt); });
  return records;
}
/**
 * Search for older submissions whose parent folder is no longer configured as
 * the active receiver. Only this application's signed summary and receipt count.
 * Return a read-only proxy to avoid changing the active upload destination.
 */
function findLegacyPlantRoot_() {
  var folders = [], seen = {}, found;
  try {
    found = DriveApp.searchFiles("title = '觀察紀錄.json' and trashed = false");
    var scanned = 0;
    while (found.hasNext() && scanned++ < 300) {
      var file = found.next(), parents = file.getParents();
      while (parents.hasNext()) {
        var folder = parents.next();
        var match = folder.getName().match(/_([a-f0-9-]{36})$/i);
        if (!match || seen[match[1]]) continue;
        if (!folder.getFilesByName('收件完成.txt').hasNext()) continue;
        try {
          var summary = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
          if (summary.recipient !== PLANT_RECIPIENT || summary.uploadRevision !== match[1]) continue;
          seen[match[1]] = true;
          folders.push(folder);
        } catch (ignored) {}
      }
    }
  } catch (err) { console.warn('Legacy submissions not searchable: ' + err); }
  return {
    count: folders.length,
    getFolders: function() {
      var index = 0;
      return {
        hasNext: function() { return index < folders.length; },
        next: function() { return folders[index++]; }
      };
    }
  };
}
function publicGallery_(p) {
  var callback = String(p.callback || '');
  if (!/^__plantGallery_[a-f0-9]{32}$/.test(callback)) {
    return ContentService.createTextOutput('/* invalid callback */').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  try {
    var roots = findPlantRoots_();
    var recovered = 0;
    if (listPlantEntries_(roots).length === 0) {
      var archived = findLegacyPlantRoot_();
      recovered = archived.count;
      if (recovered) roots.push(archived);
    }
    if (p.action === 'photo') {
      var revision = String(p.revision || '');
      var index = Number(p.index || 1);
      if (!/^[a-f0-9-]{36}$/i.test(revision) || [1,2,3].indexOf(index) < 0) throw Error('照片索引錯誤');
      for (var rootIndex = 0; rootIndex < roots.length; rootIndex++) {
        var folders = roots[rootIndex].getFolders();
        while (folders.hasNext()) {
          var folder = folders.next();
          if (folder.getName().slice(-37) !== '_' + revision) continue;
          if (!folder.getFilesByName('收件完成.txt').hasNext()) continue;
          var photos = folder.getFiles();
          while (photos.hasNext()) {
            var file = photos.next();
            if (!new RegExp('^照片' + index + '\\.(jpg|png|webp)$', 'i').test(file.getName())) continue;
            var bytes = file.getBlob().getBytes();
            if (bytes.length > 850000) throw Error('照片過大');
            return jsonp_(callback, { ok: true, photo: 'data:' + file.getMimeType() + ';base64,' + Utilities.base64Encode(bytes) });
          }
        }
      }
      throw Error('找不到照片');
    }
    var all = listPlantEntries_(roots);
    var page = Math.max(0, Math.min(500, Number(p.page) || 0)), size = 12;
    var offset = page * size;
    return jsonp_(callback, {
      ok: true, records: all.slice(offset, offset+size),
      hasMore: all.length > offset+size,
      total: all.length, receiverFolders: roots.length, recoveredFolders: recovered
    });
  } catch (err) {
    console.error(err);
    return jsonp_(callback, { ok: false, error: '無法讀取共用圖鑑' });
  }
}

function jsonp_(callback, object) {
  var json = JSON.stringify(object).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
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
    if (!name) throw new Error('請填寫植物名稱。');
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

    var folderName = [name, revision].join('_');
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
          mapX: typeof record.mapX === 'number' && record.mapX >= 0 && record.mapX <= 100 ? record.mapX : null,
          mapY: typeof record.mapY === 'number' && record.mapY >= 0 && record.mapY <= 100 ? record.mapY : null,
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
  var roots = findPlantRoots_();
  // Prefer an existing folder that already contains submissions; do not split a class
  // between two folders when an older receiver folder is still accessible.
  var folder = roots.find(function(root) { return root.getFolders().hasNext(); }) || roots[0];
  if (!folder) folder = DriveApp.createFolder(PLANT_FOLDER_NAME);
  props.setProperty('PLANT_RECEIVER_FOLDER_ID', folder.getId());
  return folder;
}

function acknowledge_(requestId, result) {
  return ContentService.createTextOutput(JSON.stringify(Object.assign({
    type: 'minan-plant-upload-result',
    requestId: requestId
  }, result))).setMimeType(ContentService.MimeType.JSON);
}
