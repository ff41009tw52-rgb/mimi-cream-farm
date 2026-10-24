/* Additive V0.6 catalog. Stable old IDs, three foods, and retained legacy assets. */
(() => {
'use strict';
const D=window.AquariumData,base=D.SPECIES.platy;
const fishRows=[
 ['paradise','蓋斑鬥魚','Macropodus opercularis',240,4,'freshwater','protein','paradise','#58a9ba','#d27566'],
 ['ocellaris','公子小丑魚','Amphiprion ocellaris',150,5,'marine','general','clown','#ee9d47','#fff4d9'],
 ['maroon','透紅小丑魚','Amphiprion biaculeatus',220,5,'marine','general','maroon','#ac5157','#eddbc0'],
 ['blueDevil','藍魔鬼','Chrysiptera cyanea',120,5,'marine','small','damsel','#427ad2','#7ccce2'],
 ['chromis','青魔魚','Chromis viridis',130,5,'marine','small','chromis','#73cbbd','#b8ebd8'],
 ['firefish','雷達魚','Nemateleotris magnifica',190,5,'marine','small','dart','#f3e4c6','#cf6b66'],
 ['dottyback','紫草莓','Pictichromis porphyrea',210,5,'marine','protein','dotty','#a574bd','#d394d1'],
 ['banggai','班加伊天竺鯛','Pterapogon kauderni',260,6,'marine','small','banggai','#d1d8cf','#526b73'],
 ['pajama','睡衣天竺鯛','Sphaeramia nematoptera',250,6,'marine','small','pajama','#c9d597','#dfb59a'],
 ['watchman','黃守衛蝦虎','Cryptocentrus cinctus',230,6,'marine','small','goby','#e9cb65','#88bfc6'],
 ['sixline','六線龍','Pseudocheilinus hexataenia',340,7,'marine','protein','wrasse','#c18eb7','#e5ad65'],
 ['blueTang','藍倒吊','Paracanthurus hepatus',480,7,'marine','general','blueTang','#5787cc','#e8cf63'],
 ['yellowTang','黃三角倒吊','Zebrasoma flavescens',460,7,'marine','general','yellowTang','#ebcf58','#f7e9a2'],
 ['flame','火焰神仙','Centropyge loricula',560,8,'marine','general','flame','#e9924e','#638db1'],
 ['mandarin','五彩青蛙','Synchiropus splendidus',620,8,'marine','protein','mandarin','#62b4a7','#d9925e'],
 ['butterfly','人字蝶','Chaetodon auriga',680,9,'marine','protein','butterfly','#eee0b8','#e2c65c']
];
const species=Object.fromEntries(fishRows.map(([id,name,scientific,price,unlockLevel,habitat,food,form,color,tail])=>[id,Object.freeze({...base,name,nickname:name,size:['yellowTang','butterfly','blueTang'].includes(id)?108:id==='watchman'?90:88,speed:['watchman','mandarin'].includes(id)?.027:id==='chromis'?.068:.045,depth:id==='watchman'||id==='mandarin'?[.72,.9]:[.23,.69],bottomDweller:['watchman','mandarin'].includes(id),foodPreference:['watchman','mandarin'].includes(id)?'bottom':'any',schoolingStrength:['chromis','banggai','pajama'].includes(id)?.38:0,pauseChance:.28,habitat,food,form,shape:form,color,tail,price,unlockLevel,growthTime:1000+(unlockLevel-3)*110,coinInterval:58,values:[2,5,10],depthName:['watchman','mandarin'].includes(id)?'中下層與底層':'中層',desc:{paradise:'藍綠與橘紅直條紋，搭配延長的尾鰭與鰭緣。',clown:'橘色身體上的三條白帶，像穿著可愛的小背心。',maroon:'深紅的圓潤魚身，白色細帶與長長的胸鰭。',damsel:'寶藍色小身體，背鰭與尾鰭有明亮藍光。',chromis:'青綠色閃亮鱗片，尾鰭分成清楚的兩叉。',dart:'前白後紅的細長身體，第一背鰭像小旗子。',dotty:'紫色細長身體，小口與圓尾鰭清楚可見。',banggai:'銀色身體、三道深色帶，以及細長尖鰭。',pajama:'前半黃綠，後半散布暖色圓點，像穿著睡衣。',goby:'金黃身體帶著細點，大頭低低地探索底砂。',wrasse:'藍紫與金橘細線，沿著身體向後延伸。',blueTang:'藍色側扁身體有深色調色盤紋，尾巴亮黃。',yellowTang:'明亮的黃色側扁身體，搭配高背鰭與小尖嘴。',flame:'橘紅魚身上有深色直紋，魚鰭帶藍色邊緣。',mandarin:'藍綠與橘色曲線交織，大胸鰭像兩把小扇。',butterfly:'奶油白身體有斜線、深色眼帶，尾側明黃。'}[form],knowledge:{scientific,habitat:habitat==='marine'?'海水珊瑚礁或鄰近海域；這裡以簡化水景呈現。':'東亞的淡水緩流水域。',body:'觀察體色、花紋、尾鰭與背鰭輪廓，找出牠和其他魚的差別。',diet:'真實食性因種類而異；遊戲以三種飼料簡化，請以資料卡的食物提示餵食。',habit:['watchman','mandarin'].includes(id)?'常在底層附近探索與覓食。':'以身體及尾鰭擺動前進，胸鰭協助轉向及保持平衡。',care:habitat==='marine'?'真實海水飼養需要專業設備與適合的食物；本遊戲的自由共缸展示不代表真實混養建議。':'有輔助呼吸的迷鰓器官；遊戲不模擬領域衝突。',sourceURL:'https://www.fishbase.se/summary/'+scientific.replaceAll(' ','-')+'.html'}})]));
const rows=[
 ['foxtail','狐尾藻',45,'plant','plants','freshwater',.3,'#75a67a'],['roundleaf','圓葉水草',55,'plant','plants','freshwater',.23,'#6fa883'],['lilypad','睡蓮葉',85,'plant','plants','freshwater',.12,'#85ae79'],['mossrock','綠苔石',80,'ground','nature','freshwater',.16,'#8ba18b'],['shrimphouse','迷你蝦屋',100,'ground','special','freshwater',.14,'#b59b78'],['rootarch','樹根拱門',150,'ground','nature','freshwater',.25,'#a58561'],['slatetunnel','石板隧道',180,'ground','nature','freshwater',.2,'#8d9a9b'],['mushroom','蘑菇小屋',240,'ground','special','freshwater',.24,'#cd9d87'],
 ['shellpile','貝殼堆',50,'ground','nature','marine',.12,'#e6cbb4'],['starfish','海星擺飾',75,'ground','special','marine',.12,'#dba68b'],['seafan','海扇',110,'plant','plants','marine',.32,'#c093b5'],['staghorn','鹿角珊瑚',140,'ground','nature','marine',.26,'#a5c6c1'],['braincoral','腦珊瑚',160,'ground','nature','marine',.17,'#aac09c'],['anemone','海葵',190,'plant','plants','marine',.2,'#d5b5cb'],['reefcave','礁岩洞穴',210,'ground','nature','marine',.25,'#b6bba5'],['coraltower','彩色珊瑚塔',300,'ground','special','marine',.32,'#bdadc8']
];
const decor=Object.fromEntries(rows.map(([id,name,price,kind,category,habitat,height,color])=>[id,Object.freeze({name,price,kind,category,habitat,height,color,ratio:height>.2?1.2:.75,unlockLevel:habitat==='marine'?5:1,tags:kind==='plant'?['plant']:['rock','shelter'],footprint:.12,anchor:.7,desc:'帶有柔和光影與細緻紋路，可在布置模式自由移動、換色與調整大小。'})]));
const additions=[['designMove','小小設計師','第一次移動布置。','designMove',1,30],['designColor','色彩魔法師','第一次替布置換色。','designColor',1,35],['threeColors','七彩水族箱','同一缸使用三種不同裝飾配色。','threeColors',3,60],['tenDecor','布置達人','同一缸擺放十件裝飾。','designCount',10,100],['marineDesign','海底設計家','海水缸擺放五種不同海水布置。','marineDecor',5,120]].map(([id,name,desc,metric,goal,coins])=>Object.freeze({id,name,desc,metric,goal,reward:{coins}}));
window.AquariumData=Object.freeze({...D,CONFIG:Object.freeze({...D.CONFIG,MAX_DECOR:25}),TANK_TIERS:Object.freeze(D.TANK_TIERS.map(t=>Object.freeze({...t,decorCapacity:t.tier===4?25:t.decorCapacity}))),SPECIES:Object.freeze({...D.SPECIES,...species}),DECORATIONS:Object.freeze({...D.DECORATIONS,...decor}),ACHIEVEMENTS:Object.freeze([...D.ACHIEVEMENTS,...additions]),NEW_ACHIEVEMENT_IDS:Object.freeze([...D.NEW_ACHIEVEMENT_IDS,...additions.map(a=>a.id)]),DESIGN_ACHIEVEMENT_IDS:Object.freeze(additions.map(a=>a.id)),MARINE_OFFERS:Object.freeze([{number:1,level:5,price:800},{number:2,level:7,price:1600},{number:3,level:9,price:2600}])});
})();
