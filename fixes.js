'use strict';

/* Wave Six playback repair layer.
   Loaded after app.js so existing library and playlist data remain untouched. */

const falaFixStyle=document.createElement('style');
falaFixStyle.textContent=`
.offscreen-player{position:fixed!important;left:-10000px!important;top:-10000px!important;width:2px!important;height:2px!important;min-width:0!important;min-height:0!important;opacity:0!important;pointer-events:none!important;border:0!important;overflow:hidden!important}
#seek.dragging{height:7px!important;filter:brightness(1.25)}
.player.playback-error{border-top-color:rgba(255,82,106,.55)}
.player.playback-loading .main-play{font-size:0}
.player.playback-loading .main-play:after{content:"";display:block;width:17px;height:17px;border:2px solid rgba(0,0,0,.25);border-top-color:#111;border-radius:50%;animation:spin .65s linear infinite}
.player-note{position:fixed;z-index:84;left:calc(var(--sidebar) + 18px);bottom:120px;max-width:min(460px,calc(100vw - 36px));padding:10px 13px;border:1px solid rgba(255,189,69,.24);border-radius:13px;background:rgba(18,20,27,.96);box-shadow:0 18px 50px rgba(0,0,0,.36);color:#f5d797;font-size:12px;line-height:1.45;opacity:0;transform:translateY(8px);pointer-events:none;transition:.2s}
.player-note.show{opacity:1;transform:none}
@media(max-width:940px){.player-note{left:14px;bottom:122px}}
`;
document.head.appendChild(falaFixStyle);

const falaPlayerNote=document.createElement('div');
falaPlayerNote.className='player-note';
falaPlayerNote.id='player-note';
document.body.appendChild(falaPlayerNote);

let falaUserSeeking=false;
let falaScPlaying=false;
let falaYoutubeReady=false;
let falaYoutubePending=null;
let falaPlaybackRequest=0;

function showPlayerNote(message,ms=3200){
 falaPlayerNote.textContent=message;
 falaPlayerNote.classList.add('show');
 clearTimeout(falaPlayerNote._timer);
 falaPlayerNote._timer=setTimeout(()=>falaPlayerNote.classList.remove('show'),ms);
}

function setPlayerLoading(loading){
 $('#player')?.classList.toggle('playback-loading',!!loading);
}

function resetTransport(){
 playbackPosition=0;
 playbackDuration=0;
 const seek=$('#seek');
 if(seek){seek.value=0;seek.style.setProperty('--progress','0%')}
 if($('#current-time'))$('#current-time').textContent='0:00';
 if($('#duration'))$('#duration').textContent='0:00';
 if($('#player-glow'))$('#player-glow').style.width='0%';
}

function safeUpdatePlayer(){
 try{updatePlayer()}catch{}
 const playing=fixedIsPlaying();
 if($('#play-pause'))$('#play-pause').textContent=playing?'❚❚':'▶';
 const coverPlay=$('#mini-cover .cover-play');
 if(coverPlay)coverPlay.textContent=playing?'❚❚':'▶';
}

function fixedIsPlaying(){
 if(playbackMode==='preview')return !$('#preview-audio').paused;
 if(playbackMode==='youtube'){
  try{return !!ytPlayer&&ytPlayer.getPlayerState()===YT.PlayerState.PLAYING}catch{return false}
 }
 if(playbackMode==='soundcloud')return falaScPlaying;
 return false;
}

isPlaying=fixedIsPlaying;

function fixedStopAll(){
 const audio=$('#preview-audio');
 try{audio.pause()}catch{}
 try{ytPlayer?.pauseVideo()}catch{}
 try{scWidget?.pause()}catch{}
 falaScPlaying=false;
}
stopAll=fixedStopAll;

