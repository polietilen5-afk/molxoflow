/* Manager panel: inbox + request card, visit calendar, quote builder with print preview, reply templates, sources and funnel, notification feed. */
(function (w) {
  'use strict';
  var EX = w.EX, t = EX.t, esc = EX.esc, $ = EX.$, S = EX.S, fmt = EX.fmt;
  var panel = EX.panel = {};
  var V = { detail: false, owner: 'all', wk: 0, pick: null, qReq: null, preview: false, tplSel: 't1', drafts: {}, visitSel: { wk: 0, day: 0, slot: 0 }, flash: '', typing: null, newTpl: 0 };
  panel.V = V;
  var VIEWS = ['inbox', 'calendar', 'quotes', 'templates', 'sources', 'feed'];
  var ICON = {
    inbox: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M2 11l3-7h10l3 7v5H2zM2 11h5l1 2h4l1-2h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    calendar: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="2.5" y="4" width="15" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 8h15M6 2v4M14 2v4" stroke="currentColor" stroke-width="1.6"/></svg>',
    quotes: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 2h8l3 3v13H5zM8 9h6M8 12h6M8 15h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    templates: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 4h14v9H8l-4 3v-3H3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    sources: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 17V9M8 17V4M13 17v-6M18 17V7" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    feed: '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 15h10l-1.5-2V9a3.5 3.5 0 0 0-7 0v4zM8.5 17h3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>'
  };
  function sName(s) { return s && EX.SERV[s] ? t('sv.' + s + '.n') : t('f.unsure'); }
  function stName(s) { return t('st.s.' + s); }
  function badge(s) { return '<span class="pf-badge ' + EX.BADGE[s] + '">' + esc(stName(s)) + '</span>'; }
  function vlabel(v) { return t('wk.' + v.wk) + ' · ' + t('day.' + v.day) + ' ' + EX.SLOTS[v.slot]; }
  function tplName(tp) { return tp.name || t(tp.n); }
  function tplBody(tp) { return tp.body != null ? tp.body : t(tp.n + '.t'); }
  function fill(text, r) { return text.replace(/\{name\}/g, r.name.split(' ')[0]).replace(/\{ref\}/g, r.ref).replace(/\{area\}/g, EX.area(r.area).name).replace(/\{visit\}/g, EX.visitOf(r) ? vlabel(EX.visitOf(r)) : t('tpl.novisit')); }
  function logText(L) {
    switch (L.k) {
      case 'created': return t('log.created');
      case 'status': return t('log.status', { status: stName(L.st) });
      case 'assign': return L.who ? t('log.assign', { who: L.who }) : t('log.unassign');
      case 'visit': return t('log.visit', { when: vlabel(L) });
      case 'visitCancel': return t('log.visitCancel');
      case 'reply': return t('log.reply');
      case 'quote': return t('log.quote', { no: L.no });
    }
    return L.k;
  }
  function srcName(s) { s = s === 'nav' ? 'contact' : (s === 'service' ? 'services' : (s || 'contact')); return t('pg.' + s + '.nav'); }

  function filtered() {
    var out = [], q = S.search.toLowerCase(), i, r;
    for (i = 0; i < S.reqs.length; i++) {
      r = S.reqs[i];
      if (S.filter !== 'all' && r.status !== S.filter) continue;
      if (V.owner === 'none' && r.owner) continue;
      if (V.owner !== 'all' && V.owner !== 'none' && r.owner !== V.owner) continue;
      if (q && (r.name + ' ' + r.ref + ' ' + EX.area(r.area).name + ' ' + sName(r.service)).toLowerCase().indexOf(q) < 0) continue;
      out.push(r);
    }
    return out;
  }
  function count(st) { var n = 0; for (var i = 0; i < S.reqs.length; i++) if (st === 'all' || S.reqs[i].status === st) n++; return n; }

  /* ---------- inbox ---------- */
  function vInbox() {
    var i, list = filtered(), r, sel = EX.find(S.selReq);
    var h = '<div class="pn-tools"><label class="sr" for="pnSearch">' + esc(t('pn.search')) + '</label><input type="search" id="pnSearch" placeholder="' + esc(t('pn.search')) + '" value="' + esc(S.search) + '" autocomplete="off"><label class="sr" for="pnOwner">' + esc(t('pn.owner')) + '</label><select id="pnOwner"><option value="all">' + esc(t('pn.owner.all')) + '</option><option value="none"' + (V.owner === 'none' ? ' selected' : '') + '>' + esc(t('pn.unassigned')) + '</option>';
    for (i = 0; i < EX.TEAM.length; i++) h += '<option value="' + EX.TEAM[i] + '"' + (V.owner === EX.TEAM[i] ? ' selected' : '') + '>' + esc(EX.TEAM[i]) + '</option>';
    h += '</select></div><div class="pn-flt" role="group" aria-label="' + esc(t('pn.filter')) + '"><button type="button" data-flt="all" aria-pressed="' + (S.filter === 'all') + '">' + esc(t('all')) + '<i>' + count('all') + '</i></button>';
    for (i = 0; i < EX.STATUSES.length; i++) h += '<button type="button" data-flt="' + EX.STATUSES[i] + '" aria-pressed="' + (S.filter === EX.STATUSES[i]) + '">' + esc(stName(EX.STATUSES[i])) + '<i>' + count(EX.STATUSES[i]) + '</i></button>';
    h += '</div><div class="pn-split' + (V.detail && sel ? ' has-detail' : '') + '"><ul class="pn-list" aria-label="' + esc(t('pn.list')) + '">';
    if (!list.length) h += '<li class="pn-empty">' + esc(t('pn.empty')) + '</li>';
    for (i = 0; i < list.length; i++) {
      r = list[i];
      h += '<li' + (S.fresh === r.id ? ' class="fresh"' : '') + '><button type="button" data-req="' + r.id + '"' + (sel && sel.id === r.id ? ' aria-current="true"' : '') + '><span class="r1"><b>' + esc(r.name) + '</b>' + badge(r.status) + '</span><span class="r2">' + esc(sName(r.service)) + (r.size ? ' · ' + r.size + ' ' + EX.SERV[r.service].unit : '') + ' · ' + esc(EX.area(r.area).name) + '</span><span class="r3"><span>' + esc(r.ref) + ' · ' + esc(srcName(r.source)) + '</span><span>' + esc(r.owner || t('pn.unassigned')) + '</span></span></button></li>';
    }
    h += '</ul>' + (sel ? card(sel) : '<div class="pn-card"><p class="pn-empty">' + esc(t('pn.pick')) + '</p></div>') + '</div>';
    return h;
  }
  function card(r) {
    var i, h, st = '', own = '', log = '', vs = EX.visitOf(r), note = r.noteKey ? t(r.noteKey) : r.note, tp = '';
    for (i = 0; i < EX.STATUSES.length; i++) st += '<button type="button" data-st="' + EX.STATUSES[i] + '" aria-pressed="' + (r.status === EX.STATUSES[i]) + '">' + esc(stName(EX.STATUSES[i])) + '</button>';
    own = '<option value="">' + esc(t('pn.unassigned')) + '</option>'; for (i = 0; i < EX.TEAM.length; i++) own += '<option value="' + EX.TEAM[i] + '"' + (r.owner === EX.TEAM[i] ? ' selected' : '') + '>' + esc(EX.TEAM[i]) + '</option>';
    for (i = r.log.length - 1; i >= 0; i--) log += '<li><time>' + esc(t('today')) + ' ' + esc(r.log[i].time) + '</time>' + esc(logText(r.log[i])) + '</li>';
    for (i = 0; i < S.templates.length; i++) tp += '<option value="' + S.templates[i].id + '"' + (V.tplSel === S.templates[i].id ? ' selected' : '') + '>' + esc(tplName(S.templates[i])) + '</option>';
    var vsel = V.visitSel, wk = '', dy = '', sl = '', k;
    for (k = 0; k < 2; k++) wk += '<option value="' + k + '"' + (vsel.wk === k ? ' selected' : '') + '>' + esc(t('wk.' + k)) + '</option>';
    for (k = 0; k < 6; k++) dy += '<option value="' + k + '"' + (vsel.day === k ? ' selected' : '') + '>' + esc(t('day.' + k)) + '</option>';
    for (k = 0; k < 3; k++) { var busy = EX.visitAt(vsel.wk, vsel.day, k); sl += '<option value="' + k + '"' + (vsel.slot === k ? ' selected' : '') + (busy && busy.req !== r.id ? ' disabled' : '') + '>' + EX.SLOTS[k] + (busy && busy.req !== r.id ? ' (' + esc(t('cal.busy')) + ')' : '') + '</option>'; }
    h = '<div class="pn-card" id="pnCard"><button type="button" class="pn-back" data-act="list">' + esc(t('pn.back')) + '</button><div class="c-h"><div><h4>' + esc(r.name) + '</h4><p class="ref">' + esc(r.ref) + ' · ' + esc(t('today')) + ' ' + esc(r.time) + '</p></div>' + badge(r.status) + '</div>' +
      '<dl class="pn-facts"><div><dt>' + esc(t('wz.work')) + '</dt><dd>' + esc(sName(r.service)) + '</dd></div><div><dt>' + esc(t('wz.size')) + '</dt><dd>' + (r.size ? r.size + ' ' + EX.SERV[r.service].unit : '—') + '</dd></div><div><dt>' + esc(t('f.area')) + '</dt><dd>' + esc(EX.area(r.area).name) + '</dd></div>' +
      '<div><dt>' + esc(t('wz.access')) + '</dt><dd>' + (r.acc ? esc(t('acc.' + r.acc)) : '—') + '</dd></div><div><dt>' + esc(t('wz.when')) + '</dt><dd>' + (r.tim ? esc(t('tim.' + r.tim)) : '—') + '</dd></div><div><dt>' + esc(t('est.k')) + '</dt><dd>' + (r.lo ? fmt(r.lo) + ' – ' + fmt(r.hi) + ' ' + esc(t('est.u')) : '—') + '</dd></div>' +
      '<div><dt>' + esc(t('pn.source')) + '</dt><dd>' + esc(srcName(r.source)) + ' · ' + esc(t('ch.' + r.channel)) + '</dd></div><div class="wide"><dt>' + esc(t('pn.customer')) + '</dt><dd>' + esc(r.name) + ' · ' + esc(r.contact) + '</dd></div><div class="wide"><dt>' + esc(t('pn.note')) + '</dt><dd class="soft">' + esc(note || t('pn.nonote')) + '</dd></div></dl>' +
      '<div class="pn-row"><div><h5>' + esc(t('pn.status')) + '</h5><div class="pn-steps" role="group">' + st + '</div></div><div><h5><label for="cOwner">' + esc(t('pn.owner')) + '</label></h5><select id="cOwner">' + own + '</select></div></div>' +
      '<div class="pn-block"><h5>' + esc(t('pn.visit')) + '</h5>' + (vs ? '<p class="pn-line"><b>' + esc(vlabel(vs)) + '</b> <button type="button" class="pn-link" data-act="cancelvisit">' + esc(t('cal.cancel')) + '</button></p>' : '') +
      '<div class="pn-inline"><label class="sr" for="vWk">' + esc(t('cal.week')) + '</label><select id="vWk">' + wk + '</select><label class="sr" for="vDay">' + esc(t('cal.day')) + '</label><select id="vDay">' + dy + '</select><label class="sr" for="vSlot">' + esc(t('cal.slot')) + '</label><select id="vSlot">' + sl + '</select><button type="button" class="pbtn" data-act="book">' + esc(vs ? t('cal.move') : t('cal.book')) + '</button></div></div>' +
      '<div class="pn-block"><h5>' + esc(t('pn.quote')) + '</h5><p class="pn-line">' + (r.quote ? '<b>' + esc(r.quote.no) + '</b> · ' + fmt(EX.quoteTotal(r.quote)) + ' ' + esc(t('est.u')) + ' · ' + esc(r.quote.sent ? t('q.sent') : t('q.draft')) : esc(t('q.none'))) + '</p><button type="button" class="pbtn ghost" data-act="openquote">' + esc(r.quote ? t('q.open') : t('q.create')) + '</button></div>' +
      '<div class="pn-block"><h5>' + esc(t('pn.reply')) + '</h5><div class="pn-inline"><label class="sr" for="tplSel">' + esc(t('pn.tpl')) + '</label><select id="tplSel">' + tp + '</select><button type="button" class="pbtn ghost" data-act="fill">' + esc(t('pn.fill')) + '</button></div><label class="sr" for="draft">' + esc(t('pn.draft')) + '</label><textarea id="draft">' + esc(V.drafts[r.id] || '') + '</textarea>' +
      '<div class="pn-inline"><button type="button" class="pbtn" data-act="reply">' + esc(t('pn.send')) + '</button><span class="pn-ok" role="status">' + (V.flash === r.id ? esc(t('pn.sent')) : '') + '</span></div></div>' +
      '<div class="pn-block"><h5>' + esc(t('pn.log')) + '</h5><ul class="pn-log">' + log + '</ul></div></div>';
    return h;
  }

  /* ---------- calendar ---------- */
  function vCalendar() {
    var d, s, h = '<div class="pn-tools"><div class="pn-seg" role="group" aria-label="' + esc(t('cal.week')) + '"><button type="button" data-wk="0" aria-pressed="' + (V.wk === 0) + '">' + esc(t('wk.0')) + '</button><button type="button" data-wk="1" aria-pressed="' + (V.wk === 1) + '">' + esc(t('wk.1')) + '</button></div><p class="pn-hint">' + esc(t('cal.hint')) + '</p></div><div class="cal" role="grid" aria-label="' + esc(t('pn.calendar')) + '"><div class="cal-r hd" role="row"><span role="columnheader"></span>';
    for (d = 0; d < 6; d++) h += '<span role="columnheader">' + esc(t('day.' + d)) + '</span>';
    h += '</div>';
    for (s = 0; s < 3; s++) {
      h += '<div class="cal-r" role="row"><span class="tm" role="rowheader">' + EX.SLOTS[s] + '</span>';
      for (d = 0; d < 6; d++) {
        var v = EX.visitAt(V.wk, d, s), r = v ? EX.find(v.req) : null, on = V.pick && V.pick.wk === V.wk && V.pick.day === d && V.pick.slot === s;
        h += '<span role="gridcell">' + (v && r ? '<button type="button" class="ev" data-ev="' + v.id + '"' + (on ? ' aria-current="true"' : '') + '><b>' + esc(r.name) + '</b><em>' + esc(EX.area(r.area).name) + '</em></button>' : '<button type="button" class="free" data-slot="' + d + ',' + s + '"' + (on ? ' aria-current="true"' : '') + ' aria-label="' + esc(t('day.' + d) + ' ' + EX.SLOTS[s] + ' – ' + t('cal.free')) + '">+</button>') + '</span>';
      }
      h += '</div>';
    }
    h += '</div><div class="pn-pop" aria-live="polite">';
    if (V.pick) {
      var ev = EX.visitAt(V.pick.wk, V.pick.day, V.pick.slot);
      if (ev) {
        var rr = EX.find(ev.req);
        h += '<h4>' + esc(rr.name) + ' · ' + esc(rr.ref) + '</h4><p>' + esc(vlabel(ev)) + ' · ' + esc(EX.area(rr.area).name) + ' · ' + esc(sName(rr.service)) + '</p><div class="pn-inline"><button type="button" class="pbtn ghost" data-act="evopen" data-id="' + rr.id + '">' + esc(t('cal.openreq')) + '</button><button type="button" class="pbtn ghost" data-act="evcancel" data-id="' + ev.id + '">' + esc(t('cal.cancel')) + '</button></div>';
      } else {
        var opts = '', i; for (i = 0; i < S.reqs.length; i++) if (!EX.visitOf(S.reqs[i]) && S.reqs[i].status !== 'won' && S.reqs[i].status !== 'declined') opts += '<option value="' + S.reqs[i].id + '">' + esc(S.reqs[i].ref + ' · ' + S.reqs[i].name) + '</option>';
        h += '<h4>' + esc(t('wk.' + V.pick.wk)) + ' · ' + esc(t('day.' + V.pick.day)) + ' ' + EX.SLOTS[V.pick.slot] + '</h4>' + (opts ? '<div class="pn-inline"><label class="sr" for="calReq">' + esc(t('cal.assign')) + '</label><select id="calReq">' + opts + '</select><button type="button" class="pbtn" data-act="calbook">' + esc(t('cal.book')) + '</button></div>' : '<p>' + esc(t('cal.nofree')) + '</p>');
      }
    } else h += '<p class="pn-hint">' + esc(t('cal.pick')) + '</p>';
    return h + '</div>';
  }

  /* ---------- quotes ---------- */
  function vQuotes() {
    var i, r = EX.find(V.qReq || S.selReq) || S.reqs[0], h = '<div class="pn-tools"><label for="qReq" class="sr">' + esc(t('q.for')) + '</label><select id="qReq">';
    for (i = 0; i < S.reqs.length; i++) h += '<option value="' + S.reqs[i].id + '"' + (S.reqs[i].id === r.id ? ' selected' : '') + '>' + esc(S.reqs[i].ref + ' · ' + S.reqs[i].name) + '</option>';
    h += '</select></div>';
    if (!r.quote) return h + '<div class="pn-card"><p class="pn-empty">' + esc(t('q.none')) + '</p><button type="button" class="pbtn" data-act="qcreate">' + esc(t('q.create')) + '</button></div>';
    var q = r.quote, rows = '', total = EX.quoteTotal(q), sub = 0;
    for (i = 0; i < q.lines.length; i++) { var L = q.lines[i], c = EX.CATALOG[EX.catIndex(L.id)]; sub += L.qty * L.price;
      rows += '<div class="ql" role="row"><span class="nm" role="cell">' + esc(t('cat.' + L.id)) + '</span><span role="cell" class="qq"><label class="sr" for="ql' + i + '">' + esc(t('q.qty')) + '</label><input type="number" min="0" step="1" id="ql' + i + '" data-qi="' + i + '" value="' + L.qty + '"' + (q.sent ? ' disabled' : '') + '> ' + esc(c.unit) + '</span><span role="cell">' + L.price + '</span><span role="cell"><b>' + fmt(L.qty * L.price) + '</b></span><span role="cell"><button type="button" class="pn-link" data-act="qdel" data-i="' + i + '"' + (q.sent ? ' disabled' : '') + ' aria-label="' + esc(t('q.del')) + '">×</button></span></div>'; }
    var cat = ''; for (i = 0; i < EX.CATALOG.length; i++) cat += '<option value="' + EX.CATALOG[i].id + '">' + esc(t('cat.' + EX.CATALOG[i].id)) + ' (' + EX.CATALOG[i].price + ' / ' + EX.CATALOG[i].unit + ')</option>';
    h += '<div class="pn-two"><div class="pn-card"><div class="c-h"><div><h4>' + esc(q.no) + '</h4><p class="ref">' + esc(r.name) + ' · ' + esc(r.ref) + '</p></div><span class="pf-badge ' + (q.sent ? 'ok' : 'warn') + '">' + esc(q.sent ? t('q.sent') : t('q.draft')) + '</span></div>' +
      '<div class="qt" role="table"><div class="ql hd" role="row"><span role="columnheader">' + esc(t('q.item')) + '</span><span role="columnheader">' + esc(t('q.qty')) + '</span><span role="columnheader">' + esc(t('q.price')) + '</span><span role="columnheader">' + esc(t('q.sum')) + '</span><span></span></div>' + rows + '</div>' +
      (q.sent ? '' : '<div class="pn-inline"><label class="sr" for="qCat">' + esc(t('q.add')) + '</label><select id="qCat">' + cat + '</select><button type="button" class="pbtn ghost" data-act="qadd">' + esc(t('q.add')) + '</button></div>') +
      '<label class="pn-chk"><input type="checkbox" id="qRes"' + (q.reserve ? ' checked' : '') + (q.sent ? ' disabled' : '') + '><span>' + esc(t('q.reserve')) + '</span></label>' +
      '<p class="qtot"><span>' + esc(t('q.total')) + '</span><b>' + fmt(total) + ' ' + esc(t('est.u')) + '</b></p><div class="pn-inline"><button type="button" class="pbtn ghost" data-act="qprev" aria-pressed="' + V.preview + '">' + esc(V.preview ? t('q.hide') : t('q.preview')) + '</button>' + (q.sent ? '' : '<button type="button" class="pbtn" data-act="qsend">' + esc(t('q.send')) + '</button>') + '</div></div>';
    if (V.preview) {
      var pr = ''; for (i = 0; i < q.lines.length; i++) pr += '<tr><td>' + esc(t('cat.' + q.lines[i].id)) + '</td><td>' + q.lines[i].qty + '</td><td>' + fmt(q.lines[i].qty * q.lines[i].price) + '</td></tr>';
      h += '<div class="paper" aria-label="' + esc(t('q.preview')) + '"><header><b>' + esc(t('site.brand.a') + ' ' + t('site.brand.b')) + '</b><span>' + esc(q.no) + '</span></header><h3>' + esc(t('q.doc')) + '</h3><p>' + esc(t('q.for2')) + ' ' + esc(r.name) + ' · ' + esc(EX.area(r.area).name) + '</p><table><thead><tr><th>' + esc(t('q.item')) + '</th><th>' + esc(t('q.qty')) + '</th><th>' + esc(t('q.sum')) + '</th></tr></thead><tbody>' + pr + (q.reserve ? '<tr><td>' + esc(t('q.reserve')) + '</td><td></td><td>' + fmt(sub * 0.1) + '</td></tr>' : '') + '</tbody><tfoot><tr><td colspan="2">' + esc(t('q.total')) + '</td><td>' + fmt(total) + ' ' + esc(t('est.u')) + '</td></tr></tfoot></table><p class="fine">' + esc(t('q.terms')) + '</p><div class="sig"><span>' + esc(t('q.sig1')) + '</span><span>' + esc(t('q.sig2')) + '</span></div></div>';
    }
    return h + '</div>';
  }

  /* ---------- templates ---------- */
  function vTemplates() {
    var i, h = '<div class="pn-two"><div class="pn-card"><h4>' + esc(t('pn.templates')) + '</h4><ul class="pn-tpl">', tp = EX.tpl(V.tplSel) || S.templates[0];
    for (i = 0; i < S.templates.length; i++) h += '<li><button type="button" data-tpl="' + S.templates[i].id + '"' + (S.templates[i].id === tp.id ? ' aria-current="true"' : '') + '>' + esc(tplName(S.templates[i])) + '</button></li>';
    h += '</ul><button type="button" class="pbtn ghost" data-act="tplnew">' + esc(t('tpl.new')) + '</button></div><div class="pn-card"><label class="pn-lab" for="tName">' + esc(t('tpl.name')) + '</label><input type="text" id="tName" value="' + esc(tplName(tp)) + '"><label class="pn-lab" for="tBody">' + esc(t('tpl.body')) + '</label><textarea id="tBody" rows="7">' + esc(tplBody(tp)) + '</textarea><p class="pn-hint">' + esc(t('tpl.vars')) + '</p><div class="pn-inline"><button type="button" class="pbtn" data-act="tplsave">' + esc(t('tpl.save')) + '</button><span class="pn-ok" role="status">' + (V.flash === 'tpl' ? esc(t('tpl.saved')) : '') + '</span></div>';
    var r = EX.find(S.selReq);
    if (r) h += '<h5>' + esc(t('tpl.prev', { ref: r.ref })) + '</h5><blockquote class="pn-quote">' + esc(fill(tplBody(tp), r)) + '</blockquote>';
    return h + '</div></div>';
  }

  /* ---------- sources ---------- */
  function bars(map, order, nameFn, cls) {
    var max = 1, i, h = '<ul class="bars ' + (cls || '') + '">';
    for (i = 0; i < order.length; i++) if ((map[order[i]] || 0) > max) max = map[order[i]];
    for (i = 0; i < order.length; i++) { var n = map[order[i]] || 0; h += '<li><span class="lb">' + esc(nameFn(order[i])) + '</span><span class="tr"><b style="width:' + Math.round(n / max * 100) + '%"></b></span><span class="nu">' + n + '</span></li>'; }
    return h + '</ul>';
  }
  function vSources() {
    var src = {}, ch = {}, ow = {}, st = {}, i, r, keys = [];
    for (i = 0; i < S.reqs.length; i++) { r = S.reqs[i]; src[r.source] = (src[r.source] || 0) + 1; ch[r.channel] = (ch[r.channel] || 0) + 1; ow[r.owner || ''] = (ow[r.owner || ''] || 0) + 1; st[r.status] = (st[r.status] || 0) + 1; }
    for (var k in src) if (src.hasOwnProperty(k)) keys.push(k);
    keys.sort(function (a, b) { return src[b] - src[a]; });
    return '<div class="pn-two"><div class="pn-card"><h4>' + esc(t('src.pages')) + '</h4><p class="pn-hint">' + esc(t('src.pages.p')) + '</p>' + bars(src, keys, srcName) + '</div><div class="pn-card"><h4>' + esc(t('src.funnel')) + '</h4>' + bars(st, EX.STATUSES, stName, 'st') + '</div>' +
      '<div class="pn-card"><h4>' + esc(t('src.chan')) + '</h4>' + bars(ch, ['form', 'wizard'], function (c) { return t('ch.' + c); }) + '</div><div class="pn-card"><h4>' + esc(t('src.owner')) + '</h4>' + bars(ow, EX.TEAM.concat(['']), function (o) { return o || t('pn.unassigned'); }) + '</div></div>';
  }

  /* ---------- feed ---------- */
  function vFeed() {
    var i, f, h = '<div class="pn-card"><h4>' + esc(t('feed.rules')) + '</h4><p class="pn-hint">' + esc(t('feed.rules.p')) + '</p><div class="pn-checks">';
    ['email', 'messenger', 'auto'].forEach(function (c) { h += '<label class="pn-chk"><input type="checkbox" data-ch="' + c + '"' + (S.channels[c] ? ' checked' : '') + '><span>' + esc(t('feed.k.' + c)) + '</span></label>'; });
    h += '</div></div><ul class="pn-feed" aria-label="' + esc(t('pn.feed')) + '">';
    for (i = 0; i < S.feed.length; i++) { f = S.feed[i]; h += '<li class="k-' + f.kind + '"><span class="tag">' + esc(t('feed.k.' + f.kind)) + '</span><span class="tx">' + esc(t(f.key, f.vars)) + '</span><time>' + esc(f.time) + '</time>' + (f.req ? '<button type="button" class="pn-link" data-act="evopen" data-id="' + f.req + '">' + esc(t('cal.openreq')) + '</button>' : '') + '</li>'; }
    return h + '</ul>';
  }

  var BUILD = { inbox: vInbox, calendar: vCalendar, quotes: vQuotes, templates: vTemplates, sources: vSources, feed: vFeed };
  function kpis() {
    var n = 0, wk = 0, won = 0, i, st;
    for (i = 0; i < S.reqs.length; i++) { st = S.reqs[i].status; if (st === 'new') n++; else if (st === 'contacted' || st === 'visit' || st === 'quoted') wk++; else if (st === 'won') won++; }
    var a = [['pn.k.new', n], ['pn.k.work', wk], ['pn.k.visits', S.visits.length], ['pn.k.won', won]], h = '<ul class="pn-kpi">';
    for (i = 0; i < a.length; i++) h += '<li><b>' + a[i][1] + '</b><span>' + esc(t(a[i][0])) + '</span></li>';
    return h + '</ul>';
  }
  panel.render = function (keepFocus) {
    var pane = $('pane-panel'); if (!pane) return;
    var i, nav = '<nav class="pn-nav" aria-label="' + esc(t('pn.modules')) + '">';
    for (i = 0; i < VIEWS.length; i++) nav += '<button type="button" data-view="' + VIEWS[i] + '"' + (S.panelView === VIEWS[i] ? ' aria-current="page"' : '') + '>' + ICON[VIEWS[i]] + '<span>' + esc(t('pn.' + VIEWS[i])) + '</span>' + (VIEWS[i] === 'inbox' && count('new') ? '<i>' + count('new') + '</i>' : '') + '</button>';
    nav += '</nav>';
    pane.innerHTML = '<div class="panel">' + nav + '<section class="pn-main"><h3 class="pn-h">' + esc(t('pn.' + S.panelView)) + '</h3>' + kpis() + '<div id="pnBody">' + BUILD[S.panelView]() + '</div></section></div>';
    S.fresh = null;
  };
  panel.show = function (view) { if (view) S.panelView = view; V.detail = false; panel.render(); };
  panel.openReq = function (id) { S.selReq = id; S.panelView = 'inbox'; S.filter = 'all'; S.search = ''; V.owner = 'all'; V.detail = true; EX.showTab('panel'); };

  function stopTyping() { if (V.typing) { clearInterval(V.typing); V.typing = null; } }
  panel.stop = stopTyping;
  function reRender(focusSel) { stopTyping(); panel.render(); if (focusSel) { var f = $('pane-panel').querySelector(focusSel); if (f) f.focus({ preventScroll: true }); } }

  panel.bind = function () {
    var pn = $('pane-panel');
    pn.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-view]'))) { S.panelView = b.getAttribute('data-view'); V.detail = false; V.preview = false; reRender('[data-view="' + S.panelView + '"]'); return; }
      if ((b = e.target.closest('[data-flt]'))) { S.filter = b.getAttribute('data-flt'); V.detail = false; reRender('[data-flt="' + S.filter + '"]'); return; }
      if ((b = e.target.closest('[data-req]'))) { S.selReq = b.getAttribute('data-req'); V.detail = true; reRender(); var bk = pn.querySelector('.pn-back'); if (bk && bk.offsetParent) bk.focus({ preventScroll: true }); return; }
      if ((b = e.target.closest('[data-st]'))) { var r = EX.find(S.selReq); EX.setStatus(r, b.getAttribute('data-st')); reRender('[data-st="' + r.status + '"]'); return; }
      if ((b = e.target.closest('[data-wk]'))) { V.wk = +b.getAttribute('data-wk'); V.pick = null; reRender('[data-wk="' + V.wk + '"]'); return; }
      if ((b = e.target.closest('[data-slot]'))) { var p = b.getAttribute('data-slot').split(','); V.pick = { wk: V.wk, day: +p[0], slot: +p[1] }; reRender('[data-slot="' + p[0] + ',' + p[1] + '"]'); return; }
      if ((b = e.target.closest('[data-ev]'))) { var ev = null; for (var i = 0; i < S.visits.length; i++) if (S.visits[i].id === b.getAttribute('data-ev')) ev = S.visits[i]; if (ev) V.pick = { wk: ev.wk, day: ev.day, slot: ev.slot }; reRender('[data-ev="' + b.getAttribute('data-ev') + '"]'); return; }
      if ((b = e.target.closest('[data-tpl]'))) { V.tplSel = b.getAttribute('data-tpl'); V.flash = ''; reRender('[data-tpl="' + V.tplSel + '"]'); return; }
      if ((b = e.target.closest('[data-act]'))) act(b);
    });
    pn.addEventListener('input', function (e) {
      var el = e.target;
      if (el.id === 'pnSearch') { S.search = el.value; var pos = el.selectionStart; reRender(); var n = $('pnSearch'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} } }
      else if (el.id === 'draft') { V.drafts[S.selReq] = el.value; stopTyping(); }
      else if (el.hasAttribute('data-qi')) { var r = EX.find(V.qReq || S.selReq), v = Math.max(0, +el.value || 0); r.quote.lines[+el.getAttribute('data-qi')].qty = v; updTotals(r); }
    });
    pn.addEventListener('change', function (e) {
      var el = e.target, r = EX.find(S.selReq);
      if (el.id === 'pnOwner') { V.owner = el.value; V.detail = false; reRender('#pnOwner'); }
      else if (el.id === 'cOwner') { EX.assign(r, el.value); reRender('#cOwner'); }
      else if (el.id === 'tplSel') V.tplSel = el.value;
      else if (el.id === 'vWk' || el.id === 'vDay' || el.id === 'vSlot') { V.visitSel.wk = +$('vWk').value; V.visitSel.day = +$('vDay').value; V.visitSel.slot = +$('vSlot').value; if (el.id !== 'vSlot') { var vv = EX.visitAt(V.visitSel.wk, V.visitSel.day, V.visitSel.slot); if (vv && vv.req !== r.id) V.visitSel.slot = [0, 1, 2].filter(function (s) { return !EX.visitAt(V.visitSel.wk, V.visitSel.day, s); })[0] || 0; } reRender('#' + el.id); }
      else if (el.id === 'qReq') { V.qReq = el.value; V.preview = false; S.selReq = el.value; reRender('#qReq'); }
      else if (el.id === 'qRes') { var q = EX.find(V.qReq || S.selReq); q.quote.reserve = el.checked; updTotals(q); reRender('#qRes'); }
      else if (el.hasAttribute('data-ch')) { S.channels[el.getAttribute('data-ch')] = el.checked; }
    });
  };
  function updTotals(r) { var tt = r.quote ? EX.quoteTotal(r.quote) : 0; var el = $('pane-panel').querySelector('.qtot b'); if (el) el.textContent = fmt(tt) + ' ' + t('est.u'); var rows = $('pane-panel').querySelectorAll('.ql:not(.hd) b'); if (r.quote) for (var i = 0; i < rows.length && i < r.quote.lines.length; i++) rows[i].textContent = fmt(r.quote.lines[i].qty * r.quote.lines[i].price); }

  function act(b) {
    var a = b.getAttribute('data-act'), r = EX.find(S.selReq), i;
    if (a === 'list') { V.detail = false; reRender(); }
    else if (a === 'book') { var vs = V.visitSel; if (!EX.scheduleVisit(r, vs.wk, vs.day, vs.slot)) { V.flash = ''; } reRender('[data-act="book"]'); }
    else if (a === 'cancelvisit') { EX.removeVisit(EX.visitOf(r)); reRender(); }
    else if (a === 'openquote') { V.qReq = r.id; if (!r.quote) r.quote = EX.defaultQuote(r); S.panelView = 'quotes'; V.preview = false; V.detail = false; reRender(); }
    else if (a === 'qcreate') { var q = EX.find(V.qReq || S.selReq); q.quote = EX.defaultQuote(q); reRender(); }
    else if (a === 'qadd') { var qr = EX.find(V.qReq || S.selReq), id = $('qCat').value, c = EX.CATALOG[EX.catIndex(id)]; qr.quote.lines.push({ id: id, qty: 1, price: c.price }); reRender('#qCat'); }
    else if (a === 'qdel') { var q2 = EX.find(V.qReq || S.selReq); q2.quote.lines.splice(+b.getAttribute('data-i'), 1); reRender(); }
    else if (a === 'qprev') { V.preview = !V.preview; reRender('[data-act="qprev"]'); }
    else if (a === 'qsend') { var q3 = EX.find(V.qReq || S.selReq); EX.sendQuote(q3); V.preview = true; reRender(); }
    else if (a === 'fill') {
      var tp = EX.tpl($('tplSel').value), ta = $('draft'), txt = fill(tplBody(tp), r), n = 0; V.tplSel = tp.id; stopTyping(); ta.value = ''; V.drafts[r.id] = '';
      if (w.PF && w.PF.reduced) { ta.value = txt; V.drafts[r.id] = txt; return; }
      V.typing = setInterval(function () { n += 3; ta.value = txt.slice(0, n); V.drafts[r.id] = ta.value; if (n >= txt.length) stopTyping(); }, 18);
    }
    else if (a === 'reply') { var d = $('draft'); if (!d.value.replace(/\s/g, '')) { d.focus(); return; } stopTyping(); EX.sendReply(r, d.value, V.tplSel); V.drafts[r.id] = ''; V.flash = r.id; reRender(); }
    else if (a === 'calbook') { var rq = EX.find($('calReq').value), pk = V.pick; if (rq && EX.scheduleVisit(rq, pk.wk, pk.day, pk.slot)) { reRender(); } }
    else if (a === 'evcancel') { var vv = null; for (i = 0; i < S.visits.length; i++) if (S.visits[i].id === b.getAttribute('data-id')) vv = S.visits[i]; if (vv) EX.removeVisit(vv); V.pick = null; reRender(); }
    else if (a === 'evopen') panel.openReq(b.getAttribute('data-id'));
    else if (a === 'tplnew') { var id2 = 'tn' + (++V.newTpl); S.templates.push({ id: id2, name: t('tpl.newname', { n: V.newTpl }), body: '' }); V.tplSel = id2; V.flash = ''; reRender('#tName'); }
    else if (a === 'tplsave') { var tp2 = EX.tpl(V.tplSel); tp2.body = $('tBody').value; if (tp2.n) { if ($('tName').value !== t(tp2.n)) tp2.name = $('tName').value; } else tp2.name = $('tName').value; V.flash = 'tpl'; reRender(); }
  }
  EX.onChange(function (what) {
    if (what === 'new') { var bd = $('tabBadge'); if (bd) { bd.hidden = S.unseen < 1; bd.textContent = S.unseen; } }
  });
}(window));
