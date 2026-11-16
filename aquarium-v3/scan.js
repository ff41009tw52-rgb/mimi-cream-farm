import { createCollection } from './collection.js';
import { extractFish, manualMap } from './extract.js?v=3.4.3';
import { PaperGate } from './paper-gate.js?v=3.1.2';
import { ARTWORK_REVISION, FISH, SHEET, fishShape } from './templates.js?v=3.4.1';
import { paperFingerprint } from './detect.js?v=3.4.1';

const byId = id => document.getElementById(id);
const video = byId('camera');
const cameraFrame = byId('camera-frame');
const cameraHint = byId('camera-hint');
const devices = byId('devices');
const startButton = byId('start');
const stopButton = byId('stop');
const capture = byId('capture');
const flipCamera = byId('flip-camera');
const mobilePhoto = byId('mobile-photo');
const notice = byId('upload-notice');
const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const dialog = byId('manual');
const photo = byId('snapshot');
const species = byId('fish-type');
const templateVersion = byId('template-version');
const collection = createCollection();
const gate = new PaperGate();
const scanInterval = 240;
const removalInterval = 370;
const cameraFrameLimit = 1920;
const photoFrameLimit = 2560;
const frameCanvas = document.createElement('canvas');
const analysisCanvas = document.createElement('canvas');
const analysisContext = analysisCanvas.getContext('2d',{willReadFrequently:true});
let worker, workerRequest, camera, auto = false, opening = false, busy = false;
let cameraRevision = 0, saved = 0, latestURL, manualURL, manual, timer;
let emptyFrames = 0, lastDevice = '', activeFacing = '', noticeTimer, pendingSnapshot;
let preferredFacing = mobile ? 'environment' : '';
const devicePreference = 'class-aquarium-v3:camera-device';
let preferredDevice = '';
try { preferredDevice = localStorage.getItem(devicePreference) || ''; } catch {}

if (mobile) {
  byId('mobile-photo-label').hidden = false;
  devices.options[0].textContent = '自動選擇鏡頭';
}

function hideNotice() {
  clearTimeout(noticeTimer);
  notice.hidden = true;
}
function showNotice(showRemoval, waitForRemoval) {
  clearTimeout(noticeTimer);
  const instruction = byId('upload-instruction');
  instruction.textContent = showRemoval ? '現在可以移開圖畫紙。' : '';
  instruction.hidden = !showRemoval;
  notice.hidden = false;
  if (!waitForRemoval) noticeTimer = setTimeout(hideNotice,4200);
}

