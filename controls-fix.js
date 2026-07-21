'use strict';

/* Wave Six control repair — loaded after app.js and fixes.js. */

const controlRepairStyle=document.createElement('style');
controlRepairStyle.textContent=`
.player{isolation:isolate}
.player-glow{pointer-events:none!important;z-index:0!important}
.now-playing,.transport,.player-tools{position:relative!important;z-index:3!important;pointer-events:auto!important}
.mini-cover{position:relative!important;width:62px!important;height:62px!important;min-width:62px!important;max-width:62px!important;flex:0 0 62px!important;inset:auto!important}
.now-copy{position:relative!important;z-index:4!important;pointer-events:none!important}
.title-line{display:flex!important;align-items:center!important;gap:7px!important;min-width:0!important}
.mini-duration-prefix{flex:0 0 auto;color:#ffcf72;font-size:11px;font-weight:950;font-variant-numeric:tabular-nums;padding:3px 6px;border:1px solid rgba(255,189,69,.2);border-radius:7px;background:rgba(255,189,69,.07)}
#mini-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#shuffle.active-control,#repeat.active-control{color:#ffbd45!important;background:rgba(255,189,69,.12)!important;box-shadow:0 0 0 1px rgba(255,189,69,.2) inset}
#volume,#seek{pointer-events:auto!important;position:relative!important;z-index:5!important}

.source-sheet{position:fixed;z-index:96;left:calc(var(--sidebar) + 18px);right:18px;bottom:120px;max-width:760px;margin-left:auto;border:1px solid rgba(255,255,255,.11);border-radius:22px;background:rgba(15,17,23,.985);box-shadow:0 30px 90px rgba(0,0,0,.58);backdrop-filter:blur(24px);opacity:0;transform:translateY(22px) scale(.985);pointer-events:none;transition:.24s cubic-bezier(.2,.8,.2,1);overflow:hidden}
.source-sheet.open{opacity:1;transform:none;pointer-events:auto}
.source-sheet-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025)}
.source-sheet-head strong{display:block;font-size:15px}.source-sheet-head span{display:block;color:#8f95a3;font-size:10px;margin-top:3px}
.source-sheet-close{width:32px;height:32px;border:0;border-radius:50%;background:rgba(255,255,255,.06);color:#bbc0ca;cursor:pointer;font-size:18px}
.source-sheet-body{padding:14px}
.source-choice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.source-choice{border:1px solid rgba(255,255,255,.09);border-radius:15px;padding:12px;text-align:left;background:#151821;color:#e8e9ee;cursor:pointer;transition:.18s}
.source-choice:hover,.source-choice.active{transform:translateY(-2px);border-color:var(--provider-color);background:color-mix(in srgb,var(--provider-color) 13%,#151821)}
.source-choice b{display:flex;align-items:center;gap:7px;font-size:13px}.source-choice b:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--provider-color);box-shadow:0 0 12px var(--provider-color)}
.source-choice small{display:block;color:#9399a7;font-size:10px;line-height:1.35;margin-top:5px}
.source-link-row{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:12px}
.source-link-row input{width:100%;min-width:0;border:1px solid rgba(255,255,255,.09);background:#0c0e13;color:#f5f5f8;padding:11px 12px;border-radius:12px;outline:0}
.source-link-row input:focus{border-color:rgba(255,90,44,.65);box-shadow:0 0 0 3px rgba(255,90,44,.08)}
.source-sheet-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px}
.source-current{margin-right:auto;color:#9298a6;font-size:10px;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.compact-action{border:0;border-radius:99px;padding:9px 13px;background:#242936;color:#e6e7ec;font-size:11px;font-weight:900;cursor:pointer}
.compact-action.primary{background:linear-gradient(135deg,#ffbd45,#ff5a2c);color:#170803}
.compact-action:disabled{opacity:.4;cursor:not-allowed}
@media(max-width:940px){.source-sheet{left:12px;right:12px;bottom:113px;max-width:none}.source-choice-grid{grid-template-columns:1fr}.source-choice small{display:none}}
`;
document.head.appendChild(controlRepairStyle);

