(() => {
'use strict';
const toggle=document.getElementById('subject-switcher-toggle');
const panel=document.getElementById('subject-switcher-panel');
const wrapper=document.getElementById('subject-switcher');
if(!toggle||!panel||!wrapper)return;
function setOpen(open){
panel.hidden=!open;
toggle.setAttribute('aria-expanded',String(open));
toggle.querySelector('[data-arrow]').textContent=open?'◂':'▸';
}
toggle.addEventListener('click',()=>setOpen(panel.hidden));
document.addEventListener('click',e=>{if(!wrapper.contains(e.target))setOpen(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){setOpen(false);toggle.focus()}});
setOpen(false);
})();
