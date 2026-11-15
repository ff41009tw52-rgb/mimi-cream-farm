import { TAU } from './fish-rig.js';
import { randomSource } from './school.js';

export function makeAtmosphere(canvas) {
  const context=canvas.getContext('2d');
  const random=randomSource(2398361);
  const grains=Array.from({length:34},()=>[random(),random(),random()]);
  const bubbles=Array.from({length:21},()=>[random(),random(),random(),random()]);
  const plants=[
    [.064,.963,.11,'#24647b',.40,-1], [.105,.992,.082,'#327781',.53,1],
    [.033,1.008,.19,'#144c60',.64,1], [.089,1.015,.093,'#396d76',.55,1],
    [.94,.980,.094,'#2c657f',.43,-1], [.958,.998,.15,'#21647a',.62,-1],
    [.982,1.014,.20,'#214f68',.68,-1],
  ];
  let w=1,h=1,scale=1;
  function resize(width,height,low) {
    w=width; h=height;
    scale=Math.min(low ? .46 : .70,1280/Math.max(w,h));
    canvas.width=Math.max(1,Math.round(w*scale));
    canvas.height=Math.max(1,Math.round(h*scale));
  }
  function rocks(t) {
    const drift=Math.sin(t*.085)*w*.009;
    context.fillStyle='#356484';
    context.globalAlpha=.13;
    context.beginPath();
    context.moveTo(0,h*.967);
    context.bezierCurveTo(w*.10+drift,h*.902,w*.168+drift,h*.900,w*.238+drift,h*.944);
    context.bezierCurveTo(w*.473+drift,h*1.02,w*.61+drift,h*.951,w*.761+drift,h*.93);
    context.quadraticCurveTo(w*.856+drift,h*.893,w,h*.95);
    context.lineTo(w,h);
    context.lineTo(0,h);
    context.closePath();
    context.fill();
    context.globalAlpha=1;
  }
  function grass(t) {
    const unit=Math.min(h,w*.66);
    for (const [u,v,length,color,opacity,side] of plants) {
      const root=u*w, floor=v*h;
      context.fillStyle=color;
      context.globalAlpha=opacity;
      for (let leaf=0;leaf<5;leaf++) {
        const size=unit*length*(.55+leaf*.105);
        const x=root+(leaf-2)*size*.07;
        const curl=(leaf-2)*size*.20*side+Math.sin(t*(.51+u*.43)+leaf*.78+u*5)*size*.13;
        const tip=x+curl;
        const blade=Math.max(2.5,size*.105);
        context.beginPath();
        context.moveTo(x,floor);
        context.bezierCurveTo(x-curl*.25,floor-size*.39,tip-blade*.65,floor-size*.78,tip,floor-size);
        context.bezierCurveTo(tip+blade*.8,floor-size*.69,x+blade+curl*.12,floor-size*.27,x+blade*.67,floor);
        context.fill();
      }
    }
    context.globalAlpha=1;
  }
  function suspended(t) {
    for (const [u,v,r] of grains) {
      const x=((u+t*(.003+r*.003))%1)*w;
      const y=(v*h+Math.sin(t*.43+u*8)*(3+r*7));
      context.globalAlpha=.08+r*.22;
      context.fillStyle='#d1f5e6';
      context.beginPath();
      context.arc(x,y,.95+r*1.45,0,TAU);
      context.fill();
    }
    for (const [u,v,r,pace] of bubbles) {
      const travelled=(v+t*(.022+pace*.018))%1;
      const x=u*w+Math.sin(t*.64+u*21)*(5+r*11);
      const y=h*(1.045-travelled*1.12);
      const size=2.2+r*6;
      context.globalAlpha=(.22+r*.31)*Math.min(1,travelled*10,(1-travelled)*10);
      context.lineWidth=.95+r*.35;
      context.strokeStyle='#c5f2ed';
      context.beginPath();
      context.arc(x,y,size,0,TAU);
      context.stroke();
      context.strokeStyle='#f2fff8';
      context.beginPath();
      context.arc(x,y,size*.74,3.58,4.47);
      context.stroke();
    }
    context.globalAlpha=1;
  }
  function draw(t,quiet) {
    context.setTransform(scale,0,0,scale,0,0);
    context.clearRect(0,0,w,h);
    rocks(t*.66);
    if (!quiet) suspended(t);
    grass(t);
  }
  return { resize, draw };
}
