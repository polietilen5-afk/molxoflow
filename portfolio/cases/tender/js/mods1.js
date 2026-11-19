/* Bid Radar demo: overview, pipeline and the tender drawer. */
(function () {
  'use strict';
  var BR = window.BR, S = BR.S, H = BR.h, T = BR.T, doc = document;
  var M = BR.mods = BR.mods || {};

  function titleLink(t) {
    return H('button', { type: 'button', class: 'lnk', onclick: function () { BR.openTender(t.id); } }, BR.tt(t, 'title'));
  }
  function dueChip(t) {
    var cls = t.due < 0 ? 'past' : (t.due <= S.settings.lead ? 'hot' : '');
    return H('span', { class: 'due ' + cls }, BR.icon('clock', 14), t.due < 0 ? T('due.past', { n: -t.due }) : T('due', { n: t.due }));
  }
  function srcLabel(t) {
    var typ = BR.SOURCES.filter(function (s) { return s.id === t.src; })[0].type;
    return H('span', { class: 'src' }, BR.icon(typ === 'email' ? 'email' : 'portal', 14), T('srcn.' + t.src));
  }
  BR.titleLink = titleLink; BR.dueChip = dueChip; BR.srcLabel = srcLabel;

  /* ================= overview ================= */
  M.overview = function (root) {
    var act = S.tenders.filter(BR.activeStage);
    var cnt = function (st) { return S.tenders.filter(function (t) { return t.stage === st; }).length; };
    var soonAll = act.filter(function (t) { return t.stage !== 'submitted' && t.due >= 0; }).sort(function (a, b) { return a.due - b.due; }), soon = soonAll.filter(function (t) { return t.due <= 7; });
    var review = S.tenders.filter(function (t) { return t.ps === 2 && BR.inPipeline(t) && BR.activeStage(t) && BR.lowCount(S, t) > 0 && !t.reviewed; });
    var docsSoon = S.docs.filter(function (d) { var s = BR.docStatus(S, d.id); return s === 'soon' || s === 'expired' || s === 'missing'; });
    var tasks = S.tasks.filter(function (k) { return !k.done; }).sort(function (a, b) { return a.due - b.due; }).slice(0, 4);
    var stats = [
      { n: cnt('inbox'), l: T('ov.s.inbox'), mod: 'pipeline' }, { n: cnt('analysis') + cnt('qualified'), l: T('ov.s.work'), mod: 'pipeline' },
      { n: cnt('bid'), l: T('ov.s.bid'), mod: 'bids' }, { n: soon.length, l: T('ov.s.soon'), mod: 'calendar' }
    ];
    var grid = H('div', { class: 'stats' });
    stats.forEach(function (s) {
      grid.appendChild(H('button', { type: 'button', class: 'stat', onclick: function () { BR.go(s.mod); } }, H('b', null, s.n), H('span', null, s.l)));
    });
    root.appendChild(grid);
    var cols = H('div', { class: 'two' });
    var l1 = soonAll.slice(0, 5).map(function (t) { return H('li', null, titleLink(t), H('span', { class: 'sub' }, T('stage.' + t.stage)), dueChip(t)); });
    cols.appendChild(BR.section(T('ov.deadlines'), l1.length ? H('ul', { class: 'lst' }, l1) : BR.empty(T('ov.none'))));
    var l2 = review.map(function (t) { return H('li', null, titleLink(t), H('span', { class: 'sub' }, T('ov.lowfields', { n: BR.lowCount(S, t) })), BR.btn(T('ov.review'), function () { BR.openTender(t.id); }, 'btn-ghost')); });
    cols.appendChild(BR.section(T('ov.review.h'), l2.length ? H('ul', { class: 'lst' }, l2) : BR.empty(T('ov.none'))));
    var l3 = docsSoon.map(function (d) { var s = BR.docStatus(S, d.id); return H('li', null, H('span', { class: 'lnk-t' }, T('doc.' + d.id)), BR.badge(s === 'soon' ? 'warn' : 'bad', T('ds.' + s)), BR.btn(T('ov.renew'), function () { BR.go('qual', 'docs'); }, 'btn-ghost')); });
    cols.appendChild(BR.section(T('ov.docs'), l3.length ? H('ul', { class: 'lst' }, l3) : BR.empty(T('ov.none'))));
    var l4 = tasks.map(function (k) { return H('li', null, H('span', { class: 'lnk-t' }, M.taskText(k)), BR.avatar(k.who), H('span', { class: 'due' }, BR.fmt(k.due))); });
    cols.appendChild(BR.section(T('ov.tasks'), l4.length ? H('ul', { class: 'lst' }, l4) : BR.empty(T('ov.none')), BR.btn(T('ov.all'), function () { BR.go('tasks'); }, 'btn-ghost')));
    root.appendChild(cols);
    var recent = S.log.slice(-6).reverse().map(function (e) { return H('li', null, BR.avatar(e.who), H('span', { class: 'lnk-t' }, BR.logText(e)), H('span', { class: 'sub' }, BR.ago(e.at))); });
    root.appendChild(BR.section(T('ov.recent'), H('ul', { class: 'lst' }, recent), BR.btn(T('ov.all'), function () { BR.go('activity'); }, 'btn-ghost')));
  };

  /* ================= pipeline ================= */
  var PF_ = { view: 'board', owner: 'all', src: 'all', q: '' };
  M.pipeline = function (root) {
    if (PF_.init == null) { PF_.init = 1; if (window.matchMedia('(max-width: 860px)').matches) PF_.view = 'list'; }
    var bar = H('div', { class: 'toolbar' });
    bar.appendChild(H('input', { class: 'search', type: 'search', value: PF_.q, 'data-key': 'pq', placeholder: T('pl.search'), 'aria-label': T('pl.search'), oninput: function () { PF_.q = this.value; BR.changed('mod'); } }));
    bar.appendChild(BR.select([{ id: 'all', label: T('pl.owner.all') }].concat(S.members.map(function (m) { return { id: m.id, label: m.name }; })), PF_.owner, function (v) { PF_.owner = v; BR.changed('mod'); }, 'pown'));
    bar.appendChild(BR.select([{ id: 'all', label: T('pl.src.all') }].concat(BR.SOURCES.map(function (s) { return { id: s.id, label: T('srcn.' + s.id) }; })), PF_.src, function (v) { PF_.src = v; BR.changed('mod'); }, 'psrc'));
    bar.appendChild(BR.chips(T('pl.view'), [{ id: 'board', label: T('pl.board') }, { id: 'list', label: T('pl.list') }], PF_.view, function (v) { PF_.view = v; BR.changed('mod'); }));
    bar.appendChild(BR.btn(T('pl.add'), function () { M.addTenderDialog(); }, '', { 'data-key': 'padd' }));
    root.appendChild(bar);
    var q = PF_.q.toLowerCase();
    var all = S.tenders.filter(function (t) {
      return BR.inPipeline(t) && (PF_.owner === 'all' || t.owner === PF_.owner) && (PF_.src === 'all' || t.src === PF_.src) &&
        (!q || (BR.tt(t, 'title') + ' ' + BR.tt(t, 'buyer')).toLowerCase().indexOf(q) >= 0);
    });
    if (PF_.view === 'list') {
      var rows = all.map(function (t) {
        return { key: t.id, onclick: function () { BR.openTender(t.id); }, cells: [titleLink(t), BR.tt(t, 'buyer'), srcLabel(t), dueChip(t), H('span', { class: 'stg' }, T('stage.' + t.stage)), H('span', null, BR.stBadge(t), ' ', BR.vdBadge(t)), BR.avatar(t.owner)] };
      });
      root.appendChild(BR.table([{ label: T('pl.c.title'), w: '2fr' }, { label: T('pl.c.buyer'), w: '1.3fr' }, { label: T('pl.c.src'), w: '1fr' }, { label: T('pl.c.due'), w: '.9fr' }, { label: T('pl.c.stage'), w: '1fr' }, { label: T('pl.c.state'), w: '1.4fr' }, { label: T('pl.c.owner'), w: '.6fr' }], rows));
      if (!rows.length) root.appendChild(BR.empty(T('feed.empty')));
      return;
    }
    var board = H('div', { class: 'board', 'data-scroll': 'board' });
    BR.STAGES.forEach(function (st) {
      var items = all.filter(function (t) { return t.stage === st; });
      var col = H('div', { class: 'bcol2', 'data-stage': st }, H('h5', null, T('stage.' + st), H('i', null, items.length)));
      col.addEventListener('dragover', function (e) { if (BR.can('move')) { e.preventDefault(); col.classList.add('over'); } });
      col.addEventListener('dragleave', function () { col.classList.remove('over'); });
      col.addEventListener('drop', function (e) {
        e.preventDefault(); col.classList.remove('over');
        var id = parseInt(e.dataTransfer.getData('text/plain'), 10), t = BR.byId(id); if (t) BR.move(t, st);
      });
      items.forEach(function (t) {
        var c = H('div', { class: 'kcard' + (t.fresh ? ' fresh' : ''), draggable: BR.can('move') ? 'true' : null });
        t.fresh = false;
        c.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', String(t.id)); c.classList.add('drag'); });
        c.addEventListener('dragend', function () { c.classList.remove('drag'); });
        c.appendChild(H('button', { type: 'button', class: 'kc-t', 'data-key': 'kc' + t.id, onclick: function () { BR.openTender(t.id); } }, BR.tt(t, 'title')));
        c.appendChild(H('span', { class: 'kc-b' }, BR.tt(t, 'buyer')));
        c.appendChild(H('div', { class: 'kc-f' }, dueChip(t), BR.vdBadge(t), BR.avatar(t.owner)));
        if (t.dupOf && t.stage === 'inbox') c.appendChild(H('span', { class: 'bd warn' }, T('pl.dup')));
        c.appendChild(BR.select(BR.STAGES.map(function (s) { return { id: s, label: T('stage.' + s) }; }), t.stage, function (v) { BR.move(t, v); BR.changed('mod'); }, 'mv' + t.id));
        col.appendChild(c);
      });
      if (!items.length) col.appendChild(H('p', { class: 'kc-empty' }, T('pl.colempty')));
      board.appendChild(col);
    });
    root.appendChild(board);
  };

  M.addTenderDialog = function () {
    if (!BR.guard('create')) return;
    var title = H('input', { class: 'inp', 'data-key': 'dl-title', maxlength: 80 }), buyer = H('input', { class: 'inp', maxlength: 60 });
    var days = H('input', { class: 'inp', type: 'number', min: 1, max: 90, value: 10 });
    var box = BR.dialog(T('add.h'), H('div', { class: 'form' }, BR.field(T('add.title'), title), BR.field(T('add.buyer'), buyer), BR.field(T('add.days'), days)), [
      BR.btn(T('btn.cancel'), BR.closeDialog, 'btn-ghost'),
      BR.btn(T('add.ok'), function () {
        var ok = true;
        [[title, 3], [buyer, 2]].forEach(function (p) { var bad = p[0].value.trim().length < p[1]; p[0].parentNode.classList.toggle('bad', bad); if (bad) ok = false; });
        var dv = parseInt(days.value, 10); if (!(dv >= 1 && dv <= 90)) { ok = false; days.parentNode.classList.add('bad'); } else days.parentNode.classList.remove('bad');
        if (!ok) { BR.toast(T('form.invalid'), 'warn'); return; }
        var t = BR.mkTenders()[6]; t.id = 100 + S.tenders.length; t.stage = 'inbox'; t.raw = title.value.trim(); t.rawBuyer = buyer.value.trim(); t.dupOf = null; t.due = dv; t.ps = 0; t.reviewed = false;
        t.src = 'mail'; t.owner = S.me === 'alex' ? 'dana' : S.me; t.created = Date.now(); t.fresh = true; t.versions = []; t.updates = []; t.comments = []; t.att = {}; t.ov = {};
        S.tenders.push(t); BR.logAdd('stage', 'lg.created', { tid: t.id }); BR.closeDialog(); BR.toast(T('add.done')); BR.changed('tender');
      })
    ]);
    return box;
  };

  /* ================= tender drawer ================= */
  function dTabs() { return [{ id: 'analysis', label: T('dt.analysis') }, { id: 'qual', label: T('dt.qual') }, { id: 'cost', label: T('dt.cost') }, { id: 'bid', label: T('dt.bid') }, { id: 'updates', label: T('dt.updates') }, { id: 'activity', label: T('dt.activity') }]; }
  BR.renderDrawer = function (host) {
    host.innerHTML = '';
    var D = S.drawer, t = D && BR.byId(D.id);
    host.classList.toggle('open', !!t);
    if (!t) return;
    if (t.ps === 0 && D.tab === 'analysis' && BR.can('parse')) BR.startParse(t);
    var head = H('div', { class: 'dr-head' });
    head.appendChild(H('button', { type: 'button', class: 'back', 'data-key': 'dr-close', onclick: function () { S.drawer = null; BR.changed('drawer'); } }, BR.icon('x', 16), T('dr.close')));
    head.appendChild(H('h3', { class: 'mh-title' }, BR.tt(t, 'title')));
    var meta = H('p', { class: 'mh-meta' }, srcLabel(t), H('span', null, BR.tt(t, 'buyer')), dueChip(t));
    head.appendChild(meta);
    var row = H('div', { class: 'dr-ctl' });
    row.appendChild(BR.field(T('dr.stage'), BR.select(BR.STAGES.map(function (s) { return { id: s, label: T('stage.' + s) }; }), t.stage, function (v) { BR.move(t, v); BR.changed('drawer'); }, 'dr-stage')));
    row.appendChild(BR.field(T('dr.owner'), BR.select(S.members.map(function (m) { return { id: m.id, label: m.name }; }), t.owner, function (v) {
      if (!BR.guard('move')) { BR.changed('drawer'); return; } t.owner = v; BR.logAdd('stage', 'lg.owner', { tid: t.id, mid: v }); BR.toast(T('dr.ownerset')); BR.changed('tender');
    }, 'dr-owner')));
    row.appendChild(H('div', { class: 'mh-badges' }, BR.stBadge(t), BR.vdBadge(t), t.stale ? BR.badge('warn', T('dr.stale')) : null));
    head.appendChild(row);
    host.appendChild(head);
    host.appendChild(BR.tabs(dTabs(), D.tab, function (id) { D.tab = id; BR.changed('drawer'); }, T('dr.tabs')));
    var body = H('div', { class: 'dr-body', role: 'tabpanel', 'data-scroll': 'drbody' });
    ({ analysis: analysisTab, qual: qualTab, cost: costTab, bid: bidTab, updates: updatesTab, activity: activityTab })[D.tab](body, t);
    host.appendChild(body);
    if (D.tab === 'analysis') BR.syncParse();
  };

  /* --- analysis --- */
  function analysisTab(body, t) {
    var D = S.drawer;
    var wrap = H('div', { class: 'tp pane-' + D.pane });
    var seg = H('div', { class: 'seg', role: 'group', 'aria-label': T('view.label') });
    ['doc', 'fields'].forEach(function (p) { seg.appendChild(H('button', { type: 'button', 'data-key': 'pane-' + p, 'aria-pressed': D.pane === p ? 'true' : 'false', onclick: function () { D.pane = p; BR.changed('drawer'); } }, T('view.' + p))); });
    wrap.appendChild(seg);
    var cols = H('div', { class: 'cols' });
    cols.appendChild(docCol(t)); cols.appendChild(fieldsCol(t));
    wrap.appendChild(cols);
    body.appendChild(wrap);
  }
  function docCol(t) {
    var col = H('div', { class: 'col col-doc' }), sc = H('div', { class: 'doc-scroll', 'data-scroll': 'doc' });
    var paper = H('div', { class: 'paper' }, H('div', { class: 'scan', 'aria-hidden': 'true' }));
    paper.appendChild(H('div', { class: 'p-head' }, H('div', null, BR.tt(t, 'buyer')), H('div', null, T('doc.ref'))));
    paper.appendChild(H('h4', { class: 'p-title' }, T('doc.title')));
    var n = 0, clauses = ['subject', 'amount', 'delivery', 'deadline'].concat(t.reqs, ['misc']);
    clauses.forEach(function (c) {
      n++;
      var vars = { subject: BR.tt(t, 'subject'), x: ['X', '2X', '3X'][t.amount - 1], c: t.lic, n: ({ delivery: t.delivery, deadline: t.due, exp: t.exp, staff: t.staff, warr: t.warr, fin: t.fin })[c] };
      var txt = T('d.' + c + '.t', vars), body = H('span', { class: 'cb' }, H('b', null, T('d.' + c + '.h') + '. '));
      if (BR.fieldsOf(t).indexOf(c) >= 0) body.appendChild(H('mark', { class: 'frag', 'data-f': c, tabindex: 0, role: 'button', 'data-key': 'frag-' + c, onclick: function () { if (this.classList.contains('hl')) BR.focusField(c); }, onkeydown: function (e) { if ((e.key === 'Enter' || e.key === ' ') && this.classList.contains('hl')) { e.preventDefault(); BR.focusField(c); } } }, txt));
      else body.appendChild(doc.createTextNode(txt));
      paper.appendChild(H('p', { class: 'clause' }, H('span', { class: 'cn' }, n + '.'), body));
    });
    paper.appendChild(H('div', { class: 'p-foot' }, T('doc.page')));
    sc.appendChild(paper); col.appendChild(sc); col.appendChild(H('p', { class: 'doc-hint' }, T('doc.hint')));
    return col;
  }
  function fieldsCol(t) {
    var col = H('div', { class: 'col col-fields' });
    var bar = H('div', { class: 'pbar' }, H('div', { class: 'pbar-l', id: 'pLabel' }), H('div', { class: 'pbar-t' }, H('i', { id: 'pFill' })),
      BR.btn(T('parse.again'), function () { if (BR.guard('parse')) { BR.restartParse(t); BR.changed('drawer'); } }, 'btn-ghost again', { id: 'pAgain', 'data-key': 'again' }));
    col.appendChild(bar);
    var sc = H('div', { class: 'fields-scroll', 'data-scroll': 'fields' });
    sc.appendChild(H('h4', { class: 'fgroup' }, T('fields.facts')));
    BR.FACTS.forEach(function (f) { sc.appendChild(fieldRow(t, f, false)); });
    sc.appendChild(H('h4', { class: 'fgroup' }, T('fields.reqs')));
    t.reqs.forEach(function (f) { sc.appendChild(fieldRow(t, f, true)); });
    col.appendChild(sc);
    col.appendChild(H('div', { class: 'revbox', id: 'revBox' }));
    return col;
  }
  function fieldRow(t, id, req) {
    var r = H('div', { class: 'frow', 'data-f': id, onclick: function () { if (this.classList.contains('done')) BR.focusField(id); } });
    r.appendChild(H('div', { class: 'fr-top' }, H('span', { class: 'fr-name' }, T('f.' + id)), H('span', { class: 'fr-conf', 'data-role': 'conf' })));
    r.appendChild(H('div', { class: 'fr-val', 'data-role': 'val' }));
    r.appendChild(H('div', { class: 'meter', 'data-role': 'meter' }, H('i')));
    if (req) r.appendChild(H('label', { class: 'fit', 'data-role': 'fit' }, H('input', { type: 'checkbox', 'data-fit': id, 'data-key': 'fit-' + id, onchange: function () { BR.setOverride(t, id, this.checked); } }), H('span', null, T('fit')), H('em', { class: 'fit-man' })));
    return r;
  }
  BR.setOverride = function (t, id, checked) {
    if (!BR.guard('parse')) { BR.changed('drawer'); return; }
    var autoOk = BR.autoSt(S, t, id) === 'ok';
    if (checked === autoOk) delete t.ov[id]; else t.ov[id] = checked;
    if (t.draftDone) { t.draftDone = false; t.draftN = -1; t.draft = ''; delete t.att.form; t.approval = 'none'; }
    BR.logAdd('stage', 'lg.override', { tid: t.id, field: T('f.' + id) });
    BR.changed('tender');
  };
  BR.syncParse = function () {
    var D = S.drawer, t = D && BR.byId(D.id); if (!t || D.tab !== 'analysis') return;
    var root = doc.getElementById('drawer'), paper = root.querySelector('.paper'), lab = root.querySelector('#pLabel');
    if (!paper || !lab) return;
    var ids = BR.fieldsOf(t), n = ids.length, k = BR.revealed(t), i, scan = root.querySelector('.scan'), fill = root.querySelector('#pFill'), again = root.querySelector('#pAgain');
    paper.classList.toggle('parsing', t.ps === 1);
    for (i = 0; i < ids.length; i++) {
      var id = ids[i], on = i < k, frag = paper.querySelector('[data-f="' + id + '"]'), row = root.querySelector('.frow[data-f="' + id + '"]');
      if (frag) { frag.classList.toggle('hl', on); frag.classList.toggle('active', t.focus === id); }
      if (!row) continue;
      row.classList.toggle('done', on); row.classList.toggle('latest', t.ps === 1 && i === k - 1); row.classList.toggle('focus', t.focus === id);
      var v = row.querySelector('[data-role="val"]'), cf = row.querySelector('[data-role="conf"]'), m = row.querySelector('[data-role="meter"]');
      if (on) {
        var c = BR.confOf(t, id), lv = BR.confLvl(S, c);
        v.textContent = BR.val(t, id); v.className = 'fr-val';
        cf.textContent = T('conf') + ': ' + T('conf.' + lv); cf.className = 'fr-conf c-' + lv;
        m.className = 'meter c-' + lv; m.firstChild.style.width = Math.round(c * 100) + '%';
      } else { v.textContent = T('fields.waiting'); v.className = 'fr-val wait'; cf.textContent = ''; m.className = 'meter off'; m.firstChild.style.width = '0%'; }
      var cb = row.querySelector('input[data-fit]');
      if (cb) { cb.disabled = !on; cb.checked = BR.effSt(S, t, id) === 'ok'; row.querySelector('.fit-man').textContent = t.ov[id] !== undefined ? '(' + T('fit.manual') + ')' : ''; }
    }
    var pct = Math.min(100, Math.round(t.tick / (n + 1) * 100));
    if (t.ps === 1) {
      lab.textContent = t.tick === 0 ? T('parse.read') : (t.tick === 1 ? T('parse.ocr') : T('parse.extract', { n: k, m: n }));
      fill.style.width = pct + '%'; again.hidden = true; if (scan) scan.style.top = pct + '%';
      var lf = root.querySelector('.frow.latest'), sc = root.querySelector('.fields-scroll');
      if (lf && sc) sc.scrollTop = Math.max(0, lf.offsetTop - sc.clientHeight + lf.offsetHeight + 12);
      var fr = k > 0 ? paper.querySelector('[data-f="' + ids[k - 1] + '"]') : null, ds = root.querySelector('.doc-scroll');
      if (fr && ds) ds.scrollTop = Math.max(0, fr.offsetTop - ds.clientHeight / 2);
    } else if (t.ps === 2) {
      lab.textContent = T('parse.done', { n: BR.lowCount(S, t), m: n }); fill.style.width = '100%'; again.hidden = !BR.can('parse'); if (scan) scan.style.top = '100%';
    } else { lab.textContent = BR.can('parse') ? T('parse.read') : T('parse.none'); fill.style.width = '0%'; again.hidden = true; }
    var rb = root.querySelector('#revBox');
    if (rb) {
      rb.innerHTML = '';
      if (t.ps === 2) {
        var low = BR.lowCount(S, t);
        if (low && !t.reviewed) rb.appendChild(H('p', { class: 'rev-note' }, BR.icon('warn', 16), T('rev.low', { n: low, p: Math.round(S.settings.thr * 100) })));
        if (t.reviewed) rb.appendChild(H('p', { class: 'rev-note ok' }, BR.icon('check', 16), T('rev.done')));
        else rb.appendChild(BR.btn(T('rev.btn'), function () { if (BR.guard('parse')) { t.reviewed = true; BR.logAdd('stage', 'lg.reviewed', { tid: t.id }); BR.toast(T('rev.done')); BR.changed('tender'); } }, '', { 'data-key': 'review' }));
      }
    }
  };
  BR.focusField = function (id) {
    var t = BR.byId(S.drawer.id); if (!t) return; t.focus = id; BR.syncParse();
    var root = doc.getElementById('drawer');
    [['.fields-scroll', '.frow[data-f="' + id + '"]'], ['.doc-scroll', '.paper [data-f="' + id + '"]']].forEach(function (p) {
      var box = root.querySelector(p[0]), n = root.querySelector(p[1]);
      if (!box || !n || !box.offsetParent) return;
      var bt = box.getBoundingClientRect(), nt = n.getBoundingClientRect();
      if (nt.top < bt.top + 8) box.scrollTop -= (bt.top - nt.top) + 16; else if (nt.bottom > bt.bottom - 8) box.scrollTop += (nt.bottom - bt.bottom) + 16;
    });
  };

  /* --- qualification (per tender) --- */
  function qualTab(body, t) {
    if (t.ps !== 2) { body.appendChild(H('div', { class: 'qempty' }, H('p', null, T('qual.empty')), BR.btn(T('qual.run'), function () { if (BR.guard('parse')) { S.drawer.tab = 'analysis'; BR.startParse(t); BR.changed('drawer'); } }, '', { 'data-key': 'runparse' }))); return; }
    var v = BR.verdict(S, t);
    var vc = H('div', { class: 'verdict ' + (v.go ? 'go' : 'nogo') });
    vc.appendChild(H('div', { class: 'v-big' }, H('span', { class: 'v-k' }, T('verdict.h')), H('span', { class: 'v-w' }, BR.icon(v.go ? 'check' : 'x', 28), T(v.go ? 'verdict.go' : 'verdict.nogo'))));
    vc.appendChild(H('div', { class: 'v-d' }, H('p', null, v.go ? (v.docs ? T('verdict.go.d', { n: v.docs }) : T('verdict.go.d0')) : T('verdict.nogo.d', { list: v.fails.map(function (f) { return T('f.' + f); }).join(', ') })), H('p', { class: 'v-tip' }, T('verdict.tip'))));
    body.appendChild(vc);
    body.appendChild(H('div', { class: 'q-head' }, H('h4', null, T('qual.h')), BR.btn(T('qual.profile.open'), function () { BR.go('qual', 'profile'); }, 'btn-ghost')));
    var rows = t.reqs.map(function (id) {
      var st = BR.effSt(S, t, id);
      var cb = H('input', { type: 'checkbox', checked: st === 'ok', 'data-key': 'qfit-' + id, onchange: function () { BR.setOverride(t, id, this.checked); } });
      return { cells: [H('b', null, T('f.' + id)), BR.val(t, id), BR.have(id), H('span', { class: 'qchip ' + st }, BR.icon(st === 'ok' ? 'check' : (st === 'fail' ? 'x' : 'docu'), 14), T('qual.' + st)),
        H('span', { class: 'qwhy' }, T('qual.why.' + st, { need: BR.val(t, id) }) + (t.ov[id] !== undefined ? ' ' + T('qual.manual') + '.' : '')), H('label', { class: 'fit' }, cb, H('span', null, T('fit')))] };
    });
    body.appendChild(BR.table([{ label: T('qual.col.req'), w: '1.2fr' }, { label: T('qual.col.need'), w: '1fr' }, { label: T('qual.col.have'), w: '1fr' }, { label: T('qual.col.status'), w: '1.2fr' }, { label: T('qual.col.why'), w: '1.8fr' }, { label: T('fit'), w: '1.2fr' }], rows));
    if (v.go && t.stage !== 'bid' && t.stage !== 'submitted') body.appendChild(H('div', { class: 'cta-line' }, BR.btn(T('qual.tobid'), function () { if (BR.move(t, 'bid')) BR.go('bids', t.id); }, '', { 'data-key': 'tobid' })));
  }

  /* --- cost calculation --- */
  function costTab(body, t) {
    var lines = S.costs[t.id] = S.costs[t.id] || [];
    var num = function (v) { var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) || n < 0 ? null : n; };
    var rows = lines.map(function (l, i) {
      var inp = function (k, step) { return H('input', { class: 'inp num', type: 'number', min: 0, step: step, value: l[k], 'data-key': 'cl-' + l.id + k, 'aria-label': T('cost.' + k), onchange: function () { var n = num(this.value); if (n == null) { BR.toast(T('form.invalid'), 'warn'); BR.changed('drawer'); return; } l[k] = n; BR.logAdd('other', 'lg.cost', { tid: t.id }); BR.changed('tender'); } }); };
      var tot = (l.price + l.deliv) * (1 + l.duty / 100) * l.qty;
      return { cells: [l.name || T(l.nk), inp('qty', 1), inp('price', 0.1), inp('deliv', 0.1), inp('duty', 1), BR.cu(tot), BR.btn(T('btn.remove'), function () { lines.splice(i, 1); BR.changed('tender'); }, 'btn-ghost')] };
    });
    body.appendChild(H('p', { class: 'note' }, T('cost.note')));
    body.appendChild(BR.table([{ label: T('cost.item'), w: '1.5fr' }, { label: T('cost.qty'), w: '.7fr' }, { label: T('cost.price'), w: '.8fr' }, { label: T('cost.deliv'), w: '.8fr' }, { label: T('cost.duty'), w: '.7fr' }, { label: T('cost.line'), w: '1fr' }, { label: '', w: '.9fr' }], rows));
    var nm = H('input', { class: 'inp', maxlength: 40, 'data-key': 'cl-new', placeholder: T('cost.newph'), 'aria-label': T('cost.newph') });
    body.appendChild(H('div', { class: 'addline' }, nm, BR.btn(T('cost.add'), function () {
      var s = nm.value.trim(); if (s.length < 2) { nm.parentNode.classList.add('bad'); BR.toast(T('form.invalid'), 'warn'); return; }
      lines.push({ id: Date.now() % 100000, name: s, qty: 1, price: 1, deliv: 0, duty: 0 }); BR.changed('tender');
    }, '', { 'data-key': 'cl-add' })));
    var total = BR.costTotal(S, t), u = BR.units(t), margin = u - total;
    body.appendChild(H('div', { class: 'sumbox' },
      H('div', null, H('span', null, T('cost.total')), H('b', null, BR.cu(total))),
      H('div', null, H('span', null, T('cost.contract')), H('b', null, BR.cu(u))),
      H('div', { class: margin < 0 ? 'neg' : 'pos' }, H('span', null, T('cost.margin')), H('b', null, BR.cu(margin) + (lines.length ? ' (' + Math.round(margin / u * 100) + '%)' : '')))));
    body.appendChild(H('div', { class: 'cta-line' }, BR.btn(T('cost.tofin'), function () {
      if (!BR.guard('finance')) return; var p = BR.finPlan(S, t); p.f.budget = total; BR.logAdd('other', 'lg.budget', { tid: t.id }); BR.toast(T('cost.tofin.done')); BR.changed('tender');
    }, 'btn-ghost', { 'data-key': 'tofin' }), H('span', { class: 'sub' }, T('cost.vat'))));
  }

  /* --- bid summary --- */
  function bidTab(body, t) {
    if (t.stage !== 'bid' && t.stage !== 'submitted' && t.stage !== 'won' && t.stage !== 'lost') {
      body.appendChild(H('div', { class: 'qempty' }, H('p', null, T('dbid.none')), BR.btn(T('qual.tobid'), function () { if (BR.move(t, 'bid')) BR.changed('drawer'); }, '', { 'data-key': 'tobid2' }))); return;
    }
    var items = BR.checkItems(t), ready = items.filter(function (k) { return BR.attached(t, k); }).length;
    body.appendChild(H('div', { class: 'sumbox' },
      H('div', null, H('span', null, T('bid.progress', { n: ready, m: items.length })), H('b', null, Math.round(ready / items.length * 100) + '%')),
      H('div', null, H('span', null, T('ap.h')), H('b', null, T('ap.' + t.approval))),
      H('div', null, H('span', null, T('bid.versions')), H('b', null, t.versions.length))));
    body.appendChild(H('div', { class: 'cta-line' }, BR.btn(T('dbid.open'), function () { S.drawer = null; BR.go('bids', t.id); }, '', { 'data-key': 'openbids' })));
  }

  /* --- updates from the source --- */
  function updatesTab(body, t) {
    body.appendChild(H('div', { class: 'cta-line' }, BR.btn(T('upd.refresh'), function () {
      var n = t.refreshN++, now = Date.now();
      if (n === 0) { var old = t.due; t.due += 3; t.updates.push({ at: now, k: 'upd.deadline', v: { a: BR.fmt(old), b: BR.fmt(t.due) } }); }
      else if (n === 1) { t.updates.push({ at: now, k: 'upd.doc' }); if (t.ps === 2) t.stale = true; }
      else if (n === 2) t.updates.push({ at: now, k: 'upd.qa' });
      else { BR.toast(T('upd.none')); return; }
      BR.logAdd('arrival', 'lg.updated', { tid: t.id }); BR.toast(T('upd.found')); BR.changed('tender');
    }, '', { 'data-key': 'refresh' }), H('span', { class: 'sub' }, T('upd.hint'))));
    if (t.stale) body.appendChild(H('p', { class: 'rev-note' }, BR.icon('warn', 16), T('upd.stale'), BR.btn(T('parse.again'), function () { if (BR.guard('parse')) { S.drawer.tab = 'analysis'; BR.restartParse(t); BR.changed('drawer'); } }, 'btn-ghost')));
    var l = t.updates.slice().reverse().map(function (u) { return H('li', null, H('span', { class: 'lnk-t' }, T(u.k, u.v || {})), H('span', { class: 'sub' }, BR.ago(u.at))); });
    body.appendChild(l.length ? H('ul', { class: 'lst' }, l) : BR.empty(T('upd.empty')));
  }

  /* --- comments and history --- */
  function activityTab(body, t) {
    var ta = H('textarea', { class: 'inp', rows: 2, maxlength: 240, 'data-key': 'cm-text', placeholder: T('cm.ph'), 'aria-label': T('cm.ph') });
    var mention = S.members.map(function (m) { return m.name; });
    body.appendChild(H('div', { class: 'cmform' }, ta, BR.btn(T('cm.send'), function () {
      var s = ta.value.trim(); if (s.length < 2) { ta.classList.add('badf'); BR.toast(T('form.invalid'), 'warn'); return; }
      t.comments.push({ at: Date.now(), who: S.me, text: s });
      var m = mention.some(function (n) { return s.indexOf('@' + n.split(' ')[0].replace('.', '')) >= 0 || s.toLowerCase().indexOf('@' + n.split(' ')[0].toLowerCase()) >= 0; });
      BR.logAdd(m ? 'mention' : 'other', 'lg.comment', { tid: t.id, text: s }); BR.changed('tender');
    }, '', { 'data-key': 'cm-send' })));
    body.appendChild(H('p', { class: 'sub' }, T('cm.hint')));
    var cs = t.comments.slice().reverse().map(function (c) { return H('li', { class: 'cm' }, BR.avatar(c.who), H('div', null, H('b', null, BR.name(c.who)), ' ', H('span', { class: 'sub' }, BR.ago(c.at)), H('p', null, c.text || T(c.tk)))); });
    body.appendChild(BR.section(T('cm.h'), cs.length ? H('ul', { class: 'lst cms' }, cs) : BR.empty(T('cm.empty'))));
    var hist = S.log.filter(function (e) { return e.v.tid === t.id; }).slice(-8).reverse().map(function (e) { return H('li', null, BR.avatar(e.who), H('span', { class: 'lnk-t' }, BR.logText(e)), H('span', { class: 'sub' }, BR.ago(e.at))); });
    body.appendChild(BR.section(T('dt.history'), hist.length ? H('ul', { class: 'lst' }, hist) : BR.empty(T('ov.none'))));
  }
}());
