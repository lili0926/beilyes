/* 星光涂鸦壳（doodle）
 * 首页原型拆成三层接进现有 App：
 *   #dd-back   壁纸线稿 + 像素星光（在 #app 后面）
 *   #dd-home   首页：时间、文案、在一起天数、周历、游戏/音乐/工具插件
 *   #dd-over   全屏层：游戏/工具转盘、播放页（一起听）、信箱
 * 这三层放在 Shadow DOM 里，样式与原型逐条一致，也不会和 App 原有的类名互相串。
 * 聊天、设置、底栏仍是 App 原来的页面与事件，只换外观；数据全部读写原有 state：
 * coupleInfo / agents / chatThreads / musicNow / musicQueue / mcLetters，不另建副本。 */
const DoodleShell = (() => {
  const ON = () => typeof state !== 'undefined' && state.uiShell === 'doodle';
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const PDEF = {theme:'system',twinkle:true,boil:true,wall:100,chatMode:'bubble',enterSend:true,sound:true,saver:false,mode:'seq',season:'',tgSec:0,ltRead:null,demoHidden:false};
  function P(){ return Object.assign({}, PDEF, (typeof state !== 'undefined' && state.doodlePrefs) || {}); }
  function setP(k, v){ state.doodlePrefs = Object.assign({}, state.doodlePrefs || {}, {[k]: v}); try{ persist('doodlePrefs'); }catch(e){} }
  const darkMQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : {matches:false, addEventListener(){}};
  const reducedMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
  function isDark(){ const t = P().theme; return t === 'dark' || (t === 'system' && darkMQ.matches); }
  function palette(){
    return isDark()
      ? {bg:'#17151D',card:'#23212B',accent:'#C58BE0',accent2:'#3A3248',text:'#EDE9F6',sub:'#9D97B2',border:'#302D3A',bubble_me:'#4A3E5E',bubble_them:'#23212B'}
      : {bg:'#F8F7FC',card:'#FFFFFF',accent:'#C58BE0',accent2:'#EADCF6',text:'#3F3A52',sub:'#8C86A0',border:'#ECE7F3',bubble_me:'#E6D3F6',bubble_them:'#FFFFFF'};
  }
  const C = {blue:'#8FBCEB', lilac:'#CFA0E8', accent:'#C58BE0', pink:'#F2A7C3'};

  /* ===== 手绘抖线图标（来自原型 doodle-icons.js，可渲染进任意 root） ===== */
  const ICONS = {"home": ["房子", "M16 50 L50 18 L84 50 M24 43 V84 H76 V43 M43 84 V62 H57 V84"], "chat": ["对话", "M20 28 Q20 20 28 20 H72 Q80 20 80 28 V58 Q80 66 72 66 H44 L30 80 L32 66 H28 Q20 66 20 58 Z"], "settings": ["设置", "M74.4 44.5 L82.7 45.4 L82.7 54.6 L74.4 55.5 L71.1 63.4 L76.4 69.9 L69.9 76.4 L63.4 71.1 L55.5 74.4 L54.6 82.7 L45.4 82.7 L44.5 74.4 L36.6 71.1 L30.1 76.4 L23.6 69.9 L28.9 63.4 L25.6 55.5 L17.3 54.6 L17.3 45.4 L25.6 44.5 L28.9 36.6 L23.6 30.1 L30.1 23.6 L36.6 28.9 L44.5 25.6 L45.4 17.3 L54.6 17.3 L55.5 25.6 L63.4 28.9 L69.9 23.6 L76.4 30.1 L71.1 36.6 Z M60.0 50 A10 10 0 1 0 40.0 50 A10 10 0 1 0 60.0 50"], "user": ["我的", "M64.0 36 A14 14 0 1 0 36.0 36 A14 14 0 1 0 64.0 36 M22 84 Q24 58 50 58 Q76 58 78 84"], "search": ["搜索", "M66.0 44 A22 22 0 1 0 22.0 44 A22 22 0 1 0 66.0 44 M60 60 L82 82"], "bell": ["通知", "M30 66 V46 Q30 24 50 24 Q70 24 70 46 V66 L78 74 H22 Z M50 24 V17 M43 80 Q50 88 57 80"], "send": ["发送", "M14 48 L86 18 L66 84 L50 58 Z M50 58 L86 18"], "plus": ["添加", "M50 20 V80 M20 50 H80"], "close": ["关闭", "M24 24 L76 76 M76 24 L24 76"], "check": ["完成", "M20 52 L42 74 L82 28"], "back": ["返回", "M46 22 L18 50 L46 78 M18 50 H84"], "forward": ["前进", "M54 22 L82 50 L54 78 M82 50 H16"], "menu": ["菜单", "M20 30 H80 M20 50 H80 M20 70 H80"], "more": ["更多", "M31.0 50 A5 5 0 1 0 21.0 50 A5 5 0 1 0 31.0 50 M55.0 50 A5 5 0 1 0 45.0 50 A5 5 0 1 0 55.0 50 M79.0 50 A5 5 0 1 0 69.0 50 A5 5 0 1 0 79.0 50"], "edit": ["编辑", "M22 78 L28 58 L66 20 L80 34 L42 72 Z M60 26 L74 40 M28 58 L42 72"], "trash": ["删除", "M22 30 H78 M40 30 V22 H60 V30 M28 30 L32 82 H68 L72 30 M44 42 V70 M56 42 V70"], "heart": ["喜欢", "M50 82 C20 60 16 36 32 30 C42 26 50 36 50 43 C50 36 58 26 68 30 C84 36 80 60 50 82Z"], "star": ["星星", "M50 12 L60 38 L88 40 L66 58 L74 86 L50 70 L26 86 L34 58 L12 40 L40 38Z"], "bookmark": ["收藏", "M28 16 H72 V84 L50 66 L28 84 Z"], "image": ["图片", "M16 24 H84 V76 H16 Z M16 66 L38 46 L54 60 L64 52 L84 68 M66.0 38 A6 6 0 1 0 54.0 38 A6 6 0 1 0 66.0 38"], "camera": ["相机", "M16 34 H34 L40 24 H60 L66 34 H84 V78 H16 Z M64.0 55 A14 14 0 1 0 36.0 55 A14 14 0 1 0 64.0 55"], "mic": ["语音", "M40 22 Q40 14 50 14 Q60 14 60 22 V48 Q60 56 50 56 Q40 56 40 48 Z M28 46 Q28 68 50 68 Q72 68 72 46 M50 68 V84 M38 84 H62"], "music": ["音乐", "M40 72 V24 L76 16 V64 M40 36 L76 28 M40.0 72 A9 7 0 1 0 22.0 72 A9 7 0 1 0 40.0 72 M76.0 64 A9 7 0 1 0 58.0 64 A9 7 0 1 0 76.0 64"], "calendar": ["日历", "M18 26 H82 V82 H18 Z M18 42 H82 M34 16 V32 M66 16 V32 M32 56 H40 M46 56 H54 M60 56 H68 M32 68 H40 M46 68 H54"], "clock": ["时间", "M82.0 50 A32 32 0 1 0 18.0 50 A32 32 0 1 0 82.0 50 M50 30 V50 L64 60"], "lock": ["隐私", "M26 46 H74 V84 H26 Z M36 46 V34 Q36 18 50 18 Q64 18 64 34 V46 M50 60 V70"], "mail": ["信件", "M16 26 H84 V76 H16 Z M16 28 L50 54 L84 28"], "share": ["分享", "M78.0 26 A8 8 0 1 0 62.0 26 A8 8 0 1 0 78.0 26 M38.0 50 A8 8 0 1 0 22.0 50 A8 8 0 1 0 38.0 50 M78.0 74 A8 8 0 1 0 62.0 74 A8 8 0 1 0 78.0 74 M63 30 L37 46 M37 54 L63 70"], "download": ["下载", "M50 16 V62 M30 44 L50 64 L70 44 M20 76 V84 H80 V76"], "moon": ["夜间", "M62 16 A34 34 0 1 0 84 64 A26 26 0 1 1 62 16 Z"], "sun": ["日间", "M65.0 50 A15 15 0 1 0 35.0 50 A15 15 0 1 0 65.0 50 M72.0 50.0 L82.0 50.0 M65.6 65.6 L72.6 72.6 M50.0 72.0 L50.0 82.0 M34.4 65.6 L27.4 72.6 M28.0 50.0 L18.0 50.0 M34.4 34.4 L27.4 27.4 M50.0 28.0 L50.0 18.0 M65.6 34.4 L72.6 27.4"], "sparkle": ["闪光", "M50 10 C54 38 62 46 90 50 C62 54 54 62 50 90 C46 62 38 54 10 50 C38 46 46 38 50 10Z"], "comet": ["彗星", "M74 16 L78 27 L90 28 L81 35 L84 47 L74 40 L64 47 L67 35 L58 28 L70 27Z M62 38 Q40 58 12 66 M68 44 Q50 66 24 84 M58 32 Q36 44 14 46"], "cloud": ["云朵", "M20 66 C8 66 8 50 22 50 C20 34 40 30 46 42 C52 26 76 30 74 46 C90 44 92 64 78 66Z M40 58 c-7 -9 7 -13 7 -4 c0 5 -6 5 -6 1 M62 54 c6 -6 12 2 6 5"], "bow": ["蝴蝶结", "M50 48 C38 32 16 34 19 48 C22 62 40 58 50 48 C60 32 84 34 81 48 C78 62 60 58 50 48 M47 52 L38 82 M53 52 L63 84"], "clef": ["高音谱号", "M46 92 C48 64 60 44 58 22 C56 8 40 12 43 28 C46 46 72 48 70 66 C68 82 44 82 45 66 C46 56 60 57 59 65"], "snowflake": ["雪花", "M84.0 50.0 L16.0 50.0 M67.0 79.4 L33.0 20.6 M33.0 79.4 L67.0 20.6 M72.0 50.0 L65.4 56.1 M72.0 50.0 L65.4 43.9 M61.0 69.1 L52.4 66.3 M61.0 69.1 L62.9 60.3 M39.0 69.1 L37.1 60.3 M39.0 69.1 L47.6 66.3 M28.0 50.0 L34.6 43.9 M28.0 50.0 L34.6 56.1 M39.0 30.9 L47.6 33.7 M39.0 30.9 L37.1 39.7 M61.0 30.9 L62.9 39.7 M61.0 30.9 L52.4 33.7"], "door": ["门", "M28 86 V20 H72 V86 M16 86 H84 M40 34 H60 M65.0 56 A3 3 0 1 0 59.0 56 A3 3 0 1 0 65.0 56"], "key": ["钥匙", "M40.0 50 A14 14 0 1 0 12.0 50 A14 14 0 1 0 40.0 50 M40 50 H86 M72 50 V62 M82 50 V60"], "cat": ["小猫", "M24 44 L22 18 L42 32 Q50 30 58 32 L78 18 L76 44 Q84 58 76 70 Q66 82 50 82 Q34 82 24 70 Q16 58 24 44 Z M40 52 V56 M60 52 V56 M46 64 L50 67 L54 64 M32 64 L14 62 M32 68 L16 73 M68 64 L86 62 M68 68 L84 73"], "paw": ["猫爪", "M65.0 63 A15 12 0 1 0 35.0 63 A15 12 0 1 0 65.0 63 M39.0 43 A6 6 0 1 0 27.0 43 A6 6 0 1 0 39.0 43 M50.0 32 A6 6 0 1 0 38.0 32 A6 6 0 1 0 50.0 32 M62.0 32 A6 6 0 1 0 50.0 32 A6 6 0 1 0 62.0 32 M73.0 43 A6 6 0 1 0 61.0 43 A6 6 0 1 0 73.0 43"], "fish": ["小鱼", "M16 50 Q40 22 66 50 Q40 78 16 50 Z M66 50 L84 36 V64 Z M32.0 47 A2 2 0 1 0 28.0 47 A2 2 0 1 0 32.0 47"], "clover": ["四叶草", "M60.0 34 A10 10 0 1 0 40.0 34 A10 10 0 1 0 60.0 34 M76.0 50 A10 10 0 1 0 56.0 50 A10 10 0 1 0 76.0 50 M60.0 66 A10 10 0 1 0 40.0 66 A10 10 0 1 0 60.0 66 M44.0 50 A10 10 0 1 0 24.0 50 A10 10 0 1 0 44.0 50 M56 60 Q66 76 60 88"], "tooth": ["爱之牙", "M30 24 Q40 16 50 22 Q60 16 70 24 Q80 34 72 52 L66 80 Q63 86 60 80 L54 62 Q50 58 46 62 L40 80 Q37 86 34 80 L28 52 Q20 34 30 24 Z M50 42 L45 37 A3 3 0 0 1 50 34 A3 3 0 0 1 55 37 Z"], "magnet": ["磁铁", "M28 20 V56 Q28 80 50 80 Q72 80 72 56 V20 H58 V56 Q58 66 50 66 Q42 66 42 56 V20 Z M28 32 H42 M58 32 H72"], "candy": ["糖果", "M64.0 50 A14 14 0 1 0 36.0 50 A14 14 0 1 0 64.0 50 M36 50 L18 38 V62 Z M64 50 L82 38 V62 Z M44 40 L56 60"], "butterfly": ["蝴蝶", "M50 34 V74 M50 44 C36 20 12 26 18 44 C22 56 40 54 50 50 C60 20 88 26 82 44 C78 56 60 54 50 50 M50 54 C38 58 24 70 32 80 C40 86 48 72 50 62 C52 72 60 86 68 80 C76 70 62 58 50 54 M50 34 L42 22 M50 34 L58 22"], "flower": ["小花", "M56.0 42 A6 6 0 1 0 44.0 42 A6 6 0 1 0 56.0 42 M59.0 27.0 A9 9 0 1 0 41.0 27.0 A9 9 0 1 0 59.0 27.0 M73.3 37.36474508437579 A9 9 0 1 0 55.3 37.36474508437579 A9 9 0 1 0 73.3 37.36474508437579 M67.8 54.135254915624216 A9 9 0 1 0 49.8 54.135254915624216 A9 9 0 1 0 67.8 54.135254915624216 M50.2 54.135254915624216 A9 9 0 1 0 32.2 54.135254915624216 A9 9 0 1 0 50.2 54.135254915624216 M44.7 37.36474508437579 A9 9 0 1 0 26.7 37.36474508437579 A9 9 0 1 0 44.7 37.36474508437579 M50 57 Q54 72 48 88 M50 76 Q60 68 66 74"], "gift": ["礼物", "M18 38 H82 V52 H18 Z M24 52 V84 H76 V52 M50 38 V84 M50 38 C40 22 26 26 34 36 M50 38 C60 22 74 26 66 36"], "eye": ["眼睛", "M14 52 Q50 20 86 52 Q50 80 14 52 Z M60.0 52 A10 10 0 1 0 40.0 52 A10 10 0 1 0 60.0 52 M26 40 L20 30 M38 33 L35 22 M50 31 V20 M62 33 L66 22 M74 40 L80 30"]};
  ICONS.ring = ['圆圈', 'M52 10 C76 9 91 28 89 51 C87 75 67 91 46 89 C24 87 9 69 11 47 C13 27 29 12 56 14'];
  const NS = 'http://www.w3.org/2000/svg';
  const LAYERS = [{w:4.2,o:1,t:''},{w:2.2,o:.6,t:'translate(1.5 1) rotate(1.4 50 50)'},{w:1.5,o:.42,t:'translate(-1.2 .8) rotate(-1.1 50 50)'}];
  const SCALE = [3,3.4,3.8];
  function ensureDefs(root){
    if(root.getElementById('doodle-defs')) return;
    let defs = '';
    for(let f=0;f<3;f++)for(let l=0;l<3;l++){
      defs += '<filter id="dd-f'+f+l+'" x="-12%" y="-12%" width="124%" height="124%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="'+(f*7+l*3+1)+'"/><feDisplacementMap in="SourceGraphic" scale="'+SCALE[l]+'" xChannelSelector="'+(l%2?'G':'R')+'" yChannelSelector="'+(l%2?'R':'G')+'"/></filter>';
    }
    for(const k in ICONS) defs += '<path id="dd-'+k+'" d="'+ICONS[k][1]+'"/>';
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('id', 'doodle-defs'); s.setAttribute('aria-hidden', 'true');
    s.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    s.innerHTML = '<defs>'+defs+'</defs>';
    (root === document ? document.body : root).appendChild(s);
  }
  function markup(name){
    let g = '';
    for(let f=0;f<3;f++){
      g += '<g class="dd-fr dd-fr'+f+'">';
      for(let l=0;l<3;l++){ const L = LAYERS[l];
        g += '<use href="#dd-'+name+'" stroke-width="'+L.w+'"'+(L.o<1?' opacity="'+L.o+'"':'')+(L.t?' transform="'+L.t+'"':'')+' filter="url(#dd-f'+f+l+')"/>'; }
      g += '</g>';
    }
    return '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+g+'</svg>';
  }
  function drawIcons(root){
    if(!root) return;
    root.querySelectorAll('[data-doodle]').forEach(el => {
      const n = el.getAttribute('data-doodle'); if(!ICONS[n] || el.getAttribute('data-dd') === n) return;
      if(!el.hasAttribute('data-boil')) el.setAttribute('data-boil', 'on');
      el.innerHTML = markup(n); el.setAttribute('data-dd', n);
      if(!el.hasAttribute('aria-label') && !el.hasAttribute('aria-hidden')) el.setAttribute('aria-hidden', 'true');
    });
  }

  /* ===== 三个隔离层 ===== */
  const layers = {};
  function makeLayer(id, z, inner){
    let host = document.getElementById(id);
    if(!host){
      host = document.createElement('div');
      host.id = id;
      host.className = 'dd-layer';
      host.style.zIndex = z;
      document.body.appendChild(host);
      const root = host.attachShadow({mode:'open'});
      root.innerHTML = '<link rel="stylesheet" href="doodle/doodle-shadow.css">'+inner;
      /* 样式表是异步加载的：加载完再量一次首页高度 */
      root.querySelector('link').addEventListener('load', () => { if(ON()){ fit(); if(TG.on) tgLayout(); } });
      ensureDefs(root);
      layers[id] = {host, root};
    }
    return layers[id];
  }
  let mounted = false, back, home, over;
  function $(id){ return (over && over.root.getElementById(id)) || (home && home.root.getElementById(id)) || (back && back.root.getElementById(id)) || null; }

  /* ===== 声音 ===== */
  let actx = null;
  function audioCtx(){ if(!actx){ try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(actx && actx.state === 'suspended') actx.resume(); return actx; }
  const PENT = [0,2,4,7,9,12,14,16,19,21];
  function soundOn(){ return P().sound !== false; }
  function blip(i){ if(!soundOn()) return; const c = audioCtx(); if(!c) return; const now = c.currentTime, f = 620*Math.pow(2, PENT[i%PENT.length]/12);
    [[f,'triangle',.14],[f*2,'sine',.04]].forEach(v => { const o = c.createOscillator(), g = c.createGain(); o.type = v[1]; o.frequency.value = v[0];
      g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(v[2],now+.006); g.gain.exponentialRampToValueAtTime(.0008,now+.22);
      o.connect(g).connect(c.destination); o.start(now); o.stop(now+.24); });
    if(navigator.vibrate) try{ navigator.vibrate(6); }catch(e){} }
  function chime(up){ if(!soundOn()) return; const c = audioCtx(); if(!c) return; const now = c.currentTime, notes = up?[0,4,7,12]:[12,7,4,0];
    notes.forEach((n,k) => { const o = c.createOscillator(), g = c.createGain(), t0 = now+k*.05; o.type = 'sine'; o.frequency.value = 520*Math.pow(2,n/12);
      g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.08,t0+.01); g.gain.exponentialRampToValueAtTime(.0008,t0+.3); o.connect(g).connect(c.destination); o.start(t0); o.stop(t0+.32); }); }
  function rustle(dur, vol){ if(!soundOn()) return; const c = audioCtx(); if(!c) return; const n = Math.floor(c.sampleRate*dur), buf = c.createBuffer(1,n,c.sampleRate), d = buf.getChannelData(0);
    for(let i=0;i<n;i++){ const k = i/n; d[i] = (Math.random()*2-1)*Math.pow(1-k,1.6)*(0.6+0.4*Math.sin(k*40)); }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = buf; f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = .7; g.gain.value = vol||.25; s.connect(f).connect(g).connect(c.destination); s.start(); }
  let tt = 0;
  function toast(s){ const t = $('toast'); if(!t){ if(typeof showToast === 'function') showToast(s); return; } t.textContent = s; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 1600); }

  /* ===== 像素字：时间、数字、名字 ===== */
  const FONT = {'0':['.###.','#...#','#...#','#...#','#...#','#...#','.###.'],'1':['..#..','.##..','..#..','..#..','..#..','..#..','.###.'],'2':['.###.','#...#','....#','...#.','..#..','.#...','#####'],'3':['.###.','#...#','....#','..##.','....#','#...#','.###.'],'4':['...#.','..##.','.#.#.','#..#.','#####','...#.','...#.'],'5':['#####','#....','####.','....#','....#','#...#','.###.'],'6':['..##.','.#...','#....','####.','#...#','#...#','.###.'],'7':['#####','....#','...#.','..#..','.#...','.#...','.#...'],'8':['.###.','#...#','#...#','.###.','#...#','#...#','.###.'],'9':['.###.','#...#','#...#','.####','....#','...#.','.##..']};
  const px = (x,y) => '<rect x="'+x+'" y="'+y+'" width="1.06" height="1.06"/>';
  function pixClock(svg, hm){
    let x = 1, main = '', sh = '', col = '';
    for(let i=0;i<hm.length;i++){ const ch = hm[i];
      if(ch === ':'){ col += px(x,3)+px(x,6); sh += px(x+1,4)+px(x+1,7); x += 2; continue; }
      const g = FONT[ch]; for(let r=0;r<7;r++)for(let c=0;c<5;c++) if(g[r][c] === '#'){ main += px(x+c,r+1); sh += px(x+c+1,r+2); }
      x += 6; }
    const w = x, star = '<g fill="var(--dd-blue)"><rect x="'+w+'" y="0" width="1" height="1"/><rect x="'+(w-1)+'" y="1" width="3" height="1" opacity=".6"/><rect x="'+w+'" y="2" width="1" height="1" opacity=".6"/></g>';
    svg.setAttribute('viewBox', '0 0 '+(w+2)+' 10.2');
    svg.innerHTML = '<g fill="var(--dd-blue)" opacity=".55">'+sh+'</g><g fill="var(--accent)">'+main+'</g><g class="colon" fill="var(--accent)">'+col+'</g>'+star;
    svg.setAttribute('aria-label', hm);
  }
  function pixNum(svg, str){ if(!svg) return; let x = 0, m = '', sh = '';
    for(let i=0;i<str.length;i++){ const g = FONT[str[i]]; if(!g) continue; for(let r=0;r<7;r++)for(let c=0;c<5;c++) if(g[r][c] === '#'){ m += px(x+c,r); sh += px(x+c+1,r+1); } x += 6; }
    svg.setAttribute('viewBox', '0 0 '+Math.max(1,x)+' 8.2'); svg.innerHTML = '<g fill="var(--dd-blue)" opacity=".55">'+sh+'</g><g fill="var(--accent)">'+m+'</g>'; }
  function starPath(ctx,cx,cy,R,r){ ctx.beginPath(); for(let i=0;i<10;i++){ const a = -Math.PI/2+i*Math.PI/5, rr = i%2?r:R; ctx.lineTo(cx+Math.cos(a)*rr, cy+Math.sin(a)*rr); } ctx.closePath(); }
  function spiral(ctx,cx,cy,R,turns,dir,start){ ctx.beginPath(); for(let i=0;i<=80;i++){ const k = i/80, a = start+dir*k*turns*Math.PI*2, rr = R*(1-k*.8); ctx.lineTo(cx+Math.cos(a)*rr, cy+Math.sin(a)*rr); } ctx.stroke(); }
  /* 镂空像素名字：画进离屏 canvas 后转成图片缓存，聊天重绘时不必每次重算 */
  const nameCache = new Map();
  function pixelNameURL(word, o){
    o = o || {};
    /* emoji 像素化后是一团色块，去掉；中文名用大一号的细笔画，免得糊成一片 */
    word = String(word || '').replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, '').trim() || 'ta';
    const key = word+'|'+(o.outline?1:0)+'|'+(o.color||'lilac');
    if(nameCache.has(key)) return nameCache.get(key);
    const wide = /[^\x00-\x7F]/.test(word);
    const chars = Array.from(word), W = Math.max(420, 80+chars.length*22), H = 40, tiny = document.createElement('canvas'); tiny.width = W; tiny.height = H;
    const t = tiny.getContext('2d'); t.fillStyle = '#000'; t.strokeStyle = '#000'; t.lineCap = 'round'; t.lineJoin = 'round';
    const first = chars[0], rest = chars.slice(1), x0 = 22, base = 26, cap = wide ? 17 : 20, low = wide ? 15 : 11;
    t.font = wide ? '400 '+cap+'px "ZCOOL KuaiLe", sans-serif' : '700 '+cap+'px "Dancing Script", cursive'; t.lineWidth = wide ? .7 : 2.2; t.fillText(first,x0,base); t.strokeText(first,x0,base);
    const x2 = x0+t.measureText(first).width;
    t.font = wide ? '400 '+low+'px "ZCOOL KuaiLe", sans-serif' : '900 '+low+'px "Nunito", sans-serif'; t.lineWidth = wide ? .5 : 1.7; let xx = x2+1.5;
    for(let ci=0;ci<rest.length;ci++){ t.fillText(rest[ci],xx,base); t.strokeText(rest[ci],xx,base); xx += t.measureText(rest[ci]).width+(wide ? 1 : 2); }
    const end = xx-(wide ? 1 : 2), sy = base-(wide ? 11 : low)*.35; t.lineWidth = 1.9;
    t.beginPath(); t.moveTo(x0+2,base-1); t.quadraticCurveTo(x0-5,sy+3,x0-9,sy); t.stroke(); spiral(t,x0-12,sy-3,4.2,1.1,-1,.3);
    t.beginPath(); t.moveTo(end,base); t.quadraticCurveTo(end+8,base+2,end+13,sy); t.stroke(); spiral(t,end+15,sy-3,4.2,1.1,1,Math.PI*.9);
    starPath(t,x0+cap*.45,base-cap*(wide ? 1.05 : .85),4.6,2.1); t.fill();
    const d = t.getImageData(0,0,W,H).data, on = (x,y) => x>=0 && y>=0 && x<W && y<H && d[(y*W+x)*4+3] > 70;
    let minX = W, maxX = 0, minY = H, maxY = 0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++) if(on(x,y)){ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
    if(minX > maxX) return '';
    const cv = document.createElement('canvas'), cw = maxX-minX+3, ch = maxY-minY+3, cell = 4; cv.width = cw*cell; cv.height = ch*cell;
    const c = cv.getContext('2d'), col = o.color === 'accent' ? C.accent : C.lilac;
    for(let pass=0;pass<2;pass++){ c.fillStyle = pass?col:C.blue; c.globalAlpha = pass?1:.45;
      for(let y2=minY;y2<=maxY;y2++)for(let x3=minX;x3<=maxX;x3++){ if(!on(x3,y2)) continue;
        if(o.outline && on(x3-1,y2) && on(x3+1,y2) && on(x3,y2-1) && on(x3,y2+1)) continue;
        const ox = pass?0:1; c.fillRect((x3-minX+1+ox)*cell,(y2-minY+1+ox)*cell,cell,cell); } }
    const url = cv.toDataURL('image/png');
    if(fontsReady) nameCache.set(key, url);
    return url;
  }
  let fontsReady = false;
  function setName(img, word, o){ if(!img) return; const u = pixelNameURL(word, o); if(u) img.src = u; img.alt = word; }
  function pixSpark(n,c){ const s = n*2+1; let hh = ''; for(let i=0;i<s;i++){ const d = Math.abs(i-n); if(!d) continue; const o = Math.max(.25,1-d/(n+1)).toFixed(2);
      hh += '<rect x="'+i+'" y="'+n+'" width="1" height="1" opacity="'+o+'"/><rect x="'+n+'" y="'+i+'" width="1" height="1" opacity="'+o+'"/>'; }
    return {v:s, h:'<g fill="'+c+'">'+hh+'<rect x="'+(n-1)+'" y="'+(n-1)+'" width="3" height="3"/><rect x="'+n+'" y="'+n+'" width="1" height="1" fill="#fff"/></g>'}; }
  function twinkle(box, spots){ if(!box) return; let hh = ''; spots.forEach((p,i) => { const sp = pixSpark(p[2],p[4]), sz = sp.v*p[3];
      hh += '<svg style="left:'+p[0]+'%;top:'+p[1]+'%;width:'+sz+'px;height:'+sz+'px;animation-delay:'+(i*.43%2.8).toFixed(2)+'s;animation-duration:'+(2.2+(i%4)*.35)+'s" viewBox="0 0 '+sp.v+' '+sp.v+'">'+sp.h+'</svg>'; });
    box.innerHTML = hh; }
  const SB = '#8FBCEB', SL = '#CFA0E8', SW = '#E7D9F7';

  /* ===== 取原有数据 ===== */
  function couple(){ return (typeof state !== 'undefined' && state.coupleInfo) || {}; }
  function activeAgent(){ const t = state.chatTarget || 'a1'; return t === 'group' ? null : (typeof agentById === 'function' ? agentById(t) : null); }
  function taName(){ const ag = activeAgent(); if(state.chatTarget === 'group') return 'Group'; return (ag && ag.name) || 'ta'; }
  function myAvatar(){ return couple().myAvatar || ''; }
  function taAvatar(){ const ag = activeAgent(); return (ag && ag.avatar) || couple().partnerAvatar || ''; }
  const cssUrl = u => 'url("'+String(u).replace(/["\\\n]/g, m => '\\'+m)+'")';

  /* ===== 壁纸层 ===== */
  function wallMarkup(){
    const B = 'var(--dd-blue)', L = 'var(--dd-lilac)'; let hh = '';
    function line(id,x,y,s,r,c){ const tr = 'translate('+x+' '+y+') rotate('+r+' '+(50*s)+' '+(50*s)+') scale('+s+')';
      return '<g transform="'+tr+'" fill="none" stroke="'+c+'" stroke-linecap="round" stroke-linejoin="round" opacity=".6"><use href="#dd-'+id+'" stroke-width="1.5" vector-effect="non-scaling-stroke" filter="url(#dd-f00)"/><use href="#dd-'+id+'" stroke-width=".8" vector-effect="non-scaling-stroke" opacity=".6" transform="translate(2.5 1.5)" filter="url(#dd-f11)"/></g>'; }
    function fill(id,x,y,s,r,c,o){ return '<g transform="translate('+x+' '+y+') rotate('+r+' '+(50*s)+' '+(50*s)+') scale('+s+')" fill="'+c+'" opacity="'+(o||.75)+'"><use href="#dd-'+id+'"/></g>'; }
    hh += line('clef',6,40,.95,-14,B)+line('comet',4,300,.55,-8,B)+line('eye',-8,560,.7,-12,B)+line('cloud',-14,410,.62,6,B)+line('sparkle',120,6,.34,8,B);
    hh += line('cloud',282,26,.85,-4,L)+line('bow',318,340,.5,14,L)+line('sparkle',230,430,1.35,22,L)+line('clef',322,690,.6,12,L)+line('comet',270,150,.5,6,L);
    [[64,176,.13,B],[112,24,.1,B],[24,262,.11,B],[40,730,.12,B],[150,790,.1,B],[92,120,.07,B]].forEach((a,i) => { hh += fill('star',a[0],a[1],a[2],i*17,a[3]); });
    [[348,196,.12,L],[362,300,.1,L],[360,640,.13,L],[250,800,.11,L],[300,110,.08,L],[210,70,.07,L]].forEach((a,i) => { hh += fill('star',a[0],a[1],a[2],-i*13,a[3]); });
    [[330,130,.18,L],[70,650,.16,B],[196,8,.14,B],[20,470,.12,B],[368,520,.16,L]].forEach(a => { hh += fill('sparkle',a[0],a[1],a[2],0,a[3],.8); });
    return hh;
  }
  function discFace(){
    const B = 'var(--dd-blue)', L = 'var(--dd-lilac)';
    return '<circle cx="50" cy="50" r="46" fill="#FBFAFE"/>'+
      '<g fill="none" stroke="'+L+'" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(8 14) scale(.36)"><use href="#dd-clef" stroke-width="5"/></g><g transform="translate(58 10) scale(.3)"><use href="#dd-cloud" stroke-width="6"/></g><g transform="translate(56 58) scale(.32)"><use href="#dd-sparkle" stroke-width="6"/></g><g transform="translate(14 60) scale(.3)" stroke="'+B+'"><use href="#dd-eye" stroke-width="6"/></g></g>'+
      '<g fill="'+B+'"><g transform="translate(40 8) scale(.1)"><use href="#dd-star"/></g><g transform="translate(78 44) scale(.09)"><use href="#dd-star"/></g><g transform="translate(40 80) scale(.08)"><use href="#dd-star"/></g></g>'+
      '<circle cx="50" cy="50" r="13" fill="#F1EDF8" stroke="#E2DBEF"/><circle cx="50" cy="50" r="5" fill="var(--wall)"/>'+
      '<circle cx="50" cy="50" r="46.5" fill="none" stroke="#E6DFF2" stroke-width="1"/>';
  }
  function spark(el,c){ if(!el) return; let hh = ''; const n = 4; for(let i=0;i<9;i++){ const d = Math.abs(i-n); if(!d) continue; const o = Math.max(.3,1-d/5).toFixed(2); hh += '<rect x="'+i+'" y="4" width="1" height="1" opacity="'+o+'"/><rect x="4" y="'+i+'" width="1" height="1" opacity="'+o+'"/>'; }
    el.innerHTML = '<g fill="'+c+'">'+hh+'<rect x="3" y="3" width="3" height="3"/></g>'; }

  /* ===== 首页 ===== */
  const HOME_HTML = `<div class="dd-root"><main class="home" id="home">
<div class="inner" id="inner">
<div class="hero-top">
  <section class="clock" aria-label="当前时间">
    <svg class="pix" id="pix" role="img" aria-label=""></svg>
    <div class="date" id="date"></div>
  </section>
  <div class="quote" id="quote" contenteditable="true" spellcheck="false" role="textbox" aria-label="今日心语，可编辑" data-placeholder="点这里写一句话"></div>
</div>
  <section class="widget w-medium" aria-label="在一起天数与本周日历">
    <svg class="sticker s1" viewBox="0 0 9 9" aria-hidden="true"></svg>
    <div class="couple">
      <div class="avatars">
        <div class="av-box"><span class="av-ring" data-doodle="ring" data-boil="off" style="color:var(--dd-blue)"></span><button class="avatar" id="av0" aria-label="更换我的头像">+</button></div>
        <svg class="dots" viewBox="0 0 40 20" aria-hidden="true"><path d="M2 14 Q20 -2 38 14" fill="none" stroke="var(--dd-lilac)" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.1 5"/></svg>
        <span class="avatar-heart" data-doodle="heart" data-boil="on"></span>
        <div class="av-box"><span class="av-ring" data-doodle="ring" data-boil="off" style="color:var(--dd-lilac)"></span><button class="avatar" id="av1" aria-label="更换 ta 的头像">+</button></div>
      </div>
      <button class="days" id="daysBtn" aria-label="设置在一起的日期">
        <small>在一起</small>
        <span class="days-row"><svg class="pix-days" id="pixDays" aria-hidden="true"></svg><em>day</em></span>
        <span class="sr" id="days"></span>
      </button>
      <input type="file" accept="image/*" id="file" class="sr" tabindex="-1">
      <input type="date" id="startDate" class="sr" tabindex="-1">
    </div>
    <div class="vdots" aria-hidden="true"></div>
    <div class="week">
      <div class="week-head"><b id="month"></b><span class="spark" data-doodle="sparkle" data-boil="hover"></span><small id="weekNo"></small></div>
      <div class="week-grid" id="weekGrid"></div>
    </div>
  </section>
  <section class="widget w-large" aria-label="游戏、音乐与工具">
    <svg class="sticker s2" viewBox="0 0 9 9" aria-hidden="true"></svg>
    <button class="entry top" data-open="games" id="enGames"><span class="ico ico-b"><span data-doodle="comet" data-boil="hover"></span></span>游戏<span class="hint">来玩一局</span><span class="go" data-doodle="forward" data-boil="off"></span></button>
    <div class="hr" aria-hidden="true"></div>
    <div class="player" id="player">
      <div class="np">
        <div class="art-wrap">
          <div class="disc" aria-hidden="true"><svg viewBox="0 0 100 100" id="discFace"></svg></div>
          <div class="art" id="art"><span data-doodle="music" data-boil="off"></span><i class="shine"></i></div>
        </div>
        <div class="meta">
          <div class="title" id="title"></div>
          <div class="artist" id="artist"></div>
          <div class="src"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span id="srcText">已暂停</span></div>
        </div>
      </div>
      <div>
        <div class="scrub" id="scrub" role="slider" tabindex="0" aria-label="播放进度" aria-valuemin="0">
          <div class="track"><div class="fill" id="fill"></div></div>
          <svg class="knob" id="knob" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 L61 37 L92 38 L68 57 L77 88 L50 70 L23 88 L32 57 L8 38 L39 37Z"/></svg>
        </div>
        <div class="times"><span id="cur">0:00</span><span id="rem">-0:00</span></div>
      </div>
      <div class="ctrls">
        <button id="prev" aria-label="上一首"><svg width="30" height="20" viewBox="0 0 30 20"><path d="M14 10 L28 1 V19Z M1 10 L15 1 V19Z"/></svg></button>
        <button id="play" class="play" aria-label="播放"><svg id="playIcon" width="24" height="26" viewBox="0 0 26 28"><path d="M3 2 L24 14 L3 26Z"/></svg></button>
        <button id="next" aria-label="下一首"><svg width="30" height="20" viewBox="0 0 30 20"><path d="M16 10 L2 1 V19Z M29 10 L15 1 V19Z"/></svg></button>
      </div>
    </div>
    <div class="hr" aria-hidden="true"></div>
    <button class="entry bottom" data-open="tools" id="enTools"><span class="ico ico-l"><span data-doodle="key" data-boil="hover"></span></span>工具<span class="hint">小工具箱</span><span class="go" data-doodle="forward" data-boil="off"></span></button>
  </section>
</div>
</main></div>`;

  const OVER_HTML = `<div class="dd-root dd-ov" id="ovRoot">
<section class="appview" id="appview" role="dialog" aria-modal="true" aria-labelledby="avTitle" hidden>
  <svg class="wall av-wall" id="avWall" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
  <div class="twinkles" id="avTwinkles" aria-hidden="true"></div>
  <div class="av-inner">
    <header class="av-head">
      <button class="av-btn" id="avBack" aria-label="返回首页"><span data-doodle="back" data-boil="hover"></span></button>
      <h2 id="avTitle">游戏</h2>
      <button class="av-btn" id="avSound" aria-label="音效：开" aria-pressed="true"><span data-doodle="music" data-boil="hover"></span></button>
    </header>
    <div class="carousel" id="carousel" tabindex="0" aria-label="左右滑动挑选"></div>
    <div class="av-info">
      <div class="av-name" id="avName"></div>
      <div class="av-idx"><svg class="pix-idx" id="idxA" aria-hidden="true"></svg><span>/</span><svg class="pix-idx" id="idxB" aria-hidden="true"></svg><span class="sr" id="idxText"></span></div>
      <button class="av-open" id="avOpen">打开</button>
    </div>
  </div>
</section>
<section class="npv" id="np" role="dialog" aria-modal="true" aria-label="正在播放" hidden>
  <div class="npv-bg" aria-hidden="true"></div>
  <div class="twinkles" id="npTw" aria-hidden="true"></div>
  <div class="npv-inner">
    <header class="npv-head">
      <button class="av-btn" id="npClose" aria-label="收起播放页"><span class="down" data-doodle="back" data-boil="hover"></span></button>
      <img class="pxname" id="pxMusic" alt="Music">
      <button class="av-btn" id="npList" aria-label="歌单"><span data-doodle="menu" data-boil="hover"></span></button>
    </header>
    <div class="npv-dots" aria-hidden="true"><i class="on"></i><i></i></div>
    <div class="npv-pager" id="npPager">
    <div class="npv-page" id="npPage1" aria-label="播放">
    <div class="npv-stage">
      <div class="npv-art-wrap" id="npArtWrap">
        <div class="npv-disc" aria-hidden="true"><svg viewBox="0 0 100 100" id="npDiscFace"></svg></div>
        <div class="npv-art" id="npArt"><span data-doodle="music" data-boil="off"></span><i class="shine"></i></div>
      </div>
      <div class="npv-lyrics" id="npLyrics" hidden><div class="ly-scroll" id="lyScroll"></div><button class="s-btn" id="lyImport">导入 .lrc 歌词</button></div>
    </div>
    <canvas class="npv-spec" id="npSpec" aria-hidden="true"></canvas>
    <div class="npv-meta"><div class="npv-tx"><div class="npv-title" id="npTitle"></div><div class="npv-artist" id="npArtist"></div></div>
      <button class="av-btn" id="npLy" aria-pressed="false" aria-label="歌词"><span data-doodle="clef" data-boil="hover"></span></button></div>
    <div class="npv-prog">
      <div class="scrub" id="npScrub" role="slider" tabindex="0" aria-label="播放进度" aria-valuemin="0"><div class="track"><div class="fill" id="npFill"></div></div>
        <svg class="knob" id="npKnob" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 L61 37 L92 38 L68 57 L77 88 L50 70 L23 88 L32 57 L8 38 L39 37Z"/></svg></div>
      <div class="times"><span id="npCur">0:00</span><span id="npRem">-0:00</span></div>
    </div>
    <div class="npv-ctrls">
      <button class="npv-mode" id="npMode">顺序播放</button>
      <button id="npPrev" aria-label="上一首"><svg width="36" height="24" viewBox="0 0 30 20"><path d="M14 10 L28 1 V19Z M1 10 L15 1 V19Z"/></svg></button>
      <button id="npPlay" class="play" aria-label="播放"><svg id="npPlayIcon" width="28" height="30" viewBox="0 0 26 28"><path d="M3 2 L24 14 L3 26Z"/></svg></button>
      <button id="npNext" aria-label="下一首"><svg width="36" height="24" viewBox="0 0 30 20"><path d="M16 10 L2 1 V19Z M29 10 L15 1 V19Z"/></svg></button>
      <button class="npv-add" id="npAdd" aria-label="添加音乐"><span data-doodle="plus" data-boil="hover"></span></button>
    </div>
    <p class="npv-hint">左滑和 <span class="tgn">ta</span> 一起听 ›</p>
    </div>
    <div class="npv-page tg" id="tgPage" aria-label="一起听">
      <div class="tg-stage" id="tgStage">
        <svg class="tg-wire" id="tgWire" aria-hidden="true"></svg>
        <div class="tg-people">
          <div class="tg-p"><span class="tg-av" id="tgAv0"></span><small>me</small><div class="tg-bubble me" id="tgBubbleMe"></div></div>
          <div class="tg-p"><span class="tg-av" id="tgAv1"></span><small class="tgn">ta</small><div class="tg-bubble ta" id="tgBubble" aria-live="polite"></div></div>
        </div>
        <div class="tg-box" id="tgBox" aria-hidden="true">
          <svg viewBox="0 0 200 200" class="tg-disc" id="tgDisc"></svg>
        </div>
        <div class="tg-count" id="tgCount"></div>
        <div class="tg-seasons" role="radiogroup" aria-label="季节">
          <button role="radio" data-s="spring">樱花</button><button role="radio" data-s="summer">绿叶</button><button role="radio" data-s="autumn">银杏</button><button role="radio" data-s="winter">雪</button>
        </div>
        <form class="tg-comp" id="tgBar">
          <label class="sr" for="tgInput">边听边聊</label>
          <input id="tgInput" type="text" autocomplete="off" placeholder="边听边聊…">
          <button type="submit" class="c-send" aria-label="发送"><span data-doodle="send" data-boil="off"></span></button>
        </form>
      </div>
      <canvas class="tg-fx" id="tgFx" aria-hidden="true"></canvas>
    </div>
    </div>
  </div>
  <div class="npv-sheet" id="npSheet" hidden>
    <div class="npv-mask" id="npSheetMask"></div>
    <div class="npv-panel" role="dialog" aria-label="歌单">
      <div class="npv-ph"><b>歌单</b><span id="npCount"></span><button class="s-btn" id="npSearch">搜歌</button><button class="s-btn" id="npAdd2">+ 添加</button><button class="s-btn" id="npSheetClose">完成</button></div>
      <ul class="pl" id="npListUl"></ul>
      <p class="pl-tip">支持 mp3、m4a、wav 等；同名的 .lrc 文件一起选，会自动配上歌词</p>
    </div>
  </div>
  <input type="file" id="npFile" class="sr" accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg,.lrc" multiple tabindex="-1">
  <input type="file" id="lyFile" class="sr" accept=".lrc,.txt" tabindex="-1">
</section>
<section class="letters" id="letters" role="dialog" aria-modal="true" aria-label="信箱" hidden>
  <div class="lt-sky" id="ltSky" aria-hidden="true"><canvas class="lt-dust" id="ltDust"></canvas><div class="twinkles" id="ltTw"></div></div>
  <div class="lt-inner" id="ltInner">
    <header class="lt-head">
      <button class="av-btn" id="ltBack" aria-label="返回"><span data-doodle="back" data-boil="hover"></span></button>
      <img class="pxname" id="pxLetters" alt="Letters">
      <button class="lt-count" id="ltCount" aria-label="打开信箱全部信件"></button>
    </header>
    <div class="lt-scene" id="ltScene" aria-label="从天上吊下来的信"></div>
    <footer class="lt-foot">
      <button class="lt-pick" id="ltPick"><span data-doodle="sparkle" data-boil="hover"></span>随便拆一封</button>
      <p id="ltHint">手指轻轻划过，可以拨动它们</p>
    </footer>
  </div>
  <div class="sheet-wrap" id="sheetWrap" hidden>
    <div class="sheet" id="sheet">
      <div class="panel p1"><div class="face front"><div class="paper-in"></div></div><div class="face back"></div></div>
      <div class="panel p2"><div class="face front"><div class="paper-in"></div></div></div>
      <div class="panel p3"><div class="face front"><div class="paper-in"></div></div><div class="face back"></div></div>
    </div>
    <button class="lt-fold" id="ltFold">折好放回去</button>
  </div>
</section>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
</div>`;

  function mount(){
    if(mounted) return;
    mounted = true;
    ensureDefs(document);
    back = makeLayer('doodle-back', -1, '<div class="dd-root"><div class="app"><svg class="wall" id="wall" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg><div class="twinkles" id="twinkles" aria-hidden="true"></div></div></div>');
    home = makeLayer('doodle-home', 50, HOME_HTML);
    over = makeLayer('doodle-over', 300, OVER_HTML);
    back.root.getElementById('wall').innerHTML = wallMarkup();
    $('avWall').innerHTML = wallMarkup();
    $('discFace').innerHTML = discFace(); $('npDiscFace').innerHTML = discFace();
    spark(home.root.querySelector('.s1'), C.blue); spark(home.root.querySelector('.s2'), C.lilac);
    twinkle(back.root.getElementById('twinkles'), [[8,4,4,4,SB],[84,10,3,4,SL],[70,2,2,3.5,SW],[92,22,2,3,SB],[4,24,3,3.5,SL],[46,3,2,3,SL],[94,46,3,3.5,SL],[2,52,2,3.5,SB],[93,73,2,3,SB],[5,86,3,3,SL]]);
    twinkle($('npTw'), [[8,10,3,4,SB],[88,8,4,4,SL],[6,60,2,3.5,SL],[92,52,3,3.5,SB],[50,4,2,3,SW]]);
    twinkle($('avTwinkles'), [[10,8,4,4,SB],[82,6,3,4,SL],[6,70,3,3.5,SL],[90,64,4,3.5,SB],[50,12,2,3,SW],[20,86,2,3.5,SB],[78,88,3,3,SL],[94,36,2,3,SL],[3,38,2,3,SB]]);
    drawIcons(back.root); drawIcons(home.root); drawIcons(over.root);
    bindHome(); bindApps(); bindMusic(); bindLetters();
    const fonts = document.fonts ? document.fonts.load('700 24px "Dancing Script"').then(() => document.fonts.load('900 13px "Nunito"')).catch(() => {}) : Promise.resolve();
    fonts.then(() => { fontsReady = true; nameCache.clear(); if(ON()){ drawNames(); if(typeof render === 'function') render(); } });
    if(document.fonts) document.fonts.ready.then(fit);
    window.addEventListener('resize', () => { if(ON()){ fit(); if(TG.on) tgLayout(); } });
    darkMQ.addEventListener && darkMQ.addEventListener('change', () => { if(ON() && P().theme === 'system'){ nameCache.clear(); if(typeof applyThemeVars === 'function') applyThemeVars(); render(); } });
    setInterval(tick, 1000);
    loadLibrary();
  }

  /* --- 时间与日期 --- */
  const WD = ['周日','周一','周二','周三','周四','周五','周六'];
  let lastHM = '', lastDay = '';
  function tick(){
    if(!ON() || !home || home.host.hidden) return;
    const n = new Date(), hm = String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
    if(hm !== lastHM){ pixClock($('pix'), hm); lastHM = hm; }
    $('pix').classList.toggle('blink', n.getSeconds()%2 === 1);
    $('date').textContent = (n.getMonth()+1)+'月'+n.getDate()+'日 '+WD[n.getDay()];
    const dk = n.toDateString(); if(dk !== lastDay){ lastDay = dk; renderWeek(); renderDays(); }
  }
  function renderWeek(){
    const n = new Date(), dow = (n.getDay()+6)%7, mon = new Date(n); mon.setDate(n.getDate()-dow);
    let hh = ''; ['一','二','三','四','五','六','日'].forEach(x => { hh += '<span class="wd">'+x+'</span>'; });
    for(let i=0;i<7;i++){ const d = new Date(mon); d.setDate(mon.getDate()+i);
      hh += '<span class="d'+(i===dow?' today':'')+(i<dow?' past':'')+(i===6?' sun':'')+'">'+d.getDate()+(i===dow?'<span class="today-ring" data-doodle="ring" data-boil="on"></span>':'')+'</span>'; }
    $('weekGrid').innerHTML = hh; drawIcons($('weekGrid'));
    $('month').textContent = (n.getMonth()+1)+'月';
    const j = new Date(n.getFullYear(),0,1), wk = Math.ceil(((n-j)/864e5+((j.getDay()+6)%7)+1)/7); $('weekNo').textContent = '第'+wk+'周';
  }
  function renderDays(){
    const c = couple();
    let n = 0;
    try{ n = typeof daysSince === 'function' && c.startDate ? daysSince() : 0; }catch(e){ n = 0; }
    if(!isFinite(n) || n < 0) n = 0;
    $('days').textContent = '在一起第'+n+'天'; pixNum($('pixDays'), String(n));
    $('startDate').value = c.startDate || '';
  }
  function paintAvatars(){
    [[0, myAvatar()], [1, taAvatar()]].forEach(([i, src]) => {
      const el = $('av'+i); if(!el) return;
      el.style.backgroundImage = src ? cssUrl(src) : ''; el.textContent = src ? '' : '+';
    });
  }
  function paintQuote(){
    const q = $('quote'); if(!q || home.root.activeElement === q) return;
    const v = couple().statusMsg || '';
    if(q.textContent !== v) q.textContent = v;
  }
  /* 一屏装下：内容比屏幕高就等比缩小，不滚动 */
  function fit(){
    if(!home || home.host.hidden) return;
    const hm = $('home'), inner = $('inner'); if(!hm || !inner) return;
    const cs = getComputedStyle(hm), avail = hm.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
    inner.style.transform = ''; inner.style.minHeight = '';
    const hgt = inner.scrollHeight, s = Math.min(1, avail/hgt);
    if(s < 1) inner.style.transform = 'scale('+s+')'; else inner.style.minHeight = avail+'px';
  }
  let avWhich = 0;
  function bindHome(){
    const q = $('quote');
    q.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); q.blur(); } });
    q.addEventListener('blur', () => {
      const v = q.textContent.trim().slice(0,500); q.textContent = v;
      if(v !== (couple().statusMsg || '')){ state.coupleInfo.statusMsg = v; persist('coupleInfo'); toast('文案已保存'); }
    });
    ['av0','av1'].forEach((id,i) => $(id).addEventListener('click', () => { avWhich = i; const f = $('file'); f.value = ''; f.click(); }));
    $('file').addEventListener('change', () => { const f = $('file').files[0]; if(f) saveAvatar(avWhich, f); });
    const sd = $('startDate');
    $('daysBtn').addEventListener('click', () => { try{ sd.showPicker(); }catch(e){ sd.focus(); sd.click(); } });
    sd.addEventListener('change', () => { if(sd.value){ state.coupleInfo.startDate = sd.value; persist('coupleInfo'); renderDays(); toast('日期已更新'); } });
    home.root.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openView(b.dataset.open, b)));
    $('play').addEventListener('click', togglePlay); $('next').addEventListener('click', next); $('prev').addEventListener('click', prev);
    home.root.querySelector('#player .np').addEventListener('click', () => openNP(false));
    bindScrub($('scrub'));
  }
  function saveAvatar(i, f){
    const done = url => {
      if(i === 0) state.coupleInfo.myAvatar = url;
      else { const ag = activeAgent(); if(ag && ag.avatar){ ag.avatar = url; persist('agents'); } else state.coupleInfo.partnerAvatar = url; }
      persist('coupleInfo'); paintAvatars(); if(typeof render === 'function') render(); toast('头像已更新');
    };
    if(typeof compressImage === 'function') compressImage(f, 400, 400, 0.88).then(done).catch(e => toast('读取图片失败：'+e.message));
  }

  /* ===== 游戏 / 工具：像 iOS 一样从入口放大打开 ===== */
  const ICON_OF = {tavern:'candy',rewrite:'eye',hisphone:'chat',game:'paw',duel_gomoku:'star',duel_blackjack:'clover',duel_zhajinhua:'sparkle',duel_mahjong:'flower',cooking:'fish',menu:'edit',cmdgame:'key',htmlgame:'comet',workshop:'settings',mcphall:'magnet',baby:'bow',roleplay:'butterfly',calendar:'calendar',pr:'door',flightchess:'cloud',bisca_cards:'heart',bisca_daifugo:'gift',bisca_monopoly:'home',captivity:'lock',divination:'moon',truthdare:'tooth',eatapple:'cat',
    body:'heart',trip:'sun',explore:'search',phone:'mic',vps:'key',ntfy:'bell',usage:'clock',music:'music',read:'bookmark',shufang:'edit',watch:'eye',theme:'sparkle',branding:'star',prompts:'comet',
    sparkvault:'star',cabinets:'door',dream:'moon',diary:'edit',mdiary:'cat',notes:'send',mailbox:'mail',memory:'cloud',savedchat:'bookmark',album:'image',coupon:'gift',pilulier:'candy',wallet:'key',sayday:'check',love:'heart',wardrobe:'bow',duty:'clover',sigillo:'share',quest:'check','@moments':'camera'};
  function appList(kind){
    const groups = typeof FEAT_GROUPS !== 'undefined' ? FEAT_GROUPS : [];
    const isGame = g => /游戏/.test(g.label);
    if(kind === 'games') return groups.filter(isGame).flatMap(g => g.items.map(f => ({key:f.key, label:f.label, tag:g.label})));
    const rest = groups.filter(g => !isGame(g)).flatMap(g => g.items.map(f => ({key:f.key, label:f.label, tag:g.label})));
    const mail = rest.filter(f => f.key === 'mailbox');
    return mail.concat([{key:'@moments', label:'动态', tag:'日常'}], rest.filter(f => f.key !== 'mailbox'));
  }
  let av, car, cur = -1, kind = '', opener = null, list = [];
  function build(k){
    list = appList(k); const tints = ['t-b','t-l','t-p'];
    $('avTitle').textContent = k === 'games' ? '游戏' : '工具';
    car.innerHTML = list.map((a,i) => '<button class="card '+tints[i%3]+'" data-i="'+i+'" aria-label="'+h(a.label)+'"><span class="tile"><span data-doodle="'+(ICON_OF[a.key]||'sparkle')+'" data-boil="off"></span></span><span class="nm">'+h(a.label)+'</span><span class="tag">'+h(a.tag)+'</span></button>').join('');
    drawIcons(car); cur = -1;
  }
  function cardsUpdate(){
    const r = car.getBoundingClientRect(), mid = r.left+r.width/2, cards = car.children; let best = 0, bd = 1e9;
    if(!cards.length) return;
    for(let i=0;i<cards.length;i++){ const c = cards[i], cr = c.getBoundingClientRect(), d = (cr.left+cr.width/2-mid)/cr.width, ad = Math.abs(d);
      if(ad < bd){ bd = ad; best = i; } const k = Math.min(ad,2.2);
      c.style.transform = 'rotateY('+(Math.max(-1,Math.min(1,d))*-24)+'deg) scale('+(1-k*.16)+')'; c.style.opacity = (1-k*.32); c.style.zIndex = 10-Math.round(k*3); }
    if(best !== cur){ if(cur >= 0 && cards[cur]){ cards[cur].querySelector('[data-doodle]').setAttribute('data-boil','off'); blip(best); }
      cur = best; cards[best].querySelector('[data-doodle]').setAttribute('data-boil','on');
      $('avName').textContent = list[best].label; pixNum($('idxA'), String(best+1)); pixNum($('idxB'), String(list.length)); $('idxText').textContent = '第'+(best+1)+'个，共'+list.length+'个'; }
  }
  function rectVars(el, target, r0){
    const a = over.root.getElementById('ovRoot').getBoundingClientRect();
    let r = target ? target.getBoundingClientRect() : null;
    /* 入口不在屏幕上（比如从聊天页打开播放页）：从屏幕中间长出来 */
    if(!r || !r.width) r = {top:a.top+a.height*.4, bottom:a.bottom-a.height*.4, left:a.left+a.width*.3, right:a.right-a.width*.3};
    el.style.setProperty('--ct', (r.top-a.top)+'px'); el.style.setProperty('--cl', (r.left-a.left)+'px');
    el.style.setProperty('--cr', (a.right-r.right)+'px'); el.style.setProperty('--cb', (a.bottom-r.bottom)+'px'); el.style.setProperty('--cr0', r0);
  }
  function fullVars(el){ ['--ct','--cl','--cr','--cb'].forEach(p => el.style.setProperty(p,'0px')); el.style.setProperty('--cr0','0px'); }
  function setOpened(on){ document.body.classList.toggle('dd-opened', !!on); }
  function openView(k, btn){
    audioCtx(); kind = k; opener = btn; build(k); rectVars(av, btn, '16px'); av.classList.remove('show','closing'); av.hidden = false;
    car.scrollLeft = 0; requestAnimationFrame(() => { cardsUpdate(); requestAnimationFrame(() => { fullVars(av); av.classList.add('show'); setOpened(true); }); });
    chime(true); setTimeout(() => car.focus({preventScroll:true}), 450);
  }
  function closeView(){
    if(av.hidden) return; av.classList.add('closing'); av.classList.remove('show'); if(opener) rectVars(av, opener, '16px'); setOpened(false); chime(false);
    setTimeout(() => { av.hidden = true; av.classList.remove('closing'); if(opener) opener.focus({preventScroll:true}); }, 520);
  }
  /* 进入真功能：用首页里藏着的原生 data-sub 按钮，特殊入口（牌室、囚禁模拟器…）也照原处理器走 */
  function goFeature(key){
    av.hidden = true; av.classList.remove('show','closing'); setOpened(false);
    if(key === '@moments'){ state.tab = 'moments'; state.subPage = null; render(); return; }
    const btn = document.querySelector('#dd-subs [data-sub="'+(window.CSS && CSS.escape ? CSS.escape(key) : key)+'"]');
    if(btn) btn.click(); else { state.tab = 'home'; state.subPage = key; render(); }
  }
  function openApp(){
    const c = car.children[cur]; if(!c) return; const it = list[cur];
    if(it.key === 'mailbox'){ chime(true); openLetters(c); return; }
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); chime(true);
    setTimeout(() => goFeature(it.key), 180);
  }
  function bindApps(){
    av = $('appview'); car = $('carousel');
    let raf = 0; car.addEventListener('scroll', () => { if(!raf) raf = requestAnimationFrame(() => { raf = 0; cardsUpdate(); }); }, {passive:true});
    car.addEventListener('click', e => { const c = e.target.closest('.card'); if(!c) return; const i = +c.dataset.i;
      if(i === cur) openApp(); else c.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'}); });
    car.addEventListener('keydown', e => { if(e.key === 'ArrowRight' || e.key === 'ArrowLeft'){ e.preventDefault(); const n = Math.max(0, Math.min(car.children.length-1, cur+(e.key === 'ArrowRight'?1:-1))); car.children[n].scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'}); } });
    $('avOpen').addEventListener('click', openApp);
    $('avBack').addEventListener('click', closeView);
    $('avSound').addEventListener('click', function(){ const on = !soundOn(); setP('sound', on); syncSound(); if(on) blip(0); toast(on?'音效已打开':'音效已关闭'); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape' && ON() && av && !av.hidden) closeView(); });
  }
  function syncSound(){ const b = $('avSound'); if(!b) return; const on = soundOn(); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', '音效：'+(on?'开':'关')); }

  /* ===== 音乐：接原有播放器（ensureAudio / musicNow / musicQueue），另加本地音乐库 ===== */
  const audioEl = () => typeof ensureAudio === 'function' ? ensureAudio() : null;
  let lib = [], lyr = [], lyOn = false, lyUserScroll = 0, lyCur = -1, lyKey = '';
  const fmt = s => { s = Math.max(0, Math.floor(s||0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
  let dbp = null;
  function db(){ if(dbp) return dbp; dbp = new Promise((res,rej) => { try{ const r = indexedDB.open('doodle-music',1); r.onupgradeneeded = () => r.result.createObjectStore('songs',{keyPath:'id'}); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }catch(e){ rej(e); } }); return dbp; }
  function dbAll(){ return db().then(d => new Promise(res => { const q = d.transaction('songs').objectStore('songs').getAll(); q.onsuccess = () => res(q.result||[]); q.onerror = () => res([]); })).catch(() => []); }
  function dbPut(s){ const o = {id:s.id,title:s.title,artist:s.artist,blob:s.blob,coverBlob:s.coverBlob||null,lrc:s.lrc||'',order:s.order};
    return db().then(d => new Promise(res => { const tx = d.transaction('songs','readwrite'); tx.objectStore('songs').put(o); tx.oncomplete = res; tx.onerror = res; })).catch(() => {}); }
  function dbDel(id){ return db().then(d => new Promise(res => { const tx = d.transaction('songs','readwrite'); tx.objectStore('songs').delete(id); tx.oncomplete = res; tx.onerror = res; })).catch(() => {}); }
  /* 示例：用代码合成一段八音盒 */
  function makeDemo(){
    const SR = 22050, len = 24, OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if(!OAC) return Promise.resolve(null);
    const c = new OAC(1,SR*len,SR), E = .375, mel = [76,79,81,79,76,74,72,74, 76,79,84,81,79,0,76,0, 81,84,86,84,81,79,76,79, 81,79,76,74,72,0,0,0];
    function bell(t,m,v){ const f = 440*Math.pow(2,(m-69)/12); [[1,1],[2,.28],[3.01,.1]].forEach(p => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f*p[0];
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v*p[1],t+.004); g.gain.exponentialRampToValueAtTime(.0005,t+1.8/p[0]); o.connect(g).connect(c.destination); o.start(t); o.stop(t+2); }); }
    for(let r=0;r<3;r++) mel.forEach((m,i) => { const t = r*mel.length*E+i*E+.4; if(m && t < len-1.5) bell(t,m,.22); });
    const bass = [48,43,45,41]; for(let k=0;k<len/(E*4);k++){ const t = k*E*4+.4; if(t < len-1.5) bell(t,bass[k%4],.12); }
    return c.startRendering().then(buf => { const d = buf.getChannelData(0), n = d.length, ab = new ArrayBuffer(44+n*2), v = new DataView(ab);
      const w = (o,s) => { for(let i=0;i<s.length;i++) v.setUint8(o+i, s.charCodeAt(i)); };
      w(0,'RIFF'); v.setUint32(4,36+n*2,true); w(8,'WAVE'); w(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true); v.setUint32(24,SR,true); v.setUint32(28,SR*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); w(36,'data'); v.setUint32(40,n*2,true);
      for(let i=0;i<n;i++){ const x = Math.max(-1,Math.min(1,d[i]*.9)); v.setInt16(44+i*2, x*32767, true); }
      const cv = document.createElement('canvas'); cv.width = cv.height = 300; const g = cv.getContext('2d'), gr = g.createLinearGradient(0,0,300,300); gr.addColorStop(0,'#D9B3EE'); gr.addColorStop(1,'#9CC2EC'); g.fillStyle = gr; g.fillRect(0,0,300,300);
      g.fillStyle = '#fff'; const pxs = 12, cx = 12, cy = 12, arm = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2],[3,0],[-3,0],[0,3],[0,-3]]; arm.forEach((a,j) => { g.globalAlpha = j<5?1:j<9?.75:.45; g.fillRect((cx+a[0])*pxs,(cy+a[1])*pxs,pxs,pxs); });
      g.globalAlpha = 1; g.font = '700 34px Gaegu, sans-serif'; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText('music box',22,272);
      return {id:'dd-demo', title:'八音盒', artist:'Demo', dur:len, url:URL.createObjectURL(new Blob([ab],{type:'audio/wav'})), cover:cv.toDataURL('image/png'), order:0,
        lrc:'[00:00.40]八音盒在转，雪在下\n[00:03.40]눈이 내리는 밤\n[00:06.40]把今天折成一颗星星\n[00:09.40]放进你的口袋里\n[00:12.40]반짝반짝 작은 별\n[00:15.40]闪呀闪，一直到天亮\n[00:18.40]晚安，明天见\n[00:21.40]♪'}; });
  }
  /* ID3 标签：标题、歌手、封面 */
  function readID3(file){ return file.slice(0, Math.min(file.size, 4*1024*1024)).arrayBuffer().then(buf => { const b = new Uint8Array(buf), out = {};
    if(b.length < 10 || b[0] !== 73 || b[1] !== 68 || b[2] !== 51) return out; const ver = b[3], size = (b[6]<<21)|(b[7]<<14)|(b[8]<<7)|b[9]; let p = 10; const end = Math.min(b.length, 10+size);
    const dec = (arr,enc) => { try{ return new TextDecoder(enc===0?'latin1':enc===3?'utf-8':enc===2?'utf-16be':'utf-16').decode(arr).replace(/\u0000+$/,'').replace(/^﻿/,''); }catch(e){ return ''; } };
    while(p+10 < end){ const id = String.fromCharCode(b[p],b[p+1],b[p+2],b[p+3]); if(!/^[A-Z0-9]{4}$/.test(id)) break;
      const fs = ver === 4 ? ((b[p+4]<<21)|(b[p+5]<<14)|(b[p+6]<<7)|b[p+7]) : ((b[p+4]<<24)|(b[p+5]<<16)|(b[p+6]<<8)|b[p+7]); const d = b.subarray(p+10, p+10+fs);
      if(id === 'TIT2') out.title = dec(d.subarray(1), d[0]); else if(id === 'TPE1') out.artist = dec(d.subarray(1), d[0]);
      else if(id === 'APIC' && !out.cover){ const enc = d[0]; let i = 1; while(i < d.length && d[i] !== 0) i++; const mime = dec(d.subarray(1,i),0) || 'image/jpeg'; i += 2;
        if(enc === 1 || enc === 2){ while(i+1 < d.length && !(d[i] === 0 && d[i+1] === 0)) i += 2; i += 2; } else { while(i < d.length && d[i] !== 0) i++; i++; }
        out.cover = new Blob([d.subarray(i)], {type: mime.indexOf('/') > 0 ? mime : 'image/'+mime.toLowerCase()}); }
      p += 10+fs; }
    return out; }).catch(() => ({})); }
  function coverOf(s){ if(s.cover) return s.cover; if(s.coverBlob){ s.cover = URL.createObjectURL(s.coverBlob); return s.cover; } return ''; }
  function urlOf(s){ if(!s.url && s.blob) s.url = URL.createObjectURL(s.blob); return s.url; }
  const toNative = s => ({id:s.id, name:s.title, artists:[s.artist], cover:coverOf(s), source:'local', dur:0});
  const libById = id => lib.find(s => String(s.id) === String(id));
  function loadLibrary(){
    Promise.all([dbAll(), P().demoHidden ? Promise.resolve(null) : makeDemo()]).then(r => {
      const saved = r[0].sort((a,b) => a.order-b.order), demo = r[1];
      lib = (demo ? [demo] : []).concat(saved);
      /* 上次放的是本地歌：重启后 blob 地址失效，换成新的 */
      const n = state.musicNow;
      if(n && n.source === 'local'){ const s = libById(n.id); if(s){ n.url = urlOf(s); n.cover = coverOf(s); } }
      paint(); renderList();
    });
  }
  /* 原有播放器播到本地歌时走这里（musicResolveAndPlay 的钩子） */
  async function playLocal(song){
    const s = libById(song && song.id); const a = audioEl();
    if(!s || !a){ toast('这首本地歌已经不在歌单里了'); return; }
    a.src = urlOf(s);
    try{ await a.play(); }catch(e){}
    state.musicNow = Object.assign(toNative(s), {url:a.src});
    state.musicPlaying = !a.paused; state.musicError = ''; state.musicLyric = s.lrc || '';
    try{ persist('musicNow'); }catch(e){}
    if(typeof render === 'function') render();
  }
  function curSong(){
    const n = state.musicNow;
    if(n) return {id:n.id, title:n.name||'未知曲目', artist:Array.isArray(n.artists)?n.artists.join(' / '):(n.artists||''), cover:n.cover||'', local:n.source === 'local'};
    const s = lib[0]; return s ? {id:s.id, title:s.title, artist:s.artist, cover:coverOf(s), local:true} : null;
  }
  const isPlaying = () => { const a = document.getElementById('mp-audio'); return !!(a && !a.paused && a.src); };
  function queueList(){ const q = state.musicQueue || []; return q.length ? q : lib.map(toNative); }
  function ensureQueue(){
    if((state.musicQueue||[]).length || !lib.length) return;
    const list = lib.map(toNative), id = state.musicNow && state.musicNow.id;
    musicSetQueue(list, Math.max(0, list.findIndex(s => String(s.id) === String(id))));
  }
  function togglePlay(){
    audioCtx(); const a = audioEl(); const n = state.musicNow;
    if(!n){ if(lib.length){ ensureQueue(); playLocal(lib[0]); } else openNativeMusic(); return; }
    if(n.source === 'local'){ const s = libById(n.id); if(s && a.paused && a.src !== urlOf(s)){ playLocal(s); return; } }
    if(typeof musicTogglePlay === 'function') musicTogglePlay();
  }
  function next(){
    ensureQueue(); const q = state.musicQueue || []; if(!q.length) return;
    if(P().mode === 'shuf' && q.length > 1){ let j; do{ j = Math.floor(Math.random()*q.length); }while(j === state.musicQueueIndex); musicPlayQueueAt(j); }
    else musicPlayNext();
  }
  function prev(){
    const a = document.getElementById('mp-audio');
    if(a && a.currentTime > 3){ a.currentTime = 0; paint(); return; }
    ensureQueue(); if((state.musicQueue||[]).length) musicPlayPrev();
  }
  /* 一首放完：按播放模式接下一首（musicAutoNext 的钩子），返回 true 表示已处理 */
  function onEnded(){
    if(!ON()) return false;
    const q = state.musicQueue || [], idx = state.musicQueueIndex, a = audioEl();
    if(P().mode === 'one'){ a.currentTime = 0; a.play().catch(() => {}); return true; }
    if(!q.length || idx < 0 || idx >= q.length) return false;
    if(state.musicNow && String(state.musicNow.id) !== String(q[idx].id)) return false;
    if(P().mode === 'shuf' && q.length > 1){ let j; do{ j = Math.floor(Math.random()*q.length); }while(j === idx); musicPlayQueueAt(j); return true; }
    musicPlayQueueAt(idx+1); return true;
  }
  function openNativeMusic(){ closeNP(true); state.tab = 'home'; state.subPage = 'music'; render(); }
  /* 歌词 */
  function parseLRC(txt){ const out = []; (txt||'').split(/\r?\n/).forEach(line => { const tags = line.match(/\[\d+:\d+(?:[.:]\d+)?\]/g); if(!tags) return; const text = line.replace(/\[[^\]]*\]/g,'').trim();
    tags.forEach(tg => { const m = tg.match(/\[(\d+):(\d+)(?:[.:](\d+))?\]/); out.push({t:+m[1]*60 + +m[2] + (m[3] ? +('0.'+m[3]) : 0), x:text||'♪'}); }); }); return out.sort((a,b) => a.t-b.t); }
  function lyricText(){ const n = state.musicNow; if(!n){ return lib[0] ? lib[0].lrc : ''; } if(n.source === 'local'){ const s = libById(n.id); return s ? s.lrc : ''; } return state.musicLyric || ''; }
  function renderLyrics(){
    const txt = lyricText(), key = (state.musicNow && state.musicNow.id)+'|'+txt.length; if(key === lyKey) return; lyKey = key;
    lyr = parseLRC(txt); const box = $('lyScroll');
    box.innerHTML = lyr.length ? lyr.map((l,i) => '<p data-i="'+i+'">'+h(l.x)+'</p>').join('') : '<p class="ly-none">这首歌还没有歌词</p>';
    $('lyImport').textContent = lyr.length ? '换一份歌词' : '导入 .lrc 歌词'; lyCur = -1;
  }
  function lyTick(){
    if(!lyOn || !lyr.length) return; const a = document.getElementById('mp-audio'); const t = a ? a.currentTime : 0; let i = -1;
    for(let k=0;k<lyr.length;k++){ if(lyr[k].t <= t+.15) i = k; else break; }
    if(i !== lyCur){ const ps = $('lyScroll').children; if(ps[lyCur]) ps[lyCur].classList.remove('on'); lyCur = i;
      if(ps[i]){ ps[i].classList.add('on'); if(Date.now()-lyUserScroll > 2500){ const box = $('lyScroll'); box.scrollTo({top:ps[i].offsetTop-box.clientHeight/2+ps[i].offsetHeight/2, behavior:'smooth'}); } } }
  }
  /* 画面：首页插件与播放页一起刷新 */
  let metaKey = '';
  function paintMeta(){
    const s = curSong(), key = s ? s.id+'|'+s.title+'|'+s.cover : '';
    if(key === metaKey) return; metaKey = key;
    if(!s){
      $('title').textContent = '还没有歌'; $('artist').textContent = '点这里添加'; $('npTitle').textContent = '还没有歌'; $('npArtist').textContent = '点右下角 + 添加音乐';
      ['art','npArt'].forEach(id => { $(id).style.backgroundImage = ''; $(id).classList.remove('has-cover'); });
    } else {
      $('title').textContent = s.title; $('artist').textContent = s.artist; $('npTitle').textContent = s.title; $('npArtist').textContent = s.artist;
      ['art','npArt'].forEach(id => { const el = $(id); el.style.backgroundImage = s.cover ? cssUrl(s.cover) : ''; el.classList.toggle('has-cover', !!s.cover); });
      if(TG.on){ tgPaint(); tgSay('这首是「'+s.title+'」诶'); }
    }
    renderLyrics(); renderList();
  }
  function paint(){
    if(!mounted) return;
    paintMeta();
    const a = document.getElementById('mp-audio'), playing = isPlaying();
    const d = a && a.src && a.duration && isFinite(a.duration) ? a.duration : (!state.musicNow && lib[0] ? (lib[0].dur || 0) : 0), t = (a && a.src && a.currentTime) || 0, pc = d ? t/d*100 : 0;
    ['','np'].forEach(p => { const f = $(p?'npFill':'fill'), k = $(p?'npKnob':'knob'); if(f) f.style.width = pc+'%'; if(k) k.style.left = pc+'%';
      $(p?'npCur':'cur').textContent = fmt(t); $(p?'npRem':'rem').textContent = '-'+fmt(d-t); });
    [$('scrub'),$('npScrub')].forEach(sc => { sc.setAttribute('aria-valuemax', Math.round(d)); sc.setAttribute('aria-valuenow', Math.round(t)); sc.setAttribute('aria-valuetext', fmt(t)); });
    $('srcText').textContent = playing ? '正在播放' : '已暂停'; $('player').classList.toggle('playing', playing); $('np').classList.toggle('playing', playing);
    const ic = playing ? '<path d="M4 2 H10 V26 H4Z M16 2 H22 V26 H16Z"/>' : '<path d="M3 2 L24 14 L3 26Z"/>';
    $('playIcon').innerHTML = ic; $('npPlayIcon').innerHTML = ic;
    $('play').setAttribute('aria-label', playing?'暂停':'播放'); $('npPlay').setAttribute('aria-label', playing?'暂停':'播放');
    if(TG.on) tgPaint();
    lyTick();
  }
  let uiLoop = 0;
  function loopUI(){ if(uiLoop) return; const step = () => { uiLoop = 0; paint(); drawSpec(); if(isPlaying() || specDecay > 0) uiLoop = requestAnimationFrame(step); }; uiLoop = requestAnimationFrame(step); }
  /* 频谱：远程歌曲多半不带跨域头，接分析器会把声音静音，所以这里一律画装饰频谱；省电模式下不画 */
  const specVals = new Array(24).fill(0); let specDecay = 0;
  function drawSpec(){
    const cv = $('npSpec'); if(!cv || $('np').hidden || !cv.clientWidth) return;
    const w = cv.clientWidth, hh = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio||1);
    if(cv.width !== Math.round(w*dpr)){ cv.width = Math.round(w*dpr); cv.height = Math.round(hh*dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,w,hh);
    if(P().saver) return;
    const N = 24, bw = w/N, cell = 4, rows = Math.floor(hh/cell), playing = isPlaying(), now = performance.now();
    for(let i=0;i<N;i++){ let v = 0;
      if(playing) v = .22+.2*Math.sin(now/180+i)+.18*Math.sin(now/97+i*2.3)*Math.sin(now/410+i*.7)+.12*Math.random();
      specVals[i] = Math.max(Math.min(1,Math.max(0,v)), specVals[i]*.9); const hc = Math.max(1, Math.round(specVals[i]*rows));
      for(let r=0;r<hc;r++){ const k = r/rows; g.fillStyle = k < .5 ? 'rgba(156,194,236,'+(.55+k*.8)+')' : 'rgba(207,160,232,'+(.6+k*.4)+')'; g.fillRect(i*bw+1, hh-(r+1)*cell+1, bw-2, cell-1); } }
    specDecay = playing ? 20 : specDecay-1;
  }
  function bindScrub(sc){
    const seek = e => { const a = document.getElementById('mp-audio'); if(!a) return; const r = sc.getBoundingClientRect(), p = Math.min(1, Math.max(0, (e.clientX-r.left)/r.width)), d = a.duration; if(d && isFinite(d)){ a.currentTime = p*d; paint(); } };
    sc.addEventListener('pointerdown', e => { sc.setPointerCapture(e.pointerId); sc.classList.add('drag'); seek(e); });
    sc.addEventListener('pointermove', e => { if(sc.classList.contains('drag')) seek(e); });
    sc.addEventListener('pointerup', () => sc.classList.remove('drag')); sc.addEventListener('pointercancel', () => sc.classList.remove('drag'));
    sc.addEventListener('keydown', e => { const a = document.getElementById('mp-audio'); if(!a) return; const d = a.duration||0; if(e.key === 'ArrowRight'){ a.currentTime = Math.min(d, a.currentTime+5); paint(); } if(e.key === 'ArrowLeft'){ a.currentTime = Math.max(0, a.currentTime-5); paint(); } });
  }
  const MODES = {seq:'顺序播放', shuf:'随机播放', one:'单曲循环'};
  function paintMode(){ $('npMode').textContent = MODES[P().mode] || MODES.seq; }
  /* 歌单 */
  function renderList(){
    const ul = $('npListUl'); if(!ul) return; const ql = queueList(), curId = state.musicNow ? String(state.musicNow.id) : (lib[0] ? String(lib[0].id) : '');
    ul.innerHTML = ql.map((s,i) => { const c = s.cover || ''; const on = String(s.id) === curId;
      return '<li class="'+(on?'cur':'')+'"><button class="pl-main" data-i="'+i+'"><span class="pl-cv" style="'+(c?'background-image:'+h(cssUrl(c)):'')+'"></span><span class="pl-tx"><b>'+h(s.name)+'</b><small>'+h((s.artists||[]).join(' / '))+'</small></span>'+(on?'<span class="eq"><i></i><i></i><i></i><i></i></span>':'')+'</button><button class="pl-del" data-del="'+i+'" aria-label="删除 '+h(s.name)+'">×</button></li>'; }).join('');
    $('npCount').textContent = ql.length+' 首';
  }
  function sheetToggle(on){ const sh = $('npSheet'); if(on){ sh.hidden = false; requestAnimationFrame(() => sh.classList.add('on')); } else { sh.classList.remove('on'); setTimeout(() => { sh.hidden = true; }, 300); } }
  function addFiles(files){
    const arr = [].slice.call(files), lrcs = arr.filter(f => /\.lrc$|\.txt$/i.test(f.name)), auds = arr.filter(f => /^audio\//.test(f.type) || /\.(mp3|m4a|aac|wav|flac|ogg)$/i.test(f.name));
    const jobs = auds.map((f,k) => readID3(f).then(tag => { const base = f.name.replace(/\.[^.]+$/,''), parts = base.split(/\s+-\s+/), t = tag.title || (parts[1]||parts[0]), a = tag.artist || (parts[1]?parts[0]:'未知歌手');
      const lr = lrcs.filter(l => l.name.replace(/\.[^.]+$/,'') === base)[0];
      return (lr ? lr.text() : Promise.resolve('')).then(txt => { const s = {id:'dd-'+Date.now().toString(36)+k+Math.random().toString(36).slice(2,5), title:t, artist:a, blob:f, coverBlob:tag.cover||null, lrc:txt, order:Date.now()+k}; return dbPut(s).then(() => s); }); }));
    Promise.all(jobs).then(ss => {
      if(!ss.length){ if(lrcs.length) lrcs[0].text().then(importLyrics); return; }
      ss.forEach(s => lib.push(s));
      const q = state.musicQueue || [];
      if(!q.length || q.every(x => x.source === 'local')){ const list = lib.map(toNative), id = state.musicNow && state.musicNow.id; musicSetQueue(list, Math.max(0, list.findIndex(x => String(x.id) === String(id)))); }
      else ss.forEach(s => q.push(toNative(s)));
      metaKey = ''; paint(); renderList(); toast('已添加 '+ss.length+' 首'); blip(6);
    });
  }
  function importLyrics(txt){
    const n = state.musicNow, s = n ? (n.source === 'local' ? libById(n.id) : null) : lib[0];
    if(s){ s.lrc = txt; if(s.id !== 'dd-demo') dbPut(s); if(n) state.musicLyric = txt; }
    else if(n) state.musicLyric = txt;
    else return;
    lyKey = ''; renderLyrics(); lyCur = -1; lyTick(); toast(parseLRC(txt).length ? '歌词已导入' : '没读到时间轴，确认是 .lrc 吗？');
  }
  function deleteAt(i){
    const ql = queueList(), s = ql[i]; if(!s) return;
    const isQ = (state.musicQueue||[]).length > 0;
    if(!confirm((s.source === 'local' ? '从歌单删除「' : '从播放队列移除「')+s.name+'」？')) return;
    if(s.source === 'local'){ if(s.id === 'dd-demo') setP('demoHidden', true); else dbDel(s.id); lib = lib.filter(x => String(x.id) !== String(s.id)); }
    if(isQ){ state.musicQueue.splice(i,1); if(i < state.musicQueueIndex) state.musicQueueIndex--; if(state.musicQueueIndex >= state.musicQueue.length) state.musicQueueIndex = state.musicQueue.length-1; }
    const wasCur = state.musicNow && String(state.musicNow.id) === String(s.id);
    if(wasCur){ const a = audioEl(); const q = state.musicQueue || [];
      if(q.length) musicPlayQueueAt(Math.max(0, state.musicQueueIndex)); else { a.pause(); a.removeAttribute('src'); state.musicNow = null; state.musicPlaying = false; persist('musicNow'); } }
    metaKey = ''; paint(); renderList();
  }
  /* 播放页 打开/关闭 */
  let NP, pager, pageIdx = 0;
  function openNP(together){
    const plyr = $('player'); rectVars(NP, plyr, '24px'); pager.scrollLeft = 0; NP.hidden = false; NP.classList.remove('show');
    setName($('pxMusic'), 'Music', {outline:true}); paintMode(); metaKey = ''; paint();
    requestAnimationFrame(() => requestAnimationFrame(() => { fullVars(NP); NP.classList.add('show'); setOpened(true); loopUI(); if(lyOn) setTimeout(lyTick,50);
      if(together){ pager.scrollTo({left:pager.clientWidth, behavior:'smooth'}); } }));
    chime(true);
  }
  function closeNP(instant){
    if(!NP || NP.hidden) return; tgLeave(); NP.classList.remove('show');
    if(instant){ NP.hidden = true; setOpened(false); return; }
    rectVars(NP, $('player'), '24px'); setOpened(false); chime(false); setTimeout(() => { NP.hidden = true; }, 520);
  }
  function bindMusic(){
    NP = $('np'); pager = $('npPager');
    const a = audioEl();
    if(a) ['timeupdate','loadedmetadata','durationchange','play','pause','emptied'].forEach(ev => a.addEventListener(ev, () => { if(!ON()) return; if(ev === 'play') loopUI(); paint(); }));
    $('npPlay').addEventListener('click', togglePlay); $('npNext').addEventListener('click', next); $('npPrev').addEventListener('click', prev);
    bindScrub($('npScrub'));
    $('npMode').addEventListener('click', () => { const m = P().mode, nx = m === 'seq' ? 'shuf' : m === 'shuf' ? 'one' : 'seq'; setP('mode', nx); paintMode(); blip(3); toast(MODES[nx]); });
    $('npClose').addEventListener('click', () => closeNP(false));
    document.addEventListener('keydown', e => { if(e.key === 'Escape' && ON() && NP && !NP.hidden){ if(!$('npSheet').hidden) sheetToggle(false); else closeNP(false); } });
    $('npLy').addEventListener('click', function(){ lyOn = !lyOn; this.setAttribute('aria-pressed', lyOn); $('npLyrics').hidden = !lyOn; $('npArtWrap').hidden = lyOn; lyCur = -1; if(lyOn){ renderLyrics(); lyTick(); } blip(5); });
    $('lyScroll').addEventListener('scroll', () => { lyUserScroll = Date.now(); }, {passive:true});
    $('lyScroll').addEventListener('click', e => { const p = e.target.closest('p[data-i]'); const au = document.getElementById('mp-audio'); if(!p || !au) return; au.currentTime = lyr[+p.dataset.i].t; lyUserScroll = 0; paint(); });
    $('lyImport').addEventListener('click', () => { $('lyFile').value = ''; $('lyFile').click(); });
    $('lyFile').addEventListener('change', function(){ const f = this.files[0]; if(f) f.text().then(importLyrics); });
    $('npList').addEventListener('click', () => { renderList(); sheetToggle(true); });
    $('npSheetClose').addEventListener('click', () => sheetToggle(false)); $('npSheetMask').addEventListener('click', () => sheetToggle(false));
    $('npSearch').addEventListener('click', () => { sheetToggle(false); openNativeMusic(); });
    $('npListUl').addEventListener('click', e => {
      const d = e.target.closest('[data-del]'); if(d){ deleteAt(+d.dataset.del); return; }
      const m = e.target.closest('[data-i]'); if(!m) return; const i = +m.dataset.i;
      if(!(state.musicQueue||[]).length) musicSetQueue(lib.map(toNative), i);
      musicPlayQueueAt(i); sheetToggle(false);
    });
    $('npAdd').addEventListener('click', () => { $('npFile').value = ''; $('npFile').click(); }); $('npAdd2').addEventListener('click', () => { $('npFile').value = ''; $('npFile').click(); });
    $('npFile').addEventListener('change', function(){ if(this.files.length) addFiles(this.files); });
    pager.addEventListener('scroll', () => { const i = Math.round(pager.scrollLeft/Math.max(1, pager.clientWidth)); if(i !== pageIdx){ pageIdx = i;
      NP.querySelectorAll('.npv-dots i').forEach((d,k) => d.classList.toggle('on', k === i)); if(i === 1) tgEnter(); else tgLeave(); blip(i?6:2); } }, {passive:true});
    NP.querySelector('.tg-seasons').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if(!b || b.dataset.s === TG.season) return; TG.season = b.dataset.s; setP('season', TG.season);
      TG.parts = []; TG.surf.forEach(s => { if(s.h) s.h.fill(0); s.list = []; }); tgPaint(); blip(['spring','summer','autumn','winter'].indexOf(TG.season)*2+1);
      preSnow(); loadSprites(TG.season).then(() => tgSay()); });
    $('tgBar').addEventListener('submit', e => { e.preventDefault(); audioCtx(); const inp = $('tgInput'), v = inp.value.trim(); if(!v) return; inp.value = ''; meSay(v); blip(4); sendToPartner(v); });
    if(reducedMQ.matches) Object.keys(SEAS).forEach(k => { SEAS[k].rate = .8; });
  }

  /* ===== 一起听：边听边聊直接发进当前聊天（原有发送与回复流程） ===== */
  const TG = {on:false, season:'', parts:[], surf:[], sprites:{}, raf:0, last:0, spawnAcc:0, sec:0, secAcc:0, bubbleT:0};
  const SEAS = {
    spring:{rate:5,vy:[.6,1.1],sway:1.4,flip:true,talk:['樱花落在耳机线上了','这首适合在树下听','花瓣掉进你头发里啦']},
    summer:{rate:4,vy:[.7,1.2],sway:1.1,flip:true,talk:['夏天的风把叶子吹过来了','这首听着好清爽','想和你去海边听这首']},
    autumn:{rate:4.5,vy:[.7,1.3],sway:1.6,flip:true,talk:['银杏叶铺了一地，好亮','这首有点像秋天的下午','要不要踩踩落叶']},
    winter:{rate:10,vy:[.55,1.05],sway:.7,flip:false,talk:['雪落在我们中间了','耳机线上积雪了诶','你冷不冷，我把围巾分你一半']}};
  function defaultSeason(){ const m = new Date().getMonth()+1; return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; }
  let tgWait = null;
  function sendToPartner(text){
    if(typeof sendUserMsg !== 'function') return;
    const tg = state.chatTarget || 'a1';
    if(state.tab !== 'chat'){ const th = (state.chatThreads && state.chatThreads[tg]) || {messages:[], pendingUser:[]}; state.messages = th.messages || []; state.pendingUser = th.pendingUser || []; }
    const draft = state.chatInput || '', before = (state.messages || []).length;
    state.chatInput = text; sendUserMsg(); state.chatInput = draft;
    if((state.pendingUser || []).length && !state.chatLoading && typeof triggerAIReply === 'function'){
      tgWait = {n: before}; const b = $('tgBubble'); b.textContent = '……'; b.classList.add('on'); clearTimeout(b._t);
      Promise.resolve(triggerAIReply()).catch(() => {}).then(watchReply);
    }
  }
  function watchReply(){
    if(!tgWait || state.chatLoading) return;
    const msgs = state.messages || []; let reply = '';
    for(let i = msgs.length-1; i >= tgWait.n; i--){ const m = msgs[i]; if(m && m.role === 'assistant' && !m.toolNote && !m.notice && String(m.content||'').trim()){ reply = String(m.content); break; } }
    tgWait = null;
    if(reply){ tgSay(reply.replace(/\s+/g,' ').slice(0,60)+(reply.length > 60 ? '…' : '')); blip(7); }
    else { const b = $('tgBubble'); b.classList.remove('on'); }
  }
  function svgImg(inner, seed){ const s = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 40 40"><defs><filter id="p" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.3 .35" numOctaves="2" seed="'+seed+'" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.25 1.2" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter></defs>'+inner+'</svg>';
    return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s); }); }
  function shapes(season){
    if(season === 'spring') return [['#F8C1D3','#E597B2'],['#FAD3DF','#EBA7BF'],['#F4B3C9','#DD8AA8']].map(c => '<g filter="url(#p)"><path d="M20 4 C29 10 31 23 22 35 L20 31 L18 35 C9 23 11 10 20 4Z" fill="'+c[0]+'"/></g><path d="M20 4 C29 10 31 23 22 35 L20 31 L18 35 C9 23 11 10 20 4Z" fill="none" stroke="'+c[1]+'" stroke-width="1" stroke-linejoin="round"/><path d="M20 10 V27" stroke="'+c[1]+'" stroke-width=".7" opacity=".6"/>');
    if(season === 'summer') return [['#A6D99C','#6FAE6A'],['#8FCB8B','#5E9E5B'],['#BFE3A6','#84B970']].map(c => '<g filter="url(#p)"><path d="M20 3 C32 12 32 28 20 37 C8 28 8 12 20 3Z" fill="'+c[0]+'"/></g><path d="M20 3 C32 12 32 28 20 37 C8 28 8 12 20 3Z" fill="none" stroke="'+c[1]+'" stroke-width="1"/><path d="M20 6 V36 M20 15 L26 11 M20 21 L27 17 M20 27 L26 23 M20 15 L14 11 M20 21 L13 17 M20 27 L14 23" stroke="'+c[1]+'" stroke-width=".7" opacity=".7"/>');
    if(season === 'autumn') return [['#F5D35C','#D7AE2E'],['#F2C443','#CC9A1E'],['#F8DE7E','#DDB847']].map(c => '<g filter="url(#p)"><path d="M20 37 L20 27 C9 26 3 16 5 6 C12 10 16 6 20 9 C24 6 28 10 35 6 C37 16 31 26 20 27Z" fill="'+c[0]+'"/></g><path d="M20 37 L20 27 C9 26 3 16 5 6 C12 10 16 6 20 9 C24 6 28 10 35 6 C37 16 31 26 20 27Z" fill="none" stroke="'+c[1]+'" stroke-width="1" stroke-linejoin="round"/><path d="M20 27 L8 10 M20 27 L14 8 M20 27 L20 10 M20 27 L26 8 M20 27 L32 10" stroke="'+c[1]+'" stroke-width=".55" opacity=".6"/>');
    return ['<g filter="url(#p)"><circle cx="20" cy="20" r="9" fill="#FFFFFF"/></g><circle cx="20" cy="20" r="9" fill="none" stroke="#C5B8E8" stroke-width="1.1"/>',
      '<g filter="url(#p)"><circle cx="20" cy="20" r="6" fill="#FFFFFF"/></g><circle cx="20" cy="20" r="6" fill="none" stroke="#BFD3F2" stroke-width="1.1"/>',
      '<g stroke="#B9CBEF" stroke-width="1.6" stroke-linecap="round"><path d="M20 7 V33 M8.7 13.5 L31.3 26.5 M8.7 26.5 L31.3 13.5"/><path d="M20 12 L17 9 M20 12 L23 9 M20 28 L17 31 M20 28 L23 31" stroke-width="1.1"/></g><circle cx="20" cy="20" r="2.4" fill="#fff" stroke="#B9CBEF"/>'];
  }
  function loadSprites(season){ if(TG.sprites[season]) return Promise.resolve(TG.sprites[season]);
    return Promise.all(shapes(season).map((s,i) => svgImg(s, i*7+3))).then(a => { TG.sprites[season] = a.filter(Boolean); return TG.sprites[season]; }); }
  const grain = (() => { const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'); for(let i=0;i<260;i++){ g.fillStyle = 'rgba(170,155,215,'+(Math.random()*.35)+')'; g.fillRect(Math.random()*48, Math.random()*48, 1+Math.random()*1.5, .8); } return c; })();
  let fx, fg, grainPat = null;
  function tgLayout(){
    fx = $('tgFx'); fg = fx.getContext('2d');
    const r = fx.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio||1); if(!r.width) return; fx.width = Math.round(r.width*dpr); fx.height = Math.round(r.height*dpr); fg.setTransform(dpr,0,0,dpr,0,0); grainPat = fg.createPattern(grain,'repeat');
    const rel = el => { const b = el.getBoundingClientRect(); return {l:b.left-r.left, t:b.top-r.top, w:b.width, h:b.height}; };
    const a0 = rel($('tgAv0')), a1 = rel($('tgAv1')), bar = rel($('tgBar')), box = rel($('tgBox')), sr = $('tgStage').getBoundingClientRect(), off = {x:sr.left-r.left, y:sr.top-r.top};
    const J = {x:r.width/2, y:a0.t+a0.h+(box.t-(a0.t+a0.h))*.55};
    const keep = TG.surf.length === 4 ? TG.surf : null;
    TG.surf = [{k:'c',cx:a0.l+a0.w/2,cy:a0.t+a0.h/2,r:a0.w/2,max:13},{k:'c',cx:a1.l+a1.w/2,cy:a1.t+a1.h/2,r:a1.w/2,max:13},{k:'f',x1:J.x-15,x2:J.x+15,y:J.y-7,max:9},{k:'f',x1:bar.l+10,x2:bar.l+bar.w-10,y:bar.t+1,max:16}];
    TG.surf.forEach((s,i) => { const x1 = s.k === 'f' ? s.x1-4 : s.cx-s.r*.98, x2 = s.k === 'f' ? s.x2+4 : s.cx+s.r*.98; s.hx1 = x1; s.n = Math.max(4, Math.ceil((x2-x1)/2));
      s.h = keep && keep[i].h && keep[i].n === s.n ? keep[i].h : new Float32Array(s.n); s.list = keep ? keep[i].list : []; });
    /* 耳机线 */
    const e0 = {x:a0.l+a0.w*.86, y:a0.t+a0.h*.82}, e1 = {x:a1.l+a1.w*.14, y:a1.t+a1.h*.82}, jack = {x:box.l+box.w*.5, y:box.t+box.h*.18};
    const Pt = p => (p.x-off.x).toFixed(1)+' '+(p.y-off.y).toFixed(1);
    const w = $('tgWire'), dA = 'M'+Pt(e0)+' C'+Pt({x:e0.x+20,y:e0.y+70})+' '+Pt({x:J.x-30,y:J.y-40})+' '+Pt(J)+' M'+Pt(e1)+' C'+Pt({x:e1.x-20,y:e1.y+70})+' '+Pt({x:J.x+30,y:J.y-40})+' '+Pt(J)+' M'+Pt(J)+' C'+Pt({x:J.x-30,y:J.y+40})+' '+Pt({x:jack.x+30,y:jack.y-50})+' '+Pt(jack);
    const dB = dA.replace(/C(-?[\d.]+) (-?[\d.]+)/g, (m,x,y) => 'C'+(+x+6).toFixed(1)+' '+(+y+4).toFixed(1));
    const bud = (p,flip) => '<g transform="translate('+Pt(p).replace(' ',',')+') rotate('+(flip?30:-30)+')"><rect x="-6" y="-9" width="12" height="16" rx="6" fill="#fff" stroke="#C9BCE6" stroke-width="1.3"/><circle cx="0" cy="-8" r="5" fill="#fff" stroke="#C9BCE6" stroke-width="1.3"/></g>';
    w.innerHTML = '<path d="'+dA+'" fill="none" stroke="#C9BCE6" stroke-width="4" stroke-linecap="round"><animate attributeName="d" dur="5s" repeatCount="indefinite" values="'+dA+';'+dB+';'+dA+'" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/></path>'+
      '<path d="'+dA+'" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"><animate attributeName="d" dur="5s" repeatCount="indefinite" values="'+dA+';'+dB+';'+dA+'" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/></path>'+
      bud(e0,false)+bud(e1,true)+
      '<g transform="translate('+Pt(J).replace(' ',',')+')"><path d="M0 8 C-12 0 -12 -10 -5 -10 C-2 -10 0 -7 0 -5 C0 -7 2 -10 5 -10 C12 -10 12 0 0 8Z" fill="#fff" stroke="#E7A6C0" stroke-width="1.4"/></g>'+
      '<rect x="'+(jack.x-off.x-4)+'" y="'+(jack.y-off.y-12)+'" width="8" height="12" rx="2" fill="#fff" stroke="#C9BCE6" stroke-width="1.3"/>';
    $('tgCount').style.top = (box.t+box.h-off.y+6)+'px';
  }
  function baseY(s,x){ if(s.k === 'f') return s.y; const dx = Math.max(-s.r, Math.min(s.r, x-s.cx)); return s.cy-Math.sqrt(s.r*s.r-dx*dx); }
  function snowH(s,x){ if(!s.h) return 0; const i = Math.round((x-s.hx1)/2); return (i >= 0 && i < s.n) ? s.h[i] : 0; }
  function surfY(s,x){ if(s.k === 'f') return (x >= s.x1 && x <= s.x2) ? s.y : null; const dx = x-s.cx; if(Math.abs(dx) > s.r*.82) return null; return s.cy-Math.sqrt(s.r*s.r-dx*dx); }
  function spawn(){ const sp = TG.sprites[TG.season]; if(!sp || !sp.length) return; const S = SEAS[TG.season], W = fx.clientWidth, snow = TG.season === 'winter';
    const img = sp[Math.floor(Math.random()*sp.length)], z = .55+Math.random()*.6;
    TG.parts.push({x:Math.random()*W, y:-20, vy:(S.vy[0]+Math.random()*(S.vy[1]-S.vy[0]))*(.7+z*.5), ph:Math.random()*6.28, rot:Math.random()*360, vr:(Math.random()-.5)*(snow?1:4), img, s:(snow?(img === sp[2]?20:img === sp[0]?15:11):27)*z, z}); }
  function land(s,p){ if(TG.season === 'winter'){ const c = Math.round((p.x-s.hx1)/2), amp = 1+p.s/30;
      for(let k=-7;k<=7;k++){ const i = c+k; if(i < 0 || i >= s.n) continue; const t2 = i/(s.n-1), lim = s.max*Math.pow(Math.sin(Math.PI*t2), s.k === 'c' ? .7 : .35);
        s.h[i] = Math.min(lim, s.h[i]+amp*Math.exp(-k*k/14)); }
      for(let it=0;it<3;it++) for(let j=0;j<s.n-1;j++){ const d = s.h[j]-s.h[j+1]; if(Math.abs(d) > .9){ const mv = (Math.abs(d)-.9)*.3*Math.sign(d); s.h[j] -= mv; s.h[j+1] += mv; } }
      return; }
    const stack = s.list.filter(q => Math.abs(q.x-p.x) < 10).length; s.list.push({x:p.x, dy:-stack*1.6, rot:p.rot, img:p.img, s:p.s*.9}); if(s.list.length > (s.k === 'c' ? 26 : s.k === 'f' ? 7 : 44)) s.list.shift(); }
  function drawCap(s){ if(!s.h) return; let mx = 0; for(let i=0;i<s.n;i++) if(s.h[i] > mx) mx = s.h[i]; if(mx < .4) return;
    const top = [], base = []; for(let j=0;j<s.n;j++){ const x = s.hx1+j*2, b = baseY(s,x); let hh = s.h[j]; hh = hh > .15 ? hh+.35*Math.sin(j*1.7+s.n)*Math.min(1,hh/4) : 0; top.push([x,b-hh]); base.push([x,b+.8]); }
    fg.save(); fg.beginPath(); fg.moveTo(top[0][0], top[0][1]);
    for(let k=1;k<top.length;k++){ const m = [(top[k-1][0]+top[k][0])/2, (top[k-1][1]+top[k][1])/2]; fg.quadraticCurveTo(top[k-1][0], top[k-1][1], m[0], m[1]); }
    fg.lineTo(top[top.length-1][0], top[top.length-1][1]); for(let q=base.length-1;q>=0;q--) fg.lineTo(base[q][0], base[q][1]); fg.closePath();
    const yT = Math.min.apply(null, top.map(p => p[1])), yB = Math.max.apply(null, base.map(p => p[1]));
    const gr = fg.createLinearGradient(0,yT,0,yB); gr.addColorStop(0,'#FFFFFF'); gr.addColorStop(.6,'#FBF9FF'); gr.addColorStop(1,'#E9E3F6');
    fg.shadowColor = 'rgba(140,120,190,.38)'; fg.shadowBlur = 7; fg.shadowOffsetY = 2; fg.fillStyle = gr; fg.fill();
    fg.shadowColor = 'transparent'; fg.globalAlpha = .55; fg.fillStyle = grainPat; fg.fill(); fg.restore(); }
  function drawSprite(p,flip){ fg.save(); fg.translate(p.x,p.y); fg.rotate(p.rot*Math.PI/180); if(flip) fg.scale(Math.max(.25, Math.abs(Math.cos(p.ph))), 1); fg.drawImage(p.img,-p.s/2,-p.s/2,p.s,p.s); fg.restore(); }
  function tgFrame(now){
    TG.raf = 0; if(!TG.on) return; const dt = Math.min(50, now-(TG.last||now))/16.7; TG.last = now; const W = fx.clientWidth, H = fx.clientHeight, S = SEAS[TG.season];
    TG.spawnAcc += dt*S.rate/60*(TG.parts.length < 70 ? 1 : 0); while(TG.spawnAcc >= 1){ TG.spawnAcc--; spawn(); }
    fg.clearRect(0,0,W,H);
    TG.surf.forEach(s => { if(TG.season === 'winter') drawCap(s); else s.list.forEach(q => { const y = (s.k === 'f' ? s.y : surfY(s,q.x) || s.cy-s.r)+q.dy-q.s*.25; drawSprite({x:q.x, y, rot:q.rot, img:q.img, s:q.s}, false); }); });
    for(let i=TG.parts.length-1;i>=0;i--){ const p = TG.parts[i], py = p.y; p.ph += .03*dt; p.y += p.vy*dt; p.x += Math.sin(p.ph)*S.sway*.6*dt; p.rot += p.vr*dt;
      let landed = false; for(let k=0;k<TG.surf.length && !landed;k++){ const s = TG.surf[k], sy = surfY(s,p.x); if(sy !== null){ const lift = TG.season === 'winter' ? snowH(s,p.x) : 0; if(py < sy-lift && p.y >= sy-lift && (TG.season === 'winter' || Math.random() < .85)){ land(s,p); landed = true; } } }
      if(landed || p.y > H+30){ TG.parts.splice(i,1); continue; } drawSprite(p, S.flip); }
    if(isPlaying()){ TG.secAcc += dt*16.7/1000; if(TG.secAcc >= 1){ const add = Math.floor(TG.secAcc); TG.secAcc -= add; TG.sec += add; if(TG.sec%10 < add) setP('tgSec', TG.sec); tgCountPaint(); } }
    if(now-TG.bubbleT > 22000 && !tgWait) tgSay();
    TG.raf = requestAnimationFrame(tgFrame);
  }
  function tgCountPaint(){ const m = Math.floor(TG.sec/60); $('tgCount').innerHTML = '和 '+h(taName())+' 一起听了 <b>'+(m < 1 ? '不到 1' : m)+'</b> 分钟'; }
  function meSay(txt){ const b = $('tgBubbleMe'); b.textContent = txt; b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), 6000); }
  function tgSay(txt){ const S = SEAS[TG.season] || SEAS.winter, b = $('tgBubble'); b.textContent = txt || S.talk[Math.floor(Math.random()*S.talk.length)]; b.classList.add('on'); TG.bubbleT = performance.now(); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), 6000); }
  function tgPaint(){
    [[0, myAvatar(), 'star'], [1, taAvatar(), 'cat']].forEach(([i, src, ic]) => { const el = $('tgAv'+i); const k = src || ic; if(el._k === k) return; el._k = k;
      el.style.backgroundImage = src ? cssUrl(src) : ''; el.innerHTML = src ? '' : '<span data-doodle="'+ic+'" data-boil="on"></span>'; });
    drawIcons($('tgPage'));
    over.root.querySelectorAll('.tgn').forEach(e => { e.textContent = taName(); });
    NP.querySelectorAll('.tg-seasons button').forEach(b => b.setAttribute('aria-checked', b.dataset.s === TG.season));
  }
  let discDone = false;
  function drawDisc(){ if(discDone) return; discDone = true; const B = '#9CC2EC', L = '#D2A7EA'; let hh = '<circle cx="100" cy="100" r="96" fill="#F3EDFA" stroke="#D9CCEE" stroke-width="2"/><circle cx="100" cy="100" r="84" fill="#FFFDFB" stroke="#E6DDF2" stroke-width="1.5" stroke-dasharray="2 5"/>';
    ['star','heart','cat','sparkle','door','clover','moon','bow'].forEach((id,i) => { const a = i/8*Math.PI*2, x = 100+62*Math.cos(a)-11, y = 100+62*Math.sin(a)-11;
      hh += '<g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') rotate('+(a*180/Math.PI+90).toFixed(0)+' 11 11) scale(.22)" fill="none" stroke="'+(i%2?L:B)+'" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><use href="#dd-'+id+'"/></g>'; });
    hh += '<circle cx="100" cy="100" r="30" fill="#EFE7F8" stroke="#D9CCEE" stroke-width="1.5"/><g transform="translate(84 84) scale(.32)" fill="none" stroke="'+L+'" stroke-width="6" stroke-linecap="round"><use href="#dd-music"/></g><circle cx="100" cy="100" r="4" fill="#D9CCEE"/>';
    $('tgDisc').innerHTML = hh; }
  function preSnow(){ if(TG.season !== 'winter') return; TG.surf.forEach(s => { if(!s.h) return; let m = 0; for(let i=0;i<s.n;i++) m = Math.max(m, s.h[i]); if(m > 3) return;
    for(let k=0;k<s.n*1.6;k++){ const x = s.hx1+Math.random()*s.n*2; land(s, {x, s:12}); } }); }
  function tgEnter(){
    if(TG.on) return; TG.on = true; TG.season = P().season || defaultSeason(); TG.sec = +P().tgSec || 0;
    drawDisc(); tgPaint(); tgCountPaint(); requestAnimationFrame(() => { tgLayout(); preSnow(); });
    loadSprites(TG.season).then(() => { if(TG.on && !TG.raf){ TG.last = 0; TG.raf = requestAnimationFrame(tgFrame); } });
    setTimeout(() => { if(!tgWait) tgSay(isPlaying() ? null : '放首歌吧，我们一起听'); }, 500);
  }
  function tgLeave(){ if(!TG.on) return; TG.on = false; if(TG.raf){ cancelAnimationFrame(TG.raf); TG.raf = 0; } setP('tgSec', TG.sec); }

  /* ===== 信箱：读原有 mcLetters（已投递的信），梦幻光影 + 吊着的信 + 折纸展开 ===== */
  let LT, scene, sheet, sw, ltItems = [], ltOpen = null, ltOpener = null, skyBuilt = false, hangRaf = 0, hangLast = 0, LETTERS = [];
  const SHAPES = ['heart','note','note','heart','tall','note','tall'], PAPERS = ['#FFF0F5','#EEF5FE','#FFFDF8','#F4EEFB','#FFFDF8','#EEF5FE','#FFF0F5'], DECOS = ['heart','cloud','star','sparkle','clover','moon','bow'];
  function letterTime(l){ const t = Date.parse(l.deliveredAt || l.createdAt || l.date || ''); return isFinite(t) ? t : Date.now(); }
  function letterData(){
    const all = (state.mcLetters || []).filter(l => l && (typeof mcIsRestricted !== 'function' || !mcIsRestricted('letter', l)));
    return all.slice(0, 12).map((l,i) => { const k = Math.abs(String(l.id).split('').reduce((a,c) => a*31+c.charCodeAt(0) | 0, 7))%7;
      const body = String(l.content || l.body || '').split(/\r?\n/);
      const from = l.author === 'user' || l.author === 'me' ? ((typeof myDisplayName === 'function' && myDisplayName()) || '我') : taName();
      return {id:String(l.id), shape:SHAPES[k], paper:PAPERS[k], deco:DECOS[k], t:letterTime(l), body, from}; });
  }
  function readSet(){
    let r = P().ltRead;
    if(!Array.isArray(r)){ /* 第一次打开：两周前的信当作已读，免得一屏全是未读 */
      const old = Date.now()-14*864e5; r = LETTERS.filter(l => l.t < old).map(l => l.id); setP('ltRead', r); }
    return r;
  }
  const isRead = l => readSet().indexOf(l.id) >= 0;
  function buildSky(){ if(skyBuilt) return; skyBuilt = true; let hh = '';
    [['b1','#F9C8E0'],['b2','#BFD6FA'],['b3','#E3C8FA'],['b4','#FFE3C2'],['b5','#C9F0E6']].forEach(b => { hh += '<i class="blob '+b[0]+'" style="--c:'+b[1]+'"></i>'; });
    for(let i=0;i<5;i++) hh += '<i class="beam" style="--x:'+(8+i*21)+'%;--r:'+(-18+i*8)+'deg;--d:'+(7+i*1.7)+'s;--w:'+(40+i%3*26)+'px"></i>';
    $('ltSky').insertAdjacentHTML('afterbegin', hh);
    const tw = []; for(let k=0;k<12;k++) tw.push([Math.random()*94, Math.random()*90, 2+Math.floor(Math.random()*3), 3+Math.random(), [SB,SL,SW,'#FFFFFF'][k%4]]); twinkle($('ltTw'), tw); }
  let dust, dg, motes = [];
  function dustSize(){ const r = dust.getBoundingClientRect(), d = Math.min(2, devicePixelRatio||1); dust.width = r.width*d; dust.height = r.height*d; dg.setTransform(d,0,0,d,0,0);
    motes = []; for(let i=0;i<34;i++) motes.push({x:Math.random()*r.width, y:Math.random()*r.height, r:.8+Math.random()*2.6, v:.1+Math.random()*.35, p:Math.random()*6.28}); }
  function dustDraw(t){ const w = dust.clientWidth, hh = dust.clientHeight; dg.clearRect(0,0,w,hh); motes.forEach(m => { m.y -= m.v; m.x += Math.sin(t/2000+m.p)*.2; if(m.y < -6){ m.y = hh+6; m.x = Math.random()*w; }
    const a = .35+.35*Math.sin(t/700+m.p), g = dg.createRadialGradient(m.x,m.y,0,m.x,m.y,m.r*3); g.addColorStop(0,'rgba(255,255,255,'+a+')'); g.addColorStop(1,'rgba(255,255,255,0)'); dg.fillStyle = g; dg.beginPath(); dg.arc(m.x,m.y,m.r*3,0,6.283); dg.fill(); }); }
  function shapeSVG(l,i){ const p = l.paper, ln = 'rgba(160,140,195,.55)', id = 'pg'+i, sc = '<path d="M33 30 q4 -3 8 0 t8 0 t8 0" fill="none" stroke="rgba(150,130,190,.45)" stroke-width="1.3" stroke-linecap="round"/>';
    const deco = '<g transform="translate(54 58) scale(.2)" fill="none" stroke="'+(i%2?'#C89BE6':'#8FBCEB')+'" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><use href="#dd-'+l.deco+'"/></g>';
    const grad = '<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="'+p+'"/><stop offset="1" stop-color="'+p+'"/></linearGradient></defs>';
    const tape = '<rect x="36" y="6" width="22" height="9" rx="1" fill="'+(i%3===0?'rgba(242,167,195,.6)':i%3===1?'rgba(156,194,236,.6)':'rgba(210,167,234,.6)')+'" transform="rotate(-6 47 10)"/>';
    if(l.shape === 'heart') return grad+'<path d="M46 92 C14 72 6 44 22 32 C33 24 46 32 46 42 C46 32 59 24 70 32 C86 44 78 72 46 92Z" fill="url(#'+id+')" stroke="'+ln+'" stroke-width="1.2"/><path d="M46 42 V88" stroke="'+ln+'" stroke-dasharray="3 3"/><path d="M22 32 L46 60 L70 32" fill="none" stroke="'+ln+'" stroke-width=".8" opacity=".6"/>'+'<g transform="translate(-8 26)">'+deco+'</g>'+tape;
    if(l.shape === 'tall') return grad+'<rect x="22" y="12" width="48" height="80" rx="3" fill="url(#'+id+')" stroke="'+ln+'" stroke-width="1.2"/><path d="M22 39 H70 M22 66 H70" stroke="'+ln+'" stroke-dasharray="3 3"/><path d="M22 66 L70 66 L70 92 L22 92Z" fill="rgba(160,140,200,.06)"/><path d="M30 24 q4 -3 8 0 t8 0 t8 0 M30 31 q4 -3 8 0 t8 0" fill="none" stroke="rgba(150,130,190,.45)" stroke-width="1.3" stroke-linecap="round"/>'+'<g transform="translate(-14 18)">'+deco+'</g>'+tape;
    return grad+'<rect x="12" y="16" width="68" height="62" rx="3" fill="url(#'+id+')" stroke="'+ln+'" stroke-width="1.2"/><path d="M58 16 L80 16 L80 38Z" fill="rgba(160,140,200,.14)" stroke="'+ln+'" stroke-width="1"/><path d="M12 47 H80" stroke="'+ln+'" stroke-dasharray="3 3"/>'+sc+'<path d="M24 38 q4 -3 8 0 t8 0" fill="none" stroke="rgba(150,130,190,.45)" stroke-width="1.3" stroke-linecap="round"/>'+deco+tape; }
  function ltCount(){ const n = LETTERS.filter(l => !isRead(l)).length; $('ltCount').textContent = !LETTERS.length ? '去信箱' : n ? n+' 封未读' : '都读完啦';
    $('ltPick').lastChild.textContent = LETTERS.length ? '随便拆一封' : '写一封信'; $('ltHint').textContent = LETTERS.length ? '手指轻轻划过，可以拨动它们' : '信箱空空的，等 ta 的信，或者先写一封'; }
  function hang(){ const r = scene.getBoundingClientRect(), W = r.width, H = r.height, n = LETTERS.length; scene.innerHTML = ''; ltItems = [];
    const order = LETTERS.map((l,i) => i).sort(() => Math.random()-.5);
    order.forEach((li,k) => { const l = LETTERS[li], x = W*.1+W*.8*(k+.5)/n+(Math.random()-.5)*W/n*.35, unread = !isRead(l);
      const L = unread ? H*(.48+Math.random()*.16) : H*((k%3===0?.08:k%3===1?.24:.38)+Math.random()*.1);
      const wrap = document.createElement('div'); wrap.className = 'hang'; wrap.style.left = x+'px';
      wrap.innerHTML = '<i class="string"></i><button class="ltr2'+(unread?' unread':'')+'" aria-label="'+(unread?'未读的信，':'读过的信，')+new Date(l.t).toLocaleDateString('zh-CN')+'"><span class="bead"></span><svg viewBox="0 0 92 100">'+shapeSVG(l,li)+'</svg>'+(unread?'<svg class="star" viewBox="0 0 9 9">'+pixSpark(4,'#F2A7C3').h+'</svg>':'')+'</button>';
      wrap.style.zIndex = unread ? 50+k : 10+k; scene.appendChild(wrap);
      ltItems.push({l, wrap, el:wrap.querySelector('.ltr2'), L:-160, Lt:L, Lh:L, vL:0, th:(Math.random()-.5)*.08, w:0, ph:Math.random()*6.28, rot:0, delay:k*90}); }); }
  function hangStep(now){ hangRaf = 0; if(LT.hidden) return; const dt = Math.min(40, now-(hangLast||now))/16.7; hangLast = now;
    ltItems.forEach(it => { if(it.delay > 0){ it.delay -= dt*16.7; return; }
      const k = it.yank ? .32 : .09, d = it.yank ? .68 : .8; it.vL += (it.Lt-it.L)*k*dt; it.vL *= Math.pow(d,dt); it.L += it.vL*dt;
      const Lp = Math.max(90, it.L+60), wind = Math.sin(now/2300+it.ph)*.00006+Math.sin(now/970+it.ph*2)*.00003;
      it.w += (-(.45/Lp)*Math.sin(it.th)-it.w*.018+wind)*dt; it.th += it.w*dt; it.th = Math.max(-.5, Math.min(.5, it.th));
      it.rot = it.th*57.3; it.wrap.style.height = Math.max(0,it.L)+'px'; it.wrap.style.transform = 'translateY('+Math.min(0,it.L).toFixed(1)+'px) rotate('+it.rot.toFixed(2)+'deg)'; });
    dustDraw(now); hangRaf = requestAnimationFrame(hangStep); }
  function hangKick(){ if(!hangRaf){ hangLast = 0; hangRaf = requestAnimationFrame(hangStep); } }
  function pickLetter(it){ ltItems.forEach((o,k) => { if(o === it) return; o.yank = true; o.Lt = -170; o.delay = k*25; }); rustle(.25,.12);
    if(soundOn()){ const c = audioCtx(); if(c){ const o = c.createOscillator(), g = c.createGain(), n = c.currentTime; o.type = 'sine'; o.frequency.setValueAtTime(880,n); o.frequency.exponentialRampToValueAtTime(1760,n+.18); g.gain.setValueAtTime(.05,n); g.gain.exponentialRampToValueAtTime(.0008,n+.25); o.connect(g).connect(c.destination); o.start(n); o.stop(n+.26); } }
    setTimeout(() => openLetter(it), 160); }
  function dropAll(){ ltItems.forEach((o,k) => { o.yank = false; o.Lt = o.Lh; o.delay = k*110; }); setTimeout(() => rustle(.15,.06), 200); }
  function openLetter(it){ if(ltOpen) return; ltOpen = it; const l = it.l; chime(true);
    const ins = sheet.querySelectorAll('.paper-in'); let lines = '<div class="ln dt">'+new Date(l.t).toLocaleDateString('zh-CN',{month:'long',day:'numeric'})+'</div>';
    l.body.forEach(s => { lines += '<div class="ln">'+(s ? h(s) : '&nbsp;')+'</div>'; });
    lines += '<div class="ln">&nbsp;</div><div class="ln sig">From. '+h(l.from)+'</div><span class="stamp" data-doodle="'+l.deco+'" data-boil="on"></span>';
    ins.forEach(el => { el.innerHTML = lines; }); drawIcons(sheet); sheet.style.setProperty('--paper', l.paper);
    const er = it.el.getBoundingClientRect(); sw.hidden = false; sheet.classList.add('folded'); sheet.classList.remove('half');
    const sr = sheet.getBoundingClientRect(), dx = (er.left+er.width/2)-(sr.left+sr.width/2), dy = (er.top+er.height/2)-(sr.top+sr.height/2);
    sheet.style.transition = 'none'; sheet.style.transform = 'translate('+dx+'px,'+dy+'px) scale(.26) rotate('+it.rot+'deg)'; it.el.style.visibility = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => { sw.classList.add('on'); sheet.style.transition = ''; sheet.style.transform = '';
      setTimeout(() => { sheet.classList.add('half'); rustle(.35,.22); }, 520); setTimeout(() => { sheet.classList.remove('folded','half'); rustle(.4,.26); }, 1100);
      const n = sheet.querySelector('.p1 .paper-in').children.length;
      for(let i=0;i<n;i++) setTimeout(() => { sheet.querySelectorAll('.paper-in').forEach(pi => { const c = pi.children[i]; if(c && c.classList.contains('ln')) c.classList.add('on'); }); if(ltOpen && i%2 === 0) rustle(.08,.06); }, 1700+i*260);
      setTimeout(() => { $('ltFold').classList.add('on'); $('ltFold').focus(); }, 1700+n*260); }));
    if(!isRead(l)) setP('ltRead', readSet().concat(l.id).slice(-300)); }
  function openLetters(fromEl){
    buildSky(); ltOpener = fromEl; LETTERS = letterData();
    rectVars(LT, fromEl, '32px'); LT.hidden = false; LT.classList.remove('show','closing'); setName($('pxLetters'), 'Letters', {}); ltCount();
    requestAnimationFrame(() => { dustSize(); hang(); hangKick(); requestAnimationFrame(() => { fullVars(LT); LT.classList.add('show'); }); }); chime(true);
    if(typeof mcRefresh === 'function'){ Promise.resolve(mcRefresh()).then(() => { if(LT.hidden || ltOpen) return; const fresh = letterData(); if(fresh.map(l => l.id).join() !== LETTERS.map(l => l.id).join()){ LETTERS = fresh; ltCount(); hang(); hangKick(); } }).catch(() => {}); }
  }
  function closeLetters(instant){ if(!LT || LT.hidden || ltOpen) return; if(instant){ LT.hidden = true; return; } LT.classList.add('closing'); LT.classList.remove('show'); if(ltOpener) rectVars(LT, ltOpener, '32px'); chime(false); setTimeout(() => { LT.hidden = true; }, 520); }
  function goMailbox(){ closeLetters(true); av.hidden = true; av.classList.remove('show'); setOpened(false); goFeature('mailbox'); }
  function bindLetters(){
    LT = $('letters'); scene = $('ltScene'); sheet = $('sheet'); sw = $('sheetWrap'); dust = $('ltDust'); dg = dust.getContext('2d');
    let lastP = null;
    scene.addEventListener('pointermove', e => { if(ltOpen) return; const r = scene.getBoundingClientRect(), x = e.clientX-r.left, y = e.clientY-r.top;
      if(lastP){ const vx = x-lastP.x; ltItems.forEach(it => { const lr = it.el.getBoundingClientRect(), cx = lr.left+lr.width/2-r.left, cy = lr.top+lr.height/2-r.top; if(Math.abs(cx-x) < 46 && Math.abs(cy-y) < 60) it.w += vx*.00035; }); } lastP = {x,y}; });
    scene.addEventListener('pointerleave', () => { lastP = null; });
    scene.addEventListener('click', e => { const b = e.target.closest('.ltr2'); if(!b || ltOpen) return; audioCtx(); const it = ltItems.filter(i => i.el === b)[0]; if(it) pickLetter(it); });
    $('ltPick').addEventListener('click', () => { if(ltOpen) return; audioCtx(); if(!ltItems.length){ goMailbox(); return; }
      let pool = ltItems.filter(i => !isRead(i.l)); if(!pool.length) pool = ltItems;
      ltItems.forEach(i => { i.w += (Math.random()-.5)*.02; }); rustle(.2,.1); setTimeout(() => pickLetter(pool[Math.floor(Math.random()*pool.length)]), 500); });
    $('ltCount').addEventListener('click', () => { if(!ltOpen) goMailbox(); });
    $('ltFold').addEventListener('click', () => { const it = ltOpen; if(!it) return; $('ltFold').classList.remove('on'); sheet.querySelectorAll('.ln').forEach(x => x.classList.remove('on'));
      setTimeout(() => { sheet.classList.add('folded'); rustle(.35,.22); }, 200);
      setTimeout(() => { const er = it.el.getBoundingClientRect(), sr = sheet.getBoundingClientRect();
        sheet.style.transform = 'translate('+((er.left+er.width/2)-(sr.left+sr.width/2))+'px,'+((er.top+er.height/2)-(sr.top+sr.height/2))+'px) scale(.26) rotate('+it.rot+'deg)'; sw.classList.remove('on'); chime(false); }, 900);
      setTimeout(() => { sw.hidden = true; sheet.style.transform = ''; it.el.style.visibility = ''; it.el.classList.remove('unread'); const s = it.el.querySelector('.star'); if(s) s.remove();
        it.w += .012; ltOpen = null; ltCount(); dropAll(); it.el.focus({preventScroll:true}); }, 1500); });
    $('ltBack').addEventListener('click', () => closeLetters(false));
    document.addEventListener('keydown', e => { if(e.key === 'Escape' && ON() && LT && !LT.hidden){ if(ltOpen) $('ltFold').click(); else closeLetters(false); e.stopImmediatePropagation(); } }, true);
  }

  /* ===== App 原有页面里的部分（底栏、聊天、设置），渲染在 #app 里 ===== */
  function renderHomeSpacer(){
    const keys = (typeof FEAT_GROUPS !== 'undefined' ? FEAT_GROUPS : []).flatMap(g => g.items.map(f => f.key));
    return '<div class="dd-home-spacer" aria-hidden="true"></div><div id="dd-subs" hidden>'+keys.map(k => '<button type="button" data-sub="'+h(k)+'" tabindex="-1"></button>').join('')+'</div>';
  }
  function renderNav(){
    const cur = state.tab;
    const item = (k, ic, label) => '<button type="button" data-tab="'+k+'" class="'+(cur === k ? 'active' : '')+'"'+(cur === k ? ' aria-current="page"' : '')+'><span data-doodle="'+ic+'" data-boil="'+(cur === k ? 'on' : 'off')+'"></span><span>'+label+'</span></button>';
    return '<nav class="bottom-nav dd-nav" aria-label="主导航">'+item('home','home','首页')+item('chat','chat','聊天')+item('settings','settings','设置')+'</nav>';
  }
  function chatHeader(){
    const name = taName();
    return '<div class="chat-header dd-c-head">'+
      '<button type="button" class="dd-av-btn" id="chat-sidebar-open" aria-label="打开侧边栏"><span data-doodle="menu" data-boil="hover"></span></button>'+
      '<div class="dd-c-title"><img class="dd-pxname" data-dd-name="'+h(name)+'" alt="'+h(name)+'" src="'+h(pixelNameURL(name, {outline:true}))+'"><div class="dd-c-status"><i class="dd-pdot"></i><span>'+(state.chatLoading ? '正在输入…' : '在线')+'</span></div></div>'+
      '<button type="button" class="dd-av-btn" data-dd-together aria-label="一起听歌"><span data-doodle="heart" data-boil="hover"></span></button>'+
    '</div>';
  }
  function hm(ts){ const d = new Date(ts); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
  function dayKey(ts){ const d = new Date(ts); return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate(); }
  function dayLabel(ts){ const d = new Date(ts), n = new Date(), y = new Date(); y.setDate(n.getDate()-1);
    if(dayKey(ts) === dayKey(n)) return '今天'; if(dayKey(ts) === dayKey(y)) return '昨天'; return (d.getMonth()+1)+'月'+d.getDate()+'日'; }
  const isLine = m => m && !m.toolNote && !m.notice && !m.guard;
  const tms = m => { const t = Date.parse(m && m.time || ''); return isFinite(t) ? t : 0; };
  function runKey(m){ return m.role === 'user' ? 'me' : (m.speakerId || 'them'); }
  /* 气泡模式：隔 5 分钟以上出一枚时间胶囊；剧本模式：每段换人时出「名字 + 点线」 */
  function chatMeta(m, idx, isMe, firstInRun, thinkBtn){
    const p = (state.messages || [])[idx-1], t = tms(m), pt = tms(p);
    let out = '';
    const gap = !isLine(p) || !t || !pt || t-pt > 5*60000 || dayKey(t) !== dayKey(pt);
    if(t && gap) out += '<div class="dd-ctime">'+dayLabel(t)+' '+hm(t)+'</div>';
    else if(firstInRun) out += '<div class="dd-bgap"></div>';
    if(t && (!pt || dayKey(t) !== dayKey(pt))) out += '<div class="dd-sdate">'+dayLabel(t)+'</div>';
    if(firstInRun){ const who = isMe ? 'me' : (m.speakerName || 'ta'); out += '<div class="dd-swho '+(isMe ? 'me' : 'ta')+'">'+h(who)+(thinkBtn||'')+'</div><div class="dd-srule '+(isMe ? 'me' : 'ta')+'"></div>'; }
    else if(thinkBtn) out += '<div class="dd-think">'+thinkBtn+'</div>';
    return out;
  }
  function bubbleAv(m, idx, isMe){
    const msgs = state.messages || [], nx = msgs[idx+1];
    const last = !nx || !isLine(nx) || runKey(nx) !== runKey(m) || (tms(nx) && tms(m) && tms(nx)-tms(m) > 5*60000);
    let src = '';
    if(isMe) src = myAvatar(); else { const ag = m.speakerId && typeof agentById === 'function' ? agentById(m.speakerId) : null; src = (ag && ag.avatar) || taAvatar(); }
    const p = msgs[idx-1], t = tms(m), showT = !p || !isLine(p) || runKey(p) !== runKey(m) || (t && tms(p) && t-tms(p) > 5*60000);
    const time = '<time class="dd-stime">'+(showT && t ? hm(t)+'：' : '')+'</time>';
    if(!last) return time+'<span class="dd-bav ghost"></span>';
    return time+(src ? '<span class="dd-bav" style="background-image:'+h(cssUrl(src))+'"></span>' : '<span class="dd-bav"><span data-doodle="'+(isMe ? 'star' : 'cat')+'" data-boil="off"></span></span>');
  }
  function sidebarTop(){
    const m = P().chatMode, name = taName();
    return '<div class="dd-side">'+
      '<img class="dd-pxname" data-dd-name="'+h(name)+'" alt="'+h(name)+'" src="'+h(pixelNameURL(name, {outline:true}))+'">'+
      '<p class="dd-side-sub">聊天模式</p><div class="dd-modes">'+
      '<button type="button" class="dd-mode" data-dd-mode="bubble" aria-pressed="'+(m === 'bubble')+'"><span class="dd-mp dd-mp-bubble"><i class="l"></i><i class="r"></i><i class="l s"></i><i class="r s"></i></span>气泡</button>'+
      '<button type="button" class="dd-mode" data-dd-mode="script" aria-pressed="'+(m === 'script')+'"><span class="dd-mp dd-mp-script"><b></b><i class="hr"></i><i></i><i class="s"></i><b></b><i class="hr"></i><i></i></span>剧本</button></div>'+
      '<p class="dd-side-sub">其他</p>'+
      '<button type="button" class="dd-side-item" data-dd-go="together"><span data-doodle="heart" data-boil="hover"></span>一起听歌</button>'+
      '<button type="button" class="dd-side-item" data-dd-go="settings"><span data-doodle="settings" data-boil="hover"></span>更多设置</button>'+
    '</div>';
  }
  function renderSettings(nativeHtml){
    const p = P(), c = couple(), ag = activeAgent();
    const sw = (k, on) => '<button type="button" class="dd-sw" role="switch" data-dd-sw="'+k+'" aria-checked="'+!!on+'"><i></i></button>';
    const seg = (k, opts) => '<div class="dd-seg" data-dd-seg="'+k+'">'+opts.map(([v,l]) => '<button type="button" data-v="'+v+'" aria-pressed="'+(p[k] === v)+'">'+l+'</button>').join('')+'</div>';
    const av = (i, src, label) => '<button type="button" class="dd-s-av" data-dd-av="'+i+'"><span class="dd-s-avimg"'+(src ? ' style="background-image:'+h(cssUrl(src))+'"' : '')+'>'+(src ? '' : '+')+'</span><small>'+label+'</small></button>';
    return '<div class="page dd-setpage">'+
      '<header class="dd-s-head"><img class="dd-pxname" alt="Settings" src="'+h(pixelNameURL('Settings', {}))+'"></header>'+
      '<div class="dd-s-scroll">'+
      '<div class="dd-s-card"><h3><span data-doodle="user" data-boil="off"></span>我们</h3>'+
        '<div class="dd-s-pair">'+av(0, myAvatar(), '我的头像')+'<span class="dd-s-heart" data-doodle="heart" data-boil="on"></span>'+av(1, taAvatar(), 'ta 的头像')+'</div>'+
        (ag ? '<label class="dd-s-row"><span>ta 的名字<small>聊天顶栏会变成像素字</small></span><input type="text" id="dd-s-name" maxlength="24" autocomplete="off" value="'+h(ag.name || '')+'"></label>' : '')+
        '<label class="dd-s-row"><span>在一起的日子</span><input type="date" id="dd-s-start" value="'+h(c.startDate || '')+'"></label>'+
        '<label class="dd-s-row col"><span>首页文案</span><textarea id="dd-s-quote" rows="2" maxlength="500">'+h(c.statusMsg || '')+'</textarea></label>'+
      '</div>'+
      '<div class="dd-s-card"><h3><span data-doodle="sparkle" data-boil="off"></span>外观</h3>'+
        '<div class="dd-s-row"><span>主题</span>'+seg('theme', [['light','浅色'],['system','自动'],['dark','深色']])+'</div>'+
        '<div class="dd-s-row"><span>像素星光<small>壁纸上一闪一闪的星星</small></span>'+sw('twinkle', p.twinkle)+'</div>'+
        '<div class="dd-s-row"><span>线条抖动<small>关掉后图标都静止</small></span>'+sw('boil', p.boil)+'</div>'+
        '<label class="dd-s-row"><span>壁纸线稿</span><input type="range" id="dd-s-wall" min="0" max="100" step="5" value="'+(+p.wall)+'"></label>'+
        '<div class="dd-s-row"><span>界面壳<small>换回其它壳在「外观」里</small></span><button type="button" class="dd-s-btn" data-dd-go="theme">去外观</button></div>'+
      '</div>'+
      '<div class="dd-s-card"><h3><span data-doodle="chat" data-boil="off"></span>聊天</h3>'+
        '<div class="dd-s-row"><span>聊天模式</span>'+seg('chatMode', [['bubble','气泡'],['script','剧本']])+'</div>'+
        '<div class="dd-s-row"><span>回车发送<small>关掉后回车换行</small></span>'+sw('enterSend', p.enterSend)+'</div>'+
        '<div class="dd-s-row"><span>音效<small>滑动、发消息时的小声音</small></span>'+sw('sound', p.sound)+'</div>'+
      '</div>'+
      '<div class="dd-s-card"><h3><span data-doodle="music" data-boil="off"></span>音乐</h3>'+
        '<div class="dd-s-row"><span>省电模式<small>关掉像素频谱动画</small></span>'+sw('saver', p.saver)+'</div>'+
      '</div>'+
      '<div class="dd-s-card"><h3><span data-doodle="lock" data-boil="off"></span>数据</h3>'+
        '<div class="dd-s-row"><span>恢复默认设置<small>只重置这一页的外观选项，聊天记录和头像不动</small></span><button type="button" class="dd-s-btn" data-dd-reset>恢复</button></div>'+
      '</div>'+
      '<div class="dd-s-more">'+nativeHtml+'</div>'+
      '<p class="dd-s-foot"><span data-doodle="clover" data-boil="on"></span><br>今天也会很幸运</p>'+
      '</div><input type="file" accept="image/*" id="dd-s-file" hidden></div>';
  }
  function drawNames(){ document.querySelectorAll('#app img.dd-pxname[data-dd-name]').forEach(img => setName(img, img.dataset.ddName, {outline:true})); }

  /* ===== 每次 render() 之后同步 ===== */
  function applyAttrs(){
    const p = P(), dark = isDark();
    Object.values(layers).forEach(({host}) => {
      if(p.theme === 'system') host.removeAttribute('data-theme'); else host.setAttribute('data-theme', p.theme);
      host.toggleAttribute('data-dark', dark);
      host.setAttribute('data-boil', p.boil ? 'on' : 'off'); host.setAttribute('data-twinkle', p.twinkle ? 'on' : 'off');
    });
    if(back) back.host.style.setProperty('--wall-a', (+p.wall)/100);
    if(over) over.host.style.setProperty('--wall-a', (+p.wall)/100);
    document.body.classList.toggle('dd-dark', dark);
    document.body.classList.toggle('dd-boil-off', !p.boil);
  }
  function afterRender(){
    if(!ON()){
      Object.values(layers).forEach(({host}) => { host.hidden = true; });
      document.body.classList.remove('dd-opened','dd-dark','dd-boil-off');
      if(TG.on) tgLeave();
      return;
    }
    mount(); applyAttrs();
    const atHome = state.tab === 'home' && !state.subPage && !state.captivityOpen && !(state.biscaOpen && state.biscaOpen.url);
    back.host.hidden = false; over.host.hidden = false;
    const wasHidden = home.host.hidden; home.host.hidden = !atHome;
    if(!atHome){
      if(!av.hidden){ av.hidden = true; av.classList.remove('show','closing'); }
      if(!LT.hidden && !ltOpen) closeLetters(true);
      if(av.hidden && LT.hidden) setOpened(!NP.hidden);
    }
    if(atHome){ paintQuote(); paintAvatars(); renderDays(); if(wasHidden){ lastHM = ''; tick(); requestAnimationFrame(fit); } }
    syncSound(); paint();
    const app = document.getElementById('app');
    if(app){
      /* 功能页的「‹ 返回」换成手绘箭头（文字留给读屏） */
      app.querySelectorAll('.sub-header .back-btn, .page-head .back-btn').forEach(b => {
        if(b.querySelector('[data-doodle]')) return;
        if(!b.getAttribute('aria-label')) b.setAttribute('aria-label', '返回');
        b.innerHTML = '<span data-doodle="back" data-boil="hover"></span>';
      });
      drawIcons(app);
      const page = app.querySelector('.chat-page');
      if(page){
        page.classList.add('dd-chat'); page.classList.toggle('dd-script', P().chatMode === 'script');
        [['#chat-more-btn','plus'],['#chat-send','send']].forEach(([sel, ic]) => { const b = app.querySelector(sel); const svg = b && b.querySelector('svg.lucide, i[data-lucide]'); if(svg){ const s = document.createElement('span'); s.setAttribute('data-doodle', ic); s.setAttribute('data-boil', ic === 'send' ? 'off' : 'hover'); svg.replaceWith(s); drawIcons(b); } });
        const inp = document.getElementById('chat-input');
        if(inp){ inp.placeholder = '和 '+taName()+' 说点什么…';
          if(!P().enterSend){ const orig = inp.onkeydown; inp.onkeydown = e => { if(e.key === 'Enter' && !e.shiftKey) return; if(orig) return orig.call(inp, e); }; } }
      }
    }
    if(tgWait && !state.chatLoading) watchReply();
  }

  /* 设置页、侧边栏、聊天顶栏里的按钮（在 #app 里，用委托） */
  document.addEventListener('click', e => {
    if(!ON() || !e.target.closest) return;
    const t = e.target.closest('[data-dd-sw],[data-dd-seg] button,[data-dd-av],[data-dd-reset],[data-dd-mode],[data-dd-go],[data-dd-together]');
    if(!t) return;
    e.preventDefault(); e.stopPropagation(); audioCtx();
    if(t.hasAttribute('data-dd-sw')){ const k = t.dataset.ddSw, v = !P()[k]; setP(k, v); blip(6); if(k === 'saver') toast(v ? '省电模式已开：不画频谱动画' : '省电模式已关'); render(); return; }
    if(t.closest('[data-dd-seg]')){ const k = t.closest('[data-dd-seg]').dataset.ddSeg; setP(k, t.dataset.v); blip(3); if(k === 'theme'){ nameCache.clear(); applyThemeVars(); } render(); return; }
    if(t.hasAttribute('data-dd-av')){ avWhich = +t.dataset.ddAv; const f = document.getElementById('dd-s-file'); if(f){ f.value = ''; f.onchange = () => { if(f.files[0]) saveAvatar(avWhich, f.files[0]); }; f.click(); } return; }
    if(t.hasAttribute('data-dd-reset')){ if(confirm('恢复默认设置？聊天记录和头像不会被删除')){ const keep = P(); state.doodlePrefs = {tgSec:keep.tgSec, ltRead:keep.ltRead, demoHidden:keep.demoHidden, season:keep.season}; persist('doodlePrefs'); nameCache.clear(); applyThemeVars(); render(); toast('已恢复默认'); } return; }
    if(t.hasAttribute('data-dd-mode')){ setP('chatMode', t.dataset.ddMode); blip(t.dataset.ddMode === 'bubble' ? 2 : 5); state.chatSidebarOpen = false; state.needChatScroll = true; render(); return; }
    if(t.hasAttribute('data-dd-together')){ openTogether(); return; }
    const go = t.dataset.ddGo;
    if(go === 'settings'){ if(state.tab === 'chat' && typeof saveActiveThread === 'function') saveActiveThread(); state.chatSidebarOpen = false; state.tab = 'settings'; state.subPage = null; render(); }
    else if(go === 'theme'){ state.tab = 'home'; state.subPage = 'theme'; render(); }
    else if(go === 'together'){ state.chatSidebarOpen = false; render(); openTogether(); }
  }, true);
  document.addEventListener('change', e => {
    if(!ON()) return; const id = e.target && e.target.id;
    if(id === 'dd-s-name'){ const ag = activeAgent(); const v = e.target.value.trim(); if(ag && v){ ag.name = v; persist('agents'); toast('名字已更新'); } }
    else if(id === 'dd-s-start'){ if(e.target.value){ state.coupleInfo.startDate = e.target.value; persist('coupleInfo'); toast('日期已更新'); } }
    else if(id === 'dd-s-quote'){ state.coupleInfo.statusMsg = e.target.value.trim().slice(0,500); persist('coupleInfo'); toast('文案已保存'); }
    else if(id === 'dd-s-wall'){ setP('wall', +e.target.value); }
  });
  document.addEventListener('input', e => { if(ON() && e.target && e.target.id === 'dd-s-wall'){ const v = (+e.target.value)/100; if(back) back.host.style.setProperty('--wall-a', v); } });
  function openTogether(){
    if(!mounted) return;
    const plyr = $('player'); if(!plyr) return;
    if(state.tab === 'chat' && typeof saveActiveThread === 'function') saveActiveThread();
    openNP(true);
  }

  return {pixelName:(w,o)=>pixelNameURL(w,o||{}), palette, afterRender, renderHomeSpacer, renderNav, chatHeader, chatMeta, bubbleAv, sidebarTop, renderSettings, playLocal, onEnded, isOn:ON};
})();
