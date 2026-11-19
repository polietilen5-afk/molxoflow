/* Crew Ledger demo core: shared store, helpers, permissions, audit log, shell. All data is fictional. */
(function (w) {
  'use strict';
  var CL = w.CL = { mods: {}, order: [] };
  var T = CL.T = function (k, v) { return w.MFI18N.t(k, v); };
  var doc = w.document;

  /* ---------- DOM helpers ---------- */
  function el(tag, a, kids) {
    var e = doc.createElement(tag), k;
    a = a || {};
    for (k in a) {
      if (!Object.prototype.hasOwnProperty.call(a, k)) continue;
      var v = a[k];
      if (k === 'text') e.textContent = v;
      else if (k === 'cls') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c !== null && c !== undefined && c !== false) e.appendChild(typeof c === 'object' ? c : doc.createTextNode(String(c))); });
    return e;
  }
  CL.el = el;
  var ICONS = {
    home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>', people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.4 2.7-5.5 6-5.5s6 2.1 6 5.5"/><path d="M16 5.5a3 3 0 0 1 0 5.8M18 14.8c1.8.7 3 2.4 3 5.2"/>',
    events: '<path d="M6 4h12v16H6zM9 9h6M9 13h6M9 17h3"/>', grid: '<path d="M4 5h16v14H4zM4 10h16M9 5v14M15 5v14"/>',
    piece: '<path d="M4 18 10 6l4 8 3-5 3 9z"/>', memo: '<path d="M5 4h10l4 4v12H5zM14 4v5h5M8 13h8M8 17h5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', shield: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    sync: '<path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M20 4v5h-5M4 20v-5h5"/>', report: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/>', key: '<circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H21M17 12v4M20 12v3"/>',
    log: '<path d="M4 6h16M4 12h16M4 18h10"/>', db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    lock: '<path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z"/>', search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2"/>',
    alert: '<path d="M12 4 3 19h18z"/><path d="M12 10v4M12 17v.5"/>', back: '<path d="M15 5 8 12l7 7"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="m6 6 12 12M18 6 6 18"/>', down: '<path d="M12 4v12M6 11l6 6 6-6M5 20h14"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  var icon = CL.icon = function (n) { return el('span', { cls: 'ic', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[n] || '') + '</svg>' }); };
  CL.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ---------- toast & dialog ---------- */
  var toastEl = null, toastT = 0;
  CL.toast = function (msg) {
    if (!toastEl) { toastEl = el('div', { cls: 'cl-toast', role: 'status', 'aria-live': 'polite' }); doc.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2800);
  };
  /* buttons: [{text, cls, onclick(dlg) -> false keeps open}] */
  CL.dialog = function (title, body, buttons, opts) {
    var d = el('dialog', { cls: 'cl-dlg' + (opts && opts.wide ? ' wide' : ''), 'aria-labelledby': 'dlgT' });
    var head = el('div', { cls: 'dlg-h' }, [el('h3', { id: 'dlgT', text: title }), el('button', { type: 'button', cls: 'dlg-x', 'aria-label': T('dlg.close'), onclick: function () { d.close(); } }, [icon('x')])]);
    var foot = el('div', { cls: 'dlg-f' });
    (buttons || []).forEach(function (b) {
      foot.appendChild(el('button', { type: 'button', cls: 'btn btn-sm' + (b.ghost ? ' btn-ghost' : ''), text: b.text, onclick: function () { if (b.onclick && b.onclick(d) === false) return; d.close(); } }));
    });
    if (!buttons || !buttons.length) foot.appendChild(el('button', { type: 'button', cls: 'btn btn-sm btn-ghost', text: T('dlg.close'), onclick: function () { d.close(); } }));
    d.appendChild(head); d.appendChild(el('div', { cls: 'dlg-b' }, [body])); d.appendChild(foot);
    var from = doc.activeElement;
    d.addEventListener('close', function () { d.remove(); if (from && from.isConnected) from.focus({ preventScroll: true }); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    doc.body.appendChild(d); d.showModal();
    return d;
  };
  CL.confirm = function (title, text, okText, fn) { CL.dialog(title, el('p', { text: text }), [{ text: T('dlg.cancel'), ghost: true }, { text: okText, onclick: function () { fn(); } }]); };

  /* ---------- forms ---------- */
  /* fields: [{k,label,type,opts:[[v,label]],value,req,min,max,help,rows,pattern}] */
  CL.form = function (fields, validate) {
    var wrap = el('form', { cls: 'cl-form', novalidate: true, onsubmit: function (e) { e.preventDefault(); } }), refs = {};
    fields.forEach(function (f) {
      var inp;
      if (f.type === 'select') {
        inp = el('select', { cls: 'in', id: 'ff-' + f.k, name: f.k });
        f.opts.forEach(function (o) { inp.appendChild(el('option', { value: o[0], text: o[1] })); });
      } else if (f.type === 'textarea') inp = el('textarea', { cls: 'in ta', id: 'ff-' + f.k, name: f.k, rows: f.rows || 3 });
      else inp = el('input', { cls: 'in', id: 'ff-' + f.k, name: f.k, type: f.type || 'text', min: f.min, max: f.max, maxlength: f.maxlength });
      if (f.value !== undefined && f.value !== null) inp.value = f.value;
      if (f.disabled) inp.disabled = true;
      var err = el('span', { cls: 'err', id: 'err-' + f.k, role: 'alert' });
      inp.setAttribute('aria-describedby', 'err-' + f.k + (f.help ? ' hp-' + f.k : ''));
      refs[f.k] = { inp: inp, err: err, f: f };
      wrap.appendChild(el('div', { cls: 'fl' }, [el('label', { 'for': 'ff-' + f.k, text: f.label + (f.req ? ' *' : '') }), inp, f.help ? el('small', { id: 'hp-' + f.k, text: f.help }) : null, err]));
    });
    var api = {
      node: wrap,
      get: function () { var o = {}; for (var k in refs) o[k] = refs[k].inp.value.trim ? refs[k].inp.value.trim() : refs[k].inp.value; return o; },
      validate: function () {
        var v = api.get(), bad = null, k, m;
        for (k in refs) {
          m = '';
          var f = refs[k].f;
          if (f.req && !v[k]) m = T('v.req');
          else if (v[k] && f.type === 'number') { var n = Number(v[k]); if (isNaN(n) || (f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) m = T('v.range', { min: f.min, max: f.max }); }
          else if (v[k] && f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v[k])) m = T('v.date');
          else if (v[k] && f.minlen && v[k].length < f.minlen) m = T('v.minlen', { n: f.minlen });
          else if (v[k] && f.pattern && !f.pattern.test(v[k])) m = T(f.patternMsg || 'v.format');
          refs[k].err.textContent = m;
          if (m) { refs[k].inp.setAttribute('aria-invalid', 'true'); if (!bad) bad = refs[k].inp; } else refs[k].inp.removeAttribute('aria-invalid');
        }
        if (!bad && validate) {
          var ex = validate(v) || {};
          for (k in ex) { if (refs[k]) { refs[k].err.textContent = T(ex[k].key || ex[k], ex[k].vars); refs[k].inp.setAttribute('aria-invalid', 'true'); if (!bad) bad = refs[k].inp; } }
        }
        if (bad) bad.focus();
        return !bad;
      },
      set: function (k, val) { refs[k].inp.value = val; },
      ref: function (k) { return refs[k].inp; }
    };
    return api;
  };

  /* ---------- tables: real table on desktop, cards on phones ---------- */
  CL.table = function (cols, rows, opts) {
    opts = opts || {};
    var t = el('table', { cls: 'rt' + (opts.cls ? ' ' + opts.cls : '') });
    var tr = el('tr'); cols.forEach(function (c) { tr.appendChild(el('th', { scope: 'col', text: c.h, cls: c.cls })); });
    t.appendChild(el('thead', {}, [tr]));
    var tb = el('tbody');
    rows.forEach(function (r) {
      var row = el('tr', { cls: opts.rowCls ? opts.rowCls(r) : '' });
      cols.forEach(function (c, i) {
        var v = c.f(r);
        var td = el('td', { 'data-l': c.h, cls: (c.cls || '') + (i === 0 ? ' first' : '') });
        if (v !== null && v !== undefined) td.appendChild(typeof v === 'object' ? v : doc.createTextNode(String(v)));
        row.appendChild(td);
      });
      tb.appendChild(row);
    });
    t.appendChild(tb);
    var box = el('div', { cls: 'rt-wrap' }, [t]);
    if (!rows.length) return el('div', { cls: 'empty' }, [el('b', { text: opts.empty || T('empty.none') }), el('span', { text: opts.emptyHint || '' })]);
    return box;
  };
  CL.badge = function (kind, text) { return el('span', { cls: 'pf-badge ' + kind, text: text }); };
  CL.btn = function (text, fn, cls) { return el('button', { type: 'button', cls: 'btn btn-sm ' + (cls || ''), text: text, onclick: fn }); };
  CL.link = function (text, fn) { return el('button', { type: 'button', cls: 'lnk', text: text, onclick: fn }); };
  CL.locked = function (text) { return el('span', { cls: 'lockedv' }, [icon('lock'), el('span', { text: text || T('hidden') })]); };
  CL.tabs = function (list, cur, onpick, label) {
    var n = el('div', { cls: 'tabs sub', role: 'tablist', 'aria-label': label || '' });
    list.forEach(function (t) {
      n.appendChild(el('button', { type: 'button', role: 'tab', 'aria-selected': cur === t[0] ? 'true' : 'false', tabindex: cur === t[0] ? '0' : '-1', 'data-tab': t[0], onclick: function () { onpick(t[0]); } }, [t[1], t[2] ? el('em', { cls: 'cnt', text: String(t[2]) }) : null]));
    });
    n.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var bs = [].slice.call(n.querySelectorAll('[role="tab"]')), i = bs.indexOf(doc.activeElement);
      if (i < 0) return; i = (i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length; bs[i].click();
      var nb = CL.root.querySelector('[data-tab="' + bs[i].getAttribute('data-tab') + '"]'); if (nb) nb.focus();
    });
    return n;
  };
  CL.head = function (title, sub, actions) {
    return el('div', { cls: 'mod-h' }, [el('div', {}, [el('h2', { text: title }), sub ? el('p', { text: sub }) : null]), actions && actions.length ? el('div', { cls: 'mod-a' }, actions) : null]);
  };

  /* ---------- clock, roles ---------- */
  CL.TODAY = '2026-10-20'; CL.MONTH = '2026-10'; CL.DAYS = 31; CL.FIRST_WD = 3; CL.TODAY_D = 20;
  CL.ROLES = ['hr', 'mgr', 'acc', 'ceo'];
  CL.MGR_DEPT = 'wh';
  CL.stamp = function () {
    var m = CL.DB.clock; CL.DB.clock += 1 + (m % 3);
    return CL.TODAY + ' ' + CL.pad2(Math.floor(m / 60) % 24) + ':' + CL.pad2(m % 60);
  };
  var ACCESS = { home: 1, staff: 1, ts: 1, checks: 1, reports: 1, events: ['hr', 'mgr', 'ceo'], piece: ['hr', 'mgr', 'ceo', 'acc'], memos: ['hr', 'mgr', 'ceo', 'acc'], sync: ['hr', 'ceo', 'acc'], refs: ['hr', 'ceo'], access: ['hr', 'ceo'], audit: ['hr', 'ceo'], backups: ['hr', 'ceo'], settings: ['hr', 'ceo'] };
  CL.modOK = function (m) { var a = ACCESS[m]; return a === 1 || (a && a.indexOf(CL.DB.role) >= 0); };
  CL.role = function () { return CL.DB.role; };
  CL.isIn = function () { var r = CL.DB.role; for (var i = 0; i < arguments.length; i++) if (arguments[i] === r) return true; return false; };
  CL.can = function (a) {
    var r = CL.DB.role;
    switch (a) {
      case 'personal': case 'sick': return r === 'hr' || r === 'ceo';
      case 'rate': return r !== 'mgr';
      case 'price': return r === 'acc' || r === 'ceo';
      case 'refsEdit': case 'editCard': case 'syncDecide': case 'correct': return r === 'hr';
      case 'settings': case 'checksRun': case 'waive': return r === 'hr' || r === 'ceo';
      case 'unified': return r === 'hr' || r === 'ceo';
      case 'refresh': return r !== 'mgr';
      default: return false;
    }
  };
  CL.emps = function () { return CL.DB.emps; };
  CL.emp = function (id) { for (var i = 0; i < CL.DB.emps.length; i++) if (CL.DB.emps[i].id === id) return CL.DB.emps[i]; return null; };
  CL.visibleEmps = function () { return CL.DB.emps.filter(function (e) { return CL.DB.role !== 'mgr' || e.dept === CL.MGR_DEPT; }); };
  CL.inScope = function (empId) { var e = CL.emp(empId); return !e || CL.DB.role !== 'mgr' || e.dept === CL.MGR_DEPT; };
  CL.deptName = function (id) { var d = CL.byId(CL.DB.refs.depts, id); return d ? (d.label || T('dept.' + id)) : id; };
  CL.posName = function (id) { var d = CL.byId(CL.DB.refs.pos, id); return d ? (d.label || T('pos.' + id)) : id; };
  CL.byId = function (list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; };
  CL.initials = function (n) { var p = n.split(' '); return p[0].charAt(0) + (p[1] || '').charAt(0); };
  CL.statusBadge = function (st) { return CL.badge(st === 'active' ? 'ok' : st === 'leave' ? 'info' : st === 'probation' ? 'warn' : 'bad', T('st.' + st)); };
  CL.nextId = function (p) { var d = CL.DB.seq; d[p] = (d[p] || 0) + 1; return p + d[p]; };

  /* ---------- audit ---------- */
  CL.log = function (mod, key, vars, ref) {
    CL.DB.audit.unshift({ t: CL.stamp(), role: CL.DB.role, mod: mod, key: key, vars: vars || {}, ref: ref || null });
  };

  /* ---------- calendar maths ---------- */
  CL.isWeekend = function (d) { return ((CL.FIRST_WD + d - 1) % 7) >= 5; };
  CL.wdIdx = function (d) { return (CL.FIRST_WD + d - 1) % 7; };
  CL.dateStr = function (d) { return CL.MONTH + '-' + CL.pad2(d); };
  CL.dayType = function (d) {
    var o = CL.DB.refs.cal[d];
    if (o) return o;
    return CL.isWeekend(d) ? 'we' : 'work';
  };
  CL.hoursFor = function (d) {
    var t = CL.dayType(d), h = CL.DB.settings.hpd;
    return t === 'work' ? h : t === 'short' ? h - 1 : 0;
  };
  CL.norm = function () { var s = 0; for (var d = 1; d <= CL.DAYS; d++) s += CL.hoursFor(d); return s; };
  /* day number inside the demo month for an ISO date (or null) */
  CL.dayOf = function (iso) { return iso && iso.slice(0, 7) === CL.MONTH ? parseInt(iso.slice(8), 10) : null; };
  CL.baseCell = function (e, d) {
    if (e.hired > CL.dateStr(d)) return { c: 'off', h: 0 };
    if (e.leftOn && e.leftOn < CL.dateStr(d)) return { c: 'off', h: 0 };
    var hpd = CL.DB.settings.hpd, t = CL.dayType(d), s = e.sched;
    if (s === 'shift') return ((d + (e.off || 0)) % 4 < 2) ? { c: 'W', h: 11 } : { c: 'off', h: 0 };
    if (s === 'part') return t === 'work' ? { c: 'W', h: hpd / 2 } : { c: 'off', h: 0 };
    return t === 'work' ? { c: 'W', h: hpd } : t === 'short' ? { c: 'W', h: hpd - 1 } : { c: 'off', h: 0 };
  };
  CL.genCells = function (e) { var a = [null]; for (var d = 1; d <= CL.DAYS; d++) a.push(CL.baseCell(e, d)); CL.DB.cells[e.id] = a; return a; };
  /* absence kind code for an applied event type */
  var ABS = { vacation: 'V', sick: 'S', unpaid: 'U' };
  CL.absCode = function (type) { return ABS[type] || null; };
  CL.applyAbsence = function (e, code, from, to) {
    var a = CL.DB.cells[e.id], n = 0;
    for (var d = 1; d <= CL.DAYS; d++) {
      var s = CL.dateStr(d);
      if (s < from || s > to) continue;
      if (a[d].c === 'off' && a[d].h === 0 && CL.baseCell(e, d).c === 'off') continue;
      a[d] = { c: code, h: 0 }; n++;
    }
    return n;
  };
  CL.absCover = function (empId, d) {
    var s = CL.dateStr(d), r = null;
    CL.DB.events.forEach(function (ev) {
      if (ev.emp === empId && ev.st === 'applied' && ABS[ev.type] && ev.date <= s && (ev.to || ev.date) >= s) r = ABS[ev.type];
    });
    return r;
  };
  CL.cellConflict = function (x) { return x.dbl ? 'dbl' : (x.h > 12 ? 'hrs' : null); };
  CL.totals = function (id) {
    var a = CL.DB.cells[id], h = 0, ot = 0, off = 0, d, x;
    for (d = 1; d <= CL.DAYS; d++) {
      x = a[d]; h += x.h;
      if (x.c === 'O') ot += Math.max(0, x.h - CL.hoursFor(d));
      if (x.c === 'V' || x.c === 'S' || x.c === 'A' || x.c === 'U') off++;
    }
    return { h: h, ot: ot, off: off };
  };

  /* ---------- navigation ---------- */
  CL.go = function (mod, opts) {
    if (!CL.modOK(mod)) { CL.toast(T('toast.noAccess')); return; }
    CL.UI.mod = mod;
    if (opts) { for (var k in opts) CL.UI[k] = opts[k]; }
    CL.render('main');
  };
  CL.registerMod = function (id, def) { CL.mods[id] = def; CL.order.push(id); };
  CL.uiDefaults = { mod: 'home', menu: false };
  CL.UI = { mod: 'home', menu: false };
  CL.ud = function (o) { for (var k in o) { CL.uiDefaults[k] = o[k]; CL.UI[k] = o[k]; } };
  CL.newUI = function () { var o = {}; for (var k in CL.uiDefaults) o[k] = CL.uiDefaults[k]; return o; };
  CL.auditText = function (a) { var v = {}, k, x; for (k in a.vars) { x = a.vars[k]; v[k] = (typeof x === 'string' && x.charAt(0) === '~') ? T(x.slice(1)) : x; } return T('a.' + a.key, v); };
  CL.root = null;

  var GROUPS = [['g.work', ['home', 'staff', 'events', 'ts', 'piece', 'memos']], ['g.control', ['checks', 'sync', 'reports']], ['g.admin', ['refs', 'access', 'audit', 'backups', 'settings']]];
  CL.render = function (focus) {
    var root = CL.root, sc = root.querySelector('.ts-scroll'), sx = sc ? sc.scrollLeft : 0;
    var main0 = root.querySelector('.main'), st = main0 ? main0.scrollTop : 0;
    var h0 = root.offsetHeight; root.style.minHeight = h0 + 'px';
    root.innerHTML = '';
    var shell = el('div', { cls: 'shell' + (CL.UI.menu ? ' menu-open' : '') });
    shell.appendChild(renderSide());
    var main = el('div', { cls: 'main', id: 'modMain', tabindex: '-1' });
    main.appendChild(renderTop());
    var def = CL.mods[CL.UI.mod];
    var body = el('div', { cls: 'mod mod-' + CL.UI.mod });
    try { def.render(body); } catch (e) { if (w.console) w.console.error(e); body.appendChild(el('p', { text: String(e) })); }
    main.appendChild(body);
    shell.appendChild(main);
    shell.appendChild(el('button', { type: 'button', cls: 'scrim', 'aria-label': T('nav.close'), tabindex: '-1', onclick: function () { CL.UI.menu = false; CL.render(); } }));
    root.appendChild(shell);
    sc = root.querySelector('.ts-scroll'); if (sc) sc.scrollLeft = sx;
    if (focus === 'main') { var mm = root.querySelector('#modMain'); if (mm) mm.focus({ preventScroll: true }); }
    else if (focus) { var f = root.querySelector(focus); if (f) f.focus({ preventScroll: true }); }
    w.requestAnimationFrame(function () { root.style.minHeight = ''; });
  };
  function renderSide() {
    var nav = el('nav', { cls: 'side', 'aria-label': T('nav.label') });
    nav.appendChild(el('div', { cls: 'side-brand' }, [el('b', { text: T('app.name') }), el('span', { text: T('app.company') })]));
    GROUPS.forEach(function (g) {
      nav.appendChild(el('p', { cls: 'side-g', text: T(g[0]) }));
      g[1].forEach(function (m) {
        var ok = CL.modOK(m), cnt = CL.mods[m].badge ? CL.mods[m].badge() : 0;
        nav.appendChild(el('button', { type: 'button', cls: 'ni' + (CL.UI.mod === m ? ' on' : '') + (ok ? '' : ' off'), 'data-mod': m, 'aria-current': CL.UI.mod === m ? 'page' : null, 'aria-disabled': ok ? null : 'true', onclick: function () { CL.UI.menu = false; CL.go(m); } }, [icon(CL.mods[m].icon), el('span', { text: T('m.' + m) }), ok ? (cnt ? el('em', { cls: 'cnt', text: String(cnt), 'aria-label': T('nav.count', { n: cnt }) }) : null) : icon('lock')]));
      });
    });
    return nav;
  }
  function renderTop() {
    var r = CL.DB.role;
    var g = el('div', { cls: 'roles', role: 'group', 'aria-label': T('role.label') });
    CL.ROLES.forEach(function (x) {
      g.appendChild(el('button', { type: 'button', 'data-role': x, 'aria-pressed': r === x ? 'true' : 'false', text: T('role.' + x), onclick: function () {
        CL.DB.role = x; CL.log('access', 'role', { role: T('role.' + x) });
        if (!CL.modOK(CL.UI.mod)) CL.UI.mod = 'home';
        if (CL.UI.sel && !CL.inScope(CL.UI.sel)) CL.UI.sel = null;
        CL.render('[data-role="' + x + '"]');
      } }));
    });
    return el('div', { cls: 'top' }, [
      el('button', { type: 'button', cls: 'burger', 'aria-label': T('nav.open'), 'aria-expanded': CL.UI.menu ? 'true' : 'false', onclick: function () { CL.UI.menu = !CL.UI.menu; CL.render(CL.UI.menu ? '.ni.on' : '.burger'); } }, [icon('menu'), el('span', { text: T('m.' + CL.UI.mod) })]),
      el('div', { cls: 'rolebox' }, [el('span', { cls: 'rl', text: T('role.viewAs') }), g, el('button', { type: 'button', cls: 'reset', text: T('app.reset'), onclick: function () { CL.reset(); } })]),
      el('p', { cls: 'rolenote' }, [icon(r === 'hr' || r === 'ceo' ? 'shield' : 'lock'), el('span', {}, [el('b', { text: T('role.' + r) + '. ' }), T('note.' + r)])])
    ]);
  }
  CL.reset = function () { CL.DB = CL.seed(); CL.UI = CL.newUI(); CL.render('.reset'); CL.toast(T('toast.reset')); };
}(window));
