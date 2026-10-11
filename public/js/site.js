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

  /* ---------- hero canvas: a small network that wires itself to the pointer ---------- */
  var net = (function(){
    var cv = document.getElementById('net');
    if (!cv || !cv.getContext) return {recolour:function(){}};
    var ctx = cv.getContext('2d'), hero = cv.parentElement;
    var W = 0, H = 0, nodes = [], ptr = {x:-1e4, y:-1e4}, cA = '', cM = '', raf = 0, seen = true;
    var LINK = 150, REACH = 220;
    function colours(){ var s = getComputedStyle(cv); cA = s.color; cM = s.caretColor; }
    function mk(){ return {x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3, r:1.4+Math.random()*1.6}; }
    function size(){
      var d = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
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
    hero.addEventListener('pointermove', function(e){ var r = hero.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', function(){ ptr.x = ptr.y = -1e4; });
    colours(); size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(hero); else window.addEventListener('resize', size);
    if ('IntersectionObserver' in window) new IntersectionObserver(function(es){ seen = es[0].isIntersecting; play(seen && !document.hidden); }).observe(hero);
    document.addEventListener('visibilitychange', function(){ play(seen && !document.hidden); });
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

  /* ---------- J / K step through the page one block at a time ---------- */
  function stops(){
    var ys = [0];
    document.querySelectorAll('.ch-head,.sub,.closing').forEach(function(el){ ys.push(pageTop(el) - 84); });
    /* rooms are sticky, so their stops come from where each one would sit in normal flow */
    var rooms = document.querySelector('.rooms');
    if (rooms){
      var y = pageTop(rooms);
      Array.prototype.forEach.call(rooms.children, function(r, i){ ys.push(y - 76 - i*16); y += r.offsetHeight + 28; });
    }
    return ys.sort(function(a, b){ return a - b; });
  }
  document.addEventListener('keydown', function(e){
    if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
    var k = e.key.toLowerCase();
    if (k !== 'j' && k !== 'k') return;
    e.preventDefault();
    var ys = stops(), y = window.scrollY, to = null, i;
    if (k === 'j'){ for (i = 0; i < ys.length; i++) if (ys[i] > y + 8){ to = ys[i]; break; } }
    else { for (i = ys.length - 1; i >= 0; i--) if (ys[i] < y - 8){ to = ys[i]; break; } }
    if (to !== null) window.scrollTo({top:Math.max(0, to), behavior: reduce ? 'auto' : 'smooth'});
  });
})();
