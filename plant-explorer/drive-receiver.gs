/** Plant Explorer v5. Anonymous shared editing with immutable revision history.
 * Never moves, overwrites, deletes or publicly shares existing Drive files.
 * Update the EXISTING deployment; keep its URL and script properties.
 */
var PLANT_RECIPIENT='zx5566zero@apps.ntpc.edu.tw';
var PLANT_FOLDER_NAME='植物探索家_學生觀察作品';
var PLANT_SCHEMA='minan-plants-v5';
var PLANT_KNOWN_RECEIPTS=['ab063e17-d843-477a-b512-6296058fb510','24c4ccf4-be58-4d5d-9053-251cdb6d5af8'];
var PLANT_CHOICES={leafMargin:{entire:'全緣',serrated:'鋸齒狀',wavy:'波浪緣',lobed:'裂葉'},leafVenation:{net:'網狀脈',parallel:'平行脈'},leafArrangement:{alternate:'互生',opposite:'對生',whorled:'輪生',clustered:'簇生 / 叢生'},rootSystem:{taproot:'軸根系',fibrous:'鬚根系'},stemType:{herbaceous:'草本',woody:'木本',vine:'藤本'}};
function assertPlantOwner_(){if(Session.getEffectiveUser().getEmail().toLowerCase()!==PLANT_RECIPIENT)throw Error('Wrong deployment owner');}
function plantRevision_(s){return /^[a-zA-Z0-9-]{16,100}$/.test(String(s||''));}
function plantIterator_(it){var a=[];while(it.hasNext())a.push(it.next());return a;}
function findPlantRoots_(){
 var props=PropertiesService.getScriptProperties(),roots=[],seen={};
 function addId(id){if(!id||seen[id])return;var f=DriveApp.getFolderById(id);if(f.isTrashed&&f.isTrashed())return;seen[id]=true;roots.push(f);}
 ['PLANT_RECEIVER_FOLDER_ID','FOLDER_ID'].forEach(function(k){var id=props.getProperty(k);if(id){try{addId(id);}catch(e){console.warn('Configured root inaccessible: '+k);}}});
 var prior=[];try{prior=JSON.parse(props.getProperty('PLANT_READ_ROOT_IDS')||'[]');}catch(e){}
 prior.forEach(function(id){try{addId(id);}catch(e){console.warn('Archived root inaccessible');}});
 var names=DriveApp.getFoldersByName(PLANT_FOLDER_NAME);while(names.hasNext()){var f=names.next();addId(f.getId());}
 return roots;
}
function plantFolderRecord_(folder,trusted){
 var files=plantIterator_(folder.getFiles()),summaryFile=files.filter(function(f){return /(?:^|_)觀察紀錄\.json$/i.test(f.getName());})[0];
 if(!summaryFile)return null;
 var markers=files.filter(function(f){return /^收件完成\.(txt|json)$/.test(f.getName());});
 if(!markers.length)return null;
 var r=JSON.parse(summaryFile.getBlob().getDataAsString('UTF-8'));
 var match=folder.getName().match(/(?:^|_)([a-f0-9]{8}-[a-f0-9-]{27})$/i);
 var revision=String(r.uploadRevision||r.revision||(match&&match[1])||'');
 if(!plantRevision_(revision)){var marker=markers[0].getBlob().getDataAsString('UTF-8');try{revision=JSON.parse(marker).receipt||'';}catch(e){var m=marker.match(/[a-f0-9]{8}-[a-f0-9-]{27}/i);revision=m?m[0]:'';}}
 if(!plantRevision_(revision))return null;
 if(!trusted&&r.recipient!==PLANT_RECIPIENT&&PLANT_KNOWN_RECEIPTS.indexOf(revision)<0)return null;
 var images=files.filter(function(f){return /^image\/(jpeg|png|webp)$/.test(f.getMimeType())&&/\.(jpg|jpeg|png|webp)$/i.test(f.getName());});
 images.sort(function(a,b){return a.getName().localeCompare(b.getName(),undefined,{numeric:true});});
 if(Array.isArray(r.photos)&&r.photos.every(function(x){return typeof x==='string'&&!x.startsWith('data:');})){var order=r.photos;images.sort(function(a,b){var x=order.indexOf(a.getName()),y=order.indexOf(b.getName());return (x<0?99:x)-(y<0?99:y);});}
 // Public object is a strict allowlist, never a spread of private summary data.
 var out={revision:revision,recordKey:plantRevision_(r.recordKey)?String(r.recordKey):revision,version:Math.max(1,Number(r.version)||1),name:String(r.name||'待辨識植物').slice(0,100),date:String(r.date||'').slice(0,20),location:String(r.location||'').slice(0,100),hasFlower:r.hasFlower===true,flowerDescription:String(r.flowerDescription||'').slice(0,2000),mapX:typeof r.mapX==='number'&&r.mapX>=0&&r.mapX<=100?r.mapX:null,mapY:typeof r.mapY==='number'&&r.mapY>=0&&r.mapY<=100?r.mapY:null,photoCount:Math.min(3,images.length),submittedAt:String(r.submittedAt||r.receivedAt||(r.createdAt?new Date(r.createdAt).toISOString():''))};
 Object.keys(PLANT_CHOICES).forEach(function(k){var raw=String(r[k]||''),label=String(r[k+'Name']||PLANT_CHOICES[k][raw]||(raw==='unknown'?'未觀察到／無法判斷':raw));out[k+'Name']=label.slice(0,100);out[k]=PLANT_CHOICES[k][raw]?raw:(Object.keys(PLANT_CHOICES[k]).filter(function(c){return PLANT_CHOICES[k][c]===label;})[0]||(raw==='unknown'?'unknown':''));});
 return {public:out,folder:folder,photos:images.slice(0,3)};
}
function collectPlantEntries_(){
 var roots=findPlantRoots_(),entries={},visited={},warnings=0,scanned=0;
 function readFolder(folder,depth,trusted){if(folder.isTrashed&&folder.isTrashed())return;if(visited[folder.getId()])return;visited[folder.getId()]=true;if(++scanned>5000)throw Error('Too many folders; administrator indexing required');
  try{var entry=plantFolderRecord_(folder,trusted);if(entry){var id=entry.public.revision;if(!entries[id]||entry.photos.length>entries[id].photos.length)entries[id]=entry;return;}}catch(e){warnings++;console.warn('Unreadable observation '+folder.getId());}
  if(depth>0){var children=folder.getFolders();while(children.hasNext())readFolder(children.next(),depth-1,trusted);}
 }
 roots.forEach(function(r){readFolder(r,4,true);});
 // Read-only recovery for older app summaries stored outside the currently configured root.
 var legacy=DriveApp.searchFiles("trashed = false and (title = '觀察紀錄.json' or title contains '_觀察紀錄.json')");
 var searched=0;while(legacy.hasNext()&&searched++<1000){var file=legacy.next(),parents=file.getParents();while(parents.hasNext()){var f=parents.next();if(!visited[f.getId()])readFolder(f,0,false);}}
 var list=Object.keys(entries).map(function(k){return entries[k];});list.sort(function(a,b){return b.public.submittedAt.localeCompare(a.public.submittedAt)||a.public.revision.localeCompare(b.public.revision);});
 // Missing receipts may have been intentionally removed by the teacher.
 // Only actual read errors are warnings; never resurrect deleted gallery rows.
 return {entries:list,roots:roots,warnings:warnings};
}
function jsonp_(callback,value){var json=JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);}
function plantJSON_(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}
function publicPlantIndex_(fresh){
 var cache=CacheService.getScriptCache(),key='plant_index_v5',raw=!fresh&&cache.get(key);
 if(raw){try{var v=JSON.parse(raw);return {entries:v.entries.map(function(e){return {public:e.public,folderId:e.folderId,photoIds:e.photoIds};}),rootCount:v.rootCount,warnings:v.warnings};}catch(e){}}
 var d=collectPlantEntries_(),value={entries:d.entries.map(function(e){return {public:e.public,folderId:e.folder.getId(),photoIds:e.photos.map(function(f){return f.getId();})};}),rootCount:d.roots.length,warnings:d.warnings};
 var encoded=JSON.stringify(value);if(value.entries.length&&encoded.length<90000)cache.put(key,encoded,30);
 return value;
}
function latestPlantEntries_(entries){
 var latest={};
 entries.forEach(function(e){var key=e.public.recordKey||e.public.revision,old=latest[key];if(!old||e.public.version>old.public.version||(e.public.version===old.public.version&&e.public.submittedAt>old.public.submittedAt))latest[key]=e;});
 return Object.keys(latest).map(function(k){return latest[k];}).sort(function(a,b){return b.public.submittedAt.localeCompare(a.public.submittedAt)||a.public.recordKey.localeCompare(b.public.recordKey);});
}
function doGet(e){
 var p=e&&e.parameter||{},callback=String(p.callback||p.prefix||''),validCallback=/^__(?:plantGallery|plantStatus)_[a-f0-9]{32}$/i.test(callback);
 if(!validCallback)return plantJSON_({ok:true,schema:PLANT_SCHEMA,service:'Plant Explorer'});
 try{
  assertPlantOwner_();var data=publicPlantIndex_(p.fresh==='1'||p.action==='status'),all=data.entries,list=latestPlantEntries_(all);
  if(p.action==='status'){
   if(!plantRevision_(p.receipt))throw Error('Invalid receipt');
   var exists=all.some(function(x){return x.public.revision===p.receipt;}),current=list.filter(function(x){return x.public.recordKey===p.recordKey;})[0];
   var conflict=!exists&&plantRevision_(p.recordKey)&&!!current&&(!p.baseRevision||current.public.revision!==p.baseRevision);
   return jsonp_(callback,{ok:true,sent:exists,conflict:conflict,receipt:p.receipt,recipient:PLANT_RECIPIENT,schema:PLANT_SCHEMA});
  }
  if(p.action==='photo'){
   var entry=all.filter(function(x){return x.public.revision===p.revision;})[0],index=Number(p.index||1);
   if(!entry||![1,2,3].includes(index)||!entry.photoIds[index-1])throw Error('Photo unavailable');
   var file=DriveApp.getFileById(entry.photoIds[index-1]),blob=file.getBlob();if(file.getSize()>900000)throw Error('Photo too large');
   return jsonp_(callback,{ok:true,revision:p.revision,index:index,photo:'data:'+file.getMimeType()+';base64,'+Utilities.base64Encode(blob.getBytes()),schema:PLANT_SCHEMA});
  }
  if(p.action==='gallery'){
   var page=Math.max(0,Math.min(500,Number(p.page)||0)),offset=page*24;
   var snapshot=Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(list.map(function(x){return [x.public.recordKey,x.public.revision,x.public.photoCount];})))).slice(0,32);
   return jsonp_(callback,{ok:true,records:list.slice(offset,offset+24).map(function(x){return x.public;}),hasMore:list.length>offset+24,total:list.length,snapshot:snapshot,receiverFolders:data.rootCount,warnings:data.warnings,schema:PLANT_SCHEMA,capabilities:{nameOnly:true,sharedEditing:true}});
  }
  throw Error('Unknown query');
 }catch(err){console.error(err);return jsonp_(callback,{ok:false,error:'雲端讀取失敗，請稍後重試；原始作品未更動。',schema:PLANT_SCHEMA});}
}
function getRootFolder_(){var props=PropertiesService.getScriptProperties(),id=props.getProperty('PLANT_RECEIVER_FOLDER_ID')||props.getProperty('FOLDER_ID');if(id)return DriveApp.getFolderById(id);var roots=findPlantRoots_();var root=roots.filter(function(r){return r.getFolders().hasNext();})[0]||roots[0]||DriveApp.createFolder(PLANT_FOLDER_NAME);props.setProperty('PLANT_RECEIVER_FOLDER_ID',root.getId());return root;}
function cleanPart_(v,n){return String(v==null?'':v).trim().replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,n);}
function doPost(e){var lock;
 try{
  assertPlantOwner_();var text=e&&e.parameter&&e.parameter.payload;if(!text||text.length>4000000)throw Error('Invalid payload');
  var payload=JSON.parse(text),r=payload.record||{},revision=String(r.uploadRevision||'');
  if(payload.version!==3||!plantRevision_(revision))throw Error('Invalid revision');if(!cleanPart_(r.name,100))throw Error('Plant name required');
  if(!Array.isArray(r.photos)||r.photos.length>3)throw Error('0–3 photos allowed');
  var images=r.photos.map(function(photo){var m=typeof photo==='string'&&photo.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);if(!m||photo.length>1050000)throw Error('Invalid photo');var bytes=Utilities.base64Decode(m[2]);if(bytes.length>800000)throw Error('Photo too large');return {bytes:bytes,mime:'image/'+m[1],ext:m[1]==='jpeg'?'jpg':m[1]};});
  lock=LockService.getScriptLock();lock.waitLock(20000);
  var all=collectPlantEntries_().entries,existing=all.filter(function(x){return x.public.revision===revision;})[0];
  if(existing)return plantJSON_({ok:true,receipt:revision,recipient:PLANT_RECIPIENT});
  var recordKey=plantRevision_(r.recordKey)?String(r.recordKey):revision,baseRevision=String(r.baseRevision||'');
  var previous=latestPlantEntries_(all).filter(function(x){return x.public.recordKey===recordKey;})[0];
  if(previous&&previous.public.revision!==baseRevision)throw Error('EDIT_CONFLICT');
  if(!previous&&baseRevision)throw Error('EDIT_TARGET_UNAVAILABLE');
  var props=PropertiesService.getScriptProperties(),day=Utilities.formatDate(new Date(),'Asia/Taipei','yyyy-MM-dd'),key='PLANT_DAILY_'+day,used=Number(props.getProperty(key)||0);
  if(used>=500)throw Error('Daily submission limit');props.setProperty(key,String(used+1));
  // Every accepted edit is a new folder. Earlier summaries and photos are never modified.
  var root=getRootFolder_(),folderName=cleanPart_(r.name,100)+'_'+revision,found=root.getFoldersByName(folderName),folder=found.hasNext()?found.next():root.createFolder(folderName);
  images.forEach(function(photo,i){var name='照片'+(i+1)+'.'+photo.ext;if(!folder.getFilesByName(name).hasNext())folder.createFile(Utilities.newBlob(photo.bytes,photo.mime,name));});
  var summary={recipient:PLANT_RECIPIENT,uploadRevision:revision,recordKey:recordKey,baseRevision:baseRevision,version:previous?previous.public.version+1:1,recordId:cleanPart_(r.id,100),name:cleanPart_(r.name,100),date:cleanPart_(r.date,20),location:cleanPart_(r.location,100),hasFlower:r.hasFlower===true,flowerDescription:cleanPart_(r.flowerDescription,2000),mapX:typeof r.mapX==='number'&&r.mapX>=0&&r.mapX<=100?r.mapX:null,mapY:typeof r.mapY==='number'&&r.mapY>=0&&r.mapY<=100?r.mapY:null,photoCount:images.length,submittedAt:new Date().toISOString()};
  Object.keys(PLANT_CHOICES).forEach(function(k){summary[k]=cleanPart_(r[k],30);summary[k+'Name']=cleanPart_(r[k+'Name'],100);});
  if(!folder.getFilesByName('觀察紀錄.json').hasNext())folder.createFile('觀察紀錄.json',JSON.stringify(summary,null,2),MimeType.PLAIN_TEXT);
  if(!folder.getFilesByName('收件完成.txt').hasNext())folder.createFile('收件完成.txt','交件編號：'+revision,MimeType.PLAIN_TEXT);
  CacheService.getScriptCache().remove('plant_index_v5');
  return plantJSON_({ok:true,receipt:revision,recipient:PLANT_RECIPIENT});
 }catch(err){console.error(err);return plantJSON_({ok:false,error:String(err.message||'Upload failed').slice(0,160)});}finally{if(lock&&lock.hasLock())lock.releaseLock();}
}
/** Owner-only editor diagnostic. This function has no public HTTP route. */
function auditPlantData(){assertPlantOwner_();var d=collectPlantEntries_();console.log('ROOTS '+JSON.stringify(d.roots.map(function(r){return {id:r.getId(),name:r.getName()};})));console.log('TOTAL '+d.entries.length+' WARNINGS '+d.warnings);d.entries.forEach(function(e){console.log(JSON.stringify({revision:e.public.revision,folderId:e.folder.getId(),name:e.public.name,photos:e.photos.map(function(f){return {name:f.getName(),id:f.getId(),bytes:f.getSize()};})}));});}
