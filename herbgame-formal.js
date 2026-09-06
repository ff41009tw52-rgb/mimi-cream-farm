(async()=>{
  const manifest={"css":["herbgame-formal-css-01.b64"],"js":["herbgame-formal-release-01.b64","herbgame-formal-release-02.b64"]};
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
