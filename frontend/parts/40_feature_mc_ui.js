/* === 40_feature_mc_ui.js === extracted from monolith; edit here then: python3 frontend/build.py */
function mcFindDetail(type, id){
  if(!id) return null;
  let hit = null;
  if(type==="note") hit = (state.mcNotes||[]).find(x=>String(x.id)===String(id)) || null;
  else if(type==="diary") hit = (state.mcDiaries||[]).find(x=>String(x.id)===String(id)) || null;
  else hit = (state.mcLetters||[]).find(x=>String(x.id)===String(id)) || null;
  if(hit) return hit;
  // 聊天卡片 snap 兜底（列表未刷新时也能打开）
  try{
    const threads = state.chatThreads || state.threads || [];
    const lists = [];
    if(Array.isArray(threads)){
      threads.forEach(th=>{ if(th && Array.isArray(th.messages)) lists.push(th.messages); });
    } else if(threads && typeof threads==="object"){
      Object.keys(threads).forEach(k=>{
        const th = threads[k];
        if(th && Array.isArray(th.messages)) lists.push(th.messages);
      });
    }
    if(Array.isArray(state.messages)) lists.push(state.messages);
    for(const msgs of lists){
      for(const m of msgs){
        if(!m) continue;
        if(String(m.refId||"")!==String(id)) continue;
        const snap = m.snap || {};
        if(type==="diary"){
          return {
            id: id,
            title: snap.title || m.title || "",
            content: snap.content || snap.body || m.content || "",
            date: snap.date || "",
            visibility: snap.visibility || "public",
            locked: !!snap.locked,
            author: snap.author || "ai",
            annotations: snap.annotations || [],
          };
        }
        if(type==="note"){
          return { id, content: snap.content || snap.body || m.content || "", author: snap.author || "ai" };
        }
        if(type==="letter"){
          return { id, body: snap.body || snap.content || m.content || "", content: snap.body || snap.content || "", status: snap.status || "delivered", author: snap.author || "ai" };
        }
      }
    }
  }catch(e){}
  return null;
}
/** 隐私判定：未投递的信 / 私有或上锁的机日记 → 需要模糊层，未解锁不可点开 */
function mcIsRestricted(type, rec){
  if(!rec) return false;
  if(type==="letter") return rec.status !== "delivered";
  if(type==="diary") return rec.visibility === "private" || !!rec.locked;
  return false;
}
function mcRestrictLabel(type, rec){
  if(type==="letter") return "🔒 还没到投递时间，到点自动解锁";
  if(type==="diary") return "🔒 TA 还没给你看，给你看时自动解锁";
  return "";
}
/** 删除（后端删除 + 本地移除；后端失败也本地删，方便清理测试数据） */
async function mcDelete(type, id){
  if(!confirm("确定删除这条记录吗？删除后不可恢复。")) return;
  try{ await mcPost("/"+type+"/delete", { id }); }catch(e){}
  if(type==="note") state.mcNotes = (state.mcNotes||[]).filter(x=>x.id!==id);
  if(type==="diary") state.mcDiaries = (state.mcDiaries||[]).filter(x=>x.id!==id);
  if(type==="letter") state.mcLetters = (state.mcLetters||[]).filter(x=>x.id!==id);
  state.mcDetail = null;
  showToast("已删除");
  render();
}
function mcOpenDetail(type, id){
  state.mcDetail = { type, id };
  state.mcAnnDraft = "";
  const sub = type==="note" ? "notes" : type==="diary" ? "mdiary" : "mailbox";
  state.subPage = sub;
  if(typeof render==="function") render();
  // 后台拉列表，补全正文后刷新弹层
  try{
    if(typeof mcRefresh==="function"){
      Promise.resolve(mcRefresh()).then(()=>{
        if(state.mcDetail && String(state.mcDetail.id)===String(id)){
          if(typeof render==="function") render();
        }
      }).catch(()=>{});
    }
  }catch(e){}
}
function mcCloseDetail(){ state.mcDetail = null; render(); }
async function mcRefresh(){
  const [n, d, l] = await Promise.all([
    mcFetch("/note/list"), mcFetch("/diary/list?visibility=all"), mcFetch("/letter/list?status=all"),
  ]);
  if(n && n.notes) state.mcNotes = n.notes;
  if(d && d.diaries) state.mcDiaries = d.diaries;
  if(l && l.letters) state.mcLetters = l.letters;
}
async function mcSendNote(){
  const text = (state.mcNoteDraft||"").trim();
  if(!text) return;
  state.mcSheet = "";
  state.mcNoteDraft = "";
  let refId = null;
  const res = await mcPost("/note", { content: text, author: "user" });
  if(res && res.note) refId = res.note.id;
  // 进聊天（pendingUser，AI 能看到），即使后端失败也本地可见
  state.pendingUser.push({
    role:"user", type:"note", content:text, refId,
    snap:{ body:text, author:"user" },
    time:new Date().toISOString(), msgId:"m"+Date.now()+"_note",
  });
  saveActiveThread(); state.needChatScroll = true;
  const n = await mcFetch("/note/list"); if(n && n.notes) state.mcNotes = n.notes;
  state.tab = "chat"; state.subPage = null; render();
}
async function mcSendLetter(){
  const body = (state.mcLetterBody||"").trim();
  if(!body) return;
  state.mcSheet = "";
  let scheduledAt = null;
  if(state.mcLetterSched){
    const ts = new Date(state.mcLetterSched).getTime();
    if(ts) scheduledAt = new Date(ts).toISOString();
  }
  const res = await mcPost("/letter", { content: body, scheduledAt, author: "user" });
  if(res && res.letter){
    showToast(res.letter.status === "delivered" ? "信已投递 📮" : "信已投递到信箱，到点送达 📮");
  } else {
    showToast("写信失败：后端不可用", "error");
  }
  const l = await mcFetch("/letter/list?status=all"); if(l && l.letters) state.mcLetters = l.letters;
  state.mcLetterBody = ""; state.mcLetterSched = "";
  render();
}
async function mcAddAnnotation(){
  const d = state.mcDetail; const text = (state.mcAnnDraft||"").trim();
  if(!d || !text) return;
  const res = await mcPost("/annotation", { refType: d.type, refId: d.id, content: text });
  if(res && res.annotation){
    state.mcAnnDraft = "";
    const rec = mcFindDetail(d.type, d.id);
    if(rec){ rec.annotations = rec.annotations || []; rec.annotations.push(res.annotation); }
    render();
  } else {
    showToast("批注失败：后端不可用", "error");
  }
}
function mcAuthorTag(author){
  return author === "ai" ? '<span class="mc-tag" style="color:var(--accent)">TA 写的</span>'
                         : '<span class="mc-tag">你写的</span>';
}
function mcDetailOverlay(type, rec){
  const anns = (rec && rec.annotations) || [];
  const restricted = mcIsRestricted(type, rec);
  const head = type==="note" ? "小纸条"
    : type==="diary" ? "机日记"
    : "信";
  const body = rec ? (
    type==="diary"
      ? `${rec.title?`<div class="mc-diary-title" style="margin-bottom:8px">${esc(rec.title)}</div>`:""}
         <div class="mc-detail-body${restricted?" mc-blur":""}">${esc(rec.content||"")}</div>`
      : `<div class="mc-detail-body${restricted?" mc-blur":""}">${esc(rec.content||rec.body||"")}</div>`
  ) : `<div style="font-size:12px;color:var(--sub)">这条记录已被删除。</div>`;
  const delBtn = rec ? `<button type="button" class="mc-detail-del" id="mc-detail-del" data-mc-del="${type}:${escAttr(rec.id)}"><i data-lucide="trash-2"></i> 删除这条</button>` : "";
  const meta = rec ? (
    `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:10px">
       ${mcAuthorTag(rec.author||"user")}
       ${type==="diary" ? (rec.visibility==="private"
         ? `<span class="mc-badge-private">仅自己</span>`
         : `<span class="mc-badge-visible">对你可见</span>`) + (rec.locked?`<span class="mc-badge-lock">🔒 上锁</span>`:""):""}
       ${type==="letter" ? (rec.status==="delivered"
         ? `<span class="mc-stamp">已送达 ${rec.deliveredAt?formatTime(rec.deliveredAt):""}</span>`
         : `<span class="mc-stamp" style="background:color-mix(in srgb,#C4A574 18%,transparent);color:#C4A574">待投递</span>`):""}
       <span style="font-size:10px;color:var(--sub)">${rec.date||""}</span>
     </div>`
  ) : "";
  return `<div class="mc-detail-mask" id="mc-detail-mask">
    <div class="mc-detail-card">
      <div class="mc-detail-head">
        <div style="font-size:15px;font-weight:600;color:var(--text)">${head}</div>
        <button class="mc-detail-close" id="mc-detail-close">✕</button>
      </div>
      ${body}
      ${meta}
      ${anns.length?`<div class="mc-ann-title">批注（${anns.length}）</div>
        ${anns.map(a=>`<div class="mc-ann-item">${esc(a.content||"")}<div style="font-size:10px;color:var(--sub);margin-top:3px">${a.date||""}</div></div>`).join("")}`:""}
      <div class="mc-ann-title">写批注</div>
      <div class="mc-ann-input-row">
        <input class="mc-ann-input" id="mc-ann-input" placeholder="回一句…" value="${escAttr(state.mcAnnDraft||"")}"/>
        <button class="btn-accent" id="mc-ann-send" style="padding:8px 14px;font-size:12px">写下</button>
      </div>
      ${delBtn}
    </div>
  </div>`;
}
function mcSheetMask(){
  if(!state.mcSheet) return "";
  if(state.mcSheet === "note"){
    return `<div class="mc-sheet-mask show" id="mc-sheet-mask">
      <div class="mc-sheet">
        <div class="mc-sheet-handle"></div>
        <div class="mc-sheet-title">撕一张新纸条</div>
        <textarea class="mc-sheet-input" id="mc-note-input" placeholder="想说的话写在这里…">${esc(state.mcNoteDraft||"")}</textarea>
        <div class="mc-sheet-actions">
          <button class="btn mc-btn-cancel" id="mc-sheet-cancel">取消</button>
          <button class="btn mc-btn-send" id="mc-note-send">写完 · 发到聊天</button>
        </div>
      </div>
    </div>`;
  }
  if(state.mcSheet === "letter"){
    return `<div class="mc-sheet-mask show" id="mc-sheet-mask">
      <div class="mc-sheet">
        <div class="mc-sheet-handle"></div>
        <div class="mc-sheet-title">写一封信</div>
        <textarea class="mc-sheet-input" id="mc-letter-body" placeholder="认真写的话放在这里…">${esc(state.mcLetterBody||"")}</textarea>
        <div style="display:flex;align-items:center;gap:10px;margin:10px 0 4px;font-size:13px;color:var(--sub)">投递时间
          <input class="mc-sheet-time" id="mc-letter-sched" type="datetime-local" value="${escAttr(state.mcLetterSched||"")}"/>
        </div>
        <div class="mc-sheet-actions">
          <button class="btn mc-btn-cancel" id="mc-sheet-cancel">取消</button>
          <button class="btn mc-btn-send" id="mc-letter-send">定时投递</button>
        </div>
      </div>
    </div>`;
  }
  return "";
}