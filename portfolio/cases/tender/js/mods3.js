/* Bid Radar demo: finance, analytics, knowledge, workflows, team, settings, activity. */
(function () {
  'use strict';
  var BR = window.BR, S = BR.S, H = BR.h, T = BR.T, doc = document;
  var M = BR.mods = BR.mods || {};

  /* ================= finance ================= */
  M.finance = function (root) {
    var won = S.tenders.filter(function (t) { return t.stage === 'won'; }), ro = !BR.can('finance');
    root.appendChild(H('p', { class: 'note' }, T('fn.note')));
    if (!won.length) { root.appendChild(BR.empty(T('fn.none'))); return; }
    var sumU = 0, sumB = 0, sumP = 0;
    var rows = won.map(function (t) {
      var p = BR.finPlan(S, t), f = p.f; sumU += p.u; sumB += p.budget; sumP += p.profit;
      var bud = H('input', { class: 'inp num', type: 'number', min: 0, step: 1, disabled: ro, value: f.budget != null ? f.budget : '', placeholder: String(p.budget), 'data-key': 'fb' + t.id, 'aria-label': T('fn.budget'), onchange: function () {
        var s = this.value.trim(); if (s === '') f.budget = null; else { var n = parseFloat(s); if (isNaN(n) || n < 0 || n > p.u * 3) { BR.toast(T('form.invalid'), 'warn'); BR.changed('mod'); return; } f.budget = n; }
        BR.logAdd('other', 'lg.finplan', { tid: t.id }); BR.changed('tender');
      } });
      var mg = H('input', { class: 'inp num', type: 'number', min: 0, max: 90, disabled: ro, value: f.margin, 'data-key': 'fm' + t.id, 'aria-label': T('fn.margin'), onchange: function () {
        var n = parseFloat(this.value); if (isNaN(n) || n < 0 || n > 90) { BR.toast(T('form.range', { a: 0, b: 90 }), 'warn'); BR.changed('mod'); return; } f.margin = n; f.budget = null; BR.logAdd('other', 'lg.finplan', { tid: t.id }); BR.changed('tender');
      } });
      var mo = BR.select([0, 1, 2, 3].map(function (n) { var d = new Date(BR.today.getFullYear(), BR.today.getMonth() + n, 1); return { id: n, label: d.toLocaleDateString(BR.loc(), { month: 'long' }) }; }), f.month, function (v) { f.month = parseInt(v, 10); BR.changed('tender'); }, 'fmo' + t.id);
      mo.disabled = ro;
      var calc = BR.costTotal(S, t);
      return { cells: [BR.titleLink(t), BR.cu(p.u), mg, bud, mo, H('b', { class: p.profit < 0 ? 'neg' : 'pos' }, BR.cu(p.profit)),
        calc ? BR.btn(T('fn.usecalc', { n: BR.num(calc) }), function () { if (!BR.guard('finance')) return; f.budget = calc; BR.logAdd('other', 'lg.budget', { tid: t.id }); BR.changed('tender'); }, 'btn-ghost', { disabled: ro }) : H('span', { class: 'sub' }, T('fn.nocalc'))] };
    });
    root.appendChild(BR.table([{ label: T('fn.contract'), w: '1.7fr' }, { label: T('fn.amount'), w: '.9fr' }, { label: T('fn.margin'), w: '.8fr' }, { label: T('fn.budget'), w: '.9fr' }, { label: T('fn.month'), w: '1.4fr' }, { label: T('fn.profit'), w: '1fr' }, { label: T('fn.calc'), w: '1.2fr' }], rows));
    root.appendChild(H('div', { class: 'sumbox' }, H('div', null, H('span', null, T('fn.t.amount')), H('b', null, BR.cu(sumU))), H('div', null, H('span', null, T('fn.t.budget')), H('b', null, BR.cu(sumB))), H('div', { class: sumP < 0 ? 'neg' : 'pos' }, H('span', null, T('fn.t.profit')), H('b', null, BR.cu(sumP)))));
    root.appendChild(H('div', { class: 'cta-line' }, BR.btn(T('exp.finance'), function () {
      BR.csv('finance-plan.csv', [[T('fn.contract'), T('fn.amount'), T('fn.budget'), T('fn.profit')]].concat(won.map(function (t) { var p = BR.finPlan(S, t); return [BR.tt(t, 'title'), p.u, p.budget, p.profit]; })));
    }, 'btn-ghost', { 'data-key': 'exp2' }), H('span', { class: 'sub' }, T('fn.units'))));
  };

  /* ================= analytics ================= */
  var A_ = { owner: 'all' };
  function bars(items, max) {
    var box = H('div', { class: 'bars' });
    items.forEach(function (it) {
      box.appendChild(H('div', { class: 'bar' }, H('span', { class: 'bar-l' }, it.label), H('span', { class: 'bar-t' }, H('i', { class: it.cls || '', style: 'width:' + (max ? Math.round(it.n / max * 100) : 0) + '%' })), H('b', null, it.n)));
    });
    return box;
  }
  M.analytics = function (root) {
    root.appendChild(BR.chips(T('pl.owner.all'), [{ id: 'all', label: T('pl.owner.all') }].concat(S.members.filter(function (m) { return m.role !== 'viewer'; }).map(function (m) { return { id: m.id, label: m.name }; })), A_.owner, function (v) { A_.owner = v; BR.changed('mod'); }));
    var ts = S.tenders.filter(function (t) { return BR.inPipeline(t) && (A_.owner === 'all' || t.owner === A_.owner); });
    var cnt = function (f) { return ts.filter(f).length; };
    var grid = H('div', { class: 'two' });
    var fun = BR.STAGES.map(function (s) { return { label: T('stage.' + s), n: cnt(function (t) { return t.stage === s; }), cls: s === 'won' ? 'ok' : (s === 'lost' || s === 'rejected' ? 'bad' : '') }; });
    grid.appendChild(BR.section(T('an.funnel'), H('div', null, bars(fun, Math.max.apply(null, fun.map(function (x) { return x.n; }).concat([1]))), H('p', { class: 'note' }, T('an.funnel.note')))));
    var src = BR.SOURCES.map(function (s) { return { label: T('srcn.' + s.id), n: cnt(function (t) { return t.src === s.id; }) }; });
    grid.appendChild(BR.section(T('an.sources'), bars(src, Math.max.apply(null, src.map(function (x) { return x.n; }).concat([1])))));
    var won = cnt(function (t) { return t.stage === 'won'; }), lost = cnt(function (t) { return t.stage === 'lost'; }), nb = cnt(function (t) { return t.stage === 'rejected'; });
    var res = [{ label: T('res.won'), n: won, cls: 'ok' }, { label: T('res.lost'), n: lost, cls: 'bad' }, { label: T('an.nobid'), n: nb, cls: 'warn' }];
    var why = ['price', 'docs', 'exp', 'other'].map(function (r) { return { label: T('why.' + r), n: cnt(function (t) { return t.stage === 'lost' && t.lossReason === r; }) }; }).filter(function (x) { return x.n; });
    grid.appendChild(BR.section(T('an.results'), H('div', null, bars(res, Math.max.apply(null, res.map(function (x) { return x.n; }).concat([1]))), why.length ? H('div', null, H('p', { class: 'fld-l' }, T('an.why')), bars(why, 3)) : null)));
    var wk = [0, 1, 2, 3].map(function (w) { return { label: T('an.week', { n: w + 1 }), n: cnt(function (t) { return BR.activeStage(t) && t.stage !== 'submitted' && t.due >= w * 7 && t.due < (w + 1) * 7; }), cls: w === 0 ? 'warn' : '' }; });
    grid.appendChild(BR.section(T('an.deadlines'), bars(wk, Math.max.apply(null, wk.map(function (x) { return x.n; }).concat([1])))));
    var ds = ['valid', 'soon', 'expired', 'missing'].map(function (s) { return { label: T('ds.' + s), n: S.docs.filter(function (d) { return BR.docStatus(S, d.id) === s; }).length, cls: s === 'valid' ? 'ok' : (s === 'soon' ? 'warn' : (s === 'valid' ? '' : 'bad')) }; });
    grid.appendChild(BR.section(T('an.docs'), bars(ds, S.docs.length)));
    var parsed = ts.filter(function (t) { return t.ps === 2; }), ver = [{ label: T('verdict.go'), n: parsed.filter(function (t) { return BR.verdict(S, t).go; }).length, cls: 'ok' }, { label: T('verdict.nogo'), n: parsed.filter(function (t) { return !BR.verdict(S, t).go; }).length, cls: 'bad' }];
    grid.appendChild(BR.section(T('an.verdicts'), bars(ver, Math.max(ver[0].n, ver[1].n, 1))));
    root.appendChild(grid);
  };

  /* ================= knowledge ================= */
  var K_ = { q: '', f: 'all', sel: null, tgt: null };
  function kbTitle(k) { return k.tid ? BR.tt(BR.byId(k.tid), 'title') : T('kb.' + k.id + '.t'); }
  function kbLesson(k) { return k.tid ? (k.outcome === 'lost' ? T('why.' + (BR.byId(k.tid).lossReason || 'other') + '.l') : T('kb.won.l')) : T('kb.' + k.id + '.l'); }
  function kbSnippet(k) { return k.tid ? T('kb.gen.s') : T('kb.' + k.id + '.s'); }
  M.knowledge = function (root) {
    root.appendChild(H('div', { class: 'toolbar wrap' },
      H('input', { class: 'search', type: 'search', value: K_.q, 'data-key': 'kq', placeholder: T('kb.search'), 'aria-label': T('kb.search'), oninput: function () { K_.q = this.value; BR.changed('mod'); } }),
      BR.chips(T('kb.f'), [{ id: 'all', label: T('filter.all') }, { id: 'won', label: T('res.won') }, { id: 'lost', label: T('res.lost') }, { id: 'nobid', label: T('an.nobid') }], K_.f, function (v) { K_.f = v; BR.changed('mod'); })));
    var q = K_.q.toLowerCase();
    var list = S.kb.filter(function (k) { return (K_.f === 'all' || k.outcome === K_.f) && (!q || (kbTitle(k) + ' ' + T('b.' + k.buyer) + ' ' + kbLesson(k) + ' ' + kbSnippet(k)).toLowerCase().indexOf(q) >= 0); });
    var wrap = H('div', { class: 'dsplit' + (K_.sel ? ' has' : '') });
    var left = H('div', { class: 'dleft' }, list.map(function (k) {
      return H('button', { type: 'button', class: 'tcard' + (K_.sel === k.id ? ' on' : ''), 'data-key': 'kb' + k.id, onclick: function () { K_.sel = k.id; BR.changed('mod'); } },
        H('span', { class: 'tc-title' }, kbTitle(k)), H('span', { class: 'tc-buyer' }, T('b.' + k.buyer) + ' / ' + T('cat.' + k.cat)), H('span', { class: 'tc-foot' }, BR.badge(k.outcome === 'won' ? 'ok' : (k.outcome === 'lost' ? 'bad' : 'warn'), T(k.outcome === 'nobid' ? 'an.nobid' : 'res.' + k.outcome))));
    }));
    if (!list.length) left.appendChild(BR.empty(T('kb.none')));
    wrap.appendChild(left);
    var k = K_.sel && S.kb.filter(function (x) { return x.id === K_.sel; })[0];
    if (k) {
      var pv = H('aside', { class: 'preview' });
      pv.appendChild(H('button', { type: 'button', class: 'back', onclick: function () { K_.sel = null; BR.changed('mod'); } }, BR.icon('back', 16), T('dc.close')));
      pv.appendChild(H('h4', null, kbTitle(k)));
      pv.appendChild(H('p', { class: 'sub' }, T('b.' + k.buyer) + ' / ' + T('cat.' + k.cat)));
      pv.appendChild(H('p', { class: 'fld-l' }, T('kb.lesson'))); pv.appendChild(H('p', null, kbLesson(k)));
      pv.appendChild(H('p', { class: 'fld-l' }, T('kb.snippet'))); pv.appendChild(H('blockquote', { class: 'quote' }, kbSnippet(k)));
      var targets = S.tenders.filter(function (t) { return t.stage === 'bid' && t.draftN >= 0; });
      if (targets.length) {
        if (!K_.tgt || !targets.some(function (t) { return t.id === K_.tgt; })) K_.tgt = targets[0].id;
        pv.appendChild(BR.field(T('kb.into'), BR.select(targets.map(function (t) { return { id: t.id, label: BR.tt(t, 'title') }; }), K_.tgt, function (v) { K_.tgt = parseInt(v, 10); }, 'kbt')));
        pv.appendChild(BR.btn(T('kb.insert'), function () {
          if (!BR.guard('parse')) return; var t = BR.byId(K_.tgt); t.draft = BR.draftText(t) + '\n\n' + kbSnippet(k); t.draftN = t.draft.length; t.draftDone = true; BR.addVersion(t, t.draft); t.approval = 'none';
          BR.logAdd('other', 'lg.kbuse', { tid: t.id }); BR.toast(T('kb.inserted')); BR.changed('tender');
        }, '', { 'data-key': 'kbins' }));
      } else pv.appendChild(H('p', { class: 'sub' }, T('kb.notarget')));
      wrap.appendChild(pv);
    }
    root.appendChild(wrap);
  };

  /* ================= workflows ================= */
  var W_ = { f: 'all', sel: null };
  M.workflows = function (root) {
    var lanes = [['document', ['ocr', 'classify', 'extract']], ['ai', ['qualify', 'draft']], ['workflow', ['fetch', 'notify']]];
    var run = S.runs.filter(function (r) { return r.st === 'run'; }), fail = S.runs.filter(function (r) { return r.st === 'fail'; });
    var ln = H('div', { class: 'stats' });
    lanes.forEach(function (l) {
      var n = 0; run.forEach(function (r) { r.steps.forEach(function (s) { if (s.st === 'run' && l[1].indexOf(s.k) >= 0) n++; }); });
      ln.appendChild(H('div', { class: 'stat' }, H('b', null, n), H('span', null, T('wf.lane.' + l[0]))));
    });
    ln.appendChild(H('div', { class: 'stat' + (fail.length ? ' bad' : '') }, H('b', null, fail.length), H('span', null, T('wf.dead'))));
    root.appendChild(ln);
    root.appendChild(BR.chips(T('wf.f'), [{ id: 'all', label: T('filter.all') }, { id: 'run', label: T('wf.s.run') }, { id: 'ok', label: T('wf.s.ok') }, { id: 'fail', label: T('wf.s.fail') }], W_.f, function (v) { W_.f = v; BR.changed('mod'); }));
    var list = S.runs.filter(function (r) { return W_.f === 'all' || r.st === W_.f || (W_.f === 'ok' && r.st === 'retried'); }).slice().reverse();
    var rows = list.map(function (r) {
      var t = BR.byId(r.tid), okn = r.steps.filter(function (s) { return s.st === 'ok'; }).length;
      return { key: r.id, cls: W_.sel === r.id ? 'sel' : '', onclick: function () { W_.sel = r.id; BR.changed('mod'); }, cells: ['#' + r.id, H('b', null, t ? BR.tt(t, 'title') : '?'), T('wf.k.' + r.kind), BR.ago(r.at), BR.badge(r.st === 'ok' ? 'ok' : (r.st === 'fail' ? 'bad' : (r.st === 'run' ? 'info' : 'warn')), T('wf.s.' + r.st)), okn + '/' + r.steps.length] };
    });
    root.appendChild(BR.table([{ label: '#', w: '.5fr' }, { label: T('pl.c.title'), w: '2fr' }, { label: T('wf.c.kind'), w: '1fr' }, { label: T('wf.c.when'), w: '1fr' }, { label: T('wf.c.status'), w: '1fr' }, { label: T('wf.c.steps'), w: '.7fr' }], rows));
    var r = W_.sel && S.runs.filter(function (x) { return x.id === W_.sel; })[0];
    if (r) {
      var t = BR.byId(r.tid), tl = H('ol', { class: 'flow' });
      r.steps.forEach(function (s) { tl.appendChild(H('li', { class: 'fl-' + (s.st === 'ok' ? 'done' : (s.st === 'run' ? 'now' : (s.st === 'fail' ? 'fail' : 'todo'))) }, H('span', { class: 'fl-dot' }, s.st === 'ok' ? BR.icon('check', 14) : (s.st === 'fail' ? BR.icon('x', 14) : null)), H('span', { class: 'fl-tx' }, T('wf.step.' + s.k), H('i', null, T('wf.ss.' + s.st))))); });
      var det = H('div', null, H('p', { class: 'sub' }, T('wf.trace', { id: 'trace-' + String(1000 + r.id) })), tl);
      if (r.err) det.appendChild(H('p', { class: 'locked' }, T(r.err)));
      if (r.st === 'fail') det.appendChild(BR.btn(T('wf.retry'), function () {
        if (!BR.guard('parse')) return; r.st = 'retried'; var tt = BR.byId(r.tid); tt.ps = 0; BR.startParse(tt); BR.logAdd('other', 'lg.retry', { tid: r.tid }); BR.toast(T('wf.retried')); BR.changed('tender');
      }, '', { 'data-key': 'retry' }));
      root.appendChild(BR.section(T('wf.detail', { n: r.id }), det, BR.btn(T('btn.close'), function () { W_.sel = null; BR.changed('mod'); }, 'btn-ghost')));
    }
  };

  /* ================= team ================= */
  var TM_ = { name: '', mail: '', role: 'analyst', errs: {} };
  M.team = function (root) {
    var canInv = BR.can('invite');
    var rows = S.members.map(function (m) {
      var sel = BR.select(BR.ROLES.map(function (r) { return { id: r, label: T('role.' + r) }; }), m.role, function (v) {
        if (!BR.guard('invite')) { BR.changed('mod'); return; }
        if (m.id === 'alex') { BR.toast(T('tm.ownerlock'), 'warn'); BR.changed('mod'); return; }
        m.role = v; BR.logAdd('doc', 'lg.role', { mid: m.id, role: v }); BR.toast(T('tm.rolesaved')); BR.changed('tender');
      }, 'rl-' + m.id);
      return { cells: [H('span', null, BR.avatar(m.id), ' ', H('b', null, m.name)), sel, T('tm.' + m.status), m.id === S.me ? BR.badge('info', T('tm.you')) : ''] };
    });
    root.appendChild(BR.section(T('tm.h'), BR.table([{ label: T('tm.c.name'), w: '1.4fr' }, { label: T('tm.c.role'), w: '1fr' }, { label: T('tm.c.status'), w: '.8fr' }, { label: '', w: '.6fr' }], rows), H('span', { class: 'sub' }, T('tm.seats', { n: S.members.length, m: S.seats }))));
    var nm = H('input', { class: 'inp', maxlength: 40, value: TM_.name, 'data-key': 'inv-n', oninput: function () { TM_.name = this.value; } });
    var ml = H('input', { class: 'inp', type: 'email', maxlength: 60, value: TM_.mail, 'data-key': 'inv-m', oninput: function () { TM_.mail = this.value; } });
    var form = H('div', { class: 'form grid2' }, BR.field(T('tm.name'), nm, TM_.errs.name), BR.field(T('tm.mail'), ml, TM_.errs.mail),
      BR.field(T('tm.role'), BR.select(BR.ROLES.filter(function (r) { return r !== 'owner'; }).map(function (r) { return { id: r, label: T('role.' + r) }; }), TM_.role, function (v) { TM_.role = v; }, 'inv-r')));
    root.appendChild(BR.section(T('tm.invite'), H('div', null, form, H('div', { class: 'cta-line' }, BR.btn(T('tm.send'), function () {
      if (!BR.guard('invite')) return;
      TM_.errs = {}; if (TM_.name.trim().length < 2) TM_.errs.name = T('form.min', { n: 2 });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(TM_.mail.trim())) TM_.errs.mail = T('tm.badmail');
      if (S.members.length >= S.seats) { BR.toast(T('tm.noseats'), 'warn'); return; }
      if (TM_.errs.name || TM_.errs.mail) { BR.toast(T('form.invalid'), 'warn'); BR.changed('mod'); return; }
      var id = 'u' + (S.members.length + 1); S.members.push({ id: id, name: TM_.name.trim(), role: TM_.role, status: 'invited' });
      BR.logAdd('doc', 'lg.invited', { mid: id }); TM_.name = ''; TM_.mail = ''; BR.toast(T('tm.sent')); BR.changed('tender');
    }, '', { 'data-key': 'inv-send', disabled: !canInv }), canInv ? null : H('span', { class: 'sub' }, T('ql.readonly'))))));
    var prows = BR.ACTIONS.map(function (a) {
      return { cells: [T('act.' + a)].concat(BR.ROLES.map(function (r) {
        return H('label', { class: 'fit' }, H('input', { type: 'checkbox', checked: !!S.perms[r][a], disabled: r === 'owner' || !BR.can('settings'), 'data-key': 'pm-' + r + a, onchange: function () { S.perms[r][a] = this.checked ? 1 : 0; BR.logAdd('doc', 'lg.perm', { role: r }); BR.changed('tender'); } }), H('span', { class: 'sr' }, T('role.' + r)));
      })) };
    });
    root.appendChild(BR.section(T('tm.perms'), H('div', null, H('p', { class: 'note' }, T('tm.perms.note')), BR.table([{ label: T('tm.action'), w: '1.6fr' }].concat(BR.ROLES.map(function (r) { return { label: T('role.' + r), w: '.8fr' }; })), prows, 'perm'))));
    root.appendChild(BR.section(T('tm.ws'), H('div', null, H('p', null, T('tm.ws.d')), H('dl', { class: 'facts' }, H('dt', null, T('tm.ws.plan')), H('dd', null, T('tm.plan.business')), H('dt', null, T('tm.ws.seats')), H('dd', null, S.members.length + ' / ' + S.seats), H('dt', null, T('tm.ws.iso')), H('dd', null, T('tm.ws.iso.v'))))));
  };

  /* ================= settings ================= */
  M.settings = function (root) {
    var ro = !BR.can('settings'), st = S.settings;
    var tg = function (obj, k, onc) { return H('label', { class: 'sw' }, H('input', { type: 'checkbox', checked: !!obj[k], disabled: ro, 'data-key': 'sg-' + k, onchange: function () { obj[k] = this.checked ? 1 : 0; BR.logAdd('other', 'lg.setting', {}); if (onc) onc(); BR.changed('tender'); } }), H('span', null, T(obj[k] ? 'on' : 'off'))); };
    root.appendChild(BR.tabs([{ id: 'pipeline', label: T('sg.pipeline') }, { id: 'notif', label: T('sg.notif') }, { id: 'ai', label: T('sg.ai') }, { id: 'integr', label: T('sg.integr') }], S.tabQ, function (id) { S.tabQ = id; BR.changed('mod'); }, T('nav.settings')));
    if (ro) root.appendChild(H('p', { class: 'rev-note' }, BR.icon('warn', 16), T('sg.ro')));
    var tab = S.tabQ;
    if (tab === 'notif') {
      root.appendChild(BR.section(T('sg.channels'), H('div', { class: 'form' }, [['email', 'sg.ch.email'], ['messenger', 'sg.ch.msg']].map(function (c) { return H('div', { class: 'setrow' }, H('span', null, T(c[1])), tg(st.ch, c[0])); }))));
      root.appendChild(BR.section(T('sg.events'), H('div', { class: 'form' }, ['arrival', 'deadline', 'stage', 'mention', 'doc'].map(function (e) { return H('div', { class: 'setrow' }, H('span', null, T('ev.' + e)), tg(st.ev, e)); }))));
      root.appendChild(BR.section(T('sg.lead'), BR.field(T('sg.lead.l'), BR.select([1, 2, 3, 5, 7].map(function (n) { return { id: n, label: T('sg.days', { n: n }) }; }), st.lead, function (v) { if (ro) { BR.changed('mod'); return; } st.lead = parseInt(v, 10); BR.changed('tender'); }, 'sg-lead'))));
    } else if (tab === 'ai') {
      var rg = H('input', { type: 'range', min: 50, max: 95, step: 5, value: Math.round(st.thr * 100), disabled: ro, 'data-key': 'sg-thr', 'aria-label': T('sg.thr'), oninput: function () { st.thr = parseInt(this.value, 10) / 100; lab.textContent = this.value + '%'; }, onchange: function () { BR.logAdd('other', 'lg.setting', {}); BR.changed('tender'); } });
      var lab = H('b', null, Math.round(st.thr * 100) + '%');
      root.appendChild(BR.section(T('sg.ai'), H('div', { class: 'form' },
        BR.field(T('sg.provider'), BR.select([{ id: 'a', label: T('sg.prov.a') }, { id: 'b', label: T('sg.prov.b') }, { id: 'l', label: T('sg.prov.l') }], st.provider, function (v) { if (ro) { BR.changed('mod'); return; } st.provider = v; BR.logAdd('other', 'lg.setting', {}); BR.changed('tender'); }, 'sg-prov')),
        H('div', { class: 'fld' }, H('span', { class: 'fld-l' }, T('sg.thr')), H('div', { class: 'range' }, rg, lab), H('p', { class: 'note' }, T('sg.thr.note'))),
        H('div', { class: 'setrow' }, H('span', null, T('sg.autoparse')), tg(st, 'autoParse')),
        H('div', { class: 'setrow' }, H('span', null, T('sg.humanlow')), tg(st, 'humanLow')))));
    } else if (tab === 'integr') {
      root.appendChild(BR.section(T('sg.integr'), H('div', { class: 'form' },
        H('div', { class: 'setrow' }, H('span', null, T('sg.crm')), tg(st, 'crm')),
        H('div', { class: 'setrow' }, H('span', null, T('sg.feed')), tg(st, 'feed'), BR.btn(T('sg.copy'), function () { BR.toast(T('sg.copied')); }, 'btn-ghost', { disabled: !st.feed })),
        H('div', { class: 'setrow' }, H('span', null, T('sg.webhook')), tg(st, 'webhook')),
        H('p', { class: 'note' }, T('sg.integr.note')))));
    } else {
      var rows = BR.STAGES.map(function (s) {
        var a = st.auto[s];
        return { cells: [H('b', null, T('stage.' + s)), tg(a, 'task'), tg(a, 'notify')] };
      });
      root.appendChild(BR.section(T('sg.auto'), H('div', null, H('p', { class: 'note' }, T('sg.auto.note')), BR.table([{ label: T('pl.c.stage'), w: '1.2fr' }, { label: T('sg.auto.task'), w: '1fr' }, { label: T('sg.auto.notify'), w: '1fr' }], rows))));
    }
  };

  /* ================= activity ================= */
  var L_ = { ev: 'all', q: '', who: 'all' };
  M.activity = function (root) {
    root.appendChild(H('div', { class: 'toolbar wrap' },
      H('input', { class: 'search', type: 'search', value: L_.q, 'data-key': 'lq', placeholder: T('lg.search'), 'aria-label': T('lg.search'), oninput: function () { L_.q = this.value; BR.changed('mod'); } }),
      BR.select([{ id: 'all', label: T('pl.owner.all') }].concat(S.members.map(function (m) { return { id: m.id, label: m.name }; })), L_.who, function (v) { L_.who = v; BR.changed('mod'); }, 'lwho'),
      BR.chips(T('lg.f'), [{ id: 'all', label: T('filter.all') }, { id: 'stage', label: T('ev.stage') }, { id: 'arrival', label: T('ev.arrival') }, { id: 'doc', label: T('ev.doc') }, { id: 'mention', label: T('ev.mention') }, { id: 'other', label: T('lg.other') }], L_.ev, function (v) { L_.ev = v; BR.changed('mod'); }),
      BR.btn(T('lg.export'), function () { BR.csv('activity.csv', [['time', 'user', 'event']].concat(S.log.map(function (e) { return [new Date(e.at).toISOString(), BR.name(e.who), BR.logText(e)]; }))); }, 'btn-ghost', { 'data-key': 'lgx' })));
    var q = L_.q.toLowerCase();
    var list = S.log.filter(function (e) { return (L_.ev === 'all' || e.ev === L_.ev) && (L_.who === 'all' || e.who === L_.who) && (!q || BR.logText(e).toLowerCase().indexOf(q) >= 0); }).slice().reverse();
    var rows = list.map(function (e) { return { key: 'e' + e.at, onclick: e.v.tid ? function () { BR.openTender(e.v.tid); } : null, cells: [BR.ago(e.at), H('span', null, BR.avatar(e.who), ' ', BR.name(e.who)), BR.logText(e), BR.badge('info', T(e.ev === 'other' ? 'lg.other' : 'ev.' + e.ev))] }; });
    root.appendChild(BR.table([{ label: T('lg.c.when'), w: '.8fr' }, { label: T('lg.c.who'), w: '1fr' }, { label: T('lg.c.what'), w: '3fr' }, { label: T('lg.c.type'), w: '.8fr' }], rows));
    if (!rows.length) root.appendChild(BR.empty(T('lg.none')));
  };
}());
