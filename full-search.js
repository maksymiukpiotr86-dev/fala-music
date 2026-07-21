'use strict';

/* Full-track search layer. YouTube/SoundCloud are preferred; previews are fallback only. */
const fullSearchStyle=document.createElement('style');
fullSearchStyle.textContent=`
.full-search-banner{display:flex;align-items:center;gap:9px;margin:0 0 14px;padding:10px 12px;border:1px solid rgba(40,209,124,.2);border-radius:14px;background:rgba(40,209,124,.06);color:#b9f1d2;font-size:11px}
.full-search-banner:before{content:"✓";display:grid;place-items:center;width:23px;height:23px;border-radius:50%;background:rgba(40,209,124,.15);color:#66e5a3;font-weight:950}
.full-track-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border-radius:99px;background:rgba(40,209,124,.1);border:1px solid rgba(40,209,124,.18);color:#7ae8ac;font-size:9px;font-weight:950;letter-spacing:.55px}
.full-track-badge:before{content:"";width:6px;height:6px;border-radius:50%;background:#28d17c;box-shadow:0 0 10px rgba(40,209,124,.8)}
.full-search-connect{padding:18px;border:1px solid rgba(255,189,69,.2);border-radius:18px;background:rgba(255,189,69,.055)}
.full-search-connect h3{margin:0 0 7px}.full-search-connect p{margin:0 0 12px;color:#a9aeba;line-height:1.55;font-size:12px}
`;
document.head.appendChild(fullSearchStyle);

function parseIsoDuration(value=''){
 const match=String(value).match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
 if(!match)return 0;
 return (Number(match[1])||0)*86400+(Number(match[2])||0)*3600+(Number(match[3])||0)*60+(Number(match[4])||0);
}

function looksLikeExcerpt(title=''){
 return /\b(preview|teaser|trailer|snippet|shorts?|sample|zapowiedź|fragment|30\s*(?:sec|sek)|15\s*(?:sec|sek))\b/i.test(String(title));
}

function fullTrackScore(item){
 const title=String(item.title||'').toLowerCase();
 const channel=String(item.artist||'').toLowerCase();
 let score=0;
 if(/official\s*(audio|video)|music\s*video|oficjalny|lyrics?|tekst/.test(title))score+=7;
 if(/- topic$/.test(channel))score+=6;
 if(item.duration>=90&&item.duration<=600)score+=5;
 else if(item.duration>600)score+=2;
 if(/live|concert|mix|set|album/.test(title))score+=1;
 if(looksLikeExcerpt(title))score-=25;
 return score;
}

const previousMediaType=mediaType;
mediaType=function(track){
 if(track?.provider==='youtube'&&youtubeId(track.url||''))return{label:`PEŁNY UTWÓR${track.duration?` · ${formatTime(track.duration)}`:''}`,cls:'full'};
 if(track?.provider==='soundcloud'&&track.url)return{label:`PEŁNY UTWÓR${track.duration?` · ${formatTime(track.duration)}`:''}`,cls:'full'};
 return previousMediaType(track);
};

async function youtubeSearchFull(query){
 if(!youtubeToken)throw new Error('Połącz konto YouTube, aby wyszukiwać pełne utwory.');
 const searchParams=new URLSearchParams({
  part:'snippet',type:'video',videoEmbeddable:'true',videoSyndicated:'true',videoCategoryId:'10',
  maxResults:'35',q:query,regionCode:'PL',relevanceLanguage:'pl',safeSearch:'none'
 });
 const searchResponse=await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`,{
  headers:{Authorization:`Bearer ${youtubeToken}`}
 });
 if(searchResponse.status===401){disconnectYoutube(false);throw new Error('Sesja YouTube wygasła. Połącz konto ponownie.');}
 if(!searchResponse.ok)throw new Error('YouTube nie zwrócił wyników. Sprawdź konfigurację API.');
 const searchData=await searchResponse.json();
 const ids=(searchData.items||[]).map(item=>item.id?.videoId).filter(Boolean);
 if(!ids.length)return[];

 const detailParams=new URLSearchParams({part:'snippet,contentDetails,status',id:ids.join(',')});
 const detailResponse=await fetch(`https://www.googleapis.com/youtube/v3/videos?${detailParams}`,{
  headers:{Authorization:`Bearer ${youtubeToken}`}
 });
 if(!detailResponse.ok)throw new Error('Nie udało się sprawdzić długości utworów.');
 const detailData=await detailResponse.json();
 const details=new Map((detailData.items||[]).map(item=>[item.id,item]));

 const results=[];
 for(const searchItem of searchData.items||[]){
  const id=searchItem.id?.videoId;
  const detail=details.get(id);
  if(!id||!detail)continue;
  const duration=parseIsoDuration(detail.contentDetails?.duration||'');
  const title=decodeHtml(detail.snippet?.title||searchItem.snippet?.title||'');
  if(detail.status?.privacyStatus!=='public'||detail.status?.embeddable===false)continue;
  if(duration<55||looksLikeExcerpt(title))continue;
  results.push({
   id:`yt-${id}`,title,artist:decodeHtml(detail.snippet?.channelTitle||searchItem.snippet?.channelTitle||'YouTube'),
   provider:'youtube',url:`https://www.youtube.com/watch?v=${id}`,
   cover:detail.snippet?.thumbnails?.high?.url||detail.snippet?.thumbnails?.medium?.url||searchItem.snippet?.thumbnails?.high?.url||'',
   youtubeVideoId:id,duration,temporary:true,fullTrack:true
  });
 }
 return results.sort((a,b)=>fullTrackScore(b)-fullTrackScore(a)).slice(0,25);
}

