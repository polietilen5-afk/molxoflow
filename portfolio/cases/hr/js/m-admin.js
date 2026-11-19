/* Modules: references, access matrix, audit log, backups, settings. */
(function () {
  'use strict';
  var CL = window.CL, T = CL.T, el = CL.el;
  CL.ud({ refTab: 'depts', auMod: 'all', auRole: 'all', auQ: '' });

  /* ---------- references ---------- */
  function addRef(kind) {
    var isDept = kind === 'depts', list = CL.DB.refs[kind];
    var f = [{ k: 'name', label: T('ref.name'), req: true, minlen: 3, maxlength: 30 }];
    if (isDept) f.push({ k: 'code', label: T('ref.code'), req: true, maxlength: 4, pattern: /^[A-Z]{2,4}$/, patternMsg: 'v.code', help: T('ref.codeHelp') });
    var form = CL.form(f, function (v) {
      var er = {};
      if (list.some(function (x) { return (x.label || T((isDept ? 'dept.' : 'pos.') + x.id)).toLowerCase() === v.name.toLowerCase(); })) er.name = { key: 'v.dupRef' };
      if (isDept && list.some(function (x) { return x.code === v.code; })) er.code = { key: 'v.dupRef' };
      return er;
    });
    CL.dialog(T(isDept ? 'ref.addDept' : 'ref.addPos'), form.node, [{ text: T('dlg.cancel'), ghost: true }, { text: T('dlg.save'), onclick: function () {
      if (!form.validate()) return false;
      var v = form.get(), o = { id: CL.nextId(isDept ? 'dep' : 'pos'), label: v.name }; if (isDept) { o.code = v.code; CL.DB.cycles[o.id] = 'forming'; }
      list.push(o); CL.log('refs', 'ref.add', { what: '~ref.' + kind, name: v.name }); CL.toast(T('toast.saved')); CL.render();
    } }]);
  }
  function refList(box, kind) {
    var isDept = kind === 'depts', list = CL.DB.refs[kind], edit = CL.can('refsEdit');
    box.appendChild(CL.table([
      isDept ? { h: T('ref.code'), f: function (x) { return el('code', { text: x.code }); } } : null,
      { h: T('ref.name'), f: function (x) { return x.label || T((isDept ? 'dept.' : 'pos.') + x.id); } },
      { h: T('ref.used'), f: function (x) { return String(CL.DB.emps.filter(function (e) { return e[isDept ? 'dept' : 'pos'] === x.id && e.st !== 'dismissed'; }).length); } },
      { h: '', f: function (x) {
        if (!edit) return null;
        var used = CL.DB.emps.some(function (e) { return e[isDept ? 'dept' : 'pos'] === x.id; }) || CL.DB.events.some(function (ev) { return ev.p && (ev.p[isDept ? 'dept' : 'pos'] === x.id) && ev.st === 'pending'; });
        return el('button', { type: 'button', cls: 'btn btn-sm btn-ghost', disabled: used, title: used ? T('ref.inUse') : '', text: T('ref.remove'), onclick: function () { list.splice(list.indexOf(x), 1); CL.log('refs', 'ref.remove', { what: '~ref.' + kind, name: x.label || T((isDept ? 'dept.' : 'pos.') + x.id) }); CL.render(); } });
      } }
    ].filter(Boolean), list));
    if (edit) box.appendChild(CL.btn(T(isDept ? 'ref.addDept' : 'ref.addPos'), function () { addRef(kind); }));
    else box.appendChild(el('p', { cls: 'hint-s', text: T('ref.viewOnly') }));
  }
  function refSched(box) {
    box.appendChild(CL.table([
      { h: T('ref.name'), f: function (s) { return T('sch.' + s.id); } }, { h: T('ref.pattern'), f: function (s) { return T('sch.d.' + s.id); } },
      { h: T('ref.used'), f: function (s) { return String(CL.DB.emps.filter(function (e) { return e.sched === s.id && e.st !== 'dismissed'; }).length); } }
    ], CL.DB.refs.sched));
  }
  function refKinds(box) {
    var edit = CL.can('refsEdit');
    box.appendChild(el('p', { cls: 'lead-s', text: T('ref.kindsHint', { n: CL.DB.settings.sickCompany }) }));
    box.appendChild(CL.table([
      { h: T('ref.name'), f: function (k) { return T('ak.' + k.id); } }, { h: T('ref.dayCode'), f: function (k) { return el('code', { text: k.code }); } },
      { h: T('ref.paid'), f: function (k) { return k.paid ? T('yes') : T('no'); } },
      { h: T('ref.mapping'), f: function (k) { return CL.badge(k.mapped ? 'ok' : 'warn', k.mapped ? T('ref.mapped') : T('ref.unmapped')); } },
      { h: '', f: function (k) { return edit ? CL.btn(k.mapped ? T('ref.unmap') : T('ref.map'), function () { k.mapped = !k.mapped; CL.log('refs', 'ref.map', { name: T('ak.' + k.id), v: '~' + (k.mapped ? 'ref.mapped' : 'ref.unmapped') }); CL.render('[data-tab="kinds"]'); }, 'btn-ghost') : null; } }
    ], CL.DB.refs.kinds));
  }
    function refCal(box) {
    var edit = CL.can('refsEdit');
    box.appendChild(el('p', { cls: 'lead-s', text: T('ref.calHint') }));
    box.appendChild(el('div', { cls: 'tiles' }, [el('div', { cls: 'tile' }, [el('b', { text: String(CL.norm()) }), el('span', { text: T('ref.norm') })]), el('div', { cls: 'tile' }, [el('b', { text: String(CL.DB.settings.hpd) }), el('span', { text: T('set.hpd') })])]));
    box.appendChild(el('ul', { cls: 'legend' }, ['work', 'short', 'hol', 'we'].map(function (k) { return el('li', {}, [el('i', { cls: 'sw cdb t-' + k, 'aria-hidden': 'true' }), el('span', { text: T('dt.' + k) })]); })));
    var cal = el('div', { cls: 'cal big' });
    for (var w = 0; w < 7; w++) cal.appendChild(el('i', { cls: 'wd', text: T('wd.' + w) }));
    for (var s = 0; s < CL.FIRST_WD; s++) cal.appendChild(el('i', { cls: 'blank' }));
    for (var d = 1; d <= CL.DAYS; d++) {
      (function (d) {
        var t = CL.dayType(d);
        cal.appendChild(el('button', { type: 'button', cls: 'cd cdb t-' + t, disabled: !edit, 'aria-label': d + ': ' + T('dt.' + t), onclick: function () {
          var cur = CL.dayType(d), wk = CL.isWeekend(d), seq = wk ? ['we', 'work'] : ['work', 'short', 'hol'];
          var nx = seq[(seq.indexOf(cur) + 1) % seq.length];
          if (nx === (wk ? 'we' : 'work')) delete CL.DB.refs.cal[d]; else CL.DB.refs.cal[d] = nx;
          CL.log('refs', 'ref.cal', { day: CL.dateStr(d), v: '~dt.' + CL.dayType(d) }); CL.render('[data-tab="cal"]');
        } }, [el('b', { text: String(d) }), el('small', { text: T('dt.' + t) })]));
      }(d));
    }
    box.appendChild(cal);
    box.appendChild(el('p', { cls: 'hint-s', text: edit ? T('ref.calEdit') : T('ref.viewOnly') }));
  }
  CL.registerMod('refs', {
    icon: 'book',
    badge: function () { return 0; },
    render: function (box) {
      var U = CL.UI;
      box.appendChild(CL.head(T('m.refs'), T('ref.sub')));
      box.appendChild(CL.tabs([['depts', T('ref.depts')], ['pos', T('ref.pos')], ['sched', T('ref.sched')], ['kinds', T('ref.kinds')], ['cal', T('ref.cal')]], U.refTab, function (t) { U.refTab = t; CL.render('[data-tab="' + t + '"]'); }, T('m.refs')));
      if (U.refTab === 'pos') refList(box, 'pos'); else if (U.refTab === 'sched') refSched(box); else if (U.refTab === 'kinds') refKinds(box); else if (U.refTab === 'cal') refCal(box); else refList(box, 'depts');
    }
  });

  /* ---------- access matrix ---------- */
  var MATRIX = [
    ['personal', ['edit', 'none', 'none', 'view']], ['rateRow', ['edit', 'none', 'view', 'view']], ['events', ['edit', 'edit', 'none', 'view']],
    ['sickRow', ['view', 'masked', 'view', 'view']], ['ts', ['edit', 'edit', 'view', 'view']], ['unifiedRow', ['edit', 'none', 'view', 'edit']],
    ['piece', ['edit', 'edit', 'view', 'view']], ['memos', ['edit', 'edit', 'view', 'edit']], ['amounts', ['none', 'none', 'edit', 'edit']],
    ['checksRow', ['edit', 'view', 'view', 'edit']], ['syncRow', ['edit', 'none', 'view', 'view']], ['refsRow', ['edit', 'none', 'none', 'view']],
    ['settingsRow', ['edit', 'none', 'none', 'edit']], ['auditRow', ['view', 'none', 'none', 'view']], ['backupRow', ['edit', 'none', 'none', 'view']]
  ];
  var ACC_KIND = { edit: 'ok', view: 'info', masked: 'warn', none: 'bad' };
  CL.registerMod('access', {
    icon: 'key',
    badge: function () { return 0; },
    render: function (box) {
      var r = CL.role(), ri = CL.ROLES.indexOf(r);
      box.appendChild(CL.head(T('m.access'), T('acc.sub')));
      box.appendChild(el('p', { cls: 'lead-s', text: T('acc.you', { role: T('role.' + r) }) }));
      var cols = [{ h: T('acc.field'), f: function (m) { return T('acc.r.' + m[0]); } }];
      CL.ROLES.forEach(function (x, i) { cols.push({ h: T('role.' + x), cls: i === ri ? 'me' : '', f: function (m) { return CL.badge(ACC_KIND[m[1][i]], T('acc.v.' + m[1][i])); } }); });
      box.appendChild(CL.table(cols, MATRIX, { cls: 'matrix' }));
      box.appendChild(el('ul', { cls: 'legend' }, ['edit', 'view', 'masked', 'none'].map(function (k) { return el('li', {}, [CL.badge(ACC_KIND[k], T('acc.v.' + k)), el('span', { text: T('acc.vd.' + k) })]); })));
      box.appendChild(el('h3', { cls: 'sub-h', text: T('acc.users') }));
      var users = [['demo.hr', 'hr', 'acc.scopeAll'], ['demo.manager', 'mgr', 'acc.scopeOwn'], ['demo.accounting', 'acc', 'acc.scopeAll'], ['demo.director', 'ceo', 'acc.scopeAll']];
      box.appendChild(CL.table([{ h: T('acc.login'), f: function (u) { return el('code', { text: u[0] }); } }, { h: T('acc.role'), f: function (u) { return T('role.' + u[1]); } }, { h: T('acc.scope'), f: function (u) { return T(u[2], { dept: CL.deptName(CL.MGR_DEPT) }); } }, { h: '', f: function (u) { return CL.btn(T('acc.switch'), function () { CL.DB.role = u[1]; CL.log('access', 'role', { role: T('role.' + u[1]) }); if (!CL.modOK(CL.UI.mod)) CL.UI.mod = 'home'; CL.render(); }, 'btn-ghost'); } }], users));
      box.appendChild(el('p', { cls: 'hint-s', text: T('acc.rule') }));
    }
  });

  /* ---------- audit ---------- */
  CL.registerMod('audit', {
    icon: 'log',
    badge: function () { return 0; },
    render: function (box) {
      var U = CL.UI;
      box.appendChild(CL.head(T('m.audit'), T('au.sub')));
      var f = el('div', { cls: 'filters' }), mods = {}; CL.DB.audit.forEach(function (a) { mods[a.mod] = 1; });
      var q = el('input', { type: 'search', cls: 'in', placeholder: T('au.search'), 'aria-label': T('au.search'), value: U.auQ });
      var sm = el('select', { cls: 'in', 'aria-label': T('au.module') }, [el('option', { value: 'all', text: T('au.allMods') })].concat(Object.keys(mods).map(function (m) { return el('option', { value: m, text: T('m.' + m) }); })));
      var sr = el('select', { cls: 'in', 'aria-label': T('acc.role') }, [el('option', { value: 'all', text: T('au.allRoles') })].concat(CL.ROLES.map(function (m) { return el('option', { value: m, text: T('role.' + m) }); })));
      sm.value = U.auMod; sr.value = U.auRole;
      f.appendChild(el('label', { cls: 'search' }, [CL.icon('search'), q])); f.appendChild(sm); f.appendChild(sr);
      box.appendChild(f);
      var out = el('div'), cnt = el('p', { cls: 'count', 'aria-live': 'polite' });
      function fill() {
        out.innerHTML = ''; var qq = U.auQ.toLowerCase();
        var rows = CL.DB.audit.filter(function (a) { return (U.auMod === 'all' || a.mod === U.auMod) && (U.auRole === 'all' || a.role === U.auRole) && (!qq || CL.auditText(a).toLowerCase().indexOf(qq) >= 0); });
        out.appendChild(CL.table([{ h: T('f.date'), f: function (a) { return a.t; } }, { h: T('acc.role'), f: function (a) { return T('role.' + a.role); } }, { h: T('au.module'), f: function (a) { return T('m.' + a.mod); } }, { h: T('au.action'), f: function (a) { return CL.auditText(a); } }], rows.slice(0, 60), { empty: T('au.none') }));
        cnt.textContent = T('au.count', { n: Math.min(rows.length, 60), total: rows.length });
      }
      q.addEventListener('input', function () { U.auQ = q.value; fill(); });
      sm.addEventListener('change', function () { U.auMod = sm.value; fill(); });
      sr.addEventListener('change', function () { U.auRole = sr.value; fill(); });
      box.appendChild(out); box.appendChild(cnt); fill();
      box.appendChild(el('p', { cls: 'hint-s', text: T('au.rule') }));
    }
  });

  /* ---------- backups ---------- */
  var busy = false;
  function runBackup() {
    if (busy) return; busy = true; CL.render('.runbk');
    setTimeout(function () {
      var B = CL.DB.backups, at = CL.stamp();
      B.entries.unshift({ id: CL.nextId('bk'), at: at, st: 'ok', files: B.files });
      CL.log('backups', 'bk.run', { at: at }); busy = false; CL.toast(T('toast.bkDone')); CL.render();
    }, PF.reduced ? 200 : 1800);
  }
  function restoreCheck() {
    var steps = ['bk.s1', 'bk.s2', 'bk.s3', 'bk.s4'], ul = el('ol', { cls: 'steps' }, steps.map(function (s) { return el('li', {}, [el('i', { text: '' }), el('span', { text: T(s) })]); }));
    var d = CL.dialog(T('bk.restoreCheck'), el('div', {}, [el('p', { cls: 'dlg-p', text: T('bk.restoreHint') }), ul]), [{ text: T('dlg.close'), ghost: true }]);
    var i = 0, items = ul.children;
    function next() {
      if (!d.isConnected) return;
      if (i > 0) { items[i - 1].classList.add('done'); items[i - 1].firstChild.textContent = 'v'; }
      if (i >= steps.length) { CL.DB.backups.restores.unshift({ at: CL.stamp(), st: 'ok' }); CL.log('backups', 'bk.restore', {}); CL.toast(T('toast.restoreOk')); CL.render(); return; }
      items[i].classList.add('run'); i++; setTimeout(next, PF.reduced ? 50 : 700);
    }
    next();
  }
  var OPEN_Q = ['enc', 'owner', 'keep', 'time'];
  CL.registerMod('backups', {
    icon: 'db',
    badge: function () { return 0; },
    render: function (box) {
      var B = CL.DB.backups, edit = CL.role() === 'hr', last = B.entries[0];
      box.appendChild(CL.head(T('m.backups'), T('bk.sub'), edit ? [el('button', { type: 'button', cls: 'btn btn-sm runbk', disabled: busy, text: busy ? T('bk.running') : T('bk.run'), onclick: runBackup }), CL.btn(T('bk.restoreCheck'), restoreCheck, 'btn-ghost')] : []));
      box.appendChild(el('div', { cls: 'stats' }, [
        el('div', { cls: 'stat static' }, [el('b', { text: last.at.slice(5, 16) }), el('span', { text: T('bk.last') }), CL.badge(last.st === 'ok' ? 'ok' : 'warn', T('bk.st.' + last.st))]),
        el('div', { cls: 'stat static' }, [el('b', { text: '02:30' }), el('span', { text: T('bk.schedule') })]),
        el('div', { cls: 'stat static' }, [el('b', { text: String(B.keep) }), el('span', { text: T('bk.keep') })]),
        el('div', { cls: 'stat static' }, [el('b', { text: B.restores[0].at.slice(5, 10) }), el('span', { text: T('bk.lastRestore') }), CL.badge('ok', T('bk.st.ok'))])
      ]));
      var cfg = el('div', { cls: 'cfg' });
      var keep = el('input', { type: 'number', cls: 'in sm', min: 3, max: 60, value: B.keep, 'aria-label': T('bk.keep'), disabled: !edit });
      var kerr = el('span', { cls: 'err', role: 'alert' });
      keep.addEventListener('change', function () { var n = Number(keep.value); if (isNaN(n) || n < 3 || n > 60) { kerr.textContent = T('v.range', { min: 3, max: 60 }); return; } kerr.textContent = ''; var old = B.keep; B.keep = n; CL.log('backups', 'bk.keep', { from: old, to: n }); CL.render(); });
      cfg.appendChild(el('label', {}, [T('bk.keep'), keep, kerr]));
      [['prune', T('bk.prune')], ['files', T('bk.files')]].forEach(function (x) {
        cfg.appendChild(el('button', { type: 'button', cls: 'tog' + (B[x[0]] ? ' on' : ''), role: 'switch', 'aria-checked': B[x[0]] ? 'true' : 'false', disabled: !edit, onclick: function () { B[x[0]] = !B[x[0]]; CL.log('backups', 'bk.opt', { opt: x[1], v: '~' + (B[x[0]] ? 'on' : 'off') }); CL.render(); } }, [el('i'), el('span', { text: x[1] })]));
      });
      box.appendChild(cfg);
      box.appendChild(el('h3', { cls: 'sub-h', text: T('bk.history') }));
      box.appendChild(CL.table([{ h: T('f.date'), f: function (b) { return b.at; } }, { h: T('f.status'), f: function (b) { return CL.badge(b.st === 'ok' ? 'ok' : 'warn', T('bk.st.' + b.st)); } }, { h: T('bk.filesArchive'), f: function (b) { return b.files ? T('yes') : T('bk.filesFail'); } }], B.entries.slice(0, 8)));
      box.appendChild(el('h3', { cls: 'sub-h', text: T('bk.open') }));
      var ul = el('ul', { cls: 'tasklist' });
      OPEN_Q.forEach(function (k) {
        var done = !!B.decided[k];
        ul.appendChild(el('li', {}, [el('span', { text: T('bk.q.' + k) }), edit ? CL.btn(done ? T('bk.decided') : T('bk.markDecided'), function () { B.decided[k] = !done; CL.log('backups', 'bk.decision', { q: T('bk.q.' + k) }); CL.render(); }, done ? '' : 'btn-ghost') : CL.badge(done ? 'ok' : 'warn', done ? T('bk.decided') : T('bk.undecided'))]));
      });
      box.appendChild(ul);
      box.appendChild(el('p', { cls: 'hint-s', text: T('bk.note') }));
    }
  });

  /* ---------- settings ---------- */
  CL.registerMod('settings', {
    icon: 'gear',
    badge: function () { return 0; },
    render: function (box) {
      var s = CL.DB.settings, edit = CL.can('settings');
      box.appendChild(CL.head(T('m.settings'), T('set.sub')));
      if (!edit) box.appendChild(el('p', { cls: 'lead-s', text: T('set.view') }));
      var f = [
        { k: 'probDays', label: T('set.probDays'), type: 'number', min: 1, max: 30, req: true, value: s.probDays, help: T('set.probDaysH'), disabled: !edit },
        { k: 'initiator', label: T('set.initiator'), type: 'select', opts: [['one', T('set.ini.one')], ['all', T('set.ini.all')], ['none', T('set.ini.none')]], value: s.initiator, help: T('set.initiatorH'), disabled: !edit },
        { k: 'sickCompany', label: T('set.sickCompany'), type: 'number', min: 0, max: 30, req: true, value: s.sickCompany, help: T('set.sickCompanyH'), disabled: !edit },
        { k: 'closeDay', label: T('set.closeDay'), type: 'number', min: 1, max: 10, req: true, value: s.closeDay, help: T('set.closeDayH'), disabled: !edit },
        { k: 'hpd', label: T('set.hpd'), type: 'number', min: 6, max: 12, req: true, value: s.hpd, help: T('set.hpdH'), disabled: !edit },
        { k: 'filler', label: T('set.filler'), type: 'select', opts: [['hr', T('set.fill.hr')], ['mgr', T('set.fill.mgr')], ['both', T('set.fill.both')]], value: s.filler, help: T('set.fillerH'), disabled: !edit },
        { k: 'importXlsx', label: T('set.import'), type: 'select', opts: [['0', T('off')], ['1', T('on')]], value: s.importXlsx ? '1' : '0', help: T('set.importH'), disabled: !edit }
      ];
      var form = CL.form(f);
      box.appendChild(form.node);
      if (edit) box.appendChild(CL.btn(T('dlg.save'), function () {
        if (!form.validate()) return;
        var v = form.get(), ch = [];
        ['probDays', 'sickCompany', 'closeDay', 'hpd'].forEach(function (k) { var n = Number(v[k]); if (n !== s[k]) { ch.push([k, s[k], n]); s[k] = n; } });
        ['initiator', 'filler'].forEach(function (k) { if (v[k] !== s[k]) { ch.push([k, T('set.' + (k === 'initiator' ? 'ini.' : 'fill.') + s[k]), T('set.' + (k === 'initiator' ? 'ini.' : 'fill.') + v[k])]); s[k] = v[k]; } });
        var imp = v.importXlsx === '1'; if (imp !== s.importXlsx) { ch.push(['importXlsx', s.importXlsx ? T('on') : T('off'), imp ? T('on') : T('off')]); s.importXlsx = imp; }
        ch.forEach(function (c) { CL.log('settings', 'settings.save', { key: '~set.' + c[0], from: String(c[1]), to: String(c[2]) }); });
        CL.toast(ch.length ? T('toast.settingsSaved', { n: ch.length }) : T('toast.noChanges')); CL.render('.mod .btn');
      }));
      box.appendChild(el('p', { cls: 'hint-s', text: T('set.rule') }));
    }
  });
}());
