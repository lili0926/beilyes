/* 星光涂鸦壳 · 动态（朋友圈）
 * 发动态 / 评论 / 点赞 / 封面 / 公共圈好友，全部还是原来那套 id 和 data-mo-*、data-mf-*（renderMoments 拼好的 composer、feed 原样放进来），
 * 这里只换外壳：左上角退出键、错位双色标题、私人 / 公共滑块、手账风的卡片。不要封面（她 2026-10-01 说的）。 */
const DoodleMoments = (() => {
  const h = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ON = () => typeof state !== 'undefined' && state.uiShell === 'doodle';


  function counts(scope){
    if(scope === 'public') return '';
    const list = (typeof ensureMoments === 'function' ? ensureMoments() : (state.moments || [])) || [];
    const ai = list.filter(m => m && m.author === 'ai').length, me = list.length - ai;
    const aiName = typeof momentAiName === 'function' ? momentAiName() : 'TA';
    return `<p class="ddmo-count"><b>${list.length}</b> 条小日子 · 你 ${me} · ${h(aiName)} ${ai}</p>`;
  }

  function page(composer, feed, scope){
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