youtubeSearch=youtubeSearchFull;

searchHelp=function(){
 if(activeProvider==='soundcloud')return'Wklej publiczny link SoundCloud. Fala uruchomi pełny utwór przez oficjalny widget, jeżeli autor na to pozwala.';
 return youtubeToken?'Wyniki są filtrowane do pełnych, publicznych filmów muzycznych, które YouTube oznacza jako możliwe do osadzenia. Podgląd jest używany tylko awaryjnie.':'Połącz YouTube w ustawieniach. Bez połączenia Fala nie pokaże 30-sekundowych wyników jako głównych rezultatów.';
};

renderSearch=function(query=''){
 const q=(query||'').trim();
 if(activeProvider!=='soundcloud')activeProvider='youtube';
 const target=currentPlaylist&&currentPlaylist!=='liked-songs'?currentPlaylist:(state.playlists.find(p=>p.id==='my-wave')?.id||state.playlists[0]?.id||'');
 $('#view').innerHTML=`<span class="eyebrow">PEŁNE WYSZUKIWANIE</span><h1 class="page-title">Znajdź cały utwór</h1><p class="subtitle">YouTube i SoundCloud jako pełne źródła. Krótkie podglądy są tylko planem awaryjnym.</p><div class="provider-tabs">${['youtube','soundcloud'].map(p=>`<button class="provider-tab ${activeProvider===p?'active':''}" style="--provider-color:${providerColor(p)}" data-provider-tab="${p}">${p==='youtube'?'YouTube · pełne':'SoundCloud · pełne'}</button>`).join('')}</div><div class="search-workspace"><div class="search-row"><input id="provider-query" value="${esc(q)}" placeholder="${activeProvider==='soundcloud'?'Wklej publiczny link SoundCloud':'Wpisz artystę i tytuł utworu'}"><select id="search-playlist">${state.playlists.map(p=>`<option value="${esc(p.id)}" ${p.id===target?'selected':''}>Dodaj do: ${esc(p.name)}</option>`).join('')}<option value="liked-songs">Dodaj do: Polubione</option></select><button class="primary-button" id="run-search">Szukaj pełnej wersji</button></div><p class="search-note">${searchHelp()}</p><div id="search-results" class="section"></div></div>`;
 runSearch(q);
};

