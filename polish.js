'use strict';

/* Fala Music visual polish. This file only adds presentation and never mutates library data. */
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  function installWaves(){
    if(reducedMotion || $('.fala-waves')) return;
    const waves=document.createElement('div');
    waves.className='fala-waves';
    waves.setAttribute('aria-hidden','true');
    waves.innerHTML='<div class="fala-wave"></div><div class="fala-wave"></div><div class="fala-wave"></div>';
    document.body.appendChild(waves);
  }

  function installVisualizer(){
    if($('.visualizer')) return;
    const artist=$('#mini-artist');
    if(!artist) return;
    const visualizer=document.createElement('span');
    visualizer.className='visualizer';
    visualizer.setAttribute('aria-hidden','true');
    visualizer.innerHTML='<i></i><i></i><i></i><i></i><i></i>';
    artist.insertAdjacentElement('afterend',visualizer);
  }

  function installParticleCanvas(){
    if(reducedMotion || $('#polish-particles')) return;
    const canvas=document.createElement('canvas');
    canvas.id='polish-particles';
    canvas.setAttribute('aria-hidden','true');
    document.body.appendChild(canvas);
    const ctx=canvas.getContext('2d',{alpha:true});
    let width=0,height=0,dpr=1,points=[],pointer={x:-9999,y:-9999,active:false},raf=0,last=0;

    const palette=[
      [255,189,69],
      [255,90,44],
      [220,47,63],
      [140,92,255],
      [46,156,255]
    ];

    function seed(){
      const density=Math.min(82,Math.max(38,Math.floor(width/22)));
      points=Array.from({length:density},(_,index)=>{
        const color=palette[index%palette.length];
        return{
          x:Math.random()*width,
          y:Math.random()*height,
          vx:(Math.random()-.5)*.2,
          vy:-(.035+Math.random()*.14),
          size:.35+Math.random()*1.45,
          alpha:.08+Math.random()*.31,
          phase:Math.random()*Math.PI*2,
          color
        };
      });
    }

    function resize(){
      dpr=Math.min(2,devicePixelRatio||1);
      width=innerWidth;height=innerHeight;
      canvas.width=Math.round(width*dpr);
      canvas.height=Math.round(height*dpr);
      canvas.style.width=width+'px';canvas.style.height=height+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
      seed();
    }

    function update(point,time){
      point.x+=point.vx;
      point.y+=point.vy;
      point.x+=Math.sin(time*.00035+point.phase)*.025;
      if(point.y<-12){point.y=height+12;point.x=Math.random()*width}
      if(point.x<-12)point.x=width+12;
      if(point.x>width+12)point.x=-12;
      if(pointer.active){
        const dx=point.x-pointer.x,dy=point.y-pointer.y;
        const d2=dx*dx+dy*dy;
        if(d2<16000&&d2>1){
          const force=(1-d2/16000)*.045;
          const distance=Math.sqrt(d2);
          point.x+=(dx/distance)*force;
          point.y+=(dy/distance)*force;
        }
      }
    }

    function draw(time){
      raf=requestAnimationFrame(draw);
      if(document.hidden || time-last<16) return;
      last=time;
      ctx.clearRect(0,0,width,height);
      ctx.globalCompositeOperation='lighter';
      for(const point of points){
        update(point,time);
        const pulse=.76+Math.sin(time*.0011+point.phase)*.24;
        const [r,g,b]=point.color;
        ctx.beginPath();
        ctx.fillStyle=`rgba(${r},${g},${b},${point.alpha*pulse})`;
        ctx.shadowBlur=12;
        ctx.shadowColor=`rgba(${r},${g},${b},${point.alpha*.65})`;
        ctx.arc(point.x,point.y,point.size*pulse,0,Math.PI*2);
        ctx.fill();
      }
      ctx.shadowBlur=0;
      for(let i=0;i<points.length;i++){
        const a=points[i];
        for(let j=i+1;j<points.length;j++){
          const b=points[j],dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy;
          if(d2>8500) continue;
          const alpha=(1-d2/8500)*.032;
          const grad=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
          grad.addColorStop(0,`rgba(${a.color[0]},${a.color[1]},${a.color[2]},${alpha})`);
          grad.addColorStop(1,`rgba(${b.color[0]},${b.color[1]},${b.color[2]},${alpha})`);
          ctx.strokeStyle=grad;
          ctx.lineWidth=.65;
          ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        }
      }
      ctx.globalCompositeOperation='source-over';
    }

    addEventListener('resize',resize,{passive:true});
    addEventListener('pointermove',event=>{pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true},{passive:true});
    addEventListener('pointerleave',()=>{pointer.active=false},{passive:true});
    resize();
    raf=requestAnimationFrame(draw);
  }

  function installPointerLighting(){
    if(reducedMotion) return;
    addEventListener('pointermove',event=>{
      document.body.style.setProperty('--mx',`${event.clientX}px`);
      document.body.style.setProperty('--my',`${event.clientY}px`);
      const player=$('#player');
      if(player){
        const rect=player.getBoundingClientRect();
        player.style.setProperty('--player-x',`${event.clientX-rect.left}px`);
      }
      const card=event.target.closest('.playlist-card,.artist-card,.result-card');
      if(card){
        const rect=card.getBoundingClientRect();
        card.style.setProperty('--card-x',`${event.clientX-rect.left}px`);
        card.style.setProperty('--card-y',`${event.clientY-rect.top}px`);
      }
    },{passive:true});
  }

  function animateView(){
    const view=$('#view');
    if(!view) return;
    view.classList.remove('view-enter');
    requestAnimationFrame(()=>requestAnimationFrame(()=>view.classList.add('view-enter')));
    setTimeout(()=>view.classList.remove('view-enter'),950);
  }

  function installViewObserver(){
    const view=$('#view');
    if(!view) return;
    let timer=0;
    const observer=new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
        animateView();
        decorateCards();
      },18);
    });
    observer.observe(view,{childList:true,subtree:false});
    animateView();
  }

  function decorateCards(){
    $$('.playlist-card,.artist-card,.result-card,.track-row').forEach((element,index)=>{
      if(element.dataset.polished) return;
      element.dataset.polished='1';
      element.style.setProperty('--delay',`${Math.min(index*24,240)}ms`);
    });
  }

  function installRipple(){
    document.addEventListener('pointerdown',event=>{
      const button=event.target.closest('button,.compact-action,.secondary-button,.primary-button,.small-button');
      if(!button || button.disabled) return;
      const rect=button.getBoundingClientRect();
      const ripple=document.createElement('span');
      ripple.className='ripple';
      const size=Math.max(rect.width,rect.height)*1.15;
      ripple.style.width=ripple.style.height=size+'px';
      ripple.style.left=(event.clientX-rect.left)+'px';
      ripple.style.top=(event.clientY-rect.top)+'px';
      button.appendChild(ripple);
      ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});
    },true);
  }

  function burstHeart(target){
    const rect=target.getBoundingClientRect();
    const count=5;
    for(let i=0;i<count;i++){
      const heart=document.createElement('span');
      heart.className='heart-burst';
      heart.textContent=i%2?'♥':'✦';
      heart.style.left=(rect.left+rect.width/2+(i-2)*7)+'px';
      heart.style.top=(rect.top+rect.height/2)+'px';
      heart.style.color=i%2?'#ff526a':'#ffbd45';
      heart.style.animationDelay=(i*35)+'ms';
      document.body.appendChild(heart);
      setTimeout(()=>heart.remove(),900);
    }
  }

  function installHeartEffects(){
    document.addEventListener('click',event=>{
      const heart=event.target.closest('#mini-like,[data-like-track]');
      if(!heart) return;
      setTimeout(()=>{
        const active=heart.textContent.trim()==='♥';
        if(active) burstHeart(heart);
      },0);
    },true);
  }

  function trackPlayingState(){
    const player=$('#player');
    if(!player) return;
    let previous=false;
    setInterval(()=>{
      let playing=false;
      try{playing=typeof isPlaying==='function'&&isPlaying()}catch{}
      player.classList.toggle('playing-now',!!playing);
      if(playing!==previous){
        previous=playing;
        player.animate?.([
          {transform:'translateY(0)'},
          {transform:'translateY(-2px)'},
          {transform:'translateY(0)'}
        ],{duration:360,easing:'cubic-bezier(.18,.86,.23,1.05)'});
      }
    },300);
  }

  function refineSourceSheet(){
    const sheet=$('#source-sheet');
    if(!sheet) return;
    const header=sheet.querySelector('.source-sheet-head strong');
    if(header) header.textContent='Źródła utworu';
    sheet.querySelectorAll('.source-choice').forEach(choice=>{
      if(choice.querySelector('.source-arrow')) return;
      const arrow=document.createElement('span');
      arrow.className='source-arrow';
      arrow.textContent='›';
      arrow.style.cssText='position:absolute;right:12px;top:11px;color:#8d93a0;font-size:20px;transition:.2s';
      choice.appendChild(arrow);
    });
  }

  function observeDynamicPanels(){
    const observer=new MutationObserver(()=>refineSourceSheet());
    observer.observe(document.body,{childList:true,subtree:false});
    refineSourceSheet();
  }

  function init(){
    installWaves();
    installVisualizer();
    installParticleCanvas();
    installPointerLighting();
    installViewObserver();
    installRipple();
    installHeartEffects();
    trackPlayingState();
    decorateCards();
    observeDynamicPanels();
    document.documentElement.classList.add('polish-ready');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
