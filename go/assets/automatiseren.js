// Fixed school questions. Update the JSON file, not the word-list importer.
let mathBank=null,mathLoading=false,mathError="",mathRound=null;
let mathOwner="Felix";
function mathShuffle(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
let mathRecentStories=[];
try{mathRecentStories=JSON.parse(localStorage.getItem("mathRecentStories_v1")||"[]");if(!Array.isArray(mathRecentStories))mathRecentStories=[]}catch(e){}
function mathStoryCandidates(){
 const originals=mathBank.weeks.flatMap(w=>w.days.flatMap(d=>d.questions)).filter(q=>q.unit),candidates=[];
 for(const q of originals){
  candidates.push({...q});
  // Keep the school's exact wording; only replace its numerical quantities.
  const add=(numbers,answer)=>{let i=0;const text=q.text.replace(/\d+/g,()=>String(numbers[i++]));candidates.push({...q,id:q.id+":"+numbers.join("-"),text,answer})};
  if(q.unit==="zakken")for(let perBag=3;perBag<=5;perBag++)for(let bags=11;bags<=15;bags++){const total=perBag*bags;if(total>=44&&total<=60)add([total,perBag],bags)}
  if(q.unit==="euro")for(let price=26;price<=32;price++)for(let count=2;count<=4;count++)add([price,count],price*count);
  if(q.unit==="stickers")for(let children=4;children<=6;children++)for(let each=13;each<=17;each++){const total=children*each;if(total>=60&&total<=90)add([children,total],each)}
 }
 return [...new Map(candidates.map(q=>[q.text,q])).values()]
}
function mathBuildTest(){
 const all=mathBank.weeks.flatMap(w=>w.days.flatMap(d=>d.questions)),questions=[];
 if(mathBank.owner==="Max"){
  for(const op of ["+","-"]){const pool=[...new Map(all.filter(q=>q.text.split(" ")[1]===op).map(q=>[q.text,q])).values()];if(pool.length<10)throw Error("Not enough school questions");questions.push(...mathShuffle(pool).slice(0,10))}
  return mathShuffle(questions)
 }
 // The source bank has an equal share of all four operations: five of each.
 for(const op of ["+","x","-",":"]){const pool=[...new Map(all.filter(q=>!q.unit&&q.text.split(" ")[1]===op).map(q=>[q.text,q])).values()];if(pool.length<5)throw Error("Not enough school questions");questions.push(...mathShuffle(pool).slice(0,5))}
 const candidates=mathStoryCandidates(),fresh=candidates.filter(q=>!mathRecentStories.includes(q.text));
 // Equal chance for each of the three original contexts, independent of variant count.
 const available=fresh.length?fresh:candidates,units=[...new Set(available.map(q=>q.unit))],unit=mathShuffle(units)[0],story=mathShuffle(available.filter(q=>q.unit===unit))[0];
 if(!story)throw Error("No story available");
 mathRecentStories=[...mathRecentStories,story.text].slice(-12);
 try{localStorage.setItem("mathRecentStories_v1",JSON.stringify(mathRecentStories))}catch(e){}
 return [...mathShuffle(questions),story]
}
async function loadMathBank(){
 if(mathLoading)return;mathLoading=true;mathError="";render();
 try{
  const response=await fetch(`assets/automatiseren-${mathOwner.toLowerCase()}.json`,{cache:"no-cache"});
  if(!response.ok)throw Error("HTTP "+response.status);
  const bank=await response.json(),ids=new Set();
  if(bank.owner!==mathOwner||!Array.isArray(bank.weeks)||!bank.weeks.length)throw Error("Invalid owner/weeks");
  for(const week of bank.weeks){if(!Array.isArray(week.days)||!week.days.length)throw Error("Invalid days");for(const day of week.days){if(!Array.isArray(day.questions)||!day.questions.length)throw Error("Empty day");for(const q of day.questions){if(typeof q.text!=="string"||!Number.isFinite(q.answer)||!q.id||ids.has(q.id))throw Error("Invalid question");ids.add(q.id)}}}
  mathBank=bank;
 }catch(error){console.warn(error);mathError="De opgaven konden niet worden geladen. Probeer het opnieuw."}
 finally{mathLoading=false;if(state.view==="math")render()}
}
function mathPage(){
 if(mathRound)return mathStudyPage();
 return home()
}
function requestMathStudy(){state.pendingMode="math";state.pendingLearner=state.session?.learner||mathOwner;state.modal="learner";render()}
async function confirmMathStudy(learner){
 if(!mathBank||mathBank.owner!==mathOwner){mathBank=null;await loadMathBank();if(!mathBank){state.modal=null;state.view="home";render();alert(mathError);return}}
 state.modal=null;state.view="math";mathStart(learner)
}
function mathStart(learner="Felix"){
 if(!mathBank)return;
 let questions;try{questions=mathBuildTest()}catch(e){alert("De toets kon niet worden samengesteld. Controleer de opgaven.");return}
 stopSound();stopStudyMusic();clearCelebration();historyIndex=null;
 mathRound={index:0,results:[],questions,title:`Automatiseren · ${mathOwner}`};
 state.mode="math";state.session={total:questions.length,correct:0,review:[],finished:false,answered:false,learner:"Felix"};
 beginLearningRecord(learner,{id:`math:${mathOwner}:mix${questions.length}`,name:mathRound.title},"mc");
 startStudyMusic();render();mathFocus()
}
function mathAudioControls(){return `<div class="audio-controls"><button class="audio-toggle ${audioSettings.music?"on":""}" id="mathMusic" aria-pressed="${audioSettings.music}"><span>🎵 Muziek</span><i class="audio-switch"></i></button><button class="audio-toggle ${audioSettings.sound?"on":""}" id="mathSound" aria-pressed="${audioSettings.sound}"><span>🔊 Geluid</span><i class="audio-switch"></i></button></div>`}
function mathKeypad(q,result){const value=result?result.input:(mathRound.draft||"");return `<div class="math-keypad-wrap"><output id="mathAnswer" tabindex="0" aria-label="Jouw antwoord" aria-live="polite">${value?esc(value):"—"}</output>${result?"":`<div class="math-keypad" role="group" aria-label="Cijfer toetsenbord">${["7","8","9","4","5","6","1","2","3","0","Delete","Enter"].map(key=>`<button class="btn ${key==="Enter"?"primary":""}" type="${key==="Enter"?"submit":"button"}" ${key==="Enter"?'id="mathConfirm"':`data-math-key="${key}"`} ${key==="Delete"?'aria-label="Laatste cijfer verwijderen"':""}>${key==="Delete"?"⌫":key}</button>`).join("")}</div>`}</div>`}
function mathPressKey(key){
 if(!mathRound||state.session?.answered||state.modal)return;
 let value=mathRound.draft||"";
 if(key==="Delete")value=value.slice(0,-1);
 else if(/^\d$/.test(key)&&value.length<6)value=value==="0"?key:value+key;
 mathRound.draft=value;document.getElementById("mathAnswer").textContent=value||"—";document.getElementById("mathValidation").textContent=""
}
function mathStudyPage(){
 const r=mathRound,s=state.session;
 if(s.finished)return `<div class="summary-radiance" aria-hidden="true"></div><div class="math-study summary math-summary">${mathAudioControls()}<div class="summary-finale"><div class="summary-fireworks" aria-hidden="true"><i class="firework finale-left"></i><i class="firework finale-top"></i><i class="firework finale-right"></i></div><h2>🎉 Klaar!</h2></div><h2>${esc(r.title)}</h2><p class="math-score">${s.correct} / ${s.total} goed · ${Math.round(s.correct/s.total*100)}%</p>${recordSaveStatus()}${r.results.some(x=>!x.ok)?`<h3>Nog oefenen</h3><ul class="math-review">${r.results.filter(x=>!x.ok).map(x=>`<li>${esc(x.text)}<br>Jouw antwoord: ${esc(x.input)} · Goed: <strong>${x.answer}</strong></li>`).join("")}</ul>`:`<p>Alles goed gedaan! 🎉</p>`}<button class="btn primary" id="mathAgain">Nog een keer</button> <button class="btn" id="mathMenu">Terug naar Automatiseren</button></div>`;
 const q=r.questions[r.index],result=r.results[r.index];
 return `<div class="math-study"><div class="math-top learner-header"><div class="learner-header-left"><div class="learner-name">${learnerLabel(s.learner)}</div><button class="back" id="mathExit">‹ Afsluiten</button></div>${mathAudioControls()}</div><h2>${esc(r.title)}</h2><p class="meta">${r.index+1} / ${s.total}</p><progress class="math-progress" max="${s.total}" value="${r.results.length}" aria-label="Voortgang"></progress><form id="mathForm" novalidate><div class="math-question-stage"><h3 class="math-question ${q.unit?"math-story":""}" id="mathQuestion">${esc(q.text)}</h3>${result?`<div class="feedback-overlay"><img class="feedback-gif" src="assets/${result.ok?"feedback-correct.gif":"feedback-wrong.gif"}" alt="${result.ok?"Goed gedaan":"Probeer het opnieuw"}"></div>`:""}</div><label for="mathAnswer">Jouw antwoord${q.unit?` (${esc(q.unit)})`:""}</label>${mathKeypad(q,result)}<p id="mathValidation" role="alert"></p>${result?`<div class="math-feedback ${result.ok?"good":"wrong"}" role="status">${result.ok?"✅ Goed zo! Volgende vraag komt eraan…":`Nog niet goed. Het juiste antwoord is ${q.answer}${q.unit?" "+esc(q.unit):""}.`}</div><button type="button" class="btn primary" id="mathNext">${r.index+1===s.total?"Bekijk resultaat":"Volgende →"}</button>`:""}</form>${result?.ok?`<div class="celebration" aria-hidden="true"><i class="firework one"></i><i class="firework two"></i><i class="firework three"></i></div>`:""}</div>`
}
function mathFocus(){document.getElementById(state.session?.answered?"mathNext":"mathAnswer")?.focus({preventScroll:true})}
// Physical keyboards work without introducing an input that opens a mobile keyboard.
document.addEventListener("keydown",event=>{
 if(state.view!=="math"||!mathRound||!state.session||state.session.finished||state.modal||event.defaultPrevented||event.isComposing||event.ctrlKey||event.altKey||event.metaKey)return;
 if(event.target?.closest?.('input,textarea,select,[contenteditable="true"],[role="dialog"]'))return;
 if(event.key==="Enter"&&event.repeat){event.preventDefault();return}
 if(state.session.answered)return;
 const digit=/^Numpad[0-9]$/.test(event.code)?event.code.slice(-1):event.key;
 if(/^[0-9]$/.test(digit)){event.preventDefault();mathPressKey(digit)}
 else if(event.key==="Backspace"||event.key==="Delete"){event.preventDefault();mathPressKey("Delete")}
 else if(event.key==="Enter"){
  if(event.target?.closest?.('button')&&!event.target.closest('.math-keypad'))return;
  event.preventDefault();mathSubmit(event)
 }
},true);
function mathSubmit(event){
 event.preventDefault();if(!mathRound||state.session.answered)return;
 const value=mathRound.draft||"";
 if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))){document.getElementById("mathValidation").textContent="Vul een heel getal in, bijvoorbeeld 12.";return}
 updateLearningClock();const q=mathRound.questions[mathRound.index],ok=Number(value)===q.answer;
 mathRound.results.push({...q,input:value,ok});state.session.answered=true;state.session.feedbackAt=performance.now();
 if(ok)state.session.correct++;else state.session.review.push({term:q.text,definition:`Jouw antwoord: ${value}; goed: ${q.answer}`});
 playSound(ok?"correct":"wrong",ok ? .7 : .55);render();showAnswerRibbon(ok);checkpointLearning();mathFocus();
 clearCelebration();if(ok)celebrationTimer=setTimeout(mathNext,3000)
}
function mathNext(){
 if(!mathRound||!state.session.answered||state.session.finished)return;
 clearCelebration();stopSound();updateLearningClock();
 if(mathRound.index+1===mathRound.questions.length){state.session.finished=true;stopStudyMusic();state.session.recordDuration=learningSnapshot().duration_seconds;finalizeLearningRecord(true);startStudyMusic()}
 else{mathRound.index++;mathRound.draft="";state.session.answered=false}
 render();mathFocus()
}
function mathLeave(){
 finalizeLearningRecord();clearCelebration();stopSound();stopStudyMusic();mathRound=null;state.session=null;state.mode=null;state.view="home";state.filter=mathOwner==="Max"?"Jongste":"Oudste";render()
}
function mathHandlers(){
 document.querySelectorAll('[data-math-key]').forEach(button=>button.onclick=()=>mathPressKey(button.dataset.mathKey));
 document.querySelectorAll("[data-math-owner]").forEach(button=>button.onclick=()=>{mathOwner=button.dataset.mathOwner;requestMathStudy()});
 document.getElementById("mathRetry")?.addEventListener("click",loadMathBank);
 document.getElementById("mathHome")?.addEventListener("click",()=>{state.view="home";state.filter="Oudste";render()});
 document.getElementById("mathStart")?.addEventListener("click",requestMathStudy);
 document.getElementById("mathForm")?.addEventListener("submit",mathSubmit);
 document.getElementById("mathNext")?.addEventListener("click",mathNext);
 document.getElementById("mathExit")?.addEventListener("click",()=>{if(confirm("Stoppen met deze ronde? Je resultaat tot nu toe wordt bewaard."))mathLeave()});
 document.getElementById("mathMenu")?.addEventListener("click",mathLeave);
 document.getElementById("mathAgain")?.addEventListener("click",requestMathStudy);
 document.getElementById("mathMusic")?.addEventListener("click",()=>{audioSettings.music=!audioSettings.music;saveAudioSettings();if(audioSettings.music)startStudyMusic();else stopStudyMusic();render()});
 document.getElementById("mathSound")?.addEventListener("click",()=>{audioSettings.sound=!audioSettings.sound;saveAudioSettings();if(!audioSettings.sound)stopSound();render()})
}
