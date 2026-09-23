let readingCapture=null,readingCaptureToken=0,readingRecordMessage="",readingMicStream=null;
function readingPractice(){const r=readingRound;if(!r)return null;const id=r.sentences[r.index].id;return (r.practice||(r.practice={}))[id]||((r.practice[id])={heard:false,replayed:false,url:null})}
function readingReady(){return !!(readingPractice()?.replayed&&!readingCapture)}
function readingMicClose(){readingMicStream?.getTracks().forEach(t=>t.stop());readingMicStream=null}
function readingChallenge(c,text){
 const words=text.trim().split(/\s+/).length,required=Math.max(450,Math.min(2400,words*110));
 if(c.voiced<required||c.elapsed<Math.max(1000,words*130))return {passed:false,message:"We hoorden te weinig geluid. Lees de hele zin rustig hardop en probeer opnieuw."};
 const activity=c.voiced/Math.max(c.elapsed,1),score=Math.round(70+20*Math.min(1,c.voiced/(required*2))+10*Math.min(1,activity/.55));
 return {passed:true,score,message:c.clipped>c.frames*.15?"Goed geoefend! Houd de microfoon iets verder weg en luister terug.":"Goed bezig! Luister je opname terug en kies een kleur."}
}
function readingCaptureRelease(c){clearInterval(c.timer);clearTimeout(c.limit);c.stream?.getTracks().forEach(t=>{t.enabled=false});c.context?.close().catch(()=>{})}
function readingCaptureCancel(){readingCaptureToken++;const c=readingCapture;readingCapture=null;if(c){c.cancelled=true;if(c.recorder?.state==="recording")c.recorder.stop();readingCaptureRelease(c)}readingMicClose()}
function readingRecordDispose(){readingCaptureCancel();for(const p of Object.values(readingRound?.practice||{}))if(p.url)URL.revokeObjectURL(p.url);readingRecordMessage=""}
function readingSyncRatings(){const r=readingRound;state.session.wordResults=r.sentences.filter(q=>r.ratings[q.id]).map(q=>({word_id:q.id,term:q.nl,definition:q.zh,result:r.ratings[q.id]}));state.session.known=state.session.wordResults.filter(q=>q.result==="green").length;state.session.review=state.session.wordResults.filter(q=>q.result!=="green")}
async function readingRecordStart(){
 if(readingCapture||state.session?.finished||!readingPractice()?.heard)return;
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder||!(window.AudioContext||window.webkitAudioContext)){readingRecordMessage="Opnemen werkt hier niet. Open de HTTPS-website in Safari of Chrome met een microfoon.";render();return}
 readingStop();stopSound();stopStudyMusic();homeMusicPause();readingRecordMessage="";
 const token=++readingCaptureToken,c={pending:true,cancelled:false};readingCapture=c;render();
 try{
  c.context=new (window.AudioContext||window.webkitAudioContext)();await c.context.resume();
  const stream=readingMicStream?.getAudioTracks().some(t=>t.readyState==="live")?readingMicStream:await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
  if(token!==readingCaptureToken||document.hidden){stream.getTracks().forEach(t=>t.stop());readingCaptureRelease(c);return}
  readingMicStream=stream;c.stream=stream;stream.getAudioTracks().forEach(t=>{t.enabled=true});
  const mime=["audio/webm;codecs=opus","audio/mp4","audio/webm"].find(t=>MediaRecorder.isTypeSupported(t));
  c.recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
  const analyser=c.context.createAnalyser();analyser.fftSize=2048;c.context.createMediaStreamSource(stream).connect(analyser);const samples=new Float32Array(analyser.fftSize);
  const p=readingPractice(),r=readingRound,id=r.sentences[r.index].id;
  if(p.url)URL.revokeObjectURL(p.url);p.url=null;p.replayed=false;p.challenge=null;delete r.ratings[id];readingSyncRatings();checkpointLearning();
  c.chunks=[];c.voiced=0;c.frames=0;c.clipped=0;c.started=performance.now();c.pending=false;
  c.recorder.ondataavailable=e=>{if(e.data.size)c.chunks.push(e.data)};
  c.recorder.onerror=()=>{if(readingCapture!==c)return;readingCaptureCancel();readingRecordMessage="Opnemen is mislukt. Probeer opnieuw.";render()};
  c.recorder.onstop=()=>{
   readingCaptureRelease(c);if(c.cancelled||token!==readingCaptureToken)return;readingCapture=null;
   const blob=new Blob(c.chunks,{type:c.recorder.mimeType});
   const result=readingChallenge(c,r.sentences[r.index].nl);
   if(!blob.size||!result.passed){readingRecordMessage=result.message||"Opnemen is mislukt. Probeer opnieuw."}
   else{p.url=URL.createObjectURL(blob);p.challenge=result;readingRecordMessage=result.message}
   render()
  };
  c.recorder.start();c.timer=setInterval(()=>{analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length);c.frames++;if(samples.some(v=>Math.abs(v)>.98))c.clipped++;if(rms>.008)c.voiced+=50;const el=document.getElementById("readingRecordTime");if(el)el.textContent=`🔴 ${Math.floor((performance.now()-c.started)/1000)} sec`},50);
  c.limit=setTimeout(readingRecordStop,60000);render()
 }catch(error){
  readingCaptureRelease(c);if(token!==readingCaptureToken)return;readingCapture=null;
  readingRecordMessage=error.name==="NotAllowedError"?"Sta microfoontoegang toe in je browser en probeer opnieuw.":"Geen werkende microfoon gevonden. Controleer je microfoon en probeer opnieuw.";render()
 }
}
function readingRecordStop(){const c=readingCapture;if(!c||c.pending||c.recorder.state!=="recording")return;c.elapsed=performance.now()-c.started;c.pending=true;clearInterval(c.timer);clearTimeout(c.limit);c.recorder.stop();render()}
function readingReplay(){
 const p=readingPractice();if(!p?.url||readingCapture)return;
 readingStop();stopSound();const token=readingGeneration;readingAudio=new Audio(p.url);readingAudio.volume=MUSIC_LEVELS[audioSettings.musicLevel].volume;
 readingAudio.onended=()=>{if(token!==readingGeneration)return;p.replayed=true;readingRecordMessage="Kies hoe het lezen ging.";render()};
 readingAudio.play().catch(()=>{if(token!==readingGeneration)return;readingRecordMessage="Afspelen lukt niet. Tik opnieuw op Mijn opname.";render()})
}
function readingRecordPanel(){const p=readingPractice();return `<div class="reading-recorder"><p class="hint">1. Luister → 2. Lees en neem op → 3. Luister terug → 4. Kies een kleur</p><div class="reading-parts"><button class="btn primary" id="readingRecord" ${!p.heard||readingCapture?.pending?"disabled":""}>${readingCapture?(readingCapture.pending?"Even wachten…":"⏹️ Stoppen"):p.url?"🎙️ Opnieuw opnemen":"🎙️ Opnemen"}</button><button class="btn" id="readingReplay" ${!p.url||readingCapture?"disabled":""}>▶️ Mijn opname</button><span id="readingRecordTime" role="status">${readingCapture&&!readingCapture.pending?"🔴 Opnemen…":""}</span></div><p role="status">${esc(readingRecordMessage||(!p.heard?"Luister eerst de voorbeeldzin helemaal af.":!p.url?"Lees nu zelf de hele zin hardop.":p.replayed?"Kies een kleur.":"Luister eerst je eigen opname helemaal terug."))}</p>${p.challenge?`<p class="reading-challenge" role="status">⭐ Oefenscore: ${p.challenge.score}/100</p><p class="hint">Voor je oefeninzet, niet voor je uitspraak. We controleren niet welke woorden je zegt.</p>`:""}<p class="hint">Je opname blijft alleen tijdens deze oefenronde op dit apparaat.</p></div>`}
function readingRecordHandlers(){document.getElementById("readingRecord")?.addEventListener("click",()=>readingCapture?readingRecordStop():readingRecordStart());document.getElementById("readingReplay")?.addEventListener("click",readingReplay)}
document.addEventListener("visibilitychange",()=>{if(document.hidden){readingCaptureCancel();if(state.view==="reading"&&!state.session?.finished){readingRecordMessage="Terug? Luister of neem opnieuw op om verder te gaan.";render()}}});
window.addEventListener("pagehide",readingCaptureCancel);
