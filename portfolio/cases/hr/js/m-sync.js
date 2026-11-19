/* Modules: read-only accounting sync (status, discrepancies, safeguards) and reports with export log. */
(function () {
  'use strict';
  var CL = window.CL, T = CL.T, el = CL.el;
  CL.ud({ syncTab: 'status', repTab: 'head' });

  /* ---------- sync ---------- */
  function rowsOf(id) {
    var D = CL.DB;
    return id === 'staff' ? D.emps.length : id === 'abs' ? D.events.filter(function (e) { return CL.absCode(e.type) && e.st === 'applied'; }).length : id === 'org' ? D.refs.depts.length : D.refs.pos.length;
  }
  function refresh() {
    var S = CL.DB.sync, rq = S.req;
    if (rq.st === 'running') return;
    if (rq.until && CL.DB.clock < rq.until) { CL.log('sync', 'sync.tooFrequent', {}); CL.toast(T('toast.tooFrequent')); CL.render('.refresh'); return; }
    rq.st = 'running'; CL.log('sync', 'sync.request', {}); CL.render('.refresh');
    setTimeout(function () {
      var at = CL.stamp();
      S.sets.forEach(function (s) { s.at = at; });
      rq.st = 'done'; rq.at = at; rq.until = CL.DB.clock + 10;
      if (!rq.added) { rq.added = true; S.disc.push({ id: 'sd5', kind: 'field', emp: 'e12', field: 'pos', ours: 'disp', theirs: 'coord', st: 'open' }); }
      CL.log('sync', 'sync.done', {}); CL.toast(T('toast.syncDone')); CL.render();
    }, PF.reduced ? 300 : 2200);
  }
  function fieldVal(d, v) { return d.field === 'dept' ? CL.deptName(v) : d.field === 'pos' ? CL.posName(v) : v; }
  function decide(d, accept) {
    var e = CL.emp(d.emp);
    if (accept) {
      if (d.kind === 'absence') {
        var ev = { id: CL.nextId('ev'), type: d.type, emp: d.emp, date: d.from, to: d.to, p: {}, st: 'applied', by: 'hr', at: CL.stamp(), why: '', fx: 'fx.fromSync', steps: CL.CHAINS[d.type].map(function (r) { return { r: r, st: 'ok', by: 'hr', at: CL.TODAY }; }) };
        CL.DB.events.unshift(ev); if (CL.tsOpenFor(e.dept)) CL.applyAbsence(e, CL.absCode(d.type), d.from, d.to);
      } else if (d.field === 'hired') { e.hired = d.theirs; }
      else e[d.field] = d.theirs;
      d.st = 'accepted'; CL.log('sync', 'sync.accept', { name: e.n }, d.id); CL.toast(T('toast.syncAccepted')); CL.render();
    } else {
      var form = CL.form([{ k: 'why', label: T('sync.keepReason'), type: 'textarea', req: true, minlen: 8 }]);
      CL.dialog(T('sync.keep'), form.node, [{ text: T('dlg.cancel'), ghost: true }, { text: T('sync.keep'), onclick: function () { if (!form.validate()) return false; d.st = 'kept'; d.why = form.get().why; CL.log('sync', 'sync.keep', { name: e.n }, d.id); CL.render(); } }]);
    }
  }
  var SYNC_KIND = { ok: 'ok', partial: 'warn' };
  CL.registerMod('sync', {
    icon: 'sync',
    badge: function () { return CL.DB.sync.disc.filter(function (d) { return d.st === 'open'; }).length; },
    render: function (box) {
      var U = CL.UI, S = CL.DB.sync, open = S.disc.filter(function (d) { return d.st === 'open'; }).length;
      box.appendChild(CL.head(T('m.sync'), T('sync.sub'), CL.can('refresh') ? [el('button', { type: 'button', cls: 'btn btn-sm refresh', disabled: S.req.st === 'running', text: S.req.st === 'running' ? T('sync.running') : T('sync.refresh'), onclick: refresh })] : []));
      box.appendChild(CL.tabs([['status', T('sync.tabStatus')], ['disc', T('sync.tabDisc'), open], ['safe', T('sync.tabSafe')]], U.syncTab, function (t) { U.syncTab = t; CL.render('[data-tab="' + t + '"]'); }, T('m.sync')));
      if (U.syncTab === 'disc') {
        box.appendChild(el('p', { cls: 'lead-s', text: CL.role() === 'hr' ? T('sync.discHint') : T('sync.discView') }));
        box.appendChild(CL.table([
          { h: T('f.employee'), f: function (d) { return CL.link(CL.emp(d.emp).n, function () { CL.go('staff', { sel: d.emp, cardTab: 'data' }); }); } },
          { h: T('sync.field'), f: function (d) { return d.kind === 'absence' ? T('sync.absence') : T('fld.' + d.field); } },
          { h: T('sync.ours'), f: function (d) { return d.kind === 'absence' ? T('sync.none') : fieldVal(d, d.ours); } },
          { h: T('sync.theirs'), f: function (d) { return d.kind === 'absence' ? T('ev.t.' + d.type) + ' ' + d.from + ' - ' + d.to : fieldVal(d, d.theirs); } },
          { h: T('f.status'), f: function (d) { return CL.badge(d.st === 'open' ? 'warn' : d.st === 'accepted' ? 'ok' : 'info', T('sync.st.' + d.st)); } },
          { h: '', f: function (d) { return d.st === 'open' && CL.can('syncDecide') ? el('div', { cls: 'acts' }, [CL.btn(T('sync.take'), function () { decide(d, true); }), CL.btn(T('sync.keep'), function () { decide(d, false); }, 'btn-ghost')]) : (d.why ? d.why : null); } }
        ], S.disc.filter(function (d) { return CL.inScope(d.emp); }), { empty: T('sync.noDisc') }));
      } else if (U.syncTab === 'safe') {
        box.appendChild(el('div', { cls: 'cols' }, [1, 2, 3].map(function (n) { return el('section', { cls: 'card-b' }, [el('b', { cls: 'num', text: String(n) }), el('h3', { text: T('sync.l' + n + 'h') }), el('p', { text: T('sync.l' + n + 'p') })]); })));
        box.appendChild(el('p', { cls: 'okline' }, [CL.icon('shield'), T('sync.writes')]));
        box.appendChild(el('p', { cls: 'hint-s', text: T('sync.rules') }));
      } else {
        box.appendChild(CL.table([
          { h: T('sync.dataset'), f: function (s) { return T('ds.' + s.id); } }, { h: T('sync.rows'), f: function (s) { return String(rowsOf(s.id)); } },
          { h: T('sync.last'), f: function (s) { return s.at; } },
          { h: T('f.status'), f: function (s) { return CL.badge(SYNC_KIND[s.st], s.st === 'ok' ? T('sync.ok') : T('sync.partial', { n: s.skipped })); } }
        ], S.sets));
        box.appendChild(el('p', { cls: 'hint-s', text: T('sync.cool') }));
        if (S.req.st === 'done') box.appendChild(el('p', { cls: 'okline' }, [CL.icon('check'), T('sync.lastReq', { at: S.req.at })]));
      }
    }
  });

  /* ---------- reports ---------- */
  CL.csvDialog = function (title, head, rows, rep) {
    var csv = [head.join(';')].concat(rows.map(function (r) { return r.map(function (c) { return String(c).replace(/[;\n]/g, ' ').replace(/^([=+\-@])/, "'$1"); }).join(';'); })).join('\n');
    var pre = el('pre', { cls: 'csv', tabindex: '0', text: csv });
    CL.dialog(title, el('div', {}, [el('p', { cls: 'dlg-p', text: T('rep.csvHint', { n: rows.length }) }), pre]), [{ text: T('dlg.close'), ghost: true }, { text: T('rep.download'), onclick: function () {
      CL.DB.exports.unshift({ id: CL.nextId('ex'), at: CL.stamp(), role: CL.role(), rep: rep, rows: rows.length });
      CL.log('reports', 'rep.export', { rep: '~rep.n.' + rep, n: rows.length }); CL.toast(T('toast.exported')); CL.render();
    } }], { wide: true });
  };
  function repHead(box) {
    var D = CL.DB, vis = CL.visibleEmps();
    box.appendChild(el('p', { cls: 'lead-s', text: T('rep.headHint') }));
    var rows = D.refs.depts.filter(function (d) { return CL.role() !== 'mgr' || d.id === CL.MGR_DEPT; }).map(function (d) {
      var list = D.emps.filter(function (e) { return e.dept === d.id; }), ev = D.events.filter(function (x) { return x.st === 'applied' && x.date >= CL.MONTH + '-01' && D.emps.some(function (e) { return e.id === x.emp && e.dept === d.id; }); });
      return [CL.deptName(d.id), list.filter(function (e) { return e.st !== 'dismissed'; }).length, list.filter(function (e) { return e.st === 'probation'; }).length, ev.filter(function (x) { return x.type === 'hire'; }).length, list.filter(function (e) { return e.leftOn && e.leftOn >= CL.MONTH + '-01'; }).length + ev.filter(function (x) { return x.type === 'dismissal'; }).length * 0, ev.filter(function (x) { return x.type === 'transfer'; }).length];
    });
    var head = [T('f.dept'), T('rep.hc'), T('rep.prob'), T('rep.hires'), T('rep.leavers'), T('rep.transfers')];
    box.appendChild(CL.table(head.map(function (h, i) { return { h: h, f: function (r) { return String(r[i]); } }; }), rows));
    box.appendChild(CL.btn(T('rep.export'), function () { CL.csvDialog(T('rep.n.head'), head, rows, 'head'); }, 'btn-ghost'));
    void vis;
  }
  function absRows() {
    var sc = CL.DB.settings.sickCompany;
    return CL.visibleEmps().filter(function (e) { return e.st !== 'dismissed'; }).map(function (e) {
      var v = 0, s = 0, u = 0; for (var d = 1; d <= CL.DAYS; d++) { var c = CL.DB.cells[e.id][d].c; if (c === 'V') v++; else if (c === 'S') s++; else if (c === 'U') u++; }
      return [e.n, CL.deptName(e.dept), v, CL.can('sick') || CL.role() === 'acc' ? s : '-', CL.can('sick') || CL.role() === 'acc' ? Math.min(s, sc) : '-', u];
    }).filter(function (r) { return r[2] || r[3] !== 0 && r[3] !== '-' || r[5]; });
  }
  function repAbs(box) {
    box.appendChild(el('p', { cls: 'lead-s', text: T('rep.absHint', { n: CL.DB.settings.sickCompany }) }));
    var head = [T('col.name'), T('f.dept'), T('rep.vac'), T('rep.sick'), T('rep.sickCo'), T('rep.unpaid')], rows = absRows();
    box.appendChild(CL.table(head.map(function (h, i) { return { h: h, f: function (r) { return String(r[i]); } }; }), rows, { empty: T('rep.none') }));
    if (CL.role() !== 'mgr') box.appendChild(CL.btn(T('rep.export'), function () { CL.csvDialog(T('rep.n.abs'), head, rows, 'abs'); }, 'btn-ghost'));
    else box.appendChild(el('p', { cls: 'hint-s', text: T('rep.noExport') }));
  }
  function repTs(box) {
    box.appendChild(el('p', { cls: 'lead-s', text: T('rep.tsHint') }));
    var head = [T('f.dept'), T('ts.people'), T('ts.hours'), T('sum.ot'), T('f.status')];
    var rows = CL.DB.refs.depts.filter(function (d) { return CL.role() !== 'mgr' || d.id === CL.MGR_DEPT; }).map(function (d) {
      var h = 0, ot = 0, n = 0; CL.DB.emps.forEach(function (e) { if (e.dept === d.id && e.st !== 'dismissed') { var t = CL.totals(e.id); h += t.h; ot += t.ot; n++; } });
      return [CL.deptName(d.id), n, h, ot, T('cy.' + CL.DB.cycles[d.id])];
    });
    box.appendChild(CL.table(head.map(function (h, i) { return { h: h, f: function (r) { return String(r[i]); } }; }), rows));
    box.appendChild(CL.btn(T('rep.export'), function () { CL.csvDialog(T('rep.n.ts'), head, rows, 'ts'); }, 'btn-ghost'));
  }
  function repChecks(box) {
    box.appendChild(el('p', { cls: 'lead-s', text: T('rep.chkHint') }));
    var head = [T('chk.rule'), T('chk.severity'), T('chk.what')], list = CL.findings();
    var rows = list.map(function (f) { return [f.rule, T('sev.' + f.sev), T('chk.t.' + f.rule, f.vars)]; });
    box.appendChild(CL.table(head.map(function (h, i) { return { h: h, f: function (r) { return String(r[i]); } }; }), rows, { empty: T('chk.clear') }));
    if (rows.length) box.appendChild(CL.btn(T('rep.export'), function () { CL.csvDialog(T('rep.n.chk'), head, rows, 'chk'); }, 'btn-ghost'));
  }
  function repLog(box) {
    box.appendChild(el('p', { cls: 'lead-s', text: T('rep.logHint') }));
    box.appendChild(CL.table([{ h: T('f.date'), f: function (x) { return x.at; } }, { h: T('rep.report'), f: function (x) { return T('rep.n.' + x.rep); } }, { h: T('rep.rows'), f: function (x) { return String(x.rows); } }, { h: T('f.createdBy'), f: function (x) { return T('role.' + x.role); } }], CL.DB.exports, { empty: T('rep.noLog') }));
  }
  CL.registerMod('reports', {
    icon: 'report',
    badge: function () { return 0; },
    render: function (box) {
      var U = CL.UI;
      box.appendChild(CL.head(T('m.reports'), T('rep.sub')));
      box.appendChild(CL.tabs([['head', T('rep.n.head')], ['abs', T('rep.n.abs')], ['ts', T('rep.n.ts')], ['chk', T('rep.n.chk')], ['log', T('rep.log')]], U.repTab, function (t) { U.repTab = t; CL.render('[data-tab="' + t + '"]'); }, T('m.reports')));
      ({ head: repHead, abs: repAbs, ts: repTs, chk: repChecks, log: repLog }[U.repTab] || repHead)(box);
    }
  });
}());