function fixedPlayPreview(track,url){
 if(!track||!url)return;
 fixedStopAll();
 closeDrawer();
 const audio=$('#preview-audio');
 playbackMode='preview';
 $('#player')?.classList.remove('playback-error');
 setPlayerLoading(true);
 if(audio.src!==url)audio.src=url;
 audio.volume=state.settings.volume;
 playbackDuration=Number(track.duration)||0;
 audio.play().then(()=>{
  setPlayerLoading(false);
  safeUpdatePlayer();
 }).catch(()=>{
  setPlayerLoading(false);
  safeUpdatePlayer();
  showPlayerNote('Kliknij ▶ jeszcze raz, aby uruchomić podgląd. Przeglądarka zablokowała automatyczny start.');
 });
 safeUpdatePlayer();
}
playPreview=fixedPlayPreview;

async function ensureYoutubePlayer(){
 if(ytPlayer&&falaYoutubeReady)return ytPlayer;
 if(falaYoutubePending)return falaYoutubePending;
 falaYoutubePending=(async()=>{
  await loadYouTubeApi();
  if(ytPlayer)return ytPlayer;
  return new Promise((resolve,reject)=>{
   try{
    ytPlayer=new YT.Player('yt-player-host',{
     height:'2',width:'2',
     playerVars:{playsinline:1,origin:location.origin,rel:0,enablejsapi:1},
     events:{
      onReady:event=>{
       falaYoutubeReady=true;
       event.target.setVolume(Math.round(state.settings.volume*100));
       resolve(event.target);
       if(falaYoutubePendingVideo){
        const pending=falaYoutubePendingVideo;
        falaYoutubePendingVideo=null;
        event.target.loadVideoById({videoId:pending.id,startSeconds:pending.start});
        event.target.playVideo();
       }
      },
      onStateChange:event=>{
       if(event.data===YT.PlayerState.PLAYING){setPlayerLoading(false);$('#player')?.classList.remove('playback-error')}
       if(event.data===YT.PlayerState.ENDED)nextTrack();
       safeUpdatePlayer();
      },
      onError:()=>currentTrack&&fixedPlaybackFailure(currentTrack)
     }
    });
   }catch(error){reject(error)}
  });
 })().finally(()=>{falaYoutubePending=null});
 return falaYoutubePending;
}
let falaYoutubePendingVideo=null;

async function fixedPlayYouTube(track){
 const id=youtubeId(track?.url||'');
 if(!id)return fixedPlaybackFailure(track);
 fixedStopAll();
 closeDrawer();
 playbackMode='youtube';
 resetTransport();
 setPlayerLoading(true);
 safeUpdatePlayer();
 try{
  const player=await ensureYoutubePlayer();
  player.setVolume(Math.round(state.settings.volume*100));
  player.loadVideoById({videoId:id,startSeconds:youtubeStart(track.url)});
  player.playVideo();
  setTimeout(()=>{
   try{
    const stateNow=player.getPlayerState();
    if(stateNow!==YT.PlayerState.PLAYING&&stateNow!==YT.PlayerState.BUFFERING)showPlayerNote('YouTube nie rozpoczął automatycznie. Kliknij ▶ w dolnym pasku.');
   }catch{}
  },1700);
 }catch{
  fixedPlaybackFailure(track);
 }
}
playYouTube=fixedPlayYouTube;

async function fixedPlaybackFailure(track){
 const request=++falaPlaybackRequest;
 setPlayerLoading(true);
 $('#player')?.classList.add('playback-error');
 let preview='';
 try{preview=await ensurePreview(track)}catch{}
 if(request!==falaPlaybackRequest)return;
 setPlayerLoading(false);
 if(preview){
  showPlayerNote('YouTube nie pozwolił na odtwarzanie tutaj — przełączam na legalny podgląd.');
  fixedPlayPreview(track,preview);
 }else{
  playbackMode='idle';
  resetTransport();
  safeUpdatePlayer();
  showPlayerNote('Ten utwór nie ma działającego odtwarzania w aplikacji. Użyj przycisku „Źródło”, aby otworzyć oficjalną stronę.');
 }
}
handlePlaybackFailure=fixedPlaybackFailure;

