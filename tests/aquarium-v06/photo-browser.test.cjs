const {harness}=require('./harness.cjs'),{context,plain,v5}=require('./schema.test.cjs'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const h=await harness(Number(process.env.AQUARIUM_TEST_PORT)||8839),w=context();
 const endpoint='https://script.google.com/macros/s/aquarium-photo-test/exec';
 function seed(){const s=plain(w.AquariumSave.validate(v5));s.savedAt=Date.now();s.tanks[0].name='水草小天地';s.tankName='水草小天地';s.tanks.push({...plain(s.tanks[0]),id:'photo-second',name:'第二個淡水缸',fishes:[],drops:[],placedDecorations:[]});return s;}
 async function open(p){await p.locator('#more-menu').click();await p.locator('#photo-share').click();await p.locator('#photo-download').filter({hasText:'下載照片'}).waitFor();}
 try{
  for(const size of [{width:390,height:844},{width:820,height:1180},{width:1440,height:960}]){
   const {p,context:ctx}=await h.create({clock:false,size,state:seed(),touch:size.width!==1440});
   await p.route('**/photo-config.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.AQUARIUM_PHOTO_CONFIG={endpoint:${JSON.stringify(endpoint)}};`}));
   await p.reload();await p.locator('#home-continue').click();await p.locator('#game').waitFor({state:'visible'});
   const before=await h.read(p),calls=[];let failures=1;
   await p.route(endpoint,async route=>{const data=JSON.parse(route.request().postData());calls.push(data);await route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(failures--?{ok:false,error:'測試收件失敗，照片已保留。'}:{ok:true,submissionId:data.submissionId,receipt:'receipt-'+size.width,notification:'sent'})});});
   await open(p);assert.equal(await p.locator('.controls>button').count(),3);
   await p.locator('#photo-className').fill('四年三班');await p.locator('#photo-seat').fill('12');await p.locator('#photo-idea').fill('水草放兩邊，留下游泳空間。');
   const oldPhoto=await p.locator('#photo-preview').getAttribute('src');
   await p.locator('#photo-tank').selectOption('photo-second');
   await p.waitForFunction(()=>!document.querySelector('#photo-tank').disabled&&document.querySelector('#photo-download').getAttribute('aria-disabled')!=='true');
   assert.equal((await h.read(p)).state.activeTankId,'photo-second');
   assert.equal(await p.locator('#photo-className').inputValue(),'四年三班');assert.equal(await p.locator('#photo-seat').inputValue(),'12');assert.equal(await p.locator('#photo-idea').inputValue(),'水草放兩邊，留下游泳空間。');
   assert.notEqual(await p.locator('#photo-preview').getAttribute('src'),oldPhoto);
   // Wait for the generated download to include current metadata.
   const firstHref=await p.locator('#photo-download').getAttribute('href');await p.locator('#photo-idea').fill('水草放兩邊，留下游泳空間！');
   await p.waitForFunction(old=>document.querySelector('#photo-download').getAttribute('href')!==old,firstHref);
   const downloadEvent=p.waitForEvent('download');await p.locator('#photo-download').click();const downloaded=await downloadEvent;
   const png=fs.readFileSync(await downloaded.path());assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1200);
   assert(await p.locator('#photo-preview').evaluate(img=>img.complete&&img.naturalWidth===1200));
   assert(await p.locator('#dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+2),'dialog has no horizontal overflow');
   await p.locator('#photo-send').click();await p.locator('#photo-status').filter({hasText:'測試收件失敗'}).waitFor();
   assert(await p.locator('#photo-className').isDisabled());assert.equal(calls.length,1);
   await p.locator('#dialog-close').click();await open(p);assert.equal(await p.locator('#photo-seat').inputValue(),'12');
   await p.locator('#photo-send').click();await p.locator('#photo-status').filter({hasText:'老師已收到你的作品'}).waitFor();
   assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);assert.equal(calls[1].tankName,'第二個淡水缸');assert.equal(calls[1].className,'四年三班');assert.equal(calls[1].seat,'12');
   assert(await p.locator('#photo-send').isDisabled());assert.equal((await h.read(p)).state.coins,before.state.coins);
   assert.equal((await h.read(p)).state.tanks.flatMap(t=>t.fishes).length,before.state.tanks.flatMap(t=>t.fishes).length);
   await h.shot(p,'photo-'+size.width+'-confirmed');
   await p.reload();await p.locator('#home-continue').click();await open(p);assert.match(await p.locator('#photo-status').innerText(),/老師已收到/);assert.equal(calls.length,2);
   await p.locator('#photo-retake').click();await p.locator('#photo-send').waitFor();assert(await p.locator('#photo-className').isEnabled());assert.equal(await p.locator('#photo-seat').inputValue(),'12');
   h.pass('photo capture, download, retained retry, receipt, reload, retake and layout '+size.width);await ctx.close();
  }
  const {p,context:ctx}=await h.create({clock:false,state:seed()});await p.locator('#home-continue').click();await open(p);assert(await p.locator('#photo-send').isDisabled());assert.match(await p.locator('#photo-status').innerText(),/還沒開放收件/);await h.shot(p,'photo-not-configured');await ctx.close();
  assert.deepEqual(h.errors,[]);h.saveResults('photo-results',{results:h.results,errors:h.errors});
 }finally{await h.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
