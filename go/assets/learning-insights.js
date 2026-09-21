const MEMORY_LEVELS={red:{label:"Nog oefenen",icon:"🔴"},yellow:{label:"Bijna",icon:"🟡"},green:{label:"Beheerst",icon:"🟢"}};
function recordWordResult(word,result){
 const s=state.session;if(!s||!word)return;
 if(!s.wordResults)s.wordResults=[];
 if(s.wordResults.some(r=>r.word_id===String(word.id)))return;
 s.wordResults.push({word_id:String(word.id),term:word.term,definition:word.definition||"",result,at:new Date().toISOString()})
}
function rateFlashcard(level){
 const s=state.session;if(historyIndex!==null||!s||s.finished||!s.queue.length)return;
 rememberQuestion();const word=s.queue.shift();recordWordResult(word,level);
 if(level==="green")s.known++;else s.review.push(word);
 playSound(level==="green"?"correct":level==="red"?"flashcardHuh":"review");s.flip=false;finishIf(s);render()
}
function memoryGroups(results){
 return `<div class="memory-groups">${Object.entries(MEMORY_LEVELS).map(([level,info])=>{const words=results.filter(w=>w.result===level);return `<section class="memory-group memory-${level}"><h3>${info.icon} ${info.label} · ${words.length}</h3>${words.length?`<ul>${words.map(w=>`<li><strong>${esc(w.term)}</strong>${w.definition?` · ${esc(w.definition)}`:""}</li>`).join("")}</ul>`:`<p class="meta">Geen woorden</p>`}</section>`}).join("")}</div>`
}
function accuracyChart(rows,math){
 const data=rows.filter(r=>!isTimedMathRecord(r)&&!String(r.list_id).startsWith("geo:")&&r.mode==="mc"&&r.status==="completed"&&r.total_words>0&&String(r.list_id).startsWith("math:")===math).sort((a,b)=>new Date(a.started_at)-new Date(b.started_at)||a.id.localeCompare(b.id)).slice(-60);
 const heading=math?"🏎️ Automatiseren — nauwkeurigheid":"✅ Leren — nauwkeurigheid";
 if(!data.length)return `<section class="accuracy-panel"><h2>${heading}</h2><p class="meta">Nog geen afgeronde toetsen.</p></section>`;
 const groups=new Map(),colors=["#e9b4ff","#79dfff","#ffc96b","#89ecb6","#ff9dc3","#c4caff"];
 const x=i=>48+(data.length===1?260:i*520/(data.length-1)),y=r=>204-172*r.correct_count/r.total_words;
 data.forEach((r,i)=>{const key=JSON.stringify([r.learner,r.list_id]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({r,i})});
 const series=[...groups.values()];
 return `<section class="accuracy-panel"><h2>${heading}</h2><p class="meta">Laatste ${data.length} afgeronde toetsen · van oud naar nieuw. Elke lijn is één persoon en één ${math?"oefening":"woordenlijst"}.</p><div class="accuracy-scroll"><svg class="accuracy-chart" viewBox="0 0 600 250" role="img" aria-label="${heading}"><title>${heading}, 0 tot 100 procent</title>${[0,25,50,75,100].map(v=>`<line x1="48" y1="${204-v*1.72}" x2="568" y2="${204-v*1.72}" stroke="#ffffff22"/><text x="40" y="${208-v*1.72}" text-anchor="end">${v}%</text>`).join("")}${series.map((group,gi)=>`<polyline points="${group.map(({r,i})=>`${x(i)},${y(r)}`).join(" ")}" fill="none" stroke="${colors[gi%colors.length]}" stroke-width="3" ${gi>=colors.length?'stroke-dasharray="6 4"':""}/>${group.map(({r,i})=>`<circle tabindex="0" cx="${x(i)}" cy="${y(r)}" r="5" fill="${colors[gi%colors.length]}"><title>${esc(learnerLabel(r.learner))} · ${esc(r.list_name)} · ${esc(historyDate(r.started_at))} · ${quizPercent(r)}% (${r.correct_count}/${r.total_words})</title></circle>`).join("")}`).join("")}<text x="48" y="232">${esc(new Date(data[0].started_at).toLocaleDateString("nl-NL"))}</text><text x="568" y="232" text-anchor="end">${esc(new Date(data.at(-1).started_at).toLocaleDateString("nl-NL"))}</text></svg></div><div class="chart-legend">${series.map((group,i)=>`<span><i style="background:${colors[i%colors.length]}"></i>${learnerLabel(group[0].r.learner)} · ${esc(group[0].r.list_name)}</span>`).join("")}</div><details><summary>Resultaten bekijken</summary><ul>${data.map(r=>`<li>${esc(historyDate(r.started_at))} · ${learnerLabel(r.learner)} · ${esc(r.list_name)}: ${quizPercent(r)}% (${r.correct_count}/${r.total_words})</li>`).join("")}</ul></details></section>`
}
function wordInsights(rows){
 const words=new Map();
 const sorted=[...rows].filter(r=>!/^(math|geo):/.test(String(r.list_id))&&r.list_name?.trim()!=="🚀Test🚀").sort((a,b)=>new Date(a.started_at)-new Date(b.started_at)||String(a.id).localeCompare(String(b.id)));
 for(const row of sorted){
  const seen=new Set();
  for(const result of Array.isArray(row.word_results)?row.word_results:[]){
   if(!result.term||!['red','yellow','green','correct','wrong'].includes(result.result))continue;
   const key=JSON.stringify([row.learner,result.term.trim().toLocaleLowerCase('nl'),(result.definition||'').trim()]);if(seen.has(key))continue;seen.add(key);
   if(!words.has(key))words.set(key,{key,learner:row.learner,term:result.term,definition:result.definition||'',red:0,yellow:0,green:0,correct:0,wrong:0,sessions:0,since:new Set(),riskRed:0,riskWrong:0,streak:0,latest:'',lastAt:''});
   const w=words.get(key);w.sessions++;w[result.result]++;w.latest=result.result;w.lastAt=result.at||row.ended_at||row.started_at;w.since.add(row.id);
   if(result.result==='red'||result.result==='wrong'){if(result.result==='red')w.riskRed++;else w.riskWrong++;w.streak=0}
   else if(result.result==='correct')w.streak++;else w.streak=0;
   // A green self-rating or two consecutive correct tests clears old difficulty.
   if(result.result==='green'||w.streak>=2){w.since.clear();w.riskRed=0;w.riskWrong=0}
  }
 }
 return [...words.values()]
}
function difficultWords(words){return words.filter(w=>w.since.size>=3&&w.riskRed+w.riskWrong>=3).sort((a,b)=>(b.riskRed+b.riskWrong)-(a.riskRed+a.riskWrong)||b.riskWrong-a.riskWrong||new Date(b.lastAt)-new Date(a.lastAt)||a.term.localeCompare(b.term,'nl')).slice(0,15)}
function wordInsightsPanel(rows){
 const words=wordInsights(rows),hard=difficultWords(words);
 return `<section class="word-insights"><h2>🎯 Extra oefenen</h2><p class="hint">Maximaal 15 woorden. Minstens 3 oefenrondes én 3 fouten/rode beoordelingen sinds de laatste beheersing. Groen of twee goede Leren-antwoorden achter elkaar haalt een woord uit deze lijst.</p>${hard.length?`<ol class="difficult-words">${hard.map(w=>`<li><strong>${esc(w.term)}</strong><span class="meta">${learnerLabel(w.learner)} · ${esc(w.definition)}</span><span>${w.riskWrong}× fout bij Leren · ${w.riskRed}× rood</span></li>`).join("")}</ol>`:`<p>Nog geen woorden die extra herhaling nodig hebben op basis van voldoende resultaten.</p>`}<h2>🧠 Per woord</h2><p class="hint">Flashcards zijn een zelfbeoordeling, geen toetscijfer. Oude rondes bevatten nog geen volledige woorddetails; deze analyse begint bij nieuwe rondes.</p>${words.length?`<details><summary>Bekijk ${words.length} woordbeoordelingen</summary><div class="word-analysis-table"><table><thead><tr><th>Woord / leerling</th><th>Leren goed</th><th>🔴</th><th>🟡</th><th>🟢</th><th>Laatste resultaat</th></tr></thead><tbody>${words.sort((a,b)=>a.term.localeCompare(b.term,'nl')).map(w=>`<tr><td><strong>${esc(w.term)}</strong><small>${learnerLabel(w.learner)} · ${esc(w.definition)}</small></td><td>${w.correct+w.wrong?`${w.correct}/${w.correct+w.wrong} (${Math.round(100*w.correct/(w.correct+w.wrong))}%)`:"—"}</td><td>${w.red}</td><td>${w.yellow}</td><td>${w.green}</td><td>${MEMORY_LEVELS[w.latest]?MEMORY_LEVELS[w.latest].icon+' '+MEMORY_LEVELS[w.latest].label:w.latest==='correct'?'✅ Juist':'❌ Fout'}</td></tr>`).join("")}</tbody></table></div></details>`:`<p class="meta">Nog geen nieuwe woordbeoordelingen.</p>`}</section>`
}
