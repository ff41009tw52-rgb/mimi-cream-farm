'use strict';
window.fieldRecords=(()=>{const key='qingxi.earth.observations.v1';let temp=[];function read(){try{const data=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(data)?data.filter(x=>x&&typeof x.area==='string'):[]}catch(_){return temp}}
function add(area,node,action,condition,observation){const next=[...read(),{time:new Date().toISOString(),area,node,action,condition,observation}].slice(-1000);try{localStorage.setItem(key,JSON.stringify(next))}catch(_){temp=next}return next}return {read,add}})();
