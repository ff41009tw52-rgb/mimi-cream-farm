/* Service contract tests: no Google account, real email or browser required. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const root=require('node:path').resolve(__dirname,'../..');
const read=p=>fs.readFileSync(require('node:path').join(root,p),'utf8');
function front(fetch){const c=vm.createContext({window:{},fetch,AbortController,setTimeout,clearTimeout,TypeError,crypto});vm.runInContext(read('assets/aquarium-v06/photo-share.js'),c);return c.window.AquariumPhotoShare;}
const payload={submissionId:'test-submission-1234'};
function service({mailFails=false,writeFails=false}={}){
 const props=new Map([['PHOTO_FOLDER_ID','root'],['TEACHER_EMAIL','teacher@example.test']]),files=new Map(),folders=new Map(),sent=[];
 let serial=0,locked=false;
 const iterator=values=>{let i=0;return {hasNext:()=>i<values.length,next:()=>values[i++]};};
 function folder(id){const f={id,children:[],files:[],getId:()=>id,getUrl:()=>`https://drive.google.com/${id}`,getFoldersByName:name=>iterator(f.children.filter(c=>c.name===name)),createFolder:name=>{const c=folder('folder-'+(++serial));c.name=name;f.children.push(c);return c;},getFilesByName:name=>iterator(f.files.filter(x=>x.name===name&&!x.trashed)),createFile:blob=>{
  if(writeFails)throw Error('Drive unavailable');
  const file={name:blob.name,blob,id:'file-'+(++serial),description:'',getId(){return this.id;},getSize(){return blob.bytes.length;},isTrashed(){return !!this.trashed;},getDescription(){return this.description;},setDescription(value){this.description=value;},getBlob(){return this.blob;},getUrl(){return 'https://drive.google.com/file/'+this.id;}};
  f.files.push(file);files.set(file.id,file);return file;
 }};folders.set(id,f);return f;}
 folder('root');
 const propertyService={getProperty:key=>props.get(key)||null,setProperty:(key,value)=>props.set(key,value),setProperties:values=>Object.entries(values).forEach(([k,v])=>props.set(k,v)),getProperties:()=>Object.fromEntries(props),deleteProperty:key=>props.delete(key)};
 const c=vm.createContext({console,Date,Array,Number,JSON,Error,PropertiesService:{getScriptProperties:()=>propertyService},LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true;},hasLock:()=>locked,releaseLock:()=>{locked=false;}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},DriveApp:{getFolderById:id=>folders.get(id),getFileById:id=>{if(!files.has(id))throw Error('File not found');return files.get(id);}},MailApp:{getRemainingDailyQuota:()=>100,sendEmail:email=>{if(mailFails)throw Error('Mail unavailable');sent.push(email);}},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,value)=>[...crypto.createHash('sha256').update(typeof value==='string'?value:Buffer.from(value)).digest()],base64Decode:value=>[...Buffer.from(value,'base64')],base64Encode:value=>Buffer.from(value).toString('base64'),newBlob:(bytes,type,name)=>({bytes,type,name}),getUuid:()=>crypto.randomUUID(),formatDate:(date,zone,format)=>format==='yyyyMMdd'?new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date).replaceAll('-',''):date.toISOString()}});
 vm.runInContext(read('google-apps-script/aquarium-photo/Code.gs'),c);
 const png=Buffer.alloc(60);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(1200,16);png.writeUInt32BE(800,20);
 const valid={version:1,submissionId:'photo-test-1234567890',className:'四年三班',seat:'12',idea:'留下游泳的空間',tankName:'小天地',capturedAt:Date.now(),image:'data:image/png;base64,'+png.toString('base64')};
 const post=data=>c.doPost({postData:{contents:JSON.stringify(data)}});
 return {c,post,valid,files,folders,sent,props};
}
(async()=>{
 let request;
 const f=front(async(url,options)=>{request={url,options};return {ok:true,json:async()=>({ok:true,submissionId:payload.submissionId,receipt:'receipt-1',notification:'sent'})};});
 assert.equal((await f.send(payload,'https://example.test')).receipt,'receipt-1');assert.equal(request.options.headers['Content-Type'],'text/plain;charset=UTF-8');assert.equal(request.options.credentials,'omit');assert.notEqual(request.options.mode,'no-cors');
 const normalized=f.validFields({className:' 四年三班 ',seat:'02',idea:' 水草 '});assert.equal(normalized.seat,'2');assert.equal(normalized.className,'四年三班');
 for(const patch of [{className:'<script>'},{seat:'0'},{seat:'100'},{seat:'2e1'},{idea:'魚'.repeat(121)}])assert.throws(()=>f.validFields({className:'403',seat:'1',idea:'',...patch}));
 for(const result of [{ok:false,error:'拒收'},{ok:true,submissionId:'other',receipt:'abc'},{ok:true,submissionId:payload.submissionId},{ok:true,receipt:'abc'}])await assert.rejects(()=>front(async()=>({ok:true,json:async()=>result})).send(payload,'https://example.test'));
 await assert.rejects(()=>front(async()=>({ok:true,json:async()=>{throw Error('Login HTML');}})).send(payload,'https://example.test'));
 await assert.rejects(()=>front(async()=>{throw new TypeError('Network');}).send(payload,'https://example.test'),/照片已保留/);
 assert.equal((await front(async()=>({ok:true,json:async()=>({ok:true,submissionId:payload.submissionId,receipt:'abc',notification:'pending'})})).send(payload,'https://example.test')).notification,'pending');
 const s=service(),first=s.post(s.valid);assert.equal(first.ok,true);assert.equal(s.files.size,1);assert.equal(s.sent.length,1);assert.equal(s.sent[0].to,'teacher@example.test');assert.equal(s.sent[0].attachments.length,1);
 const repeated=s.post(s.valid);assert.equal(repeated.receipt,first.receipt);assert.equal(s.files.size,1);assert.equal(s.sent.length,1);
 assert.equal(s.post({...s.valid,idea:'different'}).ok,false);assert.equal(s.files.size,1);
 s.props.delete('r_'+s.valid.submissionId);assert.equal(s.post(s.valid).receipt,first.receipt);assert.equal(s.files.size,1);
 for(const patch of [{className:'<script>'},{seat:'0'},{idea:'魚'.repeat(121)},{image:'data:image/png;base64,AAAA'},{tankName:'\u0000'},{capturedAt:'today'},{image:s.valid.image+'!!'}])assert.equal(s.post({...s.valid,...patch}).ok,false);
 assert.equal(s.post({...s.valid,submissionId:'other-id-123456',className:'四年四班'}).ok,true);assert.equal(s.folders.get('root').children.length,2);
 const noMail=service({mailFails:true});const accepted=noMail.post(noMail.valid);assert.equal(accepted.ok,true);assert.equal(accepted.notification,'pending');assert.equal(noMail.post(noMail.valid).receipt,accepted.receipt);assert.equal(noMail.files.size,1);
 const noDrive=service({writeFails:true});assert.equal(noDrive.post(noDrive.valid).ok,false);assert.equal(noDrive.sent.length,0);
 const limited=service();limited.c.AQUARIUM_PHOTO_STUDENT_LIMIT=1;const one=limited.post(limited.valid);assert(one.ok);assert.equal(limited.post({...limited.valid,submissionId:'second-new-photo-1234'}).ok,false);assert.equal(limited.post(limited.valid).receipt,one.receipt);
 const total=service();total.c.AQUARIUM_PHOTO_DAILY_LIMIT=1;assert(total.post(total.valid).ok);assert.equal(total.post({...total.valid,submissionId:'new-photo-test-22222',seat:'13'}).ok,false);
 assert.deepEqual(JSON.parse(JSON.stringify(s.c.doGet())),{service:'youyou-aquarium-photos',version:1});
 console.log('PASS photo contract: validated fields; confirmed responses only; preserved network failures; private Drive storage; idempotent retries/recovery; metadata conflicts; class folders; mail failure; Drive failure; student/global quota.');
})().catch(error=>{console.error(error);process.exitCode=1;});
