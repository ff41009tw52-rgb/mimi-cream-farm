import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.AQUARIUM_URL || 'http://127.0.0.1:8765';
const chrome=await chromium.launch({
  executablePath:process.env.CHROMIUM_PATH||undefined,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
});
const types=['clown','butterfly','puffer','shark'];
const report={};
const problems=[];
const waitCount=(page,count)=>page.waitForFunction(
  n=>document.querySelector('#aquarium').dataset.fishCount===String(n),count);
const waitBackend=(page,name)=>page.waitForFunction(
  renderer=>document.querySelector('#aquarium').dataset.renderer===renderer,name);
async function sample(page,duration=4500) {
  await page.bringToFront();
  await page.waitForTimeout(550);
  return page.evaluate(ms=>new Promise(resolve=>{
    const stage=document.querySelector('#aquarium');
    const drawCount=Number(stage.dataset.drawCount), start=Number(stage.dataset.drawTime);
    setTimeout(()=>{
      const {dataset}=stage;
      const fps=(Number(dataset.drawCount)-drawCount)*1000/(Number(dataset.drawTime)-start);
      resolve({fps:Number(fps.toFixed(1)),renderer:dataset.renderer,pixels:dataset.pixelSize,
        meshVertices:Number(dataset.meshVertices),limit:dataset.frameLimit});
    },ms);
  }),duration);
}
async function setting(page,label,enabled) {
  await page.getByRole('button',{name:'作品與設定'}).click();
  await page.getByRole('checkbox',{name:label}).setChecked(enabled);
  await page.getByRole('button',{name:'關閉'}).click();
}
const capture=process.env.AQUARIUM_SCREENSHOTS;
async function screenshot(page,name) {
  if (!capture) return;
  await mkdir(capture,{recursive:true});
  await page.screenshot({path:capture+'/'+name+'.png'});
}
try {
  const context=await chrome.newContext({viewport:{width:1920,height:1080},reducedMotion:'no-preference'});
  context.on('page',page=>page.on('pageerror',error=>problems.push(error.message)));
  const fixture=await context.newPage();
  await fixture.goto(base+'/aquarium-v3/tests/browser.html');
  await fixture.waitForFunction(()=>typeof window.fixture==='function');
  const pictures=await fixture.evaluate(async kinds=>Promise.all(kinds.map(type=>window.fixture(type,'trapezoid'))),types);
  await fixture.close();

  let display=await context.newPage();
  await display.goto(base+'/class-aquarium-v3-display.html');
  await display.waitForFunction(()=>{
    const {dataset}=document.querySelector('#aquarium');
    return dataset.renderer==='pixi-webgl'||Boolean(dataset.fallbackReason);
  });
  const scan=await context.newPage();
  await scan.goto(base+'/class-aquarium-v3-scan.html');
  for (let i=0;i<pictures.length;i++) {
    await scan.locator('#photo').setInputFiles({name:types[i]+'.jpg',mimeType:'image/jpeg',buffer:Buffer.from(pictures[i],'base64')});
    await waitCount(display,i+1);
    await scan.locator('#upload-notice').waitFor();
    assert.equal(await scan.locator('#manual').isVisible(),false);
  }
  report.scanPNGs=await display.evaluate(async()=>{
    const { createCollection }=await import('./aquarium-v3/collection.js');
    const records=await createCollection().list();
    return Promise.all(records.map(async record=>{
      const pic=await createImageBitmap(record.blob);
      const c=document.createElement('canvas'); c.width=pic.width; c.height=pic.height;
      const context=c.getContext('2d'); context.drawImage(pic,0,0);
      pic.close();
      return {type:record.type,mime:record.blob.type,cornerAlpha:context.getImageData(0,0,1,1).data[3]};
    }));
  });
  assert.deepEqual(report.scanPNGs.map(row=>row.type).sort(),types.slice().sort());
  assert.ok(report.scanPNGs.every(row=>row.mime==='image/png'&&row.cornerAlpha===0));
  await scan.close();
  await display.close();

  const lab=await context.newPage();
  await lab.setViewportSize({width:1480,height:860});
  await lab.goto(base+'/aquarium-v3/animation-lab.html');
  await lab.getByText('PixiJS WebGL',{exact:true}).waitFor();
  await lab.locator('#artwork').selectOption({index:2});
  await lab.locator('#slow').check();
  await lab.waitForTimeout(220);
  await screenshot(lab,'comparison');
  for (const type of types) await lab.locator('#species').selectOption(type);
  await lab.getByRole('button',{name:'暫停'}).click();
  const still=await lab.locator('#legacy').evaluate(node=>node.toDataURL());
  await lab.waitForTimeout(250);
  assert.equal(await lab.locator('#legacy').evaluate(node=>node.toDataURL()),still);
  for (const id of ['speed','frequency','amplitude','bend','turn','size']) {
    await lab.locator('#'+id).fill('0.85');
    assert.equal(await lab.locator('output[for='+id+']').textContent(),'0.85×');
  }
  await lab.setViewportSize({width:390,height:844});
  assert.equal(await lab.evaluate(()=>document.documentElement.scrollWidth),390);
  await lab.close();
  report.lab='4 species, scanned artwork picker, 6 sliders, pause, slow motion, 390×844';

  // The test runner uses software WebGL. Exercise the hardware-capable branch
  // with four fish by suppressing only the driver classification for this tab.
  const probe=await context.newPage();
  await probe.setViewportSize({width:1280,height:720});
  await probe.addInitScript(()=>{
    for (const type of ['WebGLRenderingContext','WebGL2RenderingContext']) {
      const prototype=window[type]?.prototype;
      if (!prototype) continue;
      const get=prototype.getParameter;
      prototype.getParameter=function(parameter) {
        return parameter===0x9246 ? 'Unclassified WebGL test driver' : get.call(this,parameter);
      };
    }
  });
  await probe.goto(base+'/class-aquarium-v3-display.html');
  await waitCount(probe,4);
  await waitBackend(probe,'pixi-webgl');
  await probe.waitForFunction(()=>Number(document.querySelector('#aquarium').dataset.meshVertices)>0);
  report.webgl4={vertices:Number(await probe.locator('#aquarium').getAttribute('data-mesh-vertices'))};
  await probe.evaluate(()=>{
    const canvas=document.querySelector('.sea-fish-gl');
    const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
    const extension=gl.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Context loss extension unavailable');
    extension.loseContext();
  });
  await waitBackend(probe,'canvas-2d');
  assert.equal(await probe.locator('#aquarium').getAttribute('data-fallback-reason'),'context-lost');
  assert.ok((await sample(probe,1400)).fps>0);
  await waitCount(probe,4);
  await probe.close();


  display=await context.newPage();
  await display.goto(base+'/class-aquarium-v3-display.html');
  await waitCount(display,4);
  async function populate(total) {
    await display.evaluate(async count=>{
      const { createCollection }=await import('./aquarium-v3/collection.js');
      const collection=createCollection();
      const images=await collection.list();
      for (let i=images.length;i<count;i++) {
        const {blob,type}=images[i%4];
        await collection.add(blob,type);
      }
    },total);
    await waitCount(display,total);
  }
  await populate(12);
  await display.setViewportSize({width:1280,height:720});
  report.display12=await sample(display,3000);
  await display.setViewportSize({width:1920,height:1080});
  await populate(40);
  await display.waitForTimeout(8500);
  report.display40=await sample(display);
  await screenshot(display,'display-v32');
  assert.ok(report.display40.meshVertices>0);

  const old=await context.newPage();
  await old.goto(base+'/class-aquarium-v3-1-2-display.html');
  await waitCount(old,40);
  await screenshot(old,'display-v312');
  await old.close();
  await display.bringToFront();
  await setting(display,'低效能模式',true);
  report.low40=await sample(display,4200);
  assert.equal(report.low40.meshVertices,0);
  assert.equal(report.low40.limit,'30');
  assert.notEqual(report.low40.pixels,report.display40.pixels);
  await setting(display,'減少動態效果',true);
  const stillCount=await display.locator('#aquarium').getAttribute('data-draw-count');
  await display.waitForTimeout(570);
  assert.equal(await display.locator('#aquarium').getAttribute('data-draw-count'),stillCount);
  await setting(display,'減少動態效果',false);
  await setting(display,'低效能模式',false);

  await display.reload();
  await waitCount(display,40);
  await display.setViewportSize({width:390,height:844});
  await display.waitForFunction(()=>document.querySelector('#aquarium').dataset.pixelSize==='390×844');
  assert.equal(await display.evaluate(()=>document.documentElement.scrollWidth),390);
  await display.setViewportSize({width:1920,height:1080});
  await display.getByRole('button',{name:'全螢幕',exact:true}).click();
  await display.waitForFunction(()=>document.fullscreenElement?.id==='aquarium');
  await display.evaluate(()=>document.exitFullscreen());
  await display.getByRole('button',{name:'作品與設定'}).click();
  await display.getByRole('button',{name:'刪除小丑魚型作品'}).first().click();
  await waitCount(display,39);
  await display.getByRole('button',{name:'清空作品',exact:true}).click();
  await display.getByRole('button',{name:'確認清空'}).click();
  await waitCount(display,0);

  assert.deepEqual(problems,[]);
  report.recovery='context loss, restoration by reload, existing V3.1.2 display, fullscreen, delete, clear and portrait passed';
  assert.ok(report.display40.fps>=30,`1080p selected render rate ${report.display40.fps} FPS`);
} finally {
  if(problems.length) report.pageErrors=problems;
  console.log(JSON.stringify(report,null,2));
  if (process.env.AQUARIUM_REPORT) await writeFile(process.env.AQUARIUM_REPORT,JSON.stringify(report,null,2)+'\n');
  await chrome.close();
}
