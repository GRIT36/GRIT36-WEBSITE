// Dedicated geography bank: no generated questions or word-image search fallbacks.
let geoBank=null,geoPhotos={},geoLoading=false,geoRound=null,geoBoardObserver=null;
const GEO_TITLE="🌍 Meander - Verschillen in landschap";
const GEO_TYPES={single:"Eén antwoord",multi:"Meerdere antwoorden",match:"Verbinden"};
function validateGeoBank(bank){
 if(bank.owner!=="Felix"||!Array.isArray(bank.questions))throw Error("Invalid geography bank");
 const ids=new Set();
 for(const q of bank.questions){
  if(!q.id||ids.has(q.id)||!q.text||!GEO_TYPES[q.type])throw Error("Invalid question");ids.add(q.id);
  if(q.type==="match"){if(!Array.isArray(q.pairs)||q.pairs.length!==3||q.pairs.some(p=>p.length!==2||p.some(s=>typeof s!=="string")))throw Error("Invalid pairs")}
  else if(q.options?.length!==4||!Array.isArray(q.answer)||!q.answer.length||new Set(q.answer).size!==q.answer.length||q.answer.some(i=>!Number.isInteger(i)||i<0||i>3)||q.type==="single"&&q.answer.length!==1)throw Error("Invalid answers");
 }
 for(const [type,count] of [["single",5],["multi",3],["match",2]])if(bank.questions.filter(q=>q.type===type).length<count)throw Error("Not enough questions");
 return bank
}
function geoBuildTest(){
 const choose=(type,n)=>{
  const pool=geoBank.questions.filter(q=>q.type===type),land=mathShuffle(pool.filter(q=>q.topic==="landscape")),topo=mathShuffle(pool.filter(q=>q.topic==="topography"));
  const landCount=Math.random()<.5?Math.floor(n/2):Math.ceil(n/2);
  const chosen=[...land.slice(0,landCount),...topo.slice(0,n-landCount)];
  if(chosen.length<n)chosen.push(...mathShuffle(pool.filter(q=>!chosen.includes(q))).slice(0,n-chosen.length));
  return mathShuffle(chosen)
 };
 return [...choose("single",5),...choose("multi",3),...choose("match",2)].map(q=>({...q,optionOrder:q.options?mathShuffle(q.options.map((_,i)=>i)):[],leftOrder:q.pairs?mathShuffle(q.pairs.map((_,i)=>i)):[],rightOrder:q.pairs?mathShuffle(q.pairs.map((_,i)=>i)):[]}))
}
function requestGeoStudy(){state.pendingMode="geography";state.pendingLearner=state.session?.learner||"Felix";state.modal="learner";render()}
async function confirmGeoStudy(learner){
 if(geoLoading)return;geoLoading=true;
 try{
  if(!geoBank){
   const responses=await Promise.all([fetch("assets/meander-felix.json",{cache:"no-cache"}),fetch("assets/meander-photos.json",{cache:"no-cache"})]);
   if(responses.some(r=>!r.ok))throw Error("Geography files unavailable");
   const [bank,photos]=await Promise.all(responses.map(r=>r.json()));validateGeoBank(bank);
   if(bank.questions.some(q=>!photos[q.image]))throw Error("Missing photo metadata");geoPhotos=photos;geoBank=bank;
  }
  stopSound();stopStudyMusic();clearCelebration();historyIndex=null;questionHistory=[];
  geoRound={index:0,questions:geoBuildTest(),results:[],selected:[],links:{},activeLeft:null};
  state.modal=null;state.view="geography";state.mode="geography";state.session={total:10,correct:0,review:[],finished:false,answered:false,learner};
  beginLearningRecord(learner,{id:"geo:Felix:meander-landschap",name:GEO_TITLE},"mc");startStudyMusic();
 }catch(error){console.warn(error);state.modal=null;alert("De aardrijkskundevragen konden niet worden geladen. Probeer opnieuw.")}
 finally{geoLoading=false;render()}
}
function geoAnswerText(q){return q.type==="match"?q.pairs.map(p=>p.join(" → ")).join("; "):q.answer.map(i=>q.options[i]).join("; ")}
function geoSelectionText(q){return q.type==="match"?q.pairs.map((p,i)=>p[0]+" → "+(q.pairs[geoRound.links[i]]?.[1]||"—")).join("; "):geoRound.selected.map(i=>q.options[i]).join("; ")}
function geoReady(){const q=geoRound.questions[geoRound.index];return q.type==="match"?Object.keys(geoRound.links).length===q.pairs.length:geoRound.selected.length>0}
function geoIsCorrect(q,selected,links){return q.type==="match"?q.pairs.every((_,i)=>links[i]===i):selected.length===q.answer.length&&q.answer.every(i=>selected.includes(i))}
function geoPhoto(q){const p=geoPhotos[q.image];return `<figure class="geo-photo"><img src="${esc(p.src)}" alt="${esc(p.label)}" width="640" height="240"><figcaption><details><summary>Foto en bron</summary>${esc(p.label)} · ${esc(p.author)} · <a href="${esc(p.source)}" target="_blank" rel="noopener">Wikimedia Commons</a> · <a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener">${esc(p.license)}</a>. ${esc(p.changes)}</details></figcaption></figure>`}
function geoFireworks(){return `<div class="celebration" aria-hidden="true"><i class="firework one"></i><i class="firework two"></i><i class="firework three"></i></div>`}
function geoHeader(){return `<div class="math-top learner-header"><div class="learner-header-left"><div class="learner-name">${learnerLabel(state.session.learner)}</div><button class="back" id="geoExit">‹ Afsluiten</button></div>${mathAudioControls()}</div>`}
function geoMatches(q){
 const r=geoRound,answered=state.session.answered;
 return `<div class="geo-match-board"><svg class="geo-lines" aria-hidden="true"></svg><div class="geo-match-column">${q.leftOrder.map((i,n)=>`<button type="button" class="geo-pair ${r.activeLeft===i?"chosen":""} ${answered?(r.links[i]===i?"right":"wrong"):""}" data-geo-left="${i}" aria-pressed="${r.activeLeft===i}" ${answered?"disabled":""}><span class="geo-pair-badge">${n+1}</span>${esc(q.pairs[i][0])}</button>`).join("")}</div><div class="geo-match-column">${q.rightOrder.map(i=>{const left=Object.keys(r.links).find(k=>r.links[k]===i);return `<button type="button" class="geo-pair ${left!==undefined?"linked":""}" data-geo-right="${i}" ${answered||r.activeLeft===null?"disabled":""}><span class="geo-pair-badge">${left===undefined?"·":q.leftOrder.indexOf(Number(left))+1}</span>${esc(q.pairs[i][1])}</button>`}).join("")}</div></div>${answered?"":`<button class="back geo-reset" id="geoReset">↻ Verbindingen wissen</button>`}`
}
function geoPage(){
 if(!geoRound)return home();if(state.session.finished)return geoSummary();
 const r=geoRound,q=r.questions[r.index],s=state.session,result=r.results[r.index];
 return `<div class="math-study geo-study">${geoHeader()}<h2>${GEO_TITLE}</h2><div class="geo-progress-label"><span>${GEO_TYPES[q.type]}</span><span>${r.index+1} / 10</span></div><progress class="math-progress" max="10" value="${r.results.length}" aria-label="Voortgang"></progress><div class="geo-stage">${geoPhoto(q)}${result?`<div class="feedback-overlay"><img class="feedback-gif" src="assets/${result.ok?"feedback-correct.gif":"feedback-wrong.gif"}" alt="${result.ok?"Goed gedaan":"Nog oefenen"}"></div>`:""}</div><form id="geoForm" novalidate><h3 class="geo-question">${esc(q.text)}</h3><p class="hint">${q.type==="single"?"Kies één antwoord en klik op Bevestigen.":q.type==="multi"?"Kies alle juiste antwoorden en klik op Bevestigen.":"Tik links en daarna rechts om te verbinden. Je kunt een verbinding wijzigen. Bevestig als alle drie kloppen."}</p>${q.type==="match"?geoMatches(q):`<div class="geo-options" role="group" aria-label="Antwoorden">${q.optionOrder.map((i,n)=>`<button type="button" class="geo-option option-${["blue","orange","green","yellow"][n]} ${result?(q.answer.includes(i)?"right":"wrong"):r.selected.includes(i)?"chosen":""}" data-geo-option="${i}" aria-pressed="${r.selected.includes(i)}" ${result?"disabled":""}><span aria-hidden="true">${r.selected.includes(i)?"✓":q.type==="multi"?"☐":"○"}</span>${esc(q.options[i])}</button>`).join("")}</div>`}<p id="geoValidation" role="alert"></p>${result?`<div class="math-feedback ${result.ok?"good":"wrong"}" role="status"><strong>${result.ok?"✅ Goed zo!":"Nog niet goed."}</strong>${!result.ok?`<p>Jouw antwoord: ${esc(result.input)}</p>`:""}<p>Goed: ${esc(geoAnswerText(q))}</p><p>${esc(q.explanation)}</p></div><button type="button" class="btn primary" id="geoNext">${r.index===9?"Bekijk resultaat":"Volgende →"}</button>`:`<button type="submit" class="btn primary" id="geoConfirm" ${geoReady()?"":"disabled"}>Bevestigen</button>`}</form>${result?.ok?geoFireworks():""}</div>`
}
function geoSubmit(event){
 event.preventDefault();if(!geoRound||state.session.finished||state.session.answered||!geoReady())return;
 const q=geoRound.questions[geoRound.index],ok=geoIsCorrect(q,geoRound.selected,geoRound.links),input=geoSelectionText(q);
 updateLearningClock();geoRound.results.push({id:q.id,type:q.type,text:q.text,input,answer:geoAnswerText(q),ok});state.session.answered=true;state.session.feedbackAt=performance.now();
 if(ok)state.session.correct++;else state.session.review.push({term:q.text,definition:`Jouw antwoord: ${input}; goed: ${geoAnswerText(q)}`});
 playSound(ok?"correct":"wrong",ok?.7:.55);render();showAnswerRibbon(ok);checkpointLearning();document.getElementById("geoNext")?.focus({preventScroll:true});
 clearCelebration();if(ok)celebrationTimer=setTimeout(geoNext,3000)
}
function geoNext(){
 if(!geoRound||!state.session.answered||state.session.finished)return;
 clearCelebration();stopSound();updateLearningClock();
 if(geoRound.index===9){state.session.finished=true;stopStudyMusic();state.session.recordDuration=learningSnapshot().duration_seconds;finalizeLearningRecord(true);startStudyMusic()}
 else{geoRound.index++;geoRound.selected=[];geoRound.links={};geoRound.activeLeft=null;state.session.answered=false}
 render()
}
function geoSummary(){const r=geoRound,s=state.session;return `<div class="summary-radiance" aria-hidden="true"></div><div class="math-study summary math-summary geo-study">${geoHeader()}<div class="summary-finale"><div class="summary-fireworks" aria-hidden="true"><i class="firework finale-left"></i><i class="firework finale-top"></i><i class="firework finale-right"></i></div><h2>🎉 Klaar!</h2></div><h2>${GEO_TITLE}</h2><p class="math-score">${s.correct} / 10 goed · ${s.correct*10}%</p><p class="hint">Elke vraag telt voor 1 punt. Bij meerkeuze en verbinden moet alles kloppen.</p>${recordSaveStatus()}<div class="geo-results-by-type">${Object.entries(GEO_TYPES).map(([type,label])=>{const rows=r.results.filter(x=>x.type===type);return `<div>${label}<strong>${rows.filter(x=>x.ok).length} / ${rows.length}</strong></div>`}).join("")}</div><h3>Terugkijken</h3>${r.results.map(result=>`<details class="geo-result"><summary>${result.ok?"✅":"🔴"} ${esc(result.text)}</summary><p>Jouw antwoord: ${esc(result.input)}</p><p>Goed: ${esc(result.answer)}</p></details>`).join("")}<p class="hint">${esc(geoBank.note)}</p><button class="btn" id="geoHome">Terug naar Felix</button> <button class="btn primary" id="geoAgain">Nog een keer</button></div>`}
function geoLeave(){finalizeLearningRecord();clearCelebration();stopSound();stopStudyMusic();geoRound=null;state.session=null;state.mode=null;state.view="home";state.filter="Oudste";render()}
function geoDrawLines(){
 const board=document.querySelector('.geo-match-board');if(!board||!geoRound)return;
 const svg=board.querySelector('svg'),box=board.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
 svg.innerHTML=Object.entries(geoRound.links).map(([left,right])=>{const a=board.querySelector(`[data-geo-left="${left}"]`).getBoundingClientRect(),b=board.querySelector(`[data-geo-right="${right}"]`).getBoundingClientRect();return `<line x1="${a.right-box.left}" y1="${a.top+a.height/2-box.top}" x2="${b.left-box.left}" y2="${b.top+b.height/2-box.top}" stroke="${state.session.answered?(Number(left)===right?"#74dfa0":"#ff9393"):"#d9b0ff"}" stroke-width="3"/>`}).join('')
}
function geoHandlers(){
 geoBoardObserver?.disconnect();
 document.getElementById('openGeo')?.addEventListener('click',requestGeoStudy);
 document.getElementById('geoExit')?.addEventListener('click',()=>{if(state.session.finished||confirm("Stoppen met deze ronde? Je resultaat tot nu toe wordt bewaard."))geoLeave()});
 document.getElementById('geoHome')?.addEventListener('click',geoLeave);
 document.getElementById('geoAgain')?.addEventListener('click',requestGeoStudy);
 document.getElementById('geoForm')?.addEventListener('submit',geoSubmit);
 document.getElementById('geoNext')?.addEventListener('click',geoNext);
 document.querySelectorAll('[data-geo-option]').forEach(button=>button.onclick=()=>{if(state.session.answered)return;const i=Number(button.dataset.geoOption),q=geoRound.questions[geoRound.index];geoRound.selected=q.type==="single"?[i]:geoRound.selected.includes(i)?geoRound.selected.filter(x=>x!==i):[...geoRound.selected,i];render()});
 document.querySelectorAll('[data-geo-left]').forEach(button=>button.onclick=()=>{if(state.session.answered)return;geoRound.activeLeft=Number(button.dataset.geoLeft);render()});
 document.querySelectorAll('[data-geo-right]').forEach(button=>button.onclick=()=>{if(state.session.answered||geoRound.activeLeft===null)return;const right=Number(button.dataset.geoRight);for(const left of Object.keys(geoRound.links))if(geoRound.links[left]===right)delete geoRound.links[left];geoRound.links[geoRound.activeLeft]=right;geoRound.activeLeft=null;render()});
 document.getElementById('geoReset')?.addEventListener('click',()=>{geoRound.links={};geoRound.activeLeft=null;render()});
 const board=document.querySelector('.geo-match-board');if(board){geoBoardObserver=new ResizeObserver(geoDrawLines);geoBoardObserver.observe(board);geoDrawLines()}
 document.querySelectorAll('.geo-photo img').forEach(img=>img.onerror=()=>{img.hidden=true;img.closest('figure').classList.add('photo-unavailable')})
}
document.addEventListener("keydown",event=>{
 if(event.key!=="Enter"||event.repeat||event.defaultPrevented||event.isComposing||event.ctrlKey||event.altKey||event.metaKey)return;
 if(state.view!=="geography"||!geoRound||state.session?.answered||state.session?.finished||state.modal)return;
 const q=geoRound.questions[geoRound.index];
 if(q.type==="match"||!geoReady())return;
 if(event.target?.closest?.('input,textarea,select,[contenteditable="true"],[role="dialog"]'))return;
 event.preventDefault();geoSubmit(event)
},true);
