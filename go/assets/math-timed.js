// One-minute rounds use a wall-clock deadline, including time spent in other tabs.
let mathTimedTimer=null;
function isTimedMathRecord(row){return /^math:[^:]+:timed60$/.test(String(row.list_id))}
function mathTimedPools(){
 return [...mathBank.weeks].sort((a,b)=>b.week-a.week).map(w=>({week:w.week,questions:[...new Map(w.days.flatMap(d=>d.questions).filter(q=>!q.unit).map(q=>[q.text,q])).values()]})).filter(w=>w.questions.length)
}
function mathTimedDraw(){
 const r=mathRound,pools=r.pools;
 let available=pools.map((p,i)=>({...p,weight:pools.length-i,questions:p.questions.filter(q=>!r.seen.has(q.text))})).filter(p=>p.questions.length);
 if(!available.length){r.seen.clear();available=pools.map((p,i)=>({...p,weight:pools.length-i,questions:p.questions.filter(q=>q.text!==r.current?.text)})).filter(p=>p.questions.length)}
 let pick=Math.random()*available.reduce((sum,p)=>sum+p.weight,0),pool=available.at(-1);
 for(const p of available){pick-=p.weight;if(pick<0){pool=p;break}}
 const question=pool.questions[Math.floor(Math.random()*pool.questions.length)];r.seen.add(question.text);return {...question,sourceWeek:pool.week}
}
function mathTimedStart(learner){
 const pools=mathTimedPools();if(!pools.length){alert("Geen hoofdrekensommen beschikbaar.");return}
 clearInterval(mathTimedTimer);stopSound();stopStudyMusic();clearCelebration();historyIndex=null;
 mathRound={timed:true,pools,seen:new Set(),results:[],draft:"",title:`Automatiseren · ${mathOwner} · Tijdtoets`,deadline:Date.now()+60000};
 mathRound.current=mathTimedDraw();state.mode="math";state.session={total:0,correct:0,review:[],finished:false,answered:false,learner};
 beginLearningRecord(learner,{id:`math:${mathOwner}:timed60`,name:mathRound.title},"mc");
 startStudyMusic();render();mathFocus();mathTimedTimer=setInterval(mathTimedTick,100)
}
function mathTimedTick(){
 if(!mathRound?.timed||state.session?.finished){clearInterval(mathTimedTimer);return}
 const seconds=Math.max(0,Math.ceil((mathRound.deadline-Date.now())/1000));
 if(!seconds){mathTimedFinish();return}
 const clock=document.getElementById("mathTimedClock");if(clock)clock.textContent=`⏱️ ${seconds} sec`;
 const progress=document.getElementById("mathTimedProgress");if(progress)progress.value=seconds
}
function mathTimedSubmit(){
 if(state.session.finished)return;
 if(Date.now()>=mathRound.deadline){mathTimedFinish();return}
 const value=mathRound.draft||"";if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))){document.getElementById("mathValidation").textContent="Vul eerst een antwoord in.";return}
 const q=mathRound.current,ok=Number(value)===q.answer;
 mathRound.results.push({...q,input:value,ok});state.session.total=mathRound.results.length;learningTracker.total_words=state.session.total;
 if(ok)state.session.correct++;else state.session.review.push({term:q.text,definition:`Jouw antwoord: ${value}; goed: ${q.answer}`});
 stopSound();playSound(ok?"correct":"wrong",.55);
 mathRound.current=mathTimedDraw();mathRound.draft="";checkpointLearning();render();mathFocus()
}
function mathTimedFinish(){
 if(!mathRound?.timed||state.session.finished)return;
 clearInterval(mathTimedTimer);clearCelebration();stopSound();stopStudyMusic();updateLearningClock();
 state.session.finished=true;state.session.total=mathRound.results.length;
 learningTracker.total_words=state.session.total;learningTracker.active_ms=60000;
 state.session.recordDuration=60;finalizeLearningRecord(true);startStudyMusic();render()
}
function mathTimedPage(){
 const r=mathRound,s=state.session,last=r.results.at(-1);
 if(s.finished)return `<div class="summary-radiance" aria-hidden="true"></div><div class="math-study summary math-summary">${mathAudioControls()}<div class="summary-finale"><div class="summary-fireworks" aria-hidden="true"><i class="firework finale-left"></i><i class="firework finale-top"></i><i class="firework finale-right"></i></div><h2>⏱️ Tijd is om!</h2></div><h2>${esc(r.title)}</h2><p class="math-score">${r.results.length} beantwoord · ${s.correct} goed</p><p>In 1 minuut · ${r.results.length?Math.round(s.correct/r.results.length*100):0}% goed</p>${recordSaveStatus()}${s.review.length?`<h3>Nog oefenen</h3><ul>${s.review.map(q=>`<li>${esc(q.term)} · ${esc(q.definition)}</li>`).join("")}</ul>`:""}<button class="btn primary" id="mathAgain">Nog een keer</button> <button class="btn" id="mathMenu">Terug naar Automatiseren</button></div>`;
 return `<div class="math-study"><div class="math-top learner-header"><div class="learner-header-left"><div class="learner-name">${learnerLabel(s.learner)}</div><button class="back" id="mathExit">‹ Afsluiten</button></div>${mathAudioControls()}</div><h2>${esc(r.title)}</h2><h3 id="mathTimedClock" role="timer">⏱️ ${Math.max(0,Math.ceil((r.deadline-Date.now())/1000))} sec</h3><progress id="mathTimedProgress" class="math-progress" max="60" value="${Math.max(0,(r.deadline-Date.now())/1000)}" aria-label="Resterende tijd"></progress><p>${r.results.length} beantwoord · ${s.correct} goed</p><form id="mathForm" novalidate><h3 class="math-question" id="mathQuestion">${esc(r.current.text)}</h3><label for="mathAnswer">Jouw antwoord</label>${mathKeypad(r.current,null)}<p id="mathValidation" role="alert"></p></form><p role="status">${last?`${last.ok?"✅ Juist":"❌ Fout"} · ${esc(last.text)} ${last.answer}${last.ok?"":` (jouw antwoord: ${esc(last.input)})`}`:"Bevestig je antwoord om meteen door te gaan."}</p></div>`
}
document.addEventListener("visibilitychange",()=>{if(mathRound?.timed&&!state.session?.finished)mathTimedTick()});
function mathTimedCharts(rows){
 const groups=new Map();
 rows.filter(r=>isTimedMathRecord(r)&&r.status==="completed").sort((a,b)=>new Date(a.started_at)-new Date(b.started_at)).forEach(r=>{const key=JSON.stringify([r.learner,r.list_id]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)});
 if(!groups.size)return `<section class="accuracy-panel"><h2>⏱️ Tijdtoets — 1 minuut</h2><p class="meta">Nog geen afgeronde tijdtoetsen.</p></section>`;
 return [...groups.values()].map(group=>{
  const data=group.slice(-60),top=Math.max(5,Math.ceil(Math.max(...data.map(r=>r.answered_count))/5)*5),x=i=>48+(data.length===1?260:i*520/(data.length-1)),y=n=>204-172*n/top;
  const title=`${learnerLabel(data[0].learner)} · ${data[0].list_name}`;
  return `<section class="accuracy-panel"><h2>⏱️ Tijdtoets — 1 minuut</h2><p>${esc(title)}</p><p class="meta">${data.length} afgeronde rondes · van oud naar nieuw</p><div class="accuracy-scroll"><svg class="accuracy-chart" viewBox="0 0 600 250" role="img" aria-label="Aantal beantwoorde en goede antwoorden in 1 minuut"><title>${esc(title)}</title>${Array.from({length:6},(_,i)=>top*i/5).map(v=>`<line x1="48" y1="${y(v)}" x2="568" y2="${y(v)}" stroke="#ffffff22"/><text x="40" y="${y(v)+4}" text-anchor="end">${v}</text>`).join("")}${[["answered_count","#cba6ff","Beantwoord"],["correct_count","#89ecb6","Goed"]].map(([key,color,label])=>`<polyline points="${data.map((r,i)=>`${x(i)},${y(r[key])}`).join(" ")}" fill="none" stroke="${color}" stroke-width="3"/>${data.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r[key])}" r="5" fill="${color}" tabindex="0"><title>${esc(historyDate(r.started_at))} · ${label}: ${r[key]}</title></circle>`).join("")}`).join("")}<text x="48" y="232">${esc(new Date(data[0].started_at).toLocaleDateString("nl-NL"))}</text><text x="568" y="232" text-anchor="end">${esc(new Date(data.at(-1).started_at).toLocaleDateString("nl-NL"))}</text></svg></div><div class="chart-legend"><span><i style="background:#cba6ff"></i>Beantwoord</span><span><i style="background:#89ecb6"></i>Goed</span></div><details><summary>Resultaten bekijken</summary><ul>${data.map(r=>`<li>${esc(historyDate(r.started_at))}: ${r.answered_count} beantwoord · ${r.correct_count} goed</li>`).join("")}</ul></details></section>`
 }).join("")
}
