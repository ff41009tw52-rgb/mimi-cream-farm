import { FISH, SHEET } from '../templates.js';

export async function loadFishImage(url) {
  const image=new Image();
  image.src=url;
  await image.decode();
  return image;
}

export async function templateFish(type,colored) {
  const artwork=await loadFishImage(new URL('../templates/artwork/'+type+'.png',import.meta.url));
  const {outline,bounds:[left,top,width,height]}=FISH[type];
  const canvas=document.createElement('canvas');
  canvas.width=width;
  canvas.height=height;
  const context=canvas.getContext('2d');
  const ratio=Math.min(658/artwork.naturalWidth,372/artwork.naturalHeight);
  const w=artwork.naturalWidth*ratio, h=artwork.naturalHeight*ratio;
  context.translate(-left,-top);
  context.clip(new Path2D(outline));
  context.drawImage(artwork,(SHEET.width-w)/2,289-h/2,w,h);
  if (colored) {
    const palette={
      clown:['#f19b65','#f7d683','#fbf0c3','#e98175'],
      butterfly:['#eacb72','#f5df92','#99cfb5','#89bfd5'],
      puffer:['#dfab78','#f5d58e','#eed87b','#acc994'],
      shark:['#76a8ca','#9fc4d4','#a0b5e0','#e0e7e6'],
    }[type];
    const gradient=context.createLinearGradient(left+width*.18,top,left+width*.7,top+height);
    palette.forEach((color,i)=>gradient.addColorStop(i/(palette.length-1),color));
    context.globalCompositeOperation='multiply';
    context.fillStyle=gradient;
    context.fillRect(left,top,width,height);
    context.strokeStyle='rgba(255,252,226,.30)';
    context.lineWidth=3;
    for (let i=0;i<65;i++) {
      const x=left+(i*47%width), y=top+(i*37%height);
      context.beginPath();
      context.moveTo(x,y);
      context.lineTo(x+25+i%18,y+9-i%14);
      context.stroke();
    }
  }
  return canvas;
}
