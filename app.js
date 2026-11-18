/* Molxo Flow, вариант D «3D-пространство окон»: прогресс скролла, подписи, запасной вид, секции ниже. Данные вымышлены.
   Все тексты из словарей MFI18N; секции и подписи перестраиваются при смене языка без перезагрузки. */
(function () {
  'use strict';
  var doc = document;
  var I = window.MFI18N;
  function t(k, v) { return I.t(k, v); }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MX = window.MX = { p: 0, reduce: reduce, ready: false, mode: 'init' };

  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) { e.className = cls; } if (text != null) { e.textContent = text; } return e; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sstep(a, b, v) { v = clamp((v - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); }
  function portrait() { return window.innerWidth / window.innerHeight < 0.9; }

  /* ---------- прогресс скролла и подписи ---------- */
  var journey = doc.getElementById('journey');
  var hero = doc.getElementById('hero');
  var cap = doc.getElementById('caption');
  var capN = doc.getElementById('capN'), capT = doc.getElementById('capT'), capS = doc.getElementById('capS');
  var railEl = doc.getElementById('rail');
  var rail = railEl.children;
  var STAGES = [
    { a: 0.07, b: 0.32 },
    { a: 0.32, b: 0.58 },
    { a: 0.58, b: 0.8 },
    { a: 0.8, b: 1.01 }
  ];
  var curStage = -1;
  function readProgress() {
    var h = journey.offsetHeight - window.innerHeight;
    var y = window.pageYOffset || 0;
    var top = journey.getBoundingClientRect().top + y;
    MX.p = h > 0 ? clamp((y - top) / h, 0, 1) : 0;
    var p = MX.p, i, st = -1;
    hero.style.opacity = String(1 - sstep(0.015, 0.07, p));
    hero.style.visibility = p > 0.08 ? 'hidden' : 'visible';
    for (i = 0; i < STAGES.length; i++) { if (p >= STAGES[i].a && p < STAGES[i].b) { st = i; } }
    var inJ = y < top + journey.offsetHeight - window.innerHeight * 0.6;
    cap.classList.toggle('on', st >= 0 && inJ);
    railEl.classList.toggle('on', p > 0.05 && inJ);
    if (st !== curStage) {
      curStage = st;
      if (st >= 0) { capN.textContent = String(st + 1); capT.textContent = t('stage.' + (st + 1) + '.t'); capS.textContent = t('stage.' + (st + 1) + '.s'); }
      for (i = 0; i < rail.length; i++) { rail[i].className = i === st ? 'cur' : (i < st ? 'done' : ''); }
    }
    if (MX.onScroll) { MX.onScroll(p); }
  }
  var queued = false;
  function onScroll() { if (!queued) { queued = true; window.requestAnimationFrame(function () { queued = false; readProgress(); }); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('orientationchange', function () { window.setTimeout(onScroll, 250); });
  readProgress();

  /* ---------- запасной вид без WebGL: CSS-стопка окон ---------- */
  var fbRepaint = null;
  MX.fallback = function () {
    if (MX.mode === 'fallback' || MX.mode === 'webgl') { return; }
    MX.mode = 'fallback';
    doc.getElementById('stage').style.display = 'none';
    doc.documentElement.classList.add('no3d');
    var fb = doc.getElementById('fallback');
    var items = [], world = el('div', 'fb-world'), built = null;
    fb.appendChild(world);
    function unit() { return portrait() ? 88 : 190; }
    function build() {
      var U = unit(), pt = portrait();
      if (built === pt + ':' + U) { return; }
      built = pt + ':' + U;
      world.textContent = ''; items = [];
      window.MXW.setMode(pt);
      window.MXW.list.forEach(function (d) {
        var c = doc.createElement('canvas');
        c.width = d.W; c.height = d.H;
        c.className = 'fb-win';
        c.style.width = (d.ww * U) + 'px'; c.style.height = (d.wh * U) + 'px';
        c.style.marginLeft = (-d.ww * U / 2) + 'px'; c.style.marginTop = (-d.wh * U / 2) + 'px';
        c.style.transform = 'translate3d(' + (d.pos[0] * U) + 'px,' + (-d.pos[1] * U) + 'px,' + (d.pos[2] * U) + 'px) rotateY(' + (-d.ry) + 'rad)';
        world.appendChild(c);
        window.MXW.paint(c, d, window.MXW.FIN, 1);
        items.push({ d: d, c: c, last: 0 });
      });
    }
    build();
    fbRepaint = function () { build(); items.forEach(function (it) { window.MXW.paint(it.c, it.d, window.MXW.FIN, 1); }); };
    var cur = MX.p, t0 = performance.now(), vis = true, raf = 0;
    function pose(p) { return MX.pose ? MX.pose(p) : { x: 0, y: 0, z: 7.4 - p * 25.6 }; }
    function place() {
      var U = unit(), ps = pose(cur), k = 1 - sstep(0, 0.11, cur);
      fb.style.transform = portrait() ? 'translateY(' + (k * 36) + 'vh)' : 'translateX(' + (k * 19) + 'vw)';
      world.style.transform = 'translate3d(' + (-ps.x * U) + 'px,' + (ps.y * U) + 'px,' + (-ps.z * U) + 'px)';
      items.forEach(function (it) {
        var dist = ps.z - it.d.pos[2];
        it.c.style.opacity = String(clamp(dist / 1.8, 0, 1) * (1 - sstep(11, 18, dist) * 0.85));
      });
    }
    function frame(now) {
      raf = 0;
      cur += (MX.p - cur) * (reduce ? 1 : 0.1);
      place();
      if (reduce || !vis) { return; }
      items.forEach(function (it) {
        var dist = pose(cur).z - it.d.pos[2];
        if (dist > 0 && dist < 11 && now - it.last > 90) { it.last = now; window.MXW.paint(it.c, it.d, now - t0, 1); }
      });
      raf = window.requestAnimationFrame(frame);
    }
    MX.onScroll = function () { if (!raf) { raf = window.requestAnimationFrame(frame); } };
    window.addEventListener('resize', function () { fbRepaint(); MX.onScroll(); });
    doc.addEventListener('visibilitychange', function () { vis = !doc.hidden; if (vis && !raf) { raf = window.requestAnimationFrame(frame); } });
    frame(performance.now());
  };
  if (location.search.indexOf('no3d') >= 0) { window.addEventListener('load', function () { MX.fallback(); }); }
  window.setTimeout(function () { if (!MX.ready && MX.mode === 'init') { MX.fallback(); } }, 6000);

  /* ---------- «Вашу боль разберём» ---------- */
  var NPAIN = 5;
  var chipsBox = doc.getElementById('chips'), live = doc.getElementById('live'), timers = [], curPain = 0;
  function clearT() { timers.forEach(function (x) { window.clearTimeout(x); }); timers = []; }
  function renderLive(i, animate) {
    var n = i + 1, left = el('div', 'lv-in'), right = el('div', 'lv-out'), rows = [], k;
    clearT();
    live.textContent = '';
    left.appendChild(el('span', 'lv-lab', t('pain.lab.in')));
    var card = el('div', 'lv-card');
    card.appendChild(el('span', 'k-chip', t('pain.' + n + '.ch')));
    card.appendChild(el('p', 'lv-msg', t('pain.' + n + '.msg')));
    left.appendChild(card);
    right.appendChild(el('span', 'lv-lab', t('pain.lab.out')));
    for (k = 1; k <= 4; k++) {
      var r = el('div', 'lv-row'); r.appendChild(el('i', 'lv-ic')); r.appendChild(el('span', '', t('pain.' + n + '.a' + k)));
      right.appendChild(r); rows.push(r);
      if (!animate) { r.classList.add('on'); }
    }
    live.appendChild(left); live.appendChild(right);
    live.appendChild(el('span', 'k-demo', t('demo')));
    if (animate) {
      rows.forEach(function (rw, kk) {
        timers.push(window.setTimeout(function () { rw.classList.add('on'); }, 500 + kk * 750));
      });
    }
  }
  function buildChips() {
    var i;
    chipsBox.textContent = '';
    for (i = 0; i < NPAIN; i++) {
      (function (idx) {
        var b = el('button', 'chip', t('pain.' + (idx + 1) + '.chip'));
        b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', idx === curPain ? 'true' : 'false');
        b.addEventListener('click', function () {
          curPain = idx;
          Array.prototype.forEach.call(chipsBox.children, function (c, k) { c.setAttribute('aria-checked', k === idx ? 'true' : 'false'); });
          renderLive(idx, !reduce);
        });
        chipsBox.appendChild(b);
      }(i));
    }
  }
  if ('IntersectionObserver' in window && !reduce) {
    var seen = false;
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && !seen) { seen = true; renderLive(curPain, true); }
    }, { threshold: 0.3 }).observe(live);
  }

  /* ---------- живые мини-кадры: общий движок стадий ----------
     Корень .anim хранит стадию s; узлы с data-at / data-to получают класс .on, когда at <= s < to.
     Начальная стадия максимальная (кадр полный), цикл идёт только пока корень на экране (.play).
     Узлы с data-at="0" всегда видны, поэтому блок не бывает пустым ни в один момент цикла. */
  var stageRoots = [];
  function nd(tag, cls, text, at, to) {
    var e = el(tag, cls, text);
    if (at != null) { e.setAttribute('data-at', String(at)); }
    if (to != null) { e.setAttribute('data-to', String(to)); }
    return e;
  }
  function root(base, kind, max, hold) {
    var r = el('div', base + ' anim ' + base + '-' + kind);
    r.setAttribute('data-max', String(max)); r.setAttribute('data-hold', String(hold));
    r._tick = 0;
    stageRoots.push(r);
    return r;
  }
  function setStage(r, s) {
    var ns = r._nodes, i, a, b;
    if (!ns) { ns = r._nodes = r.querySelectorAll('[data-at]'); }
    for (i = 0; i < ns.length; i++) {
      a = +ns[i].getAttribute('data-at');
      b = ns[i].hasAttribute('data-to') ? +ns[i].getAttribute('data-to') : 1e9;
      ns[i].classList.toggle('on', s >= a && s < b);
    }
    r.setAttribute('data-s', String(s));
  }
  function stageAll() {
    stageRoots = stageRoots.filter(function (r) { return doc.documentElement.contains(r); });
    stageRoots.forEach(function (r) { setStage(r, +r.getAttribute('data-max')); });
  }
  var stageTimer = 0;
  function stageStep() {
    stageRoots.forEach(function (r) {
      if (!r.classList.contains('play')) { return; }
      var mx = +r.getAttribute('data-max'), hd = +r.getAttribute('data-hold');
      r._tick++;
      setStage(r, Math.min(r._tick % (mx + hd), mx));
    });
  }
  function startStages() {
    if (reduce || stageTimer) { return; }
    stageTimer = window.setInterval(stageStep, 900);
  }

  /* ---------- Как мы работаем: четыре живых кадра ---------- */
  function miniOpt(r, key, at, to) {
    var o = nd('div', 'mopt', null, at, to);
    o.appendChild(el('i', 'mbox')); o.appendChild(el('span', '', t(key)));
    r.appendChild(o);
  }
  function miniKind(n) {
    var m, body, i, row, cell;
    if (n === 1) {
      m = root('mini', 'ask', 4, 3);
      body = el('div', 'mini-body');
      var q = el('div', 'mq'); q.appendChild(el('span', 'mono', t('mini.1.q')));
      var pb = el('div', 'mprog'); pb.appendChild(el('i')); q.appendChild(pb); body.appendChild(q);
      body.appendChild(el('p', 'mask', t('mini.1.t')));
      miniOpt(body, 'mini.1.o1'); miniOpt(body, 'mini.1.o2', 1); miniOpt(body, 'mini.1.o3'); miniOpt(body, 'mini.1.o4', 3);
    } else if (n === 2) {
      m = root('mini', 'flow', 4, 3);
      body = el('div', 'mini-body');
      var n1 = nd('div', 'mnode', t('mini.2.n1'), 0, 1), n2 = nd('div', 'mnode', t('mini.2.n2'), 1, 3), n3 = nd('div', 'mnode mn-3', t('mini.2.n3'), 3);
      var tags = el('div', 'mtags');
      tags.appendChild(nd('span', 'mtag warn', t('mini.2.w'), 1, 3));
      tags.appendChild(nd('span', 'mtag good', t('mini.2.ok'), 3));
      body.appendChild(n1); body.appendChild(el('i', 'marr')); body.appendChild(n2); body.appendChild(tags); body.appendChild(el('i', 'marr')); body.appendChild(n3);
    } else if (n === 3) {
      m = root('mini', 'build', 5, 3);
      body = el('div', 'mini-body');
      [[1, 0, 1], [2, 1, 3], [3, 3, 5]].forEach(function (b) {
        row = el('div', 'mrow3');
        row.appendChild(el('b', '', t('mini.3.e' + b[0])));
        cell = el('span', 'mstat');
        cell.appendChild(nd('em', 'q', t('mini.3.q'), 0, b[1] > 0 ? b[1] : 0));
        cell.appendChild(nd('em', 'w', t('mini.3.wip'), b[1], b[2]));
        cell.appendChild(nd('em', 'd', t('mini.3.r' + b[0]), b[2]));
        row.appendChild(cell);
        var bar = el('div', 'mbar'); bar.appendChild(nd('i', '', null, b[1])); row.appendChild(bar);
        var done = nd('i', 'mdone', null, b[2]); row.appendChild(done);
        body.appendChild(row);
      });
    } else {
      m = root('mini', 'live', 3, 3);
      body = el('div', 'mini-body');
      var hd = el('div', 'mlive'); hd.appendChild(el('i')); hd.appendChild(el('span', '', t('mini.4.live'))); body.appendChild(hd);
      [['10:42', 1], ['10:42', 2], ['10:43', 3]].forEach(function (r, k) {
        row = nd('div', 'mlog', null, k === 0 ? 0 : k);
        row.appendChild(el('em', '', r[0])); row.appendChild(el('span', '', t('mini.4.r' + (k + 1))));
        row.appendChild(el('i', 'mdone'));
        body.appendChild(row);
      });
    }
    var bar2 = el('div', 'mini-bar'); bar2.appendChild(el('span', 'dots')); bar2.appendChild(el('b', '', t('mini.' + n + '.title')));
    m.appendChild(bar2); m.appendChild(body);
    m.appendChild(el('span', 'k-demo', t('demo')));
    return m;
  }
  var stepsBox = doc.getElementById('steps');
  function buildSteps() {
    stepsBox.textContent = '';
    var n, li;
    for (n = 1; n <= 4; n++) {
      li = el('li', 'step');
      li.appendChild(el('span', 'num', '0' + n));
      li.appendChild(el('h3', '', t('how.' + n + '.t')));
      li.appendChild(el('p', '', t('how.' + n + '.s')));
      li.appendChild(miniKind(n));
      stepsBox.appendChild(li);
    }
  }

  /* ---------- Что делаем: пять живых виньеток с настоящим содержимым ---------- */
  function avatar(ch, cls) { return el('i', 'vav' + (cls ? ' ' + cls : ''), ch); }
  function browserBar(url) {
    var b = el('div', 'vbar'); b.appendChild(el('span', 'vdots')); b.appendChild(el('span', 'vurl', url)); return b;
  }
  function bubbleRow(side, text, at, typingAt) {
    var r = el('div', 'vrow ' + side);
    if (typingAt != null) {
      var ty = nd('div', 'vb ' + side + ' typing', null, typingAt, at);
      ty.appendChild(el('i')); ty.appendChild(el('i')); ty.appendChild(el('i')); r.appendChild(ty);
    }
    r.appendChild(nd('div', 'vb ' + side + ' vmsg', text, at));
    return r;
  }
  function V(kind) {
    var v, i;
    if (kind === 'agent') {
      v = root('vg', 'agent', 6, 3);
      var chat = el('div', 'vchat'), hd = el('div', 'vhead');
      hd.appendChild(avatar(t('sc.1.name').charAt(0)));
      var nm = el('div', 'vname'); nm.appendChild(el('b', '', t('sc.1.name'))); nm.appendChild(el('span', '', t('chat.online'))); hd.appendChild(nm);
      chat.appendChild(hd);
      var msgs = el('div', 'vmsgs');
      msgs.appendChild(bubbleRow('in', t('vg.agent.in'), 0));
      msgs.appendChild(bubbleRow('out', t('vg.agent.out'), 2, 1));
      msgs.appendChild(bubbleRow('in', t('vg.agent.in2'), 3));
      msgs.appendChild(bubbleRow('out', t('vg.agent.out2'), 5, 4));
      chat.appendChild(msgs);
      v.appendChild(chat);
      var feed = el('div', 'vfeed');
      feed.appendChild(el('span', 'vlab', t('agent.feed')));
      [1, 2, 3, 5].forEach(function (at, k) {
        var r = nd('div', 'vfr', null, at);
        r.appendChild(el('i', 'vtick')); r.appendChild(el('span', '', t('vg.agent.f' + (k + 1))));
        feed.appendChild(r);
      });
      v.appendChild(feed);
    } else if (kind === 'bot') {
      v = root('vg', 'bot', 4, 3);
      var bh = el('div', 'vhead'); bh.appendChild(avatar('S', 'vav-b'));
      var bn = el('div', 'vname'); bn.appendChild(el('b', '', t('vg.bot.name'))); bn.appendChild(el('span', '', 'bot')); bh.appendChild(bn);
      v.appendChild(bh);
      var bm = el('div', 'vmsgs');
      bm.appendChild(bubbleRow('bot', t('vg.bot.q'), 0));
      var keys = el('div', 'vbtn');
      ['vg.bot.b1', 'vg.bot.b2', 'vg.bot.b3'].forEach(function (s, k) { keys.appendChild(k === 1 ? nd('span', 'vkey', t(s), 2) : el('span', 'vkey', t(s))); });
      bm.appendChild(keys);
      bm.appendChild(bubbleRow('bot', t('vg.bot.r'), 4, 3));
      v.appendChild(bm);
    } else if (kind === 'crm') {
      v = root('vg', 'crm', 4, 3);
      var bd = el('div', 'vboard');
      ['crm.c1', 'crm.c2'].forEach(function (k, c) {
        var col = el('div', 'vcol'); col.style.setProperty('--c', String(c));
        col.appendChild(el('b', '', t(k)));
        bd.appendChild(col);
      });
      function card(n, c, r, at, mv) {
        var k = nd('div', 'vcard' + (mv ? ' ' + mv : ''), null, at);
        k.style.setProperty('--c', String(c)); k.style.setProperty('--r', String(r));
        k.appendChild(el('b', '', t('vg.crm.k' + n + 't'))); k.appendChild(el('span', '', t('vg.crm.k' + n + 's')));
        return k;
      }
      var c1 = card(1, 0, 0, 2, 'vc-new'); c1.className += ' vc-mv';
      bd.appendChild(c1);
      var c2 = card(2, 0, 1, 2); c2.className += ' vc-up';
      bd.appendChild(c2);
      bd.appendChild(card(3, 1, 0, 0));
      v.appendChild(bd);
      v.appendChild(nd('div', 'vtoast', t('crm.created'), 1, 3));
    } else if (kind === 'parser') {
      v = root('vg', 'parser', 3, 3);
      var pg = el('div', 'vpage'); pg.appendChild(browserBar(t('vg.parser.url')));
      var grid = el('div', 'vprods');
      for (i = 1; i <= 4; i++) {
        var pr = t('vg.parser.r' + i).split('|'), p = nd('div', 'vpr', null, i - 1, i);
        p.appendChild(el('i', 'vthumb')); var pt = el('div', 'vptx'); pt.appendChild(el('b', '', pr[0])); pt.appendChild(el('span', '', pr[1])); p.appendChild(pt);
        grid.appendChild(p);
      }
      pg.appendChild(grid); v.appendChild(pg);
      var tb = el('div', 'vtable'), hr = el('div', 'vtr vth');
      ['vg.parser.f1', 'vg.parser.f2', 'vg.parser.f3'].forEach(function (s) { hr.appendChild(el('span', '', t(s))); });
      tb.appendChild(hr);
      for (i = 1; i <= 4; i++) {
        var cs = t('vg.parser.r' + i).split('|'), tr = nd('div', 'vtr', null, i - 1);
        cs.forEach(function (x, k) { tr.appendChild(el('span', k === 2 ? (i === 3 ? 'no' : 'yes') : '', x)); });
        tb.appendChild(tr);
      }
      v.appendChild(tb);
    } else {
      v = root('vg', 'site', 6, 3);
      var fm = el('div', 'vsite'); fm.appendChild(browserBar(t('vg.site.url')));
      var fb = el('div', 'vform'); fb.appendChild(el('b', 'vft', t('vg.site.title')));
      [1, 2, 3].forEach(function (k) {
        var f = el('div', 'vfld'); f.appendChild(el('span', 'vfl', t('vg.site.l' + k)));
        var inp = el('div', 'vin'); inp.appendChild(nd('span', 'vval', t('vg.site.v' + k), k)); f.appendChild(inp);
        fb.appendChild(f);
      });
      fb.appendChild(nd('span', 'vsend', t('vg.site.send'), 4, 5));
      fm.appendChild(fb); v.appendChild(fm);
      v.appendChild(nd('div', 'vtoast', t('vg.site.toast'), 5));
    }
    v.appendChild(el('span', 'k-demo', t('demo')));
    return v;
  }
  var PRODS = ['agent', 'bot', 'crm', 'parser', 'site'];
  var prodsBox = doc.getElementById('prods');
  function buildProds() {
    prodsBox.textContent = '';
    PRODS.forEach(function (kind, i) {
      var li = el('li', 'prod');
      li.appendChild(V(kind));
      li.appendChild(el('h3', '', t('prod.' + (i + 1) + '.t')));
      li.appendChild(el('p', '', t('prod.' + (i + 1) + '.d')));
      prodsBox.appendChild(li);
    });
  }
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('play', e.isIntersecting && !doc.hidden); });
    }, { rootMargin: '40px' });
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) { Array.prototype.forEach.call(doc.querySelectorAll('.play'), function (n) { n.classList.remove('play'); }); }
    });
  }
  function observeAnim() {
    stageAll();
    var anim = doc.querySelectorAll('.anim');
    if (io) { io.disconnect(); }
    Array.prototype.forEach.call(anim, function (n) { if (io && !reduce) { io.observe(n); } else if (!reduce) { n.classList.add('play'); } });
    startStages();
  }

  /* ---------- кинетическая типографика ---------- */
  function words(node) {
    var parts = node.textContent.split(/\s+/), n = 0;
    node.setAttribute('aria-label', node.textContent);
    node.textContent = '';
    parts.forEach(function (wd) {
      if (!wd) { return; }
      var s = el('span', 'w'), i = el('i', '', wd);
      i.style.setProperty('--n', String(n++)); i.setAttribute('aria-hidden', 'true');
      s.appendChild(i); node.appendChild(s); node.appendChild(doc.createTextNode(' '));
    });
  }
  var hio = null, hioStarted = false;
  function kinetic() {
    var hs = doc.querySelectorAll('.hero h1, .blk h2');
    if (reduce) { return; }
    Array.prototype.forEach.call(hs, words);
    if (!hioStarted) {
      hioStarted = true;
      var h2s = doc.querySelectorAll('.blk h2');
      if ('IntersectionObserver' in window) {
        hio = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); hio.unobserve(e.target); } });
        }, { threshold: 0.4 });
        Array.prototype.forEach.call(h2s, function (h) { hio.observe(h); });
      } else { Array.prototype.forEach.call(h2s, function (h) { h.classList.add('in'); }); }
    }
  }

  /* ---------- видеопетля: файл по языку, играет только на экране ---------- */
  var vid = doc.getElementById('reelVid'), vsrc = doc.getElementById('reelSrc');
  var vvis = false, vlang = '';
  function syncVid() {
    if (!vid) { return; }
    var go = vvis && !doc.hidden && !reduce;
    if (go) { var pr = vid.play(); if (pr && pr.catch) { pr.catch(function () {}); } } else { vid.pause(); }
  }
  function setReel() {
    if (!vid) { return; }
    var L = I.lang();
    if (L === vlang) { return; }
    vlang = L;
    vid.poster = 'assets/reel-poster.' + L + '.jpg';
    vsrc.setAttribute('src', 'assets/reel.' + L + '.mp4');
    vid.load();
    syncVid();
  }
  if (vid && !reduce && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { vvis = es[0].isIntersecting; if (vvis) { vid.preload = 'auto'; } syncVid(); }, { threshold: 0.25 }).observe(vid);
    doc.addEventListener('visibilitychange', syncVid);
  }

  /* ---------- Что получите: три настоящих превью документов ---------- */
  var docsBox = doc.getElementById('docs'), tzTimer = 0, tzPause = 0;
  function dhead(title, tag) {
    var h = el('div', 'dp-head');
    h.appendChild(el('i', 'dp-ic')); h.appendChild(el('b', '', title)); h.appendChild(el('em', '', tag));
    return h;
  }
  function smod(key, at, to) {
    var m = nd('div', 'smod', null, at, to);
    m.appendChild(el('b', '', t('scheme.' + key))); m.appendChild(el('span', '', t('scheme.' + key + '.s')));
    return m;
  }
  function schemePaper() {
    var p = root('dpaper', 'scheme', 4, 2), g = el('div', 'sgrid'), c = [];
    p.appendChild(dhead(t('doc.scheme.t'), 'v1'));
    function arr(dir) { return el('i', 'sarr ' + dir); }
    c = [
      smod('ch', 0, 1), arr('r'), smod('ag', 1, 2), arr('r'), smod('crm', 3, 4),
      null, null, arr('u'), null, arr('d'),
      null, null, smod('kb', 2, 3), null, smod('nt', 4)
    ];
    c.forEach(function (x) { g.appendChild(x || el('span', 'sgap')); });
    p.appendChild(g);
    return p;
  }
  function calcPaper() {
    var p = root('dpaper', 'calc', 3, 2), tb = el('div', 'ctab'), r, k, row;
    p.appendChild(dhead(t('doc.calc.t'), 'v1'));
    r = el('div', 'ctr cth');
    ['calc.h1', 'calc.h2', 'calc.h3'].forEach(function (s) { r.appendChild(el('span', '', t(s))); });
    tb.appendChild(r);
    for (k = 1; k <= 4; k++) {
      row = nd('div', 'ctr', null, k - 1, k);
      row.appendChild(el('span', 'cm', t('calc.' + k + '.m')));
      row.appendChild(el('span', 'cb', t('calc.' + k + '.b')));
      row.appendChild(el('span', 'ca', t('calc.' + k + '.a')));
      tb.appendChild(row);
    }
    p.appendChild(tb);
    p.appendChild(el('p', 'cnote', t('calc.note')));
    return p;
  }
  function tzBlock() {
    var wrap = el('div', 'tzw'), left = el('div', 'tzl'), grid = el('div', 'tzg'), tiles = [], cur = 0, i;
    var pv = root('dpaper', 'tz', 0, 1), body = el('div', 'tzc');
    pv.setAttribute('aria-live', 'off');
    var head = dhead('', 'md'), htitle = head.querySelector('b');
    var count = el('p', 'tzn mono');
    var ul = el('ul', 'tzu');
    pv.appendChild(head); pv.appendChild(count); pv.appendChild(ul);
    function nn(i) { return (i < 10 ? '0' : '') + i; }
    function show(k, byUser) {
      cur = k;
      tiles.forEach(function (b, j) { b.classList.toggle('on', j === k); b.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
      htitle.textContent = nn(k + 1) + ' ' + t('tz.n' + (k + 1));
      count.textContent = t('tz.count', { n: k + 1 });
      ul.textContent = '';
      [1, 2, 3].forEach(function (j) { ul.appendChild(el('li', '', t('tz.' + (k + 1) + '.l' + j))); });
      pv.classList.remove('swap'); void pv.offsetWidth; pv.classList.add('swap');
      if (byUser) { tzPause = Date.now() + 7000; }
    }
    for (i = 1; i <= 12; i++) {
      (function (k) {
        var b = el('button', 'tzf');
        b.type = 'button';
        b.appendChild(el('i', 'tzi')); b.appendChild(el('em', '', nn(k + 1))); b.appendChild(el('span', '', t('tz.n' + (k + 1))));
        b.addEventListener('mouseenter', function () { show(k, true); });
        b.addEventListener('focus', function () { show(k, true); });
        b.addEventListener('click', function () { show(k, true); });
        tiles.push(b); grid.appendChild(b);
      }(i - 1));
    }
    left.appendChild(el('h3', '', t('doc.tz.t'))); left.appendChild(el('p', '', t('doc.tz.d')));
    left.appendChild(grid); left.appendChild(el('p', 'tzh mono', t('tz.hint')));
    wrap.appendChild(left); wrap.appendChild(pv);
    show(0, false);
    if (!reduce) {
      tzTimer = window.setInterval(function () {
        if (!pv.classList.contains('play') || Date.now() < tzPause || doc.hidden) { return; }
        show((cur + 1) % 12, false);
      }, 3200);
    }
    return wrap;
  }
  function buildDocs() {
    if (tzTimer) { window.clearInterval(tzTimer); tzTimer = 0; }
    docsBox.textContent = '';
    var a1 = el('div', 'dcard'), a2 = el('div', 'dcard'), a3 = el('div', 'dcard dc-tz');
    a1.appendChild(schemePaper()); a1.appendChild(el('h3', '', t('doc.scheme.t'))); a1.appendChild(el('p', '', t('doc.scheme.d')));
    a2.appendChild(calcPaper()); a2.appendChild(el('h3', '', t('doc.calc.t'))); a2.appendChild(el('p', '', t('doc.calc.d')));
    a3.appendChild(tzBlock());
    docsBox.appendChild(a1); docsBox.appendChild(a2); docsBox.appendChild(a3);
    docsBox.appendChild(el('span', 'k-demo', t('demo')));
  }

  /* ---------- сборка и пересборка при смене языка ---------- */
  var pending = null;
  I.onChange(function () {
    buildChips();
    renderLive(curPain, false);
    buildSteps();
    buildProds();
    buildDocs();
    observeAnim();
    kinetic();
    setReel();
    curStage = -2;
    readProgress();
    if (fbRepaint) { fbRepaint(); }
    pending = null;
  });
}());
