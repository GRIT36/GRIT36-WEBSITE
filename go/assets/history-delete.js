let historyDeleteDialog=null;
function closeHistoryDeletion(){historyDeleteDialog?.remove();historyDeleteDialog=null;document.querySelector('[data-delete-history]')?.focus()}
async function openHistoryDeletion(id){
 const row=allLearningRows().find(r=>r.id===id);if(!row||historyDeleteDialog)return;
 const overlay=document.createElement('div');historyDeleteDialog=overlay;overlay.className='modal-overlay';
 overlay.innerHTML=`<div class="modal history-delete-modal" role="dialog" aria-modal="true" aria-labelledby="historyDeleteTitle"><h2 id="historyDeleteTitle">Record verwijderen</h2><p>${esc(row.list_name)} · ${learnerLabel(row.learner)}</p><p class="hint">Dit verwijdert de ronde voor alle apparaten. Dit kan niet ongedaan worden gemaakt.</p><div id="deleteChallenge" class="delete-challenge" aria-label="Verificatie"></div><form id="historyDeleteForm"><label for="historyDeleteAnswer">Welke vier cijfers horen hierbij, in dezelfde volgorde?</label><input id="historyDeleteAnswer" type="text" inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9]{4}" disabled><p id="historyDeleteStatus" role="status">Verificatie laden…</p><div class="modal-actions"><button type="button" class="btn" id="cancelHistoryDelete">Annuleren</button><button type="submit" class="btn history-delete-confirm" id="confirmHistoryDelete" disabled>Verwijderen</button></div></form></div>`;
 document.body.appendChild(overlay);
 const status=overlay.querySelector('#historyDeleteStatus'),input=overlay.querySelector('input'),button=overlay.querySelector('#confirmHistoryDelete');let challenge=null,busy=false;
 overlay.querySelector('#cancelHistoryDelete').onclick=()=>{if(!busy)closeHistoryDeletion()};overlay.querySelector('#cancelHistoryDelete').focus();
 overlay.onkeydown=e=>{if(e.key==='Escape'&&!busy)closeHistoryDeletion();if(e.key==='Tab'){const focusable=[...overlay.querySelectorAll('button,input')].filter(x=>!x.disabled),first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};
 try{
  await syncLearningRecords();
  if(historyPending.some(r=>r.id===id))throw Error('unsynced');
  const {data,error}=await db.rpc('request_history_deletion',{p_record_id:id});if(error)throw error;
  if(historyDeleteDialog!==overlay)return;
  if(data?.status==='missing'){status.textContent='Deze ronde bestaat niet meer. Vernieuw de geschiedenis.';return}
  if(data?.status!=='ready')throw Error('challenge unavailable');
  challenge=data.challenge_id;overlay.querySelector('#deleteChallenge').textContent=[...data.prompt].join('　');input.disabled=false;button.disabled=false;status.textContent='Vul de vier cijfers in om te verwijderen.';input.focus();
 }catch(e){if(historyDeleteDialog===overlay)status.textContent='Verificatie niet beschikbaar. Controleer de verbinding en of het V1.058-databasescript is uitgevoerd. Er is niets verwijderd.'}
 overlay.querySelector('form').onsubmit=async e=>{
  e.preventDefault();if(busy||!challenge)return;
  const answer=input.value.trim();if(!/^[0-9]{4}$/.test(answer)){status.textContent='Vul precies vier cijfers in.';return}
  busy=true;button.disabled=true;input.disabled=true;overlay.querySelector('#cancelHistoryDelete').disabled=true;status.textContent='Antwoord controleren…';
  try{
   const {data,error}=await db.rpc('confirm_history_deletion',{p_challenge_id:challenge,p_answer:answer});if(error)throw error;
   if(data?.status==='deleted'&&data.record_id===id){
    historyRows=historyRows.filter(r=>r.id!==id);historyPending=historyPending.filter(r=>r.id!==id);writeHistoryStorage(HISTORY_QUEUE_KEY,historyPending);
    closeHistoryDeletion();if(state.view==='history'){render();loadLearningHistory()}return;
   }
   if(data?.status==='expired'){challenge=null;status.textContent='Verificatie verlopen. Sluit dit venster en probeer opnieuw.'}
   else{status.textContent='Niet juist. De ronde is niet verwijderd. Probeer opnieuw.';input.value=''}
  }catch(e){status.textContent='Verwijderen kon niet worden bevestigd. Controleer de verbinding en vernieuw de geschiedenis.'}
  finally{busy=false;if(historyDeleteDialog===overlay){button.disabled=!challenge;input.disabled=!challenge;overlay.querySelector('#cancelHistoryDelete').disabled=false;if(challenge)input.focus()}}
 }
}
