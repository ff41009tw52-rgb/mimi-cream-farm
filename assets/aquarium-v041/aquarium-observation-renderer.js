/* Original vector carp. Reuses the reviewed breathing page's eased mouth/cover cycle
   and layered, orderly gill-filament approach; no textbook or raster texture copied. */
(() => {
'use strict';
const ns='http://www.w3.org/2000/svg';
const names=window.AquariumObservationContent.parts;
const coverPath='M222 191 Q267 174 285 216 Q310 263 267 304 L218 297 Q242 255 222 191Z';
const outline='M126 247 Q169 192 269 171 Q418 127 554 199 Q605 228 654 246 L654 275 Q600 287 554 301 Q398 341 258 304 Q174 302 134 266Z';
const part=(id,markup)=>`<g data-part="${id}" class="fish-part" aria-label="${names[id].name}">${markup}</g>`;
function svgMarkup(){
 let scales='';for(let row=0;row<8;row++)for(let col=0;col<16;col++){
  const x=275+col*23+(row%2)*11,y=179+row*19;
  scales+=`<path d="M${x} ${y} q19 9 0 18"/>`;
 }
 let filaments='';
 for(let layer=0;layer<3;layer++){
  let arch='';for(let i=0;i<=28;i++){
   const t=i/28,x=232-layer*5+Math.sin(Math.PI*t)*(30-layer*4),y=198+layer*5+t*(94-layer*8),len=10+Math.sin(Math.PI*t)*9;
   filaments+=`<path d="M${x} ${y} q${len*.55} -1 ${len} ${(t-.5)*12}" fill="none" stroke="${layer%2?'#d86f72':'#c65362'}" stroke-width="2.1"/>`;
   arch+=(i?' L':'M')+x+' '+y;
  }filaments+=`<path d="${arch}" fill="none" stroke="#a74555" stroke-width="3"/>`;
 }
 return `<svg id="obs-svg" viewBox="0 0 900 440" role="group" aria-label="可點選部位的硬骨魚構造示意圖" xmlns="${ns}">
 <defs><linearGradient id="obs-body" x2="0" y2="1"><stop stop-color="#87aaa0"/><stop offset=".5" stop-color="#c7d9b5"/><stop offset="1" stop-color="#f5edcc"/></linearGradient><linearGradient id="obs-fin" x2="0" y2="1"><stop stop-color="#86b8b0"/><stop offset="1" stop-color="#e2d5a4"/></linearGradient><clipPath id="obs-scales"><path d="${outline}"/></clipPath><clipPath id="obs-gill-clip"><path d="${coverPath}"/></clipPath><marker id="obs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6Z" fill="#3b91b6"/></marker></defs>
 <g id="obs-fish-motion"><g id="obs-fish-view">
 ${part('dorsal','<path class="part-paint" d="M287 184 Q322 125 356 111 L382 126 Q431 140 477 167 L551 200 Q418 160 287 184Z" fill="url(#obs-fin)"/><path class="fin-rays" d="M314 178L350 119M345 175L374 127M377 172L398 140M411 174L426 150M444 180L454 164M478 185L485 174"/>')}
 <g id="obs-tail-motion">${part('caudal','<path class="part-paint" d="M628 244 Q694 230 778 188 Q774 224 747 258 Q780 292 780 325 Q700 283 628 277Z" fill="url(#obs-fin)"/><path class="fin-rays" d="M646 250L764 203M648 254L750 228M649 262L742 257M649 269L753 290M648 273L764 309"/>')}</g>
 ${part('anal','<path class="part-paint" d="M542 281 Q571 305 611 334 L622 301 L590 272Z" fill="url(#obs-fin)"/><path class="fin-rays" d="M554 288L609 326M566 286L615 312"/>')}
 ${part('pelvic','<path class="part-paint" d="M387 279 Q409 320 457 342 L458 317 L431 286Z" fill="url(#obs-fin)"/><path class="fin-rays" d="M401 288L449 333M413 288L450 321"/>')}
 ${part('trunk',`<path class="part-paint" d="M257 175 Q418 127 554 199 Q605 228 654 246 L654 275 Q600 287 554 301 Q398 341 251 304 Q279 250 257 175Z" fill="url(#obs-body)"/><g clip-path="url(#obs-scales)" class="scales">${scales}</g><path d="M288 250 Q460 238 630 260" fill="none" stroke="#839f96" stroke-width="2" opacity=".45"/>`)}
 ${part('head','<path class="part-paint" d="M126 247 Q172 191 257 175 Q279 219 265 267 L251 304 Q172 298 134 266Z" fill="url(#obs-body)"/>')}
 ${part('gills',`<g clip-path="url(#obs-gill-clip)"><path d="${coverPath}" fill="#f2c4b5"/>${filaments}</g>`)}
 ${part('cover',`<path id="obs-cover" class="part-paint" d="${coverPath}" fill="url(#obs-body)"/>`)}
 <g id="obs-chest-motion">${part('pectoral','<path class="part-paint" d="M253 260 Q284 266 336 308 Q303 325 264 290Z" fill="url(#obs-fin)"/><path class="fin-rays" d="M260 268L326 307M260 276L308 310M268 283L294 310"/>')}</g>
 <circle cx="184" cy="224" r="15" fill="#f8f1d6" stroke="#687f73" stroke-width="2"/><circle cx="183" cy="224" r="9" fill="#2a4e50"/><circle cx="180" cy="220" r="3.5" fill="white"/>
 ${part('mouth','<ellipse id="obs-mouth-gap" class="part-paint" cx="132" cy="252" rx="15" ry="3" fill="#b5deda"/><path id="obs-jaw" d="M120 253 Q135 269 164 265" fill="none" stroke="#79978b" stroke-width="4" stroke-linecap="round"/>')}
 <g id="obs-water" fill="none" stroke="#3b91b6" stroke-width="7" stroke-linecap="round" opacity=".8"><path id="obs-inlet" d="M65 265 Q86 253 119 252" marker-end="url(#obs-arrow)"/><path id="obs-inside" d="M151 254 Q196 245 249 248" stroke-dasharray="9 8" marker-end="url(#obs-arrow)"/><path id="obs-outlet" d="M286 268 Q337 300 394 304" marker-end="url(#obs-arrow)"/></g>
 </g></g>
 <g id="obs-labels" class="svg-labels">
 ${label('head',155,130,190,192)}${label('trunk',488,75,465,165)}${label('mouth',62,223,122,246)}${label('cover',184,368,250,283)}${label('dorsal',331,62,353,126)}${label('pectoral',297,399,299,298)}${label('pelvic',442,399,431,320)}${label('anal',604,395,596,313)}${label('caudal',779,144,753,224)}
 </g><g id="obs-breath-labels" class="svg-labels">${label('mouth',100,183,132,245)}${label('cover',355,179,274,216)}${label('gills',340,358,260,254)}</g><g id="obs-direction" fill="none" stroke="#3b91b6" stroke-width="5"><path d="M514 365H367" marker-end="url(#obs-arrow)"/><text x="455" y="393" text-anchor="middle" stroke="none" fill="#397e98" font-size="17">前進方向</text></g>
 </svg>`;
}
function label(id,x,y,px,py){return `<g data-label="${id}" data-part="${id}" role="button" tabindex="0" aria-label="觀察${names[id].name}"><path d="M${x} ${y+10} L${px} ${py}"/><circle cx="${px}" cy="${py}" r="3"/><rect x="${x-36}" y="${y-24}" width="72" height="42" rx="12"/><text x="${x}" y="${y+3}" text-anchor="middle">${names[id].name}</text></g>`;}
// The easing is retained from fish-breathing-review.html, with a third explanatory phase.
function breathCycle(seconds){const p=(seconds%4.8)/4.8;return {p,mouth:p<.5?Math.pow(Math.max(0,Math.sin(Math.PI*p/.5)),.85):0,cover:p>=.5?Math.pow(Math.max(0,Math.sin(Math.PI*(p-.5)/.5)),.85):0,phase:p<.32?0:p<.58?1:2};}
function makeRenderer(host){
 host.innerHTML=svgMarkup();const $=id=>host.querySelector('#'+id),svg=$('obs-svg');
 function draw({topic,time=0,partId=null,labels=true,water=true,cutaway=false,arrows=true,focus='all'}){
  const breath=breathCycle(time),swim=topic==='swimming',breathe=topic==='breathing',wave=Math.sin(time*4.2),turn=swim&&focus==='turn';
  const pose=turn?Math.cos(time*.65):1,advance=swim?-Math.sin(time*.65)*24:0;
  svg.setAttribute('viewBox',breathe?'55 123 388 263':'0 0 900 440');
  $('obs-fish-view').setAttribute('transform',swim?`translate(450 255) scale(${turn?pose:1} 1) skewX(${wave*1.4}) translate(-450 -255)`:'');
  $('obs-fish-motion').setAttribute('transform',swim?`translate(${advance} ${wave*1.2})`:'');
  $('obs-tail-motion').setAttribute('transform',swim?`translate(637 262) scale(${.88+Math.cos(time*4.2)*.12} 1) rotate(${wave*3}) translate(-637 -262)`:'');
  $('obs-chest-motion').setAttribute('transform',swim?`rotate(${wave*7} 253 260)`:'');
  $('obs-mouth-gap').setAttribute('ry',breathe?3+breath.mouth*10:3);
  $('obs-jaw').setAttribute('transform',breathe?`rotate(${-breath.mouth*5} 164 252)`:'');
  $('obs-cover').setAttribute('transform',breathe?`translate(225 200) scale(${1-breath.cover*.16} 1) translate(-225 -200)`:'');
  $('obs-cover').style.opacity=breathe&&cutaway?'.16':'1';
  host.querySelector('[data-part="gills"]').style.visibility=breathe?'visible':'hidden';
  $('obs-water').style.display=breathe&&water?'':'none';
  for(const [id,phase] of [['obs-inlet',0],['obs-inside',1],['obs-outlet',2]])$(id).style.opacity=breath.phase===phase?'1':'.16';
  $('obs-inside').style.strokeDashoffset=String(-time*12);
  $('obs-labels').style.display=labels&&!breathe&&!swim?'':'none';
  $('obs-breath-labels').style.display=labels&&breathe?'':'none';
  $('obs-breath-labels').querySelector('[data-label="gills"]').style.display=cutaway?'':'none';
  $('obs-direction').style.display=swim&&arrows?'':'none';
  $('obs-direction').setAttribute('transform',turn&&pose<0?'translate(900 0) scale(-1 1)':'');
  // Text direction is kept readable when the travel arrow reverses.
  const dirText=$('obs-direction').querySelector('text');dirText.setAttribute('transform',turn&&pose<0?'translate(910 0) scale(-1 1)':'');
  for(const el of host.querySelectorAll('.fish-part')){
   const id=el.dataset.part,active=partId===id||swim&&((focus==='tail'&&id==='caudal')||(focus==='fins'&&['dorsal','pectoral','pelvic','anal'].includes(id)));
   el.classList.toggle('selected-part',active);el.classList.toggle('covered-gills',id==='gills'&&!(breathe&&cutaway));
  }
  for(const el of host.querySelectorAll('[data-label]'))el.classList.toggle('selected-label',el.dataset.label===partId);
  return breath;
 }
 return {draw,svg};
}
function drawTopView(canvas,time,turn=false){
 const c=canvas.getContext('2d'),w=900,h=155;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}c.clearRect(0,0,w,h);
 c.save();c.translate(450-Math.sin(time*.65)*30,78);if(turn){c.scale(Math.cos(time*.65),1);c.rotate(Math.sin(time*.65)*.35);}
 const points=[];for(let i=0;i<=28;i++){const x=-230+i*15,amp=Math.max(0,(x+175)/400);points.push([x,Math.sin(time*4.2-x/95)*amp*27,Math.sin(Math.PI*i/29)*31+5]);}
 c.beginPath();points.forEach(([x,y,r],i)=>i?c.lineTo(x,y-r):c.moveTo(x,y-r));[...points].reverse().forEach(([x,y,r])=>c.lineTo(x,y+r));c.closePath();c.fillStyle='#b8cfb0';c.fill();c.strokeStyle='#709b8f';c.lineWidth=2;c.stroke();
 const [tx,ty]=points.at(-1);c.beginPath();c.moveTo(tx-4,ty);c.lineTo(tx+53,ty-28);c.lineTo(tx+39,ty);c.lineTo(tx+53,ty+28);c.closePath();c.fillStyle='#8ebbb0';c.fill();
 for(const side of [-1,1]){c.beginPath();c.moveTo(-130,side*25);c.lineTo(-100,side*(47+Math.sin(time*4.2)*5));c.lineTo(-80,side*26);c.fill();}
 c.restore();
}
window.AquariumObservationRenderer=Object.freeze({makeRenderer,breathCycle,drawTopView});
})();
