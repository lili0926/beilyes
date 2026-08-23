/* === 70_core_rest.js === extracted from monolith; edit here then: python3 frontend/build.py */


async function setupCapacitorPush(){
  const Cap = window.Capacitor;
  if(!Cap || typeof Cap.isNativePlatform !== "function" || !Cap.isNativePlatform()) return;
  let Push, AppPlug;
  try{
    Push = Cap.Plugins && Cap.Plugins.PushNotifications;
    AppPlug = Cap.Plugins && Cap.Plugins.App;
  }catch(e){ return; }
  if(!Push) return;

  const pullNow = ()=>{
    try{ if(typeof deliverWakePull === "function") deliverWakePull(); }catch(e){}
    try{
      const cfg = state.proactiveConfig || {};
      if(!(cfg.enabled && cfg.baseUrl)) return;
      const base = String(cfg.baseUrl||"").replace(/\/$/,"");
      const headers = { "Accept": "application/json" };
      if(cfg.token) headers["X-Auth-Token"] = cfg.token;
      fetch(base + "/proactive/pull", { headers })
        .then(r=>r.ok?r.json():null)
        .then(data=>{
          if(!data) return;
          const list = data.messages || data.data || (Array.isArray(data)?data:[]);
          list.forEach(m=>{
            const content = m.content || m.text || "";
            if(content && typeof proactivePushToChat === "function")
              proactivePushToChat(content, { from: "push" });
          });
          if(list.length && state.tab==="chat") render();
        }).catch(()=>{});
    }catch(e){}
  };

  try{
    let perm = await Push.checkPermissions();
    if(perm.receive !== "granted"){
      perm = await Push.requestPermissions();
    }
    if(perm.receive !== "granted"){
      console.warn("[push] notification permission not granted");
      return;
    }
    await Push.register();
  }catch(e){
    console.warn("[push] register fail", e);
    return;
  }

  try{
    await Push.addListener("registration", async (token)=>{
      const t = (token && (token.value || token.token)) || "";
      if(!t) return;
      try{ if(typeof LS!=="undefined") LS.set("fcmToken", t); }catch(e){}
      const base = (typeof wakeBase === "function" ? wakeBase() : "") || "";
      if(!base) return;
      const headers = { "Content-Type": "application/json", "Accept": "application/json" };
      const auth = (typeof wakeToken === "function" ? wakeToken() : "") || "";
      if(auth) headers["X-Auth-Token"] = auth;
      try{
        await fetch(base + "/device/register", {
          method: "POST",
          headers,
          body: JSON.stringify({
            token: t,
            platform: "android",
            user_id: "default",
            time: new Date().toISOString(),
          }),
        });
      }catch(e){ /* offline ok */ }
    });
    await Push.addListener("registrationError", (err)=>{
      console.warn("[push] registrationError", err);
    });
    await Push.addListener("pushNotificationActionPerformed", ()=>{ pullNow(); });
    // 部分机型前台收到推送
    await Push.addListener("pushNotificationReceived", ()=>{ /* 仅展示系统通知即可 */ });
  }catch(e){
    console.warn("[push] listeners fail", e);
  }

  if(AppPlug && AppPlug.addListener){
    try{
      await AppPlug.addListener("appStateChange", (st)=>{
        if(st && st.isActive){
          pullNow();
          if(typeof bgGenPollResult === "function") bgGenPollResult().catch(()=>{});
        }
      });
    }catch(e){}
  }
}
if(!window.__pushBoot){
  window.__pushBoot = true;
  setTimeout(()=>{ setupCapacitorPush().catch(()=>{}); }, 1500);
}
// 备份提醒：启动检查一次 + 每小时复查
try{ if(typeof backupRemindInit === "function") backupRemindInit(); }catch(e){}
// 安卓后台生成：切后台时提交任务，回前台时拉结果；前台每 30s 兜底拉一次
try{
  document.addEventListener("visibilitychange", ()=>{
    if(document.hidden){ if(typeof bgGenSubmit === "function") bgGenSubmit().catch(()=>{}); }
    else { if(typeof bgGenPollResult === "function") bgGenPollResult().catch(()=>{}); }
  });
  setInterval(()=>{
    try{ if(document.visibilityState !== "hidden" && typeof bgGenPollResult === "function") bgGenPollResult().catch(()=>{}); }catch(e){}
  }, 30000);
}catch(e){}

// ─── 诊断：JS 报错时顶部显示小角标（便于反馈）────────────────────────────
(function(){
  let badge = document.getElementById("err-badge");
  if(!badge){
    badge = document.createElement("div");
    badge.id = "err-badge";
    badge.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#c33;color:#fff;font-size:10px;padding:3px 8px;white-space:pre-wrap;word-break:break-all;display:none";
    document.body.appendChild(badge);
  }
  const show = m => {
    badge.textContent = String(m||"").slice(0,300);
    badge.style.display = "block";
    setTimeout(()=>{ badge.style.display = "none"; }, 8000);
  };
  window.addEventListener("error", e=> show("JS: " + ((e && (e.message || e.error)) || "unknown")));
  window.addEventListener("unhandledrejection", e=> {
    const r = e && e.reason;
    show("REJ: " + ((r && (r.message || r)) || "unknown"));
  });
})();
  