/* One optional reading component for shop, collection, residents and observation. */
(() => {
'use strict';
const D=window.AquariumData;
function node(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
function identity(root,id){const s=D.SPECIES[id];const h=node('div',null,'species-identity');h.append(node('p',s.name,'species-name'),node('p',s.knowledge.scientific,'species-scientific'));root.append(h);}
function highlights(root,id){const k=D.SPECIES[id].knowledge,box=node('div',null,'species-highlights');for(const [title,value]of [['外形線索',k.body],['小發現',k.fun]]){const part=node('section');part.append(node('h3',title),node('p',value));box.append(part);}root.append(box);}
function append(root,id,{collapsible=false}={}){
 const s=D.SPECIES[id],k=s?.knowledge;if(!k)return;
 const box=node(collapsible?'details':'section',null,'fish-knowledge species-guide');box.dataset.speciesGuide=id;
 if(collapsible)box.append(node('summary','認識'+s.name));
 identity(box,id);const grid=node('div',null,'species-facts');
 for(const [title,value]of [['🌿 住在哪裡',k.habitat],['🔎 外形線索',k.body],['🍽 吃什麼',k.diet],['🌊 怎麼活動',k.habit],['💡 小發現',k.fun]]){const part=node('section',null,title.includes('小發現')?'species-fun':'');part.append(node('h4',title),node('p',value));grid.append(part);}box.append(grid);
 const care=node('div',null,'species-care');care.append(node('h4','真實飼養與遊戲'),node('p',k.care),node('p','遊戲把食物分成三類，並簡化照顧與共同展示；飼料分類、自由混養和成長速度都不是實際飼養建議。','species-game-note'));box.append(care);
 const refs=node('div',null,'species-sources');refs.append(node('span','資料來源：'));for(const source of k.sources){const a=node('a',source.label);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';refs.append(a);}box.append(refs);root.append(box);return box;
}
window.AquariumSpeciesGuide=Object.freeze({append,identity,highlights});
})();
