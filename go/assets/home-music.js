const HOME_TRACKS=[
 {name:"Homer let the Barts out",src:"assets/audio/flashcards-homer.mp3"},
 {name:"Lava Chichen",src:"assets/audio/lava-chichen.mp3"},
 {name:"Raining Tacos",src:"assets/audio/raining-tacos.mp3"},
 {name:"Peaches",src:"assets/audio/peaches.mp3"},
 {name:"Shooting Stars",src:"assets/audio/shooting-stars.mp3"},
 {name:"Brainrot Rap",src:"assets/audio/brainrot-rap.mp3"}
];
let homeAudio=null,homeTrack=0,homePlaying=false,homeStarting=false,homeGeneration=0;
let homeMotionRequested=false,homeMotionListening=false,homeMotionMessage="",homePlayMessage="";
let homeMotionLast=null,homeShakeHit=0,homeShakeCooldown=0;
function homeMusicMarkup(){return `<div class="home-music" aria-label="Muziekspeler"><div class="home-music-buttons"><button class="btn" id="homeMusicPlay" aria-pressed="false">▶️ Music</button><button class="btn" id="homeMusicPause" aria-label="Pauzeren" title="Pauzeren">⏸️</button><button class="btn" id="homeMusicNext" aria-label="Volgend nummer" title="Volgend nummer">⏭️</button></div></div>`}
function homeMusicUpdate(){
 const button=document.getElementById("homeMusicPlay");if(!button)return;
 button.setAttribute("aria-pressed",String(homePlaying));button.setAttribute("aria-busy",String(homeStarting));
 button.title=homePlayMessage||homeMotionMessage||"Afspelen · schud voor het volgende nummer";
 button.setAttribute("aria-label",homePlayMessage||"Muziek afspelen");
 document.getElementById("homeMusicPause").disabled=!homePlaying&&!homeStarting
}
function homeMusicAllowed(){return state.view==="home"&&!document.hidden&&!state.modal}
function homeMusicPause(){
 homeGeneration++;homePlaying=false;homeStarting=false;homePlayMessage="";homeMotionLast=null;homeShakeHit=0;
 if(homeAudio)homeAudio.pause();homeMusicUpdate()
}
function homeMusicPlay(){
 if(!homeMusicAllowed())return;
 const generation=++homeGeneration;
 if(!homeAudio){homeAudio=new Audio();homeAudio.preload="none";homeAudio.loop=true;
  homeAudio.addEventListener("error",()=>{homePlaying=false;homeStarting=false;homePlayMessage="Laden mislukt. Tik op ▶️ om opnieuw te proberen.";homeMusicUpdate()});
 }
 const src=HOME_TRACKS[homeTrack].src;
 if(homeAudio.dataset.track!==src){homeAudio.src=src;homeAudio.dataset.track=src}
 homeAudio.volume=MUSIC_LEVELS[audioSettings.musicLevel].volume;homeAudio.loop=true;
 homeStarting=true;homePlayMessage="";homeMusicUpdate();
 // Call play directly within the tap; do not await motion permission first.
 homeAudio.play().then(()=>{if(generation!==homeGeneration)return;if(!homeMusicAllowed()){homeMusicPause();return}homeStarting=false;homePlaying=true;homeMusicUpdate()}).catch(error=>{
  if(generation!==homeGeneration)return;homeStarting=false;homePlaying=false;
  homePlayMessage=error.name==="NotAllowedError"?"Tik op ▶️ om verder te spelen.":"Laden mislukt. Tik op ▶️ om opnieuw te proberen.";homeMusicUpdate()
 })
}
function homeMusicNext(){if(!homeMusicAllowed())return;homeTrack=(homeTrack+1)%HOME_TRACKS.length;homeMusicPlay()}
function homeMotionEnable(){
 if(homeMotionRequested)return;homeMotionRequested=true;
 if(!window.isSecureContext||!window.DeviceMotionEvent){homeMotionMessage="Gebruik ⏭️ om van nummer te wisselen.";homeMusicUpdate();return}
 const listen=()=>{if(!homeMotionListening){window.addEventListener("devicemotion",homeMotionHandler);homeMotionListening=true}homeMotionMessage="Schud voor het volgende nummer · of tik op ⏭️";homeMusicUpdate()};
 const denied=()=>{homeMotionMessage="Schudden niet beschikbaar. Gebruik ⏭️.";homeMusicUpdate()};
 try{if(typeof DeviceMotionEvent.requestPermission==="function")DeviceMotionEvent.requestPermission().then(result=>result==="granted"?listen():denied()).catch(denied);else listen()}catch(error){denied()}
}
function homeMotionHandler(event){
 if(!homePlaying||!homeMusicAllowed()){homeMotionLast=null;homeShakeHit=0;return}
 const a=event.accelerationIncludingGravity;if(!a||![a.x,a.y,a.z].every(Number.isFinite))return;
 const now=performance.now(),previous=homeMotionLast;homeMotionLast={x:a.x,y:a.y,z:a.z,at:now};
 if(!previous||now-previous.at>300||now<homeShakeCooldown)return;
 const delta=Math.hypot(a.x-previous.x,a.y-previous.y,a.z-previous.z);
 if(delta<15)return;
 if(homeShakeHit&&now-homeShakeHit<650){homeShakeHit=0;homeShakeCooldown=now+2000;homeMusicNext()}else homeShakeHit=now
}
function homeMusicHandlers(){
 if(!homeMusicAllowed()){if(homePlaying||homeStarting)homeMusicPause();return}
 document.getElementById("homeMusicPlay")?.addEventListener("click",()=>{if(!homePlaying&&!homeStarting)homeMusicPlay();homeMotionEnable()});
 document.getElementById("homeMusicPause")?.addEventListener("click",homeMusicPause);
 document.getElementById("homeMusicNext")?.addEventListener("click",()=>{homeMusicNext();homeMotionEnable()});homeMusicUpdate()
}
document.addEventListener("visibilitychange",()=>{if(document.hidden)homeMusicPause()});
window.addEventListener("pagehide",homeMusicPause);
