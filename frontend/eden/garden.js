/* Shared visual controller: it never owns or mutates conversation data. */
const EdenGarden=(()=>{
 const defaults={speed:25,amount:'few',direction:'sway',size:'mixed',enabled:true};
 const counts={few:6,medium:14,many:26};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let host,scene,options={},prefs={...defaults},signature='',quiet=false,start=null,restoreFocus=null;
 function normalize(value={}){return {speed:Math.max(0,Math.min(100,Number.isFinite(+value.speed)?+value.speed:defaults.speed)),amount:counts[value.amount]?value.amount:'few',direction:['vertical','sway','random'].includes(value.direction)?value.direction:'sway',size:value.size==='small'?'small':'mixed',enabled:value.enabled!==false};}
 function controls(){const p=prefs;return `<section class="garden-controls" aria-label="花园动态"><h3>风经过的地方</h3><p>慢一点，听花园呼吸。</p><label>花瓣飘落速度 <output data-garden-speed>${p.speed}%</output><span class="garden-range"><small>慢</small><input data-garden-pref="speed" aria-label="花瓣飘落速度" type="range" min="0" max="100" value="${p.speed}"><small>快</small></span></label>${[['amount','花瓣数量',[['few','少'],['medium','中'],['many','多']]],['direction','飘落方向',[['vertical','垂直'],['sway','左右飘'],['random','随机']]],['size','花瓣大小',[['small','小'],['mixed','混合']]]].map(([key,title,choices])=>`<label>${title}<select data-garden-pref="${key}" aria-label="${title}">${choices.map(([val,label])=>`<option value="${val}" ${p[key]===val?'selected':''}>${label}</option>`).join('')}</select></label>`).join('')}<label class="garden-switch">动画开关<select data-garden-pref="enabled" aria-label="动画开关"><option value="true" ${p.enabled?'selected':''}>开启</option><option value="false" ${!p.enabled?'selected':''}>静止</option></select></label><p class="garden-system-note">${reduced.matches?'已跟随系统减少动态设置。':'光影与吊饰缓慢交错，聊天时保持安静。'}</p><button type="button" data-garden-quiet>只看花园</button><small>左滑暂时隐藏聊天，右滑恢复。</small></section>`;}
 function clock(){const d=new Date(),secs=d.getHours()*3600+d.getMinutes()*60+d.getSeconds();return `<div class="garden-clock"><i class="clock-hand hour" style="--phase:-${secs}s"></i><i class="clock-hand minute" style="--phase:-${secs%3600}s"></i><i class="clock-hand second" style="--phase:-${secs%60}s"></i><b></b></div>`;}
 function mount(nextHost,nextOptions={}){
  host=nextHost;options=nextOptions;prefs=normalize(options.read?.()||prefs);if(!host)return;
  host.classList.add('living-garden');host.dataset.gardenScene=options.chat?'chat':'rest';
  scene=host.querySelector(':scope > .garden-scene');
  if(!scene){scene=document.createElement('div');scene.className='garden-scene';scene.setAttribute('aria-hidden','true');scene.innerHTML=`<div class="garden-stage"><img class="garden-wallpaper" src="${options.assets||''}cathedral-clock-background.png" alt="">${clock()}<span class="garden-ornament lace"></span><span class="garden-ornament ribbon"></span><span class="garden-ornament cross"></span><span class="garden-ornament pendulum"></span><i class="garden-glint one"></i><i class="garden-glint two"></i><i class="garden-glint three"></i></div><div class="garden-petals"></div>`;host.prepend(scene);signature='';}
  sync();
  if(!options.chat)setQuiet(false);
  else if(!host.querySelector(':scope > .garden-restore')){const button=document.createElement('button');button.type='button';button.className='garden-restore';button.dataset.gardenRestore='';button.textContent='回到私语 · 右滑也可以';host.append(button);}
  host.querySelectorAll('.garden-controls').forEach(el=>{el.querySelectorAll('[data-garden-pref]').forEach(field=>{field.value=String(prefs[field.dataset.gardenPref]);});});
  if(quiet)setQuiet(true);
 }
 function sync(){if(!scene)return;prefs=normalize(options.read?.()||prefs);const paused=!prefs.enabled||!!options.paused?.()||reduced.matches||document.hidden;host.classList.toggle('garden-still',paused);const sig=JSON.stringify(prefs);if(sig!==signature){signature=sig;scene.querySelector('.garden-petals').innerHTML=Array.from({length:counts[prefs.amount]},(_,i)=>{const n=(i*37+17)%101,r=(i*19+31)%101;const duration=(42-prefs.speed*.3)*(0.8+r/250);const drift=prefs.direction==='vertical'?0:prefs.direction==='random'?(n-50)*3:(i%2?-1:1)*(40+r);const size=prefs.size==='small'?18:18+r*.2;return `<span class="garden-petal ${prefs.direction==='random'&&i%7===6?'across':''}" style="left:${n}%;--fall:${duration}s;--delay:-${duration*i/counts[prefs.amount]}s;--drift:${drift}px;--size:${size}px;--turn:${r*5}deg"><i></i></span>`;}).join('');}}
 function setQuiet(value){quiet=!!value&&!!options.chat;if(!host)return;host.classList.toggle('garden-quiet',quiet);const page=host.querySelector('.chat-page');if(page){page.inert=quiet;page.setAttribute('aria-hidden',String(quiet));}if(quiet){restoreFocus=document.activeElement;host.querySelector('.garden-restore')?.focus({preventScroll:true});}else if(restoreFocus?.isConnected){restoreFocus.focus({preventScroll:true});restoreFocus=null;}}
 function swipe(dx,dy){return Math.abs(dx)>=65&&Math.abs(dx)>Math.abs(dy)*1.7?(dx<0?'hide':'show'):null;}
 function update(key,value){prefs=normalize({...prefs,[key]:key==='enabled'?value==='true':key==='speed'?Number(value):value});options.write?.({...prefs});sync();host?.querySelectorAll('[data-garden-speed]').forEach(e=>e.textContent=prefs.speed+'%');}
 document.addEventListener('input',event=>{const key=event.target.dataset?.gardenPref;if(key==='speed')update(key,event.target.value);});
 document.addEventListener('change',event=>{const key=event.target.dataset?.gardenPref;if(key&&key!=='speed')update(key,event.target.value);});
 document.addEventListener('click',event=>{if(event.target.closest('[data-garden-restore]'))setQuiet(false);if(event.target.closest('[data-garden-quiet]'))setQuiet(true);});
 document.addEventListener('pointerdown',event=>{
  start=null;if(!options.chat||!host?.contains(event.target)||event.isPrimary===false||event.button>0)return;
  if(event.target.closest('button,input,textarea,select,a,[contenteditable=true],.chat-sidebar,.garden-preview-sidebar,.rpg-stage'))return;
  if(!quiet&&!event.target.closest('.chat-messages,.chat-scroll'))return;
  let el=event.target;while(el&&el!==host){if(el.scrollWidth>el.clientWidth+5&&getComputedStyle(el).overflowX==='auto')return;el=el.parentElement;}
  start={x:event.clientX,y:event.clientY,id:event.pointerId};
 },{passive:true});
 document.addEventListener('pointerup',event=>{if(!start||start.id!==event.pointerId)return;const action=swipe(event.clientX-start.x,event.clientY-start.y);start=null;if(action==='hide')setQuiet(true);if(action==='show')setQuiet(false);},{passive:true});
 document.addEventListener('pointercancel',()=>{start=null;});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&quiet)setQuiet(false);});
 document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
 function disable(){if(!host)return;setQuiet(false);host.classList.remove('living-garden');}
 return {mount,controls,sync,disable,normalize,swipe,setQuiet};
})();
