/* Bid Radar demo: discovery and sources, bids, qualification, calendar, tasks. */
(function () {
  'use strict';
  var BR = window.BR, S = BR.S, H = BR.h, T = BR.T, doc = document;
  var M = BR.mods = BR.mods || {};

  /* ================= discover ================= */
  var D_ = { q: '', cat: 'all', amt: 0, srcs: ['mail', 'portalN', 'portalE', 'hub'], sel: null, pid: 'none', pname: '', kw: '', kwErr: '' };
  M.discover = function (root) {
    root.appendChild(BR.tabs([{ id: 'search', label: T('dc.search') }, { id: 'sources', label: T('dc.sources') }, { id: 'import', label: T('dc.import') }], S.tabQ, function (id) { S.tabQ = id; BR.changed('mod'); }, T('nav.discover')));
    ({ search: dSearch, sources: dSources, import: dImport })[S.tabQ](root);
  };
  function srcOn(id) { return S.src[id].on; }
  function dMatches(t) {
    var q = D_.q.toLowerCase();
    return t.stage === 'market' && srcOn(t.src) && D_.srcs.indexOf(t.src) >= 0 && (D_.cat === 'all' || t.cat === D_.cat) && t.amount >= D_.amt &&
      (!q || (BR.tt(t, 'title') + ' ' + BR.tt(t, 'buyer') + ' ' + BR.tt(t, 'subject')).toLowerCase().indexOf(q) >= 0);
  }
  function importOne(t) {
    if (!BR.guard('create')) return false;
    t.stage = 'inbox'; BR.arrive(t, t.src);
    return true;
  }
  function dSearch(root) {
    var bar = H('div', { class: 'toolbar wrap' });
    bar.appendChild(BR.select([{ id: 'none', label: T('dc.noprofile') }].concat(S.profiles.map(function (p) { return { id: p.id, label: p.name }; })), D_.pid, function (v) {
      D_.pid = v; var p = S.profiles.filter(function (x) { return x.id === v; })[0];
      if (p) { D_.q = p.q; D_.cat = p.cat; D_.amt = p.amt; D_.srcs = p.src.slice(); }
      BR.changed('mod');
    }, 'dprof'));
    bar.appendChild(H('input', { class: 'search', type: 'search', value: D_.q, 'data-key': 'dq', placeholder: T('dc.kw'), 'aria-label': T('dc.kw'), oninput: function () { D_.q = this.value; BR.changed('mod'); } }));
    bar.appendChild(BR.select([{ id: 'all', label: T('dc.allcat') }].concat(BR.CATS.map(function (c) { return { id: c, label: T('cat.' + c) }; })), D_.cat, function (v) { D_.cat = v; BR.changed('mod'); }, 'dcat'));
    bar.appendChild(BR.select([0, 1, 2, 3].map(function (n) { return { id: n, label: n ? T('dc.minamt', { n: ['X', '2X', '3X'][n - 1] }) : T('dc.anyamt') }; }), D_.amt, function (v) { D_.amt = parseInt(v, 10); BR.changed('mod'); }, 'damt'));
    root.appendChild(bar);
    root.appendChild(BR.chips(T('dc.src'), BR.SOURCES.filter(function (s) { return srcOn(s.id); }).map(function (s) { return { id: s.id, label: T('srcn.' + s.id) }; }), D_.srcs, function (id) {
      var i = D_.srcs.indexOf(id); if (i >= 0) D_.srcs.splice(i, 1); else D_.srcs.push(id); BR.changed('mod');
    }, true));
    var pn = H('input', { class: 'inp', maxlength: 30, value: D_.pname, 'data-key': 'dpname', placeholder: T('dc.pname'), 'aria-label': T('dc.pname'), oninput: function () { D_.pname = this.value; } });
    root.appendChild(H('div', { class: 'toolbar' }, pn, BR.btn(T('dc.saveprof'), function () {
      var n = D_.pname.trim();
      if (n.length < 2) { pn.parentNode.classList.add('bad'); BR.toast(T('form.invalid'), 'warn'); return; }
      if (S.profiles.some(function (p) { return p.name.toLowerCase() === n.toLowerCase(); })) { BR.toast(T('dc.dupname'), 'warn'); return; }
      var id = 'p' + (S.profiles.length + 1); S.profiles.push({ id: id, name: n, q: D_.q, cat: D_.cat, amt: D_.amt, src: D_.srcs.slice() }); D_.pid = id; D_.pname = '';
      BR.logAdd('other', 'lg.profile.saved', { name: n }); BR.toast(T('dc.saved')); BR.changed('mod');
    }, 'btn-ghost', { 'data-key': 'dsave' })));
    var res = S.tenders.filter(dMatches), inc = res.filter(function (t) { return S.rules.inc.indexOf(t.cat) >= 0; });
    var list = H('div', { class: 'dsplit' + (D_.sel ? ' has' : '') });
    var left = H('div', { class: 'dleft' }, H('div', { class: 'blk-h' }, H('h4', null, T('dc.results', { n: res.length })),
      BR.btn(T('dc.importrules', { n: inc.length }), function () { var c = 0; inc.forEach(function (t) { if (importOne(t)) c++; }); if (c) { BR.toast(T('dc.imported', { n: c })); BR.changed('tender'); } }, 'btn-ghost', { disabled: !inc.length, 'data-key': 'dimp' })));
    var rows = res.map(function (t) {
      return { key: t.id, cls: D_.sel === t.id ? 'sel' : '', onclick: function () { D_.sel = t.id; BR.changed('mod'); }, cells: [H('b', null, BR.tt(t, 'title')), BR.tt(t, 'buyer'), BR.srcLabel(t), BR.dueChip(t), S.rules.inc.indexOf(t.cat) >= 0 ? BR.badge('info', T('dc.matchrule')) : ''] };
    });
    left.appendChild(BR.table([{ label: T('pl.c.title'), w: '2fr' }, { label: T('pl.c.buyer'), w: '1.3fr' }, { label: T('pl.c.src'), w: '1fr' }, { label: T('pl.c.due'), w: '.9fr' }, { label: '', w: '1fr' }], rows, 'compact'));
    if (!rows.length) left.appendChild(BR.empty(T('dc.noresults')));
    list.appendChild(left);
    var sel = D_.sel && BR.byId(D_.sel);
    if (sel && sel.stage === 'market') {
      var pv = H('aside', { class: 'preview' });
      pv.appendChild(H('button', { type: 'button', class: 'back', onclick: function () { D_.sel = null; BR.changed('mod'); } }, BR.icon('back', 16), T('dc.close')));
      pv.appendChild(H('h4', null, BR.tt(sel, 'title')));
      pv.appendChild(H('p', { class: 'sub' }, BR.tt(sel, 'buyer'), ' / ', T('srcn.' + sel.src)));
      pv.appendChild(H('p', null, BR.tt(sel, 'subject')));
      var facts = H('dl', { class: 'facts' });
      [['f.amount', BR.val(sel, 'amount')], ['f.delivery', BR.val(sel, 'delivery')], ['f.deadline', BR.val(sel, 'deadline')], ['dc.cat', T('cat.' + sel.cat)], ['dc.nreq', sel.reqs.length]].forEach(function (f) { facts.appendChild(H('dt', null, T(f[0]))); facts.appendChild(H('dd', null, String(f[1]))); });
      pv.appendChild(facts);
      pv.appendChild(BR.btn(T('dc.add'), function () { if (importOne(sel)) { D_.sel = null; BR.toast(sel.stage === 'inbox' ? T('dc.added') : T('dc.filteredmsg')); BR.changed('tender'); } }, '', { 'data-key': 'dadd' }));
      list.appendChild(pv);
    }
    root.appendChild(list);
  }

  function dSources(root) {
    var rows = BR.SOURCES.map(function (s) {
      var st = S.src[s.id];
      var sw = H('label', { class: 'sw' }, H('input', { type: 'checkbox', checked: !!st.on, 'data-key': 'sw-' + s.id, onchange: function () {
        if (!BR.guard('settings')) { this.checked = !!st.on; return; } st.on = this.checked ? 1 : 0; BR.logAdd('other', st.on ? 'lg.src.on' : 'lg.src.off', { sid: s.id }); BR.changed('mod');
      } }), H('span', null, T(st.on ? 'on' : 'off')));
      return { cells: [H('span', { class: 'src' }, BR.icon(s.type === 'email' ? 'email' : 'portal', 14), H('b', null, T('srcn.' + s.id))), T('stype.' + s.type), sw, st.on ? BR.ago(Date.now() - st.sync * 60000) : '-',
        BR.btn(T('src.sync'), function () {
          if (!st.on) { BR.toast(T('src.off'), 'warn'); return; }
          st.sync = 0; var q = S.queue.filter(function (x) { return BR.byId(x.id).src === s.id; })[0];
          if (q) { S.queue.splice(S.queue.indexOf(q), 1); BR.arrive(BR.byId(q.id), s.id); BR.toast(T('src.found')); } else BR.toast(T('src.nonew'));
          BR.changed('tender');
        }, 'btn-ghost', { 'data-key': 'sync-' + s.id })] };
    });
    root.appendChild(BR.section(T('src.h'), BR.table([{ label: T('src.c.name'), w: '1.6fr' }, { label: T('src.c.type'), w: '.8fr' }, { label: T('src.c.on'), w: '.8fr' }, { label: T('src.c.sync'), w: '1fr' }, { label: '', w: '1fr' }], rows)));
    // rules
    var rb = H('div', { class: 'rules' });
    rb.appendChild(H('div', { class: 'fld' }, H('span', { class: 'fld-l' }, T('rule.inc')), BR.chips(T('rule.inc'), BR.CATS.map(function (c) { return { id: c, label: T('cat.' + c) }; }), S.rules.inc, function (id) {
      if (!BR.guard('settings')) return; var i = S.rules.inc.indexOf(id); if (i >= 0) S.rules.inc.splice(i, 1); else S.rules.inc.push(id); BR.logAdd('other', 'lg.rule', {}); BR.changed('mod');
    }, true)));
    var kw = H('input', { class: 'inp', maxlength: 24, value: D_.kw, 'data-key': 'rkw', placeholder: T('rule.kwph'), 'aria-label': T('rule.exc'), oninput: function () { D_.kw = this.value; } });
    kw.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addKw(); } });
    function addKw() {
      if (!BR.guard('settings')) return; var w = D_.kw.trim().toLowerCase();
      if (w.length < 3) { BR.toast(T('rule.kwshort'), 'warn'); return; }
      if (S.rules.exc.indexOf(w) >= 0) { BR.toast(T('rule.kwdup'), 'warn'); return; }
      S.rules.exc.push(w); D_.kw = ''; var n = BR.applyRules(); BR.logAdd('other', 'lg.rule', {}); BR.toast(T('rule.applied', { n: n })); BR.changed('tender');
    }
    var tags = H('div', { class: 'tags' }, S.rules.exc.map(function (w) {
      return H('span', { class: 'tg' }, w, H('button', { type: 'button', 'aria-label': T('btn.remove') + ' ' + w, onclick: function () { if (!BR.guard('settings')) return; S.rules.exc.splice(S.rules.exc.indexOf(w), 1); var n = BR.applyRules(); BR.toast(T('rule.applied', { n: n })); BR.changed('tender'); } }, BR.icon('x', 12)));
    }));
    rb.appendChild(H('div', { class: 'fld' }, H('span', { class: 'fld-l' }, T('rule.exc')), H('div', { class: 'addline' }, kw, BR.btn(T('rule.add'), addKw, '', { 'data-key': 'radd' })), tags));
    rb.appendChild(BR.field(T('rule.min'), BR.select([1, 2, 3].map(function (n) { return { id: n, label: T('dc.minamt', { n: ['X', '2X', '3X'][n - 1] }) }; }), S.rules.minAmt, function (v) {
      if (!BR.guard('settings')) { BR.changed('mod'); return; } S.rules.minAmt = parseInt(v, 10); var n = BR.applyRules(); BR.toast(T('rule.applied', { n: n })); BR.changed('tender');
    }, 'rmin')));
    root.appendChild(BR.section(T('rule.h'), rb));
    // filtered
    var fl = S.tenders.filter(function (t) { return t.stage === 'filtered'; });
    root.appendChild(BR.section(T('flt.h', { n: fl.length }), fl.length ? H('ul', { class: 'lst' }, fl.map(function (t) {
      return H('li', null, H('span', { class: 'lnk-t' }, BR.tt(t, 'title')), H('span', { class: 'sub' }, T('flt.by', { word: t.filterWord === 'min' ? T('rule.minamt') : t.filterWord })),
        BR.btn(T('flt.restore'), function () { if (!BR.guard('move')) return; t.stage = 'inbox'; t.filterWord = null; BR.logAdd('other', 'lg.restored', { tid: t.id }); BR.changed('tender'); }, 'btn-ghost'));
    })) : BR.empty(T('flt.none'))));
    // duplicates
    var dups = S.tenders.filter(function (t) { return t.dupOf && t.stage === 'inbox'; });
    root.appendChild(BR.section(T('dup.h'), dups.length ? H('ul', { class: 'lst' }, dups.map(function (t) {
      var p = BR.byId(t.dupOf);
      return H('li', { class: 'dup' }, H('span', { class: 'lnk-t' }, T('dup.t', { a: BR.tt(t, 'title'), b: BR.tt(p, 'title') })),
        BR.btn(T('dup.merge'), function () { if (!BR.guard('move')) return; t.stage = 'merged'; p.updates.push({ at: Date.now(), k: 'upd.merged' }); BR.logAdd('other', 'lg.merged', { tid: t.id }); BR.toast(T('dup.merged')); BR.changed('tender'); }, '', { 'data-key': 'merge' + t.id }),
        BR.btn(T('dup.keep'), function () { t.dupOf = null; BR.logAdd('other', 'lg.keepboth', { tid: t.id }); BR.changed('tender'); }, 'btn-ghost'));
    })) : BR.empty(T('dup.none'))));
  }

  var IMP = { txt: '', err: [] };
  function dImport(root) {
    var ta = H('textarea', { class: 'inp', rows: 5, 'data-key': 'imp', placeholder: T('imp.ph'), 'aria-label': T('imp.h'), oninput: function () { IMP.txt = this.value; } }, IMP.txt);
    ta.value = IMP.txt;
    var out = H('div', { class: 'imp-out' });
    root.appendChild(BR.section(T('imp.h'), H('div', null, H('p', { class: 'note' }, T('imp.hint')), ta, H('div', { class: 'cta-line' }, BR.btn(T('imp.run'), function () {
      if (!BR.guard('create')) return;
      var lines = IMP.txt.split('\n').map(function (l) { return l.trim(); }).filter(Boolean), ok = 0, errs = [];
      lines.forEach(function (l, i) {
        var p = l.split(';').map(function (x) { return x.trim(); }), d = parseInt(p[2], 10);
        if (p.length !== 3 || p[0].length < 3 || p[1].length < 2 || !(d >= 1 && d <= 90)) { errs.push(T('imp.bad', { n: i + 1 })); return; }
        var t = BR.mkTenders()[6]; t.id = 200 + S.tenders.length; t.raw = p[0]; t.rawBuyer = p[1]; t.due = d; t.dupOf = null; t.ps = 0; t.reviewed = false; t.src = 'mail'; t.owner = 'dana';
        t.versions = []; t.updates = []; t.comments = []; t.att = {}; t.ov = {}; S.tenders.push(t); BR.arrive(t, 'mail'); ok++;
      });
      IMP.err = errs; if (ok) { IMP.txt = ''; BR.logAdd('other', 'lg.imported', { n: ok }); BR.toast(T('imp.done', { n: ok })); } else if (!lines.length) IMP.err = [T('imp.empty')];
      BR.changed('tender');
    }, '', { 'data-key': 'imprun' }), BR.btn(T('imp.sample'), function () { IMP.txt = T('imp.sample.txt'); BR.changed('mod'); }, 'btn-ghost')), out)));
    IMP.err.forEach(function (e) { out.appendChild(H('p', { class: 'fld-e', role: 'alert' }, e)); });
    root.appendChild(BR.section(T('exp.h'), H('div', { class: 'cta-line' },
      BR.btn(T('exp.pipeline'), function () {
        BR.csv('pipeline.csv', [['id', T('pl.c.title'), T('pl.c.buyer'), T('pl.c.stage'), T('pl.c.due'), T('pl.c.owner')]].concat(S.tenders.filter(BR.inPipeline).map(function (t) { return [t.id, BR.tt(t, 'title'), BR.tt(t, 'buyer'), T('stage.' + t.stage), t.due, BR.name(t.owner)]; })));
        BR.logAdd('other', 'lg.exported', {});
      }, 'btn-ghost', { 'data-key': 'exp1' }), H('span', { class: 'sub' }, T('exp.hint')))));
  }

  /* ================= bids ================= */
  var B_ = { sel: null, res: 'won', reason: 'price' };
  function narrowQ() { return window.matchMedia('(max-width: 860px)').matches; }
  function stepState(t) {
    var v = t.ps === 2 ? BR.verdict(S, t) : null;
    var done = { intake: true, parse: t.ps === 2, extract: t.ps === 2, qual: t.ps === 2, draft: t.draftDone, review: t.approval === 'approved', submit: t.submitted };
    var cur = -1, out = {};
    BR.STEPS.forEach(function (s, i) { if (!done[s] && cur < 0) cur = i; });
    BR.STEPS.forEach(function (s, i) { out[s] = done[s] ? 'done' : (i === cur ? 'now' : 'todo'); });
    return out;
  }
  M.bids = function (root) {
    var list = S.tenders.filter(function (t) { return ['bid', 'submitted', 'won', 'lost'].indexOf(t.stage) >= 0; });
    if (!list.length) { root.appendChild(BR.empty(T('bd.none'))); return; }
    if (B_.sel == null && S.bidSel) { B_.sel = S.bidSel; S.bidSel = null; }
    if (B_.sel && !list.some(function (t) { return t.id === B_.sel; })) B_.sel = null;
    if (!B_.sel && !narrowQ()) { var f1 = list.filter(function (t) { return t.stage === 'bid'; })[0]; if (f1) B_.sel = f1.id; }
    var wrap = H('div', { class: 'bids' + (B_.sel ? ' has' : '') });
    var left = H('div', { class: 'bleft' }, H('h4', null, T('bd.list')));
    list.forEach(function (t) {
      var items = BR.checkItems(t), ready = items.filter(function (k) { return BR.attached(t, k); }).length;
      left.appendChild(H('button', { type: 'button', class: 'tcard' + (B_.sel === t.id ? ' on' : ''), 'data-key': 'bl' + t.id, onclick: function () { B_.sel = t.id; BR.changed('mod'); } },
        H('span', { class: 'tc-title' }, BR.tt(t, 'title')), H('span', { class: 'tc-buyer' }, BR.tt(t, 'buyer')),
        H('span', { class: 'tc-foot' }, H('span', { class: 'stg' }, T('stage.' + t.stage)), t.stage === 'bid' ? H('span', { class: 'sub' }, T('bid.progress', { n: ready, m: items.length })) : null)));
    });
    wrap.appendChild(left);
    var t = B_.sel && BR.byId(B_.sel), right = H('div', { class: 'bright' });
    if (!t) right.appendChild(BR.empty(T('bd.pick'))); else bidDetail(right, t);
    wrap.appendChild(right);
    root.appendChild(wrap);
  };
  function bidDetail(right, t) {
    right.appendChild(H('button', { type: 'button', class: 'back', onclick: function () { B_.sel = null; BR.changed('mod'); } }, BR.icon('back', 16), T('bd.list')));
    right.appendChild(H('div', { class: 'bd-head' }, H('h3', { class: 'mh-title' }, BR.tt(t, 'title')), H('p', { class: 'mh-meta' }, BR.srcLabel(t), H('span', null, BR.tt(t, 'buyer')), BR.dueChip(t), BR.vdBadge(t)),
      BR.btn(T('bd.opentender'), function () { BR.openTender(t.id); }, 'btn-ghost')));
    var locked = t.stage !== 'bid';
    var ss = stepState(t), ol = H('ol', { class: 'flow' });
    BR.STEPS.forEach(function (s) { ol.appendChild(H('li', { class: 'fl-' + ss[s] }, H('span', { class: 'fl-dot' }, ss[s] === 'done' ? BR.icon('check', 14) : null), H('span', { class: 'fl-tx' }, T('w.' + s), H('i', null, T('w.' + ss[s]))))); });
    right.appendChild(BR.section(T('bid.flow'), ol));
    if (t.ps !== 2) { right.appendChild(H('p', { class: 'locked' }, T('bid.needparse'))); return; }
    var items = BR.checkItems(t), ready = items.filter(function (k) { return BR.attached(t, k); }).length;
    var ul = H('ul', { class: 'ck' });
    items.forEach(function (k) {
      var on = BR.attached(t, k), li = H('li', { class: on ? 'on' : 'off' }, H('span', { class: 'ck-m' }, BR.icon(on ? 'check' : 'plus', 14)),
        H('span', { class: 'ck-t' }, T('ck.' + k), H('i', null, on ? T('ck.attached') + (k === 'form' ? ', ' + T('ck.draft') : (t.att[k] === undefined ? ', ' + T('ck.lib') : '')) : T('ck.missing'))));
      if (k !== 'form' && !locked) li.appendChild(BR.btn(on ? T('ck.detach') : T('ck.attach'), function () { if (!BR.guard('move')) return; t.att[k] = !on; if (t.approval !== 'none') t.approval = 'none'; BR.changed('tender'); }, 'btn-ghost', { 'data-key': 'ck-' + k }));
      ul.appendChild(li);
    });
    right.appendChild(BR.section(T('bid.check.h'), H('div', null, H('div', { class: 'pbar-t' }, H('i', { style: 'width:' + Math.round(ready / items.length * 100) + '%' })), H('p', { class: 'sub' }, T('bid.progress', { n: ready, m: items.length })), ul)));
    // draft
    var running = t.draftN >= 0 && !t.draftDone;
    var gen = BR.btn(running ? T('bid.drafting') : T(t.draftN >= 0 ? 'bid.regen' : 'bid.gen'), function () { if (!BR.guard('parse')) return; BR.startDraft(t); BR.changed('tender'); }, '', { disabled: running || locked, 'data-key': 'gen' });
    var dr = H('pre', { class: 'draft' + (t.draftN < 0 ? ' empty' : ''), id: 'draft' }, t.draftN >= 0 ? BR.draftText(t) : T('bid.draft.empty'));
    var vers = H('div', { class: 'vers' });
    t.versions.slice().reverse().forEach(function (v) {
      vers.appendChild(BR.btn('v' + v.n + ' / ' + BR.name(v.who) + ' / ' + BR.ago(v.at), function () { t.draft = v.text; t.draftN = v.text.length; t.draftDone = true; t.att.form = true; BR.changed('mod'); }, 'btn-ghost vbtn'));
    });
    right.appendChild(BR.section(T('bid.draft.h'), H('div', null, dr, vers.childNodes.length ? H('div', null, H('span', { class: 'fld-l' }, T('bid.versions')), vers) : null), gen));
    // approval
    var ap = H('div', { class: 'appr' });
    ap.appendChild(H('p', null, H('b', null, T('ap.' + t.approval)), ' ', H('span', { class: 'sub' }, t.approvedBy ? T('ap.by', { who: BR.name(t.approvedBy) }) : '')));
    var ready2 = BR.bidReady(t);
    if (!locked) {
      if (t.approval === 'none' || t.approval === 'rejected') ap.appendChild(BR.btn(T('ap.request'), function () {
        if (!ready2) { BR.toast(T('bid.hint'), 'warn'); return; } if (!BR.guard('move')) return; t.approval = 'requested'; BR.logAdd('stage', 'lg.apreq', { tid: t.id }); BR.changed('tender');
      }, '', { 'data-key': 'apreq', disabled: !ready2 }));
      if (t.approval === 'requested') {
        ap.appendChild(BR.btn(T('ap.approve'), function () { if (!BR.guard('approve')) return; t.approval = 'approved'; t.approvedBy = S.me; BR.logAdd('stage', 'lg.approved', { tid: t.id }); BR.changed('tender'); }, '', { 'data-key': 'apok' }));
        ap.appendChild(BR.btn(T('ap.reject'), function () { if (!BR.guard('approve')) return; t.approval = 'rejected'; BR.logAdd('stage', 'lg.aprej', { tid: t.id }); BR.changed('tender'); }, 'btn-ghost', { 'data-key': 'aprej' }));
      }
      if (t.approval === 'approved') ap.appendChild(BR.btn(T('bid.submit'), function () {
        if (!BR.guard('move')) return; t.submitted = true; if (!BR.move(t, 'submitted')) t.submitted = false; else BR.toast(T('bid.submitted'));
        BR.changed('tender');
      }, '', { 'data-key': 'submit' }));
      if (t.approval === 'none') ap.appendChild(H('p', { class: 'sub' }, T('bid.hint')));
    }
    right.appendChild(BR.section(T('ap.h'), ap));
    if (t.stage === 'submitted') {
      var res = H('div', { class: 'toolbar wrap' }, BR.select([{ id: 'won', label: T('res.won') }, { id: 'lost', label: T('res.lost') }], B_.res, function (v) { B_.res = v; BR.changed('mod'); }, 'res'),
        B_.res === 'lost' ? BR.select(['price', 'docs', 'exp', 'other'].map(function (r) { return { id: r, label: T('why.' + r) }; }), B_.reason, function (v) { B_.reason = v; }, 'reason') : null,
        BR.btn(T('res.record'), function () {
          if (!BR.guard('move')) return;
          if (BR.move(t, B_.res)) {
            t.result = B_.res; t.lossReason = B_.res === 'lost' ? B_.reason : null;
            S.kb.push({ id: 'k' + (S.kb.length + 1), tid: t.id, outcome: B_.res, cat: t.cat, buyer: ((t.id - 1) % 8) + 1 }); BR.logAdd('stage', 'lg.kbadd', { tid: t.id });
            BR.changed('tender');
          }
        }, '', { 'data-key': 'rec' }));
      right.appendChild(BR.section(T('res.h'), res));
    }
  }
  BR.syncDraft = function () {
    var d = doc.getElementById('draft'), tid = B_.sel; if (!d || !tid) return;
    var t = BR.byId(tid); if (t) { d.textContent = BR.draftText(t); d.scrollTop = d.scrollHeight; }
  };
  BR.goBid = function (id) { S.bidSel = id; };

  /* ================= qualification ================= */
  var Q_ = { tab: 'profile', form: null, errs: {} };
  M.qual = function (root) {
    root.appendChild(BR.tabs([{ id: 'profile', label: T('ql.profile') }, { id: 'docs', label: T('ql.docs') }, { id: 'matrix', label: T('ql.matrix') }], S.tabQ, function (id) { S.tabQ = id; BR.changed('mod'); }, T('nav.qual')));
    ({ profile: qProfile, docs: qDocs, matrix: qMatrix })[S.tabQ] ? ({ profile: qProfile, docs: qDocs, matrix: qMatrix })[S.tabQ](root) : qProfile(root);
  };
  function qProfile(root) {
    var P = S.profile;
    if (!Q_.form) Q_.form = { exp: P.exp, A: P.lic.A, B: P.lic.B, C: P.lic.C, staff: P.staff, warr: P.warr, fin: P.fin };
    var F = Q_.form, ro = !BR.can('profile');
    var num = function (k, min, max) { return H('input', { class: 'inp num', type: 'number', min: min, max: max, value: F[k], disabled: ro, 'data-key': 'pf-' + k, oninput: function () { F[k] = this.value; } }); };
    var form = H('div', { class: 'form grid2' });
    form.appendChild(BR.field(T('ql.exp'), num('exp', 0, 40), Q_.errs.exp));
    form.appendChild(BR.field(T('ql.warr'), num('warr', 0, 120), Q_.errs.warr));
    form.appendChild(BR.field(T('ql.staff'), BR.select([1, 2, 3].map(function (n) { return { id: n, label: T('p.staff', { n: n }) }; }), F.staff, function (v) { F.staff = parseInt(v, 10); }, 'pf-staff')));
    form.appendChild(BR.field(T('ql.fin'), BR.select([1, 2, 3].map(function (n) { return { id: n, label: T('p.fin', { n: n }) }; }), F.fin, function (v) { F.fin = parseInt(v, 10); }, 'pf-fin')));
    var lic = H('div', { class: 'fld' }, H('span', { class: 'fld-l' }, T('ql.lic')), H('div', { class: 'chk' }, ['A', 'B', 'C'].map(function (c) {
      return H('label', { class: 'fit' }, H('input', { type: 'checkbox', checked: !!F[c], disabled: ro, 'data-key': 'pf-' + c, onchange: function () { F[c] = this.checked ? 1 : 0; } }), H('span', null, T('v.lic', { c: c })));
    })));
    form.appendChild(lic);
    root.appendChild(BR.section(T('ql.profile.h'), H('div', null, H('p', { class: 'note' }, T('ql.profile.note')), form,
      H('div', { class: 'cta-line' }, BR.btn(T('ql.save'), function () {
        if (!BR.guard('profile')) return;
        Q_.errs = {}; var e = parseInt(F.exp, 10), w = parseInt(F.warr, 10);
        if (!(e >= 0 && e <= 40)) Q_.errs.exp = T('form.range', { a: 0, b: 40 });
        if (!(w >= 0 && w <= 120)) Q_.errs.warr = T('form.range', { a: 0, b: 120 });
        if (Q_.errs.exp || Q_.errs.warr) { BR.toast(T('form.invalid'), 'warn'); BR.changed('mod'); return; }
        var before = {}; S.tenders.forEach(function (t) { if (t.ps === 2) before[t.id] = BR.verdict(S, t).go; });
        P.exp = e; P.warr = w; P.staff = F.staff; P.fin = F.fin; P.lic = { A: F.A ? 1 : 0, B: F.B ? 1 : 0, C: F.C ? 1 : 0 };
        var diff = 0; S.tenders.forEach(function (t) { if (t.ps === 2 && before[t.id] !== BR.verdict(S, t).go) diff++; });
        BR.logAdd('doc', 'lg.profile', { n: diff }); BR.toast(T('ql.saved', { n: diff })); BR.changed('tender');
      }, '', { 'data-key': 'pfsave', disabled: ro }), ro ? H('span', { class: 'sub' }, T('ql.readonly')) : null))));
  }
  function qDocs(root) {
    var rows = S.docs.map(function (d) {
      var st = BR.docStatus(S, d.id), cls = st === 'valid' ? 'ok' : (st === 'soon' ? 'warn' : 'bad');
      return { cells: [H('b', null, T('doc.' + d.id)), BR.badge(cls, T('ds.' + st)), d.present && d.exp != null ? BR.fmt(d.exp, true) : (d.present ? T('ql.noexp') : '-'),
        H('span', { class: 'rowbtns' }, BR.btn(d.present ? T('ql.renew') : T('ql.upload'), function () { renewDialog(d); }, 'btn-ghost', { 'data-key': 'rn-' + d.id }),
          d.present ? BR.btn(T('btn.remove'), function () { if (!BR.guard('profile')) return; d.present = false; BR.logAdd('doc', 'lg.docrm', { did: d.id }); BR.changed('tender'); }, 'btn-ghost') : null)] };
    });
    root.appendChild(BR.section(T('ql.docs.h'), H('div', null, H('p', { class: 'note' }, T('ql.docs.note')), BR.table([{ label: T('ql.c.doc'), w: '1.6fr' }, { label: T('ql.c.status'), w: '1fr' }, { label: T('ql.c.until'), w: '1fr' }, { label: '', w: '1.6fr' }], rows))));
  }
  function renewDialog(d) {
    if (!BR.guard('profile')) return;
    var sel = BR.select([{ id: 6, label: T('ql.m', { n: 6 }) }, { id: 12, label: T('ql.m', { n: 12 }) }, { id: 24, label: T('ql.m', { n: 24 }) }, { id: 0, label: T('ql.noexp') }], 12, function () { }, 'rn-m');
    BR.dialog(T('ql.renew.h', { doc: T('doc.' + d.id) }), BR.field(T('ql.validity'), sel), [
      BR.btn(T('btn.cancel'), BR.closeDialog, 'btn-ghost'),
      BR.btn(T('ql.confirm'), function () {
        var m = parseInt(sel.value, 10); d.present = true; d.exp = m ? m * 30 : null; BR.closeDialog(); BR.logAdd('doc', 'lg.docup', { did: d.id }); BR.toast(T('ql.docup')); BR.changed('tender');
      })]);
  }
  function qMatrix(root) {
    var ids = ['exp', 'lic', 'staff', 'warr', 'fin', 'ins'];
    var ts = S.tenders.filter(function (t) { return BR.activeStage(t) || t.stage === 'rejected'; });
    var cols = [{ label: T('pl.c.title'), w: '1.8fr' }].concat(ids.map(function (i) { return { label: T('f.' + i), w: '.9fr' }; })).concat([{ label: T('verdict.h'), w: '.8fr' }]);
    var rows = ts.map(function (t) {
      return { key: t.id, onclick: function () { BR.openTender(t.id, t.ps === 2 ? 'qual' : 'analysis'); }, cells: [H('b', null, BR.tt(t, 'title'))].concat(ids.map(function (i) {
        if (t.ps !== 2) return H('span', { class: 'sub' }, '-');
        if (t.reqs.indexOf(i) < 0) return H('span', { class: 'sub' }, T('mx.na'));
        var st = BR.effSt(S, t, i); return H('span', { class: 'qchip ' + st }, BR.icon(st === 'ok' ? 'check' : (st === 'fail' ? 'x' : 'docu'), 14), BR.val(t, i));
      })).concat([t.ps === 2 ? BR.vdBadge(t) : H('span', { class: 'sub' }, T('mx.notparsed'))]) };
    });
    root.appendChild(BR.section(T('ql.matrix.h'), H('div', null, H('p', { class: 'note' }, T('ql.matrix.note')), BR.table(cols, rows, 'matrix'))));
  }

  /* ================= calendar ================= */
  var C_ = { off: 0, day: 0, types: ['deadline', 'doc', 'task'] };
  function events() {
    var ev = [];
    S.tenders.forEach(function (t) {
      if (BR.activeStage(t)) ev.push({ d: t.due, type: 'deadline', text: BR.tt(t, 'title'), sub: T('cal.deadline'), tid: t.id });
      if (t.stage === 'bid') ev.push({ d: t.due - 2, type: 'task', text: T('cal.plan', { title: BR.tt(t, 'title') }), tid: t.id });
    });
    S.docs.forEach(function (d) { if (d.present && d.exp != null) ev.push({ d: d.exp, type: 'doc', text: T('doc.' + d.id), sub: T('cal.expires') }); });
    S.tasks.forEach(function (k) { if (!k.done) ev.push({ d: k.due, type: 'task', text: M.taskText(k), sub: BR.name(k.who), tid: k.tid }); });
    return ev.filter(function (e) { return C_.types.indexOf(e.type) >= 0; });
  }
  M.calendar = function (root) {
    var base = new Date(BR.today.getFullYear(), BR.today.getMonth() + C_.off, 1), y = base.getFullYear(), mo = base.getMonth();
    var ev = events(), dim = new Date(y, mo + 1, 0).getDate(), lead = (base.getDay() + 6) % 7;
    var head = H('div', { class: 'toolbar wrap' }, BR.btn(T('cal.prev'), function () { C_.off--; BR.changed('mod'); }, 'btn-ghost', { 'aria-label': T('cal.prev') }),
      H('h4', { class: 'cal-t' }, base.toLocaleDateString(BR.loc(), { month: 'long', year: 'numeric' })),
      BR.btn(T('cal.next'), function () { C_.off++; BR.changed('mod'); }, 'btn-ghost', { 'aria-label': T('cal.next') }),
      BR.btn(T('cal.today'), function () { C_.off = 0; C_.day = 0; BR.changed('mod'); }, 'btn-ghost'),
      BR.chips(T('cal.types'), [{ id: 'deadline', label: T('cal.t.deadline') }, { id: 'doc', label: T('cal.t.doc') }, { id: 'task', label: T('cal.t.task') }], C_.types, function (id) { var i = C_.types.indexOf(id); if (i >= 0) C_.types.splice(i, 1); else C_.types.push(id); BR.changed('mod'); }, true));
    root.appendChild(head);
    var grid = H('div', { class: 'cal', role: 'grid' });
    for (var w = 0; w < 7; w++) grid.appendChild(H('div', { class: 'cal-w', role: 'columnheader' }, new Date(2024, 0, 1 + w).toLocaleDateString(BR.loc(), { weekday: 'short' })));
    for (var i = 0; i < lead; i++) grid.appendChild(H('div', { class: 'cal-c blank' }));
    for (var day = 1; day <= dim; day++) {
      (function (dayN) {
        var off = Math.round((new Date(y, mo, dayN) - BR.today) / 86400000), list = ev.filter(function (e) { return e.d === off; });
        var cell = H('button', { type: 'button', class: 'cal-c' + (off === 0 ? ' today' : '') + (C_.day === off && C_.sel ? ' sel' : ''), 'data-key': 'cd' + off, 'aria-label': new Date(y, mo, dayN).toLocaleDateString(BR.loc(), { day: 'numeric', month: 'long' }) + ': ' + T('cal.n', { n: list.length }), onclick: function () { C_.day = off; C_.sel = true; BR.changed('mod'); } },
          H('b', null, dayN), H('span', { class: 'dots' }, list.slice(0, 4).map(function (e) { return H('i', { class: 'dot ' + e.type }); })), H('span', { class: 'cal-ev' }, list.length ? list[0].text : ''));
        grid.appendChild(cell);
      }(day));
    }
    root.appendChild(grid);
    var dl = ev.filter(function (e) { return e.d === C_.day; });
    root.appendChild(BR.section(T('cal.day', { d: BR.fmt(C_.day, true) }), dl.length ? H('ul', { class: 'lst' }, dl.map(function (e) {
      return H('li', null, H('i', { class: 'dot ' + e.type }), H('span', { class: 'lnk-t' }, e.text), H('span', { class: 'sub' }, e.sub || ''), e.tid ? BR.btn(T('cal.open'), function () { BR.openTender(e.tid); }, 'btn-ghost') : null);
    })) : BR.empty(T('cal.empty'))));
  };

  /* ================= tasks ================= */
  var K_ = { f: 'open', text: '', tid: 'none', who: 'dana', due: 3, err: '' };
  M.taskText = function (k) {
    if (k.text) return k.text;
    var t = k.tid != null ? BR.byId(k.tid) : null;
    return T('task.tpl.' + k.tpl, { title: t ? BR.tt(t, 'title') : '' });
  };
  M.tasks = function (root) {
    root.appendChild(BR.chips(T('nav.tasks'), [{ id: 'open', label: T('tk.open') }, { id: 'mine', label: T('tk.mine') }, { id: 'done', label: T('tk.done') }, { id: 'all', label: T('tk.all') }], K_.f, function (v) { K_.f = v; BR.changed('mod'); }));
    var txt = H('input', { class: 'inp', maxlength: 90, value: K_.text, 'data-key': 'tk-text', placeholder: T('tk.ph'), 'aria-label': T('tk.ph'), oninput: function () { K_.text = this.value; } });
    var act = S.tenders.filter(BR.activeStage);
    var form = H('div', { class: 'toolbar wrap taskform' }, BR.field(T('tk.what'), txt, K_.err),
      BR.field(T('tk.tender'), BR.select([{ id: 'none', label: T('tk.none') }].concat(act.map(function (t) { return { id: t.id, label: BR.tt(t, 'title') }; })), K_.tid, function (v) { K_.tid = v; }, 'tk-t')),
      BR.field(T('tk.who'), BR.select(S.members.map(function (m) { return { id: m.id, label: m.name }; }), K_.who, function (v) { K_.who = v; }, 'tk-w')),
      BR.field(T('tk.due'), BR.select([1, 2, 3, 5, 7, 14].map(function (n) { return { id: n, label: T('tk.in', { n: n }) }; }), K_.due, function (v) { K_.due = parseInt(v, 10); }, 'tk-d')),
      BR.btn(T('tk.add'), function () {
        if (!BR.guard('create')) return;
        if (K_.text.trim().length < 3) { K_.err = T('form.min', { n: 3 }); BR.changed('mod'); return; }
        K_.err = ''; S.tasks.push({ id: S.taskId++, text: K_.text.trim(), tid: K_.tid === 'none' ? null : parseInt(K_.tid, 10), who: K_.who, due: K_.due, done: false, auto: 0 });
        BR.logAdd('other', 'lg.taskadd', { mid: K_.who }); K_.text = ''; BR.toast(T('tk.added')); BR.changed('tender');
      }, '', { 'data-key': 'tk-add' }));
    root.appendChild(form);
    var list = S.tasks.filter(function (k) { return K_.f === 'all' || (K_.f === 'open' && !k.done) || (K_.f === 'done' && k.done) || (K_.f === 'mine' && k.who === S.me && !k.done); }).sort(function (a, b) { return a.due - b.due; });
    var rows = list.map(function (k) {
      var t = k.tid != null ? BR.byId(k.tid) : null;
      return { cls: k.done ? 'done' : '', cells: [H('label', { class: 'fit' }, H('input', { type: 'checkbox', checked: k.done, 'data-key': 'tkc' + k.id, onchange: function () { k.done = this.checked; BR.logAdd('other', k.done ? 'lg.taskdone' : 'lg.taskopen', { text: M.taskText(k) }); BR.changed('tender'); } }), H('span', null, M.taskText(k))),
        t ? BR.titleLink(t) : '-', H('span', null, BR.avatar(k.who), ' ', BR.name(k.who)), H('span', { class: 'due' + (k.due < 0 && !k.done ? ' hot' : '') }, BR.fmt(k.due)), k.auto ? BR.badge('info', T('tk.auto')) : '',
        BR.btn(T('btn.remove'), function () { S.tasks.splice(S.tasks.indexOf(k), 1); BR.changed('tender'); }, 'btn-ghost')] };
    });
    root.appendChild(BR.table([{ label: T('tk.what'), w: '2.2fr' }, { label: T('tk.tender'), w: '1.6fr' }, { label: T('tk.who'), w: '1fr' }, { label: T('tk.due'), w: '.8fr' }, { label: '', w: '.7fr' }, { label: '', w: '.8fr' }], rows));
    if (!rows.length) root.appendChild(BR.empty(T('tk.empty')));
  };
}());
