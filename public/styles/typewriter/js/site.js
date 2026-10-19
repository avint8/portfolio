/* Portfolio behaviour. Load at the end of <body>. Optional: Lenis (smooth scroll), loaded before this file.
   The page reads fully without any of this: CSS stacks everything, the glossary is popovers, the journey
   diagram is radio inputs. This file adds:
     1  theme switch (persisted)
     2  typed-in reveals, count-ups, replay, journey auto-walk
     3  desktop: smooth scroll + three scroll-scrubbed section transitions (line feed, sheet flip, paper tear)
     4  phones: the sheet reader (page counter, ~500ms triggered transitions)
     5  typewriter keystrikes: a fading trail of typed characters (mouse) and a struck key (touch)
     6  typed-character art (ASCII) drawn into the <pre class="art"> figures
   Modes are decided by media queries, never by user-agent sniffing. */
(function(){
  'use strict';
  var root = document.documentElement, body = document.body;
  function mq(q){ return window.matchMedia ? window.matchMedia(q) : {matches:false, addEventListener:function(){}}; }
  var reduceMQ = mq('(prefers-reduced-motion: reduce)');
  var readerMQ = mq('(pointer: coarse), (max-width: 819px)');
  var fineMQ   = mq('(hover: hover) and (pointer: fine)');
  var coarseMQ = mq('(pointer: coarse)');
  var reduce = reduceMQ.matches, reader = readerMQ.matches;
  var hasIO = 'IntersectionObserver' in window;

  function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t){ return a + (b - a) * t; }
  function smooth(t){ t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function easeInOut(t){ t = clamp(t, 0, 1); return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }
  function easeOut(t){ return 1 - Math.pow(1 - clamp(t, 0, 1), 3); }
  function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function $all(sel, ctx){ return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function hash(a, b){ var x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); }

  /* ------------------------------------------------------------------ 1  theme drop */
  var themeBtn = document.getElementById('themeBtn');
  function isDark(){ var t = root.dataset.theme; return t ? t === 'dark' : mq('(prefers-color-scheme: dark)').matches; }
  function syncDk(){ root.classList.toggle('dk', isDark()); }
  syncDk();
  var dkMQ = mq('(prefers-color-scheme: dark)'); if (dkMQ.addEventListener) dkMQ.addEventListener('change', syncDk);
  themeBtn.addEventListener('click', function(){
    var next = isDark() ? 'light' : 'dark';
    function apply(){ root.dataset.theme = next; syncDk(); try{ localStorage.setItem('theme', next); }catch(e){} }
    if (!document.startViewTransition || reduce){ apply(); return; }
    var r = themeBtn.getBoundingClientRect(), x = r.left + r.width/2, y = r.top + r.height/2;
    var R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(function(){
      root.animate({clipPath:['circle(0px at '+x+'px '+y+'px)', 'circle('+R+'px at '+x+'px '+y+'px)']},
        {duration:700, easing:'cubic-bezier(.2,.7,.2,1)', pseudoElement:'::view-transition-new(root)'});
    });
  });

  /* ------------------------------------------------------------------ 2  reveals and small interactions */
  var REVEAL = '.sub > h3, .sub-lede, .big-def, .def-note, .idcard, .stat, .flow-stage, .flow-steps, .card, .step, .quote, .pillar, .hub, .f, .chat, .papers-wrap, .tools, .room-copy > *, .room-vis, .note-line, .bubble, .closing > h2, .closing > .ch-num, .lede-box, .ch-head h2, .ch-head .ch-num, .eyebrow, .name, .tagline, .lede, .hero-meta, .hero .cta-row';
  var mode = hasIO ? (reduce ? 'js-fade' : 'js-bleed') : '';
  var revealIO = null;
  function isHeld(el){ var t = el.closest('.trans'); return !!(t && root.classList.contains('fx-scrub') && el.closest('.t-b')); }
  function setupReveal(){
    if (!mode) return;
    root.classList.add(mode);
    $all(REVEAL).forEach(function(el){ el.classList.add('rv'); });
    $all('.stagger').forEach(function(g){ Array.prototype.forEach.call(g.children, function(c, i){ c.style.setProperty('--i', i); }); });
    $all('.rv').forEach(function(el, i){
      var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', Math.min(sib, 6));
    });
    revealIO = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting && !isHeld(e.target)){ e.target.classList.add('in'); revealIO.unobserve(e.target); } });
    }, {threshold:0.12, rootMargin:'0px 0px -6% 0px'});
    observeReveals();
  }
  function observeReveals(){
    if (!revealIO) return;
    $all('.rv:not(.in)').forEach(function(el){ revealIO.unobserve(el); revealIO.observe(el); });
  }
  function revealIn(layer){ $all('.rv', layer).forEach(function(el){ el.classList.add('in'); }); }

  /* count-ups and the typed/checked mocks play once when scrolled to */
  function countUp(el){
    $all('[data-count]', el).forEach(function(n){
      if (n.dataset.done) return; n.dataset.done = 1;
      if (reduce) return;
      var end = parseFloat(n.dataset.count), dec = parseInt(n.dataset.dec || '0', 10), t0 = null, dur = 1200;
      (function step(t){
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / dur), v = end * (1 - Math.pow(1 - p, 3));
        n.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-IN');
        if (p < 1) requestAnimationFrame(step);
      })(performance.now());
    });
  }
  if (hasIO && !reduce){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); countUp(e.target); io.unobserve(e.target); } });
    }, {threshold:0.3, rootMargin:'0px 0px -8% 0px'});
    $all('.io').forEach(function(t){ io.observe(t); });
  } else {
    $all('.io').forEach(function(t){ t.classList.add('in'); });
  }
  $all('[data-replay]').forEach(function(b){
    b.addEventListener('click', function(){
      var t = document.getElementById(b.dataset.replay); if (!t) return;
      t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
    });
  });
  var demo = document.getElementById('flowdemo');
  if (demo && !reduce && hasIO){
    var radios = $all('input[name="st"]', demo), timer = 0, taken = false;
    var auto = function(on){ clearInterval(timer); timer = 0; if (on && !taken) timer = setInterval(function(){
      var i = radios.findIndex(function(r){ return r.checked; }); radios[(i + 1) % radios.length].checked = true; }, 3000); };
    ['pointerdown','keydown'].forEach(function(ev){ demo.addEventListener(ev, function(){ taken = true; auto(false); }); });
    new IntersectionObserver(function(es){ auto(es[0].isIntersecting); }, {threshold:0.4}).observe(demo);
  }

  /* ------------------------------------------------------------------ transitions: shared pieces */
  var TR = $all('.trans').map(function(el){
    return {el:el, type:el.dataset.tx, stage:el.querySelector('.stage'), a:el.querySelector('.t-a'), b:el.querySelector('.t-b'),
            top:0, h:0, run:1, p:-1, revealed:false};
  });

  /* The torn edge: a jagged, fibrous line written once as two complementary clip-paths.
     The poster keeps everything below the line; the scrap (left pinned under the tacks) keeps everything above it. */
  (function tearPaths(){
    var r = rng(42), N = 120, line = [], i, x, y, drift = 0;
    for (i = 0; i <= N; i++){
      x = i / N; drift += (r() - .5) * .006;
      drift = clamp(drift, -.02, .02);
      line.push([x, .15 + drift + (r() - .5) * .012]);
    }
    var SC = .17, OV = .012, up = [], down = [];
    line.forEach(function(p, k){
      var fy = 0, fd = 0;
      if (r() < .16){ fy = .012 + r() * .03; }      /* fibre pulled up on the poster side */
      if (r() < .16){ fd = .012 + r() * .03; }      /* fibre pulled down on the scrap side */
      if (fy){ up.push([p[0] - .002, p[1]]); up.push([p[0], p[1] - fy]); up.push([p[0] + .003, p[1]]); } else up.push(p);
      down.push(fd ? [[p[0] + .003, (p[1] + OV) / SC], [p[0], (p[1] + OV + fd) / SC], [p[0] - .002, (p[1] + OV) / SC]] : [[p[0], (p[1] + OV) / SC]]);
    });
    function f(v){ return v.toFixed(4); }
    var d1 = 'M' + up.map(function(p){ return f(p[0]) + ' ' + f(p[1]); }).join('L') + 'L1 1L0 1Z';
    var flat = []; down.forEach(function(g){ g.forEach(function(p){ flat.push(p); }); });
    var d2 = 'M0 0L1 0L1 ' + f(flat[flat.length - 1][1]) + 'L' + flat.slice().reverse().map(function(p){ return f(p[0]) + ' ' + f(p[1]); }).join('L') + 'Z';
    var a = document.getElementById('tearPosterP'), b = document.getElementById('tearScrapP');
    if (a) a.setAttribute('d', d1); if (b) b.setAttribute('d', d2);
  })();

  /* Line feed: the next section is revealed from the bottom up in steps of one typed line, as if the paper
     were being rolled through the platen. The ring is a thin bar of ink riding just ahead of the revealed edge. */
  var LINE = 28;
  function bandD(q, W, H, extra){
    var M = 40;
    if (q <= .002) return 'M0 0';
    var n = Math.min(Math.ceil(H / LINE) + 1, Math.ceil(q * H / LINE));
    var edge = q >= .995 ? -M : H - n * LINE;
    var top = edge - extra;
    return 'M' + (-M) + ' ' + top.toFixed(0) + 'H' + (W + M).toFixed(0) + 'V' + (H + M).toFixed(0) + 'H' + (-M) + 'Z';
  }
  var brushP = document.getElementById('brushClipP'), ringP = document.getElementById('brushRingP');
  function setBrush(q, W, H, ring){
    brushP.setAttribute('d', bandD(q, W, H, 0));
    if (ring && ringP) ringP.setAttribute('d', q >= .995 ? 'M0 0' : bandD(q, W, H, 6));
  }

  /* the back of the flipping sheet shows a faint, mirrored press-through of what is typed on its front */
  TR.forEach(function(t){
    if (t.type !== 'flip') return;
    var back = t.a.querySelector('.back'), front = t.a.querySelector('.front');
    if (back && front){ var s = document.createElement('span'); s.className = 'bleed'; s.textContent = front.textContent.replace(/\s+/g, ' ').trim().slice(0, 900); back.appendChild(s); }
  });

  /* ------------------------------------------------------------------ 3  desktop: smooth scroll + scrubbed transitions */
  var lenis = null, scrub = false, loopOn = false, lastY = -1, W = innerWidth, H = innerHeight;
  var anchors = [];

  function measure(){
    if (!scrub) return;
    W = root.clientWidth; H = innerHeight;
    TR.forEach(function(t){
      var r = t.el.getBoundingClientRect();
      t.top = r.top + scrollY; t.h = r.height; t.run = Math.max(1, t.h - H);
      t.p = -1;
    });
    fitAll();
    anchors = computeAnchors();
    lastY = -1; update(true);
  }

  /* content that would overflow a 100svh stage is scaled down a little so every pinned screen reads whole */
  function fit(layer, inner, reserveTop){
    if (!layer || !inner) return;
    inner.style.zoom = '';
    var cs = getComputedStyle(layer), avail = layer.clientHeight - (reserveTop || 0) - parseFloat(cs.paddingBottom) - 12;
    var need = inner.getBoundingClientRect().height;
    if (need > avail && avail > 100) inner.style.zoom = Math.max(.55, avail / need).toFixed(3);
  }
  function fitAll(){
    TR.forEach(function(t){
      if (t.type === 'brush'){ fit(t.a, t.a.querySelector('.hero-in'), parseFloat(getComputedStyle(t.a).paddingTop)); fit(t.b, t.b.querySelector('.ch-head'), parseFloat(getComputedStyle(t.b).paddingTop)); }
      if (t.type === 'flip'){ var fr = t.a.querySelector('.front'); fit(fr, fr.querySelector('.sub'), parseFloat(getComputedStyle(fr).paddingTop)); fit(t.b, t.b.querySelector('.ch-head'), parseFloat(getComputedStyle(t.b).paddingTop)); }
      if (t.type === 'tear'){ var sh = t.a.querySelector('.sheet'); fit(sh, sh.querySelector('.sub'), parseFloat(getComputedStyle(sh).paddingTop)); fit(t.b, t.b.querySelector('.ch-head'), parseFloat(getComputedStyle(t.b).paddingTop)); }
    });
  }

  function apply(t, p){
    var q = clamp((p - .05) / .9, 0, 1), el = t.el;
    if (t.type === 'brush'){
      setBrush(q, W, H, true);
      if (q > .3 && !t.revealed){ t.revealed = true; revealIn(t.b); }
      el.classList.toggle('done', q >= .995);
    } else if (t.type === 'flip'){
      var e = easeInOut(q), r = 180 * e, s = Math.sin(r * Math.PI / 180);
      el.style.setProperty('--r', r.toFixed(2));
      el.style.setProperty('--sh', (.85 * s).toFixed(3));
      el.style.setProperty('--sw', (18 + 82 * e).toFixed(1));
      el.style.setProperty('--hl', (s * .9).toFixed(3));
      if (q > .25 && !t.revealed){ t.revealed = true; revealIn(t.b); }
      el.classList.toggle('done', q >= .995);
    } else if (t.type === 'tear'){
      var tx = 0, ty = 0, rot = 0, rx = 0, ry = 0;
      if (q < .16){ var w = q / .16; rot = Math.sin(q * 90) * .35 * w; ty = w * 3; }
      else if (q < .48){ var pe = easeInOut((q - .16) / .32); rot = -7 * pe + Math.sin(q * 70) * .2; rx = 14 * pe; ry = -6 * pe; ty = 3 + 18 * pe; tx = -10 * pe; }
      else { var u = (q - .48) / .52; rot = -7 - 30 * u; rx = 14 + 36 * u; ry = -6 - 10 * u; ty = 21 + H * 1.35 * u * u; tx = -10 - W * .08 * u; }
      el.style.setProperty('--tx', tx.toFixed(1)); el.style.setProperty('--ty', ty.toFixed(1));
      el.style.setProperty('--rot', rot.toFixed(2)); el.style.setProperty('--rx', rx.toFixed(2)); el.style.setProperty('--ry', ry.toFixed(2));
      if (q > .3 && !t.revealed){ t.revealed = true; revealIn(t.b); }
      el.classList.toggle('done', q >= .995);
    }
  }

  var chapIds = ['ch1','ch2','ch3','ch4','ch5'], links = $all('#toc a');
  function computeAnchors(){
    return chapIds.map(function(id){ return anchorY(id); });
  }
  function anchorY(id){
    var sec = document.getElementById(id); if (!sec) return 0;
    var t = TR.filter(function(x){ return sec.contains(x.el); })[0];
    if (t && scrub) return Math.round(t.top + t.run);
    var tgt = t ? t.b : sec;
    return Math.round(tgt.getBoundingClientRect().top + scrollY);
  }

  function update(force){
    var y = scrollY;
    if (!force && y === lastY) return;
    lastY = y;
    if (scrub){
      for (var i = 0; i < TR.length; i++){
        var t = TR[i], p = clamp((y - t.top) / t.run, 0, 1);
        if (Math.abs(p - t.p) > .0004 || force){ t.p = p; apply(t, p); }
      }
    }
    spy(y);
  }
  var curChap = -2;
  function spy(y){
    if (!links.length) return;
    var ys = scrub ? anchors : chapIds.map(function(id){ var s = document.getElementById(id); var t = TR.filter(function(x){ return s && s.contains(x.el); })[0]; var e = t ? t.b : s; return e ? e.getBoundingClientRect().top + scrollY : 0; });
    var c = -1; for (var i = 0; i < ys.length; i++) if (y >= ys[i] - H * .35) c = i;
    if (c !== curChap){ curChap = c; links.forEach(function(a, i){ if (i === c) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }); }
  }

  function tick(now){
    if (!loopOn) return;
    if (lenis) lenis.raf(now);
    update(false);
    requestAnimationFrame(tick);
  }
  function startLoop(){ if (!loopOn){ loopOn = true; requestAnimationFrame(tick); } }
  function stopLoop(){ loopOn = false; }
  document.addEventListener('visibilitychange', function(){ if (scrub){ if (document.hidden) stopLoop(); else startLoop(); } });

  function enterScrub(){
    if (scrub) return; scrub = true;
    root.classList.add('fx-scrub');
    if (window.Lenis){
      lenis = new Lenis({duration:1.15, easing:function(t){ return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel:true, wheelMultiplier:1});
      root.classList.add('lenis', 'lenis-smooth');
    }
    observeReveals();
    measure(); startLoop();
  }
  function leaveScrub(){
    if (!scrub) return; scrub = false; stopLoop();
    if (lenis){ lenis.destroy(); lenis = null; root.classList.remove('lenis', 'lenis-smooth'); }
    root.classList.remove('fx-scrub');
    TR.forEach(function(t){ t.el.classList.remove('done'); t.el.removeAttribute('style'); $all('[style*="zoom"]', t.el).forEach(function(n){ n.style.zoom = ''; }); });
    $all('.rv').forEach(function(el){ el.classList.add('in'); });
  }

  /* anchor links: land where a transition has finished, not at the top of its runway */
  function goTo(y){
    if (lenis) lenis.scrollTo(y, {duration:1.5, easing:function(t){ return 1 - Math.pow(1 - t, 4); }});
    else window.scrollTo({top:y, behavior: reduce ? 'auto' : 'smooth'});
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id || id === 'top'){ if (id === 'top'){ e.preventDefault(); goTo(0); } return; }
    var el = document.getElementById(id); if (!el) return;
    e.preventDefault();
    var y = chapIds.indexOf(id) >= 0 ? anchorY(id) : el.getBoundingClientRect().top + scrollY - 60;
    if (reader && chapIds.indexOf(id) >= 0 && !scrub) y = Math.round(y - 0);
    goTo(Math.max(0, y));
  });
  /* J / K step by a screen */
  var keyEls = {'1':document.getElementById('keyJ'), '-1':document.getElementById('keyK')};
  function step(dir){ goTo(Math.max(0, scrollY + dir * innerHeight * .85)); }
  document.addEventListener('keydown', function(e){
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target; if (t.closest && t.closest('input,textarea,select,[contenteditable]')) return;
    var dir = (e.key === 'j' || e.key === 'J') ? 1 : (e.key === 'k' || e.key === 'K') ? -1 : 0;
    if (dir){ step(dir); if (keyEls[dir]) keyEls[dir].classList.add('down'); }
  });
  document.addEventListener('keyup', function(e){
    var k = e.key.toLowerCase();
    if (k === 'j' && keyEls['1']) keyEls['1'].classList.remove('down');
    if (k === 'k' && keyEls['-1']) keyEls['-1'].classList.remove('down');
  });
  window.addEventListener('blur', function(){ Object.keys(keyEls).forEach(function(k){ if (keyEls[k]) keyEls[k].classList.remove('down'); }); });
  $all('.key').forEach(function(b){ b.addEventListener('click', function(){ step(parseInt(b.dataset.step, 10)); }); });

  /* ------------------------------------------------------------------ 4  the reader: counter + short triggered transitions */
  var counterIO = null;
  function setupReader(){
    var pns = $all('.pn').filter(function(p){ return !p.parentElement.closest('.pn'); });
    var cn = document.getElementById('cn'), ct = document.getElementById('ct');
    ct.textContent = pns.length;
    if (hasIO){
      counterIO = new IntersectionObserver(function(es){
        es.forEach(function(e){ if (!e.isIntersecting) return; var n = pns.indexOf(e.target) + 1; if (n) cn.textContent = n;
          TR.forEach(function(t){ if (t.armed && !t.seen && t.b === e.target){ t.seen = true; playTrig(t); } }); });
      }, {rootMargin:'-46% 0px -46% 0px'});
      pns.forEach(function(p){ counterIO.observe(p); });
    }
    if (reduce || !hasIO) return;
    TR.forEach(function(t){
      if (!t.b) return;
      if (t.type === 'brush'){ t.b.classList.add('clipping'); brushP.setAttribute('d', 'M0 0'); }
      else { var v = document.createElement('div'); v.className = 'veil'; v.setAttribute('aria-hidden', 'true'); t.b.appendChild(v); t.veil = v; }
      t.armed = true;   /* the counter's observer plays it when this panel reaches the middle of the screen */
    });
  }
  function playTrig(t){
    revealIn(t.b);
    if (t.type === 'brush'){
      var ch = t.b.querySelector('.ch-head') || t.b, r = ch.getBoundingClientRect(), w = r.width, h = r.height, t0 = performance.now();
      (function step(now){
        var q = clamp((now - t0) / 560, 0, 1);
        setBrush(easeOut(q), w, h, false);
        if (q < 1) requestAnimationFrame(step); else t.b.classList.remove('clipping');
      })(t0);
    } else {
      t.el.classList.add('play');
      setTimeout(function(){ if (t.veil) t.veil.remove(); }, 700);
    }
  }

  /* ------------------------------------------------------------------ 5  typewriter keystrikes */
  var trail = document.getElementById('trail'), tip = document.getElementById('brush');
  var ctx = trail && trail.getContext ? trail.getContext('2d') : null;
  var dpr = 1, vw = 0, vh = 0;
  var pts = [], blobs = [], inkRaf = 0;      /* pts: characters stamped along the pointer path; blobs: single struck keys */
  var IDLE = 700, touchHeld = false;
  var ptr = {moved:0, x:-100, y:-100, tx:-100, ty:-100, sx:null, sy:null, inside:false};
  var CELL_W = 9, CELL_H = 20, STRIKE_LIFE = 1800, MAX_STRIKES = 240;
  var KEYS = 'x/.*+-=o:xX/z#%a', FONT = '"Courier Prime","Courier New",Courier,monospace';

  function sizeCanvas(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = innerWidth; vh = innerHeight;
    trail.width = Math.round(vw * dpr); trail.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function wake(){ if (!inkRaf && !document.hidden) inkRaf = requestAnimationFrame(inkFrame); }
  document.addEventListener('visibilitychange', function(){ if (document.hidden){ cancelAnimationFrame(inkRaf); inkRaf = 0; } else if (pts.length || blobs.length || root.classList.contains('brushy')) wake(); });
  function inkColor(){ return root.classList.contains('dk') ? '#fff' : '#000'; }

  /* a single bold struck key: a tap or a click. It jolts for a moment as the type bar hits, then fades. */
  function strikeKey(x, y, ch, size){
    var b = {x:x, y:y, ch:ch, size:size, t0:performance.now(), dead:false};
    blobs.push(b);
    return b;
  }
  function drawBlob(b, now){
    var age = now - b.t0, a = age < 700 ? 1 : 1 - (age - 700) / 1600, dx = 0, dy = 0;
    if (a <= 0 || b.dead) return false;
    if (!reduce && age < 150){ var k = 1 - age / 150; dx = Math.sin(age * .8) * 2 * k; dy = Math.cos(age * 1.1) * 1.4 * k; }
    ctx.globalAlpha = a; ctx.fillStyle = inkColor();
    ctx.font = '700 ' + b.size + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.ch, Math.round(b.x + dx), Math.round(b.y + dy));
    ctx.globalAlpha = 1;
    return true;
  }
  function drawStrikes(now){
    ctx.font = '700 15px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = inkColor();
    for (var i = 0; i < pts.length; i++){
      var p = pts[i], age = now - p.t, a = age < 140 ? 1 : 1 - (age - 140) / (STRIKE_LIFE - 140);
      if (a <= 0) continue;
      ctx.globalAlpha = a * .92;
      ctx.fillText(p.ch, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }
  /* put a character in the grid cell under (x, y), the way a typewriter lines things up */
  function typeAt(x, y, now){
    var gx = Math.floor(x / CELL_W) * CELL_W, gy = Math.floor(y / CELL_H) * CELL_H + 15;
    if (ptr.sx === gx && ptr.sy === gy) return;
    ptr.sx = gx; ptr.sy = gy;
    pts.push({x:gx, y:gy, t:now, ch:KEYS.charAt(Math.floor(Math.random() * KEYS.length))});
    if (pts.length > MAX_STRIKES) pts.shift();
  }
  function inkFrame(now){
    inkRaf = 0;
    if (document.hidden) return;
    var fine = root.classList.contains('brushy');
    if (fine){
      var k = reduce ? 1 : .42;
      ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k;
      tip.style.transform = 'translate3d(' + ptr.x.toFixed(1) + 'px,' + ptr.y.toFixed(1) + 'px,0)';
    }
    ctx.clearRect(0, 0, vw, vh);
    while (pts.length && now - pts[0].t > STRIKE_LIFE) pts.shift();
    if (pts.length) drawStrikes(now);
    for (var i = blobs.length - 1; i >= 0; i--){ if (!drawBlob(blobs[i], now)) blobs.splice(i, 1); }
    /* once the pointer rests, everything lifts away (0.3s fade, then cleared) so nothing covers the page */
    var resting = trail.classList.contains('rest');
    if (ptr.moved && !touchHeld && now - ptr.moved > IDLE){
      if (!resting){ trail.classList.add('rest'); tip.classList.remove('on'); ptr.restAt = now; resting = true; }
      else if (now - ptr.restAt > 320 && (pts.length || blobs.length)){ pts.length = 0; blobs.length = 0; ctx.clearRect(0, 0, vw, vh); }
    }
    var moving = fine && (Math.abs(ptr.tx - ptr.x) > .25 || Math.abs(ptr.ty - ptr.y) > .25);
    if (moving || pts.length || blobs.length || (fine && ptr.inside && !resting)) inkRaf = requestAnimationFrame(inkFrame);
  }

  function initMouseBrush(){
    root.classList.add('brushy');
    var lx = null, ly = null;
    document.addEventListener('pointermove', function(e){
      if (e.pointerType === 'touch') return;
      var now = performance.now();
      ptr.tx = e.clientX; ptr.ty = e.clientY;
      if (!ptr.inside){ ptr.x = e.clientX; ptr.y = e.clientY; ptr.inside = true; tip.classList.add('on'); lx = null; }
      if (trail.classList.contains('rest')){ trail.classList.remove('rest'); tip.classList.add('on'); }
      ptr.moved = now;
      /* over text the keys lift: nothing is typed on top of words */
      var overText = !!(e.target.closest && e.target.closest('p,h1,h2,h3,h4,li,dt,dd,a,button,summary,label,legend,b,mark,small,del,pre,figcaption,.eyebrow,.lbl,.pill,.tag,.chips span,.tools dd span,.hero-meta span,.ch-num,.key,.stamp'));
      if (overText || reduce){ lx = null; }
      else {
        if (lx === null){ lx = e.clientX; ly = e.clientY; }
        var d = Math.hypot(e.clientX - lx, e.clientY - ly), n = Math.max(1, Math.ceil(d / 14)), q;
        for (q = 1; q <= n; q++) typeAt(lerp(lx, e.clientX, q / n), lerp(ly, e.clientY, q / n), now);
        lx = e.clientX; ly = e.clientY;
      }
      tip.classList.toggle('big', !!(e.target.closest && e.target.closest('a,button,summary,label,[popovertarget]')));
      wake();
    }, {passive:true});
    document.documentElement.addEventListener('pointerleave', function(){ ptr.inside = false; tip.classList.remove('on'); lx = null; });
    document.addEventListener('pointerdown', function(e){
      if (e.pointerType === 'touch') return;
      trail.classList.remove('rest'); ptr.moved = performance.now();
      strikeKey(e.clientX, e.clientY, '•', 26);
      wake();
    });
    wake();
  }

  function initTouchInk(){
    root.classList.add('inked');
    var active = null;
    window.addEventListener('touchstart', function(e){
      if (e.touches.length !== 1) { if (active){ active.dead = true; active = null; } return; }
      var t = e.touches[0];
      trail.classList.remove('rest'); touchHeld = true; ptr.moved = performance.now();
      active = strikeKey(t.clientX, t.clientY, 'x', 30);
      active.sx = t.clientX; active.sy = t.clientY;
      wake();
    }, {passive:true});
    window.addEventListener('touchmove', function(e){
      if (!active) return;
      var t = e.touches[0];
      /* a swipe is a scroll: no key is struck */
      if (Math.hypot(t.clientX - active.sx, t.clientY - active.sy) > 10){ active.dead = true; active = null; }
    }, {passive:true});
    function end(){ active = null; touchHeld = false; ptr.moved = performance.now(); }
    window.addEventListener('touchend', end, {passive:true});
    window.addEventListener('touchcancel', end, {passive:true});
  }

  if (ctx){
    sizeCanvas();
    window.addEventListener('resize', function(){ sizeCanvas(); });
    if (fineMQ.matches) initMouseBrush();
    if (coarseMQ.matches) initTouchInk();
  }

  /* ------------------------------------------------------------------ 6  typed-character art */
  /* Three decorative figures built from typewriter characters only. Each <pre class="art"> is aria-hidden;
     the density of a cell (0 = paper, 1 = solid ink) is mapped through a ramp of characters. */
  var RAMP = ' .,:;-~=+*#%@';
  var BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  function pick(d, c, r, spread){
    var v = clamp(d + ((BAYER[(r % 4) * 4 + (c % 4)] / 15) - .5) * (spread == null ? .16 : spread), 0, .999);
    return RAMP.charAt(Math.floor(v * RAMP.length));
  }
  function artPortrait(C, R){
    var W = C * .6, H = R, cx = W / 2, out = [], r, c, x, y;
    for (r = 0; r < R; r++){
      var row = '';
      for (c = 0; c < C; c++){
        x = (c + .5) * .6; y = r + .5;
        var d = hash(c, r) > .965 ? .1 : 0;               /* a few stray dots of paper grain */
        /* shoulders and shirt */
        var sx = (x - cx) / (W * .47), sy = (y - H * 1.0) / (H * .34), se = sx * sx + sy * sy;
        if (se < 1){ d = .42 + .3 * Math.abs(sx) + .12 * Math.sin(y * 1.7 + x * .4); if (Math.abs(x - cx) < (y - H * .74) * .5 && y > H * .74) d = .12; }
        /* neck */
        if (Math.abs(x - cx) < W * .1 && y > H * .58 && y < H * .8){ d = Math.max(d, .5 + (y - H * .58) / H * .9); if (se < 1 && Math.abs(x - cx) < (y - H * .74) * .5) d = .3; }
        /* head */
        var hx = (x - cx) / (W * .26), hy = (y - H * .37) / (H * .26), he = hx * hx + hy * hy;
        if (he < 1){
          var nz = Math.sqrt(1 - he), light = nz * .62 + (-hx * .5 - hy * .3) * .5 + .18;
          d = Math.pow(clamp(1 - light, 0, 1), 1.5) * .6 + .06;
          if (hy < -.3 + .32 * Math.cos(hx * 2.1) - .12 * hx) d = .84 + .1 * Math.sin(c * 1.3 + r);   /* hair */
          var ex = Math.abs(Math.abs(hx) - .4), ey = hy + .02;
          if (ex * ex / .02 + ey * ey / .012 < 1) d = 1;                                            /* eyes */
          if (ex * ex / .05 + (hy + .22) * (hy + .22) / .004 < 1) d = Math.max(d, .85);                /* brows */
          if (Math.abs(hx - .05) < .1 && hy > .12 && hy < .34) d += .35;                              /* nose shadow */
          if (hx * hx / .09 + (hy - .56) * (hy - .56) / .008 < 1) d = .95;                           /* mouth */
        } else if (he < 1.12 && hy > -.2 && hy < .4){ d = Math.max(d, .35); }                          /* jaw edge */
        row += pick(d, c, r);
      }
      out.push(row.replace(/\s+$/, ''));
    }
    return out.join('\n');
  }
  function artCurve(C, R){
    var g = [], r, c;
    for (r = 0; r < R; r++){ g.push([]); for (c = 0; c < C; c++) g[r].push(' '); }
    function put(r0, c0, str){ for (var k = 0; k < str.length; k++) if (r0 >= 0 && r0 < R && c0 + k >= 0 && c0 + k < C) g[r0][c0 + k] = str.charAt(k); }
    var X0 = 7, X1 = C - 2, T = 1, B = R - 4, PH = B - T;
    put(0, 0, 'YIELD %');
    for (r = T; r <= B; r++) g[r][X0 - 1] = '|';
    for (c = X0; c <= X1; c++) g[B + 1][c] = '-';
    g[B + 1][X0 - 1] = '+';
    ['9.0', '8.0', '7.0', '6.0'].forEach(function(t, k){ var rr = T + Math.round(k * (PH - 1) / 3); put(rr, 0, t + ' '); g[rr][X0 - 1] = '+'; });
    for (var gr = 0; gr < 4; gr++){ var rg = T + Math.round(gr * (PH - 1) / 3); for (c = X0 + 1; c <= X1; c += 4) if (g[rg][c] === ' ') g[rg][c] = '.'; }
    var ticks = [[0, '1Y'], [.12, '3Y'], [.3, '5Y'], [.55, '10Y'], [.85, '20Y'], [1, '30Y']];
    ticks.forEach(function(t){ var cc = X0 + Math.round(t[0] * (X1 - X0 - 2)); g[B + 1][cc] = '+'; put(B + 2, Math.min(cc, C - t[1].length), t[1]); });
    put(B + 3, X0, 'TENOR');
    var f = function(t){ return (1 - Math.exp(-3.4 * t)) / (1 - Math.exp(-3.4)); };
    var prev = null;
    for (c = X0; c <= X1; c++){
      var t = (c - X0) / (X1 - X0), lvl = .1 + .8 * f(t) + .035 * Math.sin(t * 9);
      var cr = T + Math.round((1 - lvl) * (PH - 1));
      for (r = cr + 1; r <= B; r++){ var depth = (r - cr) / (B - cr + 1); g[r][c] = pick(.62 - depth * .6, c, r, .2); }
      if (prev !== null && Math.abs(cr - prev) > 1){ var lo = Math.min(cr, prev), hi = Math.max(cr, prev); for (r = lo; r < hi; r++) g[r][c] = '#'; }
      g[cr][c] = '@'; prev = cr;
    }
    ticks.forEach(function(t){ var cc = X0 + Math.round(t[0] * (X1 - X0 - 2)); for (r = T; r <= B; r++) if (g[r][cc] === '@'){ g[r][cc] = 'O'; break; } });
    return g.map(function(row){ return row.join('').replace(/\s+$/, ''); }).join('\n');
  }
  function artRack(C, R){
    var rnd = rng(11), lines = [], inner = C - 2, i;
    function row(s){ while (s.length < inner) s += ' '; return '|' + s.slice(0, inner) + '|'; }
    function rep(ch, n){ return new Array(n + 1).join(ch); }
    lines.push('+' + rep('=', inner) + '+');
    for (i = 0; i < 6; i++){
      var leds = '', k;
      for (k = 0; k < 4; k++) leds += (rnd() > .35 ? 'o' : '*') + ' ';
      lines.push(row(' [##] ' + rep(i % 2 ? '|' : '/', 13) + '  ' + leds));
      lines.push(row(' ' + rep(i === 5 ? '=' : '-', inner - 2)));
    }
    lines.push(row(' > status --all'));
    lines.push(row(' bondscanner-api ........ ok'));
    lines.push(row(' payments ................ ok'));
    lines.push(row(' settlement ............. ok'));
    lines.push(row(' > _'));
    lines.push('+' + rep('=', inner) + '+');
    lines.push('  ||' + rep(' ', inner - 6) + '||');
    lines.push(rep('=', 2) + '++' + rep('=', inner - 6) + '++' + rep('=', 2));
    return lines.join('\n');
  }
  function buildArt(){
    $all('pre.art').forEach(function(pre){
      var kind = pre.dataset.art, cols = parseInt(pre.dataset.cols, 10), rows = parseInt(pre.dataset.rows, 10);
      pre.textContent = kind === 'portrait' ? artPortrait(cols, rows) : kind === 'curve' ? artCurve(cols, rows) : kind === 'rack' ? artRack(cols, rows) : '';
    });
  }
  buildArt();

  /* ------------------------------------------------------------------ boot and mode changes */
  function applyMode(){
    reduce = reduceMQ.matches; reader = readerMQ.matches;
    if (!reader && !reduce) enterScrub(); else leaveScrub();
  }
  setupReveal();
  if (reader) setupReader();
  applyMode();
  [reduceMQ, readerMQ].forEach(function(m){ if (m.addEventListener) m.addEventListener('change', function(){ applyMode(); if (scrub) measure(); }); });

  var rz = 0;
  window.addEventListener('resize', function(){ cancelAnimationFrame(rz); rz = requestAnimationFrame(function(){ if (scrub) measure(); else update(true); }); });
  window.addEventListener('load', function(){
    if (scrub) measure(); else update(true);
    if (location.hash.length > 1 && document.getElementById(location.hash.slice(1))){
      var id = location.hash.slice(1);
      if (chapIds.indexOf(id) >= 0) window.scrollTo(0, anchorY(id));
    }
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ if (scrub) measure(); });
  if ('ResizeObserver' in window){ var roTimer = 0; new ResizeObserver(function(){ clearTimeout(roTimer); roTimer = setTimeout(function(){ if (scrub) measure(); }, 120); }).observe(document.querySelector('main')); }
  window.addEventListener('scroll', function(){ if (!scrub) update(false); }, {passive:true});
  update(true);
})();
