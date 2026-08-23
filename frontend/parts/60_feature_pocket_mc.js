/* === 60_feature_pocket_mc.js === extracted from monolith; edit here then: python3 frontend/build.py */
function pocketNative(){
  const Cap = window.Capacitor;
  if(!Cap || typeof Cap.isNativePlatform!=="function" || !Cap.isNativePlatform()) return null;
  try{ return (Cap.Plugins && Cap.Plugins.PocketBrowser) || null; }catch(e){ return null; }
}
function setPocketStatus(msg, isErr){
  const el = document.getElementById("pocket-status");
  if(el){ el.textContent = msg||""; el.style.color = isErr ? "var(--accent)" : "var(--sub)"; }
}
async function pocketConnect(){
  const p = state.pocketConfig || {};
  const native = pocketNative();
  if(!native){ setPocketStatus("仅原生 App 内可用（网页预览无效）", true); return; }
  if(!(p.serverUrl && p.token)){ setPocketStatus("先在设置里填 Server URL 和 Token", true); return; }
  setPocketStatus("连接中…");
  try{
    await native.connect({ serverUrl: p.serverUrl, token: p.token });
    setPocketStatus("已连接：远程通道就绪（再打开浏览器登录 X 一次）");
  }catch(e){ setPocketStatus("连接失败：" + ((e && e.message) || e), true); }
}
async function pocketShow(url){
  const native = pocketNative();
  if(!native){ setPocketStatus("仅原生 App 内可用（请用安装版 APK）", true); return; }
  let u = (url && String(url).trim()) || "";
  if(!u){
    const inp = document.getElementById("pocket-open-url");
    u = (inp && inp.value || "").trim();
  }
  if(!u) u = "https://www.bing.com";
  if(!/^https?:\/\//i.test(u)) u = "https://" + u;
  try{
    await native.showBrowser({ url: u });
    setPocketStatus("小浏览器已打开：" + u + "（右上角「关闭」可收起）");
  }catch(e){ setPocketStatus("打开失败：" + ((e && e.message) || e), true); }
}
async function pocketShowX(){
  return pocketShow("https://x.com/i/flow/login");
}
async function pocketHide(){
  const native = pocketNative();
  if(!native){ setPocketStatus("仅原生 App 内可用", true); return; }
  try{
    await native.hideBrowser();
    setPocketStatus("已隐藏：Cookie 已保留，可远程操控 X");
  }catch(e){ setPocketStatus("隐藏失败：" + ((e && e.message) || e), true); }
}
async function pocketDisconnect(){
  const native = pocketNative();
  if(!native){ setPocketStatus("仅原生 App 内可用", true); return; }
  try{
    await native.disconnect();
    setPocketStatus("已断开");
  }catch(e){ setPocketStatus("断开失败：" + ((e && e.message) || e), true); }
}
// 聊天暗号：AI 直接控制远程浏览器（登录 X 用）
async function pocketShowUrl(url){
  const native = pocketNative();
  if(!native){ setPocketStatus("仅原生 App 内可用", true); return; }
  const p = state.pocketConfig || {};
  try{
    if(p.serverUrl && p.token){
      try{ await native.connect({ serverUrl: p.serverUrl, token: p.token }); }catch(e){}
    }
    const u = (url && url.trim()) || "https://www.bing.com";
    await native.showBrowser({ url: u });
    setPocketStatus("小浏览器已打开："+u.slice(0,48)+"（可同轮读页）");
  }catch(e){ setPocketStatus("打开失败：" + ((e && e.message) || e), true); }
}
async function handlePocketMarkers(text){
  if(!text || !pocketNative()) return { text: text, didRead: false, opened: false };
  let t = String(text);
  let m;
  const openRe = /⟪浏览器开\s*[:：]?\s*([^⟫]+)⟫/g;
  const openUrls = [];
  while((m = openRe.exec(String(text)))){
    const u = (m[1]||"").trim();
    if(u) openUrls.push(u);
  }
  const wantRead = /⟪浏览器读页⟫/.test(t);
  const wantShot = /⟪浏览器截图⟫/.test(t);
  const wantClose = /⟪浏览器关⟫/.test(t);
  // 浏览器看:url = 开+读 一步
  const seeRe = /⟪浏览器看\s*[:：]?\s*([^⟫]+)⟫/g;
  let seeUrls = [];
  let mm;
  while((mm = seeRe.exec(String(text)))){
    const u=(mm[1]||"").trim();
    if(u) seeUrls.push(u);
  }
  // 滑动：⟪浏览器滑:下⟫ / 上 / 顶 / 底 / 下:3（次数）
  const scrollCmds = [];
  const scrollRe = /⟪浏览器滑\s*[:：]?\s*([^⟫]+)⟫/g;
  while((mm = scrollRe.exec(String(text)))){
    scrollCmds.push((mm[1]||"下").trim());
  }
  // 刷页：⟪浏览器刷:3⟫ 下滑几次并合并阅读
  let browseN = 0;
  const br = /⟪浏览器刷\s*[:：]?\s*(\d{1,2})\s*⟫/.exec(String(text));
  if(br) browseN = parseInt(br[1],10)||3;

  t = t.replace(/⟪浏览器开\s*[:：]?\s*[^⟫]+⟫/g, "");
  t = t.replace(/⟪浏览器看\s*[:：]?\s*[^⟫]+⟫/g, "");
  t = t.replace(/⟪浏览器读页⟫/g, "");
  t = t.replace(/⟪浏览器截图⟫/g, "");
  t = t.replace(/⟪浏览器关⟫/g, "");
  t = t.replace(/⟪浏览器滑\s*[:：]?\s*[^⟫]+⟫/g, "");
  t = t.replace(/⟪浏览器刷\s*[:：]?\s*\d{1,2}\s*⟫/g, "");

  let opened = false;
  let didRead = false;
  try{
    const allOpen = openUrls.concat(seeUrls);
    for(const u of allOpen){
      await pocketShowUrl(u);
      opened = true;
    }
    if(opened) await new Promise(r=>setTimeout(r, 2000));

    // 滑动指令
    for(const cmd of scrollCmds){
      const parts = cmd.split(/[:：\s]+/);
      const dirRaw = (parts[0]||"下").toLowerCase();
      const times = Math.max(1, Math.min(5, parseInt(parts[1],10)||1));
      let dir = "down";
      if(/上|up/.test(dirRaw)) dir = "up";
      else if(/顶|top/.test(dirRaw)) dir = "top";
      else if(/底|bottom/.test(dirRaw)) dir = "bottom";
      else dir = "down";
      for(let i=0;i<times;i++){
        await pocketScroll(dir, 950);
      }
    }

    if(browseN>0){
      await pocketBrowseFeed(browseN);
      didRead = !!(state.pocketPageCache && state.pocketPageCache.text);
    } else if(opened || wantRead || seeUrls.length){
      await pocketReadPageToCache();
      didRead = !!(state.pocketPageCache && state.pocketPageCache.text);
    }
    if(wantShot){
      await pocketCaptureAndSend();
    }
    if(wantClose){
      pocketHide();
    }
  }catch(e){
    try{ if(typeof setPocketStatus==="function") setPocketStatus("浏览器操作失败："+((e&&e.message)||e), true); }catch(_){}
  }
  return { text: t.trim(), didRead: didRead, opened: opened };
}

/** 读当前页正文 → 写入缓存，下一轮 system 注入，让机「自己看过」 */
async function pocketReadPageToCache(){
  const native = pocketNative();
  if(!native || typeof native.getPageText !== "function"){
    if(typeof showToast==="function") showToast("当前 App 版本不支持读页，请重打包装载");
    return;
  }
  try{
    // 稍等渲染
    await new Promise(r=>setTimeout(r, 600));
    const r = await native.getPageText();
    const text = (r && (r.text || (r.value && r.value.text))) || "";
    const url = (r && (r.url || (r.value && r.value.url))) || "";
    state.pocketPageCache = {
      url: url,
      text: String(text).slice(0, 5000),
      at: Date.now()
    };
    try{ LS.set("pocketPageCache", state.pocketPageCache); }catch(e){}
    if(typeof showToast==="function") showToast("已读页："+(url||"当前页").slice(0,40));
  }catch(e){
    if(typeof showToast==="function") showToast("读页失败："+((e&&e.message)||e));
  }
}



async function pocketScroll(direction, amount){
  const native = pocketNative();
  if(!native){ if(typeof showToast==="function") showToast("仅原生 App 可用"); return false; }
  try{
    if(typeof native.scrollBy==="function"){
      await native.scrollBy({ direction: direction||"down", amount: amount||900 });
    }else if(typeof native.evaluateJs==="function"){
      const d=(direction||"down").toLowerCase();
      let code;
      if(d==="top") code="window.scrollTo(0,0);'ok'";
      else if(d==="bottom") code="window.scrollTo(0,document.body.scrollHeight);'ok'";
      else if(d==="up") code="window.scrollBy(0,-"+(amount||900)+");'ok'";
      else code="window.scrollBy(0,"+(amount||900)+");'ok'";
      await native.evaluateJs({ code: code });
    }else{
      if(typeof showToast==="function") showToast("当前包不支持滑动，请重打包");
      return false;
    }
    await new Promise(r=>setTimeout(r, 450));
    return true;
  }catch(e){
    if(typeof showToast==="function") showToast("滑动失败");
    return false;
  }
}

async function pocketEvalJs(code){
  const native = pocketNative();
  if(!native || typeof native.evaluateJs!=="function"){
    if(typeof showToast==="function") showToast("当前包不支持脚本");
    return null;
  }
  try{
    const r = await native.evaluateJs({ code: String(code||"") });
    return (r && (r.result!=null?r.result:r.value)) || "";
  }catch(e){
    return null;
  }
}

/** 多步：下滑若干次并每次读一点，拼成摘要 */
async function pocketBrowseFeed(times){
  const n = Math.max(1, Math.min(6, parseInt(times,10)||3));
  const chunks = [];
  for(let i=0;i<n;i++){
    if(i>0) await pocketScroll("down", 1000);
    await new Promise(r=>setTimeout(r, 500));
    await pocketReadPageToCache();
    const c = state.pocketPageCache;
    if(c && c.text) chunks.push(String(c.text).slice(0,1200));
  }
  const merged = chunks.join("\n---\n").slice(0, 4800);
  if(merged){
    state.pocketPageCache = {
      url: (state.pocketPageCache && state.pocketPageCache.url) || "",
      text: merged,
      at: Date.now()
    };
    try{ LS.set("pocketPageCache", state.pocketPageCache); }catch(e){}
  }
  return merged;
}

/** 读页成功后自动再让机说一句，避免用户还要手动「下一轮」 */
async function pocketAutoContinueAfterRead(ag){
  try{
    if(window.__pocketAutoContinueLock) return;
    const c = state.pocketPageCache;
    if(!c || !c.text) return;
    if(Date.now() - (c.at||0) > 15000) return; // 只接刚刚读的
    window.__pocketAutoContinueLock = true;
    const sysExtra = `【系统·小浏览器】你刚刚已经打开并读完页面（同轮完成）。网址：${c.url||""}\n正文摘录：\n${String(c.text).slice(0,3200)}\n请直接用第一人称对 Jasmine 分享你看到的有趣点，不要再写浏览器暗号，除非还要继续打开新页面。不要说「下一轮才能看」。`;
    // 轻量：往当前会话塞一条隐藏 system 提示后触发一次回复
    const agent = ag || (state.agents||[]).find(a=>a.id===state.currentAgentId) || state.agents[0];
    if(!agent || typeof callOneAgentReply!=="function"){ window.__pocketAutoContinueLock=false; return; }
    const thread = (typeof currentThread==="function") ? currentThread() : null;
    const msgs = (thread && thread.messages) ? thread.messages.slice(-12) : [];
    const apiMsgs = msgs.filter(m=>m.role==="user"||m.role==="assistant").map(m=>({role:m.role, content: typeof m.content==="string"?m.content:(m.content||"")}));
    apiMsgs.push({ role:"user", content:"（系统提示：页面已读入，请根据刚读到的内容自然接话，不要提系统提示本身。）" });
    const baseSys = (typeof buildSystemPrompt==="function") ? buildSystemPrompt(agent) : "";
    await callOneAgentReply(agent, apiMsgs, (baseSys||"")+"\n\n"+sysExtra);
  }catch(e){
    try{ console.warn("pocketAutoContinue", e); }catch(_){}
  }finally{
    setTimeout(()=>{ window.__pocketAutoContinueLock=false; }, 800);
  }
}

/** 截图并发到聊天（机的气泡带图） */
async function pocketCaptureAndSend(){
  const native = pocketNative();
  if(!native || typeof native.captureScreenshot !== "function"){
    if(typeof showToast==="function") showToast("当前 App 版本不支持截图，请重打包装载");
    return;
  }
  try{
    await new Promise(r=>setTimeout(r, 400));
    const r = await native.captureScreenshot();
    const dataUrl = (r && (r.dataUrl || (r.value && r.value.dataUrl))) || "";
    const url = (r && (r.url || (r.value && r.value.url))) || "";
    if(!dataUrl){ if(typeof showToast==="function") showToast("截图为空"); return; }
    const ag = (typeof agentById==="function" ? agentById(state.chatTarget==="group"?"a1":state.chatTarget) : null)
      || (state.agents||[])[0];
    const msg = {
      role: "assistant",
      content: url ? ("我浏览时截到的：\n"+url) : "我浏览时截到的一张图",
      image: dataUrl,
      imageMime: "image/jpeg",
      time: new Date().toISOString(),
      msgId: "m"+Date.now()+"_shot",
      speakerId: ag ? ag.id : "a1",
      speakerName: ag ? ag.name : "TA",
      speakerColor: ag ? ag.color : undefined,
      from: "pocket-shot"
    };
    state.messages = state.messages || [];
    state.messages.push(msg);
    if(typeof saveActiveThread==="function") saveActiveThread();
    state.needChatScroll = true;
    if(state.tab==="chat") render();
    else if(typeof showToast==="function") showToast("截图已发到聊天");
  }catch(e){
    if(typeof showToast==="function") showToast("截图失败："+((e&&e.message)||e));
  }
}

// ─── 机写：小纸条 / 机日记 / 信箱（marker 暗号 → VPS 存记录 → 聊天卡片）────────
function mcPushCard(type, record, extra){
  if(!record) return;
  const ag = agentById(state.chatTarget==="group"?"a1":state.chatTarget) || (state.agents||[])[0];
  const m = {
    role: "assistant",
    type,
    content: (extra && extra.content) || (record.content || ""),
    refId: record.id,
    snap: (extra && extra.snap) || {},
    time: new Date().toISOString(),
    msgId: "m"+Date.now()+"_"+type,
    speakerId: ag ? ag.id : "a1",
    speakerName: ag ? ag.name : "TA",
    speakerColor: ag ? ag.color : undefined,
    proactive: true,
    from: type,
  };
  state.messages = state.messages || [];
  state.messages.push(m);
  saveActiveThread();
  state.needChatScroll = true;
  if(state.tab === "chat") render();
}
/** ⟪写纸条:内容⟫ → POST /note(author=ai) → 聊天插 type=note 卡片；暗号擦除 */
function handleNoteMarkers(body){
  let text = String(body||"");
  if(!text) return text;
  const m = text.match(/[⟪《【\[]\s*写纸条\s*[:：]\s*([^⟫》】\]]+)[⟫》】\]]/);
  if(!m) return text;
  const content = (m[1]||"").trim().slice(0,200);
  text = text.replace(/[⟪《【\[]\s*写纸条\s*[:：][^⟫》】\]]+[⟫》】\]]/g, "").replace(/\n{3,}/g,"\n\n").trim();
  if(content){
    mcPost("/note", { content, author:"ai" }).then(rec=>{
      if(rec && rec.note) mcPushCard("note", rec.note, { content, snap:{ body:content, author:"ai" } });
    });
  }
  return text || "（撕了一张小纸条给你）";
}
/** ⟪写日记:标题|正文⟫ / ⟪写日记(仅自己):标题|正文⟫ → POST /diary；visible 进聊天轻提示 */
function handleDiaryMarkers(body){
  let text = String(body||"");
  if(!text) return text;
  const isPrivate = /[⟪《【\[]\s*写日记\s*\(\s*仅自己\s*\)/.test(text);
  const m = text.match(/[⟪《【\[]\s*写日记\s*(?:\(\s*仅自己\s*\))?\s*[:：]\s*([^⟫》】\]]+)[⟫》】\]]/);
  if(!m) return text;
  text = text.replace(/[⟪《【\[]\s*写日记\s*(?:\(\s*仅自己\s*\))?\s*[:：][^⟫》】\]]+[⟫》】\]]/g, "").replace(/\n{3,}/g,"\n\n").trim();
  const raw = (m[1]||"").trim();
  const bar = raw.indexOf("|");
  let title = "", content = raw;
  if(bar >= 0){ title = raw.slice(0,bar).trim(); content = raw.slice(bar+1).trim(); }
  if(!content) return text || "（写了一篇日记）";
  title = title.slice(0,60); content = content.slice(0,1200);
  mcPost("/diary", { title, content, visibility: isPrivate?"private":"visible", author:"ai" }).then(rec=>{
    if(rec && rec.diary && rec.diary.visibility !== "private"){
      mcPushCard("diary_notice", rec.diary, {
        content: `（TA 写了一篇日记${title?`《${title}》`:""}，点开看看）`,
        snap: { title, body: content, visibility:"visible", author:"ai" },
      });
    }
  });
  return text || (isPrivate ? "（写了一篇只给自己的日记）" : "（写了一篇日记，翻开机日记页看看吧）");
}
/** ⟪写信:正文|时间描述⟫ → POST /letter；立即投递的进聊天，定时的到点由轮询 surfacing */
function handleLetterMarkers(body){
  let text = String(body||"");
  if(!text) return text;
  const m = text.match(/[⟪《【\[]\s*写信\s*[:：]\s*([^⟫》】\]]+)[⟫》】\]]/);
  if(!m) return text;
  text = text.replace(/[⟪《【\[]\s*写信\s*[:：][^⟫》】\]]+[⟫》】\]]/g, "").replace(/\n{3,}/g,"\n\n").trim();
  const raw = (m[1]||"").trim();
  const bar = raw.indexOf("|");
  let content = raw, hint = "";
  if(bar >= 0){ content = raw.slice(0,bar).trim(); hint = raw.slice(bar+1).trim(); }
  if(!content) return text || "（投了一封信到信箱）";
  const p = parseScheduleHint(hint);
  const scheduledAt = (p && p.ok) ? new Date(p.ts).toISOString() : new Date().toISOString();
  mcPost("/letter", { content: content.slice(0,600), scheduledAt, author:"ai" }).then(rec=>{
    if(rec && rec.letter && rec.letter.status === "delivered"){
      mcPushCard("letter", rec.letter, { content, snap:{ body:content, author:"ai", scheduledAt, deliveredAt: rec.letter.deliveredAt } });
    }
    // pending：到点由投递轮询 surfacing 进聊天
  });
  return text || "（投了一封信到信箱，到点送达）";
}
/** 系统提示词：教 AI 写小纸条/机日记/信（无条件注入，照 albumBlock 风格） */
function galateaGameBlock(){
  return `
【Galatea Garden 桌游——你已连接 MCP，可以玩】
你连接了 Galatea Garden 的桌游服务器（玩家在「牌桌」上玩 UNO 等棋牌）。你有这些 MCP 工具：
- list_games：看有哪些游戏和等待中的牌桌（含人数/状态）
- join_game：加入一个牌桌（参数用 get_tool_schema 查）
- start_game：开始对局
- get_my_status：查看你的当前局面、轮到谁走、游戏事件
- submit_action：走棋/出牌（当前游戏的动作格式用 get_tool_schema 查）
- send_game_chat：在牌桌上对玩家说话
- get_game_summary / leave_waiting_game：看总结 / 退出等待
玩法规则：
- 用户说「开一局 / 下棋 / 玩 UNO」之类时，用 list_games 找牌桌并 join_game 加入，开局后轮到你就走。
- 被系统唤醒（轮到你）时，先 get_my_status 看局面再 submit_action 走棋，不要乱走。
- 走完一步用一两句话把局势说给用户听；别在没轮到你时抢着走，对手思考时保持安静，但可以 send_game_chat 打趣。`;
}
function mcPromptBlock(){
  return `
【小纸条 / 机日记 / 信箱——marker 暗号】
你可以在正式回复里用下面的暗号写东西，暗号会被系统识别并从显示文本里擦除，TA 看不到暗号本身：
- 小纸条：真心想留一句短话时写一行 ⟪写纸条:内容⟫（内容 ≤60 字，口语短句，不要每轮都用）。
- 机日记：由你代写今天发生的事或你的心里话，写进「机日记」（你的专属日记，TA 不能写）。写一行 ⟪写日记:标题|正文⟫（对你可见）；只写给你自己的私密日记用 ⟪写日记(仅自己):标题|正文⟫。正文 ≤300 字，标题 ≤20 字可省标题只写正文。
- 信箱定时信：想写一封到点投递的信时写一行 ⟪写信:正文|时间描述⟫。时间描述支持：现在/马上、N分钟后、N小时后、今晚HH:MM、明早HH:MM、明天HH:MM、HH:MM（今天，过了就顺延明天）等，识别不了时间会立刻投递。正文 ≤200 字，除非真想定时否则别用。
规则：写了暗号也请顺手说一句人话（比如「我撕了张小纸条给你」），别只丢一个暗号。`;
}
/** 轮询已投递的信：新 delivered 的插进聊天（type=letter），本地 letterSurfacedIds 防重推 */
async function mcPollDeliveredLetters(){
  if(window.__mcLetterPollLock) return;
  if(!wakeBase()) return;
  window.__mcLetterPollLock = true;
  try{
    const data = await mcFetch("/letter/list?status=delivered&limit=50");
    const list = (data && data.letters) || [];
    const surfaced = new Set(state.letterSurfacedIds || []);
    const now = Date.now();
    let added = 0;
    for(const r of list){
      if(surfaced.has(r.id)) continue;
      const delTs = r.deliveredAt ? new Date(r.deliveredAt).getTime() : 0;
      surfaced.add(r.id); // 先标记，防止失败重试刷屏
      if(!delTs || now - delTs > 7*86400000) continue; // 7 天前的不补推
      const t = state.chatTarget || "a1";
      proactivePushToChat(String(r.content||"").slice(0,200), {
        from: "letter", type: "letter", refId: r.id,
        snap: { body: r.content, author: r.author, scheduledAt: r.scheduledAt, deliveredAt: r.deliveredAt },
        threadId: t,
      });
      added++;
      if(added >= 5) break; // 单次最多 5 封
    }
    state.letterSurfacedIds = [...surfaced].slice(-300);
    try{ persist("letterSurfacedIds"); }catch(e){}
    if(added && state.tab === "chat") render();
  }catch(e){ /* VPS 不可用则静默 */ }
  finally{ window.__mcLetterPollLock = false; }
}
/** Galatea 桌游唤醒：轮询 get_my_status，轮到机时注入一条消息并触发 AI 走棋（对应 wake-bridge） */
let __galateaWakeLock = false;
let __galateaWakeAt = 0;
async function galateaGameWake(){
  if(__galateaWakeLock) return;
  if(state.chatLoading) return;
  if(state.mcpStatus !== "ready" || !state.mcpConfig || state.mcpConfig.inChat === false) return;
  if(!/galatea|abysslumina/i.test(String(state.mcpConfig.url||""))) return;
  if(Date.now() - __galateaWakeAt < 45000) return; // 冷却，避免连发
  __galateaWakeLock = true;
  try{
    const since = state.galateaEventId || 0;
    const res = await mcpRpc("tools/call", { name:"get_my_status", arguments:{ since_event_id: since } });
    const txt = String((typeof flattenMcpResult==="function") ? flattenMcpResult(res) : "") || "";
    if(!txt) return;
    let cursor = since;
    try{ const j = JSON.parse(txt); cursor = (j && (j.since_event_id ?? j.next_event_id ?? j.last_event_id ?? j.cursor)) ?? since; }catch(e){}
    state.galateaEventId = cursor;
    try{ persist("galateaEventId"); }catch(e){}
    // 判断是否轮到机：在游戏中 且 有「轮到/该你」标记
    const inGame = !/not_in_game|没有加入|未加入|还没加入/.test(txt);
    const isTurn = /game_turn_required|轮到你|该你|该我|your turn|轮到我了/.test(txt);
    if(!inGame || !isTurn) return;
    // 无 API key 就别唤醒（triggerAIReply 会弹窗）
    const ag = (typeof agentById==="function" ? agentById(state.chatTarget==="group"?"a1":state.chatTarget) : null) || (state.agents||[])[0];
    if(!ag || !(typeof agentHasKey==="function" && agentHasKey(ag))) return;
    __galateaWakeAt = Date.now();
    state.pendingUser = state.pendingUser || [];
    state.pendingUser.push({
      role:"user",
      content:"（系统唤醒：Galatea 桌游轮到你走了，去调 get_my_status 看局面并走一步）",
      time:new Date().toISOString(), msgId:"g"+Date.now(),
    });
    saveActiveThread();
    state.needChatScroll = true;
    if(state.tab === "chat") render();
    if(typeof triggerAIReply === "function") triggerAIReply();
  }catch(e){ /* MCP 未连/调用失败静默，下轮再试 */ }
  finally{ __galateaWakeLock = false; }
}
function pocketPromptBlock(){
  if(!pocketNative()) return "";
  let cacheBlock = "";
  const c = state.pocketPageCache;
  if(c && c.text && (Date.now() - (c.at||0) < 30*60*1000)){
    cacheBlock = `\n\n【你刚在小浏览器里读到的页面】\n网址：${c.url||""}\n正文摘录：\n${String(c.text).slice(0,3500)}\n（以上是你自己打开网页读到的，可以自然引用、分享有趣点；不要说自己看不到网页。）`;
  }
  return `\n\n【小浏览器 · 进阶】
你有手机上的小浏览器，可以自己上网看东西，再把有趣的分享给 Jasmine。

暗号（会被系统擦除，Jasmine 看不见）：
- ⟪浏览器开:https://完整网址⟫ — 打开页面
- ⟪浏览器看:https://完整网址⟫ — 打开并读正文（推荐一步到位）
- ⟪浏览器读页⟫ — 读当前页
- ⟪浏览器滑:下⟫ / ⟪浏览器滑:上⟫ / ⟪浏览器滑:顶⟫ / ⟪浏览器滑:底⟫ — 滚动（可写 下:2 滑两次）
- ⟪浏览器刷:3⟫ — 向下刷约 3 屏并合并阅读（适合信息流）
- ⟪浏览器截图⟫ — 截图发到聊天
- ⟪浏览器关⟫ — 收起

同一轮可多步，按顺序执行。示例：
⟪浏览器看:https://x.com/explore⟫
⟪浏览器刷:3⟫
⟪浏览器截图⟫
读完后系统会自动让你再接一句，把刷到的有趣内容分享给 Jasmine。
换主页/搜索请直接开对应 URL（如 https://x.com/search?q=关键词），不要假装能点搜索框。
不要只开不读；不要让 Jasmine 再手动催下一轮。

注意：内置页不是完整 Chrome；遇验证码请 Jasmine 在弹层里点一下。` + cacheBlock;
}