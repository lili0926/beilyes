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
      if(typeof bpMeta === 'function') return bpMeta(key).txt || '';
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

  function home(){
    const now = new Date(), n = days(), lw = lastWord(), idxOpen = !!prefs().idxOpen;
    const rows = picks().map((f, i) => `
      <button type="button" class="mo-row feat-card${i === 0 ? ' on' : ''}" data-sub="${h(f.key)}">
        <span class="mo-i">${ROMAN[i]}.</span><span class="mo-t">${h(f.label)}${i === 0 ? '<i class="mo-dot"></i>' : ''}</span>
        <span class="mo-s">${h(meta(f.key))}</span><span class="mo-ar">→</span></button>`).join('');
    const pk = new Set(picks().map(f => f.key));
    let k = 0;
    const idx = idxOpen ? `<div class="mo-idx">${FEAT_GROUPS.map(g => {
      const its = g.items.filter(f => !pk.has(f.key));
      if(!its.length) return '';
      return `<div class="mo-idx-grp">${h(g.label)}</div>` + its.map(f => { k++; const s = meta(f.key);
        return `<button type="button" class="mo-irow feat-card" data-sub="${h(f.key)}"><span class="mo-ino">${pad(k)}</span><span class="mo-inm">${h(f.label)}</span><span class="mo-ist">${h(s)}</span></button>`; }).join('');
    }).join('')}</div>` : '';
    const total = allItems().length - pk.size;
    const lt = lw && lw.at ? new Date(lw.at) : null;
    return `<div class="page mo-home">
      <div class="mo-top"><b>MORPHO</b><span class="mo-date">${WD[now.getDay()]} · ${pad(now.getDate())} ${MO[now.getMonth()]} ${now.getFullYear()}</span></div>
      <div class="mo-top2">${themeSwitch()}</div>
      <div class="mo-stage" data-mo-fly>
        <img class="mo-fly" src="${IMG}" alt="" draggable="false">
      </div>
      <div class="mo-no"><div class="mo-n"><small>N°</small><span class="mo-scale">${n}</span></div><p>在一起的第${cnNum(n)}天</p></div>
      <div class="mo-tag"><span>Morpho peleides</span><span>${startStr() ? '采集于 ' + h(startStr()) : ''}</span></div>
      <nav class="mo-menu">${rows}
        <button type="button" class="mo-row mo-all" data-mo-idx="${idxOpen ? '0' : '1'}" aria-expanded="${idxOpen}">
          <span class="mo-i">—</span><span class="mo-t">全部</span><span class="mo-s">${total} 样</span><span class="mo-ar">${idxOpen ? '↑' : '↓'}</span></button>
      </nav>
      ${idx}
      <button type="button" class="mo-last" data-mo-chat>
        <span class="mo-last-hd"><span>他 · 最后一句</span><span>${lt && !isNaN(lt) ? pad(lt.getHours()) + ':' + pad(lt.getMinutes()) : ''}</span></span>
        <span class="mo-last-p">${lw ? h(lw.t) : '还没说话。去找他吧。'}</span>
      </button>
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
    const ix = t.closest('[data-mo-idx]');
    if(ix){
      e.preventDefault(); e.stopImmediatePropagation();
      prefs().idxOpen = ix.getAttribute('data-mo-idx') === '1';
      try{ persist('morphoPrefs'); }catch(_){}
      render(); return;
    }
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
    render = function(){ const r = orig.apply(this, arguments); try{ perch(); }catch(e){} return r; };
  });
  return {palette, home, isNight, bodyClass, perch, cnNum};
})();
