/* V0.6 quality: explicit habitat rules and species-specific, source-backed observations. */
(() => {
'use strict';
const D=window.AquariumData;
const freshPlants=new Set(['smallplant','tallplant','moss','crypt','anubias','amazon','riccia','rotala','foxtail','roundleaf','lilypad','mossrock']);
const freshwater=new Set([...freshPlants,'wood','branchwood','rootarch','shrimphouse']);
const marine=new Set(['shellpile','starfish','seafan','staghorn','braincoral','anemone','reefcave','coraltower']);
const playful=new Set(['ship','chest','urn','lighthouse','mushroom','starfish']);
const decor=Object.fromEntries(Object.entries(D.DECORATIONS).map(([id,d])=>[id,Object.freeze({...d,habitat:marine.has(id)?'marine':freshwater.has(id)?'freshwater':'both',playful:playful.has(id),tags:['rootarch'].includes(id)?['wood','shelter']:d.tags})]));
// Each row: a short identifying note and three observation targets. Only external form is highlighted.
const rows={
 paradise:['紅藍相間的條紋、鰓蓋斑點和延長的尾鰭，是觀察重點。牠用鰓呼吸，也能用鰓上方的迷鰓器官輔助吸取空氣中的氧；迷鰓藏在體內，不是外面的魚鰭。','體側的紅色與藍綠色條紋相間，鰓蓋後方還有深色斑點。','背鰭和臀鰭向後延伸；外形會因性別及成長而不同。','尾鰭分叉，上下端可能延長，和泰國鬥魚的扇形尾巴不同。','https://fishdb.sinica.edu.tw/taxon/381391-fishdb'],
 ocellaris:['常見橘色型公子小丑魚有三道白帶；真實幼魚、個體和人工品系可能不同，不能只靠遊戲配色辨認。','眼後、身體中段和尾柄各有一道白帶；白帶不是魚鰭。','背鰭沿著背部延伸，外緣常有深色邊。','尾鰭較圓，協助前進與轉向。','https://fishdb.sinica.edu.tw/chi/species.php?gen=Amphiprion&spe=ocellaris'],
 maroon:['深紅至紅褐魚身上有三道較窄的淺色帶；牠和公子小丑魚是不同物種。','三道細白帶跨過頭後、身體及尾柄，寬度和公子小丑魚不同。','背鰭連續，配合身體穩定游動。','鰓蓋旁有棘，是棘頰海葵魚的特色；遊戲沒有畫出所有細節。','https://fishesofaustralia.net.au/Home/species/378'],
 blueDevil:['藍魔鬼是小型雀鯛，鮮藍身體和藍色背鰭很醒目；尾巴顏色可能隨性別與地區而不同。','整個身體偏鮮藍，吻部附近可有深色線帶。','背鰭也呈藍色，前方的硬棘與後方軟條連在一起。','小胸鰭拍動，協助在礁石附近調整位置。','https://fishesofaustralia.net.au/home/species/334'],
 chromis:['青綠色魚身在光線下可能偏藍，尾鰭深深分叉，和藍魔鬼的輪廓不同。','身體是青綠至藍綠色；看到的顏色會受光線影響。','背鰭沿背部延伸，協助穩定方向。','尾鰭分成明顯兩叉，適合觀察魚尾輪廓。','https://fishesofaustralia.net.au/Home/species/329'],
 firefish:['雷達魚的第一背鰭細長高聳，像小旗子；這不是觸角，也不是真正的雷達。','身體前半偏白，後半逐漸變成紅色。','第一背鰭前方的鰭棘特別細長；後方還有第二背鰭。','尾鰭較圓，會配合其他魚鰭在水中保持位置。','https://fishesofaustralia.net.au/home/species/2943'],
 dottyback:['這裡的紫草莓以弗氏擬雀鯛呈現：紫色細長身體，眼旁有深色線。俗名可能因店家而不同，辨認時要看學名。','紫色魚身較細長，吻端到眼睛附近有深色線。','背鰭長而連續，從背部前方延伸到後方。','胸鰭細小，幫助牠在礁縫附近轉向、停留。','https://shop.thebiotagroup.com/products/fridmani-dottyback'],
 banggai:['銀白魚身上的三道深色直帶、白點和長長的鰭，是班加伊天竺鯛的特色。','三道深色直帶跨過眼睛、身體及尾柄附近。','第二背鰭的鰭條拉長，和第一背鰭形成高低不同的輪廓。','尾鰭分叉，鰭面可見小白點；遊戲簡化了細點。','https://www.georgiaaquarium.org/animal/banggai-cardinalfish/'],
 pajama:['睡衣天竺鯛的前後身體像穿著不同花色：前半偏黃綠，中間深色帶，後半有圓點。','後半身的紅褐小圓點和中段深帶，是很好的辨識線索。','背上有分開的兩個背鰭，前方較高。','大眼睛有助於在昏暗環境觀察；眼睛不是呼吸器官。','https://fishesofaustralia.net.au/home/species/4237'],
 watchman:['黃守衛蝦虎常靠近砂地與洞口活動，黃色型身上有細小藍點；也有偏灰的個體。','頭大、眼睛位置較高，身上可見藍色細點。','背上有前後分開的兩個背鰭。','兩片腹鰭相連成盤狀，能協助牠在底部保持位置；遊戲只簡化畫出。','https://australian.museum/learn/animals/fishes/yellow-shrimpgoby-cryptocentrus-cinctus/'],
 sixline:['六線龍是隆頭魚，不是龍。紫色體側的六條橘色縱線，從頭後沿身體延伸。','數一數身體側面的橘色細線；條紋沿頭尾方向延伸。','背鰭長而連續，幫助牠在礁石間穩定移動。','尾柄上方有小眼斑，不是真正的眼睛；真正眼睛在頭部。','https://fishesofaustralia.net.au/home/species/266'],
 blueTang:['藍倒吊身體側扁，藍色魚身有深色調色盤狀花紋，尾巴偏黃。尾柄的棘不是魚鰭。','從側面看身體較高，從正面看較薄，稱為側扁。','藍色背鰭沿背部延伸，和深色邊緣一起形成輪廓。','尾鰭前方的細窄部位叫尾柄，兩側有棘；圖中亮色僅提示大致位置。','https://fishdb.sinica.edu.tw/chi/species.php?gen=Paracanthurus&spe=hepatus'],
 yellowTang:['黃色側扁身體、高高的背鰭與突出的吻部，讓黃三角倒吊有醒目的輪廓。','小嘴位在突出的吻部，真實個體會啄食表面的藻。','背鰭較高，和臀鰭一起讓身體外形接近圓盤。','尾柄側面有棘，棘外的鞘偏白；不要把它看成白色魚鰭。','https://fishdb.sinica.edu.tw/eng/species.php?id=381294'],
 flame:['火焰神仙是小型海水神仙魚，和淡水神仙魚不同。橘紅色魚身、黑色直帶及藍色鰭緣很醒目。','橘紅魚身有深色直帶，不同地區個體的條紋可能不同。','背鰭和臀鰭的後段帶著藍色或藍紫色線條。','小胸鰭協助牠在珊瑚礁附近轉向。','https://australian.museum/learn/animals/fishes/flame-angelfish-centropyge-loriculus/'],
 mandarin:['五彩青蛙其實是魚，不是青蛙。鮮明曲線花紋和扇形胸鰭是牠的特色。','藍綠、橘色曲線交錯，花紋不是一片片獨立的魚鰭。','背上有前後分開的背鰭；第一背鰭外形會因性別不同。','胸鰭寬而像小扇子，常輕快拍動，協助牠貼近底部探索。','https://fishdb.sinica.edu.tw/chi/species.php?id=381504'],
 butterfly:['人字蝶是揚旛蝴蝶魚。側扁身體的斜線交會，眼睛附近有深色帶。','體側斜線分成兩個方向，形成接近人字的圖樣；眼部深色帶跨過真正的眼睛。','成魚背鰭後段可延長成細絲；遊戲以明顯輪廓呈現。','尾側偏黃，尾鰭靠後緣常有深色帶。','https://fishdb.sinica.edu.tw/chi/species.php?gen=Chaetodon&spe=auriga']
};
const observations={};const species={...D.SPECIES};
for(const [id,[note,body,dorsal,special,sourceURL]]of Object.entries(rows)){
 const specialPart=['paradise','ocellaris','chromis','firefish','banggai','butterfly'].includes(id)?'tail':['maroon'].includes(id)?'cheek':['blueTang','yellowTang'].includes(id)?'caudalSpine':id==='sixline'?'tailMark':id==='watchman'?'pelvic':['pajama'].includes(id)?'eyes':'pectoral';
 observations[id]=Object.freeze({note,sourceURL,parts:[{id:'body',name:'體色與外形',description:body},{id:'dorsal',name:id==='firefish'?'第一背鰭':'背鰭',description:dorsal},{id:specialPart,name:{maroon:'鰓蓋旁的棘',blueTang:'尾柄與棘',yellowTang:'尾柄與棘',sixline:'尾柄眼斑',pajama:'眼睛',watchman:'相連的腹鰭',paradise:'尾鰭',ocellaris:'尾鰭',chromis:'尾鰭',firefish:'尾鰭',banggai:'尾鰭',butterfly:'尾側與尾鰭'}[id]||'胸鰭',description:special},{id:'anal',name:'臀鰭',description:'位在腹部後方，協助穩定身體；和背鰭在身體的不同側。'},{id:'gills',name:id==='paradise'?'鰓與迷鰓':'鰓與鰓蓋',description:id==='paradise'?'鰓在水中交換氣體，鰓上方的迷鰓器官則能輔助利用空氣中的氧，兩者都藏在體內。':'鰓藏在鰓蓋裡，水流經鰓時進行氣體交換；圖上的亮色是位置示意。'}]});
 species[id]=Object.freeze({...species[id],knowledge:{...species[id].knowledge,body:note,sourceURL}});
}
window.AquariumData=Object.freeze({...D,DECORATIONS:Object.freeze(decor),SPECIES:Object.freeze(species),OBSERVATIONS:Object.freeze(observations)});
})();
