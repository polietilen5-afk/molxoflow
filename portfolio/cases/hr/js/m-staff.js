/* Modules: Home dashboard and Staff register with the full employee card. */
(function () {
  'use strict';
  var CL = window.CL, T = CL.T, el = CL.el;
  CL.ud({ sel: null, cardTab: 'data', q: '', dept: 'all', status: 'all' });
  var STATUSES = ['active', 'leave', 'probation', 'dismissed'];

  /* ---------- Home ---------- */
  function statTile(label, value, go, sub) {
    return el('button', { type: 'button', cls: 'stat', onclick: go }, [el('b', { text: String(value) }), el('span', { text: label }), sub ? el('small', { text: sub }) : null]);
  }
  CL.registerMod('home', {
    icon: 'home',
    badge: function () { return 0; },
    render: function (box) {
      var vis = CL.visibleEmps(), r = CL.role();
      box.appendChild(CL.head(T('home.h'), T('home.sub', { month: T('month.name') })));
      var tasks = CL.tasks(), finds = CL.findings();
      var active = vis.filter(function (e) { return e.st !== 'dismissed'; }).length;
      var pending = CL.DB.events.filter(function (ev) { return ev.st === 'pending' && CL.inScope(ev.emp); }).length;
      var tiles = el('div', { cls: 'stats' }, [
        statTile(T('home.headcount'), active, function () { CL.go('staff'); }, T('home.onLeave', { n: vis.filter(function (e) { return e.st === 'leave'; }).length })),
        statTile(T('home.tasks'), tasks.length, function () { CL.go('events', { evTab: 'inbox' }); }, T('home.tasksSub')),
        statTile(T('home.pending'), pending, function () { CL.go('events', { evTab: 'list', evStatus: 'pending' }); }, T('home.pendingSub')),
        statTile(T('home.findings'), finds.length, function () { CL.go('checks'); }, T('home.findingsSub', { n: finds.filter(function (f) { return f.sev === 'bad'; }).length }))
      ]);
      box.appendChild(tiles);
      var cols = el('div', { cls: 'cols' });
      var c1 = el('section', { cls: 'card-b' }, [el('h3', { text: T('home.myTasks') })]);
      if (tasks.length) { var ul = el('ul', { cls: 'tasklist' }); tasks.slice(0, 7).forEach(function (t) { ul.appendChild(el('li', {}, [el('span', { text: t.text }), CL.btn(T('home.open'), t.go, 'btn-ghost')])); }); c1.appendChild(ul); }
      else c1.appendChild(el('p', { cls: 'okline' }, [CL.icon('check'), T('home.noTasks')]));
      cols.appendChild(c1);
      var c2 = el('section', { cls: 'card-b' }, [el('h3', { text: T('home.reminders') })]), rem = el('ul', { cls: 'tasklist' });
      vis.filter(function (e) { return e.st === 'probation'; }).forEach(function (e) {
        var left = CL.workdaysBetween(CL.TODAY, e.probEnd);
        if (left <= CL.DB.settings.probDays) rem.appendChild(el('li', {}, [el('span', { text: left < 0 ? T('home.probExpired', { name: e.n, date: e.probEnd }) : T('home.probSoon', { name: e.n, n: left, date: e.probEnd }) }), CL.btn(T('home.open'), function () { CL.go('events', { evTab: 'prob' }); }, 'btn-ghost')]));
      });
      var un = CL.DB.unified;
      if (un.st === 'open') rem.appendChild(el('li', {}, [el('span', { text: T('home.tsOpen', { month: T('month.name'), day: CL.DB.settings.closeDay }) }), CL.btn(T('home.open'), function () { CL.go('ts', { tsTab: 'appr' }); }, 'btn-ghost')]));
      if (CL.DB.sync.disc.some(function (d) { return d.st === 'open'; }) && CL.modOK('sync')) rem.appendChild(el('li', {}, [el('span', { text: T('home.syncOpen', { n: CL.DB.sync.disc.filter(function (d) { return d.st === 'open'; }).length }) }), CL.btn(T('home.open'), function () { CL.go('sync', { syncTab: 'disc' }); }, 'btn-ghost')]));
      if (!rem.children.length) c2.appendChild(el('p', { cls: 'okline' }, [CL.icon('check'), T('home.noRem')])); else c2.appendChild(rem);
      cols.appendChild(c2);
      box.appendChild(cols);
      var act = el('section', { cls: 'card-b' }, [el('h3', { text: T('home.recent') })]);
      if (CL.modOK('audit')) {
        act.appendChild(el('ul', { cls: 'mini' }, CL.DB.audit.slice(0, 6).map(function (a) { return el('li', {}, [el('time', { text: a.t }), el('span', { text: T('role.' + a.role) + ': ' + CL.auditText(a) })]); })));
        act.appendChild(CL.link(T('home.allAudit'), function () { CL.go('audit'); }));
      } else act.appendChild(el('p', { cls: 'lockedv' }, [CL.icon('lock'), el('span', { text: T('home.auditLocked') })]));
      box.appendChild(act);
      box.appendChild(el('p', { cls: 'hint-s', text: T('home.hint') }));
    }
  });

  /* ---------- Staff ---------- */
  function filtered() {
    var U = CL.UI, q = U.q.trim().toLowerCase();
    return CL.visibleEmps().filter(function (e) {
      if (U.dept !== 'all' && e.dept !== U.dept) return false;
      if (U.status !== 'all' && e.st !== U.status) return false;
      if (q && (e.n + ' ' + CL.posName(e.pos) + ' ' + CL.deptName(e.dept)).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function fillList() {
    var box = CL.root.querySelector('#list'); if (!box) return;
    var items = filtered(), U = CL.UI;
    box.innerHTML = '';
    items.forEach(function (e) {
      box.appendChild(el('button', { type: 'button', cls: 'row' + (U.sel === e.id ? ' sel' : ''), role: 'listitem', 'data-emp': e.id, 'aria-current': U.sel === e.id ? 'true' : null, onclick: function () { U.sel = e.id; U.cardTab = 'data'; CL.render('[data-emp="' + e.id + '"]'); var c = CL.root.querySelector('#card'); if (c && window.matchMedia('(max-width: 900px)').matches) c.scrollIntoView({ block: 'start' }); } }, [
        el('span', { cls: 'nm' }, [el('i', { cls: 'av', text: CL.initials(e.n), 'aria-hidden': 'true' }), el('b', { text: e.n })]),
        el('span', { cls: 'c-dept', text: CL.deptName(e.dept) }), el('span', { cls: 'c-pos', text: CL.posName(e.pos) }),
        el('span', { cls: 'c-st' }, [CL.statusBadge(e.st)]),
        el('span', { cls: 'c-rate', text: CL.can('rate') ? T('rate.tier', { t: e.tier }) : '' })
      ]));
    });
    if (!items.length) box.appendChild(el('div', { cls: 'empty' }, [el('b', { text: T('staff.none') }), el('span', { text: T('staff.noneHint') })]));
    var c = CL.root.querySelector('#count'); if (c) c.textContent = T('staff.count', { n: items.length, total: CL.visibleEmps().length });
  }
  function fld(label, val, locked) {
    return el('div', { cls: 'fld' + (locked ? ' locked' : '') }, [el('dt', { text: label }), el('dd', {}, [locked ? CL.locked() : val])]);
  }
  function editCard(e) {
    var form = CL.form([
      { k: 'dept', label: T('f.dept'), type: 'select', opts: CL.DB.refs.depts.map(function (d) { return [d.id, CL.deptName(d.id)]; }), value: e.dept, req: true },
      { k: 'pos', label: T('f.pos'), type: 'select', opts: CL.DB.refs.pos.map(function (d) { return [d.id, CL.posName(d.id)]; }), value: e.pos, req: true },
      { k: 'sched', label: T('f.sched'), type: 'select', opts: CL.DB.refs.sched.map(function (x) { return [x.id, T('sch.' + x.id)]; }), value: e.sched, req: true },
      { k: 'phone', label: T('fld.phone'), value: e.phone || phoneOf(e), req: true, pattern: /^\+0 000 000-00-\d{2}$/, patternMsg: 'v.phone', help: T('v.phoneHelp') },
      { k: 'mail', label: T('fld.mail'), value: e.mail || mailOf(e), req: true, pattern: /^[a-z0-9.]+@example\.test$/, patternMsg: 'v.mail', help: T('v.mailHelp') },
      { k: 'contract', label: T('fld.contractRecv'), type: 'select', opts: [['1', T('yes')], ['0', T('no')]], value: e.contract ? '1' : '0' }
    ]);
    CL.dialog(T('card.edit') + ': ' + e.n, form.node, [{ text: T('dlg.cancel'), ghost: true }, { text: T('dlg.save'), onclick: function () {
      if (!form.validate()) return false;
      var v = form.get(), ch = [];
      if (v.dept !== e.dept) ch.push(T('fld.dept')); if (v.pos !== e.pos) ch.push(T('fld.pos')); if (v.sched !== e.sched) ch.push(T('fld.sched'));
      if (v.phone !== (e.phone || phoneOf(e))) ch.push(T('fld.phone')); if (v.mail !== (e.mail || mailOf(e))) ch.push(T('fld.mail'));
      e.dept = v.dept; e.pos = v.pos; e.sched = v.sched; e.phone = v.phone; e.mail = v.mail; e.contract = v.contract === '1';
      CL.log('staff', 'card.edit', { name: e.n, fields: ch.join(', ') || '-' }, e.id); CL.toast(T('toast.saved')); CL.render();
    } }]);
  }
  function phoneOf(e) { var i = CL.DB.emps.indexOf(e) + 1; return '+0 000 000-00-' + CL.pad2(i); }
  function mailOf(e) { return 'person' + (CL.DB.emps.indexOf(e) + 1) + '@example.test'; }

  var EV_STAFF_HIDDEN_FOR_ACC = ['probation', 'transfer', 'sched', 'dismissal'];
  function historyList(e) {
    var ul = el('ol', { cls: 'hist' }), list = CL.DB.events.filter(function (ev) { return ev.emp === e.id && ev.st === 'applied'; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    list.forEach(function (ev) {
      var txt = T('ev.t.' + ev.type), det = '';
      if (ev.type === 'transfer') det = CL.deptName(ev.p.dept) + (ev.p.pos ? ' / ' + CL.posName(ev.p.pos) : '');
      else if (ev.type === 'sched') det = T('sch.' + ev.p.sched);
      else if (ev.type === 'rate') det = CL.can('rate') ? T('rate.tier', { t: ev.p.tier }) : null;
      else if (ev.type === 'sick' && !CL.can('sick')) txt = T('ev.restricted');
      else if (ev.to) det = ev.date + ' - ' + ev.to;
      if (CL.role() === 'acc' && EV_STAFF_HIDDEN_FOR_ACC.indexOf(ev.type) >= 0) return;
      ul.appendChild(el('li', {}, [el('time', { text: ev.date }), el('div', {}, [el('b', { text: txt }), det === null ? CL.locked() : el('span', { text: det })])]));
    });
    return ul.children.length ? ul : el('p', { cls: 'lead-s', text: T('ev.none') });
  }
  function cardEvents(e) {
    var list = CL.DB.events.filter(function (ev) { return ev.emp === e.id; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var hidden = 0, ul = el('ul', { cls: 'events' });
    list.forEach(function (ev) {
      if (CL.role() === 'acc' && EV_STAFF_HIDDEN_FOR_ACC.indexOf(ev.type) >= 0) { hidden++; return; }
      var hide = ev.type === 'sick' && !CL.can('sick');
      ul.appendChild(el('li', {}, [el('time', { text: ev.date }), el('div', {}, [el('b', { text: hide ? T('ev.restricted') : T('ev.t.' + ev.type) }), el('span', { text: hide ? T('ev.restrictedHint') : T('ev.h.' + ev.type) })]),
        CL.link(T('ev.st.' + ev.st), function () { CL.openEvent(ev); })]));
    });
    if (hidden) ul.appendChild(el('li', { cls: 'lockedrow' }, [CL.icon('lock'), el('span', { text: T('ev.hidden', { n: hidden }) })]));
    if (!ul.children.length) ul.appendChild(el('li', { text: T('ev.none') }));
    return ul;
  }
  function cardWork(e) {
    var box = el('div');
    var mm = CL.DB.memos.filter(function (m) { return m.emp === e.id; }), pc = CL.DB.pieces.filter(function (p) { return p.shares.some(function (s) { return s.emp === e.id; }); });
    box.appendChild(el('h3', { cls: 'sub-h', text: T('m.memos') }));
    box.appendChild(mm.length ? el('ul', { cls: 'events' }, mm.map(function (m) { return el('li', {}, [el('time', { text: m.month }), el('div', {}, [el('b', { text: T('mk.' + m.kind) }), el('span', { text: m.reason })]), CL.badge(m.st === 'approved' ? 'ok' : m.st === 'rejected' ? 'bad' : 'warn', T('ms.' + m.st))]); })) : el('p', { cls: 'lead-s', text: T('work.noMemos') }));
    box.appendChild(el('h3', { cls: 'sub-h', text: T('m.piece') }));
    box.appendChild(pc.length ? el('ul', { cls: 'events' }, pc.map(function (p) { var sh = p.shares.filter(function (s) { return s.emp === e.id; })[0]; return el('li', {}, [el('time', { text: p.date }), el('div', {}, [el('b', { text: T('pt.' + p.type) + ' ' + p.id.toUpperCase() }), el('span', { text: T('piece.share', { pct: sh.pct }) })]), CL.badge(p.st === 'confirmed' ? 'ok' : p.st === 'cancelled' ? 'bad' : 'warn', T('ps.' + p.st))]); })) : el('p', { cls: 'lead-s', text: T('work.noPieces') }));
    return box;
  }
  function renderCard(box) {
    var U = CL.UI, e = U.sel ? CL.emp(U.sel) : null;
    box.innerHTML = '';
    if (!e) { box.appendChild(el('div', { cls: 'card-empty' }, [CL.icon('people'), el('b', { text: T('card.pick') }), el('span', { text: T('card.pickHint') })])); return; }
    box.appendChild(el('button', { type: 'button', cls: 'backbtn', onclick: function () { U.sel = null; CL.render('[data-emp="' + e.id + '"]'); } }, [CL.icon('back'), el('span', { text: T('card.back') })]));
    var hd = el('div', { cls: 'card-head' }, [el('i', { cls: 'av big', text: CL.initials(e.n), 'aria-hidden': 'true' }), el('div', {}, [el('h3', { text: e.n }), el('p', { text: CL.posName(e.pos) + ' / ' + CL.deptName(e.dept) })]), CL.statusBadge(e.st)]);
    box.appendChild(hd);
    var act = el('div', { cls: 'acts' });
    if (CL.can('editCard')) act.appendChild(CL.btn(T('card.edit'), function () { editCard(e); }, 'btn-ghost'));
    if (e.st !== 'dismissed' && (CL.role() === 'hr' || CL.role() === 'mgr')) act.appendChild(CL.btn(T('card.newEvent'), function () { CL.newEventDialog(); }, 'btn-ghost'));
    if (act.children.length) box.appendChild(act);
    box.appendChild(CL.tabs([['data', T('card.data')], ['hist', T('card.hist')], ['events', T('card.events')], ['ts', T('card.ts')], ['work', T('card.work')]], U.cardTab, function (t) { U.cardTab = t; renderCard(box); var nb = box.querySelector('[data-tab="' + t + '"]'); if (nb) nb.focus(); }, T('card.tabs')));
    var body = el('div', { cls: 'card-body', role: 'tabpanel' });
    if (U.cardTab === 'data') {
      var dl = el('dl', { cls: 'flds' });
      dl.appendChild(fld(T('fld.dept'), CL.deptName(e.dept))); dl.appendChild(fld(T('fld.pos'), CL.posName(e.pos)));
      dl.appendChild(fld(T('fld.sched'), T('sch.' + e.sched))); dl.appendChild(fld(T('fld.hired'), e.hired));
      if (e.probEnd && e.st === 'probation') dl.appendChild(fld(T('f.probEnd'), e.probEnd));
      if (e.leftOn) dl.appendChild(fld(T('fld.left'), e.leftOn));
      dl.appendChild(fld(T('fld.contract'), 'HW-' + (1000 + CL.DB.emps.indexOf(e) * 7) + (e.contract ? '' : ' (' + T('fld.notRecv') + ')')));
      dl.appendChild(fld(T('fld.rate'), T('rate.tier', { t: e.tier }), !CL.can('rate')));
      dl.appendChild(fld(T('fld.phone'), e.phone || phoneOf(e), !CL.can('personal')));
      dl.appendChild(fld(T('fld.mail'), e.mail || mailOf(e), !CL.can('personal')));
      dl.appendChild(fld(T('fld.birth'), '19' + (70 + CL.DB.emps.indexOf(e) * 2) + '-0' + ((CL.DB.emps.indexOf(e) % 9) + 1) + '-1' + (CL.DB.emps.indexOf(e) % 9), !CL.can('personal')));
      body.appendChild(dl);
    } else if (U.cardTab === 'hist') body.appendChild(historyList(e));
    else if (U.cardTab === 'events') body.appendChild(cardEvents(e));
    else if (U.cardTab === 'ts') {
      body.appendChild(CL.tsTiles(e)); body.appendChild(CL.tsCalendar(e));
      body.appendChild(CL.btn(T('sum.open'), function () { CL.go('ts', { tsEmp: e.id, tsTab: 'grid', tsDept: 'all' }); }, 'btn-ghost'));
    } else body.appendChild(cardWork(e));
    box.appendChild(body);
  }
  CL.registerMod('staff', {
    icon: 'people',
    badge: function () { return 0; },
    render: function (box) {
      var U = CL.UI;
      box.appendChild(CL.head(T('m.staff'), T('staff.sub')));
      var wrap = el('div', { cls: 'staff' + (U.sel ? ' has-card' : '') });
      var left = el('section', { cls: 'list-col', 'aria-label': T('staff.list') });
      var f = el('div', { cls: 'filters' });
      var q = el('input', { type: 'search', cls: 'in', placeholder: T('staff.search'), 'aria-label': T('staff.search'), value: U.q, autocomplete: 'off' });
      q.addEventListener('input', function () { U.q = q.value; fillList(); });
      var ds = el('select', { cls: 'in', 'aria-label': T('f.dept'), disabled: CL.role() === 'mgr' }, [el('option', { value: 'all', text: CL.role() === 'mgr' ? CL.deptName(CL.MGR_DEPT) : T('f.allDept') })]);
      if (CL.role() !== 'mgr') CL.DB.refs.depts.forEach(function (d) { ds.appendChild(el('option', { value: d.id, text: CL.deptName(d.id) })); });
      ds.value = U.dept; ds.addEventListener('change', function () { U.dept = ds.value; fillList(); });
      var ss = el('select', { cls: 'in', 'aria-label': T('f.status') }, [el('option', { value: 'all', text: T('f.allStatuses') })].concat(STATUSES.map(function (s) { return el('option', { value: s, text: T('st.' + s) }); })));
      ss.value = U.status; ss.addEventListener('change', function () { U.status = ss.value; fillList(); });
      f.appendChild(el('label', { cls: 'search' }, [CL.icon('search'), q])); f.appendChild(ds); f.appendChild(ss);
      left.appendChild(f);
      if (CL.role() === 'mgr') left.appendChild(el('p', { cls: 'scope', text: T('staff.scope', { dept: CL.deptName(CL.MGR_DEPT) }) }));
      left.appendChild(el('div', { cls: 'row head', 'aria-hidden': 'true' }, [el('span', { text: T('col.name') }), el('span', { text: T('col.dept') }), el('span', { text: T('col.pos') }), el('span', { text: T('col.status') }), el('span', { text: CL.can('rate') ? T('col.rate') : '' })]));
      left.appendChild(el('div', { id: 'list', cls: 'rows', role: 'list' }));
      left.appendChild(el('p', { id: 'count', cls: 'count', 'aria-live': 'polite' }));
      wrap.appendChild(left);
      var card = el('section', { cls: 'card-col', id: 'card', 'aria-label': T('card.label') });
      wrap.appendChild(card); renderCard(card);
      box.appendChild(wrap); fillList();
    }
  });
}());
