// DOM regression checks. Run with linkedom available on NODE_PATH.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{parseHTML}=require('linkedom');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const endpoint='https://script.google.com/macros/s/example/exec';
const records=[{revision:'ab063e17-d843-477a-b512-6296058fb510',name:'雲端植物 A',location:'生態池',leafVenationName:'網狀脈',photoCount:1},{revision:'24c4ccf4-be58-4d5d-9053-251cdb6d5af8',name:'雲端植物 B',location:'生態池',leafVenationName:'網狀脈',photoCount:1}];
async function device(own){
 const {window}=parseHTML('<html><head></head><body><section id="section-almanac"></section><section id="section-map"><div class="bg-white"><select id="map-filter-feature"><option value="ALL">ALL</option></select></div><div id="map-pins-layer"></div><span id="map-pins-count"></span><div id="campus-map-labels"></div><h2>Map</h2><p>Caption</p></section><button id="tab-almanac"><span>Icon</span><span>Label</span></button></body></html>');
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this._v||'ALL'},set(v){this._v=v},configurable:true});window.renderCampusMap=()=>{};window.switchTab=()=>{};
 let offline=false;const headAppend=window.document.head.append.bind(window.document.head);window.document.head.append=(tag)=>{headAppend(tag);const p=new URL(tag.src).searchParams;const callback=p.get('callback');setTimeout(()=>{if(!window[callback])return;window[callback](offline?{ok:false}:p.get('action')==='gallery'?{ok:true,records,total:records.length,hasMore:false,receiverFolders:2,schema:'minan-plants-v4',snapshot:'stable'}:{ok:true,photo:'data:image/jpeg;base64,/9j/2Q=='});},0);};
 const ctx=vm.createContext({window,document:window.document,localStorage:{getItem:()=>null,setItem(){}},sharedSpecimens:own,locations:[['🌿','生態池',23,54],['🌱','香草園',89,78]],URLSearchParams,crypto:require('node:crypto').webcrypto,console,Map,Set,Date,CustomEvent:window.CustomEvent,setTimeout:(fn,ms)=>setTimeout(fn,ms===700?0:ms),clearTimeout,setInterval:()=>0});window.PLANT_DRIVE_CONFIG={receiverUrl:endpoint};
 vm.runInContext(fs.readFileSync(__dirname+'/shared-gallery.js','utf8'),ctx);await delay(70);
 return {window,ctx,goOffline:()=>offline=true};
}
(async()=>{
 const a=await device([{...records[0],uploadRevision:records[0].revision,mapX:23,mapY:54,photos:['data:image/jpeg;base64,/9j/2Q==']}]);
 const b=await device([]); // isolated DOM and empty local records; not a real browser/device test.
 for(const d of [a,b]){assert.equal(d.window.document.querySelectorAll('#shared-cards article').length,2);assert.equal(d.window.document.querySelectorAll('.shared-cloud-pin').length,1);assert.equal(d.window.document.getElementById('map-pins-count').textContent,'2');assert.equal(d.window.document.querySelectorAll('#shared-cards img[src]').length,2);}
 assert.equal(a.window.document.querySelector('.shared-cloud-pin').textContent.includes('2 筆'),true);
 b.goOffline();await b.window.document.getElementById('shared-refresh').onclick();assert.equal(b.window.document.querySelectorAll('#shared-cards article').length,2);assert.equal(b.window.document.getElementById('map-pins-count').textContent,'2');assert(b.window.document.getElementById('shared-status').textContent.includes('同步失敗'));
 console.log('PASS: two independent DOM contexts, shared photos, own/cloud dedup, grouped map counts, retained cloud records after failed refresh. These are mocked regression checks, NOT cross-browser acceptance.');
})().catch(e=>{console.error(e);process.exit(1)});
