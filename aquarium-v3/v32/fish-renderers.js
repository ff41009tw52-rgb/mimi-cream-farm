import { stripTopology, updatePositions } from './fish-rig.js?v=3.6.5';

export function canvasFishRenderer(canvas) {
  const ctx=canvas.getContext('2d',{alpha:true});
  let scale=1;
  function resize(width,height,resolution) {
    scale=resolution;
    canvas.width=Math.max(1,Math.round(width*scale));
    canvas.height=Math.max(1,Math.round(height*scale));
  }
  function draw(poses) {
    ctx.setTransform(scale,0,0,scale,0,0);
    ctx.clearRect(0,0,canvas.width/scale,canvas.height/scale);
    for (const pose of poses) {
      ctx.save();
      ctx.translate(pose.x,pose.y);
      ctx.rotate(pose.angle);
      ctx.scale(pose.legacyScale ?? 1,1);
      if (pose.dorsal>0) drawSide(pose,false,pose.dorsal);
      if (pose.dorsal<1) drawSide(pose,true,1-pose.dorsal);
      ctx.restore();
    }
  }
  function drawSide(pose,mirrored,alpha) {
    const {image,width,aspect,strip}=pose;
    const height=width*aspect;
    ctx.save();
    ctx.globalAlpha=alpha;
    if (mirrored) {
      if (pose.mirrorX) ctx.scale(-1,1);
      else ctx.scale(1,-1);
    }
    if (!strip) {
      ctx.drawImage(image,-width/2,-height/2,width,height);
    } else if (strip.grid) {
      drawGrid(pose);
    } else if (strip.vertical) {
      drawVertical(pose);
    } else {
      const columns=strip.x.length-1;
      const naturalWidth=image.naturalWidth || image.width;
      const naturalHeight=image.naturalHeight || image.height;
      const step=naturalWidth/columns;
      for (let i=0;i<columns;i++) {
        const left=strip.x[i]*width, right=strip.x[i+1]*width;
        const top=strip.y[i]*width, bottom=strip.y[i+1]*width;
        ctx.save();
        ctx.transform((right-left)/step,(bottom-top)/step,0,1,left,top);
        // The sub-pixel overlap hides the seam from Canvas raster rounding.
        const overlap=i<columns-1 ? Math.min(1.5,naturalWidth-step*(i+1)) : 0;
        ctx.drawImage(image,i*step,0,step+overlap,naturalHeight,0,-height/2,step+overlap,height);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  function drawGrid({image,width,strip}) {
    const {positions:p,uv,indices}=strip;
    const iw=image.naturalWidth||image.width, ih=image.naturalHeight||image.height;
    for (let k=0;k<indices.length;k+=3) {
      const a=indices[k]*2,b=indices[k+1]*2,c=indices[k+2]*2;
      const ax=p[a]*width,ay=p[a+1]*width,bx=p[b]*width,by=p[b+1]*width,cx=p[c]*width,cy=p[c+1]*width;
      const sx=uv[a]*iw,sy=uv[a+1]*ih;
      const ux=(uv[b]-uv[a])*iw,uy=(uv[b+1]-uv[a+1])*ih;
      const vx=(uv[c]-uv[a])*iw,vy=(uv[c+1]-uv[a+1])*ih;
      const det=ux*vy-uy*vx;
      const m0=((bx-ax)*vy-(cx-ax)*uy)/det, m1=((by-ay)*vy-(cy-ay)*uy)/det;
      const m2=((cx-ax)*ux-(bx-ax)*vx)/det, m3=((cy-ay)*ux-(by-ay)*vx)/det;
      const centerX=(ax+bx+cx)/3,centerY=(ay+by+cy)/3;
      ctx.save();
      ctx.beginPath();
      // Tiny overlap covers antialiased clip edges. UVs and shared vertices never change.
      for (let n=0;n<3;n++) {
        const j=indices[k+n]*2,x=p[j]*width,y=p[j+1]*width;
        const padding=.36/Math.max(1,Math.hypot(x-centerX,y-centerY));
        const px=x+(x-centerX)*padding,py=y+(y-centerY)*padding;
        if (!n) ctx.moveTo(px,py); else ctx.lineTo(px,py);
      }
      ctx.closePath();
      ctx.clip();
      ctx.transform(m0,m1,m2,m3,ax-m0*sx-m2*sy,ay-m1*sx-m3*sy);
      const left=Math.max(0,Math.min(sx,sx+ux,sx+vx)-2);
      const top=Math.max(0,Math.min(sy,sy+uy,sy+vy)-2);
      const right=Math.min(iw,Math.max(sx,sx+ux,sx+vx)+2);
      const bottom=Math.min(ih,Math.max(sy,sy+uy,sy+vy)+2);
      ctx.drawImage(image,left,top,right-left,bottom-top,left,top,right-left,bottom-top);
      ctx.restore();
    }
  }
  function drawVertical({image,width,strip}) {
    const naturalWidth=image.naturalWidth || image.width;
    const naturalHeight=image.naturalHeight || image.height;
    const rows=strip.y.length-1, step=naturalHeight/rows;
    for (let i=0;i<rows;i++) {
      const left=strip.x[i]*width, top=strip.y[i]*width;
      const span=(strip.span[i]+strip.span[i+1])*.5;
      const end=Math.min(naturalHeight,(i+1)*step+1.3);
      const sourceHeight=end-i*step;
      ctx.save();
      ctx.transform(span,0,(strip.x[i+1]*width-left)/step,(strip.y[i+1]*width-top)/step,left,top);
      ctx.drawImage(image,0,i*step,naturalWidth,sourceHeight,-width/2,0,width,sourceHeight);
      ctx.restore();
    }
  }
  return { resize, draw };
}

let pixi;
function loadPixi() {
  return pixi ||= import('./vendor/pixi-8.23.0.mjs');
}

export async function webglFishRenderer(canvas,onLost) {
  const { Container, ImageSource, Mesh, MeshGeometry, Texture, WebGLRenderer }=await loadPixi();
  const renderer=new WebGLRenderer();
  try {
    await renderer.init({
      canvas, width:1, height:1, resolution:1, autoDensity:false, antialias:false,
      backgroundAlpha:0, preferWebGLVersion:2, skipExtensionImports:true,
    });
  } catch (error) {
    try { renderer.destroy(); } catch {}
    throw error;
  }
  const gl=renderer.gl;
  const debug=gl.getExtension('WEBGL_debug_renderer_info');
  const driver=debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : '';
  const software=/swiftshader|llvmpipe|software rasterizer|microsoft basic render driver/i.test(driver);
  const stage=new Container({eventMode:'none'});
  const fish=new Map();
  const contextLost=event=>{ event.preventDefault(); onLost(); };
  canvas.addEventListener('webglcontextlost',contextLost);

  function make(geometry,texture) { return new Mesh({geometry,texture,eventMode:'none'}); }
  function textureFor(image) {
    const source=new ImageSource({resource:image,scaleMode:'linear',autoGenerateMipmaps:true});
    return new Texture({source});
  }
  function add(pose) {
    const texture=textureFor(pose.image);
    const holder=new Container({eventMode:'none'});
    stage.addChild(holder);
    return {holder,texture,columns:0};
  }
  function releaseGeometry(entry) {
    if (!entry.geometry) return;
    entry.normal.destroy();
    entry.mirror.destroy();
    entry.geometry.destroy(true);
  }
  function resetGeometry(entry,columns,aspect,vertical,grid) {
    releaseGeometry(entry);
    const {uv,indices}=grid || stripTopology(columns,vertical);
    const positions=new Float32Array(uv.length);
    for (let c=0;!grid && c<=columns;c++) {
      positions.set([c/columns-.5,-aspect/2,c/columns-.5,aspect/2],c*4);
    }
    const geometry=new MeshGeometry({positions,uvs:uv,indices});
    entry.geometry=geometry;
    entry.positions=positions;
    entry.columns=columns;
    entry.vertical=vertical;
    entry.rows=grid?.rows || 0;
    entry.normal=make(geometry,entry.texture);
    entry.mirror=make(geometry,entry.texture);
    entry.holder.addChild(entry.normal,entry.mirror);
  }
  function remove(id) {
    const item=fish.get(id);
    if (!item) return;
    releaseGeometry(item);
    item.holder.destroy();
    item.texture.destroy(true);
    fish.delete(id);
  }
  function draw(poses) {
    for (let i=0;i<poses.length;i++) {
      const pose=poses[i];
      let entry=fish.get(pose.id);
      if (!entry) {
        entry=add(pose);
        fish.set(pose.id,entry);
      }
      const grid=pose.strip?.grid ? pose.strip : null;
      const columns=grid ? grid.columns : pose.strip ? pose.strip.x.length-1 : 1;
      const vertical=pose.strip?.vertical || false;
      if (entry.columns!==columns || entry.vertical!==vertical || entry.rows!==(grid?.rows||0)) resetGeometry(entry,columns,pose.aspect,vertical,grid);
      if (pose.strip) {
        updatePositions(entry.positions,pose.strip,pose.aspect);
        entry.geometry.getBuffer('aPosition').update();
      }
      const {holder,normal,mirror}=entry;
      if (stage.children[i]!==holder) stage.setChildIndex(holder,i);
      holder.position.set(pose.x,pose.y);
      holder.rotation=pose.angle;
      holder.scale.set(pose.width*(pose.legacyScale ?? 1),pose.width);
      normal.visible=pose.dorsal>0;
      normal.alpha=pose.dorsal;
      mirror.visible=pose.dorsal<1;
      mirror.alpha=1-pose.dorsal;
      mirror.scale.set(pose.mirrorX ? -1 : 1,pose.mirrorX ? 1 : -1);
    }
    renderer.render({container:stage});
  }
  return {
    software,
    resize(width,height,scale) { renderer.resize(width,height,scale); },
    draw,
    remove,
    destroy() {
      canvas.removeEventListener('webglcontextlost',contextLost);
      for (const id of fish.keys()) remove(id);
      stage.destroy();
      renderer.destroy();
    },
  };
}