function show(text,tone='') {
  const state = byId('status');
  if (state.textContent!==text) state.textContent = text;
  state.dataset.tone = tone;
}
function updateControls() {
  const live = Boolean(camera && !opening);
  cameraFrame.toggleAttribute('data-live',live);
  cameraHint.hidden = live;
  startButton.disabled = opening;
  startButton.textContent = opening ? '正在開啟相機…'
    : auto ? '暫停自動掃描' : live ? '繼續自動掃描' : '開啟相機';
  stopButton.hidden = stopButton.disabled = !opening && !camera;
  capture.hidden = !live;
  capture.disabled = !live || gate.locked || busy || dialog.open;
  byId('photo').disabled = mobilePhoto.disabled = dialog.open || busy;
  flipCamera.hidden = !mobile || !live;
  flipCamera.disabled = flipCamera.hidden || dialog.open;
  flipCamera.textContent = activeFacing==='user' ? '切到後鏡頭' : '切到前鏡頭';
  devices.disabled = opening;
}
function selectCamera(deviceId) {
  preferredDevice = deviceId;
  try {
    if (deviceId) localStorage.setItem(devicePreference,deviceId);
    else localStorage.removeItem(devicePreference);
  } catch {}
}
function cameraError(error) {
  const messages = {
    NotAllowedError:'攝影機權限已被拒絕。請在網址列的網站設定允許使用攝影機，再試一次。',
    NotFoundError:mobile ? '找不到可用鏡頭。請使用「匯入照片」。' : '找不到攝影機。請檢查實物投影機的 USB 連線。',
    NotReadableError:'攝影機無法讀取。請關閉正在使用鏡頭的投影程式或視訊軟體後再試。',
    OverconstrainedError:'所選攝影機目前無法使用，請重新選擇裝置。',
  };
  return messages[error.name] || '無法開啟攝影機，請檢查裝置後再試。';
}
async function refreshDevices() {
  try {
    const media = (await navigator.mediaDevices?.enumerateDevices() || []).filter(d=>d.kind==='videoinput');
    devices.replaceChildren(new Option(mobile ? '自動選擇鏡頭' : '預設攝影機',''));
    media.filter(d=>d.deviceId).forEach((d,i) => devices.add(new Option(d.label||`攝影機 ${i+1}`,d.deviceId)));
    if (media.some(device=>device.deviceId===preferredDevice)) devices.value=preferredDevice;
  } catch {}
}
function stopCamera(message='攝影機已停止。',tone='') {
  cameraRevision++;
  clearTimeout(timer);
  const stream = camera;
  camera = null;
  auto = opening = false;
  stream?.getTracks().forEach(track => track.stop());
  video.srcObject = null;
  gate.resetStability();
  emptyFrames = 0;
  updateControls();
  if (message) {
    hideNotice();
    show(message,tone);
  }
}
function schedule(delay=gate.locked ? removalInterval : scanInterval) {
  clearTimeout(timer);
  if (!busy && pendingSnapshot) {
    const request=pendingSnapshot;
    pendingSnapshot=undefined;
    void scanSnapshot(request);
    return;
  }
  if (camera && (auto || gate.locked)) timer = setTimeout(tick,delay);
}
async function openCamera(resumeAuto=true) {
  if (!isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    show('請從 HTTPS 網址開啟掃描端，才能使用攝影機。','warning');
    return;
  }
  const revision = ++cameraRevision;
  opening = true;
  updateControls();
  show('正在等待攝影機授權。');
  try {
    let wanted = preferredDevice;
    const size = {width:{ideal:cameraFrameLimit},height:{ideal:1440}};
    const request = videoConstraints => navigator.mediaDevices.getUserMedia({audio:false,video:videoConstraints});
    let stream;
    if (wanted) {
      try {
        stream = await request({...size,deviceId:{exact:wanted}});
      } catch (error) {
        if (revision!==cameraRevision) return;
        if (!['OverconstrainedError','NotFoundError'].includes(error.name)) throw error;
        selectCamera('');
        wanted = '';
      }
    }
    const facing = wanted ? '' : preferredFacing;
    if (!stream && facing) {
      try {
        stream = await request({...size,facingMode:{exact:facing}});
      } catch (error) {
        if (revision!==cameraRevision) return;
        if (!['OverconstrainedError','NotFoundError'].includes(error.name)) throw error;
        stream = await request({...size,facingMode:{ideal:facing}});
      }
    }
    if (!stream) stream = await request(size);
    if (revision!==cameraRevision) {
      stream.getTracks().forEach(track=>track.stop());
      return;
    }
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    const device = settings.deviceId || wanted;
    const facingFromLabel = /back|rear|environment|後鏡頭|後置/i.test(track.label) ? 'environment'
      : /front|user|前鏡頭|前置/i.test(track.label) ? 'user' : '';
    const actualFacing = settings.facingMode || facingFromLabel || facing;
    if ((lastDevice && device && device!==lastDevice) || (activeFacing && actualFacing && actualFacing!==activeFacing)) {
      gate.locked = false;
      gate.previous = null;
      hideNotice();
    }
    lastDevice = device;
    activeFacing = actualFacing;
    camera = stream;
    video.srcObject = stream;
    track.addEventListener('ended', () => {
      if (camera===stream) stopCamera('攝影機已中斷。請重新插上 USB 後再次開始掃描。','warning');
    });
    await video.play();
    if (revision!==cameraRevision) return;
    auto = resumeAuto;
    opening = false;
    updateControls();
    if (gate.locked) show('請先拿走已掃描的紙張，等待再次就緒。');
    else if (facing && actualFacing && facing!==actualFacing) {
      show('指定方向的鏡頭無法開啟，已切到可用鏡頭。你也可以從攝影機清單改選。','warning');
    } else show(auto ? '請放上著色紙，讓四個定位方格入鏡。' : '自動掃描已暫停。');
    schedule(0);
    refreshDevices();
  } catch (error) {
    if (revision===cameraRevision) stopCamera(cameraError(error),'warning');
  }
}
function dimensions(width,height,max) {
  const scale = Math.min(1,max/Math.max(width,height));
  return [Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale))];
}
function drawFrame(target, source, width, height, max=cameraFrameLimit) {
  const [w,h] = dimensions(width,height,max);
  if (target.width!==w) target.width=w;
  if (target.height!==h) target.height=h;
  target.getContext('2d',{willReadFrequently:true}).drawImage(source,0,0,w,h);
}
function classify(source,previous) {
  if (!worker) {
    worker = new Worker(new URL('./scan-worker.js?v=3.4.1',import.meta.url),{type:'module'});
    worker.onmessage = ({data}) => {
      const request = workerRequest;
      workerRequest = undefined;
      if (data.error) request?.reject(new Error(data.error));
      else request?.resolve(data.result);
    };
    worker.onerror = () => {
      worker.terminate();
      worker = undefined;
      const request = workerRequest;
      workerRequest = undefined;
      request?.reject(new Error('辨識模組無法執行'));
    };
  }
  const [w,h] = dimensions(source.width,source.height,896);
  if (analysisCanvas.width!==w) analysisCanvas.width=w;
  if (analysisCanvas.height!==h) analysisCanvas.height=h;
  analysisContext.drawImage(source,0,0,w,h);
  const frame = analysisContext.getImageData(0,0,w,h);
  const scaleX = source.width/w, scaleY = source.height/h;
  let compatiblePrevious;
  if (previous?.map) {
    const resizedMap=previous.map.map((value,index) => value*(index<3 ? w/previous.w : index<6 ? h/previous.h : 1));
    compatiblePrevious={...previous,map:resizedMap};
  }
  return new Promise((resolve,reject)=>{
    workerRequest = {resolve:(result) => resolve({result,scaleX,scaleY,w,h}),reject};
    worker.postMessage({frame,previous:compatiblePrevious},[frame.data.buffer]);
  });
}
async function save(blob,type,{paper,showRemoval=Boolean(paper)}={}) {
  await collection.add(blob,type);
  const waitForRemoval=Boolean(paper && paper.session===cameraRevision);
  if (waitForRemoval) gate.latch(paper);
  saved++;
  const latest=byId('latest');
  if (latestURL) URL.revokeObjectURL(latestURL);
  latestURL=URL.createObjectURL(blob);
  latest.src=latestURL;
  latest.alt=FISH[type].name+'作品';
  latest.hidden=false;
  byId('latest-empty').hidden=true;
  byId('count').textContent=`這次已掃描 ${saved} 張`;
  show(`已加入${FISH[type].name}。${showRemoval ? '請拿走圖畫紙。' : ''}`,'success');
  showNotice(showRemoval,waitForRemoval);
}

