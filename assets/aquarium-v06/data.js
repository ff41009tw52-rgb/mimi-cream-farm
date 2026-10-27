/* V0.6 rules extend the retained V0.5 species and artwork unchanged. */
(() => {
'use strict';
const old=window.AquariumData;
const BASE_FEEDS=Object.freeze({general:Object.freeze({name:'綜合飼料',price:10,pack:10,level:1,color:'#b88143',species:['guppy','goldfish','molly','swordtail','platy']}),small:Object.freeze({name:'小型魚飼料',price:12,pack:10,level:1,color:'#60a99c',species:['cory','zebra','whitecloud','cardinal','harlequin','blackshrimp','blueshrimp','microcrab','pompomcrab']}),protein:Object.freeze({name:'高蛋白飼料',price:16,pack:10,level:4,color:'#ba7898',species:['angel','betta','honey','kuhli','bolivian']})});
const FEEDS=Object.freeze(Object.fromEntries(Object.entries(BASE_FEEDS).map(([id,f])=>[id,Object.freeze({...f,species:[...f.species,...Object.entries(old.SPECIES).filter(([,s])=>s.food===id).map(([key])=>key)]})])));
const FOOD_FOR=Object.freeze(Object.fromEntries(Object.entries(FEEDS).flatMap(([id,d])=>d.species.map(s=>[s,id]))));
const TANK_TIERS=Object.freeze([{tier:1,name:'小小水族箱',capacity:5,decorCapacity:12,price:0,level:1},{tier:2,name:'成長水族箱',capacity:7,decorCapacity:15,price:650,level:2},{tier:3,name:'悠悠水族箱',capacity:9,decorCapacity:18,price:2000,level:3},{tier:4,name:'豐富水族箱',capacity:10,decorCapacity:25,price:4000,level:4}]);
const TANK_OFFERS=Object.freeze([{number:2,level:4,price:4200},{number:3,level:5,price:8800}]);
const CONFIG=Object.freeze({...old.CONFIG,SAVE_KEY:old.CONFIG.TEST_MODE?'aquarium_game_save_v6_test':'aquarium_game_save_v6',MANUAL_KEY:old.CONFIG.TEST_MODE?'aquarium_game_save_v6_test_manual':'aquarium_game_save_v6_manual',V5_KEY:old.CONFIG.SAVE_KEY,V5_MANUAL_KEY:old.CONFIG.MANUAL_KEY,SCHEMA_VERSION:5,GAME_VERSION:'0.6',CAPACITY:5,MAX_TANKS:6,LEVEL_XP:[0,45,130,300,1100,1800,2800,4100,5700],EMERGENCY_COOLDOWN:600000});
window.AquariumV05Save=window.AquariumSave;
window.AquariumData=Object.freeze({...old,CONFIG,TANK_TIERS,FEEDS,FOOD_FOR,TANK_OFFERS});
})();
