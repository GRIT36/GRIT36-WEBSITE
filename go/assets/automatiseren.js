// Fixed school questions. Update the JSON file, not the word-list importer.
let mathBank=null,mathLoading=false,mathError="",mathRound=null;
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
  const response=await fetch("assets/automatiseren-felix.json",{cache:"no-cache"});
  if(!response.ok)throw Error("HTTP "+response.status);
  const bank=await response.json(),ids=new Set();
  if(bank.owner!=="Felix"||!Array.isArray(bank.weeks)||!bank.weeks.length)throw Error("Invalid owner/weeks");
  for(const week of bank.weeks){if(!Array.isArray(week.days)||!week.days.length)throw Error("Invalid days");for(const day of week.days){if(!Array.isArray(day.questions)||!day.questions.length)throw Error("Empty day");for(const q of day.questions){if(typeof q.text!=="string"||!Number.isFinite(q.answer)||!q.id||ids.has(q.id))throw Error("Invalid question");ids.add(q.id)}}}
  mathBank=bank;
 }catch(error){console.warn(error);mathError="De opgaven konden niet worden geladen. Probeer het opnieuw."}
 finally{mathLoading=false;if(state.view==="math")render()}
}
function mathPage(){
 if(mathRound)return mathStudyPage();
 return `<button class="back" id="mathHome">‹ Terug naar Felix</button><h1>🏎️ Automatiseren</h1><p class="meta">🦉 Felix · Opgaven van school</p><section class="math-week"><h2>Een nieuwe mix, elke keer</h2><p>20 sommen door elkaar, gevolgd door 1 verhaalsom.</p><p>Kies je antwoord met de schuifregelaar. De verhaalsommen hebben soms andere getallen.</p>${mathError?`<p role="alert">${esc(mathError)}</p><button class="btn" id="mathRetry">↻ Opnieuw proberen</button>`:mathLoading?`<p role="status">Opgaven laden…</p>`:mathBank?`<button class="btn primary" id="mathStart">🏁 Start de toets · 21 opgaven</button>`:""}</section>`
}
function requestMathStudy(){if(!mathBank)return;state.pendingMode="math";state.pendingLearner=state.session?.learner||mathBank.owner||"Felix";state.modal="learner";render()}
function mathStart(learner="Felix"){
 if(!mathBank)return;
 let questions;try{questions=mathBuildTest()}catch(e){alert("De toets kon niet worden samengesteld. Controleer de opgaven.");return}
 stopSound();stopStudyMusic();clearCelebration();historyIndex=null;
 mathRound={index:0,results:[],questions,title:"Automatiseren · Mix"};
 state.mode="math";state.session={total:questions.length,correct:0,review:[],finished:false,answered:false,learner:"Felix"};
 beginLearningRecord(learner,{id:"math:Felix:mix21",name:mathRound.title},"mc");
 startStudyMusic();render();mathFocus()
}
function mathAudioControls(){return `<div class="audio-controls"><button class="audio-toggle ${audioSettings.music?"on":""}" id="mathMusic" aria-pressed="${audioSettings.music}"><span>🎵 Muziek</span><i class="audio-switch"></i></button><button class="audio-toggle ${audioSettings.sound?"on":""}" id="mathSound" aria-pressed="${audioSettings.sound}"><span>🔊 Geluid</span><i class="audio-switch"></i></button></div>`}
function mathSliderMax(q){return q.unit?150:q.text.includes(" x ")?100:20}
function mathSlider(q,result){const value=result?Number(result.input):Number(mathRound.draft||0),max=mathSliderMax(q),disabled=result?"disabled":"";return `<div class="math-slider"><output id="mathPreview" for="mathAnswer">${value}</output><div class="math-slider-row"><button type="button" class="btn" id="mathMinus" aria-label="Eén minder" ${disabled}>−</button><input id="mathAnswer" type="range" min="0" max="${max}" step="1" value="${value}" aria-label="Jouw antwoord" ${disabled}><button type="button" class="btn" id="mathPlus" aria-label="Eén meer" ${disabled}>＋</button></div><div class="math-range-labels"><span>0</span><span>${max}</span></div></div>`}
function mathSetSlider(value){if(state.session?.answered)return;const slider=document.getElementById("mathAnswer");value=Math.max(0,Math.min(Number(slider.max),Number(value)));slider.value=value;mathRound.draft=String(value);document.getElementById("mathPreview").value=String(value)}
function mathStudyPage(){
 const r=mathRound,s=state.session;
 if(s.finished)return `<div class="summary-radiance" aria-hidden="true"></div><div class="math-study summary math-summary">${mathAudioControls()}<div class="summary-finale"><div class="summary-fireworks" aria-hidden="true"><i class="firework finale-left"></i><i class="firework finale-top"></i><i class="firework finale-right"></i></div><h2>🎉 Klaar!</h2></div><h2>${esc(r.title)}</h2><p class="math-score">${s.correct} / ${s.total} goed · ${Math.round(s.correct/s.total*100)}%</p>${recordSaveStatus()}${r.results.some(x=>!x.ok)?`<h3>Nog oefenen</h3><ul class="math-review">${r.results.filter(x=>!x.ok).map(x=>`<li>${esc(x.text)}<br>Jouw antwoord: ${esc(x.input)} · Goed: <strong>${x.answer}</strong></li>`).join("")}</ul>`:`<p>Alles goed gedaan! 🎉</p>`}<button class="btn primary" id="mathAgain">Nog een keer</button> <button class="btn" id="mathMenu">Terug naar Automatiseren</button></div>`;
 const q=r.questions[r.index],result=r.results[r.index];
 return `<div class="math-study"><div class="math-top"><button class="back" id="mathExit">‹ Afsluiten</button>${mathAudioControls()}</div><h2>${esc(r.title)}</h2><p class="meta">${learnerLabel(s.learner)} · ${r.index+1} / ${s.total}</p><progress class="math-progress" max="${s.total}" value="${r.results.length}" aria-label="Voortgang"></progress><form id="mathForm" novalidate><div class="math-question-stage"><h3 class="math-question ${q.unit?"math-story":""}" id="mathQuestion">${esc(q.text)}</h3>${result?`<div class="feedback-overlay"><img class="feedback-gif" src="assets/${result.ok?"feedback-correct.gif":"feedback-wrong.gif"}" alt="${result.ok?"Goed gedaan":"Probeer het opnieuw"}"></div>`:""}</div><label for="mathAnswer">Jouw antwoord${q.unit?` (${esc(q.unit)})`:""}</label>${mathSlider(q,result)}<p id="mathValidation" role="alert"></p>${result?`<div class="math-feedback ${result.ok?"good":"wrong"}" role="status">${result.ok?"✅ Goed zo! Volgende vraag komt eraan…":`Nog niet goed. Het juiste antwoord is ${q.answer}${q.unit?" "+esc(q.unit):""}.`}</div><button type="button" class="btn primary" id="mathNext">${r.index+1===s.total?"Bekijk resultaat":"Volgende →"}</button>`:`<button class="btn primary" type="submit">Bevestigen</button>`}</form>${result?.ok?`<div class="celebration" aria-hidden="true"><i class="firework one"></i><i class="firework two"></i><i class="firework three"></i></div>`:""}</div>`
}
function mathFocus(){document.getElementById(state.session?.answered?"mathNext":"mathAnswer")?.focus({preventScroll:true})}
function mathSubmit(event){
 event.preventDefault();if(!mathRound||state.session.answered)return;
 const value=document.getElementById("mathAnswer").value.trim();
 if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))){document.getElementById("mathValidation").textContent="Vul een heel getal in, bijvoorbeeld 12.";return}
 updateLearningClock();const q=mathRound.questions[mathRound.index],ok=Number(value)===q.answer;
 mathRound.results.push({...q,input:value,ok});state.session.answered=true;
 if(ok)state.session.correct++;else state.session.review.push({term:q.text,definition:`Jouw antwoord: ${value}; goed: ${q.answer}`});
 playSound(ok?"correct":"wrong",ok ? .7 : .55);render();showAnswerRibbon(ok);checkpointLearning();mathFocus();
 clearCelebration();if(ok)celebrationTimer=setTimeout(mathNext,3000)
}
function mathNext(){
 if(!mathRound||!state.session.answered||state.session.finished)return;
 clearCelebration();stopSound();updateLearningClock();
 if(mathRound.index+1===mathRound.questions.length){state.session.finished=true;stopStudyMusic();state.session.recordDuration=learningSnapshot().duration_seconds;finalizeLearningRecord(true);playSoundSequence(state.session.correct/state.session.total<.5?["emotional"]:["brainrot"],.7)}
 else{mathRound.index++;mathRound.draft="";state.session.answered=false}
 render();mathFocus()
}
function mathLeave(){
 finalizeLearningRecord();clearCelebration();stopSound();stopStudyMusic();mathRound=null;state.session=null;state.mode=null;render()
}
function mathHandlers(){
 document.getElementById("mathAnswer")?.addEventListener("input",e=>mathSetSlider(e.target.value));
 document.getElementById("mathMinus")?.addEventListener("click",()=>mathSetSlider(Number(document.getElementById("mathAnswer").value)-1));
 document.getElementById("mathPlus")?.addEventListener("click",()=>mathSetSlider(Number(document.getElementById("mathAnswer").value)+1));
 document.getElementById("openMath")?.addEventListener("click",()=>{state.view="math";render();loadMathBank()});
 document.getElementById("mathRetry")?.addEventListener("click",loadMathBank);
 document.getElementById("mathHome")?.addEventListener("click",()=>{state.view="home";state.filter="Oudste";render()});
 document.getElementById("mathStart")?.addEventListener("click",requestMathStudy);
 document.getElementById("mathForm")?.addEventListener("submit",mathSubmit);
 document.getElementById("mathNext")?.addEventListener("click",mathNext);
 document.getElementById("mathExit")?.addEventListener("click",()=>{if(confirm("Stoppen met deze ronde? Je resultaat tot nu toe wordt bewaard."))mathLeave()});
 document.getElementById("mathMenu")?.addEventListener("click",mathLeave);
 document.getElementById("mathAgain")?.addEventListener("click",requestMathStudy);
 document.getElementById("mathMusic")?.addEventListener("click",()=>{audioSettings.music=!audioSettings.music;saveAudioSettings();if(audioSettings.music&&!state.session.finished)startStudyMusic();else stopStudyMusic();render()});
 document.getElementById("mathSound")?.addEventListener("click",()=>{audioSettings.sound=!audioSettings.sound;saveAudioSettings();if(!audioSettings.sound)stopSound();render()})
}
