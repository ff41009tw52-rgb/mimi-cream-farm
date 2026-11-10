(function learningGame(){
'use strict';
const mode=document.body.dataset.game;
const CN=[
{clue:'跟著音樂一起「＿＿手」',left:'扌',right:'白',char:'拍',word:'拍手',leftChoices:['氵','扌','口','木'],rightChoices:['青','白','也','子'],why:'「拍」的提手旁和手的動作有關。'},
{clue:'讀完書要「＿＿息」一下',left:'亻',right:'木',char:'休',word:'休息',leftChoices:['日','木','亻','女'],rightChoices:['木','白','青','馬'],why:'「休」由人字旁和「木」組成。'},
{clue:'晴天時，天空很「＿＿朗」',left:'日',right:'青',char:'晴',word:'晴朗',leftChoices:['木','言','日','氵'],rightChoices:['青','子','目','月'],why:'「晴」有日字旁，和天氣、陽光有關。'},
{clue:'請把地板「＿＿」乾淨',left:'扌',right:'帚',char:'掃',word:'掃地',leftChoices:['亻','扌','口','氵'],rightChoices:['苗','帚','青','包'],why:'「掃」的提手旁表示和手的動作有關。'},
{clue:'老師說：「＿＿問，你要找哪一本書？」',left:'言',right:'青',char:'請',word:'請問',leftChoices:['日','言','土','木'],rightChoices:['青','白','馬','也'],why:'「請」的言字旁與說話、語言有關。'},
{clue:'下雨後，池水變得很「＿＿澈」',left:'氵',right:'青',char:'清',word:'清澈',leftChoices:['日','扌','氵','口'],rightChoices:['包','青','白','目'],why:'「清」有三點水。「清澈」形容水很清，看起來透明。'},
{clue:'山坡上長著一棵「＿＿樹」',left:'木',right:'公',char:'松',word:'松樹',leftChoices:['扌','木','女','亻'],rightChoices:['公','青','白','也'],why:'「松」是木字旁，和樹木有關。'},
{clue:'我們一起「＿＿歌」給朋友聽',left:'口',right:'昌',char:'唱',word:'唱歌',leftChoices:['口','氵','木','日'],rightChoices:['馬','昌','月','青'],why:'「唱」有口字旁。唱歌時，我們用嘴巴發出聲音。'}
];
const KITCHEN=[
{food:'現烤麵包',icon:'🍞',sense:'嗅覺',prefix:'剛出爐的麵包，',choices:[['散發出香甜的氣味','嗅覺'],['表面呈現金黃色','視覺'],['外皮摸起來暖暖的','觸覺'],['咬下去喀滋作響','聽覺']],why:'鼻子聞到麵包的香味，這就是嗅覺描寫。'},
{food:'香脆餅乾',icon:'🍪',sense:'聽覺',prefix:'白奶油咬下一口餅乾，',choices:[['甜味在嘴裡散開','味覺'],['發出喀滋喀滋的聲音','聽覺'],['表面有棕色花紋','視覺'],['摸起來乾乾的','觸覺']],why:'聽覺是耳朵聽到的聲音，像「喀滋」聲。'},
{food:'新鮮草莓',icon:'🍓',sense:'視覺',prefix:'盤子裡的草莓，',choices:[['聞起來有淡淡果香','嗅覺'],['吃起來酸酸甜甜','味覺'],['紅得像一顆顆小寶石','視覺'],['表面摸起來凹凸不平','觸覺']],why:'眼睛看到草莓紅紅的，像一顆顆小寶石，這就是視覺描寫。'},
{food:'檸檬水',icon:'🍋',sense:'味覺',prefix:'橘咪咪喝了一口檸檬水，',choices:[['酸酸的滋味在舌尖散開','味覺'],['杯子摸起來冰涼','觸覺'],['液面微微晃動','視覺'],['冰塊碰撞發出聲音','聽覺']],why:'舌頭嚐到檸檬水酸酸的味道，這就是味覺描寫。'},
{food:'熱豆花',icon:'🍮',sense:'觸覺',prefix:'白奶油拿起盛著豆花的碗，',choices:[['聞到淡淡的豆香','嗅覺'],['看到白白嫩嫩的豆花','視覺'],['碗身傳來暖暖的溫度','觸覺'],['嚐到清甜的滋味','味覺']],why:'手碰到碗，感覺暖暖的，這就是觸覺描寫。'},
{food:'桂花茶',icon:'🍵',sense:'嗅覺',prefix:'茶杯端到鼻子前，',choices:[['杯緣有淡金色的花瓣','視覺'],['一股清新的花香飄了過來','嗅覺'],['瓷杯握起來溫熱','觸覺'],['喝下去有微甜的味道','味覺']],why:'「花香」是經由鼻子感受到的氣味。'},
{food:'爆米花',icon:'🍿',sense:'聽覺',prefix:'鍋裡的玉米粒加熱後，',choices:[['傳出劈哩啪啦的聲響','聽覺'],['變成一朵朵白色小花','視覺'],['摸起來很蓬鬆','觸覺'],['聞起來香噴噴的','嗅覺']],why:'「劈哩啪啦」模擬聲音，是聽覺描寫。'},
{food:'鮮奶布丁',icon:'🍮',sense:'觸覺',prefix:'白奶油用湯匙輕輕碰布丁，',choices:[['晃動時像金黃色的果凍','視覺'],['有一股濃郁奶香','嗅覺'],['表面軟軟嫩嫩的','觸覺'],['吃起來滑順香甜','味覺']],why:'「軟軟嫩嫩」描述觸碰的感覺，屬於觸覺。'}
];
const ANGLES=[45,90,135,30,120,60,150,180];
const PIZZA=[{n:3,d:4},{n:1,d:2},{n:5,d:4},{n:2,d:3},{n:7,d:8},{n:3,d:2},{n:5,d:6},{n:6,d:4}];
const config={
characters:{title:'橘咪咪的國字拼裝工廠',desc:'讀句子，選部件，把空格裡的國字拼出來。',guide:'先想想空格裡缺哪個字。左邊和右邊各選一個部件，再按「檢查答案」。答錯可以重選。',subject:'chinese',count:CN.length},
kitchen:{title:'白奶油的文字料理屋',desc:'選一句描寫，幫白奶油把料理介紹寫完整。',guide:'先看題目指定哪一種感覺，例如嗅覺就是鼻子聞到的氣味。選好描寫，讀一讀完整的句子，再按「端出料理」。',subject:'chinese',count:KITCHEN.length},
angles:{title:'角度遊樂園',desc:'用量角器轉出題目指定的角度。',guide:'拖動量角器上的藍線，或按＋、－調整角度，再按「檢查角度」。和題目的角度相差 3° 以內就算答對。',subject:'math',count:ANGLES.length},
pizza:{title:'白奶油的披薩餐廳',desc:'把披薩平分，再點出客人要的片數。',guide:'看分母，決定每個披薩要平分成幾片。看分子，決定要拿幾片。客人要的量超過一個披薩時，可以從兩個披薩拿。',subject:'math',count:PIZZA.length}
}[mode];
if(!config)return;
const $=id=>document.getElementById(id), stage=$('stage'), msg=$('message'), next=$('next');
$('game-title').textContent=config.title;$('game-subtitle').textContent=config.desc;$('guide-text').textContent=config.guide;
$('subject-badge').textContent=config.subject==='chinese'?'四年級國語｜康軒版':'四年級數學｜南一版';
document.title=config.title+'｜橘咪咪與白奶油';
let index=0,score=0,solved=false;
const el=(tag,cls,text)=>{let e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
function say(text,type=''){msg.textContent=text;msg.className=type;}
function done(text){if(solved)return;solved=true;score++;say(text,'good');next.disabled=false;next.textContent=index===config.count-1?'看結果 →':'下一題 →';progress();}
function warn(text){if(!solved)say(text,'warn');}
function progress(){$('round-number').textContent='第 '+Math.min(index+1,config.count)+' / '+config.count+' 題';$('score').textContent='完成 '+score+' 題';$('fill').style.width=(100*(index+(solved?1:0))/config.count)+'%';}
function btn(text,cls,handler){let b=el('button',cls,text);b.type='button';b.addEventListener('click',handler);return b;}
function sectionTitle(title,subtitle){stage.append(el('h2','',title),el('p','hint',subtitle));}
function renderCharacters(q){
sectionTitle('空格裡缺了哪個字？',q.clue);
const slots=el('div','slot-area'),a=el('div','slot','？'),b=el('div','slot','？');slots.append(a,el('span','plus','＋'),b);stage.append(slots);
let left='',right='';
const preview=el('p','preview','先選兩個部件');stage.append(preview);
function choices(label,side,options){
stage.append(el('div','label',label));const wrap=el('div','choices');
options.forEach(part=>{let x=btn(part,'piece',()=>{if(solved)return;if(side==='left'){left=part;a.textContent=part}else{right=part;b.textContent=part}
wrap.querySelectorAll('button').forEach(z=>z.setAttribute('aria-pressed',String(z===x)));preview.textContent=left&&right?'你選了「'+left+'」＋「'+right+'」':'再選另一個部件';});
x.setAttribute('aria-pressed','false');wrap.append(x)});stage.append(wrap);
}
choices('左邊的部件', 'left',q.leftChoices);choices('右邊的部件','right',q.rightChoices);
stage.append(btn('檢查答案','primary',()=>{if(!left||!right)return warn('請在左邊和右邊各選一個部件。');if(left===q.left&&right===q.right){preview.textContent='「'+q.char+'」可以組成詞語「'+q.word+'」';done('組字成功！'+q.why)}else warn('再讀一次句子，想想空格裡缺哪個字，再試著換一個部件。')}));
}
function renderKitchen(q){
sectionTitle('幫白奶油完成料理介紹','哪一句是「'+q.sense+'」描寫？');
const order=el('div','order',q.prefix+'＿＿＿＿。');stage.append(order);
const plate=el('div','dish'),food=el('span','food',q.icon),served=el('span','served','選一張卡，看看接在句子後面是什麼樣子。');plate.append(food,served);stage.append(plate);
let selection=null;
stage.append(el('div','label','選一張描寫卡'));
const wrap=el('div','choices');
q.choices.forEach(option=>{let x=btn(option[0],'choice',()=>{if(solved)return;selection=option;served.textContent=q.prefix+option[0]+'。';wrap.querySelectorAll('button').forEach(z=>z.setAttribute('aria-pressed',String(z===x)))});
x.setAttribute('aria-pressed','false');wrap.append(x);});stage.append(wrap);
stage.append(btn('端出料理','primary',()=>{if(!selection)return warn('先選一張描寫卡。');if(selection[1]===q.sense)done('端出成功！'+q.why);else warn('這句是「'+selection[1]+'」描寫。再找找看，哪一句是「'+q.sense+'」描寫？');}));
}
function svg(tag,attrs){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);for(let k in attrs)e.setAttribute(k,attrs[k]);return e}
function renderAngles(target){
sectionTitle('轉出 '+target+'°','拖動藍線，或用＋、－按鈕調整角度。');
const box=el('div','angle-box'),s=svg('svg',{class:'protractor',viewBox:'0 0 360 215',role:'group','aria-label':'可操作的 0 到 180 度量角器',tabindex:'0'});
const ox=180,oy=186,r=132;const pos=(deg,rad)=>{let a=deg*Math.PI/180;return [ox+rad*Math.cos(a),oy-rad*Math.sin(a)]};
const arc=[];for(let deg=0;deg<=180;deg+=3){let [x,y]=pos(deg,r);arc.push((deg===0?'M':'L')+x.toFixed(2)+' '+y.toFixed(2));}
s.append(svg('path',{d:arc.join(' '),stroke:'#9aa6de','stroke-width':2,fill:'none'}),svg('line',{x1:ox,y1:oy,x2:ox+r+12,y2:oy,stroke:'#6e7890','stroke-width':4}));
for(let d=0;d<=180;d+=10){let [x,y]=pos(d,r),[u,v]=pos(d,r-(d%30===0?17:9));s.append(svg('line',{x1:x,y1:y,x2:u,y2:v,stroke:'#8f9cc7','stroke-width':d%30===0?2:1}));if(d%30===0){let [lx,ly]=pos(d,r-31);let t=svg('text',{x:lx,y:ly+5,'text-anchor':'middle','font-size':13,fill:'#4a5678'});t.textContent=d;s.append(t);}}
const ray=svg('line',{x1:ox,y1:oy,x2:ox+r,y2:oy,stroke:'#475bd1','stroke-width':7,'stroke-linecap':'round'}),dot=svg('circle',{cx:ox,cy:oy,r:7,fill:'#475bd1'});
s.append(ray,dot);box.append(s);
const read=el('div','readout');box.append(read);
const controls=el('div','angle-controls');let current=0;
function adjust(v){current=Math.max(0,Math.min(180,Math.round(v)));let [x,y]=pos(current,r);ray.setAttribute('x2',x);ray.setAttribute('y2',y);read.textContent='目前 '+current+'°｜'+(current===0?'零度角':current<90?'銳角':current===90?'直角':current<180?'鈍角':'平角');}
[-10,-1,1,10].forEach(d=>controls.append(btn((d>0?'+':'')+d+'°','',()=>{if(!solved)adjust(current+d)})));
box.append(controls);stage.append(box);
let dragging=false;
const usePointer=e=>{const rect=s.getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width*360,y=(e.clientY-rect.top)/rect.height*215;let degrees=Math.atan2(oy-y,x-ox)*180/Math.PI;if(degrees<0)degrees=x<ox?180:0;adjust(degrees);};
s.addEventListener('pointerdown',e=>{if(solved)return;dragging=true;try{s.setPointerCapture(e.pointerId)}catch(_){}usePointer(e)});
s.addEventListener('pointermove',e=>{if(dragging&&!solved)usePointer(e)});
s.addEventListener('pointerup',()=>dragging=false);s.addEventListener('pointercancel',()=>dragging=false);
s.addEventListener('keydown',e=>{if(solved)return;if(e.key==='ArrowUp'||e.key==='ArrowRight'){e.preventDefault();adjust(current+(e.shiftKey?10:1))}if(e.key==='ArrowDown'||e.key==='ArrowLeft'){e.preventDefault();adjust(current-(e.shiftKey?10:1))}});
adjust(0);
stage.append(btn('檢查角度','primary',()=>{const diff=Math.abs(current-target);if(diff<=3){adjust(target);done('轉動成功！這是'+(target<90?'銳角':target===90?'直角':target<180?'鈍角':'平角')+'。')}else warn('現在是 '+current+'°，再'+(current<target?'加 ':'減 ')+diff+'° 就到了。')}));
}
function renderPizza(q){
sectionTitle('客人要 '+q.n+'／'+q.d+' 個披薩','先選要平分成幾片，再點出客人要的片數。');
stage.append(el('div','label','每個披薩要平分成幾片？'));
const tabs=el('div','pizza-tabs'),pizzas=el('div','pizzas'),count=el('div','count','已選 0 片');let denominator=null;const selected=new Set();
function draw(){
pizzas.replaceChildren();const pieces=q.n>q.d?2:1;for(let p=0;p<pieces;p++){let s=svg('svg',{class:'pizza',viewBox:'0 0 260 260',role:'group','aria-label':'第 '+(p+1)+' 個披薩，分成 '+denominator+' 等份'});
s.append(svg('circle',{cx:130,cy:130,r:114,fill:'#d18d4c',stroke:'#ad672b','stroke-width':4}));
for(let i=0;i<denominator;i++){let start=-Math.PI/2+i*2*Math.PI/denominator,end=-Math.PI/2+(i+1)*2*Math.PI/denominator;let x1=130+106*Math.cos(start),y1=130+106*Math.sin(start),x2=130+106*Math.cos(end),y2=130+106*Math.sin(end);
let id=p*denominator+i;
let path=svg('path',{d:'M 130 130 L '+x1+' '+y1+' A 106 106 0 0 1 '+x2+' '+y2+' Z',fill:'#ffe3a1',tabindex:0,role:'button','aria-label':'第 '+(p+1)+' 個披薩第 '+(i+1)+' 片','aria-pressed':'false'});
let toggle=()=>{if(solved)return;if(selected.has(id)){selected.delete(id);path.setAttribute('aria-pressed','false');path.setAttribute('fill','#ffe3a1')}else{selected.add(id);path.setAttribute('aria-pressed','true');path.setAttribute('fill','#f09b46')}count.textContent='已選 '+selected.size+' 片｜每片 '+1+'／'+denominator;};
path.addEventListener('click',toggle);path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});s.append(path);}
pizzas.append(s)}
count.textContent='已選 0 片｜每片 1／'+denominator;}
[2,3,4,6,8].forEach(d=>{let b=btn(d+' 等份','',()=>{if(solved)return;denominator=d;selected.clear();tabs.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw()});b.setAttribute('aria-pressed','false');tabs.append(b)});
stage.append(tabs,pizzas,count);
stage.append(btn('完成這份訂單','primary',()=>{if(!denominator)return warn('先選一個切法，把每個披薩平分成一樣大的小片。');if(denominator!==q.d)return warn('看看訂單的分母，每個披薩要平分成 '+q.d+' 片。');if(selected.size!==q.n)return warn('目前選了 '+selected.size+' 片，客人需要 '+q.n+' 片。');const mixed=q.n>q.d?'，也就是 1 又 '+(q.n-q.d)+'／'+q.d+' 個披薩':'';done('訂單完成！你端出了 '+q.n+'／'+q.d+' 個披薩'+mixed+'。')}));
}
function renderComplete(){
stage.replaceChildren();const title=el('h2','','這一輪完成了！'),scoreBox=el('div','big-score');scoreBox.innerHTML='<b>'+score+'／'+config.count+'</b>題完成';stage.append(title,scoreBox,el('p','hint','想再練習，可以按「再玩一次」。'),btn('再玩一次','primary',()=>{index=0;score=0;render()}));say('所有題目都完成了。','good');$('round-number').textContent='完成';$('score').textContent=score+' 題';$('fill').style.width='100%';next.hidden=true;
}
function render(){
if(index>=config.count){renderComplete();return}
solved=false;next.hidden=false;next.disabled=true;next.textContent='下一題 →';stage.replaceChildren();say('答對後就能進到下一題。');progress();
if(mode==='characters')renderCharacters(CN[index]);else if(mode==='kitchen')renderKitchen(KITCHEN[index]);else if(mode==='angles')renderAngles(ANGLES[index]);else if(mode==='pizza')renderPizza(PIZZA[index]);
}
next.addEventListener('click',()=>{if(!solved)return;index++;render()});
render();
})();