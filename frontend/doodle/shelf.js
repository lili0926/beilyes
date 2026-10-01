/* 星光涂鸦壳 · 一起读的「书架」页
 * 数据还是 state.books / state.readingNow，打开、导入、在读都走原来的 data-read-* 绑定；
 * 这里只负责长相：两层画出来的书架，书脊就是她真的书（点一下就开始读），
 * 下面一张「正在读」卡，进度条上骑着一颗星。
 * 右下角那只小猫可以点一下换成她自己生成的图（存在 doodlePrefs.shelfCat）。 */
const DoodleShelf = (() => {
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ON = () => typeof state !== 'undefined' && state.uiShell === 'doodle';
  /* FNV-1a + 末尾再搅一次：id 只差一位数的几本书也能分到不同颜色 */
  const hash = s => { let n = 0x811c9dc5; for(const c of String(s)){ n ^= c.charCodeAt(0); n = Math.imul(n, 0x01000193); } n ^= n >>> 15; n = Math.imul(n, 0x2c1b3c6d); n ^= n >>> 12; return n >>> 0; };
  /* 书脊配色：粉 / 薰衣草 / 薄荷 / 奶黄 / 葡萄紫 / 雾蓝（跟首页同一套糖果色） */
  const SPINES = [
    {bg:'#F5BCD3', ink:'#B4527F'}, {bg:'#CDB8EE', ink:'#7457A8'}, {bg:'#BFE6D7', ink:'#3F8C70'},
    {bg:'#F8E3A3', ink:'#A5822B'}, {bg:'#CB8EDD', ink:'#FFFFFF'}, {bg:'#BBD6F3', ink:'#4B79A8'},
  ];
  const COVERS = ['#6F9CC9', '#B48AD6', '#E59AB8', '#7CBFA4', '#E3B866', '#8C93D8'];

  const books = () => (state.books || []).filter(b => b && b.id != null);
  function progressOf(b){
    const now = state.readingNow, n = (b && b.chapters || []).length;
    if(!now || !b || now.bookId !== b.id || !n) return null;
    const idx = Math.min(Math.max(0, now.chapterIdx || 0), n - 1);
    /* 章内滚动比例 scrollPct 也算进去：第 1 章读一半是 0.5 章，不是 1 章 */
    const frac = Math.min(1, Math.max(0, +now.scrollPct || 0));
    return {idx, n, pct: Math.round(Math.min(1, (idx + frac) / n) * 100)};
  }

  /* ── 小装饰（全是内联 SVG，跟着主题色走）── */
  const sparkle = (cls, c) => `<svg class="ddsh-spk ${cls}" viewBox="0 0 20 20" aria-hidden="true"><path d="M8 0h4v8h8v4h-8v8H8v-8H0V8h8z" fill="${c}"/><path d="M8 8h4v4H8z" fill="#fff" opacity=".55"/></svg>`;
  const jar = `<svg class="ddsh-jar" viewBox="0 0 96 96" aria-hidden="true">
      <path d="M58 22a34 34 0 0 1 0 68z" fill="#D8C2F0"/><path d="M58 22a34 34 0 0 1 0 68" fill="none" stroke="#B79AE0" stroke-width="2"/>
      <rect x="4" y="12" width="64" height="80" rx="12" fill="#BBD6F3" stroke="#8FB6E6" stroke-width="2.5"/>
      <rect x="9" y="17" width="54" height="5" rx="2.5" fill="#fff" opacity=".55"/>
      <path d="M31 30h10v9h9v10h-9v9H31v-9h-9V39h9z" fill="#fff"/>
      <rect x="14" y="66" width="7" height="7" rx="1.5" fill="#fff"/><rect x="50" y="76" width="7" height="7" rx="1.5" fill="#fff"/>
    </svg>`;
  const badge = `<svg class="ddsh-badge" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#BBD6F3"/><circle cx="50" cy="50" r="38" fill="#fff"/>
      <circle cx="50" cy="50" r="34" fill="#F1E8FB" stroke="#CDB8EE" stroke-width="3"/>
      <path d="M50 70C32 58 30 44 38 39c6-4 12 0 12 5 0-5 6-9 12-5 8 5 6 19-12 31z" fill="#F29CBE"/>
      <path d="M40 44c1-3 4-4 6-3" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    </svg>`;
  const bow = `<svg class="ddsh-bow" viewBox="0 0 70 40" aria-hidden="true">
      <path d="M35 20L4 4v32z" fill="#F2A7C3" stroke="#D97BA3" stroke-width="2" stroke-linejoin="round"/>
      <path d="M35 20L66 4v32z" fill="#F2A7C3" stroke="#D97BA3" stroke-width="2" stroke-linejoin="round"/>
      <path d="M12 12v16M58 12v16" stroke="#fff" stroke-width="2" opacity=".6"/>
      <rect x="27" y="11" width="16" height="18" rx="4" fill="#E87FAA" stroke="#D2669A" stroke-width="2"/>
    </svg>`;
  /* 默认小猫（她会换成自己生成的图） */
  const catSvg = `<svg viewBox="0 0 120 112" aria-hidden="true">
      <path d="M22 44 18 8l30 20M98 44l4-36-30 20" fill="#fff" stroke="#B79AE0" stroke-width="3" stroke-linejoin="round"/>
      <path d="M25 30l-2-14 14 10M95 30l2-14-14 10" fill="#F6C4D8"/>
      <ellipse cx="60" cy="62" rx="50" ry="44" fill="#fff" stroke="#B79AE0" stroke-width="3"/>
      <circle cx="42" cy="58" r="5" fill="#3F3A52"/><circle cx="78" cy="58" r="5" fill="#3F3A52"/>
      <circle cx="43.5" cy="56.5" r="1.6" fill="#fff"/><circle cx="79.5" cy="56.5" r="1.6" fill="#fff"/>
      <ellipse cx="30" cy="72" rx="7" ry="4.5" fill="#F8C6D8"/><ellipse cx="90" cy="72" rx="7" ry="4.5" fill="#F8C6D8"/>
      <ellipse cx="60" cy="72" rx="7" ry="5" fill="#F29CBE" stroke="#D97BA3" stroke-width="2"/>
      <path d="M53 81q7 6 14 0" stroke="#B79AE0" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`;
  function cat(){
    const src = (state.doodlePrefs || {}).shelfCat;
    return `<button type="button" class="ddsh-cat" data-ddsh="cat" title="点一下换成你自己的图" aria-label="换小猫图片">${src ? `<img src="${h(src)}" alt="">` : catSvg}</button>`;
  }

  /* ── 书 ── */
  function spine(b, i, opt){
    const k = b ? hash(b.id + ':' + b.title) : hash('ghost' + i + (opt && opt.row));
    const c = SPINES[(opt && opt.color != null ? opt.color : k) % SPINES.length];
    const H = (opt && opt.h) || (112 + k % 44), W = (opt && opt.w) || (28 + k % 9);
    const deco = k % 3; /* 0：两道白条  1：方块标签  2：三道细线 */
    const reading = b && state.readingNow && state.readingNow.bookId === b.id;
    const title = b ? String(b.title || '').replace(/\s+/g, '').slice(0, 7) : '';
    const tag = b ? 'button' : 'span';
    const attrs = b ? `type="button" data-read-open="${h(b.id)}" title="${h(b.title)}"` : 'aria-hidden="true"';
    return `<${tag} class="ddsh-spine${b ? '' : ' ghost'}${reading ? ' on' : ''} d${deco}" ${attrs} style="--bg:${c.bg};--ink:${c.ink};height:${H}px;width:${W}px">
      <i class="ddsh-sd"></i>${title ? `<em>${h(title)}</em>` : ''}${reading ? '<b class="ddsh-ribbon"></b>' : ''}
    </${tag}>`;
  }
  function slab(b, i, wide){
    const k = b ? hash(b.id + ':' + b.title) : hash('slab' + i);
    const c = SPINES[[0, 5, 1][i] != null ? [0, 5, 1][i] : k % SPINES.length];
    const tag = b ? 'button' : 'span';
    const attrs = b ? `type="button" data-read-open="${h(b.id)}" title="${h(b.title)}"` : 'aria-hidden="true"';
    return `<${tag} class="ddsh-slab${b ? '' : ' ghost'}" ${attrs} style="--bg:${c.bg};--ink:${c.ink};width:${wide}px">
      <i></i>${b ? `<em>${h(String(b.title || '').slice(0, 9))}</em>` : ''}</${tag}>`;
  }
  function leaner(b){
    const tag = b ? 'button' : 'span';
    const attrs = b ? `type="button" data-read-open="${h(b.id)}" title="${h(b.title)}"` : 'aria-hidden="true"';
    return `<${tag} class="ddsh-lean${b ? '' : ' ghost'}" ${attrs}><i></i>${b ? `<em>${h(String(b.title || '').replace(/\s+/g, '').slice(0, 6))}</em>` : ''}</${tag}>`;
  }

  /* 书怎么摆：正在读的那本永远在上层第一格，其余按导入先后。
     上层 4 本竖放；下层 3 本平放 + 3 本竖放 + 1 本斜靠 —— 一共 11 个位置，多出来的在「全部」里 */
  function shelves(){
    const all = books(), now = state.readingNow;
    const order = all.slice().sort((a, b) => (now && b.id === now.bookId) - (now && a.id === now.bookId));
    const take = n => order.splice(0, n);
    const up = take(4), stack = take(3), low = take(3), lean = take(1)[0];
    const row1 = `<div class="ddsh-row r1">
        ${jar}
        <div class="ddsh-books">${[0, 1, 2, 3].map(i => spine(up[i], i, {row:1, color: up[i] ? null : i})).join('')}</div>
        ${sparkle('s1', '#8FB6E6')}${sparkle('s2', '#CFA0E8')}<i class="ddsh-dash"></i>
        ${badge}
      </div><div class="ddsh-plank"></div>`;
    const row2 = `<div class="ddsh-row r2">
        <div class="ddsh-stack">${bow}${[0, 1, 2].map(i => slab(stack[i], i, [80, 74, 86][i])).join('')}</div>
        <div class="ddsh-books">${[0, 1, 2].map(i => spine(low[i], i, {row:2, color: low[i] ? null : [3, 4, 2][i]})).join('')}</div>
        ${leaner(lean)}
        ${sparkle('s3', '#8FB6E6')}${sparkle('s4', '#CFA0E8')}
        ${cat()}
      </div><div class="ddsh-plank"></div>`;
    return row1 + row2;
  }

  function cover(b){
    const k = hash(b.id + ':' + b.title), bg = COVERS[k % COVERS.length], v = (k >>> 8) % 3;
    let art;
    if(v === 0){
      /* 两根细绳吊着两枚金色小牌（照设计稿那本书的封面） */
      const x1 = 30 + k % 14, x2 = 62 + k % 12;
      art = `<path d="M${x1 - 14} -2L${x1 + 4} 46M${x1 + 22} -2L${x1 + 4} 46" stroke="#E7A9A0" stroke-width="1.6" fill="none" opacity=".8"/>
        <rect x="${x1 - 12}" y="44" width="34" height="13" rx="3" fill="#E9C66A" stroke="#C99F3E" stroke-width="1.5"/>
        <path d="M${x2 - 4} 46L${x2 + 14} 88" stroke="#E7A9A0" stroke-width="1.6" fill="none" opacity=".8"/>
        <rect x="${x2}" y="86" width="30" height="12" rx="3" fill="#E9C66A" stroke="#C99F3E" stroke-width="1.5"/>`;
    } else if(v === 1){
      /* 弯月 + 几颗星 */
      const cx = 44 + k % 30;
      art = `<circle cx="${cx}" cy="52" r="24" fill="#FFF3C9"/><circle cx="${cx + 11}" cy="45" r="21" fill="${bg}"/>
        <path d="M86 24l2.4 5.6 5.6 2.4-5.6 2.4L86 40l-2.4-5.6-5.6-2.4 5.6-2.4z" fill="#fff"/>
        <circle cx="28" cy="92" r="2.6" fill="#fff"/><circle cx="94" cy="84" r="2" fill="#fff" opacity=".8"/><circle cx="64" cy="100" r="1.6" fill="#fff" opacity=".7"/>`;
    } else {
      /* 斜着一条缎带 + 一颗小心 */
      art = `<path d="M-6 ${70 + k % 16}L126 ${30 + k % 16}" stroke="#fff" stroke-width="16" opacity=".55"/>
        <path d="M-6 ${70 + k % 16}L126 ${30 + k % 16}" stroke="#fff" stroke-width="2" stroke-dasharray="4 5" opacity=".9" transform="translate(0 9)"/>
        <path d="M60 ${94 - k % 10}c-12-8-13-17-8-20 4-3 8 0 8 3 0-3 4-6 8-3 5 3 4 12-8 20z" fill="#F7C6D8" stroke="#fff" stroke-width="1.5"/>`;
    }
    return `<svg class="ddsh-cover" viewBox="0 0 120 120" aria-hidden="true">
      <rect width="120" height="120" rx="22" fill="${bg}"/>
      <rect width="120" height="120" rx="22" fill="url(#ddshG)" opacity=".35"/>
      <defs><linearGradient id="ddshG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      ${art}
    </svg>`;
  }
  const star = `<svg class="ddsh-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l3.1 6.8 7.4.8-5.5 5 1.6 7.3L12 17.6l-6.6 3.8L7 14.1 1.5 9.1l7.4-.8z" fill="#8FB6E6" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

  function reading(){
    const now = state.readingNow, b = now && books().find(x => x.id === now.bookId);
    if(!b){
      return `<div class="ddsh-card ddsh-now empty">${sparkle('s5', '#CFA0E8')}
        <div class="ddsh-now-txt"><small>正在读</small><b>还没翻开哪一本</b><span>从书架上抽一本，点书脊就开始</span></div></div>`;
    }
    const p = progressOf(b) || {idx:0, n:(b.chapters || []).length, pct:0};
    return `<button type="button" class="ddsh-card ddsh-now" data-read-tab="read">${sparkle('s5', '#CFA0E8')}
      ${cover(b)}
      <div class="ddsh-now-txt">
        <small>正在读</small>
        <b>${h(b.title)}</b>
        <span>第 ${p.idx + 1} 章 · 已读 ${p.pct}%</span>
        <div class="ddsh-bar"><i style="width:${p.pct}%"></i><span style="left:${p.pct}%">${star}</span></div>
      </div>
    </button>`;
  }

  function allList(){
    const all = books();
    if(!all.length) return '';
    return `<div class="ddsh-card ddsh-all">
      <div class="ddsh-head"><span class="ddsh-label">全部 ${all.length} 本</span><button type="button" class="ddsh-x" data-ddsh="all">收起</button></div>
      <div class="ddsh-grid">${all.map(b => {
        const p = progressOf(b), n = (b.chapters || []).length;
        return `<div class="ddsh-item">
          <button type="button" class="ddsh-item-main" data-read-open="${h(b.id)}">${cover(b)}<b>${h(b.title)}</b><span>${p ? `读到 ${p.idx + 1}/${n}` : `${n} 章`}</span></button>
          <button type="button" class="ddsh-del" data-ddsh-del="${h(b.id)}" aria-label="从书架拿走">×</button>
        </div>`; }).join('')}</div>
    </div>`;
  }

  function page(){
    const all = books(), feedOn = state.readFeedChat !== false;
    const custom = !!(state.doodlePrefs || {}).shelfCat;
    return `<div class="page ddsh" style="padding-top:0">
      ${subHeader('书架')}
      <p class="ddsh-ko">네 모든 순간이 책이 되어</p>
      <section class="ddsh-card ddsh-shelf">
        <header class="ddsh-head">
          <span class="ddsh-ico" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="ddsh-label">书架</span>
          <button type="button" class="ddsh-count" data-ddsh="all">共 ${all.length} 本<span data-doodle="forward" data-boil="hover"></span></button>
        </header>
        <div class="ddsh-dots"></div>
        <div class="ddsh-wood">${shelves()}</div>
      </section>
      ${reading()}
      ${state.ddshAll ? allList() : ''}
      <div class="ddsh-foot">
        <button type="button" class="ddsh-pill main" data-read-tab="add"><span data-doodle="plus" data-boil="hover"></span>导入一本</button>
        <button type="button" class="ddsh-pill${feedOn ? ' on' : ''}" id="read-feed-toggle">${feedOn ? '在读的会告诉他' : '不告诉他在读什么'}</button>
        ${custom ? `<button type="button" class="ddsh-pill" data-ddsh="cat-reset">小猫换回默认</button>` : ''}
      </div>
      <input type="file" id="ddsh-cat-file" accept="image/*" hidden>
    </div>`;
  }

  /* 换小猫：缩到 360px 存成 PNG（带透明），不然一张原图就把本地存储吃掉一大块 */
  function pickCat(){
    const inp = document.getElementById('ddsh-cat-file'); if(!inp) return;
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if(!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const img = new Image();
        img.onload = () => {
          const s = Math.min(1, 360 / Math.max(img.width, img.height));
          const cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          state.doodlePrefs = Object.assign({}, state.doodlePrefs || {}, {shelfCat: cv.toDataURL('image/png')});
          try{ persist('doodlePrefs'); }catch(e){}
          render();
        };
        img.src = rd.result;
      };
      rd.readAsDataURL(f);
    };
    inp.click();
  }

  document.addEventListener('click', e => {
    if(!ON() || !e.target.closest) return;
    const del = e.target.closest('[data-ddsh-del]');
    if(del){
      e.preventDefault(); e.stopPropagation();
      const id = del.getAttribute('data-ddsh-del'), b = books().find(x => String(x.id) === id);
      if(!b || !confirm('把《' + b.title + '》从书架上拿走？')) return;
      state.books = (state.books || []).filter(x => x !== b);
      if(state.readingNow && state.readingNow.bookId === b.id) state.readingNow = null;
      try{ persist('books'); persist('readingNow'); }catch(_){}
      render(); return;
    }
    const b = e.target.closest('[data-ddsh]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    const k = b.dataset.ddsh;
    if(k === 'all'){ state.ddshAll = !state.ddshAll; render(); }
    else if(k === 'cat') pickCat();
    else if(k === 'cat-reset'){ const p = Object.assign({}, state.doodlePrefs || {}); delete p.shelfCat; state.doodlePrefs = p; try{ persist('doodlePrefs'); }catch(_){} render(); }
  }, true);

  return {page, isOn: ON};
})();
