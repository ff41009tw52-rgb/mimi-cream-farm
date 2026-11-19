import { SHEET, fishShape } from './templates.js?v=3.6.5';
import { distance, homography, project, validQuad } from './geometry.js';

export function manualMap(points, source) {
  if (!validQuad(points,source.width,source.height)) return null;
  return homography(SHEET.centers,points);
}

function cropScale(map,[left,top,width,height]) {
  const [a,b,c,d]=[[left,top],[left+width,top],[left+width,top+height],[left,top+height]]
    .map(point=>project(map,point));
  // Use the available detail on the shorter projected edge, up to twice the template resolution.
  return Math.max(1,Math.min(2,distance(a,b)/width,distance(d,c)/width,
    distance(a,d)/height,distance(b,c)/height));
}

export function extractFish(source, type, map, {scaleX=1,scaleY=scaleX,revision}={}) {
  const {bounds,outline,strokeWidth} = fishShape(type,revision);
  const [left,top,width,height] = bounds;
  const imageMap = map.map((value,index)=>value*(index<3 ? scaleX : index<6 ? scaleY : 1));
  const scale = cropScale(imageMap,bounds);
  const input = source.getContext('2d',{willReadFrequently:true}).getImageData(0,0,source.width,source.height);
  const out = document.createElement('canvas');
  out.width = Math.floor(width*scale);
  out.height = Math.floor(height*scale);
  const ctx = out.getContext('2d');
  const pixels = ctx.createImageData(out.width,out.height);
  const dx = width/out.width, dy = height/out.height;
  const [uX,uY,u0,vX,vY,v0,zX,zY,z0] = imageMap;
  const stride = input.width*4;
  for (let y=0, pixel=0; y<out.height; y++) {
    const sheetY = top+(y+.5)*dy;
    const rowU = uY*sheetY+u0, rowV = vY*sheetY+v0, rowZ = zY*sheetY+z0;
    for (let x=0; x<out.width; x++, pixel+=4) {
      const sheetX = left+(x+.5)*dx, z = zX*sheetX+rowZ;
      const px = (uX*sheetX+rowU)/z-.5, py = (vX*sheetX+rowV)/z-.5;
      const ix = Math.floor(px), iy = Math.floor(py);
      if (ix<0 || iy<0 || ix>=input.width-1 || iy>=input.height-1) continue;
      const fx = px-ix, fy = py-iy;
      const start = (iy*input.width+ix)*4;
      for (let c=0; c<3; c++) {
        const p=start+c;
        pixels.data[pixel+c] = (input.data[p]*(1-fx)+input.data[p+4]*fx)*(1-fy)
          + (input.data[p+stride]*(1-fx)+input.data[p+stride+4]*fx)*fy;
      }
      pixels.data[pixel+3] = 255;
    }
  }
  ctx.putImageData(pixels,0,0);
  ctx.globalCompositeOperation = 'destination-in';
  // Apply a full-size mask so pixels outside the Path2D are cleared.
  const mask = document.createElement('canvas');
  mask.width = out.width; mask.height = out.height;
  const maskCtx = mask.getContext('2d');
  maskCtx.scale(1/dx,1/dy);
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
