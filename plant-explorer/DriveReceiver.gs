/** Upload-only receiver. Deploy ONLY as zx5566zero@apps.ntpc.edu.tw.
 * Files stay private in the owner's Drive. No list, delete, or public sharing API.
 */
const PLANT_OWNER = 'zx5566zero@apps.ntpc.edu.tw';
function setupPlantReceiver() {
  assertOwner_();
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('FOLDER_ID')) {
    const folder = DriveApp.createFolder('植物探索家_學生觀察作品');
    props.setProperty('FOLDER_ID', folder.getId());
  }
  // Set CLASS_CODE in Project settings -> Script properties before accepting work.
  console.log('收件資料夾：' + DriveApp.getFolderById(props.getProperty('FOLDER_ID')).getUrl());
}
function assertOwner_() {
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== PLANT_OWNER) {
    throw new Error('請使用指定的學校帳號部署與執行。');
  }
}
function doGet() { return json_({ok:false, error:'此網址僅供植物探索家交件，沒有公開檔案清單。'}); }
function doPost(e) {
  let lock;
  try {
    assertOwner_();
    const props = PropertiesService.getScriptProperties();
    const code = props.getProperty('CLASS_CODE');
    if (!code || !props.getProperty('FOLDER_ID')) throw new Error('老師尚未完成收件設定。');
    if (!e || !e.postData || e.postData.contents.length > 3300000) throw new Error('交件內容過大。');
    const body = JSON.parse(e.postData.contents);
    if (typeof body.classCode !== 'string' || body.classCode !== code) throw new Error('交件碼不正確，請向老師確認。');
    const r = validateRecord_(body.record);
    lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw new Error('收件忙碌中，請稍後重試。');
    const root = DriveApp.getFolderById(props.getProperty('FOLDER_ID'));
    const receipts = root.getFoldersByName('收件_' + r.uploadRevision);
    let folder = receipts.hasNext() ? receipts.next() : null;
    // A completed marker is written last, so interrupted attempts can be retried.
    if (folder && folder.getFilesByName('收件完成.json').hasNext()) return json_({ok:true,receipt:r.uploadRevision,recipient:PLANT_OWNER});
    const day = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
    const counterKey = 'DAILY_' + day;
    const used = Number(props.getProperty(counterKey) || 0);
    if (used >= 300) throw new Error('今日收件上限已到，請先保存本機，明天再傳。');
    props.setProperty(counterKey, String(used + 1));
    if (!folder) folder = root.createFolder('收件_' + r.uploadRevision);
    const filename = [r.className,r.groupName,r.name].map(sanitize_).join('_');
    r.photos.forEach((photo,i)=>{
      const name = filename + '_' + (i+1) + '.jpg';
      if (!folder.getFilesByName(name).hasNext()) {
        const bytes = Utilities.base64Decode(photo.split(',')[1]);
        if (bytes.length < 4 || (bytes[0]&255)!==255 || (bytes[1]&255)!==216) throw new Error('照片格式不正確。');
        folder.createFile(Utilities.newBlob(bytes,'image/jpeg',name));
      }
    });
    const recordName = filename + '_觀察紀錄.json';
    if (!folder.getFilesByName(recordName).hasNext()) {
      const metadata = Object.assign({},r,{photos:r.photos.map((p,i)=>filename+'_'+(i+1)+'.jpg'),receivedAt:new Date().toISOString()});
      folder.createFile(recordName,JSON.stringify(metadata,null,2),MimeType.PLAIN_TEXT);
    }
    folder.createFile('收件完成.json',JSON.stringify({receipt:r.uploadRevision,receivedAt:new Date().toISOString()}),MimeType.PLAIN_TEXT);
    // Remove old day counters, not student data.
    Object.keys(props.getProperties()).filter(k=>k.startsWith('DAILY_')&&k!==counterKey).forEach(k=>props.deleteProperty(k));
    return json_({ok:true,receipt:r.uploadRevision,recipient:PLANT_OWNER});
  } catch(err) { return json_({ok:false,error:err.message||'收件失敗，請保留本機紀錄再試。'}); }
  finally { if(lock && lock.hasLock()) lock.releaseLock(); }
}
function validateRecord_(value) {
  if (!value || typeof value !== 'object') throw new Error('缺少觀察紀錄。');
  const r = {};
  ['id','uploadRevision','name','className','groupName','location','date','flowerDescription'].forEach(key=>{
    if (typeof value[key] !== 'string') throw new Error('欄位格式不正確：'+key);
    r[key] = value[key].slice(0,key==='flowerDescription'?2000:100);
  });
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(r.uploadRevision)) throw new Error('交件編號不正確。');
  if (!r.name.trim() || !r.className.trim() || !r.groupName.trim()) throw new Error('請填植物名稱、班級與組別。');
  r.photos = value.photos;
  if (!Array.isArray(r.photos)||r.photos.length<1||r.photos.length>3 || r.photos.some(p=>typeof p!=='string'||p.length>1000000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p))) throw new Error('請提供 1 至 3 張壓縮後的 JPG 照片。');
  const allowed = {leafMargin:['entire','serrated','wavy','lobed','unknown'],leafVenation:['net','parallel','unknown'],leafArrangement:['alternate','opposite','whorled','clustered','unknown'],rootSystem:['taproot','fibrous','unknown'],stemType:['herbaceous','woody','vine','unknown']};
  Object.keys(allowed).forEach(k=>{if(!allowed[k].includes(value[k]))throw new Error('觀察特徵不完整。');r[k]=value[k];r[k+'Name']=String(value[k+'Name']||'').slice(0,40);});
  r.hasFlower = value.hasFlower===true;
  return r;
}
function sanitize_(s) { return s.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,70); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
