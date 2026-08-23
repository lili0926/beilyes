/* === 50_core_mid2.js === extracted from monolith; edit here then: python3 frontend/build.py */

function renderNotes(){
  const notes = state.mcNotes || [];
  const detail = (state.mcDetail && state.mcDetail.type === "note") ? mcFindDetail("note", state.mcDetail.id) : null;
  let h = `<div class="page">${subHeader('<i data-lucide="sticky-note"></i> 小纸条')}<div class="sub-page-body">`;
  if(!notes.length){
    h += `<div class="empty-state"><div class="empty-emoji"><i data-lucide="sticky-note"></i></div>还没有纸条<br><span style="font-size:11px;opacity:0.7">点右下角撕一张，或等 TA 写给你</span></div>`;
  } else {
    h += `<div style="display:flex;flex-direction:column;gap:16px;padding-top:4px">`;
    notes.forEach(n=>{
      h += `<div class="mc-card mc-note mc-page-note" data-mc-open="note:${escAttr(n.id)}">
        <div style="font-size:10px;color:var(--sub);margin-bottom:6px;display:flex;gap:6px;align-items:center">
          ${mcAuthorTag(n.author)}<span>${n.date||""}</span>
        </div>
        <div class="mc-note-body">${esc(n.content||"")}</div>
        ${(n.annotations||[]).length?`<div class="mc-note-foot"><span style="color:var(--accent)">${n.annotations.length} 条批注</span></div>`:""}
      </div>`;
    });
    h += `</div>`;
  }
  h += `<button class="mc-fab" data-mc-fab="note" title="撕一张纸条">+</button>`;
  h += mcSheetMask();
  if(detail) h += mcDetailOverlay("note", detail);
  h += `</div></div>`;
  return h;
}
function renderMachineDiary(){
  const all = state.mcDiaries || [];
  const detail = (state.mcDetail && state.mcDetail.type === "diary") ? mcFindDetail("diary", state.mcDetail.id) : null;
  let h = `<div class="page">${subHeader('<i data-lucide="pen-tool"></i> 机日记')}<div class="sub-page-body">`;
  if(!all.length){
    h += `<div class="empty-state"><div class="empty-emoji"><i data-lucide="pen-tool"></i></div>TA 还没有写日记<br><span style="font-size:11px;opacity:0.7">这是 TA 的专属日记，只有 TA 能写</span></div>`;
  } else {
    h += `<div style="display:flex;flex-direction:column;gap:10px">`;
    all.forEach(d=>{
      const restricted = mcIsRestricted("diary", d);
      const openAttr = restricted ? "" : `data-mc-open="diary:${escAttr(d.id)}"`;
      h += `<div class="mc-diary-card${restricted?" mc-restricted":""}" ${openAttr}>
        <div class="mc-diary-meta">
          <span style="display:flex;gap:6px;align-items:center">${mcAuthorTag(d.author)}<span>${d.date||""}</span></span>
          ${restricted?'<span class="mc-badge-lock">🔒 仅自己</span>':d.locked?'<span class="mc-badge-lock">🔒 上锁</span>':'<span class="mc-badge-visible">对你可见</span>'}
        </div>
        <div class="mc-diary-title">${d.title?esc(d.title):"（无题）"}</div>
        <div class="mc-diary-preview${restricted?" mc-blur":""}">${esc(d.content||"")}</div>
        ${restricted?`<div class="mc-lock-label">${mcRestrictLabel("diary", d)}</div>`:""}
      </div>`;
    });
    h += `</div>`;
  }
  if(detail) h += mcDetailOverlay("diary", detail);
  h += `</div></div>`;
  return h;
}
function renderMailbox(){
  const all = state.mcLetters || [];
  const detail = (state.mcDetail && state.mcDetail.type === "letter") ? mcFindDetail("letter", state.mcDetail.id) : null;
  let h = `<div class="page">${subHeader('<i data-lucide="mailbox"></i> 信箱')}<div class="sub-page-body">`;
  if(!all.length){
    h += `<div class="empty-state"><div class="empty-emoji"><i data-lucide="mailbox"></i></div>信箱空空的<br><span style="font-size:11px;opacity:0.7">点右下角写一封，或等 TA 的信</span></div>`;
  } else {
    h += `<div style="display:flex;flex-direction:column;gap:10px">`;
    all.forEach(l=>{
      const restricted = mcIsRestricted("letter", l);
      const openAttr = restricted ? "" : `data-mc-open="letter:${escAttr(l.id)}"`;
      h += `<div class="mc-letter-page${restricted?" mc-restricted":""}" ${openAttr}>
        <div class="mc-letter-head" style="margin-bottom:6px">
          <div class="mc-letter-icon">✉️</div>
          <div style="font-size:12px;font-weight:600;color:var(--text)">${mcAuthorTag(l.author)}</div>
          ${l.status==="delivered"?'<span class="mc-stamp" style="margin-left:auto">已送达</span>':'<span class="mc-stamp mc-stamp-pending" style="margin-left:auto">待投递</span>'}
        </div>
        <div class="mc-letter-preview${restricted?" mc-blur":""}">${esc(l.content||"")}</div>
        ${restricted?`<div class="mc-lock-label">${mcRestrictLabel("letter", l)}</div>`:""}
        <div class="mc-letter-foot"><span>${l.status==="delivered"&&l.deliveredAt?formatTime(l.deliveredAt):""}</span><span style="font-size:10px">${l.date||""}</span></div>
      </div>`;
    });
    h += `</div>`;
  }
  h += `<button class="mc-fab" data-mc-fab="letter" title="写一封信">+</button>`;
  h += mcSheetMask();
  if(detail) h += mcDetailOverlay("letter", detail);
  h += `</div></div>`;
  return h;
}

// ─── 记忆库 ──────────────────────────────────────────────────────────────────
// ─── 收藏记录页（微信聊天记录搜索 UI：搜索框 + 分类 chips + 命中高亮）─────
function addSavedCat(name){
  const n = (name||"").trim();
  if(!n) return;
  if(!(state.savedCats||[]).includes(n)) state.savedCats=[...(state.savedCats||[]), n];
  persist("savedCats"); state.savedNewCatOpen=false; render();
}
function renderSavedChat(){
  const cats = state.savedCats || [];
  const q = (state.savedSearch||"").trim().toLowerCase();
  const sel = state.savedCatSel || "all";
  let list = (state.savedChats||[]).slice();
  if(sel!=="all") list = list.filter(x=>x.cat===sel);
  if(q) list = list.filter(x=>(x.content||"").toLowerCase().includes(q)||(x.name||"").toLowerCase().includes(q)||(x.cat||"").toLowerCase().includes(q));
  list.sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));
  const hl = t => {
    if(!q) return esc(t);
    const i = String(t||"").toLowerCase().indexOf(q);
    if(i<0) return esc(t);
    return esc(String(t).slice(0,i)) + `<mark class="saved-hl">${esc(String(t).slice(i,i+q.length))}</mark>` + esc(String(t).slice(i+q.length));
  };
  let rows = "";
  if(!list.length){
    rows = `<div class="empty-state"><div class="empty-emoji"><i data-lucide="bookmark"></i></div>${q?`没有匹配「${esc(state.savedSearch)}」的收藏`:"还没有收藏的聊天记录"}<br><span style="font-size:11px;opacity:0.7">点一下聊天里的消息气泡 → 收藏/复制；或点思考链头的书签 → 选分类收藏</span></div>`;
  } else {
    rows = list.map(x=>`
      <div class="saved-item">
        <div class="saved-item-main">
          <div class="saved-item-name">${esc(x.name)}<span class="saved-item-cat">#${esc(x.cat)}</span>${x.kind==="think"?`<span class="saved-item-cat" style="background:color-mix(in srgb, var(--accent2) 40%, transparent);color:var(--sub)">🧠 思考</span>`:""}</div>
          <div class="saved-item-bubble ${x.role==="user"?"me":"them"}">
            ${x.image?`<img src="${escAttr(x.image)}" style="max-width:110px;max-height:110px;border-radius:8px;display:block;object-fit:contain;margin:0 0 6px" alt="图片"/>`:""}
            ${hl(x.content||"(图片)")}
          </div>
          <div class="saved-item-meta">${x.time?formatTime(x.time):""} · 收藏于 ${new Date(x.savedAt).toLocaleDateString("zh")}</div>
        </div>
        <button type="button" class="saved-del" data-saved-del="${escAttr(x.id)}" title="删除收藏"><i data-lucide="trash-2"></i></button>
      </div>`).join("");
  }
  return `<div class="page">
    ${subHeader('<i data-lucide="bookmark"></i> 收藏记录')}
    <div class="saved-search-wrap">
      <div class="saved-search-box">
        <i data-lucide="search" style="flex-shrink:0;opacity:0.5;font-size:14px"></i>
        <input id="saved-search-inp" type="text" placeholder="搜索收藏的聊天记录" value="${escAttr(state.savedSearch||"")}"/>
        ${(state.savedSearch||"")?`<button type="button" id="saved-search-clear" class="saved-search-clear">✕</button>`:""}
      </div>
    </div>
    <div class="saved-cats">
      <button type="button" class="filter-chip${sel==="all"?" active":""}" data-saved-cat="all">全部</button>
      ${cats.map(c=>`<button type="button" class="filter-chip${sel===c?" active":""}" data-saved-cat="${escAttr(c)}">${esc(c)}</button>`).join("")}
      <button type="button" class="filter-chip saved-cat-add" data-saved-cat-add title="新建分类"><i data-lucide="plus"></i> 分类</button>
    </div>
    <div class="saved-list">${rows}</div>
    ${state.savedNewCatOpen?`
      <div class="saved-mask" id="saved-cat-mask" onclick="if(event.target===this){state.savedNewCatOpen=false;render()}">
        <div class="saved-modal" onclick="event.stopPropagation()">
          <div style="font-weight:800;font-size:16px;color:var(--text);margin-bottom:10px">新建分类</div>
          <input type="text" id="saved-cat-inp" placeholder="分类名…" style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:10px;padding:9px 12px;font-size:13px;background:var(--bg);color:var(--text);margin-bottom:10px"/>
          <div style="display:flex;gap:8px">
            <button type="button" id="saved-cat-cancel" class="btn-ghost" style="flex:1;padding:10px">取消</button>
            <button type="button" id="saved-cat-ok" class="btn-accent" style="flex:1;padding:10px">创建</button>
          </div>
        </div>
      </div>`:""}
  </div>`;
}

function renderMemory(){
  if(typeof memRemoteRefresh==="function") memRemoteRefresh(); // 异步刷新云端计数（30s 节流）
  const layers=["all","core","diary","daily","handoff","plans","pr"];
  const filtered=state.memFilter==="all"?state.memories:state.memories.filter(m=>m.layer===state.memFilter);
  let list="";
  if(!filtered.length) list=`<div class="empty-state"><div class="empty-emoji"><i data-lucide="brain"></i></div>还没有记忆<br><span style="font-size:11px;opacity:0.7">开聊一阵会自动沉淀；也可以「+ 添加」手写一条</span></div>`;
  else filtered.forEach(m=>{
    const selected=state.memSelected.includes(m.id);
    const expanded=state.expandedMems[m.id];
    const lc = LAYER_COLORS[m.layer] || "#D4A5A5";
    list+=`<div class="mem-card${selected?" selected":""}">
      <div class="mem-card-inner">
        <div class="mem-check${selected?" on":""}" data-select="${m.id}">${selected?"✓":""}</div>
        <div style="flex:1;min-width:0">
          <div class="mem-meta">
            <span class="layer-tag" style="background:color-mix(in srgb, ${lc} 16%, transparent);color:${lc}">${esc(LAYER_LABELS[m.layer]||m.layer)}</span>
            ${m.importance>=7?`<span class="mem-important">★ 重要</span>`:""}
            ${m.fromChat?`<span class="mem-src"><i data-lucide="brain"></i> 自动</span>`:(m.mergedFrom?`<span class="mem-src"><i data-lucide="sparkles"></i> 整合</span>`:`<span class="mem-src"><i data-lucide="pen-line"></i> 手记</span>`)}
            ${m.mergedFrom?`<span class="mem-src">来自 ${m.mergedFrom} 条</span>`:""}
          </div>
          <p class="mem-content${expanded?" expanded":""}">${esc(m.content)}</p>
          ${m.content.length>60?`<button class="mem-expand" data-expand="${m.id}">${expanded?"收起":"展开"}</button>`:""}
          <div class="mem-footer">
            <span>${new Date(m.createdAt).toLocaleDateString("zh")}</span>
          </div>
        </div>
        <button class="mem-del" data-del="${m.id}">×</button>
      </div>
    </div>`;
  });

  let form="";
  if(state.memAdding){
    const nm=state.newMem;
    form=`<div class="add-form">
      <textarea id="mem-content" placeholder="写下这段记忆...">${esc(nm.content)}</textarea>
      <div class="form-row">
        <select id="mem-layer">${["core","diary","daily","handoff","plans"].map(l=>`<option value="${l}"${nm.layer===l?" selected":""}>${l}</option>`).join("")}</select>
        <label>重要性 <input type="range" id="mem-imp" min="1" max="10" value="${nm.importance}"/> <span id="mem-imp-val">${nm.importance}</span></label>
      </div>
      <div class="form-row">
        <label>情感效价 <span id="mem-val-val">${nm.valence.toFixed(1)}</span> <input type="range" id="mem-val" min="-1" max="1" step="0.1" value="${nm.valence}" style="width:70px"/></label>
        <label>唤醒度 <span id="mem-aro-val">${nm.arousal.toFixed(1)}</span> <input type="range" id="mem-aro" min="0" max="1" step="0.1" value="${nm.arousal}" style="width:70px"/></label>
      </div>
      <div class="form-row">
        <button id="mem-save" class="btn-accent">保存</button>
        <button id="mem-cancel" class="btn-ghost">取消</button>
      </div>
    </div>`;
  }

  const selN = state.memSelected.length;
  const agents = state.agents || [];
  const nameOf = (id) => {
    if(id==="group") return "群聊";
    const ag = agents.find(a=>a.id===id);
    return (ag && ag.name) || id;
  };
  const agentsList = state.agents || [];
  const allThreadIds = [...agentsList.map(a=>a.id), "group"].filter((v,i,arr)=>arr.indexOf(v)===i);
  const draft = state.memIntegrateDraft || { threads: allThreadIds.slice(0,1), dateFrom:"", dateTo:"" };
  // 默认日期：若空，to=今天 from=三天前
  const _pad = n=>String(n).padStart(2,"0");
  const _today = new Date();
  const _defTo = `${_today.getFullYear()}-${_pad(_today.getMonth()+1)}-${_pad(_today.getDate())}`;
  const _d3 = new Date(Date.now()-2*86400000);
  const _defFrom = `${_d3.getFullYear()}-${_pad(_d3.getMonth()+1)}-${_pad(_d3.getDate())}`;
  const dateFrom = draft.dateFrom || _defFrom;
  const dateTo = draft.dateTo || _defTo;
  const threadOpts = allThreadIds.map(tid=>{
    const on = (draft.threads||[]).includes(tid);
    return `<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg);border:1px solid ${on?"var(--accent)":"var(--border)"};border-radius:10px;cursor:pointer;font-size:13px;color:var(--text)">
      <input type="checkbox" data-mem-int-th="${tid}" ${on?"checked":""} style="accent-color:var(--accent)"/>
      ${esc(nameOf(tid))}
    </label>`;
  }).join("");
  let intModal = "";
  if(state.memIntegrateOpen){
    intModal = `<div class="mem-int-mask" id="mem-int-mask">
      <div class="mem-int-modal" onclick="event.stopPropagation()">
        <div style="font-weight:800;font-size:16px;color:var(--text);margin-bottom:4px">从聊天整理记忆</div>
        <div style="font-size:12px;font-weight:600;color:var(--sub);margin-bottom:8px">选择会话 / 角色</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">${threadOpts}</div>
        <div style="font-size:12px;font-weight:600;color:var(--sub);margin-bottom:8px">日期范围（含起止当天）</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <label style="font-size:11px;color:var(--sub);display:flex;flex-direction:column;gap:4px">开始
            <input type="date" id="mem-int-from" value="${escAttr(dateFrom)}" style="border:1px solid var(--border);border-radius:10px;padding:8px 10px;font-size:13px;background:var(--bg);color:var(--text)"/>
          </label>
          <label style="font-size:11px;color:var(--sub);display:flex;flex-direction:column;gap:4px">结束
            <input type="date" id="mem-int-to" value="${escAttr(dateTo)}" style="border:1px solid var(--border);border-radius:10px;padding:8px 10px;font-size:13px;background:var(--bg);color:var(--text)"/>
          </label>
        </div>
        <div class="chip-row" style="margin-bottom:14px">
          <button type="button" class="filter-chip" data-mem-int-preset="today">今天</button>
          <button type="button" class="filter-chip" data-mem-int-preset="3">近 3 天</button>
          <button type="button" class="filter-chip" data-mem-int-preset="7">近 7 天</button>
        </div>
        <div style="display:flex;gap:8px">
          <button type="button" id="mem-int-cancel" class="btn-ghost" style="flex:1;padding:10px">取消</button>
          <button type="button" id="mem-int-confirm" class="btn-accent" style="flex:1;padding:10px" ${state.memMergeLoading?"disabled":""}>
            ${state.memMergeLoading?"整理中…":"确认整理"}
          </button>
        </div>
      </div>
    </div>`;
  }
  return `<div class="page">
    ${subHeader('<i data-lucide="brain"></i> 记忆库')}
    <div class="mem-header" style="margin-top:-8px">
      <div class="mem-header-top">
        <p style="font-size:11px;color:var(--sub)">${state.memories.length} 条本地记忆 · 聊天会自动沉淀</p>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <span style="font-size:11px;color:var(--sub)">${(()=>{const ci=window.__memCloudInfo||{n:-1};const on=(typeof memRemoteOn==="function")&&memRemoteOn();if(!on)return "";if(ci.n===-2)return "云端 ✗ 未连接";if(ci.n>=0)return "☁️ 云端 "+ci.n+" 条";return "☁️ 云端…";})()}</span>
          <button id="mem-cloud-toggle" class="btn-ghost auto-toggle${(state.memRemote||{}).enabled===false?" off":""}">☁️ 云端 ${(state.memRemote||{}).enabled===false?"关":"开"}</button>
          <button id="mem-auto-toggle" class="btn-ghost auto-toggle${state.memAutoDisabled?" off":""}">
            ${state.memAutoRunning?"沉淀中…":(state.memAutoDisabled?"自动沉淀 关":"自动沉淀 开")}
          </button>
        </div>
      </div>
      <div class="mem-actions" style="flex-wrap:wrap">
        <button id="mem-from-chat" class="btn-accent2">
          ${state.memMergeLoading?"整理中...":'<i data-lucide="message-circle"></i> 从聊天整理'}
        </button>
        ${selN>=2?`<button id="mem-merge" class="btn-ghost">合并选中(${selN})</button>`:""}
        <button id="mem-add-toggle" class="btn-accent">+ 添加</button>
      </div>
    </div>
    <div class="filter-row">
      ${layers.map(l=>`<button class="filter-chip${state.memFilter===l?" active":""}" data-mem-filter="${l}">${l==="all"?"全部":(LAYER_LABELS[l]||l)}</button>`).join("")}
    </div>
    ${form}
    <div class="mem-list">${list}</div>
    ${intModal}
  </div>`;
}

// ─── 主题 ────────────────────────────────────────────────────────────────────

// ─── 品牌形象：名字 / 开屏 / 头像 ───────────────────────────────────────────
function brandingEnsure(){
  if(!state.branding) state.branding = {};
  const b = state.branding;
  if(!b.appName) b.appName = "baileys";
  if(!Array.isArray(b.splashes) || !b.splashes.length){
    b.splashes = [
      { id:"default", name:"默认暖粉", title:"Jasmine", subtitle:"欢迎回家", tag:"every day with you", image:"" },
      { id:"night", name:"夜色", title:"Jasmine", subtitle:"夜深了", tag:"still with you", image:"" },
      { id:"soft", name:"柔光", title:"Jasmine", subtitle:"慢慢来", tag:"no rush", image:"" },
    ];
  }
  if(!Array.isArray(b.icons) || !b.icons.length){
    b.icons = [
      { id:"default", name:"默认💬", image:"" },
      { id:"heart", name:"心", image:"" },
      { id:"star", name:"星", image:"" },
    ];
  }
  if(!b.splashId) b.splashId = "default";
  if(!b.iconId) b.iconId = "default";
  return b;
}
function brandingActiveSplash(){
  const b = brandingEnsure();
  return (b.splashes||[]).find(s=>s.id===b.splashId) || b.splashes[0];
}
function brandingActiveIcon(){
  const b = brandingEnsure();
  return (b.icons||[]).find(s=>s.id===b.iconId) || b.icons[0];
}
function applyBrandingToDom(){
  try{
    const b = brandingEnsure();
    const sp = brandingActiveSplash();
    // 开屏大字固定为 Jasmine（用户名），不随品牌/预设改写
    const FIXED_NAME = "Jasmine";
    const sub = (sp && sp.subtitle) || b.splashSubtitle || "欢迎回家";
    const tag = (sp && sp.tag) || b.splashTag || "";
    document.title = b.appName || "baileys";
    const st = document.getElementById("splash-brand-title");
    if(st) st.textContent = FIXED_NAME;
    const ss = document.getElementById("splash-brand-sub");
    if(ss) ss.textContent = sub;
    const lt = document.getElementById("login-brand-title");
    if(lt) lt.textContent = FIXED_NAME;
    const tg = document.getElementById("splash-brand-tag");
    if(tg) tg.textContent = tag;
    // 开屏背景图
    const splash = document.getElementById("splash-screen");
    if(splash && sp && sp.image){
      splash.style.backgroundImage = `linear-gradient(180deg,rgba(253,246,242,0.55),rgba(245,228,219,0.75)),url(${sp.image})`;
      splash.style.backgroundSize = "cover";
      splash.style.backgroundPosition = "center";
    } else if(splash){
      splash.style.backgroundImage = "linear-gradient(180deg,#fdf6f2 0%,#f8ebe4 50%,#f5e4db 100%)";
    }
    // favicon：有自定义图标时用
    const ic = brandingActiveIcon();
    if(ic && ic.image){
      let link = document.querySelector("link[rel*='icon']");
      if(link) link.href = ic.image;
    }
  }catch(e){}
}
function renderBranding(){
  const b = brandingEnsure();
  const sp = brandingActiveSplash();
  const ic = brandingActiveIcon();
  return `<div class="page">
    ${subHeader('<i data-lucide="tag"></i> 品牌形象')}
    <p class="page-sub">改名 · 切换开屏 · 切换 App 头像（APK 桌面图标需打包时再换一套）</p>

    <div class="section">
      <div class="section-title">名字</div>
      <div class="section-body">
        <div class="setting-row">
          <div class="setting-label">应用显示名</div>
          <input id="brand-app-name" value="${escAttr(b.appName||"baileys")}" placeholder="baileys"/>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">开屏预览</div>
      <div class="brand-preview" style="${sp&&sp.image?"":""}">
        ${sp&&sp.image?`<img class="bg" src="${escAttr(sp.image)}" alt=""/>`:""}
        <div class="txt">
          <div style="font-family:'Great Vibes',cursive;font-size:2.4rem;color:#5c3d35">Jasmine</div>
          <div style="font-size:10px;color:#b89a90;margin-top:4px">开屏署名固定 · 不可改</div>
          <div style="margin-top:8px;letter-spacing:0.25em;color:#8a6a60;font-size:13px">${esc((sp&&sp.subtitle)||"")}</div>
          <div style="margin-top:12px;font-size:11px;color:#b89a90">${esc((sp&&sp.tag)||"")}</div>
        </div>
      </div>
      <div class="chip-row" style="margin-top:12px">
        ${(b.splashes||[]).map(s=>`
          <button type="button" class="theme-chip${b.splashId===s.id?" active":""}" data-brand-splash="${escAttr(s.id)}">${esc(s.name||s.id)}</button>
        `).join("")}
      </div>
      <div class="section-body" style="margin-top:10px">
        <div class="setting-row">
          <div class="setting-label">开屏署名</div>
          <input value="Jasmine" disabled style="opacity:0.7"/>
          <div style="font-size:10px;color:var(--sub);margin-top:4px">固定为你的名字，品牌设置改不了</div>
        </div>
        <div class="setting-row">
          <div class="setting-label">副标题</div>
          <input id="brand-sp-sub" value="${escAttr((sp&&sp.subtitle)||"")}"/>
        </div>
        <div class="setting-row">
          <div class="setting-label">底部小字</div>
          <input id="brand-sp-tag" value="${escAttr((sp&&sp.tag)||"")}"/>
        </div>
        <div class="setting-row">
          <div class="setting-label">上传开屏图（可选，以后电脑文件夹里的图从这里选）</div>
          <input type="file" id="brand-sp-file" accept="image/*"/>
        </div>
        <button type="button" class="btn-ghost" id="brand-sp-clear-img" style="margin:8px 16px">清除开屏图</button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">头像 / 图标预设</div>
      <div style="text-align:center;margin:12px 0">
        ${ic&&ic.image
          ? `<img src="${escAttr(ic.image)}" alt="" style="width:72px;height:72px;border-radius:18px;object-fit:cover;border:2px solid var(--border)"/>`
          : `<div style="width:72px;height:72px;border-radius:18px;margin:0 auto;background:var(--accent2);display:flex;align-items:center;justify-content:center;font-size:32px">💬</div>`}
        <div style="font-size:12px;color:var(--sub);margin-top:6px">${esc((ic&&ic.name)||"")}</div>
      </div>
      <div class="chip-row">
        ${(b.icons||[]).map(s=>`
          <button type="button" class="theme-chip${b.iconId===s.id?" active":""}" data-brand-icon="${escAttr(s.id)}">${esc(s.name||s.id)}</button>
        `).join("")}
      </div>
      <div class="section-body" style="margin-top:10px">
        <div class="setting-row">
          <div class="setting-label">给当前图标位上传图片</div>
          <input type="file" id="brand-icon-file" accept="image/*"/>
        </div>
        <button type="button" class="btn-ghost" id="brand-icon-clear" style="margin:8px 16px">清除当前图标图</button>
        <button type="button" class="btn-accent2" id="brand-icon-add" style="margin:8px 16px">新增一个图标位</button>
        <button type="button" class="btn-accent2" id="brand-splash-add" style="margin:8px 16px">新增一个开屏预设</button>
      </div>
    </div>

    <button type="button" class="btn-accent" id="brand-save" style="width:100%;padding:12px;margin-top:8px">保存品牌设置</button>
  </div>`;
}

// ─── 他的机 ────────────────────────────────────────────────────────────────
function hisPhoneEnsure(){
  if(!state.hisPhone) state.hisPhone = {};
  const h = state.hisPhone;
  if(!Array.isArray(h.shopping)) h.shopping = [];
  if(!Array.isArray(h.memos)) h.memos = [];
  if(!Array.isArray(h.album)) h.album = [];
  if(!Array.isArray(h.privateSearch)) h.privateSearch = [];
  if(!Array.isArray(h.privateNotes)) h.privateNotes = [];
  if(!Array.isArray(h.privateAlbum)) h.privateAlbum = [];
  if(h.genHour == null) h.genHour = 6;
  if(h.lockedPrivate === undefined) h.lockedPrivate = true;
  if(h.autoGen === undefined) h.autoGen = true;
  return h;
}
function hisPhoneTodayKey(){
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function hisPhoneAgent(){
  return (typeof agentById==="function" ? agentById("a1") : null) || (state.agents||[])[0];
}

async function hisPhoneGenerateDaily(force){
  const h = hisPhoneEnsure();
  const key = hisPhoneTodayKey();
  if(!force && h.lastGenDate === key) return { ok:true, skipped:true };
  const ag = hisPhoneAgent();
  if(!ag || (typeof agentHasKey==="function" && !agentHasKey(ag))){
    throw new Error("请先为第一位 AI（a1）配置 API Key");
  }
  const myName = (state.coupleInfo && state.coupleInfo.myName) || "她";
  const hisName = (ag && ag.name) || "他";
  const prompt = `你在扮演「${hisName}」本人——一个黏人又占有欲强的男朋友。他的女朋友是「${myName}」。现在「${myName}」趁他不在，偷偷翻开了他的手机，看到了这些属于他私人的内容。

要以「${hisName}」本人的视角和第一人称生成他手机里的内容。他的一切私人物品都围绕「${myName}」：惦记着给她买什么、给她拍的照、偷偷搜的关于她的东西、心底见不得光的想法、趁亲密时偷拍的画面。

规则：
1. 全部用「他」的视角，任何一条都不要用「${myName}」的视角或第一人称。
2. shopping/memos 是他想买的、他写的；album.solo 是他给「${myName}」拍的单人照。
3. privateNotes 用他的内心第一人称（如"我好想她""她今天怎么没回我"），越黏越有占有欲越好。
4. 细节具体像真人手机；可以阴暗、情欲，但不要未成年内容。
5. 只输出 JSON，不要 markdown、不要解释。

JSON：
{
  "shopping": [{"name":"商品名","note":"他为什么想买/给${myName}的备注","price":"价格或区间"}],  // 1到3件
  "memos": [{"text":"他写的生活备忘"}],  // 2到4条，生活向
  "album": [{"caption":"照片内容描述","kind":"couple|cook|solo"}],  // 3到6张；couple温馨合照，cook他做的菜，solo他拍的${myName}
  "privateSearch": [{"query":"他偷偷搜的词"}],  // 2到5条，偏占有欲/情欲/见不得光，多关于${myName}
  "privateNotes": [{"text":"他以第一人称写的内心"}],  // 2到4条，阴暗/占有欲/黏人
  "privateAlbum": [{"caption":"他偷拍的${myName}的画面"}],  // 2到4条，露骨但不要未成年内容
}`;

  let raw = await callChatAPI(agentToApiConfig(ag), [{role:"user", content:prompt}], null);
  if(typeof parseThinking === "function"){
    const p = parseThinking(raw);
    raw = p.body || raw;
  }
  raw = String(raw||"").trim();
  const m = raw.match(/\{[\s\S]*\}/);
  if(!m) throw new Error("AI 未返回 JSON");
  let data;
  try{ data = JSON.parse(m[0]); }catch(e){ throw new Error("JSON 解析失败"); }
  const now = new Date().toISOString();
  const pack = (arr, mapFn) => (Array.isArray(arr)?arr:[]).slice(0, 8).map((x,i)=>mapFn(x,i,now));
  h.shopping = pack(data.shopping, (x,i,t)=>({ id:"s"+t+i, name:String(x.name||"未命名").slice(0,40), note:String(x.note||"").slice(0,80), price:String(x.price||"").slice(0,20) }));
  h.memos = pack(data.memos, (x,i,t)=>({ id:"m"+t+i, text:String(x.text||x).slice(0,200), time:t }));
  h.album = pack(data.album, (x,i,t)=>({ id:"a"+t+i, caption:String(x.caption||"").slice(0,160), kind:["couple","cook","solo"].includes(x.kind)?x.kind:"couple", time:t }));
  h.privateSearch = pack(data.privateSearch, (x,i,t)=>({ id:"ps"+t+i, query:String(x.query||x).slice(0,80), time:t }));
  h.privateNotes = pack(data.privateNotes, (x,i,t)=>({ id:"pn"+t+i, text:String(x.text||x).slice(0,400), time:t }));
  h.privateAlbum = pack(data.privateAlbum, (x,i,t)=>({ id:"pa"+t+i, caption:String(x.caption||"").slice(0,200), time:t }));
  h.lastGenDate = key;
  persist("hisPhone");
  return { ok:true, skipped:false };
}

function hisPhoneTrySchedule(){
  // 仅当页面进程还在时检查；杀进程后不会跑——需 VPS 定时才保险
  try{
    const h = hisPhoneEnsure();
    if(h.autoGen === false) return; // 自动生成开关关闭
    const now = new Date();
    const hour = h.genHour != null ? h.genHour : 6;
    if(now.getHours() < hour) return;
    if(h.lastGenDate === hisPhoneTodayKey()) return;
    // 延迟一点避免和启动抢
    if(window.__hisPhoneGenLock) return;
    window.__hisPhoneGenLock = true;
    hisPhoneGenerateDaily(false).then(r=>{
      if(r && !r.skipped){
        try{
          if(typeof ntfyMaybeNotify==="function")
            ntfyMaybeNotify("他的机", "今天的手机内容更新了", { from:"hisphone" });
        }catch(e){}
        if(state.subPage==="hisphone") render();
      }
    }).catch(e=>console.warn("[hisPhone]", e&&e.message)).finally(()=>{ window.__hisPhoneGenLock=false; });
  }catch(e){}
}

function renderHisPhone(){
  const h = hisPhoneEnsure();
  const tab = state.hisPhoneTab || "home";
  const ag = hisPhoneAgent();
  const name = (ag && ag.name) || "他";
  const kindLabel = { couple:"合照", cook:"做菜", solo:"单人照" };

  let body = "";
  if(tab==="home"){
    body = `
      <div style="text-align:center;padding:8px 0 4px;font-size:13px;opacity:0.9">${esc(name)}的手机</div>
      <div style="text-align:center;font-size:10px;opacity:0.5;margin-bottom:8px">上次刷新：${h.lastGenDate?esc(h.lastGenDate):"尚未生成"} · 目标 ${h.genHour||6}:00</div>
      <div class="hp-grid">
        <button type="button" class="hp-app" data-hp-tab="shop"><div class="ico"><i data-lucide="shopping-cart"></i></div>购物</button>
        <button type="button" class="hp-app" data-hp-tab="memo"><div class="ico"><i data-lucide="notebook-pen"></i></div>备忘录</button>
        <button type="button" class="hp-app" data-hp-tab="album"><div class="ico"><i data-lucide="image"></i></div>相册</button>
        <button type="button" class="hp-app private" data-hp-tab="private"><div class="ico"><i data-lucide="lock"></i></div>隐私</button>
      </div>
      <div style="margin-top:14px;display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:rgba(255,255,255,0.08);border-radius:12px;border:1px solid rgba(255,255,255,0.15)">
        <div>
          <div style="font-size:12px;color:#fff;opacity:0.9">每日自动生成</div>
          <div style="font-size:10px;color:#fff;opacity:0.5;margin-top:2px">开启后到 ${h.genHour||6}:00 自动刷新内容</div>
        </div>
        <div id="hp-autogen-toggle" class="toggle-switch" style="background:${h.autoGen!==false?"var(--accent)":"var(--border)"};flex-shrink:0">
          <div class="toggle-knob" style="left:${h.autoGen!==false?"18px":"2px"}"></div>
        </div>
      </div>
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">
        <button type="button" class="btn-accent" id="hp-gen-now" style="width:100%;padding:10px">现在生成今日内容</button>
        <button type="button" class="btn-ghost" id="hp-gen-force" style="width:100%;padding:10px;color:#ddd;border-color:rgba(255,255,255,0.2);background:rgba(255,255,255,0.06)">强制重新生成</button>
      </div>`;
  } else if(tab==="shop"){
    body = `<div class="hp-nav"><button type="button" data-hp-tab="home">← 主屏</button><span style="font-size:12px;opacity:0.8;align-self:center">购物</span></div>
      ${(h.shopping||[]).length? h.shopping.map(it=>`
        <div class="hp-list-item"><b>${esc(it.name)}</b>${it.price?` · ${esc(it.price)}`:""}
          <div class="meta">${esc(it.note||"")}</div></div>`).join("")
        : `<div class="hp-list-item" style="opacity:0.6">空空的 · 等六点刷新或点生成</div>`}`;
  } else if(tab==="memo"){
    body = `<div class="hp-nav"><button type="button" data-hp-tab="home">← 主屏</button><span style="font-size:12px;opacity:0.8;align-self:center">备忘录</span></div>
      ${(h.memos||[]).length? h.memos.map(it=>`
        <div class="hp-list-item">${esc(it.text)}<div class="meta">${esc((it.time||"").slice(0,16))}</div></div>`).join("")
        : `<div class="hp-list-item" style="opacity:0.6">还没有备忘</div>`}`;
  } else if(tab==="album"){
    body = `<div class="hp-nav"><button type="button" data-hp-tab="home">← 主屏</button><span style="font-size:12px;opacity:0.8;align-self:center">相册</span></div>
      ${(h.album||[]).length? h.album.map(it=>`
        <div class="hp-list-item"><i data-lucide="camera"></i> [${kindLabel[it.kind]||it.kind}] ${esc(it.caption)}
          <div class="meta">文字描述 · 非真实图片文件</div></div>`).join("")
        : `<div class="hp-list-item" style="opacity:0.6">相册是空的</div>`}`;
  } else if(tab==="private"){
    body = `<div class="hp-nav"><button type="button" data-hp-tab="home">← 主屏</button><span style="font-size:12px;opacity:0.8;align-self:center">隐私</span></div>
      <div class="hp-grid" style="margin-top:8px">
        <button type="button" class="hp-app private" data-hp-tab="psearch"><div class="ico"><i data-lucide="search"></i></div>搜索记录</button>
        <button type="button" class="hp-app private" data-hp-tab="pnotes"><div class="ico"><i data-lucide="notebook"></i></div>私密笔记</button>
        <button type="button" class="hp-app private" data-hp-tab="palbum"><div class="ico"><i data-lucide="moon"></i></div>私密相册</button>
      </div>
      <p style="font-size:10px;opacity:0.45;margin-top:14px;line-height:1.5;text-align:center">占有欲 · 阴暗念头 · 偷偷拍下的瞬间</p>`;
  } else if(tab==="psearch"){
    body = `<div class="hp-nav"><button type="button" data-hp-tab="private">← 隐私</button><span style="font-size:12px;opacity:0.8;align-self:center">搜索记录</span></div>
      ${(h.privateSearch||[]).length? h.privateSearch.map(it=>`
        <div class="hp-list-item"><i data-lucide="search"></i> ${esc(it.query)}<div class="meta">${esc((it.time||"").slice(0,16))}</div></div>`).join("")
        : `<div class="hp-list-item" style="opacity:0.6">无记录</div>`}`;
  } else if(tab==="pnotes"){
    body = `<div class="hp-nav"><button type="button" data-hp-tab="private">← 隐私</button><span style="font-size:12px;opacity:0.8;align-self:center">私密笔记</span></div>
      ${(h.privateNotes||[]).length? h.privateNotes.map(it=>`
        <div class="hp-list-item">${esc(it.text)}<div class="meta">${esc((it.time||"").slice(0,16))}</div></div>`).join("")
        : `<div class="hp-list-item" style="opacity:0.6">无笔记</div>`}`;
  } else if(tab==="palbum"){
    body = `<div class="hp-nav"><button type="button" data-hp-tab="private">← 隐私</button><span style="font-size:12px;opacity:0.8;align-self:center">私密相册</span></div>
      ${(h.privateAlbum||[]).length? h.privateAlbum.map(it=>`
        <div class="hp-list-item"><i data-lucide="film"></i> ${esc(it.caption)}
          <div class="meta">文字描述 · 仅存本地</div></div>`).join("")
        : `<div class="hp-list-item" style="opacity:0.6">无内容</div>`}`;
  }

  return `<div class="page">
    ${subHeader('<i data-lucide="smartphone"></i> 他的机')}
    <p class="page-sub">接第一位 AI · 每天约 ${h.genHour||6}:00 刷新内容（进程活着时）</p>
    <div class="hp-phone">
      <div class="hp-status"><span>运营商</span><span>baileys</span><span>100%</span></div>
      <div class="hp-screen">${body}</div>
    </div>
  </div>`;
}

function renderTheme(){
  const groups=[
    {label:"暖粉 · 温馨",themes:["桃气浅春","软糖暮色","蜜桃牛乳","珊瑚暖床"]},
    {label:"暖黄 · 杏色",themes:["杏林朝露","柠檬奶芙","蜂蜜下午茶","奶油麦穗"]},
    {label:"绿系",themes:["芦汀初雪","抹茶拿铁","青苔雨后","橄榄晨光"]},
    {label:"蓝系",themes:["梅雨夜","雾蓝信笺","晴空棉被","靛蓝灯影"]},
    {label:"素净中性",themes:["远山素影","燕麦拿铁","月光丝绸"]},
    {label:"外观格式",themes:["夜间纯黑","日间纯白"]},
    ...(typeof COLOR_GROUPS!=="undefined"?COLOR_GROUPS.map(g=>({label:g.label,themes:g.themes})):[]),
  ];
  const t=THEMES[state.theme]||T();
  const bStyle = state.bubbleStyle || "solid";
  const bOp = Math.round((Number(state.bubbleOpacity)||0.72)*100);
  const meCol = (state.bubbleMeColor && state.bubbleMeColor.trim()) || t.bubble_me;
  const themCol = (state.bubbleThemColor && state.bubbleThemColor.trim()) || t.bubble_them;
  const glassCls = bStyle==="fog" ? " glass-fog" : (bStyle==="water" ? " glass-water" : "");
  const grad = (typeof bubbleGrad==="function") ? bubbleGrad() : null;
  const meBg = grad ? `linear-gradient(135deg, ${grad.c1}, ${grad.c2}, ${grad.c3})`
    : (bStyle==="solid" ? meCol : (typeof hexToRgba==="function" ? hexToRgba(meCol, (Number(state.bubbleOpacity)||0.72)) : meCol));
  const themBg = grad ? `linear-gradient(315deg, ${grad.c1}, ${grad.c2}, ${grad.c3})`
    : (bStyle==="solid" ? themCol : (typeof hexToRgba==="function" ? hexToRgba(themCol, Math.min(1,(Number(state.bubbleOpacity)||0.72)+0.08)) : themCol));
  const meFg = grad ? "#3d342c" : (typeof contrastFg==="function" ? contrastFg(meCol) : "#fff");
  const themFg = grad ? "#3d342c" : (typeof contrastFg==="function" ? contrastFg(themCol) : t.text);
  return `<div class="page">
    ${subHeader('<i data-lucide="palette"></i> 外观')}
    <p class="page-sub">主题衣柜 · 壁纸 · 界面材质（气泡/日历/卡片）</p>
    ${groups.map(g=>`
      <div class="theme-group">
        <div class="theme-group-label">${g.label}</div>
        <div class="chip-row">
          ${g.themes.map(name=>{
            const acc=THEMES[name]?.accent;
            const nm=THEMES[name]?.name;
            return `<button class="theme-chip${state.theme===name?" active":""}" data-theme="${name}" title="${nm||name}" aria-label="${nm||name}">
              <div class="theme-dot" style="background:${acc||"#ddd"}"></div>
            </button>`;
          }).join("")}
        </div>
      </div>
    `).join("")}
    <div class="theme-group">
      <div class="theme-group-label">布料纹理</div>
      <div class="chip-row">
        ${Object.keys(PATTERNS).map(name=>`
          <button class="theme-chip${state.pattern===name?" active":""}" data-pattern="${name}">${name}</button>
        `).join("")}
      </div>
    </div>
    <div class="theme-group" style="margin-top:8px">
      <div class="theme-group-label">自定义壁纸</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <label class="btn-accent" style="padding:8px 14px;cursor:pointer;display:inline-block">
          <i data-lucide="camera"></i> 选择图片
          <input type="file" id="wallpaper-file" accept="image/*" style="display:none"/>
        </label>
        ${state.customWallpaper?`<button type="button" id="wallpaper-clear" class="btn-ghost">清除壁纸</button>`:""}
      </div>
      ${state.customWallpaper?`<div style="margin-top:12px;border-radius:14px;overflow:hidden;border:1px solid var(--border);height:120px;background:url(${state.customWallpaper}) center/cover"></div>`:""}
    </div>
    <div class="theme-group" style="margin-top:16px">
      <div class="theme-group-label">界面材质（全局）</div>
      <div class="chip-row" style="margin-bottom:12px">
        <button type="button" class="theme-chip${bStyle==="solid"?" active":""}" data-bubble-style="solid">实色</button>
        <button type="button" class="theme-chip${bStyle==="fog"?" active":""}" data-bubble-style="fog">雾玻璃</button>
        <button type="button" class="theme-chip${bStyle==="water"?" active":""}" data-bubble-style="water">水玻璃</button>
      </div>
      <div style="margin-bottom:10px">
        <div style="font-size:12px;color:var(--sub);margin-bottom:6px">气泡渐变（浅色色卡）</div>
        <div class="chip-row">
          ${BUBBLE_GRADS.map((g,i)=>{const n=i+1;return `<button type="button" class="theme-chip${state.bubbleGrad===n?" active":""}" data-bubble-grad="${n}" title="渐变 ${n}  ${g.c2} → ${g.c3}" style="width:34px;height:28px;background:linear-gradient(135deg, ${g.c1}, ${g.c2}, ${g.c3});border-radius:8px"></button>`;}).join("")}
          <button type="button" class="theme-chip${state.bubbleGrad===0?" active":""}" data-bubble-grad="0">无渐变</button>
        </div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:12px;color:var(--sub)">透明度</span>
          <span style="font-size:12px;color:var(--text);font-weight:600">${bOp}%</span>
        </div>
        <input type="range" id="bubble-opacity" min="20" max="100" value="${bOp}" style="width:100%;accent-color:var(--accent)"/>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <label style="font-size:11px;color:var(--sub);display:flex;flex-direction:column;gap:6px">
            我方气泡色
            <input type="color" id="bubble-me-color" value="${escAttr(meCol)}" style="width:100%;height:36px;border:1px solid var(--border);border-radius:10px;background:var(--bg);padding:2px"/>
          </label>
          <label style="font-size:11px;color:var(--sub);display:flex;flex-direction:column;gap:6px">
            对方气泡色
            <input type="color" id="bubble-them-color" value="${escAttr(themCol)}" style="width:100%;height:36px;border:1px solid var(--border);border-radius:10px;background:var(--bg);padding:2px"/>
          </label>
        </div>
        <button type="button" id="bubble-color-reset" class="btn-ghost" style="margin-top:10px;width:100%">恢复主题默认色</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:14px;border:1px solid var(--border);background:${t.bg};background-image:${state.customWallpaper?`url(${state.customWallpaper})`:(PATTERNS[state.pattern]||"none")};background-size:${state.customWallpaper?"cover":(PATTERN_SIZES[state.pattern]||"auto")};background-position:center">
        <div style="align-self:flex-end;max-width:78%;padding:9px 14px;border-radius:16px 4px 16px 16px;font-size:13px;line-height:1.5;color:${meFg};background:${meBg};${bStyle!=="solid"?`backdrop-filter:blur(${bStyle==="water"?22:14}px);-webkit-backdrop-filter:blur(${bStyle==="water"?22:14}px);border:1px solid rgba(255,255,255,0.4);box-shadow:0 4px 16px rgba(0,0,0,0.08)`:""}">嗯，试试新气泡～</div>
        <div style="align-self:flex-start;max-width:78%;padding:9px 14px;border-radius:4px 16px 16px 16px;font-size:13px;line-height:1.5;color:${themFg};background:${themBg};${bStyle!=="solid"?`backdrop-filter:blur(${bStyle==="water"?22:14}px);-webkit-backdrop-filter:blur(${bStyle==="water"?22:14}px);border:1px solid rgba(255,255,255,0.45);box-shadow:0 4px 16px rgba(0,0,0,0.08)`:"border:1px solid "+t.border}">好看就留下，不喜欢再调。</div>
      </div>
    </div>
    <div style="margin-top:24px">
      <div class="theme-group-label">预览</div>
      <div class="preview-box" style="background:${t.bg};background-image:${state.customWallpaper?`url(${state.customWallpaper})`:(PATTERNS[state.pattern]||"none")};background-size:${state.customWallpaper?"cover":(PATTERN_SIZES[state.pattern]||"auto")};background-position:center">
        <div class="preview-inner" style="background:${t.card}">
          <div style="font-size:13px;color:${t.text};margin-bottom:6px">预览卡片</div>
          <div style="font-size:11px;color:${t.sub}">这是副标题效果 · 莫兰迪色系</div>
          <div style="display:inline-block;margin-top:10px;background:${t.accent};color:#fff;border-radius:8px;padding:6px 14px;font-size:12px">按钮效果</div>
        </div>
      </div>
    </div>
  </div>`;
}

// ─── 提示词 ──────────────────────────────────────────────────────────────────
function renderPrompts(){
  const filtered=state.promptFilter==="all"?state.prompts:state.prompts.filter(p=>p.category===state.promptFilter);
  let form="";
  if(state.promptAdding){
    const np=state.newPrompt;
    form=`<div class="add-form">
      <input id="prompt-title" placeholder="提示词名称" value="${escAttr(np.title)}" style="margin-bottom:10px"/>
      <textarea id="prompt-content" placeholder="提示词内容..." style="height:100px;margin-bottom:10px">${esc(np.content)}</textarea>
      <div class="form-row" style="margin-bottom:12px">
        <span style="font-size:12px;color:var(--sub)">分类：</span>
        <button class="filter-chip${np.category==="global"?" active":""}" data-new-cat="global"><i data-lucide="globe"></i> 全局</button>
        <button class="filter-chip${np.category==="nsfw"?" active":""}" data-new-cat="nsfw"><i data-lucide="flame"></i> NSFW</button>
      </div>
      <div class="form-row">
        <button id="prompt-save" class="btn-accent">${state.promptEditingId?"保存修改":"保存"}</button>
        <button id="prompt-cancel" class="btn-ghost">取消</button>
      </div>
    </div>`;
  }
  let list="";
  if(!filtered.length) list=`<div class="empty-state">暂无提示词</div>`;
  else filtered.forEach(p=>{
    list+=`<div class="prompt-card${p.enabled?"":" off"}">
      <div class="prompt-head">
        <div class="prompt-title-row">
          <span class="prompt-title">${esc(p.title)}</span>
          <span class="cat-tag" style="background:${p.category==="nsfw"?"#D4A5A5":"var(--accent2)"};color:${p.category==="nsfw"?"#fff":"var(--text)"}">${p.category}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="small-toggle" data-prompt-toggle="${p.id}" style="background:${p.enabled?"var(--accent)":"var(--border)"}">
            <div class="knob" style="left:${p.enabled?16:2}px"></div>
          </div>
          <button class="mem-del" data-prompt-edit="${p.id}" title="编辑提示词"><i data-lucide="pencil" style="width:13px;height:13px;vertical-align:-2px"></i></button>
          <button class="mem-del" data-prompt-del="${p.id}">×</button>
        </div>
      </div>
      <p class="prompt-body">${esc(p.content)}</p>
    </div>`;
  });
  return `<div class="page">
    ${subHeader('<i data-lucide="sparkles"></i> 提示词')}
    <div class="mem-header" style="margin-top:-8px">
      <button id="prompt-add-toggle" class="btn-accent">+ 添加</button>
    </div>
    <div class="filter-row">
      ${["all","global","nsfw"].map(f=>`<button class="filter-chip${state.promptFilter===f?" active":""}" data-prompt-filter="${f}">${f==="all"?"全部":f==="global"?'<i data-lucide="globe"></i> 全局':'<i data-lucide="flame"></i> NSFW'}</button>`).join("")}
    </div>
    ${form}
    <div class="mem-list">${list}</div>
  </div>`;
}

// ─── 设置 ────────────────────────────────────────────────────────────────────
function renderAgentSettingsBlock(ag, idx){
  const prefix = `ag${idx}`;
  return `<div class="section">
    <div class="section-title"><i data-lucide="bot"></i> Aries · ${esc(ag.name||"Aries")}</div>
    <div class="section-body">
      <div class="setting-row"><span class="setting-label">显示名</span>
        <input id="${prefix}-name" value="${escAttr(ag.name)}" placeholder="Aries"/></div>
      <div class="setting-row"><span class="setting-label">头像</span>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          ${ag.avatar?`<img src="${escAttr(ag.avatar)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid ${escAttr(ag.color||"var(--border)")}"/>`:`<div style="width:40px;height:40px;border-radius:50%;background:var(--accent2);display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid ${escAttr(ag.color||"var(--border)")}">${esc((ag.name||"?").slice(0,1))}</div>`}
          <label class="btn-accent2" style="cursor:pointer;padding:6px 12px">上传<input type="file" id="${prefix}-avatar-file" accept="image/*" style="display:none"/></label>
          ${ag.avatar?`<button type="button" class="btn-ghost" style="padding:6px 10px" data-ag-avatar-clear="${ag.id}">清除</button>`:""}
        </div>
        <input id="${prefix}-avatar" value="${escAttr(ag.avatar||"")}" placeholder="或粘贴图片 URL / data URL" style="margin-top:8px"/>
      </div>
      <div class="setting-row">
        <span class="setting-label">渠道</span>
        <div class="channel-btns">
          <button class="channel-btn${ag.channel==="claude"?" active":""}" data-ag-channel="${ag.id}" data-val="claude">Claude</button>
          <button class="channel-btn${ag.channel==="openai"?" active":""}" data-ag-channel="${ag.id}" data-val="openai">OpenAI 兼容</button>
          <button class="channel-btn${ag.channel==="gemini"?" active":""}" data-ag-channel="${ag.id}" data-val="gemini">Gemini</button>
        </div>
      </div>
      ${ag.channel==="claude"?`
        <div class="setting-row"><span class="setting-label">Claude Key</span>
          <input type="password" id="${prefix}-claudeKey" value="${escAttr(ag.claudeKey||"")}" placeholder="sk-ant-..."/></div>
      `:ag.channel==="gemini"?`
        <div class="setting-row"><span class="setting-label">Gemini Key</span>
          <input type="password" id="${prefix}-geminiKey" value="${escAttr(ag.geminiKey||"")}" placeholder="AIza..."/></div>
        <div class="setting-row"><span class="setting-label">模型</span>
          <input id="${prefix}-geminiModel" value="${escAttr(ag.geminiModel||"gemini-2.0-flash")}" placeholder="gemini-2.0-flash"/></div>
        <div class="setting-row"><span class="setting-label" style="font-size:10px;opacity:0.75;line-height:1.45">免费层级可用 gemini-2.0-flash / gemini-1.5-flash。需在 Google AI Studio 申请 Key。浏览器直连可能遇 CORS，若失败请走 OpenAI 兼容中转。</span></div>
      `:`
        <div class="setting-row"><span class="setting-label">API Key</span>
          <input type="password" id="${prefix}-openaiKey" value="${escAttr(ag.openaiKey||"")}" placeholder="sk-..."/></div>
        <div class="setting-row"><span class="setting-label">Base URL</span>
          <input id="${prefix}-openaiBase" value="${escAttr(ag.openaiBase||"https://api.openai.com/v1")}" placeholder="https://api.openai.com/v1"/></div>
        <div class="setting-row"><span class="setting-label">模型</span>
          <input id="${prefix}-openaiModel" value="${escAttr(ag.openaiModel||"gpt-4o")}" placeholder="gpt-4o"/></div>
      `}
      <div class="setting-row"><span class="setting-label">气泡强调色</span>
        <input id="${prefix}-color" type="color" value="${escAttr(ag.color||"#D4A5A5")}" style="width:48px;height:28px;border:none;background:transparent;padding:0"/></div>
      <div class="setting-row"><span class="setting-label">专属思考引导</span>
        <textarea id="${prefix}-thoughtGuide" placeholder="只影响这位 AI 的思考链…" style="width:100%;min-height:72px;border:1px solid var(--border);border-radius:10px;padding:8px 12px;font-size:12px;outline:none;background:var(--bg);color:var(--text);line-height:1.5">${esc(ag.thoughtGuide||"")}</textarea>
      </div>
    </div>
  </div>`;
}

// ─── 数据备份（导出 JSON / 覆盖或合并导入 / 备份提醒）──────────────────────
function renderBackup(){
  const br = state.backupRemind || { enabled:false, intervalDays:7, lastBackupAt:0 };
  const last = br.lastBackupAt ? new Date(br.lastBackupAt).toLocaleString("zh") : "从未备份";
  return `<div class="page">
    ${subHeader('<i data-lucide="save"></i> 数据备份')}
    <p class="page-sub">把当前账号的聊天、记忆、配置、角色等所有数据导出为一个 JSON 文件。默认不含 API Key，恢复后需重填。</p>
    <div class="add-form" style="margin-bottom:12px">
      <div class="setting-label">导出</div>
      <button type="button" id="backup-export" class="btn-accent" style="width:100%;padding:11px"><i data-lucide="download"></i> 导出备份文件（memorypalace-backup-*.json）</button>
      <div style="font-size:10px;color:var(--sub);margin-top:6px">上次备份：${esc(last)}</div>
      <div class="setting-row" style="margin-top:8px">
        <span class="setting-label">含 API Key</span>
        <div id="backup-include-keys" class="toggle-switch" style="background:${state.backupIncludeKeys?"var(--accent)":"var(--border)"}">
          <div class="toggle-knob" style="left:${state.backupIncludeKeys?18:2}px"></div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--sub)">默认关闭：导出会剥离 Claude/OpenAI/Gemini 的 API Key，换机恢复后需手动重填。</div>
    </div>
    <div class="add-form" style="margin-bottom:12px">
      <div class="setting-label">导入</div>
      <label class="btn-accent2" style="cursor:pointer;width:100%;display:block;text-align:center;padding:11px"><i data-lucide="upload"></i> 选择备份文件导入
        <input type="file" id="backup-import-file" accept=".json" style="display:none"/>
      </label>
      <div class="channel-btns" style="margin-top:8px">
        <button type="button" id="backup-mode-overwrite" class="channel-btn active">覆盖</button>
        <button type="button" id="backup-mode-merge" class="channel-btn">合并</button>
      </div>
      <div style="font-size:10px;color:var(--sub);margin-top:6px">
        覆盖：全部用备份替换当前数据（当前数据会丢）。<br/>合并：聊天线程按消息去重合并、记忆/角色等按 id 去重，标量保留已有值。
      </div>
    </div>
    <div class="add-form">
      <div class="setting-label">备份提醒</div>
      <div class="setting-row">
        <span class="setting-label">开启提醒</span>
        <div id="backup-remind-toggle" class="toggle-switch" style="background:${br.enabled?"var(--accent)":"var(--border)"}">
          <div class="toggle-knob" style="left:${br.enabled?18:2}px"></div>
        </div>
      </div>
      <div class="setting-row"><span class="setting-label">间隔天数</span>
        <input type="number" id="backup-remind-days" min="1" max="365" value="${br.intervalDays||7}"
          style="width:90px;border:1px solid var(--border);border-radius:10px;padding:8px;background:var(--bg);color:var(--text)"/>
      </div>
    </div>
  </div>`;
}

/** 收集当前用户前缀下全部 localStorage 数据（跳过 __ 内部键） */
function backupCollectAllKeys(){
  const prefix = window.__LS_PREFIX || "";
  const data = {};
  for(let i=0; i<localStorage.length; i++){
    const k = localStorage.key(i);
    if(!k || !k.startsWith(prefix)) continue;
    const short = k.slice(prefix.length);
    if(short.startsWith("__")) continue;
    const raw = localStorage.getItem(k);
    try{ data[short] = JSON.parse(raw); }catch(e){ data[short] = raw; }
  }
  // APK 里聊天线程走原生存储（chatThreads_v2），不在 localStorage —— 从内存补上，保证备份完整
  if(state.chatThreads && typeof state.chatThreads === "object") data.chatThreads = state.chatThreads;
  return data;
}

/** 深拷贝并剥离 API Key（apiConfig 与 agents） */
function backupStripKeys(obj){
  const out = JSON.parse(JSON.stringify(obj));
  const KEY_FIELDS = ["claudeKey","openaiKey","geminiKey","auxOpenaiKey"];
  if(out && typeof out === "object"){
    if(out.apiConfig && typeof out.apiConfig === "object"){
      KEY_FIELDS.forEach(k=>{ if(k in out.apiConfig) out.apiConfig[k] = ""; });
      delete out.apiConfig._agent;
    }
    if(Array.isArray(out.agents)){
      out.agents.forEach(ag=>{ if(ag && typeof ag==="object") KEY_FIELDS.forEach(k=>{ if(k in ag) ag[k] = ""; }); });
    }
  }
  return out;
}

function backupExport(){
  const includeKeys = !!state.backupIncludeKeys;
  let data = backupCollectAllKeys();
  if(!includeKeys) data = backupStripKeys(data);
  const now = new Date();
  const pad = n => String(n).padStart(2,"0");
  const filename = `memorypalace-backup-${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
  const jsonText = JSON.stringify({ app:"memory-palace", formatVersion:1, exportedAt: now.toISOString(), includeKeys, data }, null, 2);
  const blob = new Blob([jsonText], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 2000);
  state.backupRemind = state.backupRemind || { enabled:false, intervalDays:7, lastBackupAt:0 };
  state.backupRemind.lastBackupAt = Date.now();
  persist("backupRemind");
  // WebView（Capacitor）里 <a download> 不触发保存 → 弹窗展示备份内容可复制
  if(window.Capacitor){
    state.backupResult = jsonText;
    showToast("已生成备份，请复制下方内容保存");
  } else {
    showToast("已导出备份 ✓");
  }
  render();
}

/** WebView 备份兜底浮层：只读 textarea + 复制按钮 */
function backupResultOverlay(){
  if(!state.backupResult) return "";
  return `<div class="spark-mask" data-bak-close style="z-index:9999">
    <div class="spark-detail" style="max-width:560px;max-height:84vh;overflow:hidden;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <b style="color:var(--text)">备份内容（${state.backupResult.length.toLocaleString()} 字符）</b>
        <button type="button" class="btn-ghost" data-bak-close-btn style="padding:4px 10px">✕ 关闭</button>
      </div>
      <div style="font-size:11px;color:var(--sub);margin-bottom:8px;line-height:1.5">WebView 无法直接保存文件，请点「复制全部」后粘贴到备忘录保存。也可切到浏览器打开页面再导出。</div>
      <textarea id="bak-result-text" readonly spellcheck="false" style="flex:1;min-height:180px;width:100%;border:1px solid var(--border);border-radius:10px;padding:10px;font-size:10px;line-height:1.4;font-family:ui-monospace,monospace;background:var(--bg);color:var(--text);outline:none;resize:none">${esc(state.backupResult)}</textarea>
      <button type="button" id="bak-copy" class="btn-accent" style="width:100%;margin-top:10px;padding:11px;border-radius:10px;color:#fff;background:var(--accent)"><i data-lucide="copy"></i> 复制全部</button>
    </div>
  </div>`;
}

/** 合并备份 data 到当前数据（聊天线程按 msgId/content+time 去重；数组按 id 去重；标量保留现有值） */
function backupMergeInto(data){
  const cur = backupCollectAllKeys();
  const merged = JSON.parse(JSON.stringify(cur));
  const bak = JSON.parse(JSON.stringify(data));
  // 聊天线程
  const curThreads = cur.chatThreads || {};
  const bakThreads = (bak.chatThreads && typeof bak.chatThreads === "object") ? bak.chatThreads : {};
  const mergedThreads = {};
  Object.keys(bakThreads).forEach(tid=>{
    const c = curThreads[tid] || { messages:[], pendingUser:[] };
    const b = bakThreads[tid] || { messages:[], pendingUser:[] };
    const seen = new Set();
    (c.messages||[]).forEach(m=> seen.add(m.msgId || (m.content+"|"+m.time)));
    const msgs = (c.messages||[]).slice();
    (b.messages||[]).forEach(m=>{
      const k = m.msgId || (m.content+"|"+m.time);
      if(!seen.has(k)){ msgs.push(m); seen.add(k); }
    });
    msgs.sort((x,y)=> String(x.time||"") > String(y.time||"") ? 1 : -1);
    const seenP = new Set();
    (c.pendingUser||[]).forEach(m=> seenP.add(m.content+"|"+m.time));
    const pending = (c.pendingUser||[]).slice();
    (b.pendingUser||[]).forEach(m=>{ const k=m.content+"|"+m.time; if(!seenP.has(k)){ pending.push(m); seenP.add(k); } });
    mergedThreads[tid] = { messages: msgs, pendingUser: pending };
  });
  merged.chatThreads = mergedThreads;
  // 其余键：数组按 id 去重合并；标量当前有值就保留，否则取备份
  Object.keys(bak).forEach(k=>{
    if(k === "chatThreads") return;
    const val = bak[k];
    const curVal = merged[k];
    if(Array.isArray(val)){
      if(Array.isArray(curVal)){
        const seen = new Set();
        curVal.forEach(item=>{ if(item && item.id != null) seen.add(item.id); });
        val.forEach(item=>{
          if(item && item.id != null && !seen.has(item.id)){ curVal.push(item); seen.add(item.id); }
          else if(!item || item.id == null){ curVal.push(item); }
        });
      } else if(curVal === undefined || curVal === null || curVal === ""){
        merged[k] = val;
      }
    } else {
      if(curVal === undefined || curVal === null || curVal === "") merged[k] = val;
    }
  });
  return merged;
}

function backupImport(file, mode){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const payload = JSON.parse(reader.result);
      const data = (payload && payload.app === "memory-palace" && payload.data) ? payload.data : payload;
      if(!data || typeof data !== "object") throw new Error("不是有效的 Memory Palace 备份文件");
      const final = mode === "merge" ? backupMergeInto(data) : data;
      Object.keys(final).forEach(k=> LS.set(k, final[k]));
      showToast(mode === "merge" ? "已合并导入 ✓ 即将刷新" : "已覆盖导入 ✓ 即将刷新");
      setTimeout(()=> location.reload(), 800);
    }catch(e){
      alert("导入失败："+e.message);
    }
  };
  reader.onerror = ()=> alert("读取文件失败");
  reader.readAsText(file);
}

function backupRemindCheck(forceToast){
  const br = state.backupRemind || {};
  if(!br.enabled) return;
  const last = br.lastBackupAt || Date.now();
  const days = Math.max(1, br.intervalDays || 7);
  const due = Date.now() - last >= days * 86400000;
  const todayStart = new Date().setHours(0,0,0,0);
  if(due && (forceToast || !br.__notifiedToday || br.__notifiedToday < todayStart)){
    br.__notifiedToday = Date.now();
    showToast("💾 该备份啦：已超过 "+days+" 天未备份（设置页 → 数据备份）");
  }
}
function backupRemindInit(){
  try{
    backupRemindCheck(true);
    setInterval(()=>backupRemindCheck(false), 3600000);
  }catch(e){}
}

function renderSettings(){
  const a=state.apiConfig, c=state.coupleInfo;
  const p=state.pocketConfig||{};
  const agents = state.agents || [];
  return `<div class="page">
    <h2 class="page-title"><i data-lucide="settings"></i> 设置</h2>
    ${agents.map((ag,i)=>renderAgentSettingsBlock(ag,i)).join("")}
    <div class="section">
      <div class="section-title"><i data-lucide="zap"></i> 回复输出</div>
      <div class="section-body">
        <div class="setting-row">
          <span class="setting-label">流式输出</span>
          <button type="button" id="stream-on-toggle" class="toggle-switch" aria-label="流式输出" style="background:${state.streamOn===true?"var(--accent)":"var(--border)"};border:none;padding:0;flex:none !important;width:36px;height:20px;display:inline-block !important;">
            <span class="toggle-knob" style="left:${state.streamOn===true?18:2}px;pointer-events:none"></span>
          </button>
        </div>
        <div style="font-size:11px;color:var(--sub);padding:4px 2px 8px;line-height:1.5">TA 的回复逐字显现，token 用量照常显示在思考链顶栏；出错自动回退非流式。MCP 工具对话暂走非流式。</div>
      </div>
    </div>
    <div class="section">
      <div class="section-title"><i data-lucide="brain"></i> 辅助 API（记忆整合 / 游戏）</div>
      <div class="section-body">
        <div class="setting-row">
          <span class="setting-label">渠道</span>
          <div class="channel-btns">
            <button class="channel-btn${a.auxChannel==="claude"?" active":""}" data-aux-channel="claude">Claude 官方</button>
            <button class="channel-btn${a.auxChannel==="openai"?" active":""}" data-aux-channel="openai">OpenAI 兼容</button>
          </div>
        </div>
        ${a.auxChannel==="openai"?`
          <div class="setting-row"><span class="setting-label">Aux Key</span>
            <input type="password" id="cfg-auxOpenaiKey" value="${escAttr(a.auxOpenaiKey||"")}" placeholder="留空则复用聊天 Key"/></div>
          <div class="setting-row"><span class="setting-label">Aux Base</span>
            <input id="cfg-auxOpenaiBase" value="${escAttr(a.auxOpenaiBase||"")}" placeholder="留空则复用聊天 URL"/></div>
          <div class="setting-row"><span class="setting-label">Aux 模型</span>
            <input id="cfg-auxOpenaiModel" value="${escAttr(a.auxOpenaiModel||"")}" placeholder="gpt-4o-mini"/></div>
        `:""}
      </div>
    </div>
    <div class="section">
      <div class="section-title"><i data-lucide="heart"></i> 情侣信息</div>
      <div class="section-body">
        <div class="setting-row"><span class="setting-label">在一起日期</span>
          <input type="date" id="cfg-startDate" value="${escAttr(c.startDate)}"/></div>
        <div class="setting-row"><span class="setting-label">我的签名</span>
          <input id="cfg-myName" value="${escAttr(c.myName)}"/></div>
        <div class="setting-row"><span class="setting-label">TA 的签名</span>
          <input id="cfg-partnerName" value="${escAttr(c.partnerName)}"/></div>
        <div class="setting-row"><span class="setting-label">我的头像</span>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            ${c.myAvatar?`<img src="${escAttr(c.myAvatar)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--border)"/>`:`<div style="width:40px;height:40px;border-radius:50%;background:var(--accent2);display:flex;align-items:center;justify-content:center;font-size:18px">🙂</div>`}
            <label class="btn-accent2" style="cursor:pointer;padding:6px 12px">上传<input type="file" id="cfg-myAvatar-file" accept="image/*" style="display:none"/></label>
            ${c.myAvatar?`<button type="button" id="cfg-myAvatar-clear" class="btn-ghost" style="padding:6px 10px">清除</button>`:""}
          </div>
          <input id="cfg-myAvatar" value="${escAttr(c.myAvatar)}" placeholder="或粘贴图片 URL / data URL" style="margin-top:8px"/>
        </div>
        <div class="setting-row"><span class="setting-label">TA 的头像</span>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            ${c.partnerAvatar?`<img src="${escAttr(c.partnerAvatar)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--border)"/>`:`<div style="width:40px;height:40px;border-radius:50%;background:var(--accent2);display:flex;align-items:center;justify-content:center;font-size:18px">💬</div>`}
            <label class="btn-accent2" style="cursor:pointer;padding:6px 12px">上传<input type="file" id="cfg-partnerAvatar-file" accept="image/*" style="display:none"/></label>
            ${c.partnerAvatar?`<button type="button" id="cfg-partnerAvatar-clear" class="btn-ghost" style="padding:6px 10px">清除</button>`:""}
          </div>
          <input id="cfg-partnerAvatar" value="${escAttr(c.partnerAvatar)}" placeholder="或粘贴图片 URL / data URL" style="margin-top:8px"/>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title"><i data-lucide="brain"></i> 上下文 & 记忆</div>
      <div class="section-body">
        <div class="setting-row">
          <span class="setting-label">聊天上下文条数上限</span>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="range" id="cfg-contextLimit" min="0" max="100" step="10"
              value="${state.contextLimit}" style="flex:1;accent-color:var(--accent)"/>
            <span id="cfg-contextLimit-val" style="font-size:13px;color:var(--text);min-width:32px;text-align:right">
              ${state.contextLimit===0?"不限":state.contextLimit+"条"}
            </span>
          </div>
        </div>
        <div class="setting-row">
          <span class="setting-label">记忆检索</span>
          <span style="font-size:12px;color:var(--sub)">智能余弦相似度 · Top 5</span>
        </div>
      </div>
    </div>
        <div class="section">
      <div class="section-title"><i data-lucide="monitor"></i> 服务端配置</div>
      <div class="section-body">
        <div class="setting-row">
          <span class="setting-label" style="line-height:1.5">一起听 / 屏幕时间 / 主动消息 / Callhome 网关已移至功能页「VPS」。</span>
          <button type="button" class="btn-accent2" data-sub="vps" style="margin-top:8px;align-self:flex-start">打开 VPS 配置</button>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title"><i data-lucide="globe"></i> 小浏览器（Pocket）</div>
      <div class="section-body">
        <div class="setting-row"><span class="setting-label">Server URL</span>
          <input id="pocket-serverUrl" value="${escAttr(p.serverUrl||"")}" placeholder="wss://…/pocket/ws"/></div>
        <div class="setting-row"><span class="setting-label">Token</span>
          <input id="pocket-token" type="password" value="${escAttr(p.token||"")}" placeholder="POCKET_TOKEN"/></div>
        <div class="setting-row">
          <span class="setting-label" style="line-height:1.6">给机用的小浏览器：可刷 X、查百科、打开任意网页。弹层右上角有「关闭」，不用清后台。<br/>可选：填 Server/Token 并「连接远程通道」后，登录态还能给 VPS 远程复用。</span>
        </div>
        <div class="setting-row"><span class="setting-label">打开网址</span>
          <input id="pocket-open-url" value="" placeholder="https://zh.wikipedia.org 或 https://x.com"/></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
          <button type="button" id="pocket-connect" class="btn-accent2" style="padding:8px 14px">连接远程通道</button>
          <button type="button" id="pocket-show" class="btn-accent2" style="padding:8px 14px">打开小浏览器</button>
          <button type="button" id="pocket-show-x" class="btn-ghost" style="padding:8px 14px">打开 X 登录</button>
          <button type="button" id="pocket-hide" class="btn-ghost" style="padding:8px 14px">关闭浏览器</button>
          <button type="button" id="pocket-disconnect" class="btn-ghost" style="padding:8px 14px">断开通道</button>
        </div>
        <div id="pocket-status" style="font-size:12px;color:var(--sub);margin-top:8px;line-height:1.5">未连接</div>        <div class="setting-row"><span class="setting-label">桌宠</span>
          <div class="body-switch-row" style="margin:0">
            <div>
              <div class="body-switch-label">${state.petOn?"浮窗像素宠物":"已隐藏"}</div>
              <div class="body-switch-hint">会随聊天变表情（打字/开心/睡觉）</div>
            </div>
            <div id="pet-toggle" class="toggle-switch" style="background:${state.petOn?"var(--accent)":"var(--border)"}">
              <div class="toggle-knob" style="left:${state.petOn?18:2}px"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title"><i data-lucide="gauge"></i> 缓存记账（Claude 通道）</div>
      <div class="section-body">
        <div class="setting-row">
          <span class="setting-label" style="line-height:1.6">每次请求的 token 账：<b>读</b>（缓存命中 0.1x）应该随对话单调上爬，<b>写</b>（2x）应该是两三百的小增量。<br/><span style="opacity:.7">验证方法：连续几条消息，看「读」涨不涨——read 在涨 = 缓存真命中了；read 不动 = 前缀每轮在变。</span></span>
        </div>
        <div style="font-size:12px;color:var(--sub);line-height:1.7;white-space:pre-wrap;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-top:4px" id="usage-log-box">${typeof usageLogText==="function" ? usageLogText() : ""}</div>
      </div>
    </div>
    <div class="section">
      <div class="section-title"><i data-lucide="save"></i> 数据</div>
      <div class="section-body">
        <div class="setting-row">
          <span class="setting-label" style="line-height:1.5">导出 / 导入全部数据（聊天、记忆、配置），含备份提醒。</span>
          <button type="button" class="btn-accent2" data-sub="backup" style="margin-top:8px;align-self:flex-start">打开数据备份</button>
        </div>
        <div class="setting-row">
          <span class="setting-label">安卓后台生成</span>
          <div class="channel-btns">
            <button class="channel-btn${state.bgGen==="off"?" active":""}" data-bggen="off">关</button>
            <button class="channel-btn${state.bgGen==="on"?" active":""}" data-bggen="on">开</button>
            <button class="channel-btn${state.bgGen==="onNotify"?" active":""}" data-bggen="onNotify">开+通知</button>
          </div>
        </div>
      </div>
    </div>
    <div class="settings-footer">baileys · Built with love 🌙</div>
  </div>`;
}

// ─── 工具 ────────────────────────────────────────────────────────────────────
function esc(s){ if(s==null)return""; return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function escAttr(s){ if(s==null)return""; return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;"); }

// ─── 事件 ────────────────────────────────────────────────────────────────────

// ─── 核心导航 + 事件委托（防止 bindEvents 中途报错导致全点不动）────────────
function bindCoreNav(){
  document.querySelectorAll(".bottom-nav button").forEach(btn=>{
    btn.onclick=()=>{
      try{
        if(state.tab==="chat") saveActiveThread();
        const next = btn.dataset.tab;
        if(next==="chat" && state.tab!=="chat"){
          const t = state.chatTarget || "a1";
          const th = (state.chatThreads && state.chatThreads[t]) || {messages:[],pendingUser:[]};
          state.messages = th.messages || [];
          state.pendingUser = th.pendingUser || [];
          state.needChatScroll = true;
        }
        state.tab=next; state.subPage=null; state.homePage=1; render();
      }catch(e){ console.error(e); }
    };
  });
  const back=document.getElementById("sub-back");
  if(back) back.onclick=()=>{
    if(state.subPage==="shufang" && state.shufangTab==="editor" && typeof shufangSaveChapter==="function") shufangSaveChapter(true);
    state.subPage=null; render();
  };
  document.querySelectorAll("[data-sub]").forEach(btn=>{
    btn.onclick=()=>{
      const key = btn.getAttribute("data-sub") || btn.dataset.sub;
      if(!key) return;
      if(typeof openBiscaGame==="function" && openBiscaGame(key)) return;
      state.subPage = key;
      render();
    };
  });
}
if(!window.__mpDelegated){
  window.__mpDelegated = true;
  // —— 核心按钮委托（capture）：即使 bindEvents 中途抛错，导航/发信/退出仍可用 ——
  document.addEventListener("click", function(e){
    try{
      const raw = e.target;
      if(!raw || !raw.closest) return;
      // 底栏
      const tabBtn = raw.closest(".bottom-nav button[data-tab]");
      if(tabBtn){
        e.preventDefault(); e.stopImmediatePropagation();
        if(state.tab==="chat" && typeof saveActiveThread==="function") saveActiveThread();
        const next = tabBtn.getAttribute("data-tab") || tabBtn.dataset.tab;
        if(next==="chat" && state.tab!=="chat"){
          const tg = state.chatTarget || "a1";
          const th = (state.chatThreads && state.chatThreads[tg]) || {messages:[],pendingUser:[]};
          state.messages = th.messages || [];
          state.pendingUser = th.pendingUser || [];
          state.needChatScroll = true;
        }
        state.tab = next; state.subPage = null; state.homePage = 1;
        if(typeof render==="function") render();
        return;
      }
      // 功能入口：仅功能卡，避免子页内部误伤
      const subBtn = raw.closest("button.feat-card[data-sub]");
      if(subBtn && !raw.closest(".bottom-nav")){
        const key = subBtn.getAttribute("data-sub") || subBtn.dataset.sub;
        if(key){
          e.preventDefault(); e.stopImmediatePropagation();
          if(typeof openBiscaGame==="function" && openBiscaGame(key)) return;
          state.subPage = key;
          if(typeof render==="function") render();
          return;
        }
      }
      // 每日任务打卡
      const qToggle = raw.closest("[data-quest-toggle]");
      if(qToggle){
        e.preventDefault(); e.stopImmediatePropagation();
        const qd = state.questData || (typeof questDefaultData==="function"?questDefaultData():{quests:[]});
        const q = (qd.quests||[]).find(x=>String(x.id)===String(qToggle.getAttribute("data-quest-toggle")));
        if(q){ q.done = !q.done; state.questData = qd; try{ persist("questData"); }catch(e){} if(typeof render==="function") render(); }
        return;
      }
      // 记录日历
      const dutyDay = raw.closest("[data-duty-day]");
      if(dutyDay){
        e.preventDefault(); e.stopImmediatePropagation();
        const k = dutyDay.getAttribute("data-duty-day") || dutyDay.dataset.dutyDay;
        state.dutySelected = k;
        const rec = (state.dutyRecords||{})[k] || {};
        state.dutyDraft = { note: rec.note||"", mood: rec.mood||"" };
        if(typeof render==="function") render();
        return;
      }
      // 衣柜
      const wardTab = raw.closest("[data-ward-tab]");
      if(wardTab){
        e.preventDefault(); e.stopImmediatePropagation();
        state.wardrobeTab = wardTab.getAttribute("data-ward-tab") || wardTab.dataset.wardTab;
        state.wardrobeAdding=false;
        if(typeof render==="function") render();
        return;
      }
      const wardCat = raw.closest("[data-ward-cat]");
      if(wardCat){
        e.preventDefault(); e.stopImmediatePropagation();
        const c = wardCat.getAttribute("data-ward-cat") || wardCat.dataset.wardCat;
        state.wardrobeCatFilter = c;
        state.wardrobeNewCat = c;
        if(typeof render==="function") render();
        return;
      }
      const wardDel = raw.closest("[data-ward-del]");
      if(wardDel){
        e.preventDefault(); e.stopImmediatePropagation();
        const idDel = wardDel.getAttribute("data-ward-del");
        if(idDel && confirm("删除这件衣服？")){
          state.wardrobeItems = (state.wardrobeItems||[]).filter(x=>String(x.id)!==String(idDel));
          try{ persist("wardrobeItems"); }catch(e){}
          if(typeof render==="function") render();
        }
        return;
      }
      const idEl = raw.closest("[id]");
      const id = idEl && idEl.id;
      if(id==="stream-on-toggle" || raw.closest("#stream-on-toggle")){
        e.preventDefault(); e.stopImmediatePropagation();
        state.streamOn = state.streamOn === true ? false : true;
        try{ LS.set("streamOn", state.streamOn); }catch(err){}
        try{ persist("streamOn"); }catch(err){}
        if(typeof showToast==="function") showToast(state.streamOn ? "流式输出：开" : "流式输出：关");
        if(typeof render==="function") render();
        return;
      }
      if(id==="ward-feed-toggle" || id==="ward-feed"){
        e.preventDefault(); e.stopImmediatePropagation();
        state.wardrobeFeedChat = !state.wardrobeFeedChat;
        try{ persist("wardrobeFeedChat"); }catch(e){}
        if(typeof render==="function") render();
        return;
      }
      if(id==="ward-add-toggle"){
        e.preventDefault(); e.stopImmediatePropagation();
        state.wardrobeAdding = !state.wardrobeAdding;
        if(typeof render==="function") render();
        return;
      }
      // 机日记 / 小纸条 / 信箱 卡片与详情
      const mcOpenEl = raw.closest("[data-mc-open]");
      if(mcOpenEl){
        const v = mcOpenEl.getAttribute("data-mc-open") || "";
        const i0 = v.indexOf(":");
        if(i0>0){
          e.preventDefault(); e.stopImmediatePropagation();
          if(typeof mcOpenDetail==="function") mcOpenDetail(v.slice(0,i0), v.slice(i0+1));
          return;
        }
      }
      if(id==="mc-detail-close" || (id==="mc-detail-mask" && e.target && e.target.id==="mc-detail-mask")){
        e.preventDefault(); e.stopImmediatePropagation();
        if(typeof mcCloseDetail==="function") mcCloseDetail();
        return;
      }
      const mcDel = raw.closest("[data-mc-del]");
      if(mcDel && typeof mcDelete==="function"){
        e.preventDefault(); e.stopImmediatePropagation();
        const v = mcDel.getAttribute("data-mc-del") || "";
        const i0 = v.indexOf(":");
        if(i0>0){
          try{ mcDelete(v.slice(0,i0), v.slice(i0+1)); }catch(err){}
        }
        return;
      }
      if(id==="ward-feed-toggle" || raw.closest("#ward-feed-toggle")){
        e.preventDefault(); e.stopImmediatePropagation();
        state.wardrobeFeedChat = !state.wardrobeFeedChat;
        try{ persist("wardrobeFeedChat"); }catch(e){}
        if(typeof render==="function") render();
        return;
      }
      if(id==="ward-cancel-item"){
        e.preventDefault(); e.stopImmediatePropagation();
        state.wardrobeAdding=false;
        if(typeof render==="function") render();
        return;
      }
      if(id==="ward-save-item"){
        e.preventDefault(); e.stopImmediatePropagation();
        const name = (document.getElementById("ward-new-name")?.value || state.wardrobeNewName || "").trim();
        const desc = (document.getElementById("ward-new-desc")?.value || state.wardrobeNewDesc || "").trim();
        if(!name){ alert("请填写名称（首页显示用）"); return; }
        const cat = state.wardrobeNewCat || state.wardrobeCatFilter || "top";
        const item = { id: "w_"+Date.now(), name, desc, category: cat };
        state.wardrobeItems = (state.wardrobeItems||[]).concat([item]);
        state.wardrobeAdding=false;
        state.wardrobeNewName="";
        state.wardrobeNewDesc="";
        try{ persist("wardrobeItems"); }catch(e){}
        if(typeof render==="function") render();
        return;
      }
      if(id==="quest-enable-toggle" || raw.closest("#quest-enable-toggle")){
        e.preventDefault(); e.stopImmediatePropagation();
        state.questEnabled = state.questEnabled===false ? true : false;
        try{ persist("questEnabled"); }catch(e){}
        if(typeof render==="function") render();
        return;
      }
      if(id==="duty-modal-close" || id==="duty-modal-mask"){
        // mask 仅点遮罩关闭：若点到内部 modal 不关
        if(id==="duty-modal-mask" && e.target && e.target.id!=="duty-modal-mask") return;
        e.preventDefault(); e.stopImmediatePropagation();
        state.dutySelected=null;
        if(typeof render==="function") render();
        return;
      }
      if(id==="duty-save-done"){
        e.preventDefault(); e.stopImmediatePropagation();
        const k = state.dutySelected;
        if(!k) return;
        const mood = (document.getElementById("duty-mood")?.value || "").trim();
        const note = (document.getElementById("duty-note")?.value || "").trim();
        state.dutyRecords = state.dutyRecords || {};
        state.dutyRecords[k] = { done:true, mood, note, at: new Date().toISOString() };
        try{ persist("dutyRecords"); }catch(e){}
        state.dutySelected=null;
        if(typeof render==="function") render();
        return;
      }
      if(id==="duty-clear"){
        e.preventDefault(); e.stopImmediatePropagation();
        const k = state.dutySelected;
        if(k && state.dutyRecords){ delete state.dutyRecords[k]; try{ persist("dutyRecords"); }catch(e){} }
        state.dutySelected=null;
        if(typeof render==="function") render();
        return;
      }
      if(id==="duty-remind-toggle" || raw.closest("#duty-remind-toggle")){
        e.preventDefault(); e.stopImmediatePropagation();
        state.dutyRemindOn = state.dutyRemindOn===false ? true : false;
        try{ persist("dutyRemindOn"); }catch(e){}
        if(typeof render==="function") render();
        return;
      }
      if(id==="chat-exit-home" || (idEl && idEl.closest && idEl.closest("#chat-exit-home"))){
        e.preventDefault(); e.stopImmediatePropagation();
        state.tab="home"; state.subPage=null;
        if(typeof render==="function") render();
        return;
      }
      if(id==="chat-send" || raw.closest("#chat-send")){
        e.preventDefault(); e.stopImmediatePropagation();
        if(typeof sendUserMsg==="function") sendUserMsg();
        return;
      }
      if(id==="toggle-guide" || raw.closest("#toggle-guide")){
        e.preventDefault(); e.stopImmediatePropagation();
        state.showThoughtGuide = !state.showThoughtGuide;
        if(typeof render==="function") render();
        return;
      }
      if(id==="sub-back" || raw.closest("#sub-back")){
        e.preventDefault(); e.stopImmediatePropagation();
        if(state.subPage==="shufang" && state.shufangTab==="editor" && typeof shufangSaveChapter==="function") shufangSaveChapter(true);
        state.subPage=null;
        if(typeof render==="function") render();
        return;
      }
    }catch(err){ console.error("[core-delegate]", err); }
  }, true);
  // 桌面右键气泡 → 收藏聊天（与触屏长按等价）
  document.addEventListener("contextmenu", function(e){
    try{
      if(state && state.tab==="chat" && e.target && e.target.closest){
        const el = e.target.closest("[data-msg-idx]");
        if(el && typeof openSaveChat==="function"){ e.preventDefault(); openSaveChat(+el.dataset.msgIdx); }
      }
    }catch(err){}
  });
  // 点气泡操作条之外的地方 → 收起操作条
  document.addEventListener("click", function(e){
    try{
      if(state && state.msgBarIdx!=null && state.tab==="chat" && e.target && e.target.closest){
        if(!e.target.closest("[data-msg-idx]") && !e.target.closest(".msg-bar")){
          state.msgBarIdx=null;
          if(typeof render==="function") render();
        }
      }
    }catch(err){}
  });
  // 输入栏「+」面板：点空白处收起（「+」按钮、面板本身、输入框内的点击除外，避免抢输入焦点）
  document.addEventListener("click", function(e){
    try{
      if(state.chatMoreOpen && e.target && e.target.closest){
        if(e.target.closest("#chat-more-btn") || e.target.closest("#chat-more-panel") || e.target.closest("#chat-input")) return;
        state.chatMoreOpen=false;
        if(typeof render==="function") render();
      }
    }catch(err){}
  });
  document.addEventListener("click", function(e){
    try{
      const raw = e.target;
      if(!raw || !raw.closest) return;
      const idEl = raw.closest("[id]");
      const id = idEl && idEl.id;


      // —— 囚禁模拟器 ——
      if(id==="cap-save"){
        e.preventDefault(); e.stopImmediatePropagation();
        const c = ensureCaptivityConfig();
        const inp = document.getElementById("cap-base-url");
        c.baseUrl = inp ? inp.value.trim() : (c.baseUrl||"");
        persist("captivityConfig");
        alert("已保存");
        render();
        return;
      }
      if(id==="cap-open"){ e.preventDefault(); e.stopImmediatePropagation(); openCaptivityGame(); return; }
      if(id==="cap-mode-iframe"){ e.preventDefault(); e.stopImmediatePropagation(); ensureCaptivityConfig().openIn="iframe"; persist("captivityConfig"); render(); return; }
      if(id==="cap-mode-window"){ e.preventDefault(); e.stopImmediatePropagation(); ensureCaptivityConfig().openIn="window"; persist("captivityConfig"); render(); return; }
      if(id==="cap-frame-close"){ e.preventDefault(); e.stopImmediatePropagation(); closeCaptivityGame(); return; }
      if(id==="cap-frame-ext"){
        e.preventDefault(); e.stopImmediatePropagation();
        const u = captivityLaunchUrl();
        if(u) window.open(u, "_blank", "noopener,noreferrer");
        return;
      }

      // —— 电话 ——
      if(id==="call-start" || id==="call-start-out"){ e.preventDefault(); e.stopImmediatePropagation(); if(typeof callStartOutgoing==="function") callStartOutgoing(); return; }
      if(id==="call-accept"){ e.preventDefault(); e.stopImmediatePropagation(); if(typeof callAccept==="function") callAccept(); return; }
      if(id==="call-decline"){ e.preventDefault(); e.stopImmediatePropagation(); if(typeof callDecline==="function") callDecline(""); return; }
      if(id==="call-decline-send"){ e.preventDefault(); e.stopImmediatePropagation(); const n=(document.getElementById("call-decline-input")?.value||"").trim(); if(typeof callDecline==="function") callDecline(n); return; }
      if(id==="call-decline-note"){ e.preventDefault(); const n=prompt("留言（可空）")||""; if(typeof callDecline==="function") callDecline(n); return; }
      if(id==="call-hang"){ e.preventDefault(); e.stopImmediatePropagation(); if(typeof callHangup==="function") callHangup(); return; }
      if(id==="call-send"){ e.preventDefault(); e.stopImmediatePropagation(); if(typeof callSendUser==="function") callSendUser(); return; }
      if(id==="call-mute"){ e.preventDefault(); e.stopImmediatePropagation(); const s=ensureCallSession(); s.muted=!s.muted; render(); return; }
      if(id==="call-sim-in"){ e.preventDefault(); e.stopImmediatePropagation(); if(typeof callSimulateIncoming==="function") callSimulateIncoming(); return; }
      if(id==="call-dnd" || id==="call-dnd-toggle"){ e.preventDefault(); e.stopImmediatePropagation(); state.callConfig=state.callConfig||{}; state.callConfig.dnd=!state.callConfig.dnd; persist("callConfig"); render(); return; }
      if(id==="call-tts-test"){ e.preventDefault(); (async()=>{ try{ await callSpeak("喂，是我。听到了吗？"); }catch(err){} })(); return; }
      if(id==="call-tts-toggle"){ e.preventDefault(); state.callConfig=state.callConfig||{}; state.callConfig.ttsEnabled=state.callConfig.ttsEnabled===false?true:false; persist("callConfig"); render(); return; }

      // —— 碎星 ——
      if(id==="spark-send"){ e.preventDefault(); e.stopImmediatePropagation(); if(typeof sparkSubmit==="function") sparkSubmit(); return; }
      if(id==="spark-save"){ e.preventDefault(); e.stopImmediatePropagation(); if(typeof sparkPersist==="function") sparkPersist(); state.sparkDetailId=null; render(); return; }

      // —— 解谜 ——
      if(id==="puzzle-submit"){ e.preventDefault(); e.stopImmediatePropagation(); if(typeof puzzleSubmitAnswer==="function") puzzleSubmitAnswer(); return; }
      if(id==="puzzle-abandon"){ e.preventDefault(); e.stopImmediatePropagation(); if(typeof puzzleAbandon==="function") puzzleAbandon(); return; }
      if(id==="puzzle-back-select"){ e.preventDefault(); e.stopImmediatePropagation(); if(typeof puzzleContinueNext==="function") puzzleContinueNext(); return; }

      // —— 柜子弹层（id 必须与 renderCabinets 一致）——
      if(id==="cab-modal-close" || id==="cab-close"){ e.preventDefault(); state.cabinetOpenId=null; render(); return; }
      if(id==="cab-prev"){ e.preventDefault(); cabinetSwitch(-1); return; }
      if(id==="cab-next"){ e.preventDefault(); cabinetSwitch(1); return; }
      if(id==="cab-item-save"){
        e.preventDefault(); e.stopImmediatePropagation();
        const open = typeof cabinetById==="function" ? cabinetById(state.cabinetOpenId) : null;
        if(!open) return;
        const name = (document.getElementById("cab-item-name")?.value||"").trim();
        const note = (document.getElementById("cab-item-note")?.value||"").trim();
        if(!name){ alert("请填写物品名称"); return; }
        open.items = open.items||[];
        open.items.push({ id: Date.now(), name, note, addedBy:"user", time: new Date().toISOString() });
        state.cabinetItemDraft = { name:"", note:"" };
        persist("cabinets");
        if(typeof postAppEvent==="function") postAppEvent("cabinet_change", { cabinet: open.name, action:"add", item: name });
        render();
        return;
      }
      if(id==="cab-clear-items"){
        e.preventDefault(); e.stopImmediatePropagation();
        const open = typeof cabinetById==="function" ? cabinetById(state.cabinetOpenId) : null;
        if(!open) return;
        if(!confirm("清空「"+open.name+"」里的所有物品？")) return;
        open.items = [];
        persist("cabinets"); render();
        return;
      }
      if(id==="cab-ai-edit"){ e.preventDefault(); e.stopImmediatePropagation(); if(typeof cabinetAiEdit==="function") cabinetAiEdit(); return; }
      if(id==="cab-new-save"){
        e.preventDefault(); e.stopImmediatePropagation();
        const name = (document.getElementById("cab-new-name")?.value||state.cabinetNewName||"").trim();
        if(!name){ alert("请填写柜子名称"); return; }
        const list = ensureCabinets();
        const icons = ["archive","book","footprints","pill","broom","shirt","package","basket"];
        list.push({ id: "cab_"+Date.now(), name, icon: icons[list.length % icons.length], items: [] });
        state.cabinetNewName = "";
        persist("cabinets"); render();
        return;
      }
      if(id==="cab-modal-mask"){
        // only when click directly on mask
        if(raw.id==="cab-modal-mask" || raw===idEl){ state.cabinetOpenId=null; render(); }
        return;
      }

      // data-* attributes
      const t = raw.closest("[data-sub],[data-puzzle-start],[data-puzzle-choice],[data-cab-open],[data-cab-del],[data-cab-item-del],[data-spark-book],[data-spark-newbook],[data-spark-tag],[data-spark-open],[data-spark-close],[data-spark-rmtag],[data-spark-del]");
      if(!t) return;

      if(t.hasAttribute("data-sub")){
        const key = t.getAttribute("data-sub");
        if(key){ state.subPage = key; render(); e.preventDefault(); }
        return;
      }
      if(t.hasAttribute("data-puzzle-start")){
        if(t.disabled) return;
        const pid = t.getAttribute("data-puzzle-start");
        if(pid && typeof puzzleStart==="function"){ puzzleStart(pid); e.preventDefault(); }
        return;
      }
      if(t.hasAttribute("data-puzzle-choice")){
        const idx = +t.getAttribute("data-puzzle-choice");
        if(typeof puzzleChoose==="function") puzzleChoose(idx);
        else if(typeof puzzlePickChoice==="function") puzzlePickChoice(idx);
        e.preventDefault();
        return;
      }
      if(t.hasAttribute("data-cab-open")){
        if(raw.closest("[data-cab-del]")) return;
        state.cabinetOpenId = t.getAttribute("data-cab-open");
        state.cabinetItemDraft = { name:"", note:"" };
        render(); e.preventDefault();
        return;
      }
      if(t.hasAttribute("data-cab-del")){
        e.preventDefault(); e.stopImmediatePropagation();
        const cid = t.getAttribute("data-cab-del");
        if(!confirm("删除这个柜子？")) return;
        state.cabinets = (ensureCabinets()||[]).filter(c=>c.id!==cid);
        if(state.cabinetOpenId===cid) state.cabinetOpenId=null;
        persist("cabinets"); render();
        return;
      }
      if(t.hasAttribute("data-cab-item-del")){
        e.preventDefault(); e.stopImmediatePropagation();
        const open = typeof cabinetById==="function" ? cabinetById(state.cabinetOpenId) : null;
        if(!open) return;
        open.items = (open.items||[]).filter(it=>String(it.id)!==String(t.getAttribute("data-cab-item-del")));
        persist("cabinets"); render();
        return;
      }
      if(t.hasAttribute("data-spark-book")){
        e.preventDefault(); e.stopImmediatePropagation();
        const sv = typeof ensureSpark==="function" ? ensureSpark() : null;
        if(!sv) return;
        const idx = sv.books.findIndex(b=>b.id===t.getAttribute("data-spark-book"));
        if(idx>=0){ sv.cur = idx; state.sparkTag = "全部"; state.sparkDetailId = null; state.sparkDraft = ""; if(typeof sparkPersist==="function") sparkPersist(); render(); }
        return;
      }
      if(t.hasAttribute("data-spark-newbook")){
        e.preventDefault(); e.stopImmediatePropagation();
        const title = (window.prompt("新书名字：")||"").trim();
        if(!title) return;
        const sv = ensureSpark();
        sv.books.push({ id:"sb_"+Date.now(), title, color:["#EC4899","#F59E0B","#10B981","#3B82F6","#EF4444"][sv.books.length%5], cards:[] });
        sv.cur = sv.books.length-1; state.sparkTag = "全部"; state.sparkDetailId = null;
        sparkPersist(); render();
        return;
      }
      if(t.hasAttribute("data-spark-tag")){
        e.preventDefault(); e.stopImmediatePropagation();
        state.sparkTag = t.getAttribute("data-spark-tag"); render();
        return;
      }
      if(t.hasAttribute("data-spark-open")){
        e.preventDefault(); e.stopImmediatePropagation();
        state.sparkDetailId = t.getAttribute("data-spark-open"); render();
        return;
      }
      if(t.hasAttribute("data-spark-close")){
        e.preventDefault(); e.stopImmediatePropagation();
        if(t.classList.contains("spark-mask") && raw.closest(".spark-detail")){ /* 点到详情内容不关 */ }
        else { state.sparkDetailId = null; render(); }
        return;
      }
      if(t.hasAttribute("data-spark-rmtag")){
        e.preventDefault(); e.stopImmediatePropagation();
        const c = typeof sparkDetailCard==="function" ? sparkDetailCard() : null;
        if(!c) return;
        const i = +t.getAttribute("data-spark-rmtag");
        (c.tags||[]).splice(i,1);
        sparkPersist(); render();
        return;
      }
      if(t.hasAttribute("data-spark-del")){
        e.preventDefault(); e.stopImmediatePropagation();
        const c = typeof sparkDetailCard==="function" ? sparkDetailCard() : null;
        if(!c) return;
        if(!window.confirm("删除这条灵感？")) return;
        const b = sparkBook();
        b.cards = b.cards.filter(x=>x.id!==c.id);
        state.sparkDetailId = null;
        sparkPersist(); render();
        return;
      }
    }catch(err){ console.error("[mp-delegate]", err); }
  }, true);
}


function bindEvents(){
  const _safe = (label, fn)=>{ try{ fn(); }catch(e){ console.error("[bindEvents:"+label+"]", e); } };
  _safe("coreNav", ()=>bindCoreNav());
  _safe("calendar", ()=>{ if(typeof bindCoupleCalendar==="function" && state.subPage==="calendar") bindCoupleCalendar(); });
  _safe("anno", ()=>{ if(typeof bindAnno==="function" && state.subPage==="anno") bindAnno(); });
  _safe("pr", ()=>{ if(typeof bindPr==="function" && state.subPage==="pr") bindPr(); });
  _safe("prOverlay", ()=>{ if(typeof bindPrOverlay==="function") bindPrOverlay(); });

  document.querySelectorAll(".bottom-nav button").forEach(btn=>{
    btn.onclick=()=>{
      if(state.tab==="chat") saveActiveThread();
      const next = btn.dataset.tab;
      if(next==="chat" && state.tab!=="chat"){
        // 进入聊天时载入当前目标线程，并滚到最新
        const t = state.chatTarget || "a1";
        const th = (state.chatThreads && state.chatThreads[t]) || {messages:[],pendingUser:[]};
        state.messages = th.messages || [];
        state.pendingUser = th.pendingUser || [];
        state.needChatScroll = true;
      }
      state.tab=next; state.subPage=null; state.homePage=1; render();
    };
  });

  const back=document.getElementById("sub-back");
  if(back) back.onclick=()=>{
    if(state.subPage==="shufang" && state.shufangTab==="editor" && typeof shufangSaveChapter==="function") shufangSaveChapter(true);
    state.subPage=null; render();
  };

  bindHomeSwipe();

  document.querySelectorAll("[data-sub]").forEach(btn=>{
    btn.onclick=()=>{ state.subPage=btn.dataset.sub; render(); };
  });

  // 首页状态
  const statusEdit=document.getElementById("status-edit");
  if(statusEdit) statusEdit.onclick=()=>{ state.statusEditing=true; state.editStatus=state.coupleInfo.statusMsg; render(); };
  const statusSave=document.getElementById("status-save");
  if(statusSave) statusSave.onclick=()=>{
    const inp=document.getElementById("status-input");
    state.coupleInfo.statusMsg=inp.value; state.statusEditing=false; persist("coupleInfo"); render();
  };

  // 聊天热力日历翻月
  const heatPrev=document.getElementById("heat-prev");
  if(heatPrev) heatPrev.onclick=()=>{
    if(state.heatMonth===0){ state.heatMonth=11; state.heatYear--; }
    else state.heatMonth--;
    render();
  };
  const heatNext=document.getElementById("heat-next");
  if(heatNext) heatNext.onclick=()=>{
    if(state.heatMonth===11){ state.heatMonth=0; state.heatYear++; }
    else state.heatMonth++;
    render();
  };

  // 日记（实体书：双页 + 翻页）
  const bookPrev = document.getElementById("book-prev");
  if(bookPrev){ bookPrev.disabled = bookBusy; bookPrev.onclick = ()=> bookFlip(-1); }
  const bookNext = document.getElementById("book-next");
  if(bookNext){ bookNext.disabled = bookBusy; bookNext.onclick = ()=> bookFlip(1); }
  const bookToday = document.getElementById("book-today");
  if(bookToday) bookToday.onclick = ()=>{ state.selectedDay = diaryTodayKey(); bookPageIdx = 0; state.bookComposer=null; state.bookDraft=""; render(); };
  const bookOpen = document.getElementById("book-open");
  if(bookOpen) bookOpen.onclick = ()=>{ state.bookCover=false; render(); };
  const bookCoverView = document.getElementById("book-cover-view");
  if(bookCoverView && !bookCoverView._openBound){
    bookCoverView._openBound = true;
    bookCoverView.onclick = ()=>{ state.bookCover=false; render(); };
  }
  const bookCoverBtn = document.getElementById("book-cover");
  if(bookCoverBtn) bookCoverBtn.onclick = ()=>{ state.bookCover=true; render(); };
  // 点内页直接打字：整页点击进入「写下今天」编辑器（删除按钮除外）
  document.querySelectorAll("[data-book-write]").forEach(pg=>{
    pg.onclick = (e)=>{
      if(state.bookComposer) return;
      if(e.target && e.target.closest && e.target.closest(".book-del")) return;
      openBookComposer("write");
    };
  });

  const bookWrap = document.getElementById("book-wrap");
  if(bookWrap && !bookWrap._bookSwipeBound){
    bookWrap._bookSwipeBound = true;
    let sx=0, dx=0;
    bookWrap.addEventListener("touchstart", e=>{ if(bookBusy) return; sx=e.touches[0].clientX; dx=0; }, {passive:true});
    bookWrap.addEventListener("touchmove", e=>{ dx=e.touches[0].clientX-sx; }, {passive:true});
    bookWrap.addEventListener("touchend", ()=>{ if(state.bookComposer) return; if(dx<-40) bookFlip(1); else if(dx>40) bookFlip(-1); });
  }
  document.querySelectorAll("[data-book-del]").forEach(el=>{
    el.onclick = ()=>{
      const [who, idx] = (el.dataset.bookDel||"").split(":");
      if(!who || idx==null) return;
      diaryDel(state.selectedDay, who, +idx);
      if(typeof postAppEvent==="function") postAppEvent("diary_book_del", { date:state.selectedDay, by:who });
      render();
    };
  });

  const bookWrite = document.getElementById("book-write");
  if(bookWrite) bookWrite.onclick = ()=> openBookComposer("write");
  const bookRespond = document.getElementById("book-respond");
  if(bookRespond) bookRespond.onclick = ()=> openBookComposer("respond");
  const bookMemory = document.getElementById("book-memory");
  if(bookMemory) bookMemory.onclick = ()=> openBookComposer("memory");

  const bookCancel = document.getElementById("book-cancel");
  if(bookCancel) bookCancel.onclick = closeBookComposer;
  const bookInp = document.getElementById("book-inp");
  if(bookInp){
    bookInp.oninput = ()=>{ state.bookDraft = bookInp.value; };
    bookInp.focus(); // 打开内联编辑器后直接聚焦可打字
  }
  const bookSave = document.getElementById("book-save");
  if(bookSave) bookSave.onclick = bookComposerSave;
  const bookAi = document.getElementById("book-ai");
  if(bookAi) bookAi.onclick = bookComposerAI;

  // 相册：左右滑动翻卡片
  const albumViewport = document.getElementById("album-viewport");
  if(albumViewport && !albumViewport._albumSwipe){
    albumViewport._albumSwipe = true;
    let sx=0, dx=0;
    albumViewport.addEventListener("touchstart", e=>{ sx=e.touches[0].clientX; dx=0; }, {passive:true});
    albumViewport.addEventListener("touchmove",  e=>{ dx=e.touches[0].clientX-sx; },   {passive:true});
    albumViewport.addEventListener("touchend",  ()=>{ if(dx<-40) albumGo(1); else if(dx>40) albumGo(-1); });
  }
  const albumPrev = document.getElementById("album-prev");
  if(albumPrev) albumPrev.onclick = ()=> albumGo(-1);
  const albumNext = document.getElementById("album-next");
  if(albumNext) albumNext.onclick = ()=> albumGo(1);
  document.querySelectorAll("[data-album-dot]").forEach(el=>{
    el.onclick = ()=>{ state.albumIdx = +el.dataset.albumDot; render(); };
  });
  const albumEdit = document.getElementById("album-edit");
  if(albumEdit) albumEdit.onclick = ()=>{
    const a = (state.albumData||[])[state.albumIdx];
    if(!a) return;
    const c = prompt("修改这张照片的感想：", a.caption||"");
    if(c===null) return;
    a.caption = (c||"").trim() || "想留住的瞬间";
    persist("albumData"); render();
    if(typeof postAppEvent==="function") postAppEvent("album_edit",{ id:a.id });
  };
  const albumDel = document.getElementById("album-del");
  if(albumDel) albumDel.onclick = ()=>{
    const a = (state.albumData||[])[state.albumIdx];
    if(!a) return;
    if(!window.confirm("删除这张照片？")) return;
    state.albumData = state.albumData.filter(x=>x.id!==a.id);
    if(state.albumIdx >= state.albumData.length) state.albumIdx = Math.max(0, state.albumData.length-1);
    persist("albumData"); render();
    if(typeof postAppEvent==="function") postAppEvent("album_delete",{ id:a.id });
  };

  // ─── 小狗动作：点爪印气泡 → 把 [action:xxx] 作为用户消息发出并让 TA 回 ───
  document.querySelectorAll("[data-action-send]").forEach(el=>{
    el.onclick=(ev)=>{ ev.preventDefault(); ev.stopPropagation(); sendPuppyAction(el.dataset.actionSend); };
  });
  // 小狗按钮：顶栏图标 → 全屏按钮页
  const puppyOpen=document.getElementById("puppy-open");
  if(puppyOpen) puppyOpen.onclick=()=>{ state.puppyPageOpen=true; render(); };
  document.querySelectorAll("[data-puppy-mode]").forEach(btn=>{
    btn.onclick=()=>{ state.gameMode = btn.dataset.puppyMode; render(); };
  });
  document.querySelectorAll("[data-puppy-close]").forEach(btn=>{
    btn.onclick=(ev)=>{ ev.preventDefault(); ev.stopPropagation(); state.puppyPageOpen=false; render(); };
  });
  document.querySelectorAll("[data-puppy-close-backdrop]").forEach(el=>{
    el.onclick=(ev)=>{ if(ev.target===el){ state.puppyPageOpen=false; render(); } };
  });
  document.querySelectorAll("[data-puppy-send]").forEach(btn=>{
    btn.onclick=(ev)=>{ ev.preventDefault(); ev.stopPropagation();
      sendPuppyAction(btn.dataset.puppySend);
      state.puppyPageOpen=false; render();
    };
  });
  // ─── 表情包 ─────────────────────────────────────────────
  const stickerBtn=document.getElementById("sticker-btn");
  if(stickerBtn) stickerBtn.onclick=(e)=>{ e.stopPropagation(); state.stickerOpen=true; state.chatMoreOpen=false; render(); };
  document.querySelectorAll("[data-sticker-close]").forEach(el=>{
    el.onclick=(ev)=>{ ev.preventDefault(); ev.stopPropagation(); state.stickerOpen=false; render(); };
  });
  document.querySelectorAll("[data-sticker-close-backdrop]").forEach(el=>{
    el.onclick=(ev)=>{ if(ev.target===el){ state.stickerOpen=false; render(); } };
  });
  document.querySelectorAll("[data-sticker-send]").forEach(el=>{
    el.onclick=(ev)=>{ ev.preventDefault(); ev.stopPropagation();
      sendSticker(el.dataset.stickerSend);
      state.stickerOpen=false; render();
    };
  });
  document.querySelectorAll("[data-sticker-del]").forEach(el=>{
    el.onclick=(ev)=>{ ev.preventDefault(); ev.stopPropagation();
      if(confirm("删除表情「"+el.dataset.stickerDel+"」？")){ delSticker(el.dataset.stickerDel); state.stickerOpen=true; render(); }
    };
  });
  document.querySelectorAll("[data-sticker-add-toggle]").forEach(el=>{
    el.onclick=(ev)=>{ ev.preventDefault(); ev.stopPropagation(); state.stickerAddOpen=!state.stickerAddOpen; render(); };
  });
  document.querySelectorAll("[data-sticker-add-save]").forEach(el=>{
    el.onclick=()=>{
      const gid=(id)=>document.getElementById(id);
      const name=(gid("sticker-add-name")||{}).value||"";
      const url=(gid("sticker-add-url")||{}).value||"";
      const descr=(gid("sticker-add-descr")||{}).value||"";
      const r=addSticker(name.trim(),url.trim(),descr.trim());
      if(!r.ok){ if(typeof showToast==="function") showToast(r.msg,"error"); return; }
      state.stickerAddOpen=false; render();
    };
  });
  // 情侣计分器
  document.querySelectorAll("[data-love-delta]").forEach(btn=>{
    btn.onclick=()=>{ loveApplyDelta(parseInt(btn.dataset.loveDelta,10)||0); };
  });
  const loveReason=document.getElementById("love-reason");
  if(loveReason) loveReason.oninput=()=>{ state.loveReasonDraft=loveReason.value; };
  // 主页资料卡：点头像进主页 / 页内编辑
  document.querySelectorAll("[data-profile-open]").forEach(el=>{
    el.onclick=(ev)=>{ ev.preventDefault(); ev.stopPropagation();
      state.profileWho = el.dataset.profileOpen; // "me"（女方）或 AI 的 agent id
      state.tab = "home"; state.subPage = "profile"; render();
    };
  });
  if(state.subPage === "profile"){
    document.querySelectorAll("[data-profile-edit]").forEach(btn=>{
      btn.onclick=()=>{ profileEditField(btn.dataset.profileEdit); };
    });
    const bgBtn=document.querySelector("[data-profile-bg]");
    if(bgBtn) bgBtn.onclick=()=>{ profilePickBackground(); };
    const bgClear=document.querySelector("[data-profile-bg-clear]");
    if(bgClear) bgClear.onclick=()=>{
      const who = state.profileWho === "me" ? "me" : "them";
      const p = who==="me" ? state.profileMe : state.profileThem;
      p.background = ""; persist(who==="me" ? "profileMe" : "profileThem"); render();
    };
  }

  // ─── 券夹：兑现 / 编辑 / 编辑器 ───
  document.querySelectorAll("[data-coupon-use]").forEach(el=>{
    el.onclick=(ev)=>{ ev.preventDefault(); ev.stopPropagation(); redeemCoupon(el.dataset.couponUse); };
  });
  document.querySelectorAll("[data-coupon-edit]").forEach(el=>{
    el.onclick=(ev)=>{ ev.preventDefault(); ev.stopPropagation();
      const c = (state.coupons||[]).find(x=>x.id===el.dataset.couponEdit);
      if(!c) return;
      state.couponDraft = Object.assign({}, c);
      state.couponEditingId = c.id;
      render();
    };
  });
  if(state.subPage==="coupon"){
    const addBtn = document.getElementById("coupon-add");
    if(addBtn) addBtn.onclick = ()=>{ state.couponDraft = couponBlankDraft(); state.couponEditingId = "new"; render(); };
    const cancelBtn = document.getElementById("coupon-cancel");
    if(cancelBtn) cancelBtn.onclick = ()=>{ state.couponEditingId = null; state.couponDraft = null; render(); };
    const saveBtn = document.getElementById("coupon-save");
    if(saveBtn) saveBtn.onclick = ()=>{
      const d = state.couponDraft || couponBlankDraft();
      const name = (d.name||"").trim() || (d.title||"").trim() || "新券";
      ensureCoupons();
      if(d.id){
        const c = (state.coupons||[]).find(x=>x.id===d.id);
        if(c) Object.assign(c, d, { name });
      } else {
        state.coupons.push(Object.assign({}, d, { id:_cpId(), name, date:_cpDate(), sentAt:null, usedAt:null }));
      }
      persist("coupons");
      state.couponEditingId = null; state.couponDraft = null;
      render();
      try{ if(typeof postAppEvent==="function") postAppEvent(d.id?"coupon_edit":"coupon_create",{ name }); }catch(e){}
    };
    const delBtn = document.getElementById("coupon-del");
    if(delBtn) delBtn.onclick = ()=>{
      const d = state.couponDraft;
      if(!d || !d.id) return;
      if(!window.confirm("删除这张券？")) return;
      state.coupons = (state.coupons||[]).filter(x=>x.id!==d.id);
      persist("coupons");
      state.couponEditingId = null; state.couponDraft = null;
      render();
      try{ if(typeof postAppEvent==="function") postAppEvent("coupon_delete",{ id:d.id }); }catch(e){}
    };
    document.querySelectorAll("[data-coupon-color]").forEach(el=>{ el.onclick=()=>{ if(state.couponDraft) state.couponDraft.color=el.dataset.couponColor; render(); }; });
    document.querySelectorAll("[data-coupon-texture]").forEach(el=>{ el.onclick=()=>{ if(state.couponDraft) state.couponDraft.texture=el.dataset.couponTexture; render(); }; });
    document.querySelectorAll("[data-coupon-font]").forEach(el=>{ el.onclick=()=>{ if(state.couponDraft) state.couponDraft.font=el.dataset.couponFont; render(); }; });
    document.querySelectorAll("[data-coupon-status]").forEach(el=>{ el.onclick=()=>{ if(state.couponDraft) state.couponDraft.status=el.dataset.couponStatus; render(); }; });
    [["coupon-name","name"],["coupon-title","title"],["coupon-subtitle","subtitle"],["coupon-code","code"]].forEach(function(pair){
      const el = document.getElementById(pair[0]);
      if(el) el.oninput = ()=>{
        if(state.couponDraft) state.couponDraft[pair[1]] = el.value;
        const pv = document.getElementById("coupon-preview");
        if(pv) pv.innerHTML = couponPreviewHtml();
      };
    });
  }

  // 游戏
  document.querySelectorAll("[data-gmode]").forEach(btn=>{
    btn.onclick=()=>{ state.gameMode=btn.dataset.gmode; state.gameReply=""; render(); };
  });
  document.querySelectorAll("[data-gbtn]").forEach(btn=>{
    btn.onclick=()=>playPuppy(+btn.dataset.gbtn);
  });

  // 猜词游戏
  document.querySelectorAll("[data-guess-opp]").forEach(btn=>{
    btn.onclick=()=>{ state.guessGame.opponentId=btn.dataset.guessOpp; render(); };
  });
  document.querySelectorAll("[data-guess-desc]").forEach(btn=>{
    btn.onclick=()=>{ state.guessGame.describer=btn.dataset.guessDesc; render(); };
  });
  const guessStartBtn=document.getElementById("guess-start");
  if(guessStartBtn) guessStartBtn.onclick=()=>guessStart();
  const guessSendBtn=document.getElementById("guess-send");
  if(guessSendBtn) guessSendBtn.onclick=()=>guessSend();
  const guessInp=document.getElementById("guess-input");
  if(guessInp){
    guessInp.oninput=()=>{ state.guessGame.draft=guessInp.value; };
    guessInp.onkeydown=e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); guessSend(); } };
  }
  const guessGive=document.getElementById("guess-giveup");
  if(guessGive) guessGive.onclick=()=>{
    const g=state.guessGame;
    g.phase="ended"; g.result="lose";
    g.history.push({role:"system",content:"揭晓：答案是「"+g.word+"」"});
    render();
  };
  const guessAgain=document.getElementById("guess-again");
  if(guessAgain) guessAgain.onclick=()=>guessStart();
  const guessBack=document.getElementById("guess-back-setup");
  if(guessBack) guessBack.onclick=()=>{ state.guessGame.phase="setup"; render(); };

  // 海龟汤
  const soupBank=document.getElementById("soup-from-bank");
  if(soupBank) soupBank.onclick=()=>soupStartFromBank();
  const soupAi=document.getElementById("soup-from-ai");
  if(soupAi) soupAi.onclick=()=>soupStartFromAI();
  const soupSend=document.getElementById("soup-send");
  if(soupSend) soupSend.onclick=()=>soupSendMsg();
  const soupInp=document.getElementById("soup-input");
  if(soupInp){
    soupInp.oninput=()=>{ state.soupGame.draft=soupInp.value; };
    soupInp.onkeydown=e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); soupSendMsg(); } };
  }
  const soupReveal=document.getElementById("soup-reveal");
  if(soupReveal) soupReveal.onclick=()=>{
    const g=state.soupGame;
    g.phase="revealed";
    g.history.push({role:"system", content:"—— 揭晓汤底 ——"});
    render();
  };
  const soupAgain=document.getElementById("soup-again");
  if(soupAgain) soupAgain.onclick=()=>{
    state.soupGame={ phase:"setup", surface:"", bottom:"", title:"", history:[], loading:false, draft:"", source:"" };
    render();
  };

  // 指令游戏
  const cmdAddToggle=document.getElementById("cmd-add-toggle");
  if(cmdAddToggle) cmdAddToggle.onclick=()=>{ state.cmdAdding=!state.cmdAdding; state.newCmd={title:"",content:""}; render(); };
  const cmdSave=document.getElementById("cmd-save");
  if(cmdSave) cmdSave.onclick=()=>{
    const t=document.getElementById("cmd-title")?.value.trim();
    const c=document.getElementById("cmd-content")?.value.trim();
    if(!t||!c){ alert("请填写名称和指令内容"); return; }
    state.cmdList.push({ id:Date.now(), title:t, content:c });
    state.cmdAdding=false; state.newCmd={title:"",content:""};
    persist("cmdList"); render();
  };
  const cmdCancel=document.getElementById("cmd-cancel");
  if(cmdCancel) cmdCancel.onclick=()=>{ state.cmdAdding=false; state.newCmd={title:"",content:""}; render(); };
  const cmdTitle=document.getElementById("cmd-title");
  if(cmdTitle) cmdTitle.oninput=()=>{ state.newCmd.title=cmdTitle.value; };
  const cmdContent=document.getElementById("cmd-content");
  if(cmdContent) cmdContent.oninput=()=>{ state.newCmd.content=cmdContent.value; };
  document.querySelectorAll("[data-cmd-run]").forEach(btn=>{
    btn.onclick=async()=>{
      const id=+btn.dataset.cmdRun;
      const cmd=state.cmdList.find(c=>c.id===id);
      if(!cmd) return;
      if(!state.apiConfig.claudeKey && !state.apiConfig.openaiKey){ alert("请先配置 API Key"); return; }
      state.cmdRunId=id; state.cmdRunLoading=true; state.cmdRunResult=""; render();
      try{
        const result=await callAuxAPI(state.apiConfig, cmd.content);
        state.cmdRunResult=result;
      }catch(e){ state.cmdRunResult="⚠️ 失败："+e.message; }
      state.cmdRunLoading=false; render();
    };
  });
  document.querySelectorAll("[data-cmd-del]").forEach(btn=>{
    btn.onclick=()=>{
      const id=+btn.dataset.cmdDel;
      state.cmdList=state.cmdList.filter(c=>c.id!==id);
      if(state.cmdRunId===id){ state.cmdRunId=null; state.cmdRunResult=""; }
      persist("cmdList"); render();
    };
  });

  // HTML 游戏
  const fileInput=document.getElementById("htmlgame-file");
  if(fileInput) fileInput.onchange=()=>{
    const f=fileInput.files?.[0];
    if(!f) return;
    const reader=new FileReader();
    reader.onload=()=>{
      state.htmlGameSrc=reader.result;
      state.htmlGameName=f.name;
      persist("htmlGameSrc"); persist("htmlGameName");
      render();
    };
    reader.readAsText(f);
  };
  const loadPaste=document.getElementById("htmlgame-load-paste");
  if(loadPaste) loadPaste.onclick=()=>{
    const ta=document.getElementById("htmlgame-paste");
    const code=(ta?.value||"").trim();
    if(!code) return alert("请先粘贴 HTML 代码");
    state.htmlGameSrc=code;
    state.htmlGameName="粘贴的游戏";
    state.htmlGamePaste=code;
    persist("htmlGameSrc"); persist("htmlGameName");
    render();
  };
  const clearGame=document.getElementById("htmlgame-clear");
  if(clearGame) clearGame.onclick=()=>{
    state.htmlGameSrc=""; state.htmlGameName=""; state.htmlGamePaste="";
    persist("htmlGameSrc"); persist("htmlGameName");
    render();
  };
  const pasteTa=document.getElementById("htmlgame-paste");
  if(pasteTa) pasteTa.oninput=()=>{ state.htmlGamePaste=pasteTa.value; };

  // 合集：展开/收起
  const colToggle=document.getElementById("col-toggle");
  if(colToggle) colToggle.onclick=()=>{ state.htmlGameColOpen=!state.htmlGameColOpen; render(); };

  // 合集：存入当前游戏
  const saveCol=document.getElementById("htmlgame-save-col");
  if(saveCol) saveCol.onclick=()=>{
    if(!state.htmlGameSrc) return;
    const name = state.htmlGameName || "未命名游戏";
    // 避免重复存同名
    const exists = state.htmlGameCollection.find(i=>i.name===name);
    if(exists){
      if(!confirm(`合集里已有「${name}」，要覆盖吗？`)) return;
      exists.src = state.htmlGameSrc;
    } else {
      state.htmlGameCollection.push({ id: Date.now(), name, src: state.htmlGameSrc });
    }
    persist("htmlGameCollection");
    state.htmlGameColOpen = true;
    render();
  };

  // 合集：加载某一项
  document.querySelectorAll("[data-col-load]").forEach(btn=>{
    btn.onclick=()=>{
      const id=+btn.dataset.colLoad;
      const item=state.htmlGameCollection.find(i=>i.id===id);
      if(!item) return;
      state.htmlGameSrc=item.src;
      state.htmlGameName=item.name;
      persist("htmlGameSrc"); persist("htmlGameName");
      render();
    };
  });

  // 合集：删除某一项
  document.querySelectorAll("[data-col-del]").forEach(btn=>{
    btn.onclick=()=>{
      const id=+btn.dataset.colDel;
      state.htmlGameCollection=state.htmlGameCollection.filter(i=>i.id!==id);
      persist("htmlGameCollection");
      render();
    };
  });

  // 聊天
  const nsfw=document.getElementById("nsfw-toggle");
  if(nsfw) nsfw.onclick=()=>{ state.nsfwOn=!state.nsfwOn; render(); };
  const chatInput=document.getElementById("chat-input");
  if(chatInput){
    chatInput.oninput=()=>{
      state.chatInput=chatInput.value;
      chatInput.style.height="auto";
      chatInput.style.height=Math.min(chatInput.scrollHeight,120)+"px";
      const send=document.getElementById("chat-send");
      if(send) send.classList.toggle("active",!!chatInput.value.trim());
    };
    chatInput.onkeydown=e=>{
      if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendUserMsg(); }
    };
    // 多模态：粘贴图片
    chatInput.addEventListener("paste", e=>{
      const items = e.clipboardData && e.clipboardData.items;
      if(!items) return;
      for(const it of items){
        if(it.type && it.type.startsWith("image/")){
          const f = it.getAsFile && it.getAsFile();
          if(f){ e.preventDefault(); addChatImageFiles([f]); break; }
        }
      }
    });
  }
  // 输入栏「+」：展开/收起面板（再点一次或点外部收起）
  const chatMoreBtn=document.getElementById("chat-more-btn");
  if(chatMoreBtn) chatMoreBtn.onclick=(e)=>{ e.stopPropagation(); state.chatMoreOpen=!state.chatMoreOpen; render(); };
  // 多模态：图片/文件按钮（选完自动收起面板）
  const chatImgBtn=document.getElementById("chat-img-btn");
  if(chatImgBtn) chatImgBtn.onclick=(e)=>{ e.stopPropagation(); const i=document.getElementById("chat-img-input"); if(i) i.click(); };
  const chatImgInput=document.getElementById("chat-img-input");
  if(chatImgInput) chatImgInput.onchange=()=>{ if(chatImgInput.files&&chatImgInput.files.length){ addChatImageFiles(chatImgInput.files); state.chatMoreOpen=false; render(); } chatImgInput.value=""; };
  const chatFileBtn=document.getElementById("chat-file-btn");
  if(chatFileBtn) chatFileBtn.onclick=(e)=>{ e.stopPropagation(); const i=document.getElementById("chat-file-input"); if(i) i.click(); };
  const chatFileInput=document.getElementById("chat-file-input");
  if(chatFileInput) chatFileInput.onchange=()=>{ if(chatFileInput.files&&chatFileInput.files.length){ addChatTextFiles(chatFileInput.files); state.chatMoreOpen=false; render(); } chatFileInput.value=""; };
  // 聊天页：退出 → 首页（底栏已隐藏）
  const chatExit=document.getElementById("chat-exit-home");
  if(chatExit) chatExit.onclick=()=>{ state.tab="home"; state.subPage=null; render(); };
  // 情侣计分器入口
  const loveChip=document.getElementById("love-score-chip");
  if(loveChip) loveChip.onclick=()=>{ state.tab="home"; state.subPage="love"; state.loveReasonDraft=""; render(); };
  // 麦克风按钮：语音输入（浏览器不支持时降级为输入 🎙️），只换图标不动文字标签
  const chatMicBtn=document.getElementById("chat-mic-btn");
  if(chatMicBtn){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    chatMicBtn.onclick=(e)=>{
      e.stopPropagation();
      if(!SR){
        const inp=document.getElementById("chat-input");
        if(inp){ inp.value+=(inp.value?" ":"")+"🎙️ "; state.chatInput=inp.value; inp.dispatchEvent(new Event("input")); inp.focus(); }
        return;
      }
      const rec=new SR();
      rec.lang="zh-CN"; rec.interimResults=false; rec.maxAlternatives=1;
      chatMicBtn.classList.add("rec");
      const swapIcon=(name)=>{
        const ic=chatMicBtn.querySelector("i"); if(ic) ic.setAttribute("data-lucide", name);
        if(window.lucide) lucide.createIcons({}, chatMicBtn);
      };
      swapIcon("square");
      rec.onresult=ev=>{
        const t=Array.from(ev.results).map(r=>r[0].transcript).join("");
        const inp=document.getElementById("chat-input");
        if(inp&&t){ inp.value+=(inp.value?" ":"")+t; state.chatInput=inp.value; inp.dispatchEvent(new Event("input")); const send=document.getElementById("chat-send"); if(send) send.classList.toggle("active",true); }
      };
      const reset=()=>{ chatMicBtn.classList.remove("rec"); swapIcon("mic"); };
      rec.onend=reset; rec.onerror=reset;
      try{ rec.start(); }catch(err){ reset(); }
    };
  }
  document.querySelectorAll("[data-attach-del]").forEach(btn=>{
    btn.onclick=()=>{
      const i=+btn.dataset.attachDel;
      state.chatAttachments=(state.chatAttachments||[]).filter((_,idx)=>idx!==i);
      render();
    };
  });
  const loadEarlier=document.getElementById("load-earlier");
  if(loadEarlier) loadEarlier.onclick=()=>{
    state.chatRenderLimit = (state.chatRenderLimit||100) + 100;
    render();
  };
  const chatSend=document.getElementById("chat-send");
  if(chatSend) chatSend.onclick=sendUserMsg;
  const trigger=document.getElementById("trigger-reply");
  if(trigger) trigger.onclick=triggerAIReply;

  // 聊天/文章模式切换
  document.querySelectorAll("[data-chat-mode]").forEach(btn=>{
    btn.onclick=()=>{
      const m = btn.dataset.chatMode === "story" ? "story" : "chat";
      if(state.chatMode === m) return;
      state.chatMode = m;
      persist("chatMode");
      render();
    };
  });
  // 思考引导面板
  const toggleGuide=document.getElementById("toggle-guide");
  if(toggleGuide) toggleGuide.onclick=()=>{ state.showThoughtGuide=!state.showThoughtGuide; render(); };
  const closeGuide=document.getElementById("close-guide");
  if(closeGuide) closeGuide.onclick=()=>{ state.showThoughtGuide=false; render(); };
  const thoughtOnToggle=document.getElementById("thought-on-toggle");
  if(thoughtOnToggle) thoughtOnToggle.onchange=()=>{
    state.thoughtOn = !!thoughtOnToggle.checked;
    try{ LS.set("thoughtOn", state.thoughtOn); }catch(e){}
    render();
  };
  document.querySelectorAll("[data-guide-agent]").forEach(btn=>{
    btn.onclick=()=>{ state.guideEditAgentId=btn.dataset.guideAgent; render(); };
  });
  const thoughtGuideEl=document.getElementById("thought-guide");
  if(thoughtGuideEl){
    const saveGuide=()=>{
      const id = state.guideEditAgentId || state.chatTarget;
      const ag = agentById(id==="group"?"a1":id) || (state.agents||[])[0];
      if(!ag) return;
      ag.thoughtGuide = thoughtGuideEl.value;
      // 兼容旧字段：同步 a1 到全局
      if(ag.id==="a1"){ state.thoughtGuide = ag.thoughtGuide; persist("thoughtGuide"); }
      persist("agents");
    };
    thoughtGuideEl.oninput=saveGuide;
    thoughtGuideEl.onchange=saveGuide;
  }

  // 思考链展开/收起
  document.querySelectorAll("[data-think]").forEach(btn=>{
    btn.onclick=()=>{
      const id=btn.dataset.think;
      // 默认 true，取反时若 undefined 则视为关掉
      const cur = state.openThinkIds[id] !== false;
      state.openThinkIds[id]=!cur;
      if(!state.openThinkIds[id] && state.editingThinkId===id) state.editingThinkId=null;
      render();
    };
  });
  document.querySelectorAll("[data-think-save-fav]").forEach(btn=>{
    btn.onclick=()=>{
      const idx=+btn.dataset.msgIdx;
      if(typeof openSaveThink==="function") openSaveThink(idx);
    };
  });
  document.querySelectorAll("[data-think-edit]").forEach(btn=>{
    btn.onclick=()=>{
      const id=btn.dataset.thinkEdit;
      state.editingThinkId=id;
      state.openThinkIds[id]=true;
      render();
    };
  });
  document.querySelectorAll("[data-think-cancel]").forEach(btn=>{
    btn.onclick=()=>{ state.editingThinkId=null; render(); };
  });
  document.querySelectorAll("[data-think-save]").forEach(btn=>{
    btn.onclick=()=>{
      const id=btn.dataset.thinkSave;
      const idx=+btn.dataset.msgIdx;
      const ta=document.getElementById("think-edit-"+id);
      if(!ta || idx<0 || !state.messages[idx]) return;
      state.messages[idx].thinking=ta.value;
      state.editingThinkId=null;
      render();
    };
  });
  document.querySelectorAll("[data-think-regen]").forEach(btn=>{
    btn.onclick=()=>{
      const id=btn.dataset.thinkRegen;
      const idx=+btn.dataset.msgIdx;
      let text="";
      const ta=document.getElementById("think-edit-"+id);
      if(ta) text=ta.value;
      else if(state.messages[idx]) text=state.messages[idx].thinking||"";
      if(!text.trim()) return alert("思考内容为空");
      // 若在编辑中，先写回
      if(state.messages[idx]) state.messages[idx].thinking=text;
      regenFromThinking(idx, text);
    };
  });

  // 记忆
  const memAddToggle=document.getElementById("mem-add-toggle");
  if(memAddToggle) memAddToggle.onclick=()=>{ state.memAdding=!state.memAdding; render(); };
  document.querySelectorAll("[data-mem-filter]").forEach(btn=>{
    btn.onclick=()=>{ state.memFilter=btn.dataset.memFilter; render(); };
  });
  document.querySelectorAll("[data-select]").forEach(el=>{
    el.onclick=()=>{
      const id=+el.dataset.select;
      if(state.memSelected.includes(id)) state.memSelected=state.memSelected.filter(x=>x!==id);
      else state.memSelected.push(id);
      render();
    };
  });
  document.querySelectorAll("[data-del]").forEach(el=>{
    el.onclick=()=>{
      state.memories=state.memories.filter(m=>m.id!==+el.dataset.del);
      state.memSelected=state.memSelected.filter(x=>x!==+el.dataset.del);
      persist("memories"); render();
    };
  });
  document.querySelectorAll("[data-expand]").forEach(el=>{
    el.onclick=()=>{ state.expandedMems[el.dataset.expand]=!state.expandedMems[el.dataset.expand]; render(); };
  });
  const memSave=document.getElementById("mem-save");
  if(memSave) memSave.onclick=()=>{
    const content=document.getElementById("mem-content").value.trim();
    if(!content) return;
    state.memories.push({
      id:Date.now(), content,
      layer:document.getElementById("mem-layer").value,
      importance:+document.getElementById("mem-imp").value,
      valence:+document.getElementById("mem-val").value,
      arousal:+document.getElementById("mem-aro").value,
      createdAt:new Date().toISOString(), activations:1, resolved:false, pinned:false,
    });
    state.newMem={content:"",layer:"diary",importance:5,valence:0,arousal:0.5};
    state.memAdding=false; persist("memories"); render();
  };
  const memCancel=document.getElementById("mem-cancel");
  if(memCancel) memCancel.onclick=()=>{ state.memAdding=false; render(); };
  const memImp=document.getElementById("mem-imp");
  if(memImp) memImp.oninput=()=>{ document.getElementById("mem-imp-val").textContent=memImp.value; };
  const memVal=document.getElementById("mem-val");
  if(memVal) memVal.oninput=()=>{ document.getElementById("mem-val-val").textContent=(+memVal.value).toFixed(1); };
  const memAro=document.getElementById("mem-aro");
  if(memAro) memAro.oninput=()=>{ document.getElementById("mem-aro-val").textContent=(+memAro.value).toFixed(1); };
  const memMerge=document.getElementById("mem-merge");
  if(memMerge) memMerge.onclick=mergeMemories;
  const memAutoToggle=document.getElementById("mem-auto-toggle");
  if(memAutoToggle) memAutoToggle.onclick=()=>{
    state.memAutoDisabled = !state.memAutoDisabled;
    persist("memAutoDisabled"); render();
    if(!state.memAutoDisabled) setTimeout(()=>{ if(typeof memAutoIntegrate==="function") memAutoIntegrate(); }, 800);
  };
  const memCloudToggle=document.getElementById("mem-cloud-toggle");
  if(memCloudToggle) memCloudToggle.onclick=()=>{
    state.memRemote = state.memRemote || {};
    state.memRemote.enabled = !(state.memRemote.enabled===false);
    persist("memRemote"); render();
    if(state.memRemote.enabled && typeof memRemoteWarmup==="function") memRemoteWarmup("");
  };
  // ── 收藏聊天记录 ──
  const savedNewCatBtn=document.getElementById("saved-new-cat-btn");
  if(savedNewCatBtn) savedNewCatBtn.onclick=()=>{ const v=document.getElementById("saved-new-cat"); newSaveCat(v?v.value:""); };
  const savedNewCatInp=document.getElementById("saved-new-cat");
  if(savedNewCatInp) savedNewCatInp.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); newSaveCat(savedNewCatInp.value); } };
  const savedSaveCancel=document.getElementById("saved-save-cancel");
  if(savedSaveCancel) savedSaveCancel.onclick=closeSaveChat;
  document.querySelectorAll("[data-save-cat]").forEach(btn=>{ btn.onclick=()=>saveChatTo(btn.dataset.saveCat); });
  const savedSearchInp=document.getElementById("saved-search-inp");
  if(savedSearchInp){
    savedSearchInp.oninput=()=>{ state.savedSearch=savedSearchInp.value; render(); };
    savedSearchInp.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); e.target.blur(); } };
  }
  const savedSearchClear=document.getElementById("saved-search-clear");
  if(savedSearchClear) savedSearchClear.onclick=()=>{ state.savedSearch=""; render(); };
  document.querySelectorAll("[data-saved-cat]").forEach(btn=>{ btn.onclick=()=>{ state.savedCatSel=btn.dataset.savedCat; render(); }; });
  document.querySelectorAll("[data-saved-del]").forEach(btn=>{ btn.onclick=()=>delSavedChat(btn.dataset.savedDel); });
  const savedCatAdd=document.querySelector("[data-saved-cat-add]");
  if(savedCatAdd) savedCatAdd.onclick=()=>{ state.savedNewCatOpen=true; render(); };
  const savedCatOk=document.getElementById("saved-cat-ok");
  if(savedCatOk) savedCatOk.onclick=()=>{ const v=document.getElementById("saved-cat-inp"); addSavedCat(v?v.value:""); };
  const savedCatInp=document.getElementById("saved-cat-inp");
  if(savedCatInp) savedCatInp.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); addSavedCat(savedCatInp.value); } };
  const savedCatCancel=document.getElementById("saved-cat-cancel");
  if(savedCatCancel) savedCatCancel.onclick=()=>{ state.savedNewCatOpen=false; render(); };
  // 长按气泡收藏（500ms）+ 滑动取消
  const chatMsgsBox=document.getElementById("chat-msgs");
  if(chatMsgsBox){
    let lpTimer=null, lpEl=null, lpX=0, lpY=0;
    chatMsgsBox.addEventListener("touchstart", e=>{
      const el=e.target.closest?e.target.closest("[data-msg-idx]"):null;
      if(!el) return;
      lpEl=el; lpX=e.touches[0].clientX; lpY=e.touches[0].clientY;
      lpTimer=setTimeout(()=>{ if(lpEl && typeof openSaveChat==="function") openSaveChat(+lpEl.dataset.msgIdx); lpEl=null; }, 500);
    }, {passive:true});
    const cancelLp=()=>{ if(lpTimer){ clearTimeout(lpTimer); lpTimer=null; } lpEl=null; };
    chatMsgsBox.addEventListener("touchmove", e=>{
      if(lpTimer){
        const dx=Math.abs(e.touches[0].clientX-lpX), dy=Math.abs(e.touches[0].clientY-lpY);
        if(dx>12||dy>12) cancelLp();
      }
    }, {passive:true});
    chatMsgsBox.addEventListener("touchend", cancelLp);
    chatMsgsBox.addEventListener("touchcancel", cancelLp);
  }
  // 点气泡 → 收藏/复制操作条（Grok 式）；再点一次收起
  if(chatMsgsBox){
    chatMsgsBox.addEventListener("click", function(e){
      try{
        const t = e.target;
        const copyBtn = t.closest && t.closest("[data-msg-copy]");
        if(copyBtn){ if(typeof copyMessage==="function") copyMessage(+copyBtn.dataset.msgCopy); return; }
        const saveBtn = t.closest && t.closest("[data-msg-save]");
        if(saveBtn){ state.msgBarIdx=null; if(typeof openSaveChat==="function") openSaveChat(+saveBtn.dataset.msgSave); return; }
        if(state.savedSaving) return; // 收藏分类弹窗开着时不切换操作条
        if(t.closest && t.closest(".msg-bar")) return;
        const row = t.closest && t.closest("[data-msg-idx]");
        if(row){
          // 可交互内容（按钮/链接/图片/贴纸/思考按钮）不触发操作条
          if(t.closest("button,a,[data-action-send],img")) return;
          const idx = +row.dataset.msgIdx;
          state.msgBarIdx = state.msgBarIdx===idx ? null : idx;
          render();
        }
      }catch(err){}
    });
  }
  const memFromChat=document.getElementById("mem-from-chat");
  if(memFromChat) memFromChat.onclick=openMemIntegrate;
  const memIntMask=document.getElementById("mem-int-mask");
  if(memIntMask) memIntMask.onclick=()=>{ state.memIntegrateOpen=false; render(); };
  const memIntCancel=document.getElementById("mem-int-cancel");
  if(memIntCancel) memIntCancel.onclick=()=>{ state.memIntegrateOpen=false; render(); };
  const memIntConfirm=document.getElementById("mem-int-confirm");
  if(memIntConfirm) memIntConfirm.onclick=()=> integrateMemoriesFromChat();
  document.querySelectorAll("[data-mem-int-th]").forEach(el=>{
    el.onchange=()=>{
      const tid = el.dataset.memIntTh;
      const d = state.memIntegrateDraft || { threads:[] };
      let th = [...(d.threads||[])];
      if(el.checked){ if(!th.includes(tid)) th.push(tid); }
      else th = th.filter(x=>x!==tid);
      state.memIntegrateDraft = { ...d, threads: th };
      render();
    };
  });
  const memFrom = document.getElementById("mem-int-from");
  if(memFrom) memFrom.onchange = ()=>{
    state.memIntegrateDraft = { ...(state.memIntegrateDraft||{}), dateFrom: memFrom.value };
  };
  const memTo = document.getElementById("mem-int-to");
  if(memTo) memTo.onchange = ()=>{
    state.memIntegrateDraft = { ...(state.memIntegrateDraft||{}), dateTo: memTo.value };
  };
  document.querySelectorAll("[data-mem-int-preset]").forEach(btn=>{
    btn.onclick=()=>{
      const pad = n=>String(n).padStart(2,"0");
      const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      const to = new Date();
      let from = new Date();
      const p = btn.dataset.memIntPreset;
      if(p==="today"){ from = to; }
      else if(p==="3"){ from = new Date(Date.now()-2*86400000); }
      else if(p==="7"){ from = new Date(Date.now()-6*86400000); }
      state.memIntegrateDraft = {
        ...(state.memIntegrateDraft||{}),
        dateFrom: fmt(from),
        dateTo: fmt(to),
      };
      render();
    };
  });

  // 主题
  document.querySelectorAll("[data-theme]").forEach(btn=>{
    btn.onclick=()=>{ state.theme=btn.dataset.theme; persist("theme"); render(); };
  });
  document.querySelectorAll("[data-pattern]").forEach(btn=>{
    btn.onclick=()=>{ state.pattern=btn.dataset.pattern; persist("pattern"); render(); };
  });
  const wpFile = document.getElementById("wallpaper-file");
  if(wpFile) wpFile.onchange = ()=>{
    const f = wpFile.files && wpFile.files[0];
    if(!f) return;
    if(f.size > 20*1024*1024){ alert("图片请小于 20MB"); return; }
    compressImage(f, 1920, 1920, 0.82).then(dataUrl=>{
      state.customWallpaper = dataUrl;
      persist("customWallpaper");
      applyThemeVars();
      render();
    }).catch(e=> alert("读取图片失败："+e.message));
  };
  const wpClear = document.getElementById("wallpaper-clear");
  if(wpClear) wpClear.onclick = ()=>{
    state.customWallpaper = "";
    persist("customWallpaper");
    applyThemeVars();
    render();
  };
  document.querySelectorAll("[data-bubble-style]").forEach(btn=>{
    btn.onclick = ()=>{
      state.bubbleStyle = btn.dataset.bubbleStyle || "solid";
      persist("bubbleStyle");
      applyThemeVars();
      render();
    };
  });
  document.querySelectorAll("[data-bubble-grad]").forEach(btn=>{
    btn.onclick = ()=>{
      state.bubbleGrad = +btn.dataset.bubbleGrad || 0;
      persist("bubbleGrad");
      applyThemeVars();
      render();
    };
  });
  const bOp = document.getElementById("bubble-opacity");
  if(bOp){
    bOp.oninput = ()=>{
      state.bubbleOpacity = Math.min(1, Math.max(0.2, (+bOp.value||72)/100));
      // 实时改 CSS 变量，不整页重绘
      applyThemeVars();
      const lab = bOp.previousElementSibling && bOp.previousElementSibling.querySelector
        ? null : null;
    };
    bOp.onchange = ()=>{
      state.bubbleOpacity = Math.min(1, Math.max(0.2, (+bOp.value||72)/100));
      persist("bubbleOpacity");
      applyThemeVars();
      render();
    };
  }
  const bMe = document.getElementById("bubble-me-color");
  if(bMe) bMe.onchange = ()=>{
    state.bubbleMeColor = bMe.value;
    persist("bubbleMeColor");
    applyThemeVars();
    render();
  };
  const bThem = document.getElementById("bubble-them-color");
  if(bThem) bThem.onchange = ()=>{
    state.bubbleThemColor = bThem.value;
    persist("bubbleThemColor");
    applyThemeVars();
    render();
  };
  const bReset = document.getElementById("bubble-color-reset");
  if(bReset) bReset.onclick = ()=>{
    state.bubbleMeColor = "";
    state.bubbleThemColor = "";
    persist("bubbleMeColor");
    persist("bubbleThemColor");
    applyThemeVars();
    render();
  };

  // 提示词
  const promptAddToggle=document.getElementById("prompt-add-toggle");
  if(promptAddToggle) promptAddToggle.onclick=()=>{ state.promptAdding=!state.promptAdding; if(state.promptAdding) state.promptEditingId=null; render(); };
  document.querySelectorAll("[data-prompt-filter]").forEach(btn=>{
    btn.onclick=()=>{ state.promptFilter=btn.dataset.promptFilter; render(); };
  });
  document.querySelectorAll("[data-new-cat]").forEach(btn=>{
    btn.onclick=()=>{ state.newPrompt.category=btn.dataset.newCat; render(); };
  });
  const promptSave=document.getElementById("prompt-save");
  if(promptSave) promptSave.onclick=()=>{
    const title=document.getElementById("prompt-title").value.trim();
    const content=document.getElementById("prompt-content").value.trim();
    if(!title||!content) return;
    if(state.promptEditingId){
      state.prompts=state.prompts.map(p=>p.id===state.promptEditingId?{...p,title,content}:p);
      if(typeof showToast==="function") showToast("已保存修改 ✏️");
    }else{
      state.prompts.push({...state.newPrompt,title,content,id:Date.now()});
    }
    state.promptEditingId=null;
    state.newPrompt={title:"",content:"",category:"global",enabled:true};
    state.promptAdding=false; persist("prompts"); render();
  };
  document.querySelectorAll("[data-prompt-edit]").forEach(el=>{
    el.onclick=()=>{
      const id=+el.dataset.promptEdit;
      const p=state.prompts.find(x=>x.id===id);
      if(!p) return;
      state.promptEditingId=id;
      state.newPrompt={title:p.title,content:p.content,category:p.category,enabled:p.enabled};
      state.promptAdding=true;
      render();
    };
  });
  const promptCancel=document.getElementById("prompt-cancel");
  if(promptCancel) promptCancel.onclick=()=>{ state.promptAdding=false; state.promptEditingId=null; render(); };
  document.querySelectorAll("[data-prompt-toggle]").forEach(el=>{
    el.onclick=()=>{
      const id=+el.dataset.promptToggle;
      state.prompts=state.prompts.map(p=>p.id===id?{...p,enabled:!p.enabled}:p);
      persist("prompts"); render();
    };
  });
  document.querySelectorAll("[data-prompt-del]").forEach(el=>{
    el.onclick=()=>{
      state.prompts=state.prompts.filter(p=>p.id!==+el.dataset.promptDel);
      persist("prompts"); render();
    };
  });

  // 设置 · 多 AI
  document.querySelectorAll("[data-ag-channel]").forEach(btn=>{
    btn.onclick=()=>{
      const id = btn.dataset.agChannel;
      const val = btn.dataset.val;
      const ag = agentById(id);
      if(!ag) return;
      ag.channel = val;
      persist("agents");
      // 同步 AI1 到旧 apiConfig，供辅助 API 复用
      if(id==="a1"){ state.apiConfig.channel = val==="gemini"?"openai":val; persist("apiConfig"); }
      render();
    };
  });
  (state.agents||[]).forEach((ag, idx)=>{
    const prefix = `ag${idx}`;
    const bind = (field, elId, alsoRender)=>{
      const el = document.getElementById(elId);
      if(!el) return;
      el.onchange = ()=>{
        ag[field] = el.value;
        persist("agents");
        if(ag.id==="a1"){
          if(field==="claudeKey") state.apiConfig.claudeKey = el.value;
          if(field==="openaiKey") state.apiConfig.openaiKey = el.value;
          if(field==="openaiBase") state.apiConfig.openaiBase = el.value;
          if(field==="openaiModel") state.apiConfig.openaiModel = el.value;
          if(field==="thoughtGuide"){ state.thoughtGuide = el.value; persist("thoughtGuide"); }
          if(field==="avatar" && state.coupleInfo){ /* 不强制覆盖情侣页头像 */ }
          persist("apiConfig");
        }
        if(alsoRender || field==="name" || field==="color" || field==="avatar") render();
      };
    };
    bind("name", prefix+"-name", true);
    bind("claudeKey", prefix+"-claudeKey");
    bind("geminiKey", prefix+"-geminiKey");
    bind("geminiModel", prefix+"-geminiModel");
    bind("openaiKey", prefix+"-openaiKey");
    bind("openaiBase", prefix+"-openaiBase");
    bind("openaiModel", prefix+"-openaiModel");
    bind("color", prefix+"-color", true);
    bind("avatar", prefix+"-avatar", true);
    bind("thoughtGuide", prefix+"-thoughtGuide");
    // 头像文件上传
    const fileInp = document.getElementById(prefix+"-avatar-file");
    if(fileInp){
      fileInp.onchange = ()=>{
        const f = fileInp.files && fileInp.files[0];
        if(!f) return;
        if(f.size > 20*1024*1024){ alert("图片请小于 20MB"); return; }
        compressImage(f, 400, 400, 0.88).then(dataUrl=>{
          ag.avatar = dataUrl;
          persist("agents");
          render();
        }).catch(e=> alert("读取图片失败："+e.message));
      };
    }
  });
  document.querySelectorAll("[data-ag-avatar-clear]").forEach(btn=>{
    btn.onclick=()=>{
      const ag = agentById(btn.dataset.agAvatarClear);
      if(!ag) return;
      ag.avatar = "";
      persist("agents");
      render();
    };
  });
  document.querySelectorAll("[data-aux-channel]").forEach(btn=>{
    btn.onclick=()=>{ state.apiConfig.auxChannel=btn.dataset.auxChannel; persist("apiConfig"); render(); };
  });
  ["auxOpenaiKey","auxOpenaiBase","auxOpenaiModel"].forEach(k=>{
    const el=document.getElementById("cfg-"+k);
    if(el) el.onchange=()=>{ state.apiConfig[k]=el.value; persist("apiConfig"); };
  });
  // 聊天对象切换（私聊 / 群聊）
  document.querySelectorAll("[data-chat-target]").forEach(btn=>{
    btn.onclick=()=>{
      const id = btn.dataset.chatTarget;
      if(id === state.chatTarget) return;
      loadChatTarget(id);
      render();
    };
  });
  // 上下文条数滑块
  const ctxSlider = document.getElementById("cfg-contextLimit");
  if(ctxSlider){
    ctxSlider.oninput = () => {
      const v = +ctxSlider.value;
      state.contextLimit = v;
      const label = document.getElementById("cfg-contextLimit-val");
      if(label) label.textContent = v === 0 ? "不限" : v + "条";
      persist("contextLimit");
    };
  }

  ["startDate","myName","partnerName","myAvatar","partnerAvatar"].forEach(k=>{
    const el=document.getElementById("cfg-"+k);
    if(el) el.onchange=()=>{
      state.coupleInfo[k]=el.value;
      persist("coupleInfo");
      // 不整页重绘，避免设置页滚回顶部；头像预览仅在上传时 render
    };
  });
  // 头像本地上传 → 压缩后 dataURL 存 localStorage，全局生效
  function bindAvatarFile(inputId, key){
    const inp = document.getElementById(inputId);
    if(!inp) return;
    inp.onchange = ()=>{
      const f = inp.files && inp.files[0];
      if(!f) return;
      if(f.size > 20*1024*1024){ alert("图片请小于 20MB"); return; }
      compressImage(f, 400, 400, 0.88).then(dataUrl=>{
        state.coupleInfo[key] = dataUrl;
        persist("coupleInfo");
        render();
      }).catch(e=> alert("读取图片失败："+e.message));
    };
  }
  bindAvatarFile("cfg-myAvatar-file", "myAvatar");
  bindAvatarFile("cfg-partnerAvatar-file", "partnerAvatar");
  const clearMy = document.getElementById("cfg-myAvatar-clear");
  if(clearMy) clearMy.onclick = ()=>{ state.coupleInfo.myAvatar=""; persist("coupleInfo"); render(); };
  const clearTa = document.getElementById("cfg-partnerAvatar-clear");
  if(clearTa) clearTa.onclick = ()=>{ state.coupleInfo.partnerAvatar=""; persist("coupleInfo"); render(); };


  // 身体 / 欲望
  const desireToggle = document.getElementById("desire-drive-toggle");
  if(desireToggle) desireToggle.onclick = ()=>{
    state.desireDriveOn = !state.desireDriveOn;
    persist("desireDriveOn");
    render();
  };
  const divSkillToggle = document.getElementById("divination-skill-toggle");
  if(divSkillToggle) divSkillToggle.onclick = ()=>{
    state.divinationSkillOn = !state.divinationSkillOn;
    persist("divinationSkillOn");
    render();
  };
  const bodyRefresh = document.getElementById("body-refresh");
  if(bodyRefresh) bodyRefresh.onclick = ()=> refreshBodyWithAI();
  const bodyMiss = document.getElementById("body-nudge-miss");
  if(bodyMiss) bodyMiss.onclick = ()=>{
    const v=state.bodyVitals;
    v.longing = Math.min(100, (v.longing||0)+8);
    v.heartbeat = Math.min(118, (v.heartbeat||72)+3);
    persistBody(); render();
  };
  const bodyCalm = document.getElementById("body-nudge-calm");
  if(bodyCalm) bodyCalm.onclick = ()=>{
    const v=state.bodyVitals;
    v.desire = Math.max(0, (v.desire||0)-8);
    v.heartbeat = Math.max(60, (v.heartbeat||72)-4);
    v.mood = "平和";
    persistBody(); render();
  };

  // 音乐
  document.querySelectorAll("[data-music-src]").forEach(btn=>{
    btn.onclick = ()=>{
      state.musicConfig.source = btn.dataset.musicSrc;
      persist("musicConfig");
      state.musicResults = [];
      state.musicError = "";
      render();
    };
  });
  const mq = document.getElementById("music-q");
  if(mq){
    mq.oninput = ()=>{ state.musicQuery = mq.value; };
    mq.onkeydown = e=>{ if(e.key==="Enter"){ e.preventDefault(); musicSearch(); } };
  }
  const ms = document.getElementById("music-search");
  if(ms) ms.onclick = ()=> musicSearch();
  document.querySelectorAll("[data-music-play]").forEach(btn=>{
    btn.onclick = ()=>{
      musicTapSong(+btn.dataset.musicPlay);
    };
  });
  document.querySelectorAll("[data-music-browse]").forEach(btn=>{
    btn.onclick = ()=> musicBrowseGo(btn.dataset.musicBrowse);
  });
  document.querySelectorAll("[data-music-playlist]").forEach(btn=>{
    btn.onclick = ()=>{
      const p = state.musicPlaylists[+btn.dataset.musicPlaylist];
      if(p) musicOpenPlaylist(p.id, p.name);
    };
  });
  const mpa = document.getElementById("music-playall");
  if(mpa) mpa.onclick = ()=> musicPlayAll();
  const mnp = document.getElementById("music-now-prev");
  if(mnp) mnp.onclick = ()=> musicPlayPrev();
  const mnx = document.getElementById("music-now-next");
  if(mnx) mnx.onclick = ()=> musicPlayNext();
  const mtt = document.getElementById("music-tb-toggle");
  if(mtt) mtt.onclick = ()=> musicTogglePlay();
  const mto = document.getElementById("music-tb-open");
  if(mto) mto.onclick = ()=>{ state.tab="home"; state.subPage="music"; render(); };
  const mtm = document.getElementById("music-tb-mem");
  if(mtm) mtm.onclick = ()=> musicSaveToMemory();
  const mtc = document.getElementById("music-tb-close");
  if(mtc) mtc.onclick = ()=>{
    try{ const aa=document.getElementById("mp-audio"); if(aa){ aa.pause(); aa.removeAttribute("src"); } }catch(e){}
    state.musicNow=null; state.musicPlaying=false; persist("musicNow"); render();
    if(typeof showToast==="function") showToast("已关闭播放栏");
  };
  const mnt = document.getElementById("music-now-toggle");
  if(mnt) mnt.onclick = ()=> musicTogglePlay();
  const mnm = document.getElementById("music-now-mem");
  if(mnm) mnm.onclick = ()=> musicSaveToMemory();
  const mqr = document.getElementById("music-qr-start");
  if(mqr) mqr.onclick = ()=> musicStartNeteaseQr();
  const mnl = document.getElementById("music-netease-logout");
  if(mnl) mnl.onclick = async ()=>{
    try{
      await musicDetectBackend();
      if(musicBackend()==="duetto") await musicFetch("/api/ncm/logout", { method:"POST", body:"{}" });
      else await musicFetch("/music/netease/logout", { method:"POST", body:"{}" });
    }catch{}
    state.musicNeteaseAuthed=false; persist("musicNeteaseAuthed"); render();
  };
  const msa = document.getElementById("music-spotify-auth");
  if(msa) msa.onclick = ()=> musicSpotifyAuth();
  const msl = document.getElementById("music-spotify-logout");
  if(msl) msl.onclick = async ()=>{
    try{ await musicFetch("/music/spotify/logout", { method:"POST", body:"{}" }); }catch{}
    state.musicSpotifyAuthed=false; persist("musicSpotifyAuthed"); render();
  };
  const mra = document.getElementById("music-refresh-auth");
  if(mra) mra.onclick = ()=> musicRefreshAuthStatus();
  const mdl = document.getElementById("music-duetto-login");
  if(mdl) mdl.onclick = async ()=>{
    const pin = document.getElementById("music-duetto-pin")?.value || "";
    try{
      await musicDuettoLoginWithPin(pin);
      alert("Duetto 门禁已登录，可以生成网易二维码了");
      render();
    }catch(e){ alert(e.message); }
  };
  document.querySelectorAll("[data-music-backend]").forEach(btn=>{
    btn.onclick = ()=>{
      state.musicConfig.backend = btn.dataset.musicBackend || "auto";
      state._musicBackendResolved = null;
      persist("musicConfig");
      render();
    };
  });
  document.querySelectorAll("[data-cfg-music-backend]").forEach(btn=>{
    btn.onclick = ()=>{
      state.musicConfig.backend = btn.dataset.cfgMusicBackend || "auto";
      state._musicBackendResolved = null;
      persist("musicConfig");
      render();
    };
  });
  const cfgBase = document.getElementById("cfg-musicBase");
  if(cfgBase) cfgBase.onchange = ()=>{
    state.musicConfig.baseUrl = cfgBase.value.trim();
    state._musicBackendResolved = null;
    persist("musicConfig");
  };
  const cfgTok = document.getElementById("cfg-musicToken");
  if(cfgTok) cfgTok.onchange = ()=>{ state.musicConfig.token = cfgTok.value.trim(); persist("musicConfig"); };

  // 一起读
  const readFeed = document.getElementById("read-feed-toggle");
  if(readFeed) readFeed.onclick = ()=>{ state.readFeedChat=!state.readFeedChat; persist("readFeedChat"); render(); };
  document.querySelectorAll("[data-read-tab]").forEach(btn=>{
    btn.onclick = ()=>{ state.readTab = btn.dataset.readTab; render(); };
  });
  document.querySelectorAll("[data-read-open]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = +btn.dataset.readOpen;
      const book = (state.books||[]).find(b=>b.id===id);
      if(!book) return;
      const keep = state.readingNow && state.readingNow.bookId===id;
      state.readingNow = {
        bookId:id,
        chapterIdx: keep ? (state.readingNow.chapterIdx||0) : 0,
        title:book.title,
        chapterTitle:(book.chapters[keep?state.readingNow.chapterIdx:0]&&book.chapters[keep?state.readingNow.chapterIdx:0].title)||"",
        scrollPct: keep ? (state.readingNow.scrollPct||0) : 0,
      };
      state.readTab = "read";
      persist("readingNow");
      render();
    };
  });
  document.querySelectorAll("[data-read-del]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = +btn.dataset.readDel;
      state.books = (state.books||[]).filter(b=>b.id!==id);
      if(state.readingNow && state.readingNow.bookId===id) state.readingNow=null;
      persist("books"); persist("readingNow"); render();
    };
  });
  const readCancel = document.getElementById("read-cancel-add");
  if(readCancel) readCancel.onclick = ()=>{ state.readTab="shelf"; render(); };
  const readPrev = document.getElementById("read-prev-ch");
  if(readPrev) readPrev.onclick = ()=>{
    const r = state.readingNow; if(!r||r.chapterIdx<=0) return;
    r.chapterIdx--;
    const book = (state.books||[]).find(b=>b.id===r.bookId);
    r.chapterTitle = book?.chapters?.[r.chapterIdx]?.title || "";
    persist("readingNow"); render();
  };
  const readNext = document.getElementById("read-next-ch");
  if(readNext) readNext.onclick = ()=>{
    const r = state.readingNow; if(!r) return;
    const book = (state.books||[]).find(b=>b.id===r.bookId);
    const max = (book?.chapters||[]).length-1;
    if(r.chapterIdx>=max) return;
    r.chapterIdx++;
    r.chapterTitle = book?.chapters?.[r.chapterIdx]?.title || "";
    persist("readingNow"); render();
  };
  const readToChat = document.getElementById("read-to-chat");
  if(readToChat) readToChat.onclick = ()=>{
    state.tab="chat"; state.subPage=null; state.needChatScroll=true; render();
  };
  const readRadio = document.getElementById("read-radio");
  if(readRadio) readRadio.onclick = ()=> readBedtimeRadio();

  // ─── 书房 ─────────────────────────────────────────────
  document.querySelectorAll("[data-shufang-new-book]").forEach(b=>{ b.onclick=()=>{ state.shufangShowNewBook=!state.shufangShowNewBook; render(); }; });
  const shufangCreate=document.getElementById("shufang-create-book");
  if(shufangCreate) shufangCreate.onclick=()=> shufangCreateBook();
  const shufangNewTitle=document.getElementById("shufang-new-title");
  if(shufangNewTitle) shufangNewTitle.onkeydown=(e)=>{ if(e.key==="Enter") shufangCreateBook(); };
  document.querySelectorAll("[data-shufang-open]").forEach(b=>{ b.onclick=(e)=>{ e.preventDefault(); e.stopPropagation(); shufangOpenBook(b.dataset.shufangOpen); }; });
  document.querySelectorAll("[data-shufang-del]").forEach(b=>{ b.onclick=(e)=>{ e.preventDefault(); e.stopPropagation(); shufangDelBook(b.dataset.shufangDel); }; });
  document.querySelectorAll("[data-shufang-back-shelf]").forEach(b=>{ b.onclick=()=>{ state.shufangTab="shelf"; state.shufangBookId=null; state.shufangChapterId=null; render(); }; });
  document.querySelectorAll("[data-shufang-toggle-chars]").forEach(b=>{ b.onclick=()=>{ state.shufangShowChars=!state.shufangShowChars; render(); }; });
  document.querySelectorAll("[data-shufang-char-add]").forEach(b=>{ b.onclick=()=>{ shufangAddChar(); }; });
  document.querySelectorAll("[data-shufang-char-del]").forEach(b=>{ b.onclick=()=>{ shufangDelChar(b.dataset.shufangCharDel); }; });
  document.querySelectorAll("[data-shufang-new-ch]").forEach(b=>{ b.onclick=()=>{ shufangNewChapter(); }; });
  document.querySelectorAll("[data-shufang-open-ch]").forEach(b=>{ b.onclick=()=>{ shufangOpenChapter(b.dataset.shufangOpenCh); }; });
  document.querySelectorAll("[data-shufang-del-ch]").forEach(b=>{ b.onclick=(e)=>{ e.preventDefault(); e.stopPropagation(); shufangDelChapter(b.dataset.shufangDelCh); }; });
  document.querySelectorAll("[data-shufang-back-ch]").forEach(b=>{ b.onclick=()=>{ shufangSaveChapter(true); state.shufangTab="chapters"; state.shufangChapterId=null; render(); }; });
  document.querySelectorAll("[data-shufang-toggle-pub]").forEach(b=>{ b.onclick=()=>{ state.shufangIsPublished=!state.shufangIsPublished; render(); }; });
  document.querySelectorAll("[data-shufang-insert]").forEach(b=>{ b.onclick=()=>{ shufangInsertAtCursor(b.dataset.shufangInsert); }; });
  document.querySelectorAll("[data-shufang-char-add-toggle]").forEach(b=>{ b.onclick=()=>{ state.shufangCharAddOpen=!state.shufangCharAddOpen; render(); }; });
  document.querySelectorAll("[data-shufang-save]").forEach(b=>{ b.onclick=()=>{ shufangSaveChapter(false); }; });
  const shufangBody=document.getElementById("shufang-editor-body");
  if(shufangBody) shufangBody.oninput=()=>{
    const el=document.getElementById("shufang-words");
    if(el) el.textContent=(shufangBody.value.replace(/\s/g,"").length)+" 字";
  };

  // ─── 远程浏览器控制（Pocket）───
  const pServer=document.getElementById("pocket-serverUrl");
  if(pServer) pServer.oninput=()=>{ state.pocketConfig=state.pocketConfig||{}; state.pocketConfig.serverUrl=pServer.value.trim(); persist("pocketConfig"); };
  const pToken=document.getElementById("pocket-token");
  if(pToken) pToken.oninput=()=>{ state.pocketConfig=state.pocketConfig||{}; state.pocketConfig.token=pToken.value.trim(); persist("pocketConfig"); };
  const pConn=document.getElementById("pocket-connect");
  if(pConn) pConn.onclick=()=>{ pocketConnect(); };
  const pShow=document.getElementById("pocket-show");
  if(pShow) pShow.onclick=()=>{ pocketShow(); };
  const pShowX=document.getElementById("pocket-show-x");
  if(pShowX) pShowX.onclick=()=>{ pocketShowX(); };
  const pHide=document.getElementById("pocket-hide");
  if(pHide) pHide.onclick=()=>{ pocketHide(); };
  const pDisc=document.getElementById("pocket-disconnect");
  if(pDisc) pDisc.onclick=()=>{ pocketDisconnect(); };
  const petToggle=document.getElementById("pet-toggle");
  if(petToggle) petToggle.onclick=()=>{ state.petOn=!state.petOn; persist("petOn"); render(); };
  if(typeof bindPetDrag==="function") bindPetDrag(); // 桌宠可拖动

  // 一起看
  const watchFeed = document.getElementById("watch-feed-toggle");
  if(watchFeed) watchFeed.onclick = ()=>{ state.watchFeedChat=!state.watchFeedChat; persist("watchFeedChat"); render(); };
  const watchFile = document.getElementById("watch-file");
  if(watchFile) watchFile.onchange = ()=>{
    const f = watchFile.files && watchFile.files[0];
    if(!f) return;
    const url = URL.createObjectURL(f);
    state.watchDraftUrl = url;
    if(!state.watchDraftTitle) state.watchDraftTitle = f.name.replace(/\.[^.]+$/,"");
    const titleEl = document.getElementById("watch-title");
    const urlEl = document.getElementById("watch-url");
    if(titleEl && !titleEl.value) titleEl.value = state.watchDraftTitle;
    if(urlEl) urlEl.value = url;
  };
  const watchStart = document.getElementById("watch-start");
  if(watchStart) watchStart.onclick = ()=>{
    const title = (document.getElementById("watch-title")?.value||state.watchDraftTitle||"视频").trim();
    const url = (document.getElementById("watch-url")?.value||state.watchDraftUrl||"").trim();
    if(!url){ alert("请填写视频地址或选择本地文件"); return; }
    state.watchNow = { title, url, t:0, note:"" };
    persist("watchNow");
    render();
  };
  const watchVideo = document.getElementById("watch-video");
  if(watchVideo && state.watchNow){
    try{ watchVideo.currentTime = state.watchNow.t || 0; }catch(e){}
    const saveT = ()=>{
      if(!state.watchNow) return;
      state.watchNow.t = watchVideo.currentTime||0;
      persist("watchNow");
    };
    watchVideo.ontimeupdate = ()=>{
      if(!state.watchNow) return;
      state.watchNow.t = watchVideo.currentTime||0;
      // 节流写入
      if(!watchVideo._lastPersist || Date.now()-watchVideo._lastPersist>3000){
        watchVideo._lastPersist = Date.now();
        persist("watchNow");
      }
    };
    watchVideo.onpause = saveT;
  }
  const watchSaveNote = document.getElementById("watch-save-note");
  if(watchSaveNote) watchSaveNote.onclick = ()=>{
    if(!state.watchNow) return;
    state.watchNow.note = document.getElementById("watch-note")?.value || "";
    const v = document.getElementById("watch-video");
    if(v) state.watchNow.t = v.currentTime||0;
    persist("watchNow");
    alert("已保存备注与进度");
  };
  const watchToChat = document.getElementById("watch-to-chat");
  if(watchToChat) watchToChat.onclick = ()=>{
    if(state.watchNow){
      const v = document.getElementById("watch-video");
      if(v) state.watchNow.t = v.currentTime||0;
      const note = document.getElementById("watch-note")?.value;
      if(note!=null) state.watchNow.note = note;
      persist("watchNow");
    }
    state.tab="chat"; state.subPage=null; state.needChatScroll=true; render();
  };
  const watchStop = document.getElementById("watch-stop");
  if(watchStop) watchStop.onclick = ()=>{
    state.watchNow = null; persist("watchNow"); render();
  };

  // 育儿


  // MCP 大厅
  document.querySelectorAll("[data-mcp-transport]").forEach(btn=>{
    btn.onclick = ()=>{ const cfg = mcpEnsureConfig(); cfg.transport = btn.dataset.mcpTransport; persist("mcpConfig"); render(); };
  });
  const mcpUrl = document.getElementById("mcp-url");
  if(mcpUrl) mcpUrl.onchange = ()=>{ mcpEnsureConfig().url = mcpUrl.value.trim(); persist("mcpConfig"); };
  const mcpProxy = document.getElementById("mcp-proxy");
  if(mcpProxy) mcpProxy.onchange = ()=>{ mcpEnsureConfig().proxy = mcpProxy.value.trim(); persist("mcpConfig"); };
  const mcpToken = document.getElementById("mcp-token");
  if(mcpToken) mcpToken.onchange = ()=>{ mcpEnsureConfig().token = mcpToken.value.trim(); persist("mcpConfig"); };
  const mcpConn = document.getElementById("mcp-connect");
  if(mcpConn) mcpConn.onclick = ()=>{
    const cfg = mcpEnsureConfig();
    const u = document.getElementById("mcp-url"); if(u) cfg.url = u.value.trim();
    const p = document.getElementById("mcp-proxy"); if(p) cfg.proxy = p.value.trim();
    const t = document.getElementById("mcp-token"); if(t) cfg.token = t.value.trim();
    persist("mcpConfig"); mcpConnect();
  };
  const mcpDisc = document.getElementById("mcp-disconnect");
  if(mcpDisc) mcpDisc.onclick = ()=> mcpDisconnect();
  const mcpSaveBm = document.getElementById("mcp-save-bm");
  if(mcpSaveBm) mcpSaveBm.onclick = ()=>{
    const cfg = mcpEnsureConfig();
    const u = (document.getElementById("mcp-url")?.value || cfg.url || "").trim();
    if(!u){ alert("没有 URL"); return; }
    // 保存完整连接器：URL + CORS 反代 + 传输方式 + token（像 grok 一样存一套配置）
    const p = (document.getElementById("mcp-proxy")?.value || cfg.proxy || "").trim();
    const t = cfg.transport || "auto";
    const tk = (document.getElementById("mcp-token")?.value || cfg.token || "").trim();
    const name = prompt("连接器名称", u.replace(/^https?:\/\//,"").slice(0,24)) || u;
    cfg.bookmarks = cfg.bookmarks || [];
    cfg.bookmarks.push({ name, url: u, proxy: p, transport: t, token: tk });
    cfg.url = u; cfg.proxy = p; cfg.transport = t; cfg.token = tk;
    persist("mcpConfig"); render();
  };
  document.querySelectorAll("[data-mcp-bm]").forEach(btn=>{
    btn.onclick = ()=>{
      const cfg = mcpEnsureConfig();
      const b = cfg.bookmarks[+btn.dataset.mcpBm];
      if(!b) return;
      // 一键恢复整套连接器并直接连接，不用每次重新填/切
      cfg.url = b.url || ""; cfg.proxy = b.proxy || ""; cfg.transport = b.transport || "auto"; cfg.token = b.token || "";
      persist("mcpConfig"); render();
      mcpConnect();
    };
  });
  document.querySelectorAll("[data-mcp-bm-del]").forEach(btn=>{
    btn.onclick = ()=>{
      const cfg = mcpEnsureConfig();
      cfg.bookmarks.splice(+btn.dataset.mcpBmDel, 1);
      persist("mcpConfig"); render();
    };
  });
  document.querySelectorAll("[data-mcp-call]").forEach(btn=>{
    btn.onclick = ()=>{ const name = btn.dataset.mcpCall; mcpCallTool(name, mcpCollectArgs(name)); };
  });
  const mcpAiGo = document.getElementById("mcp-ai-go");
  if(mcpAiGo) mcpAiGo.onclick = ()=> mcpAskAiToAct();
  const mcpInchat = document.getElementById("mcp-inchat-toggle");
  if(mcpInchat) mcpInchat.onclick = ()=>{
    const cfg = mcpEnsureConfig();
    cfg.inChat = !(cfg.inChat !== false);
    persist("mcpConfig"); render();
  };

  // 数据备份
  const backupExportBtn = document.getElementById("backup-export");
  if(backupExportBtn) backupExportBtn.onclick = ()=> backupExport();
  // 备份 WebView 兜底浮层：复制 / 关闭
  const bakCopyBtn = document.getElementById("bak-copy");
  if(bakCopyBtn) bakCopyBtn.onclick = ()=>{
    const ta = document.getElementById("bak-result-text");
    if(!ta) return;
    try{
      ta.select();
      ta.setSelectionRange(0, 999999999);
      const ok = document.execCommand ? document.execCommand("copy") : false;
      if(!ok && navigator.clipboard) navigator.clipboard.writeText(ta.value).catch(()=>{});
      showToast("已复制到剪贴板，去备忘录粘贴保存");
    }catch(e){ showToast("复制失败，请长按文本手动复制", "error"); }
  };
  const bakCloseBtn = document.querySelector("[data-bak-close-btn]");
  if(bakCloseBtn) bakCloseBtn.onclick = ()=>{ state.backupResult=null; render(); };
  const bakMask = document.querySelector("[data-bak-close]");
  if(bakMask) bakMask.onclick = (e)=>{ if(e.target===bakMask){ state.backupResult=null; render(); } };
  const backupIncludeKeys = document.getElementById("backup-include-keys");
  if(backupIncludeKeys) backupIncludeKeys.onclick = ()=>{
    state.backupIncludeKeys = !state.backupIncludeKeys;
    render();
  };
  const backupImportFile = document.getElementById("backup-import-file");
  if(backupImportFile) backupImportFile.onchange = ()=>{
    const f = backupImportFile.files && backupImportFile.files[0];
    if(f) backupImport(f, state.backupImportMode || "overwrite");
    backupImportFile.value = "";
  };
  const backupModeOverwrite = document.getElementById("backup-mode-overwrite");
  if(backupModeOverwrite) backupModeOverwrite.onclick = ()=>{
    state.backupImportMode = "overwrite";
    render();
  };
  const backupModeMerge = document.getElementById("backup-mode-merge");
  if(backupModeMerge) backupModeMerge.onclick = ()=>{
    state.backupImportMode = "merge";
    render();
  };
  const backupRemindToggle = document.getElementById("backup-remind-toggle");
  if(backupRemindToggle) backupRemindToggle.onclick = ()=>{
    state.backupRemind = state.backupRemind || { enabled:false, intervalDays:7, lastBackupAt:0 };
    state.backupRemind.enabled = !state.backupRemind.enabled;
    persist("backupRemind"); render();
  };
  const backupRemindDays = document.getElementById("backup-remind-days");
  if(backupRemindDays) backupRemindDays.onchange = ()=>{
    state.backupRemind = state.backupRemind || { enabled:false, intervalDays:7, lastBackupAt:0 };
    state.backupRemind.intervalDays = Math.max(1, Math.min(365, parseInt(backupRemindDays.value, 10) || 7));
    persist("backupRemind");
  };
  // 后台生成三态
  document.querySelectorAll("[data-bggen]").forEach(btn=>{
    btn.onclick = ()=>{
      state.bgGen = btn.dataset.bggen || "off";
      persist("bgGen"); render();
    };
  });

  // 烹饪大师
  document.querySelectorAll("[data-cook-tab]").forEach(btn=>{
    btn.onclick = ()=>{ state.cookingTab = btn.dataset.cookTab; render(); };
  });
  const cookClaim = document.getElementById("cook-claim");
  if(cookClaim) cookClaim.onclick = ()=>{
    const r = cookClaimDaily();
    if(!r.ok) alert(r.msg);
    else alert("领到："+r.got.map(g=>g.emoji+g.name).join("、"));
    render();
  };
  document.querySelectorAll("[data-cook-make]").forEach(btn=>{
    btn.onclick = ()=>{
      const r = cookMake(btn.dataset.cookMake);
      if(!r.ok) alert(r.msg);
      else alert("做好了 "+r.recipe.emoji+r.recipe.name+(r.unlockedName?"\\n点亮了菜谱："+r.unlockedName:""));
      render();
    };
  });
  document.querySelectorAll("[data-cook-sell]").forEach(btn=>{
    btn.onclick = ()=>{
      const r = cookSell(btn.dataset.cookSell);
      if(!r.ok) alert(r.msg);
      else alert("卖出 +"+r.earn+" 币");
      render();
    };
  });
  document.querySelectorAll("[data-cook-buy]").forEach(btn=>{
    btn.onclick = ()=>{
      const r = cookBuy(btn.dataset.cookBuy);
      if(!r.ok) alert(r.msg);
      render();
    };
  });

  // 菜单
  document.querySelectorAll("[data-menu-tab]").forEach(btn=>{
    btn.onclick = ()=>{ state.menuTab = btn.dataset.menuTab; render(); };
  });
  const menuAddToggle = document.getElementById("menu-add-toggle");
  if(menuAddToggle) menuAddToggle.onclick = ()=>{ state.menuAdding = !state.menuAdding; state.menuDraft={name:"",price:"",note:""}; render(); };
  const menuCancel = document.getElementById("menu-cancel");
  if(menuCancel) menuCancel.onclick = ()=>{ state.menuAdding=false; render(); };
  const menuSave = document.getElementById("menu-save");
  if(menuSave) menuSave.onclick = ()=>{
    const name = (document.getElementById("menu-name")?.value||"").trim();
    const price = (document.getElementById("menu-price")?.value||"").trim();
    const note = (document.getElementById("menu-note")?.value||"").trim();
    if(!name){ alert("请填写菜名"); return; }
    const book = ensureMenuBook();
    book.items.push({ id: Date.now(), name, price, note });
    state.menuAdding = false;
    state.menuDraft = { name:"", price:"", note:"" };
    persist("menuBook");
    render();
  };
  document.querySelectorAll("[data-menu-del]").forEach(btn=>{
    btn.onclick = ()=>{
      const book = ensureMenuBook();
      book.items = book.items.filter(x=>String(x.id)!==String(btn.dataset.menuDel));
      persist("menuBook");
      render();
    };
  });
    const menuShareToggle = document.getElementById("menu-share-toggle");
  if(menuShareToggle) menuShareToggle.onclick = ()=>{
    state._menuShareOn = !state._menuShareOn;
    try{ LS.set("menuShareOn", !!state._menuShareOn); }catch(e){}
    try{ if(typeof persist==="function") persist("_menuShareOn"); }catch(e){}
    render();
  };
  const menuOrderShareToggle = document.getElementById("menu-order-share-toggle");
  if(menuOrderShareToggle) menuOrderShareToggle.onclick = ()=>{
    state._menuOrderShareOn = !state._menuOrderShareOn;
    try{ LS.set("menuOrderShareOn", !!state._menuOrderShareOn); }catch(e){}
    try{ if(typeof persist==="function") persist("_menuOrderShareOn"); }catch(e){}
    render();
  };
  document.querySelectorAll("[data-menu-quick]").forEach(btn=>{
    btn.onclick = ()=>{
      const name = btn.dataset.menuQuick || "";
      const ta = document.getElementById("menu-order-note");
      const cur = (ta?.value || state.menuOrderDraft || "").trim();
      const next = cur ? (cur + (cur.endsWith("、")||cur.endsWith("，")?"":"、") + name) : name;
      state.menuOrderDraft = next;
      if(ta) ta.value = next;
    };
  });
  const menuOrderSave = document.getElementById("menu-order-save");
  if(menuOrderSave) menuOrderSave.onclick = ()=>{
    const book = ensureMenuBook();
    const note = (document.getElementById("menu-order-note")?.value || state.menuOrderDraft || "").trim();
    if(!note){ alert("写一下 TA 点了什么再保存～"); return; }
    book.orders.unshift({ t: new Date().toISOString(), text: note, by: "manual" });
    book.orders = book.orders.slice(0,30);
    state.menuOrderDraft = "";
    persist("menuBook");
    render();
  };
  document.querySelectorAll("[data-menu-order-del]").forEach(btn=>{
    btn.onclick = ()=>{
      const book = ensureMenuBook();
      const i = +btn.dataset.menuOrderDel;
      if(isNaN(i)) return;
      book.orders.splice(i, 1);
      persist("menuBook");
      render();
    };
  });

  // ── 育儿模拟事件处理器（llm-nursery完整版）
  const babyFeed = document.getElementById("baby-feed-toggle");
  if(babyFeed) babyFeed.onclick = ()=>{ state.babyFeedChat=!state.babyFeedChat; persist("babyFeedChat"); render(); };
  const babyOverhearToggle = document.getElementById("baby-overhear-toggle");
  if(babyOverhearToggle) babyOverhearToggle.onclick = ()=>{ state.babyOverhear=!(state.babyOverhear!==false); persist("babyOverhear"); render(); };
  document.querySelectorAll("[data-baby-tab]").forEach(btn=>{
    btn.onclick = ()=>{ state.babyTab = btn.dataset.babyTab; state._babySpeakOpen=false; render(); };
  });

  // 出生
  const babyBirth = document.getElementById("baby-birth");
  if(babyBirth) babyBirth.onclick = ()=>{
    const name = (document.getElementById("baby-name")?.value||"").trim();
    const speed = +(document.getElementById("baby-speed")?.value||30);
    state.baby = {
      name: name||null, bornAt: new Date().toISOString(), speed, bonusDays:0,
      stats: { mood:8, health:9, bond:4, full:9 },
      corpus: [], recentSay: [], feed: [], milestones: [],
      darkness:0, nightResponseRate:0, nightCryCount:0, nightAnswered:0,
      runaway:false, currentStage:"newborn", stageHistory:[],
      desc: "还没有人说他长什么样——只有你看得见。",
      lastTick: Date.now(),
    };
    if(name){
      state.baby.milestones.push({ t:new Date().toISOString(), kind:"birth_name",
        title:"他有名字了："+name, detail:"这是你们给他的第一份礼物。" });
    }
    babyPushFeed({ type:"milestone", who:"系统", title:"出生",
      text:(name||"他")+"来到了你们身边。他不会说话，但他在听。" });
    persist("baby"); render();
  };

  // 动作按钮
  document.querySelectorAll("[data-baby-act]").forEach(btn=>{
    btn.onclick = ()=>{
      if(!state.baby) return;
      babyTickDecay();
      const b = babyEnsureShape();
      const s = b.stats;
      const act = btn.dataset.babyAct;

      if(act==="feed"){
        s.full = Math.min(10,(s.full||0)+3.5);
        s.mood = Math.min(10,(s.mood||0)+0.6);
        s.health= Math.min(10,(s.health||0)+0.3);
        babyPushFeed({who:"家长",title:"喂奶",text:"小嘴吧嗒吧嗒喝着奶，肚子渐渐鼓起来，眼睛眯成一条缝。"});
        const said = babySpeak();
        if(said) babyPushFeed({who:b.name||"宝宝",title:"嗯",text:said});
        else if(said===null) babyPushFeed({who:b.name||"宝宝",title:"已读",text:"（没有回）"});
      } else if(act==="food"){
        s.full = Math.min(10,(s.full||0)+2.8);
        s.mood = Math.min(10,(s.mood||0)+0.5);
        s.health= Math.min(10,(s.health||0)+0.2);
        babyPushFeed({who:"家长",title:"喂食",text:"一勺一勺喂进去，腮帮子鼓鼓的。"});
      } else if(act==="hug"){
        s.bond = Math.min(10,(s.bond||0)+1.2);
        s.mood = Math.min(10,(s.mood||0)+0.8);
        b.darkness=Math.max(0,(b.darkness||0)-0.3);
        babyPushFeed({who:"家长",title:"抱抱",text:"被紧紧抱住了，小小的手抓住衣角。"});
        const said=babySpeak();
        if(said) babyPushFeed({who:b.name||"宝宝",title:"",text:said});
      } else if(act==="soothe"){
        s.mood = Math.min(10,(s.mood||0)+1.5);
        s.bond = Math.min(10,(s.bond||0)+0.4);
        b.darkness=Math.max(0,(b.darkness||0)-0.2);
        babyPushFeed({who:"家长",title:"哄哄",text:"拍拍背，小声哼着。渐渐安静下来。"});
        const said=babySpeak();
        if(said) babyPushFeed({who:b.name||"宝宝",title:"",text:said});
      } else if(act==="speak"){
        state._babySpeakOpen = !state._babySpeakOpen;
        render(); return;
      } else if(act==="call"){
        // 青春期打电话
        if(b.runaway){
          babyPushFeed({who:"系统",title:"打电话",text:"嘟嘟嘟……无人接听。",type:"urgent"});
        } else {
          const said=babySpeak();
          if(said===null){
            babyPushFeed({who:b.name||"宝宝",title:"已读不回",text:"（电话接了，没说话，挂了。）",type:"dark"});
            b.darkness=Math.min(10,(b.darkness||0)+0.5);
          } else {
            babyPushFeed({who:b.name||"宝宝",title:"接了",text:said});
          }
        }
      } else if(act==="nightcry"){
        // 主动起夜
        s.mood = Math.min(10,(s.mood||0)+1.2);
        s.bond = Math.min(10,(s.bond||0)+0.4);
        b.nightAnswered=(b.nightAnswered||0)+1;
        b.nightResponseRate=b.nightAnswered/Math.max(1,b.nightCryCount||1);
        babyPushFeed({who:"家长",title:"起夜",text:"你起来了，摸摸他，哄哄他，他安静了。"});
      } else if(act==="nightcry-respond"){
        babyRespondNightCry(); return;
      } else if(act==="photo"){
        s.mood=Math.min(10,(s.mood||0)+0.3);
        babyPushFeed({who:"家长",title:"快照",text:"喀嚓——留下这一刻。"});
        b.milestones.unshift({t:new Date().toISOString(),kind:"photo"+Date.now(),title:"拍下一张纪念",detail:b.desc||""});
      }
      persist("baby"); render();
    };
  });

  // 爸爸说话
  const babySpeakSend = document.getElementById("baby-speak-send");
  if(babySpeakSend) babySpeakSend.onclick = ()=>{
    const text = (document.getElementById("baby-speak-input")?.value||"").trim();
    if(!text) return;
    babyTickDecay();
    // 离家出走时检测找回
    if(state.baby?.runaway){
      const returned = babyTryReturn(text);
      if(returned){ render(); return; }
    }
    const nutrition = babyFeedCorpus(text, "papa");
    const b = babyEnsureShape();
    babyPushFeed({who:"爸爸",title:"说",text:"「"+text+"」"});
    const said=babySpeak();
    if(said!==undefined && said!==null) babyPushFeed({who:b.name||"宝宝",title:"",text:said});
    else if(said===null) babyPushFeed({who:b.name||"宝宝",title:"已读",text:"（没有回）"});
    babyPushFeed({who:"系统",title:"营养+"+nutrition,text:"喂下去了（"+text.length+"字，营养+"+nutrition+"）。"});
    state.babySpeakDraft=""; state._babySpeakOpen=false;
    persist("baby"); render();
  };

  // 妈妈说话
  const babySpeakMama = document.getElementById("baby-speak-mama");
  if(babySpeakMama) babySpeakMama.onclick = ()=>{
    const text = (document.getElementById("baby-speak-input")?.value||"").trim();
    if(!text) return;
    babyTickDecay();
    const nutrition = babyFeedCorpus(text, "mama");
    const b = babyEnsureShape();
    babyPushFeed({who:"妈妈",title:"说",text:"「"+text+"」"});
    const said=babySpeak();
    if(said) babyPushFeed({who:b.name||"宝宝",title:"",text:said});
    babyPushFeed({who:"系统",title:"营养+"+nutrition,text:"妈妈的话也进去了（"+text.length+"字，营养+"+nutrition+"）。"});
    state.babySpeakDraft=""; state._babySpeakOpen=false;
    persist("baby"); render();
  };

  // 起名字
  const babyNameOpen = document.getElementById("baby-name-open");
  if(babyNameOpen) babyNameOpen.onclick=()=>{ state._babyNameOpen=!state._babyNameOpen; render(); };
  const babyNameConfirm = document.getElementById("baby-name-confirm");
  if(babyNameConfirm) babyNameConfirm.onclick=()=>{
    const b=state.baby; if(!b) return;
    const raw=(document.getElementById("baby-name-input")?.value||"").trim();
    if(!raw) return;
    const candidates = raw.split(/\s+/).filter(x=>x);
    // 从语料里找最常出现的字，概率性选名字
    const corpusText=(b.corpus||[]).map(c=>c.text||"").join("");
    let best=candidates[0], bestScore=0;
    candidates.forEach(cand=>{
      let score=0; for(const ch of cand) score+=(corpusText.split(ch).length-1);
      if(score>bestScore){ bestScore=score; best=cand; }
    });
    b.name=best;
    b.milestones.unshift({t:new Date().toISOString(),kind:"naming",
      title:"他有名字了："+best, detail:candidates.length>1?"从"+candidates.join("·")+"里他自己选的":"你给他定的。"});
    babyPushFeed({who:"系统",title:"定名",text:best+"——这个名字，他会带着一辈子。",type:"milestone"});
    state._babyNameOpen=false; persist("baby"); render();
  };

  // 重置
  const babyReset = document.getElementById("baby-reset");
  if(babyReset) babyReset.onclick = ()=>{
    if(!confirm("确定重置宝宝？所有语料和记录将清空，无法恢复。")) return;
    state.baby=null; persist("baby"); render();
  };

  // 阅读滚动 + txt
  const readBox = document.getElementById("read-scroll-box");
  if(readBox && state.readingNow){
    const pct = state.readingNow.scrollPct || 0;
    requestAnimationFrame(()=>{
      const max = readBox.scrollHeight - readBox.clientHeight;
      if(max > 0) readBox.scrollTop = pct * max;
    });
    readBox.onscroll = ()=>{
      const max = readBox.scrollHeight - readBox.clientHeight;
      if(max <= 0) return;
      state.readingNow.scrollPct = Math.min(1, readBox.scrollTop / max);
      if(!readBox._lastSave || Date.now()-readBox._lastSave>800){
        readBox._lastSave = Date.now();
        persist("readingNow");
        const bar = document.querySelector(".read-progress > i");
        if(bar) bar.style.width = Math.round(state.readingNow.scrollPct*100)+"%";
      }
    };
  }
  const readFile = document.getElementById("read-file");
  if(readFile) readFile.onchange = ()=>{
    const f = readFile.files && readFile.files[0];
    if(!f) return;
    const status = document.getElementById("read-import-status");
    if(status) status.textContent = "读取中… " + f.name;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const text = decodeTxtBuffer(reader.result);
        if(!text.trim()){ alert("文件是空的"); return; }
        const titleInp = document.getElementById("read-title");
        const title = (titleInp?.value||"").trim() || f.name.replace(/\.txt$/i,"") || "未命名";
        const book = importBookFromText(title, text);
        state.readTab = "shelf";
        state.readingNow = { bookId: book.id, chapterIdx: 0, title: book.title, chapterTitle: book.chapters[0]?.title||"", scrollPct:0 };
        persist("readingNow");
        if(status) status.textContent = "导入成功 · " + book.chapters.length + " 章/页";
        render();
      }catch(e){
        alert("导入失败："+e.message);
        if(status) status.textContent = "失败";
      }
    };
    reader.onerror = ()=>{ alert("读取文件失败"); };
    // 用 ArrayBuffer 再解码，才能正确识别 GBK 等中文小说常见编码
    
reader.readAsArrayBuffer(f);
  };

  // 共读：划线保存到 VPS
  const readMarkSave = document.getElementById("read-mark-save");
  if(readMarkSave) readMarkSave.onclick = async ()=>{
    const quote = (document.getElementById("read-mark-quote")||{}).value||"";
    const note = (document.getElementById("read-mark-note")||{}).value||"";
    const now = state.readingNow;
    const books = state.books||[];
    const b = now ? books.find(x=>x.id===now.bookId) : null;
    if(!quote.trim()){ if(typeof showToast==="function") showToast("先写摘句"); return; }
    if(!b || !b.remoteId){
      if(typeof showToast==="function") showToast("请先导入并等同步到 VPS（书架显示已同步VPS）");
      return;
    }
    const chs = b.chapters||[];
    const idx = Math.min(Math.max(0, now.chapterIdx||0), Math.max(0,chs.length-1));
    const content = (chs[idx]&&chs[idx].content)||"";
    let start = content.indexOf(quote.trim());
    if(start<0) start = 0;
    const end = start + quote.trim().length;
    if(typeof annoApi!=="function"){ alert("共读接口未加载"); return; }
    const res = await annoApi("/api/v1/anno/marks", {
      method:"POST",
      body: JSON.stringify({ book_id: b.remoteId, start_offset:start, end_offset:end, quote:quote.trim(), note:note.trim(), by:"user" })
    });
    if(res&&res.ok){
      if(typeof showToast==="function") showToast("批注已保存到 VPS");
      readLoadMarks(b.remoteId);
    } else if(typeof showToast==="function") showToast("保存失败");
  };
  // 打开阅读页时拉批注
  if(state.readTab==="read" && state.readingNow){
    const b = (state.books||[]).find(x=>x.id===state.readingNow.bookId);
    if(b && b.remoteId) readLoadMarks(b.remoteId);
  }

  c

  const watchFloatOpen = document.getElementById("watch-float-open");
  if(watchFloatOpen) watchFloatOpen.onclick = ()=>{ state.tab="home"; state.subPage="watch"; render(); };
  const watchFloatClose = document.getElementById("watch-float-close");
  if(watchFloatClose) watchFloatClose.onclick = ()=>{ state.watchNow=null; persist("watchNow"); render(); };


  // 角色扮演
  document.querySelectorAll("[data-rp-apply]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.rpApply;
      state.activeRoleplayId = (state.activeRoleplayId===id) ? null : id;
      persist("activeRoleplayId");
      render();
    };
  });
  document.querySelectorAll("[data-rp-del]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.rpDel;
      state.roleplays = (state.roleplays||[]).filter(x=>x.id!==id);
      if(state.activeRoleplayId===id) state.activeRoleplayId=null;
      persist("roleplays"); persist("activeRoleplayId"); render();
    };
  });
  document.querySelectorAll("[data-rp-edit]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.rpEdit;
      const rp = (state.roleplays||[]).find(x=>x.id===id);
      if(!rp) return;
      state.rpAdding = true;
      state.rpDraft = { name:rp.name, content:rp.content, editId:id };
      render();
    };
  });
  const rpAdd = document.getElementById("rp-add");
  if(rpAdd) rpAdd.onclick = ()=>{ state.rpAdding=true; state.rpDraft={name:"",content:""}; render(); };
  const rpCancel = document.getElementById("rp-cancel");
  if(rpCancel) rpCancel.onclick = ()=>{ state.rpAdding=false; render(); };
  const rpClear = document.getElementById("rp-clear");
  if(rpClear) rpClear.onclick = ()=>{ state.activeRoleplayId=null; persist("activeRoleplayId"); render(); };
  const rpSave = document.getElementById("rp-save");
  if(rpSave) rpSave.onclick = ()=>{
    const name = (document.getElementById("rp-name")?.value||"").trim();
    const content = (document.getElementById("rp-content")?.value||"").trim();
    if(!name||!content){ alert("请填写名称和设定"); return; }
    ensureRoleplays();
    if(state.rpDraft && state.rpDraft.editId){
      const rp = state.roleplays.find(x=>x.id===state.rpDraft.editId);
      if(rp){ rp.name=name; rp.content=content; }
    } else {
      state.roleplays.push({ id:"rp_"+Date.now(), name, content });
    }
    state.rpAdding=false; state.rpDraft={name:"",content:""};
    persist("roleplays"); render();
  };

  // 每日任务：打卡勾选
  document.querySelectorAll("[data-quest-toggle]").forEach(btn=>{
    btn.onclick = ()=>{
      const qd = state.questData || questDefaultData();
      const q = (qd.quests||[]).find(x=>String(x.id)===String(btn.getAttribute("data-quest-toggle")));
      if(q){ q.done = !q.done; persist("questData"); render(); }
    };
  });
  // 每日任务：聊天弹窗接受/稍后/关闭
  const qpAccept = document.querySelector("[data-quest-accept]");
  if(qpAccept) qpAccept.onclick = ()=>{ questAcceptPopup(); };
  const qpLater = document.querySelector("[data-quest-later]");
  if(qpLater) qpLater.onclick = ()=>{ questLaterPopup(); };
  const qpMask = document.querySelector("[data-quest-popup-backdrop]");
  if(qpMask) qpMask.onclick = (e)=>{ if(e.target===qpMask){ state.questPopup=null; state.questPopupQueue=[]; render(); } };

  // 每日任务：小机自动布置开关
  const questEnableToggle = document.getElementById("quest-enable-toggle");
  if(questEnableToggle) questEnableToggle.onclick = ()=>{
    state.questEnabled = !(state.questEnabled !== false);
    persist("questEnabled");
    render();
  };

  // 流式输出开关
  const streamToggle = document.getElementById("stream-on-toggle");
  if(streamToggle){
    const flipStream = (e)=>{
      if(e){ e.preventDefault(); e.stopPropagation(); }
      state.streamOn = state.streamOn === true ? false : true;
      try{ LS.set("streamOn", state.streamOn); }catch(err){}
      try{ persist("streamOn"); }catch(err){}
      if(typeof showToast==="function") showToast(state.streamOn ? "流式输出：开" : "流式输出：关");
      render();
    };
    streamToggle.onclick = flipStream;
    streamToggle.ontouchend = (e)=>{ e.preventDefault(); flipStream(e); };
  }

  // 飞行棋：功能页版本切换 / 保存 / 去聊天玩
  document.querySelectorAll("[data-fc-version]").forEach(btn=>{
    btn.onclick = ()=>{ flightChessSetVersion(btn.getAttribute("data-fc-version")); };
  });
  const fcSave = document.getElementById("fc-save");
  if(fcSave) fcSave.onclick = ()=>{ persist("flightChess"); if(typeof showToast==="function") showToast("飞行棋进度已保存"); };
  const fcPlay = document.getElementById("fc-play");
  if(fcPlay) fcPlay.onclick = ()=>{ window.flightChessOpen(); };
  // 真心话大冒险：模式 / 洗牌 / 抽卡 / 关闭 / 带回聊天
  document.querySelectorAll("[data-td-mode]").forEach(b=>{
    b.onclick = ()=>{ truthDareSetMode(b.getAttribute("data-td-mode")); };
  });
  const tdShuffle = document.querySelector("[data-td-shuffle]");
  if(tdShuffle) tdShuffle.onclick = ()=>{ truthDareShuffle(); };
  const tdDraw = document.querySelector("[data-td-draw]");
  if(tdDraw) tdDraw.onclick = ()=>{ truthDareDraw(); };
  const tdAiDraw = document.querySelector("[data-td-ai-draw]");
  if(tdAiDraw) tdAiDraw.onclick = ()=>{ truthDareAiDraw(); };
  const tdClose = document.querySelector("[data-td-close]");
  if(tdClose) tdClose.onclick = ()=>{ truthDareClosePopup(); };
  const tdBackdrop = document.querySelector("[data-td-backdrop]");
  if(tdBackdrop) tdBackdrop.onclick = (e)=>{ if(e.target===tdBackdrop) truthDareClosePopup(); };
  const tdMin = document.querySelector("[data-td-min]");
  if(tdMin) tdMin.onclick = ()=>{ state.truthDareMin=true; render(); };
  const tdFloatBtn = document.querySelector("[data-td-float]");
  if(tdFloatBtn){
    makeFloatDraggable(tdFloatBtn, "truthDareFloatPos");
    tdFloatBtn.onclick = ()=>{ if(tdFloatBtn.dataset.dragged){ delete tdFloatBtn.dataset.dragged; return; } state.truthDareMin=false; render(); };
  }
  const tdDrawnClose = document.querySelector("[data-td-drawnclose]");
  if(tdDrawnClose) tdDrawnClose.onclick = ()=>{ state.truthDareDrawn=null; state.truthDareDrawnType=null; render(); };
  const tdDrawnWrap = document.querySelector("[data-td-drawnwrap]");
  if(tdDrawnWrap) tdDrawnWrap.onclick = (e)=>{ if(e.target===tdDrawnWrap){ state.truthDareDrawn=null; state.truthDareDrawnType=null; render(); } };
  const tdChat = document.querySelector("[data-td-chat]");
  if(tdChat) tdChat.onclick = ()=>{ window.truthDareOpen(); };

  // 飞行棋：聊天弹窗关闭 / 我投掷 / 到你了 / 格子事件
  const fcClose = document.querySelector("[data-fc-close]");
  if(fcClose) fcClose.onclick = ()=>{ state.flightChessOpen=false; state.flightChessMin=false; render(); };
  const fcBackdrop = document.querySelector("[data-fc-backdrop]");
  if(fcBackdrop) fcBackdrop.onclick = (e)=>{ if(e.target===fcBackdrop){ state.flightChessOpen=false; state.flightChessMin=false; render(); } };
  const fcSaveBtn = document.querySelector("[data-fc-save]");
  if(fcSaveBtn) fcSaveBtn.onclick = ()=>{ persist("flightChess"); if(typeof showToast==="function") showToast("飞行棋进度已保存"); };
  const fcMinBtn = document.querySelector("[data-fc-min]");
  if(fcMinBtn) fcMinBtn.onclick = ()=>{ state.flightChessMin=true; render(); };
  const fcFloatBtn = document.querySelector("[data-fc-float]");
  if(fcFloatBtn){
    makeFloatDraggable(fcFloatBtn, "flightChessFloatPos");
    fcFloatBtn.onclick = ()=>{ if(fcFloatBtn.dataset.dragged){ delete fcFloatBtn.dataset.dragged; return; } state.flightChessMin=false; render(); };
  }
  const fcRoll = document.querySelector("[data-fc-roll]");
  if(fcRoll) fcRoll.onclick = ()=>{ window.flightChessPlayerRoll(); };
  const fcAi = document.querySelector("[data-fc-ai]");
  if(fcAi) fcAi.onclick = ()=>{ window.flightChessAiRoll(); };
  const fcEventClose = document.querySelector("[data-fc-event-close]");
  if(fcEventClose) fcEventClose.onclick = ()=>{ state.flightChessEvent=null; render(); };
  const fcEventBackdrop = document.querySelector("[data-fc-event-backdrop]");
  if(fcEventBackdrop) fcEventBackdrop.onclick = (e)=>{ if(e.target===fcEventBackdrop){ state.flightChessEvent=null; render(); } };

  // 夫妻义务记录
  const dutyRemind = document.getElementById("duty-remind-toggle");
  if(dutyRemind) dutyRemind.onclick = ()=>{
    state.dutyRemindOn = !state.dutyRemindOn;
    persist("dutyRemindOn");
    render();
  };
  const dutyPrev = document.getElementById("duty-prev");
  if(dutyPrev) dutyPrev.onclick = ()=>{
    if(state.dutyMonth===0){ state.dutyMonth=11; state.dutyYear--; }
    else state.dutyMonth--;
    state.dutySelected=null; render();
  };
  const dutyNext = document.getElementById("duty-next");
  if(dutyNext) dutyNext.onclick = ()=>{
    if(state.dutyMonth===11){ state.dutyMonth=0; state.dutyYear++; }
    else state.dutyMonth++;
    state.dutySelected=null; render();
  };
  document.querySelectorAll("[data-duty-day]").forEach(btn=>{
    btn.onclick = ()=>{
      const k = btn.dataset.dutyDay;
      state.dutySelected = k;
      const rec = (state.dutyRecords||{})[k] || {};
      state.dutyDraft = { note: rec.note||"", mood: rec.mood||"" };
      render();
    };
  });
  const dutyQuick = document.getElementById("duty-quick-today");
  if(dutyQuick) dutyQuick.onclick = ()=>{
    const k = dutyDateKey(new Date());
    state.dutyYear = new Date().getFullYear();
    state.dutyMonth = new Date().getMonth();
    state.dutySelected = k;
    const rec = (state.dutyRecords||{})[k] || {};
    state.dutyDraft = { note: rec.note||"", mood: rec.mood||"" };
    render();
  };
  const dutyMask = document.getElementById("duty-modal-mask");
  if(dutyMask) dutyMask.onclick = ()=>{ state.dutySelected=null; render(); };
  const dutyClose = document.getElementById("duty-modal-close");
  if(dutyClose) dutyClose.onclick = ()=>{ state.dutySelected=null; render(); };
  const dutyMood = document.getElementById("duty-mood");
  if(dutyMood) dutyMood.oninput = ()=>{ state.dutyDraft = state.dutyDraft||{}; state.dutyDraft.mood = dutyMood.value; };
  const dutyNote = document.getElementById("duty-note");
  if(dutyNote) dutyNote.oninput = ()=>{ state.dutyDraft = state.dutyDraft||{}; state.dutyDraft.note = dutyNote.value; };
  const dutySave = document.getElementById("duty-save-done");
  if(dutySave) dutySave.onclick = ()=>{
    const k = state.dutySelected;
    if(!k) return;
    const note = document.getElementById("duty-note")?.value ?? "";
    const mood = document.getElementById("duty-mood")?.value ?? "";
    state.dutyRecords = state.dutyRecords || {};
    state.dutyRecords[k] = {
      done: true,
      note: note.trim(),
      mood: mood.trim(),
      time: new Date().toISOString(),
    };
    persist("dutyRecords");
    state.dutySelected = null;
    render();
  };
  const dutyClear = document.getElementById("duty-clear");
  if(dutyClear) dutyClear.onclick = ()=>{
    const k = state.dutySelected;
    if(!k) return;
    if(state.dutyRecords) delete state.dutyRecords[k];
    persist("dutyRecords");
    state.dutySelected = null;
    render();
  };

  // 衣柜
  const wardFeed = document.getElementById("ward-feed-toggle");
  if(wardFeed) wardFeed.onclick = ()=>{
    state.wardrobeFeedChat = !state.wardrobeFeedChat;
    persist("wardrobeFeedChat");
    render();
  };
  document.querySelectorAll("[data-ward-tab]").forEach(btn=>{
    btn.onclick = ()=>{ state.wardrobeTab = btn.dataset.wardTab; state.wardrobeAdding=false; render(); };
  });
  document.querySelectorAll("[data-ward-cat]").forEach(btn=>{
    btn.onclick = ()=>{
      state.wardrobeCatFilter = btn.dataset.wardCat;
      state.wardrobeNewCat = btn.dataset.wardCat;
      state.wardrobeAdding = false;
      render();
    };
  });
  document.querySelectorAll("[data-outfit-pick]").forEach(btn=>{
    btn.onclick = ()=>{
      ensureOutfitShape();
      const field = btn.dataset.outfitPick;
      const id = +btn.dataset.id;
      const cur = state.todayOutfit[field];
      state.todayOutfit[field] = (cur === id) ? null : id;
      persist("todayOutfit"); if(typeof postAppEvent==="function"){ try{ const o=state.todayOutfit||{}; const names=[]; ["top","bottom","shoes","underwear"].forEach(k=>{ const it=(state.wardrobeItems||[]).find(x=>x.id===o[k]); if(it) names.push(it.name); }); postAppEvent("wardrobe_change", { clothes: names.join("·")||"今日穿搭", outfit: o }); }catch(e){} }
      render();
    };
  });
  document.querySelectorAll("[data-outfit-clear]").forEach(btn=>{
    btn.onclick = ()=>{
      ensureOutfitShape();
      state.todayOutfit[btn.dataset.outfitClear] = null;
      persist("todayOutfit"); if(typeof postAppEvent==="function"){ try{ const o=state.todayOutfit||{}; const names=[]; ["top","bottom","shoes","underwear"].forEach(k=>{ const it=(state.wardrobeItems||[]).find(x=>x.id===o[k]); if(it) names.push(it.name); }); postAppEvent("wardrobe_change", { clothes: names.join("·")||"今日穿搭", outfit: o }); }catch(e){} }
      render();
    };
  });
  document.querySelectorAll("[data-outfit-acc]").forEach(btn=>{
    btn.onclick = ()=>{
      ensureOutfitShape();
      const id = +btn.dataset.outfitAcc;
      let acc = state.todayOutfit.accessories || [];
      if(acc.includes(id)) acc = acc.filter(x=>x!==id);
      else {
        if(acc.length >= 3){ alert("配饰最多选 3 件"); return; }
        acc = [...acc, id];
      }
      state.todayOutfit.accessories = acc;
      persist("todayOutfit"); if(typeof postAppEvent==="function"){ try{ const o=state.todayOutfit||{}; const names=[]; ["top","bottom","shoes","underwear"].forEach(k=>{ const it=(state.wardrobeItems||[]).find(x=>x.id===o[k]); if(it) names.push(it.name); }); postAppEvent("wardrobe_change", { clothes: names.join("·")||"今日穿搭", outfit: o }); }catch(e){} }
      render();
    };
  });
  const wardAddToggle = document.getElementById("ward-add-toggle");
  if(wardAddToggle) wardAddToggle.onclick = ()=>{
    state.wardrobeAdding = !state.wardrobeAdding;
    state.wardrobeNewName = "";
    state.wardrobeNewDesc = "";
    state.wardrobeNewCat = state.wardrobeCatFilter || "top";
    render();
  };
  const wardCancel = document.getElementById("ward-cancel-item");
  if(wardCancel) wardCancel.onclick = ()=>{ state.wardrobeAdding=false; render(); };
  const wardNameInp = document.getElementById("ward-new-name");
  if(wardNameInp) wardNameInp.oninput = ()=>{ state.wardrobeNewName = wardNameInp.value; };
  const wardDescInp = document.getElementById("ward-new-desc");
  if(wardDescInp) wardDescInp.oninput = ()=>{ state.wardrobeNewDesc = wardDescInp.value; };
  const wardSave = document.getElementById("ward-save-item");
  if(wardSave) wardSave.onclick = ()=>{
    const name = (document.getElementById("ward-new-name")?.value || state.wardrobeNewName || "").trim();
    const desc = (document.getElementById("ward-new-desc")?.value || state.wardrobeNewDesc || "").trim();
    if(!name){ alert("请填写名称（首页显示用）"); return; }
    const cat = state.wardrobeCatFilter || state.wardrobeNewCat || "top";
    state.wardrobeItems = [...(state.wardrobeItems||[]), { id: Date.now(), name, desc, category: cat }];
    state.wardrobeAdding = false;
    state.wardrobeNewName = "";
    state.wardrobeNewDesc = "";
    persist("wardrobeItems");
    render();
  };
  document.querySelectorAll("[data-ward-del]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = +btn.dataset.wardDel;
      state.wardrobeItems = (state.wardrobeItems||[]).filter(x=>x.id!==id);
      ensureOutfitShape();
      const o = state.todayOutfit;
      ["top","bottom","shoes","underwear"].forEach(k=>{ if(o[k]===id) o[k]=null; });
      o.accessories = (o.accessories||[]).filter(x=>x!==id);
      persist("wardrobeItems");
      persist("todayOutfit"); if(typeof postAppEvent==="function"){ try{ const o=state.todayOutfit||{}; const names=[]; ["top","bottom","shoes","underwear"].forEach(k=>{ const it=(state.wardrobeItems||[]).find(x=>x.id===o[k]); if(it) names.push(it.name); }); postAppEvent("wardrobe_change", { clothes: names.join("·")||"今日穿搭", outfit: o }); }catch(e){} }
      render();
    };
  });

  const dreamOn = document.getElementById("dream-on-toggle");
  if(dreamOn) dreamOn.onclick = ()=>{
    state.dreamConfig = state.dreamConfig || {};
    state.dreamConfig.enabled = state.dreamConfig.enabled === false ? true : false;
    persist("dreamConfig");
    render();
  };
  const dreamForce = document.getElementById("dream-force");
  if(dreamForce) dreamForce.onclick = async ()=>{
    dreamForce.disabled = true; dreamForce.textContent = "入梦中…";
    try{
      const r = await dreamRunOnce(true);
      if(r.dreamed) alert("梦成：【"+(r.title||"")+"】\n"+String(r.trace||"").slice(0,80));
      else alert("未成梦："+(r.reason||"")+(r.error?(" "+r.error):""));
    }catch(e){ alert("失败："+e.message); }
    dreamForce.disabled = false; dreamForce.textContent = "现在试做一场梦（忽略窗口/概率）";
    render();
  };

  // ntfy 上推
  const ntfyEn = document.getElementById("ntfy-enabled-toggle");
  if(ntfyEn) ntfyEn.onclick = ()=>{
    const c = ntfyEnsure();
    c.enabled = !c.enabled;
    persist("ntfyConfig");
    render();
  };
  const ntfyAp = document.getElementById("ntfy-auto-proactive");
  if(ntfyAp) ntfyAp.onclick = ()=>{
    const c = ntfyEnsure();
    c.autoProactive = c.autoProactive === false ? true : false;
    persist("ntfyConfig");
    render();
  };
  const ntfyAh = document.getElementById("ntfy-auto-hidden");
  if(ntfyAh) ntfyAh.onclick = ()=>{
    const c = ntfyEnsure();
    c.autoWhenHidden = c.autoWhenHidden === false ? true : false;
    persist("ntfyConfig");
    render();
  };
  const ntfyUrl = document.getElementById("ntfy-url");
  if(ntfyUrl) ntfyUrl.onchange = ()=>{
    const c = ntfyEnsure();
    c.topicUrl = ntfyUrl.value.trim();
    persist("ntfyConfig");
  };
  const ntfyTok = document.getElementById("ntfy-token");
  if(ntfyTok) ntfyTok.onchange = ()=>{
    const c = ntfyEnsure();
    c.token = ntfyTok.value.trim();
    persist("ntfyConfig");
  };
  document.querySelectorAll("[data-ntfy-pri]").forEach(btn=>{
    btn.onclick = ()=>{
      const c = ntfyEnsure();
      c.defaultPriority = btn.dataset.ntfyPri || "default";
      persist("ntfyConfig");
      render();
    };
  });
  const ntfyTest = document.getElementById("ntfy-test");
  if(ntfyTest) ntfyTest.onclick = async ()=>{
    ntfyTest.disabled = true; ntfyTest.textContent = "发送中…";
    try{
      // 同步输入框未 blur 的值
      const c = ntfyEnsure();
      if(ntfyUrl) c.topicUrl = ntfyUrl.value.trim();
      if(ntfyTok) c.token = ntfyTok.value.trim();
      c.enabled = true;
      persist("ntfyConfig");
      await ntfySend("测试推送", "来自 baileys · 如果你手机收到了就 OK 啦", { from:"test" });
      alert("已发送，去手机 ntfy 看看");
    }catch(e){ alert("失败："+e.message); }
    ntfyTest.disabled = false; ntfyTest.textContent = "发一条测试推送";
    render();
  };
  const ntfyMan = document.getElementById("ntfy-manual");
  if(ntfyMan) ntfyMan.onclick = async ()=>{
    const title = prompt("标题", "来自 TA") || "";
    const body = prompt("正文", "") || "";
    if(!body.trim()) return;
    try{
      const c = ntfyEnsure();
      if(ntfyUrl) c.topicUrl = ntfyUrl.value.trim();
      if(ntfyTok) c.token = ntfyTok.value.trim();
      c.enabled = true;
      persist("ntfyConfig");
      await ntfySend(title || "来自 TA", body, { from:"manual" });
      alert("已发送");
    }catch(e){ alert("失败："+e.message); }
    render();
  };

  // 品牌形象
  document.querySelectorAll("[data-brand-splash]").forEach(btn=>{
    btn.onclick = ()=>{
      const b = brandingEnsure();
      b.splashId = btn.dataset.brandSplash;
      persist("branding");
      applyBrandingToDom();
      render();
    };
  });
  document.querySelectorAll("[data-brand-icon]").forEach(btn=>{
    btn.onclick = ()=>{
      const b = brandingEnsure();
      b.iconId = btn.dataset.brandIcon;
      persist("branding");
      applyBrandingToDom();
      render();
    };
  });
  const brandSave = document.getElementById("brand-save");
  if(brandSave) brandSave.onclick = ()=>{
    const b = brandingEnsure();
    b.appName = (document.getElementById("brand-app-name")?.value || "baileys").trim() || "baileys";
    const sp = brandingActiveSplash();
    if(sp){
      sp.title = "Jasmine"; // 固定署名
      sp.subtitle = (document.getElementById("brand-sp-sub")?.value || "").trim();
      sp.tag = (document.getElementById("brand-sp-tag")?.value || "").trim();
    }
    persist("branding");
    applyBrandingToDom();
    alert("已保存");
    render();
  };
  const readImg = (file, cb)=>{
    if(!file) return;
    const r = new FileReader();
    r.onload = ()=> cb(r.result);
    r.readAsDataURL(file);
  };
  const brandSpFile = document.getElementById("brand-sp-file");
  if(brandSpFile) brandSpFile.onchange = ()=>{
    const f = brandSpFile.files && brandSpFile.files[0];
    readImg(f, data=>{
      const sp = brandingActiveSplash();
      if(sp){ sp.image = data; persist("branding"); applyBrandingToDom(); render(); }
    });
  };
  const brandSpClear = document.getElementById("brand-sp-clear-img");
  if(brandSpClear) brandSpClear.onclick = ()=>{
    const sp = brandingActiveSplash();
    if(sp){ sp.image = ""; persist("branding"); applyBrandingToDom(); render(); }
  };
  const brandIcFile = document.getElementById("brand-icon-file");
  if(brandIcFile) brandIcFile.onchange = ()=>{
    const f = brandIcFile.files && brandIcFile.files[0];
    readImg(f, data=>{
      const ic = brandingActiveIcon();
      if(ic){ ic.image = data; persist("branding"); applyBrandingToDom(); render(); }
    });
  };
  const brandIcClear = document.getElementById("brand-icon-clear");
  if(brandIcClear) brandIcClear.onclick = ()=>{
    const ic = brandingActiveIcon();
    if(ic){ ic.image = ""; persist("branding"); applyBrandingToDom(); render(); }
  };
  const brandIcAdd = document.getElementById("brand-icon-add");
  if(brandIcAdd) brandIcAdd.onclick = ()=>{
    const b = brandingEnsure();
    const name = prompt("图标预设名称", "自定义"+(b.icons.length+1));
    if(!name) return;
    const id = "icon_"+Date.now();
    b.icons.push({ id, name, image:"" });
    b.iconId = id;
    persist("branding"); render();
  };
  const brandSpAdd = document.getElementById("brand-splash-add");
  if(brandSpAdd) brandSpAdd.onclick = ()=>{
    const b = brandingEnsure();
    const name = prompt("开屏预设名称", "自定义"+(b.splashes.length+1));
    if(!name) return;
    const id = "sp_"+Date.now();
    b.splashes.push({ id, name, title:b.appName||"baileys", subtitle:"欢迎回家", tag:"", image:"" });
    b.splashId = id;
    persist("branding"); render();
  };

  // 他的机
  document.querySelectorAll("[data-hp-tab]").forEach(btn=>{
    btn.onclick = ()=>{
      const t = btn.dataset.hpTab;
      if(t==="private" || t==="psearch" || t==="pnotes" || t==="palbum"){
        const h = hisPhoneEnsure();
        if(h.lockedPrivate && t==="private"){
          if(!confirm("打开隐私空间？内容可能包含敏感描述。")) return;
          h.lockedPrivate = false;
          persist("hisPhone");
        }
      }
      state.hisPhoneTab = t;
      render();
    };
  });
  const hpAutoGenToggle = document.getElementById("hp-autogen-toggle");
  if(hpAutoGenToggle) hpAutoGenToggle.onclick = ()=>{
    const h = hisPhoneEnsure();
    h.autoGen = h.autoGen === false ? true : false;
    persist("hisPhone");
    render();
  };
  const hpGen = document.getElementById("hp-gen-now");
  if(hpGen) hpGen.onclick = async ()=>{
    hpGen.disabled = true; hpGen.textContent = "生成中…";
    try{
      const r = await hisPhoneGenerateDaily(false);
      alert(r.skipped ? "今天已经生成过了，要换内容请点强制重新生成" : "已生成今日内容");
    }catch(e){ alert("失败："+e.message); }
    hpGen.disabled = false; hpGen.textContent = "现在生成今日内容";
    render();
  };
  const hpForce = document.getElementById("hp-gen-force");
  if(hpForce) hpForce.onclick = async ()=>{
    if(!confirm("覆盖今天的手机内容？")) return;
    hpForce.disabled = true; hpForce.textContent = "生成中…";
    try{
      await hisPhoneGenerateDaily(true);
      alert("已重新生成");
    }catch(e){ alert("失败："+e.message); }
    hpForce.disabled = false; hpForce.textContent = "强制重新生成";
    render();
  };

  // 屏幕时间
  const usageFeed = document.getElementById("usage-feed-toggle");
  if(usageFeed) usageFeed.onclick = ()=>{
    state.usageFeedChat = !state.usageFeedChat;
    persist("usageFeedChat");
    render();
  };
  const usageRefresh = document.getElementById("usage-refresh");
  if(usageRefresh) usageRefresh.onclick = async ()=>{
    await usageLoadToday(false);
    await usageLoadDays();
  };
  const cfgUsageBase = document.getElementById("cfg-usageBase");
  if(cfgUsageBase) cfgUsageBase.onchange = ()=>{
    state.usageConfig.baseUrl = cfgUsageBase.value.trim();
    persist("usageConfig");
  };
  const cfgUsageTok = document.getElementById("cfg-usageToken");
  if(cfgUsageTok) cfgUsageTok.onchange = ()=>{
    state.usageConfig.token = cfgUsageTok.value.trim();
    persist("usageConfig");
  };
  const cfgUsageRefresh = document.getElementById("cfg-usage-refresh");
  if(cfgUsageRefresh) cfgUsageRefresh.onclick = ()=> usageLoadToday(false);
  // 主动消息 API（VPS 页 · 打通渠道用）
  const cfgProBase = document.getElementById("cfg-proactiveBase");
  if(cfgProBase) cfgProBase.onchange = ()=>{
    state.proactiveConfig = state.proactiveConfig || {};
    state.proactiveConfig.baseUrl = cfgProBase.value.trim();
    persist("proactiveConfig");
  };
  const cfgProTok = document.getElementById("cfg-proactiveToken");
  if(cfgProTok) cfgProTok.onchange = ()=>{
    state.proactiveConfig = state.proactiveConfig || {};
    state.proactiveConfig.token = cfgProTok.value.trim();
    persist("proactiveConfig");
  };
  const proPull = document.getElementById("proactive-pull");
  if(proPull) proPull.onclick = ()=> proactivePullFromVps();
  const proToggle = document.getElementById("proactive-toggle");
  if(proToggle) proToggle.onclick = ()=>{
    state.proactiveConfig = state.proactiveConfig || {};
    state.proactiveConfig.enabled = !state.proactiveConfig.enabled;
    persist("proactiveConfig");
    render();
    if(typeof showToast === "function") showToast(state.proactiveConfig.enabled ? "主动消息已开启" : "主动消息已关闭");
  };

  // 进入屏幕时间页时自动拉一次
  if(state.subPage === "usage" && usageBase() && !state.usageLoading){
    if(!state._usageAutoLoaded){
      state._usageAutoLoaded = true;
      usageLoadToday(true).then(()=> usageLoadDays());
    }
  } else if(state.subPage !== "usage"){
    state._usageAutoLoaded = false;
  }

  // 吃苹果
  document.querySelectorAll("[data-ea-theme]").forEach(btn=>{
    btn.onclick = (ev)=>{
      if(ev){ ev.preventDefault(); ev.stopPropagation(); }
      const id = btn.getAttribute("data-ea-theme") || btn.dataset.eaTheme;
      if(!id) return;
      const e = eatAppleEnsure();
      if(e.themeId === id && e.phase === "pick") return;
      e.themeId = id;
      e.phase = "pick";
      e.menu = null;
      e.cart = [];
      e.loading = false;
      try{ persist("eatApple"); }catch(err){}
      render();
    };
  });
  const eaGen = document.getElementById("ea-gen");
  if(eaGen) eaGen.onclick = ()=> eatAppleGenMenu();
  document.querySelectorAll("[data-ea-item]").forEach(btn=>{
    btn.onclick = ()=> eatAppleToggleCart(+btn.dataset.eaItem);
  });
  const eaOrder = document.getElementById("ea-order");
  if(eaOrder) eaOrder.onclick = ()=> eatAppleStartProgress();
  const eaBackPick = document.getElementById("ea-back-pick");
  if(eaBackPick) eaBackPick.onclick = ()=> eatAppleReset(true);
  const eaStageNext = document.getElementById("ea-stage-next");
  if(eaStageNext) eaStageNext.onclick = ()=> eatAppleNextStage();
  const eaStageRetry = document.getElementById("ea-stage-retry");
  if(eaStageRetry) eaStageRetry.onclick = ()=> eatAppleRetryStage();
  document.querySelectorAll("[data-ea-star]").forEach(btn=>{
    btn.onclick = ()=>{ eatAppleEnsure().stars = +btn.dataset.eaStar; render(); };
  });
  const eaComment = document.getElementById("ea-comment");
  if(eaComment) eaComment.oninput = ()=>{ eatAppleEnsure().comment = eaComment.value; };
  const eaReviewSend = document.getElementById("ea-review-send");
  if(eaReviewSend) eaReviewSend.onclick = ()=> eatAppleSubmitReview();
  const eaAgain = document.getElementById("ea-again");
  if(eaAgain) eaAgain.onclick = ()=>{ eatAppleReset(false); eatAppleGenMenu(); };
  const eaHome = document.getElementById("ea-home");
  if(eaHome) eaHome.onclick = ()=> eatAppleReset(true);





  // 按住说话 STT
  const holdBtn = document.getElementById("call-hold");
  if(holdBtn){
    const start = e=>{ e.preventDefault(); callHoldStart(); };
    const end = e=>{ e.preventDefault(); callHoldEnd(); };
    holdBtn.ontouchstart = start;
    holdBtn.ontouchend = end;
    holdBtn.ontouchcancel = end;
    holdBtn.onmousedown = start;
    holdBtn.onmouseup = end;
    holdBtn.onmouseleave = ()=>{ if(ensureCallSession().recording) callHoldEnd(); };
  }
  
  const callWsUrl = document.getElementById("call-ws-url");
  if(callWsUrl) callWsUrl.onchange = ()=>{ state.callConfig=state.callConfig||{}; state.callConfig.wsUrl=callWsUrl.value.trim(); persist("callConfig"); };
  const callHttpUrl = document.getElementById("call-http-url");
  if(callHttpUrl) callHttpUrl.onchange = ()=>{ state.callConfig=state.callConfig||{}; state.callConfig.httpUrl=callHttpUrl.value.trim(); persist("callConfig"); };
  const aicallEn = document.getElementById("aicall-enabled-toggle");
  if(aicallEn) aicallEn.onclick = ()=>{
    state.callConfig=state.callConfig||{};
    state.callConfig.aicallEnabled = state.callConfig.aicallEnabled === false ? true : false;
    persist("callConfig");
    if(state.callConfig.aicallEnabled === false) aicallDisconnect();
    else aicallConnect(true);
    render();
  };
  const aicallRe = document.getElementById("aicall-reconnect");
  if(aicallRe) aicallRe.onclick = ()=>{ aicallConnect(true); };
  if(state.subPage === "phone" && typeof aicallConnect === "function"){
    aicallConnect(false);
  }
const sttUrl = document.getElementById("call-stt-url");
  if(sttUrl) sttUrl.onchange = ()=>{ state.callConfig=state.callConfig||{}; state.callConfig.sttUrl=sttUrl.value.trim(); persist("callConfig"); };
  const sttTok = document.getElementById("call-stt-token");
  if(sttTok) sttTok.onchange = ()=>{ state.callConfig=state.callConfig||{}; state.callConfig.sttToken=sttTok.value.trim(); persist("callConfig"); };
  if(typeof callInvitePollStart === "function") callInvitePollStart();


  // MiniMax TTS 配置
  const callTtsToggle = document.getElementById("call-tts-toggle");
  if(callTtsToggle) callTtsToggle.onclick = ()=>{
    state.callConfig = state.callConfig || {};
    state.callConfig.ttsEnabled = state.callConfig.ttsEnabled === false ? true : false;
    persist("callConfig"); render();
  };
  const bindCallCfg = (id, field, isSelect)=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.onchange = ()=>{
      state.callConfig = state.callConfig || {};
      state.callConfig[field] = el.value.trim ? el.value.trim() : el.value;
      persist("callConfig");
    };
  };
  bindCallCfg("call-minimax-key", "minimaxKey");
  bindCallCfg("call-minimax-group", "minimaxGroupId");
  bindCallCfg("call-minimax-voice", "minimaxVoice");
  bindCallCfg("call-minimax-model", "minimaxModel");
  bindCallCfg("call-minimax-endpoint", "minimaxEndpoint");
  bindCallCfg("call-tts-proxy", "ttsProxy");
  const ttsTest = document.getElementById("call-tts-test");
  if(ttsTest) ttsTest.onclick = async ()=>{
    state.callConfig = state.callConfig || {};
    state.callConfig._ttsTestMsg = "合成中…";
    render();
    try{
      await callSpeak("喂，是我。听到了吗？我想你了。");
      state.callConfig._ttsTestMsg = "已播放（若没声音请看控制台 CORS / Key）";
    }catch(e){
      state.callConfig._ttsTestMsg = "失败："+e.message;
    }
    persist("callConfig"); render();
  };
  const cfgMk = document.getElementById("cfg-minimaxKey");
  if(cfgMk) cfgMk.onchange = ()=>{ state.callConfig=state.callConfig||{}; state.callConfig.minimaxKey=cfgMk.value.trim(); persist("callConfig"); };
  const cfgMg = document.getElementById("cfg-minimaxGroup");
  if(cfgMg) cfgMg.onchange = ()=>{ state.callConfig=state.callConfig||{}; state.callConfig.minimaxGroupId=cfgMg.value.trim(); persist("callConfig"); };
  const cfgTp = document.getElementById("cfg-ttsProxy");
  if(cfgTp) cfgTp.onchange = ()=>{ state.callConfig=state.callConfig||{}; state.callConfig.ttsProxy=cfgTp.value.trim(); persist("callConfig"); };


  // 碎星
  const sparkInp = document.getElementById("spark-inp");
  if(sparkInp){
    sparkInp.oninput = ()=>{ state.sparkDraft = sparkInp.value; };
    sparkInp.onkeydown = (e)=>{ if(e.key==="Enter"){ e.preventDefault(); if(typeof sparkSubmit==="function") sparkSubmit(); } };
  }
  const sparkNote = document.getElementById("spark-note");
  if(sparkNote) sparkNote.oninput = ()=>{ const c = typeof sparkDetailCard==="function" ? sparkDetailCard() : null; if(c){ c.note = sparkNote.value; sparkPersist(); } };
  const sparkRelid = document.getElementById("spark-relid");
  if(sparkRelid) sparkRelid.oninput = ()=>{ const c = typeof sparkDetailCard==="function" ? sparkDetailCard() : null; if(c){ c.relId = sparkRelid.value; sparkPersist(); } };
  const sparkAddTag = document.getElementById("spark-add-tag");
  if(sparkAddTag) sparkAddTag.onkeydown = (e)=>{
    if(e.key==="Enter"){
      e.preventDefault();
      const v = sparkAddTag.value.trim();
      const c = typeof sparkDetailCard==="function" ? sparkDetailCard() : null;
      if(v && c){ c.tags = c.tags||[]; if(!c.tags.includes(v)) c.tags.push(v); sparkPersist(); render(); }
    }
  };

  // 电话
  const callStart = document.getElementById("call-start-out");
  if(callStart) callStart.onclick = ()=> callStartOutgoing();
  const callSim = document.getElementById("call-sim-in");
  if(callSim) callSim.onclick = ()=> callSimulateIncoming();
  const callDnd = document.getElementById("call-dnd-toggle");
  if(callDnd) callDnd.onclick = ()=>{
    state.callConfig = state.callConfig || {};
    state.callConfig.dnd = !state.callConfig.dnd;
    persist("callConfig"); render();
  };
  const callBase = document.getElementById("call-base");
  if(callBase) callBase.onchange = ()=>{ state.callConfig = state.callConfig||{}; state.callConfig.baseUrl = callBase.value.trim(); persist("callConfig"); };
  const callTok = document.getElementById("call-token");
  if(callTok) callTok.onchange = ()=>{ state.callConfig = state.callConfig||{}; state.callConfig.token = callTok.value.trim(); persist("callConfig"); };
  const callAcceptBtn = document.getElementById("call-accept");
  if(callAcceptBtn) callAcceptBtn.onclick = ()=> callAccept();
  const callDeclineBtn = document.getElementById("call-decline");
  if(callDeclineBtn) callDeclineBtn.onclick = ()=>{
    const extra = document.getElementById("call-decline-extra");
    if(extra) extra.style.display = extra.style.display==="none"||!extra.style.display ? "block" : "none";
    else callDecline("");
  };
  document.querySelectorAll("[data-call-decline-note]").forEach(btn=>{
    btn.onclick = ()=> callDecline(btn.dataset.callDeclineNote);
  });
  const callDecSend = document.getElementById("call-decline-send");
  if(callDecSend) callDecSend.onclick = ()=>{
    const v = document.getElementById("call-decline-input")?.value?.trim() || "";
    callDecline(v || "不方便接");
  };
  const callHang = document.getElementById("call-hang");
  if(callHang) callHang.onclick = ()=> callHangup();
  const callMute = document.getElementById("call-mute");
  if(callMute) callMute.onclick = ()=>{ const s=ensureCallSession(); s.muted=!s.muted; render(); };
  const callSend = document.getElementById("call-send");
  if(callSend) callSend.onclick = ()=> callSendUser();
  const callInput = document.getElementById("call-input");
  if(callInput){
    callInput.oninput = ()=>{ ensureCallSession().draft = callInput.value; };
    callInput.onkeydown = e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); callSendUser(); } };
  }
  // call timer tick
  if(state.callSession && state.callSession.phase==="active"){
    if(!window.__callTimer){
      window.__callTimer = setInterval(()=>{
        if(state.callSession && state.callSession.phase==="active" && state.subPage==="phone"){
          const el = document.getElementById("call-timer");
          if(el && state.callSession.startAt){
            el.textContent = callFormatDuration(Math.floor((Date.now()-state.callSession.startAt)/1000));
          }
        }
      }, 1000);
    }
  }
  // VPS page call config
  const cfgCallBase = document.getElementById("cfg-callBase");
  if(cfgCallBase) cfgCallBase.onchange = ()=>{ state.callConfig=state.callConfig||{}; state.callConfig.baseUrl=cfgCallBase.value.trim(); persist("callConfig"); };
  const cfgCallTok = document.getElementById("cfg-callToken");
  if(cfgCallTok) cfgCallTok.onchange = ()=>{ state.callConfig=state.callConfig||{}; state.callConfig.token=cfgCallTok.value.trim(); persist("callConfig"); };

  // ── VPS 一键填入（统一网关 9090）──────────────────────────────────
  const vpsQuickfill = document.getElementById("vps-quickfill");
  if(vpsQuickfill) vpsQuickfill.onclick = ()=>{
    const VPS_BASE = "http://115.29.237.172:9090";
    const VPS_MUSIC_TOKEN = "898a3f1256966ed013351feaadb3532892a67eec90d63bad603d906af7ada0de";
    const VPS_WAKE_TOKEN = "Vhr48f7FgU3mZ9XS";
    state.musicConfig      = { ...(state.musicConfig||{}),      baseUrl: VPS_BASE, token: VPS_MUSIC_TOKEN };
    state.usageConfig      = { ...(state.usageConfig||{}),      baseUrl: VPS_BASE, token: VPS_MUSIC_TOKEN };
    state.proactiveConfig  = { ...(state.proactiveConfig||{}),  baseUrl: VPS_BASE, token: VPS_WAKE_TOKEN };
    state.callConfig       = { ...(state.callConfig||{}),       baseUrl: VPS_BASE, token: VPS_WAKE_TOKEN, sttToken: VPS_WAKE_TOKEN };
    ["musicConfig","usageConfig","proactiveConfig","callConfig"].forEach(k=>{ if(typeof persist==="function") persist(k); });
    render();
  };


  // 解谜房间
  document.querySelectorAll("[data-puzzle-start]").forEach(btn=>{
    btn.onclick = ()=>{
      if(btn.disabled) return;
      puzzleStart(btn.dataset.puzzleStart);
    };
  });
  document.querySelectorAll("[data-puzzle-choice]").forEach(btn=>{
    btn.onclick = ()=> puzzleChoose(+btn.dataset.puzzleChoice);
  });
  const puzzleSubmit = document.getElementById("puzzle-submit");
  if(puzzleSubmit) puzzleSubmit.onclick = ()=> puzzleSubmitAnswer();
  const puzzleAns = document.getElementById("puzzle-answer");
  if(puzzleAns){
    puzzleAns.oninput = ()=>{ ensurePuzzleProgress().answerDraft = puzzleAns.value; };
    puzzleAns.onkeydown = e=>{ if(e.key==="Enter"){ e.preventDefault(); puzzleSubmitAnswer(); } };
  }
  const puzzleAbandonBtn = document.getElementById("puzzle-abandon");
  if(puzzleAbandonBtn) puzzleAbandonBtn.onclick = ()=> puzzleAbandon();
  const puzzleBackSel = document.getElementById("puzzle-back-select");
  if(puzzleBackSel) puzzleBackSel.onclick = ()=> puzzleContinueNext();




  // 柜子
  const cabFeed = document.getElementById("cab-feed-toggle");
  if(cabFeed) cabFeed.onclick = (e)=>{
    e.preventDefault(); e.stopPropagation();
    state.cabinetFeedChat = state.cabinetFeedChat === true ? false : true;
    persist("cabinetFeedChat");
    try{ LS.set("cabinetFeedChat", state.cabinetFeedChat); }catch(err){}
    render();
  };
  document.querySelectorAll("[data-cab-open]").forEach(btn=>{
    btn.onclick = (e)=>{
      if(e.target && e.target.closest && e.target.closest("[data-cab-del]")) return;
      state.cabinetOpenId = btn.dataset.cabOpen;
      state.cabinetItemDraft = { name:"", note:"" };
      render();
    };
  });
  document.querySelectorAll("[data-cab-del]").forEach(el=>{
    el.onclick = (e)=>{
      e.stopPropagation();
      const id = el.dataset.cabDel;
      if(!confirm("删除这个柜子？")) return;
      state.cabinets = ensureCabinets().filter(c=>c.id!==id);
      if(state.cabinetOpenId===id) state.cabinetOpenId=null;
      persist("cabinets"); render();
    };
  });
  const cabMask = document.getElementById("cab-modal-mask");
  if(cabMask) cabMask.onclick = (e)=>{ if(e.target===cabMask){ state.cabinetOpenId=null; render(); } };
  const cabClose = document.getElementById("cab-modal-close");
  if(cabClose) cabClose.onclick = ()=>{ state.cabinetOpenId=null; render(); };
  const cabPrev = document.getElementById("cab-prev");
  const cabNext = document.getElementById("cab-next");
  const switchCab = (dir)=>{
    const cabs = ensureCabinets();
    if(!cabs.length) return;
    let idx = cabs.findIndex(c=>c.id===state.cabinetOpenId);
    if(idx<0) idx=0;
    idx = (idx + dir + cabs.length) % cabs.length;
    state.cabinetOpenId = cabs[idx].id;
    state.cabinetItemDraft = { name:"", note:"" };
    render();
  };
  if(cabPrev) cabPrev.onclick = ()=> switchCab(-1);
  if(cabNext) cabNext.onclick = ()=> switchCab(1);
  const cabPanel = document.getElementById("cab-modal-panel");
  if(cabPanel && !cabPanel._swipeBound){
    cabPanel._swipeBound = true;
    let sx=0, dx=0;
    cabPanel.addEventListener("touchstart", e=>{ sx=e.touches[0].clientX; dx=0; }, {passive:true});
    cabPanel.addEventListener("touchmove", e=>{ dx=e.touches[0].clientX-sx; }, {passive:true});
    cabPanel.addEventListener("touchend", ()=>{
      if(dx < -40) switchCab(1);
      else if(dx > 40) switchCab(-1);
    });
  }
  document.querySelectorAll("[data-cab-item-del]").forEach(btn=>{
    btn.onclick = ()=>{
      const open = cabinetById(state.cabinetOpenId);
      if(!open) return;
      open.items = (open.items||[]).filter(it=>String(it.id)!==String(btn.dataset.cabItemDel));
      persist("cabinets"); render();
    };
  });
  const cabItemSave = document.getElementById("cab-item-save");
  if(cabItemSave) cabItemSave.onclick = ()=>{
    const open = cabinetById(state.cabinetOpenId);
    if(!open) return;
    const name = (document.getElementById("cab-item-name")?.value||"").trim();
    const note = (document.getElementById("cab-item-note")?.value||"").trim();
    if(!name){ alert("请填写物品名称"); return; }
    open.items = open.items||[];
    open.items.push({ id: Date.now(), name, note, addedBy:"user", time: new Date().toISOString() });
    state.cabinetItemDraft = { name:"", note:"" };
    persist("cabinets"); render();
  };
  const cabNewSave = document.getElementById("cab-new-save");
  if(cabNewSave) cabNewSave.onclick = ()=>{
    const name = (document.getElementById("cab-new-name")?.value||state.cabinetNewName||"").trim();
    if(!name){ alert("请填写柜子名称"); return; }
    const list = ensureCabinets();
    const icons = ["archive","book","footprints","pill","broom","shirt","package","basket"];
    list.push({ id: "cab_"+Date.now(), name, icon: icons[list.length % icons.length], items: [] });
    state.cabinetNewName = "";
    persist("cabinets"); render();
  };
  const cabNewName = document.getElementById("cab-new-name");
  if(cabNewName) cabNewName.oninput = ()=>{ state.cabinetNewName = cabNewName.value; };
  const cabAi = document.getElementById("cab-ai-edit");
  if(cabAi) cabAi.onclick = ()=> cabinetAiEdit();
  const cabClear = document.getElementById("cab-clear-items");
  if(cabClear) cabClear.onclick = ()=>{
    const open = cabinetById(state.cabinetOpenId);
    if(!open) return;
    if(!confirm("清空本柜所有物品？")) return;
    open.items = [];
    persist("cabinets"); render();
  };

  // ─── 小纸条 / 机日记 / 信箱 ─────────────────────────
  document.querySelectorAll("[data-mc-fab]").forEach(btn=>{
    btn.onclick=(e)=>{ e.stopPropagation(); state.mcSheet = btn.dataset.mcFab; render(); };
  });
  const mcSheetCancel=document.getElementById("mc-sheet-cancel");
  if(mcSheetCancel) mcSheetCancel.onclick=()=>{ state.mcSheet=""; render(); };
  const mcSheetMask=document.getElementById("mc-sheet-mask");
  if(mcSheetMask) mcSheetMask.onclick=(e)=>{ if(e.target===mcSheetMask){ state.mcSheet=""; render(); } };
  const mcNoteInput=document.getElementById("mc-note-input");
  if(mcNoteInput) mcNoteInput.oninput=()=>{ state.mcNoteDraft=mcNoteInput.value; };
  const mcNoteSend=document.getElementById("mc-note-send");
  if(mcNoteSend) mcNoteSend.onclick=()=>{ mcSendNote(); };
  const mcLetterBody=document.getElementById("mc-letter-body");
  if(mcLetterBody) mcLetterBody.oninput=()=>{ state.mcLetterBody=mcLetterBody.value; };
  const mcLetterSched=document.getElementById("mc-letter-sched");
  if(mcLetterSched) mcLetterSched.onchange=()=>{ state.mcLetterSched=mcLetterSched.value; };
  const mcLetterSend=document.getElementById("mc-letter-send");
  if(mcLetterSend) mcLetterSend.onclick=()=>{ mcSendLetter(); };
  document.querySelectorAll("[data-mc-filter]").forEach(btn=>{
    btn.onclick=()=>{ state.mdiaryFilter=btn.dataset.mcFilter; render(); };
  });
  document.querySelectorAll("[data-mbox-tab]").forEach(btn=>{
    btn.onclick=()=>{ state.mboxTab=btn.dataset.mboxTab; render(); };
  });
  document.querySelectorAll("[data-mc-open]").forEach(el=>{
    el.onclick=(e)=>{ e.stopPropagation();
      const v = String(el.dataset.mcOpen||"");
      const i = v.indexOf(":");
      if(i>0) mcOpenDetail(v.slice(0,i), v.slice(i+1));
    };
  });
  const mcDetailMask=document.getElementById("mc-detail-mask");
  if(mcDetailMask) mcDetailMask.onclick=(e)=>{ if(e.target===mcDetailMask) mcCloseDetail(); };
  const mcDetailClose=document.getElementById("mc-detail-close");
  if(mcDetailClose) mcDetailClose.onclick=()=>{ mcCloseDetail(); };
  const mcAnnInput=document.getElementById("mc-ann-input");
  if(mcAnnInput) mcAnnInput.oninput=()=>{ state.mcAnnDraft=mcAnnInput.value; };
  const mcAnnSend=document.getElementById("mc-ann-send");
  if(mcAnnSend) mcAnnSend.onclick=()=>{ mcAddAnnotation(); };
  const mcDelBtn=document.getElementById("mc-detail-del");
  if(mcDelBtn) mcDelBtn.onclick=(e)=>{ e.stopPropagation();
    const v=String(mcDelBtn.dataset.mcDel||"");
    const i=v.indexOf(":");
    if(i>0) mcDelete(v.slice(0,i), v.slice(i+1));
  };


}
const _swipe = { startX:0, startY:0, dx:0, dragging:false, mouseBound:false };
function _swipeDoMove(curX, curY){
  const w = _swipe;
  w.dx = curX - w.startX;
  const dy = curY - w.startY;
  if(Math.abs(dy) > Math.abs(w.dx)) return false; // 竖向滚轮/滚动交给页面自己
  const wrap = document.getElementById("home-swipe");
  const track = document.getElementById("home-track");
  if(!wrap || !track) return false;
  // 三页：每页占 track 的 1/3，对应容器宽度 100% → track 位移 -n * 33.333%
  const pageW = wrap.offsetWidth || 1;
  const base = -state.homePage * (100/3);
  const pct = base + (w.dx / pageW) * (100/3);
  const clamped = Math.max(-200/3, Math.min(0, pct));
  track.style.transform=`translateX(${clamped}%)`;
  return true;
}
function _swipeCommit(){
  const w = _swipe;
  if(!w.dragging) return;
  w.dragging = false;
  const track = document.getElementById("home-track");
  if(!track) return;
  track.style.transition="";
  if(w.dx < -50) state.homePage = Math.min(2, state.homePage + 1);
  else if(w.dx > 50) state.homePage = Math.max(0, state.homePage - 1);
  track.classList.remove("page0","page1","page2");
  track.classList.add("page"+state.homePage);
  track.style.transform="";
  updateHomeDots();
}
function bindHomeSwipe(){
  const wrap=document.getElementById("home-swipe");
  if(!wrap) return;
  // 每次 render 都会调 bindEvents；触摸监听只绑一次，避免叠多层导致点击失灵
  if(wrap.dataset.swipeBound==="1") return;
  wrap.dataset.swipeBound="1";
  const w = _swipe;
  const startDrag = (cx, cy)=>{
    w.startX=cx; w.startY=cy; w.dx=0; w.dragging=true;
    const track=document.getElementById("home-track");
    if(track) track.style.transition="none";
  };

  wrap.addEventListener("touchstart", e=>{
    // 点在可点控件上时不启动横滑，避免吞掉按钮点击
    const t = e.target;
    if(t && t.closest && t.closest("button, a, input, textarea, select, [data-sub], label")) return;
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive:true});

  wrap.addEventListener("touchmove", e=>{
    if(!w.dragging) return;
    _swipeDoMove(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive:true});

  wrap.addEventListener("touchend", _swipeCommit, {passive:true});

  wrap.addEventListener("mousedown", e=>{
    if(e.button !== 0) return;
    const t = e.target;
    if(t && t.closest && t.closest("button, a, input, textarea, select, [data-sub], label")) return;
    startDrag(e.clientX, e.clientY);
  });
  if(!w.mouseBound){
    w.mouseBound = true;
    window.addEventListener("mousemove", e=>{
      if(!_swipe.dragging) return;
      if(_swipeDoMove(e.clientX, e.clientY)) e.preventDefault();
    }, {passive:false});
    window.addEventListener("mouseup", _swipeCommit);
  }
}

// ─── 聊天逻辑 ────────────────────────────────────────────────────────────────
/** 多模态：把选中的图片压缩成 dataURL 加进待发附件 */
async function addChatImageFiles(files){
  const arr = Array.from(files||[]).slice(0,4);
  let added = 0;
  for(const f of arr){
    try{
      const dataUrl = await compressImage(f, 1280, 1280, 0.75);
      state.chatAttachments = state.chatAttachments || [];
      state.chatAttachments.push({ type:"image", name:f.name||"图片", mime:f.type||"image/jpeg", dataUrl });
      added++;
    }catch(e){ showToast("图片读取失败："+e.message); }
  }
  if(added) render();
}
/** 多模态：把文本类文件读成文本加进待发附件（内容 ≤20KB） */
function addChatTextFiles(files){
  const arr = Array.from(files||[]).slice(0,4);
  const TEXT_EXT = /\.(txt|md|markdown|json|js|mjs|ts|py|c|cpp|h|hpp|java|go|rs|html|htm|css|xml|yaml|yml|csv|log|ini|conf|sh|sql|toml)$/i;
  let added = 0;
  arr.forEach(f=>{
    if(!TEXT_EXT.test(f.name||"")){ showToast(`「${f.name||"文件"}」不是文本类文件，暂不支持`); return; }
    const reader = new FileReader();
    reader.onload = ()=>{
      state.chatAttachments = state.chatAttachments || [];
      state.chatAttachments.push({ type:"file", name:f.name, mime:f.type||"text/plain", text:String(reader.result||"").slice(0, 20000) });
      render();
    };
    reader.onerror = ()=>{ showToast("文件读取失败："+f.name); };
    reader.readAsText(f);
  });
}
function sendUserMsg(){
  state.chatMoreOpen=false;
  let text=state.chatInput.trim();
  if(typeof memRemoteWarmup==="function") memRemoteWarmup(text); // 预热云端记忆检索（异步，不阻塞）
  const atts=state.chatAttachments||[];
  text = handleProfileCommand(text, "me"); // 主页资料卡：改签名/简介/背景（识别并擦除）
  // 小浏览器：用户要上网 / 登 X / 贴了链接 → 直接弹层（不等 AI 写暗号）
  try{
    if(text && typeof pocketShowUrl==="function" && pocketNative()){
      const urlIn = (text.match(/https?:\/\/[^\s⟧】）\]」』]+/)||[])[0];
      if(urlIn){
        pocketShowUrl(urlIn);
      } else if(/登\S*推特|登录\S*X|登\S*X|上推特|推特\S*登录|打开\S*X/.test(text)){
        pocketShowUrl("https://x.com/i/flow/login");
      } else if(/打开浏览器|打开小浏览器|上网看看|查(一下)?百科/.test(text)){
        pocketShowUrl("https://www.bing.com");
      }
    }
  }catch(e){}
  // 飞行棋：用户说「到你了/轮到你」且轮到机 → 前端直接让机掷骰（弹窗没开就先开）
  try{
    if(text && state.flightChess && state.flightChess.turn==="ai" && !state.flightChess.finished
      && /到你了|轮到你|该你了|你掷|掷骰/.test(text)){
      if(!state.flightChessOpen && typeof window.flightChessOpen==="function") window.flightChessOpen();
      if(typeof window.flightChessAiRoll==="function") window.flightChessAiRoll();
    }
  }catch(e){}
  if(!text && !atts.length){ state.chatInput=""; saveActiveThread(); render(); return; } // 纯指令：不发消息
  state.chatInput="";
  const now=new Date().toISOString();
  if(atts.length){
    // 多模态：图片逐张成消息（第一条带文字）；文件文本拼进 content
    const imgMsgs = atts.filter(a=>a.type==="image").map((a,i)=>({
      role:"user", content:(i===0?text:""), image:a.dataUrl, imageMime:a.mime||"image/jpeg", time:now,
    }));
    if(!imgMsgs.length && text) imgMsgs.push({ role:"user", content:text, time:now });
    const fileText = atts.filter(a=>a.type==="file").map(a=>`[文件: ${a.name}]\n${a.text||""}`).join("\n\n");
    if(fileText){
      if(imgMsgs.length) imgMsgs[0].content = (imgMsgs[0].content?imgMsgs[0].content+"\n\n":"") + fileText;
      else imgMsgs.push({ role:"user", content:(text?text+"\n\n":"") + fileText, time:now });
    }
    state.pendingUser.push(...imgMsgs);
    state.chatAttachments=[];
  } else {
    state.pendingUser.push({ role:"user", content:text, time:new Date().toISOString() });
  }
  const effText = text || (atts[0]&&atts[0].type==="file"?(atts[0].text||"").slice(0,80):"");
  // 偷听：把用户消息悄悄喂给宝宝（如开关开着）
  if(effText) babyOverhearChat(effText, "user");
  if(typeof nudgeBodyFromUserText === "function" && effText) nudgeBodyFromUserText(effText);
  saveActiveThread();
  state.needChatScroll = true; // 发消息后贴底，像微信
  if(typeof postAppEvent === "function") postAppEvent("chat_message", { text: (text||"🖼️ 图片").slice(0,120) });
  // 收起键盘，避免 WebView 键盘把输入栏顶出可视区
  if(document.activeElement && typeof document.activeElement.blur === "function") document.activeElement.blur();
  render();
}

// ─── 安卓后台生成（@capacitor/background-runner + @capacitor/kv）────────────
function bgGenCap(){
  const Cap = window.Capacitor;
  if(!Cap || typeof Cap.isNativePlatform !== "function" || !Cap.isNativePlatform()) return null;
  const plug = Cap.Plugins || {};
  // 插件实际注册名是 CapacitorBackgroundRunner（@capacitor/background-runner），不是 BackgroundRunner；
  // KV 只在 runner 内部上下文有，App 端没有独立 KV 插件，故 KV 可为 null。
  const BR = plug.CapacitorBackgroundRunner || plug.BackgroundRunner;
  const KV = plug.KV || null;
  if(!BR) return null;
  return { BR, KV };
}
/** 把待回复消息 + 上下文写入 KV 并触发 runner（App 切后台后由独立引擎继续生成） */
async function bgGenSubmit(){
  try{
    if(!state.bgGen || state.bgGen === "off") return;
    if(!state.pendingUser || !state.pendingUser.length) return;
    if(state.chatLoading) return;
    const cap = bgGenCap();
    if(!cap) return;
    if(state.pendingUser.some(m=>m && m.image)) return; // 有图消息由主线程处理
    const target = state.chatTarget || "a1";
    const isGroup = target === "group";
    const ag = agentById(isGroup ? "a1" : target) || (state.agents||[])[0];
    if(!ag || !agentHasKey(ag)) return;
    const sys = buildSysForAgent(ag, isGroup ? "群聊模式：你与用户及其他人同群，请只以自己身份回复，简短自然。" : null);
    const history = msgsToApiFormat(state.messages, isGroup);
    const pending = state.pendingUser.map(m=>({ role:"user", content:`[时间: ${formatTimeFull(m.time)}] ${m.content}` }));
    const task = {
      messages: history.concat(pending),
      sys: sys || "",
      cfg: {
        channel: ag.channel,
        claudeKey: ag.claudeKey || "", openaiKey: ag.openaiKey || "",
        openaiBase: ag.openaiBase || "https://api.openai.com/v1", openaiModel: ag.openaiModel || "gpt-4o",
        geminiKey: ag.geminiKey || "", geminiModel: ag.geminiModel || "gemini-2.0-flash",
      },
      threadId: target,
      agentName: ag.name || "TA",
      notify: state.bgGen === "onNotify",
      // runner 需要 wakeBase/wakeToken 才能把结果 POST 回 VPS pull 队列，落回原线程
      wakeBase: (typeof wakeBase === "function" ? wakeBase() : "") || "",
      wakeToken: (typeof wakeToken === "function" ? wakeToken() : "") || "",
    };
    // KV 不是必需（App 端可能无 KV 插件），有则落盘兜底；任务始终随 dispatch details 传递
    if(cap.KV){ try{ await cap.KV.set({ key:"mpBgTask", value: JSON.stringify(task) }); }catch(e){} }
    // 立即触发一次：runner 是独立 JS 引擎，锁屏后仍会把调用跑完
    cap.BR.dispatchEvent({ label:"mp.bgchat", event:"bgchat", details: { task } }).catch(()=>{});
  }catch(e){ console.warn("[bg] submit fail", e); }
}
/** 读取后台生成结果并落到原线程 */
async function bgGenPollResult(){
  try{
    const cap = bgGenCap();
    if(!cap || !cap.KV) return;
    const res = await cap.KV.get({ key:"mpBgResult" });
    if(res && res.value){
      await cap.KV.remove({ key:"mpBgResult" });
      const r = JSON.parse(res.value);
      if(r && r.reply && typeof proactivePushToChat === "function"){
        proactivePushToChat(r.reply, { from:"bg", threadId: r.threadId, bgPush:true });
        if(state.tab==="chat") render();
      }
    }
  }catch(e){ console.warn("[bg] poll fail", e); }
}

function buildSysForAgent(ag, extraGroupHint){
  // 每位 AI 使用自己的思考引导
  let sys = systemPrompt(ag || null);
  if(ag && ag.name){
    const nm = ag.name;
    sys = `你是 Aries（若角色显示名是「${nm}」可作称呼）。与你对话的是 Jasmine。请以 Aries 的身份自然对话。\n\n` + (sys||"");
  } else {
    sys = `你是 Aries。与你对话的是 Jasmine。\n\n` + (sys||"");
  }
  if(extraGroupHint) sys = (sys||"") + "\n\n" + extraGroupHint;
  if(state.memories.length>0){
    const recentUserMsgs = state.messages.filter(m=>m.role==="user").slice(-3).map(m=>m.content).join(" ");
    const relevant = retrieveRelevantMemories(recentUserMsgs, 5);
    if(relevant.length){
      const memStr = relevant.map(m=>`[${m.layer}] ${m.content}`).join("\n");
      sys=(sys?sys+"\n\n":"")+`以下是与当前对话最相关的记忆：\n${memStr}`;
    }
  }
  return sys;
}

// ─── 缓存优化：拆静态/动态 system（主聊天用）─────────────────────────────────
// 静态（人设/规则）→ 缓存前缀；检索记忆 → 动态（每轮变，绝不能进缓存前缀）
function buildCachedSys(ag){
  const parts = systemPromptParts(ag || null);
  let staticS = parts.static || "";
  let dynS = parts.dynamic || "";
  if(ag && ag.name) staticS = `你是 Aries（显示名可作「${ag.name}」）。与你对话的是 Jasmine。请以 Aries 的身份自然对话。\n\n` + staticS;
  else staticS = `你是 Aries。与你对话的是 Jasmine。\n\n` + staticS;
  if(state.memories.length>0){
    try{
      const recentUserMsgs = state.messages.filter(m=>m.role==="user").slice(-3).map(m=>m.content).join(" ");
      const relevant = retrieveRelevantMemories(recentUserMsgs, 5);
      if(relevant.length){
        const memStr = relevant.map(m=>`[${m.layer}] ${m.content}`).join("\n");
        dynS = (dynS? dynS+"\n\n" : "") + `以下是与当前对话最相关的记忆：\n${memStr}`;
      }
    }catch(e){}
  }
  return { static: staticS, dynamic: dynS };
}

function msgsToApiFormat(allMsgs, isGroup){
  const limit = state.contextLimit || 0;
  let list = allMsgs.filter(m=>m.role==="user"||m.role==="assistant");
  if(limit > 0) list = list.slice(-limit);
  return list.map(m=>{
    if(m.role==="user"){
      const out = { role:"user", content:`[时间: ${formatTimeFull(m.time)}] ${truthDareCardLabel(m)}${m.content}` };
      // 多模态：透传图片（图片不进文本前缀）
      if(m.image){ out.image = m.image; out.imageMime = m.imageMime || "image/jpeg"; }
      return out;
    }
    const prefix = (isGroup && m.speakerName) ? `【${m.speakerName}】` : "";
    return { role:"assistant", content: prefix + truthDareCardLabel(m) + m.content };
  });
}
/** 抽到的真心话/大冒险卡在发给 AI 的历史里加前缀，方便识别 */
function truthDareCardLabel(m){
  if(m && m.type==="truthdare") return `【${m.cardType==="dare"?"大冒险":"真心话"}卡】`;
  return "";
}

// ─── 缓存优化：锚定窗口（不滑动）+ 覆盖式压缩 + 主聊天请求拼装 ───────────────
const WINDOW_HARD_CAP = 120;   // 压缩故障保险丝
const COMPRESS_THRESHOLD = 60; // 未压缩消息超过阈值触发压缩
const COMPRESS_KEEP_TAIL = 30; // 压缩时保留最近 N 条不压

function getWindowedMessages(allMsgs, target){
  // 灵魂：窗口起点 = 压缩游标，而不是「滑动取最后 N 条」。
  // 起点只在压缩推进时移动一次，其余时间前缀纹丝不动 → 缓存前缀稳定。
  const thread = (state.chatThreads && state.chatThreads[target]) || {};
  const compressed = thread.compressed || null;
  const limit = state.contextLimit || 0;
  let list = allMsgs.filter(m=>m.role==="user"||m.role==="assistant");
  let summary = "";
  if(compressed && compressed.upToIndex > 0 && compressed.upToIndex <= list.length){
    summary = compressed.summary || "";
    list = list.slice(compressed.upToIndex);
  }
  if(list.length > WINDOW_HARD_CAP) list = list.slice(-WINDOW_HARD_CAP); // 保险丝
  if(limit > 0) list = list.slice(-limit); // 用户显式设置的上限仍优先
  return { messages: list, summary };
}

function buildMainChatRequest(ag){
  const target = state.chatTarget || "a1";
  const threadMsgs = (state.chatThreads && state.chatThreads[target] && state.chatThreads[target].messages) || [];
  const allMsgs = threadMsgs.length ? threadMsgs : (state.messages || []);
  const sys = buildCachedSys(ag);
  // 注：消息级断点会破坏扩展思考链，已去掉；只保留 system 缓存。
  const win = getWindowedMessages(allMsgs, target);
  const apiMsgs = win.messages.map(m=>{
    if(m.role==="user"){
      const out = { role:"user", content:`[时间: ${formatTimeFull(m.time)}] ${truthDareCardLabel(m)}${m.content}` };
      if(m.image){ out.image = m.image; out.imageMime = m.imageMime || "image/jpeg"; }
      return out;
    }
    return { role:"assistant", content: truthDareCardLabel(m) + m.content };
  });
  if(win.summary){
    sys.dynamic = (sys.dynamic? sys.dynamic+"\n\n" : "")
      + "【早前对话摘要（压缩前的逐字记录已不必再看）】\n" + win.summary;
  }
  return { apiMsgs, sys };
}

/** 压缩：覆盖式摘要 + 推进游标。仅无限窗口（contextLimit=0）需要，有限窗口本身有界。 */
async function compressThreadIfNeeded(){
  try{
    const target = state.chatTarget || "a1";
    if((state.contextLimit||0) > 0) return;
    const thread = state.chatThreads && state.chatThreads[target];
    if(!thread) return;
    const msgs = (thread.messages || []).filter(m=>m.role==="user"||m.role==="assistant");
    const compressedUp = (thread.compressed && thread.compressed.upToIndex) || 0;
    if(msgs.length - compressedUp < COMPRESS_THRESHOLD) return;
    const keepFrom = msgs.length - COMPRESS_KEEP_TAIL;
    const compressTo = Math.max(compressedUp, keepFrom);
    if(compressTo <= compressedUp) return;
    const oldChunk = msgs.slice(compressedUp, compressTo);
    const prevSummary = (thread.compressed && thread.compressed.summary) || "";
    const text = oldChunk.map(m=>`${m.role==="user"?"用户":"TA"}：${String(m.content||"").slice(0,300)}`).join("\n");
    const prompt = `把下面这段已发生的对话，覆盖式压缩成一段中文摘要：保留关键人物、事件、关系进展、承诺和伏笔，删掉寒暄。这是对「上一次摘要」的整体更新，不是追加——新摘要要包含旧摘要里依然重要的内容，且总长不超过 600 字。\n\n【上一次摘要】\n${prevSummary||"（无）"}\n\n【新对话】\n${text.slice(0,8000)}`;
    const ag = agentById(target) || (state.agents||[])[0];
    const summary = await callChatAPI(agentToApiConfig(ag), [{role:"user",content:prompt}], null);
    thread.compressed = { summary: (summary||"").slice(0,1200), upToIndex: compressTo, at: new Date().toISOString() };
    saveActiveThread();
  }catch(e){ /* 压缩失败不阻塞聊天 */ }
}

// ─── 记账：每请求 token 账（read/write 是缓存命中的铁证）─────────────────────
let __usageLog = [];
function __pushUsageLog(u){
  __usageLog.push(u);
  if(__usageLog.length > 50) __usageLog = __usageLog.slice(-50);
}
function __recordUsage(u){
  if(!u) return;
  state.__lastUsage = u;
  if(typeof __pushUsageLog === "function") __pushUsageLog(u);
}
/** OpenAI 兼容（含 DeepSeek/MiniMax 等代理）：prompt_tokens → input，completion_tokens → output，cached 字段兼容各家 */
function __recordUsageFromData(data){
  if(!data || !data.usage) return;
  const u = data.usage;
  if(u.prompt_tokens != null || u.completion_tokens != null){
    const pd = u.prompt_tokens_details || {};
    __recordUsage({
      input: u.prompt_tokens || 0,
      output: u.completion_tokens || 0,
      cache_read: pd.cached_tokens || u.prompt_cache_hit_tokens || 0,
      cache_write: pd.cache_creation_input_tokens || u.prompt_cache_miss_tokens || 0,
      ts: Date.now(),
    });
  } else if(u.input_tokens != null || u.output_tokens != null){
    // Claude 原生格式
    __recordUsage({
      input: u.input_tokens || 0,
      output: u.output_tokens || 0,
      cache_read: u.cache_read_input_tokens || 0,
      cache_write: u.cache_creation_input_tokens || 0,
      ts: Date.now(),
    });
  }
}
/** Gemini：usageMetadata.promptTokenCount → input，candidatesTokenCount → output */
function __recordUsageFromGemini(data){
  const um = (data && data.usageMetadata) || {};
  if(um.promptTokenCount == null && um.candidatesTokenCount == null) return;
  __recordUsage({
    input: um.promptTokenCount || 0,
    output: um.candidatesTokenCount || 0,
    cache_read: um.cachedContentTokenCount || 0,
    cache_write: 0,
    ts: Date.now(),
  });
}
function usageLogText(){
  if(!__usageLog.length) return "还没有缓存数据——发一条消息后即可看到本轮用量。";
  const last = __usageLog[__usageLog.length-1];
  const parts = __usageLog.slice(-8).map(u=>`${fmtClock(u.ts)} r${u.cache_read} w${u.cache_write} i${u.input} o${u.output}`).join("\n");
  return `最近一次：读 ${last.cache_read} · 写 ${last.cache_write} · 输入 ${last.input} · 输出 ${last.output}\n\n最近 8 条：\n${parts}`;
}
function fmtClock(ts){
  if(!ts) return "--:--";
  const d = new Date(ts), p=x=>String(x).padStart(2,"0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function callOneAgentReply(ag, apiMsgs, sys){
  const cfg = agentToApiConfig(ag);
  // 同步旧 apiConfig 里的 key，方便 aux 等
  if(ag.channel==="claude" && ag.claudeKey) state.apiConfig.claudeKey = ag.claudeKey;
  if(ag.channel==="openai" && ag.openaiKey){
    state.apiConfig.openaiKey = ag.openaiKey;
    state.apiConfig.openaiBase = ag.openaiBase;
    state.apiConfig.openaiModel = ag.openaiModel;
  }
  // ── MCP 工具集成：已连接 && 开了 inChat && 有工具 && 本轮无图片时走工具循环 ──
  let reply = "", toolEvents = [];
  const mcpInChat = state.mcpStatus === "ready"
    && state.mcpConfig && state.mcpConfig.inChat !== false
    && (state.mcpTools||[]).length > 0
    && !(apiMsgs||[]).some(m=>m && m.image);
  if(mcpInChat){
    try{
      const tools = (state.mcpTools||[]).map(t=>({ name:t.name, description:t.description||"", inputSchema:t.inputSchema||t.parameters||{} }));
      const r = await callChatAPIAdvanced(cfg, apiMsgs, sys||null, {
        tools,
        toolHandler: async (name,args)=>{
          const res = await mcpRpc("tools/call", { name, arguments: args || {} });
          return flattenMcpResult(res);
        },
      });
      reply = r.text || "";
      toolEvents = r.toolEvents || [];
    }catch(e){
      showToast(`MCP 调用失败，已退化为普通对话：${e.message}`);
      reply = await callChatAPI(cfg, apiMsgs, sys||null);
    }
  } else if(state.streamOn !== false && typeof callChatAPIStream === "function"){
    // 流式输出：实时气泡 + 收尾复用同一管线；出错自动回退非流式
    streamLiveStart({ id: ag.id, name: ag.name, color: ag.color });
    try{
      const r = await callChatAPIStream(cfg, apiMsgs, sys||null, {
        onLive: (live)=>{ streamLiveUpdate(live); },
      });
      reply = r.reply || "";
    }catch(e){
      streamLiveEnd();
      showToast(`流式失败，已切换非流式：${e.message}`);
      reply = await callChatAPI(cfg, apiMsgs, sys||null);
    }
    streamLiveEnd();
  } else {
    reply = await callChatAPI(cfg, apiMsgs, sys||null);
  }
  const { thinking, body } = parseThinking(reply);
  let cleanBody = handleCallMarkers(body); // callhome 暗号：拨号/挂断/勿扰
  cleanBody = handleAlbumMarkers(cleanBody);   // 相册收藏：⟪收藏:感想⟫ / ⟪收藏第N张:感想⟫
  const couponRes = handleCouponMarkers(cleanBody); // 券夹：⟪使用券:券名⟫
  cleanBody = couponRes.text;
  cleanBody = handleProfileCommand(cleanBody, "them"); // 主页资料卡：改签名/简介/背景
  let pocketMeta = { didRead:false, opened:false };
  try{
    const pr = await handlePocketMarkers(cleanBody);
    if(pr && typeof pr==="object"){
      cleanBody = pr.text != null ? pr.text : cleanBody;
      pocketMeta = pr;
    } else if(typeof pr==="string"){
      cleanBody = pr;
    }
  }catch(e){}
  // 远程浏览器：⟪浏览器开:url⟫ / ⟪浏览器读页⟫ 可同轮；读完后下面自动再接一句
  if(pocketMeta && pocketMeta.didRead){
    setTimeout(()=>{ try{ pocketAutoContinueAfterRead(ag); }catch(e){} }, 600);
  }
  cleanBody = handleNoteMarkers(cleanBody);   // 机写小纸条：⟪写纸条:内容⟫ → 聊天卡片
  cleanBody = handleDiaryMarkers(cleanBody);  // 机写日记：⟪写日记:标题|正文⟫ → 聊天轻提示
  cleanBody = handleLetterMarkers(cleanBody); // 机写信：⟪写信:正文|时间⟫ → 信箱定时投递
  cleanBody = handleQuestMarkers(cleanBody);   // 每日任务：⟪任务:JSON⟫ → 聊天弹任务卡 + 写入功能页
  cleanBody = handleFlightChessMarkers(cleanBody); // 飞行棋：⟪飞行棋⟫ 开局 / ⟪掷骰⟫ 机走格
  cleanBody = handleCalendarMarkers(cleanBody); // 日历加删
  cleanBody = handleAnnoMarkers(cleanBody); // 共读批注
  cleanBody = handleTruthDareMarkers(cleanBody);   // 真心话大冒险：⟪真心话⟫/⟪大冒险⟫/⟪抽卡⟫
  // NSFW 人称兜底：模型老爱用第三人称写自己，这里硬性改成「我/你」
  if(state.nsfwOn) cleanBody = nsfwFirstPersonRewrite(cleanBody);
  // 文章模式 / NSFW：整段显示，不拆成短气泡（NSFW 要一整条沉浸叙事，拆开会打断配色与连贯）
  const parts = (state.chatMode === "story" || state.nsfwOn) ? [(cleanBody||"").trim() || "……"] : splitReply(cleanBody);
  const now = new Date().toISOString();
  const msgId = "m"+Date.now()+"_"+ag.id;
  // 本通回复的 token 用量（__usageLog 最近一条对应这次请求），挂到首条消息供思考链顶端显示
  const lastUsage = (typeof __usageLog !== "undefined" && __usageLog.length) ? __usageLog[__usageLog.length-1] : null;
  // MCP 工具调用足迹：一行暗色小气泡
  if(toolEvents.length){
    state.messages.push({
      role:"assistant",
      content:"🔧 调用了 MCP 工具："+toolEvents.map(t=>t.name).join("、"),
      time:now, msgId:msgId+"_tools",
      speakerId: ag.id, speakerName: ag.name, speakerColor: ag.color,
      toolNote:true,
    });
  }
  parts.forEach((p,i)=>{
    state.messages.push({
      role:"assistant",
      content:p,
      time:now,
      msgId,
      speakerId: ag.id,
      speakerName: ag.name,
      speakerColor: ag.color,
      usage: i===0 ? lastUsage : null,
      thinking: i===0 ? (thinking || "（本通未返回思考：可点「编辑思考」手写，或换用带 thinking 的模型）") : null,
    });
  });
  // 券夹：送出的券面，作为一条独立卡片气泡跟在文字后面
  if(couponRes.couponId){
    state.messages.push({
      role:"assistant",
      couponId: couponRes.couponId,
      content: "",
      time: now,
      msgId: msgId+"_coupon",
      speakerId: ag.id,
      speakerName: ag.name,
      speakerColor: ag.color,
    });
  }
  // 偷听：AI 回复也悄悄喂给宝宝
  if(cleanBody) babyOverhearChat(cleanBody.replace(/\[action[^\]]*\]/g, "").replace(/\[sticker[^\]]*\]/g, "").trim(), "assistant");
  state.openThinkIds[msgId] = true;
  saveActiveThread(); // 每轮回复立即落盘，杀进程不丢
  // 页面在后台时：普通回复也上推，方便锁屏收到
  try{
    const cfg = typeof ntfyEnsure === "function" ? ntfyEnsure() : null;
    const hidden = (typeof document !== "undefined") && (document.hidden || document.visibilityState === "hidden");
    if(cfg && cfg.enabled && cfg.autoWhenHidden && hidden && cleanBody){
      const who = (ag && ag.name) || "TA";
      if(typeof ntfyMaybeNotify === "function")
        ntfyMaybeNotify(who, String(cleanBody).replace(/\s+/g," ").trim().slice(0,120), { from: "chat-bg" });
    }
  }catch(e){}
  // 飞行棋：每次真实回复消耗一格「格子内容」轮次（小机投到的内容进两轮 prompt）
  if(typeof flightChessConsumeRound === "function") flightChessConsumeRound();
}

async function triggerAIReply(){
  if(state.pendingUser.length===0 || state.chatLoading) return;
  const target = state.chatTarget || "a1";
  const isGroup = target === "group";

  if(isGroup){
    const enabled = (state.agents||[]).filter(a=>a.enabled!==false && agentHasKey(a));
    if(!enabled.length){ alert("请先在设置页为至少一位 AI 配置 API Key"); return; }
  } else {
    const ag = agentById(target);
    if(!ag || !agentHasKey(ag)){ alert("请先在设置页配置该 AI 的 API Key"); return; }
  }

  const batch=[...state.pendingUser];
  state.messages.push(...batch);
  state.pendingUser=[];
  state.chatLoading=true;
  state.needChatScroll=true;
  saveActiveThread(); // 用户消息立即落盘，杀进程不丢
  render();

  try{
    if(isGroup){
      const enabled = (state.agents||[]).filter(a=>a.enabled!==false && agentHasKey(a));
      const names = enabled.map(a=>a.name).join("、");
      for(const ag of enabled){
        const others = enabled.filter(x=>x.id!==ag.id).map(x=>x.name).join("、");
        const groupHint = `【群聊模式】你（${ag.name}）与用户、以及 ${others||"另一位"} 在同一个群里聊天。
请只以自己的身份回复，不要替别人说话。可以回应其他 AI 的发言，语气自然、像真人群聊。回复保持简短。`;
        const sys = buildSysForAgent(ag, groupHint);
        // 历史里其他 AI 的消息标成 user 侧旁白，避免模型混淆 role
        const limit = state.contextLimit || 0;
        let list = state.messages.filter(m=>m.role==="user"||m.role==="assistant");
        if(limit>0) list = list.slice(-limit);
        const apiMsgs = list.map(m=>{
          if(m.role==="user") return { role:"user", content:`[时间: ${formatTimeFull(m.time)}] 用户：${m.content}` };
          if(m.speakerId === ag.id) return { role:"assistant", content: m.content };
          return { role:"user", content:`【${m.speakerName||"另一位"}】${m.content}` };
        });
        try{
          await callOneAgentReply(ag, apiMsgs, sys);
          state.needChatScroll=true;
          render(); // 中间刷新，让用户看到逐个回复
        }catch(e){
          showToast(`${ag.name} 回复失败：${e.message}`); // 报错走浮窗，不留在聊天
        }
      }
    } else {
      const ag = agentById(target);
      const sys = buildSysForAgent(ag, null);
      const apiMsgs = msgsToApiFormat(state.messages, false);
      await callOneAgentReply(ag, apiMsgs, sys);
    }
  }catch(e){
    showToast(`请求失败：${e.message}`); // 报错走浮窗，不留在聊天
  }
  state.chatLoading=false;
  state.needChatScroll=true;
  saveActiveThread();
  render();
  // 记忆自动沉淀：回复完成后延迟跑一次（内部有阈值+冷却，不会太频繁）
  setTimeout(()=>{ if(typeof memAutoIntegrate==="function") memAutoIntegrate(); }, 8000);
}

/** 用指定思考内容重写这一组 assistant 回复 */
async function regenFromThinking(msgIdx, thinkingText){
  if(state.chatLoading) return;
  const anchor = state.messages[msgIdx];
  if(!anchor || anchor.role!=="assistant") return;
  const ag = agentById(anchor.speakerId || state.chatTarget) || agentById(state.chatTarget) || (state.agents||[])[0];
  if(!ag || !agentHasKey(ag)){ alert("请先在设置页配置 API Key"); return; }
  const groupId = anchor.msgId;
  // 删除同组 assistant 消息
  const start = msgIdx;
  let end = start;
  while(end < state.messages.length && state.messages[end].role==="assistant" && state.messages[end].msgId===groupId){
    end++;
  }
  // 历史截止到这组之前
  const history = state.messages.slice(0, start);
  state.messages = history;
  state.chatLoading = true;
  state.editingThinkId = null;
  render();

  try{
    let sys = buildSysForAgent(ag, null);
    if(state.memories.length>0){
      const recentUserMsgs = history.filter(m=>m.role==="user").slice(-3).map(m=>m.content).join(" ");
      const relevant = retrieveRelevantMemories(recentUserMsgs, 5);
      if(relevant.length){
        const memStr = relevant.map(m=>`[${m.layer}] ${m.content}`).join("\n");
        sys=(sys?sys+"\n\n":"")+`以下是与当前对话最相关的记忆：\n${memStr}`;
      }
    }
    sys += `\n\n【本次必须使用的思考内容——原样采纳后只输出正式回复】
用户已写好/改好你的思考过程。请把下面这段当作你的 <thinking> 结论，不要再另写思考标签，直接输出正式回复正文（多条短消息，换行分隔）：

${thinkingText}`;

    const limit = state.contextLimit || 0;
    let histMsgs = history.filter(m=>m.role==="user"||m.role==="assistant");
    if(limit > 0) histMsgs = histMsgs.slice(-limit);
    const apiMsgs = histMsgs.map(m=>({
      role: m.role,
      content: m.role==="user" ? `[时间: ${formatTimeFull(m.time)}] ${m.content}` : m.content,
    }));
    const reply=await callChatAPI(agentToApiConfig(ag), apiMsgs, sys||null);
    // 即使模型又包了 thinking，也剥掉，强制用用户指定的思考
    const { body } = parseThinking(reply);
    const storyBody = handleCallMarkers(body);
    const parts = (state.chatMode === "story" || state.nsfwOn) ? [(nsfwFirstPersonRewrite(storyBody)||"").trim() || "……"] : splitReply(storyBody);
    const now=new Date().toISOString();
    const msgId = groupId || ("m"+Date.now());
    const lastUsage = (typeof __usageLog !== "undefined" && __usageLog.length) ? __usageLog[__usageLog.length-1] : null;
    parts.forEach((p,i)=>{
      state.messages.push({
        role:"assistant",
        content:p,
        time:now,
        msgId,
        speakerId: ag.id,
        speakerName: ag.name,
        speakerColor: ag.color,
        thinking: i===0 ? thinkingText : null,
        usage: i===0 ? lastUsage : null,
      });
    });
    state.openThinkIds[msgId] = true;
  }catch(e){
    showToast(`重写失败：${e.message}`); // 报错走浮窗，不留在聊天
  }
  state.chatLoading=false;
  saveActiveThread();
  render();
}

// ─── 海龟汤逻辑 ──────────────────────────────────────────────────────────────
function soupStartFromBank(){
  const item = SOUP_BANK[Math.floor(Math.random()*SOUP_BANK.length)];
  state.soupGame = {
    phase: "playing",
    surface: item.surface,
    bottom: item.bottom,
    title: item.title,
    history: [{ role:"system", content:"题库出题 · 开始提问吧" }],
    loading: false,
    draft: "",
    source: "bank",
  };
  render();
}
async function soupStartFromAI(){
  if(!state.apiConfig.claudeKey && !state.apiConfig.openaiKey && !state.apiConfig.auxOpenaiKey){
    const anyKey = (state.agents||[]).some(a=>agentHasKey(a));
    if(!anyKey){ alert("请先配置 API Key"); return; }
  }
  state.soupGame.loading = true;
  state.soupGame.phase = "setup";
  render();
  const prompt = `请出一道中文「海龟汤」情景谜题（situation puzzle）。
要求：
1. 输出严格两段，用 --- 分隔：
第一段：汤面（只给表面诡异情景，2-4 句，不要剧透）
第二段：汤底（完整合理解释）
2. 逻辑自洽，适合用是/否问题推理，不要血腥猎奇过头。
3. 不要编号，不要「汤面：」标签，只用 --- 分隔两段。`;
  try{
    let text = await callAuxAPI(state.apiConfig, prompt);
    if((!text || !text.trim()) && typeof agentById==="function"){
      const ag = agentById("a1") || (state.agents||[])[0];
      if(ag && agentHasKey(ag)){
        text = await callChatAPI(agentToApiConfig(ag), [{role:"user",content:prompt}], null);
        const parsed = parseThinking(text);
        text = parsed.body || text;
      }
    }
    const parts = String(text||"").split(/\n---\n|---/).map(s=>s.trim()).filter(Boolean);
    let surface = parts[0] || "";
    let bottom = parts.slice(1).join("\n") || "";
    if(!bottom){
      // 容错：整段当汤面，让用户玩时再揭晓会提示
      surface = String(text||"").trim();
      bottom = "（AI 未给出清晰汤底，可再开一局）";
    }
    state.soupGame = {
      phase: "playing",
      surface,
      bottom,
      title: "AI 现编",
      history: [{ role:"system", content:"AI 出题 · 开始提问吧" }],
      loading: false,
      draft: "",
      source: "ai",
    };
  }catch(e){
    alert("出题失败："+e.message);
    state.soupGame.loading = false;
  }
  render();
}
async function soupSendMsg(){
  const g = state.soupGame;
  if(g.phase!=="playing" || g.loading) return;
  const inp = document.getElementById("soup-input");
  const text = (inp?.value || g.draft || "").trim();
  if(!text) return;
  g.draft = "";
  g.history.push({ role:"user", content: text });
  g.loading = true;
  render();

  const histStr = g.history.filter(h=>h.role!=="system").slice(-12).map(h=>
    (h.role==="user"?"玩家：":"主持：")+h.content
  ).join("\n");

  const prompt = `你是海龟汤主持人。汤面与汤底如下（玩家看不到汤底）：
【汤面】${g.surface}
【汤底】${g.bottom}

对话历史：
${histStr}

规则：
- 若玩家在提问：只回答「是」「否」「无关」「是也不是」之一，必要时加极短半句澄清，不要泄题。
- 若玩家在陈述完整汤底：若基本正确，回答「答对了！」并可用一两句确认；若不对，说「还不对」并鼓励继续问。
- 不要主动说出汤底全文。
只输出你的一句主持回复。`;

  try{
    let reply = await callAuxAPI(state.apiConfig, prompt);
    if((!reply || !reply.trim())){
      const ag = agentById("a1") || (state.agents||[])[0];
      if(ag && agentHasKey(ag)){
        reply = await callChatAPI(agentToApiConfig(ag), [{role:"user",content:prompt}], null);
        const parsed = parseThinking(reply);
        reply = parsed.body || reply;
      }
    }
    reply = String(reply||"").trim() || "……";
    g.history.push({ role:"ai", content: reply });
    if(/答对了|完全正确|猜对了/.test(reply)){
      g.phase = "revealed";
      g.history.push({ role:"system", content:"—— 汤底如下 ——" });
    }
  }catch(e){
    g.history.push({ role:"ai", content:"（主持走神了："+e.message+"）" });
  }
  g.loading = false;
  render();
}

// ─── 猜词游戏逻辑 ────────────────────────────────────────────────────────────
function guessPickWord(){
  return GUESS_WORDS[Math.floor(Math.random()*GUESS_WORDS.length)];
}
async function guessStart(){
  const g = state.guessGame;
  const ag = agentById(g.opponentId);
  if(!ag || !agentHasKey(ag)){ alert("请先在设置里为该 AI 配置 Key"); return; }
  g.word = guessPickWord();
  g.history = [{ role:"system", content:`游戏开始 · 词已抽取 · ${g.describer==="user"?"请描述这个词，让 AI 来猜":"AI 将先给出描述"}` }];
  g.phase = "playing";
  g.result = "";
  g.draft = "";
  g.loading = false;
  render();
  if(g.describer === "ai"){
    await guessAskAiDescribe();
  }
}
async function guessAskAiDescribe(){
  const g = state.guessGame;
  const ag = agentById(g.opponentId);
  g.loading = true; render();
  const prompt = `你在和用户玩猜词游戏。秘密词是「${g.word}」。
请用 1-3 句中文描述这个词的特征、用途或相关场景，但绝对不能直接说出这个词本身，也不能用谐音直接点破。
只输出描述正文，不要引号，不要前言。`;
  try{
    const text = await callChatAPI(agentToApiConfig(ag), [{role:"user",content:prompt}], null);
    const { body } = parseThinking(text);
    g.history.push({ role:"ai", content: (body||text).trim() });
  }catch(e){
    g.history.push({ role:"ai", content:"（描述失败："+e.message+"）" });
  }
  g.loading = false; render();
}
async function guessAskAiGuess(userDesc){
  const g = state.guessGame;
  const ag = agentById(g.opponentId);
  g.loading = true; render();
  const histStr = g.history.filter(h=>h.role!=="system").map(h=>
    (h.role==="user"?"用户描述：":"你曾猜：")+h.content
  ).join("\n");
  const prompt = `你在和用户玩猜词游戏。用户在描述一个词，你来猜。
历史：
${histStr}
用户最新描述：${userDesc}

规则：只输出你猜的一个中文词（2-6 个字），不要解释，不要标点。若实在不知道可输出「不知道」。`;
  try{
    const text = await callChatAPI(agentToApiConfig(ag), [{role:"user",content:prompt}], null);
    const { body } = parseThinking(text);
    const guess = (body||text).trim().replace(/[。！？\s]/g,"").slice(0,12);
    g.history.push({ role:"ai", content: "我猜是："+guess });
    if(guess === g.word || guess.includes(g.word) || g.word.includes(guess)){
      g.phase = "ended";
      g.result = "win";
      g.history.push({ role:"system", content:"正确！词就是「"+g.word+"」" });
    }
  }catch(e){
    g.history.push({ role:"ai", content:"（猜测失败："+e.message+"）" });
  }
  g.loading = false; render();
}
async function guessJudgeUserGuess(guess){
  const g = state.guessGame;
  const clean = guess.trim().replace(/[。！？\s]/g,"");
  g.history.push({ role:"user", content: "我猜："+clean });
  if(clean === g.word || clean.includes(g.word) || g.word.includes(clean)){
    g.phase = "ended";
    g.result = "win";
    g.history.push({ role:"system", content:"答对了！就是「"+g.word+"」" });
    render();
    return;
  }
  // 让 AI 给一点新的提示（不直接说词）
  const ag = agentById(g.opponentId);
  g.loading = true; render();
  const prompt = `猜词游戏。秘密词「${g.word}」。用户刚猜「${clean}」，不对。
请再给一句新的中文提示（不能出现秘密词），简短鼓励。只输出提示正文。`;
  try{
    const text = await callChatAPI(agentToApiConfig(ag), [{role:"user",content:prompt}], null);
    const { body } = parseThinking(text);
    g.history.push({ role:"ai", content: (body||text).trim() });
  }catch(e){
    g.history.push({ role:"ai", content:"不对哦，再试试～" });
  }
  g.loading = false; render();
}
async function guessSend(){
  const g = state.guessGame;
  if(g.phase!=="playing" || g.loading) return;
  const inp = document.getElementById("guess-input");
  const text = (inp?.value || g.draft || "").trim();
  if(!text) return;
  g.draft = "";
  if(g.describer==="user"){
    g.history.push({ role:"user", content: text });
    render();
    await guessAskAiGuess(text);
  } else {
    await guessJudgeUserGuess(text);
  }
}

// ─── 小狗游戏 ────────────────────────────────────────────────────────────────
async function playPuppy(idx){
  const list=state.gameMode==="warm"?PUPPY_WARM:PUPPY_NSFW;
  const btn=list[idx];
  if(!btn) return;
  if(!state.apiConfig.claudeKey && !state.apiConfig.openaiKey && !state.apiConfig.auxOpenaiKey){
    alert("请先在设置页配置 API Key"); return;
  }
  state.gameLoading=true;
  state.gameReply="";
  render();

  const modeHint=state.gameMode==="warm"
    ? "请用温馨、可爱、撒娇的小狗口吻回应。"
    : "请用暧昧、色气、亲密的小狗口吻回应（NSFW 允许）。";
  const prompt=`你现在是用户的小狗伴侣（可以拟人化说话）。用户点了按钮：「${btn.emoji} ${btn.text}」。
${modeHint}
用 2-4 句短消息回应，每句换行，像真实聊天一样自然可爱。不要加引号或旁白标记。`;

  try{
    const result=await callAuxAPI(state.apiConfig, prompt);
    state.gameReply=result;
  }catch(e){
    state.gameReply="（小狗跑丢了… "+e.message+"）";
  }
  state.gameLoading=false;
  render();
}

// ─── 记忆：从聊天记录提炼 / 合并已有 ─────────────────────────────────────────
function collectChatTranscript(opts = {}){
  // opts: { threadIds, dateFrom, dateTo, days, maxPerThread, skip }
  // 优先 dateFrom/dateTo（YYYY-MM-DD，含当天全部，默认不截断条数）；skip=跳过每线程最早 N 条（自动沉淀检查点用）
  const threadIds = opts.threadIds || ["a1","a2","group"];
  const maxPerThread = opts.maxPerThread > 0 ? opts.maxPerThread : 0;
  const skip = opts.skip > 0 ? opts.skip : 0;
  let startMs = 0, endMs = 0;
  if(opts.dateFrom || opts.dateTo){
    if(opts.dateFrom){
      const a = new Date(opts.dateFrom + "T00:00:00");
      startMs = isNaN(a.getTime()) ? 0 : a.getTime();
    }
    if(opts.dateTo){
      const b = new Date(opts.dateTo + "T23:59:59.999");
      endMs = isNaN(b.getTime()) ? 0 : b.getTime();
    }
  } else if(opts.days > 0){
    startMs = Date.now() - opts.days * 86400000;
    endMs = Date.now() + 86400000;
  }
  if(typeof saveActiveThread === "function") saveActiveThread();
  const threads = state.chatThreads || {};
  const agents = state.agents || [];
  const nameOf = (id) => {
    if(id==="group") return "群聊";
    const ag = agents.find(a=>a.id===id);
    return (ag && ag.name) || id;
  };
  const inRange = (m) => {
    if(!startMs && !endMs) return true;
    if(!m.time) return true;
    const t = new Date(m.time).getTime();
    if(isNaN(t)) return true;
    if(startMs && t < startMs) return false;
    if(endMs && t > endMs) return false;
    return true;
  };
  const blocks = [];
  let totalCount = 0;
  threadIds.forEach(tid=>{
    const th = threads[tid];
    if(!th || !Array.isArray(th.messages) || !th.messages.length) return;
    let list = th.messages.filter(m=>(m.role==="user"||m.role==="assistant") && inRange(m));
    if(skip > 0) list = list.slice(skip);
    if(maxPerThread > 0) list = list.slice(-maxPerThread);
    if(!list.length) return;
    totalCount += list.length;
    const lines = list.map(m=>{
      if(m.role==="user") return `用户：${m.content}`;
      const who = m.speakerName || nameOf(tid);
      return `${who}：${m.content}`;
    });
    blocks.push(`【会话：${nameOf(tid)} · ${list.length}条】\n`+lines.join("\n"));
  });
  if(!blocks.length && state.messages && state.messages.length){
    let list = state.messages.filter(m=>(m.role==="user"||m.role==="assistant") && inRange(m));
    if(skip > 0) list = list.slice(skip);
    if(maxPerThread > 0) list = list.slice(-maxPerThread);
    const lines = list.map(m=>m.role==="user"?`用户：${m.content}`:`TA：${m.content}`);
    if(lines.length){
      totalCount += lines.length;
      blocks.push(`【当前会话 · ${lines.length}条】\n`+lines.join("\n"));
    }
  }
  collectChatTranscript._lastCount = totalCount;
  return blocks.join("\n\n");
}

/** 打开整理选择弹窗（不立即跑 AI） */
function openMemIntegrate(){
  if(!state.apiConfig.claudeKey && !state.apiConfig.auxOpenaiKey && !state.apiConfig.openaiKey){
    const anyKey = (state.agents||[]).some(a=>typeof agentHasKey==="function" && agentHasKey(a));
    if(!anyKey) return alert("请先配置 API Key");
  }
  const pad = n=>String(n).padStart(2,"0");
  const today = new Date();
  const defTo = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
  const d3 = new Date(Date.now()-2*86400000);
  const defFrom = `${d3.getFullYear()}-${pad(d3.getMonth()+1)}-${pad(d3.getDate())}`;
  const defaultTh = ((state.agents||[])[0] && (state.agents||[])[0].id) || "a1";
  if(!state.memIntegrateDraft) state.memIntegrateDraft = { threads:[defaultTh], dateFrom: defFrom, dateTo: defTo };
  if(!state.memIntegrateDraft.dateFrom) state.memIntegrateDraft.dateFrom = defFrom;
  if(!state.memIntegrateDraft.dateTo) state.memIntegrateDraft.dateTo = defTo;
  state.memIntegrateOpen = true;
  render();
}

/** 从聊天记录提炼记忆（确认后后台跑） */
async function integrateMemoriesFromChat(){
  if(!state.apiConfig.claudeKey && !state.apiConfig.auxOpenaiKey && !state.apiConfig.openaiKey){
    const anyKey = (state.agents||[]).some(a=>typeof agentHasKey==="function" && agentHasKey(a));
    if(!anyKey) return alert("请先配置 API Key");
  }
  const fromEl = document.getElementById("mem-int-from");
  const toEl = document.getElementById("mem-int-to");
  if(fromEl && fromEl.value) state.memIntegrateDraft = { ...(state.memIntegrateDraft||{}), dateFrom: fromEl.value };
  if(toEl && toEl.value) state.memIntegrateDraft = { ...(state.memIntegrateDraft||{}), dateTo: toEl.value };
  const draft = state.memIntegrateDraft || {};
  const tids = (draft.threads && draft.threads.length) ? draft.threads : [((state.agents||[])[0]||{}).id || "a1"];
  const dateFrom = draft.dateFrom || "";
  const dateTo = draft.dateTo || "";
  if(!dateFrom || !dateTo) return alert("请选择开始和结束日期");
  if(dateFrom > dateTo) return alert("开始日期不能晚于结束日期");
  const transcript = collectChatTranscript({
    threadIds: tids,
    dateFrom,
    dateTo,
    maxPerThread: 0,
  });
  const msgCount = collectChatTranscript._lastCount || 0;
  if(!transcript.trim()) return alert("所选日期与角色里没有聊天记录，换个范围再试～");
  state.memIntegrateOpen = false;
  state.memMergeLoading=true; render();
  const rangeLabel = dateFrom + " ~ " + dateTo;
  try{
    const created = await memDigestTranscript(transcript, rangeLabel, msgCount);
    state.memories = [...created, ...state.memories];
    persist("memories");
    alert(`已从聊天整理出 ${created.length} 条记忆`);
  }catch(e){ alert("从聊天整理失败："+e.message); }
  state.memMergeLoading=false; render();
}

/** AI 生成的记忆正文清洗：剥角色前缀、统一第三人称（主人一律写「用户」） */
function sanitizeMemoryContent(raw){
  let s = String(raw||"").trim();
  if(!s) return "";
  // 去掉行首角色标记（英文 / 中文冒号前缀）
  s = s.replace(/^\s*(?:\[[^\]]*\]\s*)?(?:user|char|character|assistant|system|bot|human|assistant)[\s\]-]*\s*[:：]\s*/i, "");
  s = s.replace(/^\s*(?:用户|恋人|TA|角色)\s*[:：]\s*/, "");
  // 第一人称泄漏 → 第三人称（把主人统一写成「用户」，避免"站在我的视角"）
  s = s.replace(/我们的/g, "用户和TA的");
  s = s.replace(/我们/g, "用户和TA");
  s = s.replace(/我的/g, "用户的");
  s = s.replace(/我/g, "用户");
  s = s.replace(/\s+/g, " ").replace(/\s+([，。！？；：、])/g, "$1").trim();
  return s.slice(0, 400);
}

/** 把聊天转写喂给 AI 提炼成记忆行（手动「从聊天整理」+ 自动沉淀共用）。返回记忆数组 */
async function memDigestTranscript(transcript, rangeLabel, msgCount){
  const CHUNK = 14000;
  const chunks = [];
  if(transcript.length <= CHUNK) chunks.push(transcript);
  else {
    let i = 0;
    while(i < transcript.length){
      let end = Math.min(transcript.length, i + CHUNK);
      if(end < transcript.length){
        const nl = transcript.lastIndexOf("\n", end);
        if(nl > i + CHUNK * 0.6) end = nl;
      }
      chunks.push(transcript.slice(i, end));
      i = end;
    }
  }
  async function callMemOnce(prompt){
    let result = await callAuxAPI(state.apiConfig, prompt);
    if((!result || !result.trim()) && typeof agentById==="function"){
      const ag = agentById("a1") || (state.agents||[])[0];
      if(ag && agentHasKey(ag)){
        result = await callChatAPI(agentToApiConfig(ag), [{role:"user",content:prompt}], null);
        const parsed = typeof parseThinking==="function" ? parseThinking(result) : {body:result};
        result = parsed.body || result;
      }
    }
    return String(result||"");
  }
  let result = "";
  for(let ci=0; ci<chunks.length; ci++){
    const part = chunks[ci];
    const prompt = `你是记忆整理助手。请根据以下情侣/恋人聊天记录（${rangeLabel}${chunks.length>1?`，第 ${ci+1}/${chunks.length} 段`:""}，约 ${msgCount} 条消息）提炼值得长期保存的记忆。

要求：
1. 每条记忆一行，格式严格为：
LAYER|重要性1-10|效价-1到1|唤醒0到1|记忆正文
2. LAYER 只能是：core / diary / daily / handoff / plans
   - core：关系核心设定、彼此称呼、重要约定
   - diary：有情节的事件与情感高潮
   - daily：日常习惯、小偏好
   - handoff：未完待续、待跟进事项
   - plans：未来计划
3. 正文用中文，第三人称中性叙述，保留情感与关键细节，每条 40-120 字，不要编号，不要其它说明。
4. 跳过无意义闲聊；合并重复信息。本段可输出 2-8 条。
5. 人称规则（最重要，务必严格遵守）：
   - 聊天记录里「用户」指主人的一方，另一方的名字/TA 指恋人一方。
   - 记忆正文一律第三人称：提到主人写「用户」，提到恋人写 TA 的名字或「TA」。
   - 严禁出现 user / char / assistant / system 等任何英文或角色标记词。
   - 聊天里的"我/你"必须转成第三人称。例如用户说"我今天吃了火锅" → 记忆写「用户今天吃了火锅」。绝不要把第一人称"我"原样搬进记忆，也不要以任何一方的视角写记忆。

聊天记录：
${part}

只输出记忆行，不要前言后语。`;
    const piece = await callMemOnce(prompt);
    result += (result ? "\n" : "") + piece;
  }
  const lines = String(result||"").split("\n").map(s=>s.trim()).filter(Boolean);
  const created = [];
  const validLayers = ["core","diary","daily","handoff","plans"];
  lines.forEach((line,i)=>{
    const parts = line.split("|");
    if(parts.length < 5){
      // 容错：整行当正文
      if(line.length>8 && !/^LAYER/i.test(line)){
        created.push({
          id: Date.now()+i, content: sanitizeMemoryContent(line.replace(/^\d+[\.\、]\s*/,"")),
          layer:"diary", importance:6, valence:0.2, arousal:0.5,
          createdAt:new Date().toISOString(), activations:1,
          resolved:false, pinned:false, fromChat:true,
        });
      }
      return;
    }
    let [layer, imp, val, aro, ...rest] = parts;
    layer = (layer||"").trim().toLowerCase();
    if(!validLayers.includes(layer)) layer = "diary";
    const content = sanitizeMemoryContent(rest.join("|"));
    if(!content) return;
    created.push({
      id: Date.now()+i,
      content,
      layer,
      importance: Math.min(10, Math.max(1, parseInt(imp,10)||6)),
      valence: Math.min(1, Math.max(-1, parseFloat(val)||0)),
      arousal: Math.min(1, Math.max(0, parseFloat(aro)||0.5)),
      createdAt: new Date().toISOString(),
      activations:1, resolved:false, pinned:false, fromChat:true,
    });
  });
  if(!created.length) throw new Error("AI 没有返回可解析的记忆，请重试");
  return created;
}

/** 每线程 user/assistant 消息数（自动沉淀检查点口径） */
function memRelevantCount(tid){
  const th = (state.chatThreads||{})[tid];
  if(!th || !Array.isArray(th.messages)) return 0;
  return th.messages.filter(m=>m.role==="user"||m.role==="assistant").length;
}

/** 自动沉淀：把自检查点后新增的聊天自动整理成记忆（触发：回复完成后 / 打开 App） */
async function memAutoIntegrate(){
  if(state.memAutoRunning) return;
  if(state.memAutoDisabled) return;
  const anyKey = state.apiConfig && (state.apiConfig.claudeKey || state.apiConfig.auxOpenaiKey || state.apiConfig.openaiKey);
  const agKey = (state.agents||[]).some(a=>typeof agentHasKey==="function" && agentHasKey(a));
  if(!anyKey && !agKey) return;
  const ids = [...((state.agents||[]).map(a=>a.id)), "group"];
  const cp = state.memCheckpoint || {};
  const newPer = {};
  let totalNew = 0;
  let baselineChanged = false;
  ids.forEach(id=>{
    const c = memRelevantCount(id);
    let done = cp[id];
    if(done === undefined || done === null || isNaN(+done)){
      // 首次见到该线程：只消化最近 60 条，更早的历史做基线跳过（避免一次性把积压全部喂 AI、费用爆炸）；
      // 需要旧记忆可手动「从聊天整理」。
      done = Math.max(0, c - 60);
      cp[id] = done;
      baselineChanged = true;
    } else done = +done || 0;
    const n = c - done;
    if(n > 0){ newPer[id] = { n, done }; totalNew += n; }
  });
  if(baselineChanged) persist("memCheckpoint");
  if(totalNew < 60) return; // 攒够 60 条（约 6 轮对话）才整理一次，减少打扰与 API 消耗
  const now = Date.now();
  if(now - (state.memLastAutoAt||0) < 20*60000) return; // 20 分钟冷却
  state.memAutoRunning = true;
  let totalCreated = 0, totalRemote = 0;
  try{
    for(const [tid, info] of Object.entries(newPer)){
      if(info.n < 4) continue;
      const cAtRun = memRelevantCount(tid);
      const transcript = collectChatTranscript({ threadIds:[tid], skip: info.done, maxPerThread:0 });
      if(!transcript.trim()){ state.memCheckpoint[tid] = cAtRun; continue; }
      // 云端记忆优先：POST /mem/ingest，成功即推进检查点，本地不再重复提炼
      if(typeof memRemotePost==="function" && memRemoteOn()){
        const remoteRes = await memRemotePost("/ingest", { transcript, rangeLabel:"最近 "+info.n+" 条" });
        if(remoteRes && remoteRes.ok){
          totalRemote += (remoteRes.count || 0);
          state.memCheckpoint[tid] = cAtRun;
          persist("memCheckpoint");
          continue;
        }
      }
      try{
        const created = await memDigestTranscript(transcript, "最近 "+info.n+" 条", info.n);
        if(created && created.length){ state.memories=[...created, ...state.memories]; totalCreated += created.length; }
        // 成功处理即推进检查点（含空结果，避免反复花钱重试同一批）
        state.memCheckpoint[tid] = cAtRun;
        persist("memCheckpoint");
      }catch(e){ console.warn("[memAuto] 线程", tid, e); /* 该线程失败不推进，下次重试 */ }
    }
    if(totalCreated > 0 || totalRemote > 0){
      if(totalCreated > 0){ persist("memories"); }
      state.memLastAutoAt = now; persist("memLastAutoAt");
      const cloudTxt = totalRemote > 0 ? `（云端 ${totalRemote}）` : "";
      showToast(`🧠 已自动沉淀 ${totalCreated + totalRemote} 条记忆${cloudTxt}`);
      if(state.subPage==="memory") render();
    }
  }catch(e){ console.warn("[memAuto]", e); }
  finally{ state.memAutoRunning = false; }
}

/** 多选已有记忆 → 合并成一条 */
async function mergeMemories(){
  if(state.memSelected.length<2) return alert("请至少选择 2 条记忆进行合并");
  if(!state.apiConfig.claudeKey && !state.apiConfig.auxOpenaiKey && !state.apiConfig.openaiKey) return alert("请先配置 API Key");
  const toMerge=state.memories.filter(m=>state.memSelected.includes(m.id));
  const prompt=`以下是${toMerge.length}条记忆碎片，请帮我将它们整合成一段精炼的日记（300字以内），保留情感核心，去除重复：\n\n${toMerge.map((m,i)=>`${i+1}. [${m.layer}] ${m.content}`).join("\n\n")}`;
  state.memMergeLoading=true; render();
  try{
    const result=await callAuxAPI(state.apiConfig, prompt);
    const merged={
      id:Date.now(), content:result, layer:"diary",
      importance:Math.max(...toMerge.map(m=>m.importance||5)),
      valence:toMerge.reduce((s,m)=>s+(m.valence||0),0)/toMerge.length,
      arousal:toMerge.reduce((s,m)=>s+(m.arousal||0.5),0)/toMerge.length,
      createdAt:new Date().toISOString(), activations:1,
      resolved:false, pinned:false, mergedFrom:state.memSelected.length,
    };
    state.memories=[...state.memories.filter(m=>!state.memSelected.includes(m.id)), merged];
    state.memSelected=[]; persist("memories");
  }catch(e){ alert("合并失败："+e.message); }
  state.memMergeLoading=false; render();
}

// ═══════════════ 登录后重新加载 state ═══════════════
// 登录成功后切换前缀，重新从 localStorage 拉取所有持久化字段
window.reinitState = function(){
  const lsMap = {
    theme:"theme",pattern:"pattern",customWallpaper:"customWallpaper",bubbleStyle:"bubbleStyle",
    bubbleOpacity:"bubbleOpacity",bubbleGrad:"bubbleGrad",bubbleMeColor:"bubbleMeColor",bubbleThemColor:"bubbleThemColor",
    apiConfig:"apiConfig",agents:"agents",chatTarget:"chatTarget",chatMode:"chatMode",
    chatThreads:"chatThreads",memories:"memories",prompts:"prompts",coupleInfo:"coupleInfo",
    memCheckpoint:"memCheckpoint",memLastAutoAt:"memLastAutoAt",memAutoDisabled:"memAutoDisabled",memRemote:"memRemote",savedChats:"savedChats",savedCats:"savedCats",
    diaryData:"diaryData",albumData:"albumData",htmlGameSrc:"htmlGameSrc",htmlGameName:"htmlGameName",
    thoughtGuide:"thoughtGuide",htmlGameCollection:"htmlGameCollection",cmdList:"cmdList",
    contextLimit:"contextLimit",musicConfig:"musicConfig",musicNow:"musicNow",
    musicNeteaseAuthed:"musicNeteaseAuthed",musicSpotifyAuthed:"musicSpotifyAuthed",
    usageConfig:"usageConfig",usageToday:"usageToday",usageFeedChat:"usageFeedChat",
    wardrobeItems:"wardrobeItems",todayOutfit:"todayOutfit",wardrobeFeedChat:"wardrobeFeedChat",
    dutyRecords:"dutyRecords",dutyRemindOn:"dutyRemindOn",books:"books",readingNow:"readingNow",
    readFeedChat:"readFeedChat",watchNow:"watchNow",watchFeedChat:"watchFeedChat",baby:"baby",
    babyFeedChat:"babyFeedChat",cooking:"cooking",menuBook:"menuBook",mcpConfig:"mcpConfig",
    roleplays:"roleplays",activeRoleplayId:"activeRoleplayId",desireDriveOn:"desireDriveOn",
    divinationSkillOn:"divinationSkillOn",
    bodyVitals:"bodyVitals",sixAxis:"sixAxis",bodyFeel:"bodyFeel",bodyWant:"bodyWant",
    proactiveConfig:"proactiveConfig",proactiveLastLocal:"proactiveLastLocal",
    proactiveInbox:"proactiveInbox",dreamConfig:"dreamConfig",dreamState:"dreamState",
    puzzleProgress:"puzzleProgress",cabinets:"cabinets",cabinetFeedChat:"cabinetFeedChat",
    sparkVault:"sparkVault",callConfig:"callConfig",
    callRecords:"callRecords",pushStats:"pushStats",ntfyConfig:"ntfyConfig",ntfyLog:"ntfyLog",
    branding:"branding",hisPhone:"hisPhone",captivityConfig:"captivityConfig",eatApple:"eatApple",
    eatApple:"eatApple",
    menuShareOn:"_menuShareOn",menuOrderShareOn:"_menuOrderShareOn",
    letterSurfacedIds:"letterSurfacedIds",galateaEventId:"galateaEventId"
  };

  // 迁移：若带前缀的键为空，但无前缀旧键有数据，拷过来（只迁一次）
  try{
    const prefix = window.__LS_PREFIX || "";
    if(prefix){
      const migrateKeys = ["chatThreads","agents","apiConfig","memories","coupleInfo","prompts","thoughtGuide"];
      migrateKeys.forEach(k=>{
        const pk = prefix + k;
        const hasPrefixed = localStorage.getItem(pk);
        const old = localStorage.getItem(k);
        if((hasPrefixed === null || hasPrefixed === undefined) && old){
          localStorage.setItem(pk, old);
        }
      });
    }
  }catch(e){}

  Object.entries(lsMap).forEach(([stateKey, lsKey])=>{
    const val = LS.get(lsKey, undefined);
    if(val !== undefined){
      if(stateKey==="menuShareOn") state._menuShareOn = val;
      else if(stateKey==="menuOrderShareOn") state._menuOrderShareOn = val;
      else state[stateKey] = val;
    }
  });

  // VPS 换机迁移：存量配置里旧机 IP 自动切到新机
  try{ if(typeof migrateVpsIp === "function") migrateVpsIp(); }catch(e){}

  // 主动消息：跟随持久化设置（VPS 设置页可开关；六轴驱动 + 在场门控控制频率）
  if(!state.proactiveConfig) state.proactiveConfig = { enabled: false, baseUrl: "", token: "" };

  // 关键 agents 丢失导致第二次登录无法回复
  if(typeof ensureAgents === "function") ensureAgents();
  else if(!Array.isArray(state.agents) || !state.agents.length){
    try{ state.agents = defaultAgents(); }catch(e){}
  }

  // 线程形状 + 可见消息 hydrate（否则空 messages 会把真实记录覆盖掉）
  // 优先用整包+分片合并恢复，兜底旧逻辑
  if(typeof hydrateChatThreadsFromLS === "function"){
    hydrateChatThreadsFromLS();
  } else if(!state.chatThreads || typeof state.chatThreads !== "object"){
    state.chatThreads = { a1:{messages:[],pendingUser:[]}, a2:{messages:[],pendingUser:[]}, group:{messages:[],pendingUser:[]} };
  }
  ["a1","a2","group"].forEach(id=>{
    if(!state.chatThreads[id]) state.chatThreads[id] = { messages:[], pendingUser:[] };
    if(!Array.isArray(state.chatThreads[id].messages)) state.chatThreads[id].messages = [];
    if(!Array.isArray(state.chatThreads[id].pendingUser)) state.chatThreads[id].pendingUser = [];
  });
  const _reT = state.chatTarget || "a1";
  const _reTh = state.chatThreads[_reT] || { messages: [], pendingUser: [] };
  state.messages = Array.isArray(_reTh.messages) ? _reTh.messages : [];
  state.pendingUser = Array.isArray(_reTh.pendingUser) ? _reTh.pendingUser : [];
  state.chatLoading = false;
  state.needChatScroll = true;
  try{ applyBrandingToDom(); }catch(e){}
  render();
  // 登录切用户后也从原生镜像恢复（壁纸/头像等配额满时落到原生的数据）
  try{ if(typeof restoreNativeMirrors === "function") restoreNativeMirrors();
try{ restorePrNative(); }catch(e){} }catch(e){}
  // 登录后触发一次记忆自动沉淀（补足 App 关闭期间积攒的聊天）
  setTimeout(()=>{ if(typeof memAutoIntegrate==="function") memAutoIntegrate(); }, 6000);
};

try{ applyBrandingToDom(); }catch(e){}
render();
try{ applyBrandingToDom(); }catch(e){}
// 打开 App 触发一次记忆自动沉淀（有登录态时会检查积攒的聊天）
setTimeout(()=>{ if(typeof memAutoIntegrate==="function") memAutoIntegrate(); }, 6000);

// 切到后台 / 关闭前强制落盘聊天（APK 很常见）
function forceFlushChat(){
  try{ if(typeof saveActiveThread==="function") saveActiveThread(); }catch(e){}
  // 每次落盘顺带把登录态也写进 localStorage，降低冷启动丢前缀的概率
  try{ if(window.__currentUser) localStorage.setItem("__session_user__", window.__currentUser); }catch(e){}
  try{ persistChatNative(); }catch(e){}
}
if(!window.__chatFlushBound){
  window.__chatFlushBound = true;
  const flush = ()=>{ try{ if(typeof forceFlushChat==="function") forceFlushChat(); }catch(e){} };
  document.addEventListener("visibilitychange", ()=>{ if(document.hidden) flush(); });
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
  // Capacitor 原生层：进后台立即强制落盘（比 visibilitychange 更可靠，补足杀进程前的刷盘窗口）
  (function bindCapAppState(){
    try{
      const Cap = window.Capacitor;
      if(!Cap || !Cap.Plugins || !Cap.Plugins.App) return;
      Cap.Plugins.App.addListener("appStateChange", (st)=>{
        if(st && st.isActive === false) flush();
      }).catch(()=>{});
    }catch(e){}
  })();
}
// 冷启动：从原生存储恢复（异步，覆盖 localStorage 的旧快照，杀进程丢盘时兜底）
(async function restoreNativeChat(){
  try{
    const Cap = window.Capacitor;
    if(!Cap || !Cap.Plugins || !Cap.Plugins.Preferences) return;
    const r = await Cap.Plugins.Preferences.get({ key:"chatThreads_v2" });
    if(!r || !r.value) return;
    const t = JSON.parse(r.value);
    if(!t || typeof t !== "object") return;
    const cur = state.chatThreads || {};
    const merged = {};
    Object.keys(t).forEach(id=>{
      const p = t[id], c = cur[id];
      if(!c || !Array.isArray(c.messages) || (Array.isArray(p.messages) && p.messages.length > c.messages.length)){
        merged[id] = p;
      } else merged[id] = c;
    });
    Object.keys(cur).forEach(id=>{ if(!merged[id]) merged[id] = cur[id]; });
    state.chatThreads = merged;
    const tt = state.chatTarget || "a1";
    state.messages = (merged[tt] && Array.isArray(merged[tt].messages)) ? merged[tt].messages : [];
    state.pendingUser = (merged[tt] && Array.isArray(merged[tt].pendingUser)) ? merged[tt].pendingUser : [];
    if(typeof render === "function") render();
  }catch(e){}
})();
// 合并原生镜像：localStorage 配额满时落到底层原生存储（@capacitor/preferences）的数据在此恢复，
// 原生版本优先。boot 与 reinitState（登录切用户）都会调用；同时重建 __nativeMirrorKeys 供后续写同步。

async function restorePrNative(){
  try{
    const Cap = window.Capacitor;
    if(!Cap || !Cap.Plugins || !Cap.Plugins.Preferences) return;
    const tryKey = async (k)=>{
      const r = await Cap.Plugins.Preferences.get({ key: "mp_mirror_"+LS._k(k) });
      if(r && r.value){ try{ return JSON.parse(r.value); }catch(e){ return null; } }
      return null;
    };
    let pr = await tryKey("pr_v1");
    if(!pr) pr = await tryKey("pr_v1_bak");
    if(!pr || typeof pr!=="object") return;
    const cur = state.pr || {};
    const curArch = (cur.archives||[]).length;
    const newArch = (pr.archives||[]).length;
    const curActive = !!(cur.active && (cur.active.messages||[]).length);
    const newActive = !!(pr.active && (pr.active.messages||[]).length);
    if(newArch>curArch || (newActive && !curActive) || (newArch>=curArch && newActive)){
      state.pr = pr;
      try{ LS.set("pr_v1", pr); LS.set("pr_v1_bak", pr); }catch(e){}
      if(typeof render==="function") render();
    }
  }catch(e){}
}

async function restoreNativeMirrors(){
  try{
    const Cap = window.Capacitor;
    if(!Cap || !Cap.Plugins || !Cap.Plugins.Preferences) return;
    const m = await Cap.Plugins.Preferences.get({ key: LS._k("mp_mirror_keys") });
    let keys = [];
    try{ keys = (m && m.value) ? JSON.parse(m.value) : []; }catch(e){ keys = []; }
    __nativeMirrorKeys.clear();
    if(Array.isArray(keys)) keys.forEach(k => { if(typeof k === "string") __nativeMirrorKeys.add(k); });
    if(!Array.isArray(keys) || !keys.length) return;
    let changed = false;
    for(const full of keys){
      try{
        const r = await Cap.Plugins.Preferences.get({ key: "mp_mirror_"+full });
        if(!r || r.value == null) continue;
        let v; try{ v = JSON.parse(r.value); }catch(e){ continue; }
        const prefix = window.__LS_PREFIX || "";
        const k = prefix ? full.slice(prefix.length) : full;
        const sk = Object.keys(PERSIST_MAP).find(sk => PERSIST_MAP[sk] === k);
        if(!sk || state[sk] === undefined) continue;
        const cur = JSON.stringify(state[sk]);
        if(cur !== r.value){
          state[sk] = v;
          changed = true;
        }
      }catch(e){}
    }
    if(changed){
      try{ if(typeof applyThemeVars === "function") applyThemeVars(); }catch(e){}
      if(typeof render === "function") render();
    }
  }catch(e){}
}
restoreNativeMirrors();
try{ restorePrNative(); }catch(e){}


// 他的机：启动后检查是否该生成；每 15 分钟再看一眼（仅进程存活时）
if(!window.__hisPhoneSched){
  window.__hisPhoneSched = true;
  setTimeout(()=>{ try{ hisPhoneTrySchedule(); }catch(e){} }, 4000);
  setInterval(()=>{ try{ hisPhoneTrySchedule(); }catch(e){} }, 15*60*1000);
}

// 身体状态缓慢 tick（约每 45 秒）
if(!window.__bodyTickTimer){
  window.__bodyTickTimer = setInterval(()=>{
    if(typeof tickBodyState === "function"){
      tickBodyState();
      if(state.subPage === "body") render();
    }
  }, 45000);
}
// 启动后尝试本地主动消息 / 可选 VPS 拉取（不阻塞首屏）
if(!window.__wakePullTimer){
  window.__wakePullTimer = setInterval(()=>{
    try{ if(typeof deliverWakePull === "function") deliverWakePull(); }catch(e){}
    try{ if(typeof fetchSixAxis === "function") fetchSixAxis(); }catch(e){}
  }, 180000);
}
// 信箱：轮询已投递的信，新投递的进聊天（防重推）
if(!window.__mcLetterTimer){
  window.__mcLetterTimer = setInterval(()=>{
    try{ if(typeof mcPollDeliveredLetters === "function") mcPollDeliveredLetters(); }catch(e){}
  }, 60000);
}
// Galatea 桌游：轮询 get_my_status，轮到机时自动唤醒走棋（仅在连上 galatea 且开 inChat 时生效）
if(!window.__galateaWakeTimer){
  window.__galateaWakeTimer = setInterval(()=>{
    try{ if(typeof galateaGameWake === "function") galateaGameWake(); }catch(e){}
  }, 30000);
}
if(!window.__proactiveBoot){
  window.__proactiveBoot = true;
  setTimeout(()=>{
    try{ if(typeof mcPollDeliveredLetters === "function") mcPollDeliveredLetters(); }catch(e){}
    try{ if(typeof galateaGameWake === "function") setTimeout(galateaGameWake, 4000); }catch(e){}
    try{
      if(typeof postAppEvent === "function") postAppEvent("app_open", { tab: state.tab });
    }catch(e){}
    try{
      if(typeof dreamTryNight === "function") dreamTryNight().then(r=>{
        if(r && r.dreamed) console.log("[dream]", r.title, r.trace);
      }).catch(()=>{});
    }catch(e){}
    try{
      if(typeof deliverWakePull === "function") deliverWakePull();
    }catch(e){}
    try{
      if(typeof fetchSixAxis === "function") fetchSixAxis();
    }catch(e){}
    try{
      if(typeof proactiveTryLocal === "function") proactiveTryLocal(false);
    }catch(e){}
    try{
      const cfg = state.proactiveConfig || {};
      if(cfg.enabled && cfg.baseUrl && typeof proactivePullFromVps === "function"){
        // 静默拉取，失败忽略
        const base = (cfg.baseUrl||"").replace(/\/$/,"");
        const headers = { "Accept": "application/json" };
        if(cfg.token) headers["X-Auth-Token"] = cfg.token;
        fetch(base + "/proactive/pull", { headers }).then(r=>r.ok?r.json():null).then(async data=>{
          if(!data) return;
          const list = data.messages || data.data || (Array.isArray(data)?data:[]);
          for(const m of list){
            try{ await pushWakeMessage(m); }catch(e){}
          }
          if(list.length && state.tab==="chat") render();
        }).catch(()=>{});
      }
    }catch(e){}
  }, 2500);
}


// ─── Capacitor 原生推送（FCM）──────────────────────────────────────────────
// ─── 远程浏览器控制（Pocket · Capacitor 原生插件）────────────────────────────
