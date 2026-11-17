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

  // Пауза «по просьбе пользователя»: хранится только в памяти страницы, на диск и в хранилище браузера не пишется, действует на схему и поле частиц.
  var userPaused = false, pauseListeners = [];
  function isPaused() { return userPaused; }
  function setPaused(v) {
    userPaused = !!v;
    pauseListeners = pauseListeners.filter(function (l) { return l.node.isConnected !== false; });
    pauseListeners.forEach(function (l) { l.fn(userPaused); });
  }
  function onPause(node, fn) { pauseListeners.push({ node: node, fn: fn }); }

  // Один общий visibilitychange на модуль. Сцена видна, когда она на экране и вкладка не скрыта.
  // Наблюдатель и запись снимаются, как только контейнер отсоединён от документа.
  var watchers = [], tabOn = !document.hidden;
  document.addEventListener('visibilitychange', function () {
    tabOn = !document.hidden;
    watchers = watchers.filter(function (w) {
      if (w.node.isConnected === false) { w.dispose(); return false; }
      w.apply();
      return true;
    });
  });
  // cb(true/false) вызывается при каждой смене; класс is-off ставит css-паузу циклов.
  function watchVisible(node, cb) {
    var inView = true, last = true, io = null;
    function apply() {
      var on = inView && tabOn;
      if (on === last) return;
      last = on;
      if (node.classList) node.classList.toggle('is-off', !on);
      cb(on);
    }
    var w = { node: node, apply: apply, dispose: function () { if (io && io.disconnect) io.disconnect(); io = null; } };
    if ('IntersectionObserver' in root) {
      try {
        io = new root.IntersectionObserver(function (es) {
          if (node.isConnected === false) { w.dispose(); watchers = watchers.filter(function (x) { return x !== w; }); return; }
          inView = es[es.length - 1].isIntersecting; apply();
        });
        io.observe(node);
      } catch (e) { io = null; /* без наблюдателя сцена идёт всегда */ }
    }
    watchers.push(w);
    return w;
  }

  // Слабое устройство: сенсорный указатель, не больше четырёх ядер или включённая экономия трафика.
  function weakDevice() {
    try {
      var nav = root.navigator || {}, coarse = !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches);
      var cores = nav.hardwareConcurrency, save = !!(nav.connection && nav.connection.saveData);
      return coarse || (typeof cores === 'number' && cores <= 4) || save;
    } catch (e) { return false; }
  }

  /* ---------- схема: шесть модулей, пакеты по маршруту, документы веером ---------- */
  // Положение шести узлов (левый верхний угол); центры лежат на маршруте: верхний ряд вправо, правый край вниз, нижний ряд влево.
  var NODE_POS = [[30, 34], [205, 34], [380, 34], [380, 174], [205, 174], [30, 174]];
  // Путь через центры только включённых узлов (индексы по порядку): по ряду, на смену ряда через правый край.
  function routeThrough(idx) {
    var d = '', prevRow = -1;
    idx.forEach(function (i, n) {
      var cx = NODE_POS[i][0] + 75, cy = NODE_POS[i][1] + 32, row = i < 3 ? 0 : 1;
      if (n === 0) d = 'M' + cx + ' ' + cy;
      else if (row === prevRow) d += ' H' + cx;
      else d += ' H455 V' + cy + (cx === 455 ? '' : ' H' + cx);
      prevRow = row;
    });
    return d;
  }
  // Один вход статичной схемы: пока блок ниже экрана, узлы ждут (sc-wait), на экране играют один раз (is-in).
  // Без наблюдателя и при reduced-motion узлы видны сразу; страховочный таймер снимает ожидание.
  function watchEnter(node) {
    if (reduced() || !('IntersectionObserver' in root)) return;
    var io = null, armed = false, guard = 0;
    function done() {
      node.classList.remove('sc-wait'); node.classList.add('is-in');
      if (io && io.disconnect) io.disconnect();
      io = null;
      if (guard) root.clearTimeout(guard);
    }
    try {
      io = new root.IntersectionObserver(function (es) {
        var e = es[es.length - 1];
        if (e.isIntersecting || (e.boundingClientRect && e.boundingClientRect.top < 0)) { done(); return; }
        if (!armed) node.classList.add('sc-wait');
        armed = true;
      }, { threshold: 0.2 });
      io.observe(node);
    } catch (err) { io = null; return; }
    guard = root.setTimeout(done, SAFETY_MS);
    if (guard && typeof guard.unref === 'function') guard.unref();
  }

  // opts.view: { personal, modules } из MF.sceneView (по ответам мастера); без него схема-демонстрация.
  // opts.compact: уменьшенная статичная схема для плана (без цикла, документов и пакетов); opts.hidden: скрыта от чтеца (описание даёт обёртка).
  function buildScene(container, opts) {
    var o = opts || {};
    var view = o.view || { personal: false, modules: [] };
    var personal = !!view.personal, compact = !!o.compact;
    var mods = MF.MODULES || [];
    var titles = mods.map(function (m) { return MF.t('mod.' + m.id + '.title'); });
    var litIdx = [];
    mods.forEach(function (m, i) { if (view.modules.indexOf(m.id) >= 0) litIdx.push(i); });
    var attrs = { viewBox: compact ? '0 0 560 250' : '0 0 560 400', 'class': 'scene' + (compact ? ' scene-static' : '') };
    if (o.hidden) attrs['aria-hidden'] = 'true'; else { attrs.role = 'img'; attrs['aria-label'] = MF.sceneAria ? MF.sceneAria(view) : MF.t('scene.aria'); }
    var svg = s('svg', attrs);
    var route;
    if (personal && litIdx.length) {
      s('path', { 'class': 'sc-track sc-base', d: 'M105 66 H280 H455 V206 H280 H105' }, svg);
      route = s('path', { 'class': 'sc-track sc-active', d: routeThrough(litIdx) }, svg);
    } else {
      route = s('path', { 'class': 'sc-track', d: 'M105 66 H280 H455 V206 H280 H105' }, svg);
    }
    var nodes = NODE_POS.map(function (p, i) {
      var cls = 'sc-node' + (personal ? (litIdx.indexOf(i) >= 0 ? ' is-lit is-sel' : ' is-dim') : '');
      var g = s('g', { 'class': cls, style: '--i:' + i }, svg);
      s('rect', { x: p[0], y: p[1], width: 150, height: 64, rx: 10 }, g);
      s('circle', { 'class': 'sc-ring', cx: p[0] + 75, cy: p[1] + 32, r: 62 }, g);
      var no = s('text', { 'class': 'sc-no', x: p[0] + 16, y: p[1] + 20 }, g); no.textContent = '0' + (i + 1);
      var t = s('text', { x: p[0] + 16, y: p[1] + 46 }, g); t.textContent = titles[i] || '';
      return g;
    });
    if (compact) {
      container.appendChild(svg);
      watchEnter(svg);
      return svg;
    }
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
    var len = route.getTotalLength(), N = dots.length, pings = [];
    function clearPings() {
      pings.forEach(function (id) { root.clearTimeout(id); });
      pings = [];
      nodes.forEach(function (n) { n.classList.remove('is-ping'); });
    }
    // По ответам узлы горят всегда, а пакеты идут только по выбранным; в демонстрации узлы зажигаются по ходу пакета.
    function resetNodes() { if (!personal) nodes.forEach(function (n) { n.classList.remove('is-lit'); }); }
    function place(t) {
      dots.forEach(function (d, idx) {
        if (!len) { d.setAttribute('opacity', '0'); return; }
        var p = (t + idx / N) % 1, pt = route.getPointAtLength(p * len);
        d.setAttribute('cx', pt.x); d.setAttribute('cy', pt.y);
        d.setAttribute('opacity', (0.35 + 0.65 * Math.sin(Math.PI * p)).toFixed(2));
      });
      var head = t % 1, idx2 = Math.min(5, Math.floor(head * 6));
      if (!personal) {
        nodes.forEach(function (n, i) {
          if (i <= idx2 && !n.classList.contains('is-lit')) {
            n.classList.add('is-lit', 'is-ping');
            pings.push(root.setTimeout(function () { n.classList.remove('is-ping'); }, 900));
          }
        });
      }
      var on = Math.floor(head * 13);
      sheets.forEach(function (sh, i) { sh.classList.toggle('is-on', i < on); });
    }
    // Конечное состояние: модули зажжены (все или выбранные), документы собраны, пакеты стоят.
    function finalState() {
      clearPings();
      place(0.25);
      if (!personal) nodes.forEach(function (n) { n.classList.add('is-lit'); });
      sheets.forEach(function (sh) { sh.classList.add('is-on'); });
    }
    if (reduced()) { finalState(); return svg; }
    // Цикл стоит, пока сцена вне экрана, вкладка скрыта или пользователь нажал паузу; возвращается с того же места по времени.
    var t0 = root.performance.now(), cycle = 0, running = true, raf = 0, paused = userPaused;
    function tick(now) {
      raf = 0;
      if (svg.isConnected === false || !running || paused) return;
      var cyc = Math.floor((now - t0) / 9000);
      if (cyc !== cycle) { cycle = cyc; resetNodes(); }
      place(((now - t0) / 9000) % 1);
      raf = root.requestAnimationFrame(tick);
    }
    function stopLoop() {
      if (raf) { root.cancelAnimationFrame(raf); raf = 0; }
      clearPings();
    }
    function startLoop() { if (!raf && running && !paused && svg.isConnected !== false) raf = root.requestAnimationFrame(tick); }
    watchVisible(container, function (on) {
      running = on;
      if (on) startLoop(); else stopLoop();
    });
    onPause(container, function (p) {
      paused = p;
      if (p) { stopLoop(); finalState(); } else { t0 = root.performance.now(); cycle = 0; resetNodes(); startLoop(); }
    });
    if (paused) finalState(); else tick(t0);
    return svg;
  }

  /* ---------- поле частиц за заголовком ---------- */
  function mountField(canvas) {
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    var weak = weakDevice();
    var W = 0, H = 0, P = [], dpr = Math.min(root.devicePixelRatio || 1, 1.5), mx = -999, my = -999, rm = reduced();
    var running = true, paused = userPaused, rafId = 0;
    function size() {
      var r = canvas.getBoundingClientRect();
      W = r.width; H = r.height; canvas.width = Math.max(1, W * dpr); canvas.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = weak ? 25 : Math.round(Math.min(70, W * H / 16000)); P = [];
      for (var i = 0; i < n; i++) P.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, r: Math.random() * 1.4 + 0.6 });
    }
    // Один кадр; advance: двигать ли частицы (при паузе и reduced-motion кадр рисуется без сдвига).
    function draw(advance) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < P.length; i++) {
        var a = P[i];
        if (advance) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
          var dx = a.x - mx, dy = a.y - my, d = dx * dx + dy * dy;
          if (d < 9000) { a.x += dx * 0.004; a.y += dy * 0.004; }
        }
        ctx.fillStyle = 'rgba(255,106,43,.55)'; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill();
        if (weak) continue;
        for (var j = i + 1; j < P.length; j++) {
          var b = P[j], ex = a.x - b.x, ey = a.y - b.y, dd = ex * ex + ey * ey;
          if (dd < 12100) {
            ctx.strokeStyle = 'rgba(255,106,43,' + (0.16 * (1 - dd / 12100)).toFixed(3) + ')';
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
    }
    // Один цикл rAF: идентификатор хранится, второй не запускается, при остановке цикл отменяется.
    function frame() {
      rafId = 0;
      if (canvas.isConnected === false || !running || paused || rm) return;
      draw(true);
      rafId = root.requestAnimationFrame(frame);
    }
    function start() { if (!rafId && !rm && running && !paused && canvas.isConnected !== false) rafId = root.requestAnimationFrame(frame); }
    function stop() { if (rafId) { root.cancelAnimationFrame(rafId); rafId = 0; } }
    size(); draw(false); start();
    function onResize() {
      if (canvas.isConnected === false) { root.removeEventListener('resize', onResize); stop(); return; }
      size(); if (!rafId) draw(false);
    }
    root.addEventListener('resize', onResize);
    if (canvas.parentNode) canvas.parentNode.addEventListener('pointermove', function (e) { var r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    watchVisible(canvas.parentNode || canvas, function (on) { running = on; if (on) start(); else stop(); });
    onPause(canvas, function (p) { paused = p; if (p) { stop(); draw(false); } else start(); });
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
      // каскад: шаг 40 мс с потолком 0,3 с, без сброса на поздних словах
      sp.className = 'w'; sp.textContent = w; sp.style.animationDelay = Math.min(0.3, i * 0.04).toFixed(2) + 's';
      h1.appendChild(sp);
      if (i < words.length - 1) h1.appendChild(document.createTextNode(' '));
    });
  }
  function glow(scope) {
    [].forEach.call(scope.querySelectorAll('.result-card'), function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  MF.scene = { buildScene: buildScene, mountField: mountField, reveal: reveal, wordsIn: wordsIn, glow: glow, isPaused: isPaused, setPaused: setPaused, reduced: reduced, svg: s };
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
