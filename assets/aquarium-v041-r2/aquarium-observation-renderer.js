/* Original vector teaching specimen. All anatomy, scales and gill filaments are
   authored here; no external illustrations, textures or animation loop. */
(() => {
'use strict';
const ns='http://www.w3.org/2000/svg';
const names=window.AquariumObservationContent.parts;
const bodyPath='M249 184 C326 150 407 144 483 171 C557 195 594 236 649 245 L649 274 C596 279 558 301 492 312 C413 327 322 325 251 299 C274 264 276 218 249 184 Z';
const coverPath='M229 194 C251 183 275 197 286 219 C301 248 289 282 266 299 C250 302 233 299 219 293 C241 266 242 225 229 194 Z';
const part=(id,markup)=>`<g data-part="${id}" class="fish-part" aria-label="${names[id].name}">${markup}</g>`;
const shape=(d,fill='url(#obs-fin)',extra='')=>`<path class="part-paint deform" d="${d}" fill="${fill}" ${extra}/>`;
function rayFan(ox,oy,ends){return `<path class="fin-rays deform" d="${ends.map(([x,y])=>`M${ox} ${oy} Q${(ox+x)/2} ${(oy+y)/2-3} ${x} ${y}`).join(' ')}"/>`;}
function svgMarkup(){
 let filaments='';
 // Four separate crescent arches, each carrying orderly pairs of fine filaments.
 for(let layer=0;layer<4;layer++){
  const x0=232+layer*9,y0=211+layer*2,height=70-layer*5;
  let arch='';
  for(let i=0;i<=23;i++){
   const t=i/23,x=x0+Math.sin(Math.PI*t)*(13-layer),y=y0+t*height,len=8+Math.sin(Math.PI*t)*8;
   filaments+=`<path d="M${x.toFixed(2)} ${y.toFixed(2)} q${len*.58} -2 ${len} ${(t-.5)*8}" stroke="${['#b85764','#cb6872','#d57a7e','#df8b89'][layer]}" stroke-width="1.5"/>`;
   arch+=(i?' L':'M')+x.toFixed(2)+' '+y.toFixed(2);
  }
  filaments+=`<path d="${arch}" stroke="#964653" stroke-width="2.3"/>`;
 }
 return `<svg id="obs-svg" viewBox="0 0 900 440" role="group" aria-label="可點選部位的硬骨魚構造示意圖" xmlns="${ns}">
 <defs>
 <linearGradient id="obs-body" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#648f83"/><stop offset=".27" stop-color="#a5bca1"/><stop offset=".58" stop-color="#d2d7af"/><stop offset=".82" stop-color="#eee6c5"/><stop offset="1" stop-color="#f8efda"/></linearGradient>
 <linearGradient id="obs-head" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="#7f9d89"/><stop offset=".55" stop-color="#d2d5b3"/><stop offset="1" stop-color="#f3e7c8"/></linearGradient>
 <linearGradient id="obs-fin" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#7ba799"/><stop offset=".55" stop-color="#b2c4a7"/><stop offset="1" stop-color="#e2d2a5"/></linearGradient>
 <linearGradient id="obs-tail-fill" x1="0" y1=".5" x2="1" y2=".5"><stop stop-color="#95b3a0"/><stop offset=".68" stop-color="#cad1ab"/><stop offset="1" stop-color="#e4d9b8"/></linearGradient>
 <radialGradient id="obs-eye"><stop offset=".4" stop-color="#f7e8ac"/><stop offset="1" stop-color="#b69c5f"/></radialGradient>
 <linearGradient id="obs-gill-bed" x2="1" y2=".4"><stop stop-color="#f7e7cf"/><stop offset="1" stop-color="#efd0bb"/></linearGradient>
 <pattern id="obs-scale-pattern" width="26" height="28" patternUnits="userSpaceOnUse"><path d="M-13 0 Q10 7 -13 14 M13 0 Q36 7 13 14 M0 14 Q23 21 0 28 M26 14 Q49 21 26 28" fill="none" stroke="#6e967d" stroke-width=".7" opacity=".4"/><path d="M-12 1 Q7 7 -12 13 M14 1 Q33 7 14 13 M1 15 Q20 21 1 27" fill="none" stroke="#fff8db" stroke-width=".65" opacity=".43"/></pattern>
 <clipPath id="obs-scales"><path class="deform" d="${bodyPath}"/></clipPath><clipPath id="obs-gill-clip"><path d="${coverPath}"/></clipPath>
 <marker id="obs-arrow" markerWidth="7" markerHeight="7" refX="5.8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M.7 .6 L6 3 L.7 5.4 L2 3 Z" fill="#3385a7"/></marker>
 </defs>
 <style>
 #obs-svg .part-paint{stroke:#607f70;stroke-width:1.35;stroke-linejoin:round;vector-effect:non-scaling-stroke}
 #obs-svg .fin-rays{stroke:#617f70;stroke-width:.85;opacity:.56;fill:none;pointer-events:none}
 #obs-svg .fish-part{cursor:pointer;touch-action:manipulation}
 #obs-svg .selected-part .part-paint{stroke:#b48330;stroke-width:3;filter:drop-shadow(0 0 2px #e5ba5e80)}
 #obs-svg .detail-line{fill:none;stroke:#648372;stroke-width:1.1;opacity:.62;pointer-events:none}
 #obs-svg .svg-labels{font:500 18px "Microsoft JhengHei","PingFang TC",sans-serif;fill:#355d56}
 #obs-svg .svg-labels path{stroke:#77978a;stroke-width:1.15;fill:none;pointer-events:none}
 #obs-svg .svg-labels rect{fill:#fffdf3;stroke:#c0d2c0;stroke-width:1}
 #obs-svg .svg-labels circle{fill:#fbfaf0;stroke:#739686;stroke-width:1.5}
 #obs-svg .svg-labels text{pointer-events:none}
 #obs-svg .svg-labels .selected-label rect{fill:#fbefcd;stroke:#bc913e;stroke-width:1.5}
 #obs-svg .svg-labels .selected-label path{stroke:#b48330;stroke-width:2}
 #obs-svg .svg-labels .selected-label circle{fill:#b48330;stroke:#fff9e6}
 #obs-svg .svg-labels g:focus-visible rect{stroke:#b48330;stroke-width:3}
 #obs-svg .hit-target{fill:transparent;stroke:transparent;stroke-width:18;pointer-events:all}
 #obs-svg .gill-filaments{fill:none;stroke-linecap:round;pointer-events:none}
 #obs-svg .covered-gills{pointer-events:none}
 #obs-svg #obs-water{pointer-events:none}
 </style>
 <g id="obs-fish-motion"><g id="obs-fish-view">
 ${part('dorsal',shape('M290 177 C306 151 325 117 346 102 C354 102 358 112 366 119 C398 136 433 140 468 155 C504 170 532 185 556 203 C468 176 371 154 290 177 Z')+'<path class="fin-rays deform" d="M314 169 Q327 134 344 110 M333 163 Q341 139 353 119 M354 159 L365 127 M375 158 L380 134 M396 159 L396 140 M417 161 L413 144 M439 166 L430 149 M460 172 L449 157 M480 180 L469 165 M501 188 L489 175 M523 196 L510 187"/>')}
 <g id="obs-tail-motion">${part('caudal',shape('M630 245 C682 239 730 204 779 181 C778 212 758 240 741 259 C761 277 779 306 783 337 C732 311 683 278 630 275 C638 266 639 255 630 245 Z','url(#obs-tail-fill)')+rayFan(642,259,[[772,190],[765,206],[754,221],[744,236],[734,249],[735,266],[747,282],[760,299],[773,324]]))}</g>
 ${part('anal',shape('M548 290 C565 295 587 303 614 328 C622 317 620 306 612 298 L579 280 Z')+rayFan(557,289,[[610,323],[614,314],[610,305],[595,295]]))}
 ${part('pelvic',shape('M399 294 C411 306 427 331 458 345 C465 338 460 326 452 316 L429 289 Z')+rayFan(407,297,[[455,340],[454,331],[448,320],[438,311]]))}
 ${part('trunk',shape(bodyPath,'url(#obs-body)')+`<path class="deform" d="${bodyPath}" fill="url(#obs-scale-pattern)" pointer-events="none"/><path class="deform detail-line" d="M282 244 C381 232 461 239 528 249 C570 256 610 260 638 261" stroke-dasharray="2 3"/><path class="deform" d="M283 184 C363 159 432 161 487 181" fill="none" stroke="#e5ead0" stroke-width="2" opacity=".4" pointer-events="none"/>`)}
 ${part('head',shape('M130 245 C150 229 155 212 179 203 C204 191 224 182 250 182 C268 200 279 231 270 266 L251 299 C214 299 179 287 151 271 L132 261 C137 255 138 250 130 245 Z','url(#obs-head)')+'<path class="detail-line" d="M151 237 C165 233 170 233 176 235 M200 207 C211 205 218 204 228 204 M152 270 C171 275 193 285 217 286"/>')}
 ${part('gills',`<g clip-path="url(#obs-gill-clip)"><path class="part-paint" d="${coverPath}" fill="url(#obs-gill-bed)"/><g class="gill-filaments">${filaments}</g></g>`)}
 ${part('cover',`<g id="obs-cover"><path class="part-paint" d="${coverPath}" fill="url(#obs-head)"/><path class="detail-line" d="M239 201 C262 205 280 229 279 250 C280 268 270 283 259 291 M231 287 C244 290 252 291 261 289"/><path d="M266 211 C285 231 292 263 272 287" fill="none" stroke="#f5edcf" stroke-width="2.5" opacity=".55"/></g>`)}
 <g id="obs-chest-motion">${part('pectoral',shape('M257 258 C284 263 319 286 351 311 C325 321 297 309 279 292 C265 280 258 271 257 258 Z','url(#obs-fin)')+rayFan(261,264,[[344,310],[330,312],[314,307],[298,298],[282,284]])+'<ellipse class="hit-target" cx="298" cy="289" rx="43" ry="23"/>')}</g>
 <g pointer-events="none"><circle cx="184" cy="224" r="13" fill="url(#obs-eye)" stroke="#647763" stroke-width="1.6"/><circle cx="184" cy="224" r="8.3" fill="#2c4842"/><circle cx="182" cy="222" r="5.2" fill="#182f2c"/><circle cx="180.5" cy="220.5" r="2.7" fill="#fffdf1"/><path d="M172 216 C178 209 189 209 197 218" fill="none" stroke="#cdd6b3" stroke-width="2"/></g>
 ${part('mouth','<ellipse id="obs-mouth-gap" class="part-paint" cx="134" cy="252" rx="10" ry="2.5" fill="#d6ebe2"/><path id="obs-jaw" d="M125 254 Q139 265 158 265" fill="none" stroke="#79917a" stroke-width="2.6" stroke-linecap="round"/><path d="M149 260 Q143 274 151 279 M156 263 Q155 273 161 277" class="detail-line"/><ellipse class="hit-target" cx="135" cy="253" rx="17" ry="19"/>')}
 <g id="obs-water" fill="none" stroke="#3385a7" stroke-width="3.2" stroke-linecap="round"><path id="obs-inlet" d="M67 254 C86 248 101 250 119 252" marker-end="url(#obs-arrow)"/><path id="obs-inside" d="M153 253 C180 247 207 247 237 251" stroke-dasharray="6 6" marker-end="url(#obs-arrow)"/><path id="obs-outlet" d="M283 269 C313 287 342 294 374 294" marker-end="url(#obs-arrow)"/></g>
 </g></g>
 <g id="obs-labels" class="svg-labels">
 ${label('head',154,142,195,197)}${label('trunk',485,95,460,191)}${label('mouth',64,218,132,245)}${label('cover',185,355,248,283)}${label('dorsal',329,56,349,122)}${label('pectoral',301,395,306,299)}${label('pelvic',451,395,440,329)}${label('anal',610,382,598,310)}${label('caudal',788,133,758,221)}
 </g><g id="obs-breath-labels" class="svg-labels">${label('mouth',102,181,132,241)}${label('cover',345,184,274,219)}${label('gills',189,340,251,262)}</g>
 <g id="obs-direction" fill="none" stroke="#3385a7" stroke-width="3.5"><path d="M516 366 H371" marker-end="url(#obs-arrow)"/><text x="447" y="397" text-anchor="middle" stroke="none" fill="#397e98" font-size="16">前進方向</text></g>
 </svg>`;
}
function label(id,x,y,px,py){const direction=py>y?1:-1,startY=y+direction*20,elbowY=startY+direction*13;return `<g data-label="${id}" data-part="${id}" role="button" tabindex="0" aria-label="觀察${names[id].name}"><path d="M${x} ${startY} L${x} ${elbowY} L${px} ${py}"/><circle cx="${px}" cy="${py}" r="3.5"/><rect x="${x-37}" y="${y-23}" width="74" height="46" rx="10"/><text x="${x}" y="${y+6}" text-anchor="middle">${names[id].name}</text></g>`;}
// Same 4.8-second teaching cycle and phase boundaries as the observation controls.
function breathCycle(seconds){const p=(seconds%4.8)/4.8;return {p,mouth:p<.5?Math.pow(Math.max(0,Math.sin(Math.PI*p/.5)),.85):0,cover:p>=.5?Math.pow(Math.max(0,Math.sin(Math.PI*(p-.5)/.5)),.85):0,phase:p<.32?0:p<.58?1:2};}
function makeRenderer(host){
 host.innerHTML=svgMarkup();const $=id=>host.querySelector('#'+id),svg=$('obs-svg');
 const parts=[...host.querySelectorAll('.fish-part')],labelsEls=[...host.querySelectorAll('[data-label]')];
 // Absolute-coordinate paths are warped as one continuous body; fins stay attached.
 const mesh=[...host.querySelectorAll('.deform')].map(el=>({el,base:el.getAttribute('d'),tokens:el.getAttribute('d').match(/[A-Za-z]|-?\d*\.?\d+/g)}));
 let wasSwimming=false;
 function bend(x,time){const a=Math.max(0,Math.min(1,(x-230)/550));return Math.sin(time*3.1-(x-230)/155)*a*a*35;}
 function draw({topic,time=0,partId=null,labels=true,water=true,cutaway=false,arrows=true,focus='all'}){
  const breath=breathCycle(time),swim=topic==='swimming',breathe=topic==='breathing',wave=Math.sin(time*3.1),turn=swim&&focus==='turn';
  const pose=turn?Math.cos(time*.65):1,advance=swim?-Math.sin(time*.65)*24:0;
  svg.setAttribute('viewBox',breathe?'48 141 375 226':'0 0 900 440');
  $('obs-fish-view').setAttribute('transform',swim?`translate(450 255) scale(${turn?pose:1} 1) translate(-450 -255)`:'');
  $('obs-fish-motion').setAttribute('transform',swim?`translate(${advance} ${wave*1.1})`:'');
  if(swim){for(const m of mesh){let nextX=true,x=0;const d=m.tokens.map(token=>{if(/[A-Za-z]/.test(token)){nextX=true;return token;}if(nextX){x=+token;nextX=false;return token;}nextX=true;return (+token+bend(x,time)).toFixed(2);}).join(' ');m.el.setAttribute('d',d);}}
  else if(wasSwimming){for(const m of mesh)m.el.setAttribute('d',m.base);}
  wasSwimming=swim;
  $('obs-tail-motion').setAttribute('transform','');
  $('obs-chest-motion').setAttribute('transform',swim?`rotate(${wave*5} 257 258)`:'');
  $('obs-mouth-gap').setAttribute('ry',breathe?2.5+breath.mouth*9.5:2.5);
  $('obs-jaw').setAttribute('transform',breathe?`rotate(${-breath.mouth*7} 158 252)`:'');
  // Opening rotates around the upper anterior hinge and exposes the posterior edge.
  $('obs-cover').setAttribute('transform',breathe?`translate(232 201) rotate(${-breath.cover*3.5}) scale(${1-breath.cover*.19} 1) translate(-232 -201)`:'');
  $('obs-cover').style.opacity=breathe&&cutaway?'.13':'1';
  parts.find(el=>el.dataset.part==='gills').style.visibility=breathe?'visible':'hidden';
  $('obs-water').style.display=breathe&&water?'':'none';
  for(const [id,phase] of [['obs-inlet',0],['obs-inside',1],['obs-outlet',2]])$(id).style.opacity=breath.phase===phase?'1':'.12';
  $('obs-inside').style.strokeDashoffset=String(-time*12);
  $('obs-labels').style.display=labels&&!breathe&&!swim?'':'none';
  $('obs-breath-labels').style.display=labels&&breathe?'':'none';
  $('obs-breath-labels').querySelector('[data-label="gills"]').style.display=cutaway?'':'none';
  $('obs-direction').style.display=swim&&arrows?'':'none';
  $('obs-direction').setAttribute('transform',turn&&pose<0?'translate(900 0) scale(-1 1)':'');
  const dirText=$('obs-direction').querySelector('text');dirText.setAttribute('transform',turn&&pose<0?'translate(894 0) scale(-1 1)':'');
  for(const el of parts){const id=el.dataset.part,active=partId===id||swim&&((focus==='tail'&&id==='caudal')||(focus==='fins'&&['dorsal','pectoral','pelvic','anal'].includes(id)));el.classList.toggle('selected-part',active);el.classList.toggle('covered-gills',id==='gills'&&!(breathe&&cutaway));}
  for(const el of labelsEls)el.classList.toggle('selected-label',el.dataset.label===partId);
  return breath;
 }
 return {draw,svg};
}
function drawTopView(canvas,time,turn=false){
 const c=canvas.getContext('2d'),w=900,h=155;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}c.clearRect(0,0,w,h);
 c.save();c.translate(450-Math.sin(time*.65)*30,78);if(turn){c.scale(Math.cos(time*.65),.88);c.rotate(Math.sin(time*.65)*.1);}
 const points=[];for(let i=0;i<=36;i++){const x=-230+i*12.3,a=Math.max(0,(x+170)/400),r=5+Math.pow(Math.sin(Math.PI*i/37),.9)*28;points.push([x,Math.sin(time*3.1-(x+230)/125)*a*a*31,r]);}
 const gradient=c.createLinearGradient(0,-34,0,36);gradient.addColorStop(0,'#829f85');gradient.addColorStop(.5,'#d4d8af');gradient.addColorStop(1,'#9cb799');
 c.beginPath();points.forEach(([x,y,r],i)=>i?c.lineTo(x,y-r):c.moveTo(x,y-r));[...points].reverse().forEach(([x,y,r])=>c.lineTo(x,y+r));c.closePath();c.fillStyle=gradient;c.fill();c.strokeStyle='#638775';c.lineWidth=1.5;c.stroke();
 const [tx,ty]=points.at(-1);c.beginPath();c.moveTo(tx-5,ty-6);c.quadraticCurveTo(tx+25,ty-13,tx+57,ty-33);c.quadraticCurveTo(tx+54,ty-15,tx+38,ty);c.quadraticCurveTo(tx+54,ty+15,tx+57,ty+33);c.quadraticCurveTo(tx+25,ty+13,tx-5,ty+6);c.closePath();c.fillStyle='#bcc7a4';c.fill();c.stroke();
 c.strokeStyle='#709382';c.lineWidth=.8;for(const dy of [-27,-16,16,27]){c.beginPath();c.moveTo(tx,ty);c.lineTo(tx+49,ty+dy);c.stroke();}
 for(const side of [-1,1]){c.beginPath();c.moveTo(-140,side*24);c.quadraticCurveTo(-119,side*36,-93,side*(49+Math.sin(time*3.1)*5));c.quadraticCurveTo(-103,side*30,-119,side*27);c.closePath();c.fill();c.stroke();}
 c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.setLineDash([4,6]);c.strokeStyle='#64887570';c.stroke();c.setLineDash([]);
 c.restore();
}
window.AquariumObservationRenderer=Object.freeze({makeRenderer,breathCycle,drawTopView});
})();
