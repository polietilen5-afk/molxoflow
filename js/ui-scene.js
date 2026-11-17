/* Molxo Flow: живая сцена главной — схема с потоком данных, поле частиц, появление при прокрутке.
   Всё рисуется кодом (SVG, canvas), без картинок, сети и внешних файлов. Работает только в браузере. */
(function (root) {
  'use strict';
  var MF = root.MF = root.MF || {};
  if (typeof document === 'undefined') return;

  var NS = 'http://www.w3.org/2000/svg';
  function reduced() {
    return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function s(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  // Следит, видна ли сцена: на экране и вкладка не скрыта. cb(true/false) вызывается при каждой смене; класс is-off ставит css-паузу циклов.
  function watchVisible(node, cb) {
    var inView = true, tabOn = !document.hidden, last = true;
    function apply() {
      var on = inView && tabOn;
      if (on === last) return;
      last = on;
      if (node.classList) node.classList.toggle('is-off', !on);
      cb(on);
    }
    if ('IntersectionObserver' in root) {
      try { new root.IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; apply(); }).observe(node); } catch (e) { /* без наблюдателя сцена идёт всегда */ }
    }
    document.addEventListener('visibilitychange', function () { tabOn = !document.hidden; apply(); });
  }

  /* ---------- схема: шесть модулей, пакеты по маршруту, документы веером ---------- */
  function buildScene(container) {
    var titles = (MF.MODULES || []).map(function (m) { return MF.t('mod.' + m.id + '.title'); });
    var svg = s('svg', { viewBox: '0 0 560 400', 'class': 'scene', role: 'img',
      'aria-label': MF.t('scene.aria') });
    var route = s('path', { 'class': 'sc-track', d: 'M105 66 H280 H455 V206 H280 H105' }, svg);
    var pos = [[30, 34], [205, 34], [380, 34], [380, 174], [205, 174], [30, 174]];
    var nodes = pos.map(function (p, i) {
      var g = s('g', { 'class': 'sc-node' }, svg);
      s('rect', { x: p[0], y: p[1], width: 150, height: 64, rx: 10 }, g);
      s('circle', { 'class': 'sc-ring', cx: p[0] + 75, cy: p[1] + 32, r: 62 }, g);
      var no = s('text', { 'class': 'sc-no', x: p[0] + 16, y: p[1] + 20 }, g); no.textContent = '0' + (i + 1);
      var t = s('text', { x: p[0] + 16, y: p[1] + 46 }, g); t.textContent = titles[i] || '';
      return g;
    });
    var sheetsG = s('g', { transform: 'translate(240 398)' }, svg);
    var sheets = [];
    for (var i = 0; i < 12; i++) {
      var r = s('rect', { 'class': 'sc-sheet', x: -22, y: -72, width: 44, height: 72, rx: 4 }, sheetsG);
      r.style.transform = 'rotate(' + ((i - 5.5) * 7) + 'deg)';
      sheets.push(r);
    }
    var lbl = s('text', { 'class': 'sc-label', x: 330, y: 372 }, svg); lbl.textContent = MF.t('scene.label');
    var pkG = s('g', null, svg), dots = [];
    for (var k = 0; k < 4; k++) dots.push(s('circle', { r: 4.5, 'class': 'sc-pk' }, pkG));
    container.appendChild(svg);

    var len = route.getTotalLength(), N = dots.length;
    function place(t) {
      dots.forEach(function (d, idx) {
        var p = (t + idx / N) % 1, pt = route.getPointAtLength(p * len);
        d.setAttribute('cx', pt.x); d.setAttribute('cy', pt.y);
        d.setAttribute('opacity', (0.35 + 0.65 * Math.sin(Math.PI * p)).toFixed(2));
      });
      var head = t % 1, idx2 = Math.min(5, Math.floor(head * 6));
      nodes.forEach(function (n, i) {
        if (i <= idx2 && !n.classList.contains('is-lit')) {
          n.classList.add('is-lit', 'is-ping');
          root.setTimeout(function () { n.classList.remove('is-ping'); }, 900);
        }
      });
      var on = Math.floor(head * 13);
      sheets.forEach(function (sh, i) { sh.classList.toggle('is-on', i < on); });
    }
    if (reduced()) {
      place(0.25);
      nodes.forEach(function (n) { n.classList.add('is-lit'); });
      sheets.forEach(function (sh) { sh.classList.add('is-on'); });
      return svg;
    }
    // Цикл стоит, пока сцена вне экрана или вкладка скрыта; возвращается с того же места по времени.
    var t0 = root.performance.now(), cycle = 0, running = true, raf = 0;
    function tick(now) {
      raf = 0;
      if (!svg.isConnected || !running) return;
      var cyc = Math.floor((now - t0) / 9000);
      if (cyc !== cycle) { cycle = cyc; nodes.forEach(function (n) { n.classList.remove('is-lit'); }); }
      place(((now - t0) / 9000) % 1);
      raf = root.requestAnimationFrame(tick);
    }
    watchVisible(container, function (on) {
      running = on;
      if (on && !raf && svg.isConnected) raf = root.requestAnimationFrame(tick);
    });
    tick(t0);
    return svg;
  }

  /* ---------- поле частиц за заголовком ---------- */
  function mountField(canvas) {
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    var W = 0, H = 0, P = [], dpr = Math.min(root.devicePixelRatio || 1, 1.5), mx = -999, my = -999, run = true, rm = reduced();
    function size() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height; canvas.width = Math.max(1, W * dpr); canvas.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(70, W * H / 16000)); P = [];
      for (var i = 0; i < n; i++) P.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, r: Math.random() * 1.4 + 0.6 });
    }
    function draw() {
      if (!canvas.isConnected) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < P.length; i++) {
        var a = P[i];
        if (!rm) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
          var dx = a.x - mx, dy = a.y - my, d = dx * dx + dy * dy;
          if (d < 9000) { a.x += dx * 0.004; a.y += dy * 0.004; }
        }
        ctx.fillStyle = 'rgba(255,106,43,.55)'; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill();
        for (var j = i + 1; j < P.length; j++) {
          var b = P[j], ex = a.x - b.x, ey = a.y - b.y, dd = ex * ex + ey * ey;
          if (dd < 12100) {
            ctx.strokeStyle = 'rgba(255,106,43,' + (0.16 * (1 - dd / 12100)).toFixed(3) + ')';
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      if (!rm && run) root.requestAnimationFrame(draw);
    }
    size(); draw();
    function onResize() { if (!canvas.isConnected) { root.removeEventListener('resize', onResize); return; } size(); if (rm) draw(); }
    root.addEventListener('resize', onResize);
    canvas.parentNode.addEventListener('pointermove', function (e) { var r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    if ('IntersectionObserver' in root) {
      new root.IntersectionObserver(function (es) {
        var v = es[0].isIntersecting;
        if (v && !run) { run = true; root.requestAnimationFrame(draw); } else if (!v) run = false;
      }).observe(canvas.parentNode);
    }
    document.addEventListener('visibilitychange', function () {
      if (!canvas.isConnected) return;
      if (document.hidden) run = false; else if (!run) { run = true; if (!rm) root.requestAnimationFrame(draw); }
    });
  }

  /* ---------- общие приёмы ---------- */
  // Появление блоков при прокрутке. Начальное состояние видимое: скрываются (класс rv-wait) только блоки ниже линии просмотра
  // и только после того, как IntersectionObserver подтвердил запуск (первый вызов). Быстрая прокрутка, якорь и восстановление
  // позиции не оставляют скрытого: обработчик прокрутки и hashchange показывают всё, что оказалось выше нижнего края окна
  // (boundingClientRect.top < 0 — блок уже проскочили); страховочный таймер через 2,5 с показывает всё, если наблюдатель молчит,
  // иначе делает ту же проверку. При prefers-reduced-motion и без IntersectionObserver блоки показаны сразу.
  var SAFETY_MS = 2500;
  function reveal(scope) {
    var els = [].slice.call(scope.querySelectorAll('.rv, .result-grid'));
    function show(e) { e.classList.add('is-in'); e.classList.remove('rv-wait'); }
    if (!('IntersectionObserver' in root) || reduced()) { els.forEach(show); return; }
    var armed = false, waiting = [], ticking = false;
    function viewport() { return root.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 0; }
    function seen(e) { return e.isIntersecting || (e.boundingClientRect && e.boundingClientRect.top < 0) || (e.boundingClientRect && e.boundingClientRect.top < viewport()); }
    var io = new root.IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var t = e.target;
        if (seen(e)) { show(t); io.unobserve(t); return; }
        // Первый вызов подтверждает, что наблюдатель работает: только теперь блоки ниже окна прячутся до прокрутки.
        if (!armed && t.classList.contains('rv')) { t.classList.add('rv-wait'); waiting.push(t); }
      });
      armed = true;
    }, { threshold: 0 });
    function sweep() {
      ticking = false;
      waiting = waiting.filter(function (e) {
        var top = e.getBoundingClientRect().top;
        if (top < viewport()) { show(e); io.unobserve(e); return false; }
        return true;
      });
      if (!waiting.length) { root.removeEventListener('scroll', onScroll); root.removeEventListener('hashchange', sweep); }
    }
    function onScroll() { if (!ticking) { ticking = true; root.requestAnimationFrame(sweep); } }
    root.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('hashchange', sweep);
    els.forEach(function (e) { io.observe(e); });
    var guard = root.setTimeout(function () {
      if (!armed) { els.forEach(show); waiting = []; if (io.disconnect) io.disconnect(); } else sweep();
    }, SAFETY_MS);
    if (guard && typeof guard.unref === 'function') guard.unref();
  }
  function wordsIn(h1) {
    var words = h1.textContent.split(' ');
    h1.textContent = '';
    words.forEach(function (w, i) {
      var sp = document.createElement('span');
      // каскад только у первых восьми слов (шаг 70 мс), остальные появляются сразу
      sp.className = 'w'; sp.textContent = w; sp.style.animationDelay = i < 8 ? (0.08 + i * 0.07).toFixed(2) + 's' : '0s';
      h1.appendChild(sp);
      if (i < words.length - 1) h1.appendChild(document.createTextNode(' '));
    });
  }
  function tilt(box, stage) {
    if (reduced() || !(root.matchMedia && root.matchMedia('(hover: hover)').matches)) return;
    box.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      stage.style.transform = 'perspective(1000px) rotateY(' + (x * 6).toFixed(2) + 'deg) rotateX(' + (-y * 5).toFixed(2) + 'deg)';
    });
    box.addEventListener('pointerleave', function () { stage.style.transform = ''; });
  }
  function glow(scope) {
    [].forEach.call(scope.querySelectorAll('.result-card'), function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  MF.scene = { buildScene: buildScene, mountField: mountField, reveal: reveal, wordsIn: wordsIn, tilt: tilt, glow: glow, reduced: reduced, svg: s };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
