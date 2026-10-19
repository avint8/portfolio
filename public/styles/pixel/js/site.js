/* Portfolio behaviour. Load at the end of <body>. Optional: Lenis (smooth scroll), loaded before this file.
   The page reads fully without any of this: CSS stacks everything, the glossary is popovers, the journey
   diagram is radio inputs. This file adds:
     1  theme switch (persisted)
     2  e-ink dither reveals, count-ups, replay, journey auto-walk
     3  desktop: smooth scroll + three scroll-scrubbed section transitions (pixel-band refresh, stepped page turn, pixel-dissolve tear)
     4  phones: the e-reader (location counter, ~500ms triggered transitions)
     5  pixel sprites, the pixel trail (mouse) and pixel bursts (touch), which clear when the pointer rests
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
        {duration:640, easing:'steps(8,end)', pseudoElement:'::view-transition-new(root)'});
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

  /* The torn edge, in pixel steps: written once as two complementary clip-paths.
     The poster keeps everything below the stair line; the scrap (left pinned under the tacks) keeps everything above it. */
  (function tearPaths(){
    var r = rng(42), N = 48, SC = .17, OV = .012, ys = [], i, y = .15;
    for (i = 0; i < N; i++){ y += (r() - .5) * .03; y = clamp(y, .13, .17); ys.push(Math.round(y / .0125) * .0125); }
    function f(v){ return v.toFixed(4); }
    function sc(k){ return f((ys[k] + OV) / SC); }
    var d1 = 'M0 ' + f(ys[0]), d2 = 'M0 0H1V' + sc(N - 1);
    for (i = 0; i < N; i++){ d1 += 'H' + f((i + 1) / N) + (i < N - 1 ? 'V' + f(ys[i + 1]) : ''); }
    d1 += 'V1H0Z';
    for (i = N - 1; i >= 0; i--){ d2 += 'H' + f(i / N) + (i > 0 ? 'V' + sc(i - 1) : ''); }
    d2 += 'Z';
    var a = document.getElementById('tearPosterP'), b = document.getElementById('tearScrapP');
    if (a) a.setAttribute('d', d1); if (b) b.setAttribute('d', d2);
  })();

  /* The e-ink page refresh: the revealed region grows in horizontal pixel bands that sweep down and across.
     Every edge is snapped to a 16px grid so the sweep reads as stepped partial refreshes. */
  function waveD(q, W, H, extra){
    var bh = 40, n = Math.ceil(H / bh) + 1, lag = .9, d = '', i, t, x;
    for (i = 0; i < n; i++){
      t = clamp(q * (1 + lag) - lag * (i / n), 0, 1);
      if (t <= 0) continue;
      x = Math.round(t * (W + 48) / 16) * 16 + extra;
      d += 'M0 ' + (i * bh) + 'H' + x + 'V' + ((i + 1) * bh) + 'H0Z';
    }
    return d || 'M0 0';
  }

  var brushP = document.getElementById('brushClipP'), ringP = document.getElementById('brushRingP');
  function setBrush(q, W, H, ring){
    brushP.setAttribute('d', q <= .002 ? 'M0 0' : waveD(q, W, H, 0));
    if (ring && ringP) ringP.setAttribute('d', q <= .002 ? 'M0 0' : waveD(q, W, H, 32));
  }

  /* tear: a grid of paper blocks, each with a threshold at which it lets go; falling ones are drawn on a canvas */
  var COLS = 36, ROWS = 20;
  TR.forEach(function(t){
    if (t.type !== 'tear') return;
    var rr = rng(7), k = 0, r, c;
    t.th = []; t.rd = [];
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++){ t.th.push(.1 + .5 * (.5 * rr() + .5 * (r / (ROWS - 1)))); t.rd.push(rr()); }
    t.sheet = t.a.querySelector('.sheet');
    t.deb = document.createElement('canvas'); t.deb.className = 'debris'; t.deb.setAttribute('aria-hidden', 'true');
    t.stage.appendChild(t.deb);
    t.qs = -1;
  });
  function cssv(n){ return getComputedStyle(root).getPropertyValue(n).trim(); }
  function sizeDebris(t){
    if (!t.deb) return;
    var r = t.stage.getBoundingClientRect(); t.deb.width = Math.max(1, Math.round(r.width)); t.deb.height = Math.max(1, Math.round(r.height));
  }
  function tearApply(t, q){
    var qs = Math.round(q * 28) / 28, i, r, c, d = '';
    if (qs !== t.qs){
      t.qs = qs;
      if (qs <= .1){ t.sheet.style.webkitMaskImage = t.sheet.style.maskImage = ''; }
      else {
        for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++){ if (r < ROWS * .18 || qs <= t.th[r * COLS + c]) d += 'M' + c + ' ' + r + 'h1.02v1.02h-1.02z'; }
        var u = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + COLS + ' ' + ROWS + '" preserveAspectRatio="none"><path d="' + d + '"/></svg>') + '")';
        var st = t.sheet.style; st.webkitMaskImage = st.maskImage = u; st.webkitMaskSize = st.maskSize = '100% 100%'; st.webkitMaskRepeat = st.maskRepeat = 'no-repeat';
      }
    }
    var cv = t.deb; if (!cv) return;
    var g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
    if (q <= .1 || q >= .995) return;
    var sr = t.sheet.getBoundingClientRect(), br = t.stage.getBoundingClientRect();
    var x0 = sr.left - br.left, y0 = sr.top - br.top, cw = sr.width / COLS, ch = sr.height / ROWS, ink = cssv('--ink'), paper = cssv('--paper');
    for (r = Math.ceil(ROWS * .18); r < ROWS; r++) for (c = 0; c < COLS; c++){
      i = r * COLS + c;
      if (q <= t.th[i]) continue;
      var dl = Math.round((q - t.th[i]) * 40) / 40;
      var x = Math.round((x0 + c * cw + (t.rd[i] - .5) * cw * 8 * dl) / 4) * 4, y = Math.round((y0 + r * ch + .5 * 13 * H * dl * dl) / 4) * 4;
      if (y > cv.height) continue;
      var w = Math.ceil(cw), h = Math.ceil(ch);
      g.fillStyle = ink; g.fillRect(x, y, w, h);
      g.fillStyle = paper; g.fillRect(x + 3, y + 3, w - 6, h - 6);
    }
  }
  function setDone(t, on){
    var was = t.el.classList.contains('done');
    t.el.classList.toggle('done', on);
    if (on && !was) ghost(t.el);
  }
  function ghost(el){ el.classList.remove('ghosting'); void el.offsetWidth; el.classList.add('ghosting'); setTimeout(function(){ el.classList.remove('ghosting'); }, 1000); }

  /* the back of the flipping page shows a faint, mirrored bleed-through of what is printed on its front */
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
    TR.forEach(sizeDebris);
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
      el.style.setProperty('--sp', (Math.sin(Math.PI * clamp(q * 1.15, 0, 1)) * .9).toFixed(3));
      if (q > .3 && !t.revealed){ t.revealed = true; revealIn(t.b); }
      setDone(t, q >= .995);
    } else if (t.type === 'flip'){
      var e = easeInOut(Math.round(q * 14) / 14), r = 180 * e, s = Math.sin(r * Math.PI / 180);
      el.style.setProperty('--r', r.toFixed(2));
      el.style.setProperty('--sh', (.85 * s).toFixed(3));
      el.style.setProperty('--sw', (s < .03 ? 0 : 10 + 90 * s).toFixed(1));
      el.style.setProperty('--hl', (s * .9).toFixed(3));
      if (q > .25 && !t.revealed){ t.revealed = true; revealIn(t.b); }
      setDone(t, q >= .995);
    } else if (t.type === 'tear'){
      tearApply(t, q);
      if (q > .3 && !t.revealed){ t.revealed = true; revealIn(t.b); }
      setDone(t, q >= .995);
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
    TR.forEach(function(t){ t.el.classList.remove('done'); t.el.removeAttribute('style'); if (t.sheet){ t.sheet.style.webkitMaskImage = t.sheet.style.maskImage = ''; t.qs = -1; } $all('[style*="zoom"]', t.el).forEach(function(n){ n.style.zoom = ''; }); });
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
    var cb = document.getElementById('cb');
    function setBar(n){ if (!cb || !cb.parentNode.clientWidth) return; var inner = cb.parentNode.clientWidth - 8; cb.style.width = Math.max(4, Math.round(n / pns.length * inner / 4) * 4) + 'px'; }
    if (hasIO){
      counterIO = new IntersectionObserver(function(es){
        es.forEach(function(e){ if (!e.isIntersecting) return; var n = pns.indexOf(e.target) + 1; if (n){ cn.textContent = n; setBar(n); }
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
    setTimeout(function(){ ghost(t.el); }, 650);
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

  /* ------------------------------------------------------------------ 5  pixels: sprites, trail, bursts */
  var NS = 'http://www.w3.org/2000/svg';
  function bmPath(rows){
    var d = '', x, st;
    rows.forEach(function(r, y){ x = 0; while (x < r.length){ if (r.charAt(x) === 'X'){ st = x; while (r.charAt(x) === 'X') x++; d += 'M' + st + ' ' + y + 'h' + (x - st) + 'v1h-' + (x - st) + 'z'; } else x++; } });
    return d;
  }
  function bmSVG(rows, k, n){
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + rows[0].length + ' ' + rows.length);
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.style.setProperty('--w', rows[0].length); s.style.setProperty('--h', rows.length);
    if (n){ s.style.setProperty('--k', k); s.style.setProperty('--n', n); }
    var p = document.createElementNS(NS, 'path'); p.setAttribute('d', bmPath(rows)); s.appendChild(p);
    return s;
  }
  function grid(w, h){ var g = [], y; for (y = 0; y < h; y++) g.push(new Array(w + 1).join('.').split('')); return g; }
  function blit(g, rows, ox, oy){ rows.forEach(function(r, y){ for (var x = 0; x < r.length; x++) if (r.charAt(x) === 'X') g[oy + y][ox + x] = 'X'; }); return g; }
  function rowsOf(g){ return g.map(function(r){ return r.join(''); }); }
  function plus(){ return ['.X.', 'XXX', '.X.']; }

  var BOND = [
    'XXXXXXXXXXXXXXXX',
    'X..............X',
    'X.XXXXXXXXXX...X',
    'X..............X',
    'X.XXXXXXXX.....X',
    'X..............X',
    'X.XXXXXX...XX..X',
    'X.........X..X.X',
    'X.XXXX....X..X.X',
    'X..........XX..X',
    'X.....XX..X..X.X',
    'XXXXXXXXXXXXXXXX'];
  var BOND2 = BOND.map(function(r, y){ return y === 10 ? 'X.....XX.X..X..X' : r; });
  var ROBOT = [
    '......XX......', '......XX......', '..XXXXXXXXXX..', '.X..........X.', '.X.XX....XX.X.', '.X.XX....XX.X.',
    '.X..........X.', '.X..XXXXXX..X.', '..XXXXXXXXXX..', '....XXXXXX....', '..XXXXXXXXXX..', '.XX.XXXXXX.XX.',
    '.XX.XXXXXX.XX.', '....XX..XX....', '...XXX..XXX...'];
  var ROBOT2 = ROBOT.map(function(r, y){ return y === 5 ? '.X..........X.' : r; });
  var CRES = [
    '....XXXXX...', '..XXXXXX....', '.XXXXX......', '.XXXX.......', 'XXXXX.......', 'XXXX........',
    'XXXX........', 'XXXXX.......', '.XXXX.......', '.XXXXX......', '..XXXXXX....', '....XXXXX...'];
  function moonFrame(a){
    var g = grid(22, 14); blit(g, CRES, 0, 1);
    if (a){ blit(g, plus(), 14, 1); g[10][19] = 'X'; } else { g[2][15] = 'X'; blit(g, plus(), 18, 9); }
    return rowsOf(g);
  }
  var LAMP = [
    '...XXXXXXX....', '..XXXXXXXXX...', '.XXXXXXXXXXX..', 'XXXXXXXXXXXXX.', '......X.......', '......X.......', '......X.......',
    '......X.......', '......X.......', '......X.......', '......X.......', '....XXXXX.....', '...XXXXXXX....', '..XXXXXXXXX...'];
  function lampFrame(on){ var g = LAMP.map(function(r){ return r.split(''); }); if (on){ [[2, 5], [10, 5], [1, 7], [11, 7], [0, 9], [12, 9]].forEach(function(p){ g[p[1]][p[0]] = 'X'; }); } return rowsOf(g); }
  var CHEST = [
    '................', '................',
    '..XXXXXXXXXXXX..', '.X..X......X..X.', 'X...X......X...X', 'X...X......X...X', 'XXXXXXXXXXXXXXXX', 'X...X..XX..X...X', 'X...X.XXXX.X...X',
    'X...X.XXXX.X...X', 'X...X..XX..X...X', 'X...X......X...X', 'X...X......X...X', 'XXXXXXXXXXXXXXXX'];
  var CHEST2 = CHEST.map(function(r, y){ return y === 0 ? '...X.......X....' : y === 1 ? '..XXX.....XXX...' : r; });
  var MAIL = [
    'XXXXXXXXXXXXXXXX', 'XX............XX', 'X.X..........X.X', 'X..X........X..X', 'X...XX....XX...X', 'X.....XXXX.....X',
    'X..............X', 'X..............X', 'X..............X', 'X..............X', 'X..............X', 'XXXXXXXXXXXXXXXX'];
  var SPR = {
    bond:  {f: [BOND, BOND2], seq: [0, 0, 0, 1], dur: 2.4},
    robot: {f: [ROBOT, ROBOT2], seq: [0, 0, 0, 1], dur: 3.2},
    moon:  {f: [moonFrame(true), moonFrame(false)], seq: [0, 1], dur: 1.6},
    lamp:  {f: [lampFrame(false), lampFrame(true)], seq: [0, 0, 0, 1], dur: 2.4},
    chest: {f: [CHEST, CHEST2], seq: [0, 0, 0, 1], dur: 2.4},
    mail:  {f: [MAIL], seq: [0]}
  };
  $all('.spr[data-spr]').forEach(function(el){
    var def = SPR[el.dataset.spr]; if (!def) return;
    var n = def.seq.length;
    if (n > 1){ el.classList.add('anim'); el.dataset.n = n; el.style.setProperty('--dur', def.dur + 's'); }
    def.seq.forEach(function(fi, k){ el.appendChild(bmSVG(def.f[fi], k, n > 1 ? n : 0)); });
  });

  /* tap / click burst: five 7x7 pixel frames played with steps() */
  var BURST = [
    ['.......', '.......', '.......', '...X...', '.......', '.......', '.......'],
    ['.......', '.......', '..X.X..', '...X...', '..X.X..', '.......', '.......'],
    ['.......', '..XXX..', '.X...X.', '.X...X.', '.X...X.', '..XXX..', '.......'],
    ['X..X..X', '.......', '..X.X..', 'X.....X', '..X.X..', '.......', 'X..X..X'],
    ['X.....X', '.......', '.......', '...X...', '.......', '.......', 'X.....X']];
  var bursts = [];
  function burst(x, y){
    if (reduce) return;
    var el = document.createElement('div'); el.className = 'burst'; el.setAttribute('aria-hidden', 'true');
    el.style.left = x + 'px'; el.style.top = y + 'px';
    BURST.forEach(function(rows, k){ var s = bmSVG(rows); s.style.animationDelay = (k * .1) + 's'; el.appendChild(s); });
    document.body.appendChild(el); bursts.push(el);
    setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); var i = bursts.indexOf(el); if (i >= 0) bursts.splice(i, 1); }, 560);
  }
  function clearBursts(){ bursts.forEach(function(el){ if (el.parentNode) el.parentNode.removeChild(el); }); bursts.length = 0; }

  /* the trail: 8px squares snapped to the grid, fading out in 16 dithered (Bayer) steps over 1.5s, drawn at ~15fps */
  var trail = document.getElementById('trail'), tip = document.getElementById('brush');
  var ctx = trail && trail.getContext ? trail.getContext('2d') : null;
  var vw = 0, vh = 0, cells = [], cellKey = {}, inkRaf = 0, lastDraw = 0, penUp = true;
  var ptr = {lx:null, ly:null, inside:false, moved:0, restAt:0};
  /* how long the pointer may rest before its ink is cleared */
  var IDLE = 700, touchHeld = false;
  var CELL = 8, LIFE = 1500, BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  function sizeCanvas(){ vw = innerWidth; vh = innerHeight; trail.width = vw; trail.height = vh; }
  function wake(){ if (!inkRaf && !document.hidden) inkRaf = requestAnimationFrame(inkFrame); }
  document.addEventListener('visibilitychange', function(){ if (document.hidden){ cancelAnimationFrame(inkRaf); inkRaf = 0; } else if (cells.length) wake(); });
  function addCell(cx, cy, now){
    var key = cx + ',' + cy, c = cellKey[key];
    if (c){ c.t = now; return; }
    c = {x:cx, y:cy, t:now, key:key}; cells.push(c); cellKey[key] = c;
    if (cells.length > 420){ var o = cells.shift(); delete cellKey[o.key]; }
  }
  function drawCells(now){
    ctx.clearRect(0, 0, vw, vh);
    ctx.fillStyle = cssv('--ink');
    var i, c, lv, sx, sy, keep = [];
    for (i = 0; i < cells.length; i++){
      c = cells[i];
      lv = Math.round((1 - (now - c.t) / LIFE) * 16);
      if (lv <= 0){ delete cellKey[c.key]; continue; }
      keep.push(c);
      for (sy = 0; sy < 4; sy++) for (sx = 0; sx < 4; sx++) if (BAY[sy][sx] < lv) ctx.fillRect(c.x + sx * 2, c.y + sy * 2, 2, 2);
    }
    cells = keep;
  }
  function inkFrame(now){
    inkRaf = 0;
    if (document.hidden) return;
    /* once the pointer rests, the ink lifts away so nothing covers the page */
    var resting = trail.classList.contains('rest');
    if (ptr.moved && !touchHeld && now - ptr.moved > IDLE){
      if (!resting){ trail.classList.add('rest'); ptr.restAt = now; resting = true; clearBursts(); }
      else if (now - ptr.restAt > 320 && cells.length){ cells.length = 0; cellKey = {}; ctx.clearRect(0, 0, vw, vh); }
    }
    if (now - lastDraw >= 66){ lastDraw = now; drawCells(now); }
    if (cells.length) inkRaf = requestAnimationFrame(inkFrame);
  }

  function initMouseBrush(){
    root.classList.add('brushy');
    document.addEventListener('pointermove', function(e){
      if (e.pointerType === 'touch') return;
      var now = performance.now();
      ptr.moved = now; ptr.inside = true;
      if (trail.classList.contains('rest')) trail.classList.remove('rest');
      var overText = !!(e.target.closest && e.target.closest('p,h1,h2,h3,h4,li,dt,dd,a,button,summary,label,legend,b,mark,small,.eyebrow,.lbl,.pill,.tag,.chips span,.tools dd span,.hero-meta span,.ch-num,.key'));
      if (overText){ penUp = true; }
      else if (!reduce){
        var cx = Math.floor(e.clientX / CELL) * CELL, cy = Math.floor(e.clientY / CELL) * CELL;
        if (penUp || ptr.lx === null) addCell(cx, cy, now);
        else {
          var dx = cx - ptr.lx, dy = cy - ptr.ly, n = Math.min(40, Math.max(Math.abs(dx), Math.abs(dy)) / CELL), i;
          for (i = 1; i <= n; i++) addCell(Math.round((ptr.lx + dx * i / n) / CELL) * CELL, Math.round((ptr.ly + dy * i / n) / CELL) * CELL, now);
        }
        ptr.lx = cx; ptr.ly = cy; penUp = false;
      }
      wake();
    }, {passive:true});
    document.documentElement.addEventListener('pointerleave', function(){ ptr.inside = false; ptr.moved = performance.now() - IDLE + 120; penUp = true; wake(); });
    document.addEventListener('pointerdown', function(e){
      if (e.pointerType === 'touch') return;
      ptr.moved = performance.now(); trail.classList.remove('rest');
      burst(e.clientX, e.clientY);
      wake();
    });
  }

  function initTouchInk(){
    root.classList.add('inked');
    window.addEventListener('touchstart', function(e){
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      touchHeld = true; ptr.moved = performance.now();
      burst(t.clientX, t.clientY);
    }, {passive:true});
    function end(){ touchHeld = false; ptr.moved = performance.now(); }
    window.addEventListener('touchend', end, {passive:true});
    window.addEventListener('touchcancel', end, {passive:true});
  }

  if (ctx){
    sizeCanvas();
    window.addEventListener('resize', function(){ sizeCanvas(); });
    if (fineMQ.matches) initMouseBrush();
  }
  if (coarseMQ.matches) initTouchInk();

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
