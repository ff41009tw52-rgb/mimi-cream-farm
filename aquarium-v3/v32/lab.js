import { createCollection } from '../collection.js';
import { FISH } from '../templates.js?v=3.4.1';
import { canvasFishRenderer, webglFishRenderer } from './fish-renderers.js?v=3.4.1';
import { clamp, createStrip, creatureHeading, dorsalMix, poseCreature, poseStrip, profileFor, TAU } from './fish-rig.js?v=3.5.2';
import { loadFishImage, templateFish } from './sample-fish.js?v=3.4.1';

const $=id=>document.getElementById(id);
const controls=Object.fromEntries(['speed','frequency','amplitude','bend','turn','size'].map(key=>[key,$(key)]));
const artwork=$('artwork'), species=$('species'), error=$('lab-error');
const renderers=['legacy','hinge','wave'].map(id=>{
  const canvas=$(id);
  return {canvas,renderer:canvasFishRenderer(canvas),width:0,height:0};
});
const alternate=document.createElement('canvas');
alternate.setAttribute('aria-hidden','true');
alternate.hidden=true;
$('wave').after(alternate);
const wave=renderers[2];
const fallback=wave.renderer;
let gpu=null, image, fileImage, sourceRevision=0, drawnId=0, paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
let phase=0, route=0, last=0, request=0, heading=0;
const savedImages=new Map();
const strips={hinge:createStrip(12),wave:createStrip(18),vertical:createStrip(18,true)};
$('lab-renderer').textContent='Canvas 2D';
$('pause').textContent=paused ? '播放' : '暫停';

function disableWebGL() {
  const old=gpu;
  gpu=null;
  if (old) queueMicrotask(()=>{ try { old.destroy(); } catch {} });
  alternate.hidden=true;
  wave.canvas.hidden=false;
  wave.renderer=fallback;
  $('lab-renderer').textContent='Canvas 2D';
  resize();
}
void webglFishRenderer(alternate,disableWebGL).then(renderer=>{
  gpu=renderer;
  wave.renderer=gpu;
  alternate.hidden=false;
  wave.canvas.hidden=true;
  $('lab-renderer').textContent='PixiJS WebGL';
  resize();
}).catch(()=>disableWebGL());

function resize() {
  for (const panel of renderers) {
    const bounds=panel.canvas.parentElement.getBoundingClientRect();
    panel.width=Math.max(1,bounds.width);
    panel.height=Math.max(1,bounds.height);
    panel.renderer.resize(panel.width,panel.height,Math.min(devicePixelRatio||1,1.5));
  }
  draw();
}
const observer=new ResizeObserver(resize);
for (const {canvas} of renderers) observer.observe(canvas.parentElement);

