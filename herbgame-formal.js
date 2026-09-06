(async()=>{
  const manifest={"css":["herbgame-formal-css-01.b64"],"js":["herbgame-formal-js-01.b64","herbgame-formal-js-02.b64","herbgame-formal-js-03.b64","herbgame-formal-js-04.b64","herbgame-formal-js-05.b64","herbgame-formal-js-06.b64","herbgame-formal-js-07.b64","herbgame-formal-js-08.b64","herbgame-formal-js-09.b64","herbgame-formal-js-10.b64","herbgame-formal-js-11.b64","herbgame-formal-js-12.b64","herbgame-formal-js-13.b64","herbgame-formal-js-14.b64","herbgame-formal-js-15.b64","herbgame-formal-js-16.b64","herbgame-formal-js-17.b64","herbgame-formal-js-18.b64","herbgame-formal-js-19.b64","herbgame-formal-js-20.b64","herbgame-formal-js-21.b64","herbgame-formal-js-22.b64","herbgame-formal-js-23.b64","herbgame-formal-js-24.b64","herbgame-formal-js-25.b64","herbgame-formal-js-26.b64","herbgame-formal-js-27.b64","herbgame-formal-js-28.b64","herbgame-formal-js-29.b64","herbgame-formal-js-30.b64","herbgame-formal-js-31.b64","herbgame-formal-js-32.b64","herbgame-formal-js-33.b64"]};
  async function joinFiles(files){
    const parts=[];
    for(const f of files){ const r=await fetch(f,{cache:'no-store'}); if(!r.ok) throw new Error(`載入失敗: ${f}`); parts.push(await r.text()); }
    return parts.join('');
  }
  async function gunzipBase64(b64){
    const bin=atob(b64); const bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    if(!('DecompressionStream' in window)) throw new Error('此瀏覽器不支援正式版解壓縮載入。請使用新版 Chrome / Edge。');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  }
  try{
    const cssText=await gunzipBase64(await joinFiles(manifest.css));
    const style=document.createElement('style'); style.textContent=cssText; document.head.appendChild(style);
    const jsText=await gunzipBase64(await joinFiles(manifest.js));
    (0,eval)(jsText);
  }catch(err){
    console.error(err);
    document.body.innerHTML=`<div style="min-height:100vh;background:#0f172a;color:white;display:flex;align-items:center;justify-content:center;text-align:center;font-family:sans-serif;padding:2rem"><div><h1>正式版載入失敗</h1><p>${err.message}</p><p>請重新整理頁面後再試一次。</p></div></div>`;
  }
})();
