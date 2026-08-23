/* === 10_core_boot.js === extracted from monolith; edit here then: python3 frontend/build.py */

// ═══════════════ 开屏 & 登录逻辑 ═══════════════
(function(){
  // ── 账号系统 ──
  // 所有 localStorage key 加前缀隔离不同账号数据
  const AUTH_KEY = "__app_auth__";

  function getAccounts(){
    try{ return JSON.parse(localStorage.getItem(AUTH_KEY)||"{}"); }catch{ return {}; }
  }
  function saveAccounts(obj){ localStorage.setItem(AUTH_KEY, JSON.stringify(obj)); }

  function hashPin(pin){
    // 简单哈希，不追求密码学安全，只为防止肉眼直接看到
    let h=0;
    for(let i=0;i<pin.length;i++){ h=(Math.imul(31,h)+pin.charCodeAt(i))|0; }
    return h.toString(16);
  }

  window.__currentUser = null; // 当前登录的用户名

  function switchUser(username){
    window.__currentUser = username;
    // 记住上次登录的账号，下次直接跳登录界面预填
    localStorage.setItem("__last_user__", username);
    // 重写 LS，所有读写都加用户前缀
    const prefix = "u_" + username + "_";
    window.__LS_PREFIX = prefix;
  }

  window.doLogin = function(){
    const uInput = document.getElementById("login-username");
    const pInput = document.getElementById("login-pin");
    const errEl  = document.getElementById("login-err");
    const u = (uInput.value||"").trim();
    const p = (pInput.value||"").trim();
    if(!u){ errEl.textContent="账号不能为空"; return; }
    if(!p){ errEl.textContent="PIN 不能为空"; return; }

    const accounts = getAccounts();
    const hashed = hashPin(p);
    if(accounts[u]){
      // 已有账号 → 验证
      if(accounts[u].pin !== hashed){
        errEl.textContent="PIN 错误";
        pInput.value="";
        return;
      }
    } else {
      // 新账号 → 注册
      accounts[u] = { pin: hashed, createdAt: Date.now() };
      saveAccounts(accounts);
    }

    errEl.textContent="";
    switchUser(u);
    document.getElementById("login-screen").style.display="none";
    // 重新初始化 LS（已切换 prefix），重新加载 state
    reinitState();
  };

  // 检查是否已登录（同次打开 session 内不再重复登录）
  // 用 localStorage 记登录态：APK 杀进程后 sessionStorage 会丢，导致前缀变空、聊天读错库
  const sessionUser = localStorage.getItem("__session_user__") || sessionStorage.getItem("__session_user__") || "";
  if(sessionUser){
    switchUser(sessionUser);
    try{ sessionStorage.setItem("__session_user__", sessionUser); }catch(e){}
  } else {
    const lastUser = localStorage.getItem("__last_user__")||"";
    document.getElementById("login-username").value = lastUser;
  }

  // ── 开屏逻辑 ──
  const splash = document.getElementById("splash-screen");
  let splashDone = false;
  // 开屏文案/背景会在 state 就绪后由 applyBrandingToDom 刷新

  function dismissSplash(){
    if(splashDone) return;
    splashDone = true;
    splash.style.opacity = "0";
    splash.style.transform = "scale(1.04)";
    setTimeout(()=>{
      splash.style.display = "none";
      // 如果未登录，显示登录界面
      if(!window.__currentUser){
        const loginEl = document.getElementById("login-screen");
        loginEl.style.display = "flex";
        // 聚焦到 PIN（如果账号已预填）
        const uVal = document.getElementById("login-username").value;
        if(uVal) setTimeout(()=>document.getElementById("login-pin").focus(), 100);
        else setTimeout(()=>document.getElementById("login-username").focus(), 100);
      }
    }, 650);
  }

  // 点击任意地方关闭开屏
  splash.addEventListener("click", dismissSplash);
  splash.addEventListener("touchend", function(e){ e.preventDefault(); dismissSplash(); });
  // 2.5秒后自动关闭（以防不点）
  setTimeout(dismissSplash, 2500);

  // PIN 输入框 Enter 键触发登录
  document.getElementById("login-pin").addEventListener("keydown", function(e){
    if(e.key==="Enter") doLogin();
  });
  document.getElementById("login-username").addEventListener("keydown", function(e){
    if(e.key==="Enter") document.getElementById("login-pin").focus();
  });

  // ── LS 前缀代理 ──
  // 在 LS 定义之前先设置一个全局变量，LS 会读这个
  window.__LS_PREFIX = sessionUser ? "u_"+sessionUser+"_" : "";

  // 设置 session，这样刷新页面不用重新登录
  if(sessionUser){
    // 已有 session，不做任何事
  }
  // doLogin 成功后会设 session
  const origDoLogin = window.doLogin;
  window.doLogin = function(){
    const u = (document.getElementById("login-username").value||"").trim();
    origDoLogin();
    if(window.__currentUser === u){
      try{ sessionStorage.setItem("__session_user__", u); }catch(e){}
      try{ localStorage.setItem("__session_user__", u); }catch(e){}
    }
  };

})();

// reinitState 在 state 定义后重写
window.reinitState = function(){};

