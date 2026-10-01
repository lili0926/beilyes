/* 星光涂鸦壳 · 动态（朋友圈）
 * 发动态 / 评论 / 点赞 / 封面 / 公共圈好友，全部还是原来那套 id 和 data-mo-*、data-mf-*（renderMoments 拼好的 composer、feed 原样放进来），
 * 这里只换外壳：左上角退出键、错位双色标题、拍立得封面、私人 / 公共滑块、手账风的卡片。 */
const DoodleMoments = (() => {
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ON = () => typeof state !== 'undefined' && state.uiShell === 'doodle';

  /* 没设封面时的默认画面：糖果色天空 + 两朵云 + 几颗星 */
  const sky = `<svg class="ddmo-sky" viewBox="0 0 320 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="ddmoSky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9D9FB"/><stop offset=".5" stop-color="#D9E6FC"/><stop offset="1" stop-color="#FBE0EC"/></linearGradient></defs>
      <rect width="320" height="170" fill="url(#ddmoSky)"/>
      <circle cx="252" cy="44" r="20" fill="#FFF3C9"/><circle cx="262" cy="38" r="18" fill="#E2DDF8"/>
      <g fill="#fff" stroke="#CDB8EE" stroke-width="2.5" stroke-linejoin="round">
        <path d="M34 112c-14 0-14-20 2-20-2-16 22-20 28-6 8-14 32-8 30 8 16-2 18 18 4 18z"/>
        <path d="M188 136c-11 0-11-15 1-15-1-12 17-15 21-4 6-10 24-6 22 6 12-1 13 13 3 13z"/>
      </g>
      <g fill="#fff"><path d="M120 34l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M296 106l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><circle cx="82" cy="40" r="2.4"/><circle cx="160" cy="70" r="1.8"/><circle cx="230" cy="96" r="2"/></g>
      <path d="M104 60 Q130 48 150 62" stroke="#fff" stroke-width="2" stroke-dasharray="3 5" fill="none" opacity=".8"/>
    </svg>`;

  function counts(scope){
    if(scope === 'public') return '';
    const list = (typeof ensureMoments === 'function' ? ensureMoments() : (state.moments || [])) || [];
    const ai = list.filter(m => m && m.author === 'ai').length, me = list.length - ai;
    const aiName = typeof momentAiName === 'function' ? momentAiName() : 'TA';
    return `<p class="ddmo-count"><b>${list.length}</b> 条小日子 · 你 ${me} · ${h(aiName)} ${ai}</p>`;
  }

  function page(composer, feed, scope){
    const cover = scope === 'public' ? (state.momentsCoverPublic || '') : (state.momentsCoverPrivate || '');
    const myName = typeof momentMyName === 'function' ? momentMyName() : '我';
    let av = '';
    try{ if(typeof bubbleAvatarHtml === 'function') av = bubbleAvatarHtml('me'); }catch(e){}
    if(!av) av = `<span class="ddmo-av-fb">${h(Array.from(String(myName || '我'))[0])}</span>`;
    return `<div class="page mo-page wx-moments ddmo" style="padding-top:0">
      <header class="ddmo-top">
        <button type="button" class="ddmo-ic" data-ddmo="back" aria-label="退出动态，回首页"><span data-doodle="back" data-boil="hover"></span></button>
        <h1 class="ddmo-title">动态</h1>
        <div class="ddmo-top-r">
          ${scope === 'public' ? `<button type="button" id="mo-friends" class="ddmo-ic" aria-label="好友"><span data-doodle="user" data-boil="hover"></span></button>` : ''}
          <button type="button" id="mo-new" class="ddmo-ic main" aria-label="发一条"><span data-doodle="edit" data-boil="hover"></span></button>
        </div>
      </header>
      <p class="ddmo-ko">우리의 작은 하루들</p>

      <div class="ddmo-seg wx-tabs${scope === 'public' ? ' pub' : ''}">
        <i class="ddmo-seg-dot"></i>
        <button type="button" class="wx-tab${scope === 'private' ? ' active' : ''}" data-mo-scope="private">私人 · 我们俩</button>
        <button type="button" class="wx-tab${scope === 'public' ? ' active' : ''}" data-mo-scope="public">公共 · 朋友们</button>
      </div>

      <section class="ddmo-polaroid">
        <div class="wx-cover ddmo-photo" id="wx-cover"${cover ? ` style="background-image:url(${h(cover)})"` : ''}>
          ${cover ? '' : sky}
          <button type="button" id="mo-cover-pick" class="ddmo-chip" aria-label="换封面"><span data-doodle="image" data-boil="hover"></span>换封面</button>
          ${cover ? `<button type="button" id="mo-cover-clear" class="ddmo-chip x" aria-label="清除封面"><span data-doodle="close" data-boil="hover"></span></button>` : ''}
          <input type="file" id="mo-cover-file" accept="image/*" style="display:none"/>
        </div>
        <div class="ddmo-cap">
          <span class="ddmo-me">${av}</span>
          <div><b>${h(myName)}</b><small>${scope === 'public' ? '和朋友们分享的那些' : '只给他看的那些'}</small></div>
        </div>
        <i class="ddmo-tape l"></i><i class="ddmo-tape r"></i>
      </section>

      ${counts(scope)}
      <div class="wx-feed ddmo-feed">
        ${composer}
        ${feed}
      </div>
      <p class="ddmo-end">· 就到这里啦 ·</p>
    </div>`;
  }

  document.addEventListener('click', e => {
    if(!ON() || !e.target.closest) return;
    const b = e.target.closest('[data-ddmo]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    if(b.dataset.ddmo === 'back'){ state.tab = 'home'; state.subPage = null; render(); }
  }, true);

  return {page, isOn: ON};
})();
