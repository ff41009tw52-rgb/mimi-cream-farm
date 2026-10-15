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
 guppy:{body:'M-27 0 C-17 -4 -11 -12 5 -12 C19 -13 31 -7 37 -2 Q42 1 36 5 C23 14 9 13 -3 9 Q-18 3 -27 3Z',tail:'M-24 -2 C-36 -10 -44 -25 -56 -28 Q-64 -14 -60 -1 Q-65 16 -56 29 C-42 24 -33 9 -24 3Z',dorsal:'M-12 -8 Q-13 -23 -1 -26 Q9 -25 20 -8 C8 -10 -1 -5 -12 -8Z',anal:'M-13 6 Q-14 19 -3 21 L10 9Z',pectoral:'M16 2 C6 0 -3 9 1 16 Q9 19 19 5Z',root:[-25,1],eye:[30,-3,3.0],gill:'M22 -7 Q17 0 22 7',mouth:'M36 2 Q39 3 40 1',height:13},
 goldfish:{body:'M-27 0 C-24 -5 -22 -12 -14 -19 C-2 -29 18 -24 29 -14 Q38 -8 39 0 Q39 11 29 18 C11 30 -10 26 -22 13Z',tail:'M-24 -3 C-34 -14 -43 -29 -58 -29 C-59 -18 -48 -4 -39 0 Q-55 9 -60 24 Q-57 32 -51 31 C-37 29 -27 16 -23 5 Q-39 8 -44 16 C-39 6 -32 3 -24 2Z',dorsal:'M-19 -14 Q-16 -35 -5 -35 Q4 -33 6 -29 Q18 -31 24 -15Z',anal:'M-13 16 Q-14 29 -2 32 Q8 28 13 18Z',pectoral:'M17 6 C4 4 -9 17 -4 25 Q5 32 22 10Z',root:[-25,0],eye:[30,-6,3.9],gill:'M23 -13 C15 -7 15 7 23 13',mouth:'M37 3 Q41 5 42 2',height:25},
 cory:{body:'M-29 1 C-20 -3 -15 -14 0 -16 Q17 -20 30 -6 Q38 0 38 8 C34 14 20 16 8 15 L-14 12 Q-25 8 -29 1Z',tail:'M-27 0 L-52 -17 Q-54 -6 -44 0 Q-51 9 -51 16 L-27 5Z',dorsal:'M-16 -8 Q-13 -23 -4 -30 Q5 -29 12 -12Z',anal:'M-17 9 L-23 21 Q-12 22 -2 12Z',pectoral:'M22 9 Q6 6 -2 21 Q8 25 25 12Z',root:[-28,2],eye:[26,-3,3.5],gill:'M19 -7 Q15 2 23 10',mouth:'M33 11 Q37 13 39 10',height:18},
 zebra:{body:'M-30 0 C-18 -4 -9 -10 8 -10 Q27 -10 39 -1 Q40 1 36 4 C17 14 -6 9 -19 4Z',tail:'M-28 0 L-50 -14 Q-49 -5 -42 0 Q-48 6 -49 14 L-28 3Z',dorsal:'M-9 -7 Q-7 -20 2 -21 L15 -8Z',anal:'M-12 6 L-13 17 Q-3 18 10 8Z',pectoral:'M20 3 Q9 3 7 13 Q15 15 23 5Z',root:[-29,1],eye:[31,-2,2.8],gill:'M24 -6 Q20 0 24 6',mouth:'M37 1 L40 1',height:11},
 molly:{body:'M-29 1 C-17 -4 -19 -15 -4 -20 Q15 -25 29 -12 Q35 -6 38 -2 Q42 1 37 5 C26 21 9 23 -4 17 Q-19 10 -29 4Z',tail:'M-27 -1 Q-39 -11 -51 -19 Q-59 -1 -51 19 Q-38 14 -27 5Z',dorsal:'M-18 -10 Q-14 -31 -1 -33 Q14 -32 23 -13 Q4 -19 -18 -10Z',anal:'M-15 11 Q-19 23 -8 26 L9 16Z',pectoral:'M18 5 Q4 3 -2 17 Q4 24 21 9Z',root:[-28,2],eye:[30,-4,3.2],gill:'M23 -10 Q15 1 23 11',mouth:'M37 1 Q40 2 41 0',height:22},
 swordtail:{body:'M-30 0 C-17 -2 -9 -12 8 -13 Q26 -12 38 -3 Q43 0 38 4 C20 15 2 14 -14 6Z',tail:'M-28 -1 L-49 -20 Q-47 -6 -41 0 Q-43 8 -51 16 L-63 29 Q-41 21 -29 5Z',dorsal:'M-11 -9 Q-8 -28 2 -29 Q11 -25 18 -10Z',anal:'M-14 7 L-17 19 Q-7 21 9 10Z',pectoral:'M20 3 Q7 1 3 14 Q11 20 23 6Z',root:[-29,1],eye:[31,-3,3.0],gill:'M24 -8 Q19 0 24 8',mouth:'M38 1 Q40 2 42 0',height:14},
 whitecloud:{body:'M-30 1 C-16 -5 -5 -11 11 -10 Q29 -10 39 -1 Q40 1 37 4 C20 11 3 11 -13 5Z',tail:'M-28 0 L-51 -15 Q-49 -4 -42 0 Q-48 6 -50 15 L-28 3Z',dorsal:'M-9 -7 Q-9 -20 2 -23 Q10 -18 15 -8Z',anal:'M-13 6 L-11 18 Q0 17 11 8Z',pectoral:'M21 3 Q9 3 6 12 Q15 16 24 5Z',root:[-29,1],eye:[31,-2,2.8],gill:'M24 -6 Q20 0 24 6',mouth:'M38 1 L40 1',height:11},
 cardinal:{body:'M-29 0 C-16 -3 -8 -12 9 -12 Q28 -11 39 -1 Q42 1 36 5 C19 14 -1 12 -16 5Z',tail:'M-27 0 L-49 -14 Q-48 -5 -41 0 Q-47 7 -48 14 L-27 3Z',dorsal:'M-9 -8 L-4 -23 Q4 -24 14 -9Z',anal:'M-15 6 L-15 19 Q-3 20 13 9Z',pectoral:'M21 3 Q11 2 7 12 Q16 16 24 5Z',root:[-28,1],eye:[31,-2,2.9],gill:'M24 -7 Q20 0 24 7',mouth:'M38 1 L40 1',height:13},
 angel:{body:'M-23 0 Q-16 -13 -6 -23 Q6 -30 18 -21 Q28 -15 33 -7 L39 -1 Q40 2 35 5 Q26 14 16 22 Q3 30 -9 19 Q-19 10 -23 0Z',tail:'M-21 -2 Q-34 -12 -46 -17 Q-42 0 -46 18 Q-32 13 -21 4Z',dorsal:'M-19 -5 Q-20 -26 -13 -49 Q-11 -54 -9 -53 Q-4 -36 3 -30 Q16 -27 25 -13Z',anal:'M-18 8 Q-20 26 -10 49 Q-7 54 -6 51 Q1 31 12 25 L25 11Z',pectoral:'M23 4 Q7 1 1 15 Q14 19 26 8Z',root:[-22,1],eye:[30,-4,3.2],gill:'M24 -12 Q16 -2 23 10',mouth:'M37 1 Q39 2 41 0',height:29},
 betta:{body:'M-26 0 C-18 -4 -12 -14 4 -14 C18 -15 31 -9 38 -2 Q42 1 37 5 C27 14 10 15 -3 11 Q-18 5 -26 4Z',tail:'M-22 -3 C-34 -21 -44 -34 -55 -27 Q-63 -27 -60 -18 Q-68 -14 -62 -5 Q-69 2 -62 9 Q-66 18 -57 21 Q-60 31 -51 31 Q-46 37 -40 30 C-29 26 -25 13 -21 5Z',dorsal:'M-15 -9 C-17 -24 -9 -33 1 -32 Q6 -37 11 -29 Q18 -31 20 -23 Q28 -20 28 -8 Q5 -8 -15 -9Z',anal:'M-18 7 Q-24 23 -15 29 Q-17 37 -8 34 Q-2 39 4 33 Q11 37 16 30 Q24 31 26 22 L28 8Z',pectoral:'M22 2 C9 0 1 12 5 19 Q14 22 25 6Z',root:[-23,1],eye:[31,-3,3.1],gill:'M25 -9 Q18 0 25 9',mouth:'M38 1 Q40 2 42 0',height:15}
};
// Each species has its own palette; variants are derived from AquariumData.
const colors={
 guppy:['#75c9bc','#ee956f','#fff0ad','#3a8c88'],goldfish:['#f7af42','#f19539','#fff0b4','#c96e28'],cory:['#c2bfa2','#a3af95','#f6eed0','#748877'],zebra:['#a9c7cd','#9dc7be','#f1e6b2','#36566f'],molly:['#344951','#516d75','#a1bdb8','#142c37'],swordtail:['#eb8656','#de744d','#ffd79c','#ac4e3a'],whitecloud:['#b7bba1','#dc7758','#fff4bc','#72877d'],cardinal:['#69a8bc','#9fb8bb','#b3eef0','#33778c'],angel:['#d3dac7','#b0c4b4','#fff5d6','#6b8580'],betta:['#568bb5','#ad79ae','#d6dfef','#435e96']
};
const paletteCache=new Map();
function palette(key,variant){const cacheKey=key+':'+variant;if(paletteCache.has(cacheKey))return paletteCache.get(cacheKey);const base=colors[key],v=window.AquariumData?.VARIANTS?.[variant];const valid=v?.species===key;const body=valid?v.color:base[0],tail=valid?v.tail:base[1],light=valid?v.accent:base[2],dark=valid?tint(body,'#263d4b',.48):base[3];const p={body,tail,light,dark,edge:tint(dark,'#789b91',.2),white:tint(light,'#ffffff',.53),deep:tint(body,dark,key==='goldfish'?.36:.48),finDark:tint(tail,'#445367',.3)};paletteCache.set(cacheKey,p);return p;}
function rayPath(root,ends){const p=new Path2D();for(const [x,y] of ends){p.moveTo(root[0],root[1]);p.quadraticCurveTo((root[0]+x)*.5,y*.68,x,y);}return p;}
function scalesPath(height){const p=new Path2D();for(let row=0;row<5;row++)for(let col=0;col<8;col++){const x=-18+col*5+(row%2)*2.5,y=(row-2)*height*.29;p.moveTo(x,y-2);p.quadraticCurveTo(x+3.1,y,x,y+2);}return p;}
for(const [key,f] of Object.entries(forms)){
 for(const name of ['body','tail','dorsal','anal','pectoral','gill','mouth'])f[name]=path(f[name]);
 f.scales=scalesPath(f.height);
 const ends=key==='guppy'?Array.from({length:13},(_,i)=>[-58+Math.abs(i-6)*.32,-25+i*4.2]):key==='goldfish'?[[-56,-26],[-51,-18],[-45,-10],[-39,-3],[-55,22],[-51,28],[-43,23],[-35,16]]:key==='betta'?Array.from({length:14},(_,i)=>[-59+Math.abs(i-6.5)*1.4,-25+i*4.3]):key==='swordtail'?[[-47,-17],[-44,-10],[-41,-3],[-44,8],[-50,15],[-60,27]]:Array.from({length:9},(_,i)=>[-48+Math.abs(i-4)*.35,-14+i*3.5]);
 f.tailRays=rayPath(f.root,ends);
 f.dorsalRays=rayPath([8,-6],key==='angel'?[[-13,-47],[-12,-38],[-11,-29],[-5,-29],[5,-26],[14,-21]]:key==='betta'?[[-13,-22],[-7,-29],[0,-30],[8,-28],[15,-23],[21,-19]]:[[-13,-19],[-7,-25],[-1,-27],[5,-25],[11,-21],[17,-15]]);
 f.analRays=rayPath([8,7],key==='angel'?[[-10,47],[-11,37],[-9,28],[-4,25],[4,25]]:key==='betta'?[[-16,26],[-9,31],[-1,32],[7,31],[15,27],[22,21]]:[[-13,17],[-7,22],[0,22],[6,18]]);
 f.pectoralRays=rayPath([19,5],[[0,13],[4,17],[9,18],[14,13]]);
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
 c.globalAlpha*=key==='molly'?.24:.14;line(c,f.scales,p.light,.6);c.restore();
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
function threads(c,key,phase,p){
 if(key==='angel'){
 c.strokeStyle=p.white;c.lineWidth=1.05;c.beginPath();c.moveTo(19,15);c.bezierCurveTo(17,32,23+Math.sin(phase*.6)*2,44,30+Math.sin(phase*.6)*2,51);c.moveTo(13,18);c.bezierCurveTo(10,33,12+Math.sin(phase*.6+.7)*3,46,18+Math.sin(phase*.6+.7)*2,55);c.stroke();
 }else if(key==='betta'){
 c.strokeStyle=p.light;c.lineWidth=1.35;c.beginPath();c.moveTo(19,9);c.bezierCurveTo(12,19,12+Math.sin(phase*.8)*2,25,6+Math.sin(phase*.8)*2,28);c.moveTo(15,10);c.bezierCurveTo(8,18,8+Math.sin(phase*.8+.8)*2,24,2+Math.sin(phase*.8+.8)*2,26);c.stroke();
 }else if(key==='cory'){
 c.strokeStyle=p.dark;c.lineWidth=.85;c.beginPath();c.moveTo(35,11);c.quadraticCurveTo(40,16,44,13);c.moveTo(32,12);c.quadraticCurveTo(32,19,37,18);c.moveTo(38,10);c.quadraticCurveTo(43,11,45,8);c.stroke();
 }
}
function draw(c,key,x,y,size,turn=1,angle=0,phase=0,variant='normal'){
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
const hitBounds=Object.freeze({guppy:{left:-64,right:42,top:-30,bottom:31},goldfish:{left:-63,right:43,top:-37,bottom:35},cory:{left:-55,right:46,top:-32,bottom:26},zebra:{left:-53,right:41,top:-23,bottom:20},molly:{left:-58,right:42,top:-35,bottom:29},swordtail:{left:-65,right:43,top:-31,bottom:32},whitecloud:{left:-54,right:41,top:-25,bottom:21},cardinal:{left:-52,right:42,top:-25,bottom:22},angel:{left:-49,right:42,top:-55,bottom:57},betta:{left:-68,right:43,top:-37,bottom:40}});
window.AquariumFishArt=Object.freeze({draw,hitBounds,version:'0.4.1'});
})();
