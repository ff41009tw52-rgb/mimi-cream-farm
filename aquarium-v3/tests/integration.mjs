import assert from 'node:assert/strict';
import { artworkRevisionFor } from '../templates.js';
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
  const recognized=valid.filter(row=>row.actual===row.type && row.revision===artworkRevisionFor(row.type));
  const wrong=invalid.filter(row=>!['empty','uncertain'].includes(row.actual));
  const maxError=Math.max(...recognized.map(row=>row.error));
  const maxColor=Math.max(...recognized.map(row=>row.color));
  if (process.env.BROWSER_METRICS_PATH) await writeFile(process.env.BROWSER_METRICS_PATH,JSON.stringify(suite,null,2));
  assert.ok(recognized.length/valid.length>=.95 && !wrong.length && maxError<=3 && maxColor<=14, JSON.stringify({recognized:recognized.length,valid:valid.length,wrong,maxError,maxColor}));
  assert.ok(recognized.every(row=>row.clear));
  const legacy=await test.evaluate(()=>window.legacySuite());
  assert.ok(legacy.length===4 && legacy.every(row=>row.found && row.transparent));
  results.legacyTemplates=legacy.length;
  results.vision={accepted:recognized.length,valid:valid.length,rejected:invalid.length-wrong.length,invalid:invalid.length,maxError,maxColor};
  const pictures=await test.evaluate(async()=>Promise.all([
    window.fixture('clown','straight'),window.fixture('clown','blank'),
    window.fixture('shark','trapezoid',1),window.fixture('clown','coveredOne'),
  ]));
  await context.addInitScript(pictures=>{
    if (!location.pathname.endsWith('-scan.html')) return;
    const images=pictures.map(data=>{
      const image=new Image();
      image.src='data:image/jpeg;base64,'+data;
      return image;
    });
    let mode=1,stream,timeout,jitterFrame=0;
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
      const draw=()=>{
        const offset=mode===0 ? (Math.floor(jitterFrame++/4)%2 ? 3 : -3) : 0;
        ctx.drawImage(images[mode],offset,0);
      };
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
  const notice=scan.locator('#upload-notice');
  assert.equal(await notice.isVisible(),false);
  await scan.getByRole('button',{name:'開啟相機',exact:true}).click();
  await scan.getByRole('button',{name:'暫停自動掃描'}).waitFor();
  const insertTime=await scan.evaluate(()=>{
    window.changeFrame(0);
    return Date.now();
  });
  await display.waitForFunction(()=>document.querySelector('#aquarium').dataset.fishCount==='1');
  await display.waitForFunction(()=>window.fishArrivals.length===1);
  await scan.getByText('已加入小丑魚型。請拿走圖畫紙。').waitFor();
  await scan.getByText('已上傳到水族館',{exact:true}).waitFor();
  await scan.getByText('現在可以移開圖畫紙。',{exact:true}).waitFor();
  const insertToNotice=Date.now()-insertTime;
  assert.ok(insertToNotice<2000,`Automatic scan took ${insertToNotice} ms`);
  results.insertToNotice=insertToNotice;
  if (process.env.AQUARIUM_SCREENSHOTS) {
    await mkdir(process.env.AQUARIUM_SCREENSHOTS,{recursive:true});
    await scan.screenshot({path:process.env.AQUARIUM_SCREENSHOTS+'/upload-notice.png'});
  }
  await delay(1500);
  assert.equal(await stage.getAttribute('data-fish-count'),'1');
  await scan.evaluate(()=>window.changeFrame(3));
  await delay(2100);
  assert.equal(await stage.getAttribute('data-fish-count'),'1');
  await scan.evaluate(()=>window.changeFrame(0));
  await delay(1250);
  assert.equal(await stage.getAttribute('data-fish-count'),'1');
  await scan.evaluate(()=>window.changeFrame(1));
  assert.equal(await notice.isVisible(),true);
  await scan.getByText('已就緒，可以放上下一張。').waitFor();
  await notice.waitFor({state:'hidden'});
  await scan.evaluate(()=>window.changeFrame(2));
  await scan.getByText('已加入鯊魚型。請拿走圖畫紙。').waitFor();
  await scan.getByText('已上傳到水族館',{exact:true}).waitFor();
  await scan.getByRole('button',{name:'關閉上傳提示'}).click();
  await notice.waitFor({state:'hidden'});
  assert.equal(await scan.locator('#capture').isEnabled(),false);
  results.uploadNotice='shown after write, stays until paper removed, dismissal leaves latch closed';
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
  await scan.getByRole('button',{name:'暫停自動掃描'}).click();
  await scan.evaluate(()=>window.changeFrame(1));
  await scan.getByText('相機設定',{exact:true}).click();
  const snapshot=scan.getByRole('button',{name:'拍照掃描'});
  await scan.waitForFunction(()=>!document.querySelector('#capture').disabled);
  await scan.evaluate(()=>window.changeFrame(0));
  await delay(120);
  await snapshot.click();
  await notice.waitFor();
  assert.equal(await scan.locator('#manual').isVisible(),false);
  await scan.getByText('現在可以移開圖畫紙。',{exact:true}).waitFor();
  await display.waitForFunction(()=>document.querySelector('#aquarium').dataset.fishCount==='3');
  await scan.evaluate(()=>window.unplugCamera());
  await scan.getByText(/攝影機已中斷/).waitFor();
  await scan.evaluate(()=>{window.rejectCamera=true;});
  await scan.getByRole('button',{name:'開啟相機',exact:true}).click();
  await scan.getByText(/攝影機權限已被拒絕/).waitFor();
  results.camera='simulated interruption and denial passed';
  const input=scan.locator('#photo');
  await input.setInputFiles({name:'clown.jpg',mimeType:'image/jpeg',buffer:Buffer.from(pictures[0],'base64')});
  await display.waitForFunction(()=>document.querySelector('#aquarium').dataset.fishCount==='4');
  await scan.getByText('已上傳到水族館',{exact:true}).waitFor();
  assert.equal(await scan.locator('#manual').isVisible(),false);
  await scan.locator('#upload-instruction').waitFor({state:'hidden'});
  const fixture=Buffer.from(pictures[3],'base64');
  await input.setInputFiles({name:'covered.jpg',mimeType:'image/jpeg',buffer:fixture});
  await scan.getByText('請選擇魚形，並將定位點對到紙上的方格。').waitFor();
  assert.equal(await notice.isVisible(),false);
  assert.equal(await stage.getAttribute('data-fish-count'),'4');
  await scan.getByLabel('魚形',{exact:true}).selectOption('clown');
  await scan.getByRole('button',{name:'預覽魚形'}).click();
  await scan.getByText('請確認魚身完整，再加入水族館。').waitFor();
  await scan.getByRole('button',{name:'取消',exact:true}).click();
  results.snapshot='camera snapshot and file import publish directly; only ambiguous marks open manual correction';
  const settings=display.locator('#motion-settings summary');
  await settings.click();
  await display.getByRole('button',{name:'管理作品'}).click();
  await display.getByRole('button',{name:'刪除小丑魚型作品'}).first().click();
  await display.waitForFunction(()=>document.querySelector('#aquarium').dataset.fishCount==='3');
  await display.getByRole('button',{name:'關閉',exact:true}).click();
  await settings.click();
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
  await settings.click();
  await display.getByLabel('低效能模式').check();
  await display.getByLabel('減少動態效果').check();
  assert.match(await stage.getAttribute('class'),/low.*reduce/);
  await display.getByRole('button',{name:'管理作品'}).click();
  await display.getByRole('button',{name:'清空作品',exact:true}).click();
  await display.getByRole('button',{name:'確認清空',exact:true}).click();
  await display.waitForFunction(()=>document.querySelector('#aquarium').dataset.fishCount==='0');
  results.restoreAndGallery='passed';
  const mobileContext=await browser.newContext({
    viewport:{width:390,height:844},isMobile:true,hasTouch:true,
    userAgent:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/153.0 Mobile Safari/537.36',
  });
  await mobileContext.addInitScript(()=>{
    window.cameraRequests=[];
    window.forceFallback=false;
    let oldTrack;
    navigator.mediaDevices.enumerateDevices=async ()=>{
      return [{kind:'videoinput',deviceId:'rear',label:'Back camera'},{kind:'videoinput',deviceId:'front',label:'Front camera'}];
    };
    navigator.mediaDevices.getUserMedia=async ({video})=>{
      const facing=video.facingMode?.exact || video.facingMode?.ideal;
      window.cameraRequests.push({facing,exact:Boolean(video.facingMode?.exact),previousStopped:oldTrack?.readyState==='ended'});
      if (window.forceFallback && video.facingMode?.exact) throw new DOMException('Fixture constrained','OverconstrainedError');
      const canvas=document.createElement('canvas');
      canvas.width=640; canvas.height=480;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#666';
      ctx.fillRect(0,0,640,480);
      const stream=canvas.captureStream(10);
      const track=stream.getVideoTracks()[0];
      track.getSettings=()=>({deviceId:facing==='user' ? 'front' : 'rear',facingMode:facing});
      oldTrack=track;
      return stream;
    };
  });
  const mobile=await mobileContext.newPage();
  mobile.on('pageerror',error=>errors.push(error.message));
  await mobile.goto(base+'/class-aquarium-v3-scan.html');
  assert.equal(await mobile.locator('#mobile-photo').getAttribute('capture'),'environment');
  await mobile.getByRole('button',{name:'開啟相機',exact:true}).click();
  await mobile.getByRole('button',{name:'暫停自動掃描'}).waitFor();
  await mobile.getByText('相機設定',{exact:true}).click();
  await mobile.getByRole('button',{name:'切到前鏡頭'}).click();
  await mobile.getByRole('button',{name:'切到後鏡頭'}).waitFor();
  await mobile.evaluate(()=>{window.forceFallback=true;});
  await mobile.getByRole('button',{name:'切到後鏡頭'}).click();
  await mobile.getByRole('button',{name:'切到前鏡頭'}).waitFor();
  assert.deepEqual(await mobile.evaluate(()=>window.cameraRequests),[
    {facing:'environment',exact:true,previousStopped:false},
    {facing:'user',exact:true,previousStopped:true},
    {facing:'environment',exact:true,previousStopped:true},
    {facing:'environment',exact:false,previousStopped:true},
  ]);
  await mobile.getByRole('button',{name:'關閉相機',exact:true}).click();
  const mobileDisplay=await mobileContext.newPage();
  await mobileDisplay.goto(base+'/class-aquarium-v3-display.html');
  await mobile.locator('#mobile-photo').setInputFiles({
    name:'mobile-clown.jpg',mimeType:'image/jpeg',buffer:Buffer.from(pictures[0],'base64'),
  });
  await mobile.getByText('已上傳到水族館',{exact:true}).waitFor();
  assert.equal(await mobile.locator('#manual').isVisible(),false);
  await mobile.getByText('現在可以移開圖畫紙。',{exact:true}).waitFor();
  await mobileDisplay.waitForFunction(()=>document.querySelector('#aquarium').dataset.fishCount==='1');
  results.mobileCamera='rear-default and switching passed; a returned native photo publishes without preview or confirmation';
  await mobileContext.close();
  assert.deepEqual(errors,[]);
} finally {
  console.log(JSON.stringify(results,null,2));
  await browser.close();
}