function fixedPlaySoundCloud(track){
 if(!track?.url)return fixedPlaybackFailure(track);
 fixedStopAll();
 closeDrawer();
 resetTransport();
 playbackMode='soundcloud';
 setPlayerLoading(true);
 safeUpdatePlayer();
 const iframe=$('#sc-player-host');
 iframe.src=`https://w.soundcloud.com/player/?url=${encodeURIComponent(track.url)}&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=false`;
 const setup=()=>{
  if(!window.SC?.Widget){setTimeout(setup,250);return}
  try{
   scWidget=SC.Widget(iframe);
   scWidget.bind(SC.Widget.Events.READY,()=>{
    scWidget.setVolume(Math.round(state.settings.volume*100));
    scWidget.getDuration(ms=>{playbackDuration=(Number(ms)||0)/1000});
    scWidget.play();
   });
   scWidget.bind(SC.Widget.Events.PLAY,()=>{falaScPlaying=true;setPlayerLoading(false);safeUpdatePlayer()});
   scWidget.bind(SC.Widget.Events.PAUSE,()=>{falaScPlaying=false;safeUpdatePlayer()});
   scWidget.bind(SC.Widget.Events.PLAY_PROGRESS,event=>{playbackPosition=(event.currentPosition||0)/1000});
   scWidget.bind(SC.Widget.Events.FINISH,()=>{falaScPlaying=false;nextTrack()});
   scWidget.bind(SC.Widget.Events.ERROR,()=>fixedPlaybackFailure(track));
  }catch{fixedPlaybackFailure(track)}
 };
 setTimeout(setup,120);
}
playSoundCloud=fixedPlaySoundCloud;

async function fixedPlayTrack(track,options={}){
 if(!track)return;
 const saved=track.temporary?saveResult(track):track;
 currentTrack=saved;
 const visible=currentView==='liked'?state.likedIds.map(getTrack).filter(Boolean):currentView==='playlist'?playlistTracks(state.playlists.find(p=>p.id===currentPlaylist)):state.tracks;
 if(!currentQueue.length||!currentQueue.some(item=>item.id===saved.id))setQueue(visible,saved.id);
 else queueIndex=currentQueue.findIndex(item=>item.id===saved.id);
 state.recentIds=[saved.id,...state.recentIds.filter(id=>id!==saved.id)].slice(0,30);
 save();
 closeDrawer();
 closeMiniPanels();
 $('#player')?.classList.add('show');
 $('#player')?.classList.remove('playback-error');
 lyricsData=null;
 lyricsActive=-1;
 resetTransport();
 safeUpdatePlayer();
 const preview=saved.preview||saved.previewUrl;
 if(preview&&!options.forceFull)return fixedPlayPreview(saved,preview);
 if(saved.provider==='soundcloud'&&soundcloudUrl(saved))return fixedPlaySoundCloud(saved);
 if(saved.provider==='youtube'&&youtubeId(saved.url))return fixedPlayYouTube(saved);
 setPlayerLoading(true);
 const found=await ensurePreview(saved);
 setPlayerLoading(false);
 if(found)return fixedPlayPreview(saved,found);
 playbackMode='idle';
 safeUpdatePlayer();
 showPlayerNote('Brak odtwarzalnego źródła. Kliknij „Źródło”, aby wkleić oficjalny link.');
}
playTrack=fixedPlayTrack;

function fixedTogglePlayback(){
 if(!currentTrack)return;
 if(playbackMode==='preview'){
  const audio=$('#preview-audio');
  if(!audio.src){const url=currentTrack.preview||currentTrack.previewUrl;if(url)audio.src=url}
  if(audio.paused)audio.play().catch(()=>showPlayerNote('Nie udało się rozpocząć podglądu. Spróbuj ponownie.'));
  else audio.pause();
 }else if(playbackMode==='youtube'){
  try{ytPlayer.getPlayerState()===YT.PlayerState.PLAYING?ytPlayer.pauseVideo():ytPlayer.playVideo()}catch{fixedPlayYouTube(currentTrack)}
 }else if(playbackMode==='soundcloud'){
  try{scWidget.isPaused(paused=>paused?scWidget.play():scWidget.pause())}catch{fixedPlaySoundCloud(currentTrack)}
 }else fixedPlayTrack(currentTrack);
 safeUpdatePlayer();
}
togglePlayback=fixedTogglePlayback;

