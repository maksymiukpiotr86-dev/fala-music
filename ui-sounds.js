'use strict';

/* Refined procedural UI sounds. No downloaded audio assets are used. */
const UI_SOUND_KEY='fala-ui-sounds-v1';
let uiSoundSettings={enabled:true,volume:.28};
try{uiSoundSettings={...uiSoundSettings,...JSON.parse(localStorage.getItem(UI_SOUND_KEY)||'{}')}}catch{}

let uiAudioContext=null;
let uiMasterGain=null;
let uiLastTick=0;
let uiPointerStart=null;

const uiSoundStyle=document.createElement('style');
uiSoundStyle.textContent=`
.ui-sound-card{position:relative;overflow:hidden}
.ui-sound-card:before{content:"";position:absolute;width:170px;height:170px;right:-70px;top:-90px;border-radius:50%;background:radial-gradient(circle,rgba(140,92,255,.25),transparent 68%);pointer-events:none}
.ui-sound-head{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.ui-sound-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(135deg,#8c5cff,#ff5a6f);box-shadow:0 12px 30px rgba(140,92,255,.22);font-size:20px}
.ui-sound-head h3{margin:0}.ui-sound-head p{margin:4px 0 0;color:#969ba9;font-size:11px;line-height:1.45}
.ui-sound-controls{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;margin-top:12px}
.ui-sound-toggle,.ui-sound-test{border:0;border-radius:99px;padding:9px 13px;font-weight:900;cursor:pointer;transition:.18s}
.ui-sound-toggle{background:linear-gradient(135deg,#ffbd45,#ff5a2c);color:#1a0903}.ui-sound-toggle.off{background:#262b37;color:#a7adb9}
.ui-sound-test{background:#262b37;color:#edf0f5}
.ui-sound-toggle:hover,.ui-sound-test:hover{transform:translateY(-2px);filter:brightness(1.08)}
.ui-sound-range{display:grid;grid-template-columns:1fr 42px;gap:8px;align-items:center;min-width:150px}
.ui-sound-range input{width:100%;accent-color:#ff7d42}.ui-sound-value{font-size:10px;color:#ffcf72;font-weight:900;text-align:right;font-variant-numeric:tabular-nums}
.ui-sound-hint{display:block;margin-top:10px;color:#747b89;font-size:10px;line-height:1.45}
@media(max-width:620px){.ui-sound-controls{grid-template-columns:1fr 1fr}.ui-sound-range{grid-column:1/-1}}
`;
document.head.appendChild(uiSoundStyle);

function saveUiSoundSettings(){
 try{localStorage.setItem(UI_SOUND_KEY,JSON.stringify(uiSoundSettings))}catch{}
 if(uiMasterGain)uiMasterGain.gain.value=uiSoundSettings.enabled?uiSoundSettings.volume:0;
 renderUiSoundControls();
}

function ensureUiAudio(){
 if(!uiAudioContext){
  const AudioCtor=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtor)return null;
  uiAudioContext=new AudioCtor();
  uiMasterGain=uiAudioContext.createGain();
  uiMasterGain.gain.value=uiSoundSettings.enabled?uiSoundSettings.volume:0;
  uiMasterGain.connect(uiAudioContext.destination);
 }
 if(uiAudioContext.state==='suspended')uiAudioContext.resume().catch(()=>{});
 return uiAudioContext;
}

function uiTone({from=520,to=from,duration=.06,gain=.16,type='sine',delay=0,pan=0}={}){
 const context=ensureUiAudio();
 if(!context||!uiSoundSettings.enabled)return;
 const start=context.currentTime+delay;
 const oscillator=context.createOscillator();
 const envelope=context.createGain();
 const panner=context.createStereoPanner?context.createStereoPanner():null;
 oscillator.type=type;
 oscillator.frequency.setValueAtTime(Math.max(30,from),start);
 oscillator.frequency.exponentialRampToValueAtTime(Math.max(30,to),start+duration);
 envelope.gain.setValueAtTime(.0001,start);
 envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),start+.008);
 envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
 if(panner){panner.pan.value=Math.max(-1,Math.min(1,pan));oscillator.connect(envelope).connect(panner).connect(uiMasterGain)}
 else oscillator.connect(envelope).connect(uiMasterGain);
 oscillator.start(start);
 oscillator.stop(start+duration+.025);
}

