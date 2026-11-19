/* Route Match demo modules, part 1: leads, messages, routes, cities. */
(function (w) {
  'use strict';
  var RM = w.RM, t = function (k, v) { return w.MFI18N.t(k, v); }, e = RM.esc;
  var U = RM.U;
  U.leads = { tab: 'new', q: '', sel: null, detail: false };
  U.msg = { g: 'all', st: 'all', q: '', sel: null, detail: false };
  U.rt = { tab: 'routes', sel: 'r1', detail: false, adding: false, form: { kind: 'route', from: 'riverton', to: 'oakdale', mode: 'zones', zo: ['riverton'], zd: ['milford'], stops: ['oakdale', '', '', ''], time: '10:00', days: 'daily', pax: true, parcel: true, cap: '' } };
  U.ct = { sel: 'riverton', q: '', test: '' };

  /* ---------- shared UI pieces ---------- */
  var UI = RM.ui = {};
  UI.ICON = {
    leads: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
    messages: 'M4 6h16M4 12h16M4 18h10',
    routes: 'M6 19a2.5 2.5 0 1 0 0-.01M18 5a2.5 2.5 0 1 0 0-.01M8.5 18H14a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h5.5',
    cities: 'M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 10m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
    rules: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M8 14v6',
    templates: 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h5',
    groups: 'M9 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5M17 11a2.5 2.5 0 1 0 0-5M21 19c0-2.5-1.5-4-3.5-4.6',
    analytics: 'M5 20V10M12 20V4M19 20v-7',
    journal: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
    export: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    settings: 'M12 15a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z'
  };
  UI.svg = function (name, sz) {
    sz = sz || 18;
    return '<svg viewBox="0 0 24 24" width="' + sz + '" height="' + sz + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (UI.ICON[name] || name) + '"/></svg>';
  };
  UI.badge = function (txt, cls) { return '<span class="pf-badge ' + (cls || 'info') + '">' + e(txt) + '</span>'; };
  UI.meter = function (lv) {
    var l = t('lv.' + lv);
    return '<span class="rm-meter lv-' + lv + '" role="img" aria-label="' + e(t('lv.label', { lv: l })) + '"><i></i><i></i><i></i><b>' + e(l) + '</b></span>';
  };
  UI.sw = function (on, label, act, id, extra) {
    return '<button type="button" class="sw" role="switch" aria-checked="' + !!on + '" data-act="' + act + '"' + (id !== undefined ? ' data-id="' + e(id) + '"' : '') + (extra || '') + ' aria-label="' + e(label) + '"><i></i></button>';
  };
  UI.head = function (title, sub, right) {
    return '<div class="mh"><div><h3>' + e(title) + '</h3>' + (sub ? '<p>' + e(sub) + '</p>' : '') + '</div>' + (right || '') + '</div>';
  };
  UI.chips = function (act, cur, list, labelFn, extra) {
    return '<div class="rm-chips" role="group">' + list.map(function (x) {
      return '<button type="button" data-act="' + act + '" data-id="' + e(x.id) + '"' + (extra || '') + ' aria-pressed="' + (cur === x.id) + '">' + e(labelFn(x)) + (x.n !== undefined ? ' <small>' + x.n + '</small>' : '') + '</button>';
    }).join('') + '</div>';
  };
  UI.empty = function (h, p) { return '<div class="rm-ph"><h4>' + e(h) + '</h4>' + (p ? '<p>' + e(p) + '</p>' : '') + '</div>'; };
  UI.card = function (h, body, cls) { return '<section class="card' + (cls ? ' ' + cls : '') + '">' + (h ? '<h4>' + e(h) + '</h4>' : '') + body + '</section>'; };
  UI.opts = function (list, cur, lab) { return list.map(function (x) { return '<option value="' + e(x) + '"' + (x === cur ? ' selected' : '') + '>' + e(lab(x)) + '</option>'; }).join(''); };
  UI.cityOpts = function (cur, blank) {
    var ids = Object.keys(RM.S.cities);
    return (blank ? '<option value="">' + e(t('f.unknown')) + '</option>' : '') + ids.map(function (id) { return '<option value="' + id + '"' + (id === cur ? ' selected' : '') + '>' + e(RM.cityName(id)) + '</option>'; }).join('');
  };
  UI.dayOpts = function (cur) { return [1, 2, 3, 4, 5, 6, 7].map(function (d) { return '<option value="' + d + '"' + (d === cur ? ' selected' : '') + '>' + e(t('wd.' + d)) + '</option>'; }).join(''); };
  UI.daysetOpts = function (cur) { return Object.keys(RM.DAYSETS).map(function (k) { return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + e(t('days.' + k)) + '</option>'; }).join(''); };
  UI.back = function (act) { return '<button type="button" class="rm-mini rm-back" data-act="' + act + '">← ' + e(t('btn.back')) + '</button>'; };
  RM.qty = function (l) { return l.edited ? t('qty.' + l.type, { n: l.n }) : t('q.' + l.mid); };
  RM.lvOf = function (l) { var b = RM.best(l); return b ? b.lv : null; };
  RM.statusBadge = function (s) { return UI.badge(t('stt.' + s), s === 'confirmed' ? 'ok' : (s === 'rejected' ? 'bad' : (s === 'corrected' ? 'warn' : 'info'))); };

  /* ================= LEADS ================= */
  var TABS = ['new', 'high', 'review', 'unrec', 'confirmed', 'corrected', 'rejected', 'all'];
  function inTab(l, tab) {
    if (tab === 'all') return true;
    if (tab === 'confirmed' || tab === 'corrected' || tab === 'rejected') return l.status === tab;
    if (l.status !== 'new') return false;
    if (tab === 'new') return true;
    return RM.klass(l) === tab;
  }
  function leadText(l) {
    var m = RM.META[l.mid];
    return [l.who, l.phone, l.from ? RM.cityName(l.from) : '', l.to ? RM.cityName(l.to) : '', l.rawF, l.rawT, RM.plain(t('m.' + l.mid)), l.id].join(' ').toLowerCase();
  }
  function isStale(l) { return l.status === 'new' && RM.S.clock - l.min > RM.S.cfg.sla; }
  RM.leadTitle = function (l) {
    return (l.from ? RM.cityName(l.from) : (l.rawF || '?')) + ' → ' + (l.to ? RM.cityName(l.to) : (l.rawT || '?'));
  };
  function leadList() {
    var q = U.leads.q.toLowerCase(), h = '', n = 0;
    RM.S.leads.forEach(function (l) {
      if (!inTab(l, U.leads.tab)) return;
      if (q && leadText(l).indexOf(q) < 0) return;
      n++;
      var lv = RM.lvOf(l), k = RM.klass(l), m = RM.META[l.mid];
      h += '<li><button type="button" class="it' + (U.leads.sel === l.id ? ' is-sel' : '') + '" data-act="lead.open" data-id="' + l.id + '">' +
        '<span class="it-top"><strong>' + e(RM.leadTitle(l)) + '</strong><span class="it-id">' + l.id + '</span></span>' +
        '<span class="it-sub">' + e(t('wd.' + l.day)) + (l.rel !== 'none' ? ', ' + e(t('rel.' + l.rel)) : '') + ' / ' + e(RM.qty(l)) + ' / ' + e(l.who) + '</span>' +
        '<span class="it-foot">' + (k === 'unrec' ? UI.badge(t('tab.unrec'), 'bad') : UI.meter(lv)) + RM.statusBadge(l.status) +
        (l.dup ? UI.badge(t('badge.dup'), 'warn') : '') + (isStale(l) ? UI.badge(t('badge.stale'), 'bad') : '') + '</span></button></li>';
    });
    return n ? h : '<li class="rm-empty">' + e(t('leads.empty')) + '</li>';
  }
  RM.leadListHtml = leadList;
  function leadsView() {
    var S = RM.S;
    var tabs = TABS.map(function (k) { var c = 0; S.leads.forEach(function (l) { if (inTab(l, k)) c++; }); return { id: k, n: c }; });
    var l = RM.leadById(U.leads.sel);
    return '<div class="md' + (U.leads.detail && l ? ' is-detail' : '') + '"><div class="md-list">' +
      UI.head(t('mod.leads'), t('leads.sub')) +
      '<div class="tools"><input type="search" class="inp" data-in="lead.q" value="' + e(U.leads.q) + '" placeholder="' + e(t('leads.search')) + '" aria-label="' + e(t('leads.search')) + '"></div>' +
      '<div class="tabs-sc">' + UI.chips('lead.tab', U.leads.tab, tabs, function (x) { return t('tab.' + x.id); }) + '</div>' +
      '<ul class="lst" id="lead-list">' + leadList() + '</ul></div><div class="md-det">' + (l ? leadDetail(l) : UI.empty(t('leads.none.h'), t('leads.none.p'))) + '</div></div>';
  }
  function leadDetail(l) {
    var S = RM.S, m = RM.META[l.mid], txt = t('m.' + l.mid), c = RM.cands(l), chosen = null, i;
    if (l.route) for (i = 0; i < c.length; i++) if (c[i].route.id === l.route) chosen = c[i];
    if (!chosen && c.length) chosen = c[0];
    var it = null; S.items.forEach(function (x) { if (x.uid === l.uid) it = x; });
    var h = '<div class="det-in">' + UI.back('lead.back') + '<div class="det-title"><h3>' + e(RM.leadTitle(l)) + '</h3>' + RM.statusBadge(l.status) + '</div>';
    if (l.dup) h += '<div class="note warn"><span>' + e(t('dup.note', { id: l.dup })) + '</span><span class="note-act"><button type="button" class="btn btn-ghost btn-sm" data-act="lead.merge" data-id="' + l.id + '">' + e(t('dup.merge')) + '</button><button type="button" class="btn btn-ghost btn-sm" data-act="lead.notdup" data-id="' + l.id + '">' + e(t('dup.keep')) + '</button></span></div>';
    if (isStale(l)) h += '<div class="note bad"><span>' + e(t('stale.note', { n: S.cfg.sla })) + '</span></div>';
    h += UI.card(t('req.source'), '<p class="meta">' + e(t('grp.' + m.g)) + ', ' + e(l.who) + ', ' + RM.clockText(l.min) + ' ' + UI.badge(t('src.' + l.src), l.src === 'llm' ? 'ok' : 'warn') + '</p><blockquote class="rm-quote">' + RM.marked(txt, true) + '</blockquote><p class="hint">' + e(t('src.' + l.src + '.n')) + '</p>');
    var hint = function (how, raw) { return how === 'fuzzy' ? '<small class="fix">' + e(t('f.fuzzy', { raw: raw })) + '</small>' : (how === 'alias' ? '<small class="fix">' + e(t('f.alias', { raw: raw })) + '</small>' : ''); };
    h += UI.card(t('req.fields'), '<form class="fgrid" data-form="lead.save" data-id="' + l.id + '">' +
      '<label>' + e(t('f.type')) + '<select name="type"><option value="passenger"' + (l.type === 'passenger' ? ' selected' : '') + '>' + e(t('ty.passenger')) + '</option><option value="parcel"' + (l.type === 'parcel' ? ' selected' : '') + '>' + e(t('ty.parcel')) + '</option></select></label>' +
      '<label>' + e(t('f.from')) + '<select name="from">' + UI.cityOpts(l.from, true) + '</select>' + hint(l.hf, l.rawF) + '</label>' +
      '<label>' + e(t('f.to')) + '<select name="to">' + UI.cityOpts(l.to, true) + '</select>' + hint(l.ht, l.rawT) + '</label>' +
      '<label>' + e(t('f.date')) + '<select name="day">' + UI.dayOpts(l.day) + '</select></label>' +
      '<label>' + e(t('f.qty')) + '<input type="number" name="n" min="1" max="30" value="' + l.n + '"></label>' +
      '<label>' + e(t('f.contact')) + '<input type="text" name="phone" value="' + e(l.phone) + '" maxlength="24"></label>' +
      '<label class="wide">' + e(t('f.notes')) + '<textarea name="notes" rows="2" maxlength="300" placeholder="' + e(t('f.notes.ph')) + '">' + e(l.notes) + '</textarea></label>' +
      '<div class="wide"><button type="submit" class="btn btn-sm">' + e(t('btn.save')) + '</button> <span class="msg" id="lead-msg" role="status"></span></div></form>');
    /* matching */
    var mh = '';
    if (!l.from || !l.to) mh = '<p class="hint">' + e(t('mt.unrec')) + '</p>';
    else if (!c.length) mh = '<p class="hint">' + e(t('mt.none.p')) + '</p>';
    else {
      mh = '<ul class="cands">' + c.map(function (x) {
        var on = chosen && x.route.id === chosen.route.id;
        return '<li><button type="button" class="cand lv-' + x.lv + (on ? ' is-sel' : '') + '" role="radio" aria-checked="' + !!on + '" data-act="lead.cand" data-id="' + l.id + '" data-r="' + x.route.id + '">' +
          '<span class="it-top"><strong>' + e(RM.routeName(x.route)) + '</strong><span class="tm">' + x.route.time + '</span></span>' +
          '<span class="it-sub">' + e(t('days.' + x.route.days)) + ' / ' + e(t('tier.' + x.tier)) + ' / ' + e(t('score.lbl')) + ' ' + x.s + '</span>' + UI.meter(x.lv) +
          '<span class="why">' + x.why.map(function (z) { return '<span class="why-' + z.c + '">' + e(RM.whyText(z)) + '</span>'; }).join('') + '</span></button></li>';
      }).join('') + '</ul>';
    }
    if ((!c.length || RM.klass(l) === 'unrec') && l.from && l.to) mh += '<button type="button" class="btn btn-ghost btn-sm" data-act="lead.addroute" data-id="' + l.id + '">' + e(t('btn.addroute')) + '</button>';
    h += UI.card(t('mt.h'), mh);
    /* reply */
    var tp = RM.tplFor(l, chosen), opts = RM.S.tpl.map(function (x) { return '<option value="' + x.id + '"' + (x.id === (l.tplId || tp.id) ? ' selected' : '') + '>' + e(RM.tplName(x)) + '</option>'; }).join('');
    var cur = RM.S.tpl.filter(function (x) { return x.id === (l.tplId || tp.id); })[0] || tp;
    h += UI.card(t('reply.h'), '<label class="inl">' + e(t('tpl.use')) + '<select data-in="lead.tpl" data-id="' + l.id + '">' + opts + '</select></label><div class="rm-reply">' + e(RM.render(cur, l, chosen)) + '</div>' +
      '<div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="lead.copy" data-id="' + l.id + '">' + e(U.copied === l.id ? t('btn.copied') : t('btn.copy')) + '</button>' +
      (l.sent ? UI.badge(t('reply.sent'), 'ok') : '<button type="button" class="btn btn-ghost btn-sm" data-act="lead.sent" data-id="' + l.id + '">' + e(t('reply.mark')) + '</button>') + '</div>');
    /* status actions */
    var a = '<div class="acts sticky-acts">';
    if (l.status === 'new' || l.status === 'corrected') a += '<button type="button" class="btn btn-sm" data-act="lead.status" data-id="' + l.id + '" data-s="confirmed"' + (chosen ? '' : ' disabled') + '>' + e(t('btn.confirm')) + '</button><button type="button" class="btn btn-ghost btn-sm" data-act="lead.status" data-id="' + l.id + '" data-s="rejected">' + e(t('btn.reject')) + '</button>';
    if (l.status !== 'new') a += '<button type="button" class="btn btn-ghost btn-sm" data-act="lead.status" data-id="' + l.id + '" data-s="new">' + e(t('btn.undo')) + '</button>';
    if (l.status === 'confirmed' && l.route) a += '<span class="hint">' + e(t('assigned', { route: RM.routeName(RM.S.routes.filter(function (r) { return r.id === l.route; })[0] || RM.S.routes[0]) })) + '</span>';
    h += a + '</div></div>';
    return h;
  }
  RM.whyText = function (z) {
    var o = {};
    if (z.km) return t(z.k) + ', ' + z.km + ' ' + t('unit.km');
    if (z.day) o.wd = t('wd.' + z.day);
    return t(z.k, o);
  };
  function setStatus(l, s) {
    var S = RM.S, old = l.status, c = RM.cands(l), ch = null, i;
    if (s === 'confirmed') {
      if (l.route) for (i = 0; i < c.length; i++) if (c[i].route.id === l.route) ch = c[i];
      ch = ch || c[0]; if (!ch) return;
      l.route = ch.route.id; if (ch.route.cap) ch.route.occ += l.n;
    }
    if ((old === 'confirmed') && l.route) {
      var rr = S.routes.filter(function (r) { return r.id === l.route; })[0];
      if (rr && rr.cap && s !== 'confirmed') rr.occ = Math.max(0, rr.occ - l.n);
      if (s !== 'confirmed') l.route = null;
    }
    l.status = s;
    RM.log('status', 'lg.status', { id: l.id, s: t('stt.' + s) });
  }
  RM.acts['lead.open'] = function (el) { U.leads.sel = el.getAttribute('data-id'); U.leads.detail = true; };
  RM.acts['lead.back'] = function () { U.leads.detail = false; };
  RM.acts['lead.tab'] = function (el) { U.leads.tab = el.getAttribute('data-id'); U.leads.detail = false; };
  RM.acts['lead.cand'] = function (el) { var l = RM.leadById(el.getAttribute('data-id')); if (l) l.route = el.getAttribute('data-r'); };
  RM.acts['lead.status'] = function (el) { var l = RM.leadById(el.getAttribute('data-id')); if (l) setStatus(l, el.getAttribute('data-s')); };
  RM.acts['lead.merge'] = function (el) { var l = RM.leadById(el.getAttribute('data-id')); if (l) { setStatus(l, 'rejected'); RM.log('status', 'lg.merge', { id: l.id, of: l.dup }); } };
  RM.acts['lead.notdup'] = function (el) { var l = RM.leadById(el.getAttribute('data-id')); if (l) { l.dup = null; RM.log('status', 'lg.notdup', { id: l.id }); } };
  RM.acts['lead.sent'] = function (el) { var l = RM.leadById(el.getAttribute('data-id')); if (l) { l.sent = true; RM.log('status', 'lg.reply', { id: l.id }); } };
  RM.acts['lead.copy'] = function (el) {
    var l = RM.leadById(el.getAttribute('data-id')); if (!l) return;
    var c = RM.cands(l), ch = c[0], i; if (l.route) for (i = 0; i < c.length; i++) if (c[i].route.id === l.route) ch = c[i];
    var tp = RM.S.tpl.filter(function (x) { return x.id === (l.tplId || RM.tplFor(l, ch).id); })[0];
    try { if (w.navigator.clipboard) w.navigator.clipboard.writeText(RM.render(tp, l, ch)); } catch (er) { /* ignore */ }
    U.copied = l.id;
  };
  RM.acts['lead.addroute'] = function (el) {
    var l = RM.leadById(el.getAttribute('data-id')); if (!l) return;
    var S = RM.S, r = { id: 'r' + (S.nextRoute++), kind: 'route', zones: [[l.from], [l.to]], mode: 'zones', radius: 25, cap: 0, occ: 0, time: '10:00', days: 'daily', types: ['passenger', 'parcel'], on: true, geo: 'stale', fresh: true };
    S.routes.push(r); RM.log('route', 'lg.route.add', { name: RM.routeName(r), via: t('lg.via.lead') });
    U.rt.sel = r.id; U.toast = t('toast.routeadded');
  };
  RM.ins['lead.q'] = function (el) { U.leads.q = el.value; var ul = w.document.getElementById('lead-list'); if (ul) ul.innerHTML = leadList(); return true; };
  RM.ins['lead.tpl'] = function (el) { var l = RM.leadById(el.getAttribute('data-id')); if (l) l.tplId = el.value; };
  RM.forms['lead.save'] = function (f) {
    var l = RM.leadById(f.getAttribute('data-id')); if (!l) return;
    var n = parseInt(f.n.value, 10);
    if (!(n >= 1 && n <= 30)) { w.document.getElementById('lead-msg').textContent = t('err.qty'); return true; }
    l.type = f.type.value; l.from = f.from.value || null; l.to = f.to.value || null; l.day = +f.day.value; l.n = n; l.phone = f.phone.value; l.notes = f.notes.value;
    l.edited = true; l.fz = 0; l.hf = l.hf === 'fuzzy' ? 'alias' : l.hf; l.ht = l.ht === 'fuzzy' ? 'alias' : l.ht;
    if (l.status === 'new') l.status = 'corrected';
    RM.log('status', 'lg.corrected', { id: l.id });
    RM.log('parse', 'lg.rematch', { id: l.id });
    U.toast = t('toast.saved');
  };

  /* ================= MESSAGES ================= */
  var MST = ['all', 'lead', 'noise', 'ignored', 'excluded'];
  function msgList() {
    var q = U.msg.q.toLowerCase(), h = '', n = 0;
    RM.S.items.forEach(function (it) {
      var m = RM.META[it.mid], txt = RM.plain(t('m.' + it.mid));
      if (U.msg.g !== 'all' && m.g !== U.msg.g) return;
      if (U.msg.st !== 'all' && it.state !== U.msg.st) return;
      if (q && (txt + ' ' + m.who).toLowerCase().indexOf(q) < 0) return;
      n++;
      var b = it.state === 'lead' ? UI.badge(t('ms.lead'), 'ok') : (it.state === 'noise' ? UI.badge(t('ms.noise'), 'info') : (it.state === 'ignored' ? UI.badge(t('ms.ignored'), 'warn') : UI.badge(t('ms.excluded'), 'warn')));
      h += '<li><button type="button" class="it' + (U.msg.sel === it.uid ? ' is-sel' : '') + '" data-act="msg.open" data-id="' + it.uid + '"><span class="it-top"><span class="grp">' + e(t('grp.' + m.g)) + '</span><span class="it-id">' + it.time + '</span></span><span class="it-who">' + e(m.who) + '</span><span class="it-sub">' + e(txt) + '</span><span class="it-foot">' + b + (it.unread ? UI.badge(t('feed.new'), 'warn') : '') + '</span></button></li>';
    });
    return n ? h : '<li class="rm-empty">' + e(t('feed.empty')) + '</li>';
  }
  RM.msgListHtml = msgList;
  function msgsView() {
    var S = RM.S, grp = [{ id: 'all' }].concat(S.groups.map(function (g) { return { id: g.id }; }));
    var it = null; S.items.forEach(function (x) { if (x.uid === U.msg.sel) it = x; });
    return '<div class="md' + (U.msg.detail && it ? ' is-detail' : '') + '"><div class="md-list">' +
      UI.head(t('mod.messages'), t('msg.sub'), '<span class="rm-live' + (S.paused ? ' is-off' : '') + '"><i aria-hidden="true"></i>' + e(S.paused ? t('feed.paused') : t('feed.live')) + '</span>') +
      '<div class="tools"><input type="search" class="inp" data-in="msg.q" value="' + e(U.msg.q) + '" placeholder="' + e(t('msg.search')) + '" aria-label="' + e(t('msg.search')) + '"></div>' +
      '<div class="tabs-sc">' + UI.chips('msg.g', U.msg.g, grp, function (x) { return x.id === 'all' ? t('feed.all') : t('grp.' + x.id); }) + '</div>' +
      '<div class="tabs-sc">' + UI.chips('msg.st', U.msg.st, MST.map(function (x) { return { id: x }; }), function (x) { return x.id === 'all' ? t('feed.all') : t('ms.' + x.id); }) + '</div>' +
      '<ul class="lst" id="msg-list">' + msgList() + '</ul></div><div class="md-det">' + (it ? msgDetail(it) : UI.empty(t('req.empty.h'), t('req.empty.p'))) + '</div></div>';
  }
  function step(ok, title, body) {
    return '<li class="st st-' + ok + '"><span class="st-dot" aria-hidden="true"></span><div><strong>' + e(title) + '</strong><p>' + e(body) + '</p></div></li>';
  }
  function msgDetail(it) {
    var S = RM.S, m = RM.META[it.mid], txt = t('m.' + it.mid), l = it.lead ? RM.leadById(it.lead) : null, g = S.groups.filter(function (x) { return x.id === m.g; })[0];
    var h = '<div class="det-in">' + UI.back('msg.back') + '<div class="det-title"><h3>' + e(m.who) + '</h3>' + UI.badge(t('ms.' + it.state), it.state === 'lead' ? 'ok' : 'info') + '</div>';
    h += UI.card(t('req.source'), '<p class="meta">' + e(t('grp.' + m.g)) + ', ' + it.time + '</p><blockquote class="rm-quote">' + RM.marked(txt, m.kind === 'req' && it.state === 'lead') + '</blockquote>');
    var st = '';
    st += step(g && g.on ? 'ok' : 'bad', t('pipe.group'), g && g.on ? t('pipe.group.on') : t('pipe.group.off'));
    if (it.state === 'ignored') st += step('skip', t('pipe.stop'), t('pipe.ignored'));
    else {
      st += step(it.state === 'excluded' ? 'bad' : 'ok', t('pipe.excl'), it.state === 'excluded' ? t('pipe.excl.hit', { kw: it.reason }) : t('pipe.excl.ok'));
      if (it.state !== 'excluded') {
        st += step(it.reason === 'prefilter' ? 'bad' : 'ok', t('pipe.pre'), S.cfg.prefilter ? (it.reason === 'prefilter' ? t('pipe.pre.drop') : t('pipe.pre.pass')) : t('pipe.pre.off'));
        if (it.state === 'noise') st += step('skip', t('pipe.llm'), t('noise.' + m.why));
        else if (l) {
          st += step(l.src === 'failed' ? 'bad' : 'ok', t('pipe.llm'), t('src.' + l.src + '.n'));
          st += step(l.from && l.to ? (l.hf === 'fuzzy' || l.ht === 'fuzzy' ? 'warn' : 'ok') : 'bad', t('pipe.norm'), l.from && l.to ? RM.cityName(l.from) + ' → ' + RM.cityName(l.to) : t('pipe.norm.fail'));
          var b = RM.best(l);
          st += step(b ? (b.lv === 'high' ? 'ok' : 'warn') : 'bad', t('pipe.match'), b ? RM.routeName(b.route) + ' / ' + t('lv.' + b.lv) : t('mt.none.h'));
          st += step(l.dup ? 'warn' : 'ok', t('pipe.dedup'), l.dup ? t('dup.note', { id: l.dup }) : t('pipe.dedup.ok'));
        }
      }
    }
    h += UI.card(t('pipe.h'), '<ol class="steps">' + st + '</ol>');
    h += '<div class="acts">';
    if (l) h += '<button type="button" class="btn btn-sm" data-act="msg.lead" data-id="' + l.id + '">' + e(t('btn.openlead')) + '</button>';
    if (it.state === 'ignored' && g) h += '<button type="button" class="btn btn-sm" data-act="msg.enable" data-id="' + g.id + '">' + e(t('btn.enableproc')) + '</button>';
    return h + '</div></div>';
  }
  RM.acts['msg.open'] = function (el) { var id = +el.getAttribute('data-id'); U.msg.sel = id; U.msg.detail = true; RM.S.items.forEach(function (x) { if (x.uid === id) x.unread = false; }); };
  RM.acts['msg.back'] = function () { U.msg.detail = false; };
  RM.acts['msg.g'] = function (el) { U.msg.g = el.getAttribute('data-id'); };
  RM.acts['msg.st'] = function (el) { U.msg.st = el.getAttribute('data-id'); };
  RM.acts['msg.lead'] = function (el) { U.leads.sel = el.getAttribute('data-id'); U.leads.detail = true; U.leads.tab = 'all'; RM.go('leads'); };
  RM.acts['msg.enable'] = function (el) { RM.toggleGroup(el.getAttribute('data-id'), true); };
  RM.ins['msg.q'] = function (el) { U.msg.q = el.value; var ul = w.document.getElementById('msg-list'); if (ul) ul.innerHTML = msgList(); return true; };
  RM.toggleGroup = function (id, on) {
    var S = RM.S, g = S.groups.filter(function (x) { return x.id === id; })[0]; if (!g) return;
    g.on = on === undefined ? !g.on : on; g.auto = false;
    RM.log('system', g.on ? 'lg.group.on' : 'lg.group.off', { name: t('grp.' + id) });
    if (g.on) S.items.slice().reverse().forEach(function (it) { if (it.state === 'ignored' && RM.META[it.mid].g === id) RM.process(it); });
  };

  /* ================= ROUTES ================= */
  function routeCard(r) {
    var n = 0; RM.S.leads.forEach(function (l) { var b = RM.best(l); if (b && b.route.id === r.id) n++; });
    return '<li><button type="button" class="it' + (U.rt.sel === r.id ? ' is-sel' : '') + (r.on ? '' : ' is-off') + '" data-act="rt.open" data-id="' + r.id + '"><span class="it-top"><strong>' + e(RM.routeName(r)) + '</strong><span class="tm">' + r.time + '</span></span><span class="it-sub">' + e(RM.routePath(r)) + '</span><span class="it-sub">' + e(t('days.' + r.days)) + ' / ' + r.types.map(function (x) { return e(t('ty.' + x)); }).join(', ') + '</span><span class="it-foot">' +
      (r.on ? UI.badge(t('rt.on'), 'ok') : UI.badge(t('rt.off'), 'info')) + (r.cap ? UI.badge(t('rt.seats', { occ: r.occ, cap: r.cap }), r.occ >= r.cap ? 'bad' : 'info') : '') + (r.geo === 'stale' ? UI.badge(t('geo.stale'), 'warn') : '') + (r.fresh ? UI.badge(t('rt.new'), 'warn') : '') + '<span class="it-id">' + e(t('rt.leads', { n: n })) + '</span></span></button></li>';
  }
  function suggestions() {
    var map = {};
    RM.S.leads.forEach(function (l) {
      if (!l.from || !l.to || l.status === 'rejected' || l.from === l.to) return;
      if (RM.best(l)) return;
      var k = l.from + '>' + l.to; map[k] = map[k] || { from: l.from, to: l.to, n: 0, type: l.type }; map[k].n++;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }
  function routesView() {
    var S = RM.S, rt = U.rt, sg = suggestions();
    var tabs = [{ id: 'routes', n: S.routes.filter(function (r) { return r.kind === 'route'; }).length }, { id: 'circuits', n: S.routes.filter(function (r) { return r.kind === 'group'; }).length }, { id: 'suggest', n: sg.length }];
    var list = '';
    if (rt.tab === 'suggest') {
      list = sg.length ? sg.map(function (s) {
        return '<li><div class="it sg"><span class="it-top"><strong>' + e(RM.cityName(s.from) + ' → ' + RM.cityName(s.to)) + '</strong></span><span class="it-sub">' + e(t('sg.n', { n: s.n })) + '</span><span class="it-foot"><button type="button" class="btn btn-sm" data-act="rt.suggest" data-from="' + s.from + '" data-to="' + s.to + '">' + e(t('btn.createroute')) + '</button></span></div></li>';
      }).join('') : '<li class="rm-empty">' + e(t('sg.empty')) + '</li>';
    } else {
      list = S.routes.filter(function (r) { return (rt.tab === 'routes') === (r.kind === 'route'); }).map(routeCard).join('');
    }
    var sel = S.routes.filter(function (r) { return r.id === rt.sel; })[0];
    var det = rt.adding ? routeForm() : (sel && rt.tab !== 'suggest' ? routeDetail(sel) : UI.empty(t('rt.pick.h'), t('rt.pick.p')));
    return '<div class="md' + (rt.detail ? ' is-detail' : '') + '"><div class="md-list">' +
      UI.head(t('mod.routes'), t('rt.sub'), '<button type="button" class="btn btn-sm" data-act="rt.add">' + e(t('rt.add')) + '</button>') +
      '<div class="tabs-sc">' + UI.chips('rt.tab', rt.tab, tabs, function (x) { return t('rtab.' + x.id); }) + '</div>' +
      '<ul class="lst">' + list + '</ul></div><div class="md-det">' + det + '</div></div>';
  }
  function routeDetail(r) {
    var S = RM.S, leads = S.leads.filter(function (l) { var b = RM.best(l); return b && b.route.id === r.id; });
    var h = '<div class="det-in">' + UI.back('rt.back') + '<div class="det-title"><h3>' + e(RM.routeName(r)) + '</h3>' + UI.sw(r.on, t('rt.toggle', { route: RM.routeName(r) }), 'rt.toggle', r.id) + '</div>';
    h += UI.card(t('rt.path'), '<p class="path">' + e(RM.routePath(r)) + '</p><p class="hint">' + e(t(r.kind === 'route' ? 'rt.kind.route' : (r.mode === 'linear' ? 'rt.kind.linear' : 'rt.kind.zones'))) + '</p>');
    h += UI.card(t('rt.sched'), '<form class="fgrid" data-form="rt.save" data-id="' + r.id + '">' +
      '<label>' + e(t('rt.time')) + '<input type="time" name="time" value="' + r.time + '"></label>' +
      '<label>' + e(t('rt.days')) + '<select name="days">' + UI.daysetOpts(r.days) + '</select></label>' +
      '<label>' + e(t('rt.cap')) + '<input type="number" name="cap" min="0" max="60" value="' + r.cap + '"></label>' +
      '<label>' + e(t('rt.occ')) + '<input type="number" name="occ" min="0" max="60" value="' + r.occ + '"></label>' +
      (r.kind === 'group' ? '<label>' + e(t('rt.radius')) + '<input type="number" name="radius" min="5" max="150" value="' + r.radius + '"></label>' : '') +
      '<div class="rt-checks wide"><label class="chk"><input type="checkbox" name="pax"' + (r.types.indexOf('passenger') >= 0 ? ' checked' : '') + '><span>' + e(t('ty.passenger')) + '</span></label><label class="chk"><input type="checkbox" name="parcel"' + (r.types.indexOf('parcel') >= 0 ? ' checked' : '') + '><span>' + e(t('ty.parcel')) + '</span></label></div>' +
      '<div class="wide"><button type="submit" class="btn btn-sm">' + e(t('btn.save')) + '</button> <span class="msg" id="rt-msg" role="status"></span></div></form>');
    h += UI.card(t('geo.h'), '<p class="hint">' + e(t(r.geo === 'ok' ? 'geo.ok' : 'geo.stale.p')) + '</p><div class="acts"><button type="button" class="btn btn-ghost btn-sm" data-act="rt.geo" data-id="' + r.id + '">' + e(t('geo.rebuild')) + '</button>' + (S.cfg.corridor ? UI.badge(t('geo.corridor.on'), 'ok') : UI.badge(t('geo.corridor.off'), 'info')) + '</div>');
    h += UI.card(t('rt.matched'), leads.length ? '<ul class="mini">' + leads.map(function (l) { return '<li><button type="button" class="lnk" data-act="msg.lead" data-id="' + l.id + '">' + e(l.id + ' ' + RM.leadTitle(l)) + '</button> ' + RM.statusBadge(l.status) + '</li>'; }).join('') + '</ul>' : '<p class="hint">' + e(t('rt.matched.none')) + '</p>');
    return h + '</div>';
  }
  function routeForm() {
    var f = U.rt.form, ids = Object.keys(RM.S.cities);
    var chipset = function (name, sel) {
      return ids.map(function (id) { return '<label class="chk sm"><input type="checkbox" name="' + name + '" value="' + id + '"' + (sel.indexOf(id) >= 0 ? ' checked' : '') + '><span>' + e(RM.cityName(id)) + '</span></label>'; }).join('');
    };
    var h = '<div class="det-in">' + UI.back('rt.cancel') + '<div class="det-title"><h3>' + e(t('rt.add')) + '</h3></div><form class="fgrid" data-form="rt.create" id="rt-form">' +
      '<label>' + e(t('rt.kind')) + '<select name="kind" data-in="rt.kind"><option value="route"' + (f.kind === 'route' ? ' selected' : '') + '>' + e(t('rtab.routes')) + '</option><option value="zones"' + (f.kind === 'zones' ? ' selected' : '') + '>' + e(t('rt.kind.zones.s')) + '</option><option value="linear"' + (f.kind === 'linear' ? ' selected' : '') + '>' + e(t('rt.kind.linear.s')) + '</option></select></label>';
    if (f.kind === 'route') h += '<label>' + e(t('f.from')) + '<select name="from">' + UI.cityOpts(f.from) + '</select></label><label>' + e(t('f.to')) + '<select name="to">' + UI.cityOpts(f.to) + '</select></label>';
    else if (f.kind === 'zones') h += '<label class="wide">' + e(t('rt.name')) + '<input type="text" name="name" maxlength="40" value="' + e(f.name || '') + '"></label><fieldset class="wide"><legend>' + e(t('rt.zo')) + '</legend><div class="rt-checks">' + chipset('zo', f.zo) + '</div></fieldset><fieldset class="wide"><legend>' + e(t('rt.zd')) + '</legend><div class="rt-checks">' + chipset('zd', f.zd) + '</div></fieldset>';
    else h += '<label class="wide">' + e(t('rt.name')) + '<input type="text" name="name" maxlength="40" value="' + e(f.name || '') + '"></label>' + [0, 1, 2, 3].map(function (i) { return '<label>' + e(t('rt.stop', { n: i + 1 })) + '<select name="stop' + i + '">' + UI.cityOpts(f.stops[i], true) + '</select></label>'; }).join('');
    h += '<label>' + e(t('rt.time')) + '<input type="time" name="time" value="' + f.time + '"></label><label>' + e(t('rt.days')) + '<select name="days">' + UI.daysetOpts(f.days) + '</select></label><label>' + e(t('rt.cap')) + '<input type="number" name="cap" min="0" max="60" value="' + e(f.cap) + '"></label>' +
      '<div class="rt-checks wide"><label class="chk"><input type="checkbox" name="pax"' + (f.pax ? ' checked' : '') + '><span>' + e(t('ty.passenger')) + '</span></label><label class="chk"><input type="checkbox" name="parcel"' + (f.parcel ? ' checked' : '') + '><span>' + e(t('ty.parcel')) + '</span></label></div>' +
      '<div class="wide"><button type="submit" class="btn btn-sm">' + e(t('rt.btn')) + '</button> <span class="msg" id="rt-msg" role="status"></span></div></form></div>';
    return h;
  }
  RM.acts['rt.open'] = function (el) { U.rt.sel = el.getAttribute('data-id'); U.rt.detail = true; U.rt.adding = false; var r = RM.S.routes.filter(function (x) { return x.id === U.rt.sel; })[0]; if (r) r.fresh = false; };
  RM.acts['rt.back'] = function () { U.rt.detail = false; };
  RM.acts['rt.cancel'] = function () { U.rt.adding = false; U.rt.detail = false; };
  RM.acts['rt.tab'] = function (el) { U.rt.tab = el.getAttribute('data-id'); U.rt.detail = false; U.rt.adding = false; };
  RM.acts['rt.add'] = function () { U.rt.adding = true; U.rt.detail = true; };
  RM.acts['rt.toggle'] = function (el) { var r = RM.S.routes.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; if (r) { r.on = !r.on; RM.log('route', r.on ? 'lg.route.on' : 'lg.route.off', { name: RM.routeName(r) }); } };
  RM.acts['rt.geo'] = function (el) { var r = RM.S.routes.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; if (r) { r.geo = 'ok'; RM.log('route', 'lg.geo', { name: RM.routeName(r) }); U.toast = t('toast.geo'); } };
  RM.acts['rt.suggest'] = function (el) {
    var S = RM.S, from = el.getAttribute('data-from'), to = el.getAttribute('data-to');
    var r = { id: 'r' + (S.nextRoute++), kind: 'route', zones: [[from], [to]], mode: 'zones', radius: 25, cap: 0, occ: 0, time: '10:00', days: 'daily', types: ['passenger', 'parcel'], on: true, geo: 'stale', fresh: true };
    S.routes.push(r); RM.log('route', 'lg.route.add', { name: RM.routeName(r), via: t('lg.via.sugg') });
    U.rt.tab = 'routes'; U.rt.sel = r.id; U.rt.detail = true; U.toast = t('toast.routeadded');
  };
  RM.ins['rt.kind'] = function (el) { U.rt.form.kind = el.value; return false; };
  RM.forms['rt.save'] = function (f) {
    var r = RM.S.routes.filter(function (x) { return x.id === f.getAttribute('data-id'); })[0]; if (!r) return;
    var types = []; if (f.pax.checked) types.push('passenger'); if (f.parcel.checked) types.push('parcel');
    var cap = parseInt(f.cap.value, 10) || 0, occ = parseInt(f.occ.value, 10) || 0, msg = w.document.getElementById('rt-msg');
    if (!types.length) { msg.textContent = t('rt.err.type'); return true; }
    if (!f.time.value) { msg.textContent = t('rt.err.time'); return true; }
    r.time = f.time.value; r.days = f.days.value; r.cap = cap; r.occ = Math.min(occ, 99); r.types = types;
    if (f.radius) r.radius = Math.max(5, parseInt(f.radius.value, 10) || 40);
    r.geo = 'stale'; RM.log('route', 'lg.route.edit', { name: RM.routeName(r) }); U.toast = t('toast.saved');
  };
  RM.forms['rt.create'] = function (f) {
    var S = RM.S, F = U.rt.form, kind = F.kind, msg = w.document.getElementById('rt-msg'), types = [], r;
    var checked = function (n) { return Array.prototype.slice.call(f.querySelectorAll('input[name="' + n + '"]:checked')).map(function (x) { return x.value; }); };
    if (f.pax.checked) types.push('passenger'); if (f.parcel.checked) types.push('parcel');
    F.time = f.time.value || '10:00'; F.days = f.days.value; F.cap = f.cap.value; F.pax = f.pax.checked; F.parcel = f.parcel.checked;
    if (!types.length) { msg.textContent = t('rt.err.type'); return true; }
    r = { id: 'r' + (S.nextRoute++), kind: 'route', mode: 'zones', radius: 25, cap: parseInt(F.cap, 10) || 0, occ: 0, time: F.time, days: F.days, types: types, on: true, geo: 'stale', fresh: true };
    if (kind === 'route') {
      F.from = f.from.value; F.to = f.to.value;
      if (F.from === F.to) { msg.textContent = t('rt.err.same'); S.nextRoute--; return true; }
      r.zones = [[F.from], [F.to]];
    } else {
      var nm = f.name.value.replace(/^\s+|\s+$/g, ''); F.name = nm;
      if (!nm) { msg.textContent = t('rt.err.name'); S.nextRoute--; return true; }
      r.kind = 'group'; r.name = nm; r.radius = 40; r.mode = kind;
      if (kind === 'zones') {
        F.zo = checked('zo'); F.zd = checked('zd');
        if (!F.zo.length || !F.zd.length) { msg.textContent = t('rt.err.zones'); S.nextRoute--; return true; }
        r.zones = [F.zo, F.zd];
      } else {
        var st = []; [0, 1, 2, 3].forEach(function (i) { var v = f['stop' + i].value; F.stops[i] = v; if (v && st.indexOf(v) < 0) st.push(v); });
        if (st.length < 2) { msg.textContent = t('rt.err.stops'); S.nextRoute--; return true; }
        r.stops = st;
      }
    }
    S.routes.push(r); RM.log('route', 'lg.route.add', { name: RM.routeName(r), via: t('lg.via.form') });
    U.rt.adding = false; U.rt.sel = r.id; U.rt.tab = r.kind === 'route' ? 'routes' : 'circuits'; U.rt.detail = true; U.toast = t('toast.routeadded');
  };

  /* ================= CITIES ================= */
  function ctList() {
    var S = RM.S, q = U.ct.q.toLowerCase();
    var ids = Object.keys(S.cities).filter(function (id) { return !q || (RM.cityName(id) + ' ' + S.cities[id].al.join(' ')).toLowerCase().indexOf(q) >= 0; });
    return ids.map(function (id) { var c = S.cities[id]; return '<li><button type="button" class="it' + (U.ct.sel === id ? ' is-sel' : '') + '" data-act="ct.open" data-id="' + id + '"><span class="it-top"><strong>' + e(RM.cityName(id)) + '</strong><span class="it-id">' + e(t('cc.' + c.cc)) + '</span></span><span class="it-sub">' + e(c.al.length ? c.al.join(', ') : t('ct.noal')) + '</span></button></li>'; }).join('');
  }
  function citiesView() {
    var S = RM.S, list = ctList();
    var sel = S.cities[U.ct.sel];
    var det = '';
    if (sel) {
      det = '<div class="det-in">' + UI.back('ct.back') + '<div class="det-title"><h3>' + e(RM.cityName(sel.id)) + '</h3>' + UI.badge(t('cc.' + sel.cc), 'info') + '</div>';
      det += UI.card(t('ct.aliases'), '<div class="tags">' + (sel.al.length ? sel.al.map(function (a, i) { return '<span class="tagx">' + e(a) + '<button type="button" data-act="ct.delal" data-id="' + sel.id + '" data-i="' + i + '" aria-label="' + e(t('btn.remove') + ' ' + a) + '">×</button></span>'; }).join('') : '<span class="hint">' + e(t('ct.noal')) + '</span>') + '</div>' +
        '<form class="inline" data-form="ct.addal" data-id="' + sel.id + '"><input type="text" name="al" maxlength="30" placeholder="' + e(t('ct.al.ph')) + '" aria-label="' + e(t('ct.al.ph')) + '"><button type="submit" class="btn btn-sm">' + e(t('btn.add')) + '</button></form><p class="msg" id="ct-msg" role="status"></p>');
      var near = Object.keys(S.cities).filter(function (x) { return x !== sel.id; }).map(function (x) { return { id: x, d: RM.dist(sel.id, x) }; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 3);
      det += UI.card(t('ct.near'), '<ul class="mini">' + near.map(function (x) { return '<li>' + e(RM.cityName(x.id)) + ' <span class="hint">' + x.d + ' ' + e(t('unit.km')) + (x.d <= S.rules.near ? ' / ' + e(t('ct.within')) : '') + '</span></li>'; }).join('') + '</ul>');
      det += '</div>';
    } else det = UI.empty(t('ct.pick'));
    /* tester and unresolved */
    var res = U.ct.test ? RM.normalize(U.ct.test) : null;
    var tester = UI.card(t('ct.test'), '<input type="text" class="inp" data-in="ct.test" value="' + e(U.ct.test) + '" placeholder="' + e(t('ct.test.ph')) + '" aria-label="' + e(t('ct.test')) + '"><p class="hint" id="ct-res">' + testRes(res) + '</p>');
    var un = [];
    S.leads.forEach(function (l) {
      if (l.src === 'failed') return;
      if (l.hf === 'fuzzy' || l.hf === '' ) { if (!l.from && l.rawF) un.push({ l: l, raw: l.rawF, side: 'from' }); else if (l.hf === 'fuzzy') un.push({ l: l, raw: l.rawF, side: 'from' }); }
      if (l.ht === 'fuzzy' || (!l.to && l.rawT)) un.push({ l: l, raw: l.rawT, side: 'to' });
    });
    var seen = {}; un = un.filter(function (x) { var k = x.raw.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
    var unh = un.length ? '<ul class="mini">' + un.map(function (x) {
      var id = x.side === 'from' ? x.l.from : x.l.to;
      return '<li><span>“' + e(x.raw) + '” ' + (id ? '<span class="hint">→ ' + e(RM.cityName(id)) + ' (' + e(t('how.fuzzy')) + ')</span>' : '<span class="hint">' + e(t('how.none')) + '</span>') + '</span>' +
        (id ? '<button type="button" class="btn btn-ghost btn-sm" data-act="ct.promote" data-id="' + id + '" data-raw="' + e(x.raw) + '">' + e(t('btn.savealias')) + '</button>' : '<select data-in="ct.assign" data-raw="' + e(x.raw) + '" aria-label="' + e(t('btn.savealias')) + '"><option value="">' + e(t('ct.assign')) + '</option>' + UI.cityOpts('') + '</select>') + '</li>';
    }).join('') + '</ul>' : '<p class="hint">' + e(t('ct.unres.none')) + '</p>';
    var add = UI.card(t('ct.add'), '<form class="fgrid" data-form="ct.create"><label>' + e(t('ct.name')) + '<input type="text" name="name" maxlength="30"></label><label>' + e(t('ct.country')) + '<select name="cc"><option value="nm">' + e(t('cc.nm')) + '</option><option value="ea">' + e(t('cc.ea')) + '</option></select></label><label>' + e(t('ct.nearto')) + '<select name="near">' + UI.cityOpts('riverton') + '</select></label><label>' + e(t('ct.km')) + '<input type="number" name="km" min="1" max="200" value="30"></label><div class="wide"><button type="submit" class="btn btn-sm">' + e(t('btn.add')) + '</button> <span class="msg" id="ct-msg2" role="status"></span></div></form>');
    return '<div class="md' + (U.ct.detail ? ' is-detail' : '') + '"><div class="md-list">' + UI.head(t('mod.cities'), t('ct.sub')) +
      '<div class="tools"><input type="search" class="inp" data-in="ct.q" value="' + e(U.ct.q) + '" placeholder="' + e(t('ct.search')) + '" aria-label="' + e(t('ct.search')) + '"></div>' +
      '<ul class="lst" id="ct-list">' + list + '</ul></div><div class="md-det">' + det + tester + UI.card(t('ct.unres'), unh) + add + '</div></div>';
  }
  function testRes(r) { return r ? e(RM.cityName(r.id)) + ' / ' + e(t('how.' + r.how)) + (r.how === 'fuzzy' ? ' / ' + Math.round(r.r * 100) + '%' : '') : e(t('ct.test.none')); }
  RM.acts['ct.open'] = function (el) { U.ct.sel = el.getAttribute('data-id'); U.ct.detail = true; };
  RM.acts['ct.back'] = function () { U.ct.detail = false; };
  RM.acts['ct.delal'] = function (el) { var c = RM.S.cities[el.getAttribute('data-id')]; if (c) { var a = c.al.splice(+el.getAttribute('data-i'), 1); RM.log('rule', 'lg.al.del', { a: a[0], city_c: c.id }); } };
  RM.addAlias = function (id, raw) {
    var c = RM.S.cities[id], s = raw.replace(/^\s+|\s+$/g, '');
    if (!c || !s) return 'empty';
    if (c.al.some(function (a) { return a.toLowerCase() === s.toLowerCase(); }) || RM.cityName(id).toLowerCase() === s.toLowerCase()) return 'dup';
    c.al.push(s); RM.log('rule', 'lg.al.add', { a: s, city_c: id });
    var n = RM.renormalize(); if (n) RM.log('parse', 'lg.renorm', { n: n });
    return '';
  };
  RM.acts['ct.promote'] = function (el) { RM.addAlias(el.getAttribute('data-id'), el.getAttribute('data-raw')); U.toast = t('toast.alias'); };
  RM.ins['ct.q'] = function (el) { U.ct.q = el.value; var ul = w.document.getElementById('ct-list'); if (ul) ul.innerHTML = ctList(); return true; };
  RM.ins['ct.test'] = function (el, ev) { U.ct.test = el.value; var p = w.document.getElementById('ct-res'); if (p) p.innerHTML = testRes(el.value ? RM.normalize(el.value) : null); return true; };
  RM.ins['ct.assign'] = function (el, ev, type) { if (type !== 'change' || !el.value) return true; RM.addAlias(el.value, el.getAttribute('data-raw')); U.toast = t('toast.alias'); return false; };
  RM.forms['ct.addal'] = function (f) {
    var r = RM.addAlias(f.getAttribute('data-id'), f.al.value);
    if (r) { w.document.getElementById('ct-msg').textContent = t('ct.err.' + r); return true; }
    U.toast = t('toast.alias');
  };
  RM.forms['ct.create'] = function (f) {
    var S = RM.S, nm = f.name.value.replace(/^\s+|\s+$/g, ''), msg = w.document.getElementById('ct-msg2'), km = parseInt(f.km.value, 10);
    if (!nm) { msg.textContent = t('ct.err.empty'); return true; }
    if (!(km >= 1)) { msg.textContent = t('err.qty'); return true; }
    var dupe = Object.keys(S.cities).some(function (id) { return RM.cityName(id).toLowerCase() === nm.toLowerCase(); });
    if (dupe) { msg.textContent = t('ct.err.dup'); return true; }
    var base = S.cities[f.near.value], id = 'c' + (S.nextCity++);
    S.cities[id] = { id: id, cc: f.cc.value, x: base.x + km, y: base.y + 7, al: [], custom: nm };
    RM.log('rule', 'lg.city.add', { name: nm }); U.ct.sel = id; U.toast = t('toast.cityadded');
  };
  RM.views = RM.views || {};
  RM.views.leads = leadsView; RM.views.messages = msgsView; RM.views.routes = routesView; RM.views.cities = citiesView;
}(window));
