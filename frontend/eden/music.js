/* Music garden: native playback and chat; account-scoped, persistent App playlists. */
const EdenMusic=(()=>{
  const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let view='discover', selected='', busy=false, session=null,roomOpen=false,roomPane='music';
  const artist=s=>Array.isArray(s?.artists)?s.artists.join(' / '):String(s?.artists||'');
  const list=()=>Array.isArray(state.edenPlaylists)?state.edenPlaylists:[];
  const save=items=>{state.edenPlaylists=items;persist('edenPlaylists');};
  const id=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
  function parse(raw){const parts=String(raw||'').split('|').map(x=>x.trim()).filter(Boolean);return {name:(parts.shift()||'为你收藏').slice(0,60),queries:[...new Set(parts)].slice(0,50)};}
  function remember(raw){const p=parse(raw);if(!p.queries.length)return;const owner=state.chatTarget||'a1';const signature=JSON.stringify([owner,p.name,p.queries]);if(list().some(x=>x.signature===signature))return;save([...list(),{id:id(),name:p.name,creator:'partner',owner,signature,createdAt:new Date().toISOString(),tracks:p.queries.map(query=>({query}))}]);}
  function create(name){const title=String(name||'').trim().slice(0,60);if(!title)return null;const p={id:id(),name:title,creator:'me',createdAt:new Date().toISOString(),tracks:[]};save([...list(),p]);return p;}
  function add(pid,song){if(!song?.id)return;save(list().map(p=>p.id!==pid?p:{...p,tracks:p.tracks.some(t=>String(t.id)===String(song.id)&&t.source===song.source)?p.tracks:[...p.tracks,{...song,url:undefined}]}));}
  const button=(action,label,extra='')=>`<button type="button" data-em="${action}" ${extra}>${label}</button>`;
  function library(){const p=list().find(x=>x.id===selected);if(p)return `<div class="em-library">${button('library','‹ 全部歌单')}<h2>${h(p.name)}</h2><p>${p.creator==='partner'?'TA 为你创建':'我创建的'} · ${p.tracks.length} 首 · 保存在 App</p><div class="em-actions">${button('play-list',busy?'正在找歌…':'▷ 播放全部',busy?'disabled':'')}${button('rename','改名')}${button('delete','删除歌单')}</div>${p.tracks.length?p.tracks.map((t,i)=>`<div class="em-track"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${h(t.name||t.query)}</strong><small>${h(artist(t))}</small></div>${button('play-track','▷',`data-index="${i}" aria-label="播放 ${h(t.name||t.query)}"`)}${button('remove','×',`data-index="${i}" aria-label="从歌单移除"`)}</div>`).join(''):'<p class="em-empty">搜索喜欢的歌，点「＋」收藏到这里。</p>'}</div>`;
    return `<div class="em-library"><div class="em-section"><h2>我们的歌单</h2>${button('create','建歌单 ＋')}</div><p class="em-note">你收藏旋律，TA 也可以为你写一份歌单。</p>${button('ask','请 TA 为我建歌单')}<div class="em-albums">${list().map(p=>`<button data-em="open-list" data-id="${h(p.id)}"><span class="em-album-art">${p.creator==='partner'?'♡':'♫'}</span><strong>${h(p.name)}</strong><small>${p.tracks.length} 首 · ${p.creator==='partner'?'TA 创建':'我创建'}</small></button>`).join('')}</div>${!list().length?'<p class="em-empty">第一份歌单，从喜欢的一首歌开始。</p>':''}</div>`;
  }
  function page({authBlock,contentHtml,navs,nowBlock,src,settingsOpen}){
    const now=state.musicNow;
    return `<div class="page nm em-page">${subHeader('一起听')}<section class="em-sanctuary"><div class="em-oval">${now?.cover?`<img src="${h(now.cover)}" alt="专辑封面">`:'<span>♫</span>'}</div><div class="em-song-title"><small>MUSIC, WITH YOU</small><h1>${h(now?.name||'音乐，永远与你同在')}</h1><p>${h(artist(now)||'把心事唱给彼此听')}</p></div><div class="em-actions">${button('invite',session?.target===state.chatTarget?'回到一起听':'邀请 TA 一起听')}${button('chat','边听边聊')}</div></section><nav class="em-tabs">${button('discover','发现音乐',`aria-pressed="${view==='discover'}"`)}${button('library','我们的歌单',`aria-pressed="${view==='library'}"`)}<button id="music-settings-toggle" aria-label="音乐登录与设置">${settingsOpen?'收起设置':'登录 / 设置'}</button></nav>${settingsOpen?`<section class="nm-settings"><div class="nm-seg"><button data-music-src="netease">网易云</button><button data-music-src="spotify">Spotify</button></div><div class="nm-seg"><button data-music-backend="auto">自动</button><button data-music-backend="duetto">Duetto</button><button data-music-backend="gateway">自建网关</button></div>${authBlock}</section>`:''}${now?`<section class="em-player">${nowBlock}<label class="em-progress"><span id="em-elapsed">00:00</span><input id="em-seek" type="range" min="0" max="100" value="0" aria-label="播放进度"><span id="em-duration">00:00</span></label>${button('save-now','收藏到歌单 ＋')}${button('share','分享到聊天 ↗')}</section>`:''}${state.musicError?`<p role="status" class="nm-err">${h(state.musicError)}</p>`:''}${view==='library'?library():`<nav class="nm-nav">${navs.map(([k,label])=>`<button data-music-browse="${k}" class="nm-tab ${state.musicBrowse===k?'on':''}">${h(label)}</button>`).join('')}</nav><section class="em-results">${contentHtml}</section>`}</div>`;
  }
  function dialog(title,body,submit){const d=document.createElement('dialog');d.className='em-dialog';d.innerHTML=`<form method="dialog"><h2>${h(title)}</h2>${body}<footer><button value="cancel">取消</button><button value="ok">确定</button></footer></form>`;document.body.append(d);d.addEventListener('close',()=>{if(d.returnValue==='ok')submit(d);d.remove();});d.showModal();return d;}
  function choose(song){if(!song)return;dialog('收藏到歌单',`<label>已有歌单<select name="playlist"><option value="">新建歌单…</option>${list().map(p=>`<option value="${h(p.id)}">${h(p.name)}</option>`).join('')}</select></label><label>新歌单名称<input name="title" maxlength="60" placeholder="我们的旋律"></label>`,d=>{const p=d.querySelector('select').value||create(d.querySelector('input').value||'我们的旋律')?.id;if(p){add(p,song);showToast('已收藏到歌单');render();}});}
  function enterChat(inRoom=false){roomOpen=inRoom;EdenTheme.navigate('chat');}
  function send(content,song,inRoom=false){enterChat(inRoom);state.pendingUser.push({role:'user',content,...(song?{song:{name:song.name,artists:artist(song),cover:song.cover,source:song.source}}:{}),time:new Date().toISOString()});state.needChatScroll=true;saveActiveThread();render();triggerAIReply();}
  function roomActive(){return state.uiShell==='eden'&&roomOpen&&session?.target===state.chatTarget&&!state.subPage;}
  function room(chatHtml){
    const n=state.musicNow,partner=state.coupleInfo?.partnerName||'TA',me=state.coupleInfo?.myName||'我';
    const avatar=(url,name)=>url?`<img src="${h(url)}" alt="${h(name)}">`:`<span>${h(name.slice(0,1))}</span>`;
    const c=state.coupleInfo||{},agent=(state.agents||[]).find(a=>a.id===state.chatTarget)||{};
    const recent=(state.messages||[]).filter(m=>m.role==='assistant'&&typeof m.content==='string').at(-1);
    const words=recent?.content?.replace(/\[(?:playlist|song):[^\]]*\]/g,'').slice(0,100)||'选一首喜欢的歌，把此刻慢慢分享给彼此。';
    return `<section class="em-room"><header class="em-room-head">${button('minimize','⌄','aria-label="收起一起听房间"')}<span>和 ${h(partner)} 一起听</span>${button('end','结束')}</header><div class="em-duet"><div>${avatar(c.myAvatar||state.profileMe?.avatar,me)}</div><i>♡</i><div>${avatar(agent.avatar||c.partnerAvatar||state.profileThem?.avatar,partner)}</div></div><nav class="em-room-tabs">${button('room-music','♪ 唱片',`aria-pressed="${roomPane==='music'}"`)}${button('room-chat','♡ 边听边聊',`aria-pressed="${roomPane==='chat'}"`)}</nav><div class="em-room-record-view" ${roomPane==='music'?'':'hidden'}><button class="em-room-whisper" data-em="room-chat">${h(words)}</button><div class="em-vinyl ${state.musicPlaying?'playing':''}"><div>${n?.cover?`<img src="${h(n.cover)}" alt="${h(n.name)}封面">`:'<span>♪</span>'}</div></div><div class="em-room-title"><div><h2>${h(n?.name||'等一首，属于我们的歌')}</h2><p>${h(artist(n)||'从音乐花园选择歌曲')}</p></div>${button('save-now','♡','aria-label="收藏当前歌曲"')}${button('share','↗','aria-label="将歌曲分享到普通聊天"')}</div></div><div class="em-room-chat-view" ${roomPane==='chat'?'':'hidden'}>${chatHtml}</div><footer class="em-room-player"><label class="em-progress"><span id="em-elapsed">00:00</span><input id="em-seek" type="range" min="0" max="100" value="0" aria-label="播放进度"><span id="em-duration">00:00</span></label><div class="em-room-controls">${button('choose','♫','aria-label="选歌或查看歌单"')}<button id="music-now-prev" aria-label="上一首" ${(state.musicQueue||[]).length<2?'disabled':''}>‹</button><button id="music-now-toggle" aria-label="${state.musicPlaying?'暂停':'播放'}">${state.musicPlaying?'Ⅱ':'▷'}</button><button id="music-now-next" aria-label="下一首" ${(state.musicQueue||[]).length<2?'disabled':''}>›</button>${button('queue','☷','aria-label="播放队列"')}</div></footer></section>`;
  }
  async function play(tracks){if(busy)return;busy=true;render();try{const found=[];for(const t of tracks){const song=t.id!=null?t:await songSearchFirst(t.query);if(song)found.push(song);}if(!found.length)throw Error('暂时没有找到这些歌曲，请检查音源登录或搜索歌名');musicSetQueue(found,0);await musicResolveAndPlay(found[0]);if(found.length<tracks.length)showToast(`已找到 ${found.length} / ${tracks.length} 首歌曲`);}catch(e){state.musicError=e.message;}finally{busy=false;render();}}
  function clock(sec){if(!Number.isFinite(sec))return '00:00';return Math.floor(sec/60).toString().padStart(2,'0')+':'+Math.floor(sec%60).toString().padStart(2,'0');}
  function afterRender(){
    if(state.uiShell!=='eden')return;
    const chat=document.querySelector('.chat-page');
    if(chat&&!roomActive()&&session?.target===state.chatTarget&&!chat.querySelector('.em-listening')){const bar=document.createElement('aside');bar.className='em-listening';bar.innerHTML=`<button data-em="room"><strong>♫ 和 ${h(state.coupleInfo?.partnerName||'TA')} 一起听</strong><small>${h(state.musicNow?.name||'选一首歌，慢慢听')}</small></button>${button('toggle',state.musicPlaying?'Ⅱ':'▷','aria-label="播放或暂停音乐"')}${button('end','×','aria-label="结束一起听"')}`;const header=chat.querySelector('.chat-header');header?header.after(bar):chat.prepend(bar);}
    document.querySelectorAll('.em-results [data-music-play]').forEach(row=>{const wrap=document.createElement('div');wrap.className='em-result-row';row.replaceWith(wrap);wrap.append(row);const b=document.createElement('button');b.textContent='＋';b.dataset.em='add-result';b.dataset.index=row.dataset.musicPlay;b.setAttribute('aria-label','收藏到歌单');wrap.append(b);});
    const audio=document.getElementById('mp-audio'),seek=document.getElementById('em-seek');
    if(audio&&!audio.dataset.edenTime){audio.dataset.edenTime='1';for(const event of ['timeupdate','loadedmetadata','durationchange'])audio.addEventListener(event,()=>{const range=document.getElementById('em-seek');if(!range)return;const total=Number.isFinite(audio.duration)?audio.duration:0;range.disabled=!total;range.value=total?audio.currentTime/total*100:0;document.getElementById('em-elapsed').textContent=clock(audio.currentTime);document.getElementById('em-duration').textContent=clock(total);});}
    if(seek){seek.disabled=!audio||!Number.isFinite(audio.duration);seek.onchange=()=>{if(audio&&Number.isFinite(audio.duration))audio.currentTime=Number(seek.value)/100*audio.duration;};}
  }
  async function action(el){const a=el.dataset.em,p=list().find(x=>x.id===selected);
    if(a==='discover'){view='discover';render();}
    if(a==='library'){view='library';selected='';render();}
    if(a==='open-list'){view='library';selected=el.dataset.id;render();}
    if(a==='create'||a==='rename')dialog(a==='create'?'新建歌单':'给歌单改名',`<label>歌单名称<input name="title" required maxlength="60" value="${h(a==='rename'?p?.name:'')}" placeholder="例如：晚风寄来的信"></label>`,d=>{const name=d.querySelector('input').value.trim();if(!name)return;if(a==='create'){selected=create(name).id;view='library';}else save(list().map(x=>x.id===p.id?{...x,name}:x));render();});
    if(a==='delete'&&p)dialog('删除这份歌单？','<p>只移除 App 内的这份收藏，不删除歌曲。</p>',()=>{save(list().filter(x=>x.id!==p.id));selected='';render();});
    if(a==='remove'&&p){save(list().map(x=>x.id!==p.id?x:{...x,tracks:x.tracks.filter((_,i)=>i!==Number(el.dataset.index))}));render();}
    if(a==='play-list'&&p)await play(p.tracks);
    if(a==='play-track'&&p)await play([p.tracks[Number(el.dataset.index)]]);
    if(a==='save-now')choose(state.musicNow);
    if(a==='add-result')choose(state.musicResults[Number(el.dataset.index)]);
    if(a==='ask')dialog('请 TA 为你建歌单',`<label>想听什么？<input maxlength="200" placeholder="例如：适合雨天读信的温柔歌单"></label>`,d=>{send('请为我建一份歌单：'+(d.querySelector('input').value.trim()||'挑几首你想陪我听的歌')+'。');});
    if(a==='invite'){roomPane='music';if(session?.target===state.chatTarget){enterChat(true);return;}session={target:state.chatTarget||'a1'};const n=state.musicNow;send(n?`邀请你和我一起听《${n.name}》 - ${artist(n)}，陪我边听边聊吧。`:'邀请你来花园一起听歌。想先和我听哪一首？',null,true);}
    if(a==='chat'){session={target:state.chatTarget||'a1'};roomPane='chat';enterChat(true);}
    if(a==='room'){roomPane='music';enterChat(true);}
    if(a==='room-music'||a==='room-chat'){roomPane=a==='room-music'?'music':'chat';render();}
    if(a==='minimize'||a==='choose'){roomOpen=false;state.subPage='music';render();}
    if(a==='share'){const n=state.musicNow;if(!n){showToast('先选一首歌，再分享');return;}send(`分享给你：我在听《${n.name}》 - ${artist(n)}。`,n,false);}
    if(a==='queue'){const q=state.musicQueue||[];dialog('播放队列',q.length?q.map((n,i)=>`<p>${i+1}. ${h(n.name)} · ${h(artist(n))}</p>`).join(''):'<p>还没有歌曲，去歌单里挑几首吧。</p>',()=>{});}
    if(a==='player'){state.subPage='music';render();}
    if(a==='toggle')await musicTogglePlay();
    if(a==='end'){session=null;roomOpen=false;state.subPage='music';render();}
  }
  if(typeof document!=='undefined')document.addEventListener('click',e=>{const el=e.target.closest?.('[data-em]');if(!el)return;e.preventDefault();action(el).catch(err=>showToast(err.message));});
  return {page,afterRender,remember,parse,create,add,room,roomActive};
})();
if(typeof module!=='undefined')module.exports=EdenMusic;
