import { clamp, createStrip, creatureHeading, dorsalMix, poseCreature, poseCreatureLegacy, poseStrip } from './fish-rig.js?v=3.6.3';
import { canvasFishRenderer, webglFishRenderer } from './fish-renderers.js?v=3.6.0';
import { makeSwimmer, resizeSchool, stepSchool } from './school.js?v=3.6.3';
import { makeAtmosphere } from './ocean-scene.js';
import { loadFishImage } from './sample-fish.js?v=3.4.1';
import { createWaterInteractions } from './water-interactions.js?v=3.6.3';

export function createOcean(canvas) {
  const stage=canvas.parentElement;
  const ambient=document.createElement('canvas');
  const gpuCanvas=document.createElement('canvas');
  const effects=document.createElement('canvas');
  ambient.className='sea-atmosphere';
  gpuCanvas.className='sea-fish-gl';
  effects.className='sea-effects';
  ambient.setAttribute('aria-hidden','true');
  gpuCanvas.setAttribute('aria-hidden','true');
  effects.setAttribute('aria-hidden','true');
  gpuCanvas.hidden=true;
  canvas.before(ambient);
  canvas.after(gpuCanvas,effects);

  const sprites=new Map();
  const poses=[];
  let swimmers=[];
  const fallback=canvasFishRenderer(canvas);
  const atmosphere=makeAtmosphere(ambient);
  const interactions=createWaterInteractions(stage,effects,()=>swimmers);
  let gpu=null, gpuFailed=false;
  let motionSpeed=1,motionTime=0;
  let low=false,reduced=false,usedScale=1,w=1,h=1;
  let world={width:960,height:540};
  let request=0,lastDraw=0,lastAmbient=0,time=0,drawCount=0,lastReport=0;
  let perfStart=0,perfFrames=0,slowWindows=0;

  function metrics(now,vertices) {
    if (now-lastReport<240 && !reduced) return;
    lastReport=now;
    stage.dataset.drawCount=String(drawCount);
    stage.dataset.drawTime=String(now);
    stage.dataset.meshVertices=String(vertices);
  }
  function drawFish(now) {
    const columns=Math.max(2,Math.round(Math.sqrt(swimmers.length*w/h)));
    const rows=Math.max(1,Math.ceil(swimmers.length/columns));
    let gridScale=usedScale;
    if (reduced) {
      const cellWidth=w/columns*.83, cellHeight=h/rows*.66;
      // A shared scale keeps the species proportions even in a packed grid.
      for (const fish of swimmers) {
        gridScale=Math.min(gridScale,cellWidth/fish.width,cellHeight/(fish.width*fish.aspect));
      }
    }
    poses.length=0;
    let vertices=0;
    for (const [i,fish] of swimmers.entries()) {
      const pose=fish.pose;
      const {creature}=fish.profile;
      const greeting=Math.sin(Math.PI*fish.greet/.8);
      const chosenMesh=low || reduced ? null : gpu ? fish.mesh : fish.fallbackMesh;
      if (chosenMesh) {
        pose.strip=creature==='jelly' ? poseCreatureLegacy(chosenMesh,fish.profile,fish.phase,fish.aspect,greeting)
          : creature ? poseCreature(chosenMesh,fish.profile,fish.phase,fish.aspect,greeting)
          : poseStrip(chosenMesh,'wave',fish.profile,fish.phase,
            fish.speed/fish.baseSpeed,fish.yaw/fish.profile.turnRate,1+(fish.type==='butterfly' ? greeting*.35 : 0));
        vertices+=chosenMesh.grid ? chosenMesh.positions.length/2 : chosenMesh.x.length*2;
      } else pose.strip=null;
      if (reduced) {
        const row=Math.floor(i/columns), placed=Math.min(columns,swimmers.length-row*columns);
        pose.x=(.5+i%columns+(columns-placed)/2)*w/columns;
        pose.y=(.60+row)*h/(rows+.35);
        pose.angle=0;
        pose.dorsal=1;
        pose.width=fish.width*gridScale;
      } else {
        const float=Math.sin(motionTime*.95+fish.floatPhase)*fish.profile.float;
        pose.x=fish.x*usedScale;
        const lift=creature==='jelly' ? 16 : fish.type==='butterfly' || creature==='octopus' ? 8 : 0;
        pose.y=(fish.y+float-greeting*lift)*usedScale;
        pose.width=fish.width*usedScale*(1+(fish.type==='puffer' ? greeting*.15 : 0));
        pose.angle=creature ? creatureHeading(creature,fish.angle) : fish.angle;
        pose.dorsal=creature ? 1 : dorsalMix(fish.angle);
      }
      poses.push(pose);
    }
    try {
      (gpu || fallback).draw(poses);
    } catch (problem) {
      if (!gpu) throw problem;
      useFallback();
      return;
    }
    drawCount++;
    metrics(now,vertices);
  }
  function drawStill() {
    atmosphere.draw(reduced ? 0 : time,low || reduced);
    drawFish(performance.now());
  }

  function resize() {
    const bounds=stage.getBoundingClientRect();
    w=Math.max(1,Math.round(bounds.width));
    h=Math.max(1,Math.round(bounds.height));
    usedScale=Math.min(w/960,h/540);
    const next={width:w/usedScale,height:h/usedScale};
    resizeSchool(swimmers,world,next);
    world=next;
    const resolution=Math.min(devicePixelRatio||1,low ? .78 : gpu ? 2 : 1.5);
    (gpu || fallback).resize(w,h,resolution);
    interactions.resize(w,h,usedScale);
    stage.dataset.pixelSize=`${Math.round(w*resolution)}×${Math.round(h*resolution)}`;
    atmosphere.resize(w,h,low||reduced);
    drawStill();
  }

  function useFallback(reason) {
    gpuFailed=true;
    const previous=gpu;
    gpu=null;
    gpuCanvas.hidden=true;
    canvas.hidden=false;
    stage.dataset.renderer='canvas-2d';
    stage.dataset.fallbackReason=reason || 'draw-error';
    if (previous) queueMicrotask(()=>{ try { previous.destroy(); } catch {} });
    resize();
  }

  function render(now) {
    request=0;
    if (reduced || document.hidden) return;
    const elapsed=now-(lastDraw||now);
    if (!low || !lastDraw || elapsed>=32) {
      const dt=Math.min(elapsed/1000,.09);
      lastDraw=now;
      time+=dt;
      const motionDt=dt*motionSpeed;
      motionTime+=motionDt;
      // Bounded simulation steps preserve turning/avoidance at 2× speed.
      const steps=Math.max(1,Math.ceil(motionDt/(1/30)));
      for (let step=0;step<steps;step++) {
        interactions.step(motionDt/steps,world);
        stepSchool(swimmers,world,motionDt/steps);
      }
      drawFish(now);
      interactions.draw();
      if (gpu && !low && swimmers.length) {
        if (!perfStart) perfStart=now;
        perfFrames++;
        if (now-perfStart>=1800) {
          const fps=perfFrames*1000/(now-perfStart);
          slowWindows=fps<30 ? slowWindows+1 : 0;
          perfStart=now;
          perfFrames=0;
          if (fps<22 || slowWindows>=2) useFallback('frame-rate');
        }
      }
      if (!low && now-lastAmbient>=38) {
        lastAmbient=now;
        atmosphere.draw(time,false);
      }
    }
    request=requestAnimationFrame(render);
  }
  function start() {
    if (!request && !reduced && !document.hidden) {
      lastDraw=0;
      perfStart=perfFrames=slowWindows=0;
      request=requestAnimationFrame(render);
    }
  }
  function changeVisibility() {
    if (document.hidden && request) { cancelAnimationFrame(request); request=0; }
    else start();
  }
  new ResizeObserver(resize).observe(stage);
  document.addEventListener('visibilitychange',changeVisibility);
  stage.dataset.renderer='canvas-2d';
  stage.dataset.frameLimit='display';
  resize();
  start();
  void webglFishRenderer(gpuCanvas,()=>useFallback('context-lost')).then(renderer=>{
    if (gpuFailed || renderer.software) {
      renderer.destroy();
      if (!gpuFailed) stage.dataset.fallbackReason='software-webgl';
      return;
    }
    gpu=renderer;
    canvas.hidden=true;
    gpuCanvas.hidden=false;
    stage.dataset.renderer='pixi-webgl';
    resize();
  }).catch(()=>useFallback('webgl-unavailable'));

  return {
    setSpeed(value) {
      const number=Number(value);
      motionSpeed=Number.isFinite(number) ? clamp(number,.25,2) : 1;
      stage.dataset.motionSpeed=String(motionSpeed);
    },
    setMode(isLow,isReduced) {
      if (low===isLow && reduced===isReduced) return;
      low=isLow;
      reduced=isReduced;
      interactions.setEnabled(!reduced);
      perfStart=perfFrames=slowWindows=0;
      stage.dataset.frameLimit=reduced ? '0' : low ? '30' : 'display';
      if (request && reduced) { cancelAnimationFrame(request); request=0; }
      resize();
      start();
    },
    async add(record,url,fresh) {
      if (sprites.has(record.id)) return;
      const entry={};
      sprites.set(record.id,entry);
      try {
        const image=await loadFishImage(url);
        if (sprites.get(record.id)!==entry) return;
        entry.fish=makeSwimmer(record,image,world,fresh);
        if (entry.fish.profile.creature==='jelly') {
          // Restore exactly the vertical strip rig used by comparison pane B.
          entry.fish.mesh=createStrip(entry.fish.depth>.52 ? 18 : 10,true);
          entry.fish.fallbackMesh=createStrip(entry.fish.depth>.61 ? 12 : 7,true);
        }
        swimmers.push(entry.fish);
        swimmers.sort((a,b)=>a.depth-b.depth);
        if (reduced || document.hidden) drawFish(performance.now());
      } catch (error) {
        if (sprites.get(record.id)!==entry) return;
        sprites.delete(record.id);
        throw error;
      }
    },
    remove(id) {
      if (!sprites.delete(id)) return;
      swimmers=swimmers.filter(fish=>fish.id!==id);
      gpu?.remove(id);
      if (reduced || document.hidden) drawFish(performance.now());
    },
  };
}
