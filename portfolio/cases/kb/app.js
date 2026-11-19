/* Knowledge Agent demo: application shell (navigation, rendering, events). Fictional data, no network, no storage. */
(function (w) {
  'use strict';
  var d = w.document, KB = w.KB, t = KB.t, e = KB.esc, UI = KB.ui, U = KB.U;
  var BOTTOM = ['chat', 'dialogs', 'sources'];
  var ready = false, toastT = null;
  U.mod = 'chat'; U.drawer = false; U.toast = '';
  function $(id) { return d.getElementById(id); }
  function mobile() { return w.matchMedia('(max-width: 900px)').matches; }

  function badges() {
    var S = KB.S;
    return {
      dialogs: S.dialogs.filter(function (x) { return x.st === 'wait'; }).length,
      unanswered: KB.unanswered().length,
      conflicts: S.conflicts.filter(function (k) { return k.st === 'open'; }).length + S.sources.filter(function (s) { return KB.stale(s) && s.on; }).length
    };
  }
  function navBtn(m, cls, b) {
    var n = b[m] || 0, lock = !KB.can(m);
    return '<button type="button" class="' + cls + (lock ? ' is-lock' : '') + '" data-nav="' + m + '" title="' + e(t('mod.' + m)) + '"' + (U.mod === m ? ' aria-current="page"' : '') + '>' + UI.svg(lock ? 'lock' : m, 20) + '<span>' + e(t('mod.' + m)) + '</span>' + (n && !lock ? '<em>' + n + '</em>' : '') + '</button>';
  }
  function renderChrome() {
    var S = KB.S, b = badges(), active = S.sources.filter(function (s) { return s.on; }).length, frags = S.chunks.filter(function (c) { return c.on; }).length;
    $('kb-stats').innerHTML = '<span class="rm-stat"><b>' + active + '</b>' + e(t('stat.sources')) + '</span><span class="rm-stat"><b>' + frags + '</b>' + e(t('stat.frags')) + '</span><span class="rm-stat' + (b.unanswered ? ' is-warn' : '') + '"><b>' + b.unanswered + '</b>' + e(t('stat.unans')) + '</span>';
    var groups = KB.NAV.map(function (g) { return '<p class="nav-g">' + e(t(g.g)) + '</p>' + g.m.map(function (m) { return navBtn(m, 'nav-i', b); }).join(''); }).join('');
    $('kb-side').innerHTML = groups;
    var more = '<button type="button" class="bn-i' + (BOTTOM.indexOf(U.mod) < 0 ? ' is-on' : '') + '" data-act="drawer" aria-expanded="' + U.drawer + '">' + UI.svg('more', 20) + '<span>' + e(t('nav.more')) + '</span></button>';
    $('kb-bnav').innerHTML = BOTTOM.map(function (m) { return navBtn(m, 'bn-i', b); }).join('') + more;
    var dr = $('kb-drawer'); dr.hidden = !U.drawer;
    dr.innerHTML = '<div class="dr-in"><div class="dr-h"><strong>' + e(t('nav.modules')) + '</strong><button type="button" class="rm-mini" data-act="drawer">' + e(t('btn.close')) + '</button></div>' + groups + '</div>';
    var rs = $('kb-role');
    rs.innerHTML = ['owner', 'editor', 'operator', 'analyst'].map(function (r) { return '<option value="' + r + '"' + (S.role === r ? ' selected' : '') + '>' + e(t('role.' + r)) + '</option>'; }).join('');
    rs.setAttribute('aria-label', t('app.role'));
    $('kb-rolel').textContent = t('app.role');
  }
  function sel(el) {
    if (!el || !el.getAttribute) return null;
    var s = el.tagName.toLowerCase(), a = ['data-act', 'data-id', 'data-in', 'data-v', 'data-nav', 'data-r', 'data-m', 'data-key', 'data-qk', 'name', 'data-i', 'id'], i, v;
    for (i = 0; i < a.length; i++) { v = el.getAttribute(a[i]); if (v !== null && v !== '') s += '[' + a[i] + '="' + String(v).replace(/"/g, '\\"') + '"]'; }
    return s;
  }
  function render() {
    var main = $('kb-main'), act = d.activeElement;
    var keep = act && (main.contains(act) || $('kb-side').contains(act)) ? sel(act) : null, selS = null, selE = null;
    if (keep && act.selectionStart !== undefined && /^(text|search|number)?$/.test(act.type || '')) { try { selS = act.selectionStart; selE = act.selectionEnd; } catch (x) { selS = null; } }
    var sc = { main: main.scrollTop }, l = main.querySelector('.lst'), dt = main.querySelector('.md-det'), kind = main.getAttribute('data-mod');
    if (l) sc.l = l.scrollTop;
    if (dt) sc.d = dt.scrollTop;
    main.setAttribute('data-mod', U.mod);
    var body = KB.can(U.mod) ? KB.views[U.mod]() : noAccess();
    main.innerHTML = '<div class="mod mod-' + U.mod + '">' + body + '</div>';
    if (kind === U.mod) {
      main.scrollTop = sc.main;
      l = main.querySelector('.lst'); dt = main.querySelector('.md-det');
      if (l && sc.l !== undefined) l.scrollTop = sc.l;
      if (dt && sc.d !== undefined) dt.scrollTop = sc.d;
    } else { main.scrollTop = 0; }
    var ms = $('msgs'); if (ms) ms.scrollTop = ms.scrollHeight;
    renderChrome();
    if (keep) { try { var n = d.querySelector('#kb ' + keep); if (n) { n.focus({ preventScroll: true }); if (selS !== null && n.setSelectionRange) n.setSelectionRange(selS, selE); } } catch (er) { /* ignore */ } }
    if (U.toast) { toast(U.toast); U.toast = ''; }
  }
  function noAccess() {
    var roles = ['owner', 'editor', 'operator', 'analyst'].filter(function (r) { return KB.S.perm[r][U.mod]; });
    return '<div class="noacc"><span class="noacc-i">' + UI.svg('lock', 28) + '</span><h3>' + e(t('na.title', { mod: t('mod.' + U.mod) })) + '</h3><p>' + e(t('na.p', { role: t('role.' + KB.S.role) })) + '</p><p class="meta">' + e(t('na.who')) + ' ' + roles.map(function (r) { return e(t('role.' + r)); }).join(', ') + '</p><div class="acts"><button type="button" class="btn btn-sm" data-act="asowner">' + e(t('na.switch')) + '</button></div></div>';
  }
  function toast(msg) {
    var el = $('kb-toast'); el.textContent = msg; el.className = 'toast is-on';
    clearTimeout(toastT); toastT = setTimeout(function () { el.className = 'toast'; }, 2600);
  }
  KB.go = function (m) { U.mod = m; U.drawer = false; };
  KB.rerender = function () { if (ready) render(); };

  function bind() {
    var root = $('kb');
    root.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('button') : null;
      if (!b || !root.contains(b) || b.disabled) return;
      var v;
      if ((v = b.getAttribute('data-nav'))) { if (U.mod === 'chat' && v !== 'chat') KB.finishTyping(); KB.go(v); render(); $('kb-main').scrollTop = 0; return; }
      if ((v = b.getAttribute('data-act'))) {
        if (v === 'drawer') { U.drawer = !U.drawer; renderChrome(); return; }
        if (v === 'asowner') { KB.S.role = 'owner'; KB.log('access', 'lg.viewas', { role: 'role.owner' }, 'info'); render(); return; }
        if (KB.acts[v]) { KB.acts[v](b, ev); render(); }
      }
    });
    function onIn(type) {
      return function (ev) {
        var el = ev.target.closest ? ev.target.closest('[data-in]') : null;
        if (!el || !root.contains(el)) return;
        if (type === 'input' && (el.tagName === 'SELECT' || el.type === 'checkbox')) return;
        if (type === 'change' && (el.type === 'text' || el.tagName === 'TEXTAREA' || el.type === 'search') && el.getAttribute('data-in') !== 'retention') { /* handled on input */ }
        var fn = KB.ins[el.getAttribute('data-in')]; if (!fn) return;
        if (fn(el, ev, type) !== true) render();
      };
    }
    root.addEventListener('input', onIn('input'));
    root.addEventListener('change', onIn('change'));
    root.addEventListener('change', function (ev) {
      var r = ev.target; if (r.id !== 'kb-role') return;
      KB.S.role = r.value; KB.tick(1); KB.log('access', 'lg.viewas', { role: 'role.' + r.value }, 'info'); render();
    });
    root.addEventListener('submit', function (ev) {
      var f = ev.target.closest ? ev.target.closest('form[data-form]') : null; if (!f) return;
      ev.preventDefault();
      var fn = KB.forms[f.getAttribute('data-form')];
      if (fn && fn(f) !== true) render();
    });
    root.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && U.drawer) { U.drawer = false; renderChrome(); } });
    d.addEventListener('click', function (ev) {
      var a = ev.target.closest ? ev.target.closest('[data-open]') : null; if (!a) return;
      var m = a.getAttribute('data-open'); if (!KB.views[m]) return;
      KB.go(m); render();
      var dm = $('demo'); if (dm) dm.scrollIntoView({ behavior: w.PF.reduced ? 'auto' : 'smooth' });
      ev.preventDefault();
    });
  }

  function langChanged() {
    d.title = t('doc.title');
    var md = d.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', t('doc.desc'));
    if (ready) render();
  }
  function start() {
    if (!$('kb')) return;
    KB.reset(); ready = true; bind();
    KB.ask(t('q.delivery')); KB.finishTyping(); KB.S.cfg.spent = 14.2;
    render();
    langChanged();
  }
  w.MFI18N.onChange(function () { if (!ready) start(); else langChanged(); });
}(window));
