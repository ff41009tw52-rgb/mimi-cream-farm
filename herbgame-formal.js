(async()=>{
  const manifest={"css":["herbgame-formal-css-01.b64"],"js":["herbgame-formal-release-01.b64","herbgame-formal-release-02.b64"]};

  async function joinFiles(files){
    const parts=[];
    for(const f of files){
      const r=await fetch(f,{cache:'no-store'});
      if(!r.ok) throw new Error(`載入失敗: ${f}`);
      parts.push(await r.text());
    }
    return parts.join('');
  }

  async function gunzipBase64(b64){
    const bin=atob(b64);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    if(!('DecompressionStream' in window)){
      throw new Error('此瀏覽器不支援正式版解壓縮載入。請使用新版 Chrome / Edge。');
    }
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  }

  function repairReleaseJs(jsText){
    // TEMP_SCENE_IMAGES 必須先於 CAMPUS_LOCATIONS 宣告。
    const tempToken='const TEMP_SCENE_IMAGES = {';
    const campusToken='const CAMPUS_LOCATIONS = [';
    const tempStart=jsText.indexOf(tempToken);
    const campusStart=jsText.indexOf(campusToken);

    if(tempStart>=0 && campusStart>=0 && tempStart>campusStart){
      let cursor=tempStart+tempToken.length;
      let depth=1;
      let quote=null;
      let escaped=false;

      for(;cursor<jsText.length;cursor++){
        const ch=jsText[cursor];
        if(quote){
          if(escaped){ escaped=false; continue; }
          if(ch==='\\'){ escaped=true; continue; }
          if(ch===quote) quote=null;
          continue;
        }
        if(ch==='"' || ch==="'" || ch==='`'){ quote=ch; continue; }
        if(ch==='{') depth++;
        else if(ch==='}'){
          depth--;
          if(depth===0){ cursor++; break; }
        }
      }

      let tempEnd=cursor;
      while(tempEnd<jsText.length && /[\s;]/.test(jsText[tempEnd])) tempEnd++;
      const block=jsText.slice(tempStart,tempEnd);
      jsText=jsText.slice(0,tempStart)+jsText.slice(tempEnd);
      const newCampusStart=jsText.indexOf(campusToken);
      jsText=jsText.slice(0,newCampusStart)+block+'\n\n        '+jsText.slice(newCampusStart);
    }

    // 修正目前 GitHub 已存在的陳老師頭像實際路徑。
    jsText=jsText.replaceAll(
      'picture/herb-game/characters/chen-guanwei-normal.jpg',
      'picture/herb-game/chen-guanwei-normal.png'
    );

    // 正式版是「非同步抓取→解壓→eval」後才執行。
    // 此時 DOMContentLoaded 通常早已觸發，原本只監聽該事件會導致 GameEngine 永遠不建立，開始按鈕完全無反應。
    jsText=jsText.replace(
      /window\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*\(\)\s*=>\s*\{\s*window\.gameEngine\s*=\s*new\s+GameEngine\(\)\s*;\s*\}\s*\)\s*;/s,
      `(()=>{\n  const bootGame=()=>{\n    if(!window.gameEngine) window.gameEngine=new GameEngine();\n  };\n  if(document.readyState==='loading'){\n    document.addEventListener('DOMContentLoaded',bootGame,{once:true});\n  }else{\n    bootGame();\n  }\n})();`
    );

    return jsText;
  }

  try{
    const cssText=await gunzipBase64(await joinFiles(manifest.css));
    const style=document.createElement('style');
    style.textContent=cssText;
    document.head.appendChild(style);

    let jsText=await gunzipBase64(await joinFiles(manifest.js));
    jsText=repairReleaseJs(jsText);
    (0,eval)(jsText);
  }catch(err){
    console.error(err);
    document.body.innerHTML=`<div style="min-height:100vh;background:#0f172a;color:white;display:flex;align-items:center;justify-content:center;text-align:center;font-family:sans-serif;padding:2rem"><div><h1>正式版載入失敗</h1><p>${err.message}</p><p>請重新整理頁面後再試一次。</p></div></div>`;
  }
})();