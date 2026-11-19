/* Modules: analytics, settings (profile, rules, channels, brand, roles matrix), audit log. */
(function (w) {
  'use strict';
  var BK = w.BK, T = BK.T, el = BK.el, icon = BK.icon;
  BK.ud({ anRange: 14, anTab: 'over', auF: { mod: 'all', q: '' }, auShow: 40, setTab: 'biz' });

  /* ---------- analytics (everything is derived from the shared bookings) ---------- */
  function inRange() {
    var from = BK.addDays(BK.TODAY, -(BK.UI.anRange - 1));
    return BK.DB.bookings.filter(function (b) { return b.date >= from && b.date <= BK.TODAY; });
  }
  function pct(a, b) { return b ? Math.round(a * 100 / b) + '%' : '-'; }
  function hbars(rows, max, unit) {
    return el('ul', { cls: 'hbars' }, rows.map(function (r) {
      return el('li', {}, [el('span', { cls: 'hl', text: r[0] }), el('span', { cls: 'hb' }, [el('i', { style: 'width:' + (max ? Math.round(r[1] * 100 / max) : 0) + '%' })]), el('b', { text: r[1] + (unit || '') })]);
    }));
  }
  BK.registerMod('an', { icon: 'chart', render: function (box) {
    var U = BK.UI, D = BK.DB, L = inRange();
    box.appendChild(BK.head(T('an.h'), T('an.sub')));
    var rg = el('div', { cls: 'tabs sub', role: 'group', 'aria-label': T('an.range') }, [7, 14, 28].map(function (n) { return el('button', { type: 'button', cls: 'chip' + (U.anRange === n ? ' on' : ''), 'aria-pressed': U.anRange === n ? 'true' : 'false', onclick: function () { U.anRange = n; BK.render('.chip.on'); } }, [T('an.days', { n: n })]); }));
    box.appendChild(el('div', { cls: 'cal-bar' }, [BK.tabs([['over', T('an.tabO')], ['ch', T('an.tabC')], ['load', T('an.tabL')]], U.anTab, function (t) { U.anTab = t; BK.render('[data-tab="' + t + '"]'); }, T('an.h')), rg]));
    var cnt = function (st) { return L.filter(function (b) { return b.status === st; }).length; };
    var done = cnt('done'), ns = cnt('noshow'), cx = cnt('cancelled'), open = L.length - done - ns - cx;
    if (U.anTab === 'over') {
      box.appendChild(el('div', { cls: 'stats' }, [
        el('div', { cls: 'stat static' }, [el('b', { text: String(L.length) }), el('span', { text: T('an.total') }), el('small', { text: T('an.totalSub', { n: U.anRange }) })]),
        el('div', { cls: 'stat static' }, [el('b', { text: String(done) }), el('span', { text: T('an.done') }), el('small', { text: T('an.doneSub') })]),
        el('div', { cls: 'stat static' }, [el('b', { text: pct(ns, done + ns) }), el('span', { text: T('an.nsRate') }), el('small', { text: T('an.nsSub', { n: ns }) })]),
        el('div', { cls: 'stat static' }, [el('b', { text: pct(cx, L.length) }), el('span', { text: T('an.cxRate') }), el('small', { text: T('an.cxSub', { n: cx }) })])
      ]));
      var days = [], i, d, mx = 1;
      for (i = U.anRange - 1; i >= 0; i--) { d = BK.addDays(BK.TODAY, -i); var dl = L.filter(function (b) { return b.date === d; }); mx = Math.max(mx, dl.length); days.push({ d: d, l: dl }); }
      var chart = el('div', { cls: 'vbars' + (U.anRange > 14 ? ' dense' : ''), role: 'img', 'aria-label': T('an.byDay') }, days.map(function (x) {
        var seg = function (st, c) { var n = x.l.filter(function (b) { return b.status === st; }).length; return n ? el('i', { cls: 'sg sg-' + c, style: 'height:' + (n * 100 / mx) + '%' }) : null; };
        return el('div', { cls: 'vb', title: BK.fmt(x.d, 'dm') + ': ' + x.l.length }, [el('div', { cls: 'vcol' }, [seg('cancelled', 'x'), seg('noshow', 'n'), seg('done', 'd'), seg('confirmed', 'c'), seg('pending', 'p')]), el('small', { text: U.anRange > 14 ? (x.d.slice(8) === '01' || i % 7 === 0 ? x.d.slice(8) : '') : x.d.slice(8) }), el('em', { text: String(x.l.length) })]);
      }));
      box.appendChild(el('div', { cls: 'card-b' }, [el('h3', { text: T('an.byDay') }), chart, el('ul', { cls: 'legend' }, [['d', 'done'], ['c', 'confirmed'], ['p', 'pending'], ['n', 'noshow'], ['x', 'cancelled']].map(function (s) { return el('li', {}, [el('i', { cls: 'sw sg-' + s[0] }), T('st.' + s[1])]); }))]));
      box.appendChild(el('p', { cls: 'hint-s', text: T('an.note', { open: open }) }));
    } else if (U.anTab === 'ch') {
      var src = ['web', 'bot', 'ai', 'phone', 'manual'].map(function (s) { return [T('src.' + s), L.filter(function (b) { return b.src === s; }).length]; });
      var sv = D.services.map(function (s) { return [BK.svcName(s.id), L.filter(function (b) { return b.svc === s.id && b.status !== 'cancelled'; }).length, L.filter(function (b) { return b.svc === s.id && b.status === 'done'; }).length * s.price]; });
      var cols = el('div', { cls: 'cols' }, [
        el('div', { cls: 'card-b' }, [el('h3', { text: T('an.bySrc') }), hbars(src, Math.max.apply(null, src.map(function (x) { return x[1]; }).concat([1])))]),
        el('div', { cls: 'card-b' }, [el('h3', { text: T('an.bySvc') }), hbars(sv.map(function (x) { return [x[0], x[1]]; }), Math.max.apply(null, sv.map(function (x) { return x[1]; }).concat([1])))])
      ]);
      box.appendChild(cols);
      box.appendChild(el('div', { cls: 'card-b' }, [el('h3', { text: T('an.rev') }), el('p', { cls: 'lead-s', text: T('an.revP') }), BK.table([{ h: T('f.service'), f: function (x) { return x[0]; } }, { h: T('an.visits'), f: function (x) { return String(x[1]); } }, { h: T('an.revCol'), f: function (x) { return BK.cu(x[2]); } }], sv)]));
    } else {
      var util = D.staff.map(function (s) {
        var avail = 0, used = 0, k, h, iso;
        for (k = 0; k < U.anRange; k++) { iso = BK.addDays(BK.TODAY, -k); h = BK.hoursOf(s, iso); if (h) avail += (h[1] - h[0]) - (s.brk ? s.brk[1] - s.brk[0] : 0); }
        L.forEach(function (b) { if (b.staff === s.id && BK.occupying(b)) used += b.dur; });
        return [s.name, avail ? Math.min(100, Math.round(used * 100 / avail)) : 0];
      });
      box.appendChild(el('div', { cls: 'card-b' }, [el('h3', { text: T('an.util') }), el('p', { cls: 'lead-s', text: T('an.utilP') }), hbars(util, 100, '%')]));
      var heat = el('div', { cls: 'heat', role: 'img', 'aria-label': T('an.heat') }), mxh = 1, grid = {};
      L.forEach(function (b) { if (!BK.occupying(b)) return; var key = BK.dow(b.date) + '-' + Math.floor(b.time / 60); grid[key] = (grid[key] || 0) + 1; mxh = Math.max(mxh, grid[key]); });
      heat.appendChild(el('span', { cls: 'hc hh' }));
      for (var dd = 0; dd < 6; dd++) heat.appendChild(el('span', { cls: 'hc hh', text: BK.fmt(BK.addDays('2026-11-16', dd), 'wd') }));
      for (var hr = 8; hr < 19; hr++) {
        heat.appendChild(el('span', { cls: 'hc hh', text: BK.pad2(hr) + ':00' }));
        for (dd = 0; dd < 6; dd++) { var n = grid[dd + '-' + hr] || 0; heat.appendChild(el('span', { cls: 'hc lv' + (n ? Math.min(4, Math.ceil(n * 4 / mxh)) : 0), title: n ? String(n) : '', text: n ? String(n) : '' })); }
      }
      box.appendChild(el('div', { cls: 'card-b' }, [el('h3', { text: T('an.heat') }), el('p', { cls: 'lead-s', text: T('an.heatP') }), heat]));
    }
  } });

  /* ---------- settings ---------- */
  var SW = ['#ffb23e', '#4cc3a6', '#6ab0ff', '#e58bd0', '#b7c96a'];
  function field(label, obj, key, opts) {
    opts = opts || {};
    var inp = el('input', { cls: 'in', type: 'text', id: 'st-' + key, maxlength: opts.max || 60, value: obj[key] }), err = el('span', { cls: 'err', role: 'alert' });
    return el('div', { cls: 'fl' }, [el('label', { 'for': 'st-' + key, text: label }), inp, el('div', { cls: 'acts' }, [BK.btn(T('dlg.save'), function () {
      var v = inp.value.trim();
      if (v.length < 3) { err.textContent = T('v.minlen', { n: 3 }); inp.setAttribute('aria-invalid', 'true'); return; }
      obj[key] = v; BK.log('set', 'set.profile', { what: label }); BK.toast(T('toast.saved')); BK.render('#st-' + key);
    }, 'btn-ghost'), err])]);
  }
  function selSet(label, obj, key, items, logLabel) {
    var s = el('select', { cls: 'in', id: 'st-' + key, onchange: function (e) { obj[key] = +e.target.value; BK.log('set', 'set.rule', { what: logLabel, val: e.target.value }); BK.toast(T('toast.saved')); BK.render('#st-' + key); } }, items.map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    s.value = obj[key];
    return el('div', { cls: 'fl' }, [el('label', { 'for': 'st-' + key, text: label }), s]);
  }
  function sw(label, obj, key) {
    return el('button', { type: 'button', cls: 'tog' + (obj[key] ? ' on' : ''), role: 'switch', 'aria-checked': obj[key] ? 'true' : 'false', onclick: function () { obj[key] = !obj[key]; BK.log('set', 'set.sw', { what: label, on: obj[key] ? T('on') : T('off') }); BK.render('.tog'); } }, [el('i'), el('span', { text: label })]);
  }
  BK.registerMod('set', { icon: 'gear', render: function (box) {
    var U = BK.UI, D = BK.DB, S = D.settings;
    box.appendChild(BK.head(T('set.h'), T('set.sub')));
    box.appendChild(BK.tabs([['biz', T('set.tabB')], ['rules', T('set.tabR')], ['brand', T('set.tabBr')], ['roles', T('set.tabRo')]], U.setTab, function (t) { U.setTab = t; BK.render('[data-tab="' + t + '"]'); }, T('set.h')));
    if (U.setTab === 'biz') {
      box.appendChild(el('div', { cls: 'card-b' }, [el('h3', { text: T('set.profile') }), el('div', { cls: 'cl-form' }, [field(T('set.name'), S, 'name'), field(T('set.addr'), S, 'addr', { max: 80 }), field(T('set.phone'), S, 'phone', { max: 24 })]), el('p', { cls: 'hint-s', text: T('set.profileHint') })]));
      box.appendChild(el('div', { cls: 'card-b' }, [el('h3', { text: T('set.channels') }), el('div', { cls: 'cfg' }, [sw(T('set.chPage'), S, 'pub'), sw(T('set.chAi'), S, 'ai'), sw(T('set.chBot'), S, 'bot')]), el('p', { cls: 'hint-s', text: T('set.chHint') })]));
    } else if (U.setTab === 'rules') {
      box.appendChild(el('div', { cls: 'card-b' }, [el('h3', { text: T('set.slots') }), el('div', { cls: 'cl-form' }, [
        selSet(T('set.interval'), S, 'interval', [[15, '15 ' + T('min')], [30, '30 ' + T('min')], [60, '60 ' + T('min')]], T('set.interval')),
        selSet(T('set.lead'), S, 'lead', [[7, T('set.days', { n: 7 })], [14, T('set.days', { n: 14 })], [30, T('set.days', { n: 30 })]], T('set.lead'))]),
        el('div', { cls: 'cfg' }, [sw(T('set.auto'), S, 'autoConfirm')]), el('p', { cls: 'hint-s', text: T('set.rulesHint') })]));
      box.appendChild(el('div', { cls: 'card-b' }, [el('h3', { text: T('set.data') }), el('p', { cls: 'lead-s', text: T('set.dataP') }), BK.btn(T('app.reset'), function () { BK.reset(); }, 'btn-ghost')]));
    } else if (U.setTab === 'brand') {
      var swr = el('div', { cls: 'swatches', role: 'group', 'aria-label': T('set.accent') }, SW.map(function (c) {
        return el('button', { type: 'button', cls: 'swatch' + (S.accent === c ? ' on' : ''), style: 'background:' + c, 'aria-pressed': S.accent === c ? 'true' : 'false', 'aria-label': c, onclick: function () { S.accent = c; BK.log('set', 'set.brand', {}); BK.render('.swatch.on'); } });
      }));
      box.appendChild(el('div', { cls: 'card-b' }, [el('h3', { text: T('set.brand') }), el('p', { cls: 'lead-s', text: T('set.brandP') }), el('p', { cls: 'sub-h', text: T('set.accent') }), swr,
        el('p', { cls: 'sub-h', text: T('set.style') }), BK.tabs([['precision', T('set.stylePrec')], ['soft', T('set.styleSoft')]], S.style, function (v) { S.style = v; BK.log('set', 'set.brand', {}); BK.render('[data-tab="' + v + '"]'); }, T('set.style')),
        BK.btn(T('set.seePage'), function () { BK.go('page'); }, 'btn-ghost')]));
    } else {
      var mods = ['home', 'cal', 'list', 'cli', 'page', 'ai', 'bot', 'rem', 'kb', 'svc', 'team', 'an', 'set', 'audit'];
      var cell = function (m, r) { var a = BK.ACCESS[m]; var ok = a === 1 || a.indexOf(r) >= 0; if (!ok) return icon('lock'); return el('span', { cls: 'okc', text: r === 'spec' && (m === 'cal' || m === 'list' || m === 'home') ? T('set.own') : (r !== 'owner' && (m === 'svc' || m === 'team') ? T('set.view') : '✓') }); };
      box.appendChild(el('div', { cls: 'card-b' }, [el('h3', { text: T('set.roles') }), el('p', { cls: 'lead-s', text: T('set.rolesP') }),
        BK.table([{ h: T('set.module'), f: function (m) { return T('m.' + m); } }].concat(BK.ROLES.map(function (r) { return { h: T('role.' + r), cls: 'ctr', f: function (m) { return cell(m, r); } }; })), mods, { cls: 'matrix' })]));
    }
  } });

  /* ---------- audit log ---------- */
  BK.registerMod('audit', { icon: 'log', render: function (box) {
    var U = BK.UI, D = BK.DB, f = U.auF, q = f.q.trim().toLowerCase();
    box.appendChild(BK.head(T('au.h'), T('au.sub')));
    var sel = el('select', { cls: 'in', 'aria-label': T('set.module'), onchange: function (e) { f.mod = e.target.value; U.auShow = 40; BK.render(); } }, [el('option', { value: 'all', text: T('au.all') })].concat(['list', 'cli', 'team', 'svc', 'kb', 'ai', 'bot', 'rem', 'set'].map(function (m) { return el('option', { value: m, text: T('m.' + m) }); })));
    sel.value = f.mod;
    var inp = el('input', { cls: 'in', type: 'search', placeholder: T('au.search'), 'aria-label': T('au.search'), value: f.q, oninput: function (e) { f.q = e.target.value; var p = e.target.selectionStart; BK.render('.search input'); var n = BK.root.querySelector('.search input'); if (n) n.setSelectionRange(p, p); } });
    box.appendChild(el('div', { cls: 'filters' }, [el('label', { cls: 'search' }, [icon('search'), inp]), sel]));
    var rows = D.audit.filter(function (a) { return (f.mod === 'all' || a.mod === f.mod) && (!q || (BK.auditText(a) + ' ' + BK.who(a.role)).toLowerCase().indexOf(q) >= 0); });
    box.appendChild(BK.table([
      { h: T('au.time'), f: function (a) { return a.t; } },
      { h: T('au.who'), f: function (a) { return BK.badge(a.role === 'client' || a.role === 'system' ? 'info' : '', BK.who(a.role)); } },
      { h: T('set.module'), f: function (a) { return T('m.' + a.mod); } },
      { h: T('au.event'), f: function (a) { return a.ref && BK.booking(a.ref) ? el('button', { type: 'button', cls: 'lnk', text: BK.auditText(a), onclick: function () { BK.bookingCard(a.ref); } }) : BK.auditText(a); } }
    ], rows.slice(0, U.auShow), { empty: T('au.empty') }));
    var foot = el('div', { cls: 'acts' }, [el('span', { cls: 'count', text: T('au.count', { n: Math.min(rows.length, U.auShow), total: rows.length }) })]);
    if (rows.length > U.auShow) foot.appendChild(BK.btn(T('list.more'), function () { U.auShow += 40; BK.render(); }, 'btn-ghost'));
    box.appendChild(foot); box.appendChild(el('p', { cls: 'hint-s', text: T('au.hint') }));
  } });
}(window));
