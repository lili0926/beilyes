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


  /* ══════════ 装饰：贴纸 / 胶带 / 日期章 / 画笔 ══════════
   * 都存在 a.deco.layers 里（按叠放顺序），坐标是拍立得自己的 1000 × 1250，原图一像素不动。
   *   {t:'st', k:形状, c:颜色, x, y, s, r}     自带贴纸（白边 + 阴影，像真的贴纸）
   *   {t:'img', src, x, y, s, r}               表情包 / 她导入的透明 PNG
   *   {t:'tape', k:花纹, c, x, y, s, r}         和纸胶带
   *   {t:'stamp', text, x, y, s, r}            老相机那种橙色日期
   *   {t:'pen', c, w, glow, p:[[x,y],…]}       画笔（glow = 荧光笔，带一圈光） */
  const SHAPES = {
    heart: ['M50 88 C16 64 4 38 22 24 C34 15 47 22 50 34 C53 22 66 15 78 24 C96 38 84 64 50 88Z'],
    star: ['M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36Z'],
    sparkle: ['M50 4 C54 38 62 46 96 50 C62 54 54 62 50 96 C46 62 38 54 4 50 C38 46 46 38 50 4Z'],
    moon: ['M64 8 A42 42 0 1 0 92 66 A32 32 0 1 1 64 8Z'],
    cloud: ['M22 74 C4 74 4 50 24 50 C20 28 46 22 54 38 C62 18 92 26 86 50 C102 52 100 74 82 74Z'],
    bow: ['M50 48 C36 26 8 28 12 48 C16 68 38 62 50 48 C62 34 88 28 88 48 C84 68 62 62 50 48Z', 'M45 52 L32 88 L44 80 L50 90 L56 80 L68 88 L55 52Z', 'M42 48 A8 8 0 1 0 58 48 A8 8 0 1 0 42 48Z'],
    flower: ['M50 8 a17 17 0 1 0 0.1 0Z M88 38 a17 17 0 1 0 0.1 0Z M74 84 a17 17 0 1 0 0.1 0Z M26 84 a17 17 0 1 0 0.1 0Z M12 38 a17 17 0 1 0 0.1 0Z', 'M38 50 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0Z'],
    clover: ['M50 48 C36 20 14 30 24 44 C8 48 14 72 36 62 C34 86 58 82 52 60 C74 72 86 50 68 44 C82 30 62 14 50 40Z', 'M50 56 Q58 76 50 94'],
    paw: ['M50 92 C26 92 22 72 34 62 C42 54 58 54 66 62 C78 72 74 92 50 92Z', 'M24 52 a10 13 -20 1 0 0.1 0Z M40 36 a10 13 -8 1 0 0.1 0Z M60 36 a10 13 8 1 0 0.1 0Z M76 52 a10 13 20 1 0 0.1 0Z'],
    butterfly: ['M48 50 C34 16 4 20 10 44 C14 60 34 58 48 52 C30 60 14 82 30 90 C42 94 48 74 48 58Z M52 50 C66 16 96 20 90 44 C86 60 66 58 52 52 C70 60 86 82 70 90 C58 94 52 74 52 58Z', 'M50 30 L50 76'],
    cherry: ['M30 78 a16 16 0 1 0 0.1 0Z M70 78 a16 16 0 1 0 0.1 0Z', 'M30 64 Q38 30 62 12 M70 64 Q64 34 62 12'],
    crown: ['M10 76 L16 30 L34 54 L50 18 L66 54 L84 30 L90 76Z', 'M14 84 L86 84'],
    catears: ['M6 74 Q10 40 26 14 Q38 34 46 64 Q26 62 6 74Z M94 74 Q90 40 74 14 Q62 34 54 64 Q74 62 94 74Z', 'M16 64 Q19 44 27 30 Q34 44 38 58 Q26 58 16 64Z M84 64 Q81 44 73 30 Q66 44 62 58 Q74 58 84 64Z'],
    dogears: ['M30 16 C10 14 2 44 6 70 C8 86 24 88 30 74 C36 60 44 40 40 26 C38 20 35 17 30 16Z M70 16 C90 14 98 44 94 70 C92 86 76 88 70 74 C64 60 56 40 60 26 C62 20 65 17 70 16Z', 'M24 32 C14 38 12 58 15 70 C18 76 24 72 26 64 C29 54 32 42 24 32Z M76 32 C86 38 88 58 85 70 C82 76 76 72 74 64 C71 54 68 42 76 32Z'],
  };
  /* 画笔线条款（像相机 App 里那种手画的白线）：只描边，pink 那几条填粉，dot 那几条用同色填 */
  const LINEART = {
    /* 两只小耳朵分在两边，尖是圆的，内耳一小片粉 */
    lineears: {w: 5, paths: ['M4 62 Q5 47 12 36 Q14 34 16 36 Q21 43 25 52', 'M96 62 Q95 47 88 36 Q86 34 84 36 Q79 43 75 52',
      'M10 55 Q12 47 14 43 Q17 47 19 52 Q14 52 10 55Z', 'M90 55 Q88 47 86 43 Q83 47 81 52 Q86 52 90 55Z'], pink: [2, 3]},
    /* 两边各三根短腮毛，下面一点点腮红 */
    whiskers: {w: 4.5, paths: ['M2 41 Q8 42 13 45', 'M1 51 L13 51', 'M2 61 Q8 59 13 57', 'M98 41 Q92 42 87 45', 'M99 51 L87 51', 'M98 61 Q92 59 87 57',
      'M18 64 a6 3.4 0 1 0 0.1 0Z', 'M70 64 a6 3.4 0 1 0 0.1 0Z'], pink: [], blush: [6, 7]},
    bang: {w: 5, paths: ['M43 30 Q44 42 45 52', 'M58 28 Q57 40 56 50', 'M45.2 63 a4 4 0 1 0 0.1 0Z', 'M56.2 61 a4 4 0 1 0 0.1 0Z'], pink: [], dot: [2, 3]},
    lstar: {w: 5, paths: ['M50 16 Q53 33 58 38 Q66 40 82 41 Q70 50 65 56 Q68 68 71 80 Q58 72 50 67 Q42 72 29 80 Q32 68 35 56 Q30 50 18 41 Q34 40 42 38 Q47 33 50 16Z'], pink: []},
    lcloud: {w: 5, paths: ['M26 66 Q13 66 14 56 Q15 46 26 47 Q27 33 41 32 Q51 31 55 41 Q61 33 71 36 Q81 40 79 51 Q89 52 88 60 Q87 66 77 66 Z', 'M36 56 a2.6 2.6 0 1 0 0.1 0Z M60 56 a2.6 2.6 0 1 0 0.1 0Z', 'M44 59 Q48 63 52 59'], pink: [], dot: [1]},
    lhouse: {w: 5, paths: ['M20 50 L50 24 L80 50', 'M29 43 L29 78 L71 78 L71 43', 'M44 78 L44 63 Q50 58 56 63 L56 78', 'M64 37 L64 26 L71 26 L71 43',
      'M50 51 C46 48 43.5 46 45.5 43.5 C47.5 41.5 49.5 43 50 44.5 C50.5 43 52.5 41.5 54.5 43.5 C56.5 46 54 48 50 51Z'], pink: [4]},
    lheart: {w: 5, paths: ['M50 78 C24 61 15 44 26 33 C35 25 46 30 50 39 C54 30 65 25 74 33 C85 44 76 61 50 78Z', 'M32 40 Q34 35 39 34'], pink: []},
    lmoon: {w: 5, paths: ['M60 18 A32 32 0 1 0 84 62 A25 25 0 1 1 60 18Z', 'M74 26 l0 8 M70 30 l8 0'], pink: []},
    lspark: {w: 4.5, paths: ['M38 18 Q40 37 57 40 Q40 43 38 62 Q36 43 19 40 Q36 37 38 18Z', 'M70 54 Q71 65 81 66 Q71 67 70 78 Q69 67 59 66 Q69 65 70 54Z'], pink: []},
    lflower: {w: 4.5, paths: ['M50 44 Q40 24 50 20 Q60 24 50 44 Z M56 47 Q74 36 79 45 Q78 55 56 53 Z M53 56 Q66 72 59 79 Q49 80 47 57 Z M44 54 Q34 75 25 69 Q21 59 44 50 Z M44 47 Q23 42 25 32 Q32 25 47 44 Z', 'M50 50 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0Z'], pink: [1]},
    lnote: {w: 5, paths: ['M44 70 L44 30 L72 23 L72 63', 'M44 30 L72 23', 'M37 71 a8 6.5 -18 1 0 0.1 0Z', 'M65 64 a8 6.5 -18 1 0 0.1 0Z'], pink: [], dot: [2, 3]},
  };
  /* 耳朵的内耳：最后一条用另一种颜色填 */
  const INNER = {catears: '#FFD1E1', dogears: 'rgba(255,255,255,.4)'};
  /* 最后一条是「线」（茎 / 触角 / 底边）的形状：画成描边，不填色 */
  const LINE_LAST = {clover: 1, butterfly: 1, cherry: 1, crown: 1};
  const SHAPE_NAMES = {lstar: '线条星星', lcloud: '线条云朵', lhouse: '小房子', lheart: '线条爱心', lmoon: '线条月亮', lspark: '线条闪光', lflower: '线条小花', lnote: '音符', lineears: '线条猫耳', whiskers: '猫猫腮毛', bang: '惊叹号', catears: '猫耳朵', dogears: '狗耳朵', heart: '爱心', star: '星星', sparkle: '闪光', moon: '月亮', cloud: '云朵', bow: '蝴蝶结', flower: '小花', clover: '四叶草', paw: '猫爪', butterfly: '蝴蝶', cherry: '樱桃', crown: '皇冠'};
  const COLORS = ['#F4A7C3', '#E77FA6', '#B9A3EC', '#9CC2EC', '#9FD3C9', '#F6D277', '#F28C7D', '#FFFFFF', '#B98A66', '#4A4458'];
  const PENS = ['#3E3A52', '#E0566F', '#F4A7C3', '#B9A3EC', '#7FA9E0', '#7FC7A2', '#F6C453', '#FFFFFF'];
  const TAPES = [['stripe', '#F4A7C3'], ['dot', '#B9A3EC'], ['check', '#9CC2EC'], ['stripe', '#9FD3C9'], ['dot', '#F6D277'], ['plain', '#F7C6D8']];
  let svgN = 0;
  const num = v => Math.round(v * 10) / 10;
  function penPath(p){
    if(!p || !p.length) return '';
    if(p.length === 1) return `M${num(p[0][0])} ${num(p[0][1])} l0.1 0`;
    let d = `M${num(p[0][0])} ${num(p[0][1])}`;
    for(let i = 1; i < p.length - 1; i++){ const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; d += ` Q${num(p[i][0])} ${num(p[i][1])} ${num(mx)} ${num(my)}`; }
    const l = p[p.length - 1]; return d + ` L${num(l[0])} ${num(l[1])}`;
  }
  function layerSvg(L, i, u, bare){
    const sh = bare ? '' : ` filter="url(#sh${u})"`;
    if(L.t === 'pen'){
      const d = penPath(L.p);
      return (L.glow ? `<path d="${d}" fill="none" stroke="${h(L.c)}" stroke-width="${L.w * 2.6}" stroke-linecap="round" stroke-linejoin="round" opacity=".5" filter="url(#bl${u})"/>` : '')
        + `<path d="${d}" fill="none" stroke="${L.glow ? '#fff' : h(L.c)}" stroke-width="${L.glow ? L.w * .7 : L.w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    const tf = `translate(${num(L.x)} ${num(L.y)}) rotate(${num(L.r || 0)}) scale(${num((L.s || 1) * 100) / 100})`;
    if(L.t === 'st' && LINEART[L.k]){
      const A = LINEART[L.k];
      return `<g transform="${tf}"><g transform="translate(-50 -50)"${bare ? '' : ` filter="url(#rf${u})"`}>`
        + A.paths.map((d, k) => A.pink.includes(k) ? `<path d="${d}" fill="#F7A3C2" stroke="#F7A3C2" stroke-width="1.5" stroke-linejoin="round"/>`
          : (A.blush || []).includes(k) ? `<path d="${d}" fill="#F9A8C6" opacity=".55"/>`
          : (A.dot || []).includes(k) ? `<path d="${d}" fill="${h(L.c)}"/>`
          : `<path d="${d}" fill="none" stroke="${h(L.c)}" stroke-width="${A.w || 5}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
        + `</g></g>`;
    }
    if(L.t === 'st'){
      const ps = SHAPES[L.k] || SHAPES.heart, line = LINE_LAST[L.k] && ps.length > 1;
      return `<g transform="${tf}"><g transform="translate(-50 -50)"${sh}>`
        + ps.map(d => `<path d="${d}" fill="none" stroke="#fff" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"/>`).join('')
        + ps.map((d, k) => (line && k === ps.length - 1)
            ? `<path d="${d}" fill="none" stroke="${h(L.c)}" stroke-width="5" stroke-linecap="round"/>`
            : `<path d="${d}" fill="${INNER[L.k] && k === ps.length - 1 ? INNER[L.k] : h(L.c)}" stroke="rgba(0,0,0,.08)" stroke-width="1.5"/>`).join('')
        + (bare ? '' : `<path d="${ps[0]}" fill="url(#hl${u})" opacity=".55"/>`) + `</g></g>`;
    }
    if(L.t === 'img') return `<g transform="${tf}"><image href="${h(L.src)}" x="-50" y="-50" width="100" height="100" preserveAspectRatio="xMidYMid meet"${sh}/></g>`;
    if(L.t === 'tape'){
      const pid = `tp${u}_${i}`, c = h(L.c);
      const pat = L.k === 'dot' ? `<pattern id="${pid}" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${c}"/><circle cx="8" cy="8" r="3" fill="#fff" opacity=".7"/></pattern>`
        : L.k === 'check' ? `<pattern id="${pid}" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="${c}"/><rect width="10" height="10" fill="#fff" opacity=".35"/><rect x="10" y="10" width="10" height="10" fill="#fff" opacity=".35"/></pattern>`
        : L.k === 'stripe' ? `<pattern id="${pid}" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="18" height="18" fill="${c}"/><rect width="8" height="18" fill="#fff" opacity=".4"/></pattern>`
        : `<pattern id="${pid}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${c}"/></pattern>`;
      return `<defs>${pat}</defs><g transform="${tf}"><path d="M-130 -28 L-124 -18 L-130 -8 L-124 2 L-130 12 L-124 22 L-130 28 L130 28 L124 18 L130 8 L124 -2 L130 -12 L124 -22 L130 -28Z" fill="url(#${pid})" opacity=".86"${sh}/></g>`;
    }
    if(L.t === 'stamp') return `<g transform="${tf}"><text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="ui-monospace,Menlo,Consolas,monospace" font-weight="700" font-size="58" fill="#FF9A3D"${bare ? '' : ` filter="url(#gw${u})"`} letter-spacing="4">${h(L.text)}</text></g>`;
    return '';
  }
  function decoInner(layers, u){
    return `<defs>
        <filter id="sh${u}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#3a2a50" flood-opacity=".28"/></filter>
        <filter id="bl${u}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
        <filter id="rf${u}" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="3" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="w"/><feDropShadow in="w" dx="0" dy="1" stdDeviation="1.4" flood-color="#2a2236" flood-opacity=".35"/></filter>
        <filter id="gw${u}" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id="hl${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
      </defs>` + (layers || []).map((L, i) => layerSvg(L, i, u)).join('');
  }
  function decoSvg(deco, cls){
    const layers = deco && deco.layers;
    if(!layers || !layers.length) return '';
    const u = 'd' + (++svgN);
    return `<svg class="dda-deco${cls ? ' ' + cls : ''}" viewBox="0 0 1000 1250" preserveAspectRatio="none" aria-hidden="true">${decoInner(layers, u)}</svg>`;
  }
  /** 他收进来的照片：顺手贴一两张（按 id 定，每次一样） */
  function autoDeco(a){
    const id = String(a.id), ks = ['heart', 'sparkle', 'star', 'bow', 'moon', 'flower', 'cloud', 'butterfly'];
    const k1 = ks[hashS(id) % ks.length], k2 = ks[(hashS(id) >> 4) % ks.length];
    const c1 = COLORS[hashS(id + 'c') % 7], c2 = COLORS[hashS(id + 'd') % 7];
    return {layers: [
      {t: 'st', k: k1, c: c1, x: 820 + rnd(id, 'x1') * 60, y: 140 + rnd(id, 'y1') * 60, s: 1.5 + rnd(id, 's1') * .5, r: rnd(id, 'r1') * 50 - 25},
      {t: 'st', k: k2 === k1 ? 'sparkle' : k2, c: c2, x: 150 + rnd(id, 'x2') * 60, y: 860 + rnd(id, 'y2') * 40, s: 1.1 + rnd(id, 's2') * .4, r: rnd(id, 'r2') * 50 - 25},
    ], by: 'ai'};
  }

  /* ── 数据 ── */
  function timeOf(a){
    if(a.time) return +a.time;
    const m = String(a.id || '').match(/(\d{12,13})/);
    if(m) return +m[1];
    const t = Date.parse(a.date || ''); return isNaN(t) ? 0 : t;
  }
  function dayOf(a){ const t = timeOf(a); if(t) return new Date(t); const d = Date.parse(a.date || ''); return isNaN(d) ? new Date() : new Date(d); }
  const byOf = a => a.by || 'ai';
  function photos(){
    const list = (state.albumData || []).filter(a => a && a.image).slice().sort((x, y) => timeOf(x) - timeOf(y));
    /* 他新收进来、她还没看过的：替他贴上一两张贴纸（只贴一次） */
    const seen = LSG('ddAlbumSeen', null);
    if(seen){ let dirty = false; list.forEach(a => { if(byOf(a) === 'ai' && !a.deco && !seen.includes(String(a.id))){ a.deco = autoDeco(a); dirty = true; } }); if(dirty) save(); }
    return list;
  }
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
      <span class="dda-cap">${raw && !dev ? '轻轻点一下，让它显影…' : ''}</span>
      <span class="dda-date">${d.getMonth() + 1}.${pad(d.getDate())}</span>
      ${raw && !dev ? '' : decoSvg(a.deco)}
      ${((a.notes || []).length + (a.caption ? 1 : 0)) && !(raw && !dev) ? `<span class="dda-back-dot" title="背面有留言">${(a.notes || []).length + (a.caption ? 1 : 0)}</span>` : ''}
    </button>`;
  }
  function cover(list){
    const imgs = list.slice(-4).reverse();
    const cvId = LSG('ddAlbumCover', ''), cv = cvId ? list.find(a => String(a.id) === cvId) : null;
    return `<div class="dda-stage">
      <button type="button" class="dda-cover${V.opening ? ' opening' : ''}" data-dda="open" aria-label="翻开相册">
        <span class="dda-under">${imgs.map((a, i) => `<img src="${h(a.image)}" alt="" style="--i:${i}">`).join('') || '<i class="dda-under-empty"></i>'}</span>
        <span class="dda-frost"></span>
        ${cv ? `<span class="dda-window"><span class="dda-pol mini" style="--r:-4deg;--tape:#B9A3EC;--tr:-6deg"><span class="dda-tape"></span><span class="dda-photo"><img src="${h(cv.image)}" alt=""></span><span class="dda-cap"></span>${decoSvg(cv.deco)}</span></span>` : ''}
        <span class="dda-rings"><i></i><i></i><i></i></span>
        <span class="dda-label${cv ? ' low' : ''}"><small>OUR ALBUM · 우리의 앨범</small><b>我们的相册</b><em>${BOOKS[0].name} · ${list.length} 张</em></span>
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
    /* 背面的留言：贴照片时那句（以前写在白边上的）排第一，后面是你来我往的 */
    const msgs = (a.caption ? [{by: who, text: a.caption}] : []).concat(notes);
    return `<div class="dda-mask" data-dda-mask>
      <div class="dda-big"><div class="dda-card${V.back ? ' back' : ''}">
        <div class="dda-face front">${polaroid(a, seen, true)}</div>
        <div class="dda-face rear">
          <div class="dda-msgs">
            ${msgs.length ? msgs.map(n => `<p class="dda-msg ${n.by === 'me' ? 'me' : 'ai'}">${h(n.text)}<small>—— ${n.by === 'me' ? '我' : h(aiName())}</small></p>`).join('')
              : `<p class="dda-msg none">背面还空着<small>写一句留给以后看</small></p>`}
          </div>
          <div class="dda-note-in"><input id="dda-note" maxlength="80" placeholder="在背面留一句…" value="${h(V.note)}"><button type="button" data-dda="note">留下</button></div>
          <span class="dda-back-mark">${dayOf(a).toLocaleDateString('zh-CN')} · ${who === 'me' ? '我贴的' : h(aiName()) + ' 收的'}</span>
        </div>
      </div></div>
      <div class="dda-bar">
        <button type="button" data-dda="flip">${V.back ? '翻回正面' : `翻到背面${msgs.length ? ' · ' + msgs.length : ''}`}</button>
        <button type="button" data-dda="deco"><span data-doodle="sparkle"></span>装饰</button>
        <button type="button" data-dda="cover">${LSG('ddAlbumCover', '') === String(a.id) ? '已是封面' : '设为封面'}</button>
        <button type="button" data-dda="export">存到手机</button>
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
          <span class="dda-cap"></span>
        </div>
        <input id="dda-cap-in" class="dda-compose-in" maxlength="80" placeholder="在背面留一句（可以不写）">
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
      ${V.open ? `<div class="ddd-tools"><button type="button" data-dda="shut"><span data-doodle="bookmark"></span>合上</button><span class="dda-count">${list.length} 张</span>
        <button type="button" class="dda-recall${LSG('ddAlbumRecall', false) ? ' on' : ''}" data-dda="recall" title="开着的话，${h(aiName())} 偶尔会在聊天里提起相册里的旧照片">${LSG('ddAlbumRecall', false) ? '会提起旧照片' : '不提旧照片'}</button></div>` : ''}
      ${body}
      <label class="dda-fab" aria-label="贴一张照片"><input type="file" accept="image/*" id="dda-file" hidden><span data-doodle="plus"></span>贴一张</label>
      ${V.compose ? compose() : ''}
      ${det && !V.ed ? detail(det) : ''}
      ${V.ed && find(V.edit) ? editor(find(V.edit)) : ''}
    </div>`;
    if(V.ed) setTimeout(edDraw, 0);
    return html;
  }

  /* ── 装饰编辑器 ── */
  function edPanel(){
    const E = V.ed, tab = E.tab;
    if(tab === 'st'){
      return `<div class="dda-ed-row">${COLORS.map(c => `<button type="button" class="dda-sw${E.color === c ? ' on' : ''}" style="--c:${c}" data-dde-color="${c}" aria-label="颜色"></button>`).join('')}</div>
        <div class="dda-ed-grid">${Object.keys(LINEART).map(k => `<button type="button" class="dda-ed-st line" data-dde-add="st:${k}" aria-label="${SHAPE_NAMES[k]}"><svg viewBox="-12 -12 124 124">${layerSvg({t: 'st', k, c: '#FFFFFF', x: 50, y: 50, s: 1, r: 0}, 0, 'p', true)}</svg></button>`).join('')}${['catears', 'dogears'].concat(Object.keys(SHAPES).filter(k => k !== 'catears' && k !== 'dogears')).map(k => `<button type="button" class="dda-ed-st" data-dde-add="st:${k}" aria-label="${SHAPE_NAMES[k]}"><svg viewBox="-12 -12 124 124">${layerSvg({t: 'st', k, c: E.color, x: 50, y: 50, s: 1, r: 0}, 0, 'p', true)}</svg></button>`).join('')}</div>`;
    }
    if(tab === 'tape'){
      return `<div class="dda-ed-grid tapes">${TAPES.map(([k, c], i) => `<button type="button" class="dda-ed-tape" data-dde-add="tape:${i}"><svg viewBox="-140 -40 280 80">${layerSvg({t: 'tape', k, c, x: 0, y: 0, s: 1, r: 0}, i, 'q', true)}</svg></button>`).join('')}</div>
        <p class="dda-ed-tip">胶带贴在照片边上最像真的；拖角上那颗紫色的可以转方向</p>`;
    }
    if(tab === 'stamp'){
      const d = new Date(), t = `'${String(d.getFullYear()).slice(2)} ${pad(d.getMonth() + 1)} ${pad(d.getDate())}`;
      const a = find(V.edit), pd = a ? dayOf(a) : d, t2 = `'${String(pd.getFullYear()).slice(2)} ${pad(pd.getMonth() + 1)} ${pad(pd.getDate())}`;
      return `<div class="dda-ed-grid stamps"><button type="button" class="dda-ed-stamp" data-dde-add="stamp:${h(t2)}">${h(t2)}<small>拍照那天</small></button>
        ${t2 !== t ? `<button type="button" class="dda-ed-stamp" data-dde-add="stamp:${h(t)}">${h(t)}<small>今天</small></button>` : ''}</div>`;
    }
    if(tab === 'pen'){
      return `<div class="dda-ed-row">${PENS.map(c => `<button type="button" class="dda-sw${E.pen === c && !E.erase ? ' on' : ''}" style="--c:${c}" data-dde-pen="${c}" aria-label="笔的颜色"></button>`).join('')}</div>
        <div class="dda-ed-row">
          ${[[6, '细'], [12, '中'], [22, '粗']].map(([w, t]) => `<button type="button" class="dda-chip${E.w === w && !E.erase ? ' on' : ''}" data-dde-w="${w}">${t}</button>`).join('')}
          <button type="button" class="dda-chip${E.glow ? ' on' : ''}" data-dde="glow">荧光</button>
          <button type="button" class="dda-chip${E.erase ? ' on' : ''}" data-dde="erase">橡皮</button>
        </div>`;
    }
    if(tab === 'emo'){
      const list = (state.stickers || []).filter(x => x && x.url);
      return list.length ? `<div class="dda-ed-grid">${list.slice(0, 60).map((x, i) => `<button type="button" class="dda-ed-st" data-dde-add="emo:${i}"><img src="${h(x.url)}" alt="${h(x.name || '')}"></button>`).join('')}</div>`
        : `<p class="dda-ed-tip">表情包库还是空的，在聊天的「+ → 表情」里先存几张</p>`;
    }
    return `<label class="dda-chip big"><input type="file" accept="image/png,image/webp,image/*" id="dda-imp" hidden>从手机选一张透明底的 PNG</label><p class="dda-ed-tip">带透明底的图贴上去就像真贴纸；普通照片会是一张小方图</p>`;
  }
  function editor(a){
    const E = V.ed, d = dayOf(a);
    const tabs = [['st', '贴纸'], ['tape', '胶带'], ['pen', '画笔'], ['stamp', '日期章'], ['emo', '表情包'], ['imp', '导入']];
    return `<div class="dda-edit">
      <header class="dda-ed-head"><button type="button" data-dde="cancel">取消</button><b>装饰拍立得</b>
        <span><button type="button" class="undo" data-dde="undo" ${E.hist.length ? '' : 'disabled'} aria-label="撤销">↶</button><button type="button" class="go" data-dde="done">完成</button></span></header>
      <div class="dda-ed-stage">
        <div class="dda-pol big ed" style="--r:0deg">
          <span class="dda-photo"><img src="${h(a.image)}" alt="" draggable="false"></span>
          <span class="dda-cap"></span>
          <span class="dda-date">${d.getMonth() + 1}.${pad(d.getDate())}</span>
          <svg class="dda-deco ed" id="dda-ed-svg" viewBox="0 0 1000 1250" preserveAspectRatio="none"></svg>
        </div>
      </div>
      <div class="dda-ed-size" id="dda-ed-size">
        <button type="button" data-dde="smaller" aria-label="缩小">－</button>
        <span>大小</span><input type="range" id="dda-ed-range" min="0.3" max="6" step="0.05" value="1" aria-label="贴纸大小">
        <button type="button" data-dde="bigger" aria-label="放大">＋</button>
      </div>
      <nav class="dda-ed-tabs">${tabs.map(([k, t]) => `<button type="button" class="${E.tab === k ? 'on' : ''}" data-dde-tab="${k}">${t}</button>`).join('')}</nav>
      <div class="dda-ed-panel">${edPanel()}</div>
    </div>`;
  }
  const boxOf = L => [(L.t === 'tape' ? 140 : L.t === 'stamp' ? 150 : 62) * (L.s || 1), (L.t === 'tape' ? 40 : L.t === 'stamp' ? 50 : 62) * (L.s || 1)];
  /* 画布只重画 svg 本身，不走整页 render（拖的时候一秒几十次） */
  function edDraw(){
    const svg = document.getElementById('dda-ed-svg'); if(!svg || !V.ed) return;
    const E = V.ed;
    let sel = '';
    const L = E.sel != null ? E.layers[E.sel] : null;
    if(L && L.t !== 'pen'){
      const [R, Ry] = boxOf(L);
      sel = `<g transform="translate(${num(L.x)} ${num(L.y)}) rotate(${num(L.r || 0)})">
        <rect x="${-R}" y="${-Ry}" width="${2 * R}" height="${2 * Ry}" rx="14" fill="none" stroke="#8B6CC0" stroke-width="4" stroke-dasharray="14 10"/>
        <g data-h="del" transform="translate(${-R} ${-Ry})"><circle r="34" fill="#E77F98" stroke="#fff" stroke-width="5"/><path d="M-11 -11 L11 11 M11 -11 L-11 11" stroke="#fff" stroke-width="6" stroke-linecap="round"/></g>
        <g data-h="rot" transform="translate(${R} ${Ry})"><circle r="36" fill="#8B6CC0" stroke="#fff" stroke-width="5"/><path d="M-13 4 A14 14 0 1 1 6 13 M6 13 l-1 -13 M6 13 l-12 2" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></g>
      </g>`;
    }
    svg.innerHTML = decoInner(E.layers, 'ed') + sel;
    /* 大小条：选中一张贴纸才出来 */
    const bar = document.getElementById('dda-ed-size'), rg = document.getElementById('dda-ed-range');
    if(bar){ const on = !!(L && L.t !== 'pen'); bar.classList.toggle('on', on); if(on && rg && document.activeElement !== rg) rg.value = L.s || 1; }
    const und = document.querySelector('[data-dde="undo"]'); if(und) und.disabled = !E.hist.length;
  }
  function snap(){ const E = V.ed; E.hist.push(JSON.stringify(E.layers)); if(E.hist.length > 40) E.hist.shift(); }
  function svgPt(svg, cx, cy){ const r = svg.getBoundingClientRect(); return [(cx - r.left) / r.width * 1000, (cy - r.top) / r.height * 1250]; }
  function hitLayer(x, y){
    const E = V.ed;
    for(let i = E.layers.length - 1; i >= 0; i--){
      const L = E.layers[i]; if(L.t === 'pen') continue;
      const a = -(L.r || 0) * Math.PI / 180, dx = x - L.x, dy = y - L.y;
      const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      const [R, Ry] = boxOf(L);
      if(Math.abs(lx) <= R + 12 && Math.abs(ly) <= Ry + 12) return i;
    }
    return -1;
  }
  function edAdd(spec){
    const E = V.ed; snap();
    const at = spec.indexOf(':'), kind = spec.slice(0, at), v = spec.slice(at + 1);
    const jit = () => (Math.random() - .5) * 120;
    let L = null;
    if(kind === 'st' && LINEART[v]){
      const face = v === 'lineears' || v === 'whiskers' || v === 'bang';
      L = face ? {t: 'st', k: v, c: '#FFFFFF', x: v === 'bang' ? 290 : 500, y: v === 'lineears' ? 270 : v === 'bang' ? 300 : 500, s: v === 'bang' ? 1.1 : 2.6, r: v === 'bang' ? -10 : 0}
        : {t: 'st', k: v, c: '#FFFFFF', x: 500 + jit(), y: 450 + jit(), s: 1.5, r: (Math.random() - .5) * 20};
    }
    else if(kind === 'st') L = {t: 'st', k: v, c: E.color, x: 500 + jit(), y: 470 + jit(), s: 1.8, r: (Math.random() - .5) * 30};
    else if(kind === 'tape'){ const [k, c] = TAPES[+v] || TAPES[0]; L = {t: 'tape', k, c, x: 500 + jit() * .6, y: 70, s: 1.4, r: (Math.random() - .5) * 16}; }
    else if(kind === 'stamp') L = {t: 'stamp', text: v, x: 740, y: 900, s: 1, r: 0};
    else if(kind === 'emo'){ const x = (state.stickers || []).filter(z => z && z.url)[+v]; if(x) L = {t: 'img', src: x.url, x: 500 + jit(), y: 470 + jit(), s: 2.2, r: (Math.random() - .5) * 20}; }
    else if(kind === 'img') L = {t: 'img', src: v, x: 500, y: 470, s: 2.6, r: 0};
    if(!L){ E.hist.pop(); return; }
    E.layers.push(L); E.sel = E.layers.length - 1;
    edDraw();
  }
  /* 指针：拖动 / 角上那颗转 + 缩 / 两指捏合 / 画笔 / 橡皮 */
  const PT = new Map(); let G = null;
  function edDown(e){
    const svg = document.getElementById('dda-ed-svg'); if(!svg || !V.ed || !svg.contains(e.target)) return;
    e.preventDefault();
    try{ svg.setPointerCapture(e.pointerId); }catch(_){}
    const E = V.ed, [x, y] = svgPt(svg, e.clientX, e.clientY);
    PT.set(e.pointerId, [x, y]);
    if(PT.size === 2 && E.sel != null && E.layers[E.sel] && E.layers[E.sel].t !== 'pen'){
      const [a, b] = [...PT.values()], L = E.layers[E.sel];
      if(G && G.kind === 'pen'){ E.layers.pop(); }
      G = {kind: 'pinch', d0: Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, a0: Math.atan2(b[1] - a[1], b[0] - a[0]), s0: L.s || 1, r0: L.r || 0};
      return;
    }
    if(PT.size > 1) return;
    const hEl = e.target.closest && e.target.closest('[data-h]');
    if(hEl && E.sel != null){
      const L = E.layers[E.sel];
      snap();
      if(hEl.getAttribute('data-h') === 'del'){ E.layers.splice(E.sel, 1); E.sel = null; G = null; edDraw(); return; }
      G = {kind: 'rot', d0: Math.hypot(x - L.x, y - L.y) || 1, a0: Math.atan2(y - L.y, x - L.x), s0: L.s || 1, r0: L.r || 0};
      return;
    }
    if(E.tab === 'pen'){
      snap();
      if(E.erase){ G = {kind: 'erase'}; edErase(x, y); return; }
      E.layers.push({t: 'pen', c: E.pen, w: E.w, glow: E.glow, p: [[num(x), num(y)]]}); E.sel = null; G = {kind: 'pen'}; edDraw(); return;
    }
    const i = hitLayer(x, y);
    if(i >= 0){ snap(); E.sel = i; const L = E.layers[i]; G = {kind: 'drag', dx: x - L.x, dy: y - L.y, moved: false}; edDraw(); return; }
    E.sel = null; G = null; edDraw();
  }
  function edErase(x, y){
    const E = V.ed;
    for(let i = E.layers.length - 1; i >= 0; i--){
      const L = E.layers[i]; if(L.t !== 'pen') continue;
      if(L.p.some(q => Math.hypot(q[0] - x, q[1] - y) < L.w + 26)){ E.layers.splice(i, 1); edDraw(); return; }
    }
  }
  function edMove(e){
    if(!V.ed || !PT.has(e.pointerId)) return;
    const svg = document.getElementById('dda-ed-svg'); if(!svg) return;
    const E = V.ed, [x, y] = svgPt(svg, e.clientX, e.clientY);
    PT.set(e.pointerId, [x, y]);
    if(!G) return;
    e.preventDefault();
    const L = E.sel != null ? E.layers[E.sel] : null;
    if(G.kind === 'pinch' && L && PT.size >= 2){
      const [a, b] = [...PT.values()];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]), an = Math.atan2(b[1] - a[1], b[0] - a[0]);
      L.s = Math.max(.4, Math.min(6, G.s0 * d / G.d0)); L.r = G.r0 + (an - G.a0) * 180 / Math.PI;
    } else if(G.kind === 'rot' && L){
      const d = Math.hypot(x - L.x, y - L.y), an = Math.atan2(y - L.y, x - L.x);
      L.s = Math.max(.4, Math.min(6, G.s0 * d / G.d0)); L.r = G.r0 + (an - G.a0) * 180 / Math.PI;
    } else if(G.kind === 'drag' && L){
      L.x = Math.max(0, Math.min(1000, x - G.dx)); L.y = Math.max(0, Math.min(1250, y - G.dy)); G.moved = true;
    } else if(G.kind === 'pen'){
      const pen = E.layers[E.layers.length - 1], last = pen.p[pen.p.length - 1];
      if(Math.hypot(x - last[0], y - last[1]) > 4) pen.p.push([num(x), num(y)]);
    } else if(G.kind === 'erase'){ edErase(x, y); return; }
    edDraw();
  }
  function edUp(e){
    PT.delete(e.pointerId);
    if(PT.size === 0){
      if(G && G.kind === 'drag' && !G.moved && V.ed && V.ed.hist.length) V.ed.hist.pop();   // 只是点了一下选中，不占撤销
      G = null;
    } else if(G && G.kind === 'pinch') G = null;
  }
  document.addEventListener('pointerdown', e => { if(V.ed) edDown(e); }, true);
  document.addEventListener('pointermove', e => { if(V.ed) edMove(e); }, {capture: true, passive: false});
  document.addEventListener('pointerup', e => { if(V.ed) edUp(e); }, true);
  document.addEventListener('pointercancel', e => { if(V.ed) edUp(e); }, true);

  /* ── 存到手机：整张拍立得画成 PNG ── */
  function loadImg(src){ return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
  async function exportPng(a){
    const W = 1000, H = 1250, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#FFFEFA'; g.fillRect(0, 0, W, H);
    const im = await loadImg(a.image);
    const S = 880, k = Math.max(S / im.width, S / im.height), sw = S / k, sh = S / k;
    g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, 60, 60, S, S);
    const d = dayOf(a);
    g.font = '700 30px ui-monospace,Menlo,monospace'; g.fillStyle = '#FF9A3D'; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
    g.shadowColor = 'rgba(255,140,40,.7)'; g.shadowBlur = 6;
    g.fillText(`${d.getMonth() + 1}.${pad(d.getDate())}`, 915, 105); g.shadowBlur = 0;
    if(a.deco && a.deco.layers && a.deco.layers.length){
      const xml = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 1000 1250">${decoInner(a.deco.layers, 'x')}</svg>`;
      try{ const dim = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)); g.drawImage(dim, 0, 0, W, H); }catch(e){ console.warn('[album export deco]', e); }
    }
    const url = c.toDataURL('image/png');
    const nm = `polaroid-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Date.now() % 100000}.png`;
    const Cap = window.Capacitor, Fs = Cap && Cap.Plugins && Cap.Plugins.Filesystem;
    if(Fs && Cap.isNativePlatform && Cap.isNativePlatform()){
      try{
        await Fs.writeFile({path: 'Beilyes/' + nm, data: url.split(',')[1], directory: 'DOCUMENTS', recursive: true});
        if(typeof showToast === 'function') showToast('存好了：文档 / Beilyes / ' + nm);
        return url;
      }catch(e){ console.warn('[album export]', e); }
    }
    const link = document.createElement('a'); link.href = url; link.download = nm; document.body.appendChild(link); link.click(); link.remove();
    if(typeof showToast === 'function') showToast('拍立得已经存成图片');
    return url;
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
  /** 开着「提起旧照片」时：偶尔（每轮 15%，一天最多两次）把一张一周前的旧照片递给他 */
  function recallBlock(){
    if(!LSG('ddAlbumRecall', false)) return '';
    const today = new Date().toDateString(), st = LSG('ddAlbumRecallSt', {day: '', n: 0});
    if(st.day !== today){ st.day = today; st.n = 0; }
    if(st.n >= 2 || Math.random() > .15) return '';
    const old = (state.albumData || []).filter(a => a && a.image && timeOf(a) && Date.now() - timeOf(a) > 7 * 864e5);
    if(!old.length) return '';
    const a = old[Math.floor(Math.random() * old.length)];
    st.n++; LSS('ddAlbumRecallSt', st);
    const words = [a.caption].concat((a.notes || []).map(n => (n.by === 'me' ? '她：' : '你：') + n.text)).filter(Boolean).slice(0, 4).join(' / ');
    return `【你们相册里的一张旧照片 · ${dayOf(a).toLocaleDateString('zh-CN')}】${words ? '背面写着：' + words : '背面没写字'}。只是让你想起它——聊到沾边的话题可以自然提一句「记得那张…」，不沾边就别提。`;
  }
  function tellBlock(){
    const t = LSG('ddAlbumTell', null);
    if(!t) return recallBlock();
    const a = (state.albumData || []).find(x => String(x.id) === String(t.id));
    if(!a){ LSS('ddAlbumTell', null); return ''; }
    t.sent = true; LSS('ddAlbumTell', t);
    const what = t.kind === 'add' ? `她刚往你们的相册里贴了一张照片${a.caption ? `，背面留了一句「${a.caption}」` : ''}。`
      : `她在相册里一张照片（${dayOf(a).toLocaleDateString('zh-CN')} 那张${a.caption ? `，背面原本写着「${a.caption}」` : ''}）的背面留了一句：「${t.note || ''}」。`;
    return `【相册】${what}想回她就写一行 ⟪相册背面:一句话⟫，会写在那张照片背面（≤40 字）；不想回就当没看见，别硬写。`;
  }
  function handleBack(text){
    let s = String(text || '');
    const t = LSG('ddAlbumTell', null);
    const RE = /[⟪《【\[]\s*相册背面\s*[:：]\s*([^⟫》】\]]{1,200})[⟫》】\]]/g;
    let got = null;
    s = s.replace(RE, (_, w) => { if(!got) got = w.trim(); return ''; }).replace(/\n{3,}/g, '\n\n').trim();
    if(got && t){
      const a = (state.albumData || []).find(x => String(x.id) === String(t.id));
      if(a){ a.notes = a.notes || []; a.notes.push({by: 'ai', text: got.slice(0, 80), time: Date.now()}); save(); if(typeof showToast === 'function') showToast(aiName() + ' 在照片背面留了一句'); }
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
    const ed = t.closest('[data-dde],[data-dde-tab],[data-dde-add],[data-dde-color],[data-dde-pen],[data-dde-w]');
    if(ed && V.ed){
      e.preventDefault(); e.stopPropagation();
      const E = V.ed;
      if(ed.hasAttribute('data-dde-tab')){ E.tab = ed.getAttribute('data-dde-tab'); E.sel = null; render(); return; }
      if(ed.hasAttribute('data-dde-add')){ edAdd(ed.getAttribute('data-dde-add')); return; }
      if(ed.hasAttribute('data-dde-color')){ E.color = ed.getAttribute('data-dde-color'); const L = E.sel != null ? E.layers[E.sel] : null; if(L && L.t === 'st'){ snap(); L.c = E.color; } render(); return; }
      if(ed.hasAttribute('data-dde-pen')){ E.pen = ed.getAttribute('data-dde-pen'); E.erase = false; render(); return; }
      if(ed.hasAttribute('data-dde-w')){ E.w = +ed.getAttribute('data-dde-w'); E.erase = false; render(); return; }
      const act = ed.getAttribute('data-dde');
      if(act === 'glow'){ E.glow = !E.glow; E.erase = false; render(); }
      else if(act === 'erase'){ E.erase = !E.erase; render(); }
      else if(act === 'smaller' || act === 'bigger'){
        const L = E.sel != null ? E.layers[E.sel] : null;
        if(L && L.t !== 'pen'){ snap(); L.s = Math.max(.3, Math.min(6, (L.s || 1) * (act === 'bigger' ? 1.15 : 1 / 1.15))); edDraw(); }
      }
      else if(act === 'undo'){ if(E.hist.length){ E.layers = JSON.parse(E.hist.pop()); E.sel = null; edDraw(); } }
      else if(act === 'cancel'){ V.ed = null; render(); }
      else if(act === 'done'){
        const a = find(V.edit);
        if(a){ a.deco = {layers: E.layers, by: 'me', at: Date.now()}; save(); }
        V.ed = null; render();
        if(typeof showToast === 'function') showToast('贴好了');
      }
      return;
    }
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
    else if(act === 'deco' && a){
      V.edit = String(a.id);
      V.ed = {layers: JSON.parse(JSON.stringify((a.deco && a.deco.layers) || [])), sel: null, tab: 'st', color: COLORS[0], pen: PENS[1], w: 12, glow: false, erase: false, hist: []};
      render();
    }
    else if(act === 'export' && a){ exportPng(a).catch(err => { if(typeof showToast === 'function') showToast('没存成：' + (err && err.message || err)); }); }
    else if(act === 'cover' && a){
      LSS('ddAlbumCover', String(a.id)); render();
      if(typeof showToast === 'function') showToast('封面换成这张了');
    }
    else if(act === 'recall'){ LSS('ddAlbumRecall', !LSG('ddAlbumRecall', false)); render(); }
    else if(act === 'del' && a){
      if(!window.confirm('把这张照片从相册里拿掉？')) return;
      state.albumData = (state.albumData || []).filter(x => x !== a); V.detail = null; save(); render();
    }
    else if(act === 'cancel'){ V.compose = null; render(); }
    else if(act === 'post' && V.compose){
      const cap = String((document.getElementById('dda-cap-in') || {}).value || '').trim().slice(0, 80);
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
    if(ON() && e.target && e.target.id === 'dda-imp' && V.ed){
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if(!f) return;
      const fr = new FileReader();
      fr.onload = () => { const im = new Image(); im.onload = () => {
        const k = Math.min(1, 480 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        edAdd('img:' + c.toDataURL('image/png'));
      }; im.src = fr.result; };
      fr.readAsDataURL(f);
      return;
    }
    if(!ON() || !e.target || e.target.id !== 'dda-file') return;
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if(!f) return;
    shrink(f).then(img => { V.compose = {image: img}; render(); setTimeout(() => { const x = document.getElementById('dda-cap-in'); if(x) x.focus(); }, 80); })
      .catch(() => { if(typeof showToast === 'function') showToast('这张图读不出来，换一张试试'); });
  }, true);
  document.addEventListener('input', e => {
    if(e.target && e.target.id === 'dda-note') V.note = e.target.value;
    if(e.target && e.target.id === 'dda-ed-range' && V.ed){
      const E = V.ed, L = E.sel != null ? E.layers[E.sel] : null;
      if(L && L.t !== 'pen'){ if(!E._rangeSnap){ snap(); E._rangeSnap = true; } L.s = +e.target.value; edDraw(); }
    }
  }, true);
  document.addEventListener('change', e => { if(e.target && e.target.id === 'dda-ed-range' && V.ed) V.ed._rangeSnap = false; }, true);
  let sx = null, sy = 0;
  document.addEventListener('touchstart', e => { if(!ON() || !e.target.closest || !e.target.closest('[data-dda-swipe]')) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive: true});
  document.addEventListener('touchend', e => {
    if(sx == null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
    if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
  }, {passive: true});

  return {page, tellBlock, handleBack, isOn: ON, _exportPng: exportPng, _photos: photos};
})();
