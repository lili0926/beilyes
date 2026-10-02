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
      <div class="dr-book">
        ${list.length ? shelf(favs, '收藏的梦') + shelf(rest, `梦的标本瓶 · ${list.length} 瓶`) : '<div class="dr-empty">架子还空着<br><small>他做的每一场梦都会装进一个瓶子，放在这里</small></div>'}
      </div>
      ${V.gear ? gear(cfg, on) : ''}
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
    if(t.id === 'dr-prob'){ state.dreamConfig = state.dreamConfig || {}; state.dreamConfig.baseProbability = (+t.value) / 100; const pv = document.getElementById('dr-pv'); if(pv) pv.textContent = t.value + '%'; try{ persist('dreamConfig'); }catch(_){} }
  }, true);
  document.addEventListener('change', e => {
    const t = e.target; if(!t || (t.id !== 'dr-ws' && t.id !== 'dr-we')) return;
    state.dreamConfig = state.dreamConfig || {};
    state.dreamConfig[t.id === 'dr-ws' ? 'windowStart' : 'windowEnd'] = +t.value;
    try{ persist('dreamConfig'); }catch(_){}
  }, true);

  return {page, chatCard, openLatest, _hist: hist};
})();
