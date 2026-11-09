// Naut question bank: fixed questions based only on Thema 9 supplied by the family.
let nautBank=null,nautRound=null,nautLoading=false,nautBoardObserver=null;
const NAUT_TITLE="🌿 Naut - Leven en overleven";
const NAUT_TYPES={single:"Eén antwoord",multi:"Meerdere antwoorden",match:"Verbinden"};
const NAUT_VISUALS={bescherming:["🦎","Bescherming en kleuren"],samenleven:["🦊","Manieren van leven"],dieren:["🦁","Dieren en overleven"],voortplanting:["🌼","Voortplanting"],begrippen:["🛡️","Begrippen"],bloem:["🌻","Bloemen"],default:["🌿","Leven en overleven"]};
function validateNautBank(bank){
 if(bank.owner!=="Felix"||!Array.isArray(bank.questions))throw Error("Invalid Naut bank");
 const ids=new Set();
 for(const q of bank.questions){
  if(!q.id||ids.has(q.id)||!q.text||!NAUT_TYPES[q.type])throw Error("Invalid Naut question");ids.add(q.id);
  if(q.type==="match"){if(!Array.isArray(q.pairs)||q.pairs.length!==3||q.pairs.some(p=>p.length!==2||p.some(s=>typeof s!=="string")))throw Error("Invalid Naut pairs")}
  else if(q.options?.length!==4||!Array.isArray(q.answer)||!q.answer.length||new Set(q.answer).size!==q.answer.length||q.answer.some(i=>!Number.isInteger(i)||i<0||i>3)||(q.type==="single"&&q.answer.length!==1))throw Error("Invalid Naut answers");
 }
 for(const [type,count] of [["single",10],["multi",6],["match",4]])if(bank.questions.filter(q=>q.type===type).length!==count)throw Error("Naut bank needs exactly "+count+" "+type+" questions");
 return bank;
}
function nautTotal(){return nautRound?.questions.length||20}
function nautBuildTest(){return mathShuffle(nautBank.questions).map(q=>({...q,optionOrder:q.options?mathShuffle(q.options.map((_,i)=>i)):[],leftOrder:q.pairs?mathShuffle(q.pairs.map((_,i)=>i)):[],rightOrder:q.pairs?mathShuffle(q.pairs.map((_,i)=>i)):[]}))}
function requestNautStudy(){state.pendingMode="science";state.pendingLearner=state.session?.learner||"Felix";state.modal="learner";render()}
async function confirmNautStudy(learner){
 if(nautLoading)return;nautLoading=true;
 try{
  if(!nautBank){const response=await fetch("assets/naut-felix.json",{cache:"no-cache"});if(!response.ok)throw Error("Naut file unavailable");nautBank=validateNautBank(await response.json())}
  stopSound();stopStudyMusic();clearCelebration();historyIndex=null;questionHistory=[];
  nautRound={index:0,questions:nautBuildTest(),results:[],selected:[],links:{},activeLeft:null};
  state.modal=null;state.view="science";state.mode="science";state.session={total:nautTotal(),correct:0,review:[],finished:false,answered:false,learner};
  beginLearningRecord(learner,{id:"science:Felix:naut-leven-en-overleven",name:NAUT_TITLE},"mc");startStudyMusic();
 }catch(error){console.warn(error);state.modal=null;alert("De Naut-vragen konden niet worden geladen. Probeer opnieuw.")}
 finally{nautLoading=false;render()}
}
function nautAnswerText(q){return q.type==="match"?q.pairs.map(p=>p.join(" → ")).join("; "):q.answer.map(i=>q.options[i]).join("; ")}
function nautSelectionText(q){return q.type==="match"?q.pairs.map((p,i)=>p[0]+" → "+(q.pairs[nautRound.links[i]]?.[1]||"—")).join("; "):nautRound.selected.map(i=>q.options[i]).join("; ")}
function nautReady(){const q=nautRound.questions[nautRound.index];return q.type==="match"?Object.keys(nautRound.links).length===q.pairs.length:nautRound.selected.length>0}
function nautIsCorrect(q){return q.type==="match"?q.pairs.every((_,i)=>nautRound.links[i]===i):nautRound.selected.length===q.answer.length&&q.answer.every(i=>nautRound.selected.includes(i))}
function nautVisual(q){const [icon,label]=NAUT_VISUALS[q.topic]||NAUT_VISUALS.default;return `<div class="naut-visual" aria-label="${esc(label)}"><span aria-hidden="true">${icon}</span><small>${esc(label)}</small></div>`}
function nautFireworks(){return `<div class="celebration" aria-hidden="true"><i class="firework one"></i><i class="firework two"></i><i class="firework three"></i></div>`}
function nautHeader(){return `<div class="math-top learner-header"><div class="learner-header-left"><div class="learner-name">${learnerLabel(state.session.learner)}</div><button class="back" id="nautExit">‹ Afsluiten</button></div>${mathAudioControls()}</div>`}
function nautMatches(q){
 const r=nautRound,answered=state.session.answered;
 return `<div class="geo-match-board naut-match-board"><svg class="geo-lines" aria-hidden="true"></svg><div class="geo-match-column">${q.leftOrder.map((i,n)=>`<button type="button" class="geo-pair ${r.activeLeft===i?"chosen":""} ${answered?(r.links[i]===i?"right":"wrong"):""}" data-naut-left="${i}" aria-pressed="${r.activeLeft===i}" ${answered?"disabled":""}><span class="geo-pair-badge">${n+1}</span>${esc(q.pairs[i][0])}</button>`).join("")}</div><div class="geo-match-column">${q.rightOrder.map(i=>{const left=Object.keys(r.links).find(k=>r.links[k]===i);return `<button type="button" class="geo-pair ${left!==undefined?"linked":""}" data-naut-right="${i}" ${answered||r.activeLeft===null?"disabled":""}><span class="geo-pair-badge">${left===undefined?"·":q.leftOrder.indexOf(Number(left))+1}</span>${esc(q.pairs[i][1])}</button>`}).join("")}</div></div>${answered?"":`<button class="back geo-reset" id="nautReset">↻ Verbindingen wissen</button>`}`
}
function nautPage(){
 if(!nautRound)return home();if(state.session.finished)return nautSummary();
 const r=nautRound,q=r.questions[r.index],s=state.session,result=r.results[r.index],total=nautTotal();
 return `<div class="math-study geo-study naut-study">${nautHeader()}<h2>${NAUT_TITLE}</h2><div class="geo-progress-label"><span>${NAUT_TYPES[q.type]}</span><span>${r.index+1} / ${total}</span></div><progress class="math-progress" max="${total}" value="${r.results.length}" aria-label="Voortgang"></progress><div class="geo-stage">${nautVisual(q)}${result?`<div class="feedback-overlay"><img class="feedback-gif" src="assets/${result.ok?"feedback-correct.gif":"feedback-wrong.gif"}" alt="${result.ok?"Goed gedaan":"Nog oefenen"}"></div>`:""}</div><form id="nautForm" novalidate><h3 class="geo-question">${esc(q.text)}</h3><p class="hint">${q.type==="single"?"Kies één antwoord en klik op Bevestigen.":q.type==="multi"?"Kies alle juiste antwoorden en klik op Bevestigen.":"Tik links en daarna rechts om te verbinden. Je kunt een verbinding wijzigen. Bevestig als alle drie kloppen."}</p>${q.type==="match"?nautMatches(q):`<div class="geo-options" role="group" aria-label="Antwoorden">${q.optionOrder.map((i,n)=>`<button type="button" class="geo-option option-${["blue","orange","green","yellow"][n]} ${result?(q.answer.includes(i)?"right":"wrong"):r.selected.includes(i)?"chosen":""}" data-naut-option="${i}" aria-pressed="${r.selected.includes(i)}" ${result?"disabled":""}><span aria-hidden="true">${r.selected.includes(i)?"✓":q.type==="multi"?"☐":"○"}</span>${esc(q.options[i])}</button>`).join("")}</div>`}<p id="nautValidation" role="alert"></p>${result?`<div class="math-feedback ${result.ok?"good":"wrong"}" role="status"><strong>${result.ok?"✅ Goed zo!":"Nog niet goed."}</strong>${!result.ok?`<p>Jouw antwoord: ${esc(result.input)}</p>`:""}<p>Goed: ${esc(nautAnswerText(q))}</p><p>${esc(q.explanation)}</p></div><button type="button" class="btn primary" id="nautNext">${r.index===total-1?"Bekijk resultaat":"Volgende →"}</button>`:`<button type="submit" class="btn primary" id="nautConfirm" ${nautReady()?"":"disabled"}>Bevestigen</button>`}</form>${result?.ok?nautFireworks():""}</div>`
}
function nautSubmit(event){
 event.preventDefault();if(!nautRound||state.session.finished||state.session.answered||!nautReady())return;
 const q=nautRound.questions[nautRound.index],ok=nautIsCorrect(q),input=nautSelectionText(q);
 updateLearningClock();nautRound.results.push({id:q.id,type:q.type,text:q.text,input,answer:nautAnswerText(q),ok});state.session.answered=true;state.session.feedbackAt=performance.now();
 if(ok)state.session.correct++;else state.session.review.push({term:q.text,definition:`Jouw antwoord: ${input}; goed: ${nautAnswerText(q)}`});
 playSound(ok?"correct":"wrong",ok?.7:.55);render();showAnswerRibbon(ok);checkpointLearning();document.getElementById("nautNext")?.focus({preventScroll:true});
 clearCelebration();if(ok)celebrationTimer=setTimeout(nautNext,3000)
}
function nautNext(){
 if(!nautRound||!state.session.answered||state.session.finished)return;
 clearCelebration();stopSound();updateLearningClock();
 if(nautRound.index===nautTotal()-1){state.session.finished=true;stopStudyMusic();state.session.recordDuration=learningSnapshot().duration_seconds;finalizeLearningRecord(true);startStudyMusic()}
 else{nautRound.index++;nautRound.selected=[];nautRound.links={};nautRound.activeLeft=null;state.session.answered=false}
 render()
}
function nautSummary(){const r=nautRound,s=state.session,total=nautTotal();return `<div class="summary-radiance" aria-hidden="true"></div><div class="math-study summary math-summary geo-study naut-study">${nautHeader()}<div class="summary-finale"><div class="summary-fireworks" aria-hidden="true"><i class="firework finale-left"></i><i class="firework finale-top"></i><i class="firework finale-right"></i></div><h2>🎉 Klaar!</h2></div><h2>${NAUT_TITLE}</h2><p class="math-score">${s.correct} / ${total} goed · ${Math.round(s.correct/total*100)}%</p><p class="hint">Elke vraag telt voor 1 punt. Bij meerkeuze en verbinden moet alles kloppen.</p>${recordSaveStatus()}<div class="geo-results-by-type">${Object.entries(NAUT_TYPES).map(([type,label])=>{const rows=r.results.filter(x=>x.type===type);return `<div>${label}<strong>${rows.filter(x=>x.ok).length} / ${rows.length}</strong></div>`}).join("")}</div><h3>Terugkijken</h3>${r.results.map(result=>`<details class="geo-result"><summary>${result.ok?"✅":"🔴"} ${esc(result.text)}</summary><p>Jouw antwoord: ${esc(result.input)}</p><p>Goed: ${esc(result.answer)}</p></details>`).join("")}<p class="hint">${esc(nautBank.note)}</p><button class="btn" id="nautHome">Terug naar Felix</button> <button class="btn primary" id="nautAgain">Nog een keer</button></div>`}
function nautLeave(){finalizeLearningRecord();clearCelebration();stopSound();stopStudyMusic();nautRound=null;state.session=null;state.mode=null;state.view="home";state.filter="Oudste";render()}
function nautDrawLines(){
 const board=document.querySelector(".naut-match-board");if(!board||!nautRound)return;
 const svg=board.querySelector("svg"),box=board.getBoundingClientRect();svg.setAttribute("viewBox",`0 0 ${box.width} ${box.height}`);
 svg.innerHTML=Object.entries(nautRound.links).map(([left,right])=>{const a=board.querySelector(`[data-naut-left="${left}"]`).getBoundingClientRect(),b=board.querySelector(`[data-naut-right="${right}"]`).getBoundingClientRect();return `<line x1="${a.right - box.left}" y1="${a.top+a.height/2-box.top}" x2="${b.left - box.left}" y2="${b.top+b.height/2-box.top}" stroke="${state.session.answered?(Number(left)===right?"#74dfa0":"#ff9393"):"#d9b0ff"}" stroke-width="3"/>`}).join("")
}
function nautHandlers(){
 nautBoardObserver?.disconnect();
 document.getElementById("openNaut")?.addEventListener("click",requestNautStudy);
 document.getElementById("nautExit")?.addEventListener("click",()=>{if(state.session.finished||confirm("Stoppen met deze ronde? Je resultaat tot nu toe wordt bewaard."))nautLeave()});
 document.getElementById("nautHome")?.addEventListener("click",nautLeave);
 document.getElementById("nautAgain")?.addEventListener("click",requestNautStudy);
 document.getElementById("nautForm")?.addEventListener("submit",nautSubmit);
 document.getElementById("nautNext")?.addEventListener("click",nautNext);
 document.querySelectorAll("[data-naut-option]").forEach(button=>button.onclick=()=>{if(state.session.answered)return;const i=Number(button.dataset.nautOption),q=nautRound.questions[nautRound.index];nautRound.selected=q.type==="single"?[i]:nautRound.selected.includes(i)?nautRound.selected.filter(x=>x!==i):[...nautRound.selected,i];render()});
 document.querySelectorAll("[data-naut-left]").forEach(button=>button.onclick=()=>{if(state.session.answered)return;nautRound.activeLeft=Number(button.dataset.nautLeft);render()});
 document.querySelectorAll("[data-naut-right]").forEach(button=>button.onclick=()=>{if(state.session.answered||nautRound.activeLeft===null)return;const right=Number(button.dataset.nautRight);for(const left of Object.keys(nautRound.links))if(nautRound.links[left]===right)delete nautRound.links[left];nautRound.links[nautRound.activeLeft]=right;nautRound.activeLeft=null;render()});
 document.getElementById("nautReset")?.addEventListener("click",()=>{nautRound.links={};nautRound.activeLeft=null;render()});
 const board=document.querySelector(".naut-match-board");if(board){nautBoardObserver=new ResizeObserver(nautDrawLines);nautBoardObserver.observe(board);nautDrawLines()}
}
document.addEventListener("keydown",event=>{
 if(event.key!=="Enter"||event.repeat||event.defaultPrevented||event.isComposing||event.ctrlKey||event.altKey||event.metaKey)return;
 if(state.view!=="science"||!nautRound||state.session?.answered||state.session?.finished||state.modal)return;
 const q=nautRound.questions[nautRound.index];if(q.type==="match"||!nautReady()||event.target?.closest?.("input,textarea,select,[contenteditable=\"true\"],[role=\"dialog\"]"))return;
 event.preventDefault();nautSubmit(event)
},true);

