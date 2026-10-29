/** 悠悠水族箱作品收件。獨立專案，不要覆蓋既有生態池或鳥類服務。 */
var AQUARIUM_PHOTO_LIMIT = 1500000;
var AQUARIUM_PHOTO_DAILY_LIMIT = 150;
var AQUARIUM_PHOTO_STUDENT_LIMIT = 6;

/** 在老師自己的 Google 帳號中執行一次，建立私人資料夾並完成授權。 */
function setupAquariumPhotos() {
  var props = PropertiesService.getScriptProperties();
  // 如需其他收件信箱，僅在此處填入；不要把信箱放進公開網頁。
  var teacherEmail = props.getProperty('TEACHER_EMAIL') || Session.getEffectiveUser().getEmail();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacherEmail)) throw new Error('請先在指令碼屬性設定 TEACHER_EMAIL 為老師的收件信箱。');
  var folderId = props.getProperty('PHOTO_FOLDER_ID');
  var folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.createFolder('悠悠水族箱－學生作品');
  props.setProperties({ TEACHER_EMAIL: teacherEmail, PHOTO_FOLDER_ID: folder.getId() });
  // Read quota to request the send-mail permission without sending a test email.
  MailApp.getRemainingDailyQuota();
  console.log('作品資料夾：' + folder.getUrl());
  console.log('設定完成。請部署為網頁應用程式，以自己身分執行，存取權選任何人。');
}
function aquariumJSON_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() {
  // Do not expose teacher email, folder links, student records or receipt lookups.
  return aquariumJSON_({ service: 'youyou-aquarium-photos', version: 1 });
}
function aquariumValidate_(event) {
  var raw = event && event.postData && event.postData.contents;
  if (!raw || raw.length > 2100000) throw new Error('照片資料太大或不完整，請重新拍照。');
  var data;
  try { data = JSON.parse(raw); } catch (_) { throw new Error('作品資料讀取失敗，請重新拍照。'); }
  if (data.version !== 1 || !/^[A-Za-z0-9-]{12,80}$/.test(data.submissionId || '')) throw new Error('提交編號無效，請重新拍照。');
  if (typeof data.className !== 'string' || !/^[\u3400-\u9fffA-Za-z0-9０-９]{1,12}$/.test(data.className)) throw new Error('請確認班級。');
  if (typeof data.seat !== 'string' || !/^[1-9]\d?$/.test(data.seat)) throw new Error('請確認座號（1～99）。');
  if (typeof data.idea !== 'string' || Array.from(data.idea).length > 120) throw new Error('布置想法最多 120 個字。');
  if (typeof data.tankName !== 'string' || !data.tankName.trim() || Array.from(data.tankName).length > 30 || /[\u0000-\u001f]/.test(data.tankName)) throw new Error('魚缸名稱無效。');
  if (typeof data.capturedAt !== 'number' || !Number.isFinite(data.capturedAt) || data.capturedAt < Date.UTC(2020,0,1) || data.capturedAt > Date.now()+86400000) throw new Error('拍攝時間無效，請重新拍照。');
  if (typeof data.image !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(data.image)) throw new Error('只能提交水族箱 PNG 照片。');
  var bytes;
  try { bytes = Utilities.base64Decode(data.image.split(',')[1]); } catch (_) { throw new Error('照片內容不完整，請重新拍照。'); }
  var unsigned = function(i) { return bytes[i] & 255; };
  var signature=[137,80,78,71,13,10,26,10];
  if (bytes.length < 45 || bytes.length > AQUARIUM_PHOTO_LIMIT || !signature.every(function(v,i){return unsigned(i)===v;})) throw new Error('照片格式或大小不符合，請重新拍照。');
  var width=unsigned(16)*16777216+unsigned(17)*65536+unsigned(18)*256+unsigned(19);
  var height=unsigned(20)*16777216+unsigned(21)*65536+unsigned(22)*256+unsigned(23);
  if (width !== 1200 || height < 200 || height > 2400) throw new Error('照片尺寸不符，請從遊戲重新拍照。');
  // Only include validated fields; no client-provided destinations or HTML.
  return {version:1, submissionId:data.submissionId, className:data.className, seat:data.seat, idea:data.idea, tankName:data.tankName, capturedAt:data.capturedAt, bytes:bytes};
}
function aquariumHash_(data) {
  var meta=JSON.stringify([data.className,data.seat,data.idea,data.tankName,data.capturedAt]);
  var imageHash=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,data.bytes);
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,meta+Utilities.base64Encode(imageHash)).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');
}
function aquariumNotify_(record,file,data,props) {
  if (record.notification === 'sent') return;
  try {
    if (MailApp.getRemainingDailyQuota() < 1) return;
    var shotTime=Utilities.formatDate(new Date(data.capturedAt),'Asia/Taipei','yyyy/MM/dd HH:mm:ss');
    var receivedTime=Utilities.formatDate(new Date(record.at),'Asia/Taipei','yyyy/MM/dd HH:mm:ss');
    MailApp.sendEmail({
      to:props.getProperty('TEACHER_EMAIL'),
      subject:'【悠悠水族箱】'+data.className+'・'+data.seat+'號・作品提交',
      body:'班級：'+data.className+'\n座號：'+data.seat+'\n魚缸：'+data.tankName+'\n拍攝時間：'+shotTime+'\n提交時間：'+receivedTime+'\n布置想法：'+(data.idea||'未填寫')+'\n收件編號：'+record.receipt+'\n作品連結：'+file.getUrl(),
      attachments:[file.getBlob()], name:'悠悠水族箱作品收件'
    });
    record.notification='sent';
    // Keep both paths recoverable if a later property write fails.
    file.setDescription(JSON.stringify(record));
    props.setProperty('r_'+data.submissionId,JSON.stringify(record));
  } catch (_) {
    // A saved photo is still accepted if the mail service is unavailable.
    // The teacher can open the private Drive folder; no false delivery claim.
  }
}
function aquariumCleanup_(props,day) {
  if(props.getProperty('cleanupDay')===day)return;
  var entries=props.getProperties(),cutoff=Date.now()-7*86400000;
  Object.keys(entries).forEach(function(key){
    if(key.indexOf('r_')===0){try{if(JSON.parse(entries[key]).at<cutoff)props.deleteProperty(key);}catch(_){props.deleteProperty(key);}}
    if(key.indexOf('count_')===0 && key.indexOf('count_'+day+'_')!==0)props.deleteProperty(key);
  });
  props.setProperty('cleanupDay',day);
}
function doPost(event) {
  var lock;
  try {
    var data=aquariumValidate_(event),hash=aquariumHash_(data);
    var props=PropertiesService.getScriptProperties();
    if(!props.getProperty('PHOTO_FOLDER_ID')||!props.getProperty('TEACHER_EMAIL'))throw new Error('老師尚未開放收件，請先下載保存照片。');
    lock=LockService.getScriptLock();
    if(!lock.tryLock(12000))throw new Error('現在交作品的同學較多，照片已保留，請稍後重試。');
    var day=Utilities.formatDate(new Date(),'Asia/Taipei','yyyyMMdd');aquariumCleanup_(props,day);
    var root=DriveApp.getFolderById(props.getProperty('PHOTO_FOLDER_ID'));
    var folders=root.getFoldersByName(data.className),folder=folders.hasNext()?folders.next():null;
    var date=Utilities.formatDate(new Date(data.capturedAt),'Asia/Taipei','yyyyMMdd');
    var name=date+'_'+data.className+'_'+data.seat+'號_'+data.submissionId+'.png';
    var recordJSON=props.getProperty('r_'+data.submissionId),record=recordJSON?JSON.parse(recordJSON):null,file;
    if(record){
      if(record.hash!==hash)throw new Error('這個收件編號已用於其他作品，請重新拍照後傳送。');
      file=DriveApp.getFileById(record.fileId);
      if(file.isTrashed()||file.getSize()===0)throw new Error('原本的作品已移除，請重新拍照傳送。');
    } else {
      // Recover after a lost response/property-write failure, even after index expiry.
      var matches=folder?folder.getFilesByName(name):null;
      if(matches&&matches.hasNext()){
        file=matches.next();record=JSON.parse(file.getDescription());
        if(record.hash!==hash)throw new Error('作品編號重複，請重新拍照。');
      } else {
        var totalKey='count_'+day+'_all',studentKey='count_'+day+'_'+data.className+'_'+data.seat;
        var total=Number(props.getProperty(totalKey)||0),student=Number(props.getProperty(studentKey)||0);
        if(total>=AQUARIUM_PHOTO_DAILY_LIMIT)throw new Error('今天收件已達上限，請先下載照片，告訴老師。');
        if(student>=AQUARIUM_PHOTO_STUDENT_LIMIT)throw new Error('你今天已交了 6 份作品，請先下載照片，告訴老師。');
        // Reserve the quota before writing so failed services cannot bypass the cap.
        props.setProperties((function(){var v={};v[totalKey]=String(total+1);v[studentKey]=String(student+1);return v;})());
        if(!folder)folder=root.createFolder(data.className);
        file=folder.createFile(Utilities.newBlob(data.bytes,'image/png',name));
        if(file.getSize()!==data.bytes.length)throw new Error('照片尚未完整儲存，請稍後重試。');
        record={hash:hash,receipt:Utilities.getUuid(),fileId:file.getId(),notification:'pending',at:Date.now()};
        file.setDescription(JSON.stringify(record));
      }
      props.setProperty('r_'+data.submissionId,JSON.stringify(record));
    }
    aquariumNotify_(record,file,data,props);
    return aquariumJSON_({ok:true,submissionId:data.submissionId,receipt:record.receipt,notification:record.notification});
  } catch(error) {
    var message=error&&error.message||'';
    // Do not reveal internal Google exceptions, account names or resource IDs.
    var safe=/^(照片|作品|提交|只能|班級|座號|請|布置|魚缸|拍攝|老師|現在|今天|你今天|這個|原本)/.test(message)?message:'收件服務暫時無法使用，照片已保留，請稍後重試。';
    return aquariumJSON_({ok:false,error:safe});
  } finally { if(lock&&lock.hasLock())lock.releaseLock(); }
}
