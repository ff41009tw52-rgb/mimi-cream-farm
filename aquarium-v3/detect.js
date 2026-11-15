import { area, convexHull, cross, distance, homography, project, validQuad } from './geometry.js';
import { CODES, FISH, SHEET, fishShape } from './templates.js?v=3.1.0';

const GRID = [[0,0],[7,0],[7,7],[0,7]];
const species = Object.keys(FISH);
const half = SHEET.cell * 3.5;
const sheetTags = SHEET.centers.map(([x,y]) => GRID.map(([u,v]) =>
  [x + (u-3.5)*SHEET.cell, y + (v-3.5)*SHEET.cell]
));

function threshold(rgba, width, height) {
  const stride = width + 1;
  const gray = new Uint8Array(width * height);
  const integral = new Uint32Array(stride * (height + 1));
  for (let y = 0, i = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++, i++) {
      const offset = i * 4;
      const value = (77*rgba[offset] + 150*rgba[offset+1] + 29*rgba[offset+2]) >> 8;
      gray[i] = value;
      sum += value;
      integral[(y+1)*stride+x+1] = integral[y*stride+x+1] + sum;
    }
  }
  const mask = new Uint8Array(gray.length);
  const radius = Math.max(10, Math.round(Math.max(width,height)*.029));
  for (let y = 0, i = 0; y < height; y++) {
    const top = Math.max(0, y-radius), bottom = Math.min(height,y+radius+1);
    const row = (bottom - top);
    for (let x = 0; x < width; x++, i++) {
      if (gray[i] > 198) continue;
      const left = Math.max(0,x-radius), right = Math.min(width,x+radius+1);
      const sum = integral[bottom*stride+right] + integral[top*stride+left]
        - integral[top*stride+right] - integral[bottom*stride+left];
      const local = sum / (row * (right-left));
      mask[i] = Number(gray[i]+12 < local*.87);
    }
  }
  return {gray, mask};
}

function markerQuad(outline) {
  const hull = convexHull(outline);
  if (hull.length < 4) return null;
  const quad = hull.slice();
  while (quad.length > 4) {
    let least = Infinity, remove = 0;
    for (let i = 0; i < quad.length; i++) {
      const triangle = cross(quad[(i+quad.length-1)%quad.length], quad[i], quad[(i+1)%quad.length]);
      if (triangle < least) {
        least = triangle;
        remove = i;
      }
    }
    quad.splice(remove,1);
  }
  const sides = quad.map((p,i) => distance(p,quad[(i+1)%4]));
  if (area(quad) < area(hull)*.8 || Math.min(...sides) < 15 || Math.min(...sides) < Math.max(...sides)*.37) return null;

  // Fit each edge to raster boundary samples, then intersect neighboring edges.
  const lines = quad.map(([x,y], i) => {
    const [ex,ey] = quad[(i+1)%4];
    const len = sides[i], dx = (ex-x)/len, dy = (ey-y)/len;
    let n = 0, s = 0, t = 0, ss = 0, st = 0;
    for (const [px,py] of outline) {
      const u = (px-x)*dx + (py-y)*dy, v = -(px-x)*dy + (py-y)*dx;
      if (u < len*.13 || u > len*.87 || Math.abs(v) > 2) continue;
      n++; s += u; t += v; ss += u*u; st += u*v;
    }
    const variance = n*ss-s*s;
    const slope = variance > 0 ? (n*st-s*t)/variance : 0;
    const offset = (n ? (t-slope*s)/n : 0) - .42;
    const a = -dy-slope*dx, b = dx-slope*dy;
    return [a,b,a*x+b*y+offset];
  });
  return lines.map(([a,b,c],i) => {
    const [d,e,f] = lines[(i+3)%4];
    const det = a*e-b*d;
    return Math.abs(det) < .1 ? quad[i] : [(c*e-b*f)/det,(a*f-c*d)/det];
  });
}

