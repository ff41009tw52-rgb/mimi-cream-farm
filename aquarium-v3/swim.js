const TAU = 2*Math.PI;
const lanes = 7;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const smooth = t => t*t*(3-2*t);
function rng(seed) {
  return () => {
    seed ^= seed<<13;
    seed ^= seed>>>17;
    seed ^= seed<<5;
    return (seed>>>0)/4294967296;
  };
}

export function createOcean(canvas) {
  const ctx=canvas.getContext('2d');
  const sprites=new Map();
  const occupied=new Set();
  const plants=[
    [.046,.989,.19,'#225969'],[.04,.995,.14,'#307b75'],[.084,.996,.105,'#37908d'],
    [.94,.996,.16,'#2c6877'],[.964,.998,.22,'#244d68'],[.986,.999,.18,'#3d8e85'],
  ];
  const random=rng(7925113);
  const bubbles=Array.from({length:23},()=>[random(),random(),random(),random()]);
  const grains=Array.from({length:38},()=>[random(),random(),random()]);
  let low=false,reduced=false,w=1,h=1,dpr=1,clock=0,last=0,request=0;
  let sorted=[];
  function rebuild() { sorted = [...sprites.values()].sort((a,b)=>a.depth-b.depth); }
  function resize() {
    const bounds=canvas.getBoundingClientRect();
    w=Math.max(1,bounds.width); h=Math.max(1,bounds.height);
    dpr=Math.min(devicePixelRatio||1,low ? 1 : 1.5);
    canvas.width=Math.round(w*dpr);
    canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if (reduced) draw();
  }
  function drawPlants() {
    for (const [u,v,l,color] of plants) {
      const x=u*w,y=v*h,height=l*h,side=u<.5 ? 1 : -1;
      ctx.fillStyle=color;
      ctx.globalAlpha=.64;
      for (let i=0;i<5;i++) {
        const len=height*(.56+i*.11), sway=Math.sin(clock*.83+i*.64+u*8)*len*.12;
        const tip=side*(i-1.8)*height*.18+sway;
        ctx.beginPath();
        ctx.moveTo(x+i*4,y);
        ctx.bezierCurveTo(x-tip*.34,y-len*.62,x+tip*.9,y-len*.75,x+tip,y-len);
        ctx.bezierCurveTo(x+tip*.76+len*.09,y-len*.64,x+len*.07,y-len*.24,x+i*4+5,y);
        ctx.fill();
      }
    }
    ctx.globalAlpha=1;
  }
  function drawWater() {
    for (const [u,v,r] of grains) {
      const x=((u+clock*(.003+r*.002))%1)*w, y=v*h+Math.sin(clock*.33+u*10)*9;
      ctx.fillStyle=`rgba(225,255,236,${.10+r*.22})`;
      ctx.beginPath();
      ctx.arc(x,y,1+r*1.45,0,TAU);
      ctx.fill();
    }
    for (const [u,v,r,s] of bubbles) {
      const y=(1.02-((v+clock*(.018+s*.026))%1)*1.12)*h;
      const x=u*w+Math.sin(clock*.8+r*17)*(5+s*12), radius=2+r*5.5;
      ctx.strokeStyle='rgba(213,251,250,.38)';
      ctx.lineWidth=1.1;
      ctx.beginPath();
      ctx.arc(x,y,radius,0,TAU);
      ctx.stroke();
      ctx.strokeStyle='rgba(237,255,252,.52)';
      ctx.beginPath();
      ctx.arc(x,y,radius*.7,3.65,4.65);
      ctx.stroke();
    }
  }
  function drawFish(sprite) {
    if (!sprite.ready) return;
    const {image,depth,lane,slot,initial,entrySide,speed} = sprite;
    const unit=Math.min(w,h*1.8);
    const width=unit*(.088+depth*.040);
    const height=width*image.naturalHeight/image.naturalWidth;
    const age=clock-sprite.born;
    const phase=initial+age*speed;
    const y=h*(.2+lane*.103)+Math.sin(phase*1.35+depth*6)*h*.018;
    const middle=.5+((slot%3)-1)*.013;
    let x=middle+(.365+depth*.035)*Math.sin(phase);
    let direction=clamp(Math.cos(phase)*5,-1,1);
    let alpha=1;
    if (!reduced && sprite.fresh && age<2.45) {
      const progress=smooth(clamp(age/2.45,0,1));
      x=(entrySide>0 ? -.10 : 1.10)*(1-progress)+x*progress;
      alpha=smooth(clamp(age/.75,0,1));
    }
    if (reduced) {
      x=.105+(Math.floor(slot/lanes)%6)*.157;
      direction=1;
    }
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.translate(x*w,y);
    ctx.scale((direction<0 ? -1 : 1)*(.045+.955*Math.abs(direction)),1);
    ctx.drawImage(image,-width/2,-height/2,width,height);
    ctx.restore();
  }
  function draw() {
    ctx.clearRect(0,0,w,h);
    if (!low && !reduced) drawWater();
    for (const sprite of sorted) drawFish(sprite);
    if (!low) drawPlants();
  }
  function render(now) {
    request=0;
    if (reduced || document.hidden) return;
    const elapsed=last ? now-last : 0;
    if (!low || elapsed>=30 || !last) {
      clock+=Math.min(elapsed/1000,.1);
      last=now;
      draw();
    }
    request=requestAnimationFrame(render);
  }
  function start() {
    if (!request && !reduced && !document.hidden) {
      last=0;
      request=requestAnimationFrame(render);
    }
  }
  new ResizeObserver(resize).observe(canvas);
  addEventListener('visibilitychange',()=>{
    if (document.hidden && request) { cancelAnimationFrame(request); request=0; }
    else start();
  });
  start();
  return {
    setMode(isLow,isReduced) {
      low=isLow;
      reduced=isReduced;
      if (request && reduced) { cancelAnimationFrame(request); request=0; }
      resize();
      start();
    },
    async add(record,url,fresh) {
      if (sprites.has(record.id)) return;
      let slot=0;
      while (occupied.has(slot)) slot++;
      occupied.add(slot);
      const seed=parseInt(record.id.slice(0,8),16) || slot+1;
      const random=rng(seed);
      const lane=(slot*3)%lanes;
      const depth=.17+random()*.81;
      const entrySide=slot%2 ? -1 : 1;
      const column=Math.floor(slot/lanes);
      const spread=(column*.618+lane*.17+random()*.10)%1;
      const initial=fresh ? (entrySide>0 ? -1.18 : 1.87)+spread*1.85 : column*1.01+random()*.65+lane*.7;
      const image=new Image();
      const sprite={image,slot,lane,depth,entrySide,initial,fresh,born:clock,speed:.10+random()*.075,ready:false};
      sprites.set(record.id,sprite);
      image.src=url;
      try {
        await image.decode();
        if (sprites.get(record.id)!==sprite) return;
        sprite.ready=true;
        // A slow decode should not consume the entire entrance animation.
        sprite.born=clock;
        rebuild();
        if (reduced || document.hidden) draw();
      } catch (error) {
        if (sprites.get(record.id)!==sprite) return;
        sprites.delete(record.id);
        occupied.delete(slot);
        throw error;
      }
    },
    remove(id) {
      const sprite=sprites.get(id);
      if (!sprite) return;
      sprites.delete(id);
      occupied.delete(sprite.slot);
      rebuild();
      if (reduced || document.hidden) draw();
    },
  };
}