const titleLine=document.querySelector('.title-line');
let miniDuration=document.querySelector('#mini-duration-prefix');
if(titleLine&&!miniDuration){
 miniDuration=document.createElement('span');
 miniDuration.id='mini-duration-prefix';
 miniDuration.className='mini-duration-prefix';
 miniDuration.textContent='—:—';
 titleLine.insertBefore(miniDuration,document.querySelector('#mini-title'));
}

const sourceSheet=document.createElement('section');
sourceSheet.id='source-sheet';
sourceSheet.className='source-sheet';
sourceSheet.setAttribute('aria-hidden','true');
sourceSheet.innerHTML=`
 <header class="source-sheet-head">
  <div><strong>Wybierz źródło</strong><span>Pełne odtwarzanie jest preferowane, gdy dostawca pozwala na osadzenie.</span></div>
  <button class="source-sheet-close" id="source-sheet-close" title="Zamknij">×</button>
 </header>
 <div class="source-sheet-body">
  <div class="source-choice-grid">
   <button class="source-choice active" style="--provider-color:#ff4545" data-compact-provider="youtube"><b>YouTube</b><small>Pełny utwór, gdy film pozwala na osadzenie.</small></button>
   <button class="source-choice" style="--provider-color:#ff7a21" data-compact-provider="soundcloud"><b>SoundCloud</b><small>Publiczny link przez oficjalny odtwarzacz.</small></button>
   <button class="source-choice" style="--provider-color:#1ed760" data-compact-provider="spotify"><b>Spotify</b><small>Oficjalny link; pełne odtwarzanie zależy od Spotify.</small></button>
  </div>
  <div class="source-link-row"><input id="compact-source-url" placeholder="Wklej oficjalny link YouTube"><button class="compact-action primary" id="compact-save-source">Użyj linku</button></div>
  <div class="source-sheet-actions"><span class="source-current" id="source-current">Brak wybranego utworu</span><button class="compact-action primary" id="source-play-full">▶ Odtwórz pełną wersję</button><button class="compact-action" id="source-open-official">Otwórz oficjalnie ↗</button></div>
 </div>`;
document.body.appendChild(sourceSheet);

let compactProvider='youtube';

function sourceProviderFromUrl(url=''){
 const value=String(url).toLowerCase();
 if(value.includes('soundcloud.com'))return'soundcloud';
 if(value.includes('spotify.com'))return'spotify';
 if(value.includes('youtube.com')||value.includes('youtu.be'))return'youtube';
 return compactProvider;
}

function closeCompactSource(){
 sourceSheet.classList.remove('open');
 sourceSheet.setAttribute('aria-hidden','true');
}

function renderCompactSource(){
 const input=document.querySelector('#compact-source-url');
 const current=document.querySelector('#source-current');
 const full=document.querySelector('#source-play-full');
 const open=document.querySelector('#source-open-official');
 document.querySelectorAll('[data-compact-provider]').forEach(button=>button.classList.toggle('active',button.dataset.compactProvider===compactProvider));
 const placeholders={youtube:'Wklej oficjalny link YouTube',soundcloud:'Wklej publiczny link SoundCloud',spotify:'Wklej oficjalny link Spotify'};
 if(input){input.placeholder=placeholders[compactProvider];input.value=currentTrack?.url&&sourceProviderFromUrl(currentTrack.url)===compactProvider?currentTrack.url:''}
 if(current)current.textContent=currentTrack?`${formatTime(playbackDuration||currentTrack.duration||0)} · ${currentTrack.artist} — ${currentTrack.title}`:'Brak wybranego utworu';
 const playable=!!currentTrack&&(compactProvider==='youtube'?!!youtubeId(currentTrack.url||''):compactProvider==='soundcloud'?currentTrack.provider==='soundcloud'&&!!currentTrack.url:false);
 if(full){full.disabled=!currentTrack;full.textContent=compactProvider==='spotify'?'Otwórz w Spotify':'▶ Odtwórz pełną wersję'}
 if(open)open.disabled=!currentTrack?.url;
}