function uiNoise({duration=.09,gain=.055,frequency=1100,delay=0,pan=0}={}){
 const context=ensureUiAudio();
 if(!context||!uiSoundSettings.enabled)return;
 const frameCount=Math.max(1,Math.floor(context.sampleRate*duration));
 const buffer=context.createBuffer(1,frameCount,context.sampleRate);
 const data=buffer.getChannelData(0);
 for(let i=0;i<frameCount;i++)data[i]=(Math.random()*2-1)*(1-i/frameCount);
 const source=context.createBufferSource();
 const filter=context.createBiquadFilter();
 const envelope=context.createGain();
 const panner=context.createStereoPanner?context.createStereoPanner():null;
 const start=context.currentTime+delay;
 source.buffer=buffer;
 filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.75;
 envelope.gain.setValueAtTime(.0001,start);
 envelope.gain.exponentialRampToValueAtTime(gain,start+.008);
 envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
 source.connect(filter).connect(envelope);
 if(panner){panner.pan.value=Math.max(-1,Math.min(1,pan));envelope.connect(panner).connect(uiMasterGain)}else envelope.connect(uiMasterGain);
 source.start(start);source.stop(start+duration+.02);
}

function playUiSound(name='click'){
 if(!uiSoundSettings.enabled)return;
 switch(name){
  case'click':uiTone({from:620,to:470,duration:.045,gain:.11,type:'triangle'});break;
  case'open':uiNoise({duration:.11,gain:.04,frequency:1250});uiTone({from:330,to:610,duration:.11,gain:.11,type:'sine'});break;
  case'close':uiTone({from:590,to:310,duration:.09,gain:.10,type:'sine'});break;
  case'add':uiTone({from:430,to:510,duration:.07,gain:.12,type:'triangle'});uiTone({from:650,to:820,duration:.10,gain:.12,type:'triangle',delay:.055});break;
  case'like':uiTone({from:520,to:620,duration:.08,gain:.13,type:'sine'});uiTone({from:780,to:930,duration:.13,gain:.11,type:'sine',delay:.055});break;
  case'unlike':uiTone({from:690,to:410,duration:.11,gain:.10,type:'triangle'});break;
  case'play':uiTone({from:270,to:520,duration:.11,gain:.14,type:'triangle'});break;
  case'pause':uiTone({from:520,to:270,duration:.085,gain:.11,type:'triangle'});break;
  case'next':uiNoise({duration:.12,gain:.05,frequency:1450,pan:.65});uiTone({from:430,to:700,duration:.10,gain:.09,pan:.55});break;
  case'previous':uiNoise({duration:.12,gain:.05,frequency:1450,pan:-.65});uiTone({from:700,to:430,duration:.10,gain:.09,pan:-.55});break;
  case'success':uiTone({from:440,to:520,duration:.07,gain:.11});uiTone({from:660,to:790,duration:.11,gain:.11,delay:.06});break;
  case'error':uiTone({from:190,to:145,duration:.16,gain:.11,type:'sawtooth'});break;
  case'tick':uiTone({from:880,to:760,duration:.022,gain:.035,type:'square'});break;
  case'swipe-left':uiNoise({duration:.16,gain:.055,frequency:1200,pan:-.75});uiTone({from:640,to:360,duration:.13,gain:.07,pan:-.65});break;
  case'swipe-right':uiNoise({duration:.16,gain:.055,frequency:1200,pan:.75});uiTone({from:360,to:640,duration:.13,gain:.07,pan:.65});break;
 }
}

