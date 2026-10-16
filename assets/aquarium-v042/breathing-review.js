/* Original lesson controller, scoped to one host and driven by the game's RAF.
 * No timer, secondary RAF, global listener or persisted teaching state. */
(()=>{
'use strict';
const imageURL=new URL('carp-review.webp',document.currentScript?.src||location.href).href;
function create(host){
 const root=host.attachShadow({mode:'open'}),template=window.AquariumBreathingTemplate;
 root.innerHTML='<style>'+template.css+'</style>'+template.html;
 const $=id=>root.getElementById(id),image=new Image(),FishRenderer=window.AquariumBreathingRenderer;
 let rig=null,progress=25,speed=1,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 let active=false,loaded=false,dirty=true,draws=0,preparations=0;
 const controls=['play-toggle','show-intake','show-outflow','speed-slider'];
 function paint(){
  if(!active)return;dirty=false;
  const intake=progress<50;
  $('phase-label').textContent=intake?'吸水：嘴巴張開，鰓蓋後緣開口關閉':'排水：嘴巴閉合，鰓蓋後緣開口打開';
  $('intake-card').classList.toggle('active',intake);$('outflow-card').classList.toggle('active',!intake);
  $('play-toggle').textContent=playing?'暫停':'播放';$('play-toggle').setAttribute('aria-label',playing?'暫停呼吸動畫':'播放呼吸動畫');
  $('water-legend').hidden=!$('show-water').checked;
  if(!rig)return;
  const water=$('show-water').checked;
  const opts={progress,cutaway:$('show-cutaway').checked,inlet:water&&intake,inside:water,outlet:water&&!intake};
  for(const [id,closeup] of [['fish-canvas',false],['head-canvas',true]]){
   const canvas=$(id),rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
   const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   FishRenderer.draw(canvas.getContext('2d'),rig,{...opts,closeup});
   canvas.setAttribute('aria-label',(closeup?'頭部放大。':'鯉魚全身。')+$('phase-label').textContent+($('show-cutaway').checked?'。透視顯示紅色魚鰓。':''));
  }
  draws++;
 }
 function invalidate(){dirty=true;paint();}
 $('play-toggle').addEventListener('click',()=>{playing=!playing;invalidate();});
 for(const [id,p] of [['show-intake',25],['show-outflow',75]])$(id).addEventListener('click',()=>{playing=false;progress=p;invalidate();});
 $('speed-slider').addEventListener('input',event=>{
  const next=Number(event.target.value);if(!Number.isFinite(next))return;
  speed=Math.max(.25,Math.min(2,next));$('speed-output').textContent=speed+'×';$('speed-slider').setAttribute('aria-valuetext',speed+' 倍速');
 });
 for(const id of ['show-water','show-cutaway'])$(id).addEventListener('change',invalidate);
 const resize=new ResizeObserver(()=>{dirty=true;if(active)paint();});
 function ready(){try{
  rig=FishRenderer.prepare(image,()=>document.createElement('canvas'));preparations++;
  controls.forEach(id=>$(id).disabled=false);$('image-status').hidden=true;invalidate();
 }catch{$('image-status').hidden=false;$('image-status').textContent='觀察圖未能顯示，請重新整理頁面。';}}
 image.onload=ready;image.onerror=()=>{$('image-status').hidden=false;$('image-status').textContent='觀察圖載入失敗，請重新整理頁面。';};
 function setActive(value){
  if(active===value)return;active=value;
  if(!active){resize.disconnect();return;}
  resize.observe(host);dirty=true;
  if(!loaded){loaded=true;image.src=window.AQUARIUM_BREATHING_IMAGE||imageURL;}
  paint();
 }
 return {setActive,tick(dt){if(!active||document.hidden)return;if(playing&&rig){progress=(progress+Math.min(.1,Math.max(0,dt))*speed/4.8*100)%100;dirty=true;}if(dirty)paint();},
  debug:()=>({active,ready:!!rig,progress,speed,playing,draws,preparations,water:$('show-water').checked,cutaway:$('show-cutaway').checked}),
  destroy(){setActive(false);image.onload=image.onerror=null;root.replaceChildren();rig=null;}
 };
}
window.AquariumBreathingReview=Object.freeze({create});
})();
