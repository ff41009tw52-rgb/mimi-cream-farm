/* Original carp asset, coordinates measured in its native 1536 × 1024 image. */
(() => {
'use strict';
const imageUrl=new URL('../aquarium-v042/carp-review.webp',document.currentScript?.src||location.href).href;
const regions={
 head:{path:'M65 557 Q190 465 326 416 Q407 502 400 604 Q360 674 230 650 Q95 629 65 580 Z',point:[210,535],label:[145,280]},
 trunk:{path:'M408 420 Q625 258 954 377 Q1140 471 1266 469 L1275 605 Q1060 705 580 727 L414 645 Q455 546 408 420 Z',point:[850,525],label:[875,910]},
 mouth:{path:'M60 558 Q84 561 112 584 L136 642 L113 656 L102 604 L61 590 Z',point:[85,582],label:[115,795]},
 cover:{path:'M317 423 Q396 461 404 535 Q410 608 364 646 Q307 674 238 647 Q351 619 355 530 Q355 468 317 423 Z',point:[365,551],label:[388,265]},
 dorsal:{path:'M590 310 Q671 188 742 174 Q854 283 960 310 Q1068 356 1115 437 Q846 321 590 310 Z',point:[792,284],label:[815,110]},
 pectoral:{path:'M394 635 Q484 648 549 689 Q572 735 546 810 Q449 777 395 716 Z',point:[472,717],label:[414,934]},
 pelvic:{path:'M680 714 Q776 714 830 746 Q875 787 855 851 Q756 809 680 714 Z',point:[788,784],label:[742,948]},
 anal:{path:'M984 685 Q1067 619 1147 629 L1166 775 Q1098 795 984 685 Z',point:[1102,711],label:[1110,922]},
 caudal:{path:'M1264 473 Q1376 321 1492 317 Q1531 327 1468 437 L1415 540 Q1490 616 1502 753 Q1408 780 1276 609 Z',point:[1380,540],label:[1394,237]}
};
function makeRenderer(host){
 const C=window.AquariumObservationContent;
 host.innerHTML=`<svg class="carp-anatomy" viewBox="0 65 1536 930" role="group" aria-label="鯉魚身體構造，點選標記認識部位"><image href="${window.AQUARIUM_BREATHING_IMAGE||imageUrl}" x="0" y="0" width="1536" height="1024"/>${Object.entries(regions).map(([id,r],i)=>`<g data-part="${id}" role="button" tabindex="0" aria-label="${C.parts[id].name}"><path class="carp-region" d="${r.path}"/><g class="carp-label"><path class="carp-leader" d="M${r.point.join(' ')} L${r.label.join(' ')}"/><rect x="${r.label[0]-83}" y="${r.label[1]-31}" width="166" height="62" rx="22"/><text x="${r.label[0]}" y="${r.label[1]+11}">${i+1} ${C.parts[id].name}</text></g><circle class="carp-point" cx="${r.point[0]}" cy="${r.point[1]}" r="19"/></g>`).join('')}</svg><p class="carp-current" aria-live="polite"></p>`;
 return {draw({partId,labels}){host.querySelectorAll('[data-part]').forEach(g=>{g.classList.toggle('selected',g.dataset.part===partId);g.setAttribute('aria-pressed',String(g.dataset.part===partId));});host.classList.toggle('hide-carp-labels',!labels);host.querySelector('.carp-current').textContent='正在觀察：'+C.parts[partId].name;}};
}
window.AquariumObservationRenderer=Object.freeze({makeRenderer,regions});
})();