function insertUiSoundCard(){
 const scroll=document.querySelector('.settings-scroll');
 if(!scroll||document.querySelector('#ui-sound-card'))return;
 const card=document.createElement('article');
 card.id='ui-sound-card';card.className='settings-card ui-sound-card';
 card.innerHTML=`
  <div class="ui-sound-head"><span class="ui-sound-icon">♫</span><div><h3>Dźwięki interfejsu</h3><p>Subtelne efekty dla kliknięć, polubień, dodawania, przesuwania i sterowania odtwarzaczem.</p></div></div>
  <div class="ui-sound-controls">
   <button class="ui-sound-toggle" id="ui-sound-toggle">Efekty włączone</button>
   <div class="ui-sound-range"><input id="ui-sound-volume" type="range" min="0" max="100" value="28" aria-label="Głośność efektów"><span class="ui-sound-value" id="ui-sound-value">28%</span></div>
   <button class="ui-sound-test" id="ui-sound-test">Test</button>
  </div>
  <small class="ui-sound-hint">Efekty nie zmieniają głośności muzyki. Możesz je całkowicie wyłączyć.</small>`;
 const soundCloud=scroll.querySelector('.soundcloud-card');
 if(soundCloud?.nextSibling)scroll.insertBefore(card,soundCloud.nextSibling);else scroll.appendChild(card);
 card.querySelector('#ui-sound-toggle').addEventListener('click',()=>{
  uiSoundSettings.enabled=!uiSoundSettings.enabled;saveUiSoundSettings();
  if(uiSoundSettings.enabled)playUiSound('success');
 });
 card.querySelector('#ui-sound-volume').addEventListener('input',event=>{
  uiSoundSettings.volume=Math.max(0,Math.min(1,Number(event.target.value)/100));
  saveUiSoundSettings();
 });
 card.querySelector('#ui-sound-volume').addEventListener('change',()=>playUiSound('success'));
 card.querySelector('#ui-sound-test').addEventListener('click',()=>playUiSound('like'));
 renderUiSoundControls();
}

function renderUiSoundControls(){
 const toggle=document.querySelector('#ui-sound-toggle');
 const range=document.querySelector('#ui-sound-volume');
 const value=document.querySelector('#ui-sound-value');
 if(toggle){toggle.textContent=uiSoundSettings.enabled?'Efekty włączone':'Efekty wyłączone';toggle.classList.toggle('off',!uiSoundSettings.enabled)}
 if(range)range.value=String(Math.round(uiSoundSettings.volume*100));
 if(value)value.textContent=`${Math.round(uiSoundSettings.volume*100)}%`;
}

function classifyUiTarget(target){
 if(!target?.closest)return'';
 const like=target.closest('[data-like-track],#mini-like');
 if(like)return String(like.textContent||'').includes('♥')?'unlike':'like';
 if(target.closest('[data-add-track],[data-save-result],[data-save-youtube-result],#confirm-create-playlist,#quick-create-playlist,#compact-save-source'))return'add';
 if(target.closest('#next'))return'next';
 if(target.closest('#previous'))return'previous';
 if(target.closest('#play-pause,#mini-cover,[data-play-track],[data-preview-result]'))return String(target.closest('button')?.textContent||'').includes('❚❚')?'pause':'play';
 if(target.closest('#lyrics-button,#source-button,#expand-player,#account-settings,#youtube-connect-top,[data-open-create]'))return'open';
 if(target.closest('.drawer-close,.panel-close,#source-sheet-close'))return'close';
 if(target.closest('button,.playlist-card,.artist-card,.provider-tab,.playlist-nav button'))return'click';
 return'';
}

window.addEventListener('pointerdown',event=>{
 uiPointerStart={x:event.clientX,y:event.clientY,time:performance.now(),target:event.target};
 if(event.button!==undefined&&event.button>0)return;
 const effect=classifyUiTarget(event.target);
 if(effect)playUiSound(effect);
},true);

window.addEventListener('pointerup',event=>{
 if(!uiPointerStart)return;
 const dx=event.clientX-uiPointerStart.x;
 const dy=event.clientY-uiPointerStart.y;
 const elapsed=performance.now()-uiPointerStart.time;
 const beganOnRange=uiPointerStart.target?.matches?.('input[type="range"]');
 if(!beganOnRange&&elapsed<850&&Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25){
  playUiSound(dx>0?'swipe-right':'swipe-left');
 }
 uiPointerStart=null;
},true);

window.addEventListener('input',event=>{
 if(!event.target?.matches?.('#seek,#volume'))return;
 const now=performance.now();
 if(now-uiLastTick>85){uiLastTick=now;playUiSound('tick')}
},true);

insertUiSoundCard();
renderUiSoundControls();
