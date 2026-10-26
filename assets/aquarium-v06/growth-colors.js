/* Presentation only. New basic IDs never replace achievement-unlocked variants.
 * Load before legacy validators capture the catalog. No economy or growth-time changes. */
(() => {
'use strict';
const D=window.AquariumData;
// Each tuple is body, fins, highlight. Pattern layers retain their own dark/light contrast.
const palettes={
 guppy:[['珊瑚彩尾','#d9bd80','#e77978','#fff0bc'],['藍寶彩尾','#71a9d2','#787ac0','#d9eff4']],
 goldfish:[['白金橘鰭','#e3d9bd','#e69a55','#fff9de'],['朱紅金光','#d87755','#b75f48','#ffe0a0']],
 cory:[['蜜色斑點','#d5b57c','#b28c59','#fff0c9'],['銀藍斑點','#a5bdc4','#6c99ac','#e7f4ee']],
 zebra:[['金線','#d9c48a','#d7a768','#fff2bc'],['藍銀','#93b2d5','#7d91bb','#e2eef7']],
 molly:[['珍珠銀','#c1ccc6','#94b5ac','#f4f1d9'],['暖金','#bf9c62','#967a54','#ead5a0']],
 swordtail:[['金橘長劍','#dcb35c','#ca8c44','#fff0b1'],['珊瑚紅劍','#d87e7e','#b95d76','#f8d2b4']],
 whitecloud:[['金雲紅尾','#d5be72','#d77962','#fff1b8'],['銀藍紅尾','#a3c8d8','#c67a87','#e4f5f2']],
 cardinal:[['青光紅帶','#68c8ba','#83b9aa','#ccf2d9'],['紫光紅帶','#9d9ad3','#ae9fc6','#e2d7f5']],
 angel:[['蜜金條紋','#d9c58b','#c69b62','#fff0c3'],['銀藍條紋','#afc7db','#849fbc','#edf4f6']],
 betta:[['珊瑚綢尾','#cf8484','#b76185','#f5ceba'],['青玉綢尾','#66b1ac','#678fba','#d1eee2']],
 platy:[['金橘扇尾','#dfb764','#c88c4e','#fff0b3'],['莓紅扇尾','#cc8a99','#aa6f90','#f8d7ca']],
 harlequin:[['玫銅黑楔','#cf9292','#bb777e','#f7d8c8'],['金銅黑楔','#d5b478','#bc8c56','#f8e4b7']],
 honey:[['杏橙細絲','#dc9b67','#c47d52','#ffe3ad'],['奶金細絲','#d9ca8f','#b29f5f','#fff4cc']],
 kuhli:[['蜜金環帶','#d8b573','#ae8b54','#f6e0ac'],['玫瑰環帶','#ca9d9a','#a97b81','#efd6c4']],
 bolivian:[['金砂紅鰭','#d8bd6e','#cb805d','#f5e3b0'],['銀青紅鰭','#a7c4b4','#be858b','#e8edcf']],
 paradise:[['青玉紅紋','#74bda9','#cf8c6c','#ddf2d3'],['靛藍紅紋','#778fca','#bd748d','#e0e3f4']],
 ocellaris:[['蜜橘白帶','#d7b35c','#e5c797','#fff7df'],['珊瑚白帶','#d78076','#e8afa0','#fff0db']],
 maroon:[['酒紅白帶','#854f68','#d9b8b6','#f4dcd5'],['暖紅白帶','#c76b53','#e6c69b','#ffe5c4']],
 blueDevil:[['青藍亮鰭','#4aa9bf','#83d3ce','#d2f1e3'],['靛紫亮鰭','#7c79c6','#aaa4dd','#e1e2fa']],
 chromis:[['銀藍雙尾','#8ebdd7','#c2dceb','#eaf7f2'],['青金雙尾','#a8c580','#d7e1a6','#f3f2c9']],
 firefish:[['雪白紫尾','#dcdff0','#a77db7','#f7f3ff'],['奶白橘尾','#f0e6b7','#dc965c','#fff7d9']],
 dottyback:[['紫羅蘭','#8573bf','#b898db','#e6d8f6'],['玫紫','#bd80ae','#dca6bd','#f8dfeb']],
 banggai:[['金銀黑帶','#d9ca9c','#9d8e75','#fff0c9'],['冰藍黑帶','#afccd9','#7496b3','#e9f5fb']],
 pajama:[['青玉斑點','#a9d0bd','#d9a88c','#e9f3d6'],['奶金斑點','#e3d39e','#ca90a3','#fff1cf']],
 watchman:[['金橘細點','#e2b074','#9abdb4','#ffe9b9'],['銀灰細點','#b0bdbb','#839da9','#e7e9d4']],
 sixline:[['暮紫金線','#9389bb','#dcad79','#eee0ed'],['珊瑚金線','#ce91a0','#e7bd82','#f8e4d2']],
 blueTang:[['靛藍金尾','#7275bd','#e3c67a','#dddaf3'],['海藍金尾','#519fb9','#e6c46b','#d6eff0']],
 yellowTang:[['蜜金亮鰭','#ddb15b','#f2d892','#fff0bb'],['檸檬亮鰭','#d3d573','#e8e7aa','#ffffd9']],
 flame:[['珊瑚藍鰭','#df867a','#7f95c6','#ffe1bf'],['金橘青鰭','#e5b15d','#73b2ad','#fff0c7']],
 mandarin:[['青藍橘紋','#699fc0','#e4b46f','#d9edf2'],['翡翠銅紋','#86ba83','#c9876c','#e5efcb']],
 butterfly:[['珍珠金尾','#d8e2d6','#c8ba7d','#fbf7df'],['奶金斜紋','#e5cc95','#d4aa66','#fff1cb']]
};
const variants={...D.VARIANTS};
for(const [species,rows]of Object.entries(palettes))rows.forEach(([name,color,tail,accent],i)=>{
 const id=species+'_basic_'+(i+1);
 if(Object.hasOwn(variants,id))throw Error('Duplicate basic palette ID: '+id);
 variants[id]=Object.freeze({species,name,color,tail,accent,basic:true,rule:Object.freeze({type:'basic'}),condition:'基本配色，可直接選購。'});
});
window.AquariumData=Object.freeze({...D,VARIANTS:Object.freeze(variants)});
// Target size is computed once. Runtime interpolation is visual only, never saved as growth.
const adultSizes=Object.freeze({microcrab:64,pompomcrab:72,blackshrimp:58,blueshrimp:60,firefish:100,cardinal:80,whitecloud:82});
function growthScale(g){g=Math.max(0,Math.min(100,g));return g>=100?1:g>=35?.78+.07*(g-35)/65:.60+.05*g/35;}
function size(species,growth){return (adultSizes[species]||D.SPECIES[species].size)*growthScale(growth);}
window.AquariumAppearance=Object.freeze({growthScale,size,adultSizes});
})();
