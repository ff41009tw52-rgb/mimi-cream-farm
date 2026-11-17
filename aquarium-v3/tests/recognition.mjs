import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { detectSheet } from '../detect.js';
import { FISH, SHEET, artworkRevisionFor } from '../templates.js';
import { distance, project } from '../geometry.js';
import { paints, scenarios, scene } from './fixtures.js';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'sharp');

globalThis.document = {
  createElement() {
    const canvas = {};
    canvas.getContext = () => ({
      createImageData(width,height) {
        return {width,height,data:new Uint8ClampedArray(width*height*4)};
      },
      putImageData(data) { canvas.frame = data; },
      getImageData() { return canvas.frame; },
    });
    return canvas;
  },
};

const fixturesDir = process.env.FIXTURES_DIR;
if (fixturesDir) mkdirSync(fixturesDir,{recursive:true});
const metrics = [];
for (const [index,type] of Object.keys(FISH).entries()) {
  const template = readFileSync(new URL('../templates/'+type+'.svg',import.meta.url),'utf8')
    .replace(/width="297mm" height="210mm"/,'width="800" height="566"');
  const colors=['#f08066','#f0c955','#4eb7b3','#8265b8','#245aa1'];
  const paint = paints.map(([x,y],i) => `<rect x="${x-31}" y="${y-85}" width="60" height="170" fill="${colors[(i+index)%5]}" opacity=".86"/>`).join('');
  const sheetSvg = template.replace('</svg>',`<clipPath id="test-mask"><path d="${FISH[type].outline}"/></clipPath><g clip-path="url(#test-mask)">${paint}</g></svg>`);
  const raw = await sharp(Buffer.from(sheetSvg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const sheet = document.createElement('canvas');
  Object.assign(sheet,{width:raw.info.width,height:raw.info.height,frame:{data:raw.data,width:raw.info.width,height:raw.info.height}});
  for (const [name,options] of Object.entries(scenarios)) {
    const {c,expected} = scene(sheet,{...options,blur:0});
    const frame = c.frame;
    if (options.blur) {
      frame.data = await sharp(Buffer.from(frame.data),{raw:{width:frame.width,height:frame.height,channels:4}})
        .blur(options.blur).raw().toBuffer();
    }
    const start = performance.now();
    const hit = detectSheet(frame);
    const ms = performance.now()-start;
    const accepted = !['coveredOne','coveredFour','blank'].includes(name);
    const [x,y,w,h] = FISH[type].bounds;
    const expectedPoints = [[x,y],[x+w,y],[x+w,y+h],[x,y+h],...paints];
    const error = hit.map ? Math.max(...expectedPoints.map(p => distance(project(expected,p),project(hit.map,p)))) : null;
    metrics.push({type,name,expected:accepted ? type : 'reject',actual:hit.type || hit.kind,marks:hit.marks,revision:hit.revision,error,ms});
    if (fixturesDir) {
      await sharp(Buffer.from(frame.data),{raw:{width:frame.width,height:frame.height,channels:4}})
        .jpeg({quality:88}).toFile(fixturesDir+'/'+type+'-'+name+'.jpg');
    }
  }
}
if (process.env.METRICS_PATH) writeFileSync(process.env.METRICS_PATH, JSON.stringify(metrics,null,2));
const good = metrics.filter(m => m.actual===m.expected);
const rejects = metrics.filter(m => m.expected==='reject');
const failures = metrics.filter(m => m.expected==='reject' ? FISH[m.actual] : m.actual!==m.expected || m.revision!==artworkRevisionFor(m.type) || m.error>3);
console.log(JSON.stringify({
  accepted:good.length, valid:metrics.length-rejects.length,
  rejected:rejects.filter(m => !FISH[m.actual]).length, invalid:rejects.length,
  maxError:Math.max(...good.map(m=>m.error)),
  medianMs:metrics.map(m=>m.ms).sort((a,b)=>a-b)[Math.floor(metrics.length/2)], failures,
},null,2));
assert.ok(failures.length===0, 'Incorrect recognition, false acceptance, or crop error above 3 px');