async function saveDetection(frame,{result,scaleX,scaleY,w,h},source,session) {
  const {type,map,revision,signature}=result;
  show(`正在儲存${FISH[type].name}…`);
  updateControls();
  const blob=await extractFish(frame,type,map,{scaleX,scaleY,revision});
  if (source==='camera' && session!==cameraRevision) return;
  const paper=source==='camera' ? {map,type,revision,signature,w,h,session} : undefined;
  await save(blob,type,{paper,showRemoval:source!=='file'});
}

async function tick() {
  const revision = cameraRevision;
  if (!camera || (!auto && !gate.locked)) return;
  if (busy || dialog.open || video.readyState<2) {
    schedule();
    return;
  }
  busy = true;
  try {
    drawFrame(frameCanvas,video,video.videoWidth,video.videoHeight);
    const data = await classify(frameCanvas,gate.previous);
    if (revision!==cameraRevision || dialog.open || (!auto && !gate.locked)) return;
    const {result} = data;
    const state = gate.observe(result);
    if (state==='ready') {
      await saveDetection(frameCanvas,data,'camera',revision);
    } else if (state==='stabilizing') {
      emptyFrames=0;
      show(`已辨識${FISH[result.type].name}，正在確認畫面…`);
    } else if (state==='uncertain') {
      emptyFrames=0;
      show('辨識不完整。請把四角放進畫面、移開遮擋，或使用「拍照掃描」。','warning');
    } else if (state==='removed') {
      hideNotice();
      emptyFrames=0;
      show(auto ? '已就緒，可以放上下一張。' : '自動掃描已暫停。');
    } else if (state==='empty') {
      emptyFrames++;
      if (emptyFrames>=3) show(result.partial
        ? '尚未辨識到紙張。請確認方格清晰，必要時可用「拍照掃描」。'
        : '等待著色紙，請讓四個方格完整入鏡。');
    }
  } catch (error) {
    if (revision===cameraRevision) {
      auto = false;
      gate.resetStability();
      show(`${error.message || '掃描失敗'}。請檢查後重試。`,'warning');
    }
  } finally {
    busy = false;
    updateControls();
    schedule();
  }
}

