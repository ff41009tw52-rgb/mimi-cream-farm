/* Original aquarium illustrations, V0.4.1. Geometry is authored in a 100-unit
 * coordinate space, facing right. This module only paints: it owns no clock,
 * simulation, DOM, randomness, persistence, or external image dependencies. */
(() => {
'use strict';
const PI = Math.PI;
const paths = new Map();
function path(d) { if (!paths.has(d)) paths.set(d, new Path2D(d)); return paths.get(d); }
function fill(c,p,color,edge,weight=.65) { c.fillStyle=color;c.fill(p);if(edge){c.strokeStyle=edge;c.lineWidth=weight;c.stroke(p);} }
function line(c,p,color,width=1) { c.strokeStyle=color;c.lineWidth=width;c.stroke(p); }
function oval(c,x,y,rx,ry,color) { c.beginPath();c.ellipse(x,y,rx,ry,0,0,2*PI);c.fillStyle=color;c.fill(); }
function gradient(c,x1,y1,x2,y2,stops) { const g=c.createLinearGradient(x1,y1,x2,y2);stops.forEach(([at,col])=>g.addColorStop(at,col));return g; }
function tint(hex,other,amount) { const a=hex.replace('#',''),b=other.replace('#','');return '#'+[0,2,4].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-amount)+parseInt(b.slice(i,i+2),16)*amount).toString(16).padStart(2,'0')).join(''); }
const forms={
 guppy:{body:'M-27 0 C-17 -4 -11 -12 5 -12 C19 -13 31 -7 37 -2 Q42 1 36 5 C23 14 9 13 -3 9 Q-18 3 -27 3Z',tail:'M-24 -2 C-36 -10 -44 -25 -56 -28 Q-64 -14 -60 -1 Q-65 16 -56 29 C-42 24 -33 9 -24 3Z',dorsal:'M-12 -8 Q-13 -23 -1 -26 Q9 -25 20 -8 C8 -10 -1 -5 -12 -8Z',anal:'M1 8 Q-8 10 -21 14 L-21 15 Q-8 14 3 11Z',pectoral:'M16 2 C6 0 -3 9 1 16 Q9 19 19 5Z',root:[-25,1],eye:[30,-3,3.0],gill:'M22 -7 Q17 0 22 7',mouth:'M36 2 Q39 3 40 1',height:13},
 goldfish:{body:'M-27 0 C-24 -5 -22 -12 -14 -19 C-2 -29 18 -24 29 -14 Q38 -8 39 0 Q39 11 29 18 C11 30 -10 26 -22 13Z',tail:'M-24 -3 C-34 -14 -43 -29 -58 -29 C-59 -18 -48 -4 -39 0 Q-55 9 -60 24 Q-57 32 -51 31 C-37 29 -27 16 -23 5 Q-39 8 -44 16 C-39 6 -32 3 -24 2Z',dorsal:'M-19 -14 Q-16 -35 -5 -35 Q4 -33 6 -29 Q18 -31 24 -15Z',anal:'M-13 16 Q-14 29 -2 32 Q8 28 13 18Z',pectoral:'M17 6 C4 4 -9 17 -4 25 Q5 32 22 10Z',root:[-25,0],eye:[30,-6,3.9],gill:'M23 -13 C15 -7 15 7 23 13',mouth:'M37 3 Q41 5 42 2',height:25},
 cory:{body:'M-29 1 C-20 -3 -15 -14 0 -16 Q17 -20 30 -6 Q38 0 38 8 C34 14 20 16 8 15 L-14 12 Q-25 8 -29 1Z',tail:'M-27 0 L-52 -17 Q-54 -6 -44 0 Q-51 9 -51 16 L-27 5Z',dorsal:'M-16 -8 Q-13 -23 -4 -30 Q5 -29 12 -12Z',anal:'M-17 9 L-23 21 Q-12 22 -2 12Z',pectoral:'M22 9 Q6 6 -2 21 Q8 25 25 12Z',root:[-28,2],eye:[26,-3,3.5],gill:'M19 -7 Q15 2 23 10',mouth:'M33 11 Q37 13 39 10',height:18},
 zebra:{body:'M-30 0 C-20 -1 -10 -8 7 -9 Q24 -10 33 -5 L39 -1 Q41 1 37 3 C26 9 10 11 -3 7 Q-19 2 -30 3Z',tail:'M-28 0 L-50 -14 Q-49 -5 -42 0 Q-48 6 -49 14 L-28 3Z',dorsal:'M-7 -6 Q-5 -17 1 -21 Q6 -19 10 -13 L16 -7 Q3 -8 -7 -6Z',anal:'M-11 5 L-10 16 Q-1 17 12 7Z',pectoral:'M22 2 C14 1 7 7 5 12 Q14 13 24 4Z',root:[-29,1],eye:[31,-2,2.8],gill:'M24 -6 Q20 0 24 6',mouth:'M37 1 L40 1',height:11},
 molly:{body:'M-29 1 C-20 -1 -18 -12 -7 -18 Q9 -25 24 -16 Q32 -11 35 -5 L39 -2 Q42 0 38 3 C32 15 21 23 7 21 Q-13 18 -22 8Z',tail:'M-27 -1 C-36 -5 -42 -15 -51 -19 Q-56 -11 -56 -1 Q-57 10 -51 19 C-40 18 -34 9 -27 5Z',dorsal:'M-19 -8 C-18 -18 -15 -27 -9 -31 L-5 -29 L0 -33 L4 -31 L9 -32 L13 -27 Q20 -22 25 -13 Q3 -17 -19 -8Z',anal:'M-14 10 Q-17 19 -11 25 Q-3 23 8 16Z',pectoral:'M18 5 Q4 3 -2 17 Q4 24 21 9Z',root:[-28,2],eye:[30,-4,3.2],gill:'M23 -10 Q15 1 23 11',mouth:'M37 1 Q40 2 41 0',height:22},
 swordtail:{body:'M-30 0 Q-21 -1 -11 -8 C3 -17 24 -12 34 -6 L39 -2 Q43 0 38 3 C24 12 7 14 -7 9 Q-20 3 -30 3Z',tail:'M-28 -1 Q-39 -7 -49 -20 Q-49 -10 -42 -1 Q-41 7 -48 14 L-63 29 Q-51 26 -42 19 Q-34 13 -28 5Z',dorsal:'M-10 -8 Q-9 -23 -1 -29 Q5 -26 8 -23 L18 -10 Q4 -12 -10 -8Z',anal:'M0 9 Q-10 12 -23 16 L-23 17 Q-9 16 3 12Z',pectoral:'M20 3 Q7 1 3 14 Q11 20 23 6Z',root:[-29,1],eye:[31,-3,3.0],gill:'M24 -8 Q19 0 24 8',mouth:'M38 1 Q40 2 42 0',height:14},
 whitecloud:{body:'M-30 1 C-20 -1 -10 -8 6 -9 Q25 -10 34 -5 L39 -1 Q41 1 37 3 C25 10 11 10 -2 7 Q-19 3 -30 3Z',tail:'M-28 0 Q-39 -5 -51 -15 Q-50 -7 -43 0 Q-43 7 -50 15 Q-37 12 -28 3Z',dorsal:'M-8 -6 L-7 -16 Q-4 -21 1 -23 L7 -18 L15 -7 Q2 -8 -8 -6Z',anal:'M-12 5 L-10 17 Q0 17 12 7Z',pectoral:'M21 3 Q9 3 6 12 Q15 16 24 5Z',root:[-29,1],eye:[31,-2,2.8],gill:'M24 -6 Q20 0 24 6',mouth:'M38 1 L40 1',height:11},
 cardinal:{body:'M-29 0 C-18 -2 -10 -8 3 -10 Q21 -13 32 -6 L39 -1 Q42 1 37 4 C24 12 11 14 -3 9 Q-19 3 -29 3Z',tail:'M-27 0 L-49 -14 Q-48 -5 -41 0 Q-47 7 -48 14 L-27 3Z',dorsal:'M-8 -7 L-4 -23 Q2 -24 6 -18 L14 -8Z',anal:'M-15 5 Q-17 11 -14 18 Q-3 20 14 8Z',pectoral:'M22 2 Q13 3 7 11 Q17 13 24 4Z',root:[-28,1],eye:[31,-2,2.9],gill:'M24 -7 Q20 0 24 7',mouth:'M38 1 L40 1',height:13},
 angel:{body:'M-23 0 Q-17 -12 -7 -23 Q2 -30 11 -26 Q21 -24 27 -13 L32 -7 L38 -2 Q41 0 37 3 L32 5 Q24 15 15 24 Q3 31 -7 22 Q-18 12 -23 0Z',tail:'M-21 -2 Q-32 -10 -46 -17 Q-43 -7 -44 0 Q-43 10 -46 18 Q-32 14 -21 4Z',dorsal:'M-20 -3 C-21 -20 -18 -38 -12 -52 Q-10 -55 -9 -51 C-7 -40 -3 -34 4 -29 Q15 -26 25 -13 Q4 -17 -20 -3Z',anal:'M-19 7 C-22 22 -17 41 -9 51 Q-7 54 -6 49 Q-1 33 11 25 L26 10 Q4 16 -19 7Z',pectoral:'M24 3 Q13 1 1 12 Q8 18 18 12 L27 6Z',root:[-22,1],eye:[30,-4,3.2],gill:'M24 -12 Q16 -2 23 10',mouth:'M37 1 Q39 2 41 0',height:29},
 betta:{body:'M-26 0 C-18 -2 -12 -12 1 -14 Q21 -17 32 -8 L38 -2 Q42 0 38 4 Q29 12 15 14 Q-1 15 -15 7 L-26 4Z',tail:'M-22 -3 C-29 -14 -39 -29 -48 -29 Q-55 -33 -57 -26 Q-65 -27 -61 -18 Q-68 -15 -63 -8 Q-69 -2 -63 5 Q-68 12 -61 17 Q-64 24 -56 25 Q-57 33 -49 31 Q-44 37 -38 29 C-28 25 -24 14 -21 5Z',dorsal:'M-16 -8 C-19 -20 -12 -31 -4 -31 Q1 -36 7 -30 Q13 -34 17 -27 Q23 -28 24 -21 Q30 -16 28 -8 Q8 -8 -16 -8Z',anal:'M-18 7 C-22 18 -22 24 -16 28 Q-18 35 -10 33 Q-5 39 1 33 Q7 38 12 32 Q20 34 22 27 Q27 28 27 20 L29 7 Q9 12 -18 7Z',pectoral:'M23 2 C15 0 5 7 4 14 Q5 20 11 19 Q20 17 26 5Z',root:[-23,1],eye:[31,-3,3.1],gill:'M25 -9 Q18 0 25 9',mouth:'M38 1 Q40 2 42 0',height:15}
};
// Local anatomy corrections only. The guppy and swordtail artwork represents
// ornamental males; no sex field or breeding logic is introduced.
forms.cory.adipose=path('M-26 -1 Q-24 -7 -20 -11 Q-19 -5 -16 -5 L-20 -2Z');
forms.cardinal.adipose=path('M-21 -4 Q-21 -9 -17 -10 Q-12 -10 -12 -6Z');
const pelvicForms={goldfish:path('M9 16 Q5 21 0 30 Q10 29 15 18Z'),cory:path('M7 12 Q-1 20 2 22 Q10 22 14 13Z'),molly:path('M9 18 Q2 24 2 28 Q11 27 15 19Z'),default:path('M8 8 Q1 17 2 19 Q9 17 13 10Z')};
function highlight(c,shape){c.save();c.globalAlpha=.85;fill(c,shape,'#fff3a566','#246e61',1.25);c.restore();}
// Each species has its own palette; variants are derived from AquariumData.
const colors={
 guppy:['#75c9bc','#ee956f','#fff0ad','#3a8c88'],goldfish:['#f7af42','#f19539','#fff0b4','#c96e28'],cory:['#c2bfa2','#a3af95','#f6eed0','#748877'],zebra:['#a9c7cd','#9dc7be','#f1e6b2','#36566f'],molly:['#344951','#516d75','#a1bdb8','#142c37'],swordtail:['#eb8656','#de744d','#ffd79c','#ac4e3a'],whitecloud:['#b7bba1','#dc7758','#fff4bc','#72877d'],cardinal:['#69a8bc','#9fb8bb','#b3eef0','#33778c'],angel:['#d3dac7','#b0c4b4','#fff5d6','#6b8580'],betta:['#568bb5','#ad79ae','#d6dfef','#435e96']
};
const paletteCache=new Map();
function palette(key,variant){const cacheKey=key+':'+variant;if(paletteCache.has(cacheKey))return paletteCache.get(cacheKey);const base=colors[key],v=window.AquariumData?.VARIANTS?.[variant];const valid=v?.species===key;const body=valid?v.color:base[0],tail=valid?v.tail:base[1],light=valid?v.accent:base[2],dark=valid?tint(body,'#263d4b',.48):base[3];const p={body,tail,light,dark,edge:tint(dark,'#789b91',.2),white:tint(light,'#ffffff',.53),deep:tint(body,dark,key==='goldfish'?.36:.48),finDark:tint(tail,'#445367',.3)};paletteCache.set(cacheKey,p);return p;}
function rayPath(root,ends){const p=new Path2D();for(const [x,y] of ends){p.moveTo(root[0],root[1]);p.quadraticCurveTo((root[0]+x)*.5,y*.68,x,y);}return p;}
function scalesPath(height){const p=new Path2D();for(let row=0;row<5;row++)for(let col=0;col<8;col++){const x=-18+col*5+(row%2)*2.5,y=(row-2)*height*.29;p.moveTo(x,y-2);p.quadraticCurveTo(x+3.1,y,x,y+2);}return p;}
const anatomy={
 guppy:{dorsal:[3,-8],anal:[4,8],pectoral:[19,5],mouth:[38,2,.67],gill:[22,0,7]},
 goldfish:{dorsal:[3,-8],anal:[4,8],pectoral:[19,5],mouth:[38,3,1.05],gill:[22,0,12]},
 cory:{dorsal:[3,-8],anal:[4,8],pectoral:[19,5],mouth:[36,11,.9],gill:[20,2,8]},
 zebra:{dorsal:[5,-7],anal:[0,7],pectoral:[22,3],mouth:[38,1,.46],gill:[23,0,5.4]},
 molly:{dorsal:[1,-15],anal:[-2,15],pectoral:[20,6],mouth:[38,-1,.7],gill:[22,0,10.5]},
 swordtail:{dorsal:[3,-10],anal:[-1,8],pectoral:[21,4],mouth:[39,0,.56],gill:[23,0,7]},
 whitecloud:{dorsal:[4,-7],anal:[0,7],pectoral:[22,3],mouth:[38,1,.44],gill:[23,0,5.2]},
 cardinal:{dorsal:[4,-8],anal:[0,8],pectoral:[22,3],mouth:[38,1,.43],gill:[23,1,5.9]},
 angel:{dorsal:[-5,-20],anal:[-4,18],pectoral:[24,4],mouth:[38,0,.62],gill:[23,-1,9]},
 betta:{dorsal:[3,-11],anal:[3,11],pectoral:[23,3],mouth:[39,0,.7],gill:[24,0,8]}
};
// Fin-edge samples follow the species silhouette. Interpolation happens once,
// leaving only cached paths and small affine movements in the animation loop.
const finEdges={
 zebra:{tail:[[-50,-14],[-46,-7],[-42,0],[-46,7],[-49,14]],dorsal:[[-6,-15],[1,-21],[8,-16],[15,-8]],anal:[[-10,16],[-2,16],[10,9]]},
 molly:{tail:[[-51,-19],[-55,-10],[-56,0],[-55,10],[-51,19]],dorsal:[[-17,-22],[-9,-31],[0,-33],[9,-32],[17,-23],[24,-14]],anal:[[-13,24],[-5,23],[7,17]]},
 swordtail:{tail:[[-49,-20],[-46,-10],[-42,0],[-48,14],[-63,29]],dorsal:[[-9,-19],[-1,-29],[8,-23],[17,-11]],anal:[[-12,18],[-5,17],[8,10]]},
 whitecloud:{tail:[[-51,-15],[-47,-8],[-43,0],[-46,8],[-50,15]],dorsal:[[-7,-16],[1,-23],[7,-18],[14,-8]],anal:[[-10,17],[-3,16],[10,8]]},
 cardinal:{tail:[[-49,-14],[-45,-7],[-41,0],[-45,8],[-48,14]],dorsal:[[-4,-23],[2,-22],[8,-15],[13,-9]],anal:[[-15,17],[-7,19],[3,15],[13,9]]},
 angel:{tail:[[-46,-17],[-44,-9],[-44,0],[-44,10],[-46,18]],dorsal:[[-12,-52],[-10,-43],[-4,-34],[5,-29],[15,-23],[24,-14]],anal:[[-9,51],[-9,39],[-4,30],[9,26],[24,12]]},
 betta:{tail:[[-48,-29],[-57,-26],[-61,-18],[-63,-8],[-63,5],[-61,17],[-56,25],[-49,31],[-38,29]],dorsal:[[-15,-23],[-6,-31],[3,-32],[12,-30],[19,-25],[25,-19],[28,-9]],anal:[[-18,22],[-15,29],[-8,34],[1,34],[12,32],[22,27],[27,20]]}
};
function finRayLayers(root,edge){
 const dark=new Path2D(),light=new Path2D();
 for(let segment=0;segment<edge.length-1;segment++)for(let n=0;n<4;n++){
  const t=n/4,ex=edge[segment][0]*(1-t)+edge[segment+1][0]*t,ey=edge[segment][1]*(1-t)+edge[segment+1][1]*t;
  const p=n%3===0?light:dark;p.moveTo(...root);p.bezierCurveTo(root[0]+(ex-root[0])*.32,root[1]+(ey-root[1])*.2,ex,ey*.85,ex,ey);
 }
 return {dark,light};
}
for(const [key,f] of Object.entries(forms)){
 for(const name of ['body','tail','dorsal','anal','pectoral','gill','mouth'])f[name]=path(f[name]);
 f.scales=scalesPath(f.height);
 const ends=key==='guppy'?Array.from({length:13},(_,i)=>[-58+Math.abs(i-6)*.32,-25+i*4.2]):key==='goldfish'?[[-56,-26],[-51,-18],[-45,-10],[-39,-3],[-55,22],[-51,28],[-43,23],[-35,16]]:key==='betta'?Array.from({length:14},(_,i)=>[-59+Math.abs(i-6.5)*1.4,-25+i*4.3]):key==='swordtail'?[[-47,-17],[-44,-10],[-41,-3],[-44,8],[-50,15],[-60,27]]:Array.from({length:9},(_,i)=>[-48+Math.abs(i-4)*.35,-14+i*3.5]);
 f.tailRays=rayPath(f.root,ends);
 f.dorsalRays=rayPath([8,-6],key==='angel'?[[-13,-47],[-12,-38],[-11,-29],[-5,-29],[5,-26],[14,-21]]:key==='betta'?[[-13,-22],[-7,-29],[0,-30],[8,-28],[15,-23],[21,-19]]:[[-13,-19],[-7,-25],[-1,-27],[5,-25],[11,-21],[17,-15]]);
 f.analRays=rayPath([8,7],key==='angel'?[[-10,47],[-11,37],[-9,28],[-4,25],[4,25]]:key==='betta'?[[-16,26],[-9,31],[-1,32],[7,31],[15,27],[22,21]]:[[-13,17],[-7,22],[0,22],[6,18]]);
 f.pectoralRays=rayPath(anatomy[key].pectoral,[[0,13],[4,17],[9,18],[14,13]]);
 f.fineRays={};for(const name of ['tail','dorsal','anal','pectoral']){
  const root=name==='tail'?f.root:anatomy[key][name];
  const fallback=name==='tail'?ends:name==='dorsal'?[[-13,-19],[-7,-25],[-1,-27],[5,-25],[11,-21],[17,-15]]:name==='anal'?[[-13,17],[-7,22],[0,22],[6,18]]:[[3,12],[5,17],[11,18],[18,10]];
  const edge=finEdges[key]?.[name]||fallback;
  if(!finEdges[key]){
   // Preserve the established three reference species' dense fan texture.
   const dark=new Path2D(),light=new Path2D(),points=[];
   if(name==='tail'){const top=key==='goldfish'?-29:key==='guppy'?-29:-19,bottom=key==='goldfish'?32:key==='guppy'?30:19;for(let i=0;i<29;i++)points.push([-64+Math.abs(i-14)*.12,top+(bottom-top)*i/28]);}
   else for(let i=0;i<25;i++)points.push([-24+i*2.4,name==='dorsal'?-40:name==='anal'?36:25]);
   points.forEach(([ex,ey],i)=>{const q=i%3===0?light:dark;q.moveTo(...root);q.bezierCurveTo(root[0]+(ex-root[0])*.32,root[1]+(ey-root[1])*.2,ex+(name==='tail'?3:0),ey*.8,ex,ey);});
   f.fineRays[name]={dark,light};
  }else f.fineRays[name]=finRayLayers(root,edge);
  if(finEdges[key]?.[name])f[name+'Rays']=rayPath(root,edge);
 }
}
const detail={
 guppyBand:path('M-23 1 Q-1 7 27 1'),guppySpots:path('M-53 -16a2 2 0 1 0 .01 0 M-48 -7a2.2 2.2 0 1 0 .01 0 M-54 4a2.3 2.3 0 1 0 .01 0 M-49 15a2.2 2.2 0 1 0 .01 0 M-42 0a1.5 1.5 0 1 0 .01 0 M-55 22a1.7 1.7 0 1 0 .01 0'),
 coryLateral:path('M-27 3 Q-6 0 11 6 Q23 9 33 6'),coryPlates:path('M-18 -5l4 9 -3 5 M-9 -10l5 13 -4 9 M1 -12l5 16 -4 9 M11 -10l5 15 -3 9'),coryPatch:path('M17 -13 Q21 -7 23 7 L17 11 Q10 0 10 -14Z'),
 corySpots:path('M-13 -7a2.5 2 0 1 0 .01 0 M-4 -10a3 2 0 1 0 .01 0 M2 -3a2 1.6 0 1 0 .01 0 M-11 5a2 1.7 0 1 0 .01 0 M-22 0a1.6 1.6 0 1 0 .01 0 M6 8a2 1.6 0 1 0 .01 0'),
 zebraStripes:path('M-34 -6 Q-3 -10 32 -5 M-35 -1 Q-1 -4 34 -1 M-35 4 Q0 2 33 3 M-27 8 Q0 7 30 7'),
 cloudBand:path('M-28 0 Q0 -5 30 -2'),cloudShadow:path('M-28 3 Q0 0 27 1'),cloudTailSpot:path('M-26 -3 Q-20 -4 -21 3 Q-25 7 -28 3Z'),
 neonBlue:path('M-29 -2 Q0 -6 31 -3'),neonRed:path('M-26 3 Q0 1 24 3 L28 10 Q-1 16 -26 5Z'),
 angelBars:path('M-12 -26 Q-9 -5 -11 20 L-4 24 Q-2 -1 -5 -29Z M3 -30 Q7 0 7 29 L14 24 Q13 -2 10 -28Z M23 -19 L26 -12 Q24 0 27 12 L22 17 Q19 0 20 -20Z'),
 goldCheek:path('M25 -2 Q35 -3 34 8 Q28 13 23 8Z'),
 mollHighlight:path('M-22 1 Q0 -13 27 -5'),mollBelly:path('M-19 8 Q2 20 28 9'),
 swordStripe:path('M-26 1 Q0 -3 27 1'),swordEdge:path('M-41 9 Q-49 19 -61 28'),
 highlight:path('M-17 -4 Q3 -17 22 -7'),belly:path('M-16 6 Q3 16 25 6'),
 zebraFinBars:path('M-48 -10 L-33 -2 M-47 -6 L-32 0 M-46 7 L-32 2 M-47 11 L-33 3'),
 angelFinBars:path('M-15 -47 Q-12 -27 -10 -15 L-5 -17 Q-7 -34 -10 -50Z M-17 15 Q-16 36 -9 49 L-7 43 Q-11 27 -10 17Z M2 -32 L5 -15 L10 -15 L8 -29Z M2 16 L1 35 L7 28 L8 15Z'),
 swordLateral:path('M-27 2 C-13 1 5 1 24 3'),
 cloudCopper:path('M-24 -2 Q-1 -10 22 -5'),
 bettaShoulder:path('M-16 0 Q-2 -9 17 -7'),
 bettaGill:path('M22 -7 Q15 -1 20 7'),bettaLip:path('M33 -9 Q26 -12 17 -9')
};
function articulated(c,f,name,p,phase){
 const tail=name==='tail',dorsal=name==='dorsal',anal=name==='anal';
 const root=tail?f.root:dorsal?[3,-8]:anal?[4,8]:[19,5];
 const angle=tail?Math.sin(phase)*.075:Math.sin(phase*(dorsal?.7:anal?.83:1.5)+(dorsal?1.3:anal?2.1:.4))*((dorsal||anal)?.034:.13);
 c.save();c.translate(...root);c.rotate(angle);c.scale(tail?.93+.07*Math.cos(phase):1,tail?1-.05*Math.sin(phase):1);c.translate(-root[0],-root[1]);
 const g=gradient(c,root[0],root[1],tail?-60:0,tail?17:30,[[0,p.body],[.4,p.tail],[1,tint(p.tail,p.light,.55)]]);
 c.globalAlpha*=tail?.94:.84;fill(c,f[name],g,p.finDark,.6);
 c.save();c.clip(f[name]);line(c,f[name+'Rays'],p.light,.72);c.globalAlpha*=.45;line(c,f[name+'Rays'],p.finDark,.3);c.restore();
 if(tail&&f===forms.guppy){c.save();c.clip(f.tail);c.globalAlpha*=.45;fill(c,detail.guppySpots,p.dark);c.restore();}
 if(tail&&f===forms.swordtail)line(c,detail.swordEdge,p.dark,.8);
 c.restore();
}
function markings(c,key,p){
 const f=forms[key];c.save();c.clip(f.body);
 c.globalAlpha*=key==='molly'?.12:.14;line(c,f.scales,p.light,.6);c.restore();
 c.save();c.clip(f.body);
 switch(key){
 case 'guppy':c.globalAlpha*=.78;line(c,detail.guppyBand,p.light,3.2);break;
 case 'goldfish':c.globalAlpha*=.23;fill(c,detail.goldCheek,p.tail);break;
 case 'cory':c.globalAlpha*=.58;line(c,detail.coryLateral,p.dark,3.4);fill(c,detail.corySpots,p.dark);c.globalAlpha*=.6;fill(c,detail.coryPatch,p.dark);line(c,detail.coryPlates,p.dark,.6);break;
 case 'zebra':c.globalAlpha*=.88;line(c,detail.zebraStripes,'#3e627b',1.65);break;
 case 'whitecloud':line(c,detail.cloudShadow,'#647b7c',2.1);line(c,detail.cloudBand,'#fff2b7',2.3);fill(c,detail.cloudTailSpot,'#536a6b');break;
 case 'cardinal':fill(c,detail.neonRed,'#dd666b');line(c,detail.neonBlue,'#368ec2',4.8);line(c,detail.neonBlue,'#7ce9df',2.5);line(c,detail.neonBlue,'#d1fff2',.55);break;
 case 'angel':c.globalAlpha*=.51;fill(c,detail.angelBars,p.dark);break;
 case 'molly':c.globalAlpha*=.58;line(c,detail.mollHighlight,p.light,1.1);c.globalAlpha*=.5;line(c,detail.mollBelly,p.light,1.2);break;
 case 'swordtail':c.globalAlpha*=.37;line(c,detail.swordStripe,p.light,1.7);break;
 case 'betta':c.globalAlpha*=.6;line(c,detail.bettaLip,p.light,1.2);break;
 }
 c.restore();
}
function threads(c,key,phase,p,selected=false){
 if(key==='angel'){
 c.strokeStyle=selected?'#246e61':p.white;c.lineWidth=selected?2.4:1.05;c.beginPath();c.moveTo(19,15);c.bezierCurveTo(17,32,23+Math.sin(phase*.6)*2,44,30+Math.sin(phase*.6)*2,51);c.moveTo(13,18);c.bezierCurveTo(10,33,12+Math.sin(phase*.6+.7)*3,46,18+Math.sin(phase*.6+.7)*2,55);c.stroke();
 }else if(key==='betta'){
 c.strokeStyle=selected?'#246e61':p.light;c.lineWidth=selected?2.4:1.35;c.beginPath();c.moveTo(19,9);c.bezierCurveTo(12,19,12+Math.sin(phase*.8)*2,25,6+Math.sin(phase*.8)*2,28);c.moveTo(15,10);c.bezierCurveTo(8,18,8+Math.sin(phase*.8+.8)*2,24,2+Math.sin(phase*.8+.8)*2,26);c.stroke();
 }else if(key==='cory'){
 c.strokeStyle=p.dark;c.lineWidth=.85;c.beginPath();c.moveTo(35,11);c.quadraticCurveTo(40,16,44,13);c.moveTo(32,12);c.quadraticCurveTo(32,19,37,18);c.moveTo(38,10);c.quadraticCurveTo(43,11,45,8);c.stroke();
 }
}
function originalDraw(c,key,x,y,size,turn=1,angle=0,phase=0,variant='normal'){
 const f=forms[key];if(!f)return;const p=palette(key,variant),t=Math.max(-1,Math.min(1,Number.isFinite(turn)?turn:1)),width=.15+.85*Math.abs(t);
 c.save();c.translate(x,y);c.rotate(angle*.35);c.scale(size/100,size/100);
 // An edge-on silhouette retains a little width as the existing turn value crosses
 // zero. Highlights/near-side fins recede before the other side comes into view.
 c.scale((t<0?-1:1)*width,1);c.lineCap='round';c.lineJoin='round';
 const bend=Math.sin(phase)*.012;c.transform(1,bend,Math.sin(phase+.7)*.009,1,0,0);
 articulated(c,f,'tail',p,phase,width);
 articulated(c,f,'dorsal',p,phase,width);
 articulated(c,f,'anal',p,phase,width);
 const body=gradient(c,0,-f.height,2,f.height,[[0,p.light],[.24,tint(p.body,p.light,.27)],[.55,p.body],[.9,p.deep],[1,tint(p.deep,p.light,.2)]]);
 fill(c,f.body,body,p.edge,.65);
 markings(c,key,p);
 c.save();c.clip(f.body);c.globalAlpha*=.21;line(c,detail.highlight,p.white,2.3);c.globalAlpha*=.5;line(c,detail.belly,p.white,1.4);c.restore();
 // Gill and lateral cheek shading preserve the head/body division at tank scale.
 c.save();c.globalAlpha*=.42;line(c,f.gill,p.dark,.85);c.globalAlpha*=.6;c.translate(1,0);line(c,f.gill,p.light,.6);c.restore();
 c.save();c.globalAlpha*=.35+.65*width;articulated(c,f,'pectoral',p,phase,width);c.restore();
 threads(c,key,phase,p);
 const [ex,ey,er]=f.eye;c.save();c.globalAlpha*=.3+.7*width;
 oval(c,ex,ey,er+.7,er+.65,tint(p.dark,p.body,.4));oval(c,ex+.08,ey-.05,er,er,p.light);oval(c,ex+.48,ey,er*.68,er*.78,'#243b43');oval(c,ex+.85,ey-.9,er*.25,er*.25,'#fffdf0');oval(c,ex-.55,ey+.8,er*.11,er*.11,'#a2d9d1');
 line(c,f.mouth,p.dark,.72);c.restore();c.restore();
}

