(() => {
  const desktop=window.YunjinDesktop,windows=[...document.querySelectorAll('.window')],tasks=document.querySelector('#task-items');
  let active=windows[0];
  windows.forEach((el,index)=>{
    const key='poster:'+el.dataset.id;desktop.register(el,key);
    el.addEventListener('pointerdown',()=>{active=el;update()});
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','Open '+el.querySelector('.caption strong').textContent);
    const number=document.createElement('span'),name=document.createElement('span');number.className='task-number';number.textContent=String(index+1).padStart(2,'0');name.className='task-name';name.textContent=el.querySelector('.caption strong').textContent;button.append(number,name);
    button.addEventListener('click',()=>{desktop.show(key);active=el;update()});tasks.append(button);
  });
  function update(){windows.forEach((el,index)=>{el.classList.toggle('active',active===el&&!el.hidden);tasks.children[index].classList.toggle('is-active',active===el&&!el.hidden);tasks.children[index].classList.toggle('is-open',!el.hidden);tasks.children[index].setAttribute('aria-pressed',String(!el.hidden))})}
  document.addEventListener('desktop:windows',update);
  document.querySelector('#start').addEventListener('click',()=>{windows.forEach((el,i)=>{el.hidden=i!==0;for(const property of ['left','top','right','bottom','z-index'])el.style.removeProperty(property)});active=windows[0];desktop.show('poster:1');update()});
  document.querySelectorAll('.mast,.desktop-brand').forEach(el=>desktop.movable(el));
  // Keep the two small desktop stamps independent, so either can be moved anywhere.
  document.querySelectorAll('.desktop-note>div').forEach(el=>{const bounds=el.getBoundingClientRect();document.querySelector('.desktop').append(el);el.classList.add('desktop-stamp');el.style.cssText=`position:absolute;left:${bounds.left}px;top:${bounds.top}px;background:#fffdf5;padding:5px 7px;font:9px Plex,monospace;z-index:3;cursor:grab;touch-action:none`;desktop.movable(el)});
  const brand=document.querySelector('.desktop-brand');function twirl(){if(brand.dataset.justDragged)return;brand.classList.remove('logo-twirl');void brand.offsetWidth;brand.classList.add('logo-twirl');desktop.sound('open')};brand.addEventListener('click',twirl);brand.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();twirl()}});
  document.querySelector('.love-note').addEventListener('click',e=>{if(!e.currentTarget.dataset.justDragged)desktop.toast('Made with love. Make this little world your own. ♡')});
  const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false});function updateClock(){document.querySelector('#seoul-clock').textContent=clock.format(new Date())}updateClock();setInterval(updateClock,30000);update();
})();
