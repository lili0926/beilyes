/* 星光涂鸦壳 · 日记本 & 小纸条
 * 数据、接口全是原来的：state.mcDiaries / state.mcNotes（VPS 拉回来的镜像）、mcIsRestricted / mcIsUnlocked、
 * mcAddAnnotation（批注）、mcSendNote（写纸条）、data-mc-open / data-mc-del 和 mc-* 那几个 id 都照用，这里只换长相和手感。
 *
 * 机日记 → 一本真的本子：封面 → 翻开是最新一页；左右滑 / 点页角翻页；最后有一页月历。
 *   「仅自己」的那页被一条胶带封着、字是糊的；TA 解锁以后第一次打开，胶带要她亲手撕开（撕过就记在本地）。
 *   她的批注是页边的红笔字。
 * 小纸条 → 一块软木板：纸条用图钉 / 和纸胶带 / 小磁铁钉上去，每张歪的角度由 id 决定（每次一样）。
 *   TA 写的是淡紫横线纸（撕下来的毛边），她写的是淡蓝便利贴。TA 新写、她还没看的折成小方块，点一下展开。
 *   点开一张 = 从板上拿下来放大；批注写在背面（翻过来看）。右下角一本便签本，撕一张写新的。 */
const DoodlePaper = (() => {
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ON = () => typeof state !== 'undefined' && state.uiShell === 'doodle';
  const LSG = (k, d) => { try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } };
  const LSS = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
  const hashS = s => { let x = 2166136261; for(const c of String(s)){ x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
  /** 同一个 id 永远同一个 0–1 的数：纸条歪多少、用什么钉，都按它来 */
  const rnd = (id, k) => (hashS(id + ':' + k) % 10007) / 10007;
  const tOf = r => { const t = Date.parse((r && (r.time || r.createdAt || r.date)) || ''); return isNaN(t) ? 0 : t; };
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const fmtLong = r => { const t = tOf(r); if(!t) return h(r && r.date || ''); const d = new Date(t); return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 周${WEEK[d.getDay()]}`; };
  const fmtShort = r => { const t = tOf(r); if(!t) return h(r && r.date || ''); const d = new Date(t); return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const aiName = () => { try{ return (typeof momentAiName === 'function' && momentAiName()) || 'TA'; }catch(e){ return 'TA'; } };
  const restricted = d => typeof mcIsRestricted === 'function' ? mcIsRestricted('diary', d) : (d.visibility === 'private' || !!d.locked);
  const wasLocked = d => typeof mcIsUnlocked === 'function' && mcIsUnlocked(d.id);
  const V = {open: false, opening: false, page: null, flip: '', cal: false, annOpen: false, ann: '', peeling: null, back: false, unfolding: null, tearing: false};

  /* ══════════════ 日记本 ══════════════ */
  const DECO = ['heart', 'star', 'flower', 'clover', 'sparkle', 'cloud', 'moon', 'butterfly'];
  function diaries(){ return (state.mcDiaries || []).slice().sort((a, b) => tOf(a) - tOf(b)); }

  function cover(list){
    const n = list.length;
    return `<div class="ddd-stage">
      <button type="button" class="ddd-cover${V.opening ? ' opening' : ''}" ${n ? 'data-ddp="open"' : 'disabled'} aria-label="翻开日记本">
        <i class="ddd-spine"></i><i class="ddd-band"></i>
        <span class="ddd-sticker s1" data-doodle="star"></span><span class="ddd-sticker s2" data-doodle="heart"></span>
        <span class="ddd-label">
          <small>DIARY · 일기</small>
          <b>${h(aiName())} 的日记</b>
          <em>${n ? `共 ${n} 页` : '还是空白的'}</em>
        </span>
        <span class="ddd-cover-tip">${n ? '点一下，翻开' : '这是 TA 的专属日记，只有 TA 能写'}</span>
      </button>
    </div>`;
  }

  function calendar(list){
    const months = new Map();
    list.forEach(d => { const t = tOf(d); if(!t) return; const x = new Date(t), k = x.getFullYear() * 12 + x.getMonth(); if(!months.has(k)) months.set(k, new Map()); const m = months.get(k); if(!m.has(x.getDate())) m.set(x.getDate(), d); });
    const keys = [...months.keys()].sort((a, b) => b - a);
    if(!keys.length) return `<p class="ddd-empty">日记还没有日期，没法排进月历</p>`;
    return keys.map(k => {
      const y = Math.floor(k / 12), mo = k % 12, first = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate(), m = months.get(k);
      let cells = '';
      for(let i = 0; i < first; i++) cells += '<i></i>';
      for(let dd = 1; dd <= days; dd++){
        const e = m.get(dd);
        cells += e ? `<button type="button" class="on" data-ddp-day="${h(e.id)}" style="--r:${(rnd(e.id, 'c') * 16 - 8).toFixed(1)}deg">${dd}</button>` : `<i>${dd}</i>`;
      }
      return `<section class="ddd-month"><h4>${y} · ${mo + 1} 月 <small>${m.size} 天写了</small></h4>
        <div class="ddd-week">${WEEK.map(w => `<b>${w}</b>`).join('')}</div><div class="ddd-days">${cells}</div></section>`;
    }).join('');
  }

  function pageHtml(d, i, n){
    const lock = restricted(d), seal = !lock && wasLocked(d) && !LSG('ddDiaryPeeled', []).includes(String(d.id));
    const deco = DECO[hashS(d.id) % DECO.length];
    const anns = d.annotations || [];
    const body = lock
      ? `<div class="ddd-scribble">${Array.from({length: 7}, (_, k) => `<i style="width:${60 + Math.round(rnd(d.id, k) * 38)}%"></i>`).join('')}</div>`
      : `<div class="ddd-text">${h(d.content || '')}</div>`;
    const tape = lock
      ? `<div class="ddd-tape"><span class="ddd-stamp">封</span><p>${h(typeof mcRestrictLabel === 'function' ? mcRestrictLabel('diary', d).replace(/^🔒\s*/, '') : 'TA 还没给你看')}</p></div>`
      : seal ? `<button type="button" class="ddd-tape can${V.peeling === String(d.id) ? ' peeling' : ''}" data-ddp="peel"><span class="ddd-stamp">启</span><p>TA 给你解锁了 · 撕开看看</p></button>` : '';
    return `<article class="ddd-page${V.flip ? ' flip-' + V.flip : ''}" data-ddp-swipe>
      <header class="ddd-ph">
        <time>${fmtLong(d)}</time><span class="ddd-pno">p.${i + 1}</span>
        <span class="ddd-deco" data-doodle="${deco}" style="--r:${(rnd(d.id, 'd') * 30 - 15).toFixed(1)}deg"></span>
      </header>
      <h2 class="ddd-title">${d.title ? h(d.title) : '（无题）'}</h2>
      ${body}
      ${tape}
      ${!lock && !seal ? `<div class="ddd-anns">
        ${anns.map(a => `<p class="ddd-ann" style="--r:${(rnd(a.id || a.content, 'a') * 4 - 2).toFixed(1)}deg">${h(a.content || '')}<small>${h(a.date || '')}</small></p>`).join('')}
        ${V.annOpen ? `<div class="ddd-ann-in"><input id="ddp-ann" maxlength="200" placeholder="用红笔回一句…" value="${h(V.ann)}"><button type="button" data-ddp="ann-send">写下</button></div>`
          : `<button type="button" class="ddd-redpen" data-ddp="ann"><span data-doodle="edit"></span>用红笔写一句</button>`}
      </div>` : ''}
      <footer class="ddd-pf">
        <button type="button" class="ddd-nav" data-ddp="prev" ${i ? '' : 'disabled'} aria-label="上一页"><span data-doodle="back"></span></button>
        <span>${i + 1} / ${n}</span>
        <button type="button" class="ddd-nav" data-ddp="next" ${i < n - 1 ? '' : 'disabled'} aria-label="下一页"><span data-doodle="forward"></span></button>
      </footer>
      ${i < n - 1 ? `<button type="button" class="ddd-curl" data-ddp="next" aria-label="翻到下一页"></button>` : ''}
      <button type="button" class="ddd-del" data-mc-del="diary:${h(d.id)}" aria-label="删除这页"><span data-doodle="trash"></span></button>
    </article>`;
  }

  function diary(){
    const list = diaries();
    /* 从聊天卡片点进来：直接翻到那一页 */
    if(state.mcDetail && state.mcDetail.type === 'diary'){
      V.open = true; V.cal = false; V.page = String(state.mcDetail.id); state.mcDetail = null;
    }
    let body;
    if(!V.open || !list.length) body = cover(list);
    else if(V.cal) body = `<div class="ddd-cal">${calendar(list)}</div>`;
    else {
      let i = list.findIndex(d => String(d.id) === String(V.page));
      if(i < 0){ i = list.length - 1; V.page = String(list[i].id); }
      body = `<div class="ddd-stage open">${pageHtml(list[i], i, list.length)}</div>`;
    }
    V.flip = '';
    const open = V.open && list.length;
    return `<div class="page ddp ddd" style="padding-top:0">
      ${subHeader('日记本')}
      <p class="ddp-ko">${h(aiName())}의 일기장</p>
      ${open ? `<div class="ddd-tools">
        <button type="button" data-ddp="close"><span data-doodle="bookmark"></span>合上</button>
        <button type="button" class="${V.cal ? 'on' : ''}" data-ddp="cal"><span data-doodle="calendar"></span>${V.cal ? '回到这页' : '月历'}</button>
      </div>` : ''}
      ${body}
    </div>`;
  }

  /* ══════════════ 小纸条 ══════════════ */
  function seenList(){
    let s = LSG('ddNoteSeen', null);
    if(!s){   // 第一次：三天前的就当已经看过，别一进来满板都是折着的
      const cut = Date.now() - 3 * 864e5;
      s = (state.mcNotes || []).filter(n => n.author === 'ai' && tOf(n) && tOf(n) < cut).map(n => String(n.id));
      LSS('ddNoteSeen', s);
    }
    return s;
  }
  /** 撕下来的毛边：底边一串高低不平的点（每张纸条自己的形状） */
  function torn(id){
    const pts = ['0% 0%', '100% 0%'];
    const n = 16;
    for(let k = n; k >= 0; k--){ const x = k / n * 100, y = 100 - (k % 2 ? 2.5 + rnd(id, 't' + k) * 3.5 : rnd(id, 't' + k) * 2); pts.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`); }
    return `polygon(${pts.join(',')})`;
  }
  function noteCard(n, seen){
    const id = String(n.id), ai = n.author === 'ai';
    const rot = (rnd(id, 'r') * 9 - 4.5).toFixed(1), anns = (n.annotations || []).length;
    if(ai && !seen.includes(id)){
      return `<button type="button" class="ddn-item ddn-fold" data-ddn-unfold="${h(id)}" style="--r:${rot}deg" aria-label="${h(aiName())} 的新纸条，点开">
        <span class="ddn-seal" data-doodle="heart"></span><small>新纸条</small><em>点开</em>
      </button>`;
    }
    const fix = ai ? (rnd(id, 'f') < 0.55 ? 'pin' : 'tape') : (rnd(id, 'f') < 0.6 ? 'magnet' : 'tape');
    const hue = ['#F4A7C3', '#B9A3EC', '#9FD3C9', '#F6C77B'][hashS(id) % 4];
    return `<div class="ddn-item ${ai ? 'ai' : 'me'}${V.unfolding === id ? ' unfolding' : ''}" style="--r:${rot}deg;--fix:${hue}" data-mc-open="note:${h(id)}">
      <div class="ddn-paper" ${ai ? `style="clip-path:${torn(id)}"` : ''}>
        <p>${h(n.content || '')}</p>
        <footer><time>${fmtShort(n)}</time></footer>
        ${anns ? `<i class="ddn-back-hint">背面有 ${anns} 句</i>` : ''}
      </div>
      <i class="ddn-fix ${fix}"${fix === 'tape' ? ` style="--tr:${(rnd(id, 'tr') * 20 - 10).toFixed(1)}deg"` : ''}></i>
    </div>`;
  }
  function noteDetail(n){
    const ai = n.author === 'ai', anns = n.annotations || [];
    return `<div class="ddn-mask" id="mc-detail-mask">
      <div class="ddn-big ${ai ? 'ai' : 'me'}"><div class="ddn-card${V.back ? ' back' : ''}">
        <div class="ddn-face front">
          <p>${h(n.content || n.body || '')}</p>
          <footer><span>${ai ? 'TA 写给你' : '我写的'}</span><time>${fmtShort(n)}</time></footer>
        </div>
        <div class="ddn-face rear">
          <h4>纸条背面</h4>
          ${anns.length ? anns.map(a => `<p class="ddn-ann">${h(a.content || '')}<small>${h(a.date || '')}</small></p>`).join('') : '<p class="ddn-ann none">背面还空着，写一句回过去</p>'}
          <div class="ddn-ann-in"><input id="mc-ann-input" maxlength="200" placeholder="在背面写一句…" value="${h(state.mcAnnDraft || '')}"><button type="button" id="mc-ann-send">写下</button></div>
        </div>
      </div></div>
      <div class="ddn-big-bar">
        <button type="button" data-ddn-flip>${V.back ? '翻回正面' : `翻到背面${anns.length ? ` · ${anns.length}` : ''}`}</button>
        <button type="button" class="ddn-del" data-mc-del="note:${h(n.id)}" aria-label="删除"><span data-doodle="trash"></span></button>
        <button type="button" id="mc-detail-close" aria-label="放回去"><span data-doodle="check"></span>放回去</button>
      </div>
    </div>`;
  }
  function composer(){
    return `<div class="ddn-mask" id="mc-sheet-mask">
      <div class="ddn-new">
        <i class="ddn-fix magnet" style="--fix:#B9A3EC"></i>
        <textarea id="mc-note-input" maxlength="200" placeholder="想说的话写在这张便利贴上…">${h(state.mcNoteDraft || '')}</textarea>
        <div class="ddn-new-bar">
          <button type="button" id="mc-sheet-cancel">揉掉</button>
          <button type="button" id="mc-note-send" class="go">贴上去 · 发到聊天</button>
        </div>
      </div>
    </div>`;
  }
  function notes(){
    const list = (state.mcNotes || []).slice().sort((a, b) => tOf(b) - tOf(a));
    const seen = seenList();
    const det = state.mcDetail && state.mcDetail.type === 'note' && typeof mcFindDetail === 'function' ? mcFindDetail('note', state.mcDetail.id) : null;
    if(!det) V.back = false;
    const fresh = list.filter(n => n.author === 'ai' && !seen.includes(String(n.id))).length;
    const html = `<div class="page ddp ddn" style="padding-top:0">
      ${subHeader('小纸条')}
      <p class="ddp-ko">작은 쪽지들</p>
      <p class="ddn-count"><b>${list.length}</b> 张${fresh ? ` · <em>${fresh} 张新的还折着</em>` : ''}</p>
      <div class="ddn-board">
        ${list.length ? `<div class="ddn-cols">${list.map(n => noteCard(n, seen)).join('')}</div>`
          : `<p class="ddn-empty">板子上还空着<br><small>点右下角的便签本撕一张，或者等 ${h(aiName())} 写给你</small></p>`}
      </div>
      <button type="button" class="ddn-pad${V.tearing ? ' tearing' : ''}" data-ddn-pad aria-label="撕一张纸条">
        <i class="s3"></i><i class="s2"></i><i class="s1"><span data-doodle="plus"></span>撕一张</i>
      </button>
      ${state.mcSheet === 'note' ? composer() : ''}
      ${det ? noteDetail(det) : ''}
    </div>`;
    V.unfolding = null;
    return html;
  }

  /* ══════════════ 手势 / 点击 ══════════════ */
  function go(delta){
    const list = diaries(); let i = list.findIndex(d => String(d.id) === String(V.page));
    if(i < 0) i = list.length - 1;
    const j = Math.max(0, Math.min(list.length - 1, i + delta));
    if(j === i) return;
    V.page = String(list[j].id); V.flip = delta > 0 ? 'next' : 'prev'; V.annOpen = false; V.ann = '';
    render();
  }
  document.addEventListener('click', e => {
    if(!ON() || !e.target.closest) return;
    const t = e.target;
    const b = t.closest('[data-ddp],[data-ddp-day],[data-ddn-unfold],[data-ddn-pad],[data-ddn-flip]');
    if(!b) return;
    e.preventDefault(); e.stopPropagation();
    if(b.hasAttribute('data-ddp-day')){ V.page = b.getAttribute('data-ddp-day'); V.cal = false; V.flip = 'next'; render(); return; }
    if(b.hasAttribute('data-ddn-unfold')){
      const id = b.getAttribute('data-ddn-unfold'), s = seenList();
      if(!s.includes(id)){ s.push(id); LSS('ddNoteSeen', s.slice(-2000)); }
      V.unfolding = id; render(); return;
    }
    if(b.hasAttribute('data-ddn-pad')){
      V.tearing = true; render();
      setTimeout(() => { V.tearing = false; state.mcSheet = 'note'; render(); setTimeout(() => { const x = document.getElementById('mc-note-input'); if(x) x.focus(); }, 60); }, 380);
      return;
    }
    if(b.hasAttribute('data-ddn-flip')){ V.back = !V.back; const c = document.querySelector('.ddn-card'); if(c) c.classList.toggle('back', V.back); b.textContent = V.back ? '翻回正面' : '翻到背面'; return; }
    const act = b.getAttribute('data-ddp');
    if(act === 'open'){ V.opening = true; render(); setTimeout(() => { V.opening = false; V.open = true; V.cal = false; V.flip = 'next'; render(); }, 650); }
    else if(act === 'close'){ V.open = false; V.cal = false; V.annOpen = false; render(); }
    else if(act === 'cal'){ V.cal = !V.cal; render(); }
    else if(act === 'prev') go(-1);
    else if(act === 'next') go(1);
    else if(act === 'ann'){ V.annOpen = true; render(); setTimeout(() => { const x = document.getElementById('ddp-ann'); if(x) x.focus(); }, 40); }
    else if(act === 'ann-send'){
      const x = document.getElementById('ddp-ann'), text = ((x && x.value) || V.ann || '').trim();
      if(!text || typeof mcAddAnnotation !== 'function') return;
      const prev = state.mcDetail;
      state.mcDetail = {type: 'diary', id: V.page}; state.mcAnnDraft = text;
      Promise.resolve(mcAddAnnotation()).finally(() => {
        if(state.mcAnnDraft === ''){ V.annOpen = false; V.ann = ''; }
        state.mcDetail = prev && prev.type !== 'diary' ? prev : null;
        render();
      });
    }
    else if(act === 'peel'){
      const id = String(V.page); V.peeling = id; render();
      setTimeout(() => { const p = LSG('ddDiaryPeeled', []); if(!p.includes(id)) p.push(id); LSS('ddDiaryPeeled', p.slice(-500)); V.peeling = null; render(); }, 900);
    }
  }, true);
  document.addEventListener('input', e => { if(e.target && e.target.id === 'ddp-ann') V.ann = e.target.value; }, true);
  document.addEventListener('keydown', e => { if(e.target && e.target.id === 'ddp-ann' && e.key === 'Enter'){ const b = document.querySelector('[data-ddp="ann-send"]'); if(b) b.click(); } }, true);
  /* 左右滑翻页 */
  let sx = null, sy = 0;
  document.addEventListener('touchstart', e => { if(!ON() || !e.target.closest || !e.target.closest('[data-ddp-swipe]')) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive: true});
  document.addEventListener('touchend', e => {
    if(sx == null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
  }, {passive: true});

  return {diary, notes, isOn: ON};
})();
