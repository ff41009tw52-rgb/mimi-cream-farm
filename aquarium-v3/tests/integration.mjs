import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.AQUARIUM_URL || 'http://127.0.0.1:8765';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
const results={};
const errors=[];
try {
  const context=await browser.newContext({viewport:{width:1920,height:1080},reducedMotion:'no-preference'});
  const test=await context.newPage();
  test.on('pageerror',error=>errors.push(error.message));
  await test.goto(base+'/aquarium-v3/tests/browser.html');
  await test.waitForFunction(()=>typeof window.suite==='function');
  const suite=await test.evaluate(()=>window.suite());
  const valid=suite.filter(row=>row.expected);
  const invalid=suite.filter(row=>!row.expected);
  const recognized=valid.filter(row=>row.actual===row.type);
  const wrong=invalid.filter(row=>!['empty','uncertain'].includes(row.actual));
  const maxError=Math.max(...recognized.map(row=>row.error));
  const maxColor=Math.max(...recognized.map(row=>row.color));
  assert.ok(recognized.length/valid.length>=.95 && !wrong.length && maxError<=3 && maxColor<=14);
  assert.ok(recognized.every(row=>row.clear));
  results.vision={accepted:recognized.length,valid:valid.length,rejected:invalid.length-wrong.length,invalid:invalid.length,maxError,maxColor};
  if (process.env.BROWSER_METRICS_PATH) await writeFile(process.env.BROWSER_METRICS_PATH,JSON.stringify(suite,null,2));
  const pictures=await test.evaluate(async()=>Promise.all([
    window.fixture('clown','straight'),window.fixture('clown','blank'),
    window.fixture('shark','trapezoid'),window.fixture('clown','coveredOne'),
  ]));
  await context.addInitScript(pictures=>{
    if (!location.pathname.endsWith('-scan.html')) return;
    const images=pictures.map(data=>{
      const image=new Image();
      image.src='data:image/jpeg;base64,'+data;
      return image;
    });
    let mode=0,stream,timeout;
    window.changeFrame=next=>{mode=next;};
    window.rejectCamera=false;
    window.unplugCamera=()=>{
      clearInterval(timeout);
      const track=stream.getVideoTracks()[0];
      track.stop();
      track.dispatchEvent(new Event('ended'));
    };
    navigator.mediaDevices.enumerateDevices=async () => [{kind:'videoinput',label:'Simulated USB',deviceId:'fixture'}];
    navigator.mediaDevices.getUserMedia=async () => {
      if (window.rejectCamera) throw new DOMException('Fixture denied','NotAllowedError');
      await Promise.all(images.map(image=>image.decode()));
      const canvas=document.createElement('canvas');
      canvas.width=896; canvas.height=704;
      const ctx=canvas.getContext('2d');
      const draw=()=>ctx.drawImage(images[mode],0,0);
      draw();
      stream=canvas.captureStream(18);
      timeout=setInterval(draw,50);
      return stream;
    };
  },pictures);
  const scan=await context.newPage(), display=await context.newPage();
  scan.on('pageerror',error=>errors.push(error.message));
  display.on('pageerror',error=>errors.push(error.message));
  await scan.goto(base+'/class-aquarium-v3-scan.html');
  await display.goto(base+'/class-aquarium-v3-display.html');
  const stage=display.locator('#aquarium');
  await display.evaluate(()=>{
    window.fishArrivals=[];
    const a=document.querySelector('#aquarium');
    new MutationObserver(()=>window.fishArrivals.push({time:Date.now(),id:a.dataset.renderedId}))
      .observe(a,{attributes:true,attributeFilter:['data-rendered-id']});
  });
  await scan.getByRole('button',{name:'開始自動掃描'}).click();
  await display.waitForFunction(()=>document.querySelector('#aquarium').dataset.fishCount==='1');
  await display.waitForFunction(()=>window.fishArrivals.length===1);
  await scan.getByText('已加入小丑魚型。請拿走圖畫紙。').waitFor();
  await delay(1500);
  assert.equal(await stage.getAttribute('data-fish-count'),'1');
  await scan.evaluate(()=>window.changeFrame(3));
  await delay(2100);
  assert.equal(await stage.getAttribute('data-fish-count'),'1');
  await scan.evaluate(()=>window.changeFrame(0));
  await delay(1250);
  assert.equal(await stage.getAttribute('data-fish-count'),'1');
  await scan.evaluate(()=>window.changeFrame(1));
  await scan.getByText('已就緒，可以放上下一張。').waitFor();
  await scan.evaluate(()=>window.changeFrame(2));
  await scan.getByText('已加入鯊魚型。請拿走圖畫紙。').waitFor();
  await display.waitForFunction(()=>window.fishArrivals.length===2);
  const arrivals=await display.evaluate(async()=>{
    const {createCollection}=await import('./aquarium-v3/collection.js');
    const records=await createCollection().list();
    return records.map(row=>({type:row.type,ms:window.fishArrivals.find(hit=>hit.id===row.id).time-row.createdAt}));
  });
  assert.ok(arrivals.every(row=>row.ms>=0 && row.ms<=500));
  results.sync=arrivals;
  results.duplicate='passed';
  await display.reload();
  await display.waitForFunction(()=>document.querySelector('#aquarium').dataset.fishCount==='2');
  await scan.evaluate(()=>window.unplugCamera());
  await scan.getByText(/攝影機已中斷/).waitFor();
  await scan.evaluate(()=>{window.rejectCamera=true;});
  await scan.getByRole('button',{name:'開始自動掃描'}).click();
  await scan.getByText(/攝影機權限已被拒絕/).waitFor();
  results.camera='simulated interruption and denial passed';
  const input=scan.locator('#photo');
  await input.setInputFiles({name:'clown.jpg',mimeType:'image/jpeg',buffer:Buffer.from(pictures[0],'base64')});
  await scan.getByText('請確認魚身完整，再加入水族館。').waitFor();
  await scan.getByRole('button',{name:'加入水族館',exact:true}).click();
  await display.waitForFunction(()=>document.querySelector('#aquarium').dataset.fishCount==='3');
  const fixture=Buffer.from(pictures[3],'base64');
  await input.setInputFiles({name:'covered.jpg',mimeType:'image/jpeg',buffer:fixture});
  await scan.getByText('請選擇魚形，並將定位點對到紙上的方格。').waitFor();
  await scan.getByLabel('魚形',{exact:true}).selectOption('clown');
  await scan.getByRole('button',{name:'預覽魚形'}).click();
  await scan.getByText('請確認魚身完整，再加入水族館。').waitFor();
  await scan.getByRole('button',{name:'取消',exact:true}).click();
  results.manual='auto-point preview, manual preview and upload passed';
  await display.getByRole('button',{name:'作品與設定'}).click();
  await display.getByRole('button',{name:'刪除小丑魚型作品'}).first().click();
  await display.waitForFunction(()=>document.querySelector('#aquarium').dataset.fishCount==='2');
  await display.getByRole('button',{name:'關閉',exact:true}).click();
  await display.evaluate(async()=>{
    const {createCollection}=await import('./aquarium-v3/collection.js');
    const collection=createCollection();
    const records=await collection.list();
    for (let i=records.length;i<40;i++) await collection.add(records[i%records.length].blob,records[i%records.length].type);
  });
  await display.waitForFunction(()=>document.querySelector('#aquarium').dataset.fishCount==='40');
  await display.bringToFront();
  const fps=await display.evaluate(()=>new Promise(resolve=>{
    let start,frames=0;
    function measure(now) {
      start??=now;
      frames++;
      if (now-start>=3500) resolve(Math.round((frames-1)*1000/(now-start)));
      else requestAnimationFrame(measure);
    }
    requestAnimationFrame(measure);
  }));
  if (process.env.AQUARIUM_SCREENSHOTS) {
    await mkdir(process.env.AQUARIUM_SCREENSHOTS,{recursive:true});
    await display.screenshot({path:process.env.AQUARIUM_SCREENSHOTS+'/display.png'});
    await scan.screenshot({path:process.env.AQUARIUM_SCREENSHOTS+'/scan.png'});
  }
  await display.getByRole('button',{name:'全螢幕',exact:true}).click();
  await display.waitForFunction(()=>document.fullscreenElement?.id==='aquarium');
  await display.evaluate(()=>document.exitFullscreen());
  await display.waitForFunction(()=>document.fullscreenElement===null);
  results.fullscreen='passed';
  results.fps40=fps;
  assert.ok(fps>=30,'40 sprites must maintain at least 30 FPS in the test environment');
  await display.getByRole('button',{name:'作品與設定'}).click();
  await display.getByLabel('低效能模式').check();
  await display.getByLabel('減少動態效果').check();
  assert.match(await stage.getAttribute('class'),/low.*reduce/);
  await display.getByRole('button',{name:'清空作品',exact:true}).click();
  await display.getByRole('button',{name:'確認清空',exact:true}).click();
  await display.waitForFunction(()=>document.querySelector('#aquarium').dataset.fishCount==='0');
  results.restoreAndGallery='passed';
  assert.deepEqual(errors,[]);
} finally {
  console.log(JSON.stringify(results,null,2));
  await browser.close();
}
