/* Schema 4 adapter: reuse the proven legacy validator, without mutating its input. */
(() => {
'use strict';
const legacy=window.AquariumSave,CONFIG=window.AquariumData.CONFIG;
const defaultName='我的小水族箱';
function tankName(value){const name=typeof value==='string'?value.trim():'';if(!name)return defaultName;if([...name].length>10||!/^([\p{L}\p{N} _·-])+$/u.test(name))throw Error('水族箱名稱最多 10 個字，請使用中文、英文或數字。');return name;}
function validate(raw){
 if(!raw||![1,2,3,4].includes(raw.schemaVersion))throw Error('這份存檔版本目前無法讀取。');
 const modern=raw.schemaVersion===4;
 let adapted=raw;
 if(modern){
  if(typeof raw.tankName!=='string'||!raw.tankName.trim()||tankName(raw.tankName)!==raw.tankName)throw Error('水族箱名稱資料不完整。');
  const o=raw.onboarding;
  if(!o||!Number.isInteger(o.step)||o.step<0||o.step>4||['completed','skipped','welcomed','paused','coinHintShown'].some(k=>typeof o[k]!=='boolean')||o.completed!==(o.step===4)||(o.skipped&&!o.completed))throw Error('新手教學資料不完整。');
  if(typeof raw.stats?.careSeconds!=='number'||!Number.isFinite(raw.stats.careSeconds)||raw.stats.careSeconds<0||raw.stats.careSeconds>1e9)throw Error('照顧紀錄不完整。');
  adapted={...raw,schemaVersion:3,waterQuality:100,cleanReadyAt:0,stats:{...raw.stats,goodWaterSeconds:raw.stats.careSeconds},onboarding:{completed:true,skipped:false,step:3}};
 }
 const old=legacy.validate(adapted),{waterQuality,cleanReadyAt,...s}=old;
 const {goodWaterSeconds,...stats}=s.stats;
 return {...s,schemaVersion:4,gameVersion:CONFIG.GAME_VERSION,tankName:modern?raw.tankName:defaultName,stats:{...stats,careSeconds:goodWaterSeconds},onboarding:modern?{step:raw.onboarding.step,completed:raw.onboarding.completed,skipped:raw.onboarding.skipped,welcomed:raw.onboarding.welcomed,paused:raw.onboarding.paused,coinHintShown:raw.onboarding.coinHintShown}:{step:4,completed:true,skipped:false,welcomed:true,paused:false,coinHintShown:false}};
}
window.AquariumSave=Object.freeze({...legacy,validate,tankName,defaultName});
})();