function draw() {
  if (!image) return;
  const fish=profileFor(species.value);
  const aspect=(image.naturalHeight||image.height)/(image.naturalWidth||image.width);
  const size=Number(controls.size.value), amplitude=Number(controls.amplitude.value), bending=Number(controls.bend.value);
  const path=route;
  const legacyDirection=clamp(Math.cos(path)*5,-1,1);
  for (const [i,panel] of renderers.entries()) {
    const {width,height}=panel;
    const fishWidth=Math.min(width*.34,height*.57)*size;
    const base={image,aspect,width:fishWidth,id:'lab-'+drawnId};
    let pose;
    if (fish.creature) {
      const mesh=fish.creature==='jelly' || fish.creature==='octopus' ? strips.vertical : strips.wave;
      pose={...base,x:width*(.5+.27*Math.sin(path)),y:height*(.53+.13*Math.cos(path)),
        angle:creatureHeading(fish.creature,heading),dorsal:1,
        strip:i===2 ? poseCreature(mesh,fish,phase,aspect,0,amplitude) : null};
    } else if (i===0) {
      pose={...base,x:width*(.5+.30*Math.sin(path)),y:height*(.54+Math.sin(path*1.35)*.018),angle:0,dorsal:1,
        legacyScale:Math.sign(legacyDirection||1)*(.045+.955*Math.abs(legacyDirection))};
    } else {
      const model=i===1?'hinge':'wave';
      const strip=poseStrip(strips[model],model,fish,phase,Number(controls.speed.value),Math.sin(path)*.45,amplitude,bending);
      pose={...base,x:width*(.5+.29*Math.sin(path)),y:height*(.53+.19*Math.cos(path)),
        angle:heading,dorsal:dorsalMix(heading),strip};
    }
    try { panel.renderer.draw([pose]); }
    catch (problem) {
      if (panel===wave && gpu) { disableWebGL(); return; }
      throw problem;
    }
  }
}
function animate(time) {
  request=0;
  if (paused || document.hidden) return;
  const dt=Math.min((time-(last||time))/1000,.06)*($('slow').checked ? .32 : 1);
  last=time;
  const fish=profileFor(species.value);
  const speed=Number(controls.speed.value);
  route+=dt*speed*(.48+fish.speed/220);
  phase+=dt*TAU*fish.tailHz*(.58+.42*speed)*Number(controls.frequency.value);
  const desired=Math.atan2(-Math.sin(route)*.58,Math.cos(route));
  const delta=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading));
  const turn=Number(controls.turn.value)*fish.turnRate*1.85;
  heading+=clamp(delta,-turn*dt,turn*dt);
  draw();
  request=requestAnimationFrame(animate);
}
function start() {
  if (paused || request || document.hidden) return;
  last=0;
  request=requestAnimationFrame(animate);
}
async function replaceImage(load) {
  const revision=++sourceRevision;
  error.hidden=true;
  try {
    const next=await load();
    if (revision!==sourceRevision) return;
    if (gpu) gpu.remove('lab-'+drawnId);
    image=next;
    drawnId=revision;
    draw();
  } catch {
    if (revision!==sourceRevision) return;
    error.hidden=false;
    error.textContent='無法讀取魚圖，請重新選擇測試作品。';
  }
}
function selectImage() {
  const record=savedImages.get(artwork.value);
  if (record) species.value=FISH[record.type] ? record.type : 'clown';
  void replaceImage(async ()=>{
    if (record) {
      const url=URL.createObjectURL(record.blob);
      try { return await loadFishImage(url); } finally { URL.revokeObjectURL(url); }
    }
    if (artwork.value==='file' && fileImage) return fileImage;
    return templateFish(species.value,artwork.value!=='line');
  });
}
$('pause').onclick=()=>{
  paused=!paused;
  $('pause').textContent=paused ? '播放' : '暫停';
  if (paused && request) { cancelAnimationFrame(request); request=0; }
  else start();
};
for (const input of Object.values(controls)) {
  input.oninput=()=>{
    input.parentElement.querySelector('output').value=Number(input.value).toFixed(2)+'×';
    draw();
  };
}
species.onchange=()=>{
  if (savedImages.has(artwork.value)) artwork.value='paint';
  if (artwork.value==='file') draw();
  else selectImage();
};
artwork.onchange=selectImage;
$('upload').onchange=async event=>{
  const file=event.target.files[0];
  if (!file) return;
  event.target.value='';
  let option=artwork.querySelector('[value=file]');
  if (!option) { option=new Option('載入的 PNG','file'); artwork.add(option); }
  artwork.value='file';
  await replaceImage(async ()=>{
    const url=URL.createObjectURL(file);
    try {
      fileImage=await loadFishImage(url);
      return fileImage;
    } finally { URL.revokeObjectURL(url); }
  });
};
void createCollection().list().then(items=>{
  if (!items.length) return;
  const group=document.createElement('optgroup');
  group.label='這台裝置的掃描作品';
  items.forEach((entry,i)=>{
    const key='saved-'+entry.id;
    savedImages.set(key,entry);
    group.append(new Option((FISH[entry.type]?.name||'彩繪魚')+' '+(i+1),key));
  });
  artwork.append(group);
}).catch(()=>{});
document.addEventListener('visibilitychange',()=>{
  if (document.hidden && request) { cancelAnimationFrame(request); request=0; }
  else start();
});
selectImage();
start();
