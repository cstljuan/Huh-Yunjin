(() => {
  const desktop=window.YunjinDesktop,windows=[...document.querySelectorAll('.window')],tasks=document.querySelector('#task-items');
  let active=windows[0];
  const stateKey='yunjin:home-desktop:v1';
  const positionKeys=['left','top','right','bottom','z-index'];
  let restoring=true;
  function saveDesktop(){if(restoring)return;try{sessionStorage.setItem(stateKey,JSON.stringify({active:active?.dataset.id,windows:windows.map(el=>({id:el.dataset.id,hidden:el.hidden,position:Object.fromEntries(positionKeys.map(k=>[k,el.style.getPropertyValue(k)]))})),props:[...document.querySelectorAll('.mast,.desktop-brand,.desktop-stamp')].map(el=>({className:el.className,position:Object.fromEntries(positionKeys.map(k=>[k,el.style.getPropertyValue(k)]))}))}))}catch{}}
  windows.forEach((el,index)=>{
    const key='poster:'+el.dataset.id;desktop.register(el,key);
    el.addEventListener('pointerdown',()=>{active=el;update()});
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','Open '+el.querySelector('.caption strong').textContent);
    const number=document.createElement('span'),name=document.createElement('span');number.className='task-number';number.textContent=String(index+1).padStart(2,'0');name.className='task-name';name.textContent=el.querySelector('.caption strong').textContent;button.append(number,name);
    button.addEventListener('click',()=>{desktop.show(key);active=el;update()});tasks.append(button);
  });
  function update(){windows.forEach((el,index)=>{el.classList.toggle('active',active===el&&!el.hidden);tasks.children[index].classList.toggle('is-active',active===el&&!el.hidden);tasks.children[index].classList.toggle('is-open',!el.hidden);tasks.children[index].setAttribute('aria-pressed',String(!el.hidden))});saveDesktop()}
  document.addEventListener('desktop:windows',update);
  document.querySelector('#start').addEventListener('click',()=>{windows.forEach((el,i)=>{el.hidden=i!==0;for(const property of ['left','top','right','bottom','z-index'])el.style.removeProperty(property)});active=windows[0];desktop.show('poster:1');update()});
  document.querySelectorAll('.mast,.desktop-brand').forEach(el=>desktop.movable(el));
  // Keep the two small desktop stamps independent, so either can be moved anywhere.
  document.querySelectorAll('.desktop-note>div').forEach(el=>{const bounds=el.getBoundingClientRect();document.querySelector('.desktop').append(el);el.classList.add('desktop-stamp');el.style.cssText=`position:absolute;left:${bounds.left}px;top:${bounds.top}px;background:#fffdf5;padding:5px 7px;font:9px Plex,monospace;z-index:3;cursor:grab;touch-action:none`;desktop.movable(el)});
  const brand=document.querySelector('.desktop-brand');function twirl(){if(brand.dataset.justDragged)return;brand.classList.remove('logo-twirl');void brand.offsetWidth;brand.classList.add('logo-twirl');desktop.sound('open')};brand.addEventListener('click',twirl);brand.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();twirl()}});
  document.querySelector('.love-note').addEventListener('click',e=>{if(!e.currentTarget.dataset.justDragged)desktop.toast('Made with love. Make this little world your own. ♡')});
  const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false});function updateClock(){document.querySelector('#seoul-clock').textContent=clock.format(new Date())}updateClock();setInterval(updateClock,30000);
  try{const saved=JSON.parse(sessionStorage.getItem(stateKey));if(saved?.windows){saved.windows.forEach(entry=>{const el=windows.find(w=>w.dataset.id===entry.id);if(!el)return;el.hidden=Boolean(entry.hidden);positionKeys.forEach(k=>{if(entry.position?.[k])el.style.setProperty(k,entry.position[k]);else el.style.removeProperty(k)})});active=windows.find(w=>w.dataset.id===saved.active)||windows[0];windows.filter(w=>!w.hidden).sort((a,b)=>Number(a.style.zIndex)-Number(b.style.zIndex)).forEach(desktop.front);saved.props?.forEach(entry=>{const el=[...document.querySelectorAll('.mast,.desktop-brand,.desktop-stamp')].find(el=>el.className===entry.className);if(el)positionKeys.forEach(k=>{if(entry.position?.[k])el.style.setProperty(k,entry.position[k])})})}}catch{}
  restoring=false;update();
  window.addEventListener('pagehide',saveDesktop);document.addEventListener('pointerup',saveDesktop);document.addEventListener('keyup',saveDesktop);window.addEventListener('pageshow',()=>update());
})();
