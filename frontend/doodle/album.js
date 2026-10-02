/* 星光涂鸦壳 · 相册（拍立得活页册）
 * 照片还是原来的 state.albumData（他用 ⟪收藏:感想⟫ 收进来的、相机拍的），这里多了：
 *   - 相册本是「收集」的：第一本是透明磨砂活页册，以后的本子在架子上先占着位（待收集）
 *   - 里面是透明卡册内页，一页四个口袋，按月份排，左右滑翻页
 *   - 她自己也能贴照片（压缩后存），正面白边写一句；照片背面两个人互相写（他蓝色钢笔，她红笔）
 *   - 他刚收藏、她还没看过的是一张没显影的拍立得，点一下慢慢显影
 *   - 「那天的我们」：一个月前 / 一百天前 / 一年前的今天拍的那张，放在最上面
 * 他那边：她贴了照片或在背面写了字，下一轮聊天的尾部顺带告诉他（tellBlock），
 * 他想回就写 ⟪相册背面:一句⟫，写到那张背面（handleBack）。不单独烧一轮。
 * 每张照片多的字段：by（'ai' | 'me'）、notes[{by,text,time}]、deco（装饰，下一版的贴纸/涂鸦用）。 */
const DoodleAlbum = (() => {
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ON = () => typeof state !== 'undefined' && state.uiShell === 'doodle';
  const LSG = (k, d) => { try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } };
  const LSS = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
  const hashS = s => { let x = 2166136261; for(const c of String(s)){ x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
  const rnd = (id, k) => (hashS(id + ':' + k) % 10007) / 10007;
  const pad = n => String(n).padStart(2, '0');
  const save = () => { try{ if(typeof persist === 'function') persist('albumData'); else LS.set('albumData', state.albumData); }catch(e){} };
  const aiName = () => { try{ const ag = typeof agentById === 'function' ? agentById(state.chatTarget || 'a1') : null; return (ag && ag.name) || 'TA'; }catch(e){ return 'TA'; } };
  const V = {open: false, opening: false, page: null, flip: '', detail: null, back: false, dev: null, compose: null, note: ''};

  /* 相册本：收集的。第一本透明磨砂，后面的先占位 */
  const BOOKS = [
    {id: 'frost', name: '透明磨砂', en: 'Frosted Clear'},
    {id: 'b2', name: '？？？', lock: true},
    {id: 'b3', name: '？？？', lock: true},
    {id: 'b4', name: '？？？', lock: true},
  ];

  /* ── 数据 ── */
  function timeOf(a){
    if(a.time) return +a.time;
    const m = String(a.id || '').match(/(\d{12,13})/);
    if(m) return +m[1];
    const t = Date.parse(a.date || ''); return isNaN(t) ? 0 : t;
  }
  function dayOf(a){ const t = timeOf(a); if(t) return new Date(t); const d = Date.parse(a.date || ''); return isNaN(d) ? new Date() : new Date(d); }
  const byOf = a => a.by || 'ai';
  function photos(){ return (state.albumData || []).filter(a => a && a.image).slice().sort((x, y) => timeOf(x) - timeOf(y)); }
  function seenList(){
    let s = LSG('ddAlbumSeen', null);
    if(!s){ s = (state.albumData || []).map(a => String(a.id)); LSS('ddAlbumSeen', s); }   // 第一次：已有的都算看过
    return s;
  }
  const isRaw = (a, seen) => byOf(a) === 'ai' && !seen.includes(String(a.id));
  function pages(list){
    const out = [];
    let cur = null;
    list.forEach(a => {
      const d = dayOf(a), key = d.getFullYear() + '-' + pad(d.getMonth() + 1);
      if(!cur || cur.key !== key || cur.items.length >= 4){ cur = {key, y: d.getFullYear(), m: d.getMonth() + 1, items: []}; out.push(cur); }
      cur.items.push(a);
    });
    return out;
  }
  /** 那天的我们：一年 / 一百天 / 整月前的今天 */
  function thatDay(list){
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let best = null;
    list.forEach(a => {
      const d = dayOf(a), d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const days = Math.round((today - d0) / 864e5);
      if(days <= 0) return;
      let label = null, w = 0;
      const months = (today.getFullYear() - d0.getFullYear()) * 12 + today.getMonth() - d0.getMonth();
      if(d0.getDate() === today.getDate() && months > 0){
        label = months % 12 === 0 ? `${months / 12} 年前的今天` : `${months} 个月前的今天`; w = months % 12 === 0 ? 300 + months : months;
      }
      if(days % 100 === 0){ label = `${days} 天前的今天`; w = 200 + days / 100; }
      if(label && (!best || w > best.w)) best = {a, label, w};
    });
    return best;
  }

  /* ── 画 ── */
  function polaroid(a, seen, big){
    const id = String(a.id), raw = isRaw(a, seen), dev = V.dev === id;
    const d = dayOf(a), rot = big ? 0 : (rnd(id, 'r') * 8 - 4).toFixed(1);
    const tape = ['#F4A7C3', '#B9A3EC', '#9FD3C9', '#F6C77B', '#BFD9F6'][hashS(id) % 5];
    return `<button type="button" class="dda-pol${raw && !dev ? ' raw' : ''}${dev ? ' developing' : ''}" style="--r:${rot}deg;--tape:${tape};--tr:${(rnd(id, 't') * 16 - 8).toFixed(1)}deg" ${raw && !dev ? `data-dda-dev="${h(id)}"` : `data-dda-open="${h(id)}"`} aria-label="${raw ? '还没显影的照片，点一下显影' : '照片 ' + h(a.caption || '')}">
      <span class="dda-tape"></span>
      <span class="dda-photo"><img src="${h(a.image)}" alt="" loading="lazy" draggable="false"></span>
      <span class="dda-cap ${byOf(a) === 'me' ? 'me' : 'ai'}">${raw && !dev ? '轻轻点一下，让它显影…' : h(a.caption || '')}</span>
      <span class="dda-date">${d.getMonth() + 1}.${pad(d.getDate())}</span>
      ${(a.notes || []).length && !(raw && !dev) ? `<span class="dda-back-dot" title="背面有字">${a.notes.length}</span>` : ''}
    </button>`;
  }
  function cover(list){
    const imgs = list.slice(-4).reverse();
    return `<div class="dda-stage">
      <button type="button" class="dda-cover${V.opening ? ' opening' : ''}" data-dda="open" aria-label="翻开相册">
        <span class="dda-under">${imgs.map((a, i) => `<img src="${h(a.image)}" alt="" style="--i:${i}">`).join('') || '<i class="dda-under-empty"></i>'}</span>
        <span class="dda-frost"></span>
        <span class="dda-rings"><i></i><i></i><i></i></span>
        <span class="dda-label"><small>OUR ALBUM · 우리의 앨범</small><b>我们的相册</b><em>${BOOKS[0].name} · ${list.length} 张</em></span>
        <span class="dda-cover-tip">点一下，翻开</span>
      </button>
    </div>`;
  }
  function shelf(){
    return `<div class="dda-shelf" aria-label="收集到的相册本">
      ${BOOKS.map(b => `<span class="dda-book${b.lock ? ' lock' : ' on'}" title="${b.lock ? '还没收集到' : b.name}"><i class="dda-book-${b.id}"></i><small>${b.lock ? '待收集' : b.name}</small></span>`).join('')}
    </div>`;
  }
  function detail(a){
    const seen = seenList(), notes = a.notes || [], who = byOf(a);
    return `<div class="dda-mask" data-dda-mask>
      <div class="dda-big"><div class="dda-card${V.back ? ' back' : ''}">
        <div class="dda-face front">${polaroid(a, seen, true)}</div>
        <div class="dda-face rear">
          <h4>照片背面 <small>${dayOf(a).toLocaleDateString('zh-CN')}${who === 'me' ? ' · 我贴的' : ' · ' + h(aiName()) + ' 收的'}</small></h4>
          <div class="dda-notes">
            ${notes.length ? notes.map(n => `<p class="dda-note ${n.by === 'me' ? 'me' : 'ai'}">${h(n.text)}<small>${n.by === 'me' ? '我' : h(aiName())}</small></p>`).join('')
              : `<p class="dda-note none">背面还空着</p>`}
          </div>
          <div class="dda-note-in"><input id="dda-note" maxlength="120" placeholder="在背面写一句…" value="${h(V.note)}"><button type="button" data-dda="note">写下</button></div>
        </div>
      </div></div>
      <div class="dda-bar">
        <button type="button" data-dda="flip">${V.back ? '翻回正面' : `翻到背面${notes.length ? ' · ' + notes.length : ''}`}</button>
        <button type="button" data-dda="cap">改正面那句</button>
        <button type="button" class="dda-del" data-dda="del" aria-label="删除这张"><span data-doodle="trash"></span></button>
        <button type="button" class="go" data-dda="close">放回去</button>
      </div>
    </div>`;
  }
  function compose(){
    return `<div class="dda-mask" data-dda-mask>
      <div class="dda-compose">
        <div class="dda-pol big" style="--r:0deg;--tape:#B9A3EC">
          <span class="dda-tape"></span>
          <span class="dda-photo"><img src="${h(V.compose.image)}" alt=""></span>
          <input id="dda-cap-in" class="dda-cap-in" maxlength="30" placeholder="在白边上写一句…">
        </div>
        <div class="dda-bar">
          <button type="button" data-dda="cancel">先不贴</button>
          <button type="button" class="go" data-dda="post">贴进相册</button>
        </div>
      </div>
    </div>`;
  }
  function page(){
    const list = photos(), seen = seenList(), P = pages(list);
    if(V.detail && !list.find(a => String(a.id) === V.detail)) V.detail = null;
    let body;
    if(!V.open) body = cover(list);
    else if(!P.length) body = `<div class="dda-sheet empty"><p>相册还是空的<br><small>点右下角贴一张，或者在聊天里发照片给 ${h(aiName())}，他觉得值得留的会自己收进来</small></p></div>`;
    else {
      let i = V.page == null ? P.length - 1 : Math.max(0, Math.min(P.length - 1, V.page));
      V.page = i;
      const pg = P[i];
      const td = thatDay(list);
      body = `${td ? `<button type="button" class="dda-thatday" data-dda-open="${h(td.a.id)}"><img src="${h(td.a.image)}" alt=""><span><b>那天的我们</b><small>${td.label}</small></span></button>` : ''}
        <div class="dda-sheet${V.flip ? ' flip-' + V.flip : ''}" data-dda-swipe>
          <span class="dda-holes"><i></i><i></i><i></i></span>
          <span class="dda-tab">${pg.y} · ${pg.m} 月</span>
          <div class="dda-pockets">${[0, 1, 2, 3].map(k => `<div class="dda-pocket">${pg.items[k] ? polaroid(pg.items[k], seen) : ''}</div>`).join('')}</div>
          <footer class="dda-pf">
            <button type="button" class="dda-nav" data-dda="prev" ${i ? '' : 'disabled'} aria-label="上一页"><span data-doodle="back"></span></button>
            <span>${i + 1} / ${P.length}</span>
            <button type="button" class="dda-nav" data-dda="next" ${i < P.length - 1 ? '' : 'disabled'} aria-label="下一页"><span data-doodle="forward"></span></button>
          </footer>
        </div>`;
    }
    V.flip = '';
    const det = V.detail ? list.find(a => String(a.id) === V.detail) : null;
    const html = `<div class="page ddp dda" style="padding-top:0">
      ${subHeader('相册')}
      <p class="ddp-ko">우리의 앨범</p>
      ${shelf()}
      ${V.open ? `<div class="ddd-tools"><button type="button" data-dda="shut"><span data-doodle="bookmark"></span>合上</button><span class="dda-count">${list.length} 张</span></div>` : ''}
      ${body}
      <label class="dda-fab" aria-label="贴一张照片"><input type="file" accept="image/*" id="dda-file" hidden><span data-doodle="plus"></span>贴一张</label>
      ${V.compose ? compose() : ''}
      ${det ? detail(det) : ''}
    </div>`;
    return html;
  }

  /* ── 她贴照片：压到长边 1400、jpeg .86，存得省、翻得快 ── */
  function shrink(file){
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => {
        const im = new Image();
        im.onerror = rej;
        im.onload = () => {
          const k = Math.min(1, 1400 / Math.max(im.width, im.height));
          const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', 0.86));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  /* ── 告诉他：她贴了照片 / 在背面写了字（只挂一轮尾部） ── */
  function tell(t){ LSS('ddAlbumTell', Object.assign({at: Date.now()}, t)); }
  function tellBlock(){
    const t = LSG('ddAlbumTell', null);
    if(!t) return '';
    const a = (state.albumData || []).find(x => String(x.id) === String(t.id));
    if(!a){ LSS('ddAlbumTell', null); return ''; }
    t.sent = true; LSS('ddAlbumTell', t);
    const what = t.kind === 'add' ? `她刚往你们的相册里贴了一张照片${a.caption ? `，白边上写着「${a.caption}」` : ''}。`
      : `她在相册里一张照片（${a.caption ? `「${a.caption}」` : dayOf(a).toLocaleDateString('zh-CN') + ' 那张'}）的背面写了：「${t.note || ''}」。`;
    return `【相册】${what}想回她就写一行 ⟪相册背面:一句话⟫，会用你的字写在那张照片背面（≤40 字）；不想回就当没看见，别硬写。`;
  }
  function handleBack(text){
    let s = String(text || '');
    const t = LSG('ddAlbumTell', null);
    const RE = /[⟪《【\[]\s*相册背面\s*[:：]\s*([^⟫》】\]]{1,200})[⟫》】\]]/g;
    let got = null;
    s = s.replace(RE, (_, w) => { if(!got) got = w.trim(); return ''; }).replace(/\n{3,}/g, '\n\n').trim();
    if(got && t){
      const a = (state.albumData || []).find(x => String(x.id) === String(t.id));
      if(a){ a.notes = a.notes || []; a.notes.push({by: 'ai', text: got.slice(0, 80), time: Date.now()}); save(); if(typeof showToast === 'function') showToast(aiName() + ' 在照片背面写了一句'); }
    }
    if(t && t.sent) LSS('ddAlbumTell', null);
    return s;
  }

  /* ── 点击 / 滑动 ── */
  function go(d){
    const P = pages(photos()); if(!P.length) return;
    const i = V.page == null ? P.length - 1 : V.page, j = Math.max(0, Math.min(P.length - 1, i + d));
    if(j === i) return;
    V.page = j; V.flip = d > 0 ? 'next' : 'prev'; render();
  }
  function find(id){ return (state.albumData || []).find(x => String(x.id) === String(id)); }
  document.addEventListener('click', e => {
    if(!ON() || !e.target.closest || state.subPage !== 'album') return;
    const t = e.target;
    const b = t.closest('[data-dda],[data-dda-open],[data-dda-dev],[data-dda-mask]');
    if(!b) return;
    if(b.hasAttribute('data-dda-mask') && b !== t) return;   // 遮罩只在点到空白处时关
    e.preventDefault(); e.stopPropagation();
    if(b.hasAttribute('data-dda-mask')){ if(V.compose) V.compose = null; else { V.detail = null; V.back = false; } render(); return; }
    if(b.hasAttribute('data-dda-dev')){
      const id = b.getAttribute('data-dda-dev'), s = seenList();
      if(!s.includes(id)){ s.push(id); LSS('ddAlbumSeen', s.slice(-3000)); }
      V.dev = id; render();
      setTimeout(() => { if(V.dev === id){ V.dev = null; render(); } }, 2600);
      return;
    }
    if(b.hasAttribute('data-dda-open')){ V.detail = b.getAttribute('data-dda-open'); V.back = false; V.note = ''; const s = seenList(); if(!s.includes(V.detail)){ s.push(V.detail); LSS('ddAlbumSeen', s); } render(); return; }
    const act = b.getAttribute('data-dda');
    const a = V.detail ? find(V.detail) : null;
    if(act === 'open'){ V.opening = true; render(); setTimeout(() => { V.opening = false; V.open = true; V.page = null; V.flip = 'next'; render(); }, 600); }
    else if(act === 'shut'){ V.open = false; render(); }
    else if(act === 'prev') go(-1);
    else if(act === 'next') go(1);
    else if(act === 'close'){ V.detail = null; V.back = false; render(); }
    else if(act === 'flip'){ V.back = !V.back; const c = document.querySelector('.dda-card'); if(c) c.classList.toggle('back', V.back); b.textContent = V.back ? '翻回正面' : '翻到背面'; }
    else if(act === 'note' && a){
      const x = document.getElementById('dda-note'), text = String((x && x.value) || '').trim();
      if(!text) return;
      a.notes = a.notes || []; a.notes.push({by: 'me', text: text.slice(0, 120), time: Date.now()});
      V.note = ''; save(); tell({kind: 'note', id: a.id, note: text.slice(0, 120)}); render();
    }
    else if(act === 'cap' && a){
      const c = window.prompt('正面白边上写什么？', a.caption || '');
      if(c == null) return;
      a.caption = c.trim().slice(0, 30); save(); render();
    }
    else if(act === 'del' && a){
      if(!window.confirm('把这张照片从相册里拿掉？')) return;
      state.albumData = (state.albumData || []).filter(x => x !== a); V.detail = null; save(); render();
    }
    else if(act === 'cancel'){ V.compose = null; render(); }
    else if(act === 'post' && V.compose){
      const cap = String((document.getElementById('dda-cap-in') || {}).value || '').trim().slice(0, 30);
      const now = Date.now();
      const item = {id: 'me' + now + '_' + Math.random().toString(36).slice(2, 6), image: V.compose.image, date: typeof _todayStr === 'function' ? _todayStr() : new Date().toISOString().slice(0, 10),
        caption: cap, by: 'me', notes: [], time: now};
      if(!Array.isArray(state.albumData)) state.albumData = [];
      state.albumData.push(item);
      const s = seenList(); s.push(item.id); LSS('ddAlbumSeen', s);
      save(); tell({kind: 'add', id: item.id});
      V.compose = null; V.open = true; V.page = null; V.flip = 'next';
      render();
      if(typeof showToast === 'function') showToast('贴好了，下次聊天 ' + aiName() + ' 会知道');
    }
  }, true);
  document.addEventListener('change', e => {
    if(!ON() || !e.target || e.target.id !== 'dda-file') return;
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if(!f) return;
    shrink(f).then(img => { V.compose = {image: img}; render(); setTimeout(() => { const x = document.getElementById('dda-cap-in'); if(x) x.focus(); }, 80); })
      .catch(() => { if(typeof showToast === 'function') showToast('这张图读不出来，换一张试试'); });
  }, true);
  document.addEventListener('input', e => { if(e.target && e.target.id === 'dda-note') V.note = e.target.value; }, true);
  let sx = null, sy = 0;
  document.addEventListener('touchstart', e => { if(!ON() || !e.target.closest || !e.target.closest('[data-dda-swipe]')) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive: true});
  document.addEventListener('touchend', e => {
    if(sx == null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
  }, {passive: true});

  return {page, tellBlock, handleBack, isOn: ON};
})();