// R2: a continuous curved caudal axis carries the body, tail and fin roots.
// Static pigment/scale layers are rasterized once at observation resolution;
// broad overlapping strips bend the posterior without rebuilding paths per frame.
const refined=new Set(Object.keys(forms));
const bodyLayers=new Map();
const sheen=path('M-25 1 C-13 -5 0 -15 18 -10 Q27 -8 30 -4 C14 -7 -4 -3 -25 3Z');
const bellySheen=path('M-22 5 C-3 14 17 19 32 6 C22 24 -3 23 -22 5Z');
const headContours=path('M20 -11 Q28 -12 34 -5 M26 8 Q31 10 35 6');
function radial(c,x,y,r,color,clear='rgba(255,255,255,0)') { const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,clear);return g; }
function bodyLayer(key,variant,p){
 const id=key+':'+variant;if(bodyLayers.has(id))return bodyLayers.get(id);
 const f=forms[key],top=Math.min(-33,-f.height-5),height=Math.max(66,f.height*2+10);
 const canvas=new OffscreenCanvas(672,height*8),c=canvas.getContext('2d');
 c.scale(8,8);c.translate(36,-top);
 fill(c,f.body,gradient(c,-5,-f.height,9,f.height,[[0,tint(p.deep,p.light,.12)],[.15,tint(p.body,p.light,.34)],[.38,p.body],[.68,tint(p.body,p.light,.13)],[.85,p.deep],[1,tint(p.deep,p.dark,.55)]]),tint(p.deep,p.body,.5),.35);
 c.save();c.clip(f.body);
 // Volumetric flank: a broad pearly shoulder and a cooler translucent belly.
 c.fillStyle=radial(c,6,-f.height*.32,f.height*1.6,tint(p.light,'#ffffff',.24)+'78');c.fillRect(-34,top,80,height);
 c.fillStyle=radial(c,22,f.height*.35,f.height*.85,p.deep+'80',p.deep+'00');c.fillRect(-34,top,80,height);
 c.globalAlpha=.15;fill(c,sheen,p.white);c.globalAlpha=.1;fill(c,bellySheen,p.white);c.globalAlpha=1;
 markings(c,key,p);
 // Species-specific pigment sits inside the same cached volume as the scales.
 if(key==='molly'){
  c.globalAlpha=.14;for(let i=0;i<32;i++){const xx=-15+(i*5.61)%37,yy=-15+(i*3.17)%29;oval(c,xx,yy,.23,.45,p.light);}
 }else if(key==='swordtail'){
  c.globalAlpha=.2;line(c,detail.swordLateral,p.dark,.7);
 }else if(key==='whitecloud'){
  c.globalAlpha=.25;line(c,detail.cloudCopper,p.tail,1.1);
 }else if(key==='cardinal'){
  c.globalAlpha=.28;line(c,detail.neonBlue,p.white,.35);
 }else if(key==='betta'){
  c.globalAlpha=.21;line(c,detail.bettaShoulder,p.light,1.4);
  c.globalAlpha=.3;line(c,detail.bettaGill,p.dark,1.15);
 }
 c.globalAlpha=1;
 // Staggered crescent scales follow the flank; they fade at the face and belly.
 if(key!=='cory')for(let row=-3;row<=3;row++)for(let col=0;col<10;col++){
  const sx=-25+col*4.7+(row%2)*2.35,sy=row*f.height*.23;
  if(sx>19)continue;const a=(1-Math.abs(row)/5)*(key==='molly'?.09:key==='angel'?.1:.14);
  c.globalAlpha=a;c.strokeStyle=p.dark;c.lineWidth=.34;c.beginPath();c.moveTo(sx,sy-1.7);c.quadraticCurveTo(sx+3,sy,sx,sy+1.7);c.stroke();
  c.globalAlpha=a*1.65;c.strokeStyle=p.white;c.lineWidth=.28;c.beginPath();c.moveTo(sx-.5,sy-1.4);c.quadraticCurveTo(sx+1.8,sy-.8,sx+1.7,sy+.1);c.stroke();
 }
 if(key==='cory'){
  // Interlocking bony scutes are elongated plates rather than round fish scales.
  for(let i=0;i<7;i++){const sx=-23+i*5.6;c.globalAlpha=.24;c.strokeStyle=p.dark;c.lineWidth=.55;c.beginPath();c.moveTo(sx,-11);c.quadraticCurveTo(sx+5,-1,sx+1,9);c.stroke();c.globalAlpha=.3;c.strokeStyle=p.white;c.lineWidth=.65;c.beginPath();c.moveTo(sx+1,-10);c.quadraticCurveTo(sx+5,-2,sx+2,1);c.stroke();}
  c.globalAlpha=.2;for(let i=0;i<44;i++){const sx=-23+(i*7.13)%50,sy=-13+(i*3.77)%25;oval(c,sx,sy,.42+(i%3)*.13,.37,p.dark);}
 }
 c.globalAlpha=.17;line(c,headContours,p.white,.7);c.restore();
 const layer={canvas,top,height};bodyLayers.set(id,layer);return layer;
}
function axis(x,phase){const u=Math.max(0,(12-x)/43);return Math.sin(phase-u*1.25)*3.1*u*u;}
function slope(x,phase){return (axis(x+.2,phase)-axis(x-.2,phase))/.4;}
function atRoot(c,x,y,phase,fn){c.save();c.translate(x,y+axis(x,phase));c.rotate(Math.atan(slope(x,phase)));c.translate(-x,-y);fn();c.restore();}
function curvedBody(c,key,variant,p,phase){
 const {canvas:layer,top,height}=bodyLayer(key,variant,p);
 // A stable face plus a finely sampled smooth backbone. Overlap prevents pinholes.
 for(let left=-34;left<12;left+=2.5){const right=Math.min(12,left+2.5),mid=(left+right)/2;c.save();c.translate(mid,axis(mid,phase));c.rotate(Math.atan(slope(mid,phase)));c.drawImage(layer,(left+36)*8,0,(right-left+.2)*8,height*8,left-mid-.1,top,right-left+.2,height);c.restore();}
 c.drawImage(layer,48*8,0,288,height*8,12,top,36,height);
}
function fineFin(c,key,f,name,p,phase,selected=false){
 const tail=name==='tail',root=tail?f.root:anatomy[key][name];
 atRoot(c,...root,phase,()=>{
  const flutter=Math.sin(phase*(tail?1:name==='pectoral'?1.7:.72)+(name==='anal'?1.9:0));
  c.translate(...root);c.rotate(flutter*(tail?.12:name==='pectoral'?.14:.038));c.scale(tail?.94+.06*Math.cos(phase):1,1);c.translate(-root[0],-root[1]);
  c.globalAlpha*=key==='cardinal'?(tail?.48:.38):key==='zebra'?(tail?.66:.48):key==='betta'?(tail?.9:.78):tail?.85:.62;
  const g=gradient(c,root[0],root[1],tail?-60:0,tail?20:32,[[0,p.body+'ea'],[.28,p.tail+'dd'],[.72,tint(p.tail,p.light,.31)+'b0'],[1,p.light+'44']]);
  fill(c,f[name],g,p.finDark+'65',.38);
  c.save();c.clip(f[name]);
  // Broad folds under very fine alternating rays give membranes their thickness.
  c.globalAlpha*=.32;line(c,f[name+'Rays'],p.finDark,1.6);c.globalAlpha*=1.75;line(c,f[name+'Rays'],p.light,.55);
  c.globalAlpha=.33;
  line(c,f.fineRays[name].dark,p.finDark,.25);line(c,f.fineRays[name].light,p.white,.3);
  // Long fins have deeper folds; clear little shoaling fish keep delicate membranes.
  if(key==='betta'){
   c.globalAlpha=.23;line(c,f[name+'Rays'],p.dark,1.15);
   c.globalAlpha=.3;line(c,f[name],p.light,1.2);
  }else if(key==='angel'){
   c.globalAlpha=.28;line(c,f[name],p.white,.8);
   if(name==='dorsal'||name==='anal'){c.globalAlpha=.31;fill(c,detail.angelFinBars,p.dark);}
  }else if(key==='whitecloud'&&(tail||name==='dorsal'||name==='anal')){
   c.globalAlpha=.65;line(c,f[name],p.light,1.8);
   c.globalAlpha=.4;line(c,f[name+'Rays'],p.tail,.85);
  }else if(key==='swordtail'&&tail){c.globalAlpha=.7;line(c,detail.swordEdge,p.dark,1.15);}
  else if(key==='zebra'&&tail){c.globalAlpha=.22;line(c,detail.zebraFinBars,p.dark,.65);}
  else if(key==='molly'&&name==='dorsal'){
   c.globalAlpha=.3;for(let row=0;row<3;row++)for(let col=0;col<7;col++)oval(c,-14+col*4.6,-16-row*4.5,.45,.65,p.light);
  }
  if(tail&&key==='guppy'){c.globalAlpha=.3;fill(c,detail.guppySpots,p.dark);c.globalAlpha=.16;line(c,detail.guppySpots,p.light,.8);}
  c.restore();
  if(selected)highlight(c,f[name]);
 });
}
function pelvic(c,key,p,phase,selected=false){if(key==='angel'||key==='betta')return;atRoot(c,7,10,phase,()=>{c.globalAlpha*=.48;const fin=pelvicForms[key]||pelvicForms.default;fill(c,fin,gradient(c,10,8,3,28,[[0,p.body],[1,p.light+'55']]),p.finDark+'70',.4);c.globalAlpha*=.6;line(c,fin,p.light,.4);if(selected)highlight(c,fin);});}
function adipose(c,key,p,phase,selected=false){const fin=forms[key].adipose;if(!fin)return;atRoot(c,-20,-4,phase,()=>{c.globalAlpha*=.65;fill(c,fin,p.body+'9c',p.finDark+'85',.45);if(key==='cory')line(c,path('M-26 -1 Q-24 -7 -20 -11'),p.finDark,.7);if(selected)highlight(c,fin);});}
function breathPose(seconds){const phase=seconds*2*PI*.63;return {mouthOpen:(.5+.5*Math.sin(phase))**2,gillOpen:(.5+.5*Math.sin(phase-.85))**2};}
function breathingHead(c,key,f,p,pose,emphasis){
 const op=pose.gillOpen*(emphasis?1:0.48),[mx,my,base]=anatomy[key].mouth;
 // Mouth aperture changes height; the lower lip moves rather than blinking a line.
 const open=.13+pose.mouthOpen*(emphasis?2.5:.7)*Math.min(1,base/.67);
 oval(c,mx,my+.2,base+.35,open*.72,p.deep);oval(c,mx+.28,my+.1,base*.62,open*.51,'#473b39');
 c.strokeStyle=tint(p.body,p.light,.5);c.lineWidth=.68;c.beginPath();c.moveTo(mx-1.6,my-open*.55);c.quadraticCurveTo(mx+.8,my-open*.82,mx+1,my-open*.25);c.stroke();
 c.strokeStyle=p.dark;c.lineWidth=.58;c.beginPath();c.moveTo(mx-1.5,my+open*.6);c.quadraticCurveTo(mx+.2,my+open*.95,mx+1,my+open*.35);c.stroke();
 // The operculum is a separate curved flap: a dark slit appears under its aft rim.
 const [gx,gy,gh]=anatomy[key].gill;
 c.save();c.translate(gx+4,gy-gh*.7);c.rotate(-op*.075);c.translate(-gx-4,-gy+gh*.7);
 const flap=new Path2D();flap.moveTo(gx+5,gy-gh);flap.bezierCurveTo(gx-4-op*1.5,gy-gh*.7,gx-4-op*2.1,gy+gh*.7,gx+4,gy+gh);flap.quadraticCurveTo(gx+10,gy+gh*.4,gx+5,gy-gh);flap.closePath();
 c.save();c.translate(-op*1.5,.15);fill(c,flap,p.deep+'b0');c.restore();c.save();c.globalAlpha*=.55;fill(c,flap,gradient(c,gx-4,gy,gx+10,gy,[[0,tint(p.body,p.deep,.3)],[.35,tint(p.body,p.light,.32)],[1,p.body]]));c.restore();
 c.strokeStyle=p.deep+'80';c.lineWidth=.55;c.beginPath();c.moveTo(gx+5,gy-gh);c.bezierCurveTo(gx-4-op*1.5,gy-gh*.7,gx-4-op*2.1,gy+gh*.7,gx+4,gy+gh);c.stroke();
 c.strokeStyle=p.white+'55';c.lineWidth=.5;c.beginPath();c.moveTo(gx+4,gy-gh*.82);c.bezierCurveTo(gx-2-op*1.3,gy-gh*.5,gx-2-op*1.5,gy+gh*.45,gx+3,gy+gh*.8);c.stroke();c.restore();
}
function draw(c,key,x,y,size,turn=1,angle=0,phase=0,variant='normal',options={}){
 if(!refined.has(key))return originalDraw(c,key,x,y,size,turn,angle,phase,variant);
 const f=forms[key];if(!f)return;const p=palette(key,variant),t=Math.max(-1,Math.min(1,Number.isFinite(turn)?turn:1)),width=.15+.85*Math.abs(t);
 c.save();c.translate(x,y);c.rotate(angle*.35);c.scale(size/100*(t<0?-1:1)*width,size/100);c.lineCap='round';c.lineJoin='round';
 for(const name of ['tail','dorsal','anal'])fineFin(c,key,f,name,p,phase,options.highlightPart===name);
 adipose(c,key,p,phase,options.highlightPart==='adipose');
 pelvic(c,key,p,phase,options.highlightPart==='pelvic');curvedBody(c,key,variant,p,phase);
 const pose=breathPose(options.breathTime??phase*.22);breathingHead(c,key,f,p,pose,!!options.breathing&&!!options.breathEmphasis);
 c.save();c.globalAlpha*=.3+.7*width;fineFin(c,key,f,'pectoral',p,phase,options.highlightPart==='pectoral');c.restore();threads(c,key,phase,p,options.highlightPart==='pelvic');
 const [ex,ey,oldr]=f.eye,er=oldr*.77;c.save();c.globalAlpha*=.3+.7*width;
 oval(c,ex,ey,er+1,er+.9,p.deep+'90');oval(c,ex,ey,er+.45,er+.35,tint(p.body,p.light,.45));oval(c,ex,ey,er,er,p.dark);
 oval(c,ex+.1,ey-.04,er*.84,er*.87,gradient(c,ex,ey-er,ex,ey+er,[[0,p.light],[.45,tint(p.body,p.light,.45)],[1,p.deep]]));oval(c,ex+.38,ey,er*.59,er*.7,'#183038');oval(c,ex+.8,ey-.7,er*.2,er*.2,'#fffef5');oval(c,ex-.55,ey+.8,er*.09,er*.09,'#b5e8dd');c.restore();c.restore();
}
const finNames=Object.freeze({dorsal:'背鰭',pectoral:'胸鰭',pelvic:'腹鰭',anal:'臀鰭',tail:'尾鰭',adipose:'脂鰭'});
const finDescriptions=Object.freeze({dorsal:'在背部，幫助魚維持穩定。',pectoral:'在鰓蓋後方的身體兩側，協助調整方向與姿態。',pelvic:'在腹側，是成對的鰭；側面觀察時可能互相遮住。',anal:'在身體後段的腹側，通常能協助維持穩定。',tail:'在身體最後方，和身體一起擺動，幫助魚前進。',adipose:'背鰭與尾鰭之間的小鰭。不是每一種魚都有脂鰭。'});
const appearanceNotes=Object.freeze({guppy:'這個造型參考雄孔雀魚：尾鰭寬大，臀鰭細長；雌魚的臀鰭通常呈扇形。',goldfish:'圓潤魚身與展開的尾鰭是觀賞金魚的造型；金魚有許多不同品種。',cory:'嘴邊有觸鬚，背鰭後方還有一片小脂鰭。這裡是常見鼠魚的概括造型。',zebra:'細長魚身有水平條紋，魚鰭較小；沒有脂鰭。',molly:'這個造型保留扇形臀鰭。黑摩利雌魚通常有扇形臀鰭，雄魚的臀鰭較細長。',swordtail:'這個造型參考雄紅劍魚：尾鰭下緣延長成劍狀，臀鰭細長；雌魚通常沒有長劍尾。',whitecloud:'細長魚身有明顯色帶，鰭帶紅色；沒有脂鰭。',cardinal:'藍色亮帶和紅色體側是特色，背鰭後方還有一片小脂鰭。',angel:'背鰭與臀鰭高而長；腹部兩條細長的絲狀構造是腹鰭。',betta:'這裡採長鰭觀賞鬥魚的造型；腹側前方的細長鰭是腹鰭，後方大片的是臀鰭。'});
function getFinInfo(key){if(!forms[key])return null;return {note:appearanceNotes[key],parts:Object.keys(finNames).filter(id=>id!=='adipose'||!!forms[key].adipose).map(id=>({id,name:finNames[id],description:id==='anal'&&(key==='guppy'||key==='swordtail')?'圖中是雄魚細長的臀鰭，又稱交接器；雌魚的臀鰭通常呈扇形。':id==='pelvic'&&key==='angel'?'腹側的兩條細長鰭是腹鰭，不是觸鬚。':finDescriptions[id]}))};}
const hitBounds=Object.freeze({guppy:{left:-64,right:42,top:-30,bottom:31},goldfish:{left:-63,right:43,top:-37,bottom:35},cory:{left:-55,right:46,top:-32,bottom:26},zebra:{left:-53,right:41,top:-23,bottom:20},molly:{left:-58,right:42,top:-35,bottom:29},swordtail:{left:-65,right:43,top:-31,bottom:32},whitecloud:{left:-54,right:41,top:-25,bottom:21},cardinal:{left:-52,right:42,top:-25,bottom:22},angel:{left:-49,right:42,top:-55,bottom:57},betta:{left:-68,right:43,top:-37,bottom:40}});
window.AquariumFishArt=Object.freeze({draw,hitBounds,breathPose,getFinInfo,version:'0.4.1-r2-anatomy'});
})();