runSearch=async function(q){
 const box=$('#search-results');
 if(!box)return;
 const query=(q||'').trim();
 if(query.length<2){box.innerHTML='<div class="empty-state"><h3>Wpisz wykonawcę i tytuł</h3><p>Na przykład: Kizo Lucky Punch albo Duran Duran Invisible.</p></div>';return;}

 if(activeProvider==='soundcloud'){
  if(validUrl(query)&&query.includes('soundcloud.com')){
   box.innerHTML='<div class="full-search-banner">Pełne źródło SoundCloud zostanie użyte przez oficjalny odtwarzacz.</div>'+resultGrid([{id:'sc-temp',title:'Pełny utwór SoundCloud',artist:'SoundCloud',provider:'soundcloud',url:query,cover:'',temporary:true,fullTrack:true}]);
  }else box.innerHTML='<div class="empty-state"><h3>Wklej link SoundCloud</h3><p>Wyszukiwanie nazw bez konta SoundCloud nie jest dostępne. Wklej publiczny adres konkretnego utworu.</p></div>';
  return;
 }

 if(!youtubeToken){
  box.innerHTML='<div class="full-search-connect"><h3>Połącz YouTube, aby wyszukiwać całe utwory</h3><p>Fala nie zastąpi pełnych wyników krótkimi fragmentami. Po połączeniu konta wyszuka publiczne filmy muzyczne możliwe do odtwarzania w aplikacji.</p><button class="primary-button" id="open-youtube-for-full">Połącz YouTube</button></div>';
  return;
 }

 const local=state.tracks.filter(t=>(t.provider==='youtube'||t.provider==='soundcloud')&&`${t.title} ${t.artist} ${(t.tags||[]).join(' ')}`.toLowerCase().includes(query.toLowerCase())).slice(0,12);
 box.innerHTML=`${local.length?`<div class="section-head"><div><h2>Pełne utwory w bibliotece</h2><p>${local.length} dopasowań</p></div></div>${resultGrid(local)}`:''}<div class="section-head" style="margin-top:25px"><div><h2>Pełne wyniki YouTube</h2><p>Sprawdzam długość i możliwość osadzenia…</p></div></div><div class="spinner"></div>`;
 const nonce=++searchNonce;
 try{
  const items=await youtubeSearchFull(query);
  if(nonce!==searchNonce||!$('#search-results'))return;
  box.innerHTML=`<div class="full-search-banner">Pokazuję publiczne filmy muzyczne dłuższe niż krótki fragment i oznaczone przez YouTube jako możliwe do osadzenia.</div>${local.length?`<div class="section-head"><div><h2>Pełne utwory w bibliotece</h2><p>${local.length} dopasowań</p></div></div>${resultGrid(local)}`:''}<div class="section-head" style="margin-top:25px"><div><h2>Pełne wyniki YouTube</h2><p>${items.length} wyników</p></div></div>${resultGrid(items)}`;
 }catch(error){box.innerHTML=`<div class="empty-state"><h3>Nie udało się pobrać pełnych wyników</h3><p>${esc(error.message||'Spróbuj ponownie.')}</p></div>`;}
};

resultCard=function(track,index){
 const payload=encodeURIComponent(JSON.stringify(track));
 const bg=track.cover?`style="background-image:url('${esc(track.cover).replace(/'/g,'%27')}')"`:'';
 const full=(track.provider==='youtube'||track.provider==='soundcloud')&&!!track.url;
 return`<article class="result-card" style="animation-delay:${Math.min(index*35,280)}ms"><button class="result-cover" ${bg} data-preview-result="${payload}"><span class="cover-play">▶</span>${track.cover?'':esc(initials(track.artist))}</button><div class="result-copy"><strong>${esc(track.title)}</strong><span>${esc(track.artist)}</span>${full?`<span class="full-track-badge">PEŁNY UTWÓR${track.duration?` · ${formatTime(track.duration)}`:''}</span>`:`<span class="media-badge muted">AWARYJNY PODGLĄD</span>`}<div class="result-actions"><button class="small-button" data-preview-result="${payload}">▶ ${full?'Odtwórz całość':'Odtwórz'}</button><button class="small-button accent" data-save-result="${payload}">＋ Dodaj</button>${track.provider==='youtube'&&youtubeToken?`<button class="small-button" data-save-youtube-result="${payload}">YouTube +</button>`:''}</div></div></article>`;
};

const previousFullSearchPlayTrack=playTrack;
playTrack=async function(track,options={}){
 if(track?.provider==='preview'&&youtubeToken&&!options.previewOnly){
  showPlayerNote?.('Szukam pełnej wersji na YouTube…',1800);
  try{
   const fullResults=await youtubeSearchFull(`${track.artist||''} ${track.title||''}`.trim());
   const full=fullResults[0];
   if(full){
    track.provider='youtube';track.url=full.url;track.youtubeVideoId=full.youtubeVideoId;
    track.duration=full.duration||track.duration;track.cover=track.cover||full.cover;track.fullTrack=true;
    save();
   }
  }catch{}
 }
 return previousFullSearchPlayTrack(track,options);
};

const previousLoadYoutubeProfile=loadYoutubeProfile;
loadYoutubeProfile=async function(){
 const result=await previousLoadYoutubeProfile();
 activeProvider='youtube';
 if(currentView==='search')renderSearch($('#global-search')?.value||$('#provider-query')?.value||'');
 return result;
};

document.addEventListener('click',event=>{
 if(event.target.closest('#run-search')){
  event.preventDefault();event.stopImmediatePropagation();
  const value=$('#provider-query')?.value||'';
  $('#global-search').value=value;
  runSearch(value);
  return;
 }
 if(event.target.closest('#open-youtube-for-full')){
  event.preventDefault();event.stopImmediatePropagation();openSettings();
 }
},true);

if(youtubeToken)activeProvider='youtube';
