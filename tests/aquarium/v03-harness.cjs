const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const ROOT=path.resolve(__dirname,'../..'),OUT=process.env.AQUARIUM_ARTIFACTS||path.join(ROOT,'artifacts/aquarium-v03'),KEY='aquarium_game_save_v3';
async function harness(port){
 fs.mkdirSync(OUT,{recursive:true});const server=http.createServer((req,res)=>{const file=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(ROOT+path.sep))return res.writeHead(403).end();fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(data);});});await new Promise(r=>server.listen(port,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.AQUARIUM_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']});const errors=[],results=[];let serial=0;
 const read=p=>p.evaluate(()=>aquariumDebug());
 async function create({size={width:1440,height:960},state,key=KEY,seed={},query='debug=1',url,clock=true,cadence=0,touch=false}={}){
  const context=await browser.newContext({viewport:size,deviceScaleFactor:1,hasTouch:touch,acceptDownloads:true});const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));if(state!==undefined)seed={...seed,[key]:typeof state==='string'?state:JSON.stringify(state)};
  if(clock)await p.clock.install();await p.addInitScript(({values,cadence,serial})=>{if(!sessionStorage.getItem('seeded')){for(const[k,v]of Object.entries(values))localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));sessionStorage.setItem('seeded','1');}Math.random=(()=>{let seed=812;return()=>{seed=seed*16807%2147483647;return seed/2147483647;};})();let counter=0;const navigation=+(sessionStorage.getItem('navigation')||0)+1;sessionStorage.setItem('navigation',navigation);Object.defineProperty(crypto,'randomUUID',{value:()=>`test-${serial}-${navigation}-${++counter}`});if(cadence){window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),cadence);window.cancelAnimationFrame=id=>clearTimeout(id);}}, {values:seed,cadence,serial:++serial});
  await p.goto(url||`http://127.0.0.1:${port}/aquarium-v0.3.html?${query}`);if(clock)await p.clock.pauseAt(new Date(Date.now()+600));return {p,context};
 }
 const pass=(name,details)=>{results.push({name,passed:true,details});console.log('PASS',name,details||'');};
 const advance=(p,ms)=>p.clock.runFor(ms),closeDialog=p=>p.locator('#dialog-close').click();
 async function shop(p,tab='fish'){await p.locator('#shop').click();await p.locator('#tab-'+tab).click();}
 const shot=(p,name)=>p.screenshot({path:path.join(OUT,name+'.png'),fullPage:true});
 const legacy=()=>{const s=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/v02-real-save.json')));s.savedAt=Date.now();return s;};
 const saveResults=(name,data)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(data,null,2));
 const close=async()=>{await browser.close();await new Promise(r=>server.close(r));};
 return {ROOT,OUT,KEY,browser,errors,results,read,create,pass,advance,closeDialog,shop,shot,legacy,saveResults,close};
}
module.exports={harness};