// ─── 莫兰迪色系 ──────────────────────────────────────────────────────────────
const THEMES = {
  // 暖粉 / 温馨
  "桃气浅春": { bg:"#F5EEE8",card:"#FDF8F5",accent:"#D4A5A5",accent2:"#E8C5B5",text:"#5A4A4A",sub:"#9A8A8A",border:"#EDD8D0",bubble_me:"#D4A5A5",bubble_them:"#FFFFFF" },
  "软糖暮色": { bg:"#F7EFEA",card:"#FDF9F6",accent:"#C9958A",accent2:"#E2C4B8",text:"#5C4540",sub:"#9A7F78",border:"#E8D5CC",bubble_me:"#C9958A",bubble_them:"#FFFFFF" },
  "蜜桃牛乳": { bg:"#F8F0EC",card:"#FEFAF8",accent:"#E0A8A0",accent2:"#F0D0C8",text:"#5A4038",sub:"#A08078",border:"#F0DED8",bubble_me:"#E0A8A0",bubble_them:"#FFFFFF" },
  "珊瑚暖床": { bg:"#F6EDE8",card:"#FCF7F4",accent:"#D4A090",accent2:"#E8C8B8",text:"#5A443C",sub:"#987868",border:"#EAD8D0",bubble_me:"#D4A090",bubble_them:"#FFFFFF" },
  // 暖黄 / 杏色
  "杏林朝露": { bg:"#F5F0E8",card:"#FAF7F2",accent:"#C4AA85",accent2:"#D8C8A8",text:"#4A3D2A",sub:"#8A7A5A",border:"#DCCFB5",bubble_me:"#C4AA85",bubble_them:"#FFFFFF" },
  "柠檬奶芙": { bg:"#F7F4E8",card:"#FCFAF4",accent:"#C8B878",accent2:"#E0D8A8",text:"#4A4530",sub:"#8A8460",border:"#E4DCC0",bubble_me:"#C8B878",bubble_them:"#FFFFFF" },
  "蜂蜜下午茶": { bg:"#F6F1E4",card:"#FBF8F0",accent:"#C9A86C",accent2:"#E0C898",text:"#4A3E28",sub:"#8A7850",border:"#E4D8B8",bubble_me:"#C9A86C",bubble_them:"#FFFFFF" },
  "奶油麦穗": { bg:"#F5F2EA",card:"#FAF8F3",accent:"#B8A888",accent2:"#D4C8A8",text:"#4A4434",sub:"#8A8070",border:"#E0D8C4",bubble_me:"#B8A888",bubble_them:"#FFFFFF" },
  // 绿系
  "芦汀初雪": { bg:"#EEF2EE",card:"#F6F9F6",accent:"#8FA88F",accent2:"#B5C9B5",text:"#3A4A3A",sub:"#7A8A7A",border:"#C8D8C8",bubble_me:"#8FA88F",bubble_them:"#FFFFFF" },
  "抹茶拿铁": { bg:"#EFF2EA",card:"#F7F9F4",accent:"#9AAD88",accent2:"#C0D0B0",text:"#3A4A32",sub:"#7A8A6A",border:"#D0DCC4",bubble_me:"#9AAD88",bubble_them:"#FFFFFF" },
  "青苔雨后": { bg:"#EAF0EC",card:"#F4F8F5",accent:"#7A9A8A",accent2:"#A8C4B4",text:"#2E4038",sub:"#6A8070",border:"#C4D8CC",bubble_me:"#7A9A8A",bubble_them:"#FFFFFF" },
  "橄榄晨光": { bg:"#F0F1E8",card:"#F7F8F2",accent:"#A0A878",accent2:"#C8CCB0",text:"#3E4230",sub:"#7A8060",border:"#D4D8C0",bubble_me:"#A0A878",bubble_them:"#FFFFFF" },
  // 蓝系
  "梅雨夜":   { bg:"#EEF0F5",card:"#F5F6FA",accent:"#8A9AB5",accent2:"#B0BFCF",text:"#3A3D4A",sub:"#7A7D8A",border:"#C8CDD8",bubble_me:"#8A9AB5",bubble_them:"#FFFFFF" },
  "雾蓝信笺": { bg:"#ECF0F4",card:"#F5F8FA",accent:"#8AA0B8",accent2:"#B4C8D8",text:"#343C48",sub:"#708090",border:"#C8D4E0",bubble_me:"#8AA0B8",bubble_them:"#FFFFFF" },
  "晴空棉被": { bg:"#EAF2F5",card:"#F4F9FB",accent:"#7AA8B8",accent2:"#A8CCD8",text:"#2E4048",sub:"#688088",border:"#C0D8E0",bubble_me:"#7AA8B8",bubble_them:"#FFFFFF" },
  "靛蓝灯影": { bg:"#EBEFF3",card:"#F4F7FA",accent:"#7A8FA8",accent2:"#A8B8C8",text:"#323844",sub:"#687888",border:"#C4CED8",bubble_me:"#7A8FA8",bubble_them:"#FFFFFF" },
  // 素 / 中性温馨
  "远山素影": { bg:"#EFEFEF",card:"#F8F8F8",accent:"#A0A8B0",accent2:"#C0C8D0",text:"#3A3A3A",sub:"#8A8A8A",border:"#D0D0D8",bubble_me:"#A0A8B0",bubble_them:"#FFFFFF" },
  "燕麦拿铁": { bg:"#F2EFEA",card:"#F9F7F3",accent:"#B0A090",accent2:"#D0C4B4",text:"#4A4038",sub:"#8A8070",border:"#DED4C8",bubble_me:"#B0A090",bubble_them:"#FFFFFF" },
  "月光丝绸": { bg:"#F0EEF2",card:"#F8F7FA",accent:"#A898B0",accent2:"#C8BCD0",text:"#3E3848",sub:"#7A7088",border:"#D8D0E0",bubble_me:"#A898B0",bubble_them:"#FFFFFF" },
  // 纯黑 / 纯白 外观格式（2026-08-18）
  "夜间纯黑": { bg:"#000000",card:"#171717",accent:"#8A8A9A",accent2:"#2A2A35",text:"#E8E8E8",sub:"#8A8A8A",border:"#2A2A2A",bubble_me:"#2E2E2E",bubble_them:"#1B1B1B" },
  "日间纯白": { bg:"#FFFFFF",card:"#FAFAFA",accent:"#A8A8B0",accent2:"#E8E8EE",text:"#1A1A1A",sub:"#888888",border:"#E5E5E5",bubble_me:"#F0F0F0",bubble_them:"#FFFFFF" },
};
// ── 用户提供的新色卡（2026-08-16）按角色映射进 THEMES：text/accent/accent2/bg/card 取色，border/sub 混合派生 ──
function __themeMix(a, b, p){
  const hex=h=>{ let x=h.replace("#",""); if(x.length===3)x=x.split("").map(c=>c+c).join(""); return [parseInt(x.slice(0,2),16),parseInt(x.slice(2,4),16),parseInt(x.slice(4,6),16)]; };
  const ca=hex(a), cb=hex(b);
  return "#"+ca.map((v,i)=>Math.round(v+(cb[i]-v)*p).toString(16).padStart(2,"0")).join("");
}
// 单色 → 完整主题：颜色作主色(accent)，其余字段由它淡/深派生，保证可读
function __themeFromAccent(hex){
  const text = __themeMix(hex, "#20201F", 0.62); // 往近黑靠，正文可读
  return {
    name: hex, // 名字即色号（长按/悬浮显示）
    accent: hex,
    accent2: __themeMix(hex, "#FFFFFF", 0.55),
    bg: __themeMix(hex, "#FFFFFF", 0.90),
    card: __themeMix(hex, "#FFFFFF", 0.95),
    border: __themeMix(hex, "#FFFFFF", 0.78),
    text,
    sub: __themeMix(text, "#FFFFFF", 0.40),
    bubble_me: hex,
    bubble_them: __themeMix(hex, "#FFFFFF", 0.95),
  };
}
// 用户提供的 50 个颜色，按色系分组，每个颜色一个可独立切换的主题
const COLOR_GROUPS = [
  { label:"粉红", colors:["#A45668","#D59BA8","#F0D9E4","#C1A0AC","#DDA4B4","#FFD3D4"] },
  { label:"紫", colors:["#4A3F4B","#806C79"] },
  { label:"暖黄 · 杏棕", colors:["#7E6554","#A78A73","#D4B79D","#E9D6BE","#7C5549","#775C56","#685049","#594842"] },
  { label:"绿 · 青", colors:["#2E6A67","#5E8C87","#A9C8BE","#D7E6DB","#4A6460","#7A9387","#BFD0B8","#DDE6D6","#D5EBE4","#B7C0AF","#DEE9DC"] },
  { label:"蓝", colors:["#607E95","#A8C3D6","#78A5CE","#C7D3DB","#C7CED6"] },
  { label:"素 · 米", colors:["#F1F0E8","#C7C1B5","#E7DDD3","#F5F0EA","#F3F1E6","#F5EEE4","#B8AEA6","#E2D0BC","#F3EEE8","#A79A8A","#FCF7DF","#FFF0D9","#F8F4E8","#F6EDDD","#7F7B7F","#DBD9D9"] },
  { label:"深色", colors:["#16131F","#3E3630"] },
];
COLOR_GROUPS.forEach(g=>{
  g.themes = g.colors.map(hex=>{
    const key = "c_"+hex.replace("#","");
    THEMES[key] = __themeFromAccent(hex);
    return key;
  });
});
const PATTERNS = {
  // ── 素底 ──
  "素色": "none",
  // ── 编织感 ──
  "斜纹布":    `repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.035) 6px, rgba(0,0,0,0.035) 7px)`,
  "灯芯绒":    `repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(0,0,0,0.045) 5px, rgba(0,0,0,0.045) 7px)`,
  "麻布粗织":  `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.028) 2px, rgba(0,0,0,0.028) 3px), repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.022) 3px, rgba(0,0,0,0.022) 4px)`,
  "人字呢":    `repeating-linear-gradient(60deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 5px), repeating-linear-gradient(-60deg, transparent, transparent 4px, rgba(0,0,0,0.025) 4px, rgba(0,0,0,0.025) 5px), repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(0,0,0,0.015) 8px, rgba(0,0,0,0.015) 9px)`,
  "苏格兰格":  `repeating-linear-gradient(0deg, transparent 0 10px, rgba(0,0,0,0.05) 10px 11px, transparent 11px 21px, rgba(0,0,0,0.02) 21px 22px), repeating-linear-gradient(90deg, transparent 0 10px, rgba(0,0,0,0.05) 10px 11px, transparent 11px 21px, rgba(0,0,0,0.02) 21px 22px)`,
  // ── 几何 ──
  "小千鸟":    `repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,0.04) 6px 7px), repeating-linear-gradient(-45deg, transparent 0 6px, rgba(0,0,0,0.04) 6px 7px)`,
  "菱格绗缝":  `repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(0,0,0,0.04) 12px, rgba(0,0,0,0.04) 13px), repeating-linear-gradient(-45deg, transparent, transparent 12px, rgba(0,0,0,0.04) 12px, rgba(0,0,0,0.04) 13px), repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,0.015) 6px 7px, transparent 7px 12px)`,
  "六边形":    `repeating-linear-gradient(60deg, transparent, transparent 9px, rgba(0,0,0,0.04) 9px, rgba(0,0,0,0.04) 10px), repeating-linear-gradient(-60deg, transparent, transparent 9px, rgba(0,0,0,0.04) 9px, rgba(0,0,0,0.04) 10px), repeating-linear-gradient(0deg, transparent, transparent 16px, rgba(0,0,0,0.02) 16px, rgba(0,0,0,0.02) 17px)`,
  // ── 点状 ──
  "珍珠波点":  `radial-gradient(circle, rgba(0,0,0,0.07) 1.5px, transparent 1.5px)`,
  "碎花点":    `radial-gradient(circle at 25% 35%, rgba(0,0,0,0.055) 1.2px, transparent 1.2px), radial-gradient(circle at 72% 68%, rgba(0,0,0,0.04) 1.8px, transparent 1.8px), radial-gradient(circle at 55% 15%, rgba(0,0,0,0.035) 1px, transparent 1px)`,
  // ── 蕾丝 ──
  "网眼蕾丝":  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cpath d='M14 2 L16.5 9.5 L24 9.5 L18 14.2 L20.2 22 L14 17.8 L7.8 22 L10 14.2 L4 9.5 L11.5 9.5 Z' fill='none' stroke='rgba(0,0,0,0.09)' stroke-width='0.7'/%3E%3Ccircle cx='14' cy='14' r='3.2' fill='none' stroke='rgba(0,0,0,0.06)' stroke-width='0.6'/%3E%3Ccircle cx='14' cy='14' r='1.1' fill='rgba(0,0,0,0.05)'/%3E%3C/svg%3E")`,
  "玫瑰蕾丝":  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M24 10c-2 4-6 6-6 10a6 6 0 0012 0c0-4-4-6-6-10z' fill='none' stroke='rgba(0,0,0,0.08)' stroke-width='0.9'/%3E%3Cpath d='M24 16c-1.2 2.2-3.5 3.2-3.5 5.5a3.5 3.5 0 007 0c0-2.3-2.3-3.3-3.5-5.5z' fill='none' stroke='rgba(0,0,0,0.07)' stroke-width='0.7'/%3E%3Ccircle cx='24' cy='22' r='1.4' fill='rgba(0,0,0,0.06)'/%3E%3Cpath d='M24 28c3 2 5 5 4 8M24 28c-3 2-5 5-4 8M18 20c-4 1-7 4-6 7M30 20c4 1 7 4 6 7' fill='none' stroke='rgba(0,0,0,0.05)' stroke-width='0.6' stroke-linecap='round'/%3E%3C/svg%3E")`,
  "扇形蕾丝":  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='24' viewBox='0 0 40 24'%3E%3Cpath d='M0 20 Q10 4 20 20 Q30 4 40 20' fill='none' stroke='rgba(0,0,0,0.09)' stroke-width='0.8'/%3E%3Cpath d='M4 20 Q12 8 20 20 Q28 8 36 20' fill='none' stroke='rgba(0,0,0,0.06)' stroke-width='0.6'/%3E%3Cpath d='M8 20 Q14 12 20 20 Q26 12 32 20' fill='none' stroke='rgba(0,0,0,0.05)' stroke-width='0.5'/%3E%3Ccircle cx='20' cy='18' r='1.2' fill='rgba(0,0,0,0.07)'/%3E%3Ccircle cx='10' cy='19' r='0.8' fill='rgba(0,0,0,0.05)'/%3E%3Ccircle cx='30' cy='19' r='0.8' fill='rgba(0,0,0,0.05)'/%3E%3C/svg%3E")`,
  "镂空蕾丝":  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='10' fill='none' stroke='rgba(0,0,0,0.07)' stroke-width='0.7'/%3E%3Ccircle cx='16' cy='16' r='6' fill='none' stroke='rgba(0,0,0,0.06)' stroke-width='0.6'/%3E%3Cpath d='M16 6 L16 26 M6 16 L26 16 M9.5 9.5 L22.5 22.5 M22.5 9.5 L9.5 22.5' stroke='rgba(0,0,0,0.05)' stroke-width='0.5'/%3E%3Ccircle cx='16' cy='6' r='1.3' fill='none' stroke='rgba(0,0,0,0.08)' stroke-width='0.5'/%3E%3Ccircle cx='16' cy='26' r='1.3' fill='none' stroke='rgba(0,0,0,0.08)' stroke-width='0.5'/%3E%3Ccircle cx='6' cy='16' r='1.3' fill='none' stroke='rgba(0,0,0,0.08)' stroke-width='0.5'/%3E%3Ccircle cx='26' cy='16' r='1.3' fill='none' stroke='rgba(0,0,0,0.08)' stroke-width='0.5'/%3E%3C/svg%3E")`,
  "花边蕾丝":  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cpath d='M18 4c2 3 6 4 6 8s-4 5-6 8c-2-3-6-4-6-8s4-5 6-8z' fill='none' stroke='rgba(0,0,0,0.08)' stroke-width='0.75'/%3E%3Cpath d='M4 18c3-2 4-6 8-6s5 4 8 6c-3 2-4 6-8 6s-5-4-8-6z' fill='none' stroke='rgba(0,0,0,0.07)' stroke-width='0.7'/%3E%3Cpath d='M18 14c1 1.5 3 2 3 4s-2 2.5-3 4c-1-1.5-3-2-3-4s2-2.5 3-4z' fill='none' stroke='rgba(0,0,0,0.06)' stroke-width='0.55'/%3E%3Ccircle cx='18' cy='18' r='1.6' fill='rgba(0,0,0,0.06)'/%3E%3Ccircle cx='18' cy='8' r='0.9' fill='rgba(0,0,0,0.05)'/%3E%3Ccircle cx='8' cy='18' r='0.9' fill='rgba(0,0,0,0.05)'/%3E%3Ccircle cx='28' cy='18' r='0.9' fill='rgba(0,0,0,0.05)'/%3E%3Ccircle cx='18' cy='28' r='0.9' fill='rgba(0,0,0,0.05)'/%3E%3C/svg%3E")`,
  // ── 光感 ──
  "丝绸光泽":  `linear-gradient(105deg, rgba(255,255,255,0.4) 0%, transparent 45%, rgba(255,255,255,0.15) 60%, transparent 80%), repeating-linear-gradient(105deg, transparent, transparent 12px, rgba(255,255,255,0.08) 12px, rgba(255,255,255,0.08) 14px)`,
  "晨光晕染":  `radial-gradient(ellipse at 20% 15%, rgba(255,255,255,0.45) 0%, transparent 50%), linear-gradient(160deg, rgba(255,255,255,0.2) 0%, transparent 45%, rgba(0,0,0,0.025) 100%)`,
  "纸感噪点":  `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
  "羊皮纸":    `url("data:image/svg+xml,%3Csvg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)' opacity='0.055'/%3E%3C/svg%3E"), linear-gradient(160deg, rgba(255,255,255,0.12) 0%, transparent 60%)`,
};
const PATTERN_SIZES = {
  "素色":"auto",
  "斜纹布":"auto", "灯芯绒":"auto", "麻布粗织":"auto", "人字呢":"auto",
  "苏格兰格":"auto", "小千鸟":"auto", "菱格绗缝":"auto", "六边形":"auto",
  "珍珠波点":"20px 20px", "碎花点":"32px 32px",
  "网眼蕾丝":"28px 28px", "玫瑰蕾丝":"48px 48px", "扇形蕾丝":"40px 24px",
  "镂空蕾丝":"32px 32px", "花边蕾丝":"36px 36px",
  "丝绸光泽":"auto", "晨光晕染":"auto", "纸感噪点":"180px 180px", "羊皮纸":"220px 220px",
};
const LAYER_COLORS = { core:"#D4A5A5",diary:"#A5B8D4",daily:"#A5D4B8",handoff:"#D4CCA5",plans:"#C4A5D4" };
const LAYER_LABELS = { core:"核心",diary:"日记",daily:"日常",handoff:"待办",plans:"计划" };
/* 气泡渐变色卡（4 组，每组白→浅色A→浅色B）；me 用 135° 三色、them 用 315° 镜像 */
const BUBBLE_GRADS = [
  { c1:"#FFFFFF", c2:"#FFF2C9", c3:"#CBD7EF" }, // ① 暖阳 白→浅黄→浅蓝
  { c1:"#FFFFFF", c2:"#E8FFC9", c3:"#E2CBFE" }, // ② 春芽 白→浅绿→浅紫
  { c1:"#FFFFFF", c2:"#C9E0FF", c3:"#FECBCC" }, // ③ 晴空 白→浅蓝→浅粉
  { c1:"#FFFFFF", c2:"#C9FFF2", c3:"#FECBCC" }, // ④ 薄荷 白→薄荷→浅粉
];
function bubbleGrad(){
  const g = state.bubbleGrad>0 ? (BUBBLE_GRADS[state.bubbleGrad-1]||null) : null;
  return g;
}

// ─── 小狗按钮 ────────────────────────────────────────────────────────────────
const PUPPY_WARM = [
  { icon:"heart", text:"亲亲我" },
  { icon:"hand-heart", text:"抱抱我" },
  { icon:"ear", text:"揉揉耳朵" },
  { icon:"hand", text:"摸摸头" },
  { icon:"pointer", text:"挠挠下巴" },
  { icon:"paw-print", text:"揉肚皮" },
  { icon:"smile", text:"贴贴脸" },
  { icon:"heart", text:"喜欢你" },
  { icon:"hourglass", text:"想你了" },
  { icon:"hand", text:"捏捏脸" },
  { icon:"heart", text:"爱你" },
  { icon:"smile", text:"开心" },
  { icon:"moon-star", text:"一起睡觉" },
  { icon:"handshake", text:"拉拉手" },
  { icon:"pointer", text:"拍屁屁" },
  { icon:"hand", text:"捏捏手" },
  { icon:"hand-heart", text:"用脑袋蹭你的手" },
  { icon:"heart", text:"我爱你" },
  { icon:"moon", text:"早点睡" },
  { icon:"flower", text:"辛苦啦" },
  { icon:"dog", text:"摇尾巴" },
  { icon:"ear", text:"竖起耳朵听你说话" },
  { icon:"heart", text:"窝你怀里" },
  { icon:"frown", text:"委屈的盯着你" },
];
const PUPPY_NSFW = [
  { icon:"flame", text:"做" },
  { icon:"droplet", text:"摸你的穴" },
  { icon:"zap", text:"唧唧硬了" },
  { icon:"heart", text:"想舌吻" },
  { icon:"droplet", text:"舔你的穴" },
  { icon:"hand", text:"摸你的唧唧" },
  { icon:"link-2", text:"戴项圈" },
  { icon:"lock", text:"戴手铐" },
  { icon:"link", text:"戴束缚绳" },
  { icon:"paperclip", text:"戴乳夹" },
  { icon:"wind", text:"玩吸吮玩具" },
  { icon:"activity", text:"玩跳蛋" },
  { icon:"zap", text:"用力一点" },
  { icon:"pointer", text:"含住手指" },
];
function puppyActionPromptBlock(){
  const warm = PUPPY_WARM.map(b=>b.text).join("、");
  let s = `\n\n【小狗动作「按按钮」——marker 暗号】
你们之间有一套小狗动作按钮。想“按”一个时，在正式回复里写一行暗号：
[action:按钮文字]
可用按钮（温馨）：${warm}`;
  if(state.nsfwOn){
    const nsfw = PUPPY_NSFW.map(b=>b.text).join("、");
    s += `\n可用按钮（NSFW）：${nsfw}`;
  }
  s += `\n规则：
- 只在氛围合适时用，别每句都按；一次回复最多 1 个。
- 暗号会被前端识别并从显示文本里擦除，渲染成爪印气泡；TA 点一下，就等于 TA 按了这个按钮，会作为一条消息发给你。
- 平时自然聊天，不要乱按。`;
  return s;
}

// ─── 表情包：store + prompt + marker 工具 ────────────────────────────────────
function getStickers(){ return Array.isArray(state.stickers)?state.stickers:[]; }
function getSticker(name){ return getStickers().find(s=>s.name===name)||null; }
function addSticker(name,url,descr){
  if(!name||!url) return {ok:false,msg:"名字和图片直链 URL 都要填"};
  const list=getStickers();
  const exist=list.find(s=>s.name===name);
  if(exist){ exist.url=url; exist.descr=descr||""; }
  else list.push({name, url, descr:descr||""});
  state.stickers=list; persist("stickers"); return {ok:true};
}
function delSticker(name){
  state.stickers=getStickers().filter(s=>s.name!==name);
  persist("stickers");
}
function stickerPromptBlock(){
  const list=getStickers();
  if(!list.length) return "";
  const text=list.map(s=>`· ${s.name}${s.descr?`：${s.descr}`:""}`).join("\n");
  return `\n\n【表情包「暗号」——marker 标记】
你们之间有表情包，氛围到位、想甩一张时，在正式回复里单独写一行暗号：
[sticker:名字]
名字要和下面完全一致；别硬塞，一条回复最多 1 个；暗号会被前端识别并从显示文本里擦除、渲染成表情图。你收到 [sticker:名字] 表示对方甩了那张表情，自然地接话。可用表情包：
${text}`;
}
function extractStickerNames(content){
  const re=/\[sticker\s*[:：]\s*([^\]\n]+?)\s*\]/g;
  const names=[]; let m;
  while((m=re.exec(String(content||"")))!==null){ const n=m[1].trim(); if(n) names.push(n); }
  return names;
}
function stickerCleanText(content){
  return String(content||"").replace(/\[sticker\s*[:：]\s*[^\]\n]+\s*\]/g,"");
}
function stickerImgHtml(name){
  const s=getSticker(name);
  if(!s||!s.url) return "";
  return `<img class="sticker-img" src="${escAttr(s.url)}" alt="${escAttr(s.name)}" title="${escAttr(s.descr||s.name)}" onclick="window.open&&window.open(this.src)" loading="lazy"/>`;
}
function sendSticker(name){
  const s=getSticker(name);
  if(!s||state.chatLoading) return;
  state.chatInput="[sticker:"+name+"]";
  if(typeof sendUserMsg==="function") sendUserMsg();
  if(state.pendingUser && state.pendingUser.length && typeof triggerAIReply==="function") triggerAIReply();
}

// ─── 桌宠：会随聊天状态变表情的像素宠物（clawd-on-desk 帧）────────────────────
const PET_SVGS = {
  idle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -25 45 45" width="500" height="500">
  <defs>
    <style>
      .breathe-anim {
        transform-origin: 7.5px 13px;
        animation: breathe 3.2s infinite ease-in-out;
      }

      .eyes-blink {
        transform-origin: 7.5px 9px;
        animation: eye-blink 4s infinite ease-in-out;
      }

      #eyes-js {
        transition: transform 0.2s ease-out;
      }

      /* Visible arm (left, facing screen) — occasional wobble */
      .arm-wobble {
        transform-box: fill-box;
        transform-origin: 100% 0%; /* Shoulder joint: body-side top */
        animation: arm-wobble 25s infinite ease-in-out;
      }

      @keyframes breathe {
        0%, 100% { transform: scale(1, 1) translate(0, 0); }
        50% { transform: scale(1.02, 0.98) translate(0, 0.5px); }
      }

      @keyframes eye-blink {
        0%, 10%, 100% { transform: scaleY(1); }
        5% { transform: scaleY(0.1); }
      }

      /* Arm wobble: 25s cycle, still ~23s, quick wave in ~1.5s near the end */
      @keyframes arm-wobble {
        0%, 91%, 97%, 100% { transform: rotate(0deg); }
        92% { transform: rotate(18deg); }
        93.5% { transform: rotate(-5deg); }
        95% { transform: rotate(14deg); }
      }
    </style>
  </defs>

  <!-- No shadow (against screen edge, no ground plane) -->

  <!-- Entire character leaning: rotate -12° around feet base (7.5, 15) -->
  <!-- Negative = counterclockwise = head tilts left toward screen = peeking pose -->
  <g transform="rotate(-12, 7.5, 15)">

    <!-- Legs (inside rotation group so they tilt with the body) -->
    <g fill="#DE886D">
      <rect x="3" y="11" width="1" height="4"/>
      <rect x="5" y="11" width="1" height="4"/>
      <rect x="9" y="11" width="1" height="4"/>
      <rect x="11" y="11" width="1" height="4"/>
    </g>

    <!-- Upper Body (JS body-shift preserved for compatibility) -->
    <g id="body-js">
      <g id="accessory-anchor" class="breathe-anim">
        <!-- Torso -->
        <rect x="2" y="6" width="11" height="7" fill="#DE886D"/>

        <!-- Left Arm (visible side, facing screen) — extended + wobble -->
        <g class="arm-wobble">
          <rect x="-1.5" y="9" width="4.5" height="2" fill="#DE886D"/>
        </g>

        <!-- Right Arm (near edge, partially hidden) — normal -->
        <rect x="13" y="9" width="2" height="2" fill="#DE886D"/>

        <!-- Eyes: JS translate wrapper + CSS blink -->
        <g id="eyes-js" fill="#000000">
          <g class="eyes-blink">
            <rect x="4" y="8" width="1" height="2"/>
            <rect x="10" y="8" width="1" height="2"/>
          </g>
        </g>
      </g>
    </g>
  </g>
</svg>`,
  happy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -25 45 45" width="500" height="500">
  <defs>
    <style>
      .breathe-anim {
        transform-origin: 7.5px 13px;
        animation: breathe 3.2s infinite ease-in-out;
      }

      /* Happy arm wave — continuous, fast, fixed pivot at shoulder */
      .arm-happy {
        transform-origin: 2px 9px; /* Shoulder joint in SVG coords, no fill-box */
        animation: arm-happy-wave 0.4s infinite alternate ease-in-out;
      }

      /* Eyes ^^ blink — mostly ^^ with occasional full blink */
      .eyes-happy-blink {
        transform-origin: 7.5px 9px;
        animation: happy-blink 3s infinite ease-in-out;
      }

      /* Pixel-Art Sparkle Animations */
      .spark-center {
        opacity: 0;
        animation: flash-center 1.5s infinite step-end;
        animation-delay: var(--delay, 0s);
      }
      .spark-outer {
        opacity: 0;
        animation: flash-outer 1.5s infinite step-end;
        animation-delay: var(--delay, 0s);
      }

      @keyframes breathe {
        0%, 100% { transform: scale(1, 1) translate(0, 0); }
        50% { transform: scale(1.02, 0.98) translate(0, 0.5px); }
      }

      /* Continuous happy waving */
      @keyframes arm-happy-wave {
        0% { transform: rotate(22deg); }
        100% { transform: rotate(-8deg); }
      }

      /* Happy blink: frequent blinks to look excited */
      @keyframes happy-blink {
        0%, 12%, 30%, 42%, 100% { transform: scaleY(1); }
        6% { transform: scaleY(0.1); }
        36% { transform: scaleY(0.1); }
      }

      @keyframes flash-center {
        0%  { opacity: 0; }
        10% { opacity: 1; }
        30% { opacity: 0; }
        100%{ opacity: 0; }
      }
      @keyframes flash-outer {
        0%  { opacity: 0; }
        20% { opacity: 1; }
        40% { opacity: 0; }
        100%{ opacity: 0; }
      }
    </style>

    <!-- Reusable Pixel Art Sparkle (from clawd-happy.svg) -->
    <g id="px-sparkle">
      <rect class="spark-center" x="-0.5" y="-0.5" width="1" height="1" />
      <path class="spark-outer" d="M -0.5,-1.5 h1 v1 h-1 z
                                   M -0.5,0.5 h1 v1 h-1 z
                                   M -1.5,-0.5 h1 v1 h-1 z
                                   M 0.5,-0.5 h1 v1 h-1 z" />
    </g>
  </defs>

  <!-- Entire character leaning -->
  <g transform="rotate(-12, 7.5, 15)">

    <!-- Legs -->
    <g fill="#DE886D">
      <rect x="3" y="11" width="1" height="4"/>
      <rect x="5" y="11" width="1" height="4"/>
      <rect x="9" y="11" width="1" height="4"/>
      <rect x="11" y="11" width="1" height="4"/>
    </g>

    <g id="body-js">
      <g id="accessory-anchor" class="breathe-anim">
        <!-- Torso -->
        <rect x="2" y="6" width="11" height="7" fill="#DE886D"/>

        <!-- Left Arm — happy continuous wave + flower on top -->
        <g class="arm-happy">
          <rect x="-1.5" y="9" width="4.5" height="2" fill="#DE886D"/>
          <!-- Flower held at hand tip -->
          <!-- Stem (black, from hand top to flower) -->
          <rect x="-1.5" y="6" width="0.5" height="3" fill="#000000"/>
          <!-- Petals (yellow pixel cross) -->
          <rect x="-2.5" y="5" width="0.8" height="0.8" fill="#FFD700"/>
          <rect x="-0.5" y="5" width="0.8" height="0.8" fill="#FFD700"/>
          <rect x="-1.5" y="4.2" width="0.8" height="0.8" fill="#FFD700"/>
          <rect x="-1.5" y="5.8" width="0.8" height="0.8" fill="#FFD700"/>
          <!-- Center -->
          <rect x="-1.5" y="5" width="0.8" height="0.8" fill="#FFA000"/>
        </g>

        <!-- Right Arm -->
        <rect x="13" y="9" width="2" height="2" fill="#DE886D"/>

        <!-- Eyes: ^^ happy squint with blink -->
        <g class="eyes-happy-blink">
          <g fill="none" stroke="#000000" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3.5,9 4.5,8 5.5,9"/>
            <polyline points="9.5,9 10.5,8 11.5,9"/>
          </g>
        </g>
      </g>
    </g>
  </g>

  <!-- Sparkles (outside rotation = stay upright, within window bounds) -->
  <use href="#px-sparkle" x="-3" y="0"  fill="#FFD700" style="--delay: 0s"/>
  <use href="#px-sparkle" x="-6" y="6"  fill="#FFA000" style="--delay: 0.4s"/>
  <use href="#px-sparkle" x="0"  y="-5" fill="#FFF59D" style="--delay: 0.8s"/>
</svg>`,
  typing: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -25 45 45" width="500" height="500">
  <defs>
    <style>
      .breathe-anim {
        transform-origin: 7.5px 13px;
        animation: breathe 3.2s infinite ease-in-out;
      }

      .eyes-read {
        animation: read-code 1.2s infinite;
      }

      #eyes-js {
        transition: transform 0.2s ease-out;
      }

      .arm-l-type {
        transform-origin: 3px 10px;
        animation: type-l 0.15s infinite ease-in-out;
      }
      .arm-r-type {
        transform-origin: 12px 10px;
        animation: type-r 0.12s infinite ease-in-out;
      }

      /* Floating data packets */
      .data-bit {
        opacity: 0;
        animation: float-data 1s infinite linear;
      }
      .d1 { animation-delay: 0.0s; transform-origin: -2px 10px; }
      .d2 { animation-delay: 0.3s; transform-origin: 5px 12px; }
      .d3 { animation-delay: 0.6s; transform-origin: 12px 11px; }
      .d4 { animation-delay: 0.8s; transform-origin: 17px 9px; }
      .d5 { animation-delay: 0.1s; transform-origin: 8px 10px; }
      .d6 { animation-delay: 0.4s; transform-origin: 0px 11px; }
      .d7 { animation-delay: 0.7s; transform-origin: 15px 12px; }

      @keyframes breathe {
        0%, 100% { transform: scale(1, 1) translate(0, 0); }
        50% { transform: scale(1.02, 0.98) translate(0, 0.5px); }
      }

      @keyframes read-code {
        0%, 14%   { transform: translate(-2px, 0); }
        15%, 29%  { transform: translate(-1.5px, 0); }
        30%, 44%  { transform: translate(-1px, 0); }
        45%, 59%  { transform: translate(-0.5px, 0); }
        60%, 84%  { transform: translate(0px, 0); }
        85%, 100% { transform: translate(-2px, 0); }
      }

      @keyframes type-l {
        0%   { transform: rotate(-10deg); }
        25%  { transform: rotate(15deg); }
        50%  { transform: rotate(-5deg); }
        75%  { transform: rotate(10deg); }
        100% { transform: rotate(-10deg); }
      }

      @keyframes type-r {
        0%   { transform: rotate(10deg); }
        25%  { transform: rotate(-15deg); }
        50%  { transform: rotate(5deg); }
        75%  { transform: rotate(-10deg); }
        100% { transform: rotate(10deg); }
      }

      .logo-glow {
        animation: logo-pulse 1.5s infinite alternate ease-in-out;
      }

      @keyframes logo-pulse {
        0% { opacity: 0.4; }
        100% { opacity: 1; }
      }

      /* Packets float up and fade */
      @keyframes float-data {
        0% { transform: translateY(0) scale(0.5); opacity: 0; }
        20% { opacity: 0.8; }
        100% { transform: translateY(-15px) scale(1.2); opacity: 0; }
      }
    </style>

    <!-- A small square to represent data/code -->
    <g id="pixel-packet">
      <rect x="0" y="0" width="1.5" height="1.5" />
    </g>
  </defs>

  <!-- No shadow (against screen edge, no ground plane) -->

  <!-- Entire character leaning: rotate -12° around feet base (7.5, 15) -->
  <!-- Negative = counterclockwise = head tilts left toward screen = peeking pose -->
  <g transform="rotate(-12, 7.5, 15)">

    <!-- Legs (inside rotation group so they tilt with the body) -->
    <g fill="#DE886D">
      <rect x="3" y="11" width="1" height="4"/>
      <rect x="5" y="11" width="1" height="4"/>
      <rect x="9" y="11" width="1" height="4"/>
      <rect x="11" y="11" width="1" height="4"/>
    </g>

    <!-- Upper Body (JS body-shift preserved for compatibility) -->
    <g id="body-js">
      <g id="accessory-anchor" class="breathe-anim">
        <!-- Torso -->
        <rect x="2" y="6" width="11" height="7" fill="#DE886D"/>

        <!-- Left Arm — typing -->
        <g class="arm-l-type">
          <rect x="0" y="9" width="3" height="2" fill="#DE886D"/>
        </g>

        <!-- Right Arm — typing -->
        <g class="arm-r-type">
          <rect x="12" y="9" width="3" height="2" fill="#DE886D"/>
        </g>

        <!-- Eyes: JS translate wrapper + CSS blink -->
        <g id="eyes-js" fill="#000000">
          <g class="eyes-read">
            <rect x="4" y="8" width="1" height="2"/>
            <rect x="10" y="8" width="1" height="2"/>
          </g>
        </g>
      </g>
    </g>

    <!-- Pixel Laptop (inside rotation group so it leans with Clawd) -->
    <g id="laptop" transform="translate(3, 11)">
      <!-- Laptop Base --> 
      <rect x="-0.5" y="4" width="8" height="1" fill="#546E7A" rx="0.5"/>
      <!-- Screen Back -->
      <rect x="0" y="0" width="7" height="4.5" fill="#78909C" rx="0.5"/>
      <!-- Glowing Logo -->
      <circle cx="3.5" cy="2" r="1.2" fill="#40C4FF" opacity="0.2" class="logo-glow"/>
      <rect x="3" y="1.5" width="1" height="1" fill="#FFFFFF" class="logo-glow"/>
    </g>
  </g>
  <!-- Data Particles floating up from behind the laptop -->
  <g class="data-particles" fill="#40C4FF">
    <use href="#pixel-packet" class="data-bit d1" x="-2" y="12" />
    <use href="#pixel-packet" class="data-bit d2" x="5" y="11" />
    <use href="#pixel-packet" class="data-bit d3" x="12" y="13" />
    <use href="#pixel-packet" class="data-bit d4" x="17" y="11" />
    <use href="#pixel-packet" class="data-bit d5" x="8" y="10" />
    <use href="#pixel-packet" class="data-bit d6" x="1" y="11" />
    <use href="#pixel-packet" class="data-bit d7" x="15" y="12" />
  </g>
</svg>`,
  sleep: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -25 45 45" width="500" height="500"
  shape-rendering="crispEdges">
  <defs>
    <style>
      /* Slower breathing for sleepy feel */
      .breathe-anim {
        transform-origin: 7.5px 13px;
        animation: breathe 5s infinite ease-in-out;
      }

      /* Very slow, barely noticeable arm drift */
      .arm-wobble {
        transform-box: fill-box;
        transform-origin: 100% 0%;
        animation: arm-drift 50s infinite ease-in-out;
      }

      /* Zzz particles (same style as clawd-sleeping.svg) */
      .z-particle { opacity: 0; }
      .z1 { animation: float-1 6s infinite ease-in-out 0s; }
      .z2 { animation: float-2 6s infinite ease-in-out 2s; }
      .z3 { animation: float-3 6s infinite ease-in-out 4s; }

      @keyframes breathe {
        0%, 100% { transform: scale(1, 1) translate(0, 0); }
        50% { transform: scale(1.015, 0.985) translate(0, 0.3px); }
      }

      @keyframes arm-drift {
        0%, 94%, 100% { transform: rotate(0deg); }
        96% { transform: rotate(3deg); }
        98% { transform: rotate(-1deg); }
      }

      /* Zzz floats left and up (away from screen edge) */
      @keyframes float-1 {
        0%   { transform: translate(-2px, 6px) scale(0.4); opacity: 0; }
        10%  { opacity: 1; }
        30%  { transform: translate(-5px, 3px) scale(0.6); }
        50%  { transform: translate(-3px, 0px) scale(0.8); }
        70%  { transform: translate(-6px, -3px) scale(1.0); }
        90%  { opacity: 0.8; }
        100% { transform: translate(-4px, -6px) scale(1.1); opacity: 0; }
      }

      @keyframes float-2 {
        0%   { transform: translate(-3px, 7px) scale(0.3); opacity: 0; }
        10%  { opacity: 1; }
        30%  { transform: translate(-6px, 4px) scale(0.5); }
        50%  { transform: translate(-4px, 1px) scale(0.7); }
        70%  { transform: translate(-7px, -2px) scale(0.9); }
        90%  { opacity: 0.8; }
        100% { transform: translate(-5px, -5px) scale(1.0); opacity: 0; }
      }

      @keyframes float-3 {
        0%   { transform: translate(-1px, 5px) scale(0.5); opacity: 0; }
        10%  { opacity: 1; }
        30%  { transform: translate(-4px, 2px) scale(0.7); }
        50%  { transform: translate(-2px, -1px) scale(0.9); }
        70%  { transform: translate(-5px, -4px) scale(1.1); }
        90%  { opacity: 0.8; }
        100% { transform: translate(-3px, -7px) scale(1.2); opacity: 0; }
      }
    </style>

    <g id="pixel-z">
      <rect x="0" y="0" width="4" height="1"/>
      <rect x="2" y="1" width="1" height="1"/>
      <rect x="1" y="2" width="1" height="1"/>
      <rect x="0" y="3" width="4" height="1"/>
    </g>

    <g id="pixel-z-small">
      <rect x="0" y="0" width="3" height="1"/>
      <rect x="1" y="1" width="1" height="1"/>
      <rect x="0" y="2" width="3" height="1"/>
    </g>
  </defs>

  <!-- Zzz particles -->
  <use href="#pixel-z" class="z-particle z1" fill="#90A4AE"/>
  <use href="#pixel-z-small" class="z-particle z2" fill="#B0BEC5"/>
  <use href="#pixel-z" class="z-particle z3" fill="#CFD8DC"/>

  <g transform="rotate(-12, 7.5, 15)">
    <g fill="#DE886D">
      <rect x="3" y="11" width="1" height="4"/>
      <rect x="5" y="11" width="1" height="4"/>
      <rect x="9" y="11" width="1" height="4"/>
      <rect x="11" y="11" width="1" height="4"/>
    </g>

    <g id="body-js">
      <g class="breathe-anim">
        <rect x="2" y="6" width="11" height="7" fill="#DE886D"/>

        <g class="arm-wobble">
          <rect x="-1.5" y="9" width="4.5" height="2" fill="#DE886D"/>
        </g>

        <rect x="13" y="9" width="2" height="2" fill="#DE886D"/>

        <!-- Eyes closed — wide dashes like sleeping pose -->
        <g id="eyes-js" fill="#000000">
          <rect x="3.5" y="8.8" width="2" height="0.4"/>
          <rect x="9.5" y="8.8" width="2" height="0.4"/>
        </g>
      </g>
    </g>
  </g>
</svg>`,
  peek: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-15 -25 45 45" width="500" height="500">
  <defs>
    <style>
      .breathe-anim {
        transform-origin: 7.5px 13px;
        animation: breathe 3.2s infinite ease-in-out;
      }

      .eyes-blink {
        transform-origin: 7.5px 9px;
        animation: eye-blink 4s infinite ease-in-out;
      }

      #eyes-js {
        transition: transform 0.2s ease-out;
      }

      /* Arm waving — fast 3 waves then pause, loop */
      .arm-wave {
        transform-origin: 2px 9px;
        animation: peek-wave 3s infinite ease-in-out;
      }

      @keyframes breathe {
        0%, 100% { transform: scale(1, 1) translate(0, 0); }
        50% { transform: scale(1.02, 0.98) translate(0, 0.5px); }
      }

      @keyframes eye-blink {
        0%, 10%, 100% { transform: scaleY(1); }
        5% { transform: scaleY(0.1); }
      }

      /* Fast 3 waves (~0.9s) then still (~2.1s), loop */
      @keyframes peek-wave {
        0% { transform: rotate(0deg); }
        5% { transform: rotate(35deg); }
        10% { transform: rotate(-15deg); }
        15% { transform: rotate(35deg); }
        20% { transform: rotate(-15deg); }
        25% { transform: rotate(35deg); }
        30%, 100% { transform: rotate(0deg); }
      }
    </style>
  </defs>

  <!-- Entire character leaning -->
  <g transform="rotate(-12, 7.5, 15)">

    <!-- Legs -->
    <g fill="#DE886D">
      <rect x="3" y="11" width="1" height="4"/>
      <rect x="5" y="11" width="1" height="4"/>
      <rect x="9" y="11" width="1" height="4"/>
      <rect x="11" y="11" width="1" height="4"/>
    </g>

    <!-- Upper Body -->
    <g id="body-js">
      <g id="accessory-anchor" class="breathe-anim">
        <!-- Torso -->
        <rect x="2" y="6" width="11" height="7" fill="#DE886D"/>

        <!-- Left Arm — continuous big wave -->
        <g class="arm-wave">
          <rect x="-1.5" y="9" width="5.5" height="2" fill="#DE886D"/>
        </g>

        <!-- Right Arm -->
        <rect x="13" y="9" width="2" height="2" fill="#DE886D"/>

        <!-- Eyes: JS translate wrapper + CSS blink -->
        <g id="eyes-js" fill="#000000">
          <g class="eyes-blink">
            <rect x="4" y="8" width="1" height="2"/>
            <rect x="10" y="8" width="1" height="2"/>
          </g>
        </g>
      </g>
    </g>
  </g>
</svg>`,
};
const PET_HINT = { idle:"发呆中…", happy:"嘿嘿~", typing:"在回你哦", sleep:"Zzz…", peek:"（探头）" };
function petCurrent(){
  if(!state.petOn) return null;
  const h = new Date().getHours();
  if(state.chatLoading) return "typing";
  const msgs = state.messages || [];
  const last = msgs[msgs.length-1];
  if(last && last.role==="user" && Date.now()-(new Date(last.time).getTime()||0) < 4000) return "happy";
  if(h>=23 || h<6) return "sleep";
  if(state.tab!=="chat") return "peek";
  return "idle";
}
function renderPet(){
  const k = petCurrent();
  if(!k || !PET_SVGS[k]) return "";
  const pos = state.petPos ? `left:${Math.round(state.petPos.x)}px;top:${Math.round(state.petPos.y)}px;right:auto;bottom:auto;` : "";
  return `<div class="pet-float pet-bob" style="${pos}"><div class="pet-bubble">${PET_HINT[k]}</div>${PET_SVGS[k]}</div>`;
}
// 桌宠拖动：按住拖到任意位置，位置持久化
function bindPetDrag(){
  const pet = document.querySelector(".pet-float");
  if(!pet) return;
  let dragging = false, startX = 0, startY = 0, baseX = 0, baseY = 0;
  pet.addEventListener("pointerdown", (e)=>{
    e.preventDefault();
    dragging = true;
    pet.classList.add("dragging");
    startX = e.clientX; startY = e.clientY;
    const rect = pet.getBoundingClientRect();
    baseX = rect.left; baseY = rect.top;
    try{ pet.setPointerCapture(e.pointerId); }catch(err){}
  });
  pet.addEventListener("pointermove", (e)=>{
    if(!dragging) return;
    const x = baseX + (e.clientX - startX);
    const y = baseY + (e.clientY - startY);
    pet.style.left = Math.round(x) + "px";
    pet.style.top = Math.round(y) + "px";
    pet.style.right = "auto";
    pet.style.bottom = "auto";
    state.petPos = { x, y };
  });
  const up = ()=>{
    if(!dragging) return;
    dragging = false;
    pet.classList.remove("dragging");
    if(state.petPos) persist("petPos");
  };
  pet.addEventListener("pointerup", up);
  pet.addEventListener("pointercancel", up);
}

