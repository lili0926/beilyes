/* 钱包 → 小鱼干计算器（所有界面壳通用）
 * 用她生的那台水晶计算器（doodle/calc/calculator.webp，摆正了 12°），按键是盖在图上的透明按钮。
 *   数字 / . 输入金额（. 当「00」用）
 *   ＋  转给他          －  从他那儿扣掉（没收）        ×  翻倍          ÷  看小票（展开流水）
 *   +/- 清零          %   看余额 / 看输入            √  退格
 *   左边三颗糖：♥ +10  ★ +50  ♥ +20（直接加到输入上）   ✦  去糖果铺
 * 屏幕平时显示他的余额；每转一笔、扣一笔、他兑换一样东西，上面那卷小票就打出一行。 */
const CalcWallet = (() => {
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = n => String(n).padStart(2, '0');
  const IMG = 'doodle/calc/calculator.webp';
  const V = {buf: '', mode: 'bal', flash: '', tape: false, last: null};
  /* 按键位置（占图片宽高的百分比：中心 x, 中心 y, 宽, 高） */
  const KEYS = [
    ['clr', 40, 40, 10, 7, '清零'], ['bal', 50.5, 40, 10, 7, '余额'], ['bs', 60.5, 40, 10, 7, '退格'], ['tape', 72.5, 40, 11, 7, '小票'],
    ['7', 40, 48.5, 10, 7], ['8', 50.5, 48.5, 10, 7], ['9', 61, 48.5, 10, 7], ['x2', 73, 48.5, 11, 7, '翻倍'],
    ['4', 40, 56.5, 10, 7], ['5', 51, 56.5, 10, 7], ['6', 61.5, 56.5, 10, 7], ['minus', 74, 56.5, 11, 7, '扣掉'],
    ['1', 40.5, 65.5, 10, 7], ['2', 51.5, 65.5, 10, 7], ['3', 62, 65.5, 10, 7], ['plus', 75.5, 69, 11, 19, '转给他'],
    ['0', 47, 75, 20, 7], ['00', 64, 75, 10, 7],
    ['q10', 28, 47.5, 10, 7, '+10'], ['q50', 28, 56.5, 10, 8, '+50'], ['q20', 28, 65.5, 10, 7, '+20'], ['shop', 30, 75, 10, 7, '糖果铺'],
  ];
  const unit = () => (typeof walletUnit === 'function' ? walletUnit() : '🐟');
  const W = () => (typeof ensureWallet === 'function' ? ensureWallet() : {balance: 0, ledger: []});
  const amt = () => Math.min(99999999, parseInt(V.buf || '0', 10) || 0);

  function screen(){
    const w = W();
    if(V.flash) return {lab: V.flashLab || '', num: V.flash};
    if(V.mode === 'in' && V.buf) return {lab: '输入', num: Number(V.buf).toLocaleString('en-US')};
    return {lab: '他的余额', num: Number(w.balance || 0).toLocaleString('en-US')};
  }
  function ts(t){ const d = new Date(t); return isNaN(d) ? '' : `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function tape(){
    const L = (W().ledger || []).slice(0, V.tape ? 60 : 5).reverse();       // 最新的一行在最下面，刚从计算器里吐出来
    const rows = L.map((e, i) => `<li class="${e.amount > 0 ? 'in' : 'out'}${V.last && e.id === V.last ? ' fresh' : ''}"><span class="a">${e.amount > 0 ? '+' : '−'}${Math.abs(e.amount)}</span><span class="n">${h(e.note || '')}</span><span class="t">${ts(e.time)}</span></li>`).join('');
    return `<div class="cw-tape${V.tape ? ' open' : ''}" data-cw="tape" title="${V.tape ? '收起小票' : '展开小票'}">
      <div class="cw-tape-paper"><div class="cw-tape-hd">小鱼干 · 流水 <small>${(W().ledger || []).length} 笔</small></div>
      ${rows ? `<ol>${rows}</ol>` : '<p class="cw-tape-empty">还没有打过小票</p>'}
      <div class="cw-tape-ft">${V.tape ? '— 收起 —' : '— 点开看完整小票 —'}</div></div></div>`;
  }
  function top(){
    const s = screen();
    return `<div class="cw">
      ${tape()}
      <div class="cw-body">
        <img src="${IMG}" alt="小鱼干计算器" draggable="false">
        <div class="cw-lcd"><span class="cw-lab">${h(s.lab)}</span><span class="cw-num">${h(s.num)}</span><span class="cw-unit">${h((W().symbol) || '🐟')}</span></div>
        ${KEYS.map(([k, x, y, w, hh, tip]) => `<button type="button" class="cw-key" data-cw="k" data-k="${k}" style="left:${x - w / 2}%;top:${y - hh / 2}%;width:${w}%;height:${hh}%" aria-label="${h(tip || k)}">${tip ? `<i class="cw-tip">${h(tip)}</i>` : ''}</button>`).join('')}
      </div>
      <details class="cw-help"><summary>按键说明</summary>
        <p><b>＋</b> 转给他 · <b>－</b> 从他那儿扣掉 · <b>×</b> 翻倍 · <b>÷</b> 看小票<br><b>+/-</b> 清零 · <b>%</b> 看余额 · <b>√</b> 退格 · <b>.</b> 当 00 用<br>左边 <b>♥</b> +10 · <b>★</b> +50 · <b>♥</b> +20 · <b>✦</b> 去糖果铺</p></details>
    </div>`;
  }

  /* 按下：一点亮光 + 一声轻响 */
  let actx = null;
  function tick(hi){
    try{ actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = hi ? 1320 : 880; g.gain.setValueAtTime(.07, actx.currentTime); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + .09);
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + .1); }catch(e){}
  }
  function flash(num, lab, ms){ V.flash = num; V.flashLab = lab; clearTimeout(V._ft); V._ft = setTimeout(() => { V.flash = ''; V.mode = 'bal'; paint(); }, ms || 1600); }
  /* 只重画计算器这一块，不整页重绘 */
  function paint(){
    const el = document.querySelector('.cw'); if(!el){ return; }
    const tmp = document.createElement('div'); tmp.innerHTML = top(); el.replaceWith(tmp.firstElementChild);
  }
  function press(k){
    const isNum = /^\d$/.test(k);
    if(isNum || k === '00'){ if(V.buf.length < 8){ V.buf = (V.buf === '0' ? '' : V.buf) + k; V.buf = V.buf.replace(/^0+(?=\d)/, ''); } V.mode = 'in'; V.flash = ''; tick(); paint(); return; }
    if(/^q(\d+)$/.test(k)){ V.buf = String(amt() + (+k.slice(1))); V.mode = 'in'; V.flash = ''; tick(true); paint(); return; }
    if(k === 'clr'){ V.buf = ''; V.mode = 'bal'; V.flash = ''; tick(); paint(); return; }
    if(k === 'bs'){ V.buf = V.buf.slice(0, -1); V.mode = V.buf ? 'in' : 'bal'; tick(); paint(); return; }
    if(k === 'bal'){ V.mode = V.mode === 'bal' && V.buf ? 'in' : 'bal'; tick(); paint(); return; }
    if(k === 'x2'){ if(amt()){ V.buf = String(Math.min(99999999, amt() * 2)); V.mode = 'in'; } tick(); paint(); return; }
    if(k === 'tape'){ V.tape = !V.tape; tick(); paint(); return; }
    if(k === 'shop'){ tick(true); const s = document.querySelector('.dr-shop'); if(s) s.scrollIntoView({behavior: 'smooth', block: 'start'}); return; }
    if(k === 'plus' || k === 'minus'){
      const n = amt();
      if(!n){ flash('0', k === 'plus' ? '先按个数' : '扣多少？', 1200); tick(); paint(); return; }
      if(k === 'plus'){
        if(typeof walletTransfer === 'function' && walletTransfer(n, '计算器转账')) { const e = (W().ledger || [])[0]; V.last = e && e.id; }
        flash('+' + n.toLocaleString('en-US'), '转给他了', 1600);
      } else {
        const bal = W().balance || 0, m = Math.min(n, bal);
        if(!m){ flash('0', '他没得扣了', 1400); V.buf = ''; tick(); paint(); return; }
        if(typeof walletEntry === 'function'){ const e = walletEntry(-m, '被没收', 'me'); V.last = e && e.id; }
        flash('−' + m.toLocaleString('en-US'), m < n ? '扣光了' : '没收了', 1600);
      }
      V.buf = ''; tick(true); paint();
      const t = document.querySelector('.cw-tape li.fresh'); if(t){ t.classList.remove('fresh'); void t.offsetWidth; t.classList.add('fresh'); }
      return;
    }
  }
  document.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('.cw-key'); if(!b) return; b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 160); }, true);
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-cw]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    if(b.dataset.cw === 'k') press(b.dataset.k);
    else if(b.dataset.cw === 'tape'){ V.tape = !V.tape; paint(); }
  }, true);
  return {top, press, _V: V};
})();
