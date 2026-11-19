/* Route Match demo: app shell (navigation, rendering, live feed). Fictional data, no network, no storage. */
(function (w) {
  'use strict';
  var d = w.document, RM = w.RM, t = function (k, v) { return w.MFI18N.t(k, v); }, e = RM.esc, UI = RM.ui, U = RM.U;
  var NAV = [
    { g: 'nav.g.work', m: ['leads', 'messages'] },
    { g: 'nav.g.net', m: ['routes', 'cities'] },
    { g: 'nav.g.logic', m: ['rules', 'templates'] },
    { g: 'nav.g.ctl', m: ['groups', 'analytics', 'journal', 'export', 'settings'] }
  ];
  var BOTTOM = ['leads', 'messages', 'routes'];
  var timer = null, onScreen = false, ready = false, toastT = null;
  U.mod = 'leads'; U.drawer = false;
  function $(id) { return d.getElementById(id); }
  function mobile() { return w.matchMedia('(max-width: 900px)').matches; }

  /* ---------- timer / live feed ---------- */
  RM.timer = function () {
    clearTimeout(timer);
    if (!onScreen || RM.S.paused || w.PF.reduced) return;
    timer = setTimeout(tick, RM.S.cfg.interval * 1000);
  };
  function tick() {
    RM.addMsg();
    var a = d.activeElement, typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $('rm-main').contains(a);
    if (typing) { renderChrome(); } else render();
    RM.timer();
  }

  /* ---------- chrome: nav, stats, bar ---------- */
  function counts() {
    var S = RM.S, c = { newLeads: 0, unread: 0, parsed: S.leads.length, fit: 0, acc: 0 };
    S.leads.forEach(function (l) { if (l.status === 'new') c.newLeads++; if (l.status !== 'rejected' && RM.klass(l) !== 'unrec') c.fit++; if (l.status === 'confirmed') c.acc++; });
    S.items.forEach(function (i) { if (i.unread) c.unread++; });
    return c;
  }
  function navBtn(m, cls, c) {
    var n = m === 'leads' ? c.newLeads : (m === 'messages' ? c.unread : 0);
    return '<button type="button" class="' + cls + '" data-nav="' + m + '" title="' + e(t('mod.' + m)) + '"' + (U.mod === m ? ' aria-current="page"' : '') + '>' + UI.svg(m, 20) + '<span>' + e(t('mod.' + m)) + '</span>' + (n ? '<em>' + n + '</em>' : '') + '</button>';
  }
  function renderChrome() {
    var c = counts(), S = RM.S;
    $('rm-stats').innerHTML = '<span class="rm-stat"><b>' + c.parsed + '</b>' + e(t('stat.parsed')) + '</span><span class="rm-stat"><b>' + c.fit + '</b>' + e(t('stat.fit')) + '</span><span class="rm-stat is-acc"><b>' + c.acc + '</b>' + e(t('stat.accepted')) + '</span>';
    $('rm-live').className = 'rm-live' + (S.paused ? ' is-off' : '');
    $('rm-live').innerHTML = '<i aria-hidden="true"></i><span>' + e(S.paused ? t('feed.paused') : t('feed.live')) + '</span>';
    var groups = NAV.map(function (g) { return '<p class="nav-g">' + e(t(g.g)) + '</p>' + g.m.map(function (m) { return navBtn(m, 'nav-i', c); }).join(''); }).join('');
    $('rm-side').innerHTML = groups;
    var more = '<button type="button" class="bn-i' + (BOTTOM.indexOf(U.mod) < 0 ? ' is-on' : '') + '" data-act="drawer" aria-expanded="' + U.drawer + '">' + UI.svg('M4 7h16M4 12h16M4 17h16', 20) + '<span>' + e(t('nav.more')) + '</span></button>';
    $('rm-bnav').innerHTML = BOTTOM.map(function (m) { return navBtn(m, 'bn-i', c); }).join('') + more;
    var dr = $('rm-drawer'); dr.hidden = !U.drawer;
    dr.innerHTML = '<div class="dr-in"><div class="dr-h"><strong>' + e(t('nav.modules')) + '</strong><button type="button" class="rm-mini" data-act="drawer">' + e(t('btn.close')) + '</button></div>' + groups + '</div>';
    $('rm-live-btn').textContent = S.paused ? t('feed.resume') : t('feed.pause');
  }

  /* ---------- render with scroll and focus keeping ---------- */
  function sel(el) {
    if (!el || !el.getAttribute) return null;
    var s = el.tagName.toLowerCase(), a = ['data-act', 'data-id', 'data-in', 'data-k', 'data-nav', 'data-r', 'data-s', 'name', 'data-i', 'data-p'], i, v;
    for (i = 0; i < a.length; i++) { v = el.getAttribute(a[i]); if (v !== null) s += '[' + a[i] + '="' + String(v).replace(/"/g, '\\"') + '"]'; }
    return s;
  }
  function render() {
    var main = $('rm-main'), act = d.activeElement;
    var keep = act && (main.contains(act) || $('rm-side').contains(act)) ? sel(act) : null;
    var sc = { main: main.scrollTop }, l = main.querySelector('.lst'), dt = main.querySelector('.md-det');
    if (l) sc.l = l.scrollTop;
    if (dt) sc.d = dt.scrollTop;
    var kind = main.getAttribute('data-mod');
    main.setAttribute('data-mod', U.mod);
    main.innerHTML = '<div class="mod mod-' + U.mod + '">' + RM.views[U.mod]() + '</div>';
    if (kind === U.mod) {
      main.scrollTop = sc.main;
      l = main.querySelector('.lst'); dt = main.querySelector('.md-det');
      if (l && sc.l !== undefined) l.scrollTop = sc.l;
      if (dt && sc.d !== undefined) dt.scrollTop = sc.d;
    } else { main.scrollTop = 0; }
    renderChrome();
    if (keep) { try { var n = d.querySelector('#rm ' + keep); if (n) n.focus({ preventScroll: true }); } catch (er) { /* ignore */ } }
    if (U.toast) { toast(U.toast); U.toast = ''; }
  }
  function toast(msg) {
    var el = $('rm-toast'); el.textContent = msg; el.className = 'toast is-on';
    clearTimeout(toastT); toastT = setTimeout(function () { el.className = 'toast'; }, 2600);
  }
  RM.go = function (m) { U.mod = m; U.drawer = false; };

  /* ---------- events ---------- */
  function bind() {
    var root = $('rm');
    root.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('button') : null;
      if (!b || !root.contains(b)) return;
      var v;
      if ((v = b.getAttribute('data-nav'))) { RM.go(v); render(); if (mobile()) $('rm-main').scrollTop = 0; return; }
      if (b.id === 'rm-live-btn') { RM.S.paused = !RM.S.paused; RM.log('system', RM.S.paused ? 'lg.col.stop' : 'lg.col.start', {}, RM.S.paused ? 'warn' : 'info'); RM.timer(); render(); return; }
      if ((v = b.getAttribute('data-act'))) {
        if (v === 'drawer') { U.drawer = !U.drawer; renderChrome(); return; }
        if (RM.acts[v]) { RM.acts[v](b, ev); render(); }
      }
    });
    function onIn(type) {
      return function (ev) {
        var el = ev.target.closest ? ev.target.closest('[data-in]') : null;
        if (!el || !root.contains(el)) return;
        if (type === 'input' && (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'time')) return;
        var fn = RM.ins[el.getAttribute('data-in')]; if (!fn) return;
        if (fn(el, ev, type) !== true) render();
      };
    }
    root.addEventListener('input', onIn('input'));
    root.addEventListener('change', onIn('change'));
    root.addEventListener('submit', function (ev) {
      var f = ev.target.closest ? ev.target.closest('form[data-form]') : null; if (!f) return;
      ev.preventDefault();
      var fn = RM.forms[f.getAttribute('data-form')];
      if (fn && fn(f) !== true) render();
    });
    root.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && U.drawer) { U.drawer = false; renderChrome(); } });
    /* links from the page: open a module in the demo */
    d.addEventListener('click', function (ev) {
      var a = ev.target.closest ? ev.target.closest('[data-open]') : null; if (!a) return;
      var m = a.getAttribute('data-open'); if (!RM.views[m]) return;
      RM.go(m); render();
      var dm = $('demo'); if (dm) dm.scrollIntoView({ behavior: w.PF.reduced ? 'auto' : 'smooth' });
      ev.preventDefault();
    });
  }

  /* ---------- init ---------- */
  function seed() {
    var n = w.PF.reduced ? 16 : 7, i;
    for (i = 0; i < n; i++) RM.addMsg();
    RM.S.items.forEach(function (x) { x.unread = false; });
    var first = RM.S.leads[RM.S.leads.length - 1]; U.leads.sel = first ? first.id : null;
    var lastMsg = RM.S.items.filter(function (x) { return x.state === 'lead'; })[0]; U.msg.sel = lastMsg ? lastMsg.uid : null;
    RM.S.paused = false;
  }
  RM.restart = function () {
    RM.reset(); RM.S.leads = []; RM.S.items = [];
    U.leads.sel = null; U.leads.tab = 'new'; U.leads.detail = false; U.msg.sel = null; U.msg.detail = false; U.rt.sel = 'r1'; U.rt.detail = false;
    seed(); RM.timer();
  };
  function langChanged() {
    d.title = t('doc.title');
    var md = d.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', t('doc.desc'));
    if (ready) render();
  }
  function start() {
    if (!$('rm')) return;
    RM.reset(); seed(); bind(); ready = true; render();
    w.PF.onScreen($('rm'), function () { onScreen = true; RM.timer(); }, function () { onScreen = false; clearTimeout(timer); });
    langChanged();
  }
  w.MFI18N.onChange(function () { if (!ready) start(); else langChanged(); });
}(window));
