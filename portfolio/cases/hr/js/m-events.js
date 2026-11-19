/* Module: HR events with approval workflow, inbox and probation control. */
(function () {
  'use strict';
  var CL = window.CL, T = CL.T, el = CL.el;

  CL.parseISO = function (s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); };
  CL.addDays = function (s, n) { var d = new Date(CL.parseISO(s) + n * 86400000); return d.getUTCFullYear() + '-' + CL.pad2(d.getUTCMonth() + 1) + '-' + CL.pad2(d.getUTCDate()); };
  CL.workdaysBetween = function (from, to) {
    var n = 0, d = CL.parseISO(from), e = CL.parseISO(to), dir = e >= d ? 1 : -1;
    while (d !== e) { d += dir * 86400000; var w = new Date(d).getUTCDay(); if (w !== 0 && w !== 6) n += dir; }
    return n;
  };
  CL.evName = function (ev) { var e = ev.emp ? CL.emp(ev.emp) : null; return e ? e.n : (ev.p.name || '-'); };
  CL.evTitle = function (ev) { return T('ev.t.' + ev.type) + ': ' + CL.evName(ev); };
  CL.evRef = function (ev) { return { mod: 'events', id: ev.id }; };
  function A(v) { return v; }

  /* ---------- workflow ---------- */
  CL.canDecide = function (ev) {
    if (ev.st !== 'pending') return null;
    var step = null, i;
    for (i = 0; i < ev.steps.length; i++) if (ev.steps[i].st === 'wait') { step = ev.steps[i]; break; }
    if (!step) return null;
    var r = CL.role(), e = ev.emp ? CL.emp(ev.emp) : null;
    if (CL.DB.settings.initiator === 'none' && ev.by === r) return null;
    if (step.r === r && (r !== 'mgr' || !e || e.dept === CL.MGR_DEPT)) return step;
    if (step.r === 'mgr' && r === 'hr' && e && e.dept !== CL.MGR_DEPT) return step;
    return null;
  };
  CL.createEvent = function (o) {
    var ev = { id: CL.nextId('ev'), type: o.type, emp: o.emp || null, date: o.date, to: o.to || null, p: o.p || {}, st: 'pending', by: CL.role(), at: CL.stamp(), why: '', steps: [] };
    CL.CHAINS[o.type].forEach(function (r) { ev.steps.push({ r: r, st: 'wait', by: null, at: null }); });
    var rule = CL.DB.settings.initiator, role = CL.role();
    if (rule !== 'none') {
      for (var i = 0; i < ev.steps.length; i++) {
        if (ev.steps[i].r === role) { ev.steps[i].st = 'ok'; ev.steps[i].by = role; ev.steps[i].at = ev.at; if (rule === 'one') break; }
      }
    }
    CL.DB.events.unshift(ev);
    CL.log('events', 'event.create', { type: '~ev.t.' + o.type, name: CL.evName(ev) }, ev.id);
    if (ev.steps.every(function (s) { return s.st === 'ok'; })) CL.applyEvent(ev);
    return ev;
  };
  CL.decide = function (ev, ok, why) {
    var step = CL.canDecide(ev); if (!step) return false;
    step.st = ok ? 'ok' : 'no'; step.by = CL.role(); step.at = CL.stamp();
    if (!ok) { ev.st = 'rejected'; ev.why = why || ''; CL.log('events', 'event.reject', { type: '~ev.t.' + ev.type, name: CL.evName(ev) }, ev.id); return true; }
    CL.log('events', 'event.approve', { type: '~ev.t.' + ev.type, name: CL.evName(ev) }, ev.id);
    if (ev.steps.every(function (s) { return s.st === 'ok'; })) CL.applyEvent(ev);
    return true;
  };
  CL.tsOpenFor = function (dept) { return CL.DB.unified.st === 'open' && CL.DB.cycles[dept] === 'forming'; };
  CL.applyEvent = function (ev) {
    var e = ev.emp ? CL.emp(ev.emp) : null, p = ev.p, eff = '';
    if (ev.type === 'hire' && !e) {
      var id = 'e' + (CL.DB.emps.length + 1);
      e = { id: id, n: p.name, dept: p.dept, pos: p.pos, sched: p.sched || 'five', st: 'probation', tier: 'A', hired: ev.date, contract: false, off: 0, probEnd: CL.addDays(ev.date, 60) };
      CL.DB.emps.push(e); CL.genCells(e); ev.emp = id; eff = 'fx.hire';
    } else if (ev.type === 'probation' && e) {
      if (p.result === 'pass') { e.st = 'active'; eff = 'fx.passed'; }
      else if (p.result === 'fail') { e.st = 'dismissed'; e.leftOn = ev.date; eff = 'fx.failed'; }
      else { e.probEnd = CL.addDays(e.probEnd || ev.date, 30); eff = 'fx.extended'; }
    } else if (ev.type === 'transfer' && e) { e.dept = p.dept; e.pos = p.pos || e.pos; eff = 'fx.transfer'; }
    else if (ev.type === 'sched' && e) { e.sched = p.sched; eff = 'fx.sched'; }
    else if (ev.type === 'rate' && e) { e.tier = p.tier; eff = 'fx.rate'; }
    else if (CL.absCode(ev.type) && e) {
      var n = 0;
      if (CL.tsOpenFor(e.dept)) n = CL.applyAbsence(e, CL.absCode(ev.type), ev.date, ev.to || ev.date);
      if (ev.date <= CL.TODAY && (ev.to || ev.date) >= CL.TODAY && ev.type !== 'sick') e.st = 'leave';
      eff = n ? 'fx.absTs' : 'fx.absLater'; ev.fxN = n;
    } else if (ev.type === 'dismissal' && e) {
      e.st = 'dismissed'; e.leftOn = ev.date;
      if (CL.tsOpenFor(e.dept)) { for (var d = 1; d <= CL.DAYS; d++) if (CL.dateStr(d) > ev.date) CL.DB.cells[e.id][d] = { c: 'off', h: 0 }; }
      eff = 'fx.dismiss';
    }
    ev.st = 'applied'; ev.fx = eff;
    CL.log('events', 'event.apply', { type: '~ev.t.' + ev.type, name: CL.evName(ev) }, ev.id);
  };
  CL.cancelEvent = function (ev) { ev.st = 'cancelled'; CL.log('events', 'event.cancel', { type: '~ev.t.' + ev.type, name: CL.evName(ev) }, ev.id); };

  CL.tasks = function () {
    var r = CL.role(), out = [];
    CL.DB.events.forEach(function (ev) { if (CL.canDecide(ev)) out.push({ k: 'ev', text: T('task.ev', { t: CL.evTitle(ev) }), go: function () { CL.go('events', { evTab: 'inbox' }); openDetail(ev); } }); });
    CL.DB.memos.forEach(function (m) {
      if (m.st === 'submitted' && r === 'ceo' && m.by !== 'ceo') out.push({ k: 'mm', text: T('task.memo', { name: CL.emp(m.emp).n }), go: function () { CL.go('memos'); } });
      if (m.st !== 'approved' && !m.priced && CL.can('price') && CL.inScope(m.emp)) out.push({ k: 'mp', text: T('task.memoPrice', { name: CL.emp(m.emp).n }), go: function () { CL.go('memos'); } });
    });
    CL.DB.pieces.forEach(function (p) {
      if (p.st !== 'draft') return;
      if (!p.price && CL.can('price')) out.push({ k: 'pp', text: T('task.piecePrice', { id: p.id.toUpperCase() }), go: function () { CL.go('piece'); } });
      if (p.price && r !== 'acc' && p.by !== r && (r !== 'mgr' || p.dept === CL.MGR_DEPT)) out.push({ k: 'pc', text: T('task.pieceConfirm', { id: p.id.toUpperCase() }), go: function () { CL.go('piece'); } });
    });
    return out;
  };

  /* ---------- forms ---------- */
  var MGR_TYPES = ['probation', 'transfer', 'sched', 'vacation', 'unpaid', 'dismissal', 'sick'];
  function typesForRole() { var r = CL.role(); return r === 'hr' ? CL.EV_TYPES : r === 'mgr' ? MGR_TYPES : []; }
  function empOpts(filter) {
    return CL.visibleEmps().filter(function (e) { return e.st !== 'dismissed' && (!filter || filter(e)); }).map(function (e) { return [e.id, e.n + ' / ' + CL.deptName(e.dept)]; });
  }
  function deptOpts() { return CL.DB.refs.depts.map(function (d) { return [d.id, CL.deptName(d.id)]; }); }
  function posOpts() { return CL.DB.refs.pos.map(function (d) { return [d.id, CL.posName(d.id)]; }); }
  function overlaps(empId, from, to, skipId) {
    return CL.DB.events.some(function (ev) { return ev.emp === empId && ev.id !== skipId && CL.absCode(ev.type) && (ev.st === 'pending' || ev.st === 'applied') && ev.date <= to && (ev.to || ev.date) >= from; });
  }
  CL.newEventDialog = function (type, preEmp) {
    var types = typesForRole();
    if (!types.length) { CL.toast(T('ev.noCreate')); return; }
    if (!type) {
      var g = el('div', { cls: 'typegrid' });
      types.forEach(function (t) { g.appendChild(el('button', { type: 'button', cls: 'typebtn', onclick: function () { dlg.close(); CL.newEventDialog(t, preEmp); } }, [el('b', { text: T('ev.t.' + t) }), el('span', { text: T('ev.h.' + t) }), el('small', { text: T('ev.chain') + ': ' + CL.CHAINS[t].map(function (r) { return T('role.' + r); }).join(' > ') })])); });
      var dlg = CL.dialog(T('ev.new'), g, [], { wide: true });
      return;
    }
    var f = [];
    var isAbs = !!CL.absCode(type), s = CL.DB.settings;
    if (type !== 'hire') f.push({ k: 'emp', label: T('f.employee'), type: 'select', opts: empOpts(type === 'probation' ? function (e) { return e.st === 'probation'; } : null), req: true, value: preEmp });
    else {
      f.push({ k: 'name', label: T('f.newName'), req: true, help: T('f.newNameHelp'), pattern: /^[A-Z][a-z]+ [A-Z]\.$/, patternMsg: 'v.nameFmt' });
      f.push({ k: 'dept', label: T('f.dept'), type: 'select', opts: deptOpts(), req: true });
      f.push({ k: 'pos', label: T('f.pos'), type: 'select', opts: posOpts(), req: true });
      f.push({ k: 'sched', label: T('f.sched'), type: 'select', opts: CL.DB.refs.sched.map(function (x) { return [x.id, T('sch.' + x.id)]; }), req: true });
    }
    f.push({ k: 'date', label: isAbs ? T('f.from') : T('f.effective'), type: 'date', req: true, value: type === 'rate' ? '2026-11-01' : type === 'hire' ? '2026-11-02' : isAbs ? '2026-11-16' : CL.TODAY });
    if (isAbs) f.push({ k: 'to', label: T('f.to'), type: 'date', req: true, value: type === 'sick' ? '2026-11-17' : '2026-11-20' });
    if (type === 'transfer') { f.push({ k: 'dept', label: T('f.newDept'), type: 'select', opts: deptOpts(), req: true }); f.push({ k: 'pos', label: T('f.newPos'), type: 'select', opts: posOpts(), req: true }); }
    if (type === 'sched') f.push({ k: 'sched', label: T('f.sched'), type: 'select', opts: CL.DB.refs.sched.map(function (x) { return [x.id, T('sch.' + x.id)]; }), req: true });
    if (type === 'rate') f.push({ k: 'tier', label: T('f.tier'), type: 'select', opts: [['A', T('rate.tier', { t: 'A' })], ['B', T('rate.tier', { t: 'B' })], ['C', T('rate.tier', { t: 'C' })]], req: true, help: T('f.tierHelp') });
    if (type === 'probation') f.push({ k: 'result', label: T('f.result'), type: 'select', opts: [['pass', T('res.pass')], ['extend', T('res.extend')], ['fail', T('res.fail')]], req: true });
    if (type === 'dismissal') f.push({ k: 'reason', label: T('f.reason'), type: 'select', opts: [['own', T('rs.own')], ['agreed', T('rs.agreed')], ['end', T('rs.end')]], req: true });
    var form = CL.form(f, function (v) {
      var er = {}, e = v.emp ? CL.emp(v.emp) : null;
      if (type === 'hire') {
        var dup = CL.DB.emps.filter(function (x) { return x.n.toLowerCase() === v.name.toLowerCase(); })[0] || CL.DB.events.filter(function (x) { return x.st === 'pending' && x.type === 'hire' && (x.p.name || '').toLowerCase() === v.name.toLowerCase(); })[0];
        if (dup) er.name = { key: 'v.dup' };
      }
      if (isAbs) {
        if (v.to < v.date) er.to = { key: 'v.toBefore' };
        else if (overlaps(v.emp, v.date, v.to)) er.date = { key: s.sickOver === 'allow' ? 'v.overlap' : 'v.overlap' };
        if (e && v.date < e.hired) er.date = { key: 'v.beforeHire' };
      }
      if (type === 'rate' && v.date.slice(8) !== '01') er.date = { key: 'v.firstDay' };
      if (type === 'transfer' && e && v.dept === e.dept && v.pos === e.pos) er.dept = { key: 'v.sameDept' };
      if (type === 'sched' && e && v.sched === e.sched) er.sched = { key: 'v.sameSched' };
      if (type === 'rate' && e && v.tier === e.tier) er.tier = { key: 'v.sameTier' };
      if (type === 'dismissal' && v.date < CL.TODAY && CL.role() !== 'hr') er.date = { key: 'v.pastDate' };
      return er;
    });
    var dlg2 = CL.dialog(T('ev.t.' + type), el('div', {}, [el('p', { cls: 'dlg-p', text: T('ev.h.' + type) + ' ' + T('ev.chain') + ': ' + CL.CHAINS[type].map(function (r) { return T('role.' + r); }).join(' > ') + '.' }), form.node]), [
      { text: T('dlg.cancel'), ghost: true },
      { text: T('ev.submit'), onclick: function () {
        if (!form.validate()) return false;
        var v = form.get(), p = {};
        if (type === 'hire') p = { name: v.name, dept: v.dept, pos: v.pos, sched: v.sched };
        else if (type === 'transfer') p = { dept: v.dept, pos: v.pos };
        else if (type === 'sched') p = { sched: v.sched };
        else if (type === 'rate') p = { tier: v.tier };
        else if (type === 'probation') p = { result: v.result };
        else if (type === 'dismissal') p = { reason: v.reason };
        var ev = CL.createEvent({ type: type, emp: v.emp || null, date: v.date, to: v.to || null, p: p });
        CL.toast(ev.st === 'applied' ? T('toast.evApplied') : T('toast.evCreated'));
        CL.go('events', { evTab: 'list' });
        openDetail(ev);
      } }
    ]);
  };

  function chainView(ev) {
    var ul = el('ol', { cls: 'chain' });
    ev.steps.forEach(function (s, i) {
      ul.appendChild(el('li', { cls: 'st-' + s.st }, [el('i', { cls: 'dot', 'aria-hidden': 'true', text: s.st === 'ok' ? 'v' : s.st === 'no' ? 'x' : String(i + 1) }),
        el('div', {}, [el('b', { text: T('role.' + s.r) }), el('span', { text: s.st === 'ok' ? T('ev.stepOk', { who: T('role.' + s.by), at: s.at || '' }) : s.st === 'no' ? T('ev.stepNo', { who: T('role.' + s.by), at: s.at || '' }) : T('ev.stepWait') })])]));
    });
    return ul;
  }
  var STATUS_KIND = { pending: 'warn', applied: 'ok', rejected: 'bad', cancelled: 'info' };
  function openDetail(ev) {
    var body = el('div', { cls: 'detail' });
    var rows = [[T('f.employee'), CL.evName(ev)], [T('f.type'), T('ev.t.' + ev.type)], [ev.to ? T('f.period') : T('f.effective'), ev.to ? ev.date + ' - ' + ev.to : ev.date], [T('f.status'), T('ev.st.' + ev.st)], [T('f.createdBy'), T('role.' + ev.by) + ', ' + ev.at]];
    var p = ev.p;
    if (p.dept) rows.push([T('f.dept'), CL.deptName(p.dept)]);
    if (p.pos) rows.push([T('f.pos'), CL.posName(p.pos)]);
    if (p.sched) rows.push([T('f.sched'), T('sch.' + p.sched)]);
    if (p.tier) rows.push([T('f.tier'), CL.can('rate') ? T('rate.tier', { t: p.tier }) : null]);
    if (p.result) rows.push([T('f.result'), T('res.' + p.result)]);
    if (p.reason) rows.push([T('f.reason'), T('rs.' + p.reason)]);
    var dl = el('dl', { cls: 'kv' });
    rows.forEach(function (r) { dl.appendChild(el('div', {}, [el('dt', { text: r[0] }), el('dd', {}, [r[1] === null ? CL.locked() : r[1]])])); });
    body.appendChild(dl);
    body.appendChild(el('h4', { cls: 'sub-h', text: T('ev.approval') }));
    body.appendChild(chainView(ev));
    if (ev.st === 'rejected' && ev.why) body.appendChild(el('p', { cls: 'note-r', text: T('ev.rejectedWhy', { why: ev.why }) }));
    if (ev.st === 'applied' && ev.fx) body.appendChild(el('p', { cls: 'note-ok' }, [CL.icon('check'), el('span', { text: T(ev.fx, { n: ev.fxN || 0 }) })]));
    var logs = CL.DB.audit.filter(function (a) { return a.ref === ev.id; });
    if (logs.length) {
      body.appendChild(el('h4', { cls: 'sub-h', text: T('ev.history') }));
      body.appendChild(el('ul', { cls: 'mini' }, logs.map(function (a) { return el('li', {}, [el('time', { text: a.t }), el('span', { text: CL.auditText(a) })]); })));
    }
    var btns = [];
    var step = CL.canDecide(ev);
    if (step) {
      btns.push({ text: T('ev.approve'), onclick: function () { CL.decide(ev, true); CL.toast(ev.st === 'applied' ? T('toast.evApplied') : T('toast.evApproved')); CL.render(); } });
      btns.push({ text: T('ev.reject'), ghost: true, onclick: function () { askReject(ev); } });
    }
    if (ev.st === 'pending' && (CL.role() === 'hr' || ev.by === CL.role())) btns.push({ text: T('ev.cancel'), ghost: true, onclick: function () { CL.cancelEvent(ev); CL.toast(T('toast.evCancelled')); CL.render(); } });
    btns.push({ text: T('dlg.close'), ghost: true });
    CL.dialog(CL.evTitle(ev), body, btns, { wide: true });
  }
  CL.openEvent = openDetail;
  function askReject(ev) {
    var form = CL.form([{ k: 'why', label: T('ev.rejectReason'), type: 'textarea', req: true, minlen: 5 }]);
    CL.dialog(T('ev.reject'), form.node, [{ text: T('dlg.cancel'), ghost: true }, { text: T('ev.reject'), onclick: function () { if (!form.validate()) return false; CL.decide(ev, false, form.get().why); CL.toast(T('toast.evRejected')); CL.render(); } }]);
  }

  /* ---------- module view ---------- */
  CL.ud({ evTab: 'list', evType: 'all', evStatus: 'all', evQ: '' });
  function visibleEvents() {
    return CL.DB.events.filter(function (ev) { return CL.inScope(ev.emp) && !(CL.role() === 'mgr' && !ev.emp); });
  }
  function listView(box) {
    var U = CL.UI;
    var f = el('div', { cls: 'filters' });
    var q = el('input', { type: 'search', cls: 'in', placeholder: T('ev.search'), 'aria-label': T('ev.search'), value: U.evQ });
    var sT = el('select', { cls: 'in', 'aria-label': T('f.type') }, [el('option', { value: 'all', text: T('f.allTypes') })].concat(CL.EV_TYPES.map(function (t) { return el('option', { value: t, text: T('ev.t.' + t) }); })));
    var sS = el('select', { cls: 'in', 'aria-label': T('f.status') }, [el('option', { value: 'all', text: T('f.allStatuses') })].concat(['pending', 'applied', 'rejected', 'cancelled'].map(function (t) { return el('option', { value: t, text: T('ev.st.' + t) }); })));
    sT.value = U.evType; sS.value = U.evStatus;
    f.appendChild(el('label', { cls: 'search' }, [CL.icon('search'), q])); f.appendChild(sT); f.appendChild(sS);
    box.appendChild(f);
    var out = el('div');
    box.appendChild(out);
    function fill() {
      out.innerHTML = '';
      var qq = U.evQ.toLowerCase();
      var rows = visibleEvents().filter(function (ev) {
        return (U.evType === 'all' || ev.type === U.evType) && (U.evStatus === 'all' || ev.st === U.evStatus) && (!qq || CL.evName(ev).toLowerCase().indexOf(qq) >= 0);
      });
      out.appendChild(CL.table([
        { h: T('f.date'), f: function (ev) { return ev.date; } },
        { h: T('f.type'), f: function (ev) { return CL.link(T('ev.t.' + ev.type), function () { openDetail(ev); }); } },
        { h: T('f.employee'), f: CL.evName },
        { h: T('f.period'), f: function (ev) { return ev.to ? ev.date + ' - ' + ev.to : '-'; } },
        { h: T('ev.approval'), f: function (ev) { return ev.steps.filter(function (s) { return s.st === 'ok'; }).length + ' / ' + ev.steps.length; } },
        { h: T('f.status'), f: function (ev) { return CL.badge(STATUS_KIND[ev.st], T('ev.st.' + ev.st)); } }
      ], rows, { empty: T('ev.none'), emptyHint: T('ev.noneHint') }));
    }
    q.addEventListener('input', function () { U.evQ = q.value; fill(); });
    sT.addEventListener('change', function () { U.evType = sT.value; fill(); });
    sS.addEventListener('change', function () { U.evStatus = sS.value; fill(); });
    fill();
  }
  function inboxView(box) {
    var list = CL.DB.events.filter(function (ev) { return CL.canDecide(ev); });
    box.appendChild(el('p', { cls: 'lead-s', text: T('ev.inboxHint') }));
    box.appendChild(CL.table([
      { h: T('f.type'), f: function (ev) { return CL.link(CL.evTitle(ev), function () { openDetail(ev); }); } },
      { h: T('f.effective'), f: function (ev) { return ev.date; } },
      { h: T('f.createdBy'), f: function (ev) { return T('role.' + ev.by); } },
      { h: '', f: function (ev) { return CL.btn(T('ev.approve'), function () { CL.decide(ev, true); CL.toast(T('toast.evApproved')); CL.render(); }); } }
    ], list, { empty: T('ev.inboxEmpty'), emptyHint: T('ev.inboxEmptyHint') }));
  }
  function probationView(box) {
    var rows = CL.visibleEmps().filter(function (e) { return e.st === 'probation'; });
    box.appendChild(el('p', { cls: 'lead-s', text: T('ev.probHint', { n: CL.DB.settings.probDays }) }));
    box.appendChild(CL.table([
      { h: T('f.employee'), f: function (e) { return e.n; } },
      { h: T('f.dept'), f: function (e) { return CL.deptName(e.dept); } },
      { h: T('f.hired'), f: function (e) { return e.hired; } },
      { h: T('f.probEnd'), f: function (e) { return e.probEnd; } },
      { h: T('f.status'), f: function (e) {
        var pend = CL.DB.events.some(function (ev) { return ev.emp === e.id && ev.type === 'probation' && ev.st === 'pending'; });
        var left = CL.workdaysBetween(CL.TODAY, e.probEnd);
        if (pend) return CL.badge('info', T('prob.pending'));
        return left < 0 ? CL.badge('bad', T('prob.expired')) : left <= CL.DB.settings.probDays ? CL.badge('warn', T('prob.soon', { n: left })) : CL.badge('ok', T('prob.running', { n: left }));
      } },
      { h: '', f: function (e) { return CL.role() === 'hr' || CL.role() === 'mgr' ? CL.btn(T('prob.record'), function () { CL.newEventDialog('probation', e.id); }) : null; } }
    ], rows, { empty: T('prob.none') }));
  }
  CL.registerMod('events', {
    icon: 'events',
    badge: function () { return CL.tasks().filter(function (t) { return t.k === 'ev'; }).length; },
    render: function (box) {
      var U = CL.UI, inbox = CL.DB.events.filter(function (ev) { return CL.canDecide(ev); }).length;
      box.appendChild(CL.head(T('m.events'), T('ev.sub'), typesForRole().length ? [CL.btn(T('ev.new'), function () { CL.newEventDialog(); })] : []));
      box.appendChild(CL.tabs([['list', T('ev.tabList')], ['inbox', T('ev.tabInbox'), inbox], ['prob', T('ev.tabProb')]], U.evTab, function (t) { U.evTab = t; CL.render('[data-tab="' + t + '"]'); }, T('m.events')));
      if (U.evTab === 'inbox') inboxView(box); else if (U.evTab === 'prob') probationView(box); else listView(box);
    }
  });
}());
