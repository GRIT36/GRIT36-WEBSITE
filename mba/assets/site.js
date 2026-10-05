/* GRIT36 MBA 1.1: local search, filters and original-page readers. */
(() => {
'use strict';
const nav=document.querySelector('.main-nav'), menu=document.querySelector('.menu-button');
const closeMenu=()=>{nav?.classList.remove('open');menu?.setAttribute('aria-expanded','false');};
menu?.addEventListener('click',()=>menu.setAttribute('aria-expanded',String(nav.classList.toggle('open'))));
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('click',e=>{if(!e.target.closest('.header'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('open')){closeMenu();menu.focus();}});
window.matchMedia('(min-width:701px)').addEventListener('change',closeMenu);
const dialog=document.querySelector('#search-dialog'),input=document.querySelector('#search-input'),results=document.querySelector('#search-results'),status=document.querySelector('#search-status');
const normalize=v=>v.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const entries=(window.MBA_SEARCH||[]).map(item=>({...item,heading:normalize(item.title+' '+item.en),haystack:normalize(item.title+' '+item.en+' '+item.text)}));
const script=[...document.scripts].find(s=>/assets\/site\.js/.test(s.src));
const base=new URL('../',script.src);
const search=()=>{
 const q=normalize(input.value).slice(0,120),terms=q.split(/\s+/).filter(Boolean);
 const matches=q?entries.filter(item=>terms.every(term=>item.haystack.includes(term))).map(item=>({item,score:terms.reduce((score,term)=>score+(item.heading.includes(term)?8:1),0)+(item.type==='Study guide'?3:0)})).sort((a,b)=>b.score-a.score).map(x=>x.item):entries.filter(item=>item.type==='Study guide').slice(0,6);
 results.replaceChildren();status.textContent=q?`${matches.length} results${matches.length>60?' · Showing the first 60. Refine your search for more specific results.':''}`:'Start with a framework, or search the original lecture text.';
 if(!matches.length){const p=document.createElement('p');p.className='empty';p.textContent='No matching pages. Try a shorter term, such as forces, VRINO, canvas or renewal.';results.append(p);}
 matches.slice(0,60).forEach(item=>{const a=document.createElement('a');a.className='search-result';a.href=new URL(item.url,base).href;const title=document.createElement('strong');title.textContent=item.title;const sub=document.createElement('span');sub.textContent=`${item.type} · ${item.en}`;a.append(title,sub);results.append(a);});
};
document.querySelectorAll('[data-search]').forEach(b=>b.addEventListener('click',()=>{closeMenu();if(!dialog.open)dialog.showModal();search();input.focus();}));
document.querySelector('[data-close-search]')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
input?.addEventListener('input',search);
function filterCards(id,attribute,countId,label){const select=document.getElementById(id);select?.addEventListener('change',()=>{let count=0;document.querySelectorAll(`[${attribute}]`).forEach(card=>{const match=!select.value||card.getAttribute(attribute)===select.value;card.hidden=!match;if(match)count++;});document.getElementById(countId).textContent=`${count} ${label}`;});}
filterCards('topic-filter','data-topic-session','topic-count','frameworks & concepts');
filterCards('slide-filter','data-slide-session','slide-count','original pages');
const zoomDialog=document.querySelector('#zoom-dialog'),zoomImage=document.querySelector('#zoom-image');let zoom=100;
const applyZoom=()=>{zoomImage.style.width=`${zoom}%`;document.querySelector('#zoom-value').textContent=`${zoom}%`;document.querySelector('[data-zoom-out]').disabled=zoom<=100;document.querySelector('[data-zoom-in]').disabled=zoom>=400;};
document.querySelector('[data-open-zoom]')?.addEventListener('click',()=>{zoom=100;applyZoom();zoomDialog.showModal();});
document.querySelector('[data-close-zoom]')?.addEventListener('click',()=>zoomDialog.close());
document.querySelector('[data-zoom-in]')?.addEventListener('click',()=>{zoom=Math.min(400,zoom+50);applyZoom();});
document.querySelector('[data-zoom-out]')?.addEventListener('click',()=>{zoom=Math.max(100,zoom-50);applyZoom();});
})();
