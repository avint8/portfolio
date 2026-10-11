/* Portfolio behaviour. No dependencies. Load at the end of <body>.
   The page reads fully without this file: scroll reveals, the progress bar, the glossary popovers and the
   order diagram are CSS. This adds the things CSS cannot do yet: timed reveals, count-up numbers,
   the chapter spy, the theme switch, the hero canvas and J / K stepping. */
(function(){
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cssScroll = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');

  /* ---------- timed reveals: add .in when a block scrolls into view ---------- */
  function countUp(el){
    el.querySelectorAll('[data-count]').forEach(function(n){
      if (n.dataset.done) return; n.dataset.done = 1;
      if (reduce) return;
      var end = parseFloat(n.dataset.count), dec = parseInt(n.dataset.dec || '0', 10), t0 = null, dur = 1300;
      function step(t){
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / dur), v = end * (1 - Math.pow(1 - p, 3));
        n.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-IN');
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }
  if ('IntersectionObserver' in window && !reduce){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ e.target.classList.add('in'); countUp(e.target); io.unobserve(e.target); }
      });
    }, {threshold:0.3, rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('.io').forEach(function(t){ io.observe(t); });
  } else {
    /* no observer, or reduced motion: go straight to the finished state */
    document.querySelectorAll('.io').forEach(function(t){ t.classList.add('in'); });
  }

  /* replay buttons re-run a timed reveal */
  document.querySelectorAll('[data-replay]').forEach(function(b){
    b.addEventListener('click', function(){
      var t = document.getElementById(b.dataset.replay); if (!t) return;
      t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
    });
  });

  /* ---------- chapter spy, plus a progress fallback where CSS scroll timelines are missing ---------- */
  var toc = document.getElementById('toc'), prog = document.getElementById('prog');
  var links = Array.prototype.slice.call(toc.querySelectorAll('a'));
  var chapters = links.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); });
  function pageTop(el){ return el.getBoundingClientRect().top + window.scrollY; }
  function spy(){
    var y = window.scrollY + window.innerHeight * 0.32, cur = -1;
    chapters.forEach(function(c, i){ if (c && pageTop(c) <= y) cur = i; });
    links.forEach(function(a, i){ if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    if (!cssScroll){
      var h = root.scrollHeight - window.innerHeight;
      prog.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
    }
  }
  var ticking = false;
  window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(function(){ spy(); ticking = false; }); } }, {passive:true});
  window.addEventListener('resize', spy);
  spy();

  /* ---------- background canvas: a small network that wires itself to the pointer ---------- */
  var net = (function(){
    var cv = document.getElementById('net');
    if (!cv || !cv.getContext) return {recolour:function(){}};
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, nodes = [], ptr = {x:-1e4, y:-1e4}, cA = '', cM = '', raf = 0;
    var LINK = 150, REACH = 220;
    function colours(){ var s = getComputedStyle(cv); cA = s.color; cM = s.caretColor; }
    function mk(){ return {x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3, r:1.4+Math.random()*1.6}; }
    function size(){
      var d = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W*d); cv.height = Math.round(H*d); ctx.setTransform(d,0,0,d,0,0);
      var n = Math.max(18, Math.min(72, Math.round(W*H/17000)));
      while (nodes.length < n) nodes.push(mk());
      nodes.length = n;
      if (!raf) frame();
    }
    function frame(){
      var i, j, a, b, dx, dy, d, near, sp;
      ctx.clearRect(0,0,W,H);
      for (i = 0; i < nodes.length; i++){
        a = nodes[i];
        dx = ptr.x - a.x; dy = ptr.y - a.y; d = Math.sqrt(dx*dx + dy*dy);
        a.near = d < REACH ? 1 - d/REACH : 0;
        if (a.near && d > 1){ a.vx += dx/d*.006*a.near; a.vy += dy/d*.006*a.near; }
        sp = Math.sqrt(a.vx*a.vx + a.vy*a.vy); if (sp > .55){ a.vx *= .55/sp; a.vy *= .55/sp; }
        a.x += a.vx; a.y += a.vy;
        if (a.x < -20) a.x = W+20; else if (a.x > W+20) a.x = -20;
        if (a.y < -20) a.y = H+20; else if (a.y > H+20) a.y = -20;
      }
      for (i = 0; i < nodes.length; i++){
        a = nodes[i];
        for (j = i+1; j < nodes.length; j++){
          b = nodes[j]; dx = a.x-b.x; dy = a.y-b.y; d = dx*dx + dy*dy;
          if (d < LINK*LINK){
            near = Math.max(a.near, b.near);
            ctx.globalAlpha = (1 - Math.sqrt(d)/LINK) * (.3 + near*.5);
            ctx.strokeStyle = near > .15 ? cA : cM; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
          }
        }
        if (a.near){
          ctx.globalAlpha = a.near*.75; ctx.strokeStyle = cA; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(ptr.x,ptr.y); ctx.stroke();
        }
        ctx.globalAlpha = .5 + a.near*.5; ctx.fillStyle = a.near ? cA : cM;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r + a.near*2.2, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function loop(){ frame(); raf = requestAnimationFrame(loop); }
    function play(on){
      if (reduce) return;
      if (on && !raf) raf = requestAnimationFrame(loop);
      if (!on && raf){ cancelAnimationFrame(raf); raf = 0; }
    }
    /* the canvas is fixed behind the whole page, so the pointer is tracked across the window */
    window.addEventListener('pointermove', function(e){ ptr.x = e.clientX; ptr.y = e.clientY; }, {passive:true});
    document.documentElement.addEventListener('pointerleave', function(){ ptr.x = ptr.y = -1e4; });
    colours(); size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(cv); else window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', function(){ play(!document.hidden); });
    play(true);
    return {recolour:function(){ colours(); if (!raf) frame(); }};
  })();

  /* ---------- theme switch: the new theme grows out of the button (View Transitions) ---------- */
  var themeBtn = document.getElementById('themeBtn');
  if (!(window.CSS && CSS.supports && CSS.supports('color', 'light-dark(#000,#fff)'))) themeBtn.hidden = true;
  function isDark(){
    var t = root.dataset.theme;
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  themeBtn.addEventListener('click', function(){
    var next = isDark() ? 'light' : 'dark';
    function apply(){ root.dataset.theme = next; try{ localStorage.setItem('theme', next); }catch(e){} net.recolour(); }
    if (!document.startViewTransition || reduce){ apply(); return; }
    var r = themeBtn.getBoundingClientRect(), x = r.left + r.width/2, y = r.top + r.height/2;
    var R = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.startViewTransition(apply).ready.then(function(){
      root.animate({clipPath:['circle(0px at '+x+'px '+y+'px)', 'circle('+R+'px at '+x+'px '+y+'px)']},
        {duration:650, easing:'cubic-bezier(.2,.7,.2,1)', pseudoElement:'::view-transition-new(root)'});
    });
  });
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){ net.recolour(); });

  /* ---------- pointer light on cards ---------- */
  document.querySelectorAll('.spot').forEach(function(c){
    c.addEventListener('pointermove', function(e){
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- journey diagram: walks the steps by itself until someone takes over ---------- */
  var demo = document.getElementById('flowdemo');
  if (demo && !reduce && 'IntersectionObserver' in window){
    var radios = Array.prototype.slice.call(demo.querySelectorAll('input[name="st"]')), timer = 0, taken = false;
    function advance(){
      var i = radios.findIndex(function(r){ return r.checked; });
      radios[(i + 1) % radios.length].checked = true;
    }
    function auto(on){
      clearInterval(timer); timer = 0;
      if (on && !taken) timer = setInterval(advance, 3000);
    }
    ['pointerdown','keydown'].forEach(function(ev){ demo.addEventListener(ev, function(){ taken = true; auto(false); }); });
    new IntersectionObserver(function(es){ auto(es[0].isIntersecting); }, {threshold:0.4}).observe(demo);
  }

  /* ---------- one section per scroll ----------
     Touch scrolling is handled by CSS scroll snap alone. A mouse wheel moves too little per notch for
     snap to carry it to the next section, so the wheel and the keyboard page through the stops here.
     Inside a section taller than the screen everything scrolls normally until its edge is reached. */
  function barHeight(){ return parseFloat(getComputedStyle(root).scrollPaddingTop) || 0; }
  /* the stops are whatever the stylesheet made a snap point at this screen size */
  function stops(){
    var bar = barHeight(), ys = [];
    document.querySelectorAll('.hero,.ch-head,.sub,.room,.last,.split-b,.scene-b,.room-vis').forEach(function(el){
      if (getComputedStyle(el).scrollSnapAlign !== 'none') ys.push(Math.max(0, Math.round(pageTop(el) - bar)));
    });
    return ys.sort(function(a, b){ return a - b; });
  }
  /* move one stop in the given direction; false means "let the browser scroll" */
  function page(dir){
    var ys = stops(), y = window.scrollY, screen = window.innerHeight - barHeight(), i = 0, k, to;
    for (k = 0; k < ys.length; k++) if (ys[k] <= y + 2) i = k;
    if (dir > 0){
      if (i >= ys.length - 1) return false;
      if (ys[i + 1] - y > screen + 4) return false;
      to = ys[i + 1];
    } else if (y - ys[i] > 4){
      if (y - ys[i] > screen) return false;
      to = ys[i];
    } else {
      if (i === 0) return false;
      to = Math.max(ys[i - 1], ys[i] - screen);
    }
    window.scrollTo({top:to, behavior: reduce ? 'auto' : 'smooth'});
    return true;
  }

  /* a wheel gesture is a run of events; it turns one page, and its tail is swallowed */
  var turnedAt = 0, lastWheel = 0;
  window.addEventListener('wheel', function(e){
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || !e.deltaY) return;
    if (window.innerHeight <= 520) return;
    var now = performance.now(), sameGesture = now - lastWheel < 140, settling = now - turnedAt < 450;
    lastWheel = now;
    if (turnedAt && (settling || sameGesture)){ e.preventDefault(); return; }
    if (page(e.deltaY > 0 ? 1 : -1)){ e.preventDefault(); turnedAt = now; }
    else turnedAt = 0;
  }, {passive:false});

  document.addEventListener('keydown', function(e){
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target, k = e.key, dir = 0;
    if (t.closest && t.closest('input,textarea,select,[contenteditable]')) return;
    /* Space presses a focused button, so it only pages from elsewhere */
    if (k === ' ' && t.closest && t.closest('button,summary')) return;
    if (k === 'j' || k === 'J' || k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) dir = 1;
    else if (k === 'k' || k === 'K' || k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) dir = -1;
    if (dir && page(dir)) e.preventDefault();
  });
})();
