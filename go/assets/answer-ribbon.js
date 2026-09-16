let answerRibbon=null,answerRibbonTimer=null,answerRibbonOwner=null,answerRibbonQuestion=null;
function ribbonQuestion(){return state.view==="geography"?geoRound?.index:state.view==="math"?mathRound?.index:state.session?.queue?.[0]?.id}
function clearAnswerRibbon(){clearTimeout(answerRibbonTimer);answerRibbon?.remove();answerRibbon=null;answerRibbonOwner=null}
function checkAnswerRibbon(){if(answerRibbon&&(answerRibbonOwner!==state.session||state.session?.finished||!["study","math","geography"].includes(state.view)||answerRibbonQuestion!==ribbonQuestion()||(state.view==="study"&&historyIndex!==null)))clearAnswerRibbon()}
function showAnswerRibbon(correct){
 clearAnswerRibbon();answerRibbonOwner=state.session;answerRibbonQuestion=ribbonQuestion();
 answerRibbon=document.createElement("div");answerRibbon.className="answer-ribbon-layer";
 const banner=document.createElement("div");banner.className="answer-ribbon "+(correct?"is-right":"is-wrong");banner.setAttribute("role","status");banner.textContent=correct?"juist":"fout";answerRibbon.appendChild(banner);document.body.appendChild(answerRibbon);
 const header=document.querySelector(["math","geography"].includes(state.view)?".math-progress":".session-top");
 if(header)banner.style.top=Math.max(0,header.getBoundingClientRect().bottom-banner.offsetHeight)+"px";
 answerRibbonTimer=setTimeout(clearAnswerRibbon,2600)
}
