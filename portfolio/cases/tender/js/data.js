/* Bid Radar demo: shared fictional dataset and domain rules. No real data. */
(function () {
  'use strict';
  var BR = window.BR = {};
  var d0 = new Date(); d0.setHours(0, 0, 0, 0);
  BR.today = d0;
  BR.UNITS = [100, 250, 600];
  BR.STAGES = ['inbox', 'analysis', 'qualified', 'bid', 'submitted', 'won', 'lost', 'rejected'];
  BR.ROLES = ['owner', 'manager', 'analyst', 'viewer'];
  BR.ACTIONS = ['move', 'create', 'parse', 'approve', 'profile', 'finance', 'settings', 'invite'];
  BR.CATS = ['supply', 'service', 'works', 'it'];
  BR.SOURCES = [{ id: 'mail', type: 'email' }, { id: 'portalN', type: 'portal' }, { id: 'portalE', type: 'portal' }, { id: 'hub', type: 'portal' }];
  BR.FACTS = ['amount', 'delivery', 'deadline'];
  BR.CHECK = ['profile', 'bank', 'form', 'refs', 'lic', 'staff', 'warr', 'ins'];
  BR.STEPS = ['intake', 'parse', 'extract', 'qual', 'draft', 'review', 'submit'];

  function mk(id, src, stage, due, amount, delivery, reqs, p, owner, cat) {
    var t = { id: id, src: src, stage: stage, due: due, amount: amount, delivery: delivery, reqs: reqs, owner: owner, cat: cat,
      exp: p.exp, lic: p.lic, staff: p.staff, warr: p.warr, fin: p.fin,
      ps: 0, tick: 0, acc: 0, focus: null, ov: {}, att: {}, reviewed: false, stale: false, refreshN: 0,
      draft: '', draftN: -1, draftDone: false, versions: [], approval: 'none', approvedBy: null, submitted: false,
      updates: [], comments: [], dupOf: null, raw: null, pa: 0, created: 0, result: null };
    return t;
  }
  var T = BR.mkTenders = function () {
    var a = [
      mk(1, 'mail', 'analysis', 6, 1, 30, ['exp', 'lic', 'warr', 'fin', 'ins'], { exp: 3, lic: 'A', warr: 12, fin: 1 }, 'dana', 'supply'),
      mk(2, 'portalN', 'rejected', 4, 3, 90, ['exp', 'lic', 'staff', 'warr', 'fin'], { exp: 8, lic: 'A', staff: 2, warr: 36, fin: 3 }, 'dana', 'service'),
      mk(3, 'mail', 'bid', 14, 2, 45, ['exp', 'warr', 'fin', 'ins'], { exp: 2, warr: 24, fin: 1 }, 'sam', 'supply'),
      mk(4, 'portalE', 'rejected', 6, 2, 21, ['exp', 'lic', 'staff', 'warr'], { exp: 4, lic: 'C', staff: 2, warr: 12 }, 'dana', 'it'),
      mk(5, 'mail', 'qualified', 5, 2, 60, ['exp', 'lic', 'staff', 'warr', 'fin', 'ins'], { exp: 5, lic: 'B', staff: 2, warr: 24, fin: 2 }, 'dana', 'supply'),
      mk(6, 'hub', 'queue', 7, 1, 14, ['exp', 'lic', 'warr', 'fin', 'ins'], { exp: 1, lic: 'A', warr: 6, fin: 1 }, 'dana', 'supply'),
      mk(7, 'portalN', 'inbox', 6, 1, 30, ['exp', 'lic', 'warr', 'fin', 'ins'], { exp: 3, lic: 'A', warr: 12, fin: 1 }, 'dana', 'supply'),
      mk(8, 'portalE', 'won', -30, 2, 40, ['exp', 'warr', 'fin'], { exp: 4, warr: 12, fin: 2 }, 'sam', 'it'),
      mk(9, 'hub', 'lost', -20, 1, 25, ['exp', 'lic', 'warr'], { exp: 2, lic: 'B', warr: 12 }, 'sam', 'supply'),
      mk(10, 'mail', 'submitted', 3, 1, 20, ['exp', 'warr', 'ins'], { exp: 2, warr: 12 }, 'sam', 'supply'),
      mk(11, 'portalN', 'market', 12, 1, 30, ['exp', 'lic', 'warr', 'fin'], { exp: 2, lic: 'A', warr: 12, fin: 1 }, 'dana', 'supply'),
      mk(12, 'portalE', 'queue', 16, 2, 50, ['exp', 'lic', 'staff', 'warr', 'fin'], { exp: 4, lic: 'B', staff: 1, warr: 24, fin: 2 }, 'dana', 'works'),
      mk(13, 'hub', 'market', 10, 2, 35, ['exp', 'warr', 'fin', 'ins'], { exp: 3, warr: 18, fin: 1 }, 'dana', 'supply'),
      mk(14, 'portalE', 'market', 18, 3, 70, ['exp', 'lic', 'staff', 'warr', 'fin'], { exp: 6, lic: 'C', staff: 2, warr: 36, fin: 3 }, 'dana', 'works'),
      mk(15, 'portalN', 'market', 8, 1, 21, ['exp', 'warr', 'ins'], { exp: 1, warr: 12 }, 'dana', 'service')
    ];
    [2, 3, 4, 5, 8, 9, 10].forEach(function (i) { a[i - 1].ps = 2; a[i - 1].reviewed = true; });
    a[2].created = -4 * 1440; a[0].created = -2 * 1440; a[4].created = -3 * 1440; a[9].created = -6 * 1440; a[7].created = -50 * 1440; a[8].created = -40 * 1440;
    a[7].result = 'won'; a[8].result = 'lost'; a[8].lossReason = 'price'; a[9].submitted = true; a[9].approval = 'approved'; a[9].approvedBy = 'sam';
    a[9].draftTxt = ''; a[6].dupOf = 1; a[6].created = -60;
    a[9].att = { form: true, ins: true }; a[9].draftDone = true; a[9].draftN = 1;
    return a;
  };

  BR.mkState = function () {
    var now = Date.now();
    var S = {
      mod: 'overview', me: 'alex', live: true, ms: 0, drawer: null, tabQ: 'search', navOpen: false,
      tenders: T(),
      members: [
        { id: 'alex', name: 'Alex M.', role: 'owner', status: 'active' },
        { id: 'dana', name: 'Dana K.', role: 'analyst', status: 'active' },
        { id: 'sam', name: 'Sam R.', role: 'manager', status: 'active' },
        { id: 'mia', name: 'Mia T.', role: 'viewer', status: 'active' }
      ],
      seats: 5,
      perms: {
        owner: { move: 1, create: 1, parse: 1, approve: 1, profile: 1, finance: 1, settings: 1, invite: 1 },
        manager: { move: 1, create: 1, parse: 1, approve: 1, profile: 1, finance: 1, settings: 0, invite: 0 },
        analyst: { move: 1, create: 1, parse: 1, approve: 0, profile: 0, finance: 0, settings: 0, invite: 0 },
        viewer: { move: 0, create: 0, parse: 0, approve: 0, profile: 0, finance: 0, settings: 0, invite: 0 }
      },
      profile: { exp: 5, lic: { A: 1, B: 1, C: 0 }, staff: 1, warr: 24, fin: 2 },
      docs: [
        { id: 'licA', exp: 200, present: true }, { id: 'licB', exp: 25, present: true }, { id: 'staff1', exp: 400, present: true },
        { id: 'insurance', exp: null, present: false }, { id: 'tax', exp: 12, present: true }, { id: 'bank', exp: null, present: true },
        { id: 'refs', exp: null, present: true }, { id: 'quality', exp: 300, present: true }
      ],
      src: { mail: { on: 1, sync: 3 }, portalN: { on: 1, sync: 8 }, portalE: { on: 1, sync: 12 }, hub: { on: 1, sync: 20 } },
      rules: { inc: ['supply'], exc: [], minAmt: 1 },
      profiles: [{ id: 'p1', name: 'supply-core', q: 'supply', cat: 'supply', amt: 0, src: ['portalN', 'portalE', 'hub'] }],
      settings: {
        auto: { inbox: { task: 1, notify: 1 }, analysis: { task: 0, notify: 0 }, qualified: { task: 1, notify: 0 }, bid: { task: 1, notify: 1 },
          submitted: { task: 0, notify: 1 }, won: { task: 1, notify: 1 }, lost: { task: 0, notify: 0 }, rejected: { task: 0, notify: 0 } },
        ch: { email: 1, messenger: 1 }, ev: { arrival: 1, deadline: 1, stage: 1, mention: 1, doc: 1 }, lead: 3,
        provider: 'a', thr: 0.8, autoParse: 0, humanLow: 1, crm: 1, feed: 1, webhook: 1
      },
      tasks: [
        { id: 1, tpl: 'review', tid: 1, who: 'dana', due: 2, done: false, auto: 0 },
        { id: 2, tpl: 'docs', tid: 3, who: 'sam', due: 5, done: false, auto: 1 },
        { id: 3, tpl: 'call', tid: 5, who: 'dana', due: 1, done: false, auto: 0 },
        { id: 4, text: null, tpl: 'renew', tid: null, who: 'sam', due: 6, done: false, auto: 0 }
      ],
      taskId: 5,
      costs: {
        1: [{ id: 1, nk: 'ln.1', qty: 12, price: 4, deliv: 0.5, duty: 0 }, { id: 2, nk: 'ln.2', qty: 40, price: 0.6, deliv: 0.1, duty: 5 }],
        3: [{ id: 1, nk: 'ln.1', qty: 20, price: 6, deliv: 1, duty: 0 }, { id: 2, nk: 'ln.3', qty: 6, price: 9, deliv: 1.5, duty: 0 }],
        5: [{ id: 1, nk: 'ln.4', qty: 10, price: 8, deliv: 2, duty: 5 }, { id: 2, nk: 'ln.2', qty: 60, price: 0.8, deliv: 0.2, duty: 0 }],
        8: [{ id: 1, nk: 'ln.1', qty: 18, price: 7, deliv: 1, duty: 0 }, { id: 2, nk: 'ln.6', qty: 18, price: 1.5, deliv: 0, duty: 0 }]
      },
      fin: { 8: { budget: null, margin: 18, month: 1 } },
      kb: [
        { id: 'k1', buyer: 1, outcome: 'won', cat: 'supply' }, { id: 'k2', buyer: 2, outcome: 'lost', cat: 'service' },
        { id: 'k3', buyer: 3, outcome: 'won', cat: 'it' }, { id: 'k4', buyer: 4, outcome: 'nobid', cat: 'works' },
        { id: 'k5', buyer: 5, outcome: 'won', cat: 'supply' }, { id: 'k6', buyer: 6, outcome: 'lost', cat: 'supply' }
      ],
      log: [], runs: [], runId: 1, seen: now - 3 * 3600000, toast: null, read: {},
      queue: [{ id: 6, at: 6500 }, { id: 12, at: 15000 }]
    };
    function L(min, who, ev, k, v) { S.log.push({ at: now - min * 60000, who: who, ev: ev, k: k, v: v || {} }); }
    L(1500, 'dana', 'stage', 'lg.moved', { tid: 2, to: 'rejected' });
    L(1200, 'sam', 'stage', 'lg.moved', { tid: 3, to: 'bid' });
    L(900, 'sam', 'stage', 'lg.moved', { tid: 10, to: 'submitted' });
    L(300, 'dana', 'doc', 'lg.docexp', { did: 'licB' });
    L(180, 'sam', 'mention', 'lg.comment', { tid: 3, text: 'cm.seed' });
    L(60, 'dana', 'arrival', 'lg.arrived', { tid: 7, sid: 'portalN' });
    // seed workflow runs
    S.runs.push(run(1, 3, 'parse', 'ok', 1380));
    S.runs.push(run(2, 5, 'parse', 'ok', 1040));
    S.runs.push(run(3, 8, 'draft', 'ok', 3200));
    S.runs.push(run(4, 7, 'parse', 'fail', 55));
    S.runId = 5;
    function run(id, tid, kind, st, ago) {
      var steps = ['fetch', 'ocr', 'classify', 'extract', 'qualify', 'notify'];
      if (kind === 'draft') steps = ['fetch', 'qualify', 'draft', 'notify'];
      var o = { id: id, tid: tid, kind: kind, st: st, at: now - ago * 60000, steps: steps.map(function (s) { return { k: s, st: 'ok' }; }), err: null };
      if (st === 'fail') { o.steps = steps.map(function (s, i) { return { k: s, st: i < 1 ? 'ok' : (i === 1 ? 'fail' : 'wait') }; }); o.err = 'err.ocr'; }
      return o;
    }
    // seeded updates / comments / draft versions
    var t1 = S.tenders[0]; t1.updates.push({ at: now - 400 * 60000, k: 'upd.doc' });
    S.tenders[2].comments.push({ at: now - 180 * 60000, who: 'sam', text: null, tk: 'cm.seed' });
    var t3 = S.tenders[2]; t3.att = {};
    return S;
  };

  /* ---------- domain rules ---------- */
  BR.docStatus = function (S, id) {
    var d = null, i;
    for (i = 0; i < S.docs.length; i++) if (S.docs[i].id === id) d = S.docs[i];
    if (!d || !d.present) return 'missing';
    if (d.exp != null && d.exp < 0) return 'expired';
    if (d.exp != null && d.exp < 30) return 'soon';
    return 'valid';
  };
  BR.docValid = function (S, id) { var s = BR.docStatus(S, id); return s === 'valid' || s === 'soon'; };
  BR.autoSt = function (S, t, id) {
    var P = S.profile;
    switch (id) {
      case 'exp': return t.exp <= P.exp ? 'ok' : 'fail';
      case 'lic': return P.lic[t.lic] ? 'ok' : 'fail';
      case 'staff': return t.staff <= P.staff ? 'ok' : (t.staff === P.staff + 1 ? 'doc' : 'fail');
      case 'warr': return t.warr <= P.warr ? 'ok' : 'fail';
      case 'fin': return t.fin <= P.fin ? 'ok' : 'fail';
      default: return BR.docValid(S, 'insurance') ? 'ok' : 'doc';
    }
  };
  BR.effSt = function (S, t, id) {
    if (t.ov[id] === true) return 'ok';
    if (t.ov[id] === false) return 'fail';
    return BR.autoSt(S, t, id);
  };
  BR.verdict = function (S, t) {
    var fails = [], docs = 0;
    t.reqs.forEach(function (r) { var s = BR.effSt(S, t, r); if (s === 'fail') fails.push(r); else if (s === 'doc') docs++; });
    return { go: fails.length === 0, fails: fails, docs: docs };
  };
  BR.fieldsOf = function (t) { return BR.FACTS.concat(t.reqs); };
  BR.CONF = [0.98, 0.95, 0.91, 0.86, 0.78, 0.66];
  BR.confOf = function (t, id) { return BR.CONF[(t.id * 3 + BR.fieldsOf(t).indexOf(id) * 5) % 6]; };
  BR.confLvl = function (S, c) { return c >= 0.9 ? 'high' : (c >= S.settings.thr ? 'med' : 'low'); };
  BR.lowCount = function (S, t) { return BR.fieldsOf(t).filter(function (f) { return BR.confLvl(S, BR.confOf(t, f)) === 'low'; }).length; };
  BR.units = function (t) { return BR.UNITS[t.amount - 1]; };
  BR.costTotal = function (S, t) {
    var lines = S.costs[t.id] || [], s = 0;
    lines.forEach(function (l) { s += (l.price + l.deliv) * (1 + l.duty / 100) * l.qty; });
    return Math.round(s * 100) / 100;
  };
  BR.finPlan = function (S, t) {
    var f = S.fin[t.id] || (S.fin[t.id] = { budget: null, margin: 15, month: 1 });
    var u = BR.units(t);
    var budget = f.budget != null ? f.budget : Math.round(u * (1 - f.margin / 100) * 100) / 100;
    return { f: f, u: u, budget: budget, profit: Math.round((u - budget) * 100) / 100 };
  };
}());
