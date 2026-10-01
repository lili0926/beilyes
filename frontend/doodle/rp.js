/* 星光涂鸦壳 · RP 快穿：梦境彩票 + 入梦聊天
 * 数据仍是原有 state.pr（worlds / active / archives），开始、发送、存档、读档都走原函数：
 * prStartNew / prSendUser / prQuickSave / prArchiveActive / prLoadArchive …
 * 这里只负责长相：大厅是一张可以刮开的彩票，进去以后是带巨大光圈的独立聊天。 */
const DoodleRP = (() => {
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ON = () => typeof state !== 'undefined' && state.uiShell === 'doodle';
  /* 这张票的状态只放内存：抽到哪个世界、刮开没有 */
  const T = {worldId:null, revealed:false, serial:0, fresh:false};
  const PAPERS = [['#FFF0F5','#F2A7C3'],['#EEF5FE','#8FBCEB'],['#F4EEFB','#CFA0E8'],['#FFF8EC','#E8C27A'],['#EEFAF4','#8CCFAE']];
  const tint = id => { let n = 7; String(id).split('').forEach(c => { n = (n*31 + c.charCodeAt(0)) | 0; }); return PAPERS[Math.abs(n) % PAPERS.length]; };
  const blurb = w => String(w.world || '').split(/\n+/).map(s => s.replace(/^[#·\-\s]*(世界[:：].*)?/, '').trim()).filter(s => s && !/^[一二三四五六七八九十]、/.test(s))[0] || '';
  const pix = (word, o) => (typeof DoodleShell !== 'undefined' && DoodleShell.pixelName) ? DoodleShell.pixelName(word, o) : '';

  function draw(){
    const pr = ensurePr(), ws = pr.worlds || []; if(!ws.length) return;
    let w; do{ w = ws[Math.floor(Math.random()*ws.length)]; }while(ws.length > 1 && w.id === T.worldId);
    T.worldId = w.id; T.revealed = false; T.serial = 100 + Math.floor(Math.random()*900); T.fresh = true;
  }
  function reveal(){
    if(!T.worldId) return;
    T.revealed = true; T.fresh = false;
    const pr = ensurePr(); pr.selectedWorldId = T.worldId; prSave();
  }

  function ticket(){
    const pr = ensurePr();
    const w = T.worldId ? (pr.worlds || []).find(x => x.id === T.worldId) : null;
    if(!w){
      return `<div class="ddrp-ticket blank"><div class="ddrp-stub"><span>DREAM</span><b>No.???</b></div>
        <div class="ddrp-tmain"><p class="ddrp-tq">今晚去哪个梦？</p><p class="ddrp-tsub">${(pr.worlds||[]).length} 个世界在等你抽中</p>
        <button type="button" class="ddrp-draw" data-ddrp="draw"><span data-doodle="sparkle" data-boil="on"></span>抽一张梦境彩票</button></div></div>`;
    }
    const [paper, ink] = tint(w.id), stages = w.stages || [];
    return `<div class="ddrp-ticket${T.fresh ? ' fresh' : ''}${T.revealed ? ' open' : ''}" style="--paper:${paper};--ink:${ink}">
      <div class="ddrp-stub"><span>DREAM</span><b>No.${T.serial}</b><i data-doodle="moon" data-boil="off"></i></div>
      <div class="ddrp-tmain">
        <div class="ddrp-prize">
          <small>今晚的梦</small>
          <h3>${h(w.name)}</h3>
          <p>${h(blurb(w).slice(0, 54))}${blurb(w).length > 54 ? '…' : ''}</p>
          <span class="ddrp-stamp">${stages.length} 幕</span>
        </div>
        ${T.revealed ? '' : `<canvas class="ddrp-scratch" id="ddrp-scratch" aria-label="刮开涂层"></canvas><button type="button" class="ddrp-peek" data-ddrp="reveal">一下刮开</button>`}
      </div>
    </div>
    ${T.revealed ? `<div class="ddrp-stages"><p class="ddrp-label">选一幕，入梦</p>${stages.map(s => `<button type="button" class="ddrp-stage" data-pr-start="${h(s.id)}"><b>第 ${h(s.id)} 幕</b><span>${h(s.name)}</span><small>${h(s.task)}</small><i data-doodle="forward" data-boil="hover"></i></button>`).join('')}
      <button type="button" class="ddrp-again" data-ddrp="draw">再抽一张</button></div>` : `<p class="ddrp-hint">用手指刮开银色涂层</p>`}`;
  }

  function hub(){
    const pr = ensurePr(), a = pr.active, ws = pr.worlds || [], arch = pr.archives || [];
    const editW = state.prEditWorldId ? ws.find(w => w.id === state.prEditWorldId) : null;
    const edit = editW ? `<div class="ddrp-card ddrp-edit"><p class="ddrp-label">编辑世界书 · ${h(editW.name)}</p>
      <input id="pr-edit-name" value="${h(editW.name)}">
      <textarea id="pr-edit-world" rows="8">${h(editW.world)}</textarea>
      <p class="ddrp-label">每一幕一行：名称|内容</p>
      <textarea id="pr-edit-stages" rows="5">${h((editW.stages||[]).map(s => s.name+'|'+s.task).join('\n'))}</textarea>
      <div class="ddrp-row"><button type="button" class="ddrp-btn main" id="pr-edit-save">保存</button><button type="button" class="ddrp-btn" id="pr-edit-cancel">取消</button></div></div>` : '';
    return `<div class="page ddrp">
      <div class="ddrp-aura" aria-hidden="true"><i></i><i></i></div>
      <header class="ddrp-head"><button type="button" class="ddrp-round" id="sub-back" aria-label="返回"><span data-doodle="back" data-boil="hover"></span></button>
        <img class="ddrp-px" alt="Dreams" src="${h(pix('Dreams'))}"><span class="ddrp-count">${ws.length} 个梦</span></header>
      ${a ? `<div class="ddrp-card ddrp-awake"><p class="ddrp-label"><span data-doodle="moon" data-boil="on"></span>梦还没醒</p>
        <h4>${h(a.worldName || '')} · ${h(a.stageName || '')}</h4><p class="ddrp-sum">${h((a.summary || '').slice(0, 90))}</p>
        <button type="button" class="ddrp-btn main wide" id="pr-resume">回到梦里</button>
        <div class="ddrp-row"><button type="button" class="ddrp-btn" id="pr-quick-save">先存个档</button><button type="button" class="ddrp-btn" id="pr-end">醒来 · 结束并存档</button></div></div>` : ''}
      ${ticket()}
      ${edit}
      <p class="ddrp-label sec">所有的梦</p>
      <div class="ddrp-strip">${ws.map(w => { const [paper, ink] = tint(w.id); return `<button type="button" class="ddrp-mini${w.id === T.worldId ? ' on' : ''}" data-ddrp-pick="${h(w.id)}" style="--paper:${paper};--ink:${ink}"><span>${h(w.name)}</span><small>${(w.stages||[]).length} 幕</small></button>`; }).join('')}</div>
      <div class="ddrp-row tools"><button type="button" class="ddrp-btn" id="pr-edit-open">编辑这张的世界书</button><button type="button" class="ddrp-btn" id="pr-add-world">＋ 自己写一个梦</button></div>
      <p class="ddrp-label sec">梦的存根 · ${arch.length}</p>
      ${arch.length ? arch.slice(0, 30).map(x => { const quick = x.slotType === 'quick'; const when = x.archivedAt ? (typeof formatTime === 'function' ? formatTime(x.archivedAt) : '') : '';
        return `<div class="ddrp-stubrow"><div class="ddrp-sr-top"><span class="ddrp-tag${quick ? ' quick' : ''}">${quick ? '续玩点' : '已醒来'}</span><b>${h(x.worldName || '')} · ${h(x.stageName || '')}</b></div>
          <small>${(x.messages||[]).length} 句${when ? ' · '+h(when) : ''} · ${h((x.summary || '').slice(0, 60))}</small>
          <div class="ddrp-row"><button type="button" class="ddrp-btn" data-pr-view="${h(x.id)}">回看</button><button type="button" class="ddrp-btn main" data-pr-load="${h(x.id)}">读档继续</button><button type="button" class="ddrp-btn danger" data-pr-del="${h(x.id)}">删除</button></div></div>`; }).join('')
        : '<p class="ddrp-empty">还没有做过的梦</p>'}
      ${panel()}
    </div>`;
  }

  /* 入梦后的独立聊天：大光圈 + 漂浮的字 */
  function panel(){
    if(!state.prOpen || state.prMin) return '';
    const a = ensurePr().active; if(!a) return '';
    const msgs = a.messages || [];
    const lines = msgs.map(m => `<div class="ddrp-line ${m.role === 'user' ? 'me' : 'ai'}"><p>${h(typeof prCleanText === 'function' ? prCleanText(m.content) : m.content)}</p></div>`).join('')
      || '<div class="ddrp-open"><span data-doodle="moon" data-boil="on"></span><p>闭上眼睛。</p><small>写下梦里的第一句话</small></div>';
    const waiting = msgs.length && msgs[msgs.length-1].role === 'user';
    return `<div class="ddrp-dream" role="dialog" aria-modal="true" aria-label="梦境">
      <div class="ddrp-sky" aria-hidden="true"><i class="r1"></i><i class="r2"></i><i class="r3"></i><i class="g1"></i><i class="g2"></i><b class="dust"></b></div>
      <header class="ddrp-dhead">
        <button type="button" class="ddrp-round glass" id="pr-close-btn" aria-label="收起梦境"><span data-doodle="back" data-boil="hover"></span></button>
        <div class="ddrp-dtitle"><b>${h(a.worldName || '梦')}</b><small>第 ${h(a.stage)} 幕 · ${h(a.stageName || '')}</small></div>
        <button type="button" class="ddrp-round glass" data-ddrp="save" aria-label="存个档并收起"><span data-doodle="bookmark" data-boil="hover"></span></button>
      </header>
      <div class="ddrp-msgs" id="pr-msgs">${lines}${waiting ? '<div class="ddrp-wait" aria-label="梦在回应"><i></i><i></i><i></i></div>' : ''}</div>
      <div class="ddrp-comp"><input id="pr-input" placeholder="在梦里说…" value="${h(state.prDraft || '')}" autocomplete="off"><button type="button" id="pr-send" aria-label="发送"><span data-doodle="send" data-boil="off"></span></button></div>
    </div>`;
  }

  /* 刮刮乐涂层 */
  function bindScratch(){
    const cv = document.getElementById('ddrp-scratch'); if(!cv || cv._bound) return; cv._bound = true;
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if(!r.width) return;
    cv.width = Math.round(r.width*dpr); cv.height = Math.round(r.height*dpr);
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const gr = g.createLinearGradient(0, 0, r.width, r.height);
    gr.addColorStop(0, '#D8D4E8'); gr.addColorStop(.45, '#F4F1FB'); gr.addColorStop(.55, '#CFC9E2'); gr.addColorStop(1, '#E7E2F3');
    g.fillStyle = gr; g.fillRect(0, 0, r.width, r.height);
    g.fillStyle = 'rgba(255,255,255,.55)';
    for(let i = 0; i < 60; i++){ const x = Math.random()*r.width, y = Math.random()*r.height, s = 1+Math.random()*2; g.fillRect(x, y, s, s); }
    g.font = '700 20px "Gaegu","ZCOOL KuaiLe",sans-serif'; g.fillStyle = 'rgba(120,100,170,.75)'; g.textAlign = 'center';
    g.fillText('✦ 刮开看看今晚的梦 ✦', r.width/2, r.height/2+7);
    g.globalCompositeOperation = 'destination-out';
    let down = false, last = null, n = 0;
    const at = e => { const b = cv.getBoundingClientRect(); return {x:e.clientX-b.left, y:e.clientY-b.top}; };
    const scratch = p => { g.lineWidth = 34; g.lineCap = 'round'; g.beginPath(); g.moveTo((last||p).x, (last||p).y); g.lineTo(p.x, p.y); g.stroke(); last = p;
      if(++n % 8 === 0) check(); };
    const check = () => { const d = g.getImageData(0, 0, cv.width, cv.height).data; let clear = 0, tot = 0; for(let i = 3; i < d.length; i += 64){ tot++; if(d[i] < 40) clear++; }
      if(clear/tot > .48){ cv.classList.add('gone'); setTimeout(() => { reveal(); render(); }, 420); down = false; } };
    cv.addEventListener('pointerdown', e => { down = true; last = null; cv.setPointerCapture(e.pointerId); scratch(at(e)); });
    cv.addEventListener('pointermove', e => { if(down) scratch(at(e)); });
    const up = () => { down = false; last = null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }

  function afterRender(){
    if(!ON()) return;
    const app = document.getElementById('app');
    if(state.subPage === 'pr') requestAnimationFrame(bindScratch);
    const dream = app && app.querySelector('.ddrp-dream');
    document.body.classList.toggle('ddrp-dreaming', !!dream);
    if(T.fresh) setTimeout(() => { T.fresh = false; }, 900);
  }

  document.addEventListener('click', e => {
    if(!ON() || !e.target.closest) return;
    const b = e.target.closest('[data-ddrp],[data-ddrp-pick]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    if(b.hasAttribute('data-ddrp-pick')){ T.worldId = b.dataset.ddrpPick; T.serial = T.serial || 100 + Math.floor(Math.random()*900); reveal(); render(); return; }
    const k = b.dataset.ddrp;
    if(k === 'draw'){ draw(); render(); }
    else if(k === 'reveal'){ reveal(); render(); }
    else if(k === 'save'){ if(typeof prQuickSave === 'function') prQuickSave(); render(); }
  }, true);

  return {hub, panel, afterRender};
})();