function openCompactSource(){
 if(!currentTrack){showPlayerNote('Najpierw wybierz utwór.');return}
 closeDrawer();
 compactProvider=sourceProviderFromUrl(currentTrack.url||'');
 renderCompactSource();
 sourceSheet.classList.add('open');
 sourceSheet.setAttribute('aria-hidden','false');
}

function playSelectedFullSource(){
 if(!currentTrack)return;
 const url=currentTrack.url||'';
 if(compactProvider==='youtube'&&youtubeId(url)){closeCompactSource();return fixedPlayYouTube(currentTrack)}
 if(compactProvider==='soundcloud'&&currentTrack.provider==='soundcloud'&&url){closeCompactSource();return fixedPlaySoundCloud(currentTrack)}
 if(compactProvider==='spotify'&&url.includes('spotify.com'))return window.open(url,'_blank','noopener');
 showPlayerNote(`Wklej link ${compactProvider==='youtube'?'YouTube':compactProvider==='soundcloud'?'SoundCloud':'Spotify'}, aby użyć tego źródła.`);
}

/* Prefer a legal full provider source before a 30-second preview. */
async function fullFirstPlayTrack(track,options={}){
 if(!track)return;
 const saved=track.temporary?saveResult(track):track;
 currentTrack=saved;
 const visible=currentView==='liked'?state.likedIds.map(getTrack).filter(Boolean):currentView==='playlist'?playlistTracks(state.playlists.find(p=>p.id===currentPlaylist)):state.tracks;
 if(!currentQueue.length||!currentQueue.some(item=>item.id===saved.id))setQueue(visible,saved.id);else queueIndex=currentQueue.findIndex(item=>item.id===saved.id);
 state.recentIds=[saved.id,...state.recentIds.filter(id=>id!==saved.id)].slice(0,30);
 save();closeDrawer();closeCompactSource();closeMiniPanels();
 document.querySelector('#player')?.classList.add('show');
 document.querySelector('#player')?.classList.remove('playback-error');
 lyricsData=null;lyricsActive=-1;resetTransport();safeUpdatePlayer();
 if(options.previewOnly){const preview=saved.preview||saved.previewUrl||await ensurePreview(saved);return preview?fixedPlayPreview(saved,preview):showPlayerNote('Brak podglądu dla tego utworu.')}
 if(saved.provider==='youtube'&&youtubeId(saved.url||''))return fixedPlayYouTube(saved);
 if(saved.provider==='soundcloud'&&saved.url)return fixedPlaySoundCloud(saved);
 const preview=saved.preview||saved.previewUrl||await ensurePreview(saved);
 if(preview)return fixedPlayPreview(saved,preview);
 playbackMode='idle';safeUpdatePlayer();showPlayerNote('Brak odtwarzalnego źródła. Otwórz „Źródło” i wklej oficjalny link.');
}
playTrack=fullFirstPlayTrack;

function refreshControlState(){
 const shuffle=document.querySelector('#shuffle');
 const repeat=document.querySelector('#repeat');
 if(shuffle){shuffle.textContent='🔀';shuffle.title='Losowe odtwarzanie';shuffle.classList.toggle('active-control',!!state.settings.shuffle)}
 if(repeat)repeat.classList.toggle('active-control',!!state.settings.repeat);
 if(miniDuration)miniDuration.textContent=playbackDuration?formatTime(playbackDuration):(currentTrack?.duration?formatTime(currentTrack.duration):'—:—');
}

const previousSafeUpdate=safeUpdatePlayer;
safeUpdatePlayer=function(){previousSafeUpdate();refreshControlState()};

const previousTicker=fixedUpdateTicker;
fixedUpdateTicker=function(){previousTicker();refreshControlState();renderCompactSourceIfOpen()};
clearInterval(ticker);ticker=setInterval(fixedUpdateTicker,250);

function renderCompactSourceIfOpen(){if(sourceSheet.classList.contains('open'))renderCompactSource()}

