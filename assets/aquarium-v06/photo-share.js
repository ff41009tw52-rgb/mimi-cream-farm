/* Canvas-only classroom submissions. No camera, student account or mail app. */
(() => {
'use strict';
const DB='youyou-aquarium-photos', KEY='current', MAX_BYTES=1500000;
const uuid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
function endpoint(){const value=window.AQUARIUM_PHOTO_CONFIG?.endpoint||'';return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(value)?value:'';}
async function storage(mode,value){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('draft');
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result;const tx=db.transaction('draft',mode);const store=tx.objectStore('draft');const op=mode==='readonly'?store.get(KEY):store.put(value,KEY);let result;
   op.onsuccess=()=>{result=op.result;};tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error);};};
 });
}
function validFields(fields){
 const className=fields.className.trim(),seat=fields.seat.trim(),idea=fields.idea.trim();
 if(!/^[\u3400-\u9fffA-Za-z0-9０-９]{1,12}$/.test(className))throw Error('請填寫班級，例如「四年三班」或「403」，最多 12 個字。');
 if(!/^\d{1,2}$/.test(seat)||Number(seat)<1||Number(seat)>99)throw Error('請填寫 1～99 的座號。');
 if([...idea].length>120)throw Error('布置想法最多 120 個字。');
 return {className,seat:String(Number(seat)),idea};
}
function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('照片讀取失敗，請再拍一張。'));image.src=src;});}
function wrap(c,text,width){const rows=[];let line='';for(const ch of text){if(ch==='\n'||c.measureText(line+ch).width>width){rows.push(line);line=ch==='\n'?'':ch;}else line+=ch;}if(line)rows.push(line);return rows;}
async function compose(draft,fields){
 const image=await loadImage(draft.base), width=1200, padding=42;
 const output=document.createElement('canvas'),c=output.getContext('2d');
 const pictureHeight=Math.round(width*image.height/image.width);
 c.font='26px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
 const ideas=wrap(c,(fields.idea||'').replace(/\s+/g,' '),width-padding*2);
 output.width=width;output.height=pictureHeight+176+(ideas.length?24+ideas.length*36:0);
 c.fillStyle='#f5f5e9';c.fillRect(0,0,width,output.height);c.fillStyle='#285d54';
 c.font='bold 38px "Noto Sans TC", "Microsoft JhengHei", sans-serif';c.fillText('悠悠水族箱 · '+draft.tankName,padding,60,width-padding*2);
 c.drawImage(image,0,88,width,pictureHeight);
 c.font='26px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
 const date=new Date(draft.capturedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false});
 c.fillText(`${fields.className||'班級未填'}　${fields.seat?fields.seat+' 號':'座號未填'}　拍攝：${date}`,padding,pictureHeight+137,width-padding*2);
 ideas.forEach((line,i)=>c.fillText(line,padding,pictureHeight+185+i*36,width-padding*2));
 return output;
}
async function send(payload,url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),35000);
 try{
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(payload),signal:controller.signal,redirect:'follow',credentials:'omit'});
  if(!response.ok)throw Error('暫時無法確認收件，請稍後再試。');
  const result=await response.json();
  if(result.ok!==true||result.submissionId!==payload.submissionId||typeof result.receipt!=='string'||!result.receipt)throw Error(result.error||'尚未收到收件確認，請稍後再試。');
  return {receipt:result.receipt,notification:result.notification==='sent'?'sent':'pending'};
 }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('還沒確認是否送達。照片已保留，請按「重試傳送」。');throw error;}
 finally{clearTimeout(timer);}
}
function create({capture,openDialog,root,getTanks=()=>[],switchTank}){
 let draft=null,busy=false,previewURL='',saveQueue=Promise.resolve(),updateVersion=0,lastStatus='',storageOK=true;
 const ready=storage('readonly').then(value=>{if(value&&value.version===1&&typeof value.base==='string'&&value.base.startsWith('data:image/png;base64,'))draft=value;}).catch(()=>{});
 function persist(){const copy=structuredClone(draft);saveQueue=saveQueue.catch(()=>{}).then(()=>storage('readwrite',copy));saveQueue.catch(()=>{storageOK=false;});return saveQueue;}
 async function take(){const shot=capture();draft={version:1,base:shot.canvas.toDataURL('image/png'),tankName:shot.tankName,tankId:shot.tankId,capturedAt:shot.capturedAt,fields:draft?.fields||{className:'',seat:'',idea:''},payload:null,result:null};await persist().catch(()=>{});}
 async function open(){await ready;openDialog('拍照分享','photo-share');if(!draft){try{await take();}catch{root().append(el('p','拍照失敗，請關閉視窗後再試一次。'));return;}}render();}
 function render(){
  const host=root();host.replaceChildren();host.classList.add('photo-share');
  const photo=el('img');photo.id='photo-preview';photo.alt='目前準備傳給老師的水族箱照片';
  const note=el('p','選擇想分享的魚缸，照片會自動更新，已填的資料會保留。','photo-note');
  const tanks=getTanks(),tankRow=el('label','拍哪一個魚缸？','photo-tank-picker'),tankSelect=el('select');tankSelect.id='photo-tank';tankRow.htmlFor=tankSelect.id;
  const chosen=draft.tankId||tanks.find(t=>t.name===draft.tankName)?.id||tanks.find(t=>t.active)?.id;
  for(const tank of tanks){const option=el('option',tank.name+'（'+(tank.habitat==='marine'?'海水':'淡水')+'）');option.value=tank.id;option.selected=tank.id===chosen;tankSelect.append(option);}
  tankRow.append(tankSelect);tankRow.hidden=tanks.length<2;
  const form=el('form');form.id='photo-form';const fields={};
  for(const [key,label,placeholder]of [['className','班級','例如：四年三班或 403'],['seat','座號','例如：12'],['idea','我的布置想法（選填）','想讓老師看看哪些布置？']]){
   const row=el('label',label),input=el(key==='idea'?'textarea':'input');input.id='photo-'+key;input.name=key;input.value=draft.fields[key]||'';input.placeholder=placeholder;input.maxLength=key==='idea'?240:key==='className'?12:2;
   if(key==='seat'){input.inputMode='numeric';input.pattern='[0-9]{1,2}';}if(key!=='idea')input.required=true;row.htmlFor=input.id;row.append(input);form.append(row);fields[key]=input;
  }
  const status=el('p',lastStatus,'photo-status');status.id='photo-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const actions=el('div',null,'photo-actions'),submit=el('button','傳給老師','confirm'),download=el('a','下載照片','photo-download'),retake=el('button','重新拍照'),edit=el('button','修改資料');
  submit.id='photo-send';submit.type='submit';download.id='photo-download';download.textContent='正在準備照片…';download.setAttribute('aria-disabled','true');retake.id='photo-retake';retake.type=edit.type='button';edit.id='photo-edit';
  const privacy=el('p','只需填班級、座號，不用填姓名。送出後，照片與布置想法會交給老師保存。','photo-note');
  if(!storageOK)privacy.append(document.createTextNode(' 這台裝置暫時無法保留照片到下次開啟，請先下載保存。'));
  actions.append(submit,download,retake,edit);form.append(status,actions);host.append(tankRow,note,photo,form,privacy);
  function refresh(){
   const locked=busy||!!draft.payload||!!draft.result;
   Object.values(fields).forEach(input=>{input.disabled=locked;});submit.disabled=busy||!!draft.result||!endpoint();retake.disabled=edit.disabled=busy;
   tankSelect.disabled=busy;
   edit.hidden=!draft.payload||!!draft.result;submit.textContent=busy?'正在傳送，請稍候…':draft.result?'已提交':draft.payload?'重試傳送':'傳給老師';
   if(busy)status.textContent='正在傳送，請先留在這個畫面…';
   else if(draft.result)status.textContent='老師已收到你的作品！收件編號：'+draft.result.receipt;
   else if(!endpoint())status.textContent='老師還沒開放收件，你可以先下載照片。';
  }
  async function updatePreview(){
   const revision=++updateVersion;download.setAttribute('aria-disabled','true');try{const output=await compose(draft,draft.fields);const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));if(!blob)throw Error('照片準備失敗，請再拍一張。');if(revision!==updateVersion||!photo.isConnected)return;
    if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(blob);photo.src=previewURL;download.href=previewURL;download.download=`悠悠水族箱_${draft.fields.className||'班級'}_${draft.fields.seat||'座號'}_${new Date(draft.capturedAt).toISOString().slice(0,10)}.png`;download.removeAttribute('aria-disabled');download.textContent='下載照片';
   }catch(error){status.textContent=error.message;}
  }
  download.addEventListener('click',e=>{if(download.getAttribute('aria-disabled')==='true')e.preventDefault();});
  form.addEventListener('input',()=>{draft.fields=Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value]));persist();updatePreview();});
  async function refreshShot(tankId){if(busy)return;busy=true;refresh();try{if(tankId&&switchTank(tankId)===false)throw Error('目前無法切換魚缸，請關閉視窗後再試一次。');await take();lastStatus='';}catch(error){lastStatus=error.message||'拍照失敗，原本照片仍保留。';}finally{busy=false;render();}}
  tankSelect.onchange=()=>refreshShot(tankSelect.value);
  retake.onclick=()=>refreshShot();
  edit.onclick=()=>{if(busy)return;draft.payload=null;persist();lastStatus='';status.textContent='可以修改資料。再次傳送會建立一份新的作品。';refresh();};
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(busy||draft.result||!endpoint())return;
   try{
    const normalized=validFields(draft.fields);busy=true;refresh();status.textContent='正在傳送，請先留在這個畫面…';
    if(!draft.payload){const output=await compose(draft,normalized),image=output.toDataURL('image/png');if((image.length-image.indexOf(',')-1)*.75>MAX_BYTES)throw Error('照片太大，請重新拍照後再傳。');draft.fields=normalized;draft.payload={version:1,submissionId:uuid(),...normalized,tankName:draft.tankName,capturedAt:draft.capturedAt,image};}
    await persist().catch(()=>{});
    draft.result=await send(draft.payload,endpoint());await persist().catch(()=>{});status.textContent='老師已收到你的作品！收件編號：'+draft.result.receipt;
   }catch(error){lastStatus=error.message||'傳送失敗，照片已保留，請稍後重試。';status.textContent=lastStatus;}
   finally{busy=false;if(root().classList.contains('photo-share')&&root().closest('dialog')?.open)render();else refresh();}
  });
  refresh();updatePreview();
 }
 return {open};
}
window.AquariumPhotoShare=Object.freeze({create,validFields,send,compose});
})();
