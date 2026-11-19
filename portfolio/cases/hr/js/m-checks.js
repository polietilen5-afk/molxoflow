/* Module: checks engine, findings list with fixes and waivers, rules catalogue. */
(function () {
  'use strict';
  var CL = window.CL, T = CL.T, el = CL.el;
  CL.ud({ chkTab: 'find', chkSev: 'all', chkRule: 'all' });
  var SEV_RANK = { bad: 0, warn: 1, info: 2 };
  function ruleVisible(code) {
    var r = CL.role(); if (r === 'hr' || r === 'ceo') return true;
    if (r === 'mgr') return /^(TS_|HR_PROBATION|MEMO|PIECE)/.test(code);
    return /^(TS_|MEMO|PIECE|ON_)/.test(code);
  }
  CL.allFindings = function () {
    var out = [], DB = CL.DB, R = DB.rules;
    function add(code, id, vars, o) {
      if (!R[code] || !R[code].on) return;
      o = o || {};
      out.push({ id: code + ':' + id, rule: code, sev: R[code].sev, vars: vars || {}, emp: o.emp || null, fix: o.fix || null, fixKey: o.fixKey || null, open: o.open || null, canFix: o.canFix !== false });
    }
    DB.events.forEach(function (ev) {
      if (ev.st === 'pending' && ev.date <= CL.MONTH + '-31') add('HR_EVENT_UNAPPROVED', ev.id, { type: T('ev.t.' + ev.type), name: CL.evName(ev), date: ev.date }, { emp: ev.emp, open: function () { CL.go('events', { evTab: 'list', evStatus: 'pending' }); CL.openEvent(ev); } });
    });
    DB.emps.forEach(function (e) {
      if (e.st === 'probation' && e.probEnd) {
        var pend = DB.events.some(function (ev) { return ev.emp === e.id && ev.type === 'probation' && ev.st === 'pending'; });
        var left = CL.workdaysBetween(CL.TODAY, e.probEnd);
        if (left < 0 && !pend) add('HR_PROBATION_EXPIRED', e.id, { name: e.n, date: e.probEnd }, { emp: e.id, open: function () { CL.go('events', { evTab: 'prob' }); } });
        else if (left >= 0 && left <= DB.settings.probDays && !e.ack) add('HR_PROBATION_SOON', e.id, { name: e.n, n: left, date: e.probEnd }, { emp: e.id, fixKey: 'chk.ack', fix: function () { e.ack = true; }, canFix: CL.isIn('hr', 'mgr'), open: function () { CL.go('events', { evTab: 'prob' }); } });
      }
      if (!e.contract && e.st !== 'dismissed') add('HR_NO_CONTRACT', e.id, { name: e.n }, { emp: e.id, fixKey: 'chk.markRecv', fix: function () { e.contract = true; }, canFix: CL.role() === 'hr', open: function () { CL.go('staff', { sel: e.id, cardTab: 'data' }); } });
      var cells = DB.cells[e.id]; if (!cells) return;
      var empty = 0, d, x, runs = {};
      for (d = 1; d <= CL.DAYS; d++) {
        x = cells[d];
        if (x.c === '' && d <= CL.TODAY_D && e.st !== 'dismissed') empty++;
        var cf = CL.cellConflict(x);
        if (cf) add('TS_STATE_CONFLICT', e.id + ':' + d, { name: e.n, day: d, h: x.h, kind: T(cf === 'dbl' ? 'cf.dbl' : 'cf.hrs') }, { emp: e.id, fixKey: 'chk.fixCell', canFix: CL.tsEditable(e.id), fix: (function (id, dd, dbl) { return function () { CL.setCell(id, dd, dbl ? { c: 'W', h: CL.baseCell(CL.emp(id), dd).h || CL.DB.settings.hpd } : { c: 'O', h: 12 }); }; }(e.id, d, !!x.dbl)), open: function () { CL.go('ts', { tsTab: 'grid', tsEmp: e.id, tsDept: 'all' }); } });
        var cov = CL.absCover(e.id, d);
        if (cov && (x.c === 'W' || x.c === 'O') && x.h > 0) add('TS_ABSENCE_VS_WORK', e.id + ':' + d, { name: e.n, day: d, kind: T('c.' + cov) }, { emp: e.id, fixKey: 'chk.fixCell', canFix: CL.tsEditable(e.id), fix: (function (id, dd, c) { return function () { CL.setCell(id, dd, { c: c, h: 0 }); }; }(e.id, d, cov)), open: function () { CL.go('ts', { tsTab: 'grid', tsEmp: e.id, tsDept: 'all' }); } });
        if ((x.c === 'V' || x.c === 'S' || x.c === 'U') && !cov) { var key = x.c; if (!runs[key]) runs[key] = []; runs[key].push(d); }
      }
      if (empty) add('TS_NO_DATA', e.id, { name: e.n, n: empty }, { emp: e.id, fixKey: 'chk.fillPlan', canFix: CL.tsEditable(e.id), fix: function () { for (var dd = 1; dd <= CL.TODAY_D; dd++) if (cells[dd].c === '') cells[dd] = CL.baseCell(e, dd); }, open: function () { CL.go('ts', { tsTab: 'grid', tsEmp: e.id, tsDept: 'all' }); } });
      Object.keys(runs).forEach(function (code) {
        var ds = runs[code], from = CL.dateStr(ds[0]), to = CL.dateStr(ds[ds.length - 1]);
        var type = code === 'V' ? 'vacation' : code === 'S' ? 'sick' : 'unpaid';
        add('TS_ABSENCE_NO_EVENT', e.id + ':' + code, { name: e.n, kind: T('c.' + (code === 'S' && !CL.can('sick') ? 'X' : code)), from: from, to: to }, { emp: e.id, fixKey: 'chk.makeEvent', canFix: CL.role() === 'hr', fix: function () {
          var ev = { id: CL.nextId('ev'), type: type, emp: e.id, date: from, to: to, p: {}, st: 'applied', by: 'hr', at: CL.stamp(), why: '', fx: 'fx.fromTs', steps: CL.CHAINS[type].map(function (r) { return { r: r, st: 'ok', by: 'hr', at: CL.TODAY }; }) };
          DB.events.unshift(ev); CL.log('events', 'event.fromTs', { type: '~ev.t.' + type, name: e.n }, ev.id);
        }, open: function () { CL.go('events', { evTab: 'list' }); } });
      });
    });
    if (DB.unified.st === 'open') add('TS_UNIFIED_NOT_CHECKED', 'u', { month: T('month.name'), day: DB.settings.closeDay }, { open: function () { CL.go('ts', { tsTab: 'appr' }); } });
    DB.memos.forEach(function (m) { if (m.st === 'submitted') add('MEMO_NOT_APPROVED', m.id, { name: CL.emp(m.emp).n }, { emp: m.emp, open: function () { CL.go('memos'); } }); });
    DB.pieces.forEach(function (p) { if (p.st === 'draft') add('PIECE_NOT_CONFIRMED', p.id, { id: p.id.toUpperCase() }, { emp: p.shares[0].emp, open: function () { CL.go('piece'); } }); });
    DB.sync.disc.forEach(function (s) { if (s.st === 'open') add('ON_MISMATCH', s.id, { name: CL.emp(s.emp).n, field: s.kind === 'absence' ? T('sync.absence') : T('fld.' + (s.field === 'dept' ? 'dept' : s.field === 'pos' ? 'pos' : 'hired')) }, { emp: s.emp, open: function () { CL.go('sync', { syncTab: 'disc' }); } }); });
    DB.refs.kinds.forEach(function (k) { if (!k.mapped) add('ON_KIND_UNMAPPED', k.id, { kind: T('ak.' + k.id) }, { fixKey: 'chk.mapKind', canFix: CL.role() === 'hr', fix: function () { k.mapped = true; }, open: function () { CL.go('refs', { refTab: 'kinds' }); } });
    });
    return out;
  };
  CL.findings = function () {
    return CL.allFindings().filter(function (f) { return ruleVisible(f.rule) && (!f.emp || CL.inScope(f.emp)) && !CL.DB.waived[f.id]; })
      .sort(function (a, b) { return SEV_RANK[a.sev] - SEV_RANK[b.sev]; });
  };
  function runFix(f) {
    f.fix(); CL.log('checks', 'chk.fix', { rule: f.rule }); CL.toast(T('toast.fixed')); CL.render();
  }
  function waive(f) {
    var form = CL.form([{ k: 'why', label: T('chk.waiveReason'), type: 'textarea', req: true, minlen: 10, help: T('chk.waiveHelp') }]);
    CL.dialog(T('chk.waive'), el('div', {}, [el('p', { cls: 'dlg-p', text: T('chk.t.' + f.rule, f.vars) }), form.node]), [{ text: T('dlg.cancel'), ghost: true }, { text: T('chk.waive'), onclick: function () {
      if (!form.validate()) return false;
      CL.DB.waived[f.id] = { why: form.get().why, role: CL.role(), at: CL.stamp(), rule: f.rule, text: f.vars };
      CL.log('checks', 'chk.waive', { rule: f.rule, why: form.get().why }); CL.toast(T('toast.waived')); CL.render();
    } }]);
  }
  var SEV_T = { bad: 'sev.bad', warn: 'sev.warn', info: 'sev.info' };
  function findView(box) {
    var U = CL.UI, all = CL.findings();
    var f = el('div', { cls: 'filters' });
    var sSev = el('select', { cls: 'in', 'aria-label': T('chk.severity') }, [el('option', { value: 'all', text: T('chk.allSev') })].concat(['bad', 'warn', 'info'].map(function (s) { return el('option', { value: s, text: T(SEV_T[s]) }); })));
    var rules = CL.RULES.filter(function (r) { return ruleVisible(r.code); });
    var sRule = el('select', { cls: 'in', 'aria-label': T('chk.rule') }, [el('option', { value: 'all', text: T('chk.allRules') })].concat(rules.map(function (r) { return el('option', { value: r.code, text: r.code }); })));
    sSev.value = U.chkSev; sRule.value = U.chkRule;
    sSev.addEventListener('change', function () { U.chkSev = sSev.value; CL.render('.mod select'); });
    sRule.addEventListener('change', function () { U.chkRule = sRule.value; CL.render('.mod select'); });
    f.appendChild(sSev); f.appendChild(sRule); box.appendChild(f);
    var list = all.filter(function (x) { return (U.chkSev === 'all' || x.sev === U.chkSev) && (U.chkRule === 'all' || x.rule === U.chkRule); });
    var ul = el('ul', { cls: 'finds' });
    list.forEach(function (x) {
      var li = el('li', { cls: 'find sev-' + x.sev }, [
        CL.badge(x.sev, T(SEV_T[x.sev])),
        el('div', { cls: 'ft' }, [el('b', { text: T('chk.t.' + x.rule, x.vars) }), el('span', { text: T('chk.d.' + x.rule) }), el('code', { text: x.rule })]),
        el('div', { cls: 'acts' }, [
          x.fix && x.canFix ? el('button', { type: 'button', cls: 'btn btn-sm fixbtn', text: T(x.fixKey), 'aria-label': T(x.fixKey) + ': ' + T('chk.t.' + x.rule, x.vars), onclick: function () { if (window.PF && PF.reduced) runFix(x); else { li.classList.add('leaving'); setTimeout(function () { runFix(x); }, 260); } } }) : null,
          x.open ? CL.btn(T('chk.open'), x.open, 'btn-ghost') : null,
          CL.can('waive') && CL.RULES.filter(function (r) { return r.code === x.rule; })[0].waive ? CL.btn(T('chk.waive'), function () { waive(x); }, 'btn-ghost') : null,
          x.fix && !x.canFix ? el('span', { cls: 'viewonly', text: T('chk.noRight') }) : null
        ])
      ]);
      ul.appendChild(li);
    });
    if (!list.length) ul.appendChild(el('li', { cls: 'empty ok' }, [CL.icon('check'), el('b', { text: T('chk.clear') }), el('span', { text: T('chk.clearHint') })]));
    box.appendChild(ul);
  }
  function rulesView(box) {
    box.appendChild(el('p', { cls: 'lead-s', text: T('chk.rulesHint', { n: CL.RULES.length }) }));
    var counts = {}; CL.findings().forEach(function (x) { counts[x.rule] = (counts[x.rule] || 0) + 1; });
    box.appendChild(CL.table([
      { h: T('chk.rule'), f: function (r) { return el('code', { text: r.code }); } },
      { h: T('chk.what'), f: function (r) { return T('chk.d.' + r.code); } },
      { h: T('chk.severity'), f: function (r) {
        var cur = CL.DB.rules[r.code].sev;
        if (!CL.can('settings')) return CL.badge(cur, T(SEV_T[cur]));
        var s = el('select', { cls: 'in sm', 'aria-label': T('chk.severity') + ' ' + r.code }, ['bad', 'warn', 'info'].map(function (x) { return el('option', { value: x, text: T(SEV_T[x]) }); }));
        s.value = cur; s.addEventListener('change', function () { CL.DB.rules[r.code].sev = s.value; CL.log('checks', 'chk.sev', { rule: r.code, sev: '~' + SEV_T[s.value] }); CL.render('[data-tab="rules"]'); });
        return s;
      } },
      { h: T('chk.canWaive'), f: function (r) { return r.waive ? T('yes') : T('no'); } },
      { h: T('chk.enabled'), f: function (r) {
        var on = CL.DB.rules[r.code].on;
        var b = el('button', { type: 'button', cls: 'tog' + (on ? ' on' : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false', 'aria-label': r.code, disabled: !CL.can('settings'), onclick: function () { CL.DB.rules[r.code].on = !on; CL.log('checks', 'chk.toggle', { rule: r.code, v: '~' + (!on ? 'on' : 'off') }); CL.render('[data-tab="rules"]'); } }, [el('i'), el('span', { text: on ? T('on') : T('off') })]);
        return b;
      } },
      { h: T('chk.open2'), f: function (r) { return String(counts[r.code] || 0); } }
    ], CL.RULES.filter(function (r) { return ruleVisible(r.code); })));
  }
  function waivedView(box) {
    var ids = Object.keys(CL.DB.waived);
    box.appendChild(CL.table([
      { h: T('chk.rule'), f: function (id) { return el('code', { text: CL.DB.waived[id].rule }); } },
      { h: T('chk.what'), f: function (id) { var w = CL.DB.waived[id]; return T('chk.t.' + w.rule, w.text); } },
      { h: T('chk.waiveReason'), f: function (id) { return CL.DB.waived[id].why; } },
      { h: T('f.createdBy'), f: function (id) { var w = CL.DB.waived[id]; return T('role.' + w.role) + ', ' + w.at; } },
      { h: '', f: function (id) { return CL.can('waive') ? CL.btn(T('chk.restore'), function () { delete CL.DB.waived[id]; CL.log('checks', 'chk.restore', { rule: id.split(':')[0] }); CL.render('[data-tab="waived"]'); }, 'btn-ghost') : null; } }
    ], ids, { empty: T('chk.noWaived'), emptyHint: T('chk.noWaivedHint') }));
  }
  CL.registerMod('checks', {
    icon: 'check',
    badge: function () { return CL.findings().length; },
    render: function (box) {
      var U = CL.UI, n = CL.findings().length, nw = Object.keys(CL.DB.waived).length;
      box.appendChild(CL.head(T('m.checks'), T('chk.sub'), CL.can('checksRun') ? [CL.btn(T('chk.run'), function () { CL.DB.lastRun = CL.stamp(); CL.log('checks', 'chk.run', { n: CL.findings().length }); CL.toast(T('toast.checkRun', { n: CL.findings().length })); CL.render('.mod-a .btn'); })] : []));
      box.appendChild(el('div', { cls: 'chk-sum' }, [el('b', { text: String(n) }), el('span', { text: T('chk.openN') }), el('b', { text: String(nw) }), el('span', { text: T('chk.waivedN') }), el('small', { text: T('chk.lastRun', { at: CL.DB.lastRun }) })]));
      box.appendChild(CL.tabs([['find', T('chk.tabFind'), n], ['rules', T('chk.tabRules')], ['waived', T('chk.tabWaived'), nw]], U.chkTab, function (t) { U.chkTab = t; CL.render('[data-tab="' + t + '"]'); }, T('m.checks')));
      if (U.chkTab === 'rules') rulesView(box); else if (U.chkTab === 'waived') waivedView(box); else findView(box);
    }
  });
}());
