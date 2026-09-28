/* Eden is a presentation shell over the existing Baileys state and routes. */
const EdenTheme = (() => {
  const h = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sections = [
    ['together','与你相伴','TOGETHER',['music','read','watch','shufang','phone','trip','body','usage']],
    ['memories','时光藏匣','OUR MEMORIES',['diary','mdiary','notes','mailbox','memory','savedchat','album','calendar','sparkvault','cabinets','dream','sigillo']],
    ['life','花园日常','LITTLE THINGS',['coupon','wallet','sayday','love','wardrobe','duty','quest','baby']],
    ['play','梦中奇境','WONDERLAND',['duel_gomoku','duel_blackjack','duel_zhajinhua','duel_mahjong','explore','tavern','rewrite','hisphone','game','cooking','menu','cmdgame','htmlgame','roleplay','pr','flightchess','bisca_cards','bisca_daifugo','bisca_monopoly','captivity','divination','truthdare','eatapple']],
    ['tools','羽翼之下','THE ATELIER',['workshop','mcphall','vps','ntfy','theme','branding','prompts']]
  ];
  const hiddenFeatures=new Set(['workshop','branding','usage','diary','duty','cooking','ntfy']);
  let query='', category='all';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function palette(){ return {bg:'#faf8f3',card:'#fffdfa',accent:'#89775e',accent2:'#ded4c4',text:'#514b43',sub:'#847969',border:'#d9cfbf',bubble_me:'#eee7dc',bubble_them:'#fffdfa'}; }
  function icon(key, size=''){
    const duelIcons={duel_gomoku:'usage',duel_blackjack:'branding',duel_zhajinhua:'workshop',duel_mahjong:'ntfy'};
    const slot=typeof angelIconSlots==='undefined'?null:angelIconSlots[duelIcons[key]||key];
    if(!slot || !slot.crop) return '<span class="eden-symbol" aria-hidden="true">✧</span>';
    const c=slot.crop;
    return `<span class="eden-icon ${size}" aria-hidden="true" data-eden-icon="${h(key)}" style="--eden-atlas:url('angel-atlas-${slot.sheet}.png');--ex:${c.x}%;--ey:${c.y}%;--ew:${c.w}%;--eh:${c.h}%;--ebw:${c.bw}%;--ebh:${c.bh}%"><span></span></span>`;
  }
  function allFeatures(){ return FEAT_GROUPS.flatMap(group=>group.items).filter(f=>!hiddenFeatures.has(f.key)).map(f=>f.key==='mdiary'?{...f,label:'日记'}:f); }
  function feature(key,label){
    const f=allFeatures().find(item=>item.key===key);
    if(!f)return '';
    const gameMark={duel_gomoku:'五',duel_blackjack:'21',duel_zhajinhua:'♠',duel_mahjong:'中'}[key];
    return `<button type="button" class="feat-card eden-feature" data-sub="${h(key)}"><span class="eden-setting">${icon(key)}${gameMark?`<span class="eden-game-mark" aria-hidden="true">${gameMark}</span>`:''}</span><span class="eden-feature-label">${h(label||f.label)}</span></button>`;
  }
  function motionButton(){return `<button type="button" class="eden-round" data-eden-motion aria-label="${state.edenMotionPaused?'播放动态':'暂停动态'}" aria-pressed="${!!state.edenMotionPaused}"><span aria-hidden="true">${state.edenMotionPaused?'▷':'Ⅱ'}</span></button>`;}
  function header(){return `<header class="eden-masthead"><div class="eden-header-actions">${motionButton()}<button type="button" class="eden-round" data-eden-page="settings" aria-label="个人设定">${icon('profile','small')}</button></div></header>`;}
  function avatar(url,name){return `<span class="eden-portrait">${url?`<img src="${h(url)}" alt="${h(name)}的头像">`:`<span>${h(String(name||'♡').slice(0,1))}</span>`}</span>`;}
  function home(){
    const c=state.coupleInfo||{};
    const myName=c.myName||'我', partnerName=c.partnerName||'TA';
    const date=new Date().toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'});
    const together=typeof daysSince==='function'?daysSince():'';
    return `${header()}<section class="eden-hero"><div class="eden-mirror"><img class="eden-emblem" src="eden/wing-emblem.png" alt="珍珠光环与洁白羽翼"><svg class="eden-cat" viewBox="0 0 80 125" role="img" aria-label="镜中淡淡的猫影"><path d="M25 27 23 9 35 20Q42 17 48 21L58 13 55 31Q61 40 50 46Q48 52 51 62Q56 74 57 96L65 108Q65 112 56 112L32 112Q23 110 24 103Q22 90 29 77Q36 64 34 51L27 44Q20 41 23 35L19 32Z"/><path d="M36 109Q61 120 67 103Q73 87 62 85Q57 85 59 91Q65 86 65 101Q64 113 39 106Z"/></svg></div><span class="eden-flourish" aria-hidden="true">✧ · ♡ · ✧</span></section>
      <div class="eden-home-content"><section class="eden-card eden-couple"><p class="eden-overline">You & me, in every lifetime.</p><div class="eden-couple-row"><button type="button" data-eden-page="settings" class="eden-person" aria-label="查看我的资料">${avatar(c.myAvatar,myName)}<span>${h(myName)}</span></button><div class="eden-couple-center"><em>eternal</em><span>${together!==''?`第 ${h(together)} 天`:'一封写给彼此的信'}</span></div><button type="button" data-eden-page="settings" class="eden-person" aria-label="查看伴侣资料">${avatar(c.partnerAvatar,partnerName)}<span>${h(partnerName)}</span></button></div><p class="eden-caption">${h(c.startDate||'把平凡的日子，过成永恒。')}</p><button type="button" class="eden-pearl-button" data-eden-page="chat">${icon('duty','small')}去见 ${h(partnerName)}<span aria-hidden="true">›</span></button></section>
      <section class="eden-status eden-card"><span>今日心语</span>${state.statusEditing?`<label class="eden-sr-only" for="status-input">今日状态</label><input id="status-input" maxlength="500" value="${h(state.editStatus)}"><button type="button" id="status-save">保存</button>`:`<p>${h(c.statusMsg||'花园的门，永远为你留着。')}</p><button type="button" id="status-edit" aria-label="编辑今日状态">落笔</button>`}</section>
      <div class="eden-section-title"><h2>慢慢，与你</h2><span>our little things</span></div><div class="eden-feature-grid">${['mdiary','mailbox','memory','album','music','read','dream','calendar','phone','notes'].map(k=>feature(k,k==='calendar'?'纪念日':undefined)).join('')}</div>
      <button type="button" class="eden-card eden-garden-link" data-eden-page="garden">${icon('garden')}<span><strong>漫步秘密花园</strong><small>一起生活、游戏，收藏每一个瞬间。</small></span><span aria-hidden="true">›</span></button><p class="eden-page-end">⋆ 永远为你留一束光 ⋆</p></div>`;
  }
  function results(){
    const catalog=allFeatures(), q=query.trim().toLocaleLowerCase();let count=0;
    const sectionsHtml=sections.filter(g=>category==='all'||g[0]===category).map(g=>{
      const items=g[3].map(key=>catalog.find(f=>f.key===key)).filter(f=>f&&(!q||f.label.toLocaleLowerCase().includes(q)||f.key.toLowerCase().includes(q)));
      count+=items.length;
      return items.length?`<section class="eden-feature-group"><div class="eden-section-title"><h2>${g[1]}</h2><span>${g[2]}</span></div><div class="eden-feature-grid">${items.map(f=>feature(f.key)).join('')}</div></section>`:'';
    }).join('');
    // Future features remain reachable even before artwork/grouping is added.
    const known=new Set(sections.flatMap(g=>g[3]));
    const extras=category==='all'?catalog.filter(f=>!known.has(f.key)&&(!q||f.label.toLocaleLowerCase().includes(q)||f.key.toLowerCase().includes(q))):[];
    count+=extras.length;
    return sectionsHtml+(extras.length?`<section class="eden-feature-group"><div class="eden-section-title"><h2>新的相遇</h2></div><div class="eden-feature-grid">${extras.map(f=>feature(f.key)).join('')}</div></section>`:'')+(count?`<p class="eden-page-end">${count} 个入口 · 慢慢探索，不必着急</p>`:'<p class="eden-empty">还没找到这朵花，换个名字试试。</p>');
  }
  function garden(){return `${header()}<div class="eden-page-heading"><small>THE GARDEN OF US</small><h1>秘密花园</h1><p>每一个入口，都通往你们的小小世界。</p></div><label class="eden-search"><span aria-hidden="true">⌕</span><span class="eden-sr-only">查找功能</span><input id="eden-feature-search" type="search" placeholder="找一朵花，也找一个日常…" value="${h(query)}"></label><div class="eden-categories" role="group" aria-label="功能分类">${[['all','全部'],['together','陪伴'],['memories','时光'],['life','生活'],['play','奇境'],['tools','工具']].map(([key,label])=>`<button type="button" data-eden-category="${key}" class="${category===key?'active':''}" aria-pressed="${category===key}">${label}</button>`).join('')}</div><div id="eden-feature-results">${results()}</div>`;}
  function renderHome(){return `<div class="page eden-page" id="eden-page">${state.edenPage==='garden'?garden():home()}</div>`;}
  function renderNav(){
    const active=state.tab==='home'?(state.edenPage||'home'):state.tab;
    return `<nav class="eden-dock" aria-label="主导航">${[['home','伊甸','home'],['garden','花园','garden'],['chat','私语','chat'],['moments','回响','moments'],['settings','我的','profile']].map(([key,label,art])=>`<button type="button" data-eden-page="${key}" class="${active===key?'active ':''}${key==='chat'?'eden-dock-chat':''}" ${active===key?'aria-current="page"':''}>${icon(art,key==='chat'?'':'small')}<span>${label}</span></button>`).join('')}</nav>`;
  }
  function navigate(page){
    if(!['home','garden','chat','moments','settings'].includes(page))return;
    if(state.tab==='chat')saveActiveThread();
    if(page==='chat'&&state.tab!=='chat'){
      const th=(state.chatThreads||{})[state.chatTarget||'a1']||{messages:[],pendingUser:[]};
      state.messages=th.messages||[];state.pendingUser=th.pendingUser||[];state.needChatScroll=true;
    }
    if(page==='home'||page==='garden')state.edenPage=page;
    state.tab=page==='garden'?'home':page;state.subPage=null;state.homePage=1;render();
  }
  function syncMotion(){
    const paused=!!state.edenMotionPaused||reduced.matches;
    document.body.classList.toggle('eden-motion-paused',paused);
    document.body.classList.toggle('eden-page-hidden',document.hidden);
    document.querySelectorAll('[data-eden-motion]').forEach(button=>{button.disabled=reduced.matches;button.setAttribute('aria-pressed',String(paused));button.setAttribute('aria-label',reduced.matches?'系统已减少动态效果':paused?'播放动态':'暂停动态');button.innerHTML=`<span aria-hidden="true">${paused?'▷':'Ⅱ'}</span>`;});
  }
  function renderMoments(composer,feed,scope){return `<div class="page mo-page wx-moments"><div class="eden-echo-back"><button type="button" data-eden-page="home" aria-label="退出回响，返回主页">‹ 返回伊甸</button></div><header class="eden-echo-head"><small>ECHOES OF OUR DAYS</small><h1>花园回响</h1><p>把生活里的光，悄悄收集。</p></header><div class="eden-echo-toolbar"><div class="wx-tabs"><button type="button" class="wx-tab ${scope==='private'?'active':''}" data-mo-scope="private">我们的小小动态</button><button type="button" class="wx-tab ${scope==='public'?'active':''}" data-mo-scope="public">朋友们</button></div><button type="button" id="mo-new">留下一刻 ＋</button>${scope==='public'?'<button type="button" id="mo-friends" aria-label="管理好友">好友</button>':''}</div><div class="wx-feed">${composer}${feed}</div></div>`;}
  function afterRender(){
    const enabled=state.uiShell==='eden';
    document.body.dataset.edenView=state.subPage?'feature':state.tab;
    let atmosphere=document.getElementById('eden-atmosphere');
    if(enabled&&!atmosphere){atmosphere=document.createElement('div');atmosphere.id='eden-atmosphere';atmosphere.setAttribute('aria-hidden','true');atmosphere.innerHTML='<i class="eden-ray"></i><i class="eden-ray second"></i><i class="eden-mist"></i>';document.body.prepend(atmosphere);}
    if(atmosphere)atmosphere.hidden=!enabled;
    if(enabled){syncMotion();EdenGarden.mount(document.getElementById('app'),{assets:'eden/',chat:state.tab==='chat'&&!state.subPage,read:()=>state.edenGardenPrefs||{},write:value=>{state.edenGardenPrefs=value;state.edenMotionPaused=!value.enabled;persist('edenGardenPrefs');persist('edenMotionPaused');syncMotion();},paused:()=>state.edenMotionPaused});}
    else EdenGarden.disable();
  }
  document.addEventListener('click',event=>{
    if(typeof state==='undefined'||state.uiShell!=='eden'||!event.target.closest)return;
    const button=event.target.closest('[data-eden-page],[data-eden-category],[data-eden-motion]');if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(button.hasAttribute('data-eden-motion')){state.edenMotionPaused=!state.edenMotionPaused;state.edenGardenPrefs={...(state.edenGardenPrefs||{}),enabled:!state.edenMotionPaused};persist('edenMotionPaused');persist('edenGardenPrefs');syncMotion();EdenGarden.sync();}
    else if(button.dataset.edenCategory){category=button.dataset.edenCategory;render();}
    else navigate(button.dataset.edenPage);
  },true);
  document.addEventListener('input',event=>{
    if(event.target.id!=='eden-feature-search')return;
    query=event.target.value;const target=document.getElementById('eden-feature-results');
    if(target)target.innerHTML=results();
  });
  document.addEventListener('visibilitychange',()=>{if(typeof state!=='undefined'&&state.uiShell==='eden')syncMotion();});
  reduced.addEventListener('change',()=>{if(typeof state!=='undefined'&&state.uiShell==='eden')syncMotion();});
  return {palette,icon,renderHome,renderNav,navigate,afterRender,results,renderMoments};
})();