function decode(quad, gray, width, height) {
  const map = homography(GRID,quad);
  if (!map) return null;
  function sample(x,y) {
    const [px,py] = project(map,[x,y]).map(Math.floor);
    return px >= 0 && px < width && py >= 0 && py < height ? gray[py*width+px] : NaN;
  }
  const ring = [], quiet = [], values = [];
  for (let y=0; y<7; y++) {
    for (let x=0; x<7; x++) {
      const v = sample(x+.5,y+.5);
      if (x && y && x < 6 && y < 6) values.push(v);
      else ring.push(v);
    }
  }
  for (let i=1; i<6; i++) quiet.push(sample(i+.5,-.45), sample(i+.5,7.45),sample(-.45,i+.5),sample(7.45,i+.5));
  const average = list => list.reduce((a,b) => a+b,0)/list.length;
  const dark = average(ring);
  const bright = average(quiet);
  const limit = (dark + bright) / 2;
  if (!(bright-dark >= 46) || ring.filter(v => v > limit).length > 2 || quiet.filter(v => v < limit).length > 3) return null;
  let bits = values.map(v => Number(v > limit));
  for (let turn=0; turn<4; turn++) {
    const id = CODES.findIndex(code => code.reduce((n,b,i) => n + Number(b !== bits[i]),0) <= 2);
    if (id >= 0) {
      const corners = quad.map((_,i) => quad[(i + turn)%4]);
      const center = project(homography(GRID,corners),[3.5,3.5]);
      return { id, corners, center, contrast: bright-dark };
    }
    // Move the next sampled corner to the canonical top-left.
    bits = bits.map((_,i) => bits[(i%5)*5 + (4-Math.floor(i/5))]);
  }
  return null;
}

