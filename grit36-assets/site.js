const toggle=document.querySelector('.menu-toggle');
const nav=document.getElementById('navigation');
function closeMenu(){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false')}
toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open))});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();toggle.focus()}});
document.addEventListener('click',e=>{if(!e.target.closest('.header'))closeMenu()});
window.matchMedia('(min-width:701px)').addEventListener('change',closeMenu);
document.getElementById('year').textContent=new Date().getFullYear();
