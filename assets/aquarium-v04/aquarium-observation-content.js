/* Teacher-editable copy. No animation or game progression logic lives here. */
(() => {
'use strict';
const topics = {
 anatomy: {tab:'外形與構造', title:'魚的外形與身體構造', intro:'魚的身體有不同的部分。我們可以觀察頭、軀幹，以及長在身體不同位置的鰭。', question:'魚的身體有哪些構造？這些構造有什麼作用？', hint:'點選魚身上的部位或下方名稱，看看它的位置與作用。', review:'魚的身體有頭、軀幹和各種鰭。不同的構造能幫助魚在水中生活。'},
 swimming: {tab:'游動', title:'魚是怎麼游動的？', intro:'魚會擺動身體與尾部，並利用不同的鰭相互配合，在水中前進、轉彎和維持平衡。', question:'魚游動時，哪些部位會跟著擺動？', hint:'觀察側面的各種鰭，再從俯視圖看看身體和尾部如何左右擺動。', review:'魚會利用身體和鰭的動作幫助游動，也會利用鰭調整方向與維持平衡。'},
 breathing: {tab:'呼吸', title:'魚是怎麼呼吸的？', intro:'水中有溶解的氧氣。魚利用口和鰓蓋的開合，讓水流經鰓，從水中取得氧氣。', question:'魚在水中，怎麼獲得呼吸需要的氧氣？', hint:'觀察口和鰓蓋的開合，開啟「透視鰓蓋」看看水流經鰓的位置。', review:'魚利用鰓進行呼吸。水從口進入，流經鰓，再從鰓蓋後方的開口流出。'}
};
const parts = {
 head:{name:'頭', description:'位於魚身體的前端，可以看到口、眼睛和鰓蓋。'},
 trunk:{name:'軀幹', description:'位於頭部後方，是魚身體中間較粗大的部分。'},
 mouth:{name:'口', description:'魚可以用口攝取食物，呼吸時水也能從口進入。'},
 cover:{name:'鰓蓋', description:'覆蓋在鰓的外側，開合時能幫助水流經鰓。'},
 dorsal:{name:'背鰭', description:'位於魚的背部，可以幫助魚維持平衡。'},
 pectoral:{name:'胸鰭', description:'位於頭部後方的身體兩側，可以協助魚調整姿態與方向。'},
 pelvic:{name:'腹鰭', description:'位於身體腹側，可以協助魚維持平衡。'},
 anal:{name:'臀鰭', description:'位於身體後段的腹側，可以幫助魚維持穩定。'},
 caudal:{name:'尾鰭', description:'位於身體後方，擺動時能幫助魚向前游動。'},
 gills:{name:'鰓', description:'位於鰓蓋內側，是魚從水中取得氧氣、進行氣體交換的重要構造。'}
};
window.AquariumObservationContent=Object.freeze({topics,parts,
 title:'魚兒觀察與複習', schematic:'構造示意圖',
 specimenNote:'這是你養的魚兒，沿用遊戲中的魚種外形與配色。下方教材另使用代表性的硬骨魚示意圖。',
 diagramNote:'以代表性硬骨魚說明構造；不同魚種的外形、鰭形和游動方式會有差異。',
 breathingNote:'這是簡化的連續呼吸示意，放慢動作方便觀察；不同魚類不一定以相同節拍開合。',
 phases:['水從口進入','水流經鰓','水從鰓蓋後方流出'],
 phaseHints:['口張開，水從前方進入；鰓蓋後方的開口閉合。','水繼續流經鰓。開啟透視鰓蓋，可以觀察鰓的位置。','口閉合，鰓蓋後方的開口打開，讓水流出。'],
 swimHints:{all:'身體、尾部與各種鰭一起配合。',tail:'看尾部帶動尾鰭擺動，幫助魚向前游。',fins:'觀察背鰭、胸鰭、腹鰭和臀鰭，協助調整方向與維持平衡。',turn:'看身體彎曲與鰭的配合，魚的前進方向也跟著改變。'}
});
})();
