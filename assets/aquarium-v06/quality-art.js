/* Cached marine scenery, visual palette identity and observation regions. No per-frame asset creation. */
(() => {
'use strict';
const D=window.AquariumData,old=window.AquariumDecorArt,fish=window.AquariumFishArt;
const P=d=>new Path2D(d);
function shape(c,d,fill,stroke,w=1){const p=P(d);if(fill){c.fillStyle=fill;c.fill(p);}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke(p);}return p;}
function grad(c,x,y,x2,y2,a,b){const g=c.createLinearGradient(x,y,x2,y2);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
function marineScene(c,W,H,substrate,color){
 c.fillStyle=grad(c,0,0,0,H,'#dff8ff','#439fd0');c.fillRect(0,0,W,H);
 const glow=c.createRadialGradient(W*.36,0,0,W*.36,H*.1,W*.72);glow.addColorStop(0,'#fffce8aa');glow.addColorStop(1,'#fffce800');c.fillStyle=glow;c.fillRect(0,0,W,H);
 for(let i=0;i<4;i++)shape(c,`M${W*(.03+i*.26)} 0 L${W*(.1+i*.26)} 0 L${W*(.3+i*.23)} ${H*.9} L${W*(.15+i*.23)} ${H*.9}Z`,grad(c,0,0,0,H,'#f6feff40','#effbff00'));
 // Low, distant reef shelves leave the central water open for the player's own design.
 shape(c,`M0 ${H*.8} L${W*.04} ${H*.75} L${W*.09} ${H*.76} L${W*.11} ${H*.81} L${W*.18} ${H*.8} L${W*.22} ${H*.85} L${W*.35} ${H*.88} L${W*.65} ${H*.88} L${W*.76} ${H*.84} L${W*.8} ${H*.78} L${W*.88} ${H*.8} L${W*.92} ${H*.74} L${W} ${H*.77} L${W} ${H} L0 ${H}Z`,'#81c2d3');
 shape(c,`M0 ${H*.88} Q${W*.27} ${H*.82} ${W*.5} ${H*.88} Q${W*.76} ${H*.82} ${W} ${H*.87} L${W} ${H} L0 ${H}Z`,'#cfe8e7');
 const sand=P(`M0 ${H*.91} Q${W*.24} ${H*.85} ${W*.49} ${H*.91} Q${W*.76} ${H*.85} ${W} ${H*.9} L${W} ${H} L0 ${H}Z`);c.save();c.clip(sand);c.translate(0,H*.84);old.sand(c,substrate,W,H*.16,color);if(substrate==='white'&&!color){c.fillStyle='#fffff445';c.fillRect(0,0,W,H*.16);}c.restore();
 for(const side of [0,1]){c.save();c.translate(side?W*.96:W*.035,H*.905);c.scale((side?-1:1)*Math.min(W/1100,1.2),H/550);c.globalAlpha=.8;
 const rock=shape(c,'M-50 3 L-42 -35 Q-19 -62 9 -38 L44 -28 L67 5Z',grad(c,-30,-50,20,0,'#b8d6cf','#7fa6b1'),'#d6e8dd',1.4);shape(c,'M-33 -30 Q-13 -42 5 -29 M16 -20 L40 -13',null,'#e0eee1',2);
 for(let j=0;j<3;j++){const x=-17+j*19;c.strokeStyle=['#c9b7ce','#b0d2cb','#d0c5a8'][j];c.lineWidth=4;c.lineCap='round';c.stroke(P(`M${x} -30 l${j-1} -32 m0 18 l-10 -15 m10 8 l11 -14`));}c.restore();}
 // Soft caustic ribbons are painted once with the backdrop, away from the fish silhouettes.
 c.save();c.globalAlpha=.16;for(let i=0;i<7;i++)shape(c,`M${W*(i*.16-.04)} ${H*.95} q${W*.06} ${-H*.028} ${W*.12} 0 t${W*.12} 0`,null,'#ffffff',2);c.restore();
 shape(c,`M0 25 Q${W*.27} 10 ${W*.54} 24 T${W} 22`,null,'#ffffff77',2);
}
// Use the artwork's rendered colours, rather than palette numbers, for the colour achievement.
const colorCache=new Map();
function visualColor(id,index=0){const key=id+':'+index;if(colorCache.has(key))return colorCache.get(key);const a=document.createElement('canvas');a.width=96;a.height=104;const c=a.getContext('2d');old.draw(c,id,48,99,70,86,index);const data=c.getImageData(0,0,96,104).data;let rr=0,gg=0,bb=0,weight=0;for(let i=0;i<data.length;i+=4){if(data[i+3]<180)continue;const l=(data[i]+data[i+1]+data[i+2])/3;if(l<35||l>242)continue;const w=data[i+3]/255;rr+=data[i]*w;gg+=data[i+1]*w;bb+=data[i+2]*w;weight+=w;}const rgb=weight?[rr/weight,gg/weight,bb/weight]:[128,128,128];const linear=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});const [r,g,b]=linear,xyz=[(r*.4124564+g*.3575761+b*.1804375)/.95047,r*.2126729+g*.7151522+b*.072175,(r*.0193339+g*.119192+b*.9503041)/1.08883].map(t=>t>.008856?Math.cbrt(t):7.787*t+16/116);const lab=[116*xyz[1]-16,500*(xyz[0]-xyz[1]),200*(xyz[1]-xyz[2])];const out={rgb,lab,hex:'#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')};colorCache.set(key,out);return out;}
function distinctColors(items){const colors=items.map(d=>visualColor(d.decoration,d.color||0).lab),distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));let count=colors.length?1:0;for(let i=0;i<colors.length;i++)for(let j=i+1;j<colors.length;j++)if(distance(colors[i],colors[j])>=20){count=2;for(let k=j+1;k<colors.length;k++)if(distance(colors[i],colors[k])>=20&&distance(colors[j],colors[k])>=20)return 3;}return count;}
function swatches(id){return old.colors(id).map(([name,hex],i)=>({name,hex:i?hex:visualColor(id,0).hex}));}
window.AquariumDecorArt=Object.freeze({...old,visualColor,distinctColors,swatches});
window.AquariumSceneArt=Object.freeze({marine:marineScene});
window.AquariumFishArt=Object.freeze({...fish,getFinInfo:id=>D.OBSERVATIONS[id]?{...D.OBSERVATIONS[id],parts:D.OBSERVATIONS[id].parts.map(p=>({...p}))}:fish.getFinInfo(id),draw(c,key,x,y,size,turn,angle,phase,variant,options={}){fish.draw(c,key,x,y,size,turn,angle,phase,variant,options);if(['body','cheek','caudalSpine','tailMark','eyes'].includes(options.highlightPart)&&D.OBSERVATIONS[key]){c.save();c.translate(x,y);c.rotate((angle||0)*.35);c.scale(size/100*(turn<0?-1:1)*(.2+.8*Math.abs(turn||1)),size/100);c.strokeStyle='#e3b451';c.lineWidth=1.6;c.setLineDash([3,2]);c.beginPath();const region={body:[2,0,38,24],cheek:[24,2,8,12],caudalSpine:[-31,0,7,6],tailMark:[-28,-8,6,6],eyes:[32,-6,6,6]}[options.highlightPart];c.ellipse(...region,0,0,Math.PI*2);c.stroke();c.restore();}}});
})();
