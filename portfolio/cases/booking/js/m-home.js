/* Modules: dashboard, clients (CRM), services and pricing, team and working hours. */
(function (w) {
  'use strict';
  var BK = w.BK, T = BK.T, el = BK.el, icon = BK.icon;

  /* ---------- dashboard ---------- */
  function stat(n, label, sub, fn) {
    return el('button', { type: 'button', cls: 'stat', onclick: fn }, [el('b', { text: String(n) }), el('span', { text: label }), el('small', { text: sub })]);
  }
  BK.registerMod('home', { icon: 'home', render: function (box) {
    var D = BK.DB, mine = D.bookings.filter(BK.vis);
    var today = mine.filter(function (b) { return b.date === BK.TODAY && b.status !== 'cancelled'; }).sort(function (a, b) { return a.time - b.time; });
    var pend = mine.filter(function (b) { return b.status === 'pending'; });
    var wk0 = BK.addDays(BK.TODAY, -BK.dow(BK.TODAY));
    var noshowWeek = mine.filter(function (b) { return b.status === 'noshow' && b.date >= wk0; }).length;
    box.appendChild(BK.head(T('home.h', { name: D.settings.name }), T('home.sub', { date: BK.fmt(BK.TODAY, 'long') }), BK.can('create') ? [BK.btn(T('new.btn'), function () { BK.newBooking(); })] : []));
    box.appendChild(el('div', { cls: 'stats' }, [
      stat(today.length, T('home.today'), T('home.todaySub', { n: today.filter(function (b) { return b.date === BK.TODAY && b.time + b.dur > BK.NOW && BK.active(b); }).length }), function () { BK.go('cal', { calView: 'day', calDate: BK.TODAY }); }),
      stat(pend.length, T('home.pending'), T('home.pendingSub'), function () { BK.go('list', { lf: { st: 'pending', per: 'up', src: 'all', staff: 'all', q: '' } }); }),
      stat(BK.isSpec() ? BK.slots(BK.DB.me, BK.TODAY, D.settings.interval).length : BK.freeToday(), T('home.free'), T('home.freeSub', { n: D.settings.interval }), function () { BK.go('cal', { calView: 'day', calDate: BK.TODAY }); }),
      stat(noshowWeek, T('home.noshow'), T('home.noshowSub'), function () { BK.go('list', { lf: { st: 'noshow', per: 'past', src: 'all', staff: 'all', q: '' } }); })
    ]));
    var cols = el('div', { cls: 'cols' });
    var ag = el('div', { cls: 'card-b' }, [el('h3', { text: T('home.agenda') })]);
    if (!today.length) ag.appendChild(el('p', { text: T('home.noAgenda') }));
    else ag.appendChild(el('ul', { cls: 'tasklist agenda' }, today.slice(0, 9).map(function (b) {
      return el('li', {}, [el('span', {}, [el('b', { text: BK.hhmm(b.time) + ' ' }), BK.clientName(b.client) + ' · ' + BK.svcName(b.svc) + (BK.isSpec() ? '' : ' · ' + BK.staffName(b.staff))]), el('div', { cls: 'acts' }, [BK.stBadge(b.status), BK.link(T('home.open'), function () { BK.bookingCard(b.id); })])]);
    })));
    cols.appendChild(ag);
    /* attention list: every item is a door into the module that fixes it */
    var items = [];
    var conf = BK.conflicts().filter(BK.vis);
    if (pend.length) items.push([T('home.a.pending', { n: pend.length }), 'warn', function () { BK.go('list', { lf: { st: 'pending', per: 'up', src: 'all', staff: 'all', q: '' } }); }]);
    if (conf.length) items.push([T('home.a.conf', { n: conf.length }), 'bad', function () { BK.go('team'); }]);
    if (BK.modOK('kb') && D.unanswered.length) items.push([T('home.a.una', { n: D.unanswered.length }), 'info', function () { BK.go('kb', { kbTab: 'una' }); }]);
    if (BK.modOK('rem')) { var q = BK.reminders().filter(function (x) { return x.st === 'queued' && x.when - BK.nowAbs() < 1440; }).length; if (q) items.push([T('home.a.rem', { n: q }), 'info', function () { BK.go('rem'); }]); }
    var at = el('div', { cls: 'card-b' }, [el('h3', { text: T('home.attention') })]);
    if (!items.length) at.appendChild(el('p', { cls: 'okline' }, [icon('check'), T('home.allClear')]));
    else at.appendChild(el('ul', { cls: 'tasklist' }, items.map(function (i) { return el('li', {}, [el('span', {}, [BK.badge(i[1], '!'), ' ' + i[0]]), BK.link(T('home.open'), i[2])]); })));
    cols.appendChild(at);
    box.appendChild(cols);
    var rc = D.audit.filter(function (a) { return BK.modOK('audit') || a.role !== 'owner'; }).slice(0, 5);
    var act = el('div', { cls: 'card-b' }, [el('h3', { text: T('home.recent') }), el('ul', { cls: 'mini' }, rc.map(function (a) { return el('li', {}, [el('time', { text: a.t }), el('span', { text: BK.who(a.role) + ': ' + BK.auditText(a) })]); }))]);
    box.appendChild(act);
  } });

  /* ---------- clients ---------- */
  BK.ud({ sel: null, cq: '', ctag: 'all' });
  var TAGS = ['vip', 'regular', 'new', 'remind'];
  function editClient(c) {
    var form = BK.form([
      { k: 'name', label: T('f.name'), req: true, minlen: 2, maxlength: 40, value: c ? c.name : '' },
      { k: 'phone', label: T('f.phone'), type: 'tel', req: true, pattern: /^\+?[\d\s()-]{7,20}$/, patternMsg: 'v.phone', value: c ? c.phone : '' },
      { k: 'ch', label: T('cli.channel'), type: 'select', opts: [['tg', T('ch.tg')], ['sms', T('ch.sms')], ['mail', T('ch.mail')]], value: c ? c.ch : 'tg' }
    ], function (v) { var o = BK.findClient(v.phone); if (o && (!c || o.id !== c.id)) return { phone: 'cli.dup' }; });
    BK.dialog(c ? T('cli.edit') : T('cli.add'), form.node, [{ text: T('dlg.cancel'), ghost: true }, { text: T('dlg.save'), onclick: function () {
      if (!form.validate()) return false;
      var v = form.get();
      if (c) { c.name = v.name; c.phone = v.phone; c.ch = v.ch; BK.log('cli', 'client.edit', { name: c.name }, c.id); }
      else { c = { id: BK.nextId('c'), name: v.name, phone: v.phone, tags: ['new'], note: '', extra: '', ch: v.ch, created: BK.TODAY }; BK.DB.clients.push(c); BK.log('cli', 'client.new', { name: c.name }, c.id); BK.UI.sel = c.id; }
      BK.toast(T('toast.saved')); BK.render();
    } }]);
  }
  function clientCard(c) {
    var s = BK.clientStats(c.id), card = el('div', { cls: 'card-b ccard' });
    card.appendChild(el('button', { type: 'button', cls: 'btn btn-sm btn-ghost backbtn', onclick: function () { BK.UI.sel = null; BK.render('.rows'); } }, [icon('back'), T('cli.back')]));
    card.appendChild(el('div', { cls: 'ch' }, [el('span', { cls: 'av', text: BK.initials(c.name) }), el('div', {}, [el('h3', { text: c.name }), el('p', { text: BK.phoneView(c) + ' · ' + T('ch.' + c.ch) })])]));
    card.appendChild(el('div', { cls: 'tiles' }, [['cli.visits', s.done], ['cli.noshows', s.noshow], ['cli.cancels', s.cancelled]].map(function (x) { return el('div', { cls: 'tile' }, [el('b', { text: String(x[1]) }), el('span', { text: T(x[0]) })]); })));
    var tg = el('div', { cls: 'tagrow', role: 'group', 'aria-label': T('cli.tags') }, TAGS.map(function (t) {
      var on = c.tags.indexOf(t) >= 0;
      return el('button', { type: 'button', cls: 'tagb' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', disabled: !BK.can('editClient'), text: T('tag.' + t), onclick: function () {
        if (on) c.tags.splice(c.tags.indexOf(t), 1); else c.tags.push(t);
        BK.log('cli', 'client.tag', { name: c.name, tag: T('tag.' + t) }, c.id); BK.render('.tagb.on'); } });
    }));
    card.appendChild(tg);
    if (c.extra) card.appendChild(el('p', { cls: 'lead-s', text: T('cli.vehicle') + ': ' + T(c.extra) + (c.plate ? ' · ' + c.plate : '') }));
    var note = el('textarea', { cls: 'in ta', rows: 2, 'aria-label': T('f.note'), maxlength: 200, disabled: !BK.can('editClient') });
    note.value = BK.clientNote(c);
    card.appendChild(el('div', { cls: 'fl' }, [el('label', { text: T('f.note') }), note]));
    var acts = el('div', { cls: 'acts' });
    if (BK.can('editClient')) {
      acts.appendChild(BK.btn(T('cli.saveNote'), function () { c.note = note.value.trim(); c.noteKey = ''; BK.log('cli', 'client.note', { name: c.name }, c.id); BK.toast(T('toast.saved')); BK.render(); }, 'btn-ghost'));
      acts.appendChild(BK.btn(T('cli.editBtn'), function () { editClient(c); }, 'btn-ghost'));
    }
    if (BK.can('create')) acts.appendChild(BK.btn(T('cli.book'), function () { BK.newBooking({ client: c.id }); }));
    card.appendChild(acts);
    card.appendChild(el('h4', { cls: 'sub-h', text: T('cli.history') }));
    var hs = BK.DB.bookings.filter(function (b) { return b.client === c.id; }).sort(function (a, b) { return BK.abs(b.date, b.time) - BK.abs(a.date, a.time); });
    card.appendChild(hs.length ? el('ul', { cls: 'hist' }, hs.slice(0, 8).map(function (b) { return el('li', {}, [el('button', { type: 'button', cls: 'lnk', text: BK.fmt(b.date, 'dm') + ' ' + BK.hhmm(b.time), onclick: function () { BK.bookingCard(b.id); } }), el('span', { text: BK.svcName(b.svc) }), BK.stBadge(b.status)]); })) : el('p', { cls: 'lead-s', text: T('cli.noHist') }));
    if (BK.can('editClient')) card.appendChild(el('div', { cls: 'acts forget' }, [BK.btn(T('cli.forget'), function () {
      BK.confirm(T('cli.forgetT'), T('cli.forgetP', { name: c.name }), T('cli.forget'), function () {
        var nm = c.name; c.name = T('cli.erased') + ' ' + c.id.toUpperCase(); c.phone = '+0 000 000-00-00'; c.note = ''; c.noteKey = ''; c.tags = []; c.plate = '';
        BK.DB.bookings.forEach(function (b) { if (b.client === c.id && BK.active(b)) b.status = 'cancelled'; });
        BK.log('cli', 'client.forget', { name: nm }, c.id); BK.UI.sel = null; BK.toast(T('toast.erased')); BK.render();
      });
    }, 'btn-ghost')]));
    return card;
  }
  BK.registerMod('cli', { icon: 'people', render: function (box) {
    var U = BK.UI, D = BK.DB, q = U.cq.trim().toLowerCase();
    box.appendChild(BK.head(T('cli.h'), T('cli.sub'), BK.can('editClient') ? [BK.btn(T('cli.add'), function () { editClient(null); })] : []));
    var search = el('input', { cls: 'in', type: 'search', placeholder: T('cli.search'), 'aria-label': T('cli.search'), value: U.cq, oninput: function (e) { U.cq = e.target.value; var p = e.target.selectionStart; BK.render('.search input'); var n = BK.root.querySelector('.search input'); if (n) n.setSelectionRange(p, p); } });
    var tsel = el('select', { cls: 'in', 'aria-label': T('cli.tags'), onchange: function (e) { U.ctag = e.target.value; BK.render(); } }, [el('option', { value: 'all', text: T('cli.anyTag') })].concat(TAGS.map(function (t) { return el('option', { value: t, text: T('tag.' + t) }); })));
    tsel.value = U.ctag;
    box.appendChild(el('div', { cls: 'filters' }, [el('label', { cls: 'search' }, [icon('search'), search]), tsel]));
    var list = D.clients.filter(function (c) { return (!q || (c.name + ' ' + c.phone).toLowerCase().indexOf(q) >= 0) && (U.ctag === 'all' || c.tags.indexOf(U.ctag) >= 0); });
    var sel = U.sel ? BK.client(U.sel) : null;
    var wrap = el('div', { cls: 'staff' + (sel ? ' has-card' : '') });
    var left = el('div', { cls: 'list-col' }), rows = el('div', { cls: 'rows' });
    if (!list.length) rows.appendChild(el('div', { cls: 'empty' }, [el('b', { text: T('cli.empty') })]));
    list.forEach(function (c) {
      var s = BK.clientStats(c.id);
      rows.appendChild(el('button', { type: 'button', cls: 'row crow' + (U.sel === c.id ? ' on' : ''), 'aria-current': U.sel === c.id ? 'true' : null, onclick: function () { U.sel = c.id; BK.render('.ccard'); } }, [
        el('span', { cls: 'av', text: BK.initials(c.name) }), el('span', { cls: 'nm' }, [el('b', { text: c.name }), el('small', { text: s.next ? T('cli.next', { when: BK.when(s.next) }) : T('cli.noNext') })]),
        el('span', { cls: 'tg' }, c.tags.slice(0, 2).map(function (t) { return BK.badge(t === 'vip' ? 'warn' : t === 'new' ? 'info' : '', T('tag.' + t)); }))]));
    });
    left.appendChild(rows); left.appendChild(el('p', { cls: 'count', text: T('cli.count', { n: list.length }) }));
    wrap.appendChild(left);
    var right = el('div', { cls: 'card-col' });
    right.appendChild(sel ? clientCard(sel) : el('div', { cls: 'empty' }, [el('b', { text: T('cli.pick') }), el('span', { text: T('cli.pickHint') })]));
    wrap.appendChild(right); box.appendChild(wrap);
  } });

  /* ---------- services ---------- */
  function editSvc(s) {
    var D = BK.DB;
    var form = BK.form([
      { k: 'name', label: T('svc.name'), req: true, minlen: 3, maxlength: 40, value: s ? BK.svcName(s.id) : '' },
      { k: 'dur', label: T('svc.dur'), type: 'number', req: true, min: 15, max: 240, help: T('svc.durHelp'), value: s ? s.dur : 30 },
      { k: 'price', label: T('svc.price') + ' (' + T('cu') + ')', type: 'number', req: true, min: 1, max: 9999, value: s ? s.price : '' }
    ], function (v) { if (+v.dur % 15) return { dur: 'svc.step' }; });
    var chk = el('fieldset', { cls: 'chk' }, [el('legend', { text: T('svc.who') })].concat(D.staff.map(function (st) {
      var cb = el('input', { type: 'checkbox', id: 'who-' + st.id, value: st.id }); cb.checked = s ? st.svcs.indexOf(s.id) >= 0 : true;
      return el('label', { 'for': 'who-' + st.id }, [cb, ' ' + st.name]);
    })));
    var body = el('div'); body.appendChild(form.node); body.appendChild(chk);
    BK.dialog(s ? T('svc.edit') : T('svc.add'), body, [{ text: T('dlg.cancel'), ghost: true }, { text: T('dlg.save'), onclick: function () {
      if (!form.validate()) return false;
      var v = form.get(), ids = [].slice.call(chk.querySelectorAll('input:checked')).map(function (i) { return i.value; });
      if (!ids.length) { BK.toast(T('svc.needStaff')); return false; }
      var old = s && s.price;
      if (!s) { s = { id: BK.nextId('x'), dur: +v.dur, price: +v.price, on: true }; D.services.push(s); BK.log('svc', 'svc.new', { name: v.name }); }
      else if (old !== +v.price) BK.log('svc', 'svc.price', { svc: s.id });
      if (v.name !== BK.svcName(s.id)) s.name = v.name;
      s.dur = +v.dur; s.price = +v.price;
      D.staff.forEach(function (st) { var i = st.svcs.indexOf(s.id); if (ids.indexOf(st.id) >= 0) { if (i < 0) st.svcs.push(s.id); } else if (i >= 0) st.svcs.splice(i, 1); });
      BK.toast(T('toast.saved')); BK.render();
    } }], { wide: true });
  }
  BK.registerMod('svc', { icon: 'tag', render: function (box) {
    var D = BK.DB, ed = BK.can('editSvc');
    box.appendChild(BK.head(T('svc.h'), T('svc.sub'), ed ? [BK.btn(T('svc.add'), function () { editSvc(null); })] : []));
    var rows = D.services.map(function (s) {
      var up = D.bookings.filter(function (b) { return b.svc === s.id && BK.active(b) && b.date >= BK.TODAY; }).length;
      return { s: s, up: up };
    });
    box.appendChild(BK.table([
      { h: T('svc.name'), f: function (r) { return el('span', { cls: 'sn' }, [el('b', { text: BK.svcName(r.s.id) }), T('svcd.' + r.s.id) !== '[svcd.' + r.s.id + ']' && !r.s.name ? el('small', { text: T('svcd.' + r.s.id) }) : null]); } },
      { h: T('svc.dur'), f: function (r) { return r.s.dur + ' ' + T('min'); } },
      { h: T('svc.price'), f: function (r) { return BK.cu(r.s.price); } },
      { h: T('svc.team'), f: function (r) { return BK.offering(r.s.id).map(function (x) { return x.name; }).join(', ') || '-'; } },
      { h: T('svc.upcoming'), f: function (r) { return String(r.up); } },
      { h: T('svc.public'), f: function (r) {
        return el('button', { type: 'button', cls: 'tog' + (r.s.on ? ' on' : ''), role: 'switch', 'aria-checked': r.s.on ? 'true' : 'false', disabled: !ed, 'aria-label': BK.svcName(r.s.id), onclick: function () {
          r.s.on = !r.s.on; BK.log('svc', r.s.on ? 'svc.on' : 'svc.off', { svc: r.s.id }); BK.render('.tog'); } }, [el('i'), el('span', { text: r.s.on ? T('on') : T('off') })]);
      } },
      { h: '', f: function (r) { return ed ? BK.link(T('svc.editBtn'), function () { editSvc(r.s); }) : null; } }
    ], rows));
    box.appendChild(el('p', { cls: 'hint-s', text: ed ? T('svc.hint') : T('svc.hintRo') }));
  } });

  /* ---------- team and working hours ---------- */
  BK.ud({ teamSel: 's1' });
  function hourOpts(from, to, cur) {
    var out = [], t;
    for (t = from; t <= to; t += 30) out.push(el('option', { value: t, text: BK.hhmm(t), selected: t === cur ? '' : null }));
    return out;
  }
  BK.registerMod('team', { icon: 'team', badge: function () { return BK.conflicts().filter(BK.vis).length; }, render: function (box) {
    var D = BK.DB, ed = BK.can('editTeam'), U = BK.UI;
    var st = BK.staff(BK.isSpec() ? D.me : U.teamSel) || D.staff[0];
    box.appendChild(BK.head(T('team.h'), T('team.sub')));
    if (!BK.isSpec()) box.appendChild(el('div', { cls: 'tabs sub', role: 'group', 'aria-label': T('team.h') }, D.staff.map(function (s) {
      return el('button', { type: 'button', 'aria-pressed': s.id === st.id ? 'true' : 'false', cls: 'chip' + (s.id === st.id ? ' on' : ''), onclick: function () { U.teamSel = s.id; BK.render('.chip.on'); } }, [s.name, s.on ? null : el('em', { cls: 'cnt off', text: T('off') })]);
    })));
    var card = el('div', { cls: 'card-b' }, [el('h3', { text: st.name + ' · ' + T('title.' + st.title) })]);
    card.appendChild(el('p', { cls: 'lead-s', text: T('team.does') + ' ' + st.svcs.map(BK.svcName).join(', ') }));
    var days = [0, 1, 2, 3, 4, 5, 6], g = el('div', { cls: 'hgrid' });
    days.forEach(function (d) {
      var h = st.hours[d], iso = BK.addDays('2026-11-16', d);
      var on = el('input', { type: 'checkbox', id: 'wd' + d, disabled: !ed, 'aria-label': BK.fmt(iso, 'wd') }); on.checked = !!h;
      var a = el('select', { cls: 'in', 'aria-label': BK.fmt(iso, 'wd') + ' ' + T('team.from'), disabled: !ed || !h }, hourOpts(M(6), M(14), h ? h[0] : M(9)));
      var b = el('select', { cls: 'in', 'aria-label': BK.fmt(iso, 'wd') + ' ' + T('team.to'), disabled: !ed || !h }, hourOpts(M(12), M(21), h ? h[1] : M(17)));
      function save() {
        st.hours[d] = on.checked ? [+a.value, Math.max(+b.value, +a.value + 60)] : null;
        BK.log('team', 'team.hours', { name: st.name, d: iso }); BK.render('#wd' + d);
      }
      on.addEventListener('change', save); a.addEventListener('change', save); b.addEventListener('change', save);
      g.appendChild(el('div', { cls: 'hrow' }, [el('label', { 'for': 'wd' + d, cls: 'hd' }, [on, ' ' + BK.fmt(iso, 'wl')]), a, el('span', { text: '–' }), b]));
    });
    card.appendChild(g);
    var brk = st.brk ? BK.hhmm(st.brk[0]) + '–' + BK.hhmm(st.brk[1]) : T('team.noBreak');
    card.appendChild(el('p', { cls: 'lead-s', text: T('team.break') + ': ' + brk }));
    card.appendChild(el('h4', { cls: 'sub-h', text: T('team.off') }));
    var offl = el('ul', { cls: 'offl' }, st.off.map(function (d) {
      return el('li', {}, [el('span', { text: BK.fmt(d, 'long') }), ed ? BK.link(T('team.rm'), function () { st.off.splice(st.off.indexOf(d), 1); BK.log('team', 'team.offRm', { name: st.name, d: d }); BK.render(); }) : null]);
    }));
    card.appendChild(st.off.length ? offl : el('p', { cls: 'lead-s', text: T('team.noOff') }));
    if (ed) {
      var di = el('input', { type: 'date', cls: 'in', id: 'offd', min: BK.TODAY, 'aria-label': T('team.addOff') }), er = el('span', { cls: 'err', role: 'alert' });
      card.appendChild(el('div', { cls: 'acts' }, [di, BK.btn(T('team.addOff'), function () {
        var v = di.value;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v < BK.TODAY) { er.textContent = T('v.date'); return; }
        if (st.off.indexOf(v) >= 0) { er.textContent = T('team.dup'); return; }
        st.off.push(v); st.off.sort(); BK.log('team', 'team.offAdd', { name: st.name, d: v });
        var n = D.bookings.filter(function (b) { return b.staff === st.id && b.date === v && BK.active(b); }).length;
        BK.toast(n ? T('toast.offConflict', { n: n }) : T('toast.offOk')); BK.render();
      }, 'btn-ghost'), er]));
      card.appendChild(el('div', { cls: 'acts' }, [BK.btn(st.on ? T('team.deactivate') : T('team.activate'), function () { st.on = !st.on; BK.log('team', st.on ? 'team.on' : 'team.offAll', { name: st.name }); BK.render(); }, 'btn-ghost')]));
    }
    box.appendChild(card);
    var conf = BK.conflicts().filter(function (b) { return !BK.isSpec() || b.staff === D.me; });
    var cf = el('div', { cls: 'card-b' }, [el('h3', { text: T('team.conf') })]);
    if (!conf.length) cf.appendChild(el('p', { cls: 'okline' }, [icon('check'), T('team.confOk')]));
    else {
      cf.appendChild(el('p', { cls: 'lead-s', text: T('team.confP') }));
      cf.appendChild(el('ul', { cls: 'tasklist' }, conf.map(function (b) { return el('li', {}, [el('span', { text: BK.when(b) + ' · ' + BK.clientName(b.client) + ' · ' + BK.staffName(b.staff) }), BK.link(T('home.open'), function () { BK.bookingCard(b.id); })]); })));
    }
    box.appendChild(cf);
    box.appendChild(el('p', { cls: 'hint-s', text: ed ? T('team.hint') : T('team.hintRo') }));
  } });
  function M(h) { return h * 60; }
}(window));
