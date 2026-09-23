const PLANTS = new Set(['water-lettuce','duckweed','water-hyacinth','hydrilla','water-lily','yellow-water-lily','lotus']);
const PLANT_NAMES = { 'water-lettuce':'大萍', duckweed:'浮萍', 'water-hyacinth':'布袋蓮', hydrilla:'水蘊草', 'water-lily':'睡蓮', 'yellow-water-lily':'臺灣萍蓬草', lotus:'荷花' };
const CLASSES = Object.freeze(['307','308','309','310','311','312','313']);
const CLASS_SET = new Set(CLASSES);
const CATEGORIES = new Set(['漂浮植物','沉水植物','浮葉植物','挺水植物']);
const ALLOWED_ORIGINS = new Set(['https://ff41009tw52-rgb.github.io','http://localhost:4173','http://127.0.0.1:4173','http://localhost:5500','http://127.0.0.1:5500']);
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const encoder = new TextEncoder();

function cors(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://ff41009tw52-rgb.github.io';
  return { 'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}

function json(data, status = 200, origin = '') { return new Response(JSON.stringify(data), { status, headers: { ...cors(origin), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control':'no-store' } }); }
function clean(value, max) { return String(value ?? '').normalize('NFKC').trim().replace(/[<>]/g, '').slice(0, max); }
function base64url(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function randomToken(size = 32) { const bytes = new Uint8Array(size); crypto.getRandomValues(bytes); return base64url(bytes); }
async function sha256(value) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map((byte) => byte.toString(16).padStart(2,'0')).join(''); }
async function hmac(secret, value) { const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']); return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))); }
function safeEqual(left, right) { const a = encoder.encode(String(left)); const b = encoder.encode(String(right)); if (a.length !== b.length) return false; let result = 0; for (let i=0;i<a.length;i++) result |= a[i] ^ b[i]; return result === 0; }

async function readJson(request, limit = 20000) {
  const length = Number(request.headers.get('Content-Length') || 0); if (length > limit) throw Object.assign(new Error('資料內容過大。'), { status:413 });
  const text = await request.text(); if (text.length > limit) throw Object.assign(new Error('資料內容過大。'), { status:413 });
  try { return JSON.parse(text || '{}'); } catch { throw Object.assign(new Error('資料格式錯誤。'), { status:400 }); }
}

async function studentFromRequest(request, env) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i,''); if (!token) return null;
  const hash = await sha256(token); const row = await env.AQUATIC_DB.prepare('SELECT s.* FROM student_devices d JOIN students s ON s.id=d.student_id WHERE d.token_hash=?').bind(hash).first();
  if (row) env.AQUATIC_DB.prepare('UPDATE student_devices SET last_used_at=CURRENT_TIMESTAMP WHERE token_hash=?').bind(hash).run().catch(()=>{});
  return row;
}

async function makeTeacherToken(env) { const exp = Math.floor(Date.now()/1000) + 8*60*60; const payload = `teacher.${exp}`; return `${payload}.${await hmac(env.SESSION_SECRET, payload)}`; }
async function isTeacher(request, env) { const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i,''); const match = token.match(/^teacher\.(\d+)\.([A-Za-z0-9_-]+)$/); if (!match || Number(match[1]) < Date.now()/1000 || !env.SESSION_SECRET) return false; const payload = `teacher.${match[1]}`; return safeEqual(match[2], await hmac(env.SESSION_SECRET, payload)); }

function studentJson(row) { return { id:row.id, className:row.class_name, seatNumber:Number(row.seat_number), createdAt:row.created_at, updatedAt:row.updated_at }; }
function observationJson(row) { return { plantId:row.plant_id, answers:JSON.parse(row.answers_json || '{}'), notFound:Boolean(row.not_found), completed:Boolean(row.completed), hasPhoto:Boolean(row.photo_key), updatedAt:row.updated_at }; }

async function recordFor(env, studentId) {
  const observations = await env.AQUATIC_DB.prepare('SELECT * FROM observations WHERE student_id=? ORDER BY updated_at').bind(studentId).all();
  const summary = await env.AQUATIC_DB.prepare('SELECT * FROM student_summaries WHERE student_id=?').bind(studentId).first();
  return { observations:(observations.results || []).map(observationJson), classification:summary ? JSON.parse(summary.classification_json || '{}') : {}, summary:summary ? { classificationReason:summary.classification_reason, reflection:summary.reflection, completedAt:summary.completed_at } : null };
}

async function handleProfile(request, env, origin) {
  const body = await readJson(request); const className=clean(body.className,3), seat=Number(clean(body.seatNumber,2));
  if (!CLASS_SET.has(className) || !Number.isInteger(seat) || seat<1 || seat>25) return json({ error:'請選擇班級，並輸入 1～25 的座號。' },400,origin);
  const seatNumber=String(seat);
  let student = await env.AQUATIC_DB.prepare('SELECT * FROM students WHERE class_name=? AND seat_number=? ORDER BY created_at LIMIT 1').bind(className,seatNumber).first();
  if (!student) {
    const id=crypto.randomUUID();
    await env.AQUATIC_DB.prepare("INSERT OR IGNORE INTO students(id,class_name,seat_number,student_name) VALUES(?,?,?,'')").bind(id,className,seatNumber).run();
    student=await env.AQUATIC_DB.prepare('SELECT * FROM students WHERE class_name=? AND seat_number=? ORDER BY created_at LIMIT 1').bind(className,seatNumber).first();
  }
  if (!student) return json({ error:'目前無法建立學生觀察簿，請稍後再試。' },500,origin);
  const token=randomToken(); await env.AQUATIC_DB.prepare('INSERT INTO student_devices(token_hash,student_id) VALUES(?,?)').bind(await sha256(token),student.id).run();
  return json({ token, student:studentJson(student) },200,origin);
}

async function handleObservation(request, env, origin, student, plantId) {
  if (!PLANTS.has(plantId)) return json({ error:'找不到這種教材植物。' },404,origin);
  const body=await readJson(request); const notFound=Boolean(body.notFound), completed=Boolean(body.completed); const answers={};
  for (const key of ['location','leaf_position','root_position','feature','difference']) answers[key]=clean(body.answers?.[key], key==='difference'?120:80);
  if (completed && !notFound && Object.values(answers).some((value)=>!value)) return json({ error:'請完成每一題觀察紀錄。' },400,origin);
  await env.AQUATIC_DB.prepare(`INSERT INTO observations(student_id,plant_id,answers_json,not_found,completed) VALUES(?,?,?,?,?) ON CONFLICT(student_id,plant_id) DO UPDATE SET answers_json=excluded.answers_json,not_found=excluded.not_found,completed=excluded.completed,updated_at=CURRENT_TIMESTAMP`).bind(student.id,plantId,JSON.stringify(answers),notFound?1:0,completed?1:0).run();
  return json({ ok:true },200,origin);
}

async function handlePhotoUpload(request, env, origin, student, plantId) {
  if (!PLANTS.has(plantId)) return json({ error:'找不到這種教材植物。' },404,origin);
  const type=(request.headers.get('Content-Type')||'').split(';')[0]; if (!['image/jpeg','image/png','image/webp'].includes(type)) return json({ error:'照片格式必須是 JPG、PNG 或 WebP。' },415,origin);
  const length=Number(request.headers.get('Content-Length')||0); if (length>MAX_PHOTO_BYTES) return json({ error:'照片超過 6 MB，請重新選擇。' },413,origin);
  const bytes=await request.arrayBuffer(); if (!bytes.byteLength || bytes.byteLength>MAX_PHOTO_BYTES) return json({ error:'照片內容無效或超過 6 MB。' },413,origin);
  const extension=type==='image/png'?'png':type==='image/webp'?'webp':'jpg'; const key=`students/${student.id}/${plantId}.${extension}`;
  await env.AQUATIC_MEDIA.put(key,bytes,{ httpMetadata:{ contentType:type }, customMetadata:{ studentId:student.id, plantId } });
  await env.AQUATIC_DB.prepare(`INSERT INTO observations(student_id,plant_id,photo_key) VALUES(?,?,?) ON CONFLICT(student_id,plant_id) DO UPDATE SET photo_key=excluded.photo_key,updated_at=CURRENT_TIMESTAMP`).bind(student.id,plantId,key).run();
  return json({ ok:true, plantId },200,origin);
}

async function servePhoto(env, origin, studentId, plantId) {
  const row=await env.AQUATIC_DB.prepare('SELECT photo_key FROM observations WHERE student_id=? AND plant_id=?').bind(studentId,plantId).first(); if (!row?.photo_key) return json({ error:'尚無照片。' },404,origin);
  const object=await env.AQUATIC_MEDIA.get(row.photo_key); if (!object) return json({ error:'照片檔案不存在。' },404,origin);
  const headers=new Headers(cors(origin)); object.writeHttpMetadata(headers); headers.set('Cache-Control','private, max-age=300'); headers.set('Content-Disposition','inline'); return new Response(object.body,{headers});
}

async function handleSummary(request, env, origin, student) {
  const body=await readJson(request); const classification={};
  for (const plantId of PLANTS) { const value=clean(body.classification?.[plantId],12); if (!CATEGORIES.has(value)) return json({ error:'請替七種植物都選擇一個分類。' },400,origin); classification[plantId]=value; }
  const reason=clean(body.classificationReason,180), reflection=clean(body.reflection,240); if (!reason || !reflection) return json({ error:'請完成分類理由和觀察心得。' },400,origin);
  await env.AQUATIC_DB.prepare(`INSERT INTO student_summaries(student_id,classification_json,classification_reason,reflection,completed_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(student_id) DO UPDATE SET classification_json=excluded.classification_json,classification_reason=excluded.classification_reason,reflection=excluded.reflection,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`).bind(student.id,JSON.stringify(classification),reason,reflection).run();
  return json({ ok:true },200,origin);
}

async function teacherDashboard(env, origin) {
  const studentsResult=await env.AQUATIC_DB.prepare(`SELECT s.*,COUNT(CASE WHEN o.completed=1 THEN 1 END) completed_plants,MAX(CASE WHEN ss.completed_at IS NOT NULL THEN 1 ELSE 0 END) summary_complete,MAX(CASE WHEN LENGTH(ss.reflection)>0 THEN 1 ELSE 0 END) has_reflection FROM students s LEFT JOIN observations o ON o.student_id=s.id LEFT JOIN student_summaries ss ON ss.student_id=s.id GROUP BY s.id ORDER BY s.class_name,CAST(s.seat_number AS INTEGER)`).all();
  const photosResult=await env.AQUATIC_DB.prepare(`SELECT s.id student_id,s.class_name,s.seat_number,o.plant_id FROM observations o JOIN students s ON s.id=o.student_id WHERE o.photo_key IS NOT NULL ORDER BY s.class_name,CAST(s.seat_number AS INTEGER),o.plant_id`).all();
  const plantCountsResult=await env.AQUATIC_DB.prepare('SELECT s.class_name,o.plant_id,COUNT(*) completed_count FROM observations o JOIN students s ON s.id=o.student_id WHERE o.completed=1 GROUP BY s.class_name,o.plant_id').all();
  const students=(studentsResult.results||[]).map((row)=>({ ...studentJson(row), completedPlants:Number(row.completed_plants), classificationComplete:Boolean(row.summary_complete), hasReflection:Boolean(row.has_reflection) }));
  const photos=(photosResult.results||[]).map((row)=>({ studentId:row.student_id,className:row.class_name,seatNumber:Number(row.seat_number),plantId:row.plant_id,plantName:PLANT_NAMES[row.plant_id] }));
  const classes=CLASSES.map((className)=>({className,studentCount:students.filter((student)=>student.className===className).length}));
  const completedStudents=students.filter((student)=>student.completedPlants===PLANTS.size&&student.classificationComplete&&student.hasReflection).length;
  const startedToday=students.filter((student)=>new Date(`${student.createdAt.replace(' ','T')}Z`).toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'})===new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'})).length;
  const plantCounts=Object.fromEntries(CLASSES.map((className)=>[className,Object.fromEntries([...PLANTS].map((plantId)=>[plantId,0]))]));
  (plantCountsResult.results||[]).forEach((row)=>{ if (plantCounts[row.class_name]&&PLANTS.has(row.plant_id)) plantCounts[row.class_name][row.plant_id]=Number(row.completed_count); });
  return json({ summary:{studentCount:students.length,startedToday,completedStudents,photoCount:photos.length,completionRate:students.length?Math.round(completedStudents/students.length*100):0},classes,students,photos,plantCounts },200,origin);
}

async function route(request, env) {
  const url=new URL(request.url), path=url.pathname.replace(/\/+$/,'')||'/', origin=request.headers.get('Origin')||'';
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers:cors(origin)});
  if (path==='/api/health' && request.method==='GET') return json({ok:true,service:'aquatic-observation-api',database:Boolean(env.AQUATIC_DB),media:Boolean(env.AQUATIC_MEDIA),ai:false},200,origin);
  if (path==='/api/student/profile' && request.method==='POST') return handleProfile(request,env,origin);
  if (path==='/api/teacher/login' && request.method==='POST') { const body=await readJson(request); if (!env.TEACHER_PASSWORD||!env.SESSION_SECRET) return json({error:'教師端尚未設定。'},503,origin); if (!safeEqual(body.password,env.TEACHER_PASSWORD)) return json({error:'教師密碼不正確。'},401,origin); return json({token:await makeTeacherToken(env),expiresIn:28800},200,origin); }
  if (path.startsWith('/api/teacher/')) {
    if (!await isTeacher(request,env)) return json({error:'教師登入已失效，請重新登入。'},401,origin);
    if (path==='/api/teacher/dashboard'&&request.method==='GET') return teacherDashboard(env,origin);
    const detail=path.match(/^\/api\/teacher\/students\/([^/]+)$/); if (detail&&request.method==='GET') { const student=await env.AQUATIC_DB.prepare('SELECT * FROM students WHERE id=?').bind(detail[1]).first(); if(!student)return json({error:'找不到學生。'},404,origin); return json({student:studentJson(student),record:await recordFor(env,student.id)},200,origin); }
    const photo=path.match(/^\/api\/teacher\/students\/([^/]+)\/photos\/([^/]+)$/); if(photo&&request.method==='GET'&&PLANTS.has(photo[2])) return servePhoto(env,origin,photo[1],photo[2]);
    return json({error:'找不到教師端功能。'},404,origin);
  }
  if (path.startsWith('/api/student/')) {
    const student=await studentFromRequest(request,env); if(!student)return json({error:'學生身分已失效，請重新進入。'},401,origin);
    if(path==='/api/student/record'&&request.method==='GET') return json({student:studentJson(student),record:await recordFor(env,student.id)},200,origin);
    if(path==='/api/student/summary'&&request.method==='PUT') return handleSummary(request,env,origin,student);
    const observation=path.match(/^\/api\/student\/observations\/([^/]+)$/); if(observation&&request.method==='PUT') return handleObservation(request,env,origin,student,observation[1]);
    const photo=path.match(/^\/api\/student\/observations\/([^/]+)\/photo$/); if(photo&&request.method==='PUT') return handlePhotoUpload(request,env,origin,student,photo[1]); if(photo&&request.method==='GET') return servePhoto(env,origin,student.id,photo[1]);
  }
  return json({error:'找不到這個 API。'},404,origin);
}

export default { async fetch(request,env) { try { return await route(request,env); } catch(error) { console.error('aquatic worker error',error); return json({error:error?.message||'伺服器暫時發生錯誤。'},error?.status||500,request.headers.get('Origin')||''); } } };