function invalidatePreview() {
  if (!manual) return;
  manual.preview = null;
  manual.version++;
  byId('send').disabled=true;
  byId('manual-result').hidden=true;
  if (manualURL) URL.revokeObjectURL(manualURL);
  manualURL = null;
}
function drawHandles() {
  const ctx=photo.getContext('2d');
  ctx.clearRect(0,0,photo.width,photo.height);
  ctx.drawImage(manual.frame,0,0);
  ctx.strokeStyle='#fed479';
  ctx.lineWidth=Math.max(2,photo.width/350);
  ctx.setLineDash([9,7]);
  ctx.beginPath();
  manual.points.forEach(([x,y],i)=>{
    if (i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
    const handle=byId('handle-'+i);
    handle.style.left=`${100*x/photo.width}%`;
    handle.style.top=`${100*y/photo.height}%`;
  });
  ctx.closePath();
  ctx.stroke();
}
function movePoint(index,x,y) {
  if (!manual || manual.saving) return;
  manual.points[index]=[Math.max(0,Math.min(photo.width-1,x)),Math.max(0,Math.min(photo.height-1,y))];
  invalidatePreview();
  drawHandles();
}
for (const [key,shape] of Object.entries(FISH)) species.add(new Option(shape.name,key));
for (let index=0; index<SHEET.centers.length; index++) {
  const button=document.createElement('button');
  button.type='button';
  button.id='handle-'+index;
  button.className='handle';
  button.textContent=index+1;
  button.setAttribute('aria-label',`定位點 ${index+1}`);
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove',event=>{
    if (!button.hasPointerCapture(event.pointerId)) return;
    const rect=photo.getBoundingClientRect();
    movePoint(index,(event.clientX-rect.left)*photo.width/rect.width,(event.clientY-rect.top)*photo.height/rect.height);
  });
  button.addEventListener('keydown',event=>{
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if (!delta || !manual) return;
    event.preventDefault();
    const [x,y]=manual.points[index], step=event.shiftKey ? 12 : 2;
    movePoint(index,x+step*delta[0],y+step*delta[1]);
  });
  byId('handles').append(button);
}
function showManual(frame,source,session) {
  photo.width=frame.width;
  photo.height=frame.height;
  const ratio=(SHEET.centers[1][0]-SHEET.centers[0][0])/(SHEET.centers[3][1]-SHEET.centers[0][1]);
  const w=Math.min(photo.width*.7,photo.height*.73*ratio);
  const h=w/ratio;
  const x=(photo.width-w)/2,y=(photo.height-h)/2;
  manual={frame,source,session,version:0,points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]};
  species.value='';
  templateVersion.value=String(ARTWORK_REVISION);
  templateVersion.querySelector('[value="1"]').disabled=false;
  byId('manual-info').textContent='請選擇魚形，並將定位點對到紙上的方格。';
  drawHandles();
  gate.resetStability();
  dialog.showModal();
}

