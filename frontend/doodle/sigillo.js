/* 回执 · 火漆封缄信（所有界面壳通用；数据和规则还是核心里的 Sigillo，这里只管外观和手感）
 *   没拆：米白信封，正中一枚深酒红火漆，印面是一条盘着的小蛇；他那句话用钢笔字写在信封上
 *   拆开：点一下 → 火漆裂成两半掉下去、信封盖翻开 → 回执单从信封里抽出来
 *   回执单：齿孔边的老式回执联，打星改成按火漆点，备注是红墨水
 *   封缄：按住「封缄」不放 → 一圈慢慢走满 → 火漆滴下来盖上 → 折成三折封好
 *   封好：折起来的信 + 火漆（压着日期）+ 他写的封缄语 + 这一单的平均星 */
const SigilloFx = (() => {
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let n = 0;
  /* 火漆：边缘不规则的一滩蜡 + 内圈 + 盘蛇印面 */
  /* 她生的那张真火漆图（doodle/sigillo/seal.webp）；加载失败才退回下面代码画的 */
  const IMG = 'doodle/sigillo/seal.webp';
  let imgOk = true;
  try{ const t = new Image(); t.onerror = () => { imgOk = false; }; t.src = IMG; }catch(e){}
  function seal(size, opt){
    opt = opt || {};
    if(imgOk){
      const id = 'sgw' + (++n);
      const date = opt.date ? `<svg class="sgx-date" viewBox="0 0 100 100" aria-hidden="true"><path id="${id}t" d="M50 50 m-37.5 0 a37.5 37.5 0 1 1 75 0" fill="none"/><text font-size="5.6" letter-spacing="1.1" dy="2" fill="#FFE1DC" opacity=".88" style="paint-order:stroke" stroke="#5A0D19" stroke-width=".6"><textPath href="#${id}t" startOffset="50%" text-anchor="middle">${h(opt.date)}</textPath></text></svg>` : '';
      return `<span class="sgx-seal sgx-img${opt.cls ? ' ' + opt.cls : ''}" style="width:${size}px;height:${size}px" aria-hidden="true"><img src="${IMG}" alt="" draggable="false" onerror="this.parentNode.classList.add('broken')">${date}</span>`;
    }
    const id = 'sgw' + (++n), r = 46;
    let d = '';
    for(let i = 0; i <= 28; i++){
      const a = i / 28 * Math.PI * 2, rr = r + Math.sin(i * 2.7) * 2.2 + Math.cos(i * 1.3) * 1.6;
      d += (i ? 'L' : 'M') + (50 + Math.cos(a) * rr).toFixed(1) + ' ' + (50 + Math.sin(a) * rr).toFixed(1);
    }
    const snake = `<path d="M50 70c-12 0-18-6-18-13s7-12 18-12 18-5 18-11-7-11-16-11c-6 0-10 2-12 5" fill="none" stroke="url(#${id}e)" stroke-width="5.2" stroke-linecap="round"/>
      <path d="M50 70c-12 0-18-6-18-13s7-12 18-12 18-5 18-11-7-11-16-11c-6 0-10 2-12 5" fill="none" stroke="#5E0F1C" stroke-opacity=".55" stroke-width="5.2" stroke-linecap="round" transform="translate(.9 1.2)" style="mix-blend-mode:multiply"/>
      <ellipse cx="38.5" cy="29.5" rx="4.6" ry="3.6" fill="url(#${id}e)" transform="rotate(-25 38.5 29.5)"/><circle cx="37.6" cy="28.8" r=".9" fill="#5E0F1C"/>
      <path d="M50 70c3 0 6 1 8 3" fill="none" stroke="url(#${id}e)" stroke-width="3" stroke-linecap="round"/>`;
    const date = opt.date ? `<path id="${id}t" d="M50 50 m-33 0 a33 33 0 1 1 66 0" fill="none"/><text font-size="7.2" letter-spacing="1.6" fill="#F6C7C3" opacity=".9"><textPath href="#${id}t" startOffset="50%" text-anchor="middle">${h(opt.date)}</textPath></text>` : '';
    return `<svg class="sgx-seal${opt.cls ? ' ' + opt.cls : ''}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
      <defs><radialGradient id="${id}g" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#C2394B"/><stop offset=".55" stop-color="#8E1A2B"/><stop offset="1" stop-color="#5A0D19"/></radialGradient>
        <linearGradient id="${id}e" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E97C86"/><stop offset="1" stop-color="#A3283A"/></linearGradient></defs>
      <path d="${d}Z" fill="url(#${id}g)"/>
      <path d="${d}Z" fill="none" stroke="#4A0A14" stroke-opacity=".35" stroke-width="1.4"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="#5E0F1C" stroke-opacity=".55" stroke-width="2"/>
      <circle cx="50" cy="50" r="30" fill="none" stroke="#E97C86" stroke-opacity=".45" stroke-width="1" transform="translate(-.6 -.8)"/>
      ${snake}${date}
      <ellipse cx="34" cy="26" rx="10" ry="5" fill="#fff" opacity=".18" transform="rotate(-30 34 26)"/>
    </svg>`;
  }
  const meName = () => { try{ return (state.coupleInfo && state.coupleInfo.myName) || 'you'; }catch(e){ return 'you'; } };
  /* 没拆的信封 */
  function envelope(id, note, act){
    return `<button type="button" class="sg-face sgx-env"${act ? ` data-sg-open="${h(id)}"` : ' disabled'}>
      <span class="sgx-env__back"></span>
      <span class="sgx-env__flap"></span>
      <span class="sgx-env__body"><span class="sgx-env__to">To ${h(meName())}</span><b class="sgx-env__note">${h(note || '请查收。')}</b><span class="sgx-env__hint">SIGILLO · 轻点拆开</span></span>
      <span class="sgx-env__seal"><span class="sgx-half l">${seal(60)}</span><span class="sgx-half r">${seal(60)}</span></span>
    </button>`;
  }
  /* 封好的信 */
  function folded(r, act){
    const fx = r.fixed || {}, vals = Object.values(fx).filter(v => v != null).map(v => Math.max(0, Math.min(5, Math.round(Number(v) / 10) / 2)));
    const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    const d = new Date(r.submitted_at || r.created_at || Date.now());
    const ds = isNaN(d) ? '' : `${d.getFullYear()} · ${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getDate()).padStart(2, '0')}`;
    return `<button type="button" class="sg-face sgx-fold"${act ? ` data-sg-view="${h(r.id)}"` : ' disabled'}>
      <span class="sgx-fold__paper"><i></i><i></i></span>
      <span class="sgx-fold__note">${h(r.sealed_note || '已回执。')}</span>
      <span class="sgx-fold__seal">${seal(72, {date: ds})}</span>
      <span class="sgx-fold__meta"><b>${avg ? '★ ' + avg.toFixed(1) : ''}</b>${ds ? `<span>封缄于 ${ds}</span>` : ''}<span>轻点展开回执</span></span>
    </button>`;
  }

  /* 拆信：先让火漆裂开、信封盖翻起来，再真的展开 */
  function openAnim(btn, done){
    if(!btn || btn.classList.contains('opening')){ done(); return; }
    btn.classList.add('opening');
    try{ navigator.vibrate && navigator.vibrate(10); }catch(e){}
    setTimeout(done, 760);
  }

  /* 按住封缄 */
  let hold = null;
  document.addEventListener('pointerdown', e => {
    const b = e.target && e.target.closest && e.target.closest('.sg-sealbtn[data-sg-seal]');
    if(!b || b.disabled) return;
    const card = b.closest('[data-sg-card]');
    b.classList.add('holding');
    hold = {b, card, t: setTimeout(() => {
      hold = null; b.classList.remove('holding'); b.dataset.sealed = '1';
      if(card) card.classList.add('sgx-stamping');
      try{ navigator.vibrate && navigator.vibrate([20, 40, 30]); }catch(_){}
      setTimeout(() => { try{ sgOnSeal(b.getAttribute('data-sg-seal')); }catch(_){} }, 1100);
    }, 950)};
  }, true);
  const cancel = () => { if(!hold) return; clearTimeout(hold.t); hold.b.classList.remove('holding'); hold = null; };
  document.addEventListener('pointerup', cancel, true);
  document.addEventListener('pointercancel', cancel, true);
  document.addEventListener('pointerleave', cancel, true);
  /** 单击封缄：不直接封，提示按住（核心的点击委托会先问这里） */
  function onSealClick(b){
    if(b && b.dataset.sealed === '1') return true;
    if(typeof showToast === 'function') showToast('按住「封缄」不放，等火漆滴下来');
    b && b.classList.remove('nudge'); void (b && b.offsetWidth); b && b.classList.add('nudge');
    return true;
  }
  /* 封缄动画用的那一大滴火漆，挂在回执单上 */
  function stampLayer(){ return `<span class="sgx-stamp-drop" aria-hidden="true">${seal(110)}</span>`; }
  const ringHtml = () => `<span class="sgx-ring" aria-hidden="true"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5"/></svg></span>`;

  return {seal, envelope, folded, openAnim, onSealClick, stampLayer, ringHtml};
})();
