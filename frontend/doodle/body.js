/* 身体状况 · 看得见的他（所有界面壳通用）
 * 主角是她画的那条白蛇（doodle/body/snake.webp），上面盖一层会跟着读数变的东西：
 *   瞳孔（细缝 ↔ 放圆）、信子（吐得勤不勤）、鳞色（凉灰 ↔ 被捂暖）、脸红、蜕皮翘起的旧皮、
 *   呼吸起伏（按他的心跳）、发情期的一圈淡光。点一下他抬头吐信子；顺着身子摸 = 想你 +；双击轻拍 = 冷静一点。
 * 七项读数是一排小药瓶，六轴是一张星图，三个周期（蜕皮 / 你姨妈 / 发情）排在一个转盘上。
 * 还有体检单：每天的读数和每一次亲密都记在 state.snake.days / state.snake.log 里（核心那边记），
 * 这里按周、按月算平均和频率，开医嘱，显示在「回执」页；新一周的医嘱会在下一轮聊天里顺带告诉他一次。 */
const BodyPage = (() => {
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = n => String(n).padStart(2, '0');
  const LSG = (k, d) => { try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } };
  const LSS = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
  const cl = v => Math.max(0, Math.min(1, +v || 0));
  const aiName = () => { try{ const ag = typeof agentById === 'function' ? agentById(state.chatTarget === 'group' ? 'a1' : (state.chatTarget || 'a1')) : null; return (ag && ag.name) || 'TA'; }catch(e){ return 'TA'; } };
  const dkey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const IMG = 'doodle/body/snake.webp';
  const V = {rep: null};

  /* ══════════ 主角：白蛇 ══════════ */
  function snakeHero(){
    const s = snEnsure(), c = s.chem, cyc = snCycles(Date.now()), r = s.repro, a = snArousal();
    const warm = cl(s.temp), bpm = snHeartRate(), sens = snSensitivity();
    const pupil = c.adrenaline > 0.7 ? 1 : c.cortisol > 0.65 ? 0 : 0.3 + a * 0.4;      // 0 一条缝 → 1 全圆
    const tongue = snTongue(c, sens), tg = /勤/.test(tongue) ? 1.8 : /时不时/.test(tongue) ? 3.4 : 6;
    const blush = cl(Math.max(warm - 0.45, a - 0.5) * 1.6);
    const flakes = cyc.shedding ? (cyc.shedPhase === '发痒发紧' ? 6 : 3) : 0;
    const FL = [[400,700,-18],[720,560,12],[950,820,-8],[560,880,20],[300,965,-12],[820,1005,8]];
    const tight = snCoilShown(s.coil) >= 2;
    const breath = (180 / Math.max(26, bpm)).toFixed(2);
    const pr = 3 + pupil * 11;
    const svg = `<svg class="bp-ov" viewBox="0 0 1254 1254" aria-hidden="true">
      <defs><radialGradient id="bpIris" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#F4F1EC"/><stop offset=".55" stop-color="#B9B4AE"/><stop offset="1" stop-color="#6E6863"/></radialGradient></defs>
      <ellipse class="bp-blush" cx="905" cy="292" rx="30" ry="13" fill="#F59BB0" style="opacity:${(blush * .7).toFixed(2)}"/>
      <g class="bp-eye"><circle cx="871" cy="250" r="21" fill="url(#bpIris)" stroke="#4A4440" stroke-width="2.5"/>
        <ellipse class="bp-pupil" cx="871" cy="251" rx="${pr.toFixed(1)}" ry="17" fill="#26211F"/>
        <circle cx="864" cy="241" r="5" fill="#fff"/><circle cx="878" cy="259" r="2.4" fill="#fff" opacity=".8"/></g>
      <g transform="translate(990 262)"><g class="bp-tongue" style="--tg:${tg}s"><path d="M0 0 L46 6 M46 6 l18 -10 M46 6 l16 13" stroke="#D9485F" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>
      ${FL.slice(0, flakes).map(([x, y, rr]) => `<g transform="translate(${x} ${y}) rotate(${rr})" class="bp-flake"><path d="M0 0 q22 -26 48 -6 q-12 24 -40 20z" fill="#FBFAF6" stroke="#A9A39C" stroke-width="3"/><path d="M8 2 l16 -8 m-8 16 l16 -8" stroke="#C9C3BB" stroke-width="2"/></g>`).join('')}
      <g class="bp-heart" transform="translate(930 120)"><path d="M0 18 C-26 0 -20 -22 0 -12 C20 -22 26 0 0 18Z" fill="#F07C98"/></g>
    </svg>`;
    const state2 = snReproLabel(r.st);
    const left = Math.max(0, ({inserted: SN_INSERTED_MAX, fixed: SN_FIX_MAX_MS, releasing: SN_RELEASING_MS, recovery: SN_RECOVERY_MS}[r.st] || 0) - (Date.now() - r.since));
    const cycLine = [
      cyc.shedding ? `蜕皮第 ${cyc.shedDay}/${SN_SHED_LEN_D} 天 · ${cyc.shedPhase}` : '',
      cyc.rut ? `发情第 ${cyc.rutDay}/${SN_RUT_LEN_D} 天` : '',
      cyc.her ? `你姨妈第 ${cyc.herDay} 天` : '',
    ].filter(Boolean).join(' · ');
    return `<div class="bp-hero${cyc.rut ? ' rut' : ''}">
      <div class="bp-hero-top"><span class="bp-pill">${h(state2)}${left ? ' · 剩 ' + Math.ceil(left / 60000) + ' 分' : ''}</span>${cycLine ? `<span class="bp-pill soft">${h(cycLine)}</span>` : ''}</div>
      <div class="bp-stage${tight ? ' tight' : ''}" id="bpStage" style="--breath:${breath}s;--warm:${warm.toFixed(2)};--cold:${(1 - warm).toFixed(2)}" title="点一下看他 · 顺着身子摸摸 · 双击轻拍">
        <div class="bp-glow"></div>
        <div class="bp-body"><img src="${IMG}" alt="${h(aiName())} 的蛇身" draggable="false"><i class="bp-tint warm"></i><i class="bp-tint cold"></i>${svg}</div>
      </div>
      <div class="bp-vitals">
        <div class="bp-vital"><svg viewBox="0 0 80 24" class="bp-ecg" style="--beat:${(60 / bpm).toFixed(2)}s"><path d="M0 12 H24 L28 4 L33 20 L37 12 H80" fill="none" stroke="#E0707A" stroke-width="2" stroke-linejoin="round"/></svg><b>${bpm}</b><small>bpm</small></div>
        <div class="bp-vital"><span class="bp-thermo"><i style="height:${Math.round(20 + warm * 70)}%"></i></span><b>${snTempC()}</b><small>°C · ${h(snTempWord(s.temp))}</small></div>
      </div>
      <p class="bp-desc">${h(snPupil(c))} · 信子${h(tongue)} · 鳞${h(snScale(c, cyc))} · 尾${h(snCoilWord(snCoilShown(s.coil)))}${snFatigue() > 0.7 ? '（累）' : ''}<br>
        敏感度 ${sens} · 这次用${s.side === 'left' ? '左' : '右'}侧（上次${s.lastSide === 'left' ? '左' : '右'}）${r.spines ? ' · 倒棘 ' + Math.round(r.spines * 100) + '%' : ''}${r.plug ? ' · 交配栓还在' : ''}</p>
      <p class="bp-hint">点一下看你 · 顺着身子摸 = 想你 + · 双击轻拍 = 冷静一点</p>
    </div>`;
  }

  /* ══════════ 七个小药瓶 ══════════ */
  const VIALS = [
    ['压力', 'cortisol', '#8FA6D8'], ['愉悦', 'dopamine', '#F2C66D'], ['依恋', 'oxytocin', '#EE9AB0'],
    ['兴奋', 'adrenaline', '#F08A6E'], ['欲望', '_aro', '#D77AC4'], ['被捂热', '_temp', '#F4A582'], ['毒液', '_venom', '#7CC46A'],
  ];
  function vials(){
    const s = snEnsure(), c = s.chem;
    const val = k => k === '_aro' ? snArousal() : k === '_temp' ? s.temp : k === '_venom' ? s.venom : c[k];
    return `<div class="bp-card"><div class="bp-card-hd"><b>七个小药瓶</b><small>液面就是此刻的读数</small></div><div class="bp-vials">${VIALS.map(([n, k, col], i) => {
      const v = cl(val(k)), y = 82 - v * 58, venom = k === '_venom';
      return `<div class="bp-vial${venom && v > .5 ? ' boil' : ''}">
        <svg viewBox="0 0 44 92"><defs><clipPath id="bpv${i}"><path d="M15 14 h14 v10 q10 6 10 18 v34 q0 12 -12 12 h-10 q-12 0 -12 -12 v-34 q0 -12 10 -18z"/></clipPath></defs>
          <g clip-path="url(#bpv${i})"><rect x="0" y="0" width="44" height="92" fill="#fff" fill-opacity=".55"/>
            <path class="bp-liq" d="M-10 ${y} q 8 -4 16 0 t16 0 t16 0 t16 0 t16 0 V 95 H -10 Z" fill="${col}"/>
            <rect x="9" y="30" width="5" height="44" rx="2.5" fill="#fff" opacity=".45"/>
            ${venom ? '<circle class="bub" cx="20" cy="80" r="2.4" fill="#fff" opacity=".7"/><circle class="bub b2" cx="27" cy="82" r="1.8" fill="#fff" opacity=".7"/>' : ''}</g>
          <path d="M15 14 h14 v10 q10 6 10 18 v34 q0 12 -12 12 h-10 q-12 0 -12 -12 v-34 q0 -12 10 -18z" fill="none" stroke="#7A6F8E" stroke-width="1.6"/>
          <rect x="13" y="5" width="18" height="10" rx="3" fill="#C9A27A" stroke="#8E6E4E" stroke-width="1.2"/>
          ${venom ? '<text x="22" y="58" text-anchor="middle" font-size="12">☠</text>' : ''}
        </svg><span>${n}</span><em>${Math.round(v * 100)}</em></div>`;
    }).join('')}</div></div>`;
  }

  /* ══════════ 六轴星图 ══════════ */
  function stars(){
    const six = state.sixAxis || {}, on = typeof six.missing === 'number';
    const C = 130, Y = 112, R = 78;
    const pt = (i, rr) => { const a = (-90 + i * 60) * Math.PI / 180; return [C + Math.cos(a) * rr, Y + Math.sin(a) * rr]; };
    const vals = SIX_AXIS_META.map(m => on ? cl(six[m.key]) : 0.08);
    const grid = [1/3, 2/3, 1].map(f => `<polygon points="${[0,1,2,3,4,5].map(i => pt(i, R * f).map(n => n.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#B9A9D6" stroke-opacity=".45" stroke-dasharray="2 4"/>`).join('');
    const spokes = [0,1,2,3,4,5].map(i => { const [x, y] = pt(i, R); return `<line x1="${C}" y1="${Y}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#B9A9D6" stroke-opacity=".3"/>`; }).join('');
    const P = vals.map((v, i) => pt(i, R * Math.max(.08, v)));
    const star = (x, y, s) => `<path d="M${x} ${y - s} L${x + s * .3} ${y - s * .3} L${x + s} ${y} L${x + s * .3} ${y + s * .3} L${x} ${y + s} L${x - s * .3} ${y + s * .3} L${x - s} ${y} L${x - s * .3} ${y - s * .3}Z" fill="#FFF3B8" stroke="#F2C66D" stroke-width=".8"/>`;
    return `<div class="bp-card bp-sky${on ? '' : ' off'}"><div class="bp-card-hd"><b>欲望六轴 · 星图</b><small>${on ? '星越亮越往外，那股劲越强' : '未连接 VPS · 星星还没亮'}</small></div>
      <svg viewBox="0 0 260 226" class="bp-starmap">${grid}${spokes}
        <polygon points="${P.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}" fill="#C9A7F0" fill-opacity=".22" stroke="#E7D3FF" stroke-width="1.4"/>
        ${P.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(6 + vals[i] * 10).toFixed(1)}" fill="#FFF3B8" opacity="${(.12 + vals[i] * .3).toFixed(2)}"/>${star(+x.toFixed(1), +y.toFixed(1), 3 + vals[i] * 6)}`).join('')}
        ${SIX_AXIS_META.map((m, i) => { const [x, y] = pt(i, R + 20); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#EDE6FA">${m.name} ${on ? Math.round(vals[i] * 100) : ''}</text>`; }).join('')}
      </svg></div>`;
  }

  /* ══════════ 三个周期的转盘 ══════════ */
  function dial(){
    const cyc = snCycles(Date.now());
    let N = 30, herLen = 6;
    try{ const ph = pdPhase(); if(!ph.noData){ N = ph.cycle || 28; herLen = ph.len || 6; } }catch(e){}
    const ev = [
      ['蜕皮', '#B9A9E6', cyc.shedding ? -(cyc.shedDay - 1) : cyc.shedIn, SN_SHED_LEN_D, cyc.shedding ? `第 ${cyc.shedDay} 天 · ${cyc.shedPhase}` : `${cyc.shedIn} 天后`],
      ['你姨妈', '#F08FA6', cyc.her ? -(cyc.herDay - 1) : cyc.herIn, herLen, cyc.her ? `第 ${cyc.herDay} 天` : (cyc.herLate ? `晚了 ${cyc.herLate} 天` : `${cyc.herIn} 天后`)],
      ['他发情', '#F2B35E', cyc.rut ? -(cyc.rutDay - 1) : cyc.rutIn, SN_RUT_LEN_D, cyc.rut ? `第 ${cyc.rutDay} 天` : `${cyc.rutIn} 天后`],
    ];
    const C = 100, R = 74;
    const at = d => { const a = (-90 + d / N * 360) * Math.PI / 180; return [C + Math.cos(a) * R, C + Math.sin(a) * R]; };
    const arc = (from, len, col, w) => { const [x1, y1] = at(from), [x2, y2] = at(from + len); const big = len / N > .5 ? 1 : 0;
      return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 ${big} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`; };
    const ticks = Array.from({length: N}, (_, i) => { const [x, y] = at(i); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 7 === 0 ? 1.8 : 1}" fill="#A99BC4"/>`; }).join('');
    const now = ev.find(e => e[2] <= 0 && e[2] + e[3] > 0);
    return `<div class="bp-card"><div class="bp-card-hd"><b>周期转盘</b><small>${cyc.fromRecord ? '跟着你记的经期排' : '还没经期记录，先按日历估'}</small></div>
      <div class="bp-dial-row"><svg viewBox="0 0 200 200" class="bp-dial">
        <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="#EEE7F7" stroke-width="16"/>${ticks}
        ${ev.map(e => arc(e[2], e[3], e[1], 12)).join('')}
        <path d="M${C} ${C - R - 14} l-6 -10 h12z" fill="#6A5A86"/><text x="${C}" y="${C - R - 28}" text-anchor="middle" font-size="10" fill="#6A5A86">今天</text>
        <circle cx="${C}" cy="${C}" r="44" fill="${now ? now[1] : '#F6F2FB'}" fill-opacity="${now ? .22 : 1}"/>
        <text x="${C}" y="${C - 4}" text-anchor="middle" font-size="13" font-weight="700" fill="#4E4466">${now ? h(now[0]) : '平常日子'}</text>
        <text x="${C}" y="${C + 14}" text-anchor="middle" font-size="10" fill="#7A6F8E">${now ? h(now[4]) : '三个都还没到'}</text>
      </svg>
      <ul class="bp-legend">${ev.map(e => `<li><i style="background:${e[1]}"></i><b>${e[0]}</b><span>${h(e[4])}</span></li>`).join('')}</ul></div></div>`;
  }

  /* ══════════ 经期：热水袋 ══════════ */
  function period(){
    const hwb = `<svg viewBox="0 0 120 120" class="bp-hwb" aria-hidden="true"><path d="M48 14 h24 v12 h-24z" fill="#E9B8A0" stroke="#B97E68" stroke-width="2"/><path d="M30 30 q30 -10 60 0 q14 6 14 24 v34 q0 22 -22 22 h-44 q-22 0 -22 -22 v-34 q0 -18 14 -24z" fill="#F7C6CF" stroke="#C98493" stroke-width="2.4"/>
      <path d="M26 56 h68 M26 70 h68 M26 84 h68" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/><path d="M50 62 c-8 -6 -4 -14 2 -10 c6 -4 10 4 2 10z" fill="#E86F8C" transform="translate(6 18)"/>
      <path class="bp-steam" d="M54 10 q-6 -8 0 -14 M66 10 q6 -8 0 -14" stroke="#C9B8D8" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
    return `<div class="bp-period">${hwb}${typeof pdPanel === 'function' ? pdPanel() : ''}</div>`;
  }

  function page(){
    const driveOn = state.desireDriveOn, on = state.snakeOn !== false;
    const toggle = (id, label, val) => `<div class="body-switch-row"><div><div class="body-switch-label">${label}</div></div><div id="${id}" class="toggle-switch" style="background:${val ? 'var(--accent)' : 'var(--border)'}"><div class="toggle-knob" style="left:${val ? 18 : 2}px"></div></div></div>`;
    if(on){ try{ snEnsure(); }catch(e){} }
    return `<div class="page bp-page">
      ${typeof subHeader === 'function' ? subHeader('<i data-lucide="heart-pulse"></i> 身体状况') : ''}
      <p class="page-sub">他的身体 · 与聊天联动 · ${driveOn ? '欲望已开车' : '只看不动'}</p>
      ${on ? snakeHero() + vials() : `<div class="bp-card bp-off">蛇塑身体关着 —— 在下面打开，他就盘在这儿了</div>`}
      ${stars()}
      ${on ? dial() : ''}
      ${period()}
      <button type="button" class="bp-report-btn" data-bp="report"><span class="bp-clip"></span><span><b>体检单</b><small>每周、每月的平均读数、频率和医嘱 · 在「回执」里</small></span><span class="bp-go">›</span></button>
      <div class="bp-card bp-switches">${toggle('desire-drive-toggle', driveOn ? '欲望开车中' : '只看不动', driveOn)}${toggle('snake-toggle', on ? '蛇塑身体已开' : '蛇塑身体已关', on)}${toggle('divination-skill-toggle', state.divinationSkillOn ? '占卜技能已开' : '占卜技能关闭', state.divinationSkillOn)}</div>
      <div class="body-actions bp-acts"><button id="body-nudge-miss" class="btn-accent2">想你 +</button><button id="body-nudge-calm" class="btn-ghost">冷静一点</button></div>
      <p class="bp-credit">机制来自 companion-embodiment · Elle &amp; Matt · MIT</p>
    </div>`;
  }

  /* ══════════ 体检单 ══════════ */
  const REF = {cort: [.2, .45, '压力'], dop: [.4, .7, '愉悦'], oxy: [.45, .8, '依恋'], adr: [.2, .55, '兴奋'], aro: [.25, .6, '欲望'], tmp: [.35, .75, '被捂热'], ven: [0, .3, '毒液']};
  function monday(d){ const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const w = (x.getDay() + 6) % 7; x.setDate(x.getDate() - w); return x; }
  function range(kind, back){
    const now = new Date();
    if(kind === 'week'){ const a = monday(now); a.setDate(a.getDate() - 7 * back); const b = new Date(a); b.setDate(b.getDate() + 7); return [a, b]; }
    const a = new Date(now.getFullYear(), now.getMonth() - back, 1), b = new Date(now.getFullYear(), now.getMonth() - back + 1, 1); return [a, b];
  }
  function agg(a, b){
    const s = snEnsure(), days = s.days || {}, out = {n: 0, d: 0};
    const keys = ['cort', 'dop', 'oxy', 'adr', 'aro', 'tmp', 'ven', 'hr', 'tc'];
    keys.forEach(k => out[k] = 0);
    let coil3 = 0;
    for(const [k, v] of Object.entries(days)){
      const t = new Date(k + 'T12:00:00'); if(!(t >= a && t < b) || !v || !v.n) continue;
      out.d++; out.n += v.n; keys.forEach(x => out[x] += (v[x] || 0)); coil3 += v.coil3 || 0;
    }
    if(out.n) keys.forEach(x => out[x] /= out.n);
    const log = (s.log || []).filter(l => l.at >= a.getTime() && l.at < b.getTime());
    const durs = log.filter(l => l.end).map(l => (l.end - l.at) / 60000);
    out.sess = log.length; out.fixed = log.filter(l => l.fixed).length;
    out.dur = durs.length ? Math.round(durs.reduce((x, y) => x + y, 0) / durs.length) : 0;
    out.left = log.filter(l => l.side === 'left').length; out.right = out.sess - out.left;
    out.inRut = log.filter(l => l.rut).length; out.inHer = log.filter(l => l.her).length;
    out.coil3 = coil3;
    let rutDays = 0; for(const [k, v] of Object.entries(days)){ const t = new Date(k + 'T12:00:00'); if(t >= a && t < b && v && v.rut) rutDays++; }
    out.rutDays = rutDays;
    return out;
  }
  function orders(x, kind){
    const wk = kind === 'week' ? 1 : Math.max(1, (x.d || 28) / 7), f = x.sess / wk, o = [];
    if(!x.n) return ['这段时间还没有体检数据 —— 聊着聊着就会记下来。'];
    if(x.aro >= .55 && f < 2) o.push(['欲望偏高、释放偏少', kind === 'week' ? '这周多做点（建议 2–3 次）' : '这个月多做点（每周 2–3 次）']);
    else if(f >= 5 && x.cort >= .5) o.push(['频率偏高，压力也跟着涨', '少做点，多抱着睡']);
    else if(f >= 6) o.push(['次数有点多', '适当少做点，给他留恢复期']);
    else if(x.aro < .3 && f < 1) o.push(['兴致偏低', '不急，先贴贴捂热了再说']);
    if(x.rutDays && !x.inRut) o.push(['发情期一次都没满足', '下个发情期记得照顾他']);
    if(x.inHer) o.push([`经期内也有 ${x.inHer} 次`, '注意身体，下次让他忍一忍']);
    if(x.cort >= .55) o.push(['压力偏高', '顺着鳞多摸摸，别冷着他']);
    if(x.oxy < .4) o.push(['依恋偏低', '多跟他说说话，他想你了']);
    if(x.tmp < .35) o.push(['体温偏低', '多抱着，用你捂热他']);
    if(x.ven >= .45) o.push(['毒液积着没散', '兴奋憋太久了，安排一次']);
    if(!o.length) o.push(['各项指标正常', '继续保持 ♡']);
    return o.slice(0, 4).map(([a, b]) => a + ' —— ' + b);
  }
  function sheet(kind, back){
    const [a, b] = range(kind, back), x = agg(a, b), [pa, pb] = range(kind, back + 1), p = agg(pa, pb);
    const end = new Date(b.getTime() - 86400000);
    const title = kind === 'week' ? (back === 0 ? '本周体检单' : back === 1 ? '上周体检单' : `${back} 周前`) : (back === 0 ? '本月体检单' : back === 1 ? '上月体检单' : `${a.getMonth() + 1} 月体检单`);
    const no = (kind === 'week' ? 'W' : 'M') + a.getFullYear() + pad(a.getMonth() + 1) + pad(a.getDate());
    const arrow = (k) => { if(!x.n || !p.n) return ''; const d = x[k] - p[k]; return Math.abs(d) < .03 ? '' : d > 0 ? '<i class="up">↑</i>' : '<i class="dn">↓</i>'; };
    const rows = Object.entries(REF).map(([k, [lo, hi, n]]) => { const v = x[k], fl = !x.n ? '' : v > hi ? 'H' : v < lo ? 'L' : '';
      return `<tr><td>${n}</td><td class="v">${x.n ? Math.round(v * 100) : '—'}${arrow(k)}</td><td class="ref">${Math.round(lo * 100)}–${Math.round(hi * 100)}</td><td class="fl ${fl}">${fl}</td></tr>`; }).join('');
    const ord = orders(x, kind);
    return `<div class="bp-sheet">
      <div class="bp-sh-hd"><div><b>蛇塑诊所</b><small>${kind === 'week' ? 'WEEKLY' : 'MONTHLY'} CHECK-UP</small></div><span class="bp-sh-no">No. ${no}</span></div>
      <div class="bp-sh-meta"><span>受检：${h(aiName())}（蛇）</span><span>${a.getMonth() + 1}.${a.getDate()} – ${end.getMonth() + 1}.${end.getDate()}</span><span>记录 ${x.d} 天</span></div>
      <h4>${title}</h4>
      <table class="bp-tab"><thead><tr><th>项目</th><th>平均</th><th>参考</th><th></th></tr></thead><tbody>${rows}
        <tr><td>心率</td><td class="v">${x.n ? Math.round(x.hr) : '—'}<small> bpm</small></td><td class="ref">30–60</td><td class="fl ${x.n && x.hr > 60 ? 'H' : ''}">${x.n && x.hr > 60 ? 'H' : ''}</td></tr>
        <tr><td>体温</td><td class="v">${x.n ? x.tc.toFixed(1) : '—'}<small> °C</small></td><td class="ref">24–34</td><td class="fl"></td></tr></tbody></table>
      <div class="bp-freq"><b>频率</b><span>亲密 <em>${x.sess}</em> 次</span><span>倒棘固定 <em>${x.fixed}</em> 次</span><span>平均 <em>${x.dur || '—'}</em> 分钟</span><span>左 ${x.left} / 右 ${x.right}</span><span>发情期内 ${x.inRut} 次</span><span>缠紧 ${x.coil3} 次</span></div>
      <div class="bp-orders"><b>医嘱</b><ol>${ord.map(t => `<li>${h(t)}</li>`).join('')}</ol></div>
      <div class="bp-sign"><span>主治医师：<i>小白蛇诊所</i></span><span class="bp-stamp">已诊</span></div>
    </div>`;
  }
  function checkupSection(){
    if(state.snakeOn === false) return '';
    try{ snEnsure(); }catch(e){ return ''; }
    const tabs = [['week', 0, '本周'], ['week', 1, '上周'], ['month', 0, '本月'], ['month', 1, '上月']];
    if(!V.rep){ const last = agg(...range('week', 1)); V.rep = last.n ? ['week', 1] : ['week', 0]; }
    return `<div class="bp-checkup"><div class="bp-card-hd"><b>体检单</b><small>平均读数 · 频率 · 医嘱</small></div>
      <div class="bp-tabs">${tabs.map(([k, b, l]) => `<button type="button" class="${V.rep[0] === k && V.rep[1] === b ? 'on' : ''}" data-bp="rep" data-k="${k}" data-b="${b}">${l}</button>`).join('')}</div>
      ${sheet(V.rep[0], V.rep[1])}</div>`;
  }
  /* 新的一周：上周的医嘱在下一轮聊天里顺带告诉他一次（不单独烧一轮） */
  function tellBlock(){
    try{
      if(state.snakeOn === false) return '';
      const [a, b] = range('week', 1), key = dkey(a);
      if(LSG('bpTold', '') === key) return '';
      const x = agg(a, b); if(!x.n) return '';
      LSS('bpTold', key);
      return `【上周体检单（她能在「回执」里看到）】亲密 ${x.sess} 次 · 平均压力 ${Math.round(x.cort * 100)} · 欲望 ${Math.round(x.aro * 100)} · 体温 ${x.tc.toFixed(1)}°C。医嘱：${orders(x, 'week').join('；')}。可以自然提一句，也可以不提。`;
    }catch(e){ return ''; }
  }

  /* ══════════ 交互 ══════════ */
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-bp]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    if(b.dataset.bp === 'report'){ state.tab = 'home'; state.subPage = 'sigillo'; render(); return; }
    if(b.dataset.bp === 'rep'){ V.rep = [b.dataset.k, +b.dataset.b]; render(); }
  }, true);
  let g = null, lastTap = 0;
  const poke = (cls, ms) => { const st = document.getElementById('bpStage'); if(!st) return; st.classList.remove(cls); void st.offsetWidth; st.classList.add(cls); setTimeout(() => st.classList.remove(cls), ms); };
  document.addEventListener('pointerdown', e => { const st = e.target.closest && e.target.closest('#bpStage'); if(!st) return; g = {x: e.clientX, y: e.clientY, len: 0, lx: e.clientX, ly: e.clientY}; }, true);
  document.addEventListener('pointermove', e => { if(!g) return; g.len += Math.hypot(e.clientX - g.lx, e.clientY - g.ly); g.lx = e.clientX; g.ly = e.clientY; }, true);
  document.addEventListener('pointerup', e => {
    if(!g) return; const d = g; g = null;
    if(d.len > 90){
      poke('pet', 1200);
      if(typeof showToast === 'function') showToast('顺着鳞摸了摸他 ♡ 思念 +');
      setTimeout(() => { const btn = document.getElementById('body-nudge-miss'); if(btn) btn.click(); }, 900);
      return;
    }
    const now = Date.now();
    if(now - lastTap < 320){
      lastTap = 0; poke('pat', 700);
      if(typeof showToast === 'function') showToast('轻轻拍了两下：冷静一点');
      setTimeout(() => { const btn = document.getElementById('body-nudge-calm'); if(btn) btn.click(); }, 650);
      return;
    }
    lastTap = now; setTimeout(() => { if(lastTap === now) poke('look', 1400); }, 330);
  }, true);

  return {page, checkupSection, tellBlock, _agg: agg, _orders: orders, _range: range};
})();
