/* 蓝闪蝶壳（uiShell = "morpho"）
 * 母题是「结构色」：闪蝶的蓝不是颜料，是光打在鳞片上折出来的，换个角度就变色。
 *   白天 = 压在白卡纸上的标本；黑夜 = 深夜标本柜，蝴蝶自己发光。默认跟着时间走（7 点到 19 点算白天）。
 *   首页：她生的那只闪蝶（doodle/morpho/morpho.webp）+ 标本编号 N°天数（字里填的是真鳞片 scales.webp）
 *         + 学名标签 + 最近用过的四样 + 全部功能目录 + 他最后一句
 *   摸蝴蝶 / 歪手机：翅膀的蓝跟着角度偏青偏紫；点一下扑两下翅膀
 *   聊天：他每来一条新消息，一只小闪蝶飞进来，落在那条消息上，慢慢合起翅膀
 * 配色由核心 T() 整份换掉（跟蓝晒壳同一个口径），这里只管首页、开关和那只会飞的蝴蝶。 */
const MorphoShell = (() => {
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const IMG = 'doodle/morpho/morpho.webp';
  const prefs = () => { try{ return state.morphoPrefs || (state.morphoPrefs = {}); }catch(e){ return {}; } };
  const mode = () => prefs().mode || 'auto';                       // auto | day | night
  function isNight(){
    const m = mode();
    if(m === 'day') return false;
    if(m === 'night') return true;
    const hr = new Date().getHours();
    return hr < 7 || hr >= 19;
  }
  function palette(){
    return isNight()
      ? { bg:"#06080F", card:"#0D111C", accent:"#46BFFF", accent2:"#1E55F5", text:"#E9EEF7", sub:"#7E8AA3", border:"#1C2436",
          bubble_me:"#1B5BEF", bubble_them:"#0F1422" }
      : { bg:"#F7F6F2", card:"#FFFFFF", accent:"#1A5CFF", accent2:"#7FA6FF", text:"#14171E", sub:"#8A8F9A", border:"#E4E3DE",
          bubble_me:"#1A5CFF", bubble_them:"#FFFFFF" };
  }

  /* ── 小工具 ── */
  const CN = '零一二三四五六七八九';
  function cnNum(n){
    n = Math.max(0, n | 0);
    if(n < 10) return CN[n];
    if(n >= 10000) return String(n);
    const u = ['', '十', '百', '千'], d = String(n).split('').reverse();
    let s = '', zero = false;
    for(let i = d.length - 1; i >= 0; i--){
      const v = +d[i];
      if(v === 0){ zero = true; continue; }
      if(zero && s){ s += '零'; } zero = false;
      s += (v === 1 && i === 1 && d.length === 2 ? '' : CN[v]) + u[i];
    }
    return s;
  }
  const pad = n => String(n).padStart(2, '0');
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function days(){ try{ return typeof daysSince === 'function' ? Math.max(0, daysSince()) : 0; }catch(e){ return 0; } }
  function startStr(){
    try{ const d = new Date(state.coupleInfo.startDate); if(!isNaN(d)) return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`; }catch(e){}
    return '';
  }
  function txtOf(m){
    let c = m && m.content;
    if(Array.isArray(c)) c = c.map(p => (p && (p.text || '')) || '').join(' ');
    return String(c || '').replace(/⟪[^⟫]*⟫/g, '').replace(/<[^>]+>/g, '').replace(/\[[^\]]{0,40}\]/g, '').replace(/\s+/g, ' ').trim();
  }
  /** 他最后说的那一句（当前聊天对象那条线程里最后一条他的文字消息） */
  function lastWord(){
    try{
      const tg = state.chatTarget || 'a1';
      const th = (state.chatThreads && state.chatThreads[tg]) || {};
      const list = (state.tab === 'chat' ? state.messages : th.messages) || th.messages || [];
      for(let i = list.length - 1; i >= 0; i--){
        const m = list[i];
        if(!m || m.role !== 'assistant' || m.type) continue;
        const t = txtOf(m);
        if(t) return {t: t.length > 60 ? t.slice(0, 60) + '…' : t, at: m.time || m.ts || m.at || 0};
      }
    }catch(e){}
    return null;
  }

  /* ── 目录：最近用过的四样排在首页，剩下的折在「全部」里 ── */
  const DEFAULT_PICKS = ['mailbox', 'dream', 'coupon', 'sigillo'];
  function allItems(){ try{ return FEAT_GROUPS.flatMap(g => g.items); }catch(e){ return []; } }
  function picks(){
    let rec = [];
    try{ rec = JSON.parse(localStorage.getItem('recentSubs') || '[]'); }catch(e){}
    const all = allItems(), keys = [];
    (Array.isArray(rec) ? rec : []).concat(DEFAULT_PICKS).forEach(k => { if(keys.length < 4 && !keys.includes(k) && all.some(f => f.key === k)) keys.push(k); });
    return keys.map(k => all.find(f => f.key === k));
  }
  function meta(key){
    try{
      switch(key){
        case 'coupon': { const n = (state.coupons || []).filter(c => !c.archived && (c.left == null || c.left > 0)).length; return n ? `还剩 ${n} 张` : ''; }
        case 'dream': { const hs = ((state.dreamState || {}).history || []); const d = hs[hs.length - 1] || hs[0]; return d ? (d.mood === '坏梦' ? '昨夜坏梦' : d.title ? String(d.title).slice(0, 6) : '有一夜') : ''; }
        case 'mailbox': { const L = state.mcLetters || []; return L.length ? `${L.length} 封` : ''; }
        case 'sigillo': { const R = ((state.sigillo || {}).reviews || []), open = R.filter(r => !r.submitted_at).length; return open ? `${open} 单待拆` : (R.length ? `${R.length} 单` : ''); }
        case 'wallet': { const w = state.wallet || {}; return w.balance != null ? `${w.balance} 🐟` : ''; }
        case 'memory': return (state.memories || []).length ? `${state.memories.length} 条` : '';
      }
      if(typeof bpMeta === 'function'){ const t = String(bpMeta(key).txt || ''); return t === '0' ? '' : t; }
    }catch(e){}
    return '';
  }
  const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

  function themeSwitch(){
    const m = mode();
    return `<span class="mo-sw" role="group" aria-label="昼夜">
      <button type="button" data-mo-mode="day" class="${m === 'day' ? 'on' : ''}">昼</button>
      <button type="button" data-mo-mode="night" class="${m === 'night' ? 'on' : ''}">夜</button>
      <button type="button" data-mo-mode="auto" class="${m === 'auto' ? 'on' : ''}" title="跟着时间">自</button>
    </span>`;
  }

  /* 首页：最近用过的四样 + 「更多」；更多 = 单独一页「标本柜」，所有 App 都在里面 */
  function home(){
    if(state.moView === 'apps') return apps();
    const now = new Date(), n = days(), lw = lastWord();
    const rows = picks().map((f, i) => `
      <button type="button" class="mo-row feat-card${i === 0 ? ' on' : ''}" data-sub="${h(f.key)}">
        <span class="mo-i">${ROMAN[i]}.</span><span class="mo-t">${h(f.label)}${i === 0 ? '<i class="mo-dot"></i>' : ''}</span>
        <span class="mo-s">${h(meta(f.key))}</span><span class="mo-ar">→</span></button>`).join('');
    const lt = lw && lw.at ? new Date(lw.at) : null;
    return `<div class="page mo-home">
      <div class="mo-top"><b>MORPHO</b><span class="mo-date">${WD[now.getDay()]} · ${pad(now.getDate())} ${MO[now.getMonth()]} ${now.getFullYear()}</span></div>
      <div class="mo-top2">${themeSwitch()}</div>
      <div class="mo-stage${lightUp() ? ' mo-lightup' : ''}" data-mo-fly>
        <img class="mo-fly" src="${IMG}" alt="" draggable="false">
      </div>
      <div class="mo-no"><div class="mo-n"><small>N°</small><span class="mo-scale">${n}</span></div><p>在一起的第${cnNum(n)}天</p></div>
      <div class="mo-tag"><span>Morpho peleides</span><span>${startStr() ? '采集于 ' + h(startStr()) : ''}</span></div>
      <div class="mo-sec"><span>最近</span><i></i><span class="mo-sec-en">Recently</span></div>
      <nav class="mo-menu">${rows}
        <button type="button" class="mo-row mo-all" data-mo-apps="1">
          <span class="mo-i">—</span><span class="mo-t">更多</span><span class="mo-s">${allItems().length} 样</span><span class="mo-ar">→</span></button>
      </nav>
      <button type="button" class="mo-last" data-mo-chat>
        <span class="mo-last-hd"><span>他 · 最后一句</span><span>${lt && !isNaN(lt) ? pad(lt.getHours()) + ':' + pad(lt.getMinutes()) : ''}</span></span>
        <span class="mo-last-p">${lw ? h(lw.t) : '还没说话。去找他吧。'}</span>
      </button>
    </div>`;
  }
  /* 标本柜：一格一样，像抽屉里的隔间；分组用罗马数字 */
  const GROUP_EN = {'功能': 'Instruments', '游戏': 'Games', '日常': 'Everyday'};
  function apps(){
    let k = 0;
    const rec = new Set(picks().map(f => f.key));
    const groups = (typeof FEAT_GROUPS !== 'undefined' ? FEAT_GROUPS : []).map((g, gi) => `
      <section class="mo-grp">
        <div class="mo-sec"><span>${h(g.label)}</span><i></i><span class="mo-sec-en">${['I', 'II', 'III', 'IV', 'V'][gi] || ''}. ${h(GROUP_EN[g.label] || '')}</span></div>
        <div class="mo-grid">${g.items.map(f => { k++; const m = meta(f.key);
          return `<button type="button" class="mo-cell feat-card${rec.has(f.key) ? ' rec' : ''}" data-sub="${h(f.key)}">
            <span class="mo-cno">${pad(k)}</span>
            <span class="mo-cic"><i data-lucide="${h(f.icon || 'circle')}"></i></span>
            <span class="mo-cnm">${h(f.label)}</span>
            <span class="mo-cst">${h(m)}</span></button>`; }).join('')}</div>
      </section>`).join('');
    return `<div class="page mo-home mo-apps">
      <div class="sub-header mo-apps-hd">
        <button type="button" class="back-btn" data-mo-apps="0" aria-label="回首页">‹</button>
        <div class="mo-titlewrap"><span class="mo-label">Cabinet — ${k || allItems().length} specimens</span><h2 class="page-title">标本柜</h2></div>
      </div>
      ${groups}
      <p class="mo-apps-ft">— 点开的那样，会排到首页「最近」里 —</p>
    </div>`;
  }

  /* ── 摸蝴蝶：角度一变，蓝就偏青或偏紫（结构色）；点一下扑两下 ── */
  function tint(x, y){
    const el = document.querySelector('.mo-fly'); if(!el) return;
    const hue = Math.round((x - .5) * 34), br = (1 + (.5 - y) * .16).toFixed(3);
    el.style.setProperty('--mo-hue', hue + 'deg'); el.style.setProperty('--mo-br', br);
    el.style.setProperty('--mo-ry', ((x - .5) * 16).toFixed(1) + 'deg'); el.style.setProperty('--mo-rx', ((.5 - y) * 10).toFixed(1) + 'deg');
  }
  document.addEventListener('pointermove', e => {
    if(state.uiShell !== 'morpho') return;
    const st = e.target && e.target.closest && e.target.closest('.mo-stage'); if(!st) return;
    const r = st.getBoundingClientRect(); tint((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }, {passive: true});
  document.addEventListener('pointerleave', e => { if(e.target && e.target.classList && e.target.classList.contains('mo-stage')) tint(.5, .5); }, true);
  let tiltOn = false;
  function bindTilt(){
    if(tiltOn || !window.DeviceOrientationEvent) return; tiltOn = true;
    window.addEventListener('deviceorientation', e => {
      if(state.uiShell !== 'morpho' || e.gamma == null) return;
      tint(.5 + Math.max(-1, Math.min(1, e.gamma / 35)) / 2, .5 + Math.max(-1, Math.min(1, (e.beta - 45) / 35)) / 2);
    }, {passive: true});
  }

  /* ── 点击：昼夜 / 全部 / 去聊天 / 拍蝴蝶 ── */
  document.addEventListener('click', e => {
    if(state.uiShell !== 'morpho') return;
    const t = e.target; if(!t || !t.closest) return;
    const md = t.closest('[data-mo-mode]');
    if(md){
      e.preventDefault(); e.stopImmediatePropagation();
      prefs().mode = md.getAttribute('data-mo-mode');
      try{ persist('morphoPrefs'); }catch(_){}
      applyThemeVars(); render(); return;
    }
    const ap = t.closest('[data-mo-apps]');
    if(ap){
      e.preventDefault(); e.stopImmediatePropagation();
      state.moView = ap.getAttribute('data-mo-apps') === '1' ? 'apps' : null;
      render();
      const pg = document.querySelector('.mo-home'); if(pg) pg.scrollTop = 0;
      return;
    }
    /* 从首页 / 标本柜点开的那样，记进「最近」（别处的委托可能先把点击吃掉，这里自己记一笔） */
    const sb = t.closest('.mo-home [data-sub]');
    if(sb){ try{ const key = sb.getAttribute('data-sub'); const r = JSON.parse(localStorage.getItem('recentSubs') || '[]').filter(x => x !== key); r.unshift(key); localStorage.setItem('recentSubs', JSON.stringify(r.slice(0, 8))); }catch(_){} }
    /* 底栏点「首页」：回到真正的首页，不停在标本柜 */
    if(t.closest('.bottom-nav button[data-tab="home"]')) state.moView = null;
    if(t.closest('[data-mo-chat]')){
      e.preventDefault(); e.stopImmediatePropagation();
      const b = document.querySelector('.bottom-nav button[data-tab="chat"]');
      if(b) b.click(); return;
    }
    if(t.closest('[data-mo-fly]')){
      bindTilt();
      const f = document.querySelector('.mo-fly');
      if(f){ f.classList.remove('flap'); void f.offsetWidth; f.classList.add('flap'); }
      try{ navigator.vibrate && navigator.vibrate(8); }catch(_){}
    }
  }, true);

  /* ── 夜里第一次打开：展柜的灯慢慢亮起来（每次启动只亮一次） ── */
  let lit = false;
  function lightUp(){ if(lit || !isNight()) return false; lit = true; return true; }

  /* ── 展签：每个子页顶栏上面多一行小字编号 + 英文名 ── */
  const EN = {body:'Vitals', trip:'Journeys', explore:'Wander', phone:'Calls', vps:'Engine', music:'Listening', read:'Reading', shufang:'Study',
    watch:'Watching', theme:'Appearance', prompts:'Prompts', tavern:'Tavern', rewrite:'Rewrite', hisphone:'His Phone', game:'Puppy', duel_gomoku:'Gomoku',
    duel_blackjack:'Blackjack', duel_zhajinhua:'Three Cards', duel_mahjong:'Mahjong', menu:'Menu', cmdgame:'Commands', htmlgame:'Games', mcphall:'MCP Hall',
    baby:'Nursery', roleplay:'Roleplay', calendar:'Calendar', pr:'Quick Worlds', flightchess:'Ludo', bisca_cards:'Card Room', bisca_daifugo:'Daifugo',
    bisca_monopoly:'Monopoly', captivity:'Captivity', sparkvault:'Stardust', cabinets:'Cabinets', dream:'Dreams', mdiary:'Diary', notes:'Notes',
    mailbox:'Letters', memory:'Memory', savedchat:'Kept', album:'Album', coupon:'Coupons', pilulier:'Pill Box', wallet:'Wallet', sayday:'My Say',
    love:'Scores', wardrobe:'Wardrobe', sigillo:'Receipts', quest:'Quests', eatapple:'Apple', backup:'Backup', moments:'Moments', settings:'Settings'};
  function label(key){
    const all = allItems(), i = all.findIndex(f => f.key === key);
    const en = EN[key] || String(key || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return (i >= 0 ? 'No. ' + pad(i + 1) + ' — ' : '') + en;
  }
  const EMO = /(?:\p{Extended_Pictographic}|\uFE0F|\u200D)+/gu;
  let lastPage = '';
  function decorate(){
    if(state.uiShell !== 'morpho') { lastPage = ''; return; }
    const app = document.getElementById('app'); if(!app) return;
    /* 换页才淡入，同一页里重绘不闪 */
    const pg = state.tab + '/' + (state.subPage || '');
    if(pg !== lastPage){
      const el = app.querySelector(':scope > .page, :scope > .chat-page, :scope > div > .page');
      if(el && lastPage){ el.classList.remove('mo-enter'); void el.offsetWidth; el.classList.add('mo-enter'); }
      lastPage = pg;
    }
    const hd = app.querySelector('.sub-header');
    if(hd && state.subPage && !hd.querySelector('.mo-label')){
      const t = hd.querySelector('.page-title, h2');
      if(t){ const w = document.createElement('div'); w.className = 'mo-titlewrap';
        t.replaceWith(w); w.innerHTML = `<span class="mo-label">${h(label(state.subPage))}</span>`; w.appendChild(t); }
    }
    /* 名字里的 emoji 收掉：高级感最怕花 */
    app.querySelectorAll('.chat-name, .msg-meta-name').forEach(n => { const t = n.textContent, c = t.replace(EMO, '').trim(); if(c && c !== t) n.textContent = c; });
  }

  /* ── 聊天：他的新消息上落一只小闪蝶 ── */
  let lastCount = -1, lastThread = '';
  function perch(){
    if(state.uiShell !== 'morpho' || state.tab !== 'chat' || state.subPage) { lastCount = -1; return; }
    const box = document.getElementById('chat-msgs'); if(!box) return;
    const them = box.querySelectorAll('.bubble-row.them .bubble.them');
    const last = them[them.length - 1]; if(!last) return;
    const thread = String(state.chatTarget || '');
    const fresh = lastCount >= 0 && thread === lastThread && them.length > lastCount;
    lastCount = them.length; lastThread = thread;
    last.classList.add('mo-perched');
    const b = document.createElement('i');
    b.className = 'mo-perch' + (fresh ? ' arrive' : '');
    b.setAttribute('aria-hidden', 'true');
    b.innerHTML = `<img src="${IMG}" alt="">`;
    last.appendChild(b);
  }
  /* 按下的那一下：一声极轻的「嗒」 */
  let actx = null;
  document.addEventListener('pointerdown', e => {
    if(state.uiShell !== 'morpho') return;
    const b = e.target && e.target.closest && e.target.closest('.mo-row, .mo-cell, .mo-last, .mo-sw button, .bottom-nav button, .send-btn.active, .back-btn');
    if(!b) return;
    try{ actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = 'triangle'; o.frequency.setValueAtTime(2400, t); o.frequency.exponentialRampToValueAtTime(1200, t + .03);
      g.gain.setValueAtTime(.025, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + .06); }catch(_){}
  }, true);
  /* 时间跨过 7 点 / 19 点时自动换昼夜 */
  let lastNight = null;
  setInterval(() => {
    if(state.uiShell !== 'morpho' || mode() !== 'auto') return;
    const n = isNight();
    if(lastNight !== null && n !== lastNight){ try{ applyThemeVars(); render(); }catch(e){} }
    lastNight = n;
  }, 60000);
  function bodyClass(){
    document.body.classList.add('shell-morpho');
    document.body.classList.toggle('mo-night', isNight());
  }
  window.addEventListener('DOMContentLoaded', () => {
    if(typeof render !== 'function') return;
    const orig = render;
    render = function(){ const r = orig.apply(this, arguments); try{ decorate(); }catch(e){} try{ perch(); }catch(e){} return r; };
  });
  return {palette, home, isNight, bodyClass, perch, decorate, label, cnNum};
})();
