/* Modules: calendar (day and week grid, phone agenda), bookings list, booking card and the new-booking form (shared by every channel). */
(function (w) {
  'use strict';
  var BK = w.BK, T = BK.T, el = BK.el, icon = BK.icon;
  var doc = w.document;
  BK.ud({ calView: 'day', calDate: BK.TODAY, calStaff: 's1', lf: { st: 'all', per: 'up', src: 'all', staff: 'all', q: '' }, lshow: 30 });

  BK.phoneView = function (c) { return BK.isSpec() ? c.phone.slice(0, 6) + ' ••• ••-' + c.phone.slice(-2) : c.phone; };
  BK.reasonText = function (b) { return !b.reason ? '' : (String(b.reason).indexOf('reason.') === 0 ? T(b.reason) : b.reason); };
  BK.srcBadge = function (s) { return el('span', { cls: 'src src-' + s, text: T('src.' + s) }); };
  var REASONS = ['reason.plans', 'reason.ill', 'reason.found', 'reason.biz', 'reason.other'];

  /* ---------- booking card ---------- */
  function cancelDialog(b, after) {
    var form = BK.form([
      { k: 'why', label: T('card.reason'), type: 'select', opts: REASONS.map(function (k) { return [k, T(k)]; }), value: BK.isSpec() ? 'reason.biz' : 'reason.plans' },
      { k: 'txt', label: T('card.comment'), type: 'textarea', rows: 2 }
    ]);
    BK.dialog(T('card.cancelT', { code: b.code }), form.node, [{ text: T('dlg.back'), ghost: true }, { text: T('card.cancel'), onclick: function () {
      if (!form.validate()) return false;
      var v = form.get();
      if (BK.setStatus(b, 'cancelled', v.txt || v.why)) { BK.toast(T('toast.cancelled', { code: b.code })); }
      after();
    } }]);
  }
  function moveDialog(b, after) {
    var s = BK.svc(b.svc), opts = BK.offering(b.svc).map(function (x) { return [x.id, x.name]; });
    var form = BK.form([
      { k: 'staff', label: T('f.staff'), type: 'select', opts: opts, value: b.staff },
      { k: 'date', label: T('f.date'), type: 'date', min: BK.TODAY, max: BK.addDays(BK.TODAY, BK.DB.settings.lead), value: b.date, req: true },
      { k: 'time', label: T('f.time'), type: 'select', opts: [['', '']], req: true }
    ], function (v) { if (v.time && BK.slots(v.staff, v.date, s.dur, b.id).indexOf(+v.time) < 0) return { time: 'v.taken' }; });
    function fill() {
      var v = form.get(), sel = form.ref('time'), sl = /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? BK.slots(v.staff, v.date, s.dur, b.id) : [], i;
      sel.innerHTML = '';
      sel.appendChild(el('option', { value: '', text: sl.length ? T('f.pickTime') : T('f.noSlots') }));
      for (i = 0; i < sl.length; i++) sel.appendChild(el('option', { value: sl[i], text: BK.hhmm(sl[i]) }));
      if (v.date === b.date && v.staff === b.staff && sl.indexOf(b.time) >= 0) sel.value = b.time;
    }
    form.ref('staff').addEventListener('change', fill); form.ref('date').addEventListener('change', fill); fill();
    BK.dialog(T('card.moveT', { code: b.code }), form.node, [{ text: T('dlg.back'), ghost: true }, { text: T('card.move'), onclick: function () {
      if (!form.validate()) return false;
      var v = form.get();
      if (!BK.move(b, v.date, +v.time, v.staff)) return false;
      BK.toast(T('toast.moved', { code: b.code })); after();
    } }]);
  }
  BK.bookingCard = function (id) {
    var b = BK.booking(id); if (!b) return;
    var c = BK.client(b.client), s = BK.svc(b.svc), body = el('div');
    function again() { BK.render(); BK.bookingCard(id); }
    function dl(k, v) { return el('div', {}, [el('dt', { text: k }), el('dd', {}, [typeof v === 'object' ? v : doc.createTextNode(String(v))])]); }
    body.appendChild(el('dl', { cls: 'kv' }, [
      dl(T('f.status'), BK.stBadge(b.status)), dl(T('f.when'), BK.when(b) + ' – ' + BK.hhmm(b.time + b.dur)),
      dl(T('f.service'), BK.svcName(b.svc) + ' · ' + BK.cu(s ? s.price : 0)), dl(T('f.staff'), BK.staffName(b.staff)),
      dl(T('f.client'), c ? el('button', { type: 'button', cls: 'lnk', text: c.name, onclick: function () { if (BK.modOK('cli')) { BK.UI.sel = c.id; BK.UI.mod = 'cli'; document.querySelector('dialog.bk-dlg').close(); BK.render('main'); } else BK.toast(T('toast.noAccess')); } }) : '-'),
      dl(T('f.phone'), c ? BK.phoneView(c) : '-'), dl(T('f.source'), BK.srcBadge(b.src)), dl(T('f.created'), b.created)
    ]));
    if (b.note) body.appendChild(el('p', { cls: 'dlg-p', text: T('f.note') + ': ' + b.note }));
    if (b.reason) body.appendChild(el('p', { cls: 'dlg-p', text: T('card.reason') + ': ' + BK.reasonText(b) }));
    var hist = BK.DB.audit.filter(function (a) { return a.ref === b.id; });
    if (hist.length) {
      body.appendChild(el('h4', { cls: 'sub-h', text: T('card.history') }));
      body.appendChild(el('ul', { cls: 'mini' }, hist.map(function (a) { return el('li', {}, [el('time', { text: a.t }), el('span', { text: BK.who(a.role) + ': ' + BK.auditText(a) })]); })));
    }
    var btns = [{ text: T('dlg.close'), ghost: true }];
    if (BK.canSet(b, 'confirmed') && !BK.isSpec()) btns.push({ text: T('card.confirm'), onclick: function () { BK.setStatus(b, 'confirmed'); BK.toast(T('toast.confirmed', { code: b.code })); BK.render(); } });
    if (BK.canSet(b, 'done')) btns.push({ text: T('card.done'), onclick: function () { BK.setStatus(b, 'done'); BK.toast(T('toast.done', { code: b.code })); BK.render(); } });
    if (BK.canSet(b, 'noshow')) btns.push({ text: T('card.noshow'), ghost: true, onclick: function () { BK.setStatus(b, 'noshow'); BK.toast(T('toast.noshow', { code: b.code })); BK.render(); } });
    if (BK.active(b) && BK.can('move')) btns.push({ text: T('card.move'), ghost: true, onclick: function () { setTimeout(function () { moveDialog(b, function () { BK.render(); }); }, 0); } });
    if (BK.active(b) && BK.can('cancel')) btns.push({ text: T('card.cancel'), ghost: true, onclick: function () { setTimeout(function () { cancelDialog(b, function () { BK.render(); }); }, 0); } });
    BK.dialog(T('card.title', { code: b.code }), body, btns, { wide: true });
  };

  /* ---------- new booking (admin side) ---------- */
  BK.newBooking = function (pre) {
    if (!BK.can('create')) { BK.toast(T('toast.noAccess')); return; }
    pre = pre || {};
    var D = BK.DB, svcs = D.services.filter(function (s) { return s.on; });
    var form = BK.form([
      { k: 'svc', label: T('f.service'), type: 'select', opts: svcs.map(function (s) { return [s.id, BK.svcName(s.id) + ' (' + s.dur + ' ' + T('min') + ')']; }), value: pre.svc || svcs[0].id },
      { k: 'staff', label: T('f.staff'), type: 'select', opts: [['x', 'x']] },
      { k: 'date', label: T('f.date'), type: 'date', min: BK.TODAY, max: BK.addDays(BK.TODAY, D.settings.lead), value: pre.date || BK.TODAY, req: true },
      { k: 'time', label: T('f.time'), type: 'select', opts: [['', '']], req: true },
      { k: 'client', label: T('f.client'), type: 'select', opts: [['__new', T('f.newClient')]].concat(D.clients.map(function (c) { return [c.id, c.name]; })), value: pre.client || '__new' },
      { k: 'name', label: T('f.name'), type: 'text', minlen: 2, maxlength: 40 },
      { k: 'phone', label: T('f.phone'), type: 'tel', pattern: /^\+?[\d\s()-]{7,20}$/, patternMsg: 'v.phone', help: T('f.phoneHelp') },
      { k: 'note', label: T('f.note'), type: 'textarea', rows: 2, maxlength: 160 }
    ], function (v) {
      var e = {}, s = BK.svc(v.svc);
      if (v.client === '__new') { if (!v.name) e.name = 'v.req'; if (!v.phone) e.phone = 'v.req'; }
      if (v.time && s && BK.slots(v.staff, v.date, s.dur).indexOf(+v.time) < 0) e.time = 'v.taken';
      return e;
    });
    function fillStaff() {
      var v = form.get(), sel = form.ref('staff'), list = BK.offering(v.svc), cur = pre.staff && list.some(function (x) { return x.id === pre.staff; }) ? pre.staff : (sel.value || '');
      sel.innerHTML = '';
      list.forEach(function (x) { sel.appendChild(el('option', { value: x.id, text: x.name })); });
      if (cur && list.some(function (x) { return x.id === cur; })) sel.value = cur;
      pre.staff = null;
    }
    function fillTime() {
      var v = form.get(), s = BK.svc(v.svc), sel = form.ref('time'), sl = s && /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? BK.slots(v.staff, v.date, s.dur) : [], i, keep = pre.time;
      sel.innerHTML = '';
      sel.appendChild(el('option', { value: '', text: sl.length ? T('f.pickTime') : T('f.noSlots') }));
      for (i = 0; i < sl.length; i++) sel.appendChild(el('option', { value: sl[i], text: BK.hhmm(sl[i]) }));
      if (keep && sl.indexOf(keep) >= 0) sel.value = keep;
      pre.time = null;
    }
    function toggleNew() {
      var isNew = form.get().client === '__new';
      ['name', 'phone'].forEach(function (k) { form.ref(k).closest('.fl').hidden = !isNew; });
    }
    fillStaff(); fillTime(); toggleNew();
    form.ref('svc').addEventListener('change', function () { fillStaff(); fillTime(); });
    form.ref('staff').addEventListener('change', fillTime); form.ref('date').addEventListener('change', fillTime);
    form.ref('client').addEventListener('change', toggleNew);
    BK.dialog(T('new.title'), form.node, [{ text: T('dlg.cancel'), ghost: true }, { text: T('new.save'), onclick: function () {
      if (!form.validate()) return false;
      var v = form.get(), r = BK.book({ svc: v.svc, staff: v.staff, date: v.date, time: +v.time, name: v.name, phone: v.phone, client: v.client === '__new' ? null : v.client, src: 'manual', note: v.note });
      if (!r.ok) { BK.toast(T('v.taken')); return false; }
      BK.toast(T('toast.created', { code: r.b.code })); BK.render();
    } }], { wide: true });
  };

  /* ---------- calendar ---------- */
  var PX = 1.5, T0 = 480, T1 = 1140;
  function weekStart(iso) { return BK.addDays(iso, -BK.dow(iso)); }
  function dayBookings(iso, staffId) { return BK.DB.bookings.filter(function (b) { return b.date === iso && b.staff === staffId && b.status !== 'cancelled' && BK.vis(b); }); }
  function columns() {
    var U = BK.UI, out = [], i;
    if (U.calView === 'day') {
      BK.DB.staff.forEach(function (s) { if (!BK.isSpec() || s.id === BK.DB.me) out.push({ iso: U.calDate, staff: s.id, label: s.name, sub: T('title.' + s.title) }); });
    } else {
      var sid = BK.isSpec() ? BK.DB.me : U.calStaff, ws = weekStart(U.calDate);
      for (i = 0; i < 6; i++) out.push({ iso: BK.addDays(ws, i), staff: sid, label: BK.fmt(BK.addDays(ws, i), 'wd'), sub: BK.fmt(BK.addDays(ws, i), 'dm') });
    }
    return out;
  }
  function shade(col, from, to, label) {
    if (to <= from) return null;
    return el('div', { cls: 'shade', style: 'top:' + ((from - T0) * PX) + 'px;height:' + ((to - from) * PX) + 'px', 'aria-hidden': 'true' }, label ? [el('span', { text: label })] : []);
  }
  function renderGrid(cols) {
    var D = BK.DB, grid = el('div', { cls: 'cal-grid', style: '--cols:' + cols.length });
    var head = el('div', { cls: 'cal-head' }, [el('div', { cls: 'cal-corner' })]);
    cols.forEach(function (c) { head.appendChild(el('div', { cls: 'cal-ch' + (c.iso === BK.TODAY && BK.UI.calView === 'week' ? ' today' : '') }, [el('b', { text: c.label }), el('span', { text: c.sub })])); });
    var body = el('div', { cls: 'cal-body', style: 'height:' + ((T1 - T0) * PX) + 'px' });
    var hours = el('div', { cls: 'cal-hours' });
    for (var h = T0; h < T1; h += 60) hours.appendChild(el('span', { style: 'top:' + ((h - T0) * PX) + 'px', text: BK.hhmm(h) }));
    body.appendChild(hours);
    cols.forEach(function (c) {
      var st = BK.staff(c.staff), hh = BK.hoursOf(st, c.iso), colEl = el('div', { cls: 'cal-col', 'data-iso': c.iso, 'data-staff': c.staff });
      for (var g = T0; g < T1; g += 60) colEl.appendChild(el('i', { cls: 'gl', style: 'top:' + ((g - T0) * PX) + 'px' }));
      if (!hh) colEl.appendChild(shade(c, T0, T1, st.off.indexOf(c.iso) >= 0 ? T('cal.off') : T('cal.closed')));
      else {
        colEl.appendChild(shade(c, T0, hh[0])); colEl.appendChild(shade(c, hh[1], T1));
        if (st.brk) colEl.appendChild(shade(c, st.brk[0], st.brk[1], T('cal.break')));
      }
      dayBookings(c.iso, c.staff).forEach(function (b) {
        var cl = BK.client(b.client), blk = el('button', { type: 'button', cls: 'blk st-' + b.status + (b.dur <= 30 ? ' sm' : ''), style: 'top:' + ((b.time - T0) * PX) + 'px;height:' + (b.dur * PX - 1) + 'px', 'aria-label': BK.hhmm(b.time) + ' ' + (cl ? cl.name : '') + ', ' + BK.svcName(b.svc) + ', ' + T('st.' + b.status), onclick: function (e) { e.stopPropagation(); BK.bookingCard(b.id); } }, [
          el('b', { text: BK.hhmm(b.time) + ' ' + (cl ? cl.name : '') }), el('span', { text: BK.svcName(b.svc) })]);
        colEl.appendChild(blk);
      });
      if (c.iso === BK.TODAY) colEl.appendChild(el('i', { cls: 'nowline', style: 'top:' + ((BK.NOW - T0) * PX) + 'px', 'aria-hidden': 'true' }));
      colEl.addEventListener('click', function (e) {
        if (e.target.closest('.blk')) return;
        if (!BK.can('create')) { BK.toast(T('toast.noAccess')); return; }
        var rect = colEl.getBoundingClientRect(), y = (e.clientY - rect.top) / PX + T0, step = D.settings.interval, t = Math.floor(y / step) * step;
        var free = BK.slots(c.staff, c.iso, step);
        if (free.indexOf(t) < 0) { BK.toast(T('cal.busy')); return; }
        var svc = D.services.filter(function (s) { return s.on && st.svcs.indexOf(s.id) >= 0 && BK.slots(c.staff, c.iso, s.dur).indexOf(t) >= 0; })[0];
        if (!svc) { BK.toast(T('cal.busy')); return; }
        BK.newBooking({ date: c.iso, time: t, staff: c.staff, svc: svc.id });
      });
      body.appendChild(colEl);
    });
    var scroll = el('div', { cls: 'cal-scroll' }, [el('div', { cls: 'cal-inner' }, [head, body])]);
    grid.appendChild(scroll);
    return grid;
  }
  function renderAgenda(cols) {
    var wrap = el('div', { cls: 'cal-agenda' });
    cols.forEach(function (c) {
      var st = BK.staff(c.staff), hh = BK.hoursOf(st, c.iso), list = dayBookings(c.iso, c.staff).sort(function (a, b) { return a.time - b.time; });
      var sec = el('section', { cls: 'ag' }, [el('h4', {}, [el('span', { text: BK.UI.calView === 'day' ? c.label : c.label + ', ' + c.sub }), el('em', { text: hh ? BK.hhmm(hh[0]) + '–' + BK.hhmm(hh[1]) : (st.off.indexOf(c.iso) >= 0 ? T('cal.off') : T('cal.closed')) })])]);
      if (!list.length) sec.appendChild(el('p', { cls: 'ag-empty', text: hh ? T('cal.free') : '' }));
      list.forEach(function (b) {
        sec.appendChild(el('button', { type: 'button', cls: 'ag-i st-' + b.status, onclick: function () { BK.bookingCard(b.id); } }, [el('time', { text: BK.hhmm(b.time) }), el('span', {}, [el('b', { text: BK.clientName(b.client) }), el('small', { text: BK.svcName(b.svc) })]), BK.stBadge(b.status)]));
      });
      wrap.appendChild(sec);
    });
    return wrap;
  }
  BK.registerMod('cal', { icon: 'cal', badge: function () { return 0; }, render: function (box) {
    var U = BK.UI, D = BK.DB;
    var step = U.calView === 'day' ? 1 : 7;
    function shift(n) { U.calDate = BK.addDays(U.calDate, n * step); BK.render('.cal-nav .btn'); }
    var staffSel = el('select', { cls: 'in', 'aria-label': T('f.staff'), onchange: function (e) { U.calStaff = e.target.value; BK.render('.cal-staff'); } }, D.staff.map(function (s) { return el('option', { value: s.id, text: s.name }); }));
    staffSel.value = U.calStaff; staffSel.classList.add('cal-staff');
    box.appendChild(BK.head(T('cal.h'), T('cal.sub'), BK.can('create') ? [BK.btn(T('new.btn'), function () { BK.newBooking({ date: U.calDate >= BK.TODAY ? U.calDate : BK.TODAY }); })] : []));
    var bar = el('div', { cls: 'cal-bar' }, [
      el('div', { cls: 'cal-nav' }, [BK.btn('‹', function () { shift(-1); }, 'btn-ghost'), BK.btn(T('cal.today'), function () { U.calDate = BK.TODAY; BK.render('.cal-nav .btn'); }, 'btn-ghost'), BK.btn('›', function () { shift(1); }, 'btn-ghost')]),
      el('strong', { cls: 'cal-title', text: U.calView === 'day' ? BK.fmt(U.calDate, 'long') : BK.fmt(weekStart(U.calDate), 'dm') + ' – ' + BK.fmt(BK.addDays(weekStart(U.calDate), 5), 'dm') }),
      el('div', { cls: 'cal-opts' }, [
        BK.tabs([['day', T('cal.day')], ['week', T('cal.week')]], U.calView, function (v) { U.calView = v; BK.render('[data-tab="' + v + '"]'); }, T('cal.view')),
        U.calView === 'week' && !BK.isSpec() ? staffSel : null])
    ]);
    box.appendChild(bar);
    var cols = columns();
    box.appendChild(renderGrid(cols)); box.appendChild(renderAgenda(cols));
    box.appendChild(el('p', { cls: 'hint-s', text: BK.can('create') ? T('cal.hint') : T('cal.hintSpec') }));
    var lg = el('ul', { cls: 'legend' }, ['pending', 'confirmed', 'done', 'noshow'].map(function (s) { return el('li', {}, [el('i', { cls: 'sw st-' + s }), T('st.' + s)]); }));
    box.appendChild(lg);
  } });

  /* ---------- bookings list ---------- */
  function filtered() {
    var f = BK.UI.lf, q = f.q.trim().toLowerCase();
    return BK.DB.bookings.filter(function (b) {
      if (!BK.vis(b)) return false;
      if (f.st !== 'all' && b.status !== f.st) return false;
      if (f.per === 'up' && b.date < BK.TODAY) return false;
      if (f.per === 'past' && b.date >= BK.TODAY) return false;
      if (f.src !== 'all' && b.src !== f.src) return false;
      if (f.staff !== 'all' && b.staff !== f.staff) return false;
      if (q) { var c = BK.client(b.client); if ((b.code + ' ' + (c ? c.name : '') + ' ' + BK.svcName(b.svc)).toLowerCase().indexOf(q) < 0) return false; }
      return true;
    }).sort(function (a, b) { var x = BK.abs(a.date, a.time), y = BK.abs(b.date, b.time); return BK.UI.lf.per === 'past' ? y - x : x - y; });
  }
  function csv(rows) {
    var lines = [['code', 'date', 'time', 'service', 'specialist', 'client', 'source', 'status'].join(',')];
    rows.forEach(function (b) { lines.push([b.code, b.date, BK.hhmm(b.time), BK.svcName(b.svc), BK.staffName(b.staff), BK.clientName(b.client), b.src, b.status].join(',')); });
    return lines.join('\n');
  }
  BK.registerMod('list', { icon: 'list', badge: function () { return BK.DB.bookings.filter(function (b) { return b.status === 'pending' && BK.vis(b); }).length; }, render: function (box) {
    var f = BK.UI.lf, D = BK.DB;
    var base = D.bookings.filter(function (b) { return BK.vis(b) && (f.per === 'all' || (f.per === 'up') === (b.date >= BK.TODAY)); });
    var cnt = function (s) { return base.filter(function (b) { return s === 'all' || b.status === s; }).length; };
    box.appendChild(BK.head(T('list.h'), T('list.sub'), BK.can('create') ? [BK.btn(T('new.btn'), function () { BK.newBooking(); })] : []));
    var chips = el('div', { cls: 'tabs sub', role: 'group', 'aria-label': T('f.status') }, ['all', 'pending', 'confirmed', 'done', 'noshow', 'cancelled'].map(function (s) {
      return el('button', { type: 'button', 'aria-pressed': f.st === s ? 'true' : 'false', cls: 'chip' + (f.st === s ? ' on' : ''), onclick: function () { f.st = s; BK.UI.lshow = 30; BK.render('.chip.on'); } }, [s === 'all' ? T('list.all') : T('st.' + s), el('em', { cls: 'cnt', text: String(cnt(s)) })]);
    }));
    box.appendChild(chips);
    var search = el('input', { cls: 'in', type: 'search', placeholder: T('list.search'), 'aria-label': T('list.search'), value: f.q, oninput: function (e) { f.q = e.target.value; BK.UI.lshow = 30; var pos = e.target.selectionStart; BK.render('.search input'); var n = BK.root.querySelector('.search input'); if (n) n.setSelectionRange(pos, pos); } });
    var mk = function (key, items, label) {
      var s = el('select', { cls: 'in', 'aria-label': label, onchange: function (e) { f[key] = e.target.value; BK.UI.lshow = 30; BK.render(); } }, items.map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
      s.value = f[key]; return s;
    };
    box.appendChild(el('div', { cls: 'filters' }, [
      el('label', { cls: 'search' }, [icon('search'), search]),
      mk('per', [['up', T('list.up')], ['past', T('list.past')], ['all', T('list.allT')]], T('list.period')),
      mk('src', [['all', T('list.anySrc')]].concat(['web', 'bot', 'ai', 'phone', 'manual'].map(function (s) { return [s, T('src.' + s)]; })), T('f.source')),
      BK.isSpec() ? null : mk('staff', [['all', T('list.anyStaff')]].concat(D.staff.map(function (s) { return [s.id, s.name]; })), T('f.staff'))
    ]));
    var rows = filtered(), shown = rows.slice(0, BK.UI.lshow);
    box.appendChild(BK.table([
      { h: T('f.code'), f: function (b) { return el('button', { type: 'button', cls: 'lnk', text: b.code, onclick: function () { BK.bookingCard(b.id); } }); } },
      { h: T('f.when'), f: function (b) { return BK.when(b); } },
      { h: T('f.client'), f: function (b) { return BK.clientName(b.client); } },
      { h: T('f.service'), f: function (b) { return BK.svcName(b.svc); } },
      { h: T('f.staff'), f: function (b) { return BK.staffName(b.staff); } },
      { h: T('f.source'), f: function (b) { return BK.srcBadge(b.src); } },
      { h: T('f.status'), f: function (b) { return BK.stBadge(b.status); } }
    ], shown, { empty: T('list.empty'), emptyHint: T('list.emptyHint') }));
    var foot = el('div', { cls: 'acts' }, [el('span', { cls: 'count', text: T('list.count', { n: shown.length, total: rows.length }) })]);
    if (rows.length > shown.length) foot.appendChild(BK.btn(T('list.more'), function () { BK.UI.lshow += 30; BK.render(); }, 'btn-ghost'));
    if (rows.length) foot.appendChild(BK.btn(T('list.export'), function () {
      BK.dialog(T('list.exportT'), el('div', {}, [el('p', { cls: 'dlg-p', text: T('list.exportP', { n: rows.length }) }), el('pre', { cls: 'csv', text: csv(rows) })]));
      BK.log('list', 'export', { n: rows.length });
    }, 'btn-ghost'));
    box.appendChild(foot);
  } });
}(window));
