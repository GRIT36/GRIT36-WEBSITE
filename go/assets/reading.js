let readingOwner="Max";
function readingLessons(){return readingOwner==="Felix"?FELIX_READING_LESSONS:READING_LESSONS}
function readingParts(l){return l.parts||{A:l.sentences.slice(0,l.split),B:l.sentences.slice(l.split)}}
function readingNextPart(){const parts=Object.keys(readingParts(readingLessons().find(l=>l.number===readingRound.lesson)));return parts[parts.indexOf(readingRound.part)+1]}
let readingRound=null,readingPending=null,readingAudio=null,readingGeneration=0;
const READING_RATINGS={red:{label:"Nog oefenen",icon:"🔴"},yellow:{label:"Nog onzeker",icon:"🟡"},green:{label:"Goed gelezen",icon:"🟢"}};
function readingStop(){readingGeneration++;if(readingAudio){readingAudio.pause();readingAudio.currentTime=0}readingAudio=null}
function readingSpeak(){
 if(!readingRound||state.session?.finished||document.hidden||readingCapture)return;
 readingStop();stopSound();const token=readingGeneration,q=readingRound.sentences[readingRound.index];
 readingAudio=new Audio(q.audio);readingAudio.volume=MUSIC_LEVELS[audioSettings.musicLevel].volume;
 const practice=readingPractice();readingAudio.onended=()=>{if(token!==readingGeneration)return;practice.heard=true;render()};
 const status=document.getElementById("readingAudioStatus");if(status)status.textContent="";
 readingAudio.play().catch(()=>{if(token!==readingGeneration)return;const el=document.getElementById("readingAudioStatus");if(el)el.textContent="Tik op Luisteren om de zin af te spelen. Controleer je verbinding als het niet lukt."})
}
function readingMenu(){return `<button class="back" id="readingHome">‹ Terug naar ${readingOwner}</button><h1>📖 Hardop lezen</h1><p class="hint">Luister, lees zelf en kies een kleur. Tik op de zin voor de Chinese betekenis.</p>${readingLessons().map(l=>`<section class="accuracy-panel"><h2>${readingOwner==="Felix"?"Hoofdstuk":"Les"} ${l.number} · ${esc(l.title)}</h2><div class="reading-parts">${Object.keys(readingParts(l)).map(part=>`<button class="btn primary" data-reading-lesson="${l.number}" data-reading-part="${part}">${part} · ${readingParts(l)[part].length} zinnen</button>`).join("")}<button class="btn" data-reading-full="${l.number}">📖 Hele tekst</button></div></section>`).join("")}`}
function requestReading(lesson,part){readingPending={lesson:Number(lesson),part};state.pendingMode="reading";state.pendingLearner=state.session?.learner||readingOwner;state.modal="learner";render()}
function readingStart(learner){
 const lesson=readingLessons().find(l=>l.number===readingPending.lesson),part=readingPending.part;
 readingRecordDispose();readingStop();stopSound();stopStudyMusic();homeMusicPause();clearCelebration();historyIndex=null;
 const sentences=readingParts(lesson)[part];
 readingRound={lesson:lesson.number,part,title:`Hardop lezen · ${readingOwner==="Felix"?"Snelle Sam · Hoofdstuk":"Les"} ${lesson.number}${part} · ${lesson.title}`,sentences,index:0,shown:false,ratings:{}};
 state.modal=null;state.view="reading";state.mode="reading";state.session={total:sentences.length,known:0,review:[],wordResults:[],finished:false,learner};
 beginLearningRecord(learner,{id:`reading:${readingOwner}:${lesson.number}:${part}`,name:readingRound.title},"flashcard");render();readingSpeak()
}
function readingRate(level){
 if(!readingRound||state.session.finished||!READING_RATINGS[level]||!readingReady())return;
 readingStop();const r=readingRound;r.ratings[r.sentences[r.index].id]=level;
 state.session.wordResults=r.sentences.filter(q=>r.ratings[q.id]).map(q=>({word_id:q.id,term:q.nl,definition:q.zh,result:r.ratings[q.id]}));
 state.session.known=state.session.wordResults.filter(q=>q.result==="green").length;
 state.session.review=state.session.wordResults.filter(q=>q.result!=="green");
 playSound(level==="green"?"correct":level==="red"?"flashcardHuh":"review");checkpointLearning();render()
}
function readingMove(step){
 const r=readingRound;if(!r||state.session.finished||readingCapture)return;
 if(step>0&&(!readingReady()||!r.ratings[r.sentences[r.index].id]))return;
 if(r.index+step<0)return;
 if(r.index+step>=r.sentences.length){
  if(state.session.wordResults.length!==r.sentences.length)return;
  readingStop();stopSound();updateLearningClock();state.session.finished=true;state.session.recordDuration=learningSnapshot().duration_seconds;finalizeLearningRecord(true);readingRecordDispose();startStudyMusic();render();return
 }
 readingStop();stopSound();readingRecordMessage="";r.index+=step;r.shown=false;checkpointLearning();render();readingSpeak()
}
function readingGroups(results){return `<div class="memory-groups">${Object.entries(READING_RATINGS).map(([level,info])=>{const items=results.filter(q=>q.result===level);return `<section class="memory-group memory-${level}"><h3>${info.icon} ${info.label} · ${items.length}</h3>${items.length?`<ul>${items.map(q=>`<li>${esc(q.term)}<br><span class="meta">${esc(q.definition)}</span></li>`).join("")}</ul>`:`<p class="meta">Geen zinnen</p>`}</section>`}).join("")}</div>`}
function readingPage(){
 const r=readingRound,s=state.session;if(!r)return readingMenu();
 if(s.finished)return `<div class="summary-radiance" aria-hidden="true"></div><div class="reading-study summary">${mathAudioControls()}<div class="summary-finale"><div class="summary-fireworks" aria-hidden="true"><i class="firework finale-left"></i><i class="firework finale-right"></i></div><h2>🎉 Goed geoefend!</h2></div><h2>${esc(r.title)}</h2><p>${s.total} zinnen geoefend · jouw eigen beoordeling</p>${recordSaveStatus()}${readingGroups(s.wordResults)}<div class="reading-parts"><button class="btn" id="readingAgain">Nog een keer</button>${readingNextPart()?`<button class="btn primary" id="readingB">Verder met ${readingNextPart()} →</button>`:""}<button class="btn" id="readingMenu">Alle lessen</button></div></div>`;
 const q=r.sentences[r.index],level=r.ratings[q.id];
 return `<div class="reading-study"><div class="learner-header"><div><div class="learner-name">${learnerLabel(s.learner)}</div><button class="back" id="readingExit">‹ Afsluiten</button></div><button class="btn" id="readingSound" aria-pressed="${audioSettings.sound}">🔊 Geluid ${audioSettings.sound?"aan":"uit"}</button></div><h2>${readingOwner==="Felix"?"Hoofdstuk":"Les"} ${r.lesson} · ${r.part} · ${esc(q.story)}</h2><p class="meta">${r.index+1} / ${s.total} · ${s.wordResults.length} beoordeeld</p><progress class="math-progress" max="${s.total}" value="${s.wordResults.length}" aria-label="Voortgang"></progress><button class="reading-card" id="readingText" aria-expanded="${r.shown}"><span lang="nl">${esc(q.nl)}</span>${r.shown?`<span class="reading-chinese" lang="zh">${esc(q.zh)}</span>`:""}</button><p class="hint">Tik op de zin voor de Chinese betekenis.</p><button class="btn primary" id="readingListen" ${readingCapture?"disabled":""}>🔊 Luisteren</button><p id="readingAudioStatus" role="status"></p>${readingRecordPanel()}<p>Hoe ging het lezen?</p><div class="fc-buttons">${Object.entries(READING_RATINGS).map(([key,info])=>`<button class="btn memory-${key}" data-reading-rating="${key}" ${readingReady()?"":"disabled"} aria-pressed="${key===level}">${info.icon} ${info.label}</button>`).join("")}</div><p class="hint">${level?"Klik op Volgende als je klaar bent.":"Kies een kleur om verder te gaan."}</p><div class="reading-navigation"><button class="btn" id="readingPrevious" ${r.index===0||readingCapture?"disabled":""}>⬅️ Vorige</button><button class="btn primary" id="readingNext" ${level&&readingReady()?"":"disabled"}>${r.index===s.total-1?"Afronden ✓":"Volgende ➡️"}</button></div></div>`
}
function readingLeave(){readingRecordDispose();readingStop();stopSound();stopStudyMusic();finalizeLearningRecord();readingRound=null;state.session=null;state.mode=null;state.view="readingMenu";render()}
function readingHandlers(){
 readingRecordHandlers();readingFullHandlers();
 document.getElementById("openReading")?.addEventListener("click",()=>{readingOwner="Max";homeMusicPause();state.view="readingMenu";render()});
 document.getElementById("openReadingFelix")?.addEventListener("click",()=>{readingOwner="Felix";homeMusicPause();state.view="readingMenu";render()});
 document.getElementById("readingHome")?.addEventListener("click",()=>{state.view="home";state.filter=readingOwner==="Felix"?"Oudste":"Jongste";render()});
 document.querySelectorAll("[data-reading-lesson]").forEach(b=>b.onclick=()=>requestReading(b.dataset.readingLesson,b.dataset.readingPart));
 document.getElementById("readingText")?.addEventListener("click",()=>{readingRound.shown=!readingRound.shown;render()});
 document.getElementById("readingListen")?.addEventListener("click",readingSpeak);
 document.querySelectorAll("[data-reading-rating]").forEach(b=>b.onclick=()=>readingRate(b.dataset.readingRating));
 document.getElementById("readingPrevious")?.addEventListener("click",()=>readingMove(-1));
 document.getElementById("readingNext")?.addEventListener("click",()=>readingMove(1));
 document.getElementById("readingExit")?.addEventListener("click",()=>{if(confirm("Stoppen? Je beoordelingen worden bewaard."))readingLeave()});
 document.getElementById("readingMenu")?.addEventListener("click",readingLeave);
 document.getElementById("readingAgain")?.addEventListener("click",()=>requestReading(readingRound.lesson,readingRound.part));
 document.getElementById("readingB")?.addEventListener("click",()=>requestReading(readingRound.lesson,readingNextPart()));
 document.getElementById("readingSound")?.addEventListener("click",()=>{audioSettings.sound=!audioSettings.sound;saveAudioSettings();if(!audioSettings.sound)stopSound();render()})
}
document.addEventListener("visibilitychange",()=>{if(document.hidden)readingStop()});
window.addEventListener("pagehide",readingStop);