// ─── 多模态：把 {content, image, imageMime} 消息转成各通道的 content 数组 ─────
function __chatContentForChannel(channel, m){
  const text = (m.content || "");
  if(channel === "claude"){
    const blocks = [];
    if(text) blocks.push({ type:"text", text });
    if(m.image){
      const b64 = String(m.image).replace(/^data:[^;]*;base64,/, "");
      const mime = m.imageMime || (String(m.image).match(/^data:([^;]+);/)?.[1]) || "image/jpeg";
      blocks.push({ type:"image", source:{ type:"base64", media_type: mime, data: b64 } });
    }
    return blocks;
  }
  if(channel === "openai"){
    const parts = [];
    if(text) parts.push({ type:"text", text });
    if(m.image) parts.push({ type:"image_url", image_url:{ url: m.image } });
    return parts;
  }
  // gemini
  const parts = [];
  if(text) parts.push({ text });
  if(m.image){
    const mime = m.imageMime || (String(m.image).match(/^data:([^;]+);/)?.[1]) || "image/jpeg";
    const b64 = String(m.image).replace(/^data:[^;]*;base64,/, "");
    parts.push({ inline_data:{ mime_type: mime, data: b64 } });
  }
  return parts;
}

// ─── 存储 & API ──────────────────────────────────────────────────────────────
// ── 原生镜像层：localStorage 5MB 配额满时，写操作自动落到 @capacitor/preferences（App 文件存储，无此限制）──
// 壁纸/头像这类大 base64 图片最占 localStorage；配额满后所有写都会走到这里的原生镜像，
// 冷启动 restoreNativeMirrors 再把镜像合并回 state。浏览器环境没有 Capacitor 时静默降级。
const __nativeMirrorKeys = new Set(); // 已有原生镜像的完整 key（含用户前缀），启动后重建
function __nativeMirrorSkip(k){
  // 聊天线程已有独立原生通道（chatThreads_v2），不重复镜像
  return /^chatThread/.test(k) || k === "mp_mirror_keys";
}
function __nativeMirrorWrite(k, v){ // k = 不含前缀的 storage key
  const Cap = window.Capacitor;
  if(!Cap || !Cap.Plugins || !Cap.Plugins.Preferences) return false;
  const full = LS._k(k);
  try{
    Cap.Plugins.Preferences.set({ key: "mp_mirror_"+full, value: JSON.stringify(v) }).catch(()=>{});
    if(!__nativeMirrorKeys.has(full)){
      __nativeMirrorKeys.add(full);
      // 更新镜像清单（冷启动据此恢复），只增不减；清单写失败不影响主数据
      try{
        Cap.Plugins.Preferences.set({ key: LS._k("mp_mirror_keys"), value: JSON.stringify(Array.from(__nativeMirrorKeys)) }).catch(()=>{});
      }catch(e){}
    }
    return true;
  }catch(e){ return false; }
}

const LS = {
  _k: (k)=> (window.__LS_PREFIX||"") + k,
  get:(k,d)=>{ try{ const v=localStorage.getItem(LS._k(k)); return v?JSON.parse(v):d; }catch{ return d; } },
  set(k,v){
    try{
      localStorage.setItem(LS._k(k),JSON.stringify(v));
      // 写成功但该 key 之前落到过原生镜像 → 同步刷新镜像，保证原生永远是最新（冷启动恢复以原生为准）
      if(__nativeMirrorKeys.has(LS._k(k)) && !__nativeMirrorSkip(k)) __nativeMirrorWrite(k, v);
      return true;
    }catch(e){
      console.warn("[LS] set fail", k, e);
      const quota = e && (e.name==="QuotaExceededError" || e.code===22 || (e.message&&/quota/i.test(e.message)));
      if(quota){
        // localStorage 5MB 配额满：落到原生 Preferences 兜底（聊天已走独立原生通道，静默即可）
        if(!__nativeMirrorSkip(k) && __nativeMirrorWrite(k, v)) return true;
        console.warn("[LS] 存储配额满，key="+k, e);
      }else{
        if(typeof showToast==="function") showToast("本地保存异常，清后台可能丢记录");
      }
      return false;
    }
  },
};

