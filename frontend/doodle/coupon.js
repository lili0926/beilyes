/* 券夹 · 两本能撕的券本（所有界面壳通用）
 *   「给他的券」dir:'his'  —— 她写好送他，他挑时候用 ⟪使用券:券名⟫ 撕下一张，她得兑现
 *   「他给我的券」dir:'mine' —— 他用 ⟪写券:券名|一句话|次数|有效天数|使用条件⟫ 塞给她，
 *                              她按住券往左拉、沿齿孔撕下来，他就得兑现
 * 每张券多的字段：uses（共几次）、left（还剩）、expire（YYYY-MM-DD，过了就褪色作废）、
 *   cond（使用条件，用的时候一起告诉他）、log[{at,by:'me'|'ai'}]（撕下来的存根，收进铁盒）、
 *   fresh（他刚写来、她还没翻到）、archived（删掉但留着存根）
 * 还是存在 state.coupons，旧券自动补字段（旧的都算「给他的」）。 */
const CouponBook = (() => {
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const md = s => { const d = new Date(s); return isNaN(d) ? '' : (d.getMonth() + 1) + '.' + pad(d.getDate()); };
  const ymd = s => String(s || '').slice(0, 10).replace(/-/g, '.');
  const aiName = () => { try{ const ag = typeof agentById === 'function' ? agentById(state.chatTarget === 'group' ? 'a1' : (state.chatTarget || 'a1')) : null; return (ag && ag.name) || 'TA'; }catch(e){ return 'TA'; } };
  const meName = () => { try{ return (state.coupleInfo && state.coupleInfo.myName) || '我'; }catch(e){ return '我'; } };
  const save = () => { try{ persist('coupons'); }catch(e){ try{ LS.set('coupons', state.coupons); }catch(_){} } };
  const uid = () => 'cp' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);

  const PALETTE = ['#EADFCB', '#F2C9CC', '#CFE2CC', '#BFD8EA', '#DCD3EF', '#F5E3A9', '#F4D1BE', '#D9D4C7'];
  const TEX = [['fiber', '纤维'], ['plain', '素纸'], ['dots', '颗粒'], ['grid', '方格'], ['lines', '横线']];
  const FONTS = [['serif', '宋体'], ['hand', '毛笔'], ['round', '圆润']];
  const USES = [1, 2, 3, 5, 10];
  const EXP = [[0, '不限'], [7, '7 天'], [30, '30 天'], [100, '100 天'], [365, '一年']];

  const V = {tab: 'his', edit: null, tin: false, tinOpen: false, focus: null, showOld: false};

  /* ── 数据 ── */
  function norm(c){
    if(!c) return c;
    if(!c.dir) c.dir = 'his';
    if(!c.uses) c.uses = 1;
    if(!Array.isArray(c.log)) c.log = c.usedAt ? [{at: c.usedAt, by: 'ai'}] : [];
    if(c.left == null) c.left = c.status === 'used' ? 0 : Math.max(0, c.uses - c.log.length);
    if(!c.font || c.font === 'handwritten') c.font = c.font === 'handwritten' ? 'hand' : 'serif';
    if(c.font === 'rounded') c.font = 'round';
    return c;
  }
  function all(){
    if(typeof ensureCoupons === 'function') ensureCoupons();
    if(!Array.isArray(state.coupons)) state.coupons = [];
    state.coupons.forEach(norm);
    return state.coupons;
  }
  const expired = c => !!(c.expire && c.expire < today());
  const live = c => c.status === 'kept' && !c.archived && c.left > 0 && !expired(c);
  const no = c => { const list = all().filter(x => x.dir === c.dir); const i = list.indexOf(c); return 'No.' + String((i < 0 ? list.length : i) + 1).padStart(3, '0'); };
  const find = id => all().find(x => x.id === id);
  const byName = (name, dir) => { const n = String(name || '').trim(); return all().find(x => x.dir === dir && live(x) && (x.name === n || x.title === n)) || null; };
  const snapOf = c => ({id: c.id, name: c.name, title: c.title || c.name, subtitle: c.subtitle, color: c.color, texture: c.texture, font: c.font, dir: c.dir, uses: c.uses, left: c.left, expire: c.expire, cond: c.cond, code: c.code || no(c)});

  /* ── 撕纸声：一小段带毛刺的噪声 ── */
  let actx = null;
  function tearSound(){
    try{
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const sr = actx.sampleRate, len = Math.floor(sr * .42), buf = actx.createBuffer(1, len, sr), d = buf.getChannelData(0);
      let env = 0;
      for(let i = 0; i < len; i++){
        const t = i / len;
        if(Math.random() < .012) env = .5 + Math.random() * .5;   // 一根根纤维断开
        env *= .9965;
        d[i] = (Math.random() * 2 - 1) * env * (t < .08 ? t / .08 : 1) * (1 - t * .6);
      }
      const src = actx.createBufferSource(); src.buffer = buf;
      const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = .7;
      const hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
      const g = actx.createGain(); g.gain.value = .55;
      src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(actx.destination); src.start();
    }catch(e){}
  }

  /* ── 券面 ── */
  function ticket(c, o){
    o = o || {};
    const tex = TEX.some(t => t[0] === c.texture) ? c.texture : 'fiber';
    const font = FONTS.some(f => f[0] === c.font) ? c.font : 'serif';
    const used = c.left <= 0 || c.status === 'used', exp = !used && expired(c);
    const from = c.dir === 'mine' ? aiName() : meName();
    const holes = Array.from({length: Math.min(c.uses || 1, 10)}, (_, i) => `<i class="${i < (c.uses - c.left) ? 'on' : ''}"></i>`).join('');
    const meta = [c.expire ? `有效期至 ${ymd(c.expire)}` : '长期有效', c.cond ? `限：${h(c.cond)}` : ''].filter(Boolean).join('<b>·</b>');
    const last = (c.log || [])[c.log.length - 1];
    const tearable = o.tear && live(c);
    return `<div class="cb-tk tex-${tex} f-${font}${used ? ' is-used' : ''}${exp ? ' is-exp' : ''}${o.cls ? ' ' + o.cls : ''}" style="--cp:${h(c.color || PALETTE[0])}" data-cb-id="${h(c.id || '')}">
  <div class="cb-main"${tearable ? ` data-cb-tear="${h(c.id)}"` : ''}>
    <div class="cb-guil"></div><div class="cb-frame"></div>
    <div class="cb-top"><span class="cb-no">${h(c.code || no(c))}${c.fresh && c.dir === 'mine' ? '<span class="cb-new">NEW</span>' : ''}</span><span class="cb-kind">COUPON${c.uses > 1 ? ' · ×' + c.uses : ''}</span></div>
    <div class="cb-title">${h(c.title || c.name || '新券')}</div>
    <div class="cb-sub">${h(c.subtitle || '')}</div>
    <div class="cb-meta">${meta}</div>
    <div class="cb-from"><em>from</em> ${h(from)}</div>
    <svg class="cb-seal" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="cbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBE9DD"/><stop offset=".45" stop-color="#D7A08B"/><stop offset=".7" stop-color="#F7DCCB"/><stop offset="1" stop-color="#B9806C"/></linearGradient></defs><circle cx="20" cy="20" r="18" fill="url(#cbg)"/><circle cx="20" cy="20" r="14.5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-dasharray="1.2 1.6"/><path d="M20 28.5c-5.6-3.7-8.4-7-7.2-10 .9-2.3 4.3-2.7 7.2.2 2.9-2.9 6.3-2.5 7.2-.2 1.2 3-1.6 6.3-7.2 10z" fill="#fff" fill-opacity=".8"/></svg>
  </div>
  <div class="cb-stub">
    <div class="cb-stub-v">ADMIT · ONE</div>
    <div class="cb-left"><b>${c.left}</b><span>/${c.uses}</span></div>
    <div class="cb-holes">${holes}</div>
    <div class="cb-bar"></div>
  </div>
  ${used ? `<div class="cb-stamp"><span>已兑现</span><small>${last ? md(last.at) : ''}</small></div>` : ''}
  ${exp ? `<div class="cb-stamp grey"><span>已过期</span><small>${ymd(c.expire)}</small></div>` : ''}
</div>`;
  }
  /* 撕下来的那半张（聊天里、铁盒里用） */
  function half(c, o){
    o = o || {};
    const font = FONTS.some(f => f[0] === c.font) ? c.font : 'serif';
    const tex = TEX.some(t => t[0] === c.texture) ? c.texture : 'fiber';
    return `<div class="cb-half tex-${tex} f-${font}${o.cls ? ' ' + o.cls : ''}" style="--cp:${h(c.color || PALETTE[0])}">
    <div class="cb-guil"></div><div class="cb-frame"></div>
    <div class="cb-top"><span class="cb-no">${h(c.code || '')}</span><span class="cb-kind">COUPON</span></div>
    <div class="cb-title">${h(c.title || c.name || '')}</div>
    ${c.subtitle ? `<div class="cb-sub">${h(c.subtitle)}</div>` : ''}
    ${c.cond ? `<div class="cb-meta">限：${h(c.cond)}</div>` : ''}
  </div>`;
  }

  /* ── 页面 ── */
  function page(){
    const list = all().filter(c => !c.archived);
    const mine = list.filter(c => c.dir === 'mine'), his = list.filter(c => c.dir === 'his');
    const freshN = mine.filter(c => c.fresh).length;
    const isMine = V.tab === 'mine';
    const cur = isMine ? mine : his;
    const act = cur.filter(live), drafts = cur.filter(c => c.status === 'draft'), old = cur.filter(c => c.status !== 'draft' && !live(c));
    const stubs = all().reduce((n, c) => n + (c.log || []).length, 0);
    const empty = isMine
      ? `<div class="cb-empty">${h(aiName())} 还没写过券给你<br><small>他想许你点什么的时候，会撕一张塞过来</small></div>`
      : `<div class="cb-empty">还没有给 ${h(aiName())} 的券<br><small>写一张吧，他会挑个时候撕下来用</small></div>`;
    const html = `<div class="page cb-page">
    ${typeof subHeader === 'function' ? subHeader('券夹') : '<h2 class="page-title">券夹</h2>'}
    <div class="cb-tabs" role="tablist">
      <button type="button" role="tab" class="cb-tab${!isMine ? ' on' : ''}" data-cb="tab" data-v="his"><span>给他的券</span><small>${his.filter(live).length} 张可用 · 他拿着</small></button>
      <button type="button" role="tab" class="cb-tab${isMine ? ' on' : ''}" data-cb="tab" data-v="mine"><span>他给我的券</span><small>${mine.filter(live).length} 张可用 · 我拿着</small>${freshN ? `<i class="cb-dot">${freshN}</i>` : ''}</button>
    </div>
    <p class="cb-hint">${isMine ? '按住券往左拉，沿着齿孔撕下来 —— 撕了他就得兑现，不许赖账' : '他会挑个时候撕下一张来用，到时候你得兑现哦'}</p>
    <div class="cb-book">
      ${act.length ? act.map(c => `<div class="cb-row">${ticket(c, {tear: isMine, cls: V.focus === c.id ? 'cb-focus' : ''})}${!isMine ? `<button type="button" class="cb-edit" data-cb="edit" data-id="${h(c.id)}" aria-label="编辑这张券">✎</button>` : `<button type="button" class="cb-edit" data-cb="del" data-id="${h(c.id)}" aria-label="删掉这张券">×</button>`}</div>`).join('') : empty}
    </div>
    ${!isMine ? `<button type="button" class="cb-write" data-cb="new"><span>＋</span> 写一张给他</button>` : ''}
    ${drafts.length ? `<div class="cb-label">草稿 · 还没放进券本</div><div class="cb-book cb-drafts">${drafts.map(c => `<div class="cb-row">${ticket(c)}<button type="button" class="cb-edit" data-cb="edit" data-id="${h(c.id)}" aria-label="编辑草稿">✎</button></div>`).join('')}</div>` : ''}
    ${old.length ? `<button type="button" class="cb-label cb-fold" data-cb="old">用完 / 过期的 · ${old.length} 张 <span>${V.showOld ? '收起' : '展开'}</span></button>${V.showOld ? `<div class="cb-book cb-old">${old.map(c => `<div class="cb-row">${ticket(c)}<button type="button" class="cb-edit" data-cb="del" data-id="${h(c.id)}" aria-label="收起这张">×</button></div>`).join('')}</div>` : ''}` : ''}
    <button type="button" class="cb-tin-btn" data-cb="tin"><span class="cb-tin-mini"></span><span><b>存根铁盒</b><small>${stubs ? `收着 ${stubs} 张撕下来的存根` : '撕下来的存根都收在这里'}</small></span><span class="cb-go">›</span></button>
    ${V.edit ? editor() : ''}
    ${V.tin ? tin() : ''}
  </div>`;
    if(isMine && freshN){ mine.forEach(c => { delete c.fresh; }); save(); }  // 翻到就算看过了（这一帧还画着 NEW）
    if(V.focus) setTimeout(() => { const el = document.querySelector('.cb-focus'); if(el) el.scrollIntoView({block: 'center', behavior: 'smooth'}); V.focus = null; }, 60);
    return html;
  }

  function editor(){
    const d = V.edit;
    const prev = Object.assign({}, d, {left: d.uses, log: [], status: 'kept', title: d.title || d.name || '新券', subtitle: d.subtitle || '写下这张券能兑现什么…', code: d.code || 'No.NEW', expire: d.expire || (d.expDays ? addDays(d.expDays) : '')});
    const chip = (k, v, label, on) => `<button type="button" class="cb-chip${on ? ' on' : ''}" data-cb="set" data-k="${k}" data-v="${h(v)}">${label}</button>`;
    return `<div class="cb-sheet-wrap" data-cb="close-edit"><div class="cb-sheet" data-cb-stop>
      <div class="cb-sheet-hd"><b>${d.id ? '改一改这张券' : '写一张给他的券'}</b><button type="button" data-cb="close-edit" aria-label="关闭">×</button></div>
      <div class="cb-preview" id="cb-preview">${ticket(prev)}</div>
      <label class="cb-f"><span>券名 <small>他用券时报的名字</small></span><input id="cb-in-name" maxlength="12" value="${h(d.name || '')}" placeholder="和好券" autocomplete="off"></label>
      <label class="cb-f"><span>券面一句话</span><input id="cb-in-sub" maxlength="40" value="${h(d.subtitle || '')}" placeholder="用一张，消一次气" autocomplete="off"></label>
      <label class="cb-f"><span>使用条件 <small>选填，他得满足了才能用</small></span><input id="cb-in-cond" maxlength="30" value="${h(d.cond || '')}" placeholder="只限我生气的时候" autocomplete="off"></label>
      <div class="cb-f"><span>能用几次</span><div class="cb-chips">${USES.map(u => chip('uses', u, '×' + u, d.uses === u)).join('')}</div></div>
      <div class="cb-f"><span>有效期</span><div class="cb-chips">${EXP.map(([n, l]) => chip('expDays', n, l, (d.expDays || 0) === n && !d.expPick)).join('')}<label class="cb-chip cb-date${d.expPick ? ' on' : ''}">${d.expPick ? ymd(d.expire) : '自选'}<input type="date" id="cb-in-date" value="${h(d.expPick ? d.expire : '')}"></label></div></div>
      <div class="cb-f"><span>纸色</span><div class="cb-chips">${PALETTE.map(p => `<button type="button" class="cb-sw${d.color === p ? ' on' : ''}" style="background:${p}" data-cb="set" data-k="color" data-v="${p}" aria-label="${p}"></button>`).join('')}</div></div>
      <div class="cb-f"><span>纸纹</span><div class="cb-chips">${TEX.map(([k, l]) => chip('texture', k, l, d.texture === k)).join('')}</div></div>
      <div class="cb-f"><span>字</span><div class="cb-chips">${FONTS.map(([k, l]) => chip('font', k, `<i class="f-${k}">${l}</i>`, d.font === k)).join('')}</div></div>
      <div class="cb-acts">
        ${d.id ? '<button type="button" class="cb-btn ghost danger" data-cb="drop">删掉</button>' : ''}
        <button type="button" class="cb-btn ghost" data-cb="save" data-v="draft">存草稿</button>
        <button type="button" class="cb-btn" data-cb="save" data-v="kept">放进券本</button>
      </div>
    </div></div>`;
  }
  function addDays(n){ const d = new Date(); d.setDate(d.getDate() + (+n)); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function tin(){
    const stubs = [];
    all().forEach(c => (c.log || []).forEach((l, i) => stubs.push({c, l, i})));
    stubs.sort((a, b) => String(b.l.at).localeCompare(String(a.l.at)));
    const rot = s => ((s.c.id + s.i).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % 9) - 4;
    return `<div class="cb-sheet-wrap cb-tin-wrap" data-cb="close-tin"><div class="cb-tin${V.tinOpen ? ' open' : ''}" data-cb-stop>
      <div class="cb-lid"><span>STUBS · 存根</span><small>我们兑现过的</small></div>
      <div class="cb-tin-body">
        ${stubs.length ? `<div class="cb-stubs">${stubs.map((s, i) => `<div class="cb-stubp tex-${h(s.c.texture || 'fiber')}" style="--cp:${h(s.c.color || PALETTE[0])};--r:${rot(s)}deg;--i:${Math.min(i, 20)}">
          <b>${h(s.c.title || s.c.name)}</b><span>${s.l.by === 'me' ? '我用掉的' : h(aiName()) + ' 用掉的'}</span><small>${ymd(s.l.at)}</small><i>${h(s.c.code || no(s.c))}</i></div>`).join('')}</div>`
        : '<div class="cb-empty light">铁盒还空着<br><small>撕下来的每一张存根都会掉进来</small></div>'}
      </div>
      <button type="button" class="cb-tin-close" data-cb="close-tin">合上盖子</button>
    </div></div>`;
  }

  /* ── 撕券（她） ── */
  function useMine(id){
    const c = find(id); if(!c || !live(c)) return;
    c.left -= 1; c.log.push({at: new Date().toISOString(), by: 'me'});
    if(c.left <= 0){ c.status = 'used'; c.usedAt = new Date().toISOString(); }
    save();
    try{ if(typeof postAppEvent === 'function') postAppEvent('coupon_use', {id: c.id, name: c.name, by: 'me'}); }catch(e){}
    const s = snapOf(c);
    const text = `（我撕下了你给我的那张「${c.title || c.name}」${c.subtitle ? '——' + c.subtitle : ''}${c.cond ? `；使用条件：${c.cond}` : ''}${c.uses > 1 ? `；这是第 ${c.uses - c.left} 次，还剩 ${c.left} 次` : ''}。券是你写的，按券兑现吧，不许赖账）`;
    if(state.tab !== 'chat' && typeof saveActiveThread === 'function'){
      const t = state.chatTarget || 'a1', th = (state.chatThreads && state.chatThreads[t]) || {messages: [], pendingUser: []};
      state.messages = th.messages || []; state.pendingUser = th.pendingUser || [];
    }
    state.pendingUser = state.pendingUser || [];
    state.pendingUser.push({role: 'user', type: 'coupon', couponId: c.id, couponAct: 'use', couponSnap: s, content: text, time: new Date().toISOString(), msgId: 'm' + Date.now() + '_coupon'});
    try{ saveActiveThread(); }catch(e){}
    if(typeof showToast === 'function') showToast(`撕下了「${c.title || c.name}」🎫 去跟他说吧`);
    state.tab = 'chat'; state.subPage = null; state.needChatScroll = true;
    render();
  }

  /* ── 他那边：暗号 ── */
  const RE_USE = /[⟪《【\[]\s*使用券\s*[:：]\s*([^⟫》】\]]+)[⟫》】\]]/g;
  const RE_WRITE = /[⟪《【]\s*写券\s*[:：]\s*([^⟫》】]+)[⟫》】]/g;
  function handleMarkers(body){
    let text = String(body || '');
    const msgs = [];
    let couponId = null;
    const um = RE_USE.exec(text); RE_USE.lastIndex = 0;
    if(um){
      const c = byName(um[1], 'his');
      if(c){
        c.left -= 1; c.log.push({at: new Date().toISOString(), by: 'ai'}); c.sentAt = c.sentAt || new Date().toISOString();
        if(c.left <= 0){ c.status = 'used'; c.usedAt = new Date().toISOString(); }
        couponId = c.id;
        msgs.push({couponId: c.id, couponAct: 'use', couponSnap: snapOf(c), content: `⟪使用券:${c.name}⟫`});
      }
    }
    const wm = RE_WRITE.exec(text); RE_WRITE.lastIndex = 0;
    if(wm){
      const p = wm[1].split(/[|｜]/).map(s => s.trim());
      const name = (p[0] || '').slice(0, 12);
      if(name && !all().some(x => x.dir === 'mine' && live(x) && x.name === name)){
        const uses = Math.max(1, Math.min(10, parseInt(p[2], 10) || 1)), days = Math.max(0, Math.min(3650, parseInt(p[3], 10) || 0));
        const k = all().filter(x => x.dir === 'mine').length;
        const c = norm({id: uid(), dir: 'mine', name, title: name, subtitle: (p[1] || '').slice(0, 40), cond: (p[4] || '').slice(0, 30), uses, left: uses,
          expire: days ? addDays(days) : '', color: PALETTE[(k * 3 + 1) % PALETTE.length], texture: TEX[k % TEX.length][0], font: k % 3 === 2 ? 'hand' : 'serif',
          status: 'kept', fresh: true, log: [], date: today(), code: 'No.' + String(k + 1).padStart(3, '0')});
        state.coupons.push(c);
        msgs.push({couponId: c.id, couponAct: 'write', couponSnap: snapOf(c), content: wm[0]});
      }
    }
    if(msgs.length) save();
    text = text.replace(RE_USE, '').replace(RE_WRITE, '').replace(/\n{3,}/g, '\n\n').trim();
    return {text, couponId, couponMsgs: msgs};
  }

  function promptBlock(){
    const list = all();
    const line = c => `- ${c.name}${c.subtitle ? '：' + c.subtitle : ''}${c.uses > 1 ? `（剩 ${c.left}/${c.uses} 次）` : ''}${c.expire ? `（${ymd(c.expire)} 前有效）` : ''}${c.cond ? `【使用条件：${c.cond}】` : ''}`;
    const his = list.filter(c => c.dir === 'his' && live(c)), mine = list.filter(c => c.dir === 'mine' && live(c));
    return `\n\n【券夹 —— 两本能撕的券本】
她写给你的券（在你手里，想用就撕一张，她得兑现）：
${his.length ? his.map(line).join('\n') : '（暂时没有）'}
你写给她的券（在她手里，她撕下来你就得兑现）：
${mine.length ? mine.map(line).join('\n') : '（暂时没有）'}
暗号：
⟪使用券:券名⟫ —— 撕一张她给你的券用掉。只能用上面列着的；写了使用条件的，条件真满足了才用；一次最多一张，挑合适的时候，别频繁。
⟪写券:券名|券面一句话|次数|有效天数|使用条件⟫ —— 写一张券塞给她（后三项可空着，如 ⟪写券:火锅券|欠你一顿火锅|1|30|⟫）。真有想许给她的事才写，一周别超过一两张，不要和她手里已有的重名。
她撕下你写的券时，会在消息里说是哪张：认账、兑现，可以逗她、讨价还价，但条件满足就不许赖。
暗号会被擦掉，她只看到券面；写了暗号也顺手说句人话。`;
  }

  /* 聊天卡片 */
  function chatCard(m, cc){
    const s = m.couponSnap || (cc ? snapOf(norm(cc)) : null);
    if(!s) return '';
    const me = m.role === 'user', who = me ? '我' : aiName();
    const act = m.couponAct || (me ? 'use' : 'give');
    const head = act === 'write' ? `${h(aiName())} 塞给你一张券` : act === 'use' ? `${h(who)} 撕下了一张券` : `${h(aiName())} 递来一张券`;
    const foot = act === 'write' ? '收进「他给我的券」了 · 点开看看' : act === 'use' ? (s.uses > 1 ? `第 ${s.uses - s.left} 次 · 还剩 ${s.left} 次` : '这张用掉了') : '点开券夹';
    const body = act === 'write' ? `<div class="cb-chat-whole">${ticket(Object.assign({log: []}, s, {left: s.uses, status: 'kept'}), {cls: 'cb-mini'})}</div>` : half(s, {cls: 'cb-torn'});
    return `<button type="button" class="cb-chat ${me ? 'me' : 'them'} act-${act}" data-cb="open" data-id="${h(s.id || '')}" data-v="${act === 'write' || (act === 'use' && me) ? 'mine' : 'his'}">
      <span class="cb-chat-hd">✂ ${head}</span>${body}<span class="cb-chat-ft">${foot}</span></button>`;
  }

  /* ── 交互 ── */
  function setDraft(k, v){
    const d = V.edit; if(!d) return;
    if(k === 'uses') d.uses = +v;
    else if(k === 'expDays'){ d.expDays = +v; d.expPick = false; d.expire = +v ? addDays(+v) : ''; }
    else d[k] = v;
  }
  function paintPreview(){
    const pv = document.getElementById('cb-preview'); if(!pv || !V.edit) return;
    const d = V.edit;
    pv.innerHTML = ticket(Object.assign({}, d, {left: d.uses, log: [], status: 'kept', title: d.title || d.name || '新券', subtitle: d.subtitle || '写下这张券能兑现什么…', code: d.code || 'No.NEW'}));
  }
  function saveDraft(status){
    const d = V.edit; if(!d) return;
    const name = String(d.name || '').trim().slice(0, 12);
    if(!name){ if(typeof showToast === 'function') showToast('给券起个名字吧'); const i = document.getElementById('cb-in-name'); if(i) i.focus(); return; }
    const fields = {name, title: name, subtitle: String(d.subtitle || '').trim(), cond: String(d.cond || '').trim(), uses: d.uses || 1, expire: d.expire || '', color: d.color, texture: d.texture, font: d.font, status};
    if(d.id){
      const c = find(d.id);
      if(c){ const usedN = (c.log || []).length; Object.assign(c, fields); c.left = Math.max(0, c.uses - usedN); if(c.left <= 0 && status === 'kept') c.status = 'used'; }
    } else {
      const k = all().filter(x => x.dir === 'his').length;
      state.coupons.push(norm(Object.assign({id: uid(), dir: 'his', left: fields.uses, log: [], date: today(), code: 'No.' + String(k + 1).padStart(3, '0')}, fields)));
    }
    save();
    try{ if(typeof postAppEvent === 'function') postAppEvent(d.id ? 'coupon_edit' : 'coupon_create', {name}); }catch(e){}
    V.edit = null; render();
    if(typeof showToast === 'function') showToast(status === 'kept' ? `「${name}」放进券本了` : '存成草稿了');
  }
  function remove(id){
    const c = find(id); if(!c) return;
    if((c.log || []).length) c.archived = true;       // 撕过的留着存根
    else state.coupons = state.coupons.filter(x => x !== c);
    save(); render();
  }

  document.addEventListener('click', e => {
    const t = e.target; if(!t || !t.closest) return;
    const b = t.closest('[data-cb]');
    if(!b) return;
    if(b.classList.contains('cb-sheet-wrap') && t !== b) return;   // 点在券单/铁盒里面，不算点遮罩
    const a = b.dataset.cb, id = b.dataset.id, v = b.dataset.v;
    e.preventDefault(); e.stopPropagation();
    if(a === 'tab'){ V.tab = v; render(); return; }
    if(a === 'new'){ V.edit = {name: '', subtitle: '', cond: '', uses: 1, expDays: 0, expire: '', color: PALETTE[all().filter(x => x.dir === 'his').length % PALETTE.length], texture: 'fiber', font: 'serif'}; render(); setTimeout(() => { const i = document.getElementById('cb-in-name'); if(i) i.focus(); }, 60); return; }
    if(a === 'edit'){ const c = find(id); if(!c) return; V.edit = Object.assign({}, c, {expPick: !!c.expire, expDays: 0}); render(); return; }
    if(a === 'close-edit'){ V.edit = null; render(); return; }
    if(a === 'set'){ setDraft(b.dataset.k, v); render(); return; }
    if(a === 'save'){ saveDraft(v); return; }
    if(a === 'drop'){ const d = V.edit; V.edit = null; if(d && d.id) remove(d.id); else render(); return; }
    if(a === 'del'){ const c = find(id); if(c && (c.dir === 'his' || confirm(`删掉「${c.title || c.name}」？`))) remove(id); return; }
    if(a === 'old'){ V.showOld = !V.showOld; render(); return; }
    if(a === 'tin'){ V.tin = true; V.tinOpen = false; render(); setTimeout(() => { V.tinOpen = true; const el = document.querySelector('.cb-tin'); if(el) el.classList.add('open'); }, 40); return; }
    if(a === 'close-tin'){ V.tin = false; V.tinOpen = false; render(); return; }
    if(a === 'open'){
      V.tab = v === 'mine' ? 'mine' : 'his'; V.focus = id || null; V.edit = null; V.tin = false;
      if(state.tab === 'chat' && typeof saveActiveThread === 'function') saveActiveThread();
      state.tab = 'home'; state.subPage = 'coupon'; render(); return;
    }
  }, true);
  document.addEventListener('input', e => {
    const t = e.target; if(!t || !V.edit) return;
    const map = {'cb-in-name': 'name', 'cb-in-sub': 'subtitle', 'cb-in-cond': 'cond'};
    if(map[t.id]){ V.edit[map[t.id]] = t.value; paintPreview(); }
    if(t.id === 'cb-in-date'){ V.edit.expire = t.value; V.edit.expPick = !!t.value; V.edit.expDays = 0; render(); }
  }, true);

  /* 往左拉着撕 */
  let drag = null, lastDrag = 0;
  document.addEventListener('pointerdown', e => {
    const m = e.target && e.target.closest && e.target.closest('[data-cb-tear]');
    if(!m || e.button > 0) return;
    drag = {el: m, tk: m.closest('.cb-tk'), id: m.dataset.cbTear, x: e.clientX, y: e.clientY, dx: 0, on: false, w: m.offsetWidth, pid: e.pointerId};
  }, true);
  document.addEventListener('pointermove', e => {
    if(!drag || e.pointerId !== drag.pid) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if(!drag.on){
      if(Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)){ drag = null; return; }
      if(dx > -8) return;
      drag.on = true; drag.tk.classList.add('tearing');
      try{ drag.el.setPointerCapture(e.pointerId); }catch(_){}
    }
    drag.dx = Math.min(0, dx);
    const k = Math.min(1, -drag.dx / (drag.w * .42));
    drag.el.style.transform = `translateX(${drag.dx}px) rotate(${-k * 5}deg)`;
    drag.tk.style.setProperty('--tk', k.toFixed(3));
  }, true);
  const end = () => {
    if(!drag) return;
    const d = drag; drag = null;
    if(!d.on){ return; }
    lastDrag = Date.now();
    if(-d.dx > Math.min(120, d.w * .42)){
      d.tk.classList.add('torn'); d.el.style.transform = ''; tearSound();
      try{ navigator.vibrate && navigator.vibrate(18); }catch(_){}
      setTimeout(() => useMine(d.id), 520);
    } else {
      d.el.style.transition = 'transform .32s cubic-bezier(.3,1.5,.5,1)'; d.el.style.transform = '';
      setTimeout(() => { d.el.style.transition = ''; d.tk.classList.remove('tearing'); d.tk.style.removeProperty('--tk'); }, 330);
    }
  };
  document.addEventListener('pointerup', end, true);
  document.addEventListener('pointercancel', end, true);
  /* 只点一下：提示怎么撕 */
  document.addEventListener('click', e => {
    const m = e.target && e.target.closest && e.target.closest('[data-cb-tear]');
    if(!m || Date.now() - lastDrag < 450) return;
    const tk = m.closest('.cb-tk'); if(!tk || tk.classList.contains('torn')) return;
    tk.classList.remove('nudge'); void tk.offsetWidth; tk.classList.add('nudge');
    if(typeof showToast === 'function') showToast('按住往左拉，沿着齿孔撕下来 ✂');
  });

  return {page, handleMarkers, promptBlock, chatCard, ticket, _all: all, _use: useMine, V};
})();
