/*! emoji-rain-eggs v1.0.0 · WeChat-style keyword-triggered emoji rain for any chat UI.
 *  Zero deps, pure CSS animation. MIT · https://github.com/wave2234/emoji-rain-eggs
 *
 *  const egg = EmojiRain.check("宝宝我爱你");   // matches → plays → returns the egg (or null)
 *  EmojiRain.play({ emoji: ["🐾"], effect: "rain" });
 *  EmojiRain.setCustom([{ id: "u1", triggers: ["饿了", "想吃"], emoji: ["🍜", "🍙"], effect: "burst" }]);
 *  EmojiRain.setDisabled(["b:night"]);            // switch built-ins (or customs) off
 *  EmojiRain.enable(false);                        // per-device mute
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EmojiRain = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- 1. built-in eggs (WeChat's classics + a few seasonal ones) ---------- */
  var BUILTIN = [
    { id: 'b:love',      name: '爱心雨',   triggers: ['我爱你', '爱你', 'love you', 'love u', 'i love you'],                          emoji: ['❤️', '🧡', '💗', '💕', '����', '💘'], effect: 'rain' },
    { id: 'b:paw',       name: '猫爪雨',   triggers: ['watching from the other side of the screen'],                                emoji: ['🐾'],                          effect: 'rain' },
    { id: 'b:bday',      name: '生日快乐', triggers: ['生日快乐', '生日快樂', 'happy birthday', 'happy bday'],                        emoji: ['🎂', '🎁', '🎈', '🧁'],         effect: 'rain' },
    { id: 'b:kiss',      name: '么么哒',   triggers: ['么么哒', '么么', 'xoxo', 'xxoo', 'kisses and hugs', '亲亲', '啵啵', 'mua', 'muah', 'mwah'], emoji: ['😘', '💋', '😚'], effect: 'rain' },
    { id: 'b:miss',      name: '想你了',   triggers: ['想你了', '想死你了', '好想你', 'miss you', 'miss u'],                          emoji: ['⭐', '✨', '🌟', '💫'],          effect: 'rain' },
    { id: 'b:fire',      name: '烟花',     triggers: ['🎆', '🎇', '烟花', '烟火', 'fireworks'],                                     emoji: ['🎆', '✨', '🎇', '⭐', '💥'],    effect: 'burst' },
    { id: 'b:party',     name: '撒花',     triggers: ['🎉', '🎊', '撒花', '庆祝', 'congrats', 'congratulations'],                    emoji: ['🎉', '🎊', '✨', '🎈'],          effect: 'rain' },
    { id: 'b:bomb',      name: '炸弹',     triggers: ['💣', '炸弹', 'bomb'],                                                        emoji: ['💥', '💣', '🔥'],               effect: 'shake' },
    { id: 'b:cracker',   name: '鞭炮',     triggers: ['🧨', '鞭炮', '爆竹', '新年快乐', '新年快樂', 'happy new year', '过年好', '春节快乐'], emoji: ['🧨', '🎆', '🧧', '✨'],  effect: 'rain' },
    { id: 'b:money',     name: '恭喜发财', triggers: ['恭喜发财', '红包拿来', '暴富'],                                               emoji: ['🧧', '💰', '🪙'],               effect: 'rain' },
    { id: 'b:xmas',      name: '圣诞',     triggers: ['圣诞快乐', '聖誕快樂', 'merry christmas', 'merry xmas'],                      emoji: ['🎄', '❄️', '⛄', '🎁', '🦌'],   effect: 'rain' },
    { id: 'b:moon',      name: '中秋',     triggers: ['中秋快乐', '中秋节快乐', '中秋快樂'],                                          emoji: ['🌕', '🥮', '🐇', '🏮'],         effect: 'rain' },
    { id: 'b:lantern',   name: '元宵',     triggers: ['元宵快乐', '元宵节快乐'],                                                    emoji: ['🏮', '🍡', '🎐'],               effect: 'rain' },
    { id: 'b:valentine', name: '情人节',   triggers: ['情人节快乐', '七夕快乐', 'happy valentine'],                                  emoji: ['🌹', '💘', '💌', '🍫'],         effect: 'rain' },
    { id: 'b:night',     name: '晚安',     triggers: ['晚安', 'good night', 'goodnight', 'おやすみ'],                                emoji: ['🌙', '⭐', '💤', '🌠'],          effect: 'rain' },
    { id: 'b:snow',      name: '下雪',     triggers: ['下雪了', '下雪啦', '❄️', '☃️'],                                              emoji: ['❄️', '🌨️', '⛄'],              effect: 'rain' }
  ];

  var CSS = [
    '#eggLayer{position:fixed;inset:0;z-index:1300;pointer-events:none;overflow:hidden}',
    '.egg-p,.egg-b{position:absolute;left:0;top:0;line-height:1;user-select:none;-webkit-user-select:none;will-change:transform,opacity;',
    'font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif}',
    '.egg-p{top:-14vh;animation:egg-fall var(--d,3s) linear var(--dl,0s) 1 both}',
    '@keyframes egg-fall{0%{transform:translate3d(var(--x0),0,0) rotate(0deg);opacity:0}5%{opacity:1}86%{opacity:1}',
    '100%{transform:translate3d(var(--x1),120vh,0) rotate(var(--r,180deg));opacity:0}}',
    '.egg-b{animation:egg-burst var(--d,1.5s) cubic-bezier(.12,.72,.28,1) var(--dl,0s) 1 both}',
    '@keyframes egg-burst{0%{transform:translate3d(var(--x0),var(--y0),0) scale(.2);opacity:0}',
    '10%{opacity:1;transform:translate3d(var(--x0),var(--y0),0) scale(1.15)}',
    '100%{transform:translate3d(var(--x1),var(--y1),0) scale(.75) rotate(var(--r,0deg));opacity:0}}',
    '@keyframes egg-shake{0%,100%{transform:translate3d(0,0,0)}10%{transform:translate3d(-10px,4px,0) rotate(-.4deg)}',
    '20%{transform:translate3d(10px,-5px,0) rotate(.4deg)}30%{transform:translate3d(-9px,5px,0)}40%{transform:translate3d(9px,-3px,0)}',
    '50%{transform:translate3d(-7px,3px,0)}60%{transform:translate3d(7px,-3px,0)}70%{transform:translate3d(-4px,2px,0)}',
    '80%{transform:translate3d(4px,-2px,0)}90%{transform:translate3d(-2px,1px,0)}}',
    'body.egg-shaking{animation:egg-shake .72s ease-in-out 1}',
    '@media(prefers-reduced-motion:reduce){body.egg-shaking{animation:none}}'
  ].join('');

  var state = {
    custom: [], off: {}, enabled: true, lastId: '', lastAt: 0, layer: null, cssDone: false,
    cooldown: 20000,                       // same egg won't replay within 20s (晚安 ↔ 晚安)
    rainSize: [13, 26], burstSize: [12, 23], // px — 20–42 looked huge on phones
    rainCount: [34, 50]                    // [narrow screens, wide screens]
  };

  /* ---------- 2. matching ---------- */
  function norm(s) { return String(s || '').toLowerCase().replace(/️/g, '').replace(/\s+/g, ' '); }
  function rx(t) {
    t = norm(t).trim(); if (!t) return null;
    var s = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var a = /^[a-z0-9]/.test(t), b = /[a-z0-9]$/.test(t);      // word boundaries only for ASCII edges
    try { return new RegExp((a ? '(?<![a-z0-9])' : '') + s + (b ? '(?![a-z0-9])' : ''), 'i'); }
    catch (e) { try { return new RegExp(s, 'i'); } catch (_) { return null; } }
  }
  function rules(e) {
    if (!e._rx) e._rx = (e.triggers || []).map(function (x) { var re = rx(x); return re ? { re: re, len: norm(x).trim().length } : null; }).filter(Boolean);
    return e._rx;
  }
  function isBuiltin(e) { return String(e.id || '').indexOf('b:') === 0; }
  function findEgg(text) {
    var t = norm(String(text || '').replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' '));
    if (!t.trim()) return null;
    var best = null, score = -1;
    state.custom.concat(BUILTIN).forEach(function (e) {
      if (state.off[e.id]) return;
      rules(e).forEach(function (r) {
        if (r.re.test(t)) { var sc = r.len + (isBuiltin(e) ? 0 : 1000); if (sc > score) { score = sc; best = e; } }
      });
    });
    return best;
  }
  function check(text) {
    try {
      if (!state.enabled) return null;
      if (typeof document !== 'undefined' && document.hidden) return null;
      var e = findEgg(text); if (!e) return null;
      var now = Date.now();
      if (e.id === state.lastId && now - state.lastAt < state.cooldown) return null;
      state.lastId = e.id; state.lastAt = now;
      play(e); return e;
    } catch (err) { return null; }
  }

  /* ---------- 3. effects ---------- */
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
  function reduced() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function ensureCss() {
    if (state.cssDone || typeof document === 'undefined') return;
    var st = document.createElement('style'); st.id = 'eggCss'; st.textContent = CSS; document.head.appendChild(st); state.cssDone = true;
  }
  function layer() {
    ensureCss();
    if (!state.layer || !state.layer.isConnected) { state.layer = document.createElement('div'); state.layer.id = 'eggLayer'; document.body.appendChild(state.layer); }
    return state.layer;
  }
  function mount(spans, ms) {
    var L = layer(); spans.forEach(function (s) { L.appendChild(s); });
    setTimeout(function () {
      spans.forEach(function (s) { s.remove(); });
      if (state.layer && !state.layer.childElementCount) { state.layer.remove(); state.layer = null; }
    }, ms + 300);
  }
  function rain(e) {
    var emo = e.emoji || []; if (!emo.length) return;
    var n = Math.round(state.rainCount[innerWidth < 520 ? 0 : 1] * (reduced() ? .5 : 1)), spans = [], maxT = 0;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span'); s.className = 'egg-p'; s.textContent = pick(emo);
      var x0 = Math.random() * 100, drift = rnd(-12, 12), d = rnd(2.7, 4.6), dl = rnd(0, 1.8),
          size = rnd(state.rainSize[0], state.rainSize[1]), rot = (Math.random() < .5 ? -1 : 1) * rnd(140, 460);
      s.style.cssText = '--x0:' + x0.toFixed(1) + 'vw;--x1:' + (x0 + drift).toFixed(1) + 'vw;--d:' + d.toFixed(2) + 's;--dl:' + dl.toFixed(2) + 's;--r:' + rot.toFixed(0) + 'deg;font-size:' + size.toFixed(0) + 'px';
      maxT = Math.max(maxT, d + dl); spans.push(s);
    }
    mount(spans, maxT * 1000);
  }
  function burst(e, opt) {
    var emo = e.emoji || []; if (!emo.length) return; opt = opt || {};
    var bursts = opt.bursts || 3, per = Math.round((opt.per || 14) * (reduced() ? .5 : 1)), spans = [], maxT = 0;
    for (var b = 0; b < bursts; b++) {
      var cx = opt.cx != null ? opt.cx : rnd(18, 82), cy = opt.cy != null ? opt.cy : rnd(16, 58), dl0 = b * .42 + Math.random() * .25;
      for (var i = 0; i < per; i++) {
        var s = document.createElement('span'); s.className = 'egg-b'; s.textContent = pick(emo);
        var ang = Math.random() * Math.PI * 2, dist = 8 + Math.random() * (opt.dist || 14), d = rnd(1.25, 1.95), dl = dl0 + Math.random() * .15,
            x1 = cx + Math.cos(ang) * dist, y1 = cy + Math.sin(ang) * dist * .95 + 5;       // +5vh: a hint of gravity
        s.style.cssText = '--x0:' + cx.toFixed(1) + 'vw;--y0:' + cy.toFixed(1) + 'vh;--x1:' + x1.toFixed(1) + 'vw;--y1:' + y1.toFixed(1) + 'vh;--d:' + d.toFixed(2) + 's;--dl:' + dl.toFixed(2) + 's;--r:' + rnd(-220, 220).toFixed(0) + 'deg;font-size:' + rnd(state.burstSize[0], state.burstSize[1]).toFixed(0) + 'px';
        maxT = Math.max(maxT, d + dl); spans.push(s);
      }
    }
    mount(spans, maxT * 1000);
  }
  function shake(e) {
    ensureCss();
    try { document.body.classList.remove('egg-shaking'); void document.body.offsetWidth; document.body.classList.add('egg-shaking');
          setTimeout(function () { document.body.classList.remove('egg-shaking'); }, 800); } catch (err) {}
    burst(e, { bursts: 1, per: 22, cx: 50, cy: 44, dist: 20 });
  }
  function play(e) {
    if (!e || typeof document === 'undefined') return;
    var eff = e.effect || 'rain';
    if (eff === 'shake') shake(e); else if (eff === 'burst') burst(e); else rain(e);
  }

  /* ---------- 4. helpers for a control panel ---------- */
  function graphemes(s) {
    var out = [];
    try { var seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' }); for (var x of seg.segment(s)) out.push(x.segment); }
    catch (e) { out = Array.from(s); }
    return out.filter(function (x) { return x.trim(); });
  }
  // "🍜🍙 喵" → ["🍜","🍙","喵"]: emoji are split per grapheme (ZWJ families stay whole), plain words stay whole
  function parseEmoji(s) {
    var out = [];
    String(s || '').split(/[\s,，、/|]+/).filter(Boolean).forEach(function (t) {
      if (/[\p{L}\p{N}]/u.test(t)) out.push(t.slice(0, 6)); else out = out.concat(graphemes(t));
    });
    return out.filter(function (x, i, a) { return a.indexOf(x) === i; }).slice(0, 8);
  }
  // "饿了 / 想吃, hungry" → ["饿了","想吃","hungry"]
  function parseTriggers(s) {
    return String(s || '').split(/[,，、|/\n]+/).map(function (x) { return x.replace(/\s+/g, ' ').trim(); })
      .filter(Boolean).filter(function (x, i, a) { return a.indexOf(x) === i; }).slice(0, 12);
  }

  return {
    version: '1.0.0', BUILTIN: BUILTIN,
    check: check, find: findEgg, play: play,
    setCustom: function (list) { state.custom = (list || []).map(function (e) { return Object.assign({}, e, { _rx: null }); }); },
    setDisabled: function (ids) { state.off = {}; (ids || []).forEach(function (id) { state.off[id] = true; }); },
    enable: function (on) { state.enabled = on !== false; },
    config: function (o) { Object.assign(state, o || {}); },
    parseEmoji: parseEmoji, parseTriggers: parseTriggers
  };
});
