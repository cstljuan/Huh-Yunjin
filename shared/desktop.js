/* Shared desktop interactions. No framework, network service or account required. */
(() => {
  'use strict';
  const root = document.querySelector('.scene, .desktop');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const records = new Map();
  let z = 50, context, started = false, enabled = true;
  const read = (key, fallback = '') => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
  try { enabled = sessionStorage.getItem('yunjin:sound') !== 'off'; } catch {}
  // H hides the dock across the desktop and all five worlds; typing is unaffected.
  let menuHidden = false;
  try { menuHidden = sessionStorage.getItem('yunjin:menu-hidden') === 'true'; } catch {}
  const applyMenuVisibility = () => document.body.classList.toggle('menu-hidden', menuHidden);
  applyMenuVisibility();
  document.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key.toLowerCase() !== 'h') return;
    event.preventDefault();
    menuHidden = !menuHidden;
    applyMenuVisibility();
    try { sessionStorage.setItem('yunjin:menu-hidden', String(menuHidden)); } catch {}
  });
  document.querySelectorAll('.action-dock, .taskbar').forEach(menu => {
    menu.title = 'Press H to hide or show this menu';
    menu.setAttribute('aria-keyshortcuts', 'H');
  });
  if (window.POSTER?.theme === 'aura') {
    let portrait = (window.POSTER.portrait || new URLSearchParams(location.search).get('portrait')) === 'afterimage' ? 'afterimage' : 'electric';
    const hero = document.getElementById('hero');
    const toggle = document.querySelector('[data-portrait-toggle]');
    function applyPortrait() {
      document.body.dataset.portrait = portrait;
      hero.src = portrait === 'electric' ? 'assets/photo-02.webp' : 'assets/photo-05.webp';
      hero.alt = `Yunjin in the ${portrait === 'electric' ? 'Electric' : 'Afterimage'} editorial portrait`;
      if (toggle) {
        toggle.textContent = portrait === 'electric' ? 'PORTRAIT: ELECTRIC' : 'PORTRAIT: AFTERIMAGE';
        toggle.setAttribute('aria-pressed', String(portrait === 'electric'));
        toggle.title = portrait === 'electric' ? 'Switch to Afterimage' : 'Switch to Electric cyan glow';
      }
    }
    applyPortrait();
    toggle?.addEventListener('click', () => {
      portrait = portrait === 'electric' ? 'afterimage' : 'electric';
      applyPortrait();
    });
  }

  function sound(kind = 'click') {
    if (!enabled) return;
    try {
      context ||= new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === 'suspended') context.resume().catch(() => {});
      const now = context.currentTime;
      const sequences = {
        click: [[1200,0,.035],[760,.025,.035]],
        open: [[523,0,.07],[784,.065,.12]],
        close: [[622,0,.05],[392,.05,.08]],
        save: [[659,0,.06],[880,.06,.09],[1046,.14,.13]],
        startup: [[261,0,.24],[329,.11,.24],[392,.22,.3],[523,.35,.48]],
        navigate: [[784,0,.06],[1046,.08,.11]]
      };
      for (const [frequency, delay, duration] of sequences[kind] || sequences.click) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = kind === 'click' ? 'square' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, now + delay);
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(kind === 'click' ? .012 : .035, now + delay + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, now + delay + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + delay); oscillator.stop(now + delay + duration + .01);
      }
    } catch {}
  }
  function front(el) { el.style.zIndex = ++z; }
  function toast(message) {
    let el = document.querySelector('.desktop-toast');
    if (!el) { el = document.createElement('div'); el.className = 'desktop-toast'; el.setAttribute('role','status'); root.append(el); }
    el.textContent = message; el.classList.add('visible'); clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('visible'), 2600);
  }
  function movable(el, handle = el) {
    if (el.dataset.desktopDrag) return;
    el.dataset.desktopDrag = 'true';
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    let drag;
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const control = e.target.closest('button,a,input,textarea,select');
      if (control && !(control === el && el.matches('[data-play-memory]'))) return;
      const left = el.offsetLeft, top = el.offsetTop;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left, top, moved: false };
      el.classList.remove('window-enter');front(el); el.style.left = left + 'px'; el.style.top = top + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto';
      handle.setPointerCapture(e.pointerId); el.classList.add('dragging');
    });
    handle.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx,dy) > 4) drag.moved = true;
      el.style.left = Math.max(-el.offsetWidth + 60, Math.min(innerWidth - 60, drag.left + dx)) + 'px';
      el.style.top = Math.max(0, Math.min(innerHeight - 44, drag.top + dy)) + 'px';
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.moved) { el.dataset.justDragged = 'true'; setTimeout(() => delete el.dataset.justDragged, 100); }
      drag = null; el.classList.remove('dragging');
      if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
    };
    handle.addEventListener('pointerup',end); handle.addEventListener('pointercancel',end);
    el.addEventListener('keydown', e => {
      if (e.target !== el || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
      e.preventDefault(); const amount = e.shiftKey ? 30 : 10, left = el.offsetLeft, top = el.offsetTop;
      el.style.right = 'auto'; el.style.bottom = 'auto';
      el.style.left = Math.max(-el.offsetWidth + 60, Math.min(innerWidth-60, left + (e.key==='ArrowRight'?amount:e.key==='ArrowLeft'?-amount:0))) + 'px';
      el.style.top = Math.max(0, Math.min(innerHeight-44, top + (e.key==='ArrowDown'?amount:e.key==='ArrowUp'?-amount:0))) + 'px'; front(el);
    });
    el.addEventListener('pointerdown', () => front(el));
  }
  function notifyWindows() { document.dispatchEvent(new CustomEvent('desktop:windows')); }
  function register(el, key, options = {}) {
    if (records.has(key)) return records.get(key);
    el.dataset.windowKey = key;
    const record = { el, key, options }; records.set(key,record);
    const bar = el.querySelector('.bar,.titlebar');
    if (bar) movable(el,bar);
    el.querySelector('.min')?.addEventListener('click', () => {
      el.hidden = true; sound('close'); notifyWindows();
    });
    el.querySelector('.close')?.addEventListener('click', () => {
      el.hidden = true; sound('close'); notifyWindows();
    });
    el.querySelectorAll('button').forEach(button => button.type = 'button');
    return record;
  }
  function show(key) {
    const record = records.get(key); if (!record) return;
    const el = record.el; el.hidden = false; el.classList.remove('min','minimized','minimized-window');
    front(el); el.dataset.open='true';el.classList.remove('window-enter'); void el.offsetWidth; el.classList.add('window-enter');el.addEventListener('animationend',()=>el.classList.remove('window-enter'),{once:true});
    sound('open'); notifyWindows();
  }
  function windowBox(key, title, body, className = '') {
    if (records.has(key)) { show(key); return records.get(key).el; }
    const el = document.createElement('section'); el.className = 'xp floating desktop-window ' + className;
    el.setAttribute('aria-label',title); el.innerHTML = '<header class="bar"><i aria-hidden="true">✦</i><strong></strong><button class="control min" aria-label="Minimize window">−</button><button class="control close" aria-label="Close window">×</button></header><div class="body"></div>';
    el.querySelector('strong').textContent = title; el.querySelector('.body').append(body);
    root.append(el); register(el,key);
    el.style.left = Math.max(12, Math.min(innerWidth-el.offsetWidth-12, innerWidth*.57))+'px';
    el.style.top = Math.max(20, Math.min(innerHeight-el.offsetHeight-90, innerHeight*.28))+'px';
    show(key); return el;
  }
  function fragment(html) { const template = document.createElement('template'); template.innerHTML = html; return template.content; }
  function download(content, filename, type = 'text/plain;charset=utf-8') {
    const link = document.createElement('a'), url = URL.createObjectURL(new Blob([content],{type}));
    link.href=url; link.download=filename; link.click(); setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  function updateSoundButtons() {
    document.querySelectorAll('[data-sound]').forEach(button=>{button.textContent=enabled?'SOUND ON':'SOUND OFF';button.setAttribute('aria-pressed',String(enabled))});
    document.querySelectorAll('audio').forEach(audio=>audio.muted=!enabled);
  }
  document.addEventListener('pointerdown', () => { if (!started) { started = true; let booted=false;try{booted=sessionStorage.getItem('yunjin:booted')==='yes';sessionStorage.setItem('yunjin:booted','yes')}catch{}sound(booted?'open':'startup'); } }, { once: true });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-sound]')) {
      enabled=!enabled;try{sessionStorage.setItem('yunjin:sound',enabled?'on':'off')}catch{}
      updateSoundButtons(); if(enabled)sound('startup'); return;
    }
    const link=e.target.closest('a[href]');
    if(link && !link.hasAttribute('download')) { sound('navigate'); if(!e.defaultPrevented&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey&&(!link.target||link.target==='_self')){e.preventDefault();setTimeout(()=>location.assign(link.href),140)}return; }
    if(e.target.closest('button,[data-interact],[data-drag],.live-polaroid') && !e.target.closest('.min,.close')){sound('click');if(!reduced.matches&&e.clientX){const flash=document.createElement('i');flash.className='click-star';flash.setAttribute('aria-hidden','true');flash.style.left=e.clientX+'px';flash.style.top=e.clientY+'px';root.append(flash);setTimeout(()=>flash.remove(),450)}}
  });
  const api = { movable, register, show, windowBox, fragment, front, sound, toast, records, read, write, download, updateSoundButtons };
  window.YunjinDesktop = api;
  const config = window.POSTER;
  if (!config) { updateSoundButtons(); return; }
  document.body.dataset.theme = config.theme;
  document.querySelectorAll('[data-drag]').forEach(el => { if (!el.classList.contains('xp')) movable(el); });
  document.querySelectorAll('.xp').forEach(el=>register(el, el.id || [...el.classList].find(c=>['player','energy','tray','specimen','photos','notes','archive'].includes(c))));
  document.querySelectorAll('[data-restore]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.restore)));
  const archive=document.querySelector('#tabs,#photos:not(.xp)');
  function openPhoto(index) {
    const photo=config.photos[index]; if(!photo)return;
    const key='photo:'+photo.id;
    if(records.has(key)){show(key);return;}
    const body=fragment('<img class="gallery-image" alt=""><div class="photo-footer"><span></span><button class="ui pin-photo">PIN TO DESKTOP</button></div>');
    body.querySelector('img').src=photo.src;body.querySelector('img').alt=photo.alt||'Yunjin — '+photo.label;
    body.querySelector('img').style.objectPosition=photo.position||'50% 50%';
    body.querySelector('span').textContent=photo.label;
    body.querySelector('.pin-photo').addEventListener('click',()=>addPolaroid(index));
    const el=windowBox(key,photo.label+' / '+photo.id,body,'photo-viewer');
    el.style.left=Math.max(12,Math.min(innerWidth-el.offsetWidth-12, innerWidth*(.45+(index%3)*.055)))+'px';
    el.style.top=Math.max(15,Math.min(innerHeight-el.offsetHeight-85, innerHeight*(.2+(index%3)*.09)))+'px';
    archive?.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  }
  if(archive){archive.replaceChildren();config.photos.forEach((photo,index)=>{
    const button=document.createElement('button');button.className='photo-tab tab';button.type='button';button.draggable=true;
    button.setAttribute('aria-label','Open '+photo.label);button.setAttribute('aria-pressed','false');
    const image=document.createElement('img');image.src=photo.src;image.alt='';image.draggable=false;image.style.objectPosition=photo.position||'50% 50%';
    const caption=document.createElement('small');caption.textContent=photo.id;button.append(image,caption);
    button.addEventListener('click',()=>openPhoto(index));button.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',String(index))});archive.append(button);
  })}
  root.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/plain'))e.preventDefault()});
  root.addEventListener('drop',e=>{const raw=e.dataTransfer.getData('text/plain');if(!/^\d+$/.test(raw)||!config.photos[Number(raw)])return;e.preventDefault();openPhoto(Number(raw));const el=records.get('photo:'+config.photos[Number(raw)].id).el;el.style.left=Math.min(innerWidth-el.offsetWidth-12,Math.max(12,e.clientX-el.offsetWidth/2))+'px';el.style.top=Math.min(innerHeight-el.offsetHeight-85,Math.max(12,e.clientY-20))+'px'});
  function addPolaroid(index, layout) {
    const photo=config.photos[index];if(!photo)return;
    const key='pin:'+photo.id;
    if(records.has(key)){show(key);return;}
    const card=document.createElement('figure');card.className='live-polaroid';card.dataset.interact='';card.setAttribute('aria-label','Move '+photo.label+' Polaroid. Enter to open.');
    const image=document.createElement('img');image.src=photo.src;image.alt=photo.alt||'Yunjin — '+photo.label;image.draggable=false;image.style.objectPosition=photo.position||'50% 50%';
    const caption=document.createElement('figcaption');caption.textContent=photo.label;
    const close=document.createElement('button');close.className='polaroid-close';close.textContent='×';close.setAttribute('aria-label','Remove '+photo.label+' Polaroid');close.addEventListener('click',()=>{card.hidden=true;sound('close')});
    card.append(image,caption,close);root.append(card);records.set(key,{el:card,key,options:{}});movable(card);
    card.style.left=(layout?.left??(30+index*22))+'%';card.style.top=(layout?.top??(48+index%3*7))+'%';card.style.setProperty('--rotation',(layout?.rotation??((index%3-1)*5))+'deg');
    if(layout?.width)card.style.width=layout.width;
    card.style.left=Math.max(8,Math.min(innerWidth-card.offsetWidth-12,card.offsetLeft))+'px';
    card.style.top=Math.max(8,Math.min(innerHeight-card.offsetHeight-82,card.offsetTop))+'px';
    card.addEventListener('click',e=>{if(!card.dataset.justDragged&&!e.target.closest('button'))openPhoto(index)});card.addEventListener('keydown',e=>{if(e.key==='Enter')openPhoto(index)});
    if(!layout)front(card);return card;
  }
  (config.polaroids||[]).forEach(layout=>addPolaroid(layout.index,layout));
  const note=document.querySelector('.notes');
  if(note){
    const body=note.querySelector('.body');body.replaceChildren(fragment('<label class="note-label" for="personal-note">A little note to keep</label><textarea id="personal-note" class="note-editor" rows="5" placeholder="Write something you want to remember…"></textarea><div class="note-actions"><span class="note-status" role="status">READY</span><button class="ui save-note">SAVE</button><button class="ui download-note">EXPORT</button></div>'));
    const field=body.querySelector('textarea'),key='yunjin:note:'+config.theme,status=body.querySelector('.note-status');field.value=read(key);
    if(field.value)status.textContent='SAVED ON THIS BROWSER';
    field.addEventListener('input',()=>status.textContent='UNSAVED CHANGES');
    function save(){const okay=write(key,field.value);status.textContent=okay?'SAVED · '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'EXPORT TO KEEP YOUR NOTE';sound('save');toast(okay?'Your note is saved.':'Browser storage is unavailable. Export your note to keep it.')}
    body.querySelector('.save-note').addEventListener('click',save);body.querySelector('.download-note').addEventListener('click',()=>download(field.value,config.theme+'-note.txt'));
    field.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();save()}});
  }
  document.querySelectorAll('[data-random-meter]').forEach(button=>button.addEventListener('click',()=>{
    const panel=button.closest('.xp'),fill=panel.querySelector('.fill,.meter>span'),value=panel.querySelector('#value,#percent');
    const old=Number(value?.textContent.replace('%',''))||0;let next;do{next=Math.floor(Math.random()*100)+1}while(next===old);
    if(value)value.textContent=next+'%';if(fill)fill.style.width=next+'%';panel.querySelector('.meter')?.setAttribute('aria-valuenow',String(next));toast((config.theme==='compact'?'Yunjin energy: ':'Aura intensity: ')+next+'%');
  }));
  document.querySelector('[data-glow]')?.addEventListener('click',e=>{root.classList.toggle('electric');e.currentTarget.textContent=root.classList.contains('electric')?'GLOW OFF':'GLOW ON';e.currentTarget.setAttribute('aria-pressed',String(root.classList.contains('electric')))});
  const audio=document.createElement('audio');audio.preload='metadata';audio.src=config.song.src;root.append(audio);
  const musicBody=fragment('<div class="music-track"><span class="music-symbol" aria-hidden="true">♫</span><div><strong class="track-name"></strong><small class="track-artist"></small></div></div><div class="music-controls"><button class="ui music-play">▶ PLAY</button><button class="ui music-restart" aria-label="Restart song">↺</button><span class="music-time">0:00 / —</span></div><label class="sr-only" for="music-seek">Track position</label><input id="music-seek" class="music-seek" type="range" min="0" max="100" value="0" step=".1"><div class="music-bottom"><label>VOL <input class="music-volume" type="range" min="0" max="1" step=".01" value=".55" aria-label="Music volume"></label><span class="music-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span></div>');
  musicBody.querySelector('.track-name').textContent=config.song.name;musicBody.querySelector('.track-artist').textContent=config.song.artist;
  const music=windowBox('music',config.theme==='diary'?'On the record':'YUNJIN.FM / MUSIC',musicBody,'music-window');
  music.style.left=config.musicLeft||'72%';music.style.top=config.musicTop||'12%';
  if(mobile.matches){music.hidden=true;}else{music.style.left=Math.min(parseFloat(music.style.left)/100*innerWidth,innerWidth-music.offsetWidth-18)+'px'}
  const play=music.querySelector('.music-play'),seek=music.querySelector('.music-seek'),volume=music.querySelector('.music-volume');audio.volume=.55;
  const time=seconds=>Number.isFinite(seconds)?Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0'):'—';
  async function toggleMusic(){if(!audio.paused){audio.pause();return}if(!enabled){enabled=true;updateSoundButtons()}try{await audio.play()}catch{toast('The track could not load. Please try again.')}}
  play.addEventListener('click',toggleMusic);music.querySelector('.music-restart').addEventListener('click',()=>{audio.currentTime=0});
  audio.addEventListener('play',()=>{play.textContent='Ⅱ PAUSE';music.classList.add('playing')});audio.addEventListener('pause',()=>{play.textContent='▶ PLAY';music.classList.remove('playing')});audio.addEventListener('ended',()=>{play.textContent='▶ PLAY';music.classList.remove('playing')});
  audio.addEventListener('timeupdate',()=>{seek.value=Number.isFinite(audio.duration)?audio.currentTime/audio.duration*100:0;music.querySelector('.music-time').textContent=time(audio.currentTime)+' / '+time(audio.duration)});
  audio.addEventListener('loadedmetadata',()=>music.querySelector('.music-time').textContent='0:00 / '+time(audio.duration));audio.addEventListener('error',()=>toast('The music file could not load.'));
  seek.addEventListener('input',()=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(seek.value)/100*audio.duration});volume.addEventListener('input',()=>audio.volume=Number(volume.value));
  document.querySelector('[data-play-memory]')?.addEventListener('click',event=>{if(event.currentTarget.dataset.justDragged)return;show('music');if(audio.paused)toggleMusic();openSlideshow();const slideshow=records.get('slideshow').el;if(slideshow.querySelector('.slide-play').textContent==='PLAY MEMORIES')slideshow.querySelector('.slide-play').click()});
  function openSlideshow(){
    if(records.has('slideshow')){show('slideshow');return;}
    let index=0,timer;
    const body=fragment('<img class="memory-slide" alt=""><div class="slideshow-row"><button class="ui slide-previous" aria-label="Previous memory">←</button><span></span><button class="ui slide-play">PLAY MEMORIES</button><button class="ui slide-next" aria-label="Next memory">→</button></div>');
    const el=windowBox('slideshow','Memory projector',body,'slideshow-window');
    function paint(){const photo=config.photos[index];el.querySelector('img').src=photo.src;el.querySelector('img').alt=photo.alt||'Yunjin — '+photo.label;el.querySelector('.slideshow-row span').textContent=photo.label}
    const advance=delta=>{index=(index+delta+config.photos.length)%config.photos.length;paint()};
    el.querySelector('.slide-previous').onclick=()=>advance(-1);el.querySelector('.slide-next').onclick=()=>advance(1);
    el.querySelector('.slide-play').onclick=e=>{if(timer){clearInterval(timer);timer=null;e.currentTarget.textContent='PLAY MEMORIES'}else{timer=setInterval(()=>advance(1),3500);e.currentTarget.textContent='PAUSE MEMORIES'}};
    el.querySelectorAll('.min,.close').forEach(button=>button.addEventListener('click',()=>{clearInterval(timer);timer=null;el.querySelector('.slide-play').textContent='PLAY MEMORIES'}));paint();
  }
  document.querySelector('[data-contact-sheet]')?.addEventListener('click',()=>{
    const body=document.createElement('div');body.className='contact-grid';config.photos.forEach((photo,i)=>{const button=document.createElement('button'),image=document.createElement('img'),caption=document.createElement('span');image.src=photo.src;image.alt=photo.alt||'Yunjin — '+photo.label;caption.textContent=photo.label;button.append(image,caption);button.onclick=()=>openPhoto(i);body.append(button)});
    windowBox('contact','CONTACT SHEET / ALL FRAMES',body,'contact-window');
  });
  document.querySelector('[data-keepsake]')?.addEventListener('click',()=>{
    const body=fragment('<label class="note-label" for="keepsake-message">Make a little keepsake</label><input id="keepsake-message" class="keepsake-input" maxlength="100" placeholder="Your words, your little world"><div class="keepsake-preview"><span>YUNJIN</span><p>Your little world.</p><small>WITH LOVE</small></div><div class="note-actions"><button class="ui keepsake-pin">PIN</button><button class="ui keepsake-save">SAVE CARD</button></div>');
    const el=windowBox('keepsake','KEEPSAKE MAKER',body,'keepsake-window'),input=el.querySelector('input');
    input.value=read('yunjin:keepsake:'+config.theme);const preview=el.querySelector('.keepsake-preview p');if(input.value)preview.textContent=input.value;
    input.addEventListener('input',()=>preview.textContent=input.value||'Your little world.');
    el.querySelector('.keepsake-pin').onclick=()=>{write('yunjin:keepsake:'+config.theme,input.value);const card=document.createElement('aside');card.className='pinned-message';card.textContent=input.value||'Your little world.';const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Remove keepsake');close.onclick=()=>card.remove();card.append(close);root.append(card);movable(card);front(card);toast('Keepsake pinned.')};
    el.querySelector('.keepsake-save').onclick=()=>{write('yunjin:keepsake:'+config.theme,input.value);const safe=(input.value||'Your little world.').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));download(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#fff8e9"/><rect x="25" y="25" width="850" height="550" fill="none" stroke="#93452f" stroke-width="2"/><text x="70" y="100" font-family="Georgia" font-size="25" fill="#93452f">YUNJIN / WITH LOVE</text><foreignObject x="70" y="180" width="760" height="330"><div xmlns="http://www.w3.org/1999/xhtml" style="font:42px Georgia;color:#503627;overflow-wrap:anywhere">${safe}</div></foreignObject></svg>`,config.theme+'-keepsake.svg','image/svg+xml');sound('save')};
  });
  let motionOn=false, neutral, tiltFrame=0,targetX=0,targetY=0,currentX=0,currentY=0;
  const motion=document.querySelector('[data-motion]');
  function parallax(x,y){root.querySelectorAll('[data-depth]').forEach(el=>{if(el.dataset.desktopDrag)return;const depth=Number(el.dataset.depth);el.style.translate=(-x*depth)+'px '+(-y*depth)+'px'})}
  window.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||motionOn||reduced.matches)return;parallax((e.clientX-innerWidth/2)*(config.theme==='market'?.75:.35),(e.clientY-innerHeight/2)*(config.theme==='market'?.75:.35))},{passive:true});
  function tick(){if(!motionOn||document.hidden){tiltFrame=0;return}currentX+=(targetX-currentX)*.12;currentY+=(targetY-currentY)*.12;parallax(currentX,currentY);tiltFrame=requestAnimationFrame(tick)}
  function tilt(e){if(!motionOn||!Number.isFinite(e.gamma)||!Number.isFinite(e.beta))return;if(!neutral)neutral={x:e.gamma,y:e.beta};targetX=Math.max(-20,Math.min(20,e.gamma-neutral.x))*15;targetY=Math.max(-20,Math.min(20,e.beta-neutral.y))*15;if(!tiltFrame)tiltFrame=requestAnimationFrame(tick)}
  motion?.addEventListener('click',async()=>{if(motionOn){motionOn=false;removeEventListener('deviceorientation',tilt);cancelAnimationFrame(tiltFrame);tiltFrame=0;parallax(0,0);motion.textContent='PHONE MOTION';motion.setAttribute('aria-pressed','false');return}if(!window.DeviceOrientationEvent){toast('Phone motion is unavailable here.');return}try{if(typeof DeviceOrientationEvent.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted'){toast('Motion permission was not granted.');return}motionOn=true;neutral=null;motion.textContent='MOTION ON';motion.setAttribute('aria-pressed','true');addEventListener('deviceorientation',tilt,{passive:true})}catch{toast('Phone motion could not start.')}});
  window.addEventListener('orientationchange',()=>neutral=null);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(tiltFrame);tiltFrame=0}else if(motionOn&&!tiltFrame)tick()});
  updateSoundButtons();notifyWindows();
})();
