/* Portfolio behaviour. Load at the end of <body>. Optional: Lenis (smooth scroll), loaded before this file.
   The page reads fully without any of this: CSS stacks everything, the glossary is popovers, the journey
   diagram is radio inputs. This file adds:
     1  theme drop (persisted)
     2  "ink still drying" reveals, count-ups, replay, journey auto-walk
     3  desktop: smooth scroll + three scroll-scrubbed section transitions (brush stroke, page flip, paper tear)
     4  phones: the manga reader (page counter, ~500ms triggered transitions)
     5  the ink brush pointer + canvas trail (mouse) and ink dots (touch)
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
  themeBtn.addEventListener('click', function(){
    var next = isDark() ? 'light' : 'dark';
    function apply(){ root.dataset.theme = next; try{ localStorage.setItem('theme', next); }catch(e){} }
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

  /* The brush stroke. Bristle strips of a tapering band along an S-curve; head sweeps across, then the band swells
     until it covers the screen. Returns path data for the reveal and for a slightly larger ink ring around it. */
  var K = 11, NP = 30;
  function brushD(q, W, H, extra){
    var tHead = -.28 + 1.56 * Math.min(1, q / .42);
    var grow = Math.pow(clamp((q - .26) / .74, 0, 1), 1.55);
    var T = H * (.2 + 2.9 * grow) + extra * 2;
    var f = .38 + .95 * Math.min(1, grow * 1.8);
    var parts = [], k, i;
    for (k = 0; k < K; k++){
      var u = k / (K - 1) - .5, hk = hash(k, 3.3), bw = T / K * f + extra * .5;
      var headK = tHead - (q < .92 ? .1 * hk : 0) + (extra ? .02 : 0);
      var tailK = -.3 - hk * .05;
      var up = [], lo = [];
      for (i = 0; i <= NP; i++){
        var t = lerp(tailK, headK, i / NP);
        var dh = headK - t, tap = .12 + .88 * smooth(dh / .17);
        var cx = W * t, cy = H * (.68 - .32 * t) + H * .07 * Math.sin(t * 7 + .6);
        var dy = H * (-.32 + .49 * Math.cos(t * 7 + .6)), len = Math.hypot(W, dy), nx = -dy / len, ny = W / len;
        var n = (Math.sin(t * 53 + k * 7.1) + Math.sin(t * 131 + k * 2.3)) * .5 * (T * .01 + 2 + extra * .3);
        var off = u * T + n * .6;
        up.push((cx + nx * (off - bw * tap - n)).toFixed(0) + ' ' + (cy + ny * (off - bw * tap - n)).toFixed(0));
        lo.push((cx + nx * (off + bw * tap + n * .5)).toFixed(0) + ' ' + (cy + ny * (off + bw * tap + n * .5)).toFixed(0));
      }
      parts.push('M' + up.join('L') + 'L' + lo.reverse().join('L') + 'Z');
    }
    return parts.join('');
  }
  var brushP = document.getElementById('brushClipP'), ringP = document.getElementById('brushRingP');
  function setBrush(q, W, H, ring){
    brushP.setAttribute('d', q <= .002 ? 'M0 0' : brushD(q, W, H, 0));
    if (ring && ringP) ringP.setAttribute('d', q <= .002 ? 'M0 0' : brushD(q, W, H, 16 + H * .02));
  }

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
  document.addEventListener('keydown', function(e){
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target; if (t.closest && t.closest('input,textarea,select,[contenteditable]')) return;
    var dir = (e.key === 'j' || e.key === 'J') ? 1 : (e.key === 'k' || e.key === 'K') ? -1 : 0;
    if (dir) goTo(Math.max(0, scrollY + dir * innerHeight * .85));
  });

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

  /* ------------------------------------------------------------------ 5  the ink brush: mouse trail and touch dots */
  var trail = document.getElementById('trail'), tip = document.getElementById('brush');
  var ctx = trail && trail.getContext ? trail.getContext('2d') : null;
  var dpr = 1, vw = 0, vh = 0;
  var pts = [], blobs = [], cur = null, inkRaf = 0;
  var ptr = {x:-100, y:-100, tx:-100, ty:-100, lx:0, ly:0, lt:0, v:0, inside:false, moved:0};
  var seedN = 0;

  function sizeCanvas(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = innerWidth; vh = innerHeight;
    trail.width = Math.round(vw * dpr); trail.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function wake(){ if (!inkRaf && !document.hidden) inkRaf = requestAnimationFrame(inkFrame); }
  document.addEventListener('visibilitychange', function(){ if (document.hidden){ cancelAnimationFrame(inkRaf); inkRaf = 0; } else if (pts.length || blobs.length || root.classList.contains('brushy')) wake(); });

  function newBlob(x, y, opts){
    var r = rng(++seedN * 7919), n = 16, noise = [], i;
    for (i = 0; i < n; i++) noise.push(.78 + r() * .44);
    var b = {x:x, y:y, t0:performance.now(), noise:noise, held:true, r:2, maxR:opts.maxR, grow:opts.grow, spread:opts.spread, rot:r() * 6.28, end:0, rEnd:0, hold:opts.hold, life:opts.life};
    blobs.push(b); return b;
  }
  function drawBlob(b, now){
    var age = now - b.t0, r, a;
    if (b.held){
      r = b.spread * (1 - Math.exp(-age / 140)) + 2;
      if (b.grow && age > 380) r += (age - 380) * b.grow;
      r = Math.min(r, b.maxR); b.rEnd = r; a = 1;
    } else {
      if (!b.end) b.end = now;
      r = b.rEnd * (1 + .1 * easeOut((now - b.end) / 500));
      var d = now - b.end - b.hold; a = d <= 0 ? 1 : 1 - d / b.life;
    }
    if (a <= 0) return false;
    ctx.fillStyle = '#fff';
    var n = b.noise.length, k, pass;
    for (pass = 0; pass < 2; pass++){
      ctx.globalAlpha = (pass ? .28 : .92) * a;
      var rr = r * (pass ? 1.22 : 1);
      ctx.beginPath();
      for (k = 0; k <= n; k++){
        var an = b.rot + (k % n) / n * 6.2832, rad = rr * (pass ? (.85 + b.noise[(k + 5) % n] * .3) : b.noise[k % n]);
        var px = b.x + Math.cos(an) * rad, py = b.y + Math.sin(an) * rad;
        if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return true;
  }
  var LIFE = 3600;
  function drawTrail(now){
    var i, a, b, k, dx, dy, len, nx, ny, age, life, w, nb, off, alpha, h;
    ctx.lineCap = 'round'; ctx.strokeStyle = '#fff';
    for (i = 1; i < pts.length; i++){
      a = pts[i - 1]; b = pts[i];
      if (b.t - a.t > 140) continue;
      age = now - b.t; life = 1 - age / LIFE; if (life <= 0) continue;
      alpha = Math.min(1, life * 1.5);
      w = b.w * (1 - .5 * (age / LIFE)) * (1 + (1 - b.dry) * .3 * Math.min(1, age / 700));
      dx = b.x - a.x; dy = b.y - a.y; len = Math.hypot(dx, dy) || 1; nx = -dy / len; ny = dx / len;
      if (b.dry < .28){
        ctx.globalAlpha = alpha * .95; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      } else {
        nb = 6;
        for (k = 0; k < nb; k++){
          h = hash(b.seed, k);
          if (h < b.dry * .75) continue;          /* dry brush: bristles skip */
          off = (k / (nb - 1) - .5) * w;
          ctx.globalAlpha = alpha * (.5 + .45 * hash(k, b.seed));
          ctx.lineWidth = Math.max(.8, w / nb * 1.15);
          ctx.beginPath(); ctx.moveTo(a.x + nx * off, a.y + ny * off); ctx.lineTo(b.x + nx * off, b.y + ny * off); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  function inkFrame(now){
    inkRaf = 0;
    if (document.hidden) return;
    var fine = root.classList.contains('brushy');
    /* tip follows with a little drag */
    if (fine){
      var k = reduce ? 1 : .38;
      ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k;
      tip.style.transform = 'translate3d(' + ptr.x.toFixed(1) + 'px,' + ptr.y.toFixed(1) + 'px,0)';
      ptr.v *= .93;
      /* holding still: a small blot slowly pools */
      if (!reduce && ptr.inside && now - ptr.moved > 420){
        if (!cur){ cur = newBlob(ptr.tx, ptr.ty, {maxR:20, grow:.012, spread:3, hold:1500, life:2600}); }
      }
    }
    if (!reduce){
      ctx.clearRect(0, 0, vw, vh);
      while (pts.length && now - pts[0].t > LIFE) pts.shift();
      if (pts.length) drawTrail(now);
      for (var i = blobs.length - 1; i >= 0; i--){ if (!drawBlob(blobs[i], now)) blobs.splice(i, 1); }
      if (cur && cur.dead) cur = null;
    } else {
      /* reduced motion: dots simply fade in place */
      ctx.clearRect(0, 0, vw, vh);
      for (var j = blobs.length - 1; j >= 0; j--){ if (!drawBlob(blobs[j], now)) blobs.splice(j, 1); }
    }
    var moving = fine && (Math.abs(ptr.tx - ptr.x) > .25 || Math.abs(ptr.ty - ptr.y) > .25);
    if (moving || pts.length || blobs.length || (fine && ptr.inside && !cur && !reduce)) inkRaf = requestAnimationFrame(inkFrame);
  }

  function initMouseBrush(){
    root.classList.add('brushy');
    document.addEventListener('pointermove', function(e){
      if (e.pointerType === 'touch') return;
      var now = performance.now();
      ptr.tx = e.clientX; ptr.ty = e.clientY;
      if (!ptr.inside){ ptr.x = e.clientX; ptr.y = e.clientY; ptr.inside = true; tip.classList.add('on'); }
      var dt = Math.max(1, now - ptr.lt), d = Math.hypot(e.clientX - ptr.lx, e.clientY - ptr.ly);
      ptr.v = ptr.v * .6 + (d / dt) * .4;
      if (d > 2.2 && !reduce){
        var v = ptr.v, w = lerp(24, 3.2, clamp(v / 2.1, 0, 1));
        pts.push({x:e.clientX, y:e.clientY, t:now, w:w, dry:clamp((v - .85) / 1.25, 0, 1), seed:Math.random() * 50});
        if (pts.length > 170) pts.shift();
        ptr.lx = e.clientX; ptr.ly = e.clientY; ptr.lt = now;
      }
      if (cur){ cur.held = false; cur.dead = true; cur = null; }
      ptr.moved = now;
      tip.classList.toggle('big', !!(e.target.closest && e.target.closest('a,button,summary,label,[popovertarget]')));
      wake();
    }, {passive:true});
    document.documentElement.addEventListener('pointerleave', function(){ ptr.inside = false; tip.classList.remove('on'); if (cur){ cur.held = false; cur.dead = true; cur = null; } });
    document.addEventListener('pointerdown', function(e){
      if (e.pointerType === 'touch') return;
      /* a click lands a dot of ink where the tip is */
      if (!reduce){ var b = newBlob(e.clientX, e.clientY, {maxR:30, grow:0, spread:15, hold:300, life:1800}); b.held = false; b.rEnd = 15; }
      wake();
    });
    wake();
  }

  function initTouchInk(){
    root.classList.add('inked');
    var active = null;
    window.addEventListener('touchstart', function(e){
      if (e.touches.length !== 1) { if (active){ active.held = false; active = null; } return; }
      var t = e.touches[0];
      active = newBlob(t.clientX, t.clientY, reduce ? {maxR:22, grow:0, spread:20, hold:400, life:1400} : {maxR:130, grow:.05, spread:24, hold:700, life:2400});
      active.sx = t.clientX; active.sy = t.clientY;
      wake();
    }, {passive:true});
    window.addEventListener('touchmove', function(e){
      if (!active) return;
      var t = e.touches[0];
      /* a swipe is a scroll: stop growing, never drag ink along */
      if (Math.hypot(t.clientX - active.sx, t.clientY - active.sy) > 10){ active.held = false; active = null; }
    }, {passive:true});
    function end(){ if (active){ active.held = false; active = null; } }
    window.addEventListener('touchend', end, {passive:true});
    window.addEventListener('touchcancel', end, {passive:true});
  }

  if (ctx){
    sizeCanvas();
    window.addEventListener('resize', function(){ sizeCanvas(); });
    if (fineMQ.matches) initMouseBrush();
    if (coarseMQ.matches) initTouchInk();
  }

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
