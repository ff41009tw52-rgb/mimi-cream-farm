import { ARTWORK_REVISION, CODES, MARKER_GROUPS, SHEET, fishShape } from '../templates.js?v=3.4.0';
import { homography, project } from '../geometry.js';

const a4 = [[0,0],[SHEET.width,0],[SHEET.width,SHEET.height],[0,SHEET.height]];
const palette = ['#f08066','#f0c955','#4eb7b3','#8265b8','#245aa1'];
export const paints = [[338,286],[399,284],[463,289],[520,290]];
export const scenarios = {
  straight: {},
  rotate: {angle:17},
  backward: {angle:180},
  portrait: {angle:90, scale:.82},
  trapezoid: {warp:1},
  offset: {angle:-9, x:44, y:38, scale:.86},
  dim: {light:.57, wash:12},
  glare: {light:.75, wash:32, shadow:.66},
  combined: {angle:-16, x:-29, y:23, warp:1, light:.67, wash:18, scale:.86, shadow:.84},
  distant: {scale:.64, angle:7},
  blur: {blur:1.05, angle:9, warp:.75},
  coveredEdge: {cover:'edge', angle:8},
  coveredOne: {cover:'one'},
  coveredFour: {cover:'four'},
  blank: {blank:true},
};
export function canvas(width,height) {
  const c = document.createElement('canvas');
  c.width=width; c.height=height;
  return c;
}
export async function sourceSheet(type, variant=0, revision=ARTWORK_REVISION) {
  const c = canvas(800, Math.round(SHEET.height)), ctx=c.getContext('2d');
  const {outline,strokeWidth}=fishShape(type,revision);
  const fish=new Path2D(outline);
  if (revision===ARTWORK_REVISION) {
    const img = new Image();
    img.src = new URL('../templates/'+type+'.svg?v=3.4.0',import.meta.url);
    await img.decode();
    ctx.drawImage(img,0,0,c.width,c.height);
  } else {
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,c.width,c.height);
    const marker=MARKER_GROUPS.findIndex(group=>group.type===type && group.revision===revision)*4;
    for (const [index,[x,y]] of SHEET.centers.entries()) {
      const size=SHEET.cell;
      const left=x-3.5*size,top=y-3.5*size;
      ctx.fillStyle='#000';
      ctx.fillRect(left,top,7*size,7*size);
      ctx.fillStyle='#fff';
      CODES[marker+index].forEach((bit,i)=>{
        if (bit) ctx.fillRect(left+(i%5+1)*size,top+(Math.floor(i/5)+1)*size,size,size);
      });
    }
    ctx.strokeStyle='#171717';
    ctx.lineWidth=strokeWidth;
    ctx.stroke(fish);
  }
  ctx.save();
  ctx.clip(fish);
  ctx.globalAlpha=.87;
  for (let i=0; i<paints.length; i++) {
    const [x,y] = paints[i];
    ctx.fillStyle = palette[(i+variant)%palette.length];
    ctx.fillRect(x-32, y-86, 61, 173);
  }
  ctx.lineWidth=2.3;
  for (let i=0; i<52; i++) {
    ctx.strokeStyle=palette[(i+variant+2)%palette.length];
    ctx.globalAlpha=.14;
    ctx.beginPath();
    ctx.moveTo(150+i*8,193 + (i%6)*6);
    ctx.bezierCurveTo(143+i*8,252,162+i*8,312,157+i*8,397-(i%8)*6);
    ctx.stroke();
  }
  ctx.restore();
  return c;
}

export function scene(sheet, options={}) {
  const {angle=0, scale=1, x=0, y=0, warp=0, light=1, wash=0, shadow=1, blur=0, cover, blank=false} = options;
  const c = canvas(896,704), ctx=c.getContext('2d',{willReadFrequently:true});
  const img = ctx.createImageData(c.width,c.height);
  const src = sheet.getContext('2d').getImageData(0,0,sheet.width,sheet.height);
  const theta=angle*Math.PI/180, sine=Math.sin(theta), cosine=Math.cos(theta);
  const quad = [[-328,-232],[328-warp*56,-232+warp*30],[328+warp*30,232-warp*23],[-328+warp*47,232+warp*19]]
    .map(([x0,y0]) => [448+x+(x0*cosine-y0*sine)*scale,352+y+(x0*sine+y0*cosine)*scale]);
  const m=homography(quad,a4), expected=homography(a4,quad);
  for(let sy=0,i=0;sy<c.height;sy++) {
    for(let sx=0;sx<c.width;sx++,i+=4) {
      const [u,v]=project(m,[sx+.5,sy+.5]);
      const ix=Math.floor(u), iy=Math.floor(v);
      const desk=[142,128,113];
      const isPaper=!blank && ix>=0 && ix<src.width && iy>=0 && iy<src.height;
      const isCovered=cover==='edge' ? u>380&&u<505&&v<31
        : (cover==='one' || cover==='four') && SHEET.centers.some(([tx,ty], index) =>
          (cover==='four'||index===0)&&Math.abs(u-tx)<28&&Math.abs(v-ty)<29);
      const tint=light*(shadow+(1-shadow)*sx/c.width), noise=((sx*19+sy*31)%17-8)*.45;
      for(let k=0;k<3;k++){
        const original=isPaper ? (isCovered ? [201,164,128][k] : src.data[(iy*src.width+ix)*4+k]) : desk[k];
        img.data[i+k]=original*tint+wash+noise;
      }
      img.data[i+3]=255;
    }
  }
  ctx.putImageData(img,0,0);
  if (blur) {
    const softened = canvas(c.width,c.height);
    const sctx=softened.getContext('2d');
    sctx.filter=`blur(${blur}px)`;
    sctx.drawImage(c,0,0);
    ctx.drawImage(softened,0,0);
  }
  return {c,expected};
}