function fixedSeekTo(value){
 const ratio=clamp(Number(value)/1000,0,1);
 let duration=playbackDuration||0;
 if(playbackMode==='preview'){
  const audio=$('#preview-audio');
  duration=audio.duration||duration;
  if(duration)audio.currentTime=duration*ratio;
 }else if(playbackMode==='youtube'){
  try{duration=ytPlayer.getDuration()||duration;if(duration)ytPlayer.seekTo(duration*ratio,true)}catch{}
 }else if(playbackMode==='soundcloud'){
  try{if(duration)scWidget.seekTo(duration*1000*ratio)}catch{}
 }
 playbackPosition=duration*ratio;
 $('#current-time').textContent=formatTime(playbackPosition);
 $('#seek').style.setProperty('--progress',`${ratio*100}%`);
 $('#player-glow').style.width=`${ratio*100}%`;
 syncLyrics(playbackPosition);
}
seekTo=fixedSeekTo;

function fixedUpdateTicker(){
 let position=playbackPosition||0;
 let duration=playbackDuration||0;
 if(playbackMode==='preview'){
  const audio=$('#preview-audio');
  position=audio.currentTime||0;
  duration=Number.isFinite(audio.duration)?audio.duration:(duration||0);
 }else if(playbackMode==='youtube'){
  try{position=ytPlayer?.getCurrentTime()||0;duration=ytPlayer?.getDuration()||0}catch{}
 }else if(playbackMode==='soundcloud'&&scWidget){
  try{
   scWidget.getPosition(ms=>{playbackPosition=(Number(ms)||0)/1000});
   scWidget.getDuration(ms=>{playbackDuration=(Number(ms)||0)/1000});
  }catch{}
  position=playbackPosition||0;
  duration=playbackDuration||0;
 }
 playbackPosition=position;
 playbackDuration=duration;
 const percent=duration?clamp(position/duration*100,0,100):0;
 $('#current-time').textContent=formatTime(position);
 $('#duration').textContent=formatTime(duration);
 if(!falaUserSeeking){
  $('#seek').value=Math.round(percent*10);
  $('#seek').style.setProperty('--progress',`${percent}%`);
 }
 $('#player-glow').style.width=`${percent}%`;
 syncLyrics(position);
 safeUpdatePlayer();
}

clearInterval(ticker);
ticker=setInterval(fixedUpdateTicker,250);

/* Capture the controls before the original direct listeners.
   The mini cover now toggles playback instead of opening a drawer. */
document.addEventListener('click',event=>{
 if(event.target.closest('#mini-cover')){
  event.preventDefault();event.stopImmediatePropagation();
  fixedTogglePlayback();
  return;
 }
 if(event.target.closest('#play-pause')){
  event.preventDefault();event.stopImmediatePropagation();
  fixedTogglePlayback();
 }
},true);

document.addEventListener('pointerdown',event=>{
 if(event.target.id==='seek'){
  falaUserSeeking=true;
  event.target.classList.add('dragging');
 }
},true);

document.addEventListener('input',event=>{
 if(event.target.id==='seek'){
  event.stopImmediatePropagation();
  falaUserSeeking=true;
  fixedSeekTo(event.target.value);
 }
},true);

document.addEventListener('change',event=>{
 if(event.target.id==='seek'){
  event.stopImmediatePropagation();
  fixedSeekTo(event.target.value);
  falaUserSeeking=false;
  event.target.classList.remove('dragging');
 }
},true);

document.addEventListener('pointerup',event=>{
 if(event.target.id==='seek'){
  setTimeout(()=>{falaUserSeeking=false;event.target.classList.remove('dragging')},100);
 }
},true);

$('#preview-audio').addEventListener('playing',()=>{setPlayerLoading(false);safeUpdatePlayer()});
$('#preview-audio').addEventListener('waiting',()=>setPlayerLoading(true));
$('#preview-audio').addEventListener('canplay',()=>setPlayerLoading(false));
$('#preview-audio').addEventListener('error',()=>currentTrack&&fixedPlaybackFailure(currentTrack));

/* Prime the YouTube player before the first click. This keeps the first
   playback action tied to the user's click instead of a late iframe load. */
setTimeout(()=>ensureYoutubePlayer().catch(()=>{}),900);

safeUpdatePlayer();
