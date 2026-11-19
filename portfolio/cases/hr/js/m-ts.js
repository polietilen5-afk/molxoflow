/* Module: timesheet grid, approval cycles, unified timesheet, versions, correction. */
(function () {
  'use strict';
  var CL = window.CL, T = CL.T, el = CL.el;
  CL.ud({ tsTab: 'grid', tsDept: 'all', tsEmp: 'e1' });

  CL.tsEditable = function (empId) {
    var e = CL.emp(empId); if (!e || !CL.tsOpenFor(e.dept)) return false;
    var r = CL.role(), f = CL.DB.settings.filler;
    return (r === 'hr' && f !== 'mgr') || (r === 'mgr' && f !== 'hr' && e.dept === CL.MGR_DEPT);
  };
  CL.setCell = function (empId, d, cell) { CL.DB.cells[empId][d] = cell; };
  function codeText(x) { return (x.c === 'S' && !CL.can('sick')) ? 'X' : x.c; }
  function letter(x) {
    if (x.c === 'W' || x.c === 'O') return String(x.h);
    if (x.c === '') return '-';
    if (x.c === 'off') return '';
    var k = codeText(x); return T('l.' + k);
  }
  function label(x) { var k = codeText(x); return k === '' ? T('c.none') : T(k === 'X' ? 'c.X' : 'c.' + x.c); }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return ('00000000' + h.toString(16)).slice(-8); }
  function stateHash() { return hash(JSON.stringify(CL.DB.cells) + CL.DB.unified.rev); }
  CL.syncTs = function () {
    var n = 0;
    CL.DB.emps.forEach(function (e) {
      if (!CL.DB.cells[e.id]) { CL.genCells(e); n++; }
      if (!CL.tsOpenFor(e.dept)) return;
      CL.DB.events.forEach(function (ev) {
        if (ev.emp === e.id && ev.st === 'applied' && CL.absCode(ev.type)) n += CL.applyAbsence(e, CL.absCode(ev.type), ev.date, ev.to || ev.date);
      });
      if (e.leftOn) for (var d = 1; d <= CL.DAYS; d++) if (CL.dateStr(d) > e.leftOn && CL.DB.cells[e.id][d].c !== 'off') { CL.DB.cells[e.id][d] = { c: 'off', h: 0 }; n++; }
    });
    CL.log('ts', 'ts.sync', { n: n });
    return n;
  };
  function deptConflicts(dept) {
    var n = 0;
    CL.DB.emps.forEach(function (e) { if (e.dept === dept) for (var d = 1; d <= CL.DAYS; d++) if (CL.cellConflict(CL.DB.cells[e.id][d])) n++; });
    return n;
  }
  function visibleDepts() { return CL.DB.refs.depts.filter(function (d) { return CL.role() !== 'mgr' || d.id === CL.MGR_DEPT; }); }
  function deptEmps(dept) { return CL.visibleEmps().filter(function (e) { return e.dept === dept && !(e.st === 'dismissed' && e.leftOn < CL.MONTH + '-01'); }); }
  function cycleKind(st) { return st === 'forming' ? 'warn' : st === 'hr_ok' ? 'ok' : 'info'; }

  /* ---------- cycle actions ---------- */
  function setCycle(dept, st, key) { CL.DB.cycles[dept] = st; CL.log('ts', key, { dept: CL.deptName(dept) }); CL.render(); }
  function returnDialog(dept) {
    var form = CL.form([{ k: 'why', label: T('ts.returnReason'), type: 'textarea', req: true, minlen: 5 }]);
    CL.dialog(T('ts.return'), form.node, [{ text: T('dlg.cancel'), ghost: true }, { text: T('ts.return'), onclick: function () { if (!form.validate()) return false; CL.DB.cycles[dept] = 'forming'; CL.log('ts', 'ts.return', { dept: CL.deptName(dept), why: form.get().why }); CL.toast(T('toast.tsReturned')); CL.render(); } }]);
  }
  function cycleActions(dept) {
    var st = CL.DB.cycles[dept], r = CL.role(), out = [], un = CL.DB.unified.st === 'open';
    if (!un) return out;
    var mine = (r === 'mgr' && dept === CL.MGR_DEPT);
    var canFill = (r === 'hr' && CL.DB.settings.filler !== 'mgr') || (mine && CL.DB.settings.filler !== 'hr');
    if (st === 'forming' && canFill) out.push(CL.btn(T('ts.submit'), function () { if (deptConflicts(dept)) { CL.toast(T('toast.tsConflicts')); return; } setCycle(dept, 'submitted', 'ts.submit'); CL.toast(T('toast.tsSubmitted')); }));
    if (st === 'submitted' && (mine || (r === 'hr' && dept !== CL.MGR_DEPT))) { out.push(CL.btn(T('ts.deptOk'), function () { setCycle(dept, 'dept_ok', 'ts.deptOk'); })); out.push(CL.btn(T('ts.return'), function () { returnDialog(dept); }, 'btn-ghost')); }
    if (st === 'dept_ok' && r === 'hr') { out.push(CL.btn(T('ts.accept'), function () { setCycle(dept, 'hr_ok', 'ts.accept'); })); out.push(CL.btn(T('ts.return'), function () { returnDialog(dept); }, 'btn-ghost')); }
    if (st === 'hr_ok' && r === 'hr') out.push(CL.btn(T('ts.return'), function () { returnDialog(dept); }, 'btn-ghost'));
    return out;
  }
  function approveUnified() {
    var U = CL.DB.unified, bad = CL.DB.refs.depts.filter(function (d) { return CL.DB.cycles[d.id] !== 'hr_ok'; });
    if (bad.length) { CL.toast(T('toast.tsNotAll', { n: bad.length })); return; }
    var n = CL.allFindings().filter(function (f) { return f.sev === 'bad'; }).length;
    if (n) { CL.toast(T('toast.tsBlocking', { n: n })); return; }
    U.st = 'approved'; U.versions.unshift({ rev: U.rev, at: CL.stamp(), by: CL.role(), hash: stateHash(), why: U.versions.length ? U.lastWhy : '' });
    CL.log('ts', 'ts.approve', { rev: U.rev }); CL.toast(T('toast.tsApproved')); CL.render();
  }
  function correctionDialog() {
    var form = CL.form([
      { k: 'dept', label: T('f.dept'), type: 'select', opts: CL.DB.refs.depts.map(function (d) { return [d.id, CL.deptName(d.id)]; }), req: true },
      { k: 'why', label: T('ts.corrReason'), type: 'textarea', req: true, minlen: 10, help: T('ts.corrHelp') }
    ]);
    CL.dialog(T('ts.correct'), form.node, [{ text: T('dlg.cancel'), ghost: true }, { text: T('ts.correct'), onclick: function () {
      if (!form.validate()) return false;
      var v = form.get(), U = CL.DB.unified;
      U.st = 'open'; U.rev++; U.lastWhy = v.why; CL.DB.cycles[v.dept] = 'forming';
      CL.log('ts', 'ts.correct', { rev: U.rev, dept: CL.deptName(v.dept), why: v.why }); CL.toast(T('toast.tsCorrected')); CL.render();
    } }]);
  }

  /* ---------- cell menu ---------- */
  var menu = null;
  function closeMenu() { if (menu) { menu.remove(); menu = null; } }
  function actions(e, d) {
    var base = CL.baseCell(e, d), h = base.c === 'W' ? base.h : CL.DB.settings.hpd;
    return [
      { k: 'W', c: { c: 'W', h: h } }, { k: 'O', c: { c: 'O', h: h + 3 } }, { k: 'O14', c: { c: 'O', h: 14 } },
      { k: 'V', c: { c: 'V', h: 0 } }, { k: 'S', c: { c: 'S', h: 0 } }, { k: 'A', c: { c: 'A', h: 0 } }, { k: 'U', c: { c: 'U', h: 0 } },
      { k: 'DBL', c: { c: 'W', h: 16, dbl: true } }, { k: 'off', c: { c: 'off', h: 0 } }, { k: 'none', c: { c: '', h: 0 } }
    ];
  }
  function same(a, b) { return a.c === b.c && a.h === b.h && !!a.dbl === !!b.dbl; }
  function openMenu(btn, e, d) {
    closeMenu();
    if (CL.DB.unified.st !== 'open') { CL.toast(T('toast.isClosed')); return; }
    if (!CL.tsEditable(e.id)) { CL.toast(CL.DB.cycles[e.dept] !== 'forming' ? T('toast.cycleLocked') : T('toast.readonly')); return; }
    var x = CL.DB.cells[e.id][d];
    var m = el('div', { cls: 'cell-menu', role: 'dialog', 'aria-label': e.n + ', ' + CL.dateStr(d), 'data-from': e.id + ':' + d }, [el('p', { cls: 'mh', text: e.n + ' / ' + CL.dateStr(d) + ' / ' + label(x) })]);
    var g = el('div', { cls: 'mopts', role: 'group' });
    actions(e, d).forEach(function (a) {
      var nm = a.k === 'O14' ? T('act.O14') : a.k === 'DBL' ? T('act.DBL') : a.k === 'off' ? T('act.off') : a.k === 'none' ? T('act.none') : a.k === 'S' && !CL.can('sick') ? T('act.S.m') : T('c.' + a.k);
      var cur = same(x, a.c);
      g.appendChild(el('button', { type: 'button', cls: 'mo' + (cur ? ' cur' : ''), 'aria-pressed': cur ? 'true' : 'false', text: nm, onclick: function () {
        CL.setCell(e.id, d, a.c); CL.log('ts', 'ts.cell', { name: e.n, day: CL.dateStr(d), v: nm });
        var key = e.id + ':' + d; closeMenu(); CL.render('[data-cell="' + key + '"]');
        var f = CL.root.querySelector('[data-cell="' + key + '"]'); if (f) f.classList.add('flash');
        if (CL.cellConflict(a.c)) CL.toast(T(a.c.dbl ? 'toast.cfDbl' : 'toast.cfHrs'));
      } }));
    });
    m.appendChild(g);
    m.appendChild(el('button', { type: 'button', cls: 'mclose', text: T('dlg.close'), onclick: function () { closeMenu(); btn.focus(); } }));
    document.body.appendChild(m); menu = m;
    if (!window.matchMedia('(max-width: 760px)').matches) {
      var r = btn.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
      m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - mw - 8)) + 'px';
      var top = r.bottom + 6; if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
      m.style.top = top + 'px';
    }
    var f0 = m.querySelector('.mo.cur') || m.querySelector('.mo'); if (f0) f0.focus();
  }
  document.addEventListener('click', function (ev) { if (menu && !menu.contains(ev.target)) closeMenu(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && menu) { var k = menu.getAttribute('data-from'); closeMenu(); var f = CL.root.querySelector('[data-cell="' + k + '"]'); if (f) f.focus(); } });
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () { if (window.innerWidth !== lastW) { lastW = window.innerWidth; closeMenu(); } });

  function cellLabel(e, d, x) {
    var s = e.n + ', ' + CL.dateStr(d) + ': ' + label(x) + (x.h ? ' ' + x.h + T('unit.h') : ''), k = CL.cellConflict(x);
    return k ? s + ', ' + T(k === 'dbl' ? 'cf.dbl' : 'cf.hrs') : s;
  }
  function cellBtn(e, d) {
    var x = CL.DB.cells[e.id][d], k = codeText(x), cf = CL.cellConflict(x);
    var b = el('button', { type: 'button', cls: 'cell c-' + (k === '' ? 'none' : k) + (cf ? ' bad' : '') + (cf ? ' hint' : ''), 'data-cell': e.id + ':' + d, 'aria-label': cellLabel(e, d, x), text: letter(x) + (cf ? '!' : ''), onclick: function (ev) { openMenu(b, e, d); ev.stopPropagation(); } });
    return b;
  }
  function plan(e) { var s = 0; for (var d = 1; d <= CL.DAYS; d++) s += CL.baseCell(e, d).h; return s; }
  function tile(l, v) { return el('div', { cls: 'tile' }, [el('b', { text: String(v) }), el('span', { text: l })]); }
  CL.tsTiles = function (e) { var t = CL.totals(e.id); return el('div', { cls: 'tiles' }, [tile(T('sum.hours'), t.h), tile(T('sum.plan'), plan(e)), tile(T('sum.ot'), t.ot), tile(T('sum.off'), t.off)]); };
  CL.tsCalendar = function (e) {
    var cal = el('div', { cls: 'cal', role: 'img', 'aria-label': T('sum.cal') });
    for (var w = 0; w < 7; w++) cal.appendChild(el('i', { cls: 'wd', text: T('wd.' + w) }));
    for (var s = 0; s < CL.FIRST_WD; s++) cal.appendChild(el('i', { cls: 'blank' }));
    for (var d = 1; d <= CL.DAYS; d++) { var x = CL.DB.cells[e.id][d], k = codeText(x); cal.appendChild(el('span', { cls: 'cd c-' + (k === '' ? 'none' : k) + (CL.cellConflict(x) ? ' bad' : ''), text: String(d) })); }
    return cal;
  };

  function legend() {
    var lg = el('ul', { cls: 'legend', 'aria-label': T('ts.legend') }), sick = CL.can('sick');
    [['W', '8'], ['O', '11'], ['V', T('l.V')], [sick ? 'S' : 'X', sick ? T('l.S') : T('l.X')], ['A', T('l.A')], ['U', T('l.U')]].forEach(function (p) {
      lg.appendChild(el('li', {}, [el('i', { cls: 'sw c-' + p[0], text: p[1], 'aria-hidden': 'true' }), el('span', { text: T(p[0] === 'W' ? 'c.W' : p[0] === 'O' ? 'c.O' : 'c.' + p[0]) })]));
    });
    lg.appendChild(el('li', {}, [el('i', { cls: 'sw bad', text: '!', 'aria-hidden': 'true' }), el('span', { text: T('c.conflict') })]));
    return lg;
  }

  function gridView(box) {
    var U = CL.UI, un = CL.DB.unified;
    var bar = el('div', { cls: 'ts-bar' }, [el('div', { cls: 'ts-title' }, [el('b', { text: T('month.name') }), CL.badge(un.st === 'approved' ? 'ok' : 'warn', un.st === 'approved' ? T('ts.unifApproved', { rev: un.rev }) : T('ts.open'))])]);
    var ds = el('select', { cls: 'in', 'aria-label': T('f.dept'), disabled: CL.role() === 'mgr' }, [el('option', { value: 'all', text: CL.role() === 'mgr' ? CL.deptName(CL.MGR_DEPT) : T('f.allDept') })]);
    if (CL.role() !== 'mgr') CL.DB.refs.depts.forEach(function (d) { ds.appendChild(el('option', { value: d.id, text: CL.deptName(d.id) })); });
    ds.value = U.tsDept; ds.addEventListener('change', function () { U.tsDept = ds.value; CL.render('.mod select'); });
    bar.appendChild(ds);
    if (CL.role() === 'hr') bar.appendChild(CL.btn(T('ts.sync'), function () { var n = CL.syncTs(); CL.toast(T('toast.tsSynced', { n: n })); CL.render(); }, 'btn-ghost'));
    box.appendChild(bar);
    var hasCf = CL.DB.emps.some(function (e) { return CL.visibleEmps().indexOf(e) >= 0 && conflictsOf(e) > 0; });
    box.appendChild(el('p', { cls: 'ts-hint' + (hasCf ? ' warn' : ''), text: CL.role() === 'acc' ? T('ts.readonly') : un.st === 'approved' ? T('ts.lockedHint') : hasCf ? T('ts.conflictHint') : T('ts.hint') }));
    box.appendChild(legend());
    var depts = visibleDepts().filter(function (d) { return U.tsDept === 'all' || d.id === U.tsDept; });
    var emps = []; depts.forEach(function (d) { emps = emps.concat(deptEmps(d.id)); });
    var sc = el('div', { cls: 'ts-scroll', tabindex: '0', role: 'region', 'aria-label': T('ts.grid') });
    var tbl = el('table', { cls: 'grid' });
    var hr = el('tr', {}, [el('th', { scope: 'col', cls: 'nmh', text: T('col.name') })]);
    for (var d = 1; d <= CL.DAYS; d++) hr.appendChild(el('th', { scope: 'col', cls: 'dh' + (CL.dayType(d) !== 'work' && CL.dayType(d) !== 'short' ? ' we' : ''), 'aria-label': d + ' ' + T('wd.' + CL.wdIdx(d)) }, [el('b', { text: String(d) }), el('span', { text: T('wd.' + CL.wdIdx(d)) })]));
    hr.appendChild(el('th', { scope: 'col', cls: 'tot', text: T('ts.hours') }));
    tbl.appendChild(el('thead', {}, [hr]));
    var tb = el('tbody');
    depts.forEach(function (dp) {
      var list = deptEmps(dp.id); if (!list.length) return;
      var st = CL.DB.cycles[dp.id];
      tb.appendChild(el('tr', { cls: 'grp' }, [el('th', { scope: 'rowgroup', colspan: String(CL.DAYS + 2) }, [el('span', { cls: 'grp-in' }, [el('b', { text: CL.deptName(dp.id) }), CL.badge(cycleKind(st), T('cy.' + st))])])]));
      list.forEach(function (e) {
        var t = CL.totals(e.id), r = el('tr');
        r.appendChild(el('th', { scope: 'row', cls: 'nmh' }, [el('i', { cls: 'av sm', text: CL.initials(e.n), 'aria-hidden': 'true' }), el('span', { text: e.n })]));
        for (var dd = 1; dd <= CL.DAYS; dd++) r.appendChild(el('td', { cls: (CL.dayType(dd) === 'we' || CL.dayType(dd) === 'hol') ? 'we' : '' }, [cellBtn(e, dd)]));
        r.appendChild(el('td', { cls: 'tot' + (conflictsOf(e) ? ' bad' : '') }, [el('b', { text: String(t.h) }), el('span', { text: t.ot ? '+' + t.ot : '' })]));
        tb.appendChild(r);
      });
    });
    tbl.appendChild(tb); sc.appendChild(tbl); box.appendChild(sc);
    /* phone: by employee */
    var vis = emps.length ? emps : CL.visibleEmps();
    var cur = CL.emp(U.tsEmp); if (!cur || vis.indexOf(cur) < 0) { cur = vis[0]; U.tsEmp = cur.id; }
    var m = el('div', { cls: 'ts-mobile' });
    var sel = el('select', { cls: 'in', 'aria-label': T('ts.employee'), id: 'tsEmp' });
    vis.forEach(function (e) { sel.appendChild(el('option', { value: e.id, text: e.n })); });
    sel.value = cur.id; sel.addEventListener('change', function () { U.tsEmp = sel.value; CL.render('#tsEmp'); });
    m.appendChild(sel);
    m.appendChild(el('p', { cls: 'lead-s' }, [CL.deptName(cur.dept) + ': ', CL.badge(cycleKind(CL.DB.cycles[cur.dept]), T('cy.' + CL.DB.cycles[cur.dept]))]));
    m.appendChild(CL.tsTiles(cur));
    var ul = el('ul', { cls: 'days' });
    for (var k = 1; k <= CL.DAYS; k++) ul.appendChild(el('li', {}, [dayBtn(cur, k)]));
    m.appendChild(ul); box.appendChild(m);
  }
  function conflictsOf(e) { var n = 0; for (var d = 1; d <= CL.DAYS; d++) if (CL.cellConflict(CL.DB.cells[e.id][d])) n++; return n; }
  function dayBtn(e, d) {
    var x = CL.DB.cells[e.id][d], k = codeText(x), cf = CL.cellConflict(x);
    return el('button', { type: 'button', cls: 'daybtn' + (CL.dayType(d) === 'we' || CL.dayType(d) === 'hol' ? ' we' : '') + (cf ? ' bad' : ''), 'data-cell': e.id + ':' + d, 'aria-label': cellLabel(e, d, x), onclick: function (ev) { openMenu(this, e, d); ev.stopPropagation(); } }, [
      el('span', { cls: 'dn', text: d + ' ' + T('wd.' + CL.wdIdx(d)) }),
      el('span', { cls: 'cell c-' + (k === '' ? 'none' : k) + (cf ? ' bad' : ''), text: letter(x) || '-' }),
      el('span', { cls: 'dl', text: label(x) + (x.h ? ' / ' + x.h + T('unit.h') : '') + (cf ? ' / ' + T(cf === 'dbl' ? 'cf.dbl' : 'cf.hrs') : '') })
    ]);
  }

  function approvalView(box) {
    var un = CL.DB.unified;
    box.appendChild(el('p', { cls: 'lead-s', text: T('ts.flowHint') }));
    var flow = el('ol', { cls: 'flow' });
    ['forming', 'submitted', 'dept_ok', 'hr_ok'].forEach(function (s, i) { flow.appendChild(el('li', {}, [el('i', { text: String(i + 1) }), el('span', { text: T('cy.' + s) })])); });
    flow.appendChild(el('li', {}, [el('i', { text: '5' }), el('span', { text: T('ts.unified') })]));
    box.appendChild(flow);
    box.appendChild(CL.table([
      { h: T('f.dept'), f: function (d) { return CL.deptName(d.id); } },
      { h: T('ts.people'), f: function (d) { return String(CL.DB.emps.filter(function (e) { return e.dept === d.id && e.st !== 'dismissed'; }).length); } },
      { h: T('f.status'), f: function (d) { return CL.badge(cycleKind(CL.DB.cycles[d.id]), T('cy.' + CL.DB.cycles[d.id])); } },
      { h: T('ts.conflicts'), f: function (d) { var n = deptConflicts(d.id); return n ? CL.badge('bad', String(n)) : '0'; } },
      { h: '', f: function (d) { var a = cycleActions(d.id); return a.length ? el('div', { cls: 'acts' }, a) : null; } }
    ], visibleDepts()));
    var panel = el('div', { cls: 'panel-b' }, [el('h3', { text: T('ts.unified') }), el('p', { text: T('ts.unifiedHint') })]);
    var line = el('p', { cls: 'kvline' }, [CL.badge(un.st === 'approved' ? 'ok' : 'warn', un.st === 'approved' ? T('ts.unifApproved', { rev: un.rev }) : T('ts.unifOpen', { rev: un.rev }))]);
    panel.appendChild(line);
    var acts = el('div', { cls: 'acts' });
    if (CL.can('unified') && un.st === 'open') acts.appendChild(CL.btn(T('ts.approveUnified'), approveUnified));
    if (CL.role() === 'hr' && un.st === 'approved') acts.appendChild(CL.btn(T('ts.correct'), correctionDialog, 'btn-ghost'));
    if (CL.role() !== 'mgr') acts.appendChild(CL.btn(T('ts.export'), function () {
      var rows = CL.DB.emps.filter(function (e) { return e.st !== 'dismissed'; }).map(function (e) { var t = CL.totals(e.id); return [e.n, CL.deptName(e.dept), t.h, t.ot, t.off]; });
      CL.csvDialog(T('ts.unified'), [T('col.name'), T('f.dept'), T('ts.hours'), T('sum.ot'), T('sum.off')], rows, 'ts');
    }, 'btn-ghost'));
    panel.appendChild(acts);
    box.appendChild(panel);
    box.appendChild(el('h4', { cls: 'sub-h', text: T('ts.versions') }));
    box.appendChild(CL.table([
      { h: T('ts.rev'), f: function (v) { return 'v' + v.rev; } }, { h: T('f.date'), f: function (v) { return v.at; } },
      { h: T('f.createdBy'), f: function (v) { return T('role.' + v.by); } }, { h: T('ts.hash'), f: function (v) { return el('code', { text: v.hash }); } },
      { h: T('ts.corrReason'), f: function (v) { return v.why || '-'; } }
    ], un.versions, { empty: T('ts.noVersions'), emptyHint: T('ts.noVersionsHint') }));
  }

  CL.registerMod('ts', {
    icon: 'grid',
    badge: function () { return 0; },
    render: function (box) {
      var U = CL.UI;
      box.appendChild(CL.head(T('m.ts'), T('ts.sub')));
      box.appendChild(CL.tabs([['grid', T('ts.tabGrid')], ['appr', T('ts.tabAppr')]], U.tsTab, function (t) { U.tsTab = t; CL.render('[data-tab="' + t + '"]'); }, T('m.ts')));
      if (U.tsTab === 'appr') approvalView(box); else gridView(box);
    }
  });
}());
