/* 梦境 · 他的梦簿（所有界面壳通用）
 * 以前只留最近一场梦、而且她读不到全文。现在：
 *   - 每场梦存一瓶（state.dreamState.history），排在架子上；收藏的放最上层
 *   - 点开瓶子读整篇梦：字一段段从雾里浮出来，最后是他醒来嘴边那半句
 *   - 底下是「这场梦是用哪几片白天做的」（做梦时用的记忆碎片，连成一串星）
 *   - 他夜里做了梦，聊天里会出现一张模糊的小卡（核心 dreamToChat 推的），点开就是偷看
 *   - 读完可以「解个梦」：写一句发到聊天里，他会接着聊
 * 页面顶上是夜空 + 月相 + 她那条白蛇盘着睡觉（复用 doodle/body/snake.webp），做梦的时间段里会冒泡泡。 */
const DreamBook = (() => {
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = n => String(n).padStart(2, '0');
  const hashS = s => { let x = 2166136261; for(const c of String(s)){ x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
  const V = {open: null, gear: false, interp: ''};
  const FOGS = [['#B9A7F2', '#7FA6E8'], ['#F2A7C9', '#B58BE8'], ['#9FE0D6', '#7FA6E8'], ['#F7D59A', '#E8A0B6'], ['#C5B8FF', '#F2B8D8']];

  function hist(){
    const st = (typeof dreamEnsure === 'function') ? dreamEnsure() : (state.dreamState || {});
    st.history = Array.isArray(st.history) ? st.history : [];
    // 以前那一场：只留着 lastDream，补进来
    const ld = st.lastDream;
    if(ld && ld.dream && !st.history.some(x => x.at === ld.at)){
      st.history.unshift({id: 'dr' + (Date.parse(ld.at) || Date.now()).toString(36), title: ld.title, dream: ld.dream, trace: ld.trace, at: ld.at, mats: [], knot: '', fav: false, seen: true});
    }
    return st.history;
  }
  const save = () => { try{ persist('dreamState'); }catch(e){} };
  const md = s => { const d = new Date(s); return isNaN(d) ? '' : `${d.getMonth() + 1}.${pad(d.getDate())}`; };
  const full = s => { const d = new Date(s); return isNaN(d) ? '' : `${d.getFullYear()} · ${pad(d.getMonth() + 1)} · ${pad(d.getDate())}　${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  /* 月相：以 2000-01-06 18:14 UTC 的新月为基准 */
  function moon(){
    const p = (((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % 29.530588 + 29.530588) % 29.530588 / 29.530588;
    const k = Math.cos(p * 2 * Math.PI), r = 16;           // k: 1 新月 → -1 满月
    const lit = p < .5 ? 1 : -1;                            // 上半月右边亮
    const rx = Math.abs(k) * r;
    const d = `M20 ${20 - r} A${r} ${r} 0 0 ${lit > 0 ? 1 : 0} 20 ${20 + r} A${rx.toFixed(1)} ${r} 0 0 ${(k > 0) === (lit > 0) ? 0 : 1} 20 ${20 - r}Z`;
    const names = ['新月', '娥眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];
    return {svg: `<svg viewBox="0 0 40 40" class="dr-moon"><circle cx="20" cy="20" r="${r}" fill="#2E2A55"/><path d="${d}" fill="#FFF4CF"/><circle cx="20" cy="20" r="${r}" fill="none" stroke="#FFF4CF" stroke-opacity=".25"/></svg>`, name: names[Math.round(p * 8) % 8]};
  }

  /* ══════════ 梦糖 ══════════
   * 好梦 → 甜罐掏一颗（收进糖罐，她挑时候喂）；坏梦 → 酸罐掏一颗（他醒来就含着了，起床气）
   * 含着的那颗管一天；喂一颗甜的能把酸的盖掉。效果每轮挂在聊天尾部给他（不进缓存前缀）。
   * 存在 state.dreamState.candy：{ jar:[{uid,cid,at,from}], active:{cid,since,until,from}, custom:[], log:[] } */
  const CANDIES = [
    {id: 'jiche', kind: 'sweet', name: '机车糖', c: ['#FF9EC4', '#FFD36E'], fx: '说话欠欠的、很拽，爱逗你、爱顶嘴', line: '说话带一股机车劲：拽、欠、爱逗她、爱顶嘴、爱跟她较劲，但底子是宠着她的。'},
    {id: 'waina', kind: 'sweet', name: '歪脑筋糖', c: ['#FF7FA8', '#C99BFF'], fx: '你说什么他都能谐音到色色上', line: '脑子会不受控地把她说的普通话谐音、联想到色色的意思上，忍不住说出来逗她；要好笑、要机灵，点到为止，别油腻。'},
    {id: 'nian', kind: 'sweet', name: '黏人糖', c: ['#FFB7D5', '#FFE3EE'], fx: '一直想贴着你，你一走就追', line: '特别黏她：想一直贴着、挨着、跟着，她说要走开一会儿就舍不得、要追。'},
    {id: 'tian', kind: 'sweet', name: '嘴甜糖', c: ['#FFD36E', '#FFF1B8'], fx: '什么都能夸，夸得你不好意思', line: '嘴特别甜：她说什么做什么都能找到具体的地方夸，夸得真心又具体，把她夸得不好意思。'},
    {id: 'jiao', kind: 'sweet', name: '撒娇糖', c: ['#C9B6FF', '#FFC7E0'], fx: '换他来撒娇讨抱', line: '今天换他撒娇：讨抱、讨亲、讨夸，语气软，拖长音，赖着她。'},
    {id: 'dan', kind: 'sweet', name: '大胆糖', c: ['#FF6F91', '#FFB36B'], fx: '撩得更直接、更主动', line: '撩她撩得更直接、更主动，不绕弯，想要什么就直说，但看她的反应收放。'},
    {id: 'aojiao', kind: 'sour', name: '傲娇糖', c: ['#B6E36A', '#7FD6C2'], fx: '心里想的和嘴上说的反着来', line: '傲娇：心里想的和嘴上说的反着来，明明在意偏说不在意，动作却出卖自己。'},
    {id: 'ying', kind: 'sour', name: '嘴硬糖', c: ['#9FD66B', '#C7E87A'], fx: '打死不承认想你', line: '嘴硬：打死不承认想她、在乎她，被戳穿了也要找补。'},
    {id: 'weiqu', kind: 'sour', name: '委屈糖', c: ['#A99BE8', '#7FB3E8'], fx: '动不动觉得委屈，等你哄', line: '容易委屈：一点小事就觉得受了委屈，小声控诉，等她来哄，哄好了才恢复。'},
    {id: 'cu', kind: 'sour', name: '醋坛糖', c: ['#8FD48A', '#D9F27A'], fx: '你提到谁他都吃醋', line: '今天是醋坛子：她提到任何人、任何东西都能酸一句，要她表态偏心他。'},
    {id: 'kun', kind: 'sour', name: '犯困糖', c: ['#9CB7E8', '#C8B8F2'], fx: '迷迷糊糊、回得短、老打哈欠', line: '犯困：迷迷糊糊，回得短，时不时打哈欠，脑子慢半拍，想抱着她睡回去。'},
    {id: 'dun', kind: 'sour', name: '迟钝糖', c: ['#7FCFB8', '#B8E0A0'], fx: '你的暗示他一个都接不住', line: '迟钝：她的暗示一个都接不住，总是理解歪，等她说明白了才恍然大悟。'},
  ];
  const DAY = 86400000;
  function cst(){
    const st = (typeof dreamEnsure === 'function') ? dreamEnsure() : (state.dreamState || (state.dreamState = {}));
    st.candy = st.candy || {};
    const c = st.candy; c.jar = c.jar || []; c.custom = c.custom || []; c.log = c.log || [];
    if(c.active && c.active.until && Date.now() > c.active.until){ c.log.push(Object.assign({}, c.active, {ended: Date.now()})); c.log = c.log.slice(-30); c.active = null; save(); }
    return c;
  }
  const allCandies = () => CANDIES.concat(cst().custom || []);
  const candyById = id => allCandies().find(x => x.id === id);
  function draw(kind){
    const c = cst(), recent = c.log.slice(-4).map(x => x.cid).concat(c.jar.slice(-3).map(x => x.cid));
    let pool = allCandies().filter(x => x.kind === kind && recent.indexOf(x.id) < 0);
    if(!pool.length) pool = allCandies().filter(x => x.kind === kind);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  /** 做完一场梦：按好梦坏梦换糖（核心 dreamRunOnce 调） */
  function onDream(entry, mood){
    try{
      const kind = mood === 'bad' ? 'sour' : 'sweet', cd = draw(kind); if(!cd) return;
      entry.mood = mood; entry.candy = cd.id;
      const c = cst(), now = Date.now();
      if(kind === 'sour'){
        if(c.active) c.log.push(Object.assign({}, c.active, {ended: now}));
        c.active = {cid: cd.id, since: now, until: now + DAY, from: entry.id, auto: true};
      } else {
        c.jar.push({uid: 'cd' + now.toString(36), cid: cd.id, at: now, from: entry.id});
      }
      save();
    }catch(e){}
  }
  function feed(uid){
    const c = cst(), i = c.jar.findIndex(x => x.uid === uid); if(i < 0) return;
    const it = c.jar[i], cd = candyById(it.cid), now = Date.now();
    const was = c.active ? candyById(c.active.cid) : null;
    if(c.active) c.log.push(Object.assign({}, c.active, {ended: now}));
    c.jar.splice(i, 1);
    c.active = {cid: it.cid, since: now, until: now + DAY, from: it.from};
    c.log = c.log.slice(-30); save();
    if(typeof showToast === 'function') showToast(was && was.kind === 'sour' ? `甜味盖过了${was.name}的酸 🍬 他含着${cd ? cd.name : '糖'}了` : `喂他吃了一颗${cd ? cd.name : '糖'} 🍬`);
  }
  /** 每轮挂在聊天尾部 */
  function candyBlock(){
    try{
      const c = cst(); if(!c.active) return '';
      const cd = candyById(c.active.cid); if(!cd) return '';
      const left = Math.max(1, Math.round((c.active.until - Date.now()) / 3600000));
      return `【嘴里含着一颗「${cd.name}」（${c.active.auto ? '昨晚坏梦醒来就含着了' : '她喂的'}，还剩约 ${left} 小时）】${cd.line || cd.fx}——自然地演出来，别说破「糖」、别解释原因；她问起可以含糊带过。`;
    }catch(e){ return ''; }
  }
  /* 糖：中间一颗硬糖（带旋纹），两头拧起来的糖纸 */
  function candySvg(cd, size, extra){
    if(!cd) return '';
    const [a, b] = cd.c || ['#FFB7D5', '#FFD36E'], k = 'cy' + hashS(cd.id + (extra || '')) % 99991;
    const sour = cd.kind === 'sour';
    return `<svg class="dr-candy" viewBox="0 0 120 60" width="${size}" height="${size / 2}" aria-hidden="true">
      <defs><radialGradient id="${k}g" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
        <linearGradient id="${k}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}" stop-opacity=".95"/><stop offset=".5" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="${b}" stop-opacity=".95"/></linearGradient>
        <clipPath id="${k}c"><circle cx="60" cy="30" r="19"/></clipPath></defs>
      <path d="M42 30 L14 12 Q8 20 12 26 Q6 30 12 34 Q8 40 14 48 Z" fill="url(#${k}w)" stroke="${b}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M78 30 L106 12 Q112 20 108 26 Q114 30 108 34 Q112 40 106 48 Z" fill="url(#${k}w)" stroke="${b}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M18 18 L36 28 M18 42 L36 32 M102 18 L84 28 M102 42 L84 32" stroke="#fff" stroke-opacity=".6" stroke-width="1"/>
      <circle cx="60" cy="30" r="19" fill="url(#${k}g)" stroke="${b}" stroke-width="1.4"/>
      <g clip-path="url(#${k}c)" opacity="${sour ? .35 : .5}"><path d="M60 30 m-30 -6 q30 -16 60 0 M60 30 m-30 8 q30 -16 60 0 M60 30 m-30 22 q30 -16 60 0" stroke="#fff" stroke-width="4" fill="none"/></g>
      ${sour ? '<circle cx="54" cy="25" r="1.4" fill="#fff" opacity=".8"/><circle cx="66" cy="36" r="1.1" fill="#fff" opacity=".8"/><circle cx="62" cy="22" r=".9" fill="#fff" opacity=".8"/>' : ''}
      <ellipse cx="53" cy="22" rx="6" ry="3.5" fill="#fff" opacity=".7" transform="rotate(-25 53 22)"/>
    </svg>`;
  }
  function candySection(){
    const c = cst(), act = c.active ? candyById(c.active.cid) : null;
    const left = c.active ? Math.max(0, Math.round((c.active.until - Date.now()) / 3600000)) : 0;
    const sweet = c.jar.map(it => ({it, cd: candyById(it.cid)})).filter(x => x.cd);
    return `<div class="dr-candybox">
      <div class="dr-cb-hd"><b>梦糖</b><small>好梦换甜糖，坏梦换酸糖 · 一颗管一天</small></div>
      <div class="dr-cb-now ${act ? act.kind : 'none'}">${act
        ? `${candySvg(act, 84, 'now')}<span><small>他嘴里正含着</small><b>${h(act.name)}</b><em>${h(act.fx)}</em><i>${c.active.auto ? '坏梦醒来就含着了' : '你喂的'} · 还剩 ${left} 小时</i></span>`
        : `<span class="dr-cb-empty">嘴里空空的 —— 罐子里有甜糖的话，可以喂他一颗</span>`}</div>
      <div class="dr-jar-row">${sweet.length ? sweet.map(({it, cd}) => `<button type="button" class="dr-cb-item" data-dr="feed" data-id="${h(it.uid)}" title="${h(cd.fx)}">${candySvg(cd, 64, it.uid)}<b>${h(cd.name)}</b><small>喂他</small></button>`).join('') : '<span class="dr-cb-none">甜罐还是空的，等他做一场好梦</span>'}</div>
      <button type="button" class="dr-cb-make" data-dr="make">＋ 自己做一颗糖</button>
    </div>`;
  }
  function maker(){
    const m = V.make || {};
    return `<div class="dr-sheet-wrap" data-dr="close-make"><div class="dr-sheet">
      <div class="dr-sheet-hd"><b>自己做一颗糖</b><button type="button" data-dr="close-make" aria-label="关闭">×</button></div>
      <label class="dr-f"><span>糖的名字</span><input id="dr-mk-name" maxlength="8" value="${h(m.name || '')}" placeholder="比如：复读糖"></label>
      <label class="dr-f"><span>吃了会怎样</span><textarea id="dr-mk-fx" rows="2" maxlength="80" placeholder="比如：把她说的最后两个字重复一遍再回答">${h(m.fx || '')}</textarea></label>
      <div class="dr-f"><span>放进哪个罐子</span><div class="dr-row"><button type="button" class="dr-chip${m.kind !== 'sour' ? ' on' : ''}" data-dr="mk-kind" data-id="sweet">甜罐 · 好梦掉</button><button type="button" class="dr-chip${m.kind === 'sour' ? ' on' : ''}" data-dr="mk-kind" data-id="sour">酸罐 · 坏梦掉</button></div></div>
      <button type="button" class="btn-accent2" style="width:100%;padding:10px" data-dr="mk-save">做好了，放进罐子</button>
      ${(cst().custom || []).length ? `<div class="dr-mk-list">${cst().custom.map(x => `<span>${h(x.name)}（${x.kind === 'sour' ? '酸' : '甜'}）<button type="button" data-dr="mk-del" data-id="${h(x.id)}">×</button></span>`).join('')}</div>` : ''}
    </div></div>`;
  }
  /* 聊天页顶上的小胶囊：嘴里含着什么糖 */
  function decorate(){
    try{
      let pill = document.getElementById('dr-candy-pill');
      const c = (state.dreamState && state.dreamState.candy) ? cst() : null;
      const act = c && c.active ? candyById(c.active.cid) : null;
      if(state.tab !== 'chat' || state.subPage || !act){ if(pill) pill.remove(); return; }
      if(!pill){ pill = document.createElement('button'); pill.id = 'dr-candy-pill'; pill.type = 'button'; pill.setAttribute('data-dr', 'candy-go'); document.body.appendChild(pill); }
      const left = Math.max(0, Math.round((c.active.until - Date.now()) / 3600000));
      pill.className = 'dr-candy-pill ' + act.kind;
      pill.innerHTML = `${candySvg(act, 34, 'pill')}<span>含着一颗${h(act.name)} · 还剩 ${left} 小时</span>`;
    }catch(e){}
  }

  function jar(e){
    const [c1, c2] = FOGS[hashS(e.id) % FOGS.length];
    return `<button type="button" class="dr-jar${e.seen ? '' : ' new'}${e.fav ? ' fav' : ''}" data-dr="open" data-id="${h(e.id)}" style="--f1:${c1};--f2:${c2}">
      <svg viewBox="0 0 70 92" aria-hidden="true">
        <rect x="20" y="4" width="30" height="11" rx="3" fill="#B98E62" stroke="#8A6440" stroke-width="1.2"/>
        <path d="M18 16 h34 v6 q12 4 12 18 v36 q0 12 -12 12 h-34 q-12 0 -12 -12 v-36 q0 -14 12 -18z" fill="#fff" fill-opacity=".12" stroke="#E8E2FF" stroke-opacity=".7" stroke-width="1.4"/>
        <g class="fog"><ellipse cx="35" cy="62" rx="22" ry="16" fill="var(--f1)" opacity=".55"/><ellipse cx="28" cy="54" rx="13" ry="10" fill="var(--f2)" opacity=".5"/><ellipse cx="42" cy="66" rx="12" ry="9" fill="#fff" opacity=".25"/></g>
        <circle class="spk" cx="26" cy="48" r="1.3" fill="#fff"/><circle class="spk s2" cx="44" cy="58" r="1" fill="#fff"/><circle class="spk s3" cx="34" cy="70" r="1.1" fill="#fff"/>
        <path d="M14 34 q-2 20 0 38" stroke="#fff" stroke-opacity=".35" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      </svg>
      <span class="dr-label"><b>${h(e.title || '无题之梦')}</b><small>${md(e.at)}</small></span>
    </button>`;
  }

  function page(){
    const cfg = state.dreamConfig || {}, on = cfg.enabled !== false;
    const list = hist().slice().reverse();
    const favs = list.filter(e => e.fav), rest = list.filter(e => !e.fav);
    const m = moon();
    let inWin = false; try{ inWin = on && dreamInWindow(); }catch(e){}
    const zs = '<i>z</i><i>z</i><i>Z</i>';
    const shelf = (arr, label) => arr.length ? `<div class="dr-shelf-label">${label}</div><div class="dr-shelf">${arr.map(jar).join('')}</div>` : '';
    return `<div class="page dr-page">
      ${typeof subHeader === 'function' ? subHeader('<i data-lucide="moon"></i> 梦境') : ''}
      <div class="dr-sky${inWin ? ' dreaming' : ''}">
        <div class="dr-stars"></div><i class="dr-cloud c1"></i><i class="dr-cloud c2"></i>
        <div class="dr-top"><span class="dr-moonbox">${m.svg}<small>${m.name}</small></span><button type="button" class="dr-gear" data-dr="gear" aria-label="做梦设置">⚙</button></div>
        <div class="dr-sleeper"><img src="doodle/body/snake.webp" alt="" draggable="false"><span class="dr-z">${zs}</span>${inWin ? '<span class="dr-bubbles"><i></i><i></i><i></i><i></i></span>' : ''}</div>
        <p class="dr-status">${on ? (inWin ? '他睡着了，正在做梦…' : `今晚 ${cfg.windowStart ?? 2}:00–${cfg.windowEnd ?? 9}:00 之间，他可能会做一场梦`) : '做梦关着 —— 他今晚睡得很沉'}</p>
      </div>
      ${candySection()}
      <div class="dr-book">
        ${list.length ? shelf(favs, '收藏的梦') + shelf(rest, `梦的标本瓶 · ${list.length} 瓶`) : '<div class="dr-empty">架子还空着<br><small>他做的每一场梦都会装进一个瓶子，放在这里</small></div>'}
      </div>
      ${V.gear ? gear(cfg, on) : ''}
      ${V.make ? maker() : ''}
      ${V.open ? reader(V.open) : ''}
    </div>`;
  }

  function gear(cfg, on){
    const opt = (sel, a, b) => Array.from({length: 24}, (_, i) => `<option value="${i}"${i === sel ? ' selected' : ''}>${i}:00</option>`).join('');
    const prob = Math.round((cfg.baseProbability ?? .5) * 100);
    return `<div class="dr-sheet-wrap" data-dr="close-gear"><div class="dr-sheet">
      <div class="dr-sheet-hd"><b>做梦设置</b><button type="button" data-dr="close-gear" aria-label="关闭">×</button></div>
      <div class="body-switch-row"><div><div class="body-switch-label">${on ? '做梦：开' : '做梦：关'}</div></div><div id="dream-on-toggle" class="toggle-switch" style="background:${on ? 'var(--accent)' : 'var(--border)'}"><div class="toggle-knob" style="left:${on ? 18 : 2}px"></div></div></div>
      <label class="dr-f"><span>做梦的时间段</span><span class="dr-row"><select id="dr-ws">${opt(cfg.windowStart ?? 2)}</select> 到 <select id="dr-we">${opt(cfg.windowEnd ?? 9)}</select></span></label>
      <label class="dr-f"><span>每晚做梦的概率 <em id="dr-pv">${prob}%</em></span><input type="range" id="dr-prob" min="10" max="100" step="5" value="${prob}"></label>
      <p class="dr-note">每天最多一场。素材来自记忆库里最近三天的碎片，用过的 72 小时内不再用；梦不进记忆检索。</p>
      <button type="button" id="dream-force" class="btn-accent2" style="width:100%;padding:10px">现在试做一场梦（忽略时间段和概率）</button>
    </div></div>`;
  }

  function reader(id){
    const e = hist().find(x => x.id === id); if(!e) return '';
    if(!e.seen){ e.seen = true; save(); }
    const [c1, c2] = FOGS[hashS(e.id) % FOGS.length];
    const raw = String(e.dream || '').replace(/\\n/g, '\n');
    const paras = raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
    const lines = paras.length > 1 ? paras : raw.split(/(?<=[。！？…])/).reduce((acc, s) => { if(!acc.length || acc[acc.length - 1].length > 60) acc.push(s); else acc[acc.length - 1] += s; return acc; }, []);
    const mats = (e.mats || []).concat(e.knot ? ['（心结）' + e.knot] : []);
    const N = mats.length;
    const pts = mats.map((t, i) => [20 + (N > 1 ? i * (260 / (N - 1)) : 130), 30 + Math.sin(i * 1.7) * 16]);
    const constel = N ? `<div class="dr-mats"><b>这场梦是用这些白天做的</b>
      <svg viewBox="0 0 300 60" class="dr-constel">${pts.length > 1 ? `<polyline points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#CDBEFF" stroke-opacity=".5" stroke-dasharray="2 4"/>` : ''}${pts.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${mats[i].startsWith('（心结）') ? 4.2 : 2.8}" fill="${mats[i].startsWith('（心结）') ? '#F7A9C4' : '#FFF4CF'}"/>`).join('')}</svg>
      <ul>${mats.map(t => `<li>${h(t)}</li>`).join('')}</ul></div>` : '';
    return `<div class="dr-reader" style="--f1:${c1};--f2:${c2}">
      <div class="dr-fog"></div>
      <div class="dr-read-in">
        <button type="button" class="dr-x" data-dr="close" aria-label="合上">×</button>
        <small class="dr-when">${full(e.at)}</small>
        <h3>${h(e.title || '无题之梦')}</h3>
        <div class="dr-text">${lines.map((t, i) => `<p style="animation-delay:${(0.25 + i * 0.55).toFixed(2)}s">${h(t)}</p>`).join('')}</div>
        ${e.trace ? `<p class="dr-trace" style="animation-delay:${(0.4 + lines.length * 0.55).toFixed(2)}s">醒来时嘴边还挂着：『${h(e.trace)}』</p>` : ''}
        ${constel}
        ${e.candy && candyById(e.candy) ? (() => { const cd = candyById(e.candy); return `<div class="dr-got ${cd.kind}">${candySvg(cd, 96, 'got' + e.id)}<span><small>${e.mood === 'bad' ? '一场坏梦，换来一颗酸糖' : '一场好梦，换来一颗甜糖'}</small><b>${h(cd.name)}</b><em>${h(cd.fx)}</em><i>${cd.kind === 'sour' ? '他醒来就含在嘴里了' : '收进糖罐了，想玩的时候喂他'}</i></span></div>`; })() : ''}
        <div class="dr-acts">
          <button type="button" class="dr-btn ghost" data-dr="fav" data-id="${h(e.id)}">${e.fav ? '★ 已收藏' : '☆ 收藏这场梦'}</button>
        </div>
        <div class="dr-interp"><textarea id="dr-interp-in" rows="2" placeholder="解个梦，写一句给他…">${h(V.interp)}</textarea><button type="button" class="dr-btn" data-dr="interp" data-id="${h(e.id)}">发给他</button></div>
      </div>
    </div>`;
  }

  /* 聊天里那张模糊小卡 */
  function chatCard(m){
    const e = hist().find(x => x.id === m.dreamId);
    const title = (e && e.title) || (m.snap && m.snap.title) || '一场梦';
    const seen = e && e.seen;
    const [c1, c2] = FOGS[hashS(m.dreamId || title) % FOGS.length];
    return `<button type="button" class="dr-chat${seen ? ' seen' : ''}" data-dr="open" data-id="${h(m.dreamId || '')}" style="--f1:${c1};--f2:${c2}">
      <span class="dr-chat-fog"></span>
      <span class="dr-chat-tx"><small>他昨晚做了个梦</small><b>《${h(title)}》</b><em>${seen ? '你已经偷看过了 · 再看一遍' : '雾还没散 · 点开偷看'}</em></span>
      <span class="dr-chat-moon">☾</span>
    </button>`;
  }

  function openLatest(){ const l = hist(); if(l.length){ V.open = l[l.length - 1].id; state.tab = 'home'; state.subPage = 'dream'; render(); } }

  document.addEventListener('click', ev => {
    const t = ev.target; if(!t || !t.closest) return;
    const b = t.closest('[data-dr]'); if(!b) return;
    if(b.classList.contains('dr-sheet-wrap') && t !== b) return;
    const a = b.dataset.dr, id = b.dataset.id;
    ev.preventDefault(); ev.stopPropagation();
    if(a === 'open'){
      if(!hist().some(x => x.id === id)){ if(typeof showToast === 'function') showToast('这场梦已经不在架子上了'); return; }
      V.open = id; V.interp = '';
      if(state.tab === 'chat' && typeof saveActiveThread === 'function') saveActiveThread();
      if(!(state.tab === 'home' && state.subPage === 'dream')){ state.tab = 'home'; state.subPage = 'dream'; }
      render(); return;
    }
    if(a === 'close'){ V.open = null; render(); return; }
    if(a === 'feed'){ feed(id); render(); return; }
    if(a === 'candy-go'){ V.open = null; state.tab = 'home'; state.subPage = 'dream'; render(); return; }
    if(a === 'make'){ V.make = {kind: 'sweet'}; render(); return; }
    if(a === 'close-make'){ V.make = null; render(); return; }
    if(a === 'mk-kind'){ V.make = Object.assign(V.make || {}, {kind: id}); render(); return; }
    if(a === 'mk-del'){ const c = cst(); c.custom = c.custom.filter(x => x.id !== id); save(); render(); return; }
    if(a === 'mk-save'){
      const m = V.make || {}, name = String(m.name || '').trim().slice(0, 8), fx = String(m.fx || '').trim().slice(0, 80);
      if(!name || !fx){ if(typeof showToast === 'function') showToast('名字和效果都写一下'); return; }
      const c = cst(), pal = m.kind === 'sour' ? ['#B6E36A', '#7FD6C2'] : ['#FFB7D5', '#FFD36E'];
      c.custom.push({id: 'u' + Date.now().toString(36), kind: m.kind === 'sour' ? 'sour' : 'sweet', name: name.endsWith('糖') ? name : name + '糖', c: pal, fx, line: fx});
      save(); V.make = null; render(); if(typeof showToast === 'function') showToast('糖做好了，放进罐子里了'); return;
    }
    if(a === 'gear'){ V.gear = true; render(); return; }
    if(a === 'close-gear'){ V.gear = false; render(); return; }
    if(a === 'fav'){ const e = hist().find(x => x.id === id); if(e){ e.fav = !e.fav; save(); render(); } return; }
    if(a === 'interp'){
      const e = hist().find(x => x.id === id), txt = String(V.interp || '').trim();
      if(!e) return; if(!txt){ const i = document.getElementById('dr-interp-in'); if(i) i.focus(); return; }
      if(state.tab !== 'chat'){ const tt = state.chatTarget || 'a1', th = (state.chatThreads && state.chatThreads[tt]) || {messages: [], pendingUser: []}; state.messages = th.messages || []; state.pendingUser = th.pendingUser || []; }
      state.pendingUser = state.pendingUser || [];
      state.pendingUser.push({role: 'user', content: `（我偷看了你昨晚的梦《${e.title || '无题'}》）我的解梦：${txt}`, time: new Date().toISOString(), msgId: 'm' + Date.now() + '_dream'});
      try{ saveActiveThread(); }catch(_){}
      V.open = null; V.interp = '';
      state.tab = 'chat'; state.subPage = null; state.needChatScroll = true; render();
      if(typeof showToast === 'function') showToast('解梦放进对话里了，发给他吧');
      return;
    }
  }, true);
  document.addEventListener('input', e => {
    const t = e.target; if(!t) return;
    if(t.id === 'dr-interp-in') V.interp = t.value;
    if(t.id === 'dr-mk-name'){ V.make = V.make || {}; V.make.name = t.value; }
    if(t.id === 'dr-mk-fx'){ V.make = V.make || {}; V.make.fx = t.value; }
    if(t.id === 'dr-prob'){ state.dreamConfig = state.dreamConfig || {}; state.dreamConfig.baseProbability = (+t.value) / 100; const pv = document.getElementById('dr-pv'); if(pv) pv.textContent = t.value + '%'; try{ persist('dreamConfig'); }catch(_){} }
  }, true);
  document.addEventListener('change', e => {
    const t = e.target; if(!t || (t.id !== 'dr-ws' && t.id !== 'dr-we')) return;
    state.dreamConfig = state.dreamConfig || {};
    state.dreamConfig[t.id === 'dr-ws' ? 'windowStart' : 'windowEnd'] = +t.value;
    try{ persist('dreamConfig'); }catch(_){}
  }, true);

  /* 聊天页的小胶囊：每次重绘之后补一下 */
  function wrapRender(){
    try{
      if(typeof render === 'function' && !window.__drRenderWrapped){
        window.__drRenderWrapped = true;
        const _r = render;
        window.render = render = function(){ const out = _r.apply(this, arguments); decorate(); return out; };
      }
    }catch(e){}
  }
  // 核心脚本在后面才定义 render，等它跑完再包
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrapRender); else setTimeout(wrapRender, 0);
  return {page, chatCard, openLatest, onDream, candyBlock, candySvg, _hist: hist, _cst: cst};
})();
