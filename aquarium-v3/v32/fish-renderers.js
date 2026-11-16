import { stripTopology, updatePositions } from './fish-rig.js';
import { frontViewFor } from './sample-fish.js?v=3.2.6';

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
      ctx.scale(pose.turnWidth ?? pose.legacyScale ?? 1,1);
      const front=pose.frontMix||0;
      const side=1-front;
      if (side*pose.dorsal>0) drawSide(pose,false,side*pose.dorsal);
      if (side*(1-pose.dorsal)>0) drawSide(pose,true,side*(1-pose.dorsal));
      if (front>0) {
        const {image,width,aspect}=pose;
        ctx.globalAlpha=front;
        ctx.drawImage(frontViewFor(image),-width/2,-width*aspect/2,width,width*aspect);
      }
      ctx.restore();
    }
  }
  function drawSide(pose,mirrored,alpha) {
    const {image,width,aspect,strip}=pose;
    const height=width*aspect;
    ctx.save();
    ctx.globalAlpha=alpha;
    if (mirrored) {
      if (pose.turnWidth===undefined) ctx.scale(1,-1);
      else ctx.scale(-1,1);
    }
    if (!strip) {
      ctx.drawImage(image,-width/2,-height/2,width,height);
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
  function resetGeometry(entry,columns,aspect) {
    releaseGeometry(entry);
    const {uv,indices}=stripTopology(columns);
    const positions=new Float32Array((columns+1)*4);
    for (let c=0;c<=columns;c++) {
      positions.set([c/columns-.5,-aspect/2,c/columns-.5,aspect/2],c*4);
    }
    const geometry=new MeshGeometry({positions,uvs:uv,indices});
    entry.geometry=geometry;
    entry.positions=positions;
    entry.columns=columns;
    entry.normal=make(geometry,entry.texture);
    entry.mirror=make(geometry,entry.texture);
    entry.holder.addChild(entry.normal,entry.mirror);
    if (entry.front) entry.holder.setChildIndex(entry.front,entry.holder.children.length-1);
  }
  function addFront(entry,pose) {
    const {uv,indices}=stripTopology(1);
    const half=pose.aspect/2;
    const positions=new Float32Array([-.5,-half,-.5,half,.5,-half,.5,half]);
    const geometry=new MeshGeometry({positions,uvs:uv,indices});
    const texture=textureFor(frontViewFor(pose.image));
    entry.front=make(geometry,texture);
    entry.holder.addChild(entry.front);
  }
  function remove(id) {
    const item=fish.get(id);
    if (!item) return;
    releaseGeometry(item);
    if (item.front) {
      const {geometry,texture}=item.front;
      item.front.destroy();
      geometry.destroy(true);
      texture.destroy(true);
    }
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
      const columns=pose.strip ? pose.strip.x.length-1 : 1;
      if (entry.columns!==columns) resetGeometry(entry,columns,pose.aspect);
      if (pose.strip) {
        updatePositions(entry.positions,pose.strip,pose.aspect);
        entry.geometry.getBuffer('aPosition').update();
      }
      const {holder,normal,mirror}=entry;
      if (stage.children[i]!==holder) stage.setChildIndex(holder,i);
      holder.position.set(pose.x,pose.y);
      holder.rotation=pose.angle;
      holder.scale.set(pose.width*(pose.turnWidth ?? pose.legacyScale ?? 1),pose.width);
      const uprightTurn=pose.turnWidth!==undefined;
      mirror.scale.set(uprightTurn ? -1 : 1,uprightTurn ? 1 : -1);
      const front=pose.frontMix||0;
      const side=1-front;
      normal.alpha=side*pose.dorsal;
      normal.visible=normal.alpha>0;
      mirror.alpha=side*(1-pose.dorsal);
      mirror.visible=mirror.alpha>0;
      if (front>0 && !entry.front) addFront(entry,pose);
      if (entry.front) {
        entry.front.visible=front>0;
        entry.front.alpha=front;
      }
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