async function scanSnapshot({file,source,session}) {
  if (dialog.open || (source==='camera' && (session!==cameraRevision || !camera || video.readyState<2 || gate.locked))) return;
  if (busy) {
    pendingSnapshot={file,source,session};
    return;
  }
  busy=true;
  clearTimeout(timer);
  hideNotice();
  show('正在辨識著色紙…');
  updateControls();
  let bitmap;
  try {
    if (file) {
      try {
        bitmap=await createImageBitmap(file);
      } catch {
        show('無法開啟這張照片，請改用 JPEG 或 PNG 後重試。','warning');
        return;
      }
    }
    const frame=document.createElement('canvas');
    drawFrame(frame,bitmap || video,bitmap?.width || video.videoWidth,bitmap?.height || video.videoHeight,
      file ? photoFrameLimit : cameraFrameLimit);
    const detection=await classify(frame);
    if (source==='camera' && session!==cameraRevision) return;
    if (detection.result.kind==='found') {
      await saveDetection(frame,detection,source,session);
    } else {
      show('辨識不完整，可重新拍攝或修正四角定位。','warning');
      showManual(frame,source,session);
    }
  } catch (error) {
    if (source==='camera' && session!==cameraRevision) return;
    if (source==='camera') auto=false;
    show(`${error.message || '掃描失敗'}。請檢查後重試。`,'warning');
  } finally {
    bitmap?.close();
    busy=false;
    updateControls();
    schedule();
  }
}
async function preview() {
  const item=manual;
  if (!item || item.saving) return;
  const type=species.value;
  const revision=Number(templateVersion.value);
  if (!FISH[type]) {
    byId('manual-info').textContent='請選擇魚形。';
    return;
  }
  invalidatePreview();
  const version=item.version;
  const map=manualMap(item.points,item.frame);
  if (!map) {
    byId('manual-info').textContent='定位順序或範圍有誤，請從紙的左上角順時針對準四個方格。';
    return;
  }
  try {
    const blob=await extractFish(item.frame,type,map,{revision});
    if (manual!==item || version!==item.version) return;
    item.preview={type,blob,revision};
    manualURL=URL.createObjectURL(blob);
    byId('manual-preview').src=manualURL;
    byId('manual-result').hidden=false;
    byId('manual-info').textContent='請確認魚身完整，再加入水族館。';
    byId('send').disabled=false;
  } catch {
    byId('manual-info').textContent='無法產生預覽，請重拍後再試。';
  }
}
byId('send').onclick=async () => {
  if (!manual?.preview || manual.saving) return;
  const item=manual;
  item.saving=true;
  byId('send').disabled=byId('close-manual').disabled=true;
  try {
    const {type,blob,revision}=item.preview;
    let paper;
    if (item.source==='camera' && item.session===cameraRevision) {
      const [w,h]=dimensions(item.frame.width,item.frame.height,896);
      const points=item.points.map(([x,y])=>[x*w/item.frame.width,y*h/item.frame.height]);
      const map=manualMap(points,{width:w,height:h});
      if (!map) throw new Error('定位點無效，請重新對準四個方格。');
      const signature=paperFingerprint(analysisContext.getImageData(0,0,w,h),{type,map,revision});
      paper={map,type,revision,signature,w,h,session:item.session};
    }
    await save(blob,type,{paper,showRemoval:item.source!=='file'});
    dialog.close();
  } catch (error) {
    byId('manual-info').textContent=error.message || '無法儲存作品，請再試一次。';
    byId('send').disabled=false;
  } finally {
    item.saving=false;
    byId('close-manual').disabled=false;
  }
};
dialog.addEventListener('cancel',event=>{ if (manual?.saving) event.preventDefault(); });
dialog.addEventListener('close',()=>{
  invalidatePreview();
  manual=null;
  updateControls();
  schedule();
});
byId('close-manual').onclick=()=>dialog.close();
byId('preview').onclick=preview;
species.onchange=()=>{
  const original=templateVersion.querySelector('[value="1"]');
  original.disabled=Boolean(species.value && !fishShape(species.value,1));
  if (original.disabled) templateVersion.value=String(ARTWORK_REVISION);
  invalidatePreview();
};
templateVersion.onchange=invalidatePreview;
capture.onclick=()=>void scanSnapshot({source:'camera',session:cameraRevision});
byId('photo').onchange=mobilePhoto.onchange=({target})=>{
  const file=target.files[0];
  target.value='';
  if (file) void scanSnapshot({file,source:target===mobilePhoto ? 'mobile' : 'file'});
};
startButton.onclick=()=>{
  if (!camera) {
    void openCamera();
    return;
  }
  auto=!auto;
  gate.resetStability();
  emptyFrames=0;
  updateControls();
  show(auto ? gate.locked ? '請拿走已掃描的紙張。' : '請放上著色紙。' : '自動掃描已暫停。');
  schedule(0);
};
stopButton.onclick=()=>stopCamera();
byId('dismiss-upload').onclick=hideNotice;
function restartCamera() {
  if (!camera) return;
  const wasAuto=auto;
  stopCamera('');
  void openCamera(wasAuto);
}
devices.onchange=()=>{
  selectCamera(devices.value);
  restartCamera();
};
flipCamera.onclick=()=>{
  preferredFacing=activeFacing==='user' ? 'environment' : 'user';
  devices.value='';
  selectCamera('');
  restartCamera();
};
mobilePhoto.onclick=()=>{
  if (camera) stopCamera();
};
navigator.mediaDevices?.addEventListener('devicechange',()=>{
  refreshDevices();
  if (camera?.getVideoTracks().every(track=>track.readyState==='ended')) {
    stopCamera('攝影機已中斷，請重新插上 USB。','warning');
  }
});
addEventListener('pagehide',()=>stopCamera());
updateControls();
refreshDevices();
