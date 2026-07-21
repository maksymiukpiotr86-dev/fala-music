'use strict';

/* Prevent invalid Google credentials from opening a broken OAuth window. */
const oauthGuardStyle=document.createElement('style');
oauthGuardStyle.textContent=`
.oauth-help{margin-top:12px;padding:13px 14px;border:1px solid rgba(255,189,69,.22);border-radius:14px;background:rgba(255,189,69,.065);color:#d8dbe3;font-size:11px;line-height:1.55}
.oauth-help strong{display:block;color:#ffd781;font-size:12px;margin-bottom:6px}
.oauth-help ol{margin:7px 0 0 18px;padding:0}.oauth-help li{margin:3px 0}
.oauth-help code{color:#ffcf72;background:rgba(0,0,0,.24);padding:2px 5px;border-radius:5px}
.oauth-help-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.oauth-help button{border:0;border-radius:99px;padding:8px 12px;background:#272c38;color:#eef0f5;font-weight:900;cursor:pointer}
.oauth-help button.primary{background:linear-gradient(135deg,#ffbd45,#ff5a2c);color:#190903}
#google-client-id.oauth-invalid{border-color:#ff526a!important;box-shadow:0 0 0 3px rgba(255,82,106,.1)!important}
#google-client-id.oauth-valid{border-color:#28d17c!important;box-shadow:0 0 0 3px rgba(40,209,124,.08)!important}
.oauth-validation{display:block;margin-top:6px;font-size:10px;color:#9aa0ad}.oauth-validation.bad{color:#ff8697}.oauth-validation.good{color:#63df9d}
`;
document.head.appendChild(oauthGuardStyle);

const oauthInput=document.querySelector('#google-client-id');
const oauthCard=oauthInput?.closest('.settings-card');
let oauthValidation=document.querySelector('#oauth-validation');
if(oauthInput&&!oauthValidation){
 oauthValidation=document.createElement('small');
 oauthValidation.id='oauth-validation';
 oauthValidation.className='oauth-validation';
 oauthValidation.textContent='Wklej identyfikator typu Web application kończący się na apps.googleusercontent.com.';
 oauthInput.parentElement.appendChild(oauthValidation);
}

if(oauthCard&&!document.querySelector('#oauth-help')){
 const help=document.createElement('div');
 help.id='oauth-help';
 help.className='oauth-help';
 help.innerHTML=`
  <strong>Jak utworzyć poprawny Client ID</strong>
  <ol>
   <li>W Google Cloud wybierz lub utwórz projekt.</li>
   <li>Włącz <b>YouTube Data API v3</b>.</li>
   <li>Otwórz <b>Google Auth Platform → Clients</b> i utwórz klienta typu <b>Web application</b>.</li>
   <li>W Authorized JavaScript origins dodaj <code>https://maksymiukpiotr86-dev.github.io</code>.</li>
   <li>Skopiuj tylko <b>Client ID</b> — nie Client secret ani API key.</li>
  </ol>
  <div class="oauth-help-actions"><button class="primary" id="open-google-clients">Otwórz Google Clients ↗</button><button id="clear-oauth-value">Wyczyść błędną wartość</button></div>`;
 oauthCard.appendChild(help);
}

function validGoogleClientId(value=''){
 return /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(String(value).trim());
}

function updateOauthValidation(){
 if(!oauthInput)return false;
 const value=oauthInput.value.trim();
 const valid=validGoogleClientId(value);
 oauthInput.classList.toggle('oauth-valid',!!value&&valid);
 oauthInput.classList.toggle('oauth-invalid',!!value&&!valid);
 if(oauthValidation){
  oauthValidation.className=`oauth-validation ${value?(valid?'good':'bad'):''}`;
  oauthValidation.textContent=!value?'Wklej identyfikator typu Web application kończący się na apps.googleusercontent.com.':valid?'Format Client ID wygląda poprawnie.':'To nie jest OAuth Client ID. Nie używaj tutaj API key ani Client secret.';
 }
 return valid;
}

const originalConnectYoutube=connectYoutube;
connectYoutube=function(){
 const value=oauthInput?.value.trim()||'';
 if(!validGoogleClientId(value)){
  updateOauthValidation();
  oauthInput?.focus();
  showPlayerNote?.('Nieprawidłowy Google OAuth Client ID. Musi kończyć się na apps.googleusercontent.com.',4200);
  return;
 }
 return originalConnectYoutube();
};

oauthInput?.addEventListener('input',updateOauthValidation);
document.addEventListener('click',event=>{
 if(event.target.closest('#save-and-connect'))updateOauthValidation();
 if(event.target.closest('#open-google-clients')){
  event.preventDefault();event.stopImmediatePropagation();
  window.open('https://console.cloud.google.com/auth/clients','_blank','noopener');
 }
 if(event.target.closest('#clear-oauth-value')){
  event.preventDefault();event.stopImmediatePropagation();
  oauthInput.value='';
  state.settings.googleClientId='';
  save();
  updateOauthValidation();
  oauthInput.focus();
 }
},true);

setTimeout(updateOauthValidation,50);
