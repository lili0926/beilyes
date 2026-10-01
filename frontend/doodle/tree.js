/* 星光涂鸦壳 · 记忆树（记忆库页）
 * 每一条记忆是一片叶子。记忆按记下的先后排队，一棵树装满 300–500 片（每棵的容量由它的序号决定，
 * 固定不变），装满了就进「图鉴」，下一条记忆长在新的一棵树上。
 * 树全是代码画的：同一棵树每次画出来一模一样（种子 = 树的序号），叶子按记忆本身长成不同的样子：
 *   核心 → 开花   日记 → 本树的叶子   日常 → 嫩一点的叶子   待办 / 计划 → 花苞
 *   重要度 → 叶子大小   情绪（效价）→ 叶色冷暖   置顶 → 叶尖一点星光
 * 点一片叶子就读到那一条记忆。原来的记忆列表还在：右上角「列表」。 */
const DoodleTree = (() => {
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ON = () => typeof state !== 'undefined' && state.uiShell === 'doodle';
  const TAU = Math.PI * 2;

  /* ── 随机：同一个种子永远同一串 ── */
  function rng(seed){
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hashN = n => { let x = (n + 1) * 2654435761 >>> 0; x ^= x >>> 16; x = Math.imul(x, 0x45d9f3b) >>> 0; x ^= x >>> 16; return x >>> 0; };
  /** 第 i 棵树装多少片：300–500 之间，固定 */
  const capOf = i => 300 + hashN(i * 7919 + 13) % 201;

  /* ── 树种：叶形 / 叶色 / 花色 / 树皮 ── */
  const SPECIES = [
    {name:'樱花', en:'Sakura',     leaf:'petal',  greens:['#F7B9CF','#F3A3C0','#FBD3E1','#EE93B4'], young:'#FFE3EC', bloom:'#FFFFFF', bloomCore:'#F6C453', bud:'#E97BA3', bark:['#6E5560','#9A7D88','#4B3842'], glow:'#FFD9E6'},
    {name:'蓝花楹', en:'Jacaranda',  leaf:'feather',greens:['#B7A6EC','#9F8CE0','#CBBEF3','#8E7BD6'], young:'#E4DCFB', bloom:'#F4EEFF', bloomCore:'#B98BE8', bud:'#8E6FD9', bark:['#5F5866','#8C8496','#403A48'], glow:'#E3DAFB'},
    {name:'银杏', en:'Ginkgo',      leaf:'fan',    greens:['#F2CD5D','#EBBE3F','#F7DE8E','#E2AE2B'], young:'#FBEFC4', bloom:'#FFF6D6', bloomCore:'#F08A5D', bud:'#C99A2E', bark:['#6D5A4C','#9C8572','#4A3B31'], glow:'#FFF0C2'},
    {name:'枫', en:'Maple',          leaf:'maple',  greens:['#F28C7D','#E8716A','#F7B19E','#DA5B5E'], young:'#FCD3C6', bloom:'#FFE9DF', bloomCore:'#F6C453', bud:'#C2464F', bark:['#6A4E4A','#987570','#46302D'], glow:'#FFDCD2'},
    {name:'薄荷桉', en:'Eucalyptus', leaf:'round',  greens:['#9FD8C4','#84CBB3','#BEE6D7','#6FBBA2'], young:'#DDF3EA', bloom:'#FFFFFF', bloomCore:'#F2A7C3', bud:'#5FA88F', bark:['#6B6A6E','#9B9AA0','#47464B'], glow:'#D8F3EA'},
    {name:'月桂', en:'Laurel',       leaf:'almond', greens:['#8FC79A','#77B886','#AFD8B5','#5FA672'], young:'#D6EED9', bloom:'#FFFBEF', bloomCore:'#F2C14E', bud:'#4F9363', bark:['#6A5848','#998370','#46382C'], glow:'#DDF2DF'},
  ];
  const speciesOf = i => SPECIES[i % SPECIES.length];

  /* ── 记忆排队，分进一棵棵树 ── */
  function dateOf(m){
    const raw = m && (m.createdAt || m.created_at || m.time || ((+m.id > 1e12) ? +m.id : null));
    const d = raw ? new Date(raw) : null;
    return d && !isNaN(d.getTime()) ? d : null;
  }
  function allMems(){
    return (state.memories || []).filter(m => m && !m.archived && String(m.content || '').trim())
      .map((m, i) => ({m, t: (dateOf(m) || new Date(0)).getTime(), i}))
      .sort((a, b) => a.t - b.t || a.i - b.i).map(x => x.m);
  }
  function forest(){
    const mems = allMems(), trees = [];
    let k = 0, i = 0;
    do{
      const cap = capOf(i), part = mems.slice(k, k + cap);
      trees.push({i, cap, mems: part, full: part.length >= cap});
      k += cap; i++;
    }while(k < mems.length);
    return {trees, total: mems.length};
  }

  /* ── 树的骨架（归一化坐标：宽 1000，高 1150，地面 y=1010）── */
  const W = 1000, H = 1150, GROUND = 1010;
  const skelCache = new Map();
  function skeleton(i){
    if(skelCache.has(i)) return skelCache.get(i);
    const R = rng(hashN(i * 104729 + 7)), r = (a, b) => a + (b - a) * R();
    const segs = [], tips = [];
    const lean = r(-0.08, 0.08);
    const MAXD = 8;
    function branch(x, y, ang, len, w, d){
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      const bend = r(-0.16, 0.16) * len * (d === 0 ? 0.5 : 1);
      const mx = (x + ex) / 2 + Math.cos(ang + Math.PI / 2) * bend, my = (y + ey) / 2 + Math.sin(ang + Math.PI / 2) * bend;
      const w1 = Math.max(0.9, w * (d === 0 ? 0.62 : 0.7));
      segs.push({x, y, cx: mx, cy: my, ex, ey, w0: w, w1, d, ang, len});
      if(d >= MAXD || len < 16){ tips.push({x: ex, y: ey, ang}); return; }
      const n = d < 1 ? 3 : (d < 6 && R() < 0.42 ? 3 : 2);
      const spread = d < 1 ? r(0.78, 0.92) : d < 3 ? r(0.62, 0.8) : r(0.5, 0.72);   // 低处张得开 → 圆的树冠
      for(let k = 0; k < n; k++){
        let a = ang + (n === 1 ? 0 : (k / (n - 1) - 0.5) * spread * (n === 3 ? 1.5 : 1.2)) + r(-0.14, 0.14);
        a = a + (-Math.PI / 2 - a) * (d < 1 ? 0.04 : d < 3 ? 0.1 : 0.06);  // 向光：往上拉一点
        if(d >= 4) a += (Math.abs(Math.cos(a)) > 0.8 ? 0.06 : 0) * Math.sign(Math.sin(a)); // 外侧细枝微微下垂
        const ln = len * (d < 1 ? r(0.82, 0.95) : r(0.7, 0.82)) * (n === 3 && k === 1 ? 0.88 : 1);
        branch(ex, ey, a, ln, w1 * r(0.74, 0.84), d + 1);
      }
      /* 侧生小枝：让树冠里面不空 */
      if(d >= 3 && d <= 6 && R() < 0.55){
        const t = r(0.35, 0.7), sx = x + (ex - x) * t, sy = y + (ey - y) * t;
        const sa = ang + (R() < 0.5 ? -1 : 1) * r(0.7, 1.1);
        branch(sx, sy, sa, len * r(0.36, 0.5), w1 * 0.5, Math.min(MAXD, d + 2));
      }
    }
    /* 主干：先长一段，再分 */
    const trunkLen = r(230, 262), trunkW = r(56, 64);
    branch(W / 2 + r(-10, 10), GROUND, -Math.PI / 2 + lean, trunkLen, trunkW, 0);
    /* 根：从树干底部往两边钻进土里 */
    const roots = [];
    const nr = 5;
    for(let k = 0; k < nr; k++){
      const side = k < nr / 2 ? -1 : 1, t = (k + 0.5) / nr;
      roots.push({x: W / 2 + (t - 0.5) * trunkW * 0.9, y: GROUND - 8, dx: side * r(60, 120) * (0.4 + Math.abs(t - 0.5) * 2), dy: r(10, 28), w: r(10, 18)});
    }
    /* 树结：主干上一两个 */
    const knots = [{t: r(0.35, 0.6), side: R() < 0.5 ? -1 : 1, s: r(0.8, 1.2)}];
    /* 叶位：沿细枝撒点（够用 1.7 倍容量，再按种子洗牌 —— 洗出来的顺序就是叶子长出来的顺序） */
    const cap = capOf(i), slots = [];
    const twigs = segs.filter(s => s.d >= 3);
    let guard = 0;
    while(slots.length < cap * 1.7 && guard++ < 60){
      twigs.forEach(s => {
        const per = Math.max(1, Math.round(s.len / 26));
        for(let k = 0; k < per; k++){
          const t = r(0.25, 1);
          const px = (1 - t) * (1 - t) * s.x + 2 * (1 - t) * t * s.cx + t * t * s.ex;
          const py = (1 - t) * (1 - t) * s.y + 2 * (1 - t) * t * s.cy + t * t * s.ey;
          const off = r(-1, 1) * (16 + s.w1 * 2), na = s.ang + Math.PI / 2;
          const side = off >= 0 ? 1 : -1;
          slots.push({x: px + Math.cos(na) * off, y: py + Math.sin(na) * off, a: s.ang + side * r(0.4, 1.2) + r(-0.3, 0.3), z: R()});
        }
      });
    }
    for(let k = slots.length - 1; k > 0; k--){ const j = Math.floor(R() * (k + 1)); [slots[k], slots[j]] = [slots[j], slots[k]]; }
    slots.length = Math.min(slots.length, cap);
    /* 整棵塞进画框：以树根为中心等比缩放（树干还扎在地上），树冠上沿离顶 70、左右各留 50 */
    const BX = W / 2, PAD = 34;
    let minY = GROUND, maxDX = 1;
    segs.forEach(s => { minY = Math.min(minY, s.ey, s.cy); maxDX = Math.max(maxDX, Math.abs(s.ex - BX)); });
    slots.forEach(q => { minY = Math.min(minY, q.y - PAD); maxDX = Math.max(maxDX, Math.abs(q.x - BX) + PAD); });
    const fit = Math.min((GROUND - 70) / (GROUND - minY), (W / 2 - 50) / maxDX, 1.35);
    const T = (x, y) => [BX + (x - BX) * fit, GROUND + (y - GROUND) * fit];
    segs.forEach(s => { [s.x, s.y] = T(s.x, s.y); [s.cx, s.cy] = T(s.cx, s.cy); [s.ex, s.ey] = T(s.ex, s.ey); s.w0 *= fit; s.w1 *= fit; s.len *= fit; });
    slots.forEach(q => { [q.x, q.y] = T(q.x, q.y); });
    tips.forEach(q => { [q.x, q.y] = T(q.x, q.y); });
    /* 地面装饰 */
    const grass = [], flowers = [];
    for(let k = 0; k < 150; k++) grass.push({x: r(40, 960), h: r(10, 30), b: r(-0.4, 0.4), c: R()});
    for(let k = 0; k < 14; k++) flowers.push({x: r(70, 930), y: GROUND + r(8, 46), s: r(0.7, 1.3), c: R()});
    const out = {segs, tips, roots, knots, slots, grass, flowers, trunkW};
    skelCache.set(i, out);
    return out;
  }

  /* ── 画 ── */
  const mix = (a, b, t) => {
    const p = x => [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)];
    const A = p(a), B = p(b);
    return '#' + A.map((v, k) => Math.round(v + (B[k] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  function quadPt(s, t){ return [(1 - t) * (1 - t) * s.x + 2 * (1 - t) * t * s.cx + t * t * s.ex, (1 - t) * (1 - t) * s.y + 2 * (1 - t) * t * s.cy + t * t * s.ey]; }

  function drawBranch(g, s, sp){
    const [b0, b1, b2] = sp.bark;
    if(s.w0 < 2.4){
      g.strokeStyle = s.d > 6 ? b1 : b0; g.lineWidth = Math.max(0.8, (s.w0 + s.w1) / 2); g.lineCap = 'round';
      g.beginPath(); g.moveTo(s.x, s.y); g.quadraticCurveTo(s.cx, s.cy, s.ex, s.ey); g.stroke(); return;
    }
    /* 两边各算一条贝塞尔，宽度从 w0 收到 w1 */
    const N = 8, L = [], Rr = [];
    for(let k = 0; k <= N; k++){
      const t = k / N, [px, py] = quadPt(s, t);
      const dx = 2 * (1 - t) * (s.cx - s.x) + 2 * t * (s.ex - s.cx), dy = 2 * (1 - t) * (s.cy - s.y) + 2 * t * (s.ey - s.cy);
      const l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = (s.w0 + (s.w1 - s.w0) * t) / 2;
      L.push([px + nx * w, py + ny * w]); Rr.push([px - nx * w, py - ny * w]);
    }
    g.beginPath(); g.moveTo(L[0][0], L[0][1]);
    for(let k = 1; k <= N; k++) g.lineTo(L[k][0], L[k][1]);
    g.lineTo(Rr[N][0], Rr[N][1]);
    for(let k = N; k >= 0; k--) g.lineTo(Rr[k][0], Rr[k][1]);
    g.closePath();
    /* 圆柱感：横着一条渐变，左暗中亮右更暗（光从左上来） */
    const m = Math.floor(N / 2), gr = g.createLinearGradient(L[m][0], L[m][1], Rr[m][0], Rr[m][1]);
    gr.addColorStop(0, b0); gr.addColorStop(0.32, b1); gr.addColorStop(0.62, b0); gr.addColorStop(1, b2);
    g.fillStyle = gr; g.fill();
    /* 树皮纹：粗枝上几道断续的深色细线 */
    if(s.w0 > 12){
      const R = rng(Math.round(s.x * 31 + s.y * 17)), lines = Math.round(s.w0 / 7);
      g.save(); g.clip();
      g.strokeStyle = b2; g.lineCap = 'round';
      for(let q = 0; q < lines; q++){
        const off = (q + 0.5) / lines - 0.5;
        g.globalAlpha = 0.18 + R() * 0.2; g.lineWidth = 0.8 + R() * 1.4;
        g.beginPath();
        let started = false;
        for(let k = 0; k <= N; k++){
          const t = k / N, [px, py] = quadPt(s, t), w = (s.w0 + (s.w1 - s.w0) * t);
          const dx = 2 * (1 - t) * (s.cx - s.x) + 2 * t * (s.ex - s.cx), dy = 2 * (1 - t) * (s.cy - s.y) + 2 * t * (s.ey - s.cy);
          const l = Math.hypot(dx, dy) || 1, wob = Math.sin(t * 9 + q * 2.1) * w * 0.04;
          const x = px - dy / l * (off * w * 0.9 + wob), y = py + dx / l * (off * w * 0.9 + wob);
          if(R() < 0.22){ started = false; continue; }      // 断开：树皮裂纹不是一根直线
          if(!started){ g.moveTo(x, y); started = true; } else g.lineTo(x, y);
        }
        g.stroke();
      }
      /* 左侧一道高光 */
      g.globalAlpha = 0.22; g.strokeStyle = '#FFFFFF'; g.lineWidth = Math.max(1, s.w0 * 0.08);
      g.beginPath();
      for(let k = 0; k <= N; k++){ const p = [L[k][0] * 0.8 + ((L[k][0] + Rr[k][0]) / 2) * 0.2, L[k][1] * 0.8 + ((L[k][1] + Rr[k][1]) / 2) * 0.2]; k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
      g.stroke();
      g.restore(); g.globalAlpha = 1;
    }
  }

  /* 叶形：都画在「叶柄在原点、叶尖朝 +x」的坐标里，长度 = 1 */
  function leafPath(g, kind){
    g.beginPath();
    if(kind === 'round'){
      g.moveTo(0, 0); g.bezierCurveTo(0.1, -0.5, 0.9, -0.55, 0.95, 0); g.bezierCurveTo(0.9, 0.55, 0.1, 0.5, 0, 0);
    } else if(kind === 'fan'){       /* 银杏：扇形，顶边有一道缺口 */
      g.moveTo(0, 0); g.lineTo(0.42, -0.08); g.bezierCurveTo(0.62, -0.55, 1.02, -0.5, 1.0, -0.06); g.lineTo(0.84, 0);
      g.lineTo(1.0, 0.06); g.bezierCurveTo(1.02, 0.5, 0.62, 0.55, 0.42, 0.08); g.closePath();
    } else if(kind === 'maple'){     /* 枫：五裂 */
      const lobes = [[1.0, 0], [0.62, -0.62], [0.2, -0.78], [0.62, 0.62], [0.2, 0.78]];
      g.moveTo(0.18, 0);
      g.lineTo(0.44, -0.16); g.lineTo(0.62, -0.62); g.lineTo(0.56, -0.3); g.lineTo(1.0, 0); g.lineTo(0.56, 0.3); g.lineTo(0.62, 0.62);
      g.lineTo(0.44, 0.16); g.lineTo(0.2, 0.78); g.lineTo(0.3, 0.2); g.lineTo(0.18, 0); g.lineTo(0.3, -0.2); g.lineTo(0.2, -0.78); g.lineTo(0.44, -0.16);
      g.closePath(); void lobes;
    } else if(kind === 'petal'){     /* 樱：花瓣，尖端一道小凹 */
      g.moveTo(0, 0); g.bezierCurveTo(0.2, -0.46, 0.8, -0.5, 0.96, -0.12); g.lineTo(0.86, 0); g.lineTo(0.96, 0.12); g.bezierCurveTo(0.8, 0.5, 0.2, 0.46, 0, 0);
    } else if(kind === 'feather'){   /* 蓝花楹：细长 */
      g.moveTo(0, 0); g.bezierCurveTo(0.25, -0.22, 0.8, -0.26, 1.0, 0); g.bezierCurveTo(0.8, 0.26, 0.25, 0.22, 0, 0);
    } else {                         /* almond：月桂 */
      g.moveTo(0, 0); g.bezierCurveTo(0.22, -0.36, 0.74, -0.34, 1.0, 0); g.bezierCurveTo(0.74, 0.34, 0.22, 0.36, 0, 0);
    }
  }
  function drawLeaf(g, x, y, ang, size, col, kind, back){
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(size, size);
    leafPath(g, kind);
    const gr = g.createLinearGradient(0, 0, 1, 0);
    gr.addColorStop(0, mix(col, '#3a2f4a', back ? 0.32 : 0.18)); gr.addColorStop(0.55, col); gr.addColorStop(1, mix(col, '#ffffff', back ? 0.12 : 0.3));
    g.fillStyle = gr; g.fill();
    g.lineWidth = 0.035; g.strokeStyle = mix(col, '#2f2540', 0.35); g.globalAlpha = back ? 0.35 : 0.5; g.stroke(); g.globalAlpha = 1;
    if(kind !== 'fan'){
      /* 主脉 + 几道侧脉 */
      g.strokeStyle = mix(col, '#ffffff', 0.55); g.globalAlpha = back ? 0.35 : 0.7; g.lineWidth = 0.045;
      g.beginPath(); g.moveTo(0.04, 0); g.lineTo(kind === 'maple' ? 0.9 : 0.9, 0); g.stroke();
      g.lineWidth = 0.026;
      const vs = kind === 'maple' ? [[0.22, 0.6, -0.58], [0.22, 0.6, 0.58], [0.2, 0.22, -0.7], [0.2, 0.22, 0.7]] : [[0.3, 0.46, -0.2], [0.3, 0.46, 0.2], [0.52, 0.68, -0.15], [0.52, 0.68, 0.15]];
      vs.forEach(([a, b, c]) => { g.beginPath(); g.moveTo(a, 0); g.quadraticCurveTo((a + b) / 2, c * 0.4, b, c * (kind === 'maple' ? 1 : 0.75)); g.stroke(); });
    } else {
      /* 银杏：扇骨 */
      g.strokeStyle = mix(col, '#ffffff', 0.5); g.globalAlpha = 0.45; g.lineWidth = 0.022;
      for(let k = -3; k <= 3; k++){ g.beginPath(); g.moveTo(0.1, 0); g.lineTo(0.95, k * 0.12); g.stroke(); }
    }
    g.globalAlpha = 1; g.restore();
  }
  function drawBloom(g, x, y, s, sp, rot){
    g.save(); g.translate(x, y); g.rotate(rot);
    for(let k = 0; k < 5; k++){
      g.save(); g.rotate(k * TAU / 5);
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(s * 0.35, -s * 0.5, s * 1.05, -s * 0.42, s * 1.0, -s * 0.06); g.lineTo(s * 0.9, 0); g.lineTo(s * 1.0, s * 0.06);
      g.bezierCurveTo(s * 1.05, s * 0.42, s * 0.35, s * 0.5, 0, 0);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, s);
      gr.addColorStop(0, mix(sp.bloom, sp.greens[0], 0.35)); gr.addColorStop(1, sp.bloom);
      g.fillStyle = gr; g.fill(); g.strokeStyle = mix(sp.greens[0], '#7a5a80', 0.3); g.globalAlpha = 0.35; g.lineWidth = s * 0.05; g.stroke(); g.globalAlpha = 1;
      g.restore();
    }
    g.fillStyle = sp.bloomCore; g.beginPath(); g.arc(0, 0, s * 0.22, 0, TAU); g.fill();
    g.fillStyle = mix(sp.bloomCore, '#7a4a20', 0.4);
    for(let k = 0; k < 6; k++){ const a = k * TAU / 6; g.beginPath(); g.arc(Math.cos(a) * s * 0.32, Math.sin(a) * s * 0.32, s * 0.05, 0, TAU); g.fill(); }
    g.restore();
  }
  function drawBud(g, x, y, s, ang, sp){
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = mix(sp.greens[3], '#3c5a3a', 0.3);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.5, -s * 0.5, s * 0.7, -s * 0.15); g.quadraticCurveTo(s * 0.45, -s * 0.05, 0, 0); g.fill();
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.5, s * 0.5, s * 0.7, s * 0.15); g.quadraticCurveTo(s * 0.45, s * 0.05, 0, 0); g.fill();
    const gr = g.createRadialGradient(s * 0.75, -s * 0.12, 0, s * 0.7, 0, s * 0.5);
    gr.addColorStop(0, mix(sp.bud, '#ffffff', 0.45)); gr.addColorStop(1, sp.bud);
    g.fillStyle = gr; g.beginPath(); g.ellipse(s * 0.72, 0, s * 0.42, s * 0.3, 0, 0, TAU); g.fill();
    g.restore();
  }
  function sparkle(g, x, y, s){
    g.save(); g.translate(x, y); g.fillStyle = '#FFFFFF'; g.globalAlpha = 0.95;
    g.beginPath(); g.moveTo(0, -s); g.quadraticCurveTo(0, 0, s, 0); g.quadraticCurveTo(0, 0, 0, s); g.quadraticCurveTo(0, 0, -s, 0); g.quadraticCurveTo(0, 0, 0, -s); g.fill();
    g.restore();
  }

  /** 一片叶子由它那条记忆决定长什么样 */
  function leafLook(m, sp, slot){
    const layer = m.layer || 'diary', imp = Math.min(10, Math.max(1, +m.importance || 5));
    const val = Math.max(-1, Math.min(1, +m.valence || 0)), aro = Math.max(0, Math.min(1, m.arousal == null ? 0.5 : +m.arousal));
    const pick = sp.greens[Math.floor(slot.z * 4) % 4];
    let col = layer === 'daily' ? mix(pick, sp.young, 0.45) : pick;
    col = val > 0 ? mix(col, '#FFD6A5', val * 0.18) : mix(col, '#A9B8E8', -val * 0.22);   // 开心偏暖，难过偏冷
    const size = (26 + imp * 2.2) * (0.86 + aro * 0.3);
    const kind = layer === 'core' ? 'bloom' : (layer === 'handoff' || layer === 'plans') ? 'bud' : 'leaf';
    return {col, size, kind, pinned: !!m.pinned};
  }

  /** 把一棵树画进 ctx。px = 这张画布的像素宽；leaves = 这棵树的记忆；opt.thumb 小图省掉细节 */
  function paint(cv, i, mems, opt){
    opt = opt || {};
    const sp = speciesOf(i), sk = skeleton(i);
    const g = cv.getContext('2d'), sc = cv.width / W;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(sc, 0, 0, sc, 0, 0);
    const fill = mems.length / capOf(i);
    /* 天空 */
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#F3ECFD'); sky.addColorStop(0.55, '#FBF6FF'); sky.addColorStop(1, '#FFF8F3');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(500, 430, 40, 500, 430, 520);
    glow.addColorStop(0, sp.glow); glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow; g.globalAlpha = 0.85; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    if(!opt.thumb){
      /* 远山 */
      g.fillStyle = '#E7DDF6';
      g.beginPath(); g.moveTo(0, 900); g.bezierCurveTo(180, 820, 300, 880, 420, 860); g.bezierCurveTo(560, 830, 700, 900, 820, 850); g.bezierCurveTo(900, 830, 960, 860, 1000, 850); g.lineTo(1000, 1150); g.lineTo(0, 1150); g.fill();
      g.fillStyle = '#EFE8F9';
      g.beginPath(); g.moveTo(0, 950); g.bezierCurveTo(200, 900, 330, 960, 520, 930); g.bezierCurveTo(700, 905, 860, 960, 1000, 925); g.lineTo(1000, 1150); g.lineTo(0, 1150); g.fill();
      /* 星点 */
      const R = rng(hashN(i + 99));
      for(let k = 0; k < 22; k++){ g.globalAlpha = 0.35 + R() * 0.5; sparkle(g, R() * W, R() * 380 + 20, 3 + R() * 6); }
      g.globalAlpha = 1;
    }
    /* 地面 */
    const gd = g.createLinearGradient(0, GROUND - 30, 0, H);
    gd.addColorStop(0, '#CDEBDD'); gd.addColorStop(1, '#B3DCC8');
    g.fillStyle = gd;
    g.beginPath(); g.moveTo(0, GROUND + 20); g.bezierCurveTo(250, GROUND - 26, 750, GROUND - 26, 1000, GROUND + 20); g.lineTo(1000, H); g.lineTo(0, H); g.fill();
    /* 树影 */
    const sh = g.createRadialGradient(500, GROUND + 6, 10, 500, GROUND + 6, 300);
    sh.addColorStop(0, 'rgba(70,90,80,.32)'); sh.addColorStop(1, 'rgba(70,90,80,0)');
    g.fillStyle = sh; g.save(); g.translate(500, GROUND + 6); g.scale(1, 0.16); g.translate(-500, -(GROUND + 6)); g.beginPath(); g.arc(500, GROUND + 6, 300, 0, TAU); g.fill(); g.restore();
    /* 根 */
    sk.roots.forEach(rt => {
      g.strokeStyle = sp.bark[0]; g.lineCap = 'round';
      for(let k = 0; k < 3; k++){
        g.lineWidth = rt.w * (1 - k * 0.3);
        g.beginPath(); g.moveTo(rt.x, rt.y - 26); g.quadraticCurveTo(rt.x + rt.dx * 0.35, rt.y - 4, rt.x + rt.dx * (0.6 + k * 0.2), rt.y + rt.dy * (0.6 + k * 0.2)); g.stroke();
      }
    });
    /* 树冠里面那团若有若无的影子：叶子越多越浓，看着有体积 */
    if(fill > 0.05){
      const cx = 500, cy = 470;
      const cg = g.createRadialGradient(cx, cy, 40, cx, cy, 420);
      cg.addColorStop(0, mix(sp.greens[3], '#5a4a6a', 0.25)); cg.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.18 * Math.min(1, fill * 1.4); g.fillStyle = cg; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    }
    /* 枝干：粗的先画 */
    sk.segs.slice().sort((a, b) => b.w0 - a.w0).forEach(s => drawBranch(g, s, sp));
    /* 树结 */
    if(!opt.thumb){
      const t0 = sk.segs[0];
      sk.knots.forEach(k => {
        const [px, py] = quadPt(t0, k.t), w = t0.w0 + (t0.w1 - t0.w0) * k.t;
        const x = px + k.side * w * 0.18;
        g.fillStyle = sp.bark[2]; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(x, py, 5 * k.s, 9 * k.s, 0, 0, TAU); g.fill();
        g.strokeStyle = sp.bark[1]; g.globalAlpha = 0.6; g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, py, 8 * k.s, 13 * k.s, 0, 0, TAU); g.stroke();
        g.globalAlpha = 1;
      });
    }
    /* 叶子：后排先画（暗一点），前排后画 */
    const placed = [];
    const order = mems.map((m, k) => ({m, s: sk.slots[k], k})).filter(x => x.s).sort((a, b) => a.s.z - b.s.z);
    order.forEach(({m, s}) => {
      const L = leafLook(m, sp, s), back = s.z < 0.35;
      if(L.kind === 'bloom') drawBloom(g, s.x, s.y, L.size * 0.5, sp, s.a);
      else if(L.kind === 'bud') drawBud(g, s.x, s.y, L.size * 0.75, s.a, sp);
      else drawLeaf(g, s.x, s.y, s.a, L.size, back ? mix(L.col, '#4a3e5c', 0.12) : L.col, sp.leaf, back);
      if(L.pinned && !opt.thumb) sparkle(g, s.x + Math.cos(s.a) * L.size, s.y + Math.sin(s.a) * L.size, 7);
      placed.push({x: s.x + Math.cos(s.a) * L.size * 0.5, y: s.y + Math.sin(s.a) * L.size * 0.5, r: Math.max(18, L.size * 0.7), m});
    });
    /* 草和小花（盖在树根前面） */
    if(!opt.thumb){
      sk.grass.forEach(gs => {
        g.strokeStyle = gs.c < 0.5 ? '#86C7A6' : '#A5D8BD'; g.lineWidth = 2.2; g.lineCap = 'round';
        const y0 = GROUND + 10 + (Math.abs(gs.x - 500) / 500) * 14;
        g.beginPath(); g.moveTo(gs.x, y0); g.quadraticCurveTo(gs.x + gs.b * 10, y0 - gs.h * 0.6, gs.x + gs.b * 18, y0 - gs.h); g.stroke();
      });
      sk.flowers.forEach(f => {
        g.save(); g.translate(f.x, f.y); g.scale(f.s, f.s);
        g.fillStyle = f.c < 0.5 ? '#FFFFFF' : (f.c < 0.8 ? '#F7C6D8' : '#D9CCF5');
        for(let k = 0; k < 5; k++){ const a = k * TAU / 5; g.beginPath(); g.ellipse(Math.cos(a) * 5, Math.sin(a) * 5, 4.4, 3, a, 0, TAU); g.fill(); }
        g.fillStyle = '#F6C453'; g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); g.fill();
        g.restore();
      });
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    return placed;
  }

  /* ── 页面 ── */
  const LAYER = {core:'核心 · 开花', diary:'日记 · 叶', daily:'日常 · 嫩叶', handoff:'待办 · 花苞', plans:'计划 · 花苞', pr:'PR · 叶'};
  const fmtD = d => d ? (d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0')) : '';
  const V = {placed: [], view: null};

  function page(){
    const F = forest(), cur = F.trees[F.trees.length - 1];
    const vi = state.mtView != null && F.trees[state.mtView] ? state.mtView : cur.i;
    const T = F.trees[vi], sp = speciesOf(vi);
    V.view = vi;
    const first = T.mems[0], last = T.mems[T.mems.length - 1];
    const leafM = state.mtLeaf != null ? (state.memories || []).find(m => String(m.id) === String(state.mtLeaf)) : null;
    const pct = Math.round(T.mems.length / T.cap * 100);
    const card = T.full
      ? `<span class="mt-done">已长满</span>`
      : `<div class="mt-bar"><i style="width:${Math.max(2, pct)}%"></i></div><span class="mt-left">还差 ${T.cap - T.mems.length} 片长满</span>`;
    const atlas = F.trees.map(t => {
      const s = speciesOf(t.i), a = t.mems[0], z = t.mems[t.mems.length - 1];
      return `<button type="button" class="mt-cell${t.i === vi ? ' on' : ''}${t.full ? '' : ' growing'}" data-mt-view="${t.i}">
        <canvas class="mt-thumb" data-mt-thumb="${t.i}" width="240" height="276"></canvas>
        <b>第 ${t.i + 1} 棵 · ${h(s.name)}</b>
        <span>${t.full ? `${t.mems.length} 片 · ${fmtD(dateOf(a))}–${fmtD(dateOf(z)).slice(5)}` : `正在长 · ${t.mems.length}/${t.cap}`}</span>
      </button>`;
    }).join('') + `<div class="mt-cell locked" aria-hidden="true"><div class="mt-q">?</div><b>第 ${F.trees.length + 1} 棵</b><span>长满这一棵就会冒芽</span></div>`;
    return `<div class="page mt" style="padding-top:0">
      ${subHeader('记忆树')}
      <p class="mt-ko">기억이 잎이 되어</p>
      <button type="button" class="mt-list" data-mt="list">列表</button>
      <section class="mt-card">
        <div class="mt-head">
          <div><b>第 ${vi + 1} 棵 · ${h(sp.name)}</b><small>${h(sp.en)}${first ? ` · 从 ${fmtD(dateOf(first))} 开始` : ''}</small></div>
          <div class="mt-num"><b>${T.mems.length}</b><small>/ ${T.cap} 片</small></div>
        </div>
        <div class="mt-stage">
          <canvas id="mt-canvas" data-mt-tree="${vi}" width="10" height="10" aria-label="记忆树，点叶子读记忆"></canvas>
          <canvas id="mt-air" width="10" height="10" aria-hidden="true"></canvas>
          ${!T.mems.length ? `<p class="mt-empty">第一片叶子，在等你们的第一条记忆</p>` : ''}
        </div>
        <div class="mt-foot">${card}</div>
        <div class="mt-legend">
          <span><i class="lg leaf" style="--c:${sp.greens[0]}"></i>日记</span>
          <span><i class="lg leaf" style="--c:${mix(sp.greens[1], sp.young, 0.45)}"></i>日常</span>
          <span><i class="lg bloom" style="--c:${sp.bloom};--k:${sp.bloomCore}"></i>核心</span>
          <span><i class="lg bud" style="--c:${sp.bud}"></i>待办 / 计划</span>
          <span><i class="lg star"></i>置顶</span>
        </div>
        <p class="mt-tip">点一片叶子，读那一天记下的话</p>
      </section>
      <h3 class="mt-h">图鉴 <small>共 ${F.total} 条记忆 · ${F.trees.filter(t => t.full).length} 棵已长满</small></h3>
      <div class="mt-atlas">${atlas}</div>
      ${leafM ? `<div class="mt-pop" data-mt="close">
        <div class="mt-note" role="dialog">
          <div class="mt-note-h"><span class="mt-tag">${h(LAYER[leafM.layer] || leafM.layer || '记忆')}</span><time>${fmtD(dateOf(leafM))}</time></div>
          <p>${h(leafM.content)}</p>
          <div class="mt-note-f"><span>${'★'.repeat(Math.round((+leafM.importance || 5) / 2))}<em>${'★'.repeat(5 - Math.round((+leafM.importance || 5) / 2))}</em></span><button type="button" data-mt="close">放回树上</button></div>
        </div></div>` : ''}
    </div>`;
  }

  /* 画好的整棵树缓存一张（同一棵、同样多叶子、同样宽就不重画） */
  const paintCache = new Map();
  function paintInto(cv, i, mems, cssW, thumb){
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const pw = Math.round(cssW * dpr), ph = Math.round(pw * H / W);
    const key = i + ':' + pw + ':' + (thumb ? 't' : 'f') + ':' + mems.length + ':' + mems.map(m => m.id + (m.layer || '') + (m.pinned ? 'p' : '')).join(',').length + ':' + (mems[mems.length - 1] || {}).id;
    let hit = paintCache.get(key);
    if(!hit){
      const off = document.createElement('canvas'); off.width = pw; off.height = ph;
      const placed = paint(off, i, mems, {thumb});
      hit = {off, placed, scale: pw / W / dpr};
      paintCache.set(key, hit);
      if(paintCache.size > 24){ const k0 = paintCache.keys().next().value; paintCache.delete(k0); }
    }
    cv.width = pw; cv.height = ph; cv.style.width = cssW + 'px'; cv.style.height = Math.round(cssW * H / W) + 'px';
    cv.getContext('2d').drawImage(hit.off, 0, 0);
    return hit;
  }

  /* 空气里飘的几片：只有一层很轻的动画，树本身是静止的位图 */
  let airRaf = 0;
  function air(cv, i, cssW){
    cancelAnimationFrame(airRaf);
    const dpr = Math.min(2, window.devicePixelRatio || 1), cssH = Math.round(cssW * H / W);
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr); cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
    const g = cv.getContext('2d'), sp = speciesOf(i), R = rng(hashN(i + 5));
    const ps = Array.from({length: 9}, () => ({x: R() * cssW, y: R() * cssH * 0.8, v: 0.12 + R() * 0.22, a: R() * TAU, s: 4 + R() * 4, c: sp.greens[Math.floor(R() * 4)], spin: (R() - 0.5) * 0.03, mote: R() < 0.4}));
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = () => {
      if(!cv.isConnected) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cssW, cssH);
      ps.forEach(p => {
        p.y += p.v; p.x += Math.sin(p.y / 26 + p.a) * 0.35; p.a += p.spin;
        if(p.y > cssH * 0.9){ p.y = -10; p.x = R() * cssW; }
        if(p.mote){ g.globalAlpha = 0.7; g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(p.x, p.y, p.s * 0.35, 0, TAU); g.fill(); }
        else { g.globalAlpha = 0.85; drawLeaf(g, p.x, p.y, p.a, p.s * 2.2, p.c, sp.leaf, false); }
      });
      g.globalAlpha = 1;
      if(!reduce) airRaf = requestAnimationFrame(step);
    };
    step();
  }

  function afterRender(){
    if(!ON() || state.subPage !== 'memory') return;
    const app = document.getElementById('app');
    if(state.memView === 'list'){
      /* 列表页里放一颗回到树上的按钮 */
      const pg = app && app.querySelector('.page');
      if(pg && !pg.querySelector('.mt-back-tree')){
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'mt-back-tree'; b.setAttribute('data-mt', 'tree'); b.textContent = '🌳 回到记忆树';
        pg.appendChild(b);
      }
      return;
    }
    const cv = document.getElementById('mt-canvas'); if(!cv) return;
    const i = +cv.getAttribute('data-mt-tree'), F = forest(), T = F.trees[i]; if(!T) return;
    const cssW = Math.max(200, Math.round(cv.parentNode.getBoundingClientRect().width));
    const hit = paintInto(cv, i, T.mems, cssW, false);
    V.placed = hit.placed; V.scale = cssW / W;
    const airCv = document.getElementById('mt-air'); if(airCv) air(airCv, i, cssW);
    document.querySelectorAll('[data-mt-thumb]').forEach(c => {
      const k = +c.getAttribute('data-mt-thumb'), t = F.trees[k]; if(!t) return;
      paintInto(c, k, t.mems, Math.round(c.getBoundingClientRect().width) || 110, true);
    });
  }

  document.addEventListener('click', e => {
    if(!ON() || !e.target.closest) return;
    const cv = e.target.closest('#mt-canvas,#mt-air');
    if(cv){
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / V.scale, y = (e.clientY - r.top) / V.scale;
      let best = null, bd = 1e9;
      V.placed.forEach(p => { const d = Math.hypot(p.x - x, p.y - y); if(d < p.r * 1.6 && d < bd){ bd = d; best = p; } });
      if(best){ state.mtLeaf = best.m.id; render(); }
      return;
    }
    const v = e.target.closest('[data-mt-view]');
    if(v){ e.preventDefault(); state.mtView = +v.getAttribute('data-mt-view'); state.mtLeaf = null; render(); const pg = document.querySelector('#app .page'); if(pg) pg.scrollTop = 0; return; }
    const b = e.target.closest('[data-mt]'); if(!b) return;
    const k = b.getAttribute('data-mt');
    if(k === 'close'){ if(e.target.closest('.mt-note') && !e.target.closest('button')) return; state.mtLeaf = null; render(); }
    else if(k === 'list'){ state.memView = 'list'; render(); }
    else if(k === 'tree'){ state.memView = 'tree'; render(); }
  }, true);

  return {page, afterRender, isOn: ON, _forest: forest, _cap: capOf};
})();
