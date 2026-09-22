// Shared session records. Browser storage only holds retryable uploads and crash recovery.
const HISTORY_QUEUE_KEY="kievitGoHistoryQueue_v1",HISTORY_DRAFT_KEY="kievitGoHistoryDraft_v1";
const LEARNERS={Felix:"🦉 Felix",Max:"🐓 Max",Andere:"🦖T-Rex"};
let learningTracker=null,learningClockAt=0,learningClockEligible=false;
let historyRows=[],historyFilter="Alle",historyLoading=false,historyError="",historySyncing=null;
let historyPending=readHistoryStorage(HISTORY_QUEUE_KEY,[]),historyStorageWarning=false,lastRecordId=null;
if(!Array.isArray(historyPending))historyPending=[];
function readHistoryStorage(key,fallback){try{const storage=key===HISTORY_DRAFT_KEY?sessionStorage:localStorage;return JSON.parse(storage.getItem(key))||fallback}catch(e){return fallback}}
function writeHistoryStorage(key,value){try{const storage=key===HISTORY_DRAFT_KEY?sessionStorage:localStorage;storage.setItem(key,JSON.stringify(value));return true}catch(e){historyStorageWarning=true;return false}}
function mergePendingHistory(){const rows=readHistoryStorage(HISTORY_QUEUE_KEY,[]);if(Array.isArray(rows)){const merged=new Map(rows.map(r=>[r.id,r]));historyPending.forEach(r=>merged.set(r.id,r));historyPending=[...merged.values()]}}
function learnerLabel(key){return LEARNERS[key]||LEARNERS.Andere}
function historyUuid(){if(crypto.randomUUID)return crypto.randomUUID();return "10000000-1000-4000-8000-100000000000".replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16))}
function requestStudy(mode){
 const list=getList();if(!list?.words.length){alert("Voeg eerst woorden toe.");return}
 if(list.name.trim()==="🚀Test🚀"){start(mode,"Andere");return}
 state.pendingMode=mode;
 state.pendingLearner=state.session?.learner||(list.kid==="Oudste"?"Felix":list.kid==="Jongste"?"Max":"Andere");
 state.modal="learner";render()
}
function learnerModal(){
 const overlay=document.createElement("div");overlay.className="modal-overlay";
 overlay.innerHTML=`<div class="modal learner-modal" role="dialog" aria-modal="true" aria-labelledby="learnerTitle"><h2 id="learnerTitle">Wie gaat er leren?</h2><p class="hint">Kies voor wie we deze ronde bewaren.</p><div class="learner-options">${Object.keys(LEARNERS).map(k=>`<button class="learner-choice" data-learner="${k}" aria-pressed="${state.pendingLearner===k}">${learnerLabel(k)}</button>`).join("")}</div><div class="modal-actions"><button class="btn" id="cancelLearner">Annuleren</button><button class="btn primary" id="confirmLearner">Starten →</button></div></div>`;
 document.getElementById("app").appendChild(overlay);
 overlay.querySelectorAll("[data-learner]").forEach(button=>button.onclick=()=>{state.pendingLearner=button.dataset.learner;overlay.querySelectorAll("[data-learner]").forEach(b=>b.setAttribute("aria-pressed",String(b===button)))});
 overlay.querySelector("#cancelLearner").onclick=()=>{state.modal=null;render()};
 overlay.querySelector("#confirmLearner").onclick=async()=>{const mode=state.pendingMode,learner=state.pendingLearner;if(mode==="reading"){readingStart(learner)}else if(mode==="geography"){overlay.querySelectorAll("button").forEach(b=>b.disabled=true);overlay.querySelector("#confirmLearner").textContent="Laden…";await confirmGeoStudy(learner)}else if(mode==="math"){overlay.querySelectorAll("button").forEach(b=>b.disabled=true);overlay.querySelector("#confirmLearner").textContent="Laden…";await confirmMathStudy(learner)}else{state.modal=null;start(mode,learner)}};
 overlay.onkeydown=event=>{
  if((state.pendingMode==="math"&&mathLoading)||(state.pendingMode==="geography"&&geoLoading)){event.preventDefault();return}
  if(event.key==="Escape"){state.modal=null;render();return}
  if(event.key==="Tab"){const buttons=[...overlay.querySelectorAll("button")],first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
 };
 overlay.querySelector(`[data-learner="${state.pendingLearner}"]`).focus()
}
function beginLearningRecord(learner,list,mode){
 state.session.learner=learner;
 learningTracker={id:historyUuid(),learner,list_id:String(list.id),list_name:list.name,mode,total_words:state.session.total,started_at:new Date().toISOString(),active_ms:0};
 learningClockAt=performance.now();learningClockEligible=false;lastRecordId=null;
 updateLearningClock();checkpointLearning()
}
function learningMayCount(){return !!(learningTracker&&["study","math","geography","reading"].includes(state.view)&&state.session&&!state.session.finished&&!state.modal&&!document.hidden&&!(["math","geography"].includes(state.view)&&state.session.answered)&&!(historyIndex===null&&state.mode==="mc"&&state.session.answered&&state.session.celebrate))}
function updateLearningClock(){
 const now=performance.now();
 if(learningTracker&&learningClockEligible)learningTracker.active_ms+=Math.max(0,now-learningClockAt);
 learningClockAt=now;learningClockEligible=learningMayCount()
}
function learningSnapshot(forceCompleted=false){
 if(!learningTracker||!state.session)return null;
 const s=state.session,review=s.review||[],isQuiz=learningTracker.mode==="mc";
 const answered=isQuiz?(s.correct||0)+review.length:(s.known||0)+review.length;
 return {id:learningTracker.id,learner:learningTracker.learner,list_id:learningTracker.list_id,list_name:learningTracker.list_name,mode:learningTracker.mode,started_at:learningTracker.started_at,ended_at:new Date().toISOString(),duration_seconds:Math.max(0,Math.floor(learningTracker.active_ms/1000)),total_words:learningTracker.total_words,answered_count:answered,correct_count:isQuiz?(s.correct||0):null,known_count:isQuiz?null:(s.known||0),word_results:s.wordResults||[],review_words:review.map(w=>({term:w.term,definition:w.definition})),status:forceCompleted||(!isTimedMathRecord(learningTracker)&&!String(learningTracker.list_id).startsWith("reading:")&&answered===learningTracker.total_words)?"completed":"incomplete"}
}
function checkpointLearning(){updateLearningClock();const record=learningSnapshot();if(record)writeHistoryStorage(HISTORY_DRAFT_KEY,record)}
function finalizeLearningRecord(completed=false){
 if(!learningTracker)return;
 updateLearningClock();const record=learningSnapshot(completed);learningTracker=null;learningClockEligible=false;
 lastRecordId=record.id;mergePendingHistory();historyPending=historyPending.filter(x=>x.id!==record.id);historyPending.push(record);
 // Persist queue before removing the recoverable draft.
 if(writeHistoryStorage(HISTORY_QUEUE_KEY,historyPending)){try{sessionStorage.removeItem(HISTORY_DRAFT_KEY)}catch(e){}}
 syncLearningRecords()
}
function recordSaveStatus(){
 if(state.session?.skipHistory)return "";
 const pending=historyPending.some(x=>x.id===lastRecordId);
 const time=state.session?.recordDuration;
 return `<div class="record-status" id="recordSaveStatus">${learnerLabel(state.session?.learner)}${time!==undefined?` · ${formatLearningDuration(time)}`:""}<br>${historyStorageWarning?"Opslaan op dit apparaat lukt niet. Houd deze pagina open en probeer opnieuw.":pending?"Nog niet gesynchroniseerd. We proberen het opnieuw zodra er verbinding is.":"Opgeslagen · ook zichtbaar op andere apparaten"}</div>`
}
function refreshRecordStatus(){const el=document.getElementById("recordSaveStatus");if(el)el.outerHTML=recordSaveStatus()}
async function syncLearningRecords(){
 if(historySyncing)return historySyncing;
 mergePendingHistory();
 historySyncing=(async()=>{
  for(const row of [...historyPending]){
   try{
    const {error}=await db.from("learning_sessions").insert(row);
    if(error?.code==="23514"&&error.message?.includes("learning_record_deleted")){mergePendingHistory();historyPending=historyPending.filter(x=>x.id!==row.id);historyRows=historyRows.filter(x=>x.id!==row.id);writeHistoryStorage(HISTORY_QUEUE_KEY,historyPending);continue}
    if(error&&error.code!=="23505")throw error;
    mergePendingHistory();historyPending=historyPending.filter(x=>x.id!==row.id);
    writeHistoryStorage(HISTORY_QUEUE_KEY,historyPending);
    if(!historyRows.some(x=>x.id===row.id))historyRows.unshift(row)
   }catch(error){console.warn("Learning record not synced:",error);break}
  }
 })();
 try{await historySyncing}finally{historySyncing=null;refreshRecordStatus()}
}
async function loadLearningHistory(){
 if(historyLoading)return;
 historyLoading=true;historyError="";if(state.view==="history")render();
 await syncLearningRecords();
 try{
  const rows=[];let offset=0;
  while(true){
   const {data,error}=await db.from("learning_sessions").select("id,learner,list_id,list_name,mode,started_at,ended_at,duration_seconds,total_words,answered_count,correct_count,known_count,review_words,word_results,status").order("started_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+499);
   if(error)throw error;
   rows.push(...data);if(data.length<500)break;offset+=500
  }
  historyRows=rows
 }catch(error){console.warn(error);historyError="De gedeelde geschiedenis kon niet worden geladen. Controleer je verbinding. Controleer ook of de database-update V1.065 is uitgevoerd."}
 finally{historyLoading=false;if(state.view==="history")render()}
}
function allLearningRows(){const rows=new Map(historyRows.map(x=>[x.id,x]));historyPending.forEach(x=>rows.set(x.id,x));return [...rows.values()].map(r=>String(r.list_id).startsWith("math:")?{...r,list_name:String(r.list_name||"").replace(/\s*·\s*Mix\s*$/i,"")}:r).sort((a,b)=>new Date(b.started_at)-new Date(a.started_at))}
function formatLearningDuration(seconds){seconds=Math.max(0,Math.floor(seconds||0));const minutes=Math.floor(seconds/60);return minutes>=60?`${Math.floor(minutes/60)} u ${minutes%60} min`:`${minutes} min ${seconds%60} sec`}
function historyDate(value){return new Date(value).toLocaleString("nl-NL",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}
function quizPercent(row){return row.answered_count?Math.round(row.correct_count/row.answered_count*100):0}
function historyTrends(rows){return mathTimedCharts(rows)+accuracyChart(rows,true)+accuracyChart(rows,false)}
function historyPage(){
 const rows=allLearningRows().filter(r=>historyFilter==="Alle"||r.learner===historyFilter);
 const today=new Date().toDateString(),todayRows=rows.filter(r=>new Date(r.started_at).toDateString()===today);
 return `<button class="back" id="historyBack">‹ Terug naar alle woordenlijsten</button><h1>📊 Leerhistorie</h1><div class="history-filters">${["Alle",...Object.keys(LEARNERS)].map(k=>`<button class="btn" data-history-filter="${k}" aria-pressed="${historyFilter===k}">${k==="Alle"?"Alle":learnerLabel(k)}</button>`).join("")}</div><div class="history-refresh"><button class="btn" id="refreshHistory" ${historyLoading?"disabled":""}>↻ Vernieuwen</button><span class="history-feedback" role="status">${historyLoading?"Geschiedenis laden…":""}</span></div>${historyError?`<p class="history-feedback warning" role="alert">${esc(historyError)}</p>`:""}${historyPending.length?`<p class="history-feedback warning">${historyPending.length} ronde(n) wachten op synchronisatie. Klik op Vernieuwen om opnieuw te proberen.</p>`:""}<h2>Vandaag</h2><div class="history-stats"><div class="history-stat">Leertijd<strong>${formatLearningDuration(todayRows.reduce((sum,r)=>sum+r.duration_seconds,0))}</strong><small>Inclusief onvoltooide rondes</small></div><div class="history-stat">Afgeronde rondes<strong>${todayRows.filter(r=>r.status==="completed").length}</strong></div></div>${historyTrends(rows)}${wordInsightsPanel(rows)}<h2>Alle rondes</h2>${rows.length?rows.map(historyCard).join(""):`<div class="empty">${historyLoading?"Even geduld…":"Nog geen leerhistorie. Je volgende leerronde wordt hier opgeslagen."}</div>`}<p class="hint">Leren meet goede antwoorden. Beheerst bij Flashcards is je eigen inschatting, geen toetscijfer.</p>`
}
function historyCard(r){
 const incomplete=r.status!=="completed",quiz=r.mode==="mc",pending=historyPending.some(x=>x.id===r.id);
 const ratings=!quiz&&Array.isArray(r.word_results)&&r.word_results.length?r.word_results:null;
 const result=isTimedMathRecord(r)?`${r.answered_count} beantwoord · ${r.correct_count} goed${incomplete?" · voortijdig gestopt":" in 1 minuut"}`:ratings?Object.entries(String(r.list_id).startsWith("reading:")?READING_RATINGS:MEMORY_LEVELS).map(([level,info])=>info.icon+" "+ratings.filter(w=>w.result===level).length+" "+info.label).join(" · "):quiz?(r.answered_count?`${r.correct_count}/${r.answered_count} goed · ${quizPercent(r)}%${incomplete?" van de beantwoorde vragen":""}`:"Nog geen antwoorden"):`${r.known_count} beheerst · ${r.review_words.length} nog oefenen`;
 return `<article class="history-card"><div class="history-card-top"><span class="meta">${esc(historyDate(r.started_at))} · ${learnerLabel(r.learner)}</span><div class="history-card-actions"><span class="history-badge ${incomplete?"incomplete":""}">${incomplete?"Niet afgerond":"Afgerond"}${pending?" · Nog niet gesynchroniseerd":""}</span><button class="btn history-delete-button" data-delete-history="${esc(r.id)}" aria-label="Verwijder ${esc(r.list_name)}">🗑️ Verwijderen</button></div></div><h3>${esc(r.list_name)}</h3><p>${String(r.list_id).startsWith("reading:")?"📖 Hardop lezen":String(r.list_id).startsWith("geo:")?"🌍 Meander":String(r.list_id).startsWith("math:")?(String(r.list_id).startsWith("math:Max:")?"🏁 Automatiseren":"🏎️ Automatiseren"):quiz?"✅ Leren":"🧠 Flashcards"} · ${formatLearningDuration(r.duration_seconds)}</p><p><strong>${result}</strong></p><div class="meta">${r.answered_count} van ${r.total_words} ${String(r.list_id).startsWith("reading:")?"zinnen":/^(math|geo):/.test(String(r.list_id))?"opgaven":"woorden"} gedaan</div>${ratings?`<details><summary>Zelfbeoordeling ${String(r.list_id).startsWith("reading:")?"per zin":"per woord"}</summary>${String(r.list_id).startsWith("reading:")?readingGroups(ratings):memoryGroups(ratings)}</details>`:""}${!ratings&&r.review_words.length?`<details><summary>${quiz?"Foute antwoorden":"Nog oefenen"} (${r.review_words.length})</summary><ul>${r.review_words.map(w=>`<li><strong>${esc(w.term)}</strong> · ${esc(w.definition)}</li>`).join("")}</ul></details>`:""}</article>`
}
function historyHandlers(){
 document.querySelectorAll('[data-delete-history]').forEach(button=>button.onclick=()=>openHistoryDeletion(button.dataset.deleteHistory));
 document.getElementById("openHistory")?.addEventListener("click",()=>{state.view="history";render();loadLearningHistory()});
 document.getElementById("historyBack")?.addEventListener("click",()=>{state.view="home";render()});
 document.getElementById("refreshHistory")?.addEventListener("click",loadLearningHistory);
 document.querySelectorAll("[data-history-filter]").forEach(button=>button.onclick=()=>{historyFilter=button.dataset.historyFilter;render()})
}
function initializeLearningHistory(){
 const draft=readHistoryStorage(HISTORY_DRAFT_KEY,null);
 if(draft?.id){if(!historyPending.some(x=>x.id===draft.id))historyPending.push(draft);if(writeHistoryStorage(HISTORY_QUEUE_KEY,historyPending)){try{sessionStorage.removeItem(HISTORY_DRAFT_KEY)}catch(e){}}}
 syncLearningRecords();
 setInterval(checkpointLearning,5000);
 document.addEventListener("visibilitychange",checkpointLearning);
 window.addEventListener("pagehide",checkpointLearning);
 window.addEventListener("online",()=>{if(state.view==="history")loadLearningHistory();else syncLearningRecords()})
}
