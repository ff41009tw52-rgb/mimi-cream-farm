import { SHEET, fishShape } from './templates.js?v=3.1.0';
import { homography, project, validQuad } from './geometry.js';

export function manualMap(points, source) {
  if (!validQuad(points,source.width,source.height)) return null;
  return homography(SHEET.centers,points);
}

export function extractFish(source, type, map, {scaleX=1,scaleY=scaleX,revision}={}) {
  const {bounds,outline,strokeWidth} = fishShape(type,revision);
  const [left,top,width,height] = bounds;
  const input = source.getContext('2d',{willReadFrequently:true}).getImageData(0,0,source.width,source.height);
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  const pixels = ctx.createImageData(width,height);
  const m = map;
  for (let y=0, i=0; y<height; y++) {
    for (let x=0; x<width; x++, i+=4) {
      const [u,v] = project(m,[left+x+.5,top+y+.5]);
      const px = u*scaleX-.5, py = v*scaleY-.5;
      const ix = Math.floor(px), iy = Math.floor(py);
      if (ix<0 || iy<0 || ix>=input.width-1 || iy>=input.height-1) continue;
      const a = px-ix, b = py-iy;
      const start = (iy*input.width+ix)*4, stride = input.width*4;
      for (let c=0; c<3; c++) {
        const p=start+c;
        pixels.data[i+c] = (input.data[p]*(1-a)+input.data[p+4]*a)*(1-b)
          + (input.data[p+stride]*(1-a)+input.data[p+stride+4]*a)*b;
      }
      pixels.data[i+3] = 255;
    }
  }
  ctx.putImageData(pixels,0,0);
  ctx.globalCompositeOperation = 'destination-in';
  // Apply a full-size mask so pixels outside the Path2D are cleared.
  const mask = document.createElement('canvas');
  mask.width = width; mask.height = height;
  const maskCtx = mask.getContext('2d');
  maskCtx.translate(-left,-top);
  const path = new Path2D(outline);
  maskCtx.fill(path);
  if (strokeWidth) {
    maskCtx.lineWidth = strokeWidth;
    maskCtx.lineJoin = 'round';
    maskCtx.stroke(path);
  }
  ctx.drawImage(mask,0,0);
  return new Promise((resolve,reject) => out.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('PNG 編碼失敗'));
  },'image/png'));
}
