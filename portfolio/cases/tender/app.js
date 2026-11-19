/* Bid Radar demo: application shell, navigation, clock. All data is fictional. */
(function () {
  'use strict';
  var BR = window.BR, S = BR.S, H = BR.h, T = BR.T, I = window.MFI18N, PF = window.PF, doc = document, M = BR.mods;
  var app = doc.getElementById('app');
  var GROUPS = [
    { id: 'work', items: [['overview', 'home'], ['discover', 'search'], ['pipeline', 'board'], ['bids', 'bid'], ['tasks', 'tasks'], ['calendar', 'cal']] },
    { id: 'know', items: [['qual', 'shield'], ['finance', 'coin'], ['analytics', 'chart'], ['knowledge', 'book']] },
    { id: 'sys', items: [['workflows', 'flow'], ['team', 'team'], ['settings', 'gear'], ['activity', 'log']] }
  ];
  var DEFTAB = { discover: 'search', qual: 'profile', settings: 'pipeline' };
  var shell = {}, notifOpen = false, started = false;

  function narrow() { return window.matchMedia('(max-width: 860px)').matches; }
  BR.go = function (mod, sub) {
    S.mod = mod; S.drawer = null; S.navOpen = false; notifOpen = false;
    S.tabQ = typeof sub === 'string' ? sub : (DEFTAB[mod] || '');
    if (typeof sub === 'number') BR.goBid(sub);
    render();
    if (shell.main) shell.main.scrollTop = 0;
  };

  /* ---------- shell ---------- */
  function openTasks() { return S.tasks.filter(function (k) { return !k.done; }).length; }
  function failed() { return S.runs.filter(function (r) { return r.st === 'fail'; }).length; }
  function buildShell() {
    var holder = doc.getElementById('shellRoot');
    holder.innerHTML = '';
    var nav = H('nav', { class: 'sidenav' + (S.navOpen ? ' open' : ''), id: 'nav', 'aria-label': T('nav.label') });
    nav.appendChild(H('div', { class: 'brandrow' }, H('b', null, 'Bid Radar'), H('span', { class: 'sub' }, 'Harbor Works Supply')));
    GROUPS.forEach(function (g) {
      nav.appendChild(H('p', { class: 'ng' }, T('ng.' + g.id)));
      g.items.forEach(function (it) {
        nav.appendChild(H('button', { type: 'button', class: 'ni', 'data-mod': it[0], 'aria-current': S.mod === it[0] ? 'page' : 'false', onclick: function () { BR.go(it[0]); } }, BR.icon(it[1], 18), H('span', null, T('nav.' + it[0]))));
      });
    });
    shell.nav = nav;
    var top = H('header', { class: 'topbar' });
    top.appendChild(H('button', { type: 'button', class: 'hb', 'aria-label': T('nav.menu'), 'aria-expanded': S.navOpen ? 'true' : 'false', onclick: function () { S.navOpen = !S.navOpen; nav.classList.toggle('open', S.navOpen); this.setAttribute('aria-expanded', S.navOpen ? 'true' : 'false'); } }, BR.icon('menu', 20)));
    top.appendChild(H('div', { class: 'tt' }, H('h3', { id: 'modTitle' }, T('nav.' + S.mod)), H('p', { id: 'modDesc' }, T('mh.' + S.mod))));
    var ctl = H('div', { class: 'tctl' });
    ctl.appendChild(H('label', { class: 'asrole' }, H('span', null, T('top.as')), BR.select(S.members.map(function (m) { return { id: m.id, label: m.name + ' / ' + T('role.' + m.role) }; }), S.me, function (v) { S.me = v; BR.toast(T('top.asset', { name: BR.name(v), role: T('role.' + BR.role()) })); render(); }, 'asrole')));
    ctl.appendChild(H('button', { type: 'button', class: 'live' + (S.live ? '' : ' off'), 'aria-pressed': S.live ? 'true' : 'false', onclick: function () { S.live = !S.live; this.setAttribute('aria-pressed', S.live ? 'true' : 'false'); this.classList.toggle('off', !S.live); } }, H('span', { class: 'live-dot' }), T('feed.live')));
    ctl.appendChild(H('button', { type: 'button', class: 'bell', 'aria-expanded': 'false', onclick: function () { notifOpen = !notifOpen; renderNotif(); } }, BR.icon('bell', 18)));
    top.appendChild(ctl);
    shell.top = top;
    shell.pop = H('div', { class: 'notif', id: 'notif', hidden: true });
    shell.main = H('div', { class: 'modroot', id: 'modRoot', 'data-scroll': 'main' });
    shell.drawer = H('aside', { class: 'drawer', id: 'drawer', 'aria-label': T('dr.label') });
    var area = H('div', { class: 'app-main' }, top, shell.pop, shell.main, shell.drawer);
    holder.appendChild(H('div', { class: 'app2' }, nav, area, H('div', { class: 'navscrim', onclick: function () { S.navOpen = false; nav.classList.remove('open'); } })));
  }
  function renderNotif() {
    var pop = shell.pop; pop.hidden = !notifOpen; pop.innerHTML = '';
    var btn = shell.top.querySelector('.bell'); if (btn) btn.setAttribute('aria-expanded', notifOpen ? 'true' : 'false');
    if (!notifOpen) return;
    var all = BR.notifs(), list = all.slice(0, 12);
    pop.appendChild(H('div', { class: 'blk-h' }, H('h4', null, T('nt.h')), BR.btn(T('nt.read'), function () { S.seen = Date.now(); all.forEach(function (n) { S.read[n.key] = 1; }); renderShellBits(); renderNotif(); }, 'btn-ghost')));
    if (!all.length) { pop.appendChild(BR.empty(T('nt.off'))); return; }
    pop.appendChild(H('ul', { class: 'lst' }, list.map(function (n) {
      var un = n.at > S.seen && !S.read[n.key];
      return H('li', { class: un ? 'unread' : '' }, H('span', { class: 'lnk-t' }, n.text), H('span', { class: 'sub' }, BR.ago(n.at)), n.tid ? BR.btn(T('cal.open'), function () { notifOpen = false; renderNotif(); BR.openTender(n.tid); }, 'btn-ghost') : null);
    })));
  }
  function renderShellBits() {
    if (!shell.nav) return;
    var items = shell.nav.querySelectorAll('.ni'), i;
    for (i = 0; i < items.length; i++) {
      var m = items[i].getAttribute('data-mod'); items[i].setAttribute('aria-current', S.mod === m ? 'page' : 'false');
      var old = items[i].querySelector('.nb'); if (old) old.remove();
      var b = null;
      if (m === 'tasks' && openTasks()) b = H('i', { class: 'nb' }, openTasks());
      if (m === 'workflows' && failed()) b = H('i', { class: 'nb bad' }, failed());
      if (b) items[i].appendChild(b);
    }
    var bell = shell.top.querySelector('.bell');
    if (bell) {
      var o = bell.querySelector('.nb'); if (o) o.remove();
      var un = BR.unread(); if (un) bell.appendChild(H('i', { class: 'nb' }, un));
      bell.setAttribute('aria-label', T('nt.h') + (un ? ' (' + un + ')' : ''));
    }
  }

  /* ---------- rendering with focus / scroll preservation ---------- */
  function keep(fn) {
    var a = doc.activeElement, key = a && a.getAttribute ? a.getAttribute('data-key') : null, ss = null, se = null, ssc = {}, i;
    if (key && a.selectionStart != null) { try { ss = a.selectionStart; se = a.selectionEnd; } catch (e) { /* ignore */ } }
    var els = app.querySelectorAll('[data-scroll]');
    for (i = 0; i < els.length; i++) ssc[els[i].getAttribute('data-scroll')] = els[i].scrollTop;
    fn();
    els = app.querySelectorAll('[data-scroll]');
    for (i = 0; i < els.length; i++) { var k = els[i].getAttribute('data-scroll'); if (ssc[k]) els[i].scrollTop = ssc[k]; }
    if (key) {
      var n = app.querySelector('[data-key="' + key + '"]');
      if (n && n !== doc.activeElement) { n.focus({ preventScroll: true }); if (ss != null && n.setSelectionRange) { try { n.setSelectionRange(ss, se); } catch (e2) { /* ignore */ } } }
    }
  }
  function renderMod() {
    keep(function () {
      shell.main.innerHTML = '';
      M[S.mod](shell.main);
      var t = doc.getElementById('modTitle'); if (t) t.textContent = T('nav.' + S.mod);
      var d = doc.getElementById('modDesc'); if (d) d.textContent = T('mh.' + S.mod);
    });
  }
  function renderDrawer() { keep(function () { BR.renderDrawer(shell.drawer); }); doc.body.classList.toggle('drawer-open', !!S.drawer && narrow()); }
  function render() {
    if (!shell.nav) buildShell();
    renderShellBits();
    shell.nav.classList.toggle('open', S.navOpen);
    renderMod(); renderDrawer();
    var sel = shell.top.querySelector('select'); if (sel) sel.value = S.me;
    if (notifOpen) renderNotif();
  }
  BR.subscribe(function (what) {
    if (!shell.nav) return;
    if (what === 'drawer') { renderDrawer(); return; }
    if (what === 'mod') { renderMod(); return; }
    renderShellBits(); renderMod(); renderDrawer(); if (notifOpen) renderNotif();
  });

  /* ---------- events ---------- */
  doc.addEventListener('click', function (e) {
    var o = e.target.closest ? e.target.closest('[data-open]') : null;
    if (o) {
      e.preventDefault(); BR.go(o.getAttribute('data-open'), o.getAttribute('data-sub') || undefined);
      app.scrollIntoView({ behavior: PF.reduced ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    if (notifOpen && !e.target.closest('.notif') && !e.target.closest('.bell')) { notifOpen = false; renderNotif(); }
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !shell.nav) return;
    if (doc.querySelector('#dlgRoot .scrim')) return;
    if (notifOpen) { notifOpen = false; renderNotif(); return; }
    if (S.navOpen) { S.navOpen = false; shell.nav.classList.remove('open'); return; }
    if (S.drawer) { S.drawer = null; BR.changed('drawer'); }
  });
  window.addEventListener('resize', function () { doc.body.classList.toggle('drawer-open', !!S.drawer && narrow()); });

  /* ---------- clock: runs only while the demo is visible ---------- */
  var STEP = 40, timer = null;
  function clock() {
    var i, t, re = { all: false, parse: false, draft: false };
    if (S.live) {
      S.ms += STEP;
      for (i = S.queue.length - 1; i >= 0; i--) {
        if (S.queue[i].at <= S.ms) { t = BR.byId(S.queue[i].id); S.queue.splice(i, 1); BR.arrive(t, t.src); re.all = true; }
      }
    }
    for (i = 0; i < S.tenders.length; i++) {
      t = S.tenders[i];
      if (t.ps === 1) {
        t.acc += STEP;
        if (t.acc >= 420) {
          t.acc = 0; t.tick++;
          if (t.tick - 1 >= BR.fieldsOf(t).length) { BR.finishParse(t); re.all = true; } else re.parse = true;
        }
      }
      if (t.draftN >= 0 && !t.draftDone) {
        t.draftN += 9;
        if (t.draftN >= t.draft.length) { t.draftN = t.draft.length; t.draftDone = true; t.att.form = true; BR.finishRun(BR.runFor(t, 'draft'), true); re.all = true; } else re.draft = true;
      }
    }
    if (re.all) BR.changed('tender');
    else { if (re.parse) BR.syncParse(); if (re.draft) BR.syncDraft(); }
  }
  function run() { if (timer == null) timer = setInterval(clock, STEP); }
  function pause() { if (timer != null) { clearInterval(timer); timer = null; } }
  function finishAll() {
    S.tenders.forEach(function (t) {
      BR.finishParse(t);
      if (t.draftN >= 0 && !t.draftDone) { t.draft = BR.buildDraft(t); t.draftN = t.draft.length; t.draftDone = true; t.att.form = true; BR.finishRun(BR.runFor(t, 'draft'), true); }
    });
  }
  function begin() {
    if (started) return; started = true;
    if (PF.reduced) { S.queue.slice().forEach(function (q) { var t = BR.byId(q.id); BR.arrive(t, t.src); }); S.queue = []; BR.changed('tender'); }
  }
  PF.onScreen(app, function () { begin(); run(); }, pause);
  I.onChange(function () { finishAll(); buildShell(); render(); });
}());