function handlePlayerControl(event){
 const inside=event.target.closest('#player');
 if(!inside)return false;
 const control=event.target.closest('button,input');
 if(!control){event.preventDefault();event.stopImmediatePropagation();return true}
 const id=control.id;
 if(control.tagName==='INPUT')return false;
 event.preventDefault();event.stopImmediatePropagation();
 if(id==='play-pause'||id==='mini-cover')fixedTogglePlayback();
 else if(id==='previous')previousTrack();
 else if(id==='next')nextTrack();
 else if(id==='shuffle'){state.settings.shuffle=!state.settings.shuffle;save();refreshControlState();showPlayerNote(state.settings.shuffle?'Losowe odtwarzanie włączone.':'Losowe odtwarzanie wyłączone.')}
 else if(id==='repeat'){state.settings.repeat=!state.settings.repeat;save();refreshControlState();showPlayerNote(state.settings.repeat?'Powtarzanie włączone.':'Powtarzanie wyłączone.')}
 else if(id==='mini-like'&&currentTrack)toggleLike(currentTrack.id);
 else if(id==='lyrics-button'){closeCompactSource();if(currentTrack)openDrawer('lyrics');else showPlayerNote('Najpierw wybierz utwór.')}
 else if(id==='source-button')openCompactSource();
 else if(id==='expand-player'){closeCompactSource();if(currentTrack)openDrawer('player')}
 else if(id==='mute')applyVolume(state.settings.volume>0?0:(state.settings.lastVolume||.78));
 return true;
}

document.addEventListener('click',event=>{
 if(handlePlayerControl(event))return;
 const provider=event.target.closest('[data-compact-provider]');
 if(provider){event.preventDefault();event.stopImmediatePropagation();compactProvider=provider.dataset.compactProvider;renderCompactSource();return}
 if(event.target.closest('#source-sheet-close')){event.preventDefault();event.stopImmediatePropagation();closeCompactSource();return}
 if(event.target.closest('#compact-save-source')){
  event.preventDefault();event.stopImmediatePropagation();
  if(!currentTrack)return;
  const input=document.querySelector('#compact-source-url');const url=input.value.trim();
  if(!validUrl(url))return showPlayerNote('Wklej prawidłowy oficjalny link.');
  const providerName=sourceProviderFromUrl(url);
  if(providerName!==compactProvider)return showPlayerNote('Ten link nie pasuje do wybranego dostawcy.');
  currentTrack.url=url;currentTrack.provider=providerName;save();renderCompactSource();showPlayerNote('Źródło zapisane.');return;
 }
 if(event.target.closest('#source-play-full')){event.preventDefault();event.stopImmediatePropagation();playSelectedFullSource();return}
 if(event.target.closest('#source-open-official')){event.preventDefault();event.stopImmediatePropagation();if(currentTrack?.url)window.open(currentTrack.url,'_blank','noopener');return}
 if(sourceSheet.classList.contains('open')&&!event.target.closest('#source-sheet')&&!event.target.closest('#source-button'))closeCompactSource();
},true);

document.addEventListener('input',event=>{
 if(event.target.id==='volume'){
  event.stopImmediatePropagation();
  applyVolume(Number(event.target.value)/100);
  return;
 }
},true);

document.addEventListener('change',event=>{
 if(event.target.id==='volume'){
  event.stopImmediatePropagation();
  applyVolume(Number(event.target.value)/100);
 }
},true);

/* Add known duration before track titles in list rows. */
function decorateTrackDurations(){
 document.querySelectorAll('.track-row[data-track-id]').forEach(row=>{
  if(row.querySelector('.track-duration-prefix'))return;
  const track=getTrack(row.dataset.trackId);const title=row.querySelector('.track-copy strong');
  if(!title)return;
  const span=document.createElement('span');span.className='track-duration-prefix';span.textContent=track?.duration?formatTime(track.duration):'—:—';
  span.style.cssText='display:inline-block;margin-right:7px;color:#8f95a3;font-size:10px;font-weight:850;font-variant-numeric:tabular-nums';
  title.parentNode.insertBefore(span,title);
 });
}
const durationObserver=new MutationObserver(decorateTrackDurations);
if(document.querySelector('#view'))durationObserver.observe(document.querySelector('#view'),{childList:true,subtree:true});
decorateTrackDurations();
refreshControlState();
closeDrawer();