export function detectSheet({data, width, height}) {
  const {gray, mask} = threshold(data,width,height);
  const queue = new Int32Array(mask.length);
  const rowMin = new Int32Array(height);
  const rowMax = new Int32Array(height);
  const tags = new Map();
  const maxSide = Math.max(width,height)*.125;
  let partial = 0;
  for (let y=1; y<height-1; y++) {
    for (let x=1; x<width-1; x++) {
      const origin = y*width+x;
      if (!mask[origin]) continue;
      let first=0, last=1, minX=x, maxX=x, minY=y, maxY=y;
      queue[0] = origin;
      mask[origin] = 0;
      while (first < last) {
        const p = queue[first++];
        const py = Math.floor(p/width), px = p-py*width;
        minX = Math.min(minX,px); maxX = Math.max(maxX,px);
        minY = Math.min(minY,py); maxY = Math.max(maxY,py);
        for (let k=0; k<4; k++) {
          if ((k===0 && px===0) || (k===1 && px===width-1)) continue;
          const q = k===0 ? p-1 : k===1 ? p+1 : k===2 ? p-width : p+width;
          if (mask[q]) {
            mask[q] = 0;
            queue[last++] = q;
          }
        }
      }
      const w = maxX-minX+1, h = maxY-minY+1;
      if (w<15 || h<15 || w>maxSide || h>maxSide || last<w*h*.22 || minX<2 || minY<2 || maxX>=width-2 || maxY>=height-2) continue;
      rowMin.fill(width,minY,maxY+1);
      rowMax.fill(-1,minY,maxY+1);
      for (let i=0; i<last; i++) {
        const py = Math.floor(queue[i]/width), px = queue[i]-py*width;
        rowMin[py] = Math.min(rowMin[py],px);
        rowMax[py] = Math.max(rowMax[py],px);
      }
      const outline = [];
      for (let py=minY; py<=maxY; py++) {
        if (rowMax[py] < 0) continue;
        outline.push([rowMin[py]+.5,py+.5],[rowMax[py]+.5,py+.5]);
      }
      // Include horizontal edges too, so a square aligned to the sensor has enough edge samples.
      const columns = new Map();
      for (let i=0; i<last; i++) {
        const py = Math.floor(queue[i]/width), px = queue[i]-py*width;
        const col = columns.get(px);
        if (col) {
          col[0] = Math.min(col[0],py);
          col[1] = Math.max(col[1],py);
        } else columns.set(px,[py,py]);
      }
      for (const [px,[top,bottom]] of columns) outline.push([px+.5,top+.5],[px+.5,bottom+.5]);
      const quad = markerQuad(outline);
      if (!quad) continue;
      const hit = decode(quad,gray,width,height);
      if (hit) {
        if (tags.has(hit.id)) return { kind:'uncertain', marks:tags.size+1 };
        tags.set(hit.id,hit);
      } else if (last/(w*h)>.42) partial++;
    }
  }
  if (!tags.size) return { kind:'empty', marks:0, partial };
  const match = { kind:'uncertain', marks:tags.size, partial };
  if (tags.size !== 4) return match;
  const group = Math.floor(tags.keys().next().value/4);
  const ordered = Array.from({length:4},(_,i) => tags.get(group*4+i));
  if (ordered.some(tag => !tag)) return match;
  const corners = ordered.map(tag => tag.center);
  if (!validQuad(corners,width,height,.10)) return match;
  const canonical = sheetTags.flat();
  const observed = ordered.flatMap(tag => tag.corners);
  const map = homography(canonical,observed);
  if (!map) return match;
  const residuals = canonical.map((point,i) => distance(project(map,point),observed[i]));
  const markerSpan = ordered.map(t => Math.sqrt(area(t.corners)));
  const tolerance = Math.max(1.9, Math.min(...markerSpan)*.105);
  if (Math.max(...residuals)>tolerance || residuals.some(v => !Number.isFinite(v))) return match;
  // Never add a cropped fish if its actual print region extends beyond the capture.
  const revision = Math.floor(group/species.length)+1;
  const type = species[group%species.length];
  const [x,y,w,h] = fishShape(type,revision).bounds;
  const fishQuad = [[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(p => project(map,p));
  if (!validQuad(fishQuad,width,height,.03)) return match;
  return { kind:'found', marks:4, type, revision, corners, map, residual:Math.max(...residuals) };
}

export function paperFingerprint(frame, {type,map,revision}) {
  const [left,top,width,height]=fishShape(type,revision).bounds;
  const samples=[];
  for (let y=1; y<=4; y++) {
    for (let x=1; x<=7; x++) {
      samples.push([left+x*width/8,top+y*height/5]);
    }
  }
  const {data,width:w,height:h}=frame;
  return samples.map(point=>{
    const [x,y]=project(map,point).map(Math.floor);
    const i=(Math.min(h-1,Math.max(0,y))*w+Math.min(w-1,Math.max(0,x)))*4;
    return (data[i]+2*data[i+1]+data[i+2])/4;
  });
}

export function removalVisible(frame, {map,type,revision,signature}) {
  // A hand over a single corner must not rearm the camera. Most of the original
  // black marker borders must disappear from the last position for several frames.
  const {data,width,height} = frame;
  function light(point) {
    const [x,y] = project(map,point).map(Math.floor);
    if (x<0 || y<0 || x>=width || y>=height) return NaN;
    const i = (y*width+x)*4;
    return (77*data[i]+150*data[i+1]+29*data[i+2])/256;
  }
  let gone = 0;
  for (const [x,y] of SHEET.centers) {
    let ring = 0, quiet = 0;
    for (const dx of [-12,0,12]) {
      for (const side of [-1,1]) {
        ring += light([x+dx,y+side*(half-3)]) + light([x+side*(half-3),y+dx]);
        quiet += light([x+dx,y+side*(half+3)]) + light([x+side*(half+3),y+dx]);
      }
    }
    if (Math.abs(quiet-ring)/12 < 27) gone++;
  }
  if (gone < 3) return false;
  // When all four corner codes are covered but the fish is still visible,
  // keep the latch closed. Blank templates can also unlock on mid-tone desks.
  const after=paperFingerprint(frame,{type,map,revision});
  return after.filter((value,i)=>Math.abs(value-signature[i])>9).length>=5;
}