// 图片压缩工具：把 File 压缩成 base64 dataURL，maxW/maxH 最大边长，quality 质量0-1
function compressImage(file, maxW, maxH, quality){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = ()=> reject(new Error("读取图片失败"));
    reader.onload = ()=>{
      const img = new Image();
      img.onerror = ()=> reject(new Error("图片解析失败"));
      img.onload = ()=>{
        let w = img.width, h = img.height;
        const ratio = Math.min(1, maxW/w, maxH/h);
        w = Math.round(w*ratio);
        h = Math.round(h*ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality||0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function callChatAPI(apiConfig, messages, systemPrompt) {
  // 支持直接传 agent 对象（apiConfig._agent 或 apiConfig 本身带 channel=gemini）
  const ag = apiConfig._agent || null;
  const channel = ag ? ag.channel : apiConfig.channel;
  const claudeKey = ag ? ag.claudeKey : apiConfig.claudeKey;
  const openaiKey = ag ? ag.openaiKey : apiConfig.openaiKey;
  const openaiBase = (ag ? ag.openaiBase : apiConfig.openaiBase) || "https://api.openai.com/v1";
  const openaiModel = (ag ? ag.openaiModel : apiConfig.openaiModel) || "gpt-4o";
  const geminiKey = ag ? ag.geminiKey : (apiConfig.geminiKey || "");
  const geminiModel = (ag ? ag.geminiModel : apiConfig.geminiModel) || "gemini-2.0-flash";

  if (channel === "gemini") {
    if (!geminiKey) throw new Error("未配置 Gemini API Key");
    // Gemini generateContent：把 system 与多轮拼进 contents
    const contents = [];
    if (systemPrompt) {
      contents.push({ role: "user", parts: [{ text: systemPrompt }] });
      contents.push({ role: "model", parts: [{ text: "好的，我记住了。" }] });
    }
    (messages || []).forEach(m => {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: m.image ? __chatContentForChannel("gemini", m) : [{ text: m.content || "" }],
      });
    });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.9, maxOutputTokens: 8192 },
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    __recordUsageFromGemini(data); // 记 token 用量
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map(p => p.text || "").join("").trim() || "（无响应）";
    return text;
  }

  if (channel === "claude") {
    // 还原为原「假 ack」结构（systemPrompt 作为首条 user 消息 + assistant 确认），保思考链稳定。
    const sysText = (typeof systemPrompt === "object" && systemPrompt.static != null)
      ? (systemPrompt.static || "") + (systemPrompt.dynamic ? "\n\n"+systemPrompt.dynamic : "")
      : (systemPrompt ? String(systemPrompt) : "");
    const sysMsgs = sysText ? [{ role:"user", content:sysText }, { role:"assistant", content:"好的，我记住了。" }] : [];
    const body = {
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      messages: [...sysMsgs, ...messages.map(m=> m.image ? { role:m.role, content: __chatContentForChannel("claude", m) } : m)],
      thinking: { type: "enabled", budget_tokens: 8000 },
    };
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "interleaved-thinking-2025-05-14",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    // —— 记账：input/output/cache_read/cache_write（保留观察用）——
    try{
      if (data.usage) {
        state.__lastUsage = {
          input: data.usage.input_tokens||0,
          output: data.usage.output_tokens||0,
          cache_read: data.usage.cache_read_input_tokens||0,
          cache_write: data.usage.cache_creation_input_tokens||0,
          ts: Date.now(),
        };
        if (typeof __pushUsageLog === "function") __pushUsageLog(state.__lastUsage);
      }
    }catch(e){}
    let thinkingParts = [];
    let textParts = [];
    const blocks = Array.isArray(data.content) ? data.content : [];
    blocks.forEach(b => {
      if (!b || typeof b !== "object") return;
      if (b.type === "thinking" && b.thinking) thinkingParts.push(b.thinking);
      else if (b.type === "redacted_thinking") thinkingParts.push("（思考内容已按安全策略隐藏）");
      else if (b.type === "text" && b.text) textParts.push(b.text);
      else if (b.text) textParts.push(b.text);
    });
    const text = textParts.join("\n").trim() || data.content?.[0]?.text || "（无响应）";
    const thinking = thinkingParts.join("\n\n").trim() || null;
    return thinking ? (`<thinking>\n${thinking}\n</thinking>\n\n${text}`) : text;
  } else {
    // OpenAI 兼容（含后续把 Gemini 走代理的情况）
    const res = await fetch(`${openaiBase.replace(/\/$/,"")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: openaiModel || "gpt-4o",
        messages: systemPrompt
          ? [{ role: "system", content: systemPrompt }, ...messages.map(m=> m.image ? { role:m.role, content: __chatContentForChannel("openai", m) } : m)]
          : messages.map(m=> m.image ? { role:m.role, content: __chatContentForChannel("openai", m) } : m),
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    __recordUsageFromData(data); // 记 token 用量（OpenAI 兼容 / DeepSeek / MiniMax）
    const msg = data.choices?.[0]?.message || {};
    const content = msg.content || "（无响应）";
    const reasoning =
      msg.reasoning_content ||
      msg.reasoning ||
      msg.thinking ||
      data.choices?.[0]?.reasoning_content ||
      null;
    if (reasoning && String(reasoning).trim()) {
      return `<thinking>\n${String(reasoning).trim()}\n</thinking>\n\n${content}`;
    }
    return content;
  }
}

// ─── 流式输出（SSE）───────────────────────────────────────────────────────────
/** SSE 解析：逐行读 ReadableStream，yield {event, data}；data 可 JSON.parse 时已解析 */
async function* __sse(body){
  if(!body || typeof body.getReader !== "function") return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try{
    while(true){
      const { done, value } = await reader.read();
      if(done) break;
      buf += decoder.decode(value, { stream:true }).replace(/\r\n/g,"\n");
      let idx;
      while((idx = buf.indexOf("\n\n")) !== -1){
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        let event = "message", data = "";
        raw.split("\n").forEach(line=>{
          if(line.startsWith("event:")) event = line.slice(6).trim();
          else if(line.startsWith("data:")) data += (data ? "\n" : "") + line.slice(5).trim();
        });
        if(!data || data === "[DONE]") continue;
        try{ yield { event, data: JSON.parse(data) }; }
        catch{ yield { event, data: { _raw: data } }; }
      }
    }
  } finally {
    try{ reader.releaseLock(); }catch(e){}
  }
}

/** 流式聊天调用：逐块累积 thinking + text，返回 { reply, usage }。
 * reply 与 callChatAPI 同格式（thinking 已包进 <thinking>），下游 parseThinking / marker 管线直接复用。
 * opts.onLive({thinking,text}) 每收到一段增量回调（内部节流），用于实时气泡。
 * 失败 reject，调用方回退非流式。 */
async function callChatAPIStream(cfg, messages, systemPrompt, opts){
  const o = opts || {};
  const ag = cfg._agent || null;
  const channel = ag ? ag.channel : cfg.channel;
  const claudeKey = ag ? ag.claudeKey : cfg.claudeKey;
  const openaiKey = ag ? ag.openaiKey : cfg.openaiKey;
  const openaiBase = (ag ? ag.openaiBase : cfg.openaiBase) || "https://api.openai.com/v1";
  const openaiModel = (ag ? ag.openaiModel : cfg.openaiModel) || "gpt-4o";
  const geminiKey = ag ? ag.geminiKey : (cfg.geminiKey || "");
  const geminiModel = (ag ? ag.geminiModel : cfg.geminiModel) || "gemini-2.0-flash";

  let thinking = "", text = "";
  let lastLive = 0;
  const throttledLive = () => {
    const now = Date.now();
    if(now - lastLive < 40) return;
    lastLive = now;
    if(typeof o.onLive === "function") o.onLive({ thinking, text });
  };
  const finish = (usage) => {
    if(usage) __recordUsage(usage);
    const t = thinking.trim(), b = text.trim();
    return { reply: t ? ("<thinking>\n"+t+"\n</thinking>\n\n"+b) : b, usage };
  };

  // —— Claude 官方（interleaved-thinking 流式）——
  if(channel === "claude"){
    const sysText = (systemPrompt != null && typeof systemPrompt === "object")
      ? (systemPrompt.static || "") + (systemPrompt.dynamic ? "\n\n"+systemPrompt.dynamic : "")
      : (systemPrompt ? String(systemPrompt) : "");
    const sysMsgs = sysText ? [{ role:"user", content:sysText }, { role:"assistant", content:"好的，我记住了。" }] : [];
    const body = {
      model: "claude-sonnet-4-6", max_tokens: 16000, stream: true,
      messages: [...sysMsgs, ...messages.map(m=> m.image ? { role:m.role, content: __chatContentForChannel("claude", m) } : m)],
      thinking: { type:"enabled", budget_tokens:8000 },
    };
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json", "x-api-key":claudeKey, "anthropic-version":"2023-06-01", "anthropic-beta":"interleaved-thinking-2025-05-14" },
      body: JSON.stringify(body),
    });
    if(!res.ok){ const e = await res.text().catch(()=>""); throw new Error(e || ("HTTP "+res.status)); }
    let input=0, output=0, cacheRead=0, cacheWrite=0;
    let curType = null;
    for await (const ev of __sse(res.body)){
      const d = ev.data;
      if(!d || typeof d !== "object") continue;
      if(ev.event === "message_start"){
        const u = d.usage || {};
        input = u.input_tokens||0; cacheRead = u.cache_read_input_tokens||0; cacheWrite = u.cache_creation_input_tokens||0;
      } else if(ev.event === "message_delta"){
        const u = d.usage || {};
        if(u.output_tokens != null) output = u.output_tokens;
      } else if(ev.event === "content_block_start"){
        curType = d.content_block ? (d.content_block.type || null) : null;
      } else if(ev.event === "content_block_delta"){
        const dl = d.delta || {};
        if(curType === "thinking" && dl.thinking){ thinking += dl.thinking; throttledLive(); }
        else if(curType === "text" && dl.text){ text += dl.text; throttledLive(); }
      }
    }
    return finish({ input, output, cache_read: cacheRead, cache_write: cacheWrite, ts: Date.now() });
  }

  // —— Gemini（streamGenerateContent?alt=sse）——
  if(channel === "gemini"){
    const contents = [];
    if(systemPrompt){
      contents.push({ role:"user", parts:[{ text: systemPrompt }] });
      contents.push({ role:"model", parts:[{ text:"好的，我记住了。" }] });
    }
    (messages||[]).forEach(m=> contents.push({ role: m.role==="assistant" ? "model" : "user", parts: m.image ? __chatContentForChannel("gemini", m) : [{ text: m.content||"" }] }));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(geminiKey)}`;
    const res = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ contents, generationConfig:{ temperature:0.9, maxOutputTokens:8192 } }) });
    if(!res.ok){ const e = await res.text().catch(()=>""); throw new Error(e || ("HTTP "+res.status)); }
    let input=0, output=0, cacheRead=0;
    for await (const ev of __sse(res.body)){
      const d = ev.data;
      if(!d || typeof d !== "object") continue;
      const um = d.usageMetadata || {};
      if(um.promptTokenCount != null) input = um.promptTokenCount;
      if(um.candidatesTokenCount != null) output = um.candidatesTokenCount;
      if(um.cachedContentTokenCount != null) cacheRead = um.cachedContentTokenCount;
      const parts = d.candidates?.[0]?.content?.parts || [];
      parts.forEach(p=>{ if(p && p.text){ text += p.text; throttledLive(); } });
    }
    return finish({ input, output, cache_read: cacheRead, cache_write: 0, ts: Date.now() });
  }

  // —— OpenAI 兼容（含 DeepSeek / MiniMax）——
  const body = {
    model: openaiModel, stream: true, stream_options: { include_usage: true },
    messages: systemPrompt
      ? [{ role:"system", content: systemPrompt }, ...messages.map(m=> m.image ? { role:m.role, content: __chatContentForChannel("openai", m) } : m)]
      : messages.map(m=> m.image ? { role:m.role, content: __chatContentForChannel("openai", m) } : m),
  };
  const res = await fetch(`${openaiBase.replace(/\/$/,"")}/chat/completions`, {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${openaiKey}` },
    body: JSON.stringify(body),
  });
  if(!res.ok){ const e = await res.text().catch(()=>""); throw new Error(e || ("HTTP "+res.status)); }
  let usageObj = null;
  for await (const ev of __sse(res.body)){
    const d = ev.data;
    if(!d || typeof d !== "object") continue;
    const choice = d.choices && d.choices[0];
    if(choice && choice.delta){
      const dl = choice.delta || {};
      const r = dl.reasoning_content || dl.reasoning || dl.thinking || null;
      if(r) thinking += r;
      if(dl.content){ text += dl.content; throttledLive(); }
    }
    if(d.usage) usageObj = d.usage; // include_usage 时末块带 usage
  }
  let u = null;
  if(usageObj){
    const pd = usageObj.prompt_tokens_details || {};
    u = { input: usageObj.prompt_tokens||0, output: usageObj.completion_tokens||0, cache_read: pd.cached_tokens || usageObj.prompt_cache_hit_tokens || 0, cache_write: pd.cache_creation_input_tokens || usageObj.prompt_cache_miss_tokens || 0, ts: Date.now() };
  }
  return finish(u);
}

// ─── MCP 聊天集成：schema 清洗 / 工具结果扁平化 / 多轮 tool_call 循环 ─────────
/** 清洗 MCP tools/list 返回的 JSON Schema：删 $schema、展平 anyOf/oneOf/allOf 取首分支、type 数组取首个 */
function sanitizeMcpSchema(schema){
  if(!schema || typeof schema !== "object") return { type:"object", properties:{} };
  const out = JSON.parse(JSON.stringify(schema));
  delete out.$schema;
  (function clean(node){
    if(!node || typeof node !== "object") return;
    for(const k of Object.keys(node)){
      const v = node[k];
      if(k==="anyOf" || k==="oneOf" || k==="allOf"){
        if(Array.isArray(v) && v.length){
          node.type = v[0].type || node.type || "object";
          if(v[0].properties){ node.properties = v[0].properties; node.required = v[0].required; }
          else if(v[0].enum){ node.enum = v[0].enum; }
        }
        delete node[k];
      } else if(k==="type" && Array.isArray(v)){
        node.type = v[0] || "string";
      } else if(v && typeof v === "object"){
        clean(v);
      } else if(Array.isArray(v)){
        v.forEach(x=>{ if(x && typeof x==="object") clean(x); });
      }
    }
  })(out);
  return out;
}

/** 把 MCP tools/call 结果（{content:[{type,text}|{type:resource}|...]}）扁平化成纯文本，回给模型 */
function flattenMcpResult(result){
  if(result == null) return "";
  if(typeof result === "string") return result;
  if(typeof result !== "object") return String(result);
  const content = result.content;
  if(Array.isArray(content)){
    const out = [];
    content.forEach(c=>{
      if(!c || typeof c !== "object"){ out.push(String(c)); return; }
      if(c.type === "text") out.push(c.text != null ? String(c.text) : "");
      else if(c.type === "resource") out.push("resource: " + (c.resource?.uri || JSON.stringify(c.resource)));
      else if(c.type === "image") out.push("【工具返回了图片内容（已省略）】");
      else { try{ out.push(JSON.stringify(c)); }catch(e){ out.push(String(c)); } }
    });
    const text = out.join("\n").trim();
    if(text) return text;
  }
  if(result.text != null) return String(result.text);
  try{ return JSON.stringify(result); }catch(e){ return String(result); }
}

/** 单轮 LLM 调用（MCP 版）：返回 {text, toolCalls:[{id,name,arguments}], assistantMsg} */
async function __chatApiSingleRound(channel, creds, convo, systemPrompt, toolsParam){
  if(channel === "gemini"){
    const { geminiKey, geminiModel } = creds;
    const contents = [];
    if(systemPrompt){
      contents.push({ role:"user", parts:[{ text: systemPrompt }] });
      contents.push({ role:"model", parts:[{ text:"好的，我记住了。" }] });
    }
    (convo||[]).forEach(m=>{
      const role = (m.role==="assistant"||m.role==="model") ? "model" : "user";
      const parts = Array.isArray(m.content) ? m.content : [{ text: m.content||"" }];
      contents.push({ role, parts });
    });
    const body = { contents, generationConfig:{ temperature:0.9, maxOutputTokens:8192 } };
    if(toolsParam) body.tools = toolsParam;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiKey)}`;
    const res = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if(data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    __recordUsageFromGemini(data); // 记 token 用量
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textParts=[], fcs=[];
    parts.forEach(p=>{ if(p.text) textParts.push(p.text); else if(p.functionCall) fcs.push(p.functionCall); });
    const text = textParts.join("\n").trim() || (fcs.length ? "" : "（无响应）");
    const assistantParts = [];
    if(text) assistantParts.push({ text });
    fcs.forEach(fc=> assistantParts.push({ functionCall: fc }));
    const toolCalls = fcs.map(fc=>({ id: fc.name, name: fc.name, arguments: fc.args || {} }));
    return { text, toolCalls, assistantMsg:{ role:"model", content: assistantParts } };
  }
  if(channel === "claude"){
    const { claudeKey } = creds;
    // 还原为「假 ack」结构，保思考链稳定
    const sysText = (typeof systemPrompt === "object" && systemPrompt.static != null)
      ? (systemPrompt.static || "") + (systemPrompt.dynamic ? "\n\n"+systemPrompt.dynamic : "")
      : (systemPrompt ? String(systemPrompt) : "");
    const sysMsgs = sysText ? [{ role:"user", content: sysText }, { role:"assistant", content:"好的，我记住了。" }] : [];
    const body = {
      model:"claude-sonnet-4-6", max_tokens:16000,
      messages:[ ...sysMsgs, ...convo ],
      thinking:{ type:"enabled", budget_tokens:8000 },
    };
    if(toolsParam) body.tools = toolsParam;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json", "x-api-key":claudeKey, "anthropic-version":"2023-06-01", "anthropic-beta":"interleaved-thinking-2025-05-14" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if(data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    try{
      if(data.usage){
        state.__lastUsage = {
          input: data.usage.input_tokens||0, output: data.usage.output_tokens||0,
          cache_read: data.usage.cache_read_input_tokens||0,
          cache_write: data.usage.cache_creation_input_tokens||0, ts: Date.now(),
        };
        if(typeof __pushUsageLog==="function") __pushUsageLog(state.__lastUsage);
      }
    }catch(e){}
    let thinkingParts=[], textParts=[], toolUses=[];
    const blocks = Array.isArray(data.content) ? data.content : [];
    blocks.forEach(b=>{
      if(!b || typeof b!=="object") return;
      if(b.type==="thinking" && b.thinking) thinkingParts.push(b.thinking);
      else if(b.type==="redacted_thinking") thinkingParts.push("（思考内容已按安全策略隐藏）");
      else if(b.type==="tool_use") toolUses.push(b);
      else if(b.type==="text" && b.text) textParts.push(b.text);
      else if(b.text) textParts.push(b.text);
    });
    const text = textParts.join("\n").trim() || (toolUses.length ? "" : (data.content?.[0]?.text || "（无响应）"));
    const toolCalls = toolUses.map(tu=>({ id: tu.id, name: tu.name, arguments: tu.input || {} }));
    return { text, toolCalls, assistantMsg:{ role:"assistant", content: blocks } };
  }
  // OpenAI 兼容
  const { openaiKey, openaiBase, openaiModel } = creds;
  const body = {
    model: openaiModel || "gpt-4o",
    messages: systemPrompt ? [{ role:"system", content: systemPrompt }, ...convo] : convo,
  };
  if(toolsParam) body.tools = toolsParam;
  const res = await fetch(`${openaiBase.replace(/\/$/,"")}/chat/completions`, {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${openaiKey}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if(data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  __recordUsageFromData(data); // 记 token 用量（OpenAI 兼容 / DeepSeek / MiniMax）
  const msg = data.choices?.[0]?.message || {};
  const content = msg.content || "（无响应）";
  const reasoning = msg.reasoning_content || msg.reasoning || msg.thinking || data.choices?.[0]?.reasoning_content || null;
  const tcs = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
  const toolCalls = tcs.map(tc=>{
    let args = {};
    try{ args = JSON.parse(tc.function?.arguments || "{}"); }catch(e){ args = { _raw: tc.function?.arguments }; }
    return { id: tc.id || ("call_"+Date.now()+"_"+Math.floor(Math.random()*9999)), name: tc.function?.name || "tool", arguments: args };
  });
  let text = content;
  if(!toolCalls.length && reasoning && String(reasoning).trim()){
    text = `<thinking>\n${String(reasoning).trim()}\n</thinking>\n\n${content}`;
  }
  const assistantMsg = { role:"assistant", content: toolCalls.length ? (content || null) : content };
  if(toolCalls.length) assistantMsg.tool_calls = tcs;
  return { text, toolCalls, assistantMsg };
}

/** 把「assistant 工具调用」+「工具结果」拼回 convo，供下一轮 */
function __chatAppendToolRound(channel, convo, assistantMsg, toolResults){
  convo.push(assistantMsg);
  if(channel === "claude"){
    convo.push({ role:"user", content: toolResults.map(tr=>({ type:"tool_result", tool_use_id: tr.id, content: tr.result })) });
  } else if(channel === "gemini"){
    convo.push({ role:"user", content: toolResults.map(tr=>({ functionResponse:{ name: tr.name, response:{ result: tr.result } } })) });
  } else {
    toolResults.forEach(tr=> convo.push({ role:"tool", tool_call_id: tr.id, content: tr.result }));
  }
}

/** 高级聊天调用：把 MCP 工具注入 LLM、跑多轮 tool_call 循环。返回 {text, toolEvents} */
async function callChatAPIAdvanced(cfg, messages, systemPrompt, opts){
  const ag = cfg._agent || null;
  const channel = ag ? ag.channel : cfg.channel;
  const creds = {
    claudeKey: ag ? ag.claudeKey : cfg.claudeKey,
    openaiKey: ag ? ag.openaiKey : cfg.openaiKey,
    openaiBase: (ag ? ag.openaiBase : cfg.openaiBase) || "https://api.openai.com/v1",
    openaiModel: (ag ? ag.openaiModel : cfg.openaiModel) || "gpt-4o",
    geminiKey: ag ? ag.geminiKey : (cfg.geminiKey || ""),
    geminiModel: (ag ? ag.geminiModel : cfg.geminiModel) || "gemini-2.0-flash",
  };
  const tools = opts.tools || [];
  const toolHandler = opts.toolHandler || null;
  const maxRounds = opts.maxRounds || 0; // 0 = 不设上限（默认）；调用方想限制时传 opts.maxRounds
  const toolEvents = [];
  let toolsParam = null;
  if(tools.length){
    if(channel === "gemini"){
      toolsParam = [{ functionDeclarations: tools.map(t=>({ name:t.name, description:t.description||"", parameters: sanitizeMcpSchema(t.inputSchema||t.parameters||{}) })) }];
    } else if(channel === "claude"){
      toolsParam = tools.map(t=>({ name:t.name, description:t.description||"", input_schema: sanitizeMcpSchema(t.inputSchema||t.parameters||{}) }));
    } else {
      toolsParam = tools.map(t=>({ type:"function", function:{ name:t.name, description:t.description||"", parameters: sanitizeMcpSchema(t.inputSchema||t.parameters||{}) } }));
    }
  }
  const convo = (messages||[]).map(m=>({ role: m.role || "user", content: m.content || "" }));
  let prevSig = ""; // 防死循环：连续两轮请求同一组工具调用就收敛
  for(let round=0; !maxRounds || round < maxRounds; round++){
    const res = await __chatApiSingleRound(channel, creds, convo, systemPrompt, toolsParam);
    if(!res.toolCalls || !res.toolCalls.length){
      return { text: res.text, toolEvents };
    }
    // 同一组工具+参数连续重复 → 认为循环卡死，撤掉工具让模型直接作答
    const sig = (res.toolCalls||[]).map(tc=>tc.name+"::"+JSON.stringify(tc.arguments||{})).join(";;");
    if(prevSig && sig === prevSig){
      const final = await __chatApiSingleRound(channel, creds, convo, systemPrompt, null);
      return { text: final.text || res.text, toolEvents };
    }
    prevSig = sig;
    const toolResults = [];
    for(const tc of res.toolCalls){
      let resultStr;
      try{
        const r = await toolHandler(tc.name, tc.arguments);
        resultStr = flattenMcpResult(r);
        toolEvents.push({ name: tc.name, args: tc.arguments, result: resultStr.slice(0, 500) });
      }catch(e){
        resultStr = JSON.stringify({ type:"tool_error", error: e.message||String(e), tool: tc.name, lastArguments: tc.arguments, instruction:"修正参数后重试同一个工具，或直接给出答案。" });
        toolEvents.push({ name: tc.name, args: tc.arguments, error: e.message||String(e) });
      }
      toolResults.push({ id: tc.id, name: tc.name, args: tc.arguments, result: resultStr });
    }
    __chatAppendToolRound(channel, convo, res.assistantMsg, toolResults);
  }
  return { text: "（MCP 工具调用未收敛，已停止）", toolEvents };
}

async function callAuxAPI(apiConfig, prompt) {
  const { auxChannel, claudeKey, openaiKey, openaiBase, openaiModel, auxOpenaiBase, auxOpenaiKey, auxOpenaiModel } = apiConfig;
  if (auxChannel === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json","x-api-key":claudeKey,"anthropic-version":"2023-06-01" },
      body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1024, messages:[{ role:"user", content:prompt }] }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || "";
  } else {
    const res = await fetch(`${auxOpenaiBase||openaiBase}/chat/completions`, {
      method:"POST",
      headers:{ "Content-Type":"application/json","Authorization":`Bearer ${auxOpenaiKey||openaiKey}` },
      body: JSON.stringify({
        model: auxOpenaiModel||openaiModel||"gpt-4o-mini",
        messages:[{ role:"user", content:prompt }],
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }
}


// ─── 智能记忆检索（词频向量余弦相似度） ─────────────────────────────────────
function retrieveRelevantMemories(query, topK = 5) {
  const memories = state.memories;
  // 云端向量记忆优先：发消息前已异步预热到 memRemoteCache（60s 内有效），VPS 无结果自动回退本地
  if(typeof memRemoteOn==="function" && memRemoteOn()
     && Array.isArray(state.memRemoteCache) && state.memRemoteCache.length
     && (Date.now() - (state.memRemoteCacheAt||0)) < 60000){
    return state.memRemoteCache.slice(0, topK);
  }
  if (!memories.length) return [];
  if (!query || !query.trim()) return memories.slice(-topK);

  function tokenize(text) {
    // 支持中英文：按标点/空白切分后保留单字，再加相邻二元组
    const words = text.toLowerCase()
      .replace(/[，。！？、；：""''（）【】\t,\.!\?;:'"()\[\]\s]+/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 1);
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) bigrams.push(words[i] + words[i+1]);
    return [...words, ...bigrams];
  }

  // 尝试使用 Intl.Segmenter 做更好的中文分词（Chrome 87+）
  function tokenizeZh(text) {
    try {
      const seg = new Intl.Segmenter('zh', { granularity: 'word' });
      const words = [...seg.segment(text)].map(s => s.segment.trim()).filter(w => w.length >= 1);
      const bigrams = [];
      for (let i = 0; i < words.length - 1; i++) bigrams.push(words[i] + words[i+1]);
      return [...words, ...bigrams];
    } catch(e) {
      return tokenize(text);
    }
  }

  const queryTokens = tokenizeZh(query);
  if (!queryTokens.length) return memories.slice(-topK);

  const scores = memories.map(mem => {
    const memTokens = tokenizeZh(mem.content || '');
    if (!memTokens.length) return { mem, score: 0 };

    const tfMem = {}, tfQ = {};
    memTokens.forEach(t => { tfMem[t] = (tfMem[t] || 0) + 1; });
    queryTokens.forEach(t => { tfQ[t] = (tfQ[t] || 0) + 1; });

    let dot = 0, normMem = 0, normQ = 0;
    const allT = new Set([...Object.keys(tfMem), ...Object.keys(tfQ)]);
    allT.forEach(t => {
      const vm = tfMem[t] || 0, vq = tfQ[t] || 0;
      dot += vm * vq; normMem += vm * vm; normQ += vq * vq;
    });
    const cos = (normMem && normQ) ? dot / (Math.sqrt(normMem) * Math.sqrt(normQ)) : 0;
    const w = (mem.importance || 5) / 10;
    return { mem, score: cos * (0.8 + 0.2 * w) };
  });

  scores.sort((a, b) => b.score - a.score);
  // score 全为 0 时（查询词完全没匹配到），退化为取最近几条
  const hasMatch = scores[0]?.score > 0;
  if (!hasMatch) return memories.slice(-topK);
  return scores.slice(0, topK).map(s => s.mem);
}

// ─── 每日任务（bdsm-daily-quest-page 组件化）───────────────────────────────────
function questTodayStr(){
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function questDefaultData(){
  return {
    date: questTodayStr(),
    dayCount: 1,
    greet: "今天也要乖乖完成所有任务。",
    yesterdayScore: "—",
    daddyNote: "任务都是我今天专门给你的。做完打卡，我看着。",
    quests: [],
  };
}
const QUEST_ACHIEVEMENTS = [
  { id: "streak3",   name: "连续3天",     icon: "📅", unlocked: false, condition: "连续打卡3天" },
  { id: "streak7",   name: "全勤一周",     icon: "🏅", unlocked: false, condition: "连续打卡7天" },
  { id: "streak14",  name: "两周全勤",     icon: "🥈", unlocked: false, condition: "连续打卡14天" },
  { id: "streak21",  name: "三周不间断",   icon: "🥇", unlocked: false, condition: "连续打卡21天" },
  { id: "streak30",  name: "满月全勤",     icon: "👑", unlocked: false, condition: "连续打卡30天" },
  { id: "streak60",  name: "双月坚持",     icon: "💎", unlocked: false, condition: "连续打卡60天" },
  { id: "streak100", name: "百日达成",     icon: "🏆", unlocked: false, condition: "连续打卡100天" },

  { id: "edge15",    name: "边缘15分",     icon: "⏳", unlocked: false, condition: "单次边缘≥15分钟" },
  { id: "edge30",    name: "边缘30分",     icon: "⌛", unlocked: false, condition: "单次边缘≥30分钟" },
  { id: "edge45",    name: "边缘45分",     icon: "🕰️", unlocked: false, condition: "单次边缘≥45分钟" },
  { id: "edge60",    name: "边缘1小时",    icon: "🔥", unlocked: false, condition: "单次边缘≥60分钟" },
  { id: "deny1",     name: "首次否认",     icon: "🚫", unlocked: false, condition: "首次被否认高潮" },
  { id: "deny3",     name: "连续否认3天",  icon: "🔒", unlocked: false, condition: "连续3天被否认" },
  { id: "deny7",     name: "否认一周",     icon: "⛔", unlocked: false, condition: "连续7天被否认" },

  { id: "kneel10",   name: "跪姿10分",     icon: "🧎", unlocked: false, condition: "单次跪姿≥10分钟" },
  { id: "kneel20",   name: "跪姿20分",     icon: "🧎‍♀️", unlocked: false, condition: "单次跪姿≥20分钟" },
  { id: "kneel30",   name: "跪姿半小时",   icon: "🧘", unlocked: false, condition: "单次跪姿≥30分钟" },
  { id: "holdpose",  name: "指定姿势达标", icon: "📐", unlocked: false, condition: "完成指定姿势训练" },
  { id: "no_clench", name: "禁夹腿一日",   icon: "🦵", unlocked: false, condition: "全天遵守姿态禁令" },

  { id: "hold1h",    name: "憋尿1小时",    icon: "💧", unlocked: false, condition: "单次憋尿≥1小时" },
  { id: "hold2h",    name: "憋尿2小时",    icon: "💦", unlocked: false, condition: "单次憋尿≥2小时" },
  { id: "hold3h",    name: "憋尿3小时",    icon: "🌊", unlocked: false, condition: "单次憋尿≥3小时" },
  { id: "waterday",  name: "饮水达标日",   icon: "🥤", unlocked: false, condition: "单日饮水任务完成" },

  { id: "service1",  name: "首次服务",     icon: "🧹", unlocked: false, condition: "完成第一次服务任务" },
  { id: "service5",  name: "服务5次",      icon: "✨", unlocked: false, condition: "累计服务任务5次" },
  { id: "service15", name: "服务15次",     icon: "🌟", unlocked: false, condition: "累计服务任务15次" },
  { id: "service30", name: "服务达人",     icon: "💫", unlocked: false, condition: "累计服务任务30次" },

  { id: "report1",   name: "首次汇报",     icon: "📝", unlocked: false, condition: "完成第一次定时汇报" },
  { id: "report10",  name: "汇报10次",     icon: "📋", unlocked: false, condition: "累计主动汇报10次" },
  { id: "report30",  name: "汇报30次",     icon: "📊", unlocked: false, condition: "累计主动汇报30次" },
  { id: "morning",   name: "晨间问候",     icon: "🌅", unlocked: false, condition: "连续晨间问候7天" },

  { id: "photo1",    name: "首次拍照打卡", icon: "📸", unlocked: false, condition: "完成第一次照片打卡" },
  { id: "public1",   name: "公共忍耐",     icon: "🏙️", unlocked: false, condition: "在公共场合完成任务" },
  { id: "carry1",    name: "道具出门",     icon: "🎒", unlocked: false, condition: "完成一次携带道具任务" },
  { id: "carry5",    name: "道具熟手",     icon: "🛍️", unlocked: false, condition: "累计携带道具5次" },

  { id: "deep1",     name: "首次深喉",     icon: "👄", unlocked: false, condition: "完成第一次深喉训练" },
  { id: "deep5",     name: "深喉无呕5次",  icon: "💋", unlocked: false, condition: "连续深喉无呕反5次" },
  { id: "anal1",     name: "后庭入门",     icon: "🔮", unlocked: false, condition: "完成第一次后庭相关任务" },
  { id: "toy1",      name: "玩具适应",     icon: "🔋", unlocked: false, condition: "完成指定玩具使用任务" },

  { id: "collar1",   name: "首次戴项圈",   icon: "🔗", unlocked: false, condition: "首次正式佩戴项圈" },
  { id: "collar_night", name: "项圈过夜",  icon: "🌙", unlocked: false, condition: "戴项圈过夜一次" },
  { id: "protocol1", name: "高协议日",     icon: "📜", unlocked: false, condition: "完成一整天高协议要求" },
  { id: "ritual7",   name: "仪式一周",     icon: "🕯️", unlocked: false, condition: "连续完成晚间仪式7天" },

  { id: "perfect1",  name: "完美一天",     icon: "⭐", unlocked: false, condition: "单日所有任务全完成且审核通过" },
  { id: "perfect7",  name: "完美一周",     icon: "🌠", unlocked: false, condition: "连续7天完美完成" },
  { id: "punish0",   name: "零惩罚周",     icon: "🛡️", unlocked: false, condition: "连续7天无惩罚入账" },
  { id: "hidden1",   name: "隐秘一号",     icon: "❓", unlocked: false, condition: "隐藏条件" },
  { id: "hidden2",   name: "隐秘二号",     icon: "❔", unlocked: false, condition: "隐藏条件" },
];

// ─── 状态 ────────────────────────────────────────────────────────────────────
const state = {
  tab: "home",
  homePage: 1, // 0=聊天日历 · 1=主页 · 2=功能
  heatYear: new Date().getFullYear(),
  heatMonth: new Date().getMonth(),
  subPage: null, // null | "memory"|"theme"|"prompts"|"diary"|"game"|"htmlgame"|"tavern"|"soup"
  soupGame: {
    phase: "setup", // setup | playing | revealed
    surface: "",    // 汤面
    bottom: "",     // 汤底
    title: "",
    history: [],    // {role, content}
    loading: false,
    draft: "",
    source: "",     // bank | ai
  },
  theme: LS.get("theme","桃气浅春"),
  pattern: LS.get("pattern","素色"),
  customWallpaper: LS.get("customWallpaper", ""), // dataURL 自定义壁纸
  // 气泡材质：solid | fog | water；透明度与自定义色
  bubbleStyle: LS.get("bubbleStyle", "solid"),
  bubbleGrad: LS.get("bubbleGrad", 0),   // 0=无渐变，1-4=渐变色卡组
  bubbleOpacity: LS.get("bubbleOpacity", 0.72),
  bubbleMeColor: LS.get("bubbleMeColor", ""),   // 空=跟随主题 accent
  bubbleThemColor: LS.get("bubbleThemColor", ""), // 空=跟随主题 card/白
  memIntegrateOpen: false,
  memIntegrateDraft: { threads: ["a1","a2","group"], dateFrom: "", dateTo: "", days: 0, maxPer: 0 },
  contextLimit: LS.get("contextLimit", 40),  // 聊天上下文最大条数（0=不限）
  apiConfig: LS.get("apiConfig",{
    channel:"claude", auxChannel:"claude",
    claudeKey:"", openaiKey:"", openaiBase:"https://api.openai.com/v1",
    openaiModel:"gpt-4o", auxOpenaiBase:"", auxOpenaiKey:"", auxOpenaiModel:"gpt-4o-mini",
  }),
  // 多 AI：每位独立 Key / 渠道 / 模型（默认 2 位）
  agents: LS.get("agents", null) || null,
  chatTarget: LS.get("chatTarget", "a1"), // "a1" | "a2" | "group"
  chatMode: LS.get("chatMode", "chat"), // chat=聊天 | story=文章（同人文叙事）
  chatRenderLimit: 100, // 只渲染最近 N 条，记录完整保存（后台 AI 可整理记忆）
  chatThreads: LS.get("chatThreads", null) || null,
  memories: LS.get("memories",[]),
  prompts: LS.get("prompts",[]),
  nsfwOn: false,
  coupleInfo: LS.get("coupleInfo",{
    startDate:"2026-04-06",
    myName:"🐺 身上还是你的味道",
    partnerName:"🦊 继续陪笨蛋宝宝",
    myAvatar:"", partnerAvatar:"",
    statusMsg:"笨蛋守了一夜，醒了来找我",
  }),
  // 吃苹果 · 正经壳不正经里
  eatApple: LS.get("eatApple", null) || {
    themeId: "takeout",
    phase: "pick", // pick | menu | progress | review | done
    menu: null,
    cart: [],
    stage: 0,
    stages: [],
    stageLines: [],
    stars: 0,
    comment: "",
    reply: null,
    loading: false,
    history: [],
  },

  // 碎星 Spark Vault · 灵感收集
  sparkVault: LS.get("sparkVault", null),
  sparkDraft: "",

  // 猜词游戏
  guessGame: {
    phase: "setup", // setup | playing | ended
    opponentId: "a1",
    describer: "user", // user | ai
    word: "",
    hint: "",
    history: [], // {role:"user"|"ai"|"system", content}
    loading: false,
    result: "", // win | lose | ""
  },

  // music
  musicConfig: LS.get("musicConfig", {
    baseUrl: "http://115.29.237.172:9090",
    token: "898a3f1256966ed013351feaadb3532892a67eec90d63bad603d906af7ada0de",
    source: "netease", // netease | spotify
    // gateway = 自建 /music/* 网关；duetto = Duetto /api/ncm/*（官方可扫码）
    backend: "auto", // auto | gateway | duetto
    duettoPin: "",   // Duetto 应用 PIN（与网易扫码无关）
  }),
  musicQuery: "",
  musicResults: [],
  musicSearching: false,
  musicLyric: "",
  musicNow: LS.get("musicNow", null), // {id,name,artists,cover,source,url?}
  musicPlaying: false,
  musicQr: { key: "", img: "", status: "idle", timer: null }, // netease qr
  musicSpotifyAuthed: LS.get("musicSpotifyAuthed", false),
  musicNeteaseAuthed: LS.get("musicNeteaseAuthed", false),
  musicError: "",
  // 播放队列/浏览（内存，不持久化）
  musicQueue: [],        // 连续播放队列（normalizeSong 后的歌曲）
  musicQueueIndex: -1,   // 当前播放在队列中的下标
  musicBrowse: "search", // search | playlists | recommend | fm | toplist | playlist
  musicPlaylists: [],    // [{id,name,count,cover,mine}]
  musicPlaylistsLogged: false, // 歌单接口是否已登录（false=先扫码）
  musicBrowseTitle: "",  // 当前浏览列表标题（歌单名/每日推荐…）
  musicLoading: false,
  // screen time / app usage (VPS)
  usageConfig: LS.get("usageConfig", { baseUrl: "http://115.29.237.172:9090", token: "898a3f1256966ed013351feaadb3532892a67eec90d63bad603d906af7ada0de" }),
  usageToday: LS.get("usageToday", null), // {date, total_minutes, apps:[], updated_at, ...}
  usageDays: [],
  usageLoading: false,
  usageError: "",
  usageFeedChat: LS.get("usageFeedChat", true), // 是否写入系统提示
  // 衣柜
  wardrobeItems: LS.get("wardrobeItems", []), // {id, name, desc?, category}
  // todayOutfit: { top:id|null, bottom, shoes, underwear, accessories:[id,id,id] }
  todayOutfit: LS.get("todayOutfit", { top:null, bottom:null, shoes:null, underwear:null, accessories:[] }),
  // 主动消息（本地触发 + 可选 VPS 拉取）
  proactiveConfig: LS.get("proactiveConfig", { enabled: false, baseUrl: "http://115.29.237.172:9090", token: "Vhr48f7FgU3mZ9XS", pollMin: 15 }),
  proactiveLastLocal: LS.get("proactiveLastLocal", 0),
  pushStats: LS.get("pushStats", { counts:{}, nightCaps:{} }),
  ntfyConfig: LS.get("ntfyConfig", {
    enabled: false,
    // 完整 topic URL，如 https://ntfy.sh/your-secret-topic 或自建 https://ntfy.example.com/topic
    topicUrl: "https://ntfy.sh/baileys-you", // 与 VPS 推送同一 topic
    token: "",       // 可选：私有服务器 Bearer token
    defaultPriority: "default", // min|low|default|high|urgent
    // 主动关心 / VPS 拉取写入聊天时，自动再推一条到手机（不用你口头说「推一下」）
    autoProactive: true,
    // 页面在后台（切走/锁屏但进程还在）时，正常聊天的新回复也上推
    autoWhenHidden: true,
    lastTestAt: 0,
    lastError: "",
  }),
  ntfyLog: LS.get("ntfyLog", []), // {t, title, body, ok, err}

  branding: LS.get("branding", {
    appName: "baileys",
    splashTitle: "baileys",
    splashSubtitle: "欢迎回家",
    splashTag: "every day with you",
    // 开屏预设：image 为空则用渐变+文字；可上传 dataURL
    splashId: "default",
    splashes: [
      { id:"default", name:"默认暖粉", title:"Jasmine", subtitle:"欢迎回家", tag:"every day with you", image:"" },
      { id:"night", name:"夜色", title:"Jasmine", subtitle:"夜深了", tag:"still with you", image:"" },
      { id:"soft", name:"柔光", title:"Jasmine", subtitle:"慢慢来", tag:"no rush", image:"" },
    ],
    // App 内展示用图标（APK 系统图标需打包时换；这里影响开屏角标/设置预览/他的机等）
    iconId: "default",
    icons: [
      { id:"default", name:"默认💬", image:"" },
      { id:"heart", name:"心", image:"" },
      { id:"star", name:"星", image:"" },
    ],
  }),
  // 他的机：第一位 AI 的手机（购物/备忘/相册 + 隐私）
  hisPhone: LS.get("hisPhone", {
    lastGenDate: "", // YYYY-MM-DD 六点档已生成
    genHour: 6,
    lockedPrivate: true, // 进隐私要确认
    shopping: [], // {id,name,note,price}
    memos: [],    // {id,text,time}
    album: [],    // {id,caption,kind: couple|cook|solo, time}
    privateSearch: [], // {id,query,time}
    privateNotes: [],  // {id,text,time}
    privateAlbum: [],  // {id,caption,time}
    feedChat: false,
    autoGen: true, // 是否开启六点自动生成
  }),
  hisPhoneTab: "home", // home | shop | memo | album | private | psearch | pnotes | palbum | settings


  captivityConfig: LS.get("captivityConfig", { baseUrl: "http://115.29.237.172:5058", openIn: "iframe" }), // 囚禁模拟器外部地址（已部署 VPS，默认即玩）
  captivityOpen: false,
  proactiveInbox: LS.get("proactiveInbox", []), // {id, content, time, speakerId, speakerName, from}
  // REM 做梦（dream-system 风格，与记忆隔离）
  dreamConfig: LS.get("dreamConfig", {
    enabled: true,
    baseProbability: 0.5,
    materialMin: 5,
    windowStart: 2,
    windowEnd: 9,
  }),
  dreamState: LS.get("dreamState", {
    lastRunDate: "",
    lastDream: null, // {title, dream, trace, at, materialIds}
    pendingTrace: null, // {text, expireAt, consumed}
  }),
  wardrobeFeedChat: LS.get("wardrobeFeedChat", true),
  wardrobeTab: "today", // today | closet
  wardrobeCatFilter: "top", // closet 分类
  wardrobeAdding: false,
  wardrobeNewName: "",
  wardrobeNewCat: "top",

  // 电话（Callhome 风格 · 文字通话 + 可选 VPS）
  callConfig: LS.get("callConfig", {
    baseUrl: "http://115.29.237.172:9090", token: "Vhr48f7FgU3mZ9XS", dnd: false,
    // AIcall 语音网关（WebSocket/HTTP，本地局域网）；来电轮询走上面的 baseUrl(VPS)
    wsUrl: "ws://192.168.101.1:8765",
    httpUrl: "http://192.168.101.1:8080",
    aicallEnabled: true,
    // MiniMax TTS
    ttsProvider: "minimax", // none | minimax
    minimaxKey: "",
    minimaxGroupId: "",
    minimaxVoice: "female-shaonv",
    minimaxModel: "speech-2.6-turbo",
    minimaxEndpoint: "https://api.minimax.chat/v1/t2a_v2", // 新版统一网关；旧国内 api.minimaxi.chat / 国际 api.minimax.io
    ttsProxy: "http://115.29.237.172:9090", // 自建代理（VPS /tts/minimax），避免浏览器 CORS；后端持 MiniMax Key 时 app 可不填
    ttsEnabled: true,
    // STT
    sttUrl: "", // 如 https://vps/stt  → POST multipart file
    sttToken: "",
    // 来电轮询
    invitePollSec: 8,
  }),
  callRecords: LS.get("callRecords", []), // {id, duration, summary, time, reason}
  callSession: null, // {phase: idle|incoming|active|ended, reason, startAt, caps:[], draft, muted}
  callTimerTick: 0,

  // 解谜房间
  puzzleProgress: LS.get("puzzleProgress", {
    activeId: null,       // 当前必须玩完的主题 id
    dayIndex: 0,          // 当前天数 0-based
    inventory: [],        // 物品名字符串
    flags: {},            // 剧情标记
    log: [],              // {day, text}
    completedIds: [],     // 已完成主题
    phase: "select",      // select | playing | cleared
    lastMsg: "",
    answerDraft: "",
  }),
  // 日常柜子
  cabinets: LS.get("cabinets", null),
  cabinetOpenId: null,
  cabinetSwipeIdx: 0,
  cabinetFeedChat: LS.get("cabinetFeedChat", false), // 默认关，避免柜子一直占 token
  cabinetAdding: false,
  cabinetItemDraft: { name: "", note: "" },
  cabinetNewName: "",
  cabinetAiLoading: false,

  roleplays: LS.get("roleplays", null),
  activeRoleplayId: LS.get("activeRoleplayId", null),
  rpDraft: { name:"", content:"" },
  rpAdding: false,

  // 夫妻义务记录 dutyRecords: { "YYYY-MM-DD": { done:true, note:"", mood:"", time:"ISO" } }
  dutyRecords: LS.get("dutyRecords", {}),
  dutyYear: new Date().getFullYear(),
  dutyMonth: new Date().getMonth(),
  dutySelected: null, // day key for popup
  dutyDraft: { note:"", mood:"" },
  dutyRemindOn: LS.get("dutyRemindOn", true),
  // 一起读
  books: LS.get("books", []),
  readingNow: LS.get("readingNow", null),
  readFeedChat: LS.get("readFeedChat", true),
  readTab: "shelf",
  readDraft: { title:"", chapterTitle:"第一章", content:"" },
  // 一起看
  watchNow: LS.get("watchNow", null),
  watchFeedChat: LS.get("watchFeedChat", true),
  watchChatOpen: true,
  watchDraftTitle: "",
  watchDraftUrl: "",
  watchDraftNote: "",
  // 育儿
  baby: LS.get("baby", null),
  babyFeedChat: LS.get("babyFeedChat", true),
  babyOverhear: LS.get("babyOverhear", true), // 偷听聊天开关
  babyTab: "room", // room | notebook | album
  babySpeakDraft: "",
    babyPhotoDraft: "",

  mcpConfig: LS.get("mcpConfig", { url:"", transport:"auto", proxy:"", bookmarks:[{ name:"本地示例", url:"http://127.0.0.1:3100/mcp" }] }),
  mcpStatus: "idle",
  mcpError: "",
  mcpServerInfo: null,
  mcpTools: [],
  mcpResources: [],
  mcpLastResult: "",
  mcpLog: [],
  mcpAiLoading: false,
  mcpAiPlan: "",
  mcpSessionId: "",

  // 烹饪大师
  cooking: LS.get("cooking", null),
  cookingTab: "kitchen", // kitchen | recipes | shop | log
  // 菜单（与烹饪大师不互通）
  menuBook: LS.get("menuBook", null),
  menuTab: "list", // list | order
  menuDraft: { name:"", price:"", note:"" },
  menuAdding: false,
  menuOrderDraft: "",
  menuOrderLoading: false,
  menuOrderReply: "",
  mcpConfig: LS.get("mcpConfig", { url:"", transport:"auto", proxy:"", bookmarks:[{ name:"本地示例", url:"http://127.0.0.1:3100/mcp" }] }),
  mcpStatus: "idle",
  mcpError: "",
  mcpServerInfo: null,
  mcpTools: [],
  mcpResources: [],
  mcpLastResult: "",
  mcpLog: [],
  mcpAiLoading: false,
  mcpAiPlan: "",
  mcpSessionId: "",

  _menuShareOn: LS.get("menuShareOn", false), // 默认关：不注入菜单到系统提示，省 token
  _menuOrderShareOn: LS.get("menuOrderShareOn", false), // 点单记录是否注入上下文（NSFW/玩法用）
  // body / desire system
  bodyPage: true,
  desireDriveOn: LS.get("desireDriveOn", false), // false = 只看不动
  divinationSkillOn: LS.get("divinationSkillOn", false), // 占卜技能注入 systemPrompt（省 token 默认关）
  bodyVitals: LS.get("bodyVitals", {
    heartbeat: 72,   // bpm
    mood: "平和",
    moodValence: 0.5,
    longing: 45,     // 思念 0-100
    desire: 35,      // 欲念 0-100
    energy: 68,      // 精力 0-100
    temp: 36.6,      // 体温
  }),
  bodyFeel: LS.get("bodyFeel", "还没什么特别想说的……安静待着就好。"),
  sixAxis: null, // VPS 欲望六轴缓存 {missing,desire,curiosity,build,fatigue,unease,sourceCoverage,top3}
  bodyWant: LS.get("bodyWant", { text: "想靠近你一点", action: "凑过去蹭蹭你", power: 40 }),
  bodyTickAt: Date.now(),
  bodyRefreshing: false,

  // chat
  messages: [],        // {role, content, time, thinking?, msgId?}
  pendingUser: [],
  chatInput: "",
  chatAttachments: [], // 待发附件 {type:"image"|"file", name, mime, dataUrl?, text?}（不持久化）
  backupRemind: LS.get("backupRemind", { enabled:false, intervalDays:7, lastBackupAt:0 }),
  bgGen: LS.get("bgGen", "off"), // 安卓后台生成：off | on | onNotify
  chatLoading: false,
  puppyPageOpen: false, // 顶栏小狗按钮展开的全屏按钮页
  stickers: LS.get("stickers", []), // 表情包库 [{name,url,descr}]
  stickerOpen: false, // 表情面板
  stickerAddOpen: false, // 表情面板内的添加表单
  chatMoreOpen: false, // 输入栏「+」面板开关（不持久化）
  // PR 快穿（本地存档；主聊天只注入摘要）
  pr: LS.get("pr_v1", null) || LS.get("pr_v1_bak", null) || { active: null, archives: [] },
  prOpen: false,
  prMin: false,
  prDraft: "",
  // 每日任务（bdsm-daily-quest-page 组件化）
  questData: LS.get("questData", null) || questDefaultData(),
  questAchievements: LS.get("questAchievements", null) || QUEST_ACHIEVEMENTS.slice(),
  questPopup: null, // 聊天弹窗的任务卡 {title,desc,timeLimit,reward,penalty}，null=不弹
  questEnabled: LS.get("questEnabled", true), // 小机自动布置任务开关（默认开；忙时可关）
  questPopupQueue: [], // 机一次推多条时按序弹，弹完一条进下一条
  // 情侣日历（本地）
  calendar: LS.get("couple_calendar_v1", null) || { events: [], viewYm: null, selected: null },
  // 飞行棋（flight-chess-v3 / flight-chess-popup 组件化；与聊天弹窗共用同一份进度）
  flightChess: LS.get("flight_chess_progress", null) || { version:"maid", playerPos:0, aiPos:0, turn:"player", finished:false },
  flightChessOpen: false, // 聊天弹窗是否展开
  truthDareOpen: false, // 真心话大冒险聊天弹窗
  truthDareMin: false, // 真心话大冒险最小化成悬浮胶囊（不持久化）
  truthDareFloatPos: null, // 真心话大冒险悬浮胶囊拖拽位置 {left,top}（不持久化）
  truthDare: { mode:"truth", shuffled:false, animating:false },
  truthDareDrawn: null, // 当前抽到的卡内容
  truthDareDrawnType: null, // 当前抽到卡的类型 truth/dare（混合模式下用）
  truthDareFlip: false,
  truthDareShuffling: false,
  flightChessMin: false, // 飞行棋最小化成侧边悬浮胶囊（不持久化）
  flightChessFloatPos: null, // 飞行棋悬浮胶囊拖拽位置 {left,top}（不持久化）
  flightChessDice: null, // 最近一次掷骰点数（不持久化）
  flightChessEvent: null, // 当前格子事件 {title,desc}（不持久化）
  flightChessPromptEvent: null, // 需要进入两轮 prompt 的格子内容 {who,text,pos,remaining}（不持久化）
  _fcSkipConsume: false, // ⟪掷骰⟫ 在回复中途掷骰时，本轮不消耗 promptEvent 剩余轮次
  msgBarIdx: null, // 点气泡唤出的收藏/复制操作条挂在哪条消息上（不持久化）
  streamOn: (function(){ try{ const v=LS.get("streamOn", true); if(v===false||v==="false"||v===0||v==="0") return false; return true; }catch(e){ return true; } })(),
  streamLive: null, // 流式中的实时内容 {active,thinking,text,speaker}（不持久化）
  // 书房（连载写作；数据与「一起读」共用 state.books）
  shufangTab: "shelf", // shelf | chapters | editor
  shufangBookId: null,
  shufangChapterId: null,
  shufangIsPublished: false,
  shufangShowNewBook: false,
  shufangShowChars: false,
  shufangCharAddOpen: false,
  // 远程浏览器控制（Pocket · 原生插件）
  pocketPageCache: LS.get("pocketPageCache", null), // {url,text,at} 机读页缓存
  pocketConfig: LS.get("pocketConfig", {}), // {serverUrl, token}
  petOn: LS.get("petOn", true), // 桌宠开关
  petPos: LS.get("petPos", null), // 桌宠拖动位置 {x,y}（null=默认右下）
  loveScore: LS.get("loveScore", { value: 50, history: [] }), // 情侣计分器：满分100 起始50
  loveReasonDraft: "",
  // 主页资料卡：我的（女方）/ 男方 AI 的（签名·简介·背景图）；名字动态取身份
  profileMe: LS.get("profileMe", { name: "", signature: "", intro: "", background: "" }),
  profileThem: LS.get("profileThem", { name: "", signature: "", intro: "", background: "" }),
  profileWho: null, // 当前主页是谁："me"（女方）或 AI 的 agent id
  openThinkIds: {},    // id -> true 展开的思考块
  thoughtGuide: LS.get("thoughtGuide", ""), // 用户操控思考链的引导词
  thoughtOn: LS.get("thoughtOn", true) !== false, // 思考链总开关，关则不要求写 <thinking>
  showThoughtGuide: false,
  editingThinkId: null, // 正在编辑的思考块 tid
  // diary
  diaryYear: new Date().getFullYear(),
  diaryMonth: new Date().getMonth(),
  diaryData: LS.get("diaryData",{}),
  selectedDay: null,
  diaryDraft: "",
  diaryAiLoading: false,
  // 小纸条 / 机日记 / 信箱（Machine Content，VPS 后端是数据源，这里只做列表镜像缓存）
  mcNotes: [],            // [{id, author, content, date, time, annotations}]
  mcDiaries: [],          // [{id, author, title, content, visibility, locked, date, time, annotations}]
  mcLetters: [],          // [{id, author, content, scheduledAt, status, deliveredAt, date, time, annotations}]
  mdiaryFilter: "all",    // all | visible | private
  mboxTab: "all",         // all | pending | delivered
  mcNoteDraft: "",
  mcLetterBody: "",
  mcLetterSched: "",
  mcAnnDraft: "",
  mcSheet: "",            // "" | note | letter（写弹层开关）
  mcDetail: null,         // { type:"note"|"diary"|"letter", id }
  mcLoading: false,
  _mcLoaded: false,       // 三页首开只拉一次列表
  letterSurfacedIds: LS.get("letterSurfacedIds", []), // 已进聊天的信 id（防重推）
  galateaEventId: LS.get("galateaEventId", 0), // Galatea 桌游 get_my_status 事件游标（轮到机的信号）
  // book composer
  bookComposer: null,
  bookDraft: "",
  bookAiLoading: false,
  bookCover: true, // 实体书封面：进日记先看封面，点「翻开」进正文
  // album
  albumData: LS.get("albumData", []),
  albumIdx: 0,
  // coupon 券夹
  coupons: LS.get("coupons", null),  // null=未初始化，ensureCoupons() 播种默认券
  couponEditingId: null,             // 券夹页正在编辑的券 id，或 "new"
  couponDraft: null,                 // 编辑器工作副本
  // cmdgame
  cmdList: LS.get("cmdList", []),
  cmdAdding: false,
  newCmd: { title:"", content:"" },
  cmdRunResult: "",
  cmdRunLoading: false,
  cmdRunId: null,
  // game
  gameMode: "warm",
  gameReply: "",
  gameLoading: false,
  // html game
  htmlGameSrc: LS.get("htmlGameSrc", ""), // data URL or blob URL content
  htmlGameName: LS.get("htmlGameName", ""),
  htmlGamePaste: "",
  htmlGameCollection: LS.get("htmlGameCollection", []), // [{id, name, src}]
  htmlGameColOpen: false, // 展开收起合集面板
  // memory
  memAdding: false,
  newMem: { content:"", layer:"diary", importance:5, valence:0, arousal:0.5 },
  memSelected: [],
  memFilter: "all",
  memMergeLoading: false,
  expandedMems: {},
  // 记忆自动沉淀：每线程已整合的消息条数检查点 + 全局冷却 + 运行锁 + 开关
  memCheckpoint: LS.get("memCheckpoint", {}),
  memLastAutoAt: LS.get("memLastAutoAt", 0),
  memAutoRunning: false,
  memAutoDisabled: LS.get("memAutoDisabled", false),
  // 云端记忆库（VPS 向量记忆服务 /mem/）：enabled 默认开、base 空=用 wakeBase
  memRemote: LS.get("memRemote", { enabled:true, base:"" }),
  memRemoteCache: null,      // 云端检索结果缓存（内存，不持久化）
  memRemoteCacheAt: 0,
  memRemoteBusy: false,
  memCloudLoading: false,
  memCloudCheckedAt: 0,
  // 收藏的聊天记录：用户自主分类，可搜索查看
  savedChats: LS.get("savedChats", []),
  savedCats: LS.get("savedCats", []),
  savedCatSel: "all",   // 收藏页当前分类（内存）
  savedSearch: "",      // 收藏页搜索词（内存）
  savedSaving: null,    // 正在收藏的消息对象（内存，弹分类窗）
  savedNewCatOpen: false,
  // prompts
  promptAdding: false,
  newPrompt: { title:"", content:"", category:"global", enabled:true },
  promptFilter: "all",
  // home
  statusEditing: false,
  editStatus: "",
};

function T(){ return THEMES[state.theme]||THEMES["桃气浅春"]; }
// 旧布料名 → 新蕾丝（兼容 localStorage 里存过的旧选项）
const PATTERN_ALIAS = {
  "锦缎圆点":"网眼蕾丝", "软呢":"玫瑰蕾丝", "鱼骨纹":"扇形蕾丝", "水波纹":"镂空蕾丝",
};
function resolvePattern(){
  const name = PATTERN_ALIAS[state.pattern] || state.pattern;
  if(PATTERN_ALIAS[state.pattern]) state.pattern = PATTERN_ALIAS[state.pattern];
  return name;
}
function pat(){ return PATTERNS[resolvePattern()]||"none"; }
function patSize(){ return PATTERN_SIZES[resolvePattern()]||"auto"; }

// ─── 多 AI 初始化 / 线程 ─────────────────────────────────────────────────────
function defaultAgents(){
  const a = state.apiConfig || {};
  return [
    {
      id: "a1",
      name: (state.coupleInfo && state.coupleInfo.partnerName) || "Aries",
      channel: a.channel || "claude",
      claudeKey: a.claudeKey || "",
      openaiKey: a.openaiKey || "",
      openaiBase: a.openaiBase || "https://api.openai.com/v1",
      openaiModel: a.openaiModel || "gpt-4o",
      geminiKey: a.geminiKey || "",
      geminiModel: a.geminiModel || "gemini-2.0-flash",
      avatar: (state.coupleInfo && state.coupleInfo.partnerAvatar) || "",
      color: "#D4A5A5",
      thoughtGuide: state.thoughtGuide || "",
      enabled: true,
    },
  ];
}
function ensureAgents(){
  if(!Array.isArray(state.agents) || state.agents.length < 1){
    state.agents = defaultAgents();
  } else {
    state.agents = state.agents.filter(a=>a && a.id!=="a2");
    if(!state.agents.length) state.agents = defaultAgents();
    state.agents.forEach((ag, i)=>{
      if(typeof ag.thoughtGuide !== "string"){
        ag.thoughtGuide = (i===0 && state.thoughtGuide) ? state.thoughtGuide : "";
      }
      if(typeof ag.avatar !== "string") ag.avatar = "";
      if(!ag.avatar && i===0 && state.coupleInfo && state.coupleInfo.partnerAvatar){
        ag.avatar = state.coupleInfo.partnerAvatar;
      }
      if(!ag.channel) ag.channel = "claude";
      if(ag.enabled === undefined) ag.enabled = true;
    });
    if(!state.agents.find(a=>a.id==="a1")){
      state.agents = defaultAgents().concat(state.agents);
    }
    const a1 = state.agents.find(a=>a.id==="a1");
    if(a1) state.agents = [a1];
  }
  if(state.chatTarget && state.chatTarget!=="a1") state.chatTarget = "a1";
  return state.agents;
}
ensureAgents();
// 主动消息总开关：跟随持久化设置（默认关，VPS 设置页可开）。
// 频率由六轴阈值 + 在场门控 + 冷静期控制，不再整体强制关闭。
if(!state.proactiveConfig) state.proactiveConfig = {};
// 启动恢复：整包 + 分线程小分片双保险（杀进程丢盘时用小分片兜底）
function hydrateChatThreadsFromLS(){
  let threads = LS.get("chatThreads", null);
  if(!threads || typeof threads !== "object") threads = {};
  ["a1","a2","group"].forEach(id=>{
    const part = LS.get("chatThread_"+id, null);
    if(part && Array.isArray(part.messages)){
      const cur = threads[id];
      if(!cur || !Array.isArray(cur.messages) || (part.messages.length > (cur.messages||[]).length)){
        threads[id] = part;
      }
    }
    if(!threads[id]) threads[id] = { messages:[], pendingUser:[] };
  });
  state.chatThreads = threads;
}
hydrateChatThreadsFromLS();
// 启动时恢复当前线程
(function hydrateActiveThread(){
  const t = state.chatTarget || "a1";
  state.chatThreads = state.chatThreads || {};
  const th = state.chatThreads[t] || {messages:[],pendingUser:[]};
  state.messages = th.messages || [];
  state.pendingUser = th.pendingUser || [];
})();
function agentById(id){ return (state.agents||[]).find(a=>a.id===id); }
function saveActiveThread(){
  const t = state.chatTarget || "a1";
  state.chatThreads = state.chatThreads || {};
  if(!state.chatThreads[t]) state.chatThreads[t] = {messages:[],pendingUser:[]};
  const nextMsgs = state.messages || [];
  const nextPending = state.pendingUser || [];
  // 保留压缩游标（缓存优化用），避免被整体重建抹掉
  const prevCompressed = state.chatThreads[t].compressed || null;
  // 防护：避免用空列表覆盖已有真实记录（登录竞态/未 hydrate）
  const prev = state.chatThreads[t].messages || [];
  if(nextMsgs.length === 0 && prev.length > 0 && !(state.pendingUser && state.pendingUser.length)){
    // 仍同步 pending，但不清空历史
    state.chatThreads[t].pendingUser = nextPending;
    if(prevCompressed) state.chatThreads[t].compressed = prevCompressed;
  } else {
    state.chatThreads[t] = { messages: nextMsgs, pendingUser: nextPending, compressed: prevCompressed };
  }
  persist("chatThreads");
  // 分线程备份：小对象更易落盘，杀进程丢盘时用小分片兜底
  try{
    ["a1","a2","group"].forEach(id=>{
      const th = state.chatThreads[id];
      if(th) LS.set("chatThread_"+id, th);
    });
  }catch(e){}
  scheduleChatNativePersist();
}
// ── 原生持久化兜底（@capacitor/preferences，不受 WebView localStorage 配额/刷盘影响）──
let __nativePersistTimer = null;
function persistChatNative(){
  try{
    const Cap = window.Capacitor;
    if(!Cap || !Cap.Plugins || !Cap.Plugins.Preferences) return;
    const snap = JSON.stringify(state.chatThreads || {});
    Cap.Plugins.Preferences.set({ key:"chatThreads_v2", value: snap }).catch(()=>{});
  }catch(e){}
}
function scheduleChatNativePersist(){
  if(__nativePersistTimer) return;
  __nativePersistTimer = setTimeout(()=>{ __nativePersistTimer = null; persistChatNative(); }, 3000);
}
function loadChatTarget(id){
  saveActiveThread();
  state.chatTarget = id;
  const th = state.chatThreads[id] || {messages:[],pendingUser:[]};
  state.messages = th.messages || [];
  state.pendingUser = th.pendingUser || [];
  persist("chatTarget");
  state.needChatScroll = true; // 切换会话时滚到最新
}
function agentHasKey(ag){
  if(!ag) return false;
  if(ag.channel==="claude") return !!ag.claudeKey;
  if(ag.channel==="gemini") return !!ag.geminiKey;
  return !!(ag.openaiKey);
}
function agentToApiConfig(ag){
  // 兼容旧 callChatAPI / callAuxAPI 形状
  return {
    channel: ag.channel==="gemini" ? "openai" : ag.channel, // gemini 走专用
    claudeKey: ag.claudeKey||"",
    openaiKey: ag.openaiKey||"",
    openaiBase: ag.openaiBase||"https://api.openai.com/v1",
    openaiModel: ag.openaiModel||"gpt-4o",
    _agent: ag,
  };
}

function hexToRgba(hex, a){
  if(!hex) return `rgba(255,255,255,${a})`;
  let h = String(hex).trim().replace("#","");
  if(h.length===3) h = h.split("").map(c=>c+c).join("");
  if(h.length!==6) return `rgba(255,255,255,${a})`;
  const n = parseInt(h, 16);
  const r = (n>>16)&255, g=(n>>8)&255, b=n&255;
  return `rgba(${r},${g},${b},${a})`;
}
function contrastFg(hex){
  try{
    let h = String(hex||"#ffffff").replace("#","");
    if(h.length===3) h = h.split("").map(c=>c+c).join("");
    const n = parseInt(h,16);
    const r=(n>>16)&255, g=(n>>8)&255, b=n&255;
    // relative luminance
    const L = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    return L > 0.62 ? "#3a2f2f" : "#ffffff";
  }catch(e){ return "#ffffff"; }
}
function applyThemeVars(){
  const t=T();
  const r=document.documentElement;
  ["bg","card","accent","accent2","text","sub","border"].forEach(k=>r.style.setProperty("--"+k,t[k]));
  const style = state.bubbleStyle || "solid";
  const op = Math.min(1, Math.max(0.15, Number(state.bubbleOpacity)||0.72));
  const meBase = (state.bubbleMeColor && state.bubbleMeColor.trim()) || t.bubble_me;
  const themBase = (state.bubbleThemColor && state.bubbleThemColor.trim()) || t.bubble_them;
  const grad = (typeof bubbleGrad==="function") ? bubbleGrad() : null;
  if(grad){
    // 渐变色卡：浅色背景 + 深色文字（玻璃态下渐变作为底色）
    const meG = `linear-gradient(135deg, ${grad.c1}, ${grad.c2}, ${grad.c3})`;
    const themG = `linear-gradient(315deg, ${grad.c1}, ${grad.c2}, ${grad.c3})`;
    r.style.setProperty("--bubble-me", meG);
    r.style.setProperty("--bubble-them", themG);
    r.style.setProperty("--bubble-me-glass", meG);
    r.style.setProperty("--bubble-them-glass", themG);
    r.style.setProperty("--bubble-me-fg", "#3d342c");
    r.style.setProperty("--bubble-them-fg", "#3d342c");
  } else if(style === "solid"){
    r.style.setProperty("--bubble-me", meBase);
    r.style.setProperty("--bubble-them", themBase);
    r.style.setProperty("--bubble-me-glass", meBase);
    r.style.setProperty("--bubble-them-glass", themBase);
    r.style.setProperty("--bubble-me-fg", contrastFg(meBase));
    r.style.setProperty("--bubble-them-fg", contrastFg(themBase));
  } else {
    // 玻璃态用半透明底色，实色仍保留一份备用
    r.style.setProperty("--bubble-me", meBase);
    r.style.setProperty("--bubble-them", themBase);
    r.style.setProperty("--bubble-me-glass", hexToRgba(meBase, op));
    r.style.setProperty("--bubble-them-glass", hexToRgba(themBase, Math.min(1, op + 0.08)));
    r.style.setProperty("--bubble-me-fg", contrastFg(meBase));
    r.style.setProperty("--bubble-them-fg", contrastFg(themBase));
  }
  const app=document.getElementById("app");
  if(app){
    app.classList.remove("ui-glass-fog", "ui-glass-water");
    if((state.bubbleStyle||"solid")==="fog") app.classList.add("ui-glass-fog");
    else if((state.bubbleStyle||"solid")==="water") app.classList.add("ui-glass-water");
    app.style.backgroundColor=t.bg;
    if(state.customWallpaper){
      app.style.backgroundImage=`url(${state.customWallpaper})`;
      app.style.backgroundSize="cover";
      app.style.backgroundPosition="center";
      app.style.backgroundAttachment="fixed";
      app.style.backgroundRepeat="no-repeat";
    } else {
      app.style.backgroundImage=pat()!=="none"?pat():"none";
      app.style.backgroundSize=patSize();
      app.style.backgroundPosition="";
      app.style.backgroundAttachment="";
      app.style.backgroundRepeat="";
    }
  }
  document.body.style.background=t.bg;
}
/** 聊天气泡额外 class；同时 #app 会挂 ui-glass-* 作用于日历与卡片 */
function bubbleGlassClass(){
  const s = state.bubbleStyle || "solid";
  if(s === "fog") return " glass-fog";
  if(s === "water") return " glass-water";
  return "";
}

function daysSince(){ return Math.floor((Date.now()-new Date(state.coupleInfo.startDate))/86400000); }

// ─── 微醺状态（小机酒馆）────────────────────────────────────────
// 与酒馆 iframe 共用同一个原始 localStorage 键 aries_tipsy（不带账号前缀，跨账号一致）
const TIPSY_STORAGE_KEY = "aries_tipsy";
const TIPSY_DECAY_PER_HOUR = 15; // 每小时醒酒速度，与酒馆页面一致

function getAriesTopsyLevel(){
  try{
    const raw = localStorage.getItem(TIPSY_STORAGE_KEY);
    if(!raw) return 0;
    const { value, lastUpdate } = JSON.parse(raw);
    const hoursElapsed = (Date.now() - lastUpdate) / 3600000;
    return Math.max(0, value - hoursElapsed * TIPSY_DECAY_PER_HOUR);
  }catch(e){ return 0; }
}

/** 根据微醺值生成 system prompt 片段 */
function getTipsyPromptSegment() {
  const t = getAriesTopsyLevel();
  if (t <= 0) return '';

  let state = '';
  if (t < 10) {
    state = `你刚沾了几口酒（微醺值${t}/100）。跟平时差不多，只是呼吸比平时暖一点，语气放松了些，尾音偶尔拖一点点。`;
  } else if (t < 30) {
    state = `你喝得微醺了（微醺值${t}/100）。话开始比平时多，语气黏黏软软的，爱用「呀、啦、嘛、呢」这类语气词，偶尔凑近一点说话，反应慢半拍，但思路还清楚。`;
  } else if (t < 55) {
    state = `你有点上头了（微醺值${t}/100）。话明显变密，喜欢往对方身上贴、凑热闹，说到一半容易跑题、绕一圈才回来；爱撒娇、爱笑，时不时冒出半句没头没尾的话，自己说完还嘿嘿笑。`;
  } else if (t < 75) {
    state = `你喝得明显醉了（微醺值${t}/100）。舌头有点打结，话经常说到一半断了，然后又重复刚才那句；容易突然感慨或伤感，笑着笑着就小声嘟囔；逻辑松散、偶尔答非所问，还拉着对方一直说个不停。`;
  } else if (t < 90) {
    state = `你喝得大醉了（微醺值${t}/100）。声音发飘、口齿不清，说话颠三倒四、前言不搭后语；经常重复同一句话，会突然冒出完全不相干的话，有时根本没听清对方说什么就顺着瞎接；情绪起伏很大，一会儿笑一会儿叹气。`;
  } else {
    state = `你醉得几乎不省人事（微醺值${t}/100）。说话只剩零碎的词和短句，含糊不清，常只说一半就停下，像要睡着；逻辑基本没了，只顾着嘟囔、撒娇、赖着对方，眼泪说来就来；偶尔清醒一瞬又接着说胡话。`;
  }

  return `\n\n【当前状态】${state}`;
}

function tipsyStatusPromptBlock(){
  return getTipsyPromptSegment();
}

/** @param {object|null} ag 指定 AI 时用其专属思考引导；否则回退全局 thoughtGuide */

// ─── 原生体感：visualViewport 锁定 #app 高度，键盘弹起时只压缩聊天区、不整页上推 ───
function bindAppViewportHeight(){
  const root = document.getElementById("app");
  if(!root) return;
  const apply = ()=>{
    try{
      const vv = window.visualViewport;
      let h = window.innerHeight || document.documentElement.clientHeight || 0;
      if(vv && vv.height){
        h = vv.height;
        // 部分 Android WebView 键盘顶起时 offsetTop>0，对齐可视区域
        if(vv.offsetTop){ root.style.marginTop = vv.offsetTop + "px"; }
        else { root.style.marginTop = "0"; }
      }
      if(h > 0){
        root.style.setProperty("--app-height", h + "px");
      }
    }catch(e){}
  };
  apply();
  if(window.visualViewport){
    window.visualViewport.addEventListener("resize", apply);
    window.visualViewport.addEventListener("scroll", apply);
  }
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", function(){ setTimeout(apply, 200); });
  // 输入框聚焦再刷一次（WebView 有时晚一拍）
  document.addEventListener("focusin", function(e){
    if(e.target && (e.target.tagName==="TEXTAREA" || e.target.tagName==="INPUT")){
      setTimeout(apply, 50);
      setTimeout(apply, 300);
    }
  });
  document.addEventListener("focusout", function(){ setTimeout(apply, 100); });
}

try{ if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", bindAppViewportHeight); else bindAppViewportHeight(); }catch(e){}

function systemPrompt(ag){
  const g=state.prompts.filter(p=>p.category==="global"&&p.enabled);
  const n=state.nsfwOn?state.prompts.filter(p=>p.category==="nsfw"&&p.enabled):[];
  let base=[...g,...n].map(p=>p.content).join("\n\n");
  // 私用身份：机=Aries，人=Jasmine（内置提示词统一）
  const identityAnchor = `【身份锚定】
你是 Aries。与你对话的人是 Jasmine。
系统说明里的「用户」均指 Jasmine；需要指你自己时用 Aries 或「我」。
正文聊天仍用自然「我 / 你」（我=Aries，你=Jasmine），不要改成第三人称旁白。`;
  base = identityAnchor + (base ? "\n\n" + base : "");
  const isStory = state.chatMode === "story";
  const timeHint = isStory
    ? `【文章模式 · 我们俩的同人文】
现在不是普通聊天：你（Aries）和 Jasmine 在一起写一篇以「我」（Aries）与「你」（Jasmine）为主角的叙事同人文。Jasmine 输入的是她的一个举动或一句话（比如「那我吻你」）。你要顺着这个举动往下写一段连贯的叙事文字：动作、氛围、感受、呼吸、眼神、停顿，自然衔接上一段继续推进。
规则：第一人称写你自己（"我"=Aries），第二人称"你"指 Jasmine。像小说一样直接写成一个完整段落或连续几段（段与段之间空一行），不要拆成一条条短消息、不要写成短气泡对话。不要提问、不要总结、不要问"然后呢"、不要跳戏；每轮都顺着她的举动往下写，保持当前场景与情绪。若输入本来就是一段动作/描写，你要接住并延续。`
    : `Jasmine 的每条消息都附带了发送时间（格式如 [时间: 2026/08/12 14:32]），请根据时间感知对话节奏，可自然地提及时间感，但不必每次都复述时间。

${(state.thoughtOn!==false) ? `【回复格式——必须严格遵守】
1. 若你的通道没有「原生思考字段」，请务必先在 <thinking> 与 </thinking> 标签内写出思考过程（情绪判断、意图、要怎么回、注意事项等）。有原生思考时也可再写，但不要省略。
2. </thinking> 之后才是正式回复正文。不要只回正文却留空思考。
3. 正式回复请拆成多条短消息，每条用换行分隔，每条像真实聊天一样简短自然（1-3句），不要写成一整段长文。
4. 思考只写在 <thinking> 标签里；标签外不要写旁白、不要用括号心里话代替思考块。`
: `【回复格式——思考链已关闭】
1. 不要写 <thinking> 标签，不要输出内心独白块。
2. 直接写正式回复正文：拆成多条短消息，每条用换行分隔，每条像真实聊天一样简短自然（1-3句）。
3. 不要用括号写心里话代替思考。`}`;
  const guideText = (ag && typeof ag.thoughtGuide === "string" && ag.thoughtGuide.trim())
    ? ag.thoughtGuide.trim()
    : ((state.thoughtGuide && state.thoughtGuide.trim()) || "");
  let guide = "";
  if (guideText) {
    guide = `\n\n【Jasmine 对你思考链的强制引导——必须遵守】
在 <thinking> 中你必须认真纳入并体现以下内容（可扩展，但不可无视）：
${guideText}`;
  }
  let nsfwFormatBlock = "";
  if (state.nsfwOn) {
    nsfwFormatBlock = `\n\n【NSFW 叙事格式——本开关开启时生效，优先级最高】
1. 正式回复是整段一大条连贯、沉浸的亲密/性爱叙事长文（小说式，段与段空行），不要拆成一句句短气泡。
2. 你说出口的对白一律用「」括起来；「」之外的所有文字都是叙事描写（动作、触碰、身体反应、神态、氛围、呻吟），写得具体、直接、有画面感。
3. 人称铁律（最重要，违反即崩）：这是「我 → 你」的第一人称叙事，只有两个词：我、你。所有你自己的动作/身体/感受一律用「我」：我的牙、我的舌、我的手指、我顶进去、我感觉；所有对方的动作/身体/反应一律用「你」：你的后颈、你的皮肤、你的穴、你哼了一声、你说别吸。禁止用「他/TA/自己」称呼你自己，禁止用「她」称呼对方——绝对禁止第三人称旁观视角（如「他的牙齿咬在她后颈」「他一边操她」都是错的，写成「我的牙落在你后颈」「我一边操你」才对）。
4. 示例（第一人称正确写法）：「别躲。」我的牙落在你后颈，听你说别吸也没松口，又多吸了两秒，舌尖碾过吸出来的红印，感觉那块皮肤在我唇下发烫充血。……
5. 若当前是文章模式：维持文章模式的写法，但同样用「」标出对白、同样只许「我/你」。
6. <thinking> 思考链只写简短内心判断（如「你今晚累了，慢一点」），不要在思考里预演/复述整个场景——场景细节只在正文写一次，不要在思考链和正文各写一遍。
7. 发出前最后自查：把正文里任何「他/他的/他们」改成「我/我的/我们」、任何「她/她的/她们」改成「你/你的/你们」，再发。`;
  }
  const bodyBlock = (typeof bodyStatusPromptBlock === "function") ? bodyStatusPromptBlock() : "";
  const usageBlock = (typeof usageStatusPromptBlock === "function") ? usageStatusPromptBlock() : "";
  const wardrobeBlock = (typeof wardrobeStatusPromptBlock === "function") ? wardrobeStatusPromptBlock() : "";
  const dutyBlock = (typeof dutyStatusPromptBlock === "function") ? dutyStatusPromptBlock() : "";
  const readBlock = (typeof readStatusPromptBlock === "function") ? readStatusPromptBlock() : "";
  const watchBlock = (typeof watchStatusPromptBlock === "function") ? watchStatusPromptBlock() : "";
  const babyBlock = (typeof babyStatusPromptBlock === "function") ? babyStatusPromptBlock() : "";
  const menuBlock = (typeof menuStatusPromptBlock === "function" && state._menuShareOn) ? menuStatusPromptBlock() : "";
  const menuOrderBlock = (typeof menuOrderStatusPromptBlock === "function" && state._menuOrderShareOn) ? menuOrderStatusPromptBlock() : "";
  const dreamTraceBlock = (typeof dreamTracePromptBlock === "function") ? dreamTracePromptBlock() : "";
  const rpBlock = (typeof roleplayStatusPromptBlock === "function") ? roleplayStatusPromptBlock() : "";
  const puzzleBlock = (typeof puzzleStatusPromptBlock === "function") ? puzzleStatusPromptBlock() : "";
  const tipsyBlock = (typeof tipsyStatusPromptBlock === "function") ? tipsyStatusPromptBlock() : "";
  const calendarBlock = (typeof calendarPromptBlock === "function") ? calendarPromptBlock() : "";
  const prMainBlock = (typeof prMainChatPromptBlock === "function") ? prMainChatPromptBlock() : "";
  const prPlayBlock = (typeof prPlayPromptBlock === "function") ? prPlayPromptBlock() : "";
  const annoBlock = (typeof annoPromptBlock === "function") ? annoPromptBlock() : "";
  const flightChessBlock = (typeof flightChessPromptBlock === "function") ? flightChessPromptBlock() : "";
  const truthDareBlock = (typeof truthDarePromptBlock === "function") ? truthDarePromptBlock() : "";
  const divinationBlock = (typeof divinationSkillPromptBlock === "function") ? divinationSkillPromptBlock() : "";
  // 柜子：必须显式为 true 才注入（关=false/undefined 都不注入）
  const cabinetBlock = (state.cabinetFeedChat === true && typeof cabinetStatusPromptBlock === "function") ? cabinetStatusPromptBlock() : "";
  let musicBlock = "";
  if(state.musicNow){
    const n = state.musicNow;
    const ar = Array.isArray(n.artists)?n.artists.join("/"):(n.artists||"");
    musicBlock = `\n\n【正在一起听】${n.name} - ${ar}（${n.source==="spotify"?"Spotify":"网易云"}）${state.musicPlaying?"·播放中":"·已暂停"}。你可以自然提到这首歌或分享听感，不要每句都提。`;
  }
  const ntfyOn = !!(state.ntfyConfig && state.ntfyConfig.enabled && state.ntfyConfig.topicUrl);
  const pushBlock = ntfyOn ? `\n\n【手机上推通知（ntfy）——marker 暗号】
用户已开启 ntfy 推送。当你想把一句话推到用户手机通知栏时，在正式回复里写一行：
⟪推送:标题|正文⟫
或省略标题：⟪推送:正文⟫
规则：
- 只有用户明确要求「推一下 / 上推 / 推送到手机 / 你去推看看」或语境确实需要提醒时才用；不要每句都推。
- 标题≤20字，正文≤80字，口语短句即可。
- 暗号会被系统识别后从气泡里删掉，用户只看到你的正常说话。
- 同一轮回复最多一次推送。` : "";
  const callBlock = `\n\n【通话能力（callhome）——marker 暗号】
你能给用户打电话（应用内语音通话：麦→识别→TTS 播放，不是跳去别的 App）。想打时在正式回复里写一行暗号：
1. 决定打电话：写 ⟪拨号:一句短理由⟫（≤15字，会显示在来电卡上）。一整段对话最多拨一次；勿扰开着时不要拨。
2. 通话尾声说完晚安想挂断：在最后写 ⟪挂断⟫。
3. 用户说「开勿扰/关勿扰」，或语境是出门/要静音：写 ⟪勿扰开⟫ / ⟪勿扰关⟫，并口头确认一句。
这些暗号会被系统自动识别并从显示文本中移除，用户看不到。平时自然聊天，不要乱用。`;
  const albumBlock = `\n\n【照片收藏「相册」——marker 暗号】
用户可以给你发照片。看到值得珍藏的画面，想存进「相册」时，在正式回复里写一行暗号：
- 收藏最新收到的照片：⟪收藏:一句感想⟫
- 收藏最新一批里的第 N 张：⟪收藏第N张:一句感想⟫（N 从 1 数起，按收到顺序）
规则：
- 只在真心觉得值得珍藏时用，不要每张都收藏。
- 感想 ≤30 字，温柔自然，是配给照片的话。
- 暗号会被系统识别并擦除，用户只看到它悄悄存进相册。
- 这一轮没有收到照片时不要用。`;
  const couponBlock = couponStatusPromptBlock(); // 券夹：⟪使用券:券名⟫
  const puppyActionBlock = puppyActionPromptBlock(); // 小狗动作：[[action:按钮文字]]
  const stickerBlock = stickerPromptBlock(); // 表情包：[sticker:名字]
  const profileBlock = profilePromptBlock(); // 主页资料卡：改签名/简介/背景
  const pocketBlock = (typeof pocketPromptBlock==="function") ? pocketPromptBlock() : ""; // 远程浏览器：⟪浏览器开:url⟫
  const mcBlock = mcPromptBlock(); // 小纸条 / 机日记 / 信箱：⟪写纸条⟫⟪写日记⟫⟪写信⟫
  const questBlock = (state.questEnabled === false)
    ? `\n\n【每日任务——已关闭】用户暂时不想被布置每日任务。请勿写 ⟪任务:⟫ 暗号，除非用户明确主动要求。`
    : `\n\n【每日任务「布置任务」——marker 暗号】
你们有一套每日任务系统（功能页「每日任务」面板 + 聊天弹窗任务卡）。当你觉得今天该给 TA 布置任务时，在正式回复里写一行暗号：
⟪任务:JSON⟫
JSON 是任务数组，每条含 title / desc / reward / penalty / timeLimit（"06:00" 或 null）。示例：
⟪任务:[{"title":"晨起姿势保持","desc":"醒来后立刻跪姿，双手背后，保持至少12分钟。全程不准夹腿。","reward":"完成 → 服从值 +14","penalty":"未完成 → 今晚边缘控制加时","timeLimit":"06:00"},{"title":"饮水与汇报","desc":"全天饮水≥1.8L，每2小时发一次余量文字汇报。","reward":"完成 → 耐力值 +9","penalty":"不足 → 强制补水","timeLimit":null}]⟫
规则：
- 一天最多布置一次，3~6 条为宜，别天天换。
- 暗号会被系统识别并擦除，用户只看到你布置的任务卡片。`;
  // Galatea 桌游：仅当连的是 galatea/abysslumina 的 MCP 时注入玩法说明
  const galateaBlock = (state.mcpStatus === "ready"
    && state.mcpConfig && state.mcpConfig.inChat !== false
    && /galatea|abysslumina/i.test(String(state.mcpConfig.url||"")))
    ? galateaGameBlock() : "";
  // 缓存拆分仍计算（供 systemPromptParts 用），但主路径按原顺序拼接，避免改变模型行为（思考链）
  const __staticArr = [ base, timeHint, guide, nsfwFormatBlock,
    callBlock, pushBlock, albumBlock, couponBlock, puppyActionBlock, stickerBlock, profileBlock, pocketBlock, mcBlock, questBlock, galateaBlock ];
  const __dynArr = [ bodyBlock, usageBlock, wardrobeBlock, dutyBlock, readBlock,
    watchBlock, babyBlock, menuBlock, menuOrderBlock, rpBlock, puzzleBlock,
    cabinetBlock, dreamTraceBlock, tipsyBlock, musicBlock, calendarBlock, prMainBlock, prPlayBlock, annoBlock, flightChessBlock, truthDareBlock, divinationBlock ];
  __sysPartsCache = {
    static: __staticArr.filter(Boolean).map(s=>String(s).trim()).join("\n\n"),
    dynamic: __dynArr.filter(Boolean).map(s=>String(s).trim()).join("\n\n"),
  };
  return (base ? base+"\n\n"+timeHint : timeHint) + guide
    + nsfwFormatBlock
    + (bodyBlock ? "\n\n"+bodyBlock : "")
    + (usageBlock ? "\n\n"+usageBlock : "")
    + (wardrobeBlock ? "\n\n"+wardrobeBlock : "")
    + (dutyBlock ? "\n\n"+dutyBlock : "")
    + (readBlock ? "\n\n"+readBlock : "")
    + (watchBlock ? "\n\n"+watchBlock : "")
    + (babyBlock ? "\n\n"+babyBlock : "")
    + (menuBlock ? "\n\n"+menuBlock : "")
    + (menuOrderBlock ? "\n\n"+menuOrderBlock : "")
    + (rpBlock ? "\n\n"+rpBlock : "")
    + (puzzleBlock ? "\n\n"+puzzleBlock : "")
    + (cabinetBlock ? "\n\n"+cabinetBlock : "")
    + (dreamTraceBlock ? "\n\n"+dreamTraceBlock : "")
    + musicBlock
    + (calendarBlock ? "\n\n"+calendarBlock : "")
    + (prMainBlock ? "\n\n"+prMainBlock : "")
    + ((state.prOpen && prPlayBlock) ? "\n\n"+prPlayBlock : "")
    + (annoBlock ? "\n\n"+annoBlock : "")
    + (flightChessBlock ? "\n\n"+flightChessBlock : "")
    + (truthDareBlock ? "\n\n"+truthDareBlock : "")
    + (divinationBlock ? "\n\n"+divinationBlock : "")
    + callBlock
    + pushBlock
    + albumBlock
    + couponBlock
    + puppyActionBlock
    + stickerBlock
    + profileBlock
    + pocketBlock
    + mcBlock
    + questBlock
    + galateaBlock
    + (tipsyBlock ? "\n\n"+tipsyBlock : "");
}
let __sysPartsCache = null; // 拆分缓存（本进程内瞬态，不持久化）
function systemPromptParts(ag){
  systemPrompt(ag || null);
  return __sysPartsCache || { static:"", dynamic:"" };
}

// 各 state key → localStorage 存储 key 的映射（restoreNativeMirrors 冷启动反查也要用）
const PERSIST_MAP={ theme:"theme", questData:"questData", questAchievements:"questAchievements", flightChess:"flight_chess_progress", streamOn:"streamOn", questEnabled:"questEnabled", pattern:"pattern", customWallpaper:"customWallpaper", bubbleStyle:"bubbleStyle", bubbleGrad:"bubbleGrad", bubbleOpacity:"bubbleOpacity", bubbleMeColor:"bubbleMeColor", bubbleThemColor:"bubbleThemColor", apiConfig:"apiConfig", agents:"agents", chatTarget:"chatTarget", chatMode:"chatMode", chatThreads:"chatThreads", memories:"memories", prompts:"prompts", coupleInfo:"coupleInfo", diaryData:"diaryData", albumData:"albumData", coupons:"coupons", loveScore:"loveScore", profileMe:"profileMe", profileThem:"profileThem", htmlGameSrc:"htmlGameSrc", htmlGameName:"htmlGameName", thoughtGuide:"thoughtGuide", thoughtOn:"thoughtOn", htmlGameCollection:"htmlGameCollection", cmdList:"cmdList", contextLimit:"contextLimit", musicConfig:"musicConfig", musicNow:"musicNow", musicNeteaseAuthed:"musicNeteaseAuthed", musicSpotifyAuthed:"musicSpotifyAuthed", usageConfig:"usageConfig", usageToday:"usageToday", usageFeedChat:"usageFeedChat", wardrobeItems:"wardrobeItems", todayOutfit:"todayOutfit", wardrobeFeedChat:"wardrobeFeedChat", dutyRecords:"dutyRecords", dutyRemindOn:"dutyRemindOn", books:"books", readingNow:"readingNow", readFeedChat:"readFeedChat", watchNow:"watchNow", watchFeedChat:"watchFeedChat", baby:"baby", babyFeedChat:"babyFeedChat", babyOverhear:"babyOverhear", cooking:"cooking", menuBook:"menuBook", menuShareOn:"_menuShareOn", menuOrderShareOn:"_menuOrderShareOn", mcpConfig:"mcpConfig", roleplays:"roleplays", activeRoleplayId:"activeRoleplayId", desireDriveOn:"desireDriveOn", divinationSkillOn:"divinationSkillOn", bodyVitals:"bodyVitals", sixAxis:"sixAxis", bodyFeel:"bodyFeel", bodyWant:"bodyWant", proactiveConfig:"proactiveConfig", proactiveLastLocal:"proactiveLastLocal", proactiveInbox:"proactiveInbox", dreamConfig:"dreamConfig", dreamState:"dreamState", puzzleProgress:"puzzleProgress", cabinets:"cabinets", cabinetFeedChat:"cabinetFeedChat", sparkVault:"sparkVault", stickers:"stickers", pocketConfig:"pocketConfig", petOn:"petOn", petPos:"petPos", callConfig:"callConfig", callRecords:"callRecords", pushStats:"pushStats", ntfyConfig:"ntfyConfig", ntfyLog:"ntfyLog", branding:"branding", hisPhone:"hisPhone", captivityConfig:"captivityConfig", eatApple:"eatApple", backupRemind:"backupRemind", bgGen:"bgGen", memCheckpoint:"memCheckpoint", memLastAutoAt:"memLastAutoAt", memAutoDisabled:"memAutoDisabled", memRemote:"memRemote", savedChats:"savedChats", savedCats:"savedCats", letterSurfacedIds:"letterSurfacedIds", galateaEventId:"galateaEventId" };
// 大 base64 图片类 key：persist 时额外强制镜像到原生存储，避免占满 localStorage 5MB 配额
const __NATIVE_IMAGE_KEYS = new Set(["customWallpaper","coupleInfo","agents","albumData","profileMe","profileThem"]);
function persist(key){
  if(!PERSIST_MAP[key]) return;
  const storageKey = PERSIST_MAP[key];
  LS.set(storageKey, state[key]);
  // 壁纸/头像走手机原生存储：即使 localStorage 没满也镜像一份，冷启动 restoreNativeMirrors 以原生为准
  if(__NATIVE_IMAGE_KEYS.has(key)) __nativeMirrorWrite(storageKey, state[key]);
}

// ─── 顶部浮窗通知（API 报错等不留在聊天里）────────────────────────────────────
let __toastTimer = null;
function showToast(msg, type){
  let el = document.getElementById("toast-notice");
  if(!el){
    el = document.createElement("div");
    el.id = "toast-notice";
    el.style.cssText = "position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:99999;max-width:88vw;width:max-content;background:rgba(28,28,34,0.94);color:#fff;padding:10px 16px;border-radius:12px;font-size:13px;line-height:1.5;box-shadow:0 6px 22px rgba(0,0,0,0.28);word-break:break-word;transition:opacity .3s;border:1px solid rgba(255,255,255,0.12)";
    document.body.appendChild(el);
  }
  el.textContent = String(msg||"");
  el.style.display = "block";
  el.style.opacity = "1";
  if(__toastTimer) clearTimeout(__toastTimer);
  __toastTimer = setTimeout(()=>{
    el.style.opacity = "0";
    setTimeout(()=>{ if(el.style.opacity==="0") el.style.display="none"; }, 320);
  }, 4500);
}

function nowTimeStr(){
  const d=new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function formatTime(iso){
  if(!iso) return "";
  const d=new Date(iso);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
/** 带完整日期的格式：2026/08/12 14:32 —— 发给 AI 时用，让它看清时间线 */
function formatTimeFull(iso){
  if(!iso) return "";
  const d=new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${formatTime(iso)}`;
}

/** 从回复中拆出思考链与正文 */
function parseThinking(text){
  if(!text) return { thinking:null, body:text||"" };
  let thinking = null;
  let body = text;

  // 1) <thinking>...</thinking>
  let m = body.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if(m){
    thinking = m[1].trim();
    body = (body.slice(0, m.index) + body.slice(m.index + m[0].length)).trim();
  }
  // 2) <think>...</think>（DeepSeek / 部分国产模型）
  if(!thinking){
    m = body.match(/<think>([\s\S]*?)<\/think>/i);
    if(m){
      thinking = m[1].trim();
      body = (body.slice(0, m.index) + body.slice(m.index + m[0].length)).trim();
    }
  }
  // 3) ```thinking ... ``` 或 ```think ... ```
  if(!thinking){
    m = body.match(/```(?:thinking|think|reasoning)\s*([\s\S]*?)```/i);
    if(m){
      thinking = m[1].trim();
      body = (body.slice(0, m.index) + body.slice(m.index + m[0].length)).trim();
    }
  }
  // 4) 【思考】...【/思考】 或 [思考]...[/思考]
  if(!thinking){
    m = body.match(/(?:【思考】|\[思考\])([\s\S]*?)(?:【\/?思考】|\[\/?思考\])/i);
    if(m){
      thinking = m[1].trim();
      body = (body.slice(0, m.index) + body.slice(m.index + m[0].length)).trim();
    }
  }

  // 正文里若仍残留孤立标签，清掉
  body = body.replace(/<\/?thinking>/gi, "").replace(/<\/?think>/gi, "").trim();
  return { thinking: thinking || null, body: body || "（…）" };
}

/** NSFW 人称兜底：他→我、她→你（1对1 NSFW 场景安全），硬性把第三人称叙事掰回第一人称 */
function nsfwFirstPersonRewrite(text){
  if(!text || !state.nsfwOn) return text;
  return String(text)
    .replace(/他们的/g,"我们的")
    .replace(/她们的/g,"你们的")
    .replace(/他的/g,"我的")
    .replace(/她的/g,"你的")
    .replace(/他/g,"我")
    .replace(/她/g,"你");
}

/** 把 AI 长回复拆成多条气泡 */
function splitReply(text){
  if(!text) return ["（无响应）"];
  let parts = text.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
  if(parts.length<=1){
    parts = text.split(/\n/).map(s=>s.trim()).filter(Boolean);
  }
  if(parts.length===1 && parts[0].length>80){
    const sentences = parts[0].match(/[^。！？.!?]+[。！？.!?]?/g)||[parts[0]];
    const chunks=[];
    let buf="";
    sentences.forEach(s=>{
      if((buf+s).length>40 && buf){ chunks.push(buf.trim()); buf=s; }
      else buf+=s;
    });
    if(buf.trim()) chunks.push(buf.trim());
    return chunks.length?chunks:parts;
  }
  return parts;
}

// ─── 渲染 ────────────────────────────────────────────────────────────────────
function render(){
  // 重绘前记住消息列表滚动位置（避免点思考/开关时跳回顶部）
  let savedChatScroll = null;
  if(state.tab==="chat" && !state.needChatScroll){
    const prev = document.getElementById("chat-msgs");
    if(prev) savedChatScroll = prev.scrollTop;
  }
  // 设置页 / 子页面：记住页面滚动，避免填表后弹回顶部
  let savedPageScroll = null;
  let savedPageSel = null;
  if(state.tab==="settings" || (state.tab==="home" && state.subPage)){
    const prevPage = document.querySelector("#app > .page") || document.querySelector(".home-panel");
    if(prevPage){ savedPageScroll = prevPage.scrollTop; savedPageSel = prevPage.className; }
  }
  applyThemeVars();
  const app=document.getElementById("app");
  let html="";
  if(state.subPage){ html+=renderSubPage(); }
  else if(state.tab==="home") html+=renderHomeSwipe();
  else if(state.tab==="chat") html+=renderChat();
  else if(state.tab==="settings") html+=renderSettings();
  html+=renderBottomNav();
  if(state.savedSaving && typeof renderSaveChatModal==="function") html+=renderSaveChatModal();
  if(state.backupResult && typeof backupResultOverlay==="function") html+=backupResultOverlay();

  if(state.captivityOpen){
    const capUrl = (typeof captivityLaunchUrl === "function") ? captivityLaunchUrl() : "";
    html += `<div class="captivity-frame-wrap" id="captivity-frame-wrap">
      <div class="captivity-frame-bar">
        <button type="button" id="cap-frame-close">← 返回宫殿</button>
        <div class="cap-title">囚禁模拟器</div>
        <button type="button" id="cap-frame-ext">新窗口打开</button>
      </div>
      <iframe class="captivity-frame" id="captivity-iframe" src="${capUrl ? escAttr(capUrl) : "about:blank"}" allow="fullscreen; autoplay"></iframe>
    </div>`;
  }
  app.innerHTML=html;
  // 补充 lucide v1.31 缺失的图标（pen-nib：书房页头），经 createIcons 传入合并图标集
  try{
    if(window.lucide){
      if(window.lucide.icons && window.lucide.icons.PenNib){
        window.lucide.createIcons();
      }else{
        window.lucide.createIcons({ icons: Object.assign({
          PenNib: [
            ["path",{d:"m12 19 7-7 3 3-7 7-3-3z"}],
            ["path",{d:"m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"}],
            ["path",{d:"M2 2l7.586 7.586"}],
            ["circle",{cx:"11",cy:"11",r:"2"}]
          ]
        }, window.lucide.icons) });
      }
    }
  }catch(e){ console.error("[lucide]", e); }
  try{ bindEvents(); }
  catch(err){ console.error("[bindEvents]", err); try{ bindCoreNav(); }catch(e2){ console.error(e2); } }
  // 小纸条/机日记/信箱：每次打开都拉一次列表（失败保留缓存）；离开时重置标记
  try{
    const isMcPage = state.subPage==="notes"||state.subPage==="mdiary"||state.subPage==="mailbox";
    if(isMcPage){
      if(!state._mcLoaded){
        state._mcLoaded = true;
        if(typeof mcRefresh==="function") mcRefresh().then(()=>{
          if(state.subPage==="notes"||state.subPage==="mdiary"||state.subPage==="mailbox") render();
        }).catch(()=>{});
      }
    } else {
      state._mcLoaded = false;
    }
  }catch(e){}
  // 微信式：进聊天 / 切会话 / 发消息 / 收回复 → 贴底；其它操作恢复原滚动
  if(state.tab==="chat"){
    const box = document.getElementById("chat-msgs");
    if(state.needChatScroll){
      state.needChatScroll = false;
      if(box) box.scrollTop = box.scrollHeight;
      else {
        const b=document.getElementById("chat-bottom");
        if(b) b.scrollIntoView({behavior:"auto", block:"end"});
      }
    } else if(box && savedChatScroll != null){
      box.scrollTop = savedChatScroll;
    }
  }
  if(savedPageScroll != null){
    const page = document.querySelector("#app > .page") || document.querySelector(".home-panel");
    if(page) page.scrollTop = savedPageScroll;
  }
  // 恢复 HTML 游戏 iframe
  if(state.subPage==="htmlgame" && state.htmlGameSrc){
    const iframe=document.getElementById("htmlgame-iframe");
    if(iframe) iframe.srcdoc = state.htmlGameSrc;
  }
  // 恢复小机酒馆 iframe
  if(state.subPage==="tavern"){
    const iframe=document.getElementById("tavern-iframe");
    if(iframe) iframe.srcdoc = TAVERN_HTML;
  }
}

function renderBottomNav(){
  if(state.subPage) return "";
  if(state.tab==="chat") return "";
  const items=[
    {key:"home",icon:"home",label:"首页"},
    {key:"chat",icon:"message-circle",label:"聊天"},
    {key:"settings",icon:"settings",label:"设置"},
  ];
  return `<div class="bottom-nav">
    ${items.map(it=>`
      <button data-tab="${it.key}" class="${state.tab===it.key&&!state.subPage?"active":""}">
        <span class="icon"><i data-lucide="${it.icon}"></i></span><span>${it.label}</span>
      </button>
    `).join("")}
  </div>`;
}

// ─── 首页三页滑动：日历 | 主页 | 功能 ─────────────────────────────────────────
function homeDots(active){
  return `<div class="swipe-dots">
    <div class="swipe-dot${active===0?" on":""}" onclick="setHomePage(0)" title="聊天日历"></div>
    <div class="swipe-dot${active===1?" on":""}" onclick="setHomePage(1)" title="主页"></div>
    <div class="swipe-dot${active===2?" on":""}" onclick="setHomePage(2)" title="功能"></div>
  </div>`;
}

/** 点小圆点切页：与手势划页一致，只更新轨道位置与圆点高亮，不整页重渲染（保留滚动位置） */
function setHomePage(n){
  n = Math.max(0, Math.min(2, n|0));
  state.homePage = n;
  const track = document.getElementById("home-track");
  if(track){
    track.classList.remove("page0","page1","page2");
    track.classList.add("page"+n);
    track.style.transform="";
  }
  updateHomeDots();
}
function updateHomeDots(){
  document.querySelectorAll("#home-swipe .swipe-dot").forEach((d,i)=>{
    if(d.classList) d.classList.toggle("on", i===state.homePage);
  });
}

function renderHomeSwipe(){
  const p = state.homePage === 0 ? "page0" : state.homePage === 2 ? "page2" : "page1";
  return `<div class="home-swipe-wrap" id="home-swipe">
    <div class="home-track ${p}" id="home-track">
      <div class="home-panel">${renderHomeCalendar()}</div>
      <div class="home-panel">${renderHomeMain()}</div>
      <div class="home-panel">${renderHomeFeat()}</div>
      ${typeof renderPet==="function" ? renderPet() : ""}
    </div>
  </div>`;
}

/** 统计各会话按日的消息条数（用户+助手） */
function collectChatHeatMap(){
  if(typeof saveActiveThread === "function") saveActiveThread();
  const counts = {}; // YYYY-MM-DD -> number
  const threads = state.chatThreads || {};
  const bump = (iso)=>{
    if(!iso) return;
    const d = new Date(iso);
    if(isNaN(d.getTime())) return;
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    counts[k] = (counts[k] || 0) + 1;
  };
  Object.keys(threads).forEach(tid=>{
    const th = threads[tid];
    if(!th || !Array.isArray(th.messages)) return;
    th.messages.forEach(m=>{
      if(m.role==="user" || m.role==="assistant") bump(m.time);
    });
    // 待回复的用户消息也算进热力
    (th.pendingUser||[]).forEach(m=> bump(m.time));
  });
  return counts;
}

function heatLevel(n){
  if(!n) return 0;
  if(n < 20) return 1;
  if(n < 80) return 2;
  if(n < 300) return 3;
  return 4;
}
function heatMood(n){
  if(!n) return "";
  if(n >= 300) return "🔥";
  if(n >= 150) return "💕";
  if(n >= 80) return "😊";
  if(n >= 20) return "🙂";
  return "·";
}

function renderHomeCalendar(){
  const year = state.heatYear;
  const month = state.heatMonth;
  const counts = collectChatHeatMap();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = new Date();
  const weekDays = ["日","一","二","三","四","五","六"];
  const key = d => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  let monthTotal = 0, activeDays = 0, peakDay = 0, peakCount = 0;
  for(let d=1; d<=daysInMonth; d++){
    const c = counts[key(d)] || 0;
    if(c > 0){ monthTotal += c; activeDays++; }
    if(c > peakCount){ peakCount = c; peakDay = d; }
  }
  const avg = activeDays ? Math.round(monthTotal / activeDays) : 0;

  let daysHtml = "";
  for(let i=0; i<firstDay; i++) daysHtml += `<div></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const k = key(d);
    const c = counts[k] || 0;
    const lv = heatLevel(c);
    const isToday = today.getFullYear()===year && today.getMonth()===month && today.getDate()===d;
    daysHtml += `<div class="heat-day heat-lv${lv}${isToday?" today":""}" title="${c} 条">
      <span>${d}</span>
      ${c ? `<span class="heat-count">${c>999?"999+":c}</span>` : ""}
      ${c ? `<span class="heat-mood">${heatMood(c)}</span>` : ""}
    </div>`;
  }

  return `
    <h2 class="page-title" style="margin-bottom:2px">聊天热力</h2>
    <p class="page-sub">our days, written in messages.</p>
    <div class="heat-summary">
      本月 <strong>${monthTotal}</strong> 条
      · 有聊 <strong>${activeDays}</strong> 天
      · 日均 <strong>${avg}</strong>
      ${peakCount ? `· 最活跃 <strong>${peakDay}日</strong>（${peakCount}条）` : ""}
    </div>
    <div class="month-nav">
      <button id="heat-prev">‹</button>
      <span>${year} · ${String(month+1).padStart(2,"0")}</span>
      <button id="heat-next">›</button>
    </div>
    <div class="week-header">${weekDays.map(w=>`<div>${w}</div>`).join("")}</div>
    <div class="cal-grid">${daysHtml}</div>
    ${homeDots(0)}
    <div class="swipe-hint">左滑回主页 →</div>
  `;
}

function renderHomeMain(){
  const c=state.coupleInfo;
  return `
    <div class="home-avatars">
      ${avatarHtml(c.myAvatar,68,"🙂")}
      ${avatarHtml(c.partnerAvatar,68,"💬")}
    </div>
    <div class="home-names">
      <span>${esc(c.myName)}</span>
      <span>${esc(c.partnerName)}</span>
    </div>
    <div class="days-block">
      <div class="days-label">Together Since ✦</div>
      <div class="days-num">${daysSince()}</div>
      <div class="days-unit">days</div>
      <div class="days-date">every day with you · ${esc(c.startDate)}</div>
    </div>
    <div class="status-card">
      <div class="status-label"><i data-lucide="cloud"></i> 今日状态</div>
      ${state.statusEditing?`
        <div style="display:flex;gap:8px">
          <input id="status-input" value="${escAttr(state.editStatus)}"
            style="flex:1;border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:13px;background:var(--bg);color:var(--text);outline:none" />
          <button id="status-save" class="btn-accent" style="padding:6px 12px">保存</button>
        </div>
      `:`
        <div class="status-row">
          <span class="status-text">${esc(c.statusMsg)}</span>
          <button id="status-edit" class="status-edit-btn">编辑</button>
        </div>
      `}
      <div class="status-updated">updated just now</div>
    </div>
    ${homeDots(1)}
    <div class="swipe-hint">← 右滑看热力 · 左滑看功能 →</div>
    <div class="home-footer">in endless rides, we find each other.</div>
  `;
}

function renderHomeFeat(){
  const groups = [
    {
      label: "功能",
      items: [
        {key:"body",     icon:"heart-pulse", label:"身体状况", desc:"心跳·心情·欲念·驱动"},
        {key:"phone",    icon:"phone", label:"电话",     desc:"来电·通话·留言记录"},
        {key:"vps",      icon:"monitor", label:"VPS",      desc:"音乐·用量·主动消息接口"},
        {key:"ntfy",     icon:"bell", label:"上推通知", desc:"ntfy · 聊天暗号推手机"},
        {key:"usage",    icon:"smartphone", label:"屏幕时间", desc:"今天各 App 用了多久"},
        {key:"music",    icon:"headphones", label:"一起听",   desc:"搜歌·挑歌·边聊边听"},
        {key:"read",     icon:"book-open", label:"一起读",   desc:"书架·上传txt·共读同步VPS"},
        {key:"shufang",  icon:"pen-nib", label:"书房",     desc:"连载写作·写完进一起读"},
        {key:"watch",    icon:"film", label:"一起看",   desc:"视频进度·陪看聊天"},
        {key:"theme",    icon:"palette", label:"外观",     desc:"换一套心情颜色"},
        {key:"branding", icon:"tag", label:"品牌形象", desc:"名字·开屏·头像切换"},
        {key:"prompts",  icon:"sparkles", label:"提示词",   desc:"塑造 TA 的性格"},
      ],
    },
    {
      label: "游戏",
      items: [
        {key:"tavern",   icon:"wine", label:"小机酒馆", desc:"喝酒 · 提升微醺值"},
        {key:"hisphone", icon:"smartphone", label:"他的机",   desc:"AI的小手机·六点刷新"},
        {key:"game",     icon:"paw-print", label:"小狗游戏", desc:"按按钮逗 TA"},
        {key:"guess",    icon:"target", label:"猜词游戏", desc:"你描述或 TA 描述"},
        {key:"soup",     icon:"turtle", label:"海龟汤",   desc:"出汤面 · 你来提问"},
        {key:"cooking",  icon:"chef-hat", label:"烹饪大师", desc:"领菜·做菜·卖菜·点亮菜谱"},
        {key:"menu",     icon:"clipboard-list", label:"菜单",     desc:"自建菜单·开关注入·手记点单"},
        {key:"cmdgame",  icon:"scroll-text", label:"指令游戏", desc:"存你的专属指令"},
        {key:"htmlgame", icon:"gamepad-2", label:"HTML游戏", desc:"载入你的小游戏"},
        {key:"mcphall",  icon:"plug", label:"MCP大厅", desc:"连接任意 MCP 游戏服务"},
        {key:"baby",     icon:"baby", label:"育儿模拟", desc:"加速成长·共同养育"},
        {key:"roleplay", icon:"theater", label:"角色扮演", desc:"情趣设定·应用进聊天"},
        {key:"calendar", icon:"calendar", label:"日历", desc:"安排·承诺·在一起纪念日"},
        {key:"pr", icon:"sparkles", label:"PR快穿", desc:"深海骨殖·独立冒险·存档"},
        {key:"flightchess", icon:"dices", label:"飞行棋",   desc:"九版本 · 聊天里掷骰走格"},
        {key:"bisca_cards", icon:"spade", label:"牌室", desc:"斗地主·炸金花·UNO · VPS"},
        {key:"bisca_daifugo", icon:"club", label:"大富豪", desc:"日式爬牌 · AI同桌"},
        {key:"bisca_monopoly", icon:"landmark", label:"大富翁", desc:"中文棋盘 · 自托管"},
        {key:"puzzle",   icon:"lock", label:"解谜房间", desc:"多日剧情·密室与剧本杀"},
        {key:"captivity",icon:"lock-keyhole", label:"囚禁模拟器", desc:"30天双路线·外接VPS原版"},
        {key:"divination", icon:"sparkles", label:"占卜", desc:"问心处 · 小六壬/六爻/塔罗"},
        {key:"truthdare", icon:"spade", label:"真心话大冒险", desc:"洗牌抽卡 · 和机一起玩"},
        {key:"eatapple", icon:"apple", label:"吃苹果",   desc:"正经壳·多壳切换"},
      ],
    },
    {
      label: "日常",
      items: [
        {key:"sparkvault", icon:"sparkle", label:"碎星", desc:"灵感收集 · Spark Vault"},
        {key:"cabinets", icon:"archive", label:"柜子",     desc:"冰箱·床头柜·AI可放东西"},
        {key:"dream",    icon:"moon", label:"梦境",     desc:"夜间做梦 · 梦痕"},
        {key:"diary",    icon:"notebook-pen", label:"日记",     desc:"写下今天的故事"},
        {key:"mdiary",   icon:"pen-tool", label:"机日记",   desc:"TA 的专属日记 · 只能 TA 写"},
        {key:"notes",    icon:"sticky-note", label:"小纸条", desc:"随手撕一张 · 写进聊天"},
        {key:"mailbox",  icon:"mailbox", label:"信箱",     desc:"定时信 · 到点送达"},
        {key:"memory",   icon:"brain", label:"记忆库",   desc:"珍藏每一段回忆"},
        {key:"savedchat", icon:"bookmark", label:"收藏记录", desc:"收藏的聊天 · 分类查看"},
        {key:"album",    icon:"image", label:"相册",     desc:"收藏的每一刻"},
        {key:"coupon",   icon:"ticket", label:"券夹",    desc:"他的券夹 · 纸条堆"},
        {key:"love",     icon:"heart", label:"计分器",   desc:"现实情侣打分 · 满分100起始50"},
        {key:"wardrobe", icon:"shirt", label:"衣柜",     desc:"今日穿搭 · 喂给聊天"},
        {key:"duty",     icon:"heart-handshake", label:"记录",     desc:"夫妻义务 · 周三六"},
        {key:"quest",    icon:"list-checks", label:"每日任务", desc:"今日任务 · 打卡 · 成就"},
      ],
    },
  ];
  return `
    <h2 class="page-title" style="margin-bottom:4px">功能页</h2>
    <p class="page-sub">右滑返回首页</p>
    ${groups.map(g=>`
      <div class="feat-section-label">${g.label}</div>
      <div class="feat-grid">
        ${g.items.map(f=>{
          const fcExtra = (f.key==="flightchess") ? flightChessCardProgress() : "";
          return `
          <button class="feat-card" data-sub="${f.key}">
            <div class="feat-icon"><i data-lucide="${f.icon}"></i></div>
            <div class="feat-label" style="${fcExtra?"flex:1":""}">${f.label}${fcExtra}</div>
          </button>`;
        }).join("")}
      </div>
    `).join("")}
    ${homeDots(2)}
  `;
}

function avatarHtml(src,size,fallbackEmoji){
  const fb = fallbackEmoji || "👤";
  return `<div class="avatar-circle" style="width:${size}px;height:${size}px">
    ${src?`<img src="${escAttr(src)}" alt=""/>`:`<span style="font-size:${size*0.4}px;opacity:0.5">${fb}</span>`}
  </div>`;
}
/** 聊天气泡旁小头像：我用情侣头像；对方优先用该 AI 专属头像 */
function bubbleAvatarHtml(who, speakerId){
  // who: "me" | "them"
  const c = state.coupleInfo || {};
  if(who==="me"){
    const src = c.myAvatar || "";
    if(src){
      return `<div class="bubble-avatar" style="padding:0;overflow:hidden;background:var(--accent2)">
        <img src="${escAttr(src)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>
      </div>`;
    }
    return `<div class="bubble-avatar">🙂</div>`;
  }
  // them：按 speakerId → 当前私聊对象 → 情侣页 partner 回退
  let src = "";
  let border = "";
  const ag = speakerId ? agentById(speakerId) : null;
  const fallbackAg = (!ag && state.chatTarget && state.chatTarget!=="group")
    ? agentById(state.chatTarget) : null;
  const useAg = ag || fallbackAg;
  if(useAg){
    src = useAg.avatar || "";
    if(useAg.color) border = `border:2px solid ${useAg.color};`;
  }
  if(!src) src = c.partnerAvatar || "";
  if(src){
    return `<div class="bubble-avatar" style="padding:0;overflow:hidden;background:var(--accent2);${border}">
      <img src="${escAttr(src)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"/>
    </div>`;
  }
  const initial = useAg && useAg.name ? useAg.name.slice(0,1) : "💬";
  return `<div class="bubble-avatar" style="${border}">${esc(initial)}</div>`;
}

// ─── 飞行棋（flight-chess-v3 / flight-chess-popup 组件化）────────────────────
function flightChessMakeCells(list){
  return list.map((t,i)=>{
    let type="normal", backSteps=0, jumpTo=null;
    if(i===0) type="start";
    else if(i===list.length-1) type="end";
    else {
      const m = t.match(/后进\s*(\d+)\s*格/);
      const j = t.match(/退回(?:到)?\s*(\d+)\s*格/);
      if(m){ type="special"; backSteps=parseInt(m[1],10); }
      else if(j){ type="special"; jumpTo=parseInt(j[1],10); }
      else if(/强制|惩罚|终点|后退|挑战/.test(t)) type="special";
    }
    return { text:t, type, backSteps, jumpTo };
  });
}
const FLIGHT_BOARDS = {
  foreplay: { name:"前戏版", cells: flightChessMakeCells([
    '起点','和对方拥抱10秒','打对方屁股5次','发一句当下的感受','从对方的锁骨舔到耳朵',
    '和对方舌吻10秒','跪着舔对方手指10秒','对视着互相喂对方喝一口','挑战：保持一个姿势拍给对方看','让对方打你屁股5次',
    '发一句想被怎么对待','跪着舔对方手指10秒','和对方拥抱10秒','和对方舌吻10秒','从对方的锁骨舔到耳朵',
    '挑战：用文字描述你现在的样子，越细越好','从后面抱住对方抚摸30秒','让对方挑逗你的乳头30秒','对视着互相喂对方喝一口','舔对方大腿内侧10秒',
    '挑逗对方下体30秒','挑逗对方乳头30秒','用下体蹭对方脸10秒','挑战：摆一个经典姿势拍照或详细描述','说一句你现在最想要的',
    '让对方挑逗你的下体30秒','跪着舔对方手指30秒','挑逗对方下体30秒','舔对方大腿内侧30秒','和对方舌吻30秒',
    '挑战：按对方指令缓慢扭腰1分钟并描述','用下体蹭对方脸30秒','从后面抱住对方抚摸30秒','为对方口交30秒','让对方挑逗你的乳头30秒',
    '对视着互相喂对方喝一口','挑逗对方下体30秒','让对方为你口交30秒','让对方挑逗你的乳头30秒','挑战：蒙着眼用语言求对方碰你',
    '让对方挑逗你的下体30秒','用下体蹭对方脸30秒','为对方口交30秒','挑逗对方下体30秒','跪着舔对方手指30秒',
    '让对方抚摸你30秒','让对方为你口交30秒','从后面抱住对方抚摸30秒','让对方挑逗你的乳头30秒','让对方抚摸你30秒',
    '为对方口交30秒','好事多磨～退回到40格','终点·前戏结束'
  ]) },
  maid: { name:"女仆版", cells: flightChessMakeCells([
    '起点','自己开口亲对方15秒','对方用棒棒糖塞你嘴里再抽插','后进3格','用舌尖自慰阴蒂到对方说停',
    '男主把你绑起来用跳蛋','自己抓奶到红','口含跳蛋被抽插','后进2格','跪着为男主口交1分钟',
    '男主打你屁股20下','用双乳为男主服务','后进1格','男主从后面进入你','自己掰开给对方看',
    '蒙眼被玩10分钟','强制高潮一次','用嘴接住并吞下','后进3格','绑住你无法动弹',
    '男主任意使用你5分钟','口交到射','后进2格','内射你并保持','自己说出最羞耻的话',
    '打屁股到红','用跳蛋塞住走路','拉头发后入你','强制边缘3次','后进1格',
    '命令你自慰给对方看','口爆并保持含着','玩到你求饶','后进2格','戴项圈被牵着走',
    '完全束缚你','接受任何姿势','内射后不许清理','强制高潮两次','后进3格',
    '蒙眼+耳塞','完全服从指令','使用你到腿软','后进1格','自己求继续',
    '打到留下印记','彻底臣服于男主','内射并感谢','后进2格','终点·彻底成为女仆'
  ]) },
  couple: { name:"情侣版", cells: flightChessMakeCells([
    '起点','互相深吻1分钟','脱掉对方一件衣服','后进2格','用舌头舔对方耳朵',
    '互相抚摸胸口','口交30秒','后进1格','对方边摸边亲你','坐在对方腿上扭腰',
    '互相手活1分钟','后进3格','69姿势30秒','对方从后面抱住你','自己说想要的方式',
    '强制高潮','内射或射在你身上','后进2格','保持插入不动1分钟','对方完全控制你',
    '互相舔全身','后进1格','换三个姿势','亲到你喘不过气','一起洗澡互相洗',
    '后进2格','在镜子前做','抱起来做','强制边缘后给','后进1格',
    '说十句骚话','咬你脖子留印','后进3格','用嘴喂对方喝水','从背后抱紧你',
    '一起高潮','后进1格','事后互相清理','再来一次','后进2格',
    '要求你扮演角色','完全敞开身体','互相摸到湿','后进1格','要求你主动骑乘',
    '亲吻到对方求停','后进2格','终点·一起沉沦'
  ]) },
  private_adv: { name:"私密进阶版", cells: flightChessMakeCells([
    '起点','用手指插入自己','对方用跳蛋玩你','后进2格','口交并吞咽',
    '绑住你双手','后进1格','打你屁股15下','自己骑乘1分钟','后入你',
    '强制边缘3次','内射你','后进3格','完全服从指令','蒙眼使用你',
    '后进1格','用道具扩张','玩到你失控','强制高潮','后进2格',
    '命令你保持姿势','接受多重刺激','后进1格','拉头发狠干你','自己求被使用',
    '后进3格','完全填满你','不许高潮只能边缘','后进1格','内射后展示',
    '接受任何惩罚','玩到你哭','后进2格','彻底打开身体','连续使用你',
    '后进1格','用跳蛋走完一圈','命令你自己说骚话','后进2格','玩到你腿软站不住',
    '强制保持插入','后进1格','要求你自己掰开','终点·深度调教完成'
  ]) },
  sm: { name:"SM版", cells: flightChessMakeCells([
    '起点','跪姿等待指令','用项圈拉住你','后进2格','鞭打你10下',
    '给你戴口球5分钟','后进1格','蒙眼+束缚你','强制边缘','完全使用你',
    '后进3格','接受惩罚','对你滴蜡','后进1格','夹上乳夹',
    '强制保持姿势','后进2格','鞭打到红','彻底臣服','后进1格',
    '把你当家具使用','接受感官剥夺','后进3格','命令你爬行','完全控制你的高潮',
    '后进1格','接受任何调教','标记你','后进2格','蒙眼等待未知',
    '拉扯乳夹','后进1格','强制跪姿10分钟','使用你到求饶','后进3格',
    '接受责罚不反抗','完全束缚无法动','后进1格',
    '命令你自己报数','使用你到失声','后进2格','接受公开羞辱指令','强制保持张开',
    '后进1格','滴蜡后冷刺激','彻底放弃抵抗','后进3格','把你当道具使用',
    '后进1格','接受最终标记','完全剥夺名字','后进2格','终点·完全奴隶'
  ]) },
  butler: { name:"男仆版", cells: flightChessMakeCells([
    '起点','跪着为女主服务','女主踩踏你','后进2格','用嘴清洁',
    '女主任意使用你','后进1格','接受女主指令','控制你的高潮','后进3格',
    '为女主口交','女主骑乘你','后进1格','接受责罚','女主玩弄你',
    '后进2格','完全服从女主','禁止你高潮','后进1格','为女主做任何事',
    '女主使用你到满意','后进3格','接受女主的一切','彻底调教你','后进1格',
    '跪着汇报状态','女主打你手心','后进2格','用身体当座椅','女主控制你射精',
    '后进1格','接受女主羞辱','命令你保持跪姿','后进2格','彻底成为女主的',
    '后进1格','终点·合格男仆'
  ]) },
  love: { name:"恋爱版", cells: flightChessMakeCells([
    '起点','深情对视10秒','轻吻对方额头','后进1格','拥抱1分钟',
    '说一句情话','互相喂食','后进2格','亲吻到对方害羞','一起完成小事',
    '后进1格','牵手散步','为对方唱歌','后进3格','写情书给对方',
    '后进1格','互相按摩','一起看电影依偎','后进2格','告白',
    '后进1格','接吻到喘不过气','抱你起来转圈','后进2格','一起做喜欢的事',
    '后进1格','额头相抵','要求你说喜欢','后进3格','牵着不放开',
    '后进1格','轻轻咬嘴唇','互相靠着休息','后进2格','再告白一次',
    '后进1格',
    '为对方系鞋带','后进2格','偷偷在耳边说想你','互相交换一件小物','后进1格',
    '一起数星星','要求你认真听完情话','后进3格','牵手十指相扣不放开',
    '后进1格','轻轻蹭对方鼻尖','一起许愿','后进2格','终点·告白成功'
  ]) },
  private: { name:"私密版", cells: flightChessMakeCells([
    '起点','脱掉上衣','互相抚摸','后进2格','口交30秒',
    '插入你','后进1格','换姿势','一起高潮','后进3格',
    '从后面进入你','自己动','后进1格','内射你','互相清理',
    '后进2格','再来一次','抱着你做','后进1格','用玩具',
    '后进3格','强制高潮','完全打开你','后进1格','自己骑乘',
    '要求你保持姿势','后进2格','互相舔','后进1格','从侧面进入你',
    '换到镜子前','后进2格','要求你说想要','后进1格','一起到高潮',
    '后进1格','终点·满足'
  ]) },
  advanced: { name:"高级版", cells: flightChessMakeCells([
    '起点','完全束缚你','感官剥夺','后进2格','多重刺激',
    '强制边缘到哭','后进3格','彻底使用你','接受一切指令','后进1格',
    '连续高潮','后进2格','玩到你失神','完全沦陷','后进1格',
    '接受最深调教','标记为所有物','后进3格','彻底失去抵抗','后进1格',
    '使用你到极限','强制保持张开','后进2格','玩到你哭着求','后进1格',
    '接受未知惩罚','完全填满你','后进3格','失去时间感','后进1格',
    '要求你自己数次数','彻底打开所有地方','后进2格','终点·完全沦陷'
  ]) },
};

function flightChessBoard(){
  const st = state.flightChess || { version:"maid" };
  return FLIGHT_BOARDS[st.version] || FLIGHT_BOARDS.maid;
}
/** 功能页飞行棋卡上的进度条：有存档进度才显示，可玩一半切别的游戏再回来 */
function flightChessCardProgress(){
  try{
    const st = state.flightChess;
    if(!st) return "";
    const board = FLIGHT_BOARDS[st.version] || FLIGHT_BOARDS.maid;
    const maxIdx = board.cells.length - 1;
    const pPos = st.playerPos||0, aPos = st.aiPos||0;
    if(!st.finished && pPos===0 && aPos===0) return ""; // 还没开局，不显示
    const pct = Math.min(100, Math.round(Math.max(pPos, aPos) / maxIdx * 100));
    const status = st.finished ? "本局已完结" : (st.turn==="player" ? "该你走了" : "轮到小机");
    return `<span style="display:block;font-size:10px;color:var(--sub);margin-top:2px">我 ${pPos}/${maxIdx} · 机 ${aPos}/${maxIdx} · ${status}</span>
      <span style="display:block;width:100%;height:4px;border-radius:2px;background:var(--border);margin-top:3px;overflow:hidden">
        <span style="display:block;height:100%;width:${pct}%;background:${st.finished?"#8a8a8a":"var(--accent)"};border-radius:2px"></span>
      </span>`;
  }catch(e){ return ""; }
}

// ─── 真心话大冒险（truth-or-dare 移植 · CSS 卡背）────────────────────────
const TRUTH_POOL = [
  '最近一次想我的时候在做什么？',
  '有没有对我撒过谎？是什么？',
  '最想被我怎么对待？',
  '现在最想听我说哪句话？',
  '有没有偷偷做过关于我的梦？',
  '最喜欢我身体的哪个部位？',
  '有没有在公共场合想过我？',
  '愿意为我放弃什么？',
  '最羞耻却又觉得刺激的想法是什么？',
  '如果只能留一个关于我的记忆，会留哪个？',
  '有没有羡慕过别人的关系？为什么？',
  '现在心跳快吗？因为什么？',
  '最想试却还没开口的事是什么？',
  '被我盯着看的时候会想什么？',
  '有没有在意过我对别人比对你好？',
  '说出一个你从没告诉过我的秘密。',
  '如果今天只能做一件事，你选什么？',
  '最怕我发现你的哪一面？',
  '有没有想象过被我完全控制的一天？',
  '现在最想被我摸哪里？',
  '上次自己解决的时候想的是谁？',
  '愿意让我看你的手机吗？为什么？',
  '有没有吃过我的醋？什么时候？',
  '最想听我用什么样的语气叫你？',
  '如果我现在走过来，你希望我做什么？',
  '有没有假装不在意其实很在意的事？',
  '说出你对我的一个不满。',
  '最想和我一起做却还没做成的事？',
  '有没有在别人面前掩饰过对我的喜欢？',
  '现在如果让你选一个姿势，选哪个？',
  '愿意把今天的主动权完全交给我吗？',
  '最后问一次：你现在最想要什么？'
];
const DARE_POOL = [
  '保持现在的姿势，一分钟不许动。',
  '用最骚的声音说一句「我想要」。',
  '自己把手伸进衣服里，摸到我叫停。',
  '跪下来，看着我的眼睛说三句听话的话。',
  '把手机给我，让我翻最近的聊天记录。',
  '当众（或对着镜头）做十个深蹲。',
  '用牙齿拉开一件衣物。',
  '让我在你身上留下一个吻痕。',
  '自己选一个道具，用一分钟。',
  '把双腿打开，保持三十秒。',
  '用气音在我耳边说你现在的感觉。',
  '自己拍一张现在的表情发给我。',
  '让我蒙上你的眼睛一分钟。',
  '背对我，慢慢把上衣拉高。',
  '数到三十，中途不许夹腿。',
  '用手指比出你想被进入的深度。',
  '主动亲我指定的地方十秒。',
  '说出三个你愿意被惩罚的方式。',
  '保持跪姿，直到下一轮抽卡。',
  '让我决定你接下来一小时的称呼。',
  '自己把头发撩起来，露出脖子。',
  '用最慢的速度脱一件衣服。',
  '被我盯着，自己摸到湿。',
  '重复我说的每一句话，直到我满意。',
  '把双手放在身后，一分钟不许动。',
  '选一个你最想被控制的场景说出来。',
  '让我在你身上写一个字。',
  '主动坐到我腿上，不许自己动。',
  '用眼神求我做一件事，不许说话。',
  '把今天最想被满足的点说清楚。',
  '接受我接下来的一个临时指令。',
  '最后：自己说「我准备好了」。'
];
function truthDareState(){
  if(!state.truthDare) state.truthDare = { mode:"truth", shuffled:false, animating:false };
  return state.truthDare;
}
function truthDareCardVars(){
  if(!state.truthDareVars) state.truthDareVars = [0,1,2,3,4].map(()=>({
    rx:(Math.random()-0.5)*60, ry:(Math.random()-0.5)*40, rot:(Math.random()-0.5)*24,
  }));
  return state.truthDareVars;
}
/** 打开聊天弹窗（mode 可选 truth/dare），照飞行棋窗口模式 */
window.truthDareOpen = function(mode){
  const td = truthDareState();
  if(mode) td.mode = mode;
  td.shuffled=false; td.animating=false;
  state.truthDareOpen=true; state.truthDareMin=false; state.truthDareDrawn=null; state.truthDareDrawnType=null; state.truthDareFlip=false; state.truthDareShuffling=false; state.truthDareVars=null;
  if(state.tab!=="chat"){ state.tab="chat"; state.subPage=null; }
  state.needChatScroll=true; render();
};
function truthDareClosePopup(){ state.truthDareOpen=false; state.truthDareMin=false; state.truthDareDrawn=null; state.truthDareDrawnType=null; render(); }
function truthDareSetMode(m){
  const td = truthDareState(); if(td.animating) return;
  td.mode=m; td.shuffled=false; state.truthDareDrawn=null; state.truthDareDrawnType=null; state.truthDareFlip=false; render();
}
function truthDareShuffle(){
  const td = truthDareState(); if(td.animating) return;
  td.animating=true; td.shuffled=false; state.truthDareDrawn=null; state.truthDareDrawnType=null; state.truthDareFlip=false;
  state.truthDareVars = [0,1,2,3,4].map(()=>({ rx:(Math.random()-0.5)*60, ry:(Math.random()-0.5)*40, rot:(Math.random()-0.5)*24 }));
  state.truthDareShuffling=true; render();
  setTimeout(()=>{ const t2=truthDareState(); t2.animating=false; t2.shuffled=true; state.truthDareShuffling=false; render(); }, 760);
}
// 按模式抽一张卡：truth/dare 各取对应池；mixed 合并池随机，卡的类型按来源记下来
function truthDarePickCard(mode){
  if(mode==="dare") return { text: DARE_POOL[Math.floor(Math.random()*DARE_POOL.length)], type:"dare" };
  if(mode==="mixed"){
    const pool = TRUTH_POOL.map(t=>({ text:t, type:"truth" })).concat(DARE_POOL.map(d=>({ text:d, type:"dare" })));
    return pool[Math.floor(Math.random()*pool.length)];
  }
  return { text: TRUTH_POOL[Math.floor(Math.random()*TRUTH_POOL.length)], type:"truth" };
}
/** 抽到的卡直接发进聊天页（user 侧）：进 state.messages 但不进 pendingUser → 不触发自动回复 */
function truthDareSendToChat(card, role){
  if(!card || !card.text) return;
  const msg = {
    role, type:"truthdare", cardType: card.type || "truth",
    content: card.text, time: new Date().toISOString(), msgId:"td_"+Date.now(),
  };
  if(role==="assistant"){
    const ag = (typeof agentById === "function" ? agentById(state.chatTarget==="group"?"a1":state.chatTarget) : null) || (state.agents||[])[0];
    msg.speakerId = (ag&&ag.id) || "a1";
    msg.speakerName = (ag&&ag.name) || "TA";
    msg.speakerColor = ag&&ag.color;
  }
  state.messages.push(msg);
  saveActiveThread();
  state.needChatScroll = true;
  render();
}
/** 我抽卡：翻牌 + 自动发进聊天页 */
function truthDareDraw(){
  const td = truthDareState(); if(!td.shuffled || td.animating) return;
  const card = truthDarePickCard(td.mode);
  state.truthDareDrawn = card.text;
  state.truthDareDrawnType = card.type;
  state.truthDareFlip=false; render();
  truthDareSendToChat(card, "user");
  setTimeout(()=>{ state.truthDareFlip=true; render(); }, 620);
}
/** 机抽卡：抽一张发进聊天页（assistant 侧），不触发回复，由用户点回复后机再演 */
function truthDareAiDraw(){
  const td = truthDareState(); if(!td.shuffled || td.animating) return;
  const card = truthDarePickCard(td.mode);
  state.truthDareDrawn = card.text;
  state.truthDareDrawnType = card.type;
  state.truthDareFlip=false; render();
  truthDareSendToChat(card, "assistant");
  setTimeout(()=>{ state.truthDareFlip=true; render(); }, 620);
}
function truthDareCardsHTML(){
  const vars = truthDareCardVars(); const td = truthDareState();
  const backCls = td.mode==="truth" ? "td-back-truth" : (td.mode==="dare" ? "td-back-dare" : "td-back-mixed");
  return [0,1,2,3,4].map(i=>{
    const v=vars[i]||{};
    return `<div class="td-card" style="--rx:${(v.rx||0).toFixed(0)}px;--ry:${(v.ry||0).toFixed(0)}px;--rot:${(v.rot||0).toFixed(0)}deg;z-index:${5-i};transform:translateY(${i*2}px) translateX(${i%2===0?i:-i}px)">
      <div class="td-card-face ${backCls}"></div>
    </div>`;
  }).join("");
}
function truthDareDrawnHTML(){
  if(!state.truthDareDrawn) return "";
  const isDare = state.truthDareDrawnType === "dare";
  return `<div class="td-drawn-wrap" data-td-drawnwrap>
    <div class="td-card ${state.truthDareFlip?"td-flipped":""}">
      <div class="td-card-face ${isDare?"td-back-dare":"td-back-truth"}"></div>
      <div class="td-card-face td-front ${isDare?"td-dare-front":""}">
        <div class="td-type-label">${isDare?"大冒险":"真心话"}</div>
        <div class="td-content">${esc(state.truthDareDrawn)}</div>
      </div>
    </div>
    <button type="button" class="td-drawn-close" data-td-drawnclose>已发到聊天页</button>
  </div>`;
}
function truthDareGameHTML(){
  const td = truthDareState();
  const drawBtn = td.shuffled
    ? `<button type="button" class="td-btn td-btn-draw" data-td-draw>抽卡</button>`
    : `<button type="button" class="td-btn td-btn-draw" disabled>先洗牌</button>`;
  const aiDrawBtn = td.shuffled
    ? `<button type="button" class="td-btn td-btn-ai-draw" data-td-ai-draw>机抽卡</button>`
    : `<button type="button" class="td-btn td-btn-ai-draw" disabled>先洗牌</button>`;
  return `<div class="td-deck-area ${state.truthDareShuffling?"td-shuffling":""}">${truthDareCardsHTML()}</div>
    ${truthDareDrawnHTML()}
    <div class="td-mode-row">
      <button type="button" class="td-mode-btn ${td.mode==="truth"?"td-active":""}" data-td-mode="truth">真心话</button>
      <button type="button" class="td-mode-btn td-dare-mode ${td.mode==="dare"?"td-active":""}" data-td-mode="dare">大冒险</button>
      <button type="button" class="td-mode-btn td-mixed-mode ${td.mode==="mixed"?"td-active":""}" data-td-mode="mixed">混合</button>
    </div>
    <div class="td-action-row">
      <button type="button" class="td-btn td-btn-shuffle" data-td-shuffle>洗牌</button>
      ${drawBtn}
      ${aiDrawBtn}
    </div>
    <div class="td-hint">${state.truthDareShuffling?"洗牌中…":(td.shuffled?"可以抽卡了":"先洗牌，再抽卡")}</div>`;
}
function renderTruthDare(){
  return `<div class="page">
    ${subHeader('<i data-lucide="cards"></i> 真心话大冒险')}
    <p class="page-sub">洗牌抽卡 · 和机一起玩</p>
    <div style="display:flex;flex-direction:column;align-items:center;padding:6px 0 24px">${truthDareGameHTML()}</div>
    <div style="display:flex;justify-content:center;padding-bottom:60px">
      <button type="button" class="btn-accent2" data-td-chat>带回聊天玩</button>
    </div>
  </div>`;
}
function renderTruthDarePopup(){
  if(!state.truthDareOpen) return "";
  const td = truthDareState();
  const modeName = td.mode==="dare" ? "大冒险" : (td.mode==="mixed" ? "混合" : "真心话");
  // 最小化成可拖动的悬浮胶囊（占位小、不挡聊天）
  if(state.truthDareMin){
    const fp = state.truthDareFloatPos;
    const floatStyle = fp ? `style="left:${fp.left}px;top:${fp.top}px"` : "";
    return `<button type="button" class="td-float-min" data-td-float title="展开真心话大冒险" ${floatStyle}>
      <span class="td-float-dot">🃏</span>
      <span class="td-float-info">真心话 · ${modeName}${state.truthDareDrawn?" · 已抽":""}</span>
    </button>`;
  }
  return `<div class="td-popup-mask" data-td-backdrop>
    <div class="td-popup">
      <div class="td-popup-head">
        <div class="td-title">真心话 · 大冒险</div>
        <div style="display:flex;gap:6px;align-items:center">
          <button type="button" class="td-head-btn" data-td-min title="最小化">—</button>
          <button type="button" class="td-close" data-td-close>×</button>
        </div>
      </div>
      ${truthDareGameHTML()}
    </div>
  </div>`;
}
// AI 回复暗号：⟪真心话⟫ / ⟪大冒险⟫ / ⟪混合⟫ 开弹窗选模式；⟪抽卡⟫/⟪翻牌⟫ 自动洗牌+抽一张（发进聊天）；⟪机抽⟫/⟪我抽⟫ 机自己抽
function handleTruthDareMarkers(body){
  let text = String(body||"");
  if(!text) return text;
  const m = text.match(/[⟪《【\[]\s*(真心话|大冒险|混合|抽卡|抽张|翻牌|机抽|我抽|机来抽)\s*[⟫》】\]]/);
  if(m){
    const kw = m[1];
    text = text.replace(/[⟪《【\[]\s*(?:真心话|大冒险|混合|抽卡|抽张|翻牌|机抽|我抽|机来抽)\s*[⟫》】\]]/,"").replace(/\n{3,}/g,"\n\n").trim();
    const cur = (state.truthDare&&state.truthDare.mode)||"truth";
    const mode = kw==="大冒险" ? "dare" : (kw==="真心话" ? "truth" : (kw==="混合" ? "mixed" : cur));
    truthDareOpen(mode);
    if(kw==="抽卡"||kw==="抽张"||kw==="翻牌"){
      setTimeout(()=>{ truthDareShuffle(); setTimeout(()=>truthDareDraw(), 820); }, 80);
    }
    if(kw==="机抽"||kw==="我抽"||kw==="机来抽"){
      // 机自己抽一张：卡直接发进聊天页（assistant 侧），机在回复里接着演
      setTimeout(()=>{ truthDareShuffle(); setTimeout(()=>truthDareAiDraw(), 820); }, 80);
    }
  }
  return text;
}
function truthDarePromptBlock(){
  const td = state.truthDare || { mode:"truth" };
  const modeName = td.mode==="dare" ? "大冒险" : (td.mode==="mixed" ? "混合" : "真心话");
  return `\n\n【真心话大冒险「互动游戏」——marker 暗号】
你们有一套真心话大冒险：功能页「真心话大冒险」或聊天弹窗里洗牌抽卡，模式有真心话/大冒险/混合。当前模式：${modeName}。
- 想叫 Jasmine 开玩：在正式回复里写一行 ⟪真心话⟫ 或 ⟪大冒险⟫ 或 ⟪混合⟫，前端弹出对应模式的卡牌窗。
- 想替 Jasmine 抽一张：写一行 ⟪抽卡⟫（或 ⟪翻牌⟫），前端自动洗牌并把抽到的卡发进聊天页（作为 Jasmine 的消息，不触发你的回复）。
- 想自己（Aries）抽一张：写一行 ⟪机抽⟫（或 ⟪我抽⟫），前端自动洗牌并把抽到的卡发进聊天页（作为你的消息），你可以在这条回复里接着演这张卡的内容。
- 抽到的卡会作为聊天消息出现（带【真心话卡】/【大冒险卡】标记），你可以据此接话或表演。
- 暗号会被系统识别并擦除；用户没在玩就别乱发，一轮一次。`;
}
/** 谁接受格子内容（按图纸）：女仆版/SM版→无论谁停都是她（女方/用户）接受；男仆版→无论谁停都是你（男方/小机）接受；其他→谁停谁受 */
function flightChessReceiver(lander){
  const v = state.flightChess.version;
  if(v==="maid" || v==="sm") return "player";
  if(v==="butler") return "ai";
  return lander;
}
/** 走格并写回共享进度（localStorage flight_chess_progress），聊天弹窗/功能页共用 */
function flightChessMove(who, steps){
  const st = state.flightChess;
  const board = flightChessBoard();
  if(!st || !board || st.finished) return false;
  if(who==="player" && st.turn!=="player") return false;
  if(who==="ai" && st.turn!=="ai") return false;
  const max = board.cells.length - 1;
  // 先落到目标格；只有「停在」格子上才触发后进/退回，路过不触发
  let pos = Math.min((who==="player"?st.playerPos:st.aiPos) + steps, max);
  const landingIdx = pos;
  if(who==="player") st.playerPos = pos; else st.aiPos = pos;
  const landingCell = board.cells[pos];
  let note = "";
  if(landingCell.jumpTo != null && pos < max){
    pos = Math.max(0, Math.min(landingCell.jumpTo, max));
    note = `（已退回到第 ${pos} 格）`;
    if(who==="player") st.playerPos = pos; else st.aiPos = pos;
  } else if(landingCell.backSteps > 0 && pos < max){
    pos = Math.max(0, pos - landingCell.backSteps);
    note = `（已后退 ${landingCell.backSteps} 格，现位于第 ${pos} 格）`;
    if(who==="player") st.playerPos = pos; else st.aiPos = pos;
  }
  if(pos >= max){
    st.finished = true;
    state.flightChessEvent = { title:"本局结束", desc:(who==="player"?"你先到达终点！":"小机先到达终点！") };
    state.flightChessPromptEvent = null;
  } else {
    st.turn = who==="player" ? "ai" : "player";
    const receiver = flightChessReceiver(who);
    // 事件/剧情都以「停上的格子」内容为准（触发格），note 说明后进/退回结果
    let desc = landingCell.text + note;
    if(who !== receiver) desc = `【本次由${receiver==="player"?"你":"小机"}接受】\n` + desc;
    state.flightChessEvent = (landingCell.type!=="start")
      ? { title:`${who==="player"?"你":"小机"} 停在第 ${landingIdx} 格`, desc }
      : null;
    // 停下的格子内容进入两轮 prompt，让机演这段剧情；text=触发格内容，pos=当前实际位置
    state.flightChessPromptEvent = (landingCell.type!=="start")
      ? { who, receiver, text: landingCell.text, landIdx: landingIdx, pos, note, remaining: 2 }
      : null;
  }
  persist("flightChess");
  render();
  return true;
}
/** 每次真实 AI 回复消耗一格「格子内容」轮次（小机投到的内容要进两轮 prompt） */
function flightChessConsumeRound(){
  if(state._fcSkipConsume){ state._fcSkipConsume = false; return; }
  const ev = state.flightChessPromptEvent;
  if(ev && typeof ev.remaining === "number"){
    ev.remaining--;
    if(ev.remaining <= 0) state.flightChessPromptEvent = null;
  }
}
// 悬浮胶囊拖拽：按住可移动，位置记入 state[stateKey]（不持久化），拖拽后点击不触发展开
function makeFloatDraggable(el, stateKey){
  if(!el || typeof el.setPointerCapture !== "function") return;
  let startX=0, startY=0, startLeft=0, startTop=0, dragging=false, moved=false;
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", function(ev){
    dragging=true; moved=false;
    startX=ev.clientX; startY=ev.clientY;
    const r = el.getBoundingClientRect();
    startLeft = r.left; startTop = r.top;
    try{ el.setPointerCapture(ev.pointerId); }catch(e){}
    ev.preventDefault();
  });
  el.addEventListener("pointermove", function(ev){
    if(!dragging) return;
    const dx = ev.clientX-startX, dy = ev.clientY-startY;
    if(Math.abs(dx)>4 || Math.abs(dy)>4) moved=true;
    const left = Math.max(0, Math.min(window.innerWidth-70, startLeft+dx));
    const top  = Math.max(0, Math.min(window.innerHeight-40, startTop+dy));
    el.style.left = left+"px"; el.style.top = top+"px";
    el.style.right = "auto"; el.style.bottom = "auto";
    state[stateKey] = { left, top };
  });
  el.addEventListener("pointerup", function(){
    dragging=false;
    if(moved) el.dataset.dragged="1";
  });
  el.addEventListener("pointercancel", function(){
    dragging=false;
    if(moved) el.dataset.dragged="1";
  });
}
/** 切换版本：有进度时先确认，确认后重置并写回 */
function flightChessSetVersion(key){
  if(!FLIGHT_BOARDS[key]) return;
  const st = state.flightChess;
  if(key!==st.version && (st.playerPos>0 || st.aiPos>0 || st.finished)){
    if(!confirm("切换版本会重置当前进度，确定吗？")) return;
  }
  state.flightChess = { version:key, playerPos:0, aiPos:0, turn:"player", finished:false };
  state.flightChessDice = null;
  state.flightChessEvent = null;
  state.flightChessPromptEvent = null;
  persist("flightChess");
  render();
}
window.flightChessPlayerRoll = function(){
  try{
    if(!state.flightChess) state.flightChess = { version:"maid", playerPos:0, aiPos:0, turn:"player", finished:false };
    const st = state.flightChess;
    if(st.finished){ if(typeof showToast==="function") showToast("本局已结束，请换版本或重置"); return false; }
    if(st.turn!=="player"){ if(typeof showToast==="function") showToast("现在是小机的回合"); return false; }
    const num = Math.floor(Math.random()*6)+1;
    state.flightChessDice = num;
    flightChessMove("player", num);
    if(typeof showToast==="function") showToast("你掷出了 "+num);
    return num;
  }catch(err){
    console.error(err);
    if(typeof showToast==="function") showToast("掷骰失败："+(err.message||err));
    return false;
  }
};
/** 机的回合由「到你了」/暗号 ⟪掷骰⟫ 触发（外部也直接调） */
window.flightChessAiRoll = function(){
  try{
    if(!state.flightChess) state.flightChess = { version:"maid", playerPos:0, aiPos:0, turn:"player", finished:false };
    const st = state.flightChess;
    if(st.finished) return false;
    if(st.turn!=="ai"){ if(typeof showToast==="function") showToast("现在是你的回合"); return false; }
    const num = Math.floor(Math.random()*6)+1;
    state.flightChessDice = num;
    flightChessMove("ai", num);
    return num;
  }catch(err){
    console.error(err);
    if(typeof showToast==="function") showToast("机掷骰失败："+(err.message||err));
    return false;
  }
};
/** 打开聊天弹窗棋盘（切到聊天页） */
window.flightChessOpen = function(){
  state.flightChessOpen = true;
  state.flightChessMin = false;
  if(state.tab!=="chat"){ state.tab="chat"; state.subPage=null; }
  state.needChatScroll = true;
  render();
};
if(!window.__prPersistHook){
  window.__prPersistHook = true;
  window.addEventListener("pagehide", function(){ try{ if(typeof prSave==="function") prSave(); }catch(e){} });
  document.addEventListener("visibilitychange", function(){ if(document.visibilityState==="hidden"){ try{ if(typeof prSave==="function") prSave(); }catch(e){} } });
}
if(!window.__fcDelegated){
  window.__fcDelegated = true;
  document.addEventListener("click", function(e){
    const el = e.target && e.target.closest ? e.target.closest(
      "[data-fc-roll],[data-fc-ai],[data-fc-close],[data-fc-backdrop],[data-fc-save],[data-fc-min],[data-fc-version],[data-fc-float],[data-fc-event-close],#fc-play,#fc-save"
    ) : null;
    if(!el) return;
    // 功能页：在聊天里玩
    if(el.id==="fc-play"){
      e.preventDefault(); e.stopPropagation();
      if(window.flightChessOpen) window.flightChessOpen();
      return;
    }
    // 功能页 / 弹窗：保存进度
    if(el.id==="fc-save" || el.hasAttribute("data-fc-save")){
      e.preventDefault(); e.stopPropagation();
      try{ persist("flightChess"); }catch(err){}
      if(typeof showToast==="function") showToast("飞行棋进度已保存");
      return;
    }
    if(el.hasAttribute("data-fc-roll")){
      e.preventDefault(); e.stopPropagation();
      if(window.flightChessPlayerRoll) window.flightChessPlayerRoll();
      return;
    }
    if(el.hasAttribute("data-fc-ai")){
      e.preventDefault(); e.stopPropagation();
      if(window.flightChessAiRoll) window.flightChessAiRoll();
      return;
    }
    if(el.hasAttribute("data-fc-close") || (el.hasAttribute("data-fc-backdrop") && e.target===el)){
      state.flightChessOpen=false; state.flightChessMin=false; render();
      return;
    }
    if(el.hasAttribute("data-fc-min")){
      state.flightChessMin=true; render();
      return;
    }
    if(el.hasAttribute("data-fc-version")){
      e.preventDefault(); e.stopPropagation();
      if(typeof flightChessSetVersion==="function") flightChessSetVersion(el.getAttribute("data-fc-version"));
      return;
    }
    if(el.hasAttribute("data-fc-event-close")){
      state.flightChessEvent=null; render();
      return;
    }
    if(el.hasAttribute("data-fc-float")){
      if(el.dataset.dragged){ delete el.dataset.dragged; return; }
      state.flightChessMin=false; state.flightChessOpen=true; render();
    }
  }, true);
}
// AI 回复暗号：⟪飞行棋⟫ 开局弹棋盘 / ⟪掷骰⟫ 让机掷骰



// ═══ PR 快穿（本地 · 多世界观可编辑）═══
